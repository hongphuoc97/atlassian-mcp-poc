# MCP Server — Atlassian (Read-only)

Provides GitHub Copilot with read-only access to Jira and Confluence via the Model Context Protocol.

## Tools

### `get_jira_issue`

Fetches a Jira issue by key. Only issues in the project allowlist are accessible.

**Input:**
```json
{ "issue_key": "POC-1" }
```

**Output:** `key`, `summary`, `description`, `acceptanceCriteria[]`, `status`, `labels`, `issueType`

---

### `search_confluence`

Full-text search within a Confluence space.

**Input:**
```json
{ "query": "constructor injection Spring", "space_key": "AICR", "limit": 5 }
```

**Output:** Array of `pageId`, `title`, `excerpt`, `url`, `lastModified`

---

### `get_confluence_page`

Reads the full plain-text content of a Confluence page.

**Input:**
```json
{ "page_id": "123456" }
```

**Output:** `pageId`, `title`, `version`, `content` (truncated), `url`, `lastModified`

---

### `get_review_context`

Convenience tool: fetches the Jira issue and searches for relevant standards from changed file paths.

**Input:**
```json
{
  "issue_key": "POC-1",
  "changed_paths": ["app/src/main/java/.../CustomerController.java"]
}
```

## Setup

```bash
cp .env.example .env
# Fill in values — never commit .env
npm install
npm test
npm run build
node dist/index.js  # stdio transport
```

## Security

- All operations are read-only.
- Project allowlist: `JIRA_ALLOWED_PROJECTS` env var (comma-separated).
- Space allowlist: `CONFLUENCE_ALLOWED_SPACES` env var.
- Issue key validated with regex before API call.
- Page ID validated as numeric.
- Query length capped at 200 chars.
- Responses capped at `MAX_PAGE_CONTENT_CHARS` characters.
- Short TTL cache reduces API quota and latency.
- Token is never logged.
