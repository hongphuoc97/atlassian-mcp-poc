# Security Checklist

## Identity and secrets

- [ ] Jira/Confluence API token has read-only scope.
- [ ] Token stored in GitHub Actions secret or local `.env` (not committed to Git).
- [ ] `.env` is listed in `.gitignore`.
- [ ] Token will be revoked/rotated after POC.
- [ ] No credentials in CI logs (`echo $TOKEN` never called).

## Data protection

- [ ] Only synthetic/fake data used in Jira and Confluence.
- [ ] No real PII (email, phone, ID numbers) in Jira issues or Confluence pages.
- [ ] MCP server response logging masks token and does not capture full page content.
- [ ] Response size cap enforced (`MAX_PAGE_CONTENT_CHARS`).

## MCP tool safety

- [ ] All tools are read-only (no write/delete operations).
- [ ] Project allowlist enforced: only `POC`.
- [ ] Space allowlist enforced: only `AICR`.
- [ ] Issue key format validated with regex before API call.
- [ ] Page ID validated as numeric before API call.
- [ ] Query length capped at 200 characters.
- [ ] Result limit capped at 10.
- [ ] Timeout per request: 8 seconds.
- [ ] External content returned to agent is tagged as untrusted data in agent profile.
- [ ] No shell, HTTP proxy, or file-system tools exposed to review agent.

## Review governance

- [ ] Agent cannot approve or merge PRs.
- [ ] CRITICAL/HIGH findings require human verification before action.
- [ ] False positive dismissal documented with reason.
- [ ] Review comment clearly distinguishes fact, assumption, and unavailable context.

## Post-POC cleanup

- [ ] Revoke Atlassian API token.
- [ ] Delete GitHub Actions secrets.
- [ ] Archive or delete the POC Jira project and Confluence space.
- [ ] Remove any local `.env` files from development machines.
