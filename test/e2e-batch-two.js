// Isolated browser fixtures for the second ten-site review. No live submissions.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root,'src/sites.js'),'utf8');
const catalog = vm.runInNewContext(source+';({SITES,siteForHost})');
assert.equal(catalog.siteForHost('tally.so','/embed/3NADy0').id,'aiai');
assert.equal(catalog.siteForHost('tally.so','/embed/nG1V7j').id,'aimarketing');
assert.equal(catalog.siteForHost('tally.so','/embed/unrelated'),undefined);
assert.equal(catalog.siteForHost('embed.fillout.com','/t/unrelated'),undefined);
assert.equal(catalog.SITES.some(s=>s.domain==='toolhunter.ai'),false,'mandatory publication badge is excluded');
const field=(aria,type='text')=>`<label>${aria}<input aria-label="${aria}" name="${aria}" type="${type}" required></label>`;
let mode='ready',received=[],draftRecords=[];
const fillout=()=>`<div class="widget-layout-container">${field('AI Tool Name:')}${field('Website','url')}<textarea aria-label="Description" name="Description" required></textarea>${mode==='missing-email'?'':field('Email:','email')}<div class="widget-2YpyK7B3k6NzWoktR4ZrHM"><input type="file" accept="image/jpeg" hidden><span id="upload"></span></div><button>Submit</button></div><script>
document.querySelector('input[type=file]').onchange=()=>{document.querySelector('#upload').textContent='Uploading…';${mode==='pending-upload'?'':"setTimeout(()=>document.querySelector('#upload').textContent='Upload complete',700);"}};
document.querySelector('button').onclick=async()=>{await fetch('/received',{method:'POST',body:JSON.stringify({email:document.querySelector('[aria-label="Email:"]')?.value,name:document.querySelector('[aria-label="AI Tool Name:"]').value,mime:document.querySelector('input[type=file]').files[0]?.type})});document.body.innerHTML='<h1>Thank you for your submission.</h1><p>We will review your information and get back to you shortly.</p>'};</script>`;
const aiai=()=>`<form>${field('Your Name')}${field('Contact Email Address','email')}${field('Tool Name')}${field('URL','url')}<label>Screenshot or Tool usage pictures<input placeholder="Screenshot URL" name="screenshot" required></label><fieldset><legend>Are you willing to provide a link to our website?</legend><label><input id="choice_8824cb86-ba35-4a65-8e5c-b0fdc99a31e2" name="reciprocal" type="radio" value="yes" required>Yes</label><label><input id="choice_9696e6e3-4baf-484d-a1e7-00d9db1df83d" name="reciprocal" type="radio" value="no" required>No</label></fieldset><button>Submit</button></form><script>
let step=1,data;document.querySelector('form').onsubmit=async e=>{e.preventDefault();if(step===1){data=Object.fromEntries(new FormData(e.target));await fetch('/draft',{method:'POST'});e.target.innerHTML='<h3>Done!</h3><p>Your Submit is completed.</p><button>Submit</button>';step=2;return;}await fetch('/received',{method:'POST',body:JSON.stringify(data)});document.body.innerHTML='<p>Form submitted</p><h1>Thanks for completing this form!</h1>'};</script>`;
(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'autosubmit-two-'));let context;
  try{
    fs.copyFileSync(path.join(root,'manifest.json'),path.join(dir,'manifest.json'));
    for(const f of ['src','icons'])fs.cpSync(path.join(root,f),path.join(dir,f),{recursive:true});
    let patched=source.replace("domain:'submityouraitool.com'","domain:'fillout.test'").replace("url:'https://embed.fillout.com/t/cBypbJX257us'","url:'https://fillout.test/submit'")
      .replace("domain:'aiai.tools'","domain:'aiai.test'").replace("url:'https://tally.so/embed/3NADy0'","url:'https://aiai.test/submit'");
    fs.writeFileSync(path.join(dir,'src/sites.js'),patched);
    context=await chromium.launchPersistentContext('',{headless:true,channel:'chromium',args:[`--disable-extensions-except=${dir}`,`--load-extension=${dir}`]});
    let batch;
    await context.route('**/*',async route=>{
      const request=route.request(),u=new URL(request.url());if(u.protocol==='chrome-extension:')return route.continue();
      if(!['fillout.test','aiai.test'].includes(u.hostname))return route.abort();
      if(u.pathname==='/received')received.push({host:u.hostname,data:JSON.parse(request.postData())});
      if(u.pathname==='/draft')draftRecords.push(await batch.evaluate(async()=>Object.keys((await Store.getProducts())[0].submissionRecords)));
      return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:u.pathname==='/submit'?(u.hostname==='fillout.test'?fillout():aiai()):'ok'});
    });
    let [worker]=context.serviceWorkers();if(!worker)worker=await context.waitForEvent('serviceworker');
    batch=await context.newPage();await batch.goto(`chrome-extension://${worker.url().split('/')[2]}/src/batch.html`);
    const productId=await batch.evaluate(async()=>{
      const p=await Store.upsertProduct({name:'Test Video Tool',url:'https://example.com',email:'owner@example.com',heroUrl:'https://example.com/hero.jpg',description:'A video tool removes burned-in text, subtitles, captions, timestamps and watermarks using AI. Upload a clip and download the processed video.',pricing:'Free Trial',tags:['Video Editing']});
      await Store.saveSubmitter({firstName:'Ada',lastName:'Lovelace'});await Store.saveSettings({autoAgree:true,autoSubmit:true,googleAuto:false,lang:'en'});return p.id;
    });
    const wait=async(id,fragment)=>{for(let n=0;n<220;n++){const run=await batch.evaluate(async()=>(await chrome.storage.local.get('run')).run);if(fragment?run.info[id]?.msg.includes(fragment):run.status[id]==='done')return;await new Promise(r=>setTimeout(r,200));}throw Error('Timed out: '+id+' '+fragment+' '+JSON.stringify(await batch.evaluate(async()=>(await chrome.storage.local.get('run')).run)));};
    const run=async(id,fragment)=>{await batch.evaluate(()=>chrome.runtime.sendMessage({type:'stopRun'}));for(const p of context.pages())if(p!==batch)await p.close();await batch.evaluate(async()=>{const ps=await Store.getProducts();ps[0].submissions={};ps[0].submissionRecords={};await Store.saveProducts(ps);});received=[];await batch.evaluate(({id,productId})=>chrome.runtime.sendMessage({type:'startRun',productId,ids:[id]}),{id,productId});await wait(id,fragment);};
    const hero=async(mime)=>batch.evaluate(async mime=>{const ps=await Store.getProducts();ps[0].hero={data:`data:${mime};base64,AQID`,name:mime==='image/jpeg'?'hero.jpg':'hero.png'};await Store.saveProducts(ps);},mime);
    await hero('image/jpeg');await run('submityouraitool');assert.equal(received[0].data.mime,'image/jpeg');assert.equal(received[0].data.email,'owner@example.com');
    mode='missing-email';await run('submityouraitool','Wait for the complete Fillout form');assert.equal(received.length,0);
    mode='ready';await hero('image/png');await run('submityouraitool','Upload a JPEG');assert.equal(received.length,0);const page=context.pages().find(p=>p.url().includes('fillout.test'));assert.equal(await page.locator('input[type=file]').evaluate(e=>e.files.length),0,'do not send incompatible PNG');
    mode='pending-upload';await hero('image/jpeg');await run('submityouraitool','Upload a JPEG');assert.equal(received.length,0,'upload still processing must not submit');
    await run('aiai');assert.equal(received.length,1);assert.equal(received[0].data.reciprocal,'no');assert.equal(received[0].data.screenshot,'https://example.com/hero.jpg');assert.deepEqual(draftRecords,[[]],'intermediate Done page must not create an attempt or receipt');
    assert.equal(await batch.evaluate(async()=>(await Store.getProducts())[0].heroUrl),'https://example.com/hero.jpg');
    await batch.evaluate(async()=>{const ps=await Store.getProducts();ps[0].heroUrl='';await Store.saveProducts(ps);});await run('aiai','Still required');assert.equal(received.length,0,'missing public image URL waits for user');
    console.log('OK: shared-host path isolation, JPEG format/hydration/upload guards, optional backlink No, final Tally receipt, draft attempt boundary and public image URL persistence');
  }finally{if(context)await context.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
