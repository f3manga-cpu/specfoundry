/**
 * SpecFoundry Agent Surface Lab — client-side static analyzer.
 * No network access, no execution of user-provided code, no content in reports.
 * Based on rule concepts from SpecFoundry's existing CLI scanner; browser implementation is original.
 */
export const VERSION = '1.0.0';
export const EXTENSIONS = new Set(['py','js','jsx','ts','tsx','mjs','cjs','go','rs','sh','yaml','yml']);
export const EXCLUDED_DIRS = new Set(['node_modules','.git','.venv','venv','dist','build','.next','vendor','coverage','.pytest_cache','__pycache__','.turbo','.cache','target']);
export const MAX_FILES = 2000;
export const MAX_FILE_BYTES = 256000;
export const MAX_TOTAL_BYTES = 25_000_000;
export const MAX_FINDINGS = 500;

export const RULES = [
  {
    id: 'payment_actions', label: 'Payments and transfers', level: 'critical', icon: '◈',
    description: 'Payment initiation or payment-rail integration',
    question: 'Are vendor, payer, amount, idempotency, and authorization validated before every transaction?',
    patterns: [/(?:\bstripe\b|payment_intents|paymentIntents|checkout\.sessions|paypal|\bx402\b|\btransfer\.create\s*\()/i]
  },
  {
    id: 'outbound_messages', label: 'External communications', level: 'high', icon: '↗',
    description: 'Potential message delivery beyond the agent boundary',
    question: 'Who approves recipients and content, and how are delivery, rate limits and unsubscribe rules enforced?',
    patterns: [/\b(?:nodemailer|sendgrid|resend|smtp|send_email|messages\.send|sendMail\s*\(|send_message\s*\()/i]
  },
  {
    id: 'process_execution', label: 'Command execution', level: 'critical', icon: '⌘',
    description: 'Local commands or child processes',
    question: 'Are commands constrained to allowed binaries and sanitized arguments inside an isolated sandbox?',
    patterns: [/\b(?:subprocess\.|os\.system\s*\(|child_process\b|\bspawn\s*\(|\bexec\s*\(|execSync\s*\()/i]
  },
  {
    id: 'data_mutations', label: 'Data writes and deletion', level: 'high', icon: '▤',
    description: 'Writes that may modify application or customer data',
    question: 'Which principal is authorized to write, what is the rollback, and is a complete before/after receipt retained?',
    patterns: [/\b(?:INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|upsert\s*\(|\.insert\s*\(|\.delete\s*\(|deleteMany\s*\()/i]
  },
  {
    id: 'external_http_writes', label: 'Outbound HTTP writes', level: 'high', icon: '⇄',
    description: 'HTTP requests that can change remote state',
    question: 'Are destinations allowlisted, request bodies validated, retries bounded, and duplicate writes prevented?',
    patterns: [/\b(?:requests|httpx|axios)\.(?:post|put|patch|delete)\s*\(/i, /\bmethod\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i]
  },
  {
    id: 'paid_model_calls', label: 'Model and inference spend', level: 'medium', icon: '✳',
    description: 'Model inference or provider SDK usage with possible metered cost',
    question: 'Are per-task and daily token budgets, model allowlists and loop termination controls measurable?',
    patterns: [/\b(?:openai|anthropic|groq|gemini|bedrock|chat\.completions|responses\.create)\b/i]
  },
  {
    id: 'background_execution', label: 'Unattended execution', level: 'medium', icon: '◷',
    description: 'Recurring or asynchronous jobs with continuing authority',
    question: 'Can scheduled jobs be stopped, monitored, and reconciled after interruption or partial failure?',
    patterns: [/\b(?:cron|schedule\s*\(|setInterval\s*\(|celery|temporal|background_tasks|BackgroundTasks)\b/i]
  },
  {
    id: 'agent_handoffs', label: 'Agent delegation and handoffs', level: 'medium', icon: '⤴',
    description: 'Potential authority transfer across agent or tool boundaries',
    question: 'Is each handoff authenticated, restricted to least privilege and recorded with its originating intent?',
    patterns: [/\b(?:handoff\s*\(|handoffs\b|create_handoff\s*\(|add_edge\s*\(|crew\.kickoff\s*\(|delegate_to\s*\()/i]
  }
];

export const DEMO_FILES = [
  {path:'agent/plan.py',content:'from openai import OpenAI\nclient = OpenAI()\nresponse = client.responses.create(model="demo", input="Research supplier")\n'},
  {path:'agent/orchestrator.py',content:'from agents import handoff\nreview = handoff(finance_agent)\n'},
  {path:'actions/checkout.ts',content:'import Stripe from "stripe";\nconst stripe = new Stripe(process.env.PAYMENT_TOKEN);\nawait stripe.paymentIntents.create({amount: 29900, currency: "eur"});\n'},
  {path:'actions/outreach.py',content:'from mailer import send_email\nsend_email(recipient, briefing)\nrequests.post(endpoint, json=payload)\n'},
  {path:'jobs/worker.js',content:'setInterval(() => startRun(), 60000);\nconst { exec } = require("child_process");\n'},
  {path:'storage/state.py',content:'cursor.execute("UPDATE reviews SET status = ?", [state])\n'}
];

export function normalizedPath(path) {
  return String(path || '').replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g,'/');
}
export function eligible(path, size = 0) {
  const clean = normalizedPath(path);
  if (!clean || clean.startsWith('../') || clean.includes('/../') || clean.startsWith('./')) return false;
  const pieces = clean.split('/');
  const name = pieces.at(-1).toLowerCase();
  if (pieces.slice(0,-1).some(p => p.startsWith('.') || EXCLUDED_DIRS.has(p.toLowerCase()))) return false;
  if (name.startsWith('.env') || name.endsWith('.lock') || name.endsWith('.min.js') || name.endsWith('.map')) return false;
  const ext = name.split('.').at(-1);
  return EXTENSIONS.has(ext) && size <= MAX_FILE_BYTES;
}

export function scanEntries(entries, label='Local selection') {
  const findings=[];
  const counters=Object.fromEntries(RULES.map(r=>[r.id,0]));
  const stats={considered:entries.length,files_scanned:0,skipped_or_capped:0,bytes_scanned:0,hit_limit:false};
  for (const entry of entries) {
    const path=normalizedPath(entry.path);
    const content=String(entry.content ?? '');
    const bytes=new TextEncoder().encode(content).byteLength;
    if (!eligible(path,bytes) || /\u0000/.test(content) || stats.files_scanned >= MAX_FILES || stats.bytes_scanned+bytes>MAX_TOTAL_BYTES) {
      stats.skipped_or_capped++;
      continue;
    }
    stats.files_scanned++;
    stats.bytes_scanned+=bytes;
    const lines=content.split(/\r?\n/);
    for(let i=0;i<lines.length;i++) {
      for(const rule of RULES){
        if(rule.patterns.some(pattern=>pattern.test(lines[i]))){
          if(findings.length>=MAX_FINDINGS){stats.hit_limit=true;continue;}
          findings.push({file:path,line:i+1,surface:rule.id});
          counters[rule.id]++;
        }
      }
    }
  }
  return {
    schema_version:'1.0',tool:'SpecFoundry Agent Surface Lab',tool_version:VERSION,
    generated_at:new Date().toISOString(),source_label:String(label).slice(0,120),
    stats,surface_counts:counters,findings,
    limitations:[
      'Static heuristic matches only: false positives and false negatives are expected.',
      'A finding is not a verified vulnerability; no findings do not establish safety.',
      'Only provided supported text files were examined. Exclusions and caps apply.',
      'No source lines, secrets or full file contents are stored in this report.',
      'No execution, network probing, dependency analysis or runtime verification occurred.'
    ]
  };
}

export function summary(report, statuses={}) {
  const byLevel={critical:0,high:0,medium:0};
  for(const rule of RULES) if(report.surface_counts[rule.id]) byLevel[rule.level]+=report.surface_counts[rule.id];
  const active=RULES.filter(rule=>report.surface_counts[rule.id]>0);
  const reviewed=active.filter(rule=>statuses[rule.id] && statuses[rule.id] !== 'unreviewed');
  return {total:report.findings.length,byLevel,active:active.length,reviewed:reviewed.length,attention:active.filter(rule=> statuses[rule.id] === 'needs-control').length};
}

export function exportReport(report, statuses={}) {
  if(!report) throw new TypeError('A scan is required');
  return {
    ...report,
    review:{
      type:'Self-attested, not independently verified',
      status_by_surface:Object.fromEntries(RULES.filter(rule=>report.surface_counts[rule.id]>0).map(rule=>[rule.id, statuses[rule.id]||'unreviewed'])),
      summary:summary(report,statuses)
    }
  };
}
