# Demo Script — 15 Minutes

## Pre-demo checklist

- [ ] MCP server running locally (`npm start` in `mcp-server/`).
- [ ] Spring Boot app running (`mvn spring-boot:run` in `app/`).
- [ ] Jira POC-3 open in browser with Acceptance Criteria visible.
- [ ] Confluence STD-SEC-001 open with R04 visible.
- [ ] GitHub PR (S05 branch) open — `feat/poc-3-update-no-auth`.
- [ ] VS Code / GitHub.com ready with custom review agent selected.

---

## Minutes 0–2: Business problem

**Say:** "Today a reviewer must context-switch between three tools: Jira, Confluence, and GitHub. Requirements and standards are never cross-referenced consistently. We are going to show how Copilot can do the lookup automatically."

**Show:** A screenshot or live view of a PR with no Jira reference in the comments.

---

## Minutes 2–4: Architecture

**Show:** Architecture diagram from `plan.md` or a slide.

**Key points:**
- Copilot reads the PR diff.
- Calls `get_jira_issue` → fetches AC from Jira.
- Calls `search_confluence` + `get_confluence_page` → fetches rules.
- Produces structured findings.
- **Human reviewer decides.** Agent never approves or merges.

---

## Minutes 4–7: Source data

**Show Jira POC-3:**
- Story: "Update customer profile"
- AC-1: Only the authenticated owner or ADMIN may update.
- AC-2: Ownership must be verified server-side before updating.

**Show Confluence STD-SEC-001-R04:**
- Rule: "Endpoints that mutate user-owned resources must verify ownership in the service or security layer."
- Severity: HIGH
- Rationale: Prevents IDOR (Insecure Direct Object Reference).

---

## Minutes 7–11: Run the review

**PR to review:** `feat/poc-3-update-no-auth`

**The seeded defect:** `PUT /api/customers/{id}` has no `@PreAuthorize` annotation — any authenticated user can update any customer.

**Steps:**
1. Open the PR on GitHub (or in VS Code).
2. Select the **Code Review Agent** from the agent picker.
3. Trigger the review.
4. Watch the agent call `get_jira_issue("POC-3")` → retrieves AC.
5. Watch the agent call `search_confluence("authorization ownership")` → finds STD-SEC-001.
6. Agent produces:

```markdown
## [HIGH] Missing ownership authorization on update endpoint

- **Location:** `CustomerController.java:42-47`
- **Category:** Security / Access Control
- **Requirement:** `POC-3`, AC-2
- **Standard:** `STD-SEC-001-R04`
- **Evidence:** The `PUT /api/customers/{id}` handler has no `@PreAuthorize` expression.
  Any authenticated user can update any customer's profile.
- **Impact:** IDOR — authenticated user can modify another user's data.
- **Recommendation:** Add `@PreAuthorize("hasRole('ADMIN') or @ownershipGuard.isOwner(#principal, #id)")`
  and inject `@AuthenticationPrincipal UserDetails principal` as a parameter.
- **Confidence:** High
```

---

## Minutes 11–13: Human validation

**Reviewer actions:**
1. Verify finding against diff — confirm `@PreAuthorize` is absent.
2. Check Confluence STD-SEC-001-R04 — confirm rule text matches.
3. Request changes on the PR.

**Developer fix:**
1. Add `@PreAuthorize` with `ownershipGuard.isOwner`.
2. Add negative authorization test (`user-2` trying to update customer 1 → 403).
3. Push fix; CI runs; trigger review again.
4. Agent confirms: no HIGH/CRITICAL findings remain.

---

## Minutes 13–15: Metrics and conclusion

**Show scorecard:**

| Metric | Target | POC result |
|---|---|---|
| CRITICAL/HIGH recall | ≥ 80% | _fill in_ |
| Precision | ≥ 70% | _fill in_ |
| Median latency | ≤ 5 min | _fill in_ |
| Human effort reduction | ≥ 25% | _fill in_ |

**Key limitations to call out:**
- Same model that writes code also reviews — shared blind spots exist.
- Free Jira/Confluence plans may be unavailable during demos (failover: local mock).
- Cloud MCP configuration may differ from local IDE setup.

**Recommendation:** GO / CONDITIONAL GO / NO-GO (fill in based on actual results).
