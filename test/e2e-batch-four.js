// Recorded Nov5 forms, isolated hosts only. Never visits or submits to live directories.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'src/sites.js'),'utf8');
const sites=vm.runInNewContext(source+';SITES'),site=id=>sites.find(s=>s.id===id);
assert.equal(site('activesearchresults').confirmEmail,false);
for(const id of ['exactseek','nextools','startupbuffer','scoutforge']){
  assert.equal(site(id).success.test('Submission form'),false);
  assert.equal(site(id).success.test(''),false);
  assert.equal(site(id).success.test('Thank you for visiting'),false);
}
assert.equal(site('scoutforge').reviewBeforeSubmit,true);
assert.equal(site('startupbuffer').receiptUrl({pathname:'/promote/private-edit-key',href:'https://startupbuffer.com/promote/private-edit-key'}),'https://startupbuffer.com/site/submit');
assert.equal(site('startupbuffer').receiptUrl({pathname:'/site/submit',href:'https://startupbuffer.com/site/submit'}),'https://startupbuffer.com/site/submit');
let received=[],drafts=[],batch,mode='ready';
const basic=()=>'<form><label>Startup Name<input id="name" required></label><label>Website URL<input id="url" type="url" required></label><label>Business email<input type="email" name="email" required></label><button>Continue</button></form>';
const story='<label>Pitch<input id="pitch" required></label><label>Description<textarea id="description" required></textarea></label><input type="file" hidden><div id="uploads"></div><button>Continue</button>';
const details='<label>Country<select id="country"><option value="">Select country</option><option value="CN">China</option></select></label><label>Category<select id="primary_category" required><option value="">Select category</option><option value="ai">AI</option></select></label><label>Tags<input id="tags"></label><button id="submit_btn">Submit Now</button>';
const startup=()=>basic()+`<script>
let step=1,data={};const form=document.querySelector('form');form.onsubmit=async e=>{
 e.preventDefault();for(const f of form.querySelectorAll('input,textarea,select'))if(f.type!=='file')data[f.id||f.name]=f.value;
 if(step<3){await fetch('/draft',{method:'POST'});form.innerHTML=step++===1?${JSON.stringify(story)}:${JSON.stringify(details)};
 const file=form.querySelector('input[type=file]');if(file)file.onchange=()=>{data.imageType=file.files[0]?.type;${mode==='pending-upload'?'':"setTimeout(()=>document.querySelector('#uploads').innerHTML='<div class=\"dz-preview dz-complete\">image uploaded</div>',700);"}};return;}
 await fetch('/received',{method:'POST',body:JSON.stringify(data)});location.href='/promote/private-edit-key';};</script>`;
const asr='<button id="asr-cookie-accept">Accept</button><form><label>URL<input name="url" required type="url"></label><label>Email<input name="email" required type="email"></label><input type="submit" name="clear" value="Clear"><input type="submit" name="submiturl" value="Submit Website"><input type="submit" name="cancel" value="Cancel"></form><script>document.querySelector("#asr-cookie-accept").onclick=e=>e.target.remove();document.querySelector("form").onsubmit=async e=>{e.preventDefault();await fetch("/received",{method:"POST",body:JSON.stringify({...Object.fromEntries(new FormData(e.target)),button:e.submitter.name})});document.body.innerHTML="<h1>Added Web Site Confirmation</h1><p>Thank you for adding your Web site to the Active Search Results search engine.</p>"};</script>';
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'autosubmit-four-'));let context;
 try{
  fs.copyFileSync(path.join(root,'manifest.json'),path.join(dir,'manifest.json'));
  for(const f of ['src','icons'])fs.cpSync(path.join(root,f),path.join(dir,f),{recursive:true});
  const patched=source.replace("domain: 'activesearchresults.com'","domain: 'asr.test'").replace("url: 'https://www.activesearchresults.com/addwebsite.php'","url: 'https://asr.test/submit'")
   .replace("domain: 'startupbuffer.com'","domain: 'startupbuffer.test'").replace("url: 'https://startupbuffer.com/site/submit'","url: 'https://startupbuffer.test/submit'");
  fs.writeFileSync(path.join(dir,'src/sites.js'),patched);
  context=await chromium.launchPersistentContext('',{headless:true,channel:'chromium',args:[`--disable-extensions-except=${dir}`,`--load-extension=${dir}`]});
  await context.route('**/*',async route=>{
   const request=route.request(),u=new URL(request.url());if(u.protocol==='chrome-extension:')return route.continue();
   if(!['asr.test','startupbuffer.test'].includes(u.hostname))return route.abort();
   if(u.pathname==='/received')received.push({host:u.hostname,...JSON.parse(request.postData())});
   if(u.pathname==='/draft')drafts.push(await batch.evaluate(async()=>Object.keys((await Store.getProducts())[0].submissionRecords)));
   return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:u.pathname==='/submit'?(u.hostname==='asr.test'?asr:startup()):u.pathname.startsWith('/promote/')?'<h1>Your submission is in.</h1><p>This listing is still in review.</p><p>No promotion package is attached yet.</p><button>Buy Publish $19.95</button>':'ok'});
  });
  let [worker]=context.serviceWorkers();if(!worker)worker=await context.waitForEvent('serviceworker');
  batch=await context.newPage();await batch.goto(`chrome-extension://${worker.url().split('/')[2]}/src/batch.html`);
  const productId=await batch.evaluate(async()=>{
   const p=await Store.upsertProduct({name:'Video Tool',url:'https://example.com',email:'owner@example.com',country:' China ',tagline:'AI video text remover',description:'Removes burned-in subtitles and text from video using AI.',pricing:'Free Trial',tags:['AI Video','Video Editing'],hero:{data:'data:image/png;base64,AQID',name:'workspace.png'}});
   await Store.saveSettings({autoAgree:true,autoSubmit:true,googleAuto:false,lang:'en'});return p.id;
  });
  assert.equal(await batch.evaluate(async()=>(await Store.getProducts())[0].country),'China');
  assert.equal(await batch.evaluate(()=>Store.FIELDS.includes('country')),true);
  assert.equal(await batch.evaluate(()=>Store.normalize({name:'Other',url:'https://other.example'}).country),'');
  assert.equal(await batch.evaluate(()=>Store.submissionRecorded({submissionRecords:{'withaitools.com':{status:'listed'}}},'withaitools.com')),true);
  const wait=async(id,fragment)=>{for(let n=0;n<270;n++){const run=await batch.evaluate(async()=>(await chrome.storage.local.get('run')).run);if(fragment?run.info[id]?.msg.includes(fragment):run.status[id]==='done')return;await new Promise(r=>setTimeout(r,200));}throw Error('Timeout '+id+' '+JSON.stringify(await batch.evaluate(async()=>(await chrome.storage.local.get('run')).run)));};
  const run=async(id,fragment)=>{await batch.evaluate(()=>chrome.runtime.sendMessage({type:'stopRun'}));for(const p of context.pages())if(p!==batch)await p.close();await batch.evaluate(async()=>{const ps=await Store.getProducts();ps[0].submissions={};ps[0].submissionRecords={};await Store.saveProducts(ps);});received=[];drafts=[];await batch.evaluate(({id,productId})=>chrome.runtime.sendMessage({type:'startRun',productId,ids:[id]}),{id,productId});await wait(id,fragment);};
  await run('activesearchresults');assert.equal(received.length,1);assert.equal(received[0].button,'submiturl');assert.equal(received[0].email,'owner@example.com');
  await run('startupbuffer');assert.equal(received.length,1);assert.equal(received[0].country,'CN');assert.equal(received[0].primary_category,'ai');assert.equal(received[0].imageType,'image/png');assert.deepEqual(drafts,[[],[]],'Continue steps create no submission attempts');
  assert.equal(await batch.evaluate(async()=>(await Store.getProducts())[0].submissionRecords['startupbuffer.test'].url),'https://startupbuffer.com/site/submit');
  mode='pending-upload';await run('startupbuffer','Upload the required screenshot');assert.equal(received.length,0);assert.deepEqual(drafts,[[]]);
  // Exercise exact pricing and generated-claim cleanup hooks with real DOM, no external traffic.
  const p=await context.newPage();await p.goto('https://asr.test/hooks');await p.addScriptTag({content:source});await p.addScriptTag({path:path.join(root,'src/engine.js')});
  await p.setContent('<form><input name="targetCustomers.0.demographic" value="Invented audience"><input name="alternatives.0.name" value="Invented competitor"><textarea name="alternatives.0.description">Invented comparison</textarea><input id="terms" type="checkbox"><input id="mailSubscription" type="checkbox"></form>');
  const cleaned=await p.evaluate(()=>{SITES.find(s=>s.id==='scoutforge').afterFill({autoAgree:false},document.querySelector('form'));return [...document.querySelectorAll('input,textarea')].map(e=>e.type==='checkbox'?e.checked:e.value);});assert.deepEqual(cleaned,['','','',false,false]);
  await p.setContent('<form><input type="checkbox" name="pricing_options[]" value="Free" checked><input type="checkbox" name="pricing_options[]" value="Free Trial"><input type="checkbox" name="pricing_options[]" value="Paid" checked></form>');
  const pricing=await p.evaluate(()=>{const s=SITES.find(s=>s.id==='aigist'),ctx={product:{pricing:'Free Trial'}};s.afterFill(ctx,document.querySelector('form'));return [...document.querySelectorAll('input:checked')].map(e=>e.value);});assert.deepEqual(pricing,['Free Trial']);
  await p.setContent('<h2>Already listed</h2><a href="https://example.com">Website</a>');
  const duplicate=await p.evaluate(()=>{let reason='';const step=SITES.find(s=>s.id==='withaitools').steps.find(s=>s.id==='already-listed');if(step.match())step.run({fail:s=>reason=s});return reason;});assert.match(duplicate,/do not submit again or rename/);
  await p.setContent('<h1>RTFV</h1><a href="https://unrelated.example">Website</a>');
  const unrelated=await p.evaluate(()=>{let completed=false;SITES.find(s=>s.id==='withaitools').steps.find(s=>s.id==='public-listing').run({product:{url:'https://example.com'},finish:()=>completed=true,status:()=>{}});return completed;});assert.equal(unrelated,false,'public listing needs an actual product website match');
  await p.setContent('<h1>RTFV</h1><a href="https://www.example.com/?ref=directory">Website</a>');
  const existing=await p.evaluate(()=>{let reason='',completed=false;SITES.find(s=>s.id==='withaitools').steps.find(s=>s.id==='public-listing').run({product:{url:'https://example.com'},finish:()=>completed=true,fail:s=>reason=s});return {reason,completed};});assert.equal(existing.completed,false);assert.match(existing.reason,/do not count this as a new submission/);
  console.log('OK: ASR exact button/no mail, per-product country isolation, Startup Buffer draft boundary/upload completion/strict receipt/private-key redaction, Scout generated claims cleanup and exact Free Trial');
 }finally{if(context)await context.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
