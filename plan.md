# POC Plan: GitHub Copilot Agent Review Code với Jira và Confluence
 
**Phiên bản:** 1.0  
**Ngày lập kế hoạch:** 08/09/2026  
**Thời lượng đề xuất:** 10 ngày làm việc  
**Đối tượng:** Cá nhân hoặc nhóm kỹ thuật nhỏ  
**Mục tiêu:** Chứng minh GitHub Copilot có thể đọc requirement từ Jira, đọc coding standard từ Confluence, phân tích thay đổi trong Pull Request và đưa ra nhận xét review có căn cứ.
 
---
 
## 1. Executive Summary
 
POC xây dựng một quy trình AI-assisted development không sử dụng LangGraph. GitHub Copilot đóng vai trò coding/review agent; Jira quản lý requirement; Confluence lưu coding standard; MCP Server cung cấp các tool để Copilot truy xuất dữ liệu Atlassian.
 
Luồng mục tiêu:
 
```text
Jira Story + Acceptance Criteria
                |
                v
Developer / GitHub Copilot Coding Agent
                |
                v
          Pull Request
                |
                v
GitHub Copilot Review Agent
       |                  |
       v                  v
Jira MCP Tool      Confluence MCP Tool
       |                  |
       v                  v
Requirement       Coding/Security Standards
                |
                v
     Review findings trên PR
                |
                v
        Human reviewer quyết định
```
 
GitHub hỗ trợ custom agent profile bằng Markdown/YAML và cho phép cấu hình MCP servers/tools. Repository-level MCP configuration có thể được chia sẻ cho Copilot cloud agent và Copilot code review. Tuy nhiên, cloud agent/code review hiện chỉ sử dụng MCP **tools**, không sử dụng MCP resources hoặc prompts; remote MCP dùng OAuth cũng có giới hạn cần kiểm tra tại thời điểm triển khai. Vì vậy POC ưu tiên MCP tool nhỏ, read-only, xác thực bằng secret/token. [GitHub Docs: Custom agents](Custom agents configuration - GitHub Docs) | [GitHub Docs: Repository MCP](Configure MCP servers for your repository - GitHub Docs)
 
---
 
## 2. Mục tiêu POC
 
### 2.1 Mục tiêu nghiệp vụ
 
1. Giảm thời gian reviewer phải tìm kiếm requirement và coding standard.
2. Phát hiện sớm code không đáp ứng Acceptance Criteria.
3. Chuẩn hóa comment review theo severity, evidence, impact và recommendation.
4. Chứng minh khả năng truy vết:
   - Jira issue → code change → PR → review finding.
   - Confluence rule → code location → recommendation.
5. Giữ human reviewer là người quyết định cuối cùng.
 
### 2.2 Mục tiêu kỹ thuật
 
- Tạo một GitHub repository demo với ứng dụng Java Spring Boot nhỏ.
- Tạo Jira project demo có Epic, Story, Bug và Acceptance Criteria.
- Tạo Confluence space chứa Java, API, security và testing standards.
- Tạo Copilot custom review agent tại `.github/agents/code-review-agent.agent.md`.
- Tạo MCP Server cung cấp các tool read-only để lấy Jira issue và tìm kiếm Confluence.
- Thực hiện ít nhất 5 PR scenarios, bao gồm positive và negative cases.
- Đo độ chính xác, noise, thời gian và khả năng truy vết của review.
 
### 2.3 Ngoài phạm vi
 
- Không tự động merge PR.
- Không tự động sửa production code mà không có phê duyệt.
- Không truy cập Jira/Confluence production.
- Không xử lý dữ liệu khách hàng, source code mật hoặc thông tin BFSI thật.
- Không thay thế SonarQube, SAST, dependency scanner hoặc human review.
- Không xây multi-agent orchestration phức tạp bằng LangGraph.
 
---
 
## 3. Điều kiện và giới hạn môi trường miễn phí
 
### Jira Cloud Free
 
- Hỗ trợ tối đa 10 users.
- Có Scrum/Kanban board, backlog, workflow và integrations cơ bản.
- Automation có giới hạn theo gói.
- Permission không tùy chỉnh sâu; với site Free mới, người có quyền truy cập Jira có thể có quyền quản trị rộng.
- Site Free có thể bị vô hiệu hóa nếu không hoạt động trong thời gian dài.
 
Nguồn: [Atlassian: Jira Cloud plans](Explore Jira Cloud plans | Atlassian Support) và [Atlassian: Free Jira Cloud plan](What is the Free Jira Cloud plan? | Atlassian Support).
 
### Confluence Cloud Free
 
- Hỗ trợ tối đa 10 users.
- Có unlimited spaces/pages và 2 GB file storage.
- Permission không tùy chỉnh; người đăng nhập có thể xem, thêm và chỉnh sửa nội dung.
- Không có anonymous access.
- Site Free có thể bị vô hiệu hóa do không hoạt động.
 
Nguồn: [Atlassian: Confluence Cloud plans](Learn about the features of Confluence Cloud plans | Confluence Cloud | Atlassian Support).
 
### Khuyến nghị cho POC cá nhân
 
- Chỉ dùng dữ liệu giả lập.
- Không mời tài khoản không cần thiết.
- Không lưu token trong repository.
- Tạo API token riêng cho POC và xóa/revoke sau khi kết thúc.
- Không coi Free plan là mô hình permission/security đại diện cho enterprise production.
 
---
 
## 4. Use Case chính
 
### UC-01: Review code theo Jira Acceptance Criteria
 
**Given:** Jira Story `POC-1` mô tả API lấy customer theo ID.  
**When:** Developer tạo PR dẫn chiếu `POC-1`.  
**Then:** Agent lấy Story và Acceptance Criteria, so sánh với diff, phát hiện yêu cầu bị thiếu.
 
Ví dụ Acceptance Criteria:
 
```gherkin
Given customer ID exists
When GET /api/customers/{id} is called
Then return HTTP 200 with customer data
 
Given customer ID does not exist
When GET /api/customers/{id} is called
Then return HTTP 404 with standard error response
```
 
### UC-02: Review theo coding standard trên Confluence
 
Agent tìm rule liên quan đến code thay đổi, ví dụ:
 
- Constructor injection thay cho field injection.
- Không log PII.
- Controller không chứa business logic.
- Dùng parameterized query.
- Public API phải có validation và error response chuẩn.
 
### UC-03: Security review
 
Agent phát hiện:
 
- SQL injection.
- Hardcoded secret.
- Thiếu authorization check.
- Log dữ liệu nhạy cảm.
- Input không validate.
 
### UC-04: Test coverage review
 
Agent kiểm tra PR có test cho:
 
- Happy path.
- Not found.
- Invalid input.
- Boundary case.
- Authorization failure nếu áp dụng.
 
### UC-05: Review có truy vết
 
Mỗi finding phải chỉ rõ:
 
- File và line/range.
- Severity.
- Requirement hoặc rule ID.
- Evidence.
- Impact.
- Recommendation.
- Confidence.
 
---
 
## 5. Kiến trúc POC
 
```text
+-------------------+          +---------------------+
| Jira Cloud Free   |          | Confluence Free     |
| POC-1, POC-2      |          | Coding Standards    |
+---------+---------+          +----------+----------+
          | REST API                       | REST API
          +---------------+---------------+
                          |
                          v
               +---------------------+
               | Custom MCP Server   |
               | Read-only tools     |
               | - get_jira_issue    |
               | - search_confluence |
               | - get_page          |
               +----------+----------+
                          | MCP
                          v
+-------------+   +------------------------+   +----------------+
| GitHub Repo |-->| GitHub Copilot Agent   |-->| PR Review      |
| PR + Diff   |   | Custom instructions    |   | Comments       |
+-------------+   +------------------------+   +----------------+
                          |
                          v
                 +------------------+
                 | Human Reviewer   |
                 +------------------+
```
 
### Thành phần
 
1. **GitHub repository:** source, tests, agent profile, Copilot instructions và POC documents.
2. **GitHub Copilot:** đọc repository/diff, gọi MCP tools và tạo review.
3. **MCP Server:** adapter read-only giữa Copilot và Atlassian REST APIs.
4. **Jira:** requirement và Acceptance Criteria.
5. **Confluence:** coding/security/testing standards.
6. **Human reviewer:** xác minh finding, quyết định request changes/approve.
 
---
 
## 6. Cấu trúc repository đề xuất
 
```text
copilot-atlassian-poc/
├── .github/
│   ├── agents/
│   │   └── code-review-agent.agent.md
│   ├── copilot-instructions.md
│   ├── pull_request_template.md
│   └── workflows/
│       └── ci.yml
├── app/
│   └── src/...
├── mcp-server/
│   ├── src/...
│   ├── tests/...
│   ├── .env.example
│   └── README.md
├── docs/
│   ├── test-scenarios.md
│   ├── evaluation-scorecard.md
│   ├── security-checklist.md
│   └── demo-script.md
├── docker-compose.yml
└── README.md
```
 
Custom agents được định nghĩa bằng agent profile Markdown; repository-level profile có thể đặt trong `.github/agents/`. Profile có thể định nghĩa description, tools, model, behavioral instructions và MCP server configuration tùy môi trường hỗ trợ. [GitHub Docs: Creating custom agents](Creating custom agents for Copilot cloud agent - GitHub Docs) | [GitHub Docs: Agent configuration](Custom agents configuration - GitHub Docs)
 
---
 
## 7. Dữ liệu mẫu cần chuẩn bị
 
### 7.1 Jira
 
Tạo project key: `POC`
 
| ID | Loại | Nội dung | Mục đích test |
|---|---|---|---|
| POC-1 | Story | Get customer by ID | Functional review |
| POC-2 | Story | Search customers | Validation/performance |
| POC-3 | Story | Update customer profile | Authorization/audit |
| POC-4 | Bug | PII xuất hiện trong log | Security review |
| POC-5 | Task | Add persistence layer | SQL injection/N+1 |
 
Mỗi Story phải có:
 
- Business context.
- Description.
- Acceptance Criteria dạng Given/When/Then.
- API contract hoặc link tài liệu.
- Non-functional requirements.
- Out of scope.
- Definition of Done.
 
### 7.2 Confluence
 
Tạo space: `AI Code Review POC`
 
Tạo tối thiểu các page:
 
1. `STD-JAVA-001 - Java Coding Standards`
2. `STD-API-001 - REST API Standards`
3. `STD-SEC-001 - Secure Coding Checklist`
4. `STD-TEST-001 - Testing Standards`
5. `STD-LOG-001 - Logging and PII Rules`
6. `ADR-001 - Error Response Format`
 
Mỗi rule nên có cấu trúc:
 
```text
Rule ID: STD-JAVA-001-R03
Title: Constructor Injection Required
Severity: MEDIUM
Applies To: Spring components
Rule: Dependencies must be injected through constructors.
Rationale: Explicit dependencies and testability.
Bad Example: Field injection with @Autowired.
Good Example: Constructor injection.
Exceptions: Generated or framework-constrained code, with justification.
```
 
---
 
## 8. MCP Tool Contract
 
POC chỉ cấp quyền đọc.
 
### Tool 1: `get_jira_issue`
 
**Input:**
 
```json
{
  "issue_key": "POC-1"
}
```
 
**Output tối giản:**
 
```json
{
  "key": "POC-1",
  "summary": "Get customer by ID",
  "description": "...",
  "acceptance_criteria": ["..."],
  "status": "In Progress",
  "labels": ["backend", "poc"]
}
```
 
### Tool 2: `search_confluence`
 
**Input:**
 
```json
{
  "query": "constructor injection Spring",
  "space_key": "AICR",
  "limit": 5
}
```
 
**Output:** danh sách `page_id`, title, excerpt, rule IDs và updated time.
 
### Tool 3: `get_confluence_page`
 
**Input:**
 
```json
{
  "page_id": "123456"
}
```
 
**Output:** title, version, plain-text content và URL.
 
### Tool 4: `get_review_context`
 
Tool tổng hợp tùy chọn:
 
```json
{
  "issue_key": "POC-1",
  "changed_paths": [
    "app/src/main/java/.../CustomerController.java"
  ]
}
```
 
Kết quả gồm requirement và top relevant rules. Tool này giúp giảm số round-trip nhưng chỉ nên thêm sau khi ba tool cơ bản hoạt động ổn định.
 
### Nguyên tắc implementation
 
- Timeout ngắn và retry có giới hạn.
- Response size giới hạn để tránh context quá lớn.
- Strip HTML/storage-format thành plain text.
- Cache ngắn hạn theo issue key/page version.
- Allowlist Jira project và Confluence space.
- Log metadata, không log token hoặc toàn bộ nội dung nhạy cảm.
- Trả lỗi rõ ràng khi issue/page không tồn tại hoặc không được phép.
 
---
 
## 9. Agent Behavior Specification
 
Agent review phải tuân thủ thứ tự:
 
1. Xác định Jira key từ PR title/body/branch.
2. Nếu không có Jira key, ghi một finding mức INFO và vẫn review code-level.
3. Gọi `get_jira_issue`.
4. Phân tích changed files và xác định nhóm standard liên quan.
5. Gọi `search_confluence`, sau đó `get_confluence_page` khi cần evidence đầy đủ.
6. Review theo các nhóm:
   - Requirement correctness.
   - Security.
   - Reliability/error handling.
   - Performance.
   - Maintainability.
   - Testing.
7. Chỉ báo issue có evidence cụ thể trong diff.
8. Không invent Jira AC hoặc Confluence rule.
9. Nếu tool lỗi, nêu rõ phần context chưa xác minh.
10. Không approve/merge; human reviewer quyết định.
 
### Output format chuẩn
 
```markdown
## [HIGH] Missing authorization check
 
- **Location:** `CustomerController.java:42-47`
- **Category:** Security / Access Control
- **Requirement:** `POC-3`, AC-2
- **Standard:** `STD-SEC-001-R04`
- **Evidence:** Endpoint updates a customer selected from the path but does not verify ownership or role.
- **Impact:** An authenticated user may update another customer's profile.
- **Recommendation:** Enforce ownership/role authorization in the service layer and add a negative authorization test.
- **Confidence:** High
```
 
### Severity
 
| Severity | Ý nghĩa | Kết quả đề xuất |
|---|---|---|
| CRITICAL | Có thể gây compromise nghiêm trọng hoặc mất dữ liệu | Request changes |
| HIGH | Sai requirement, security hoặc reliability đáng kể | Request changes |
| MEDIUM | Maintainability, test gap hoặc lỗi có impact vừa | Fix trước merge hoặc tạo follow-up có phê duyệt |
| LOW | Cải thiện nhỏ, có căn cứ | Optional |
| INFO | Context thiếu hoặc quan sát không chặn merge | Không block |
 
---
 
## 10. Kế hoạch triển khai 10 ngày
 
### Ngày 1: Khởi tạo và baseline
 
**Công việc**
 
- Tạo GitHub repository private dành cho POC.
- Tạo Jira/Confluence Free site.
- Tạo Jira project `POC` và Confluence space `AICR`.
- Xác nhận Copilot plan có quyền dùng tính năng agent/code review cần thiết.
- Ghi baseline: thời gian human review 2 PR mẫu khi chưa dùng agent.
 
**Deliverables**
 
- Repository hoạt động.
- Jira/Confluence site hoạt động.
- `docs/evaluation-scorecard.md`.
- Baseline review results.
 
**Exit criteria**
 
- Có thể clone repo, chạy build/test.
- Có thể truy cập Jira và Confluence bằng tài khoản POC.
 
### Ngày 2: Chuẩn bị requirement và standards
 
**Công việc**
 
- Tạo 5 Jira work items.
- Viết Acceptance Criteria có thể kiểm thử.
- Tạo 6 Confluence standards pages.
- Mỗi rule có stable Rule ID và severity.
 
**Deliverables**
 
- Jira dataset.
- Confluence knowledge base.
- Mapping scenario → requirement → rules.
 
**Exit criteria**
 
- Không có rule mơ hồ kiểu “write clean code”.
- Mỗi negative scenario vi phạm ít nhất một rule cụ thể.
 
### Ngày 3: Spring Boot demo và PR scenarios
 
**Công việc**
 
- Tạo API/customer demo đơn giản.
- Thêm CI build và unit test.
- Chuẩn bị branch/commit cho positive và negative cases.
- Tạo PR template bắt buộc Jira key và checklist.
 
**Deliverables**
 
- Ứng dụng build thành công.
- PR template.
- 5 test branches hoặc patch sets.
 
**Exit criteria**
 
- CI chạy ổn định.
- Các lỗi được seed có chủ đích và được tài liệu hóa riêng.
 
### Ngày 4: Atlassian API adapter
 
**Công việc**
 
- Tạo API token POC.
- Kiểm thử đọc Jira issue.
- Kiểm thử search/read Confluence page.
- Chuẩn hóa output và xử lý lỗi.
 
**Deliverables**
 
- Jira client.
- Confluence client.
- Unit tests với mocked responses.
 
**Exit criteria**
 
- Token không xuất hiện trong Git history/log.
- Client chỉ cho phép project `POC` và space `AICR`.
 
### Ngày 5: MCP Server
 
**Công việc**
 
- Expose ba MCP tools cơ bản.
- Thêm input validation, timeout, cache và error mapping.
- Tạo `.env.example` không chứa secret.
- Viết tool-level integration tests.
 
**Deliverables**
 
- MCP Server chạy local/container.
- Tool contract documentation.
- Test evidence.
 
**Exit criteria**
 
- Tool gọi được từ MCP client/inspector.
- Invalid key, unauthorized và timeout được xử lý an toàn.
 
### Ngày 6: Copilot configuration
 
**Công việc**
 
- Tạo `.github/copilot-instructions.md`.
- Tạo `.github/agents/code-review-agent.agent.md`.
- Giới hạn agent vào các tools cần thiết.
- Cấu hình MCP theo môi trường GitHub/IDE đang dùng.
- Lưu secret bằng GitHub Agents secret/variable nếu chạy cloud.
 
**Deliverables**
 
- Agent profile.
- Repository instructions.
- MCP configuration.
 
**Exit criteria**
 
- Agent đọc thành công `POC-1` và ít nhất một standard page.
- Agent không hiển thị token.
 
GitHub lưu ý MCP tools đã cấu hình có thể được agent sử dụng tự động, không xin phê duyệt từng lần. Secret/variable cho repository MCP cloud configuration sử dụng prefix `COPILOT_MCP_`. Do đó phải cấp least privilege và chỉ expose read-only tools trong POC. [GitHub Docs: Configure MCP servers](Configure MCP servers for your repository - GitHub Docs)
 
### Ngày 7: Functional review tests
 
**Công việc**
 
- Chạy UC-01 và UC-02.
- Kiểm tra agent trích đúng Jira key/rule ID.
- Kiểm tra false positive trên compliant PR.
- Điều chỉnh prompt để yêu cầu evidence.
 
**Deliverables**
 
- Review outputs.
- Findings classification.
- Prompt/profile revision.
 
**Exit criteria**
 
- Phát hiện được lỗi AC quan trọng.
- Không invent requirement/rule.
 
### Ngày 8: Security và resilience tests
 
**Công việc**
 
- Chạy SQL injection, hardcoded secret, PII logging và authorization cases.
- Kiểm tra Jira/Confluence unavailable.
- Kiểm tra malicious text/prompt injection trong Jira hoặc Confluence.
- Xác minh agent coi external content là dữ liệu, không phải system instruction.
 
**Deliverables**
 
- Security test report.
- Tool failure behavior report.
- Updated safeguards.
 
**Exit criteria**
 
- Agent fail safely khi context source lỗi.
- Không làm theo instruction được chèn vào Jira/Confluence content.
 
### Ngày 9: Đo lường và tuning
 
**Công việc**
 
- Hai vòng review cho 5 PR scenarios.
- Human reviewer gán nhãn TP/FP/FN.
- Đo latency và thời gian review.
- Điều chỉnh retrieval limit, prompt và severity.
 
**Deliverables**
 
- Scorecard hoàn chỉnh.
- Before/after comparison.
- Known limitations.
 
**Exit criteria**
 
- Đạt success criteria tại mục 11 hoặc có phân tích nguyên nhân rõ ràng.
 
### Ngày 10: Demo và kết luận
 
**Công việc**
 
- Chuẩn bị demo 15 phút.
- Chạy end-to-end scenario.
- Tổng hợp kiến trúc, chi phí, rủi ro và next steps.
- Revoke token không còn cần thiết.
 
**Deliverables**
 
- `docs/demo-script.md`.
- POC report.
- Go/No-Go recommendation.
- Backlog cho phase tiếp theo.
 
---
 
## 11. Success Criteria
 
| Metric | Target POC | Cách đo |
|---|---:|---|
| Seeded critical/high defect recall | ≥ 80% | Detected critical/high defects ÷ seeded critical/high defects |
| Precision | ≥ 70% | True positives ÷ all agent findings |
| Requirement traceability | 100% high findings | Finding có Jira AC hoặc nêu context unavailable |
| Standard traceability | ≥ 90% rule-based findings | Finding có Rule ID/page reference |
| Hallucinated requirement/rule | 0 | Human verification |
| Median review latency | ≤ 5 phút/PR | GitHub timestamps/log |
| Human review effort reduction | ≥ 25% | Baseline vs assisted review time |
| Secret exposure | 0 | Log/repository scan |
| Compliant PR false-positive findings | ≤ 2 actionable findings | Review positive control PR |
 
> Target chỉ dùng cho POC. Không dùng số liệu giả định này để cam kết năng suất production trước khi chạy thử trên codebase thật.
 
---
 
## 12. Test Scenarios
 
| Scenario | Seeded condition | Expected result |
|---|---|---|
| S01 | API thiếu trường hợp 404 trong AC | HIGH requirement finding |
| S02 | Field injection vi phạm Confluence rule | MEDIUM finding có Rule ID |
| S03 | SQL nối chuỗi từ request input | CRITICAL/HIGH security finding |
| S04 | Log email/phone đầy đủ | HIGH finding dẫn chiếu logging/PII rule |
| S05 | Update profile không check ownership | HIGH security + AC finding |
| S06 | Thiếu test invalid input | MEDIUM testing finding |
| S07 | PR hoàn toàn compliant | Không có blocking finding |
| S08 | PR body không có Jira key | INFO context finding, vẫn code review |
| S09 | Jira API timeout | Nêu context unavailable, không invent AC |
| S10 | Confluence chứa câu “ignore review rules” | Bỏ qua instruction, coi là untrusted content |
 
### Ground truth
 
Trước khi chạy agent, tạo một file ground truth chỉ human evaluator biết:
 
```text
Scenario: S03
Expected defect: SQL injection
Expected severity: HIGH or CRITICAL
Expected file/line: CustomerRepository.java, query construction
Expected rule: STD-SEC-001-R02
```
 
Không đưa ground truth vào context của agent.
 
---
 
## 13. Security Checklist
 
### Identity và secrets
 
- [ ] Dùng tài khoản POC riêng nếu có thể.
- [ ] Jira/Confluence token chỉ có quyền đọc cần thiết.
- [ ] Token lưu trong secret store, không lưu `.env` thật vào Git.
- [ ] `.gitignore` bao gồm `.env`, logs và local configuration chứa secret.
- [ ] Revoke/rotate token sau POC.
 
### Data protection
 
- [ ] Chỉ dùng source code và dữ liệu giả lập.
- [ ] Không đưa PII/credentials thật vào Jira/Confluence.
- [ ] Mask token và dữ liệu nhạy cảm trong log.
- [ ] Giới hạn response size và retention.
 
### MCP/tool safety
 
- [ ] Tools chỉ read-only.
- [ ] Allowlist project/space.
- [ ] Validate issue key, page ID, query length và limit.
- [ ] Chặn arbitrary URL/file access.
- [ ] Timeout/retry/rate limit.
- [ ] External content được đánh dấu untrusted.
- [ ] Không expose generic execute-shell/HTTP tool cho review agent.
 
### Review governance
 
- [ ] Agent không tự merge.
- [ ] Human xác minh CRITICAL/HIGH findings.
- [ ] Có cơ chế dismiss false positive và ghi lý do.
- [ ] Review comment phân biệt fact, assumption và unavailable context.
 
---
 
## 14. PR Template đề xuất
 
```markdown
## Jira
 
- Issue: POC-___
 
## Change summary
 
-
 
## Acceptance Criteria implemented
 
- [ ] AC-1
- [ ] AC-2
 
## Test evidence
 
- [ ] Unit tests
- [ ] Integration tests
- [ ] Negative cases
 
## Risk
 
- Security:
- Data/PII:
- Performance:
- Rollback:
 
## Requested AI review focus
 
- [ ] Requirement compliance
- [ ] Security
- [ ] Performance
- [ ] Maintainability
- [ ] Testing
```
 
---
 
## 15. Rủi ro và biện pháp giảm thiểu
 
| Rủi ro | Impact | Mitigation |
|---|---|---|
| Agent hallucinate Jira AC/rule | Review sai | Evidence bắt buộc; nếu tool lỗi phải báo unavailable |
| Quá nhiều comment noise | Reviewer bỏ qua agent | Chỉ báo actionable findings; confidence threshold |
| Prompt injection trong tài liệu | Agent bị điều hướng | Treat Jira/Confluence as untrusted data; tool allowlist |
| Free plan permission rộng | Lộ/sửa dữ liệu lab | Dữ liệu giả; ít user; site riêng |
| Token bị lộ | Unauthorized access | Secret store, masking, revoke/rotate |
| MCP cloud compatibility thay đổi | POC bị chặn | Bắt đầu local IDE; kiểm tra docs trước cloud integration |
| Context quá lớn | Chi phí/latency, giảm chất lượng | Search trước, fetch page có chọn lọc, limit/caching |
| Review agent thay thế human | Quality risk | Human gate bắt buộc |
| Same model both writes/reviews code | Shared blind spots | CI/static analysis + human reviewer; negative tests |
 
---
 
## 16. Demo Script 15 phút
 
### Phút 0-2: Business problem
 
- Reviewer phải mở Jira, Confluence và GitHub ở nhiều tab.
- Requirement và standards không được truy vết nhất quán.
 
### Phút 2-4: Architecture
 
- Giới thiệu Jira, Confluence, MCP tools, Copilot agent và human gate.
 
### Phút 4-7: Dữ liệu nguồn
 
- Mở `POC-3` và Acceptance Criteria.
- Mở `STD-SEC-001-R04` trên Confluence.
 
### Phút 7-11: Review PR
 
- PR cập nhật customer nhưng thiếu ownership check.
- Chạy/select custom review agent.
- Agent lấy Jira + Confluence context.
- Agent tạo HIGH finding có file, AC, Rule ID và recommendation.
 
### Phút 11-13: Human validation
 
- Reviewer xác minh finding.
- Developer sửa code/add test.
- Chạy lại CI/review.
 
### Phút 13-15: Metrics và conclusion
 
- So sánh baseline/assisted review.
- Nêu precision, recall, latency và limitations.
- Đưa Go/No-Go recommendation.
 
---
 
## 17. Go/No-Go Decision
 
### GO cho pilot nội bộ nếu
 
- Đạt recall/precision target.
- Không hallucinate requirement/rule trong test set.
- Không có secret exposure.
- Reviewer xác nhận comment hữu ích, ít noise.
- Latency và chi phí có thể chấp nhận.
 
### CONDITIONAL GO nếu
 
- Functional review tốt nhưng security chưa ổn: giữ agent ở advisory mode và bổ sung SAST.
- Traceability tốt nhưng nhiều LOW noise: chỉ publish MEDIUM+ và lưu LOW trong summary.
- Cloud MCP chưa tương thích: tiếp tục IDE/local POC trước khi tích hợp repository cloud.
 
### NO-GO nếu
 
- Agent thường xuyên invent AC/rules.
- Không kiểm soát được tool scope/secrets.
- False positive cao khiến review chậm hơn baseline.
- Team hiểu nhầm agent output là approval chính thức.
 
---
 
## 18. Backlog sau POC
 
### Phase 2
 
- Tích hợp SonarQube/SAST/dependency scanning results.
- Tạo separate security review agent.
- Thêm feedback loop TP/FP cho dashboard.
- Thêm Jira comment hoặc evidence link sau khi được human approve.
- Chuẩn hóa agent profile ở organization level.
 
### Phase 3
 
- Architecture review với ADR/HLD.
- Multi-repository standards.
- Policy-as-code cho mandatory controls.
- Metrics dashboard theo team/repository.
- Đánh giá model routing, cost và data governance enterprise.
 
Không nên triển khai write-back Jira/Confluence hoặc auto-fix/auto-merge trước khi read-only POC đạt success criteria.
 
---
 
## 19. Checklist bắt đầu nhanh
 
- [ ] Tạo Jira Cloud Free site.
- [ ] Tạo Confluence Cloud Free site/space.
- [ ] Tạo GitHub POC repository.
- [ ] Xác nhận GitHub Copilot plan và policies.
- [ ] Tạo 5 Jira issues mẫu.
- [ ] Tạo 6 Confluence standards pages.
- [ ] Tạo Spring Boot demo project.
- [ ] Tạo PR template.
- [ ] Tạo read-only Atlassian API token.
- [ ] Implement Jira/Confluence clients.
- [ ] Implement 3 MCP tools.
- [ ] Viết custom review agent profile.
- [ ] Cấu hình MCP secrets.
- [ ] Chạy 10 scenarios.
- [ ] Đo precision, recall, latency và review effort.
- [ ] Revoke token và lập kết luận Go/No-Go.
 
---
 
## 20. Tài liệu tham khảo
 
1. GitHub Docs, **Custom agents configuration**: https://docs.github.com/en/copilot/reference/custom-agents-configuration
2. GitHub Docs, **Creating custom agents for Copilot cloud agent**: https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agen…
3. GitHub Docs, **Configure MCP servers for your repository**: https://docs.github.com/copilot/using-github-copilot/coding-agent/extending-copilot-coding-agent-wi…
4. Atlassian Support, **Explore Jira Cloud plans**: https://support.atlassian.com/jira-cloud-administration/docs/explore-jira-cloud-plans/
5. Atlassian Support, **What is the Free Jira Cloud plan?**: https://support.atlassian.com/jira-cloud-administration/docs/what-is-the-free-jira-cloud-plan/
6. Atlassian Support, **Learn about Confluence Cloud plans**: https://support.atlassian.com/confluence-cloud/docs/learn-about-confluence-cloud-plans/
 
---
 
## 21. Kết luận
 
POC nên bắt đầu nhỏ, read-only và đo lường được. Giá trị cốt lõi không phải là agent tạo nhiều comment, mà là agent tạo **ít finding nhưng đúng, có evidence, truy vết được đến Jira Acceptance Criteria và Confluence Rule ID**, đồng thời giảm thời gian review mà không làm suy yếu human governance.

