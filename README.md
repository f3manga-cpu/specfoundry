# SpecFoundry

SpecFoundry is an interactive engineering-specification wizard for AI and agent systems.

It is designed to force disciplined system design before implementation: clarify intent, define environment and boundaries, establish externally verifiable success, specify task distributions, define a baseline, describe the operating loop, make memory explicit, set autonomy and trust boundaries, define evaluation, and only then declare a system implementation-ready.

## For teams preparing an agent to act in production

**Need a second pair of eyes before an AI agent spends money, contacts customers, or changes real systems?** A fixed-scope [Agent Architecture Readiness Review](offers/agent-architecture-readiness-review.md) maps action boundaries, verifies evidence, and produces a prioritized implementation brief. Indicative fee: **€1,490 excl. applicable taxes** for one workflow; scope and terms are confirmed before any engagement.

[Request a non-binding scoping conversation](https://github.com/f3manga-cpu/specfoundry/issues/new?template=agent-review.yml). GitHub issues are public: do not submit secrets or confidential information. This is a service enquiry, not a checkout or a confirmed sale.

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
streamlit run app.py
```

## Deploy on Streamlit Community Cloud

1. Create a new app from `f3manga-cpu/specfoundry`.
2. Use branch `main`.
3. Set the entrypoint to `app.py`.
4. Deploy.

No secrets or external API keys are required for this version.

## Project structure

- `app.py` — Streamlit UI and guided workflow.
- `specfoundry_schema.py` — stages, questions, guidance, and selectable engineering concepts.
- `specfoundry_core.py` — validation gates, derived requirements/risks/assumptions, readiness logic, and exports.
- `requirements.txt` — Streamlit runtime dependency.

## Governing principle

SpecFoundry does not design the system for the user. It makes it difficult to proceed with an underspecified system by requiring explicit, testable engineering decisions before declaring the specification implementation-ready.

The workflow separates:

- **Your intent** — what you explicitly decide.
- **Engineering requirements** — consequences implied by those decisions.
- **Risks and assumptions** — conditions that need to be surfaced rather than silently accepted.
- **Readiness gates** — criteria that must pass before implementation is considered ready.

The specification can be exported at any point as Markdown or JSON, but incomplete work remains visibly marked as not implementation-ready.
