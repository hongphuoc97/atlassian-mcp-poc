# copilot-atlassian-poc

POC: GitHub Copilot Agent code review with Jira requirement tracing and Confluence coding standards.

## What this demonstrates

A custom GitHub Copilot review agent that:
1. Extracts the Jira issue key from the PR title/body/branch.
2. Fetches Acceptance Criteria from Jira via MCP.
3. Fetches relevant coding/security standards from Confluence via MCP.
4. Produces structured, evidence-backed review findings.
5. Never approves or merges — human reviewer decides.

## Repository structure

```
.github/
  agents/code-review-agent.agent.md   ← Copilot review agent profile
  copilot-instructions.md             ← Repository-level instructions
  pull_request_template.md            ← PR template with Jira key field
  workflows/ci.yml                    ← CI: build, test, secret scan
app/                                  ← Spring Boot 3 / Java 21 demo app
mcp-server/                           ← TypeScript MCP server (read-only Atlassian tools)
docs/
  test-scenarios.md                   ← Ground truth for 10 test scenarios
  evaluation-scorecard.md             ← Metrics tracking
  security-checklist.md               ← Security controls
  demo-script.md                      ← 15-minute demo script
```

## Quick start

### 1. Clone and configure

```bash
git clone <repo-url>
cd copilot-atlassian-poc

# MCP server
cd mcp-server
cp .env.example .env
# Fill in JIRA_BASE_URL, CONFLUENCE_BASE_URL, ATLASSIAN_EMAIL, ATLASSIAN_API_TOKEN
npm install
npm test
npm run build
```

### 2. Run the Spring Boot app

```bash
cd app
mvn spring-boot:run
# API available at http://localhost:8080/api/customers
```

### 3. Configure GitHub Copilot

1. Go to your repository settings → Copilot → MCP servers.
2. Add the MCP server configuration pointing to `mcp-server/dist/index.js`.
3. Set `COPILOT_MCP_ATLASSIAN_API_TOKEN` and related secrets.
4. Enable the `code-review-agent` in the agents panel.

### 4. Create a PR

Use the PR template. Include a Jira issue key (e.g. `POC-1`) in the Issue field.
Select the **code-review-agent** to run the review.

## MCP tools

| Tool | Purpose |
|---|---|
| `get_jira_issue` | Fetch Jira issue with Acceptance Criteria |
| `search_confluence` | Full-text search in the standards space |
| `get_confluence_page` | Read full page content by numeric ID |
| `get_review_context` | Combined shortcut (issue + relevant rules) |

## Security

- All tools are **read-only**.
- Project and space **allowlists** enforced at runtime.
- No token or PII logged.
- See [`docs/security-checklist.md`](docs/security-checklist.md).

## Evaluation

See [`docs/evaluation-scorecard.md`](docs/evaluation-scorecard.md) for metrics and Go/No-Go criteria.

## License

Internal POC — not for production use.
