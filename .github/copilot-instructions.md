# GitHub Copilot Repository Instructions

## Repository context

This is a **POC repository** demonstrating AI-assisted code review using GitHub Copilot, Jira, and Confluence.

- **Language:** Java 21, Spring Boot 3.x
- **Build tool:** Maven
- **Testing:** JUnit 5, Mockito
- **Primary Jira project:** `POC`
- **Primary Confluence space:** `AICR`

## Code style

- Use constructor injection (never field injection with `@Autowired`).
- Controllers must not contain business logic — delegate to service layer.
- All public REST endpoints must validate inputs and return standard error responses.
- Use parameterized queries; never concatenate user input into SQL strings.
- Do not log PII (email, phone, full name, ID numbers).
- All exceptions must be caught at a boundary and mapped to `ErrorResponse`.

## Review behavior (for review agent)

When reviewing a pull request:

1. Extract the Jira issue key from the PR title, body, or branch name.
2. Call `get_jira_issue` to retrieve the requirement and Acceptance Criteria.
3. Identify changed files and determine relevant standard categories (Java, API, Security, Testing, Logging).
4. Call `search_confluence` with relevant terms, then `get_confluence_page` for full rule text.
5. Review across these dimensions in order:
   - Requirement correctness (Jira AC compliance)
   - Security (injection, authorization, secrets, PII logging)
   - Reliability / error handling
   - Performance
   - Maintainability (code style, standards)
   - Testing (coverage of happy path, negative cases, boundaries)
6. Only raise findings backed by concrete evidence in the diff.
7. Do **not** invent Acceptance Criteria or Confluence rules.
8. If a tool fails, state clearly that the relevant context could not be verified.
9. Do **not** approve or merge; the human reviewer decides.

## Finding format

Each finding must use this format:

```markdown
## [SEVERITY] Short finding title

- **Location:** `FileName.java:LL-LL`
- **Category:** Category / Sub-category
- **Requirement:** `POC-N`, AC-N  (if applicable)
- **Standard:** `STD-XXX-NNN-RNN`  (if applicable)
- **Evidence:** Quote or describe the specific code pattern in the diff.
- **Impact:** What could go wrong.
- **Recommendation:** Specific actionable fix.
- **Confidence:** High / Medium / Low
```

## Severity definitions

| Severity | Meaning |
|---|---|
| CRITICAL | Could cause serious compromise or data loss |
| HIGH | Wrong requirement, significant security or reliability defect |
| MEDIUM | Maintainability, test gap, or moderate-impact defect |
| LOW | Minor improvement with clear rationale |
| INFO | Missing context or observation that does not block merge |
