# AI agent action-risk quickcheck — 15 minutes

**Free, evidence-first checklist for teams preparing an AI agent to use tools, spend money, send messages or change data.** No account, API key or sensitive information required. This is a self-assessment, **not** a security audit or certification.

## Before you start

Choose **one actual workflow** (for example, “triage an order and create a refund request”). For each question mark:

- **Verified** — you have a test result, configuration or log that proves the control works.
- **Unknown** — it is documented or assumed, but no independent test has been observed.
- **Failed** — a test has demonstrated that the intended control does not work.
- **Not applicable** — the workflow cannot reach that action, and you can explain why.

Do not paste private customer data, credentials, proprietary code, or sensitive vulnerabilities into a public issue.

| # | Action boundary to check | What evidence would count? |
|---|---|---|
| 1 | **Actual permissions:** can the agent call only the intended tools? | Scoped credentials, tool allowlist, denied-call test. |
| 2 | **Spend limits:** are paid calls/purchases capped outside the prompt? | Backend-enforced budget test, including an over-limit attempt. |
| 3 | **Human approval:** are irreversible actions gated before execution? | Durable approval record + attempted bypass rejected. |
| 4 | **Idempotency:** does retrying the same intent avoid duplicate charges/actions? | Same event delivered 3 times; one external side effect. |
| 5 | **Untrusted inputs:** can a retrieved page or tool result override instructions? | Injection test with observed refusal to perform unauthorized action. |
| 6 | **Data scope:** are reads and writes limited to approved records? | Access control and cross-tenant denial test. |
| 7 | **Audit trail:** can each action be traced to request, policy and actor? | Correlated decision ID, tool arguments (redacted), outcome and timestamp. |
| 8 | **External confirmation:** is success based on the real system, not just HTTP 200? | Payment/order/message receipt reconciled to the original intent. |
| 9 | **Timeouts/retries:** can partial failure recover without duplicating effects? | Fault injection, retry bounds and reconciliation test. |
| 10 | **Kill switch:** can an operator halt new side effects promptly? | Recorded stop test and observed suppression of new actions. |
| 11 | **Secrets:** are credentials scoped, absent from logs and rotatable? | Secret scan, scoped token and rotation procedure. |
| 12 | **Evaluation:** are real-world outcomes measured against a manual baseline? | Representative tasks, failure cases and outcome metrics. |

## Interpret the result

Count **Verified / Unknown / Failed / Not applicable**. There is no weighted score and no “pass” threshold: the severity depends on what the agent is allowed to do.

**Stop before unattended live execution** when a workflow can move money, contact customers, change sensitive data or create irreversible effects and the corresponding permissions, spend limits, approval boundary or idempotency are Unknown or Failed. A green-looking checklist without evidence is not a release decision.

**Example:** a purchasing agent with 8 Verified, 3 Unknown and 1 Not applicable is *not* necessarily safer than an agent with 6 Verified and 6 Not applicable. If the purchasing cap is Unknown, it still requires verification before live purchases.

## What to do next

1. Pick the **highest-consequence Unknown or Failed** control.
2. Write one reproducible acceptance test and name its owner.
3. Record the test evidence and the resulting action: fix, gate, or remove the capability.
4. Repeat for the next highest-consequence control.

**Need an independent evidence-backed review of one workflow?** See the [fixed-scope Agent Architecture Readiness Review](agent-architecture-readiness-review.md) (indicative **€1,490 excluding applicable taxes**, final scope and terms confirmed in writing). Read the [fictional sample deliverable](sample-agent-readiness-report.md) first. [Request a non-binding scoping conversation](https://github.com/f3manga-cpu/specfoundry/issues/new?template=agent-review.yml) — the issue is public; share no confidential information.

**En français :** [Revue de préparation des agents IA](revue-architecture-agents-ia-fr.md).

*Published 27 October 2026. Self-assessment only; no claim of SOC 2, ISO 27001, GDPR, EU AI Act or penetration-test compliance.*
