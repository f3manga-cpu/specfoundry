#!/usr/bin/env python3
"""Offline, read-only inventory of action/spend surfaces; NOT a security audit."""
import argparse
import json
import re
import sys
from pathlib import Path

EXTENSIONS = {'.py', '.js', '.jsx', '.ts', '.tsx', '.go', '.rs', '.sh', '.yml', '.yaml'}
EXCLUDED_DIRS = {'.git', '.venv', 'venv', 'node_modules', 'dist', 'build', '.next',
                 '.pytest_cache', '__pycache__', 'coverage', 'vendor'}
MAX_FILE_BYTES = 256_000
MAX_FILES = 2_000
MAX_FINDINGS = 500
RULES = {
    'paid_model_calls': (r'\b(openai|anthropic|groq|gemini|bedrock|chat\.completions|responses\.create)\b',
                         'Identify model/provider spend, rate limits and budget controls.'),
    'payment_actions': (r'\b(stripe|payment_intents|checkout\.sessions|paypal|x402)\b',
                        'Verify authorization, idempotency, reconciliation and refunds.'),
    'outbound_messages': (r'\b(nodemailer|sendgrid|resend|smtp|send_email|messages\.send)\b',
                          'Check recipient authorization, approval and delivery evidence.'),
    'process_execution': (r'\b(subprocess|os\.system|child_process|spawn\(|exec\()\b',
                          'Check command allowlists, privileges and untrusted inputs.'),
    'data_mutations': (r'\b(INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|upsert\(|\.insert\(|\.delete\()\b',
                       'Check authorization, audit trail and rollback paths.'),
    'external_http_writes': (r'\b(requests|httpx|axios)\.(post|put|patch|delete)\s*\(|\bmethod\s*:\s*[\x27\x22](POST|PUT|PATCH|DELETE)',
                             'Check outbound destinations, retries and idempotency.'),
    'background_execution': (r'\b(cron|schedule\(|setInterval\(|celery|temporal|background_tasks)\b',
                             'Check stop conditions, monitoring and cost ceilings.'),
}
COMPILED = {key: re.compile(pattern, re.IGNORECASE) for key, (pattern, _) in RULES.items()}


def eligible(path, root):
    rel = path.relative_to(root)
    if any(part in EXCLUDED_DIRS or part.startswith('.') for part in rel.parts[:-1]):
        return False
    name = path.name.lower()
    if name.startswith('.env') or name.endswith(('.lock', '.min.js', '.map')):
        return False
    return path.suffix.lower() in EXTENSIONS and not path.is_symlink()


def scan(root):
    root = root.resolve()
    if not root.is_dir():
        raise ValueError('Root must be an existing directory')
    findings, checked, skipped = [], 0, 0
    for path in sorted(root.rglob('*')):
        if not path.is_file() or not eligible(path, root):
            continue
        if checked >= MAX_FILES:
            skipped += 1
            continue
        try:
            if path.stat().st_size > MAX_FILE_BYTES:
                skipped += 1
                continue
            lines = path.read_text(encoding='utf-8').splitlines()
        except (OSError, UnicodeError):
            skipped += 1
            continue
        checked += 1
        for number, line in enumerate(lines, 1):
            for rule, regex in COMPILED.items():
                if regex.search(line):
                    if len(findings) < MAX_FINDINGS:
                        findings.append({'file': path.relative_to(root).as_posix(),
                                         'line': number, 'surface': rule})
                    else:
                        skipped += 1
                        break
    counts = {key: sum(item['surface'] == key for item in findings) for key in RULES}
    return {'schema_version': '1.0', 'files_scanned': checked, 'skipped_or_capped': skipped,
            'surface_counts': counts, 'findings': findings,
            'limitations': ['Heuristic text matches only; false positives and negatives are expected.',
                            'A match is not a vulnerability, and no match is not proof of safety.',
                            'No runtime tracing, secrets, configuration or payment verification.',
                            'Source lines are never included in output.']}


def as_markdown(result):
    lines = ['# Agent action/spend surface inventory', '',
             f"Files scanned: {result['files_scanned']}; skipped/capped: {result['skipped_or_capped']}.", '',
             '| Surface | Matches | Review focus |', '|---|---:|---|']
    for key, (_, hint) in RULES.items():
        lines.append(f"| {key} | {result['surface_counts'][key]} | {hint} |")
    lines += ['', '## Locations (no source code or secrets)', '']
    lines += [f"- {item['file']}:{item['line']} — {item['surface']}" for item in result['findings']]
    lines += ['', '## Limitations', '']
    lines += [f'- {item}' for item in result['limitations']]
    return '\n'.join(lines) + '\n'


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', nargs='?', default='.', help='Local source directory to inspect')
    parser.add_argument('--format', choices=('json', 'markdown'), default='markdown')
    parser.add_argument('--output', help='Optional output path; otherwise stdout')
    args = parser.parse_args(argv)
    try:
        report = scan(Path(args.root))
        output = json.dumps(report, indent=2, ensure_ascii=False) + '\n' if args.format == 'json' else as_markdown(report)
        if args.output:
            Path(args.output).write_text(output, encoding='utf-8')
        else:
            sys.stdout.write(output)
    except (OSError, ValueError) as exc:
        parser.error(str(exc))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
