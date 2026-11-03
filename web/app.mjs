import {RULES, DEMO_FILES, VERSION, MAX_FILES, MAX_FILE_BYTES, MAX_TOTAL_BYTES, scanEntries, summary, exportReport, eligible} from './scanner.mjs';

const $ = id => document.getElementById(id);
const state = {report:null,statuses:{},filter:'all',visible:75};
const status = (message,isError=false) => { $('status').textContent=message; $('status').classList.toggle('error',isError); };
const format = x => Number(x).toLocaleString('en-US');
const humanLevel = level => level.charAt(0).toUpperCase()+level.slice(1);

function el(tag, cls='', text=''){
  const n=document.createElement(tag);
  if(cls) n.className=cls;
  if(text !== '') n.textContent=String(text);
  return n;
}
function buttonDownload(name,mime,contents){
  const blob=new Blob([contents],{type:mime});
  const url=URL.createObjectURL(blob);
  const a=el('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function updateMetrics(){
  const r=state.report;
  if(!r) return;
  const s=summary(r,state.statuses);
  $('metric-files').textContent=format(r.stats.files_scanned);
  $('metric-matches').textContent=format(s.total);
  $('metric-classes').textContent=format(s.active)+' / '+RULES.length;
  $('metric-review').textContent=s.active ? Math.round(100*s.reviewed/s.active)+'%' : 'N/A';
  $('metric-file-note').textContent=r.stats.skipped_or_capped?`${format(r.stats.skipped_or_capped)} skipped / capped`:'All eligible files read';
  $('review-counter').textContent=`${s.reviewed} / ${s.active}`;
}
function renderMap(){
  const r=state.report;
  const node=$('action-map');node.replaceChildren();
  const sorted=[...RULES].sort((a,b)=>r.surface_counts[b.id]-r.surface_counts[a.id]);
  const max=Math.max(...Object.values(r.surface_counts),1);
  for(const rule of sorted){
    const count=r.surface_counts[rule.id];
    const row=el('div','bar-row');
    const head=el('div','bar-head');const name=el('span','bar-name');
    name.append(el('span','rule-glyph',rule.icon),document.createTextNode(rule.label));
    head.append(name,el('span','bar-count',format(count)));
    const rail=el('div','bar-rail');const fill=el('div','bar-fill'+(count?'':' bar-empty'));
    fill.style.width=`${count?Math.max(3,100*count/max):0}%`;
    rail.append(fill);row.append(head,rail);node.append(row);
  }
}
function renderReview(){
  const r=state.report,container=$('review-list');container.replaceChildren();
  const active=RULES.filter(rule=>r.surface_counts[rule.id]>0).sort((a,b)=>{
    const tiers={critical:3,high:2,medium:1};return tiers[b.level]-tiers[a.level];
  });
  if(!active.length){container.append(el('div','empty-small','No patterns matched in the supplied eligible files. This does not prove the code is safe.'));return;}
  for(const rule of active){
    const card=el('div','review-item'),top=el('div','review-top');
    top.append(el('strong','',rule.label),el('span',`priority ${rule.level}`,humanLevel(rule.level)));
    const q=el('p','',rule.question);
    const select=el('select');select.setAttribute('aria-label',`Review status for ${rule.label}`);
    const options=[['unreviewed','Not reviewed'],['needs-control','Needs a control'],['verified-by-user','Checked by reviewer'],['not-applicable','Not applicable']];
    for(const [value,label] of options){const o=el('option','',label);o.value=value;select.append(o);}
    select.value=state.statuses[rule.id]||'unreviewed';
    select.addEventListener('change',()=>{state.statuses[rule.id]=select.value;updateMetrics();renderTable();});
    card.append(top,q,select);container.append(card);
  }
}
function populateFilter(){
  const sel=$('filter');sel.replaceChildren();
  const all=el('option','','All action classes');all.value='all';sel.append(all);
  for(const rule of RULES.filter(rule=>state.report.surface_counts[rule.id]>0)){
    const op=el('option','',`${rule.label} (${state.report.surface_counts[rule.id]})`);op.value=rule.id;sel.append(op);
  }
  sel.value=state.filter;sel.disabled=false;
}
function renderTable(){
  const r=state.report,body=$('evidence-rows');body.replaceChildren();
  const filtered=r.findings.filter(f=>state.filter==='all'||f.surface===state.filter);
  const selection=filtered.slice(0,state.visible);
  for(const finding of selection){
    const rule=RULES.find(x=>x.id===finding.surface);
    const tr=el('tr');
    const tdLoc=el('td','location',`${finding.file}:${finding.line}`);
    const tdSurface=el('td','',rule.label);
    const tdPriority=el('td');tdPriority.append(el('span',`priority ${rule.level}`,humanLevel(rule.level)));
    const disposition=(state.statuses[rule.id]||'unreviewed').replace(/-/g,' ');
    const tdReview=el('td');tdReview.append(el('span','status-tag',disposition));
    tr.append(tdLoc,tdSurface,tdPriority,tdReview);body.append(tr);
  }
  if(!selection.length){const tr=el('tr'),td=el('td','table-empty','No matching evidence locations. This does not establish safety.');td.colSpan=4;tr.append(td);body.append(tr);}
  $('pagination-status').textContent=`Showing ${selection.length} of ${filtered.length} evidence locations${r.stats.hit_limit ? ' (500-location cap reached)' : ''}`;
  $('load-more').hidden=filtered.length<=state.visible;
}
function loadReport(report){
  state.report=report;state.statuses={};state.filter='all';state.visible=75;
  updateMetrics();renderMap();renderReview();populateFilter();renderTable();
  $('export-json').disabled=false;$('export-html').disabled=false;
  const notes=[];
  if(report.stats.skipped_or_capped)notes.push(`${report.stats.skipped_or_capped} files skipped or capped`);
  if(report.stats.hit_limit)notes.push('500-location finding cap reached');
  const prefix=report.source_label.startsWith('Synthetic')?'SYNTHETIC DEMO · ':'SCAN COMPLETE · ';
  status(`${prefix}${report.stats.files_scanned} files examined · ${report.findings.length} evidence locations.${notes.length?' '+notes.join('; ')+'.':''} No source code uploaded.`);
}
function runDemo(){
  loadReport(scanEntries(DEMO_FILES,'Synthetic demo — fictional commerce-agent repository'));
  $('workspace').scrollIntoView({behavior:'smooth',block:'start'});
}
async function handleFiles(files){
  const all=Array.from(files);
  if(!all.length){status('No files selected.',true);return;}
  status(`Reading ${all.length} selected files locally…`);
  try{
    const entries=[];let preSkipped=0,bytes=0;
    const folder=(all[0].webkitRelativePath||'').split('/')[0];
    for(const file of all){
      const path=file.webkitRelativePath||file.name;
      if(entries.length>=MAX_FILES || file.size>MAX_FILE_BYTES || bytes+file.size>MAX_TOTAL_BYTES || !eligible(path,file.size)){
        preSkipped++;continue;
      }
      bytes+=file.size;
      entries.push({path,content:await file.text()});
    }
    if(!entries.length){status('No supported text files were found. Select Python, JS/TS, Go, Rust, shell or YAML files.',true);return;}
    const report=scanEntries(entries,folder?`Local folder: ${folder}`:`Local selection of ${all.length} files`);
    report.stats.considered=all.length;
    report.stats.skipped_or_capped+=preSkipped;
    loadReport(report);
  }catch(error){status('Could not read this selection. Please use regular text source files and try again.',true);}
}
function escapeHTML(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function htmlReport(data){
  const s=data.review.summary;
  const rows=RULES.map(rule=>`<tr><td>${escapeHTML(rule.label)}</td><td>${data.surface_counts[rule.id]}</td><td>${escapeHTML(rule.level)}</td><td>${escapeHTML(data.review.status_by_surface[rule.id]||'No matches')}</td><td>${escapeHTML(rule.question)}</td></tr>`).join('');
  const locations=data.findings.map(f=>`<tr><td>${escapeHTML(f.file)}:${f.line}</td><td>${escapeHTML(RULES.find(r=>r.id===f.surface).label)}</td></tr>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Agent Surface Inventory — SpecFoundry</title><style>body{font:14px/1.6 system-ui,-apple-system,sans-serif;max-width:1040px;margin:52px auto;padding:0 30px;color:#18312e}header{border-bottom:2px solid #247e69;padding-bottom:24px}h1{font-size:34px;letter-spacing:-1px}h2{margin-top:36px;border-bottom:1px solid #d7e3df;padding-bottom:8px}.badge{font-size:11px;letter-spacing:1.4px;color:#277560;font-weight:800}.summary{display:flex;gap:30px;flex-wrap:wrap;background:#edf6f2;padding:18px;border-radius:8px}.summary strong{font-size:24px;display:block}table{border-collapse:collapse;width:100%;font-size:12px}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#eff4f1}.note{background:#fcf7e7;padding:15px;border-left:3px solid #ba9849}li{margin:7px 0}footer{margin-top:40px;font-size:11px;color:#566c63}@media print{body{margin:12px auto}tr{break-inside:avoid}h2{break-after:avoid}}</style></head><body><header><div class="badge">SPECFOUNDRY / AGENT SURFACE LAB</div><h1>Agent action-surface inventory</h1><p>Generated: ${escapeHTML(data.generated_at)}<br>Source: ${escapeHTML(data.source_label)}</p></header><h2>Coverage snapshot</h2><div class="summary"><div><strong>${data.stats.files_scanned}</strong> files examined</div><div><strong>${s.total}</strong> matches</div><div><strong>${s.active}</strong> classes</div><div><strong>${s.reviewed}/${s.active}</strong> categories reviewed</div></div><p>Skipped / capped files: ${data.stats.skipped_or_capped}. Findings capped: ${data.stats.hit_limit?'yes':'no'}. Review dispositions are self-attested; none were independently verified by the tool.</p><h2>Action classes and follow-up questions</h2><table><thead><tr><th>Class</th><th>Matches</th><th>Priority</th><th>Reviewer disposition</th><th>Question to verify</th></tr></thead><tbody>${rows}</tbody></table><h2>Evidence locations (no source code)</h2><table><thead><tr><th>Path and line</th><th>Action class</th></tr></thead><tbody>${locations||'<tr><td colspan="2">No matches found; this does not prove safety.</td></tr>'}</tbody></table><h2>Scope and limitations</h2><div class="note"><strong>Not a security audit or certification.</strong> This tool does not establish compliance or verify a runtime control.</div><ul>${data.limitations.map(v=>`<li>${escapeHTML(v)}</li>`).join('')}</ul><footer>SpecFoundry · Independent engineering workbench · https://github.com/f3manga-cpu/specfoundry</footer></body></html>`;
}

$('demo-btn').addEventListener('click',runDemo);
$('pick-files-hero').addEventListener('click',()=>$('file-input').click());
$('folder-btn').addEventListener('click',()=>$('folder-input').click());
$('files-btn').addEventListener('click',()=>$('file-input').click());
$('file-input').addEventListener('change',e=>{void handleFiles(e.target.files);e.target.value='';});
$('folder-input').addEventListener('change',e=>{void handleFiles(e.target.files);e.target.value='';});
$('filter').addEventListener('change',e=>{state.filter=e.target.value;state.visible=75;renderTable();});
$('load-more').addEventListener('click',()=>{state.visible+=75;renderTable();});
$('export-json').addEventListener('click',()=>buttonDownload('specfoundry-agent-surface-report.json','application/json',JSON.stringify(exportReport(state.report,state.statuses),null,2)+'\n'));
$('export-html').addEventListener('click',()=>buttonDownload('specfoundry-agent-surface-report.html','text/html',htmlReport(exportReport(state.report,state.statuses))));
const zone=$('dropzone');
for(const kind of ['dragenter','dragover'])zone.addEventListener(kind,e=>{e.preventDefault();zone.classList.add('drag-over');});
for(const kind of ['dragleave','drop'])zone.addEventListener(kind,e=>{e.preventDefault();zone.classList.remove('drag-over');});
zone.addEventListener('drop',e=>void handleFiles(e.dataTransfer.files));
window.addEventListener('error',()=>status('An unexpected interface error occurred. Please reload and try again.',true));
