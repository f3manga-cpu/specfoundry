# Sample deliverable — Agent Architecture Readiness Review

> **Illustrative fictional example, not a review of any actual customer or product.** All findings below are hypotheses derived from the scenario, not verified security defects. Real reviews require evidence from the client's system.

**Scenario:** a small e-commerce company proposes an agent that reviews supplier quotes, recommends replenishment, creates purchase orders up to €500, emails suppliers, and records the result in a CRM.

**Desired outcome:** replenish approved products without duplicate orders, unexpected spend, or unauthorized external communication.

**Evidence available in this example:** a one-page workflow sketch and hypothetical API descriptions. No source code, production logs, or account permissions were inspected.

## 1. Decision boundary

| Stage | Agent may do | Human or deterministic gate | Evidence required |
| --- | --- | --- | --- |
| Read inventory | Fetch approved SKU quantities | Read-only API scope | Request ID, SKU, timestamp |
| Select supplier | Rank known vendors | Vendor allowlist and max unit price | Versioned allowlist and quote |
| Create PO | Propose PO payload | Server-side budget cap, deduplication key, approval above threshold | Decision receipt, idempotency key |
| Send email | Draft vendor message | Send only after approved PO state | Approval ID, message hash, delivery receipt |
| Reconcile | Read supplier acknowledgement | Compare order ID, amounts, status | External supplier receipt |
| Retry | Retry transient failures | Never retry non-idempotent action without same key | Retry log and final status |

## 2. Evidence-backed readiness matrix (illustrative)

| Control | Current evidence | Status | Priority | Minimal acceptance test |
| --- | --- | --- | --- | --- |
| Server-side spend cap | Only an agent prompt says “never exceed €500” | **Unverified** | P0 | A €501 request is rejected by backend policy |
| Duplicate PO prevention | No idempotency design supplied | **Unverified** | P0 | Same event delivered 3 times creates exactly one PO |
| Vendor allowlist | Static spreadsheet mentioned; no enforcement proof | **Unverified** | P0 | Unknown vendor cannot be ordered from |
| Approval boundary | Approval above €500 stated in diagram | **Unverified** | P0 | No email or PO is sent before a durable approval |
| Audit trail | CRM stores order summaries | **Unverified** | P1 | Trace each action to actor, policy version and external receipt |
| Retry and compensation | No documented partial-failure plan | **Unverified** | P1 | Email failure after PO creation is recoverable without duplicate PO |
| External outcome verification | Success currently defined as API 200 | **Unverified** | P1 | Supplier acknowledgement is correlated with PO ID |
| Secret handling | Credential model not provided | **Not assessed** | P1 | Keys are scoped, rotated and absent from logs |

**Interpretation:** the system is **not demonstrated ready**. This does not prove any control is absent; the evidence is insufficient. “Not demonstrated” is different from “failed.”

## 3. Prioritized engineering brief

**P0 — before live orders:** move the €500 cap into a deterministic backend check; require versioned vendor allowlist; use one idempotency key per replenishment intent; persist human approval before any irreversible call.

**P1 — before unattended operation:** implement a correlation ledger from intent to approval, PO, email and supplier acknowledgement; add bounded retries and a reconciliation queue; restrict credential scopes.

**P2 — after pilot:** measure false-positive replenishment, approval latency, cost per accepted PO, duplicate prevention, supplier response time, and time-to-recovery. Compare against a manual baseline.

## 4. Verification pack

A customer-specific review would attach links or redacted excerpts for each tested control: code path, configuration, test result, sample receipt, and a named owner for each unresolved risk. No proprietary source or secret is requested in a public GitHub issue.

## 5. What this sample does **not** establish

No penetration test, compliance attestation, live API validation, financial audit, or operational guarantee has been performed. Findings and remediation priorities are illustrative. A paid engagement begins only after the scope and terms are accepted by both sides.

[See the service scope](agent-architecture-readiness-review.md) · [Request a non-binding enquiry](https://github.com/f3manga-cpu/specfoundry/issues/new?template=agent-review.yml)
