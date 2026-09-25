/**
 * Bootstrap script: tạo Jira issues + Confluence pages cho POC.
 * Chạy: npx ts-node scripts/bootstrap-atlassian.ts
 *       (hoặc: node -r dotenv/config scripts/bootstrap-atlassian.js sau khi build)
 */

import 'dotenv/config';
import axios from 'axios';

// ─── Config từ .env ────────────────────────────────────────────────────────

const JIRA_URL = process.env.JIRA_BASE_URL!;
// Confluence REST API lives at /wiki/rest/api — ensure the /wiki segment is present
const CONF_URL_RAW = process.env.CONFLUENCE_BASE_URL!;
const CONF_URL = CONF_URL_RAW.endsWith('/wiki') ? CONF_URL_RAW : CONF_URL_RAW.replace(/\/$/, '') + '/wiki';
const EMAIL = process.env.ATLASSIAN_EMAIL!;
const TOKEN = process.env.ATLASSIAN_API_TOKEN!;

if (!JIRA_URL || !CONF_URL_RAW || !EMAIL || !TOKEN) {
  console.error('❌  Missing env vars. Copy .env.example → .env and fill in values.');
  process.exit(1);
}

const authHeader = 'Basic ' + Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64');
const headers = { Authorization: authHeader, 'Content-Type': 'application/json' };

const jira = axios.create({ baseURL: `${JIRA_URL}/rest/api/3`, headers });
const conf  = axios.create({ baseURL: `${CONF_URL}/rest/api`, headers });

// ─── Helpers ──────────────────────────────────────────────────────────────

function adf(text: string) {
  return {
    type: 'doc', version: 1,
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  };
}

function adfLines(...lines: string[]) {
  return {
    type: 'doc', version: 1,
    content: lines.map(line => ({
      type: 'paragraph',
      content: [{ type: 'text', text: line }],
    })),
  };
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─── 1. Jira: xác nhận project POC tồn tại ────────────────────────────────

async function getCurrentUserAccountId(): Promise<string> {
  const r = await jira.get('/myself');
  return r.data.accountId as string;
}

async function ensureJiraProject(): Promise<string> {
  console.log('\n📋  Checking Jira project POC…');
  try {
    const r = await jira.get('/project/POC');
    console.log(`   ✅  Project POC found (id=${r.data.id})`);
    return r.data.id;
  } catch (e: any) {
    if (e.response?.status === 404) {
      console.log('   ⚠️   Project POC not found — creating…');
      const accountId = await getCurrentUserAccountId();
      const r = await jira.post('/project', {
        key: 'POC',
        name: 'AI Code Review POC',
        projectTypeKey: 'software',
        projectTemplateKey: 'com.pyxis.greenhopper.jira:gh-simplified-scrum-classic',
        description: 'POC: GitHub Copilot Agent Review với Jira + Confluence',
        leadAccountId: accountId,
        assigneeType: 'PROJECT_LEAD',
      });
      console.log(`   ✅  Created project POC (id=${r.data.id})`);
      return r.data.id;
    }
    throw e;
  }
}

// ─── 2. Jira: tạo issues ──────────────────────────────────────────────────

interface JiraIssueSpec {
  summary: string;
  type: string;
  description: string;
  labels: string[];
}

const JIRA_ISSUES: JiraIssueSpec[] = [
  {
    summary: 'Get customer by ID',
    type: 'Story',
    labels: ['backend', 'poc'],
    description: [
      'Business context: Provide a REST endpoint to retrieve a single customer record by numeric ID.',
      '',
      'API contract: GET /api/customers/{id}',
      '',
      'Acceptance Criteria:',
      'Given customer ID exists',
      'When GET /api/customers/{id} is called',
      'Then return HTTP 200 with customer data (id, name, address)',
      '',
      'Given customer ID does not exist',
      'When GET /api/customers/{id} is called',
      'Then return HTTP 404 with standard error response (status, error, message, path, timestamp)',
      '',
      'Non-functional: Response time < 200ms at p95. No PII (email) in response body or logs.',
      '',
      'Out of scope: Pagination, filtering.',
      '',
      'Definition of Done: Unit tests pass. Controller test covers 200 and 404 cases.',
    ].join('\n'),
  },
  {
    summary: 'Search customers by name',
    type: 'Story',
    labels: ['backend', 'poc'],
    description: [
      'Business context: Allow searching the customer list by partial name match.',
      '',
      'API contract: GET /api/customers?name={fragment}&page={n}&size={s}',
      '',
      'Acceptance Criteria:',
      'Given customers exist matching the name fragment',
      'When GET /api/customers?name=ali is called',
      'Then return HTTP 200 with paginated list of matching customers',
      '',
      'Given no customers match',
      'When GET /api/customers?name=xyz is called',
      'Then return HTTP 200 with empty content array (NOT 404)',
      '',
      'Given name param is blank or missing',
      'When GET /api/customers is called',
      'Then return HTTP 200 with all customers (paginated)',
      '',
      'Non-functional: Result set must be paginated (default page size 20). Query must use parameterized JPQL.',
      '',
      'Out of scope: Full-text search, fuzzy matching.',
      '',
      'Definition of Done: Tests cover name match, no-result, and blank-name cases.',
    ].join('\n'),
  },
  {
    summary: 'Update customer profile',
    type: 'Story',
    labels: ['backend', 'poc', 'security'],
    description: [
      'Business context: Allow a customer to update their own profile (name, address).',
      '',
      'API contract: PUT /api/customers/{id}',
      '',
      'Acceptance Criteria:',
      'Given the authenticated user is the owner of customer {id} or has ADMIN role',
      'When PUT /api/customers/{id} is called with valid body',
      'Then return HTTP 200 with updated customer data',
      '',
      'Given the authenticated user is NOT the owner and does not have ADMIN role',
      'When PUT /api/customers/{id} is called',
      'Then return HTTP 403 Forbidden',
      '',
      'Given customer {id} does not exist',
      'When PUT /api/customers/{id} is called by ADMIN',
      'Then return HTTP 404 with standard error response',
      '',
      'Given request body fails validation (blank name)',
      'When PUT /api/customers/{id} is called',
      'Then return HTTP 400 with field-level errors',
      '',
      'Non-functional: Ownership check must happen server-side (not client-declared). Email is immutable.',
      '',
      'Out of scope: Password change, email change.',
      '',
      'Definition of Done: Tests cover owner-success, non-owner-403, not-found-404, and validation-400 cases.',
    ].join('\n'),
  },
  {
    summary: 'PII appears in application log',
    type: 'Bug',
    labels: ['security', 'pii', 'poc'],
    description: [
      'Observed: Customer email address appears in application log output at INFO level.',
      '',
      'Steps to reproduce:',
      '1. Call GET /api/customers/{id} with a valid ID.',
      '2. Inspect application log.',
      '3. Customer email is visible in the log line.',
      '',
      'Expected: No PII (email, phone, full name) in log output per STD-LOG-001.',
      '',
      'Acceptance Criteria:',
      'Given a customer lookup is performed',
      'When application logs are inspected',
      'Then no email, phone number or full name appears in any log line',
      '',
      'Severity: HIGH — violates data protection policy.',
    ].join('\n'),
  },
  {
    summary: 'Add persistence layer with database queries',
    type: 'Task',
    labels: ['backend', 'poc', 'database'],
    description: [
      'Business context: Replace in-memory data with a JPA/H2 persistence layer.',
      '',
      'Acceptance Criteria:',
      'Given the application starts',
      'When the database is initialised',
      'Then schema is created and seed data is loaded',
      '',
      'Given a search query is executed',
      'When the repository method is called',
      'Then a parameterized JPQL query is used (no string concatenation)',
      '',
      'Given an invalid or attacker-controlled search term is provided',
      'When the repository method is called',
      'Then the query is executed safely without SQL injection risk',
      '',
      'Non-functional: All queries must use parameterized binding per STD-SEC-001-R02. N+1 queries are prohibited.',
      '',
      'Out of scope: Production database (PostgreSQL/MySQL). Only H2 in-memory for POC.',
      '',
      'Definition of Done: No raw string concatenation in queries. Tests cover normal and boundary inputs.',
    ].join('\n'),
  },
];

async function createJiraIssues() {
  console.log('\n🎫  Creating Jira issues…');
  const createdKeys: string[] = [];

  for (const spec of JIRA_ISSUES) {
    try {
      // Map type name to Jira issue type
      const r = await jira.post('/issue', {
        fields: {
          project: { key: 'POC' },
          summary: spec.summary,
          issuetype: { name: spec.type },
          description: adfLines(...spec.description.split('\n')),
          labels: spec.labels,
        },
      });
      console.log(`   ✅  Created ${r.data.key}: ${spec.summary}`);
      createdKeys.push(r.data.key);
    } catch (e: any) {
      const msg = e.response?.data?.errors
        ? JSON.stringify(e.response.data.errors)
        : e.message;
      console.warn(`   ⚠️   Failed to create "${spec.summary}": ${msg}`);
    }
    await sleep(300); // rate-limit friendly
  }
  return createdKeys;
}

// ─── 3. Confluence: xác nhận space AICR ───────────────────────────────────

async function ensureConfluenceSpace(): Promise<string> {
  console.log('\n📚  Checking Confluence space AICR…');
  try {
    const r = await conf.get('/space/AICR');
    console.log(`   ✅  Space AICR found`);
    return r.data.key;
  } catch (e: any) {
    if (e.response?.status === 404) {
      console.log('   ⚠️   Space AICR not found — creating…');
      const r = await conf.post('/space', {
        key: 'AICR',
        name: 'AI Code Review POC',
        description: {
          plain: { value: 'Coding, security, and testing standards for the GitHub Copilot Review Agent POC.', representation: 'plain' },
        },
      });
      console.log(`   ✅  Created space AICR`);
      return r.data.key;
    }
    throw e;
  }
}

// ─── 4. Confluence: tạo pages ─────────────────────────────────────────────

interface PageSpec { title: string; body: string; }

const CONFLUENCE_PAGES: PageSpec[] = [
  {
    title: 'STD-JAVA-001 - Java Coding Standards',
    body: `<h1>Java Coding Standards</h1>
<p><strong>Space:</strong> AICR | <strong>Version:</strong> 1.0 | <strong>Owner:</strong> Engineering</p>

<h2>STD-JAVA-001-R01 — No Magic Numbers</h2>
<p><strong>Severity:</strong> LOW | <strong>Applies To:</strong> All Java code</p>
<p><strong>Rule:</strong> Replace numeric literals with named constants (<code>static final</code> fields or enums).</p>
<p><strong>Rationale:</strong> Improves readability and maintainability.</p>
<p><strong>Bad:</strong> <code>if (status == 2)</code></p>
<p><strong>Good:</strong> <code>if (status == Status.ACTIVE)</code></p>
<p><strong>Exceptions:</strong> 0 and 1 in simple loop counters.</p>

<h2>STD-JAVA-001-R02 — Immutable Value Objects</h2>
<p><strong>Severity:</strong> MEDIUM | <strong>Applies To:</strong> DTOs, value objects</p>
<p><strong>Rule:</strong> DTOs and value objects must be immutable. Use Java records or final fields with no setters.</p>
<p><strong>Rationale:</strong> Prevents accidental mutation and simplifies reasoning.</p>
<p><strong>Bad:</strong> Mutable POJO with public setters used as API response.</p>
<p><strong>Good:</strong> <code>public record CustomerResponse(Long id, String name, String address) {}</code></p>

<h2>STD-JAVA-001-R03 — Constructor Injection Required</h2>
<p><strong>Severity:</strong> MEDIUM | <strong>Applies To:</strong> Spring components (@Service, @Controller, @Repository)</p>
<p><strong>Rule:</strong> Dependencies must be injected through constructors, not via <code>@Autowired</code> field injection.</p>
<p><strong>Rationale:</strong> Explicit dependencies, easier unit testing without Spring context, immutability.</p>
<p><strong>Bad:</strong></p>
<ac:structured-macro ac:name="code"><ac:plain-text-body><![CDATA[@Service
public class CustomerService {
  @Autowired
  private CustomerRepository repo; // VIOLATION
}]]></ac:plain-text-body></ac:structured-macro>
<p><strong>Good:</strong></p>
<ac:structured-macro ac:name="code"><ac:plain-text-body><![CDATA[@Service
public class CustomerService {
  private final CustomerRepository repo;
  public CustomerService(CustomerRepository repo) { this.repo = repo; }
}]]></ac:plain-text-body></ac:structured-macro>
<p><strong>Exceptions:</strong> Framework-generated code (e.g. JPA entities), with written justification.</p>

<h2>STD-JAVA-001-R04 — Single Responsibility per Class</h2>
<p><strong>Severity:</strong> MEDIUM | <strong>Applies To:</strong> All classes</p>
<p><strong>Rule:</strong> Each class should have one primary responsibility. Controllers delegate to services; services delegate to repositories.</p>
<p><strong>Rationale:</strong> Cohesion, testability, and change isolation.</p>
<p><strong>Bad:</strong> Controller method fetching from DB directly, applying business rules, and formatting output.</p>
<p><strong>Good:</strong> Controller calls service; service calls repository; each layer has one job.</p>`,
  },
  {
    title: 'STD-API-001 - REST API Standards',
    body: `<h1>REST API Standards</h1>
<p><strong>Space:</strong> AICR | <strong>Version:</strong> 1.0</p>

<h2>STD-API-001-R01 — No Business Logic in Controllers</h2>
<p><strong>Severity:</strong> MEDIUM | <strong>Applies To:</strong> @RestController classes</p>
<p><strong>Rule:</strong> Controllers must not contain business logic. Responsibilities: parse input, call service, return response.</p>
<p><strong>Rationale:</strong> Separation of concerns; business logic must be unit-testable without HTTP context.</p>
<p><strong>Bad:</strong> Controller queries database directly, applies validation rules, formats business results.</p>
<p><strong>Good:</strong> Controller calls <code>customerService.getById(id)</code> and returns the result.</p>

<h2>STD-API-001-R02 — Standard HTTP Status Codes</h2>
<p><strong>Severity:</strong> HIGH | <strong>Applies To:</strong> All REST endpoints</p>
<p><strong>Rule:</strong> Use standard HTTP status codes consistently.</p>
<table>
<tr><th>Situation</th><th>Status</th></tr>
<tr><td>Successful GET/PUT</td><td>200 OK</td></tr>
<tr><td>Successful POST (created)</td><td>201 Created</td></tr>
<tr><td>Successful DELETE</td><td>204 No Content</td></tr>
<tr><td>Validation failure</td><td>400 Bad Request</td></tr>
<tr><td>Unauthenticated</td><td>401 Unauthorized</td></tr>
<tr><td>Forbidden / insufficient role</td><td>403 Forbidden</td></tr>
<tr><td>Resource not found</td><td>404 Not Found</td></tr>
<tr><td>Unexpected error</td><td>500 Internal Server Error</td></tr>
</table>

<h2>STD-API-001-R03 — Input Validation on All Public Endpoints</h2>
<p><strong>Severity:</strong> HIGH | <strong>Applies To:</strong> All @RequestBody and @RequestParam parameters</p>
<p><strong>Rule:</strong> All public API inputs must be validated using Bean Validation (<code>@Valid</code>, <code>@NotBlank</code>, <code>@Size</code>, etc.).</p>
<p><strong>Rationale:</strong> Prevents injection, unexpected state, and improves API contract clarity.</p>
<p><strong>Bad:</strong> Accepting and persisting a blank name without validation.</p>
<p><strong>Good:</strong> <code>@NotBlank @Size(max=100) String name</code> with <code>@Valid</code> on the method parameter.</p>

<h2>STD-API-001-R04 — Standard Error Response Format (ADR-001)</h2>
<p><strong>Severity:</strong> MEDIUM | <strong>Applies To:</strong> All error responses</p>
<p><strong>Rule:</strong> All error responses must use the standard envelope: <code>{status, error, message, path, timestamp, fieldErrors}</code>.</p>
<p><strong>Rationale:</strong> Consistent error handling for clients and monitoring tools.</p>
<p><strong>Reference:</strong> See ADR-001 — Error Response Format.</p>`,
  },
  {
    title: 'STD-SEC-001 - Secure Coding Checklist',
    body: `<h1>Secure Coding Checklist</h1>
<p><strong>Space:</strong> AICR | <strong>Version:</strong> 1.0 | <strong>Owner:</strong> Security</p>

<h2>STD-SEC-001-R01 — No Hardcoded Secrets</h2>
<p><strong>Severity:</strong> CRITICAL | <strong>Applies To:</strong> All source files</p>
<p><strong>Rule:</strong> API keys, passwords, tokens, and secrets must never appear in source code or committed configuration files. Use environment variables or a secret manager.</p>
<p><strong>Bad:</strong> <code>String apiKey = "ATATT3xFfGF0...";</code></p>
<p><strong>Good:</strong> <code>String apiKey = System.getenv("API_KEY");</code></p>

<h2>STD-SEC-001-R02 — No SQL String Concatenation</h2>
<p><strong>Severity:</strong> CRITICAL | <strong>Applies To:</strong> All database access code</p>
<p><strong>Rule:</strong> Never concatenate user-supplied input into SQL or JPQL query strings. Always use parameterized queries or named parameters.</p>
<p><strong>Rationale:</strong> Prevents SQL injection attacks.</p>
<p><strong>Bad:</strong></p>
<ac:structured-macro ac:name="code"><ac:plain-text-body><![CDATA[String sql = "SELECT * FROM customers WHERE name = '" + name + "'";
jdbcTemplate.query(sql, ...); // CRITICAL VIOLATION — SQL Injection
]]></ac:plain-text-body></ac:structured-macro>
<p><strong>Good:</strong></p>
<ac:structured-macro ac:name="code"><ac:plain-text-body><![CDATA[@Query("SELECT c FROM Customer c WHERE c.name = :name")
List<Customer> findByName(@Param("name") String name);
]]></ac:plain-text-body></ac:structured-macro>

<h2>STD-SEC-001-R03 — Input Validation Before Processing</h2>
<p><strong>Severity:</strong> HIGH | <strong>Applies To:</strong> All endpoints accepting user input</p>
<p><strong>Rule:</strong> Validate and sanitize all user input before processing or persisting. Reject invalid input early with a 400 response.</p>
<p><strong>Rationale:</strong> Defence in depth against injection and unexpected state.</p>

<h2>STD-SEC-001-R04 — Server-Side Ownership Verification</h2>
<p><strong>Severity:</strong> HIGH | <strong>Applies To:</strong> Endpoints that mutate user-owned resources</p>
<p><strong>Rule:</strong> Endpoints that create, update, or delete resources owned by a specific user must verify ownership server-side before performing the operation. Client-supplied ownership claims must not be trusted.</p>
<p><strong>Rationale:</strong> Prevents Insecure Direct Object Reference (IDOR) — an authenticated user must not be able to modify another user's data by guessing or enumerating IDs.</p>
<p><strong>Bad:</strong> PUT /api/customers/{id} with no authorization check — any authenticated user can update any customer.</p>
<p><strong>Good:</strong> <code>@PreAuthorize("hasRole('ADMIN') or @ownershipGuard.isOwner(#principal, #id)")</code></p>
<p><strong>Exceptions:</strong> ADMIN role may act on behalf of any user, documented and audited.</p>

<h2>STD-SEC-001-R05 — Authorization Check Before Business Logic</h2>
<p><strong>Severity:</strong> HIGH | <strong>Applies To:</strong> All write operations</p>
<p><strong>Rule:</strong> Authorization must be checked before any business logic executes. Do not fetch the resource, check ownership in application code after fetching, and then decide whether to proceed.</p>
<p><strong>Rationale:</strong> Prevents information leakage through timing differences and ensures consistent enforcement.</p>`,
  },
  {
    title: 'STD-TEST-001 - Testing Standards',
    body: `<h1>Testing Standards</h1>
<p><strong>Space:</strong> AICR | <strong>Version:</strong> 1.0</p>

<h2>STD-TEST-001-R01 — Happy Path Test Required</h2>
<p><strong>Severity:</strong> MEDIUM | <strong>Applies To:</strong> All public service and controller methods</p>
<p><strong>Rule:</strong> Every public method must have at least one test covering the successful / happy-path scenario.</p>

<h2>STD-TEST-001-R02 — Not-Found / Negative Test Required</h2>
<p><strong>Severity:</strong> MEDIUM | <strong>Applies To:</strong> All methods that can return not-found or empty results</p>
<p><strong>Rule:</strong> Methods that can return a not-found condition must have a test verifying the correct exception or response is returned (e.g. 404, empty page).</p>

<h2>STD-TEST-001-R03 — Invalid Input Test Required</h2>
<p><strong>Severity:</strong> MEDIUM | <strong>Applies To:</strong> All endpoints with input validation</p>
<p><strong>Rule:</strong> At least one test must verify that invalid input (blank, null, too-long, wrong type) is rejected with HTTP 400 and field-level errors.</p>

<h2>STD-TEST-001-R04 — Authorization Negative Test Required</h2>
<p><strong>Severity:</strong> HIGH | <strong>Applies To:</strong> All endpoints with @PreAuthorize or access control</p>
<p><strong>Rule:</strong> Every secured endpoint must have a test verifying that an unauthorized user (wrong role or non-owner) receives HTTP 403.</p>
<p><strong>Rationale:</strong> Without a negative authorization test, the access control logic may never be exercised in CI.</p>
<p><strong>Bad:</strong> Only testing the owner-success case for PUT /api/customers/{id}.</p>
<p><strong>Good:</strong> Also testing with <code>@WithMockUser(username="user-2", roles="USER")</code> attempting to update customer 1 → expect 403.</p>

<h2>STD-TEST-001-R05 — No Business Logic in Test Setup</h2>
<p><strong>Severity:</strong> LOW | <strong>Applies To:</strong> All test classes</p>
<p><strong>Rule:</strong> Test setup (<code>@BeforeEach</code>) must only prepare data and mocks, not implement business logic or assertions.</p>`,
  },
  {
    title: 'STD-LOG-001 - Logging and PII Rules',
    body: `<h1>Logging and PII Rules</h1>
<p><strong>Space:</strong> AICR | <strong>Version:</strong> 1.0 | <strong>Owner:</strong> Security + Engineering</p>

<h2>STD-LOG-001-R01 — No PII in Log Output</h2>
<p><strong>Severity:</strong> HIGH | <strong>Applies To:</strong> All log statements</p>
<p><strong>Rule:</strong> The following data must never appear in log output at any level (DEBUG, INFO, WARN, ERROR):</p>
<ul>
<li>Email addresses</li>
<li>Phone numbers</li>
<li>Full names</li>
<li>National ID numbers, passport numbers</li>
<li>Dates of birth</li>
<li>Payment card numbers</li>
<li>Passwords, secrets, API tokens</li>
</ul>
<p><strong>Rationale:</strong> Log aggregation tools (ELK, Splunk) retain data for extended periods. PII in logs creates data protection and compliance risk.</p>
<p><strong>Bad:</strong> <code>log.info("Customer fetched: email={}, name={}", customer.getEmail(), customer.getName());</code></p>
<p><strong>Good:</strong> <code>log.debug("Customer fetched: id={}", customer.getId());</code></p>

<h2>STD-LOG-001-R02 — Log Metadata, Not Content</h2>
<p><strong>Severity:</strong> MEDIUM | <strong>Applies To:</strong> All log statements</p>
<p><strong>Rule:</strong> Log identifiers (IDs, counts, durations, status codes) rather than entity content. If content must be logged for debugging, use a separate debug log level that is disabled in production.</p>

<h2>STD-LOG-001-R03 — Mask Sensitive Data in Error Responses</h2>
<p><strong>Severity:</strong> HIGH | <strong>Applies To:</strong> GlobalExceptionHandler, error logging</p>
<p><strong>Rule:</strong> Exception messages passed to the client must not leak internal implementation details, stack traces, or PII. Log the full exception server-side; return only a sanitized message to the client.</p>
<p><strong>Bad:</strong> Returning the full exception message (which may include SQL, class names, or user data) in the API error response.</p>
<p><strong>Good:</strong> Return a generic message like "An unexpected error occurred". Log the full exception internally.</p>

<h2>STD-LOG-001-R04 — Structured Logging Format</h2>
<p><strong>Severity:</strong> LOW | <strong>Applies To:</strong> All log statements</p>
<p><strong>Rule:</strong> Use SLF4J parameterized log statements. Do not use string concatenation in log statements.</p>
<p><strong>Bad:</strong> <code>log.info("Processing customer " + id + " for user " + user);</code></p>
<p><strong>Good:</strong> <code>log.info("Processing customer id={} for user id={}", customerId, userId);</code></p>`,
  },
  {
    title: 'ADR-001 - Error Response Format',
    body: `<h1>ADR-001 — Error Response Format</h1>
<p><strong>Space:</strong> AICR | <strong>Status:</strong> Accepted | <strong>Date:</strong> 2026-09-01</p>

<h2>Context</h2>
<p>The API needs a consistent error response structure so that clients, monitoring systems, and the AI review agent can reliably parse and act on error information.</p>

<h2>Decision</h2>
<p>All error responses must use the following JSON envelope:</p>
<ac:structured-macro ac:name="code"><ac:parameter ac:name="language">json</ac:parameter><ac:plain-text-body><![CDATA[{
  "status": 404,
  "error": "Not Found",
  "message": "Customer not found: 99",
  "path": "/api/customers/99",
  "timestamp": "2026-09-10T10:00:00Z",
  "fieldErrors": []
}
]]></ac:plain-text-body></ac:structured-macro>

<h2>Field definitions</h2>
<table>
<tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr>
<tr><td>status</td><td>integer</td><td>Yes</td><td>HTTP status code</td></tr>
<tr><td>error</td><td>string</td><td>Yes</td><td>HTTP reason phrase</td></tr>
<tr><td>message</td><td>string</td><td>Yes</td><td>Human-readable error description (no PII, no stack trace)</td></tr>
<tr><td>path</td><td>string</td><td>Yes</td><td>Request URI</td></tr>
<tr><td>timestamp</td><td>ISO-8601</td><td>Yes</td><td>UTC time of error</td></tr>
<tr><td>fieldErrors</td><td>array</td><td>Yes</td><td>Empty array for non-validation errors; field-level errors for 400</td></tr>
</table>

<h2>fieldErrors element (for HTTP 400)</h2>
<ac:structured-macro ac:name="code"><ac:parameter ac:name="language">json</ac:parameter><ac:plain-text-body><![CDATA[{
  "fieldErrors": [
    { "field": "name", "message": "Name must not be blank" },
    { "field": "email", "message": "Email must not be blank" }
  ]
}
]]></ac:plain-text-body></ac:structured-macro>

<h2>Consequences</h2>
<ul>
<li>All controllers must use <code>GlobalExceptionHandler</code> — no ad-hoc error responses.</li>
<li>The AI review agent can check any 4xx/5xx response for compliance with this format.</li>
<li>Clients can write generic error-handling code without parsing different error shapes.</li>
</ul>

<h2>Alternatives considered</h2>
<ul>
<li><strong>RFC 7807 (Problem Details):</strong> More standard but adds complexity for a POC.</li>
<li><strong>Ad-hoc per-endpoint errors:</strong> Rejected — inconsistent, hard to monitor.</li>
</ul>`,
  },
];

async function createConfluencePages(spaceKey: string) {
  console.log('\n📄  Creating Confluence pages…');
  const created: string[] = [];

  // Get space homepage to use as parent
  let parentId: string | undefined;
  try {
    const r = await conf.get(`/space/${spaceKey}`, { params: { expand: 'homepage' } });
    parentId = r.data.homepage?.id;
  } catch { /* no parent */ }

  for (const page of CONFLUENCE_PAGES) {
    // Check if page already exists
    try {
      const existing = await conf.get('/content', {
        params: { spaceKey, title: page.title, expand: 'version' },
      });
      if (existing.data.results?.length > 0) {
        const pageId = existing.data.results[0].id;
        console.log(`   ℹ️   Page already exists — updating: "${page.title}" (id=${pageId})`);
        const version = existing.data.results[0].version.number;
        await conf.put(`/content/${pageId}`, {
          version: { number: version + 1 },
          title: page.title,
          type: 'page',
          body: { storage: { value: page.body, representation: 'storage' } },
        });
        console.log(`   ✅  Updated: "${page.title}"`);
        created.push(pageId);
        await sleep(300);
        continue;
      }
    } catch { /* proceed to create */ }

    try {
      const payload: any = {
        type: 'page',
        title: page.title,
        space: { key: spaceKey },
        body: { storage: { value: page.body, representation: 'storage' } },
      };
      if (parentId) payload.ancestors = [{ id: parentId }];

      const r = await conf.post('/content', payload);
      console.log(`   ✅  Created: "${page.title}" (id=${r.data.id})`);
      created.push(r.data.id);
    } catch (e: any) {
      const msg = e.response?.data?.message ?? e.message;
      console.warn(`   ⚠️   Failed to create "${page.title}": ${msg}`);
    }
    await sleep(300);
  }
  return created;
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀  Atlassian POC Bootstrap');
  console.log(`   Jira:       ${JIRA_URL}`);
  console.log(`   Confluence: ${CONF_URL}`);
  console.log(`   Email:      ${EMAIL}`);

  try {
    await ensureJiraProject();
    const keys = await createJiraIssues();
    await ensureConfluenceSpace();
    const pages = await createConfluencePages('AICR');

    console.log('\n✅  Bootstrap complete!');
    console.log(`   Jira issues created/found: ${keys.join(', ')}`);
    console.log(`   Confluence pages created/updated: ${pages.length}`);
    console.log(`\n   🔗 Jira:       ${JIRA_URL}/jira/software/projects/POC/boards`);
    console.log(`   🔗 Confluence: ${CONF_URL}/wiki/spaces/AICR`);
  } catch (e: any) {
    const status = e.response?.status;
    const data = JSON.stringify(e.response?.data ?? {});
    console.error(`\n❌  Fatal error (HTTP ${status ?? '?'}): ${e.message}`);
    console.error(`   Details: ${data}`);
    process.exit(1);
  }
}

main();
