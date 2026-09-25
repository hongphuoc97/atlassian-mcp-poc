import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Fix path resolution for ES modules or CJS (depending on TS output)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { z } from 'zod';

const configSchema = z.object({
  jiraBaseUrl: z.string().url(),
  confluenceBaseUrl: z.string().url(),
  atlassianEmail: z.string().email(),
  atlassianApiToken: z.string().min(1),
  jiraAllowedProjects: z.array(z.string().min(1)),
  confluenceAllowedSpaces: z.array(z.string().min(1)),
  cacheTtlSeconds: z.number().int().positive(),
  requestTimeoutMs: z.number().int().positive(),
  maxPageContentChars: z.number().int().positive(),
});

export type Config = z.infer<typeof configSchema>;

function parseCommaSeparated(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

export function loadConfig(): Config {
  const raw = {
    jiraBaseUrl: process.env.JIRA_BASE_URL,
    confluenceBaseUrl: process.env.CONFLUENCE_BASE_URL,
    atlassianEmail: process.env.ATLASSIAN_EMAIL,
    atlassianApiToken: process.env.ATLASSIAN_API_TOKEN,
    jiraAllowedProjects: parseCommaSeparated(process.env.JIRA_ALLOWED_PROJECTS),
    confluenceAllowedSpaces: parseCommaSeparated(process.env.CONFLUENCE_ALLOWED_SPACES),
    cacheTtlSeconds: parseInt(process.env.CACHE_TTL_SECONDS ?? '120', 10),
    requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS ?? '8000', 10),
    maxPageContentChars: parseInt(process.env.MAX_PAGE_CONTENT_CHARS ?? '4000', 10),
  };

  const result = configSchema.safeParse(raw);
  if (!result.success) {
    const errors = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid MCP server configuration:\n${errors}`);
  }
  return result.data;
}
