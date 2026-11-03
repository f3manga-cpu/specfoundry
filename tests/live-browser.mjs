/** Real public HTTPS browser acceptance. No live payment is attempted. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = (process.env.SPECFOUNDRY_SITE || 'https://specfoundry-agent-surface-lab.onrender.com').replace(/\/$/, '');
const checkout = 'https://buy.stripe.com/3cI8wQf4S7fwa2IgwC43S05';
const screenshots = 'artifacts';
await fs.mkdir(screenshots, {recursive:true});

async function requireLive(path, expected) {
  let last;
  for(let attempt=0;attempt<24;attempt++) {
    try {
      const response=await fetch(`${base}${path}`, {signal: AbortSignal.timeout(15000)});
      const body=await response.text();
      assert.equal(response.status, 200, `HTTP ${response.status} ${path}`);
      assert.match(body, expected, `Wrong production content at ${path}`);
      return {response,body};
    } catch(e) {last=e;await new Promise(r=>setTimeout(r,5000));}
  }
  throw new Error(`Production endpoint ${path} failed: ${last?.message}`);
}

const home=await requireLive('/', /Before an agent/);
const service=await requireLive('/service.html', /Agent Action Surface Snapshot/);
await requireLive('/scanner.mjs', /export const RULES/);
await requireLive('/app.mjs', /const state/);
await requireLive('/styles.css', /--accent/);
assert.match(home.body, /connect-src 'none'/);
assert.match(service.body, new RegExp(checkout.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
console.log('Public HTTPS endpoints and payment-link placement: PASS');

const browser=await chromium.launch({headless:true});
try {
  for(const [name,viewport,mobile] of [
    ['desktop',{width:1440,height:900},false],
    ['mobile',{width:390,height:844},true],
  ]) {
    const page=await browser.newPage({viewport, isMobile:mobile, hasTouch:mobile, acceptDownloads:true});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const response=await page.goto(base, {waitUntil:'load',timeout:45000});
    assert.equal(response.status(),200);
    assert.match(await page.title(),/Agent Surface Lab/);
    assert.equal(await page.locator('#export-json').isDisabled(),true);
    await page.getByRole('button',{name:/Explore a sample scan/}).click();
    assert.equal((await page.locator('#metric-files').innerText()).trim(),'6');
    assert.ok(Number(await page.locator('#metric-matches').innerText())>=10);
    assert.ok(await page.locator('#review-list .review-item').count()>=6);
    if(name==='desktop'){
      await page.locator('#review-list select').first().selectOption('needs-control');
      const jsonEvent=page.waitForEvent('download');
      await page.locator('#export-json').click();
      const jsonDownload=await jsonEvent;
      const jsonPath=`${screenshots}/production-inventory.json`;
      await jsonDownload.saveAs(jsonPath);
      const report=JSON.parse(await fs.readFile(jsonPath,'utf8'));
      assert.equal(report.stats.files_scanned,6);
      assert.equal(report.review.summary.attention,1);
      assert.ok(!JSON.stringify(report).includes('source_content'));
      const htmlEvent=page.waitForEvent('download');
      await page.locator('#export-html').click();
      const htmlDownload=await htmlEvent;
      const htmlPath=`${screenshots}/production-report.html`;
      await htmlDownload.saveAs(htmlPath);
      assert.match(await fs.readFile(htmlPath,'utf8'),/Not a security audit or certification/);
      await page.locator('#file-input').setInputFiles({name:'agent.py',mimeType:'text/plain',buffer:Buffer.from('import stripe\nrequests.post(url,data=payload)\n')});
      await page.waitForFunction(()=>document.querySelector('#metric-files').textContent==='1');
      assert.equal((await page.locator('#metric-matches').innerText()).trim(),'2');
    }
    assert.ok(await page.locator('body').evaluate(el=>el.scrollWidth)<=viewport.width,`overflow: ${name}`);
    await page.screenshot({path:`${screenshots}/${name}-public.png`,fullPage:true});
    const serviceResponse=await page.goto(`${base}/service.html`,{waitUntil:'load',timeout:45000});
    assert.equal(serviceResponse.status(),200);
    assert.equal(await page.getByRole('link',{name:/Secure payment via Stripe/}).getAttribute('href'),checkout);
    assert.equal(await page.getByRole('link',{name:/Confirm scope by email/}).count(),1);
    assert.ok(await page.locator('body').evaluate(el=>el.scrollWidth)<=viewport.width,`service overflow: ${name}`);
    await page.screenshot({path:`${screenshots}/${name}-service-public.png`,fullPage:true});
    assert.deepEqual(errors,[],`page errors: ${name}`);
    await page.close();
    console.log(`${name}: real public browser scan, exports, upload, service page and checkout handoff: PASS`);
  }
} finally {await browser.close();}
