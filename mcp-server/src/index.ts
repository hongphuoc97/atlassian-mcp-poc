// @ts-nocheck
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { AtlassianClient } from './atlassianClient.js';
import { loadConfig } from './config.js';
import type {
  GetJiraIssueInput,
  SearchConfluenceInput,
  GetConfluencePageInput,
  GetReviewContextInput,
} from './schemas.js';
import {
  GetJiraIssueInput as GetJiraIssueSchema,
  SearchConfluenceInput as SearchConfluenceSchema,
  GetConfluencePageInput as GetConfluencePageSchema,
  GetReviewContextInput as GetReviewContextSchema,
} from './schemas.js';

async function main() {
  const config = loadConfig();
  const client = new AtlassianClient(config);

  const server = new McpServer({
    name: 'atlassian-mcp-server',
    version: '1.0.0',
  });

  // ─── Tool 1: get_jira_issue ───────────────────────────────────────────────

  // @ts-ignore: TS2589 Type instantiation is excessively deep
  server.tool(
    'get_jira_issue',
    'Retrieve a Jira issue including its summary, description, Acceptance Criteria, status, and labels. Only issues in the allowed project list can be accessed.',
    { issue_key: z.string().describe('Jira issue key, e.g. POC-1') },
    async (input: any) => {
      const parsed = GetJiraIssueSchema.parse(input);
      const issue = await client.getJiraIssue(parsed.issue_key);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(issue, null, 2) }],
      };
    }
  );

  // ─── Tool 2: search_confluence ────────────────────────────────────────────

  server.tool(
    'search_confluence',
    'Search Confluence pages by full-text query within a specific space. Returns page IDs, titles, excerpts, and last-modified dates. Only allowed spaces can be searched.',
    {
      query: z.string().describe('Full-text search query, e.g. "constructor injection Spring"'),
      space_key: z.string().describe('Confluence space key, e.g. AICR'),
      limit: z.number().int().min(1).max(10).default(5).describe('Maximum results (1–10)'),
    },
    async (input: any) => {
      const parsed = SearchConfluenceSchema.parse(input);
      const results = await client.searchConfluence(parsed.query, parsed.space_key, parsed.limit);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
      };
    }
  );

  // ─── Tool 3: get_confluence_page ──────────────────────────────────────────

  server.tool(
    'get_confluence_page',
    'Retrieve the full plain-text content of a Confluence page by its numeric page ID. Content is truncated to the configured maximum length. Only pages in allowed spaces can be read.',
    { page_id: z.string().describe('Confluence page ID, e.g. "123456"') },
    async (input: any) => {
      const parsed = GetConfluencePageSchema.parse(input);
      const page = await client.getConfluencePage(parsed.page_id);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(page, null, 2) }],
      };
    }
  );

  // ─── Tool 4: get_review_context ───────────────────────────────────────────

  // @ts-ignore: TS2589 Type instantiation is excessively deep
  server.tool(
    'get_review_context',
    'Convenience tool that fetches the Jira issue AND searches for relevant Confluence standards based on changed file paths in a single call.',
    {
      issue_key: z.string().describe('Jira issue key'),
      changed_paths: z.array(z.string()).describe('List of changed file paths from the PR diff'),
    },
    async (input: any) => {
      const parsed = GetReviewContextSchema.parse(input);

      const issue = await client.getJiraIssue(parsed.issue_key);

      const categories = deriveCategories(parsed.changed_paths);
      const searchResults: Record<string, unknown[]> = {};

      for (const [term, label] of categories) {
        try {
          const results = await client.searchConfluence(
            term,
            config.confluenceAllowedSpaces[0],
            3
          );
          searchResults[label] = results;
        } catch {
          searchResults[label] = [`Search failed for "${term}"`];
        }
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ issue, relevantStandards: searchResults }, null, 2),
          },
        ],
      };
    }
  );

  // ─── Start ────────────────────────────────────────────────────────────────

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Atlassian MCP server running on stdio');
}

function deriveCategories(paths: string[]): Array<[string, string]> {
  const terms: Array<[string, string]> = [];
  for (const path of paths) {
    if (path.includes('Controller')) terms.push(['REST API standards', 'API']);
    if (path.includes('Repository') || path.includes('Mapper'))
      terms.push(['SQL injection parameterized query', 'Security-SQL']);
    if (path.includes('Service')) terms.push(['constructor injection Spring', 'Java']);
    if (path.includes('test') || path.includes('Test'))
      terms.push(['testing standards JUnit', 'Testing']);
  }
  if (terms.length === 0) terms.push(['coding standards Java', 'Java']);
  return [...new Map(terms.map((t) => [t[1], t])).values()];
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
