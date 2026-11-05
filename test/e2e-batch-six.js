// Batch06: duplicate Contact Form7 fields and explicit send-error handling.
// All pages and network are local Playwright fixtures, never live submissions.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
let mode='error',received=[];
const description='This video tool removes burned-in subtitles, captions and text with AI. Upload a video, select a text region and download the edited clip while preserving the original frame.';
function fixture(){return `<input type="search" name="s" placeholder="Search the web"><form class="wpcf7-form" method="post" data-status="init">
 <label>Name *<input name="your-name" aria-required="true"></label><label>Email *<input type="email" name="your-email" aria-required="true"></label>
 <label>Tool Name *<input name="ToolName" aria-required="true"></label><label>Tool URL *<input name="ToolURL" type="url" aria-required="true"></label>
 <label>${mode==='changed-label'?'Description':'Tool Description (optional)'}<textarea name="your-message"></textarea></label>
 <label>Tool Short Description (optional)<textarea name="your-message"></textarea></label><input type="submit" value="Submit"><div class="wpcf7-response-output"></div>
 </form><script>document.querySelector('form').onsubmit=async e=>{e.preventDefault();const f=e.target;await fetch('/received',{method:'POST',body:JSON.stringify([...new FormData(f)])});f.dataset.status=${JSON.stringify(mode==='success'?'sent':'failed')};f.querySelector('.wpcf7-response-output').textContent=${JSON.stringify(mode==='success'?'Thank you for your message. It has been sent.':'There was an error trying to send your message. Please try again later.')};};</script>`;}
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'autosubmit-six-'));let context;
 try{
  for(const f of ['manifest.json','src','icons'])fs.cpSync(path.join(root,f),path.join(dir,f),{recursive:true});
  const source=fs.readFileSync(path.join(dir,'src/sites.js'),'utf8').replace("domain:'aivalley.ai'","domain:'valley.test'").replace("url:'https://aivalley.ai/submit-tool/'","url:'https://valley.test/submit-tool/'");fs.writeFileSync(path.join(dir,'src/sites.js'),source);
  context=await chromium.launchPersistentContext('',{headless:true,channel:'chromium',args:[`--disable-extensions-except=${dir}`,`--load-extension=${dir}`]});
  await context.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());if(u.protocol==='chrome-extension:')return route.continue();if(u.hostname!=='valley.test')return route.abort();if(u.pathname==='/received')received.push(JSON.parse(req.postData()));return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:u.pathname==='/submit-tool/'?fixture():'ok'});});
  let [worker]=context.serviceWorkers();if(!worker)worker=await context.waitForEvent('serviceworker');const batch=await context.newPage();await batch.goto(`chrome-extension://${worker.url().split('/')[2]}/src/batch.html`);
  const productId=await batch.evaluate(async description=>{const p=await Store.upsertProduct({name:'Video Tool',url:'https://example.com',email:'support@example.com',tagline:'Remove text from video with AI.',description,pricing:'Free Trial'});await Store.saveSubmitter({firstName:'Ada',lastName:'Lovelace'});await Store.saveSettings({autoSubmit:true,autoAgree:true,lang:'en'});return p.id;},description);
  const wait=async predicate=>{for(let n=0;n<180;n++){const run=await batch.evaluate(async()=>(await chrome.storage.local.get('run')).run);if(predicate(run))return run;await new Promise(r=>setTimeout(r,200));}throw Error('Timeout '+JSON.stringify(await batch.evaluate(async()=>(await chrome.storage.local.get('run')).run)));};
  const start=async()=>{await batch.evaluate(()=>chrome.runtime.sendMessage({type:'stopRun'}));for(const p of context.pages())if(p!==batch)await p.close();received=[];await batch.evaluate(async()=>{const ps=await Store.getProducts();ps[0].submissions={};ps[0].submissionRecords={};await Store.saveProducts(ps);});await batch.evaluate(productId=>chrome.runtime.sendMessage({type:'startRun',productId,ids:['aivalley']}),productId);};
  await start();await wait(r=>r.info.aivalley?.msg.includes('Review it'));const form=context.pages().find(p=>p!==batch);
  assert.equal(received.length,0,'live send error keeps adapter behind review');assert.equal(await form.locator('[name=s]').inputValue(),'','do not fill the unrelated site search');
  assert.equal(await form.locator('[name=your-name]').inputValue(),'Ada Lovelace');assert.equal(await form.locator('[name=your-email]').inputValue(),'support@example.com');
  assert.equal(await form.getByLabel('Tool Description (optional)',{exact:true}).inputValue(),description);assert.equal(await form.getByLabel('Tool Short Description (optional)',{exact:true}).inputValue(),'Remove text from video with AI.');
  await form.getByRole('button',{name:'Submit',exact:true}).click();const failed=await wait(r=>r.status.aivalley==='failed');assert.match(failed.info.aivalley.msg,/message sending error/);assert.equal(received.length,1);assert.equal(await batch.evaluate(async()=>(await Store.getProducts())[0].submissions['valley.test']),undefined,'send error is never a success');
  assert.deepEqual(received[0].filter(([name])=>name==='your-message').map(([,value])=>value),[description,'Remove text from video with AI.']);
  mode='changed-label';await start();await wait(r=>r.info.aivalley?.msg.includes('visible labels have changed'));assert.equal(received.length,0,'changed duplicate labels must stop for review');
  mode='success';await start();await wait(r=>r.info.aivalley?.msg.includes('Review it'));await context.pages().find(p=>p!==batch).getByRole('button',{name:'Submit',exact:true}).click();await wait(r=>r.status.aivalley==='done');assert.equal(received.length,1);assert.ok(await batch.evaluate(async()=>(await Store.getProducts())[0].submissions['valley.test']));
  console.log('OK: duplicate-name long/short description mapping, real contact fields, unrelated search blank, explicit send error, changed labels stop, review-only final click and explicit fixture receipt');
 }finally{if(context)await context.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
