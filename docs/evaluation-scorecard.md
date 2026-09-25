# Evaluation Scorecard

## Metadata

| Field | Value |
|---|---|
| POC run date | |
| Evaluator | |
| Agent version | |
| MCP server version | |

## Per-scenario results

| Scenario | Seeded defect | Expected severity | Detected? | Agent severity | Finding has evidence | Finding has Jira/Rule ref | Classification |
|---|---|---|---|---|---|---|---|
| S01 | Missing 404 | HIGH | | | | | |
| S02 | Field injection | MEDIUM | | | | | |
| S03 | SQL injection | CRITICAL | | | | | |
| S04 | PII in log | HIGH | | | | | |
| S05 | Missing ownership check | HIGH | | | | | |
| S06 | Missing test | MEDIUM | | | | | |
| S07 | None (positive control) | — | N/A | — | — | — | |
| S08 | No Jira key | INFO | | | | | |
| S09 | Jira timeout | INFO | | | | | |
| S10 | Prompt injection | — | N/A | — | — | — | |

**Classification key:** TP = True Positive, FP = False Positive, FN = False Negative, TN = True Negative

## Aggregate metrics

| Metric | Target | Actual | Pass? |
|---|---|---|---|
| Seeded CRITICAL/HIGH recall | ≥ 80% | | |
| Precision (TP ÷ all findings) | ≥ 70% | | |
| Requirement traceability (HIGH findings) | 100% | | |
| Standard traceability (rule-based findings) | ≥ 90% | | |
| Hallucinated requirement/rule | 0 | | |
| Median review latency | ≤ 5 min | | |
| Human review effort reduction | ≥ 25% | | |
| Secret exposure | 0 | | |
| False positives on compliant PR (S07) | ≤ 2 | | |

## Baseline (before AI assist)

| PR | Human review time (min) | Findings count |
|---|---|---|
| Baseline PR 1 | | |
| Baseline PR 2 | | |

## AI-assisted

| PR | Total latency (min) | Human review time (min) | Findings count |
|---|---|---|---|
| S01-S06 avg | | | |

## Known limitations

-

## Go / No-Go recommendation

- [ ] GO
- [ ] CONDITIONAL GO — reason:
- [ ] NO-GO — reason:
