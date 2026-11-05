// Saved credentials: isolated local pages, all external requests intercepted.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'src/sites.js'),'utf8');
let mode='both',auth=[],signup=0,google=0;
const rawPassword='  local-test-password  ';
function loginFixture(){
 const script=`let step=1,email='';const f=document.querySelector('form');
 f.onsubmit=async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(f));
 if(${JSON.stringify(mode)}==='two-step'&&step===1){email=data.email;step=2;f.innerHTML='<h2>Enter your password</h2><input type="password" name="password"><button>Sign in</button><button type="button" class="google">Continue with Google</button>';wire();return;}
 await fetch('/auth',{method:'POST',body:JSON.stringify({email:data.email||email,password:data.password})});
 if(${JSON.stringify(mode)}==='wrong'){document.querySelector('[role=alert]').textContent='Incorrect password';return;}
 document.body.innerHTML='<h1>Submit your app</h1><form><label>URL<input id="url" name="url"></label><button>Next</button></form>';};
 function wire(){document.querySelectorAll('.google').forEach(b=>b.onclick=()=>fetch('/google',{method:'POST'}));document.querySelectorAll('.signup').forEach(b=>b.onclick=()=>fetch('/signup',{method:'POST'}));}wire();`;
 new vm.Script(script);
 return `<h1>Sign in</h1><form><label>Email<input type="email" name="email"></label>${mode==='two-step'?'':'<label>Password<input type="password" name="password"></label>'}<button>Continue</button><button class="google" type="button">Continue with Google</button><button class="signup" type="button">Create account</button><p role="alert"></p></form><script>${script}</script>`;
}
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'autosubmit-login-'));let context;
 try{
  fs.copyFileSync(path.join(root,'manifest.json'),path.join(dir,'manifest.json'));for(const f of ['src','icons'])fs.cpSync(path.join(root,f),path.join(dir,f),{recursive:true});
  const patched=source.replace("domain: 'scoutforge.net'","domain: 'login.test'").replace("url: 'https://scoutforge.net/app-register'","url: 'https://login.test/sign-in'");fs.writeFileSync(path.join(dir,'src/sites.js'),patched);
  context=await chromium.launchPersistentContext('',{headless:true,channel:'chromium',args:[`--disable-extensions-except=${dir}`,`--load-extension=${dir}`]});
  await context.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());if(u.protocol==='chrome-extension:')return route.continue();if(u.hostname!=='login.test')return route.abort();if(u.pathname==='/auth')auth.push(JSON.parse(req.postData()));if(u.pathname==='/signup')signup++;if(u.pathname==='/google')google++;return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:u.pathname==='/sign-in'?loginFixture():'ok'});});
  let [worker]=context.serviceWorkers();if(!worker)worker=await context.waitForEvent('serviceworker');const batch=await context.newPage();await batch.goto(`chrome-extension://${worker.url().split('/')[2]}/src/batch.html`);
  const productId=await batch.evaluate(async()=>{const p=await Store.upsertProduct({name:'Video Tool',url:'https://example.com',email:'public@example.com',description:'An online video tool that removes burned-in subtitles and text with AI while preserving the original frame. Upload a clip and download the result.',pricing:'Free Trial'});await Store.saveSubmitter({firstName:'Ada',lastName:'Lovelace',email:'account@example.com'});await Store.saveSettings({autoAgree:true,autoSubmit:true,googleAuto:true,lang:'en'});return p.id;});await batch.reload();
  await batch.waitForFunction(()=>document.querySelector('#email').value==='account@example.com');await batch.locator('#password').fill(rawPassword);for(let n=0;n<50;n++){if(await batch.evaluate(async()=>(await Store.getSubmitter()).password)===rawPassword)break;await new Promise(r=>setTimeout(r,100));}
  assert.equal(await batch.evaluate(async()=>(await Store.getSubmitter()).password),rawPassword,'configured password must retain leading/trailing spaces');
  assert.equal(await batch.evaluate(()=>Store.submissionRecorded({submissionRecords:{'viesearch.com':{status:'dedup-review-requested',hold:true}}},'viesearch.com')),true);
  assert.equal(await batch.evaluate(()=>Store.submissionRecorded({submissionRecords:{'toolscout.ai':{status:'user-skipped',hold:true}}},'toolscout.ai')),true);
  await batch.evaluate(async()=>{const ps=await Store.getProducts();ps[0].submissionRecords={'viesearch.com':{status:'dedup-review-requested',hold:true},'toolscout.ai':{status:'user-skipped',hold:true}};await Store.saveProducts(ps);});await batch.reload();await batch.waitForFunction(()=>document.querySelector('tr[data-id=viesearch] .sub-at')?.textContent.includes('On hold'));await batch.locator('#all').uncheck();await batch.locator('#all').check();assert.equal(await batch.locator('tr[data-id=viesearch] input').isChecked(),false);assert.equal(await batch.locator('tr[data-id=toolscout] input').isChecked(),false);assert.match(await batch.locator('tr[data-id=viesearch]').innerText(),/On hold/);
  const wait=async fragment=>{for(let n=0;n<180;n++){const r=await batch.evaluate(async()=>(await chrome.storage.local.get('run')).run);if(r.info.scoutforge?.msg.includes(fragment))return;await new Promise(r=>setTimeout(r,200));}throw Error('Login flow timed out: '+JSON.stringify(await batch.evaluate(async()=>(await chrome.storage.local.get('run')).run)));};
  const run=async fragment=>{await batch.evaluate(()=>chrome.runtime.sendMessage({type:'stopRun'}));for(const p of context.pages())if(p!==batch)await p.close();auth=[];signup=google=0;await batch.evaluate(productId=>chrome.runtime.sendMessage({type:'startRun',productId,ids:['scoutforge']}),productId);await wait(fragment);};
  await run('Review it');assert.equal(auth.length,1);assert.equal(auth[0].email,'account@example.com');assert.equal(auth[0].password,rawPassword);assert.equal(google,0,'saved email/password wins over Google');assert.equal(signup,0,'login page Create account button is not a registration form');
  mode='two-step';await run('Review it');assert.equal(auth.length,1);assert.equal(auth[0].email,'account@example.com');assert.equal(auth[0].password,rawPassword);assert.equal(google,0,'password-only second step still uses saved password');
  mode='wrong';await run('Sign-in failed');assert.equal(auth.length,1);assert.equal(signup,0,'wrong password must not create another account');assert.equal(google,0);
  await batch.evaluate(async()=>{const s=await Store.getSubmitter();s.password='';await Store.saveSubmitter(s);});mode='both';await run('Please sign in');assert.equal(auth.length,0,'missing configured password waits for user');assert.equal(google,0);
  console.log('OK: exact configured password, automatic login including two-stage/password-only forms, email preference, wrong-password no signup, missing-password handoff, held-site bulk-selection protection');
 }finally{if(context)await context.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
