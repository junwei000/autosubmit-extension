// Isolated browser fixtures for the ten new flows and name-conflict recovery.
// No real directory, account or inbox is accessed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const ids = ['theainavigator','sonicrun','aisiteleri','ainewshub','iforai','aitocn','waimao21','aier','tooltrove','saashub'];
const source = fs.readFileSync(path.join(root,'src/sites.js'),'utf8');
const sites = vm.runInNewContext(source+';SITES');
assert.equal(new Set(sites.map(s=>s.id)).size,sites.length,'catalog IDs must stay unique as sites are added');
const received = new Map(), visited = [], names = [];
let saasMode = 'name-conflict';
const description = 'A video editor that removes burned-in subtitles, captions and watermarks from video using AI. Upload a clip, choose the text regions and download the result with the original frame intact.';
const longDescription = [description,description,description].join('\n\n');
const input = (id,name=id,type='text',extra='')=>`<input id="${id}" name="${name}" type="${type}" ${extra}>`;
const text = (id,name=id,extra='')=>`<textarea id="${id}" name="${name}" ${extra}></textarea>`;
const capture = message=>`<script>document.addEventListener('submit',async e=>{e.preventDefault();await fetch('/received',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});document.body.innerHTML=${JSON.stringify('<h1>'+message+'</h1>')};});</script>`;
const navFields = `${input('','post_title')}${input('','link')}${input('','sescribe','text','maxlength="80"')}${text('','post_content')}${text('','tags')}${input('','user_name')}${input('','contact_details')}${input('','wechat_id')}`;
const fixtures = {
  theainavigator: `<div class="s-email-form">${input('','','text','placeholder="name of the AI tool"')}${input('','','text','placeholder="start with https://"')}<textarea placeholder="In simple and clear wording"></textarea>${input('','','text','placeholder="First Last"')}${input('','owner#email')}${input('gdpr-1','','checkbox')}<label for="gdpr-1">I agree to the Privacy Policy</label><button id="submit">Submit</button></div><script>document.querySelector('#submit').onclick=async()=>{await fetch('/received',{method:'POST',body:JSON.stringify({name:document.querySelector('[placeholder="name of the AI tool"]').value,agreed:document.querySelector('#gdpr-1').checked})});document.body.innerHTML='<h1>Thanks for your submission to The AI Navigator!</h1>'};</script>`,
  aisiteleri: `<form id="wpforms-form-1390">${input('wpforms-1390-field_0','first','text','required')}${input('wpforms-1390-field_0-last','last','text','required')}${input('wpforms-1390-field_1','email','email','required')}${input('wpforms-1390-field_3','url')}${text('wpforms-1390-field_4','details')}<a href="/wrong-email">Use suggested different email</a><button>Gönder</button></form>${capture('Bizimle iletişime geçtiğiniz için teşekkür ederiz! Kısa zaman içerisinde sizinle iletişime geçeceğiz.')}`,
  ainewshub: `<button id="back" onclick="this.remove()">Back to site</button><form id="comp-lr80oeg6">${input('input_comp-lr80oegl','name')}${input('input_comp-lr80oegu','url')}${input('input_comp-m7iyrhh2','category')}${input('input_comp-lr80oeh4','pricing')}${input('input_comp-lr80td2t','email','email','required')}${text('textarea_comp-lr80oeh7','description')}${input('input_comp-m7kiuhkp','source','text','required')}<button>Submit</button></form><form><input type="email" name="newsletter"><button>Subscribe</button></form>${capture('Thank you for your submission!')}`,
  iforai: `<form>${navFields}<select name="category"><option value="0">选择分类</option><option value="3598">视频剪辑</option></select>${input('captcha','image_captcha')}<button>提交审核</button></form>${capture('提交成功，等待审核')}`,
  aitocn: `<form>${navFields}<select name="category"><option value="0">选择分类</option><option value="21">AI视频工具</option></select><button>提交审核</button></form><script>document.addEventListener('submit',e=>{e.preventDefault();document.body.insertAdjacentHTML('beforeend','<div id="slider_captcha_body">Manual local check<button id="localComplete">Complete local check</button></div>');document.querySelector('#localComplete').onclick=async()=>{await fetch('/received',{method:'POST',body:JSON.stringify({completedByTestUser:true})});document.body.innerHTML='<h1>操作成功，等待审核</h1>'};});</script>`,
  waimao21: `<form>${input('','tougao_title')}${input('','tougao_sites_link')}${input('','tougao_sites_sescribe','text','maxlength="50"')}${input('','tougao_sites_keywords')}${text('','tougao_content')}<select id="tougaocategorg_sites" name="tougao_cat"><option value="0">选择分类</option><option value="207">AI视频工具</option></select>${input('input_veri','captcha_canvas')}<button>提交</button></form><form>${input('','resource')}<button>提交</button></form>${capture('提交成功，等待审核')}`,
  aier: `<form>${input('','name')}${input('','website_url')}${text('','short_description')}${text('','what_is_description')}${input('','pricing_details')}${input('','submitter_name')}${input('','submitter_email','email')}
    <div><label>Pricing Type *</label><button type="button" role="combobox">Free</button></div><div><label>Categories *</label><button type="button" role="combobox">Select categories</button></div><div><label>Target Professions *</label><button type="button" role="combobox">Select professions</button></div><button>Submit AI Tool for Review</button></form><script>document.querySelectorAll('[role=combobox]').forEach((b,i)=>b.onclick=()=>{document.querySelector('#options')?.remove();const d=document.createElement('div');d.id='options';for(const v of i===0?['Free','Freemium','Paid','Contact for Pricing']:i===1?['Video Editing','Audio']:['Video Editor / Motion Graphics Designer','Developer']){const o=document.createElement('button');o.type='button';o.role='option';o.textContent=v;o.onclick=()=>{b.textContent=v;d.remove()};d.append(o)}document.body.append(d)});</script>${capture('Thank you for your submission!')}`,
  tooltrove: `<form id="trove"><section id="one">${input('name')}${input('websiteUrl')}${input('email','email','email')}<select id="categorySlug"><option>Choose a category</option><option>Video</option></select></section>
    <section id="two" hidden>${input('tagline')}${text('description')}${input('audience')}${text('problem')}<select id="pricing"><option>Choose pricing</option><option>Free</option><option>Freemium</option><option>Paid</option></select>${input('priceNote')}${text('features')}<label>${input('web','platforms','checkbox','value="Web"')}Web</label></section>
    <section id="three" hidden>${input('logo','logo','file')}${input('screenshots','screenshots','file','multiple')}</section><input name="website2" hidden><button id="next">Next</button></form><script>let step=1;document.querySelector('#trove').onsubmit=async e=>{e.preventDefault();if(step<3){document.querySelector('section:not([hidden])').hidden=true;step++;document.querySelector(step===2?'#two':'#three').hidden=false;if(step===3)document.querySelector('#next').textContent='Submit for review';return;}await fetch('/received',{method:'POST',body:JSON.stringify({submitted:true})});document.body.innerHTML='<h1>Thanks for submitting!</h1>'};</script>`,
};

function saasForm(name='Test Video Tool',error='') {
  const selected = error ? ['Video Editors','Video Watermark Remover','Watermark Removal'] : [];
  const picker=(n,labels)=>`<div class="react-select__value-container">${labels.map(l=>`<div class="react-select__multi-value__label">${l}</div>`).join('')}${input('react-select-'+n+'-input','','text','role="combobox"')}</div>`;
  return `${error?'<ul><li>'+error+'</li></ul>':''}<form action="/services" method="post">${input('service_name','name','text','value="'+name+'"')}${text('service_tagline','tagline')}${input('service_contact_email','email','email','required')}${picker(2,selected)}${picker(3,error?['HitPaw Watermark Remover']:[])}<button name="priority_approval">$75 / One Off</button><button name="priority_extra">$99 / One Off</button><button>Free</button></form><script>for(const n of [2,3]){const e=document.querySelector('#react-select-'+n+'-input');e.oninput=()=>{document.querySelector('#opts')?.remove();const d=document.createElement('div');d.id='opts';const b=document.createElement('div');b.id='react-select-'+n+'-option-0';b.textContent=e.value;b.onclick=()=>{const chip=document.createElement('div');chip.className='react-select__multi-value__label';chip.textContent=b.textContent;e.closest('.react-select__value-container').prepend(chip);e.value='';d.remove()};d.append(b);document.body.append(d)}};</script>`;
}

(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'autosubmit-ten-'));let ctx;
  try {
    fs.copyFileSync(path.join(root,'manifest.json'),path.join(dir,'manifest.json'));
    fs.cpSync(path.join(root,'src'),path.join(dir,'src'),{recursive:true});fs.cpSync(path.join(root,'icons'),path.join(dir,'icons'),{recursive:true});
    let patched=source;
    for(const id of ids){const site=sites.find(s=>s.id===id);assert.ok(site);const domain=site.domain.replaceAll('.','\\.');const pathname=new URL(site.url).pathname;
      patched=patched.replace(new RegExp(`domain:\\s*'${domain}'`),`domain:'${id}.test'`).replace(new RegExp(`url:\\s*'https://(?:www\\.)?${domain}[^']*'`),`url:'https://${id}.test${pathname}'`);
    }
    patched=patched.replace(String.raw`sonicrun\.com\/cgi-bin`,String.raw`sonicrun\.test\/cgi-bin`);
    assert.ok(vm.runInNewContext(patched+';siteById("sonicrun").emailLinkPattern').test('https://sonicrun.test/cgi-bin/v.cgi?c=local-test'));
    fs.writeFileSync(path.join(dir,'src/sites.js'),patched);
    ctx=await chromium.launchPersistentContext('',{headless:true,channel:'chromium',args:[`--disable-extensions-except=${dir}`,`--load-extension=${dir}`]});
    await ctx.route('**/*',async route=>{
      const req=route.request(),u=new URL(req.url()); if(u.protocol==='chrome-extension:')return route.continue();
      const id=u.hostname.replace('.test','');visited.push(u.hostname+u.pathname);
      const html=body=>route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:'<!doctype html><html><head><meta charset="utf-8"></head><body>'+body+'</body></html>'});
      if(u.hostname==='mail.google.com')return html(`<table><tr class="zA"><td class="xW"><span title="${new Date().toUTCString()}">today</span></td><td>sonicrun.test Verification Required</td><td>Forwarded to owner@example.com</td></tr></table><div role="main"><div class="a3s"><a href="https://sonicrun.test/cgi-bin/v.cgi?e=owner%40example.com&amp;c=local-test">https://sonicrun.test/cgi-bin/v.cgi</a><a href="https://sonicrun.test/cgi-bin/un.cgi?c=local-test">Unsubscribe</a></div></div>`);
      if(!ids.includes(id)){return route.abort();}
      if(u.pathname==='/received'){received.set(id,JSON.parse(req.postData()||'{}'));return html('ok');}
      if(id==='sonicrun') {
        if(u.pathname==='/cgi-bin/add.cgi')return html('<h1>Verification Required</h1>Please verify your email address. A verification message has been sent.');
        if(u.pathname==='/cgi-bin/v.cgi'&&req.method()==='POST'){received.set(id,Object.fromEntries(new URLSearchParams(req.postData())));return html('<h1>Submission Received</h1>Your free listing will be added after 30 days.');}
        if(u.pathname==='/cgi-bin/v.cgi')return html('<form action="/cgi-bin/v.cgi" method="post"><input name="verify" type="hidden" value="1"><input name="terms" type="checkbox"><label>I agree to terms</label><button>Add Your Site</button></form><form action="/paid"><input name="terms" type="checkbox"><button>Buy Now</button></form><form action="/upgrade"><input name="terms" type="checkbox"><button>Upgrade Your Submission</button></form>');
        return html('<form action="/cgi-bin/add.cgi" method="post"><input name="url"><input name="email"><input name="name"><label><input name="terms" type="checkbox">I agree to terms</label><button>Submit</button></form>');
      }
      if(id==='saashub') {
        if(u.pathname==='/services/submit')return html('<form action="/services/new"><input name="url"><button>Continue</button></form>');
        if(u.pathname==='/services'&&req.method()==='POST'){
          const data=Object.fromEntries(new URLSearchParams(req.postData()));names.push(data.name);
          if(data.priority_approval!==undefined||data.priority_extra!==undefined)throw new Error('Paid option submitted');
          if(saasMode==='url-duplicate')return html(saasForm(data.name,'URL - has already been taken'));
          if(saasMode==='both-conflicts')return html(saasForm(data.name,'Name - has already been taken<br>URL - has already been taken'));
          if(data.name==='Test Video Tool'||saasMode==='all-names-taken')return html(saasForm(data.name,'Name - has already been taken'));
          received.set(id,data);return route.fulfill({status:302,headers:{location:'https://saashub.test/related-alternatives/rtfv?flow=submit'},body:''});
        }
        if(u.pathname.startsWith('/related-alternatives/'))return html('<h1>Select Competitors</h1><a href="/rtfv/added">Product submission</a><button>Proceed with selection</button>');
        if(u.pathname==='/rtfv/added')return html('<h1>RTFV was submitted successfully</h1>It will appear online once it is approved.');
        return html(saasForm());
      }
      return html(fixtures[id]);
    });
    let [worker]=ctx.serviceWorkers();if(!worker)worker=await ctx.waitForEvent('serviceworker');
    const batch=await ctx.newPage();await batch.goto(`chrome-extension://${worker.url().split('/')[2]}/src/batch.html`);
    const productId=await batch.evaluate(async ({description,longDescription})=>{
      const p=await Store.upsertProduct({name:'Test Video Tool',alternateNames:'Test Video Tool\n RTFV \nrtfv\n',url:'https://example.com',email:'owner@example.com',tagline:'Remove burned-in text from videos with AI.',description,longDescription,features:'AI text detection\nBox selection\nVideo text removal',tags:['AI Video','Video Editing'],pricing:'Free Trial'});
      await Store.saveSubmitter({firstName:'Ada',lastName:'Lovelace',email:'owner@example.com'});await Store.saveSettings({lang:'en',autoAgree:true,autoSubmit:true,googleAuto:false});return p.id;
    },{description,longDescription});
    assert.deepEqual(await batch.evaluate(async()=> (await Store.getProducts())[0].alternateNames),['RTFV']);
    const wait=async(id,message)=>{
      let s;for(let n=0;n<180;n++){s=await batch.evaluate(async()=> (await chrome.storage.local.get('run')).run);if(message?s.info[id]?.msg.includes(message):s.status[id]==='done')return s;await new Promise(r=>setTimeout(r,200));}
      throw new Error('Timeout '+id+': '+JSON.stringify(s?.info[id]));
    };
    const run=async(id,message)=>{await batch.evaluate(()=>chrome.runtime.sendMessage({type:'stopRun'}));for(const p of ctx.pages())if(p!==batch)await p.close();const result=await batch.evaluate(({id,productId})=>chrome.runtime.sendMessage({type:'startRun',productId,ids:[id]}),{id,productId});assert.ok(!result.error,result.error);await wait(id,message);return ctx.pages().find(p=>p.url().startsWith('https://'+id+'.test'));};
    await run('theainavigator');assert.equal(received.get('theainavigator').agreed,true);
    await run('sonicrun');assert.equal(received.get('sonicrun').terms,'on');assert.ok(!visited.some(v=>v==='sonicrun.test/paid'||v==='sonicrun.test/upgrade'));assert.equal(await batch.evaluate(async()=> (await Store.getProducts())[0].submissionRecords['sonicrun.test'].submittedName),'Test Video Tool','a contact name must not be recorded as the product submission name');
    await run('aisiteleri');assert.equal(received.get('aisiteleri').first,'Ada');assert.equal(received.get('aisiteleri').email,'owner@example.com');assert.equal(received.get('aisiteleri').details,'Test Video Tool\n\n'+description);assert.ok(!visited.includes('aisiteleri.test/wrong-email'));
    await run('ainewshub');assert.equal(received.get('ainewshub').pricing,'Free Trial');assert.equal(received.get('ainewshub').source,'Directory submission list.');assert.equal(received.get('ainewshub').newsletter,undefined);
    let p=await run('iforai','Captcha detected');assert.ok(!received.has('iforai'));assert.equal(await p.locator('[name=category]').inputValue(),'3598');assert.equal(await p.locator('[name=wechat_id]').inputValue(),'');await p.locator('[name=image_captcha]').fill('local-user-check');await wait('iforai');
    p=await run('aitocn','Review it');assert.ok(!received.has('aitocn'));await p.getByRole('button',{name:'提交审核'}).click();await wait('aitocn','Captcha detected');assert.ok(!received.has('aitocn'));await p.locator('#localComplete').click();await wait('aitocn');
    p=await run('waimao21','Review it');assert.ok(!received.has('waimao21'));assert.equal(await p.locator('[name=tougao_cat]').inputValue(),'207');assert.ok((await p.locator('[name=tougao_sites_sescribe]').inputValue()).length<=50);await p.locator('#input_veri').fill('local-user-check');await p.getByRole('button',{name:'提交',exact:true}).first().click();await wait('waimao21');assert.equal(received.get('waimao21').resource,undefined);
    await run('aier','No exact product pricing option');assert.ok(!received.has('aier'));
    p=await run('tooltrove','No exact product pricing option');assert.ok(!received.has('tooltrove'));assert.equal(await batch.evaluate(async()=> (await Store.getProducts())[0].submissionRecords['tooltrove.test']),undefined,'Next must not create a submission attempt');
    await run('saashub');assert.deepEqual(names,['Test Video Tool','RTFV']);const record=await batch.evaluate(async()=> (await Store.getProducts())[0].submissionRecords['saashub.test']);assert.equal(record.submittedName,'RTFV');assert.deepEqual(record.attemptedNames,['Test Video Tool','RTFV']);assert.equal(await batch.evaluate(async()=> (await Store.getProducts())[0].name),'Test Video Tool');
    const csvDownload=batch.waitForEvent('download');await batch.locator('#csv').click();const csv=fs.readFileSync(await (await csvDownload).path(),'utf8');assert.match(csv,/"Submitted name","Attempted names"/);assert.match(csv,/"RTFV","Test Video Tool → RTFV"/);
    saasMode='url-duplicate';names.length=0;await run('saashub','Still on the form');assert.deepEqual(names,['Test Video Tool'],'a URL conflict must not rename or resubmit');
    saasMode='both-conflicts';names.length=0;await run('saashub','Still on the form');assert.deepEqual(names,['Test Video Tool'],'a duplicate URL takes precedence over a simultaneous name conflict');
    saasMode='all-names-taken';names.length=0;await run('saashub','no unused backup');assert.deepEqual(names,['Test Video Tool','RTFV'],'each configured name is attempted once');
    const manage=await ctx.newPage();await manage.goto(`chrome-extension://${worker.url().split('/')[2]}/src/manage.html`);await manage.locator('[data-act=edit]').first().click();assert.equal(await manage.locator('[name=alternateNames]').inputValue(),'RTFV');await manage.locator('[name=alternateNames]').fill('RTFV\nVideo Text Tool');await manage.locator('#form button[type=submit]').click();await manage.waitForFunction(()=>!document.querySelector('#dialog').open);assert.deepEqual(await manage.evaluate(async()=> (await Store.getProducts())[0].alternateNames),['RTFV','Video Text Tool']);
    const jsonDownload=manage.waitForEvent('download');await manage.locator('#export').click();const exported=JSON.parse(fs.readFileSync(await (await jsonDownload).path(),'utf8'));assert.equal(exported.products[0].name,'Test Video Tool');assert.deepEqual(exported.products[0].alternateNames,['RTFV','Video Text Tool']);
    console.log('OK: ten page flows, explicit receipts, CAPTCHA handoffs, draft steps, pricing guards, email confirmation, backup-name retries and CSV/JSON exports');
  } finally {if(ctx)await ctx.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
