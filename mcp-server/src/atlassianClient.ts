import axios, { AxiosInstance } from 'axios';
import NodeCache from 'node-cache';
import type { Config } from './config.js';

export interface JiraIssue {
  key: string;
  summary: string;
  description: string;
  acceptanceCriteria: string[];
  status: string;
  labels: string[];
  issueType: string;
}

export interface ConfluenceSearchResult {
  pageId: string;
  title: string;
  excerpt: string;
  spaceKey: string;
  url: string;
  lastModified: string;
}

export interface ConfluencePage {
  pageId: string;
  title: string;
  version: number;
  content: string;
  url: string;
  lastModified: string;
}

/**
 * Read-only Atlassian REST API adapter.
 *
 * Security principles:
 * - Project/space allowlist enforced on every call.
 * - Token never logged.
 * - Response size capped at maxPageContentChars.
 * - Short cache to reduce latency and API quota usage.
 */
export class AtlassianClient {
  private readonly jira: AxiosInstance;
  private readonly confluence: AxiosInstance;
  private readonly cache: NodeCache;
  private readonly config: Config;

  constructor(config: Config) {
    this.config = config;
    this.cache = new NodeCache({ stdTTL: config.cacheTtlSeconds });

    const authHeader = Buffer.from(
      `${config.atlassianEmail}:${config.atlassianApiToken}`
    ).toString('base64');
    const headers = {
      Authorization: `Basic ${authHeader}`,
      Accept: 'application/json',
    };

    this.jira = axios.create({
      baseURL: `${config.jiraBaseUrl}/rest/api/3`,
      headers,
      timeout: config.requestTimeoutMs,
    });

    this.confluence = axios.create({
      baseURL: `${config.confluenceBaseUrl}/rest/api`,
      headers,
      timeout: config.requestTimeoutMs,
    });
  }

  // ─── Jira ─────────────────────────────────────────────────────────────────

  async getJiraIssue(issueKey: string): Promise<JiraIssue> {
    const projectKey = issueKey.split('-')[0];
    if (!this.config.jiraAllowedProjects.includes(projectKey)) {
      throw new Error(`Project '${projectKey}' is not in the allowlist.`);
    }

    const cacheKey = `jira:${issueKey}`;
    const cached = this.cache.get<JiraIssue>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.jira.get(`/issue/${issueKey}`, {
        params: { fields: 'summary,description,status,labels,issuetype,customfield_10016' },
      });

      const fields = response.data.fields;
      const issue: JiraIssue = {
        key: response.data.key,
        summary: fields.summary ?? '',
        description: this.extractText(fields.description),
        acceptanceCriteria: this.extractAcceptanceCriteria(fields),
        status: fields.status?.name ?? 'Unknown',
        labels: fields.labels ?? [],
        issueType: fields.issuetype?.name ?? 'Unknown',
      };

      this.cache.set(cacheKey, issue);
      return issue;
    } catch (err) {
      throw this.mapError(err, `get Jira issue ${issueKey}`);
    }
  }

  // ─── Confluence ────────────────────────────────────────────────────────────

  async searchConfluence(
    query: string,
    spaceKey: string,
    limit: number = 5
  ): Promise<ConfluenceSearchResult[]> {
    if (!this.config.confluenceAllowedSpaces.includes(spaceKey)) {
      throw new Error(`Confluence space '${spaceKey}' is not in the allowlist.`);
    }
    if (query.length > 200) {
      throw new Error('Search query too long (max 200 characters).');
    }

    const cacheKey = `confluence:search:${spaceKey}:${query}:${limit}`;
    const cached = this.cache.get<ConfluenceSearchResult[]>(cacheKey);
    if (cached) return cached;

    try {
      const cql = `space = "${spaceKey}" AND text ~ "${query.replace(/"/g, '')}" ORDER BY lastmodified DESC`;
      const response = await this.confluence.get('/content/search', {
        params: { cql, limit: Math.min(limit, 10), expand: 'excerpt' },
      });

      const results: ConfluenceSearchResult[] = (response.data.results ?? []).map((r: any) => ({
        pageId: r.id,
        title: r.title,
        excerpt: this.stripHtml(r.excerpt ?? '').slice(0, 500),
        spaceKey: r.space?.key ?? spaceKey,
        url: `${this.config.confluenceBaseUrl}${r._links?.webui ?? ''}`,
        lastModified: r.version?.when ?? '',
      }));

      this.cache.set(cacheKey, results);
      return results;
    } catch (err) {
      throw this.mapError(err, `search Confluence space ${spaceKey}`);
    }
  }

  async getConfluencePage(pageId: string): Promise<ConfluencePage> {
    if (!/^\d+$/.test(pageId)) {
      throw new Error(`Invalid page ID format: ${pageId}`);
    }

    const cacheKey = `confluence:page:${pageId}`;
    const cached = this.cache.get<ConfluencePage>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.confluence.get(`/content/${pageId}`, {
        params: { expand: 'body.storage,version,space' },
      });

      const spaceKey: string = response.data.space?.key ?? '';
      if (spaceKey && !this.config.confluenceAllowedSpaces.includes(spaceKey)) {
        throw new Error(`Page ${pageId} belongs to space '${spaceKey}' which is not in the allowlist.`);
      }

      const rawContent = this.stripHtml(response.data.body?.storage?.value ?? '');
      const page: ConfluencePage = {
        pageId: response.data.id,
        title: response.data.title,
        version: response.data.version?.number ?? 0,
        content: rawContent.slice(0, this.config.maxPageContentChars),
        url: `${this.config.confluenceBaseUrl}${response.data._links?.webui ?? ''}`,
        lastModified: response.data.version?.when ?? '',
      };

      this.cache.set(cacheKey, page);
      return page;
    } catch (err) {
      throw this.mapError(err, `get Confluence page ${pageId}`);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private extractText(adfNode: any): string {
    if (!adfNode) return '';
    if (typeof adfNode === 'string') return adfNode;
    if (adfNode.type === 'text') return adfNode.text ?? '';
    if (Array.isArray(adfNode.content)) {
      return adfNode.content.map((n: any) => this.extractText(n)).join(' ');
    }
    return '';
  }

  private extractAcceptanceCriteria(fields: any): string[] {
    // Try custom field (Acceptance Criteria) first
    const custom = fields['customfield_10016'];
    if (custom) {
      const text = this.extractText(custom);
      return text
        .split(/\n|Given|When|Then/)
        .map((s: string) => s.trim())
        .filter(Boolean);
    }
    // Fall back to parsing description for Given/When/Then blocks
    const desc = this.extractText(fields.description);
    const matches = desc.match(/(Given|When|Then)[^\n]*/g);
    return matches ?? [];
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gis, ' ')
      .replace(/<script[^>]*>.*?<\/script>/gis, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  private mapError(err: unknown, context: string): Error {
    const isAxiosErr = err != null && typeof err === 'object' && (err as any).isAxiosError === true;
    if (isAxiosErr) {
      const axiosErr = err as { response?: { status?: number }; code?: string };
      const status = axiosErr.response?.status;
      if (status === 401 || status === 403) {
        return new Error(`Authentication/authorization error calling ${context}. Check API token.`);
      }
      if (status === 404) {
        return new Error(`Resource not found: ${context}.`);
      }
      if (axiosErr.code === 'ECONNABORTED') {
        return new Error(`Timeout calling ${context}. Atlassian API did not respond in time.`);
      }
      return new Error(`Atlassian API error (${status ?? 'unknown'}) calling ${context}.`);
    }
    if (err instanceof Error) return err;
    return new Error(`Unknown error calling ${context}.`);
  }
}
