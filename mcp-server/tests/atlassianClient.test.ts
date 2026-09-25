import { AtlassianClient } from '../src/atlassianClient';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Get real AxiosError class (bypassing mock) so isAxiosError property is set correctly
const { AxiosError } = jest.requireActual<typeof import('axios')>('axios');

const baseConfig = {
  jiraBaseUrl: 'https://test.atlassian.net',
  confluenceBaseUrl: 'https://test.atlassian.net/wiki',
  atlassianEmail: 'test@example.com',
  atlassianApiToken: 'test-token',
  jiraAllowedProjects: ['POC'],
  confluenceAllowedSpaces: ['AICR'],
  cacheTtlSeconds: 60,
  requestTimeoutMs: 5000,
  maxPageContentChars: 4000,
};

describe('AtlassianClient', () => {
  let client: AtlassianClient;
  let mockJiraGet: jest.Mock;
  let mockConfluenceGet: jest.Mock;

  beforeEach(() => {
    mockJiraGet = jest.fn();
    mockConfluenceGet = jest.fn();

    mockedAxios.create = jest.fn()
      .mockReturnValueOnce({ get: mockJiraGet })       // jira
      .mockReturnValueOnce({ get: mockConfluenceGet }); // confluence

    client = new AtlassianClient(baseConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── getJiraIssue ─────────────────────────────────────────────────────────

  describe('getJiraIssue', () => {
    it('returns a JiraIssue for a valid POC key', async () => {
      mockJiraGet.mockResolvedValueOnce({
        data: {
          key: 'POC-1',
          fields: {
            summary: 'Get customer by ID',
            description: {
              type: 'doc',
              content: [{ type: 'text', text: 'Given customer ID exists When GET Then 200' }],
            },
            status: { name: 'In Progress' },
            labels: ['backend'],
            issuetype: { name: 'Story' },
          },
        },
      });

      const issue = await client.getJiraIssue('POC-1');
      expect(issue.key).toBe('POC-1');
      expect(issue.summary).toBe('Get customer by ID');
      expect(issue.status).toBe('In Progress');
    });

    it('throws for a project not in the allowlist', async () => {
      await expect(client.getJiraIssue('OTHER-1')).rejects.toThrow(
        "Project 'OTHER' is not in the allowlist."
      );
      expect(mockJiraGet).not.toHaveBeenCalled();
    });

    it('maps 404 to a clear error message', async () => {
      const error = Object.assign(new Error('Not Found'), {
        isAxiosError: true,
        response: { status: 404 },
      });
      mockJiraGet.mockRejectedValueOnce(error);

      await expect(client.getJiraIssue('POC-999')).rejects.toThrow('Resource not found');
    });

    it('maps 401 to an authentication error', async () => {
      const error = Object.assign(new Error('Unauthorized'), {
        isAxiosError: true,
        response: { status: 401 },
      });
      mockJiraGet.mockRejectedValueOnce(error);

      await expect(client.getJiraIssue('POC-1')).rejects.toThrow(
        'Authentication/authorization error'
      );
    });
  });

  // ─── searchConfluence ─────────────────────────────────────────────────────

  describe('searchConfluence', () => {
    it('returns search results for allowed space', async () => {
      mockConfluenceGet.mockResolvedValueOnce({
        data: {
          results: [
            {
              id: '12345',
              title: 'STD-JAVA-001',
              excerpt: '<b>Constructor</b> injection required',
              space: { key: 'AICR' },
              _links: { webui: '/display/AICR/STD-JAVA-001' },
              version: { when: '2026-01-01T00:00:00Z' },
            },
          ],
        },
      });

      const results = await client.searchConfluence('constructor injection', 'AICR', 5);
      expect(results).toHaveLength(1);
      expect(results[0].pageId).toBe('12345');
      expect(results[0].title).toBe('STD-JAVA-001');
      expect(results[0].excerpt).not.toContain('<b>'); // HTML stripped
    });

    it('throws for a space not in the allowlist', async () => {
      await expect(
        client.searchConfluence('anything', 'FORBIDDEN', 5)
      ).rejects.toThrow("Confluence space 'FORBIDDEN' is not in the allowlist.");
      expect(mockConfluenceGet).not.toHaveBeenCalled();
    });

    it('throws when query exceeds max length', async () => {
      const longQuery = 'x'.repeat(201);
      await expect(
        client.searchConfluence(longQuery, 'AICR', 5)
      ).rejects.toThrow('Search query too long');
    });
  });

  // ─── getConfluencePage ────────────────────────────────────────────────────

  describe('getConfluencePage', () => {
    it('returns page content with HTML stripped', async () => {
      mockConfluenceGet.mockResolvedValueOnce({
        data: {
          id: '12345',
          title: 'STD-JAVA-001',
          space: { key: 'AICR' },
          version: { number: 3, when: '2026-01-01T00:00:00Z' },
          body: { storage: { value: '<p>Constructor <b>injection</b> required.</p>' } },
          _links: { webui: '/display/AICR/STD-JAVA-001' },
        },
      });

      const page = await client.getConfluencePage('12345');
      expect(page.pageId).toBe('12345');
      expect(page.content).not.toContain('<p>');
      expect(page.content).toContain('Constructor');
    });

    it('throws for non-numeric page ID', async () => {
      await expect(client.getConfluencePage('../../../etc/passwd')).rejects.toThrow(
        'Invalid page ID format'
      );
      expect(mockConfluenceGet).not.toHaveBeenCalled();
    });

    it('throws when page belongs to non-allowed space', async () => {
      mockConfluenceGet.mockResolvedValueOnce({
        data: {
          id: '99999',
          title: 'Secret',
          space: { key: 'FORBIDDEN' },
          version: { number: 1, when: '2026-01-01T00:00:00Z' },
          body: { storage: { value: 'secret content' } },
          _links: { webui: '/display/FORBIDDEN/Secret' },
        },
      });

      await expect(client.getConfluencePage('99999')).rejects.toThrow(
        "space 'FORBIDDEN' which is not in the allowlist"
      );
    });
  });
});
