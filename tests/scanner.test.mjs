import test from 'node:test';
import assert from 'node:assert/strict';
import {eligible, scanEntries, DEMO_FILES, summary, exportReport, RULES, MAX_FILE_BYTES} from '../web/scanner.mjs';

test('sample project produces a real inventory with no source content',()=>{
 const r=scanEntries(DEMO_FILES,'Synthetic fixture');
 assert.equal(r.stats.files_scanned,6);
 assert.ok(r.findings.length >=8);
 assert.equal(r.surface_counts.payment_actions,3);
 assert.equal(r.surface_counts.agent_handoffs,1);
 assert.equal(r.surface_counts.outbound_messages,2);
 assert.equal(r.surface_counts.external_http_writes,1);
 assert.ok(!JSON.stringify(r).includes('29900'));
 assert.ok(!JSON.stringify(r).includes('PAYMENT_TOKEN'));
});

test('excluded folders, secret files, and unsupported extensions are ignored',()=>{
 const r=scanEntries([
  {path:'.env',content:'stripe=secret'},
  {path:'node_modules/pkg/pay.ts',content:'stripe.paymentIntents.create()'},
  {path:'secret.min.js',content:'stripe'},
  {path:'readme.md',content:'stripe'},
  {path:'src/foo.ts',content:'stripe'},
 ]);
 assert.equal(r.stats.files_scanned,1);
 assert.equal(r.stats.skipped_or_capped,4);
 assert.equal(r.surface_counts.payment_actions,1);
});

test('nested path traversal is excluded and windows paths normalized',()=>{
 assert.equal(eligible('../secret.ts'), false);
 assert.equal(eligible('src/../../secret.ts'), false);
 assert.equal(eligible('src\\agent.ts'), true);
 const r=scanEntries([{path:'src\\agent.ts',content:'send_email(x)'}]);
 assert.equal(r.findings[0].file,'src/agent.ts');
});

test('oversize file and binary content rejected',()=>{
 const r=scanEntries([{path:'a.ts',content:'x'.repeat(MAX_FILE_BYTES+1)},{path:'b.py',content:'stripe\u0000oops'}]);
 assert.equal(r.stats.files_scanned,0);
 assert.equal(r.stats.skipped_or_capped,2);
});

test('review decisions do not imply external verification',()=>{
 const r=scanEntries([{path:'a.py',content:'import stripe'}]);
 const e=exportReport(r,{payment_actions:'verified-by-user'});
 assert.match(e.review.type,/not independently verified/i);
 assert.equal(e.review.summary.reviewed,1);
 assert.equal(summary(r,{payment_actions:'needs-control'}).attention,1);
});

test('all rules have review questions, and no findings means no safety claim',()=>{
 assert.equal(new Set(RULES.map(x=>x.id)).size,RULES.length);
 assert.ok(RULES.every(x=>x.question?.length>40));
 const r=scanEntries([{path:'safe.ts',content:'const value = 42;'}]);
 assert.equal(r.findings.length,0);
 assert.match(r.limitations.join(' '),/do not establish safety/);
});
