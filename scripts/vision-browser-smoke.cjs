// Runs only against an isolated local instance, with synthetic credentials and no external AI calls.
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = new URL(process.env.BASE || 'http://127.0.0.1:3100');
if (!['127.0.0.1','localhost'].includes(base.hostname) || base.protocol !== 'http:') throw Error('Local fixture only');
const output = process.env.VISION_SHOTS || 'vision-smoke-results';
const errors = [];
const results = [];
const check = (name, ok, details = {}) => { results.push({name,ok,...details}); console.log((ok?'PASS ':'FAIL ')+name, details); if(!ok) errors.push(name); };
async function ready(page) {
  await page.locator('button[aria-label*="dubek" i]').first().waitFor({state:'visible',timeout:45000});
}
async function inspect(page, route, width, screenshot) {
  const res = await page.goto(new URL(route,base).href, {waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('h1').first().waitFor({state:'visible',timeout:15000});
  await page.waitForTimeout(250);
  const layout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    heading: document.querySelector('h1')?.textContent?.trim(),
    images: [...document.querySelectorAll('img')].filter(i=>i.complete && i.naturalWidth===0 && i.getBoundingClientRect().width>0).map(i=>i.getAttribute('src')).slice(0,10),
    lcp: performance.getEntriesByType('largest-contentful-paint').at(-1)?.startTime ?? null
  }));
  check(width+' '+route+' reachable',res?.status()===200 && Boolean(layout.heading),{status:res?.status()});
  check(width+' '+route+' layout', layout.overflow<=1 && layout.images.length===0,layout);
  await page.screenshot({path:path.join(output,screenshot+'.png'),fullPage:true,timeout:30000});
}
(async()=>{
  await fs.mkdir(output,{recursive:true});
  const browser=await chromium.launch();
  try {
    for(const width of [320,390,768,1440]) {
      const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',isMobile:width<600,hasTouch:width<600});
      const page=await ctx.newPage();
      page.on('pageerror',e=>errors.push('Page '+width+': '+e.message));
      await page.addInitScript(()=>{try{new PerformanceObserver(list=>{window.__visionLcp=list.getEntries().at(-1)?.startTime;}).observe({type:'largest-contentful-paint',buffered:true});}catch{}});
      for(const [route,name] of [['/','home'],['/ielts-tayyorgarlik','ielts'],['/cefr-tayyorgarlik','cefr'],['/ingliz-tili-darslari','english']]) {
        await inspect(page,route,width,name+'-'+width);
      }
      await page.goto(base.href,{waitUntil:'domcontentloaded'}); await ready(page);
      const dock=page.locator('button[aria-label*="dubek" i]').first();
      await dock.click();
      await page.getByRole('dialog',{name:'Edubek yordamchisi'}).waitFor();
      check(width+' EduBek dock opens', await page.getByLabel('Edubek ga savol').isVisible());
      await page.screenshot({path:path.join(output,'dock-'+width+'.png')});
      await ctx.close();
    }
    const anon=await browser.newContext();
    check('anonymous owner API refused',(await anon.request.get(new URL('/api/owner/ai-providers',base).href)).status()===401);
    await anon.close();
    const student=await browser.newContext({viewport:{width:1280,height:900}});
    const email='vision-smoke-'+Date.now()+'@test.local';
    const register=await student.request.post(new URL('/api/auth/register',base).href,{data:{name:'Vision',surname:'Fixture',identifier:email,email,password:'FixturePass-2026!',region:'Toshkent'}});
    check('student registration',register.status()===200);
    const me=await student.request.get(new URL('/api/auth/me',base).href);
    check('student session',me.status()===200);
    const ownerDenied=await student.request.get(new URL('/api/owner/ai-providers',base).href);
    check('student cannot open owner API',[401,403].includes(ownerDenied.status()));
    const ai=await student.request.post(new URL('/api/ai-stream',base).href,{data:{userMessage:'What is the past tense of go?'}});
    check('no AI keys: explicit unavailable response',ai.status()===503);
    await student.close();
    const owner=await browser.newContext();
    const login=await owner.request.post(new URL('/api/auth/login',base).href,{data:{loginInput:'visionfixture',password:'VisionFixture-2026!'}});
    check('owner fixture login',login.status()===200 && (await login.json()).role==='owner');
    check('owner provider manager endpoint',(await owner.request.get(new URL('/api/owner/ai-providers',base).href)).status()===200);
    await owner.close();
    // Modest, bounded local-only burst. Busy responses are deliberate; 500s/timeouts are not.
    const start=Date.now();
    const batch=await Promise.allSettled(Array.from({length:24},()=>fetch(new URL('/api/db/all',base),{signal:AbortSignal.timeout(12000)})));
    const counts={};
    for(const r of batch){const code=r.status==='fulfilled'?r.value.status:'timeout';counts[code]=(counts[code]||0)+1;if(r.status==='fulfilled') await r.value.body?.cancel();}
    check('24 simultaneous local reads recover without 500 or timeout',batch.every(r=>r.status==='fulfilled'&&[200,401,503].includes(r.value.status)),{counts,elapsedMs:Date.now()-start});
    const recovery=await fetch(new URL('/api/db/all',base),{signal:AbortSignal.timeout(8000)});
    check('post-burst recovery',[200,401].includes(recovery.status));
  } finally {
    await browser.close();
    await fs.writeFile(path.join(output,'report.json'),JSON.stringify({results,errors},null,2));
  }
  if(errors.length)throw Error(errors.join('; '));
})().catch(e=>{console.error(e.message);process.exitCode=1});
