import { z } from 'zod';

// ─── Tool input schemas (used for validation + MCP registration) ──────────────

export const GetJiraIssueInput = z.object({
  issue_key: z
    .string()
    .regex(/^[A-Z]+-\d+$/, 'Issue key must match pattern PROJECT-123')
    .describe('Jira issue key, e.g. POC-1'),
});
export type GetJiraIssueInput = z.infer<typeof GetJiraIssueInput>;

export const SearchConfluenceInput = z.object({
  query: z
    .string()
    .min(2)
    .max(200)
    .describe('Full-text search query, e.g. "constructor injection Spring"'),
  space_key: z
    .string()
    .min(1)
    .max(50)
    .describe('Confluence space key, e.g. AICR'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5)
    .describe('Maximum number of results to return (1–10)'),
});
export type SearchConfluenceInput = z.infer<typeof SearchConfluenceInput>;

export const GetConfluencePageInput = z.object({
  page_id: z
    .string()
    .regex(/^\d+$/, 'Page ID must be a numeric string')
    .describe('Confluence page ID, e.g. "123456"'),
});
export type GetConfluencePageInput = z.infer<typeof GetConfluencePageInput>;

export const GetReviewContextInput = z.object({
  issue_key: z
    .string()
    .regex(/^[A-Z]+-\d+$/)
    .describe('Jira issue key'),
  changed_paths: z
    .array(z.string())
    .max(20)
    .describe('List of changed file paths from the PR diff'),
});
export type GetReviewContextInput = z.infer<typeof GetReviewContextInput>;
