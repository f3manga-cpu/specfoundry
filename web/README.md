# SpecFoundry — Agent Surface Lab (web)

A polished, client-side, read-only source scanner for action surfaces in AI agents and automation workflows. A useful self-service companion to the existing offline CLI tool in `specfoundry/tools/agent_surface_scan.py`.

## What works

- Scan user-selected folders or individual files **locally** with no network access, remote storage or account.
- Identify payments, communications, data mutations, command execution, outbound HTTP writes, metered model calls, background execution and inter-agent handoffs.
- View counts and evidence locations by category; filter up to 500 findings.
- Maintain self-attested human review dispositions for matched action classes.
- Download machine-readable JSON and a standalone, print-ready HTML report, without source text.
- Run an explicitly synthetic six-file sample project.

## What it does *not* do

- It does not execute or sandbox agents, scan binaries, reverse engineer proprietary targets, call Stripe, or interact with client systems.
- Matches are regex heuristics. They are **not** confirmed vulnerabilities. No matches does not mean a project is safe.
- Client-side review decisions are not independently verified.
- No real model calls or multi-agent execution are used; the tool inventories potential authority boundaries.

## Development and verification

```bash
python -m http.server 8765 --directory web
node --test tests/scanner.test.mjs
```

The browser loads `index.html`, `styles.css`, `app.mjs` and `scanner.mjs` from the same origin. No build step or runtime dependencies are required. Tests cover detection, exclusions, secret non-disclosure, Windows paths, bounds and review semantics.

### Deployment

- Render Static Site: public repo `https://github.com/f3manga-cpu/specfoundry`, target branch `surface-lab-launch-2026-11-03`, `publishPath: web`, `buildCommand: echo ready`.
- `service.html` describes the optional manual scope-confirmed human review. Checkout uses Stripe Payment Link `plink_1UXk3hJglFhP7gGVTQSPk70Y`; no Stripe secret is used by the site.
- The service is only called live after checking the real public HTTPS URL and exercising the critical flows in a browser.
- Never infer payment success from clicking checkout; confirm against authenticated Stripe data.

## Threat / privacy model

- CSP denies network connections and third-party JavaScript; there are no external resources or telemetry.
- Text file input is opt-in and processed in memory; file contents are never included in exports.
- Files under hidden/dependency folders, secret environment files, lockfiles, minified bundles, unsupported formats, null-byte content and oversize files are skipped.
- Browser process memory is cleared on reload; no localStorage, IndexedDB or remote database.
- Limits: 2,000 accepted files, 256,000 bytes per file, 25 MB cumulative text, 500 recorded matches.
- Not a compliance or security certification; adversarial obfuscation is outside its detection coverage.

## Research references

- [OWASP Top 10 for Agentic Applications (2026)](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)
- [OpenAI Agents SDK — tracing](https://openai.github.io/openai-agents-python/tracing/)
- [REA — investigation evidence and controlled local analysis](https://github.com/morluto/rea)

No REA code is copied; this is an original focused browser implementation. Existing SpecFoundry Python scanner rule taxonomy informed the design.
