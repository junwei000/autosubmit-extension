// Free directories with no required reciprocal link or badge (reviewed 2026-11-03). The batch page, the background queue and the page runner share this list.
// Each entry only describes what differs from the generic flow (open url → fill the form → submit → detect success):
//   domain      main domain; submissions are recorded under it and the runner only acts on it (or on extraHosts)
//   url         submission page (sites that need an account bounce to their login page first)
//   login       false: no account / 'email': email + password or magic link / 'oauth': Google, GitHub… (you click it)
//   form        selector of the submission form when the page also has newsletter or search forms
//   fill        extra fields: { selector: value key } – keys are listed in runner.js valueOf()
//   skip        fields never to fill (e.g. honeypots that mark the submission as spam)
//   check       checkboxes / radios to tick
//   category    { select, count }: category picker that adds one chip per choice; options ranked against the product tags
//   free        text of the free plan option to pick before submitting (RegExp)
//   start       text of the button that opens the form (RegExp), e.g. "Add Tool"
//   submit      submit button: selector, or its text as a RegExp (found automatically when omitted)
//   findSubmit  DOM hook for wizards with an always-visible Create button; prefer the active Next
//   reviewBeforeSubmit  fill the form, then leave the final submission to the user
//   loginPrompt  visible sign-in notice on a page that also renders the submission form
//   validate    extra validation for widgets without native required/minlength attributes
//   humanFields  visible inputs the user must complete; never answered by the runner
//   productPricing  selectors whose Paid/Free values describe the product, not a listing fee
//   success     require an explicit matching receipt; navigation/form disappearance alone is not success
//   protocol    recorded form declarations, queue and verification level; never used to send HTTP requests
//   confirmEmail  the site emails a confirmation link after the form: it is opened from Gmail before the site counts as done
//   steps       site-specific steps, matched before the generic ones: { id, label, match(), run(ctx) }
const CONFIG = {
  maxReviewDays: 100, // skip directories whose published free queue can exceed this limit
  // Only use address details explicitly supplied by the submitter. Never ship example business details.
  address: {
    street: '', city: '', state: '', zip: '', country: '', phone: '',
  },
  defaultSettings: {
    autoSubmit: true, // click Submit automatically (waits for you when a captcha shows up)
    autoAgree: true, // tick "I agree to the terms" checkboxes
  },
};

const SITES = [
  {
    id: 'forwardfuture',
    name: 'Forward Future',
    domain: 'forwardfuture.com',
    sourceDomains: ['forwardfuture.ai'],
    url: 'https://forwardfuture.com/tools/submit',
    login: false,
    form: 'form:has(#websiteUrl):has(#tags)',
    fill: { '#name': 'name', '#websiteUrl': 'url', '#description': 'description', '#pricing': 'pricing' },
    skip: ['#features', '#useCases', '#pricing', '#tags'],
    productPricing: ['#pricing'],
    submit: /^Submit for review$/i,
    reviewBeforeSubmit: true,
    async afterFill(ctx, root) {
      ctx.setField(root.querySelector('#features'), ctx.product.features);
      ctx.setField(root.querySelector('#useCases'), ctx.product.useCases);
      const productTags = ctx.product.tags || [];
      if (productTags.some(tag => /\bvideo\b|subtitle/i.test(tag))) {
        const industry = root.querySelector('#industry');
        const profession = root.querySelector('#profession');
        if (!industry?.value) ctx.setField(industry, 'Content Creation & Media');
        if (!profession?.value) ctx.setField(profession, 'Writers & Content Creators');
      }
      const tags = root.querySelector('#tags');
      if (!tags || root.querySelector('button[aria-label^="Remove tag "]')) return;
      for (const tag of productTags.slice(0, 5)) {
        const label = /^subtitles$/i.test(tag) ? 'video subtitles' : tag;
        ctx.setField(tags, label);
        await ctx.sleep(250);
        const option = [...root.querySelectorAll('[role="option"]')].find(item =>
          ctx.shown(item) && ctx.textOf(item).replace(/\s*\d+\s+tools?$/i, '').trim().toLowerCase() === label.toLowerCase());
        if (option) option.click();
      }
      if (tags.value) self.AutoSubmitEngine.setNativeValue(tags, '');
      tags.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      tags.blur();
    },
    validate(ctx, root) {
      const errors = [];
      if (!root.querySelector('button[aria-label^="Remove tag "]')) errors.push('Select at least one accurate directory tag');
      const pricing = root.querySelector('#pricing');
      if (pricing?.selectedOptions[0]?.text.trim() !== ctx.product.pricing) errors.push('Choose the actual product pricing model');
      return errors;
    },
    success: /^(?:Tool submitted\. We['’]ll review it shortly\.|Your submission is now under review\.)$/i,
    protocol: {
      transport: 'page-js', method: null, action: null, queueDays: null,
      terms: 'none-observed', verified: 'live-receipt', checkedAt: '2026-11-05',
      freeStatus: 'Free public form, no account or reciprocal link requirement observed. Editorial review duration unpublished.',
    },
    note: {
      en: 'Free public form for tool details, pricing, audience and directory tags. Review the prefilled audience and tags, then click Submit for review. The live form returned an editorial review receipt.',
      zh: '免费公开表单，填写产品资料、实际定价、受众和标签。请检查自动填写的受众与标签，再点击提交审核。实测已取得编辑审核回执。',
    },
  },
  {
    id:'aivalley',name:'AI Valley',domain:'aivalley.ai',url:'https://aivalley.ai/submit-tool/',login:false,
    form:'form.wpcf7-form:has([name="ToolURL"])',
    fill:{'[name="your-name"]':'fullName','[name="your-email"]':'email','[name="ToolName"]':'name','[name="ToolURL"]':'url'},
    // Both textareas have the same name. Map their visible labels, never fill both with the tagline.
    skip:['textarea[name="your-message"]'],
    afterFill(ctx,root){
      for(const field of root.querySelectorAll('textarea[name="your-message"]')){
        const label=field.closest('label')?.textContent.replace(/\s+/g,' ').trim();
        if(label==='Tool Description (optional)')ctx.setField(field,ctx.valueOf('description'));
        else if(label==='Tool Short Description (optional)')ctx.setField(field,ctx.valueOf('tagline'));
      }
    },
    validate(ctx,root){
      const errors=['your-name','your-email','ToolName','ToolURL'].filter(name=>!root.querySelector('[name="'+name+'"]')?.value.trim()).map(name=>'Required: '+name);
      const areas=[...root.querySelectorAll('textarea[name="your-message"]')];
      if(areas.length!==2||!areas.some(el=>el.closest('label')?.textContent.replace(/\s+/g,' ').trim()==='Tool Description (optional)')||!areas.some(el=>el.closest('label')?.textContent.replace(/\s+/g,' ').trim()==='Tool Short Description (optional)'))errors.push('Review duplicate description fields: visible labels have changed');
      return errors;
    },
    submit:'input[type=submit]',reviewBeforeSubmit:true,
    steps:[{id:'mail-send-failed',label:'sForm',match:()=>!!document.querySelector('form.wpcf7-form[data-status="failed"]'),run(ctx){ctx.fail('AI Valley returned a message sending error; no successful submission receipt. Stop without automatically retrying.');}}],
    success:/^Thank you for your message\. It has been sent\.$/i,
    protocol:{transport:'page-js-contact-form7',declaredMethod:'POST',action:'/submit-tool/#wpcf7-f2086-p2088-o1',method:null,actualNetworkProtocol:'not-captured',queueDays:null,terms:'none-observed',verified:'live-form-send-error',checkedAt:'2026-11-05',freeStatus:'Public form has no payment or required backlink controls; one live send returned explicit error. Final receipt and successful listing conditions not verified.'},
    note:{en:'Public Contact Form7: real name, email, tool name/URL; optional long/short description share one field name and are mapped by label. Live send returned an explicit error; no receipt, queue unknown. Fill and pause pending site repair; do not retry automatically.',zh:'公开Contact Form7：真实姓名/邮箱/工具名称网址；长短描述同名，按可见标签分别填。真实发送返回错误，无回执，排期未知。暂只填表检查，等待站点修复，不自动重试。'},
  },
  {
    id:'aitoolsnetwork',name:'AI Tools Network',domain:'aitoolsnetwork.com',url:'https://aitoolsnetwork.com/join/',login:false,
    form:'form.wpcf7-form:has([name="cf-website"])',
    fill:{'[name="cf-email"]':'email','[name="cf-website"]':'url','[name="cf-name"]':'fullName'},
    skip:['input[name="kc_honeypot"]','input[name="kc_captcha"]'],
    submit:'input#cf-submit',reviewBeforeSubmit:true,
    afterFill(ctx,root){
      const select=root.querySelector('#cf-subject');
      if(select&&[...select.options].some(o=>o.text.trim()==='Get into the waiting list'))ctx.setField(select,'Get into the waiting list');
      const message=root.querySelector('[name="cf-message"]');
      if(message)ctx.setField(message,[ctx.valueOf('name'),ctx.valueOf('description')].filter(Boolean).join('\n\n'));
    },
    validate(ctx,root){
      const errors=[];
      const select=root.querySelector('#cf-subject');
      if(!select||select.selectedOptions[0]?.text.trim()!=='Get into the waiting list')errors.push('Choose Get into the waiting list, not a paid plan');
      const honey=root.querySelector('[name="kc_honeypot"]');
      if(honey?.value)errors.push('Honeypot must stay empty');
      const human=root.querySelector('input[name="kc_captcha"][value="kc_human"]');
      if(human&&!human.checked)errors.push('Select the car in the captcha');
      return errors;
    },
    success:/thank you for your message|your message has been sent/i,
    protocol:{transport:'page-js-contact-form7',declaredMethod:'POST',action:'/join/#wpcf7-f1252-p737-o1',method:null,actualNetworkProtocol:'not-captured',queueDays:null,terms:'checkbox',termsUrl:'https://aitoolsnetwork.com/terms-and-conditions/',verified:'live-form-captcha-blocked',checkedAt:'2026-11-05',freeStatus:'Basic plan is explicitly Free for a directory listing via the waiting-list form. Pro is $400/year and Pro Plus is $550/year; those Stripe checkout links are never opened.'},
    note:{en:'Basic listing is Free and uses the waiting-list form: subject, email, website, name and message. Pro $400/year and Pro Plus $550/year are Stripe checkouts and are never opened. Image captcha asks for the car; honeypot stays empty. Fill and pause. Queue unknown.',zh:'Basic 明确免费，走等候名单表单：主题、邮箱、网址、姓名和说明。Pro 每年 400 美元、Pro Plus 每年 550 美元是 Stripe 结账，不会打开。图形验证码要求选出汽车，蜜罐保持空白。只填表并暂停，排期未知。'},
  },
  {
    id:'codemarket',name:'code.market',domain:'code.market',url:'https://code.market/newsletter/submit',login:false,
    form:'form:has(#project_url)',fill:{'#project_url':'url'},skip:['#twitter_handle'],
    submit:/^Submit Project$/,reviewBeforeSubmit:true,
    afterFill(ctx,root){
      const words=text=>String(text||'').trim().split(/\s+/).filter(Boolean);
      const name=root.querySelector('#project_name');
      if(name)ctx.setField(name,words(ctx.valueOf('name')).slice(0,5).join(' '));
      const tagline=words(ctx.valueOf('tagline'));
      const short=tagline.length&&tagline.length<=15?tagline:words(ctx.valueOf('description')).slice(0,15);
      const area=root.querySelector('#description');
      if(area)ctx.setField(area,short.join(' '));
      const saas=root.querySelector('input[name="category"][value="saas"]');
      if(saas&&!saas.checked)saas.click();
    },
    validate(ctx,root){
      const errors=[];
      const words=el=>String(el?.value||'').trim().split(/\s+/).filter(Boolean);
      if(words(root.querySelector('#project_name')).length>5)errors.push('Project name must be 5 words or fewer');
      const count=words(root.querySelector('#description')).length;
      if(!count||count>15)errors.push('Description must be 1 to 15 existing words');
      if(!root.querySelector('input[name="category"][value="saas"]')?.checked)errors.push('Select SaaS before submitting');
      return errors;
    },
    success:/your project has been submitted|thanks for submitting|added to the digest/i,
    protocol:{transport:'page-js',declaredMethod:'GET',action:'/newsletter/submit',method:null,actualNetworkProtocol:'not-captured',queueDays:null,terms:'none-observed',verified:'live-form-review-only',checkedAt:'2026-11-05',freeStatus:'Digest form has no payment or backlink control. A separate homepage control sells a week rank for $9 and is not used.'},
    note:{en:'Digest form: URL, name up to 5 words, description up to 15 existing words, SaaS selected, Twitter left empty. The separate $9 week-rank control is not clicked. Fill and pause. Queue unknown; not submitted.',zh:'摘要表单填写网址、最多5个词的名称、最多15个词的现有说明，并选择SaaS，Twitter留空。旁边9美元的周排名不会点击。只填表并暂停，排期未知，未投稿。'},
  },
  {
    id:'freeaitoolsdirectory',name:'Free AI Tools Directory',domain:'free-ai-tools-directory.com',url:'https://free-ai-tools-directory.com/submit-request/',login:false,
    form:'form:has([name="input_7"])',
    fill:{'[name="input_6"]':'name','[name="input_7"]':'url','[name="input_8"]':'description','[name="input_10"]':'tagline'},
    skip:['input[type=file]','input.gfield_recaptcha_response'],
    submit:'#gform_submit_button_1',reviewBeforeSubmit:true,
    validate(){
      const token=document.querySelector('textarea[name="g-recaptcha-response"]');
      if(!token||!token.value.trim())return ['Complete the reCAPTCHA'];
      return [];
    },
    success:/thanks for contacting us|your submission has been received/i,
    protocol:{transport:'page-js-gravity-forms',declaredMethod:'POST',action:'/submit-request/',method:null,actualNetworkProtocol:'not-captured',queueDays:null,terms:'none-observed',verified:'live-form-captcha-blocked',checkedAt:'2026-11-05',freeStatus:'Public Gravity Form has no payment or reciprocal-link field. The directory name says free; a separate submission fee was not stated. reCAPTCHA blocks automatic sending.'},
    note:{en:'Gravity Form: tool name, URL, description and short description. Image left empty. No payment or backlink field. Visible reCAPTCHA is not solved. Fill and pause. Queue unknown.',zh:'Gravity Form：工具名、网址、介绍和短说明。图片留空。没有收费或互链字段。可见的 reCAPTCHA 不代答。只填表并暂停，排期未知。'},
  },
  {
    id:'guideofaitool',name:'Guide of AI Tool',domain:'guideofaitool.com',url:'https://www.guideofaitool.com/submit-ai-tool',login:false,maxReviewDays:2,
    form:'form:has(#tool-url)',
    fill:{'#name':'fullName','#email':'email','#tool-name':'name','#tool-url':'url'},
    skip:['#paypal-email'],
    submit:'form:has(#tool-url) button[type=submit]',reviewBeforeSubmit:true,
    validate(ctx,root){
      const paypal=root.querySelector('#paypal-email');
      if(!paypal||!paypal.value.trim())return ['PayPal email is required as a submission reference and was left blank'];
      return [];
    },
    success:/thank you|submitted|within 48 hours/i,
    protocol:{transport:'page-js',declaredMethod:'GET',action:'/submit-ai-tool',method:null,actualNetworkProtocol:'not-captured',queueDays:2,terms:'none-observed',verified:'live-form-review-only',checkedAt:'2026-11-05',freeStatus:'FAQ says submission is completely free, reviewed within 48 hours, and the site does not accept payment to list or rank tools. PayPal email is labeled as a submission reference and is not invented.'},
    note:{en:'Free listing, reviewed within 48 hours. Fills name, email, tool name and URL. PayPal email is required only as a reference and is left blank. Fill and pause.',zh:'FAQ写明投稿完全免费，48小时内审核，不接受付费上榜。填写姓名、邮箱、工具名和网址。PayPal邮箱只作投稿参考，没有现成地址所以留空。只填表并暂停。'},
  },
  {
    id:'insidr',name:'Insidr.ai',domain:'insidr.ai',url:'https://www.insidr.ai/submit-tools/',login:false,
    form:'main:has(#tool-description)',
    fill:{'input[placeholder="e.g. Acme AI"]':'name','input[placeholder="https://"]':'url','#tool-description':'description','input[placeholder="Your name"]':'fullName','input[placeholder="you@company.com"]':'email'},
    skip:['input[name="website_url"]'],
    submit:/^Submit tool$/,reviewBeforeSubmit:true,
    afterFill(ctx,root){
      const selects=[...root.querySelectorAll('select')];
      const category=selects.find(select=>[...select.options].some(option=>option.text.trim()==='AI Video Tools'));
      const pricing=selects.find(select=>[...select.options].some(option=>option.text.trim()==='Free trial'));
      if(category)ctx.setField(category,'AI Video Tools');
      if(pricing)ctx.setField(pricing,'Free trial');
    },
    validate(ctx,root){
      const errors=[];
      const selected=name=>[...root.querySelectorAll('select')].find(select=>[...select.options].some(option=>option.text.trim()===name));
      if(selected('AI Video Tools')?.selectedOptions[0]?.text.trim()!=='AI Video Tools')errors.push('Select AI Video Tools');
      if(selected('Free trial')?.selectedOptions[0]?.text.trim()!=='Free trial')errors.push('Select Free trial, not the default Freemium');
      const honey=root.querySelector('input[name="website_url"]');
      if(honey?.value)errors.push('Honeypot must stay empty');
      return errors;
    },
    success:/thank you|submission received|we.ll review/i,
    protocol:{transport:'page-js',method:null,action:null,queueDays:null,terms:'none-observed',verified:'live-form-review-only',checkedAt:'2026-11-05',freeStatus:'Submission form includes a Free trial product-pricing option. Sponsored placement is a separate Advertise link and is not opened. The page says it may email about sponsor options.'},
    note:{en:'Directory form: tool name, website, AI Video Tools, Free trial, description, name and email. The off-screen honeypot stays empty. Advertise is not opened. Fill and pause. Queue unknown.',zh:'目录表单填写工具名、网址、AI Video Tools、Free trial、介绍、姓名和邮箱。屏幕外的蜜罐保持空白。不打开 Advertise。只填表并暂停，排期未知。'},
  },
  {
    id:'designshi',name:'设计狮',domain:'998877.com.cn',url:'https://wj.qq.com/s2/8138981/1c44/',
    extraHosts:[/^wj\.qq\.com$/i],extraPath:/^\/s2\/8138981\/1c44\/?$/,login:false,
    form:'.question-list',skip:['input.inputs-input'],submit:'button.btn-submit',reviewBeforeSubmit:true,
    afterFill(ctx,root){
      const set=(needle,value)=>{
        const question=[...root.querySelectorAll('.question')].find(el=>el.querySelector('.question-title')?.textContent.includes(needle));
        const input=question?.querySelector('input,textarea');
        if(input)ctx.setField(input,value);
      };
      set('您要推荐的网址是什么',ctx.valueOf('url'));
      set('请说明您的推荐理由',ctx.valueOf('description'));
      set('请留下你的联系邮箱',ctx.valueOf('email'));
    },
    validate(ctx,root){
      const titles=[...root.querySelectorAll('.question-title')].map(el=>el.textContent.replace(/\s+/g,' ').trim());
      const missing=['您要推荐的网址是什么','请说明您的推荐理由','请留下你的联系邮箱'].filter(text=>!titles.some(title=>title.includes(text)));
      if(missing.length)return ['Tencent question labels changed: '+missing.join(', ')];
      const intro=document.body.innerText||'';
      if(!intro.includes('设计类站点')||!intro.includes('知名度'))return ['Inclusion wording changed; review the design-directory requirement before submitting'];
      return [];
    },
    success:/提交成功|感谢你的参与|问卷已提交/,
    protocol:{transport:'page-js',method:null,action:null,queueDays:null,terms:'none-observed',verified:'live-form-eligibility-unconfirmed',checkedAt:'2026-11-05',freeStatus:'Public Tencent survey has no payment or reciprocal-link control. The page asks for design sites with industry recognition, so eligibility is not treated as verified.'},
    note:{en:'Public Tencent survey linked from 设计狮 “申请收录”: URL, recommendation reason and email. No payment or reciprocal-link control. The page asks for design sites with industry recognition, so the plugin fills and pauses. Queue unknown; not submitted.',zh:'设计狮“申请收录”腾讯问卷：网址、推荐理由、邮箱。未见收费或互链控件。页面要求设计类站点并需行业知名度，因此只填表并暂停。排期未知，未投稿。'},
  },
  {
    id:'aihubpro',name:'AI未来百科',domain:'aihubpro.cn',url:'https://www.aihubpro.cn/link-register',login:false,
    form:'form:has(input[placeholder="网站网址"])',skip:['input[name=s]'],submit:/^提交$/,reviewBeforeSubmit:true,
    fill:{'input[placeholder="网站名称"]':'name','input[placeholder="网站网址"]':'url','#link_content_1':'description'},
    afterFill(ctx,root){
      const select=root.querySelector('select[name=parent]');
      if(select&&[...select.options].some(o=>o.text.trim()==='AI视频工具'))ctx.setField(select,'AI视频工具');
      const description=ctx.valueOf('description');
      const editor=window.tinymce?.get?.('link_content_1');
      if(editor)editor.setContent(description);
    },
    validate(ctx,root){
      const errors=[];
      const select=root.querySelector('select[name=parent]');
      if(!select||![...select.options].some(o=>o.text.trim()==='AI视频工具'))errors.push('AI视频工具 category is missing');
      else if(select.selectedOptions[0]?.text.trim()!=='AI视频工具')errors.push('Select AI视频工具 before submitting');
      const file=root.querySelector('input[type=file]');
      if(file&&!file.files?.length)errors.push('Choose a site icon before submitting');
      if(/请登录后再提交申请/.test(document.body.innerText||''))errors.push('Log in before submitting; do not create an account automatically');
      return errors;
    },
    success:/您已提交成功，请等待审核通过/,
    protocol:{transport:'page-js',declaredMethod:null,method:null,action:null,queueDays:null,terms:'none-observed',verified:'live-form-login-required',checkedAt:'2026-11-05',freeStatus:'Public 申请入驻 form shows no payment or reciprocal-link control. Login and an icon are required; terms after login are not verified.'},
    note:{en:'Visible 申请入驻 form: site name, URL, icon, description and AI视频工具. Login (email/password or WeChat/Weibo/QQ) and an icon are required. No payment or reciprocal control on the public form; post-login terms are unverified. Fill and pause. Do not register or submit automatically.',zh:'申请入驻表单可见：网站名称、网址、图标、介绍，分类选AI视频工具。必须先登录（邮箱密码或微信/微博/QQ），且必须上传图标。公开表单没有收费或互链控件，登录后的条件未核实。只填表并暂停，不自动注册或提交。'},
  },
  {
    id:'aitophub',name:'AI Top Hub',domain:'aitophub.com',url:'https://aitophub.com/',login:false,
    form:'form:has([name="tool url"])',
    fill:{'[name="first name"]':'firstName','[name="last name"]':'lastName','[name=email]':'email','[name="tool name"]':'name','[name="tool url"]':'url','[name="additional info"]':'description'},
    skip:['[name="video review"]'],submit:'input[name=send]',
    steps:[{id:'open-submit',label:'sForm',match:()=>![...document.querySelectorAll('form')].some(f=>f.querySelector('[name="tool url"]')&&f.getClientRects().length>0)&&[...document.querySelectorAll('a')].some(a=>a.textContent.trim()==='SUBMIT TOOL'),async run(ctx){[...document.querySelectorAll('a')].find(a=>a.textContent.trim()==='SUBMIT TOOL').click();await ctx.sleep(1500);}}],
    afterFill(ctx,root){
      ctx.setField(root.querySelector('[name="submit speed"]'),'Regular (within 30 days - free)');
      const category=root.querySelector('[name="tool general category"]');
      if(category&&!category.value){const options=[...category.options].map(o=>({text:o.text,value:o.value}));const pick=(/video editing/i.test((ctx.product.tags||[]).join(' '))&&options.find(o=>o.text==='AI Video Editor'))||ctx.rankOptions(options)[0];if(pick)ctx.setField(category,pick.text);}
      ctx.setField(root.querySelector('[name="additional info"]'),[ctx.valueOf('pricingNote'),ctx.valueOf('description')].filter(Boolean).join('\n\n'));
    },
    validate(ctx,root){
      const errors=[];
      for(const name of ['first name','last name','email','tool name','tool url','tool general category'])if(!root.querySelector('[name="'+name+'"]')?.value.trim())errors.push('Required: '+name);
      const plan=root.querySelector('[name="submit speed"]');
      if(plan?.value!=='Regular (within 30 days - free)'||plan.selectedOptions[0]?.text.trim()!=='Regular (within 30 days - free)')errors.push('Choose Regular within30days-free, never Instant49USD');
      return errors;
    },
    success:/^Thank you for submitting your tool$/i,
    protocol:{transport:'html-form-page-js',method:'POST',action:'',queueDays:30,terms:'none-observed',verified:'live-receipt',checkedAt:'2026-11-05',freeStatus:'Regular within30days-free; Instant within24h costs49USD, never selected'},
    note:{en:'SUBMIT TOOL → wait for modal → real first/last name,email,tool name/URL/category → Regular within30days-free → Submit Tool. Original description and Free Trial note in additional info, optional video blank. Require thank-you receipt.',zh:'SUBMIT TOOL→等待弹窗→真实姓名/邮箱/工具名称网址分类→30天内免费Regular→Submit Tool。附加信息写原描述和Free Trial，视频可留空；仅明确感谢页算成功。'},
  },
  {
    id:'tinylaunch',name:'TinyLaunch',domain:'tinylaunch.com',sourceDomains:['tinylaun.ch'],extraHosts:[/^tinylaun\.ch$/i],
    url:'https://www.tinylaunch.com/dashboard/startups/new',login:'email',emailOnly:true,
    form:'body:has(#firstName):has(#handle), form:has(#name):has(#category)',
    fill:{'#firstName':'firstName','#lastName':'lastName','#name':'name','#tagline':'tagline','#url':'url','[contenteditable=true]':'description'},
    skip:['#xHandle','input[type=file]:not([data-autosubmit-image=logo])'],check:['#terms'],
    submit:/^(Save Profile|Create Startup)$/i,
    isDraftSubmit(ctx,root,btn){return /^(Save Profile|Create Startup|Schedule Free Launch)$/i.test(ctx.textOf(btn));},
    beforeFill(ctx,root){
      const tagline=root.querySelector('#tagline');if(tagline)tagline.maxLength=60;
      const logo=root.querySelector('input[type=file]');if(logo)logo.dataset.autosubmitImage='logo';
      const handle=root.querySelector('#handle');
      if(handle&&!handle.value){try{ctx.setField(handle,new URL(ctx.product.url).hostname.replace(/^www\./,'').replace(/[^a-z0-9_]/gi,'_').slice(0,20));}catch(e){}}
    },
    afterFill(ctx,root){
      const select=root.querySelector('#category');if(!select||select.value)return;
      const pick=ctx.rankOptions([...select.options].filter(o=>o.value))[0];if(pick)ctx.setField(select,pick.text);
    },
    validate(ctx,root){
      if(root.querySelector('#firstName'))return !root.querySelector('#firstName').value.trim()||!/^[a-z0-9_]{5,20}$/i.test(root.querySelector('#handle')?.value||'')?['Provide your real first name and a unique 5–20 character maker handle']:[];
      const errors=[];
      if((root.querySelector('#name')?.value||'').length>30)errors.push('Startup name must be <=30 characters; do not silently rename');
      if(!root.querySelector('#name')?.value||!root.querySelector('#tagline')?.value||!root.querySelector('#url')?.value||!root.querySelector('[contenteditable=true]')?.textContent.trim()||!root.querySelector('#category')?.value)errors.push('Complete the required startup details and category');
      if(!root.querySelector('input[type=file]')?.files.length&&!root.querySelector('img[alt="Selected logo"]'))errors.push('Upload the required startup logo');
      if(!root.querySelector('#terms')?.checked)errors.push('Actively accept the no-duplicate-voting promise');
      return errors;
    },
    steps:[
      {id:'verify-email',label:'sCode',match:()=>location.pathname==='/auth/verify'&&[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Verify Email'),async run(ctx){ctx.clickables().find(b=>ctx.textOf(b)==='Verify Email')?.click();await ctx.sleep(1000);}},
      {id:'new-startup',label:'sForm',match:()=>location.pathname==='/dashboard/startups'&&!!document.querySelector('a[href="/dashboard/startups/new"]'),async run(ctx){document.querySelector('a[href="/dashboard/startups/new"]').click();await ctx.sleep(500);}},
      {id:'free-date',label:'sForm',match:()=>[...document.querySelectorAll('h2')].some(h=>h.textContent.trim()==='Choose a Launch Date'),run:pickTinyLaunchDate},
      {id:'free-options',label:'sForm',match:()=>[...document.querySelectorAll('h2')].some(h=>/^Configure Launch for/.test(h.textContent.trim())),run:configureTinyLaunch},
      {id:'skip-upsell',label:'sForm',match:()=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Continue with free launch'),async run(ctx){
        if(!tinyLaunchDateAllowed(sessionStorage.getItem('as_tinylaunch_date')))return ctx.fail('No confirmed free launch date within 100 days; select a date again');
        return ctx.submit(document.body,ctx.clickables().find(b=>ctx.textOf(b)==='Continue with free launch'));
      }},
    ],
    success:/^Launch Scheduled$/i,
    protocol:{transport:'page-js',method:null,action:null,queueDays:33,queueText:'Pick earliest available free date <=100 days; observed 2026-12-07 (33 days from 2026-11-04); review usually <24h',terms:'submission-accepts',termsText:'No repeated self-votes or duplicate accounts; affected votes and launches may be canceled',verified:'live-scheduled-receipt',checkedAt:'2026-11-04',reciprocal:'Free publication completed without badge; high-authority backlink reward requires top3 and embedded badge, not claimed'},
    note:{en:'Email verification → maker profile → startup draft → earliest free slot <=100 days → Standard Free, both extras None $0 → Continue with free launch. Require Launch Scheduled; no badge or backlink reward claimed.',zh:'邮箱验证→投稿人资料→产品草稿→100天内最早免费档期→Standard Free、两项附加服务None $0→跳过升级。仅Launch Scheduled算回执；不加徽章，不声称获得外链奖励。'},
  },
  {
    id:'submityouraitool', name:'Submit Your AI Tool', domain:'submityouraitool.com',
    url:'https://embed.fillout.com/t/cBypbJX257us', extraHosts:[/^embed\.fillout\.com$/i], extraPath:/^\/t\/cBypbJX257us\/?$/, login:false,
    form:'body:has(input[aria-label="AI Tool Name:"])',
    fill:{'input[aria-label="Email:"]':'email','input[aria-label="AI Tool Name:"]':'name','input[aria-label="Website"]':'url','textarea[aria-label="Description"]':'description'},
    skip:['input[type=file]'], submit:/^Submit$/i,
    beforeFill(ctx,root){
      const widget=root.querySelector('.widget-2YpyK7B3k6NzWoktR4ZrHM');
      const input=widget?.querySelector('input[type=file]');
      const image=ctx.product.hero;
      if(!input || /Upload complete/i.test(widget.innerText) || input.files.length || !image?.data?.startsWith('data:image/jpeg;base64,'))return;
      const file=self.AutoSubmitEngine.dataUrlToFile(image,'hero');
      if(file.size<=1048576)self.AutoSubmitEngine.setFile(input,file);
    },
    async afterFill(ctx,root){
      const widget=root.querySelector('.widget-2YpyK7B3k6NzWoktR4ZrHM');
      if(!widget?.querySelector('input[type=file]')?.files.length)return;
      for(let n=0;n<40&&!/Upload complete|Invalid file|too large|error/i.test(widget.innerText);n++)await ctx.sleep(500);
    },
    validate(ctx,root){
      const errors=[];
      for(const selector of Object.keys(ctx.site.fill))if(!root.querySelector(selector))errors.push('Wait for the complete Fillout form, including email');
      const widget=root.querySelector('.widget-2YpyK7B3k6NzWoktR4ZrHM');
      if(!widget || !/Upload complete/i.test(widget.innerText))errors.push('Upload a JPEG hero image <=1 MB and wait for Upload complete');
      return [...new Set(errors)];
    },
    success:/^(?:Thank you for your submission\.|We will review your information and get back to you shortly\.)$/i,
    protocol:{transport:'fillout-page-js',method:null,action:null,queueDays:null,terms:'none',verified:'live-receipt',checkedAt:'2026-11-04',sourceUrl:'https://submityouraitool.com/#Submit-AI-Tool-Below'},
    note:{en:'Free, no backlink; queue unknown. Opens the observed Fillout form. Requires email and a JPEG hero <=1 MB; wait for Upload complete. PNG is rejected.',zh:'免费无互链，排期未知；打开实测Fillout表单。须完整加载邮箱字段、上传≤1MB的JPEG主图并等Upload complete；PNG会被拒绝。'},
  },
  {
    id:'aiai', name:'AIAI.Tools', domain:'aiai.tools', url:'https://tally.so/embed/3NADy0', extraHosts:[/^tally\.so$/i], extraPath:/^\/embed\/3NADy0\/?$/, login:false,
    form:'form', fill:{'[aria-label="Your Name"]':'fullName','[aria-label="Contact Email Address"]':'email','[aria-label="Tool Name"]':'name','[aria-label="URL"]':'url','[placeholder="Screenshot URL"]':'heroUrl'},
    check:['#choice_9696e6e3-4baf-484d-a1e7-00d9db1df83d'],
    optionalReciprocalNo:'#choice_9696e6e3-4baf-484d-a1e7-00d9db1df83d',
    skip:['#choice_8824cb86-ba35-4a65-8e5c-b0fdc99a31e2'],
    submit:/^Submit$/i,
    isDraftSubmit(ctx,root){return !!root.querySelector('[aria-label="Tool Name"]');},
    validate(ctx,root){
      const image=root.querySelector('[placeholder="Screenshot URL"]');
      if(!image)return [];
      try{const u=new URL(image.value);if(/^https?:$/.test(u.protocol)&&/\.(?:png|jpe?g)$/i.test(u.pathname))return [];}catch(e){}
      return ['Provide a public PNG/JPG screenshot or hero URL; a local image file is not a URL'];
    },
    success:/^(?:Form submitted|Thanks for completing this form!)$/i,
    protocol:{transport:'tally-page-js',method:null,action:null,queueDays:null,terms:'none',verified:'live-receipt',checkedAt:'2026-11-04',sourceUrl:'https://aiai.tools/submit-ai-tool',reciprocal:'Explicitly select No; Yes is optional'},
    note:{en:'Free observed flow; queue unknown. Explicitly choose No backlink. Requires a public PNG/JPG screenshot URL. Done! is an intermediate page: click Submit again and require Form submitted.',zh:'实测无收费，排期未知；互链明确选No。需公开PNG/JPG截图网址；Done!仍为中间页，须再点Submit并取得Form submitted回执。'},
  },
  {
    id:'theainavigator', name:'The AI Navigator', domain:'theainavigator.com', url:'https://www.theainavigator.com/submit-an-ai-tool', login:false,
    form:'.s-email-form', fill:{'[placeholder="name of the AI tool"]':'name','[placeholder="start with https://"]':'url','[placeholder="In simple and clear wording"]':'tagline','[placeholder="First Last"]':'fullName','input[name$="#email"]':'email'},
    skip:['[placeholder="e.g. @the_ainavigator"]','input[name$="#shortText"][aria-label=input]','textarea[placeholder^="Anything else"]'],
    check:['input[type=checkbox][id^=gdpr-]'], submit:/^Submit$/i, success:/Thanks for your submission to The AI Navigator!/i,
    protocol:{transport:'page-js',method:null,action:null,queueDays:null,terms:'submission-accepts',verified:'live-receipt',checkedAt:'2026-11-04'},
    note:{en:'Free submission verified live; queue unknown. Actively tick Privacy Policy; optional social and affiliate fields stay empty.',zh:'实测投稿无收费或互链；排期未知。主动勾选隐私协议，社交账号和联盟链接留空。'},
  },
  {
    id:'sonicrun', name:'SonicRun', domain:'sonicrun.com', url:'https://www.sonicrun.com/freelisting.html', login:false, maxReviewDays:30,
    form:'form:has(input[name=url]), form:has(input[name=verify])',
    fill:{'input[name=url]':'url','input[name=email]':'email','input[name=name]':'fullName'}, check:['input[name=terms]'],
    submit:/^(Submit|Add Your Site)$/i, success:/^Submission Received$/i,
    emailLinkPattern:/^https:\/\/(?:www\.)?sonicrun\.com\/cgi-bin\/v\.cgi\?/i,
    protocol:{transport:'html-form',method:'POST',action:'/cgi-bin/add.cgi',verificationAction:'/cgi-bin/v.cgi',queueDays:30,terms:'submission-accepts',termsUrl:'https://www.sonicrun.com/tos.html',accountSideEffect:'FreeWebMonitoring free account',verified:'live-receipt-email-link',checkedAt:'2026-11-04'},
    note:{en:'Free listing after 30 days, not guaranteed. Submission creates a free FreeWebMonitoring account. Read the verification link from Gmail, then click Add Your Site only; ignore Buy Now and Upgrade.',zh:'免费30天收录、不保证通过；附带FreeWebMonitoring免费账户。Gmail读取验证链接后，只勾选免费表单并点Add Your Site，忽略两项收费升级。'},
  },
  {
    id:'aisiteleri', name:'AI Siteleri', domain:'aisiteleri.com', url:'https://aisiteleri.com/yapay-zeka-oner/', login:false,
    form:'#wpforms-form-1390', fill:{'#wpforms-1390-field_0':'firstName','#wpforms-1390-field_0-last':'lastName','#wpforms-1390-field_1':'email','#wpforms-1390-field_3':'url','#wpforms-1390-field_4':'namedDescription'},
    skip:['[name="wpforms[hp]"]'], submit:/^Gönder$/i,
    success:/Bizimle iletişime geçtiğiniz için teşekkür ederiz!/i,
    protocol:{transport:'wpforms-page-js',method:'POST',action:'/yapay-zeka-oner/',queueDays:null,terms:'none',verified:'live-receipt',checkedAt:'2026-11-04'},
    note:{en:'Free suggestion verified live; queue unknown. Requires real first/last names. Never accept the email-domain correction suggestion.',zh:'实测建议表单无收费或互链，排期未知；需真实名/姓。不接受网站建议的邮箱域名替换。'},
  },
  {
    id:'ainewshub', name:'AI News Hub', domain:'ainewshub.org', url:'https://www.ainewshub.org/submit-ai-tool', login:false,
    form:'#comp-lr80oeg6', fill:{'#input_comp-lr80oegl':'name','#input_comp-lr80oegu':'url','#input_comp-m7iyrhh2':'tags','#input_comp-lr80oeh4':'pricing','#input_comp-lr80td2t':'email','#textarea_comp-lr80oeh7':'description','#input_comp-m7kiuhkp':'discoverySource'},
    productPricing:['#input_comp-lr80oeh4'], submit:/^Submit$/i,
    success:/^(?:Thanks|Thank you).*submi|^(?:Your )?(?:form|tool|submission).*(?:received|submitted successfully)/i,
    steps:[{id:'dismiss-newsletter',label:'sForm',match:()=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Back to site'),async run(ctx){
      ctx.clickables().find(b=>ctx.textOf(b)==='Back to site')?.click(); await ctx.sleep(300);
    }}],
    protocol:{transport:'wix-page-js',method:null,action:null,declaredMethod:'GET',queueDays:null,queueText:'14–21 business days; max 2 free submissions per user/month',terms:'none',verified:'live-attempt-unconfirmed',checkedAt:'2026-11-04'},
    note:{en:'FAQ confirms free basic listing, 14–21 business days, max 2/month. A cleared form is not a receipt; an uncertain attempt is not retried automatically. Ignore newsletter popup.',zh:'FAQ确认免费基础收录、14–21工作日、每月最多2次。表单清空不算回执，未确认尝试不自动重投；关闭订阅弹窗。'},
  },
  {
    id:'iforai', name:'iForAI', domain:'iforai.com', url:'https://iforai.com/submit_website/', login:false,
    form:'form:has(input[name=post_title])',
    fill:{'[name=post_title]':'name','[name=link]':'url','[name=sescribe]':'tagline','[name=post_content]':'description','[name=tags]':'tags','[name=user_name]':'fullName','[name=contact_details]':'email'},
    skip:['[name=wechat_id]','[name=image_captcha]'], humanFields:['[name=image_captcha]'],
    afterFill: fillVideoNavigationCategory, validate: validateNavigationCategory,
    submit:/提交审核/, success:/操作成功|提交成功|已提交.*审核/i,
    protocol:{transport:'wordpress-page-js',method:'POST',action:null,queueDays:null,terms:'none',verified:'live-form-captcha-blocked',checkedAt:'2026-11-04'},
    note:{en:'Ordinary submission with optional donation for priority, no required backlink. Video Editing category; leave WeChat blank. Wait for the user to enter image CAPTCHA; no live receipt yet.',zh:'普通投稿、优先审核打赏可选，无强制互链；视频剪辑分类，微信留空。等待人工图形验证码，本轮按用户要求跳过实投，无回执。'},
  },
  {
    id:'aitocn', name:'AI工具阁', domain:'ai-to.cn', url:'https://ai-to.cn/contribute/', login:false,
    form:'form:has(input[name=post_title])',
    fill:{'[name=post_title]':'name','[name=link]':'url','[name=sescribe]':'tagline','[name=post_content]':'description','[name=tags]':'tags','[name=user_name]':'fullName','[name=contact_details]':'email'},
    skip:['[name=wechat_id]'], humanChallenges:['#slider_captcha_body'],
    afterFill:fillVideoNavigationCategory, validate:validateNavigationCategory,
    reviewBeforeSubmit:true, submit:/提交审核/, success:/操作成功|提交成功|已提交.*审核/i,
    protocol:{transport:'wordpress-page-js',method:'POST',action:null,queueDays:null,terms:'none',freeStatus:'Website form has no fee or backlink controls; only article submission explicitly described as free',verified:'live-form-slider-blocked',checkedAt:'2026-11-04'},
    note:{en:'Website form mapped; article submission explicitly free, website pricing not separately stated. Fill and stop for review; a submit click opens a slider CAPTCHA. Do not infer website eligibility from article wording.',zh:'网址字段已适配；页面明确免费的是文章投稿，网址费用未单独说明。填好后暂停核实免费条件，不自动提交；点击会弹滑块，不能把文章免费当网址免费证据。'},
  },
  {
    id:'waimao21', name:'外贸百科', domain:'waimao21.com', url:'https://waimao21.com/%e7%94%b3%e8%af%b7%e6%94%b6%e5%bd%95', login:false,
    form:'form:has(#tougaocategorg_sites)',
    fill:{'[name=tougao_title]':'name','[name=tougao_sites_link]':'url','[name=tougao_sites_sescribe]':'tagline','[name=tougao_sites_keywords]':'tags','[name=tougao_content]':'description'},
    skip:['[name=captcha_canvas]'], humanFields:['#input_veri'],
    afterFill:fillVideoNavigationCategory, validate:validateNavigationCategory,
    reviewBeforeSubmit:true, submit:/^提交$/, success:/操作成功|提交成功|已提交.*审核/i,
    protocol:{transport:'wordpress-page-js',method:'POST',action:'/%e7%94%b3%e8%af%b7%e6%94%b6%e5%bd%95',queueDays:null,terms:'none',freeStatus:'No fee or reciprocal controls observed; final acceptance blocked by CAPTCHA',verified:'live-form-captcha-blocked',checkedAt:'2026-11-04'},
    note:{en:'Website form only; AI Video category and 50-character summary. No payment/backlink controls seen; review eligibility and complete CAPTCHA manually before submission. Not live-submitted.',zh:'仅操作网站表单；AI视频分类，简介上限50字符。当前无费用/互链控件，最终免费条件和图形验证码需人工检查后提交；本轮未实投。'},
  },
  {
    id:'aier', name:'Aier', domain:'aier.im', url:'https://aier.im/submit', login:false,
    form:'form:has(input[name=website_url])',
    fill:{'[name=name]':'name','[name=website_url]':'url','[name=short_description]':'description','[name=what_is_description]':'longDescription','[name=pricing_details]':'pricingNote','[name=submitter_name]':'fullName','[name=submitter_email]':'email'},
    skip:['[name=submitter_twitter]','[name=submitter_linkedin]','[name=video_url]','input[type=file]','[placeholder="Enter a question"]','[placeholder="Enter the answer"]','[placeholder="Add a key feature"]','[placeholder="Add a use case"]'],
    productPricing:['select','[data-as-picker=pricing]'],
    beforeFill(ctx,root){
      for(const b of root.querySelectorAll('button[role=combobox]')) {
        const label=b.parentElement.querySelector('label')?.textContent||'';
        b.dataset.asPicker=/Pricing Type/i.test(label)?'pricing':/Target Professions/i.test(label)?'profession':'category';
      }
    },
    async afterFill(ctx,root){
      for(const key of ['pricing','category','profession']) {
        const b=root.querySelector(`[data-as-picker=${key}]`); if(!b)continue;
        if(key==='pricing' && !['Free','Freemium','Paid','Contact for Pricing'].includes(ctx.product.pricing))continue;
        if(key!=='pricing' && !/^Select /i.test(ctx.textOf(b)))continue;
        b.click(); await ctx.sleep(250);
        const options=[...document.querySelectorAll('[role=option]')].filter(ctx.shown).map(el=>({el,text:ctx.textOf(el)}));
        const pick=key==='pricing'?options.find(o=>o.text.toLowerCase()===ctx.product.pricing.toLowerCase()):ctx.rankOptions(options)[0];
        if(pick)pick.el.click();else b.click(); await ctx.sleep(150);
      }
    },
    validate(ctx,root){
      const issues=[];
      if(!['Free','Freemium','Paid','Contact for Pricing'].includes(ctx.product.pricing))issues.push('No exact product pricing option for '+ctx.product.pricing+'; do not substitute Free or Paid');
      for(const key of ['category','profession'])if(/^Select /i.test(root.querySelector(`[data-as-picker=${key}]`)?.textContent||'Select '))issues.push('Choose '+key);
      return issues;
    },
    submit:/^Submit AI Tool for Review$/i, success:/thank you.*submi|submission.*(?:received|successful)|tool.*submitted successfully/i,
    protocol:{transport:'page-js',method:null,action:null,declaredMethod:'GET',queueDays:null,queueText:'2–3 business days',terms:'submission-accepts',termsUrl:'https://aier.im/terms-of-service',privacyUrl:'https://aier.im/privacy-policy',freeStatus:'No fee or backlink step on displayed form; no final RTFV submission',verified:'live-form-pricing-blocked',checkedAt:'2026-11-04'},
    note:{en:'Form mapped with controlled pricing/category/profession pickers. Free Trial is absent, so RTFV pauses without substituting another model. No real receipt.',zh:'已适配定价、分类和职业受控下拉框；没有Free Trial，RTFV停在定价校验，不改选其他模式。当前表单无收费/互链项，无真实回执。'},
  },
  {
    id:'tooltrove', name:'ToolTrove (AnyFP)', domain:'tooltrove.net', sourceDomains:['anyfp.com'], url:'https://tooltrove.net/submit', login:false, extraHosts:[/^anyfp\.com$/],
    form:'form:has(#websiteUrl)',
    fill:{'#name':'name','#websiteUrl':'url','#email':'email','#tagline':'tagline','#description':'longDescription','#features':'features','#priceNote':'pricingNote'},
    skip:['[name=website2]','#pricing','#audience','#problem','#screenshots','#videoUrl'], productPricing:['#pricing'],
    afterFill(ctx,root){
      const select=root.querySelector('#categorySlug');
      if(select && /video/i.test(ctx.product.tags?.join(' ')||''))ctx.setField(select,'Video');
      const pricing=root.querySelector('#pricing');
      if(pricing && ['Free','Freemium','Paid'].includes(ctx.product.pricing))ctx.setField(pricing,ctx.product.pricing);
      const web=[...root.querySelectorAll('input[name=platforms]')].find(e=>/^web$/i.test(e.value));if(web&&!web.checked)web.click();
    },
    validate(ctx,root){
      const issues=[];const pricing=root.querySelector('#pricing');
      if(ctx.shown(pricing)&&!['Free','Freemium','Paid'].includes(ctx.product.pricing))issues.push('No exact product pricing option for '+ctx.product.pricing);
      const d=root.querySelector('#description');if(ctx.shown(d)&&d.value.trim().split(/\s+/).filter(Boolean).length<60)issues.push('Provide an owner-approved description of at least 60 words');
      const f=root.querySelector('#features');if(ctx.shown(f)&&f.value.split('\n').filter(s=>s.trim()).length<3)issues.push('Provide at least 3 factual features');
      for(const id of ['audience','problem']) {const e=root.querySelector('#'+id);if(ctx.shown(e)&&!e.value.trim())issues.push('Provide '+id+' in the owner’s words');}
      const screenshots=root.querySelector('#screenshots');if(ctx.shown(screenshots)&&(screenshots.files?.length||0)<2)issues.push('Upload at least 2 actual product screenshots; marketing OG images are not substituted');
      return issues;
    },
    submit:/^(Next|Submit(?: your tool)?(?: for review)?)$/i, draftSubmit:/^Next$/i,
    success:/submission (?:has been )?received|thanks for submitting|tool.*submitted successfully/i,
    protocol:{transport:'page-js',method:'POST',action:'',queueDays:null,queueText:'Usually a couple of days',terms:'none',verified:'live-form-pricing-blocked',checkedAt:'2026-11-04'},
    note:{en:'Free listing; badge only enables a followed link. Three steps; 60+ words, 3+ features, audience/problem and 2+ real screenshots required. Next is not a submission. Free Trial absent: pause, never substitute Paid.',zh:'免费收录，徽章仅用于dofollow。三步；至少60词、3项功能、用途/问题及2张真实截图，Next不算提交。没有Free Trial时暂停，不改选Paid。'},
  },
  {
    id:'saashub', name:'SaaSHub', domain:'saashub.com', url:'https://www.saashub.com/services/submit', login:false, maxReviewDays:84,
    form:'form:has(#service_name)', fill:{'#service_name':'name','#service_tagline':'tagline','#service_contact_email':'email'},
    skip:['#service_linkedin_url','#react-select-2-input','#react-select-3-input'],
    steps:[{id:'website-check',label:'sForm',match:()=>!!document.querySelector('form input[name=url]')&&!document.querySelector('#service_name'),async run(ctx){
      const input=document.querySelector('form input[name=url]');ctx.setField(input,ctx.valueOf('url'));
      return ctx.submit(input.form,ctx.clickables(input.form).find(b=>/^Continue$/i.test(ctx.textOf(b))));
    }},{id:'submission-receipt',label:'sForm',match:()=>location.pathname.startsWith('/related-alternatives/')&&!!document.querySelector('a[href$="/added"]'),run(){
      document.querySelector('a[href$="/added"]').click();
    }}],
    async afterFill(ctx,root){
      const select=async (input,query)=>{
        if(!input)return;const parent=input.closest('.react-select__value-container');
        if([...parent?.querySelectorAll('.react-select__multi-value__label')||[]].some(e=>e.textContent===query))return;
        ctx.setField(input,query);
        for(let i=0;i<12;i++){
          await ctx.sleep(250);
          const prefix=input.id.replace('-input','-option-');
          const option=[...document.querySelectorAll(`[id^="${prefix}"]`)].find(e=>ctx.shown(e)&&e.textContent.trim()===query);
          if(option){option.click();return;}
        }
        ctx.setField(input,' ');
      };
      const videoWatermark=/video/i.test(ctx.product.description||'')&&/watermark/i.test(ctx.product.description||'');
      const categories=videoWatermark?['Video Editors','Video Watermark Remover','Watermark Removal']:(ctx.product.tags||[]).slice(0,3);
      for(const category of categories)await select(root.querySelector('#react-select-2-input'),category);
      if(videoWatermark)await select(root.querySelector('#react-select-3-input'),'HitPaw Watermark Remover');
    },
    validate(ctx,root){
      const count=id=>root.querySelector('#'+id)?.closest('.react-select__value-container')?.querySelectorAll('.react-select__multi-value__label').length||0;
      return [...(count('react-select-2-input')<3?['Select at least 3 accurate categories']:[]),...(count('react-select-3-input')<1?['Select at least 1 relevant competitor']:[])];
    },
    submit:/^Free$/i, draftSubmit:/^Continue$/i,
    success:/was submitted successfully|Thanks for submitting/i,
    protocol:{transport:'html-form-page-js',method:'POST',action:'/services',queueDays:84,queueText:'Free queue 1–12 weeks',terms:'submission-accepts',termsUrl:'https://www.saashub.com/site/terms',privacyUrl:'https://www.saashub.com/site/privacy',verified:'live-receipt-name-fallback',checkedAt:'2026-11-04'},
    note:{en:'Free queue 1–12 weeks. URL check, 3+ categories and relevant competitor, then Free only. Explicit name conflicts use configured backup names; RTFV backup succeeded live. Paid buttons never clicked.',zh:'免费队列1–12周。网址检查→至少3个分类及相关竞品→仅点Free。明确重名才使用备用名称，本次以RTFV成功；不点$75/$99。'},
  },
  {
    id: 'a1gallery', name: 'A1 Gallery', domain: 'a1.gallery', url: 'https://www.a1.gallery/submit', login: 'email', emailOnly: true,
    maxReviewDays: 28, form: '#panel-website form:has(input[name="Site-link"])',
    fill: { 'input[name="Site-link"]': 'url' }, skip: ['[name=_honeypot]', '[name=Creator]'],
    submit: /^Submit website\s*→?$/i, success: /Thanks, we[’']ll review your site soon/i,
    steps: [
      { id:'login-before-submission', label:'sLogin', match:()=>[...document.querySelectorAll('#panel-website button')].some(b=>/Log in to submit/.test(b.textContent)), async run(ctx) {
        ctx.setField(document.querySelector('input[name="Site-link"]'),ctx.valueOf('url'));
        ctx.clickables().find(b=>/Log in to submit/.test(ctx.textOf(b)))?.click(); await ctx.sleep(1500);
      } },
      { id:'newsletter-login-consent', label:'sLogin', match:()=>/\/login/.test(location.pathname)&&!!document.querySelector('input[type=email]'), run(ctx) {
        ctx.setField(document.querySelector('input[type=email]'),ctx.valueOf('email'));
        return ctx.status('Review email login: continuing also subscribes to the weekly email. Click Continue with email yourself to consent.', 'warn');
      } },
    ],
    protocol: {transport:'page-js',method:null,action:null,declaredMethod:'GET',queueDays:28,queueText:'3–4 weeks',terms:'auth-accepts',termsUrl:'https://www.a1.gallery/terms',privacyUrl:'https://www.a1.gallery/privacy',authSubscription:'weekly email; manual consent before sending login link',verified:'live-receipt-email-link',checkedAt:'2026-11-04'},
    note: {en:'Free review in 3–4 weeks; no backlink. Email magic-link login also subscribes to weekly email, so the plugin fills the email and waits for your consent click. Submit only the website URL; creator attribution is optional.',zh:'免费审核3–4周，无互链。邮箱登录附带每周订阅，插件填邮箱后等待本人确认点击，再从Gmail读取登录链接；仅提交网址，额外创作者选填。'},
  },
  {
    id: 'aigclist', name: 'AIGCLIST', domain: 'aigclist.com', url: 'https://aigclist.com/submit', login: 'email', emailOnly: true,
    form: '#submit-details', skip: ['#pricing', '#discountCode'], productPricing: ['#pricing'],
    fill: { '#name': 'name', '#tagline': 'tagline', '#content': 'longDescription', '#notes': 'pricingNote' },
    async afterFill(ctx, root) {
      const category = root.querySelector('#category');
      if (category && !category.value) {
        category.click(); await ctx.sleep(300);
        const options = [...document.querySelectorAll('[role=option]')].filter(ctx.shown).map(el => ({el,text:ctx.textOf(el)}));
        const pick = ctx.rankOptions(options)[0];
        if (pick) pick.el.click();
      }
    },
    validate(ctx, root) {
      const issues = [];
      if ((root.querySelector('#content')?.value || '').trim().length < 400) issues.push('Add a factual long description of at least 400 characters');
      if (!root.querySelector('#category')?.value) issues.push('Choose the product category');
      return issues;
    },
    submit: /^Save draft & choose plan$/i, draftSubmit: /^Save draft & choose plan$/i,
    success: /Submitted\s*[—-]\s*awaiting review|Your listing is in the free review queue/i,
    steps: [
      { id:'email-signin',label:'sLogin',match:()=>[...document.querySelectorAll('a')].some(a=>a.textContent.trim()==='Sign in with email'),async run(ctx) {
        ctx.clickables().find(a=>ctx.textOf(a)==='Sign in with email')?.click();await ctx.sleep(1500);
      } },
      { id:'website-check',label:'sForm',match:()=>!!document.querySelector('#submit-website'),async run(ctx) {
        ctx.setField(document.querySelector('#submit-website'),ctx.valueOf('url'));
        const button=ctx.clickables().find(b=>ctx.textOf(b)==='Continue');
        if(button&&!button.disabled){button.click();await ctx.sleep(1500);}
      } },
      { id:'manual-details',label:'sForm',match:()=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='or write it yourself'),async run(ctx) {
        ctx.clickables().find(b=>ctx.textOf(b)==='or write it yourself')?.click();await ctx.sleep(500);
      } },
      { id:'free-review',label:'sForm',match:()=>location.pathname.startsWith('/submit/review/')&&[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Submit for free review'),run(ctx) {
        return ctx.submit(document.body,ctx.clickables().find(b=>ctx.textOf(b)==='Submit for free review'));
      } },
    ],
    protocol: { transport:'page-js',method:null,action:null,queueDays:null,queueText:'Usually a few days; queue position is not a number of days',terms:'none',verified:'live-receipt',checkedAt:'2026-11-04' },
    note: {en:'Free nofollow review; badge optional. Sign in, check URL, write details (long description ≥400 chars), save draft, then choose Free $0. Optional product pricing left blank; actual pricing in reviewer notes.',zh:'免费nofollow审核，徽章可选。登录→网址查重→手工详情（长描述至少400字符）→保存草稿→Free $0。可选定价不操作，真实产品收费模式写审核备注；排期上限未知。'},
  },
  {
    id: 'waildworld', name: 'Waild World', domain: 'waildworld.com', url: 'https://waildworld.com/', login: false,
    start: /^Submit a tool$/i, form: 'form:has(input[name=title])', maxReviewDays: 3,
    fill: { '[name=title]': 'name', '[name=url]': 'url', '[name=desc]': 'description', '[name=name]': 'fullName', '[name=email]': 'email', '[name=message]': 'description' },
    productPricing: ['input[name="models[]"]'],
    afterFill(ctx, root) {
      for (const [label, name, pick] of [
        ['Product Tags', 'tags[]', null], ['Product Pricing Model', 'models[]', ctx.product.pricing],
      ]) {
        const button = [...root.querySelectorAll('button')].find(b => ctx.textOf(b) === label);
        if (button && button.getAttribute('aria-expanded') !== 'true') button.click();
        const options = [...root.querySelectorAll(`input[name="${name}"]`)].map(el => ({el, text: [...(el.labels || [])].map(l => l.textContent).join(' ') || el.parentElement.textContent}));
        const match = pick ? options.find(o => o.el.value.toLowerCase() === pick.toLowerCase()) : ctx.rankOptions(options)[0];
        if (match && !match.el.checked) match.el.click();
        if (button && button.getAttribute('aria-expanded') === 'true') button.click();
      }
    },
    submit: /^Submit$/i, success: /Thank you for submitting your tool!/i,
    protocol: { transport: 'html-form-page-js', method: 'POST', action: 'index', queueDays: 3, terms: 'submission-accepts', termsUrl: 'https://waildworld.com/terms-of-service', privacyUrl: 'https://waildworld.com/policy', verified: 'live-receipt', checkedAt: '2026-11-04' },
    note: { en: 'Free live submission, no backlink. Receipt estimates 3 days. Submitting accepts terms; product pricing is separate from submission cost.', zh: '实测提交免费、无互链；回执预计3天。提交即接受条款，产品定价与投稿费用分开。' },
  },
  {
    id: 'aimarketing', name: 'AI Marketing Directory', domain: 'aimarketing.directory',
    url: 'https://tally.so/embed/nG1V7j?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1',
    extraHosts: [/^tally\.so$/], extraPath:/^\/embed\/nG1V7j\/?$/, login: false, form: 'form',
    fill: { '[id="e2e74529-7f39-407c-acba-49f16b296c66"]': 'name', '[id="c4fd90a3-f2fe-4df9-a6f2-08f86d373727"]': 'url', '[id="6755a0ea-8261-44db-a68a-38b7670adb44"]': 'description', '[id="51ba7a53-68ff-4eb7-a266-2925e2939a73"]': 'fullName', 'input[type=email]': 'email' },
    submit: /^Submit$/i, success: /^Form submitted$/i,
    protocol: { transport: 'tally-page-js', method: null, action: null, queueDays: null, terms: 'none', verified: 'live-receipt', checkedAt: '2026-11-04' },
    note: { en: 'Free Tally submission, no backlink; queue unknown. Open the observed embed as a full page. Page 2 says Form submitted and only offers optional paid fast-track.', zh: 'Tally实测投稿免费、无互链，排期未知；直接打开已观察到的问卷页面。第2页已显示提交成功，仅附可选付费加速，不点击。' },
  },
  {
    id: 'webcatalog', name: 'WebCatalog', domain: 'webcatalog.io', url: 'https://webcatalog.io/en/apps/submit', login: 'email', emailOnly: true,
    form: 'form:has(#appName)', fill: { '#appName': 'name', '#url': 'url' },
    submit: /^Submit recommendation$/i, success: /The request has been sent successfully\./i,
    steps: [{
      id: 'email-option', label: 'sLogin',
      match: () => /\/login/.test(location.pathname) && !![...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continue with email'),
      async run(ctx) {
        const button = ctx.clickables().find(b => ctx.textOf(b) === 'Continue with email');
        if (!button) return;
        if (!ctx.autoAgree) return ctx.status(ctx.t('bReview', {label:'Continue with email'}), 'warn');
        button.click(); await ctx.sleep(1500);
      },
    }],
    protocol: { transport: 'page-js', method: null, action: null, queueDays: null, terms: 'auth-accepts', termsUrl: 'https://webcatalog.io/legal/terms-of-service', privacyUrl: 'https://webcatalog.io/legal/privacy-policy', verified: 'live-receipt-email-otp', checkedAt: '2026-11-04' },
    note: { en: 'Free app recommendation. Email OTP login; forwarded code read from Gmail. No developer ownership claim is made. Queue unknown.', zh: '免费应用推荐；使用邮箱验证码登录，从转发到Gmail的邮件读取验证码。仅填写名称和网址，不代做开发者归属认证；排期未知。' },
  },
  {
    id: 'aitoolsmarketer', name: 'AI Tools for Marketers', domain: 'aitoolsmarketer.com', url: 'https://aitoolsmarketer.com/submit/', login: false,
    form: '#submit', maxReviewDays: 21,
    fill: { '#tool_url': 'url', '#tool_name': 'name', '#tagline': 'tagline', '#description': 'description', '#marketing_problem': 'description', '#marketing_help': 'useCases', '#marketing_jobs': 'marketingJobs', '#name': 'fullName', '#email': 'email' },
    skip: ['[name=website]', '#secondary_category', '#starting_price', '#pricing_url', '#replaces', '#audience', '#alternative_to', 'input[type=file]', '#demo_video', '#company', '#founded', '#headquarters', '[id^=social_]', '#affiliate_url', '#reader_offer', '#relation'],
    check: ['input[name=launch_preference][value=standard_queue]'],
    productPricing: ['input[name=pricing_model]'],
    afterFill(ctx, root) {
      const tier = {Free:'free', Freemium:'freemium', 'Free Trial':'free_trial', Paid:'paid'}[ctx.product.pricing];
      const radio = tier && root.querySelector(`input[name=pricing_model][value="${tier}"]`);
      if (radio && !radio.checked) radio.click();
    },
    validate(ctx, root) {
      return root.querySelector('input[name=launch_preference][value=standard_queue]:checked') ? [] : ['Choose Standard Editorial Queue; never send fast-track sponsorship requests'];
    },
    submit: /^Submit your tool$/i, success: /^Thanks, .+ is submitted\.$/i,
    protocol: { transport: 'page-js', method: null, action: null, queueDays: 21, queueText: 'standard editorial queue usually 2–3 weeks; email status within 24h', terms: 'none', verified: 'live-receipt', checkedAt: '2026-11-04' },
    note: { en: 'Free standard queue 2–3 weeks, badge optional. Replaces the default fast-track request. Marketing answers use product description, use cases and up to 3 tags; review for fit.', zh: '免费普通队列约2–3周，徽章可选；主动取消默认加速推广。营销问题使用产品描述、用途和最多3个标签，需符合营销场景。' },
  },
  {
    id: 'aitoolsinc', name: 'AI Tools Inc', domain: 'aitools.inc', url: 'https://loxr142exnq.typeform.com/to/RB6ZnEf2', login: false,
    extraHosts: [/^loxr142exnq\.typeform\.com$/], maxReviewDays: 90,
    typeformContact: {
      question: /where can we reach you/i,
      fill: { '[id="79ae6a70-8c70-4401-af9f-844c83bea8ff"]': 'firstName', '[id="a77c3def-7695-4e69-9c08-0b1dd64ad6c7"]': 'lastName', 'input[type=email]': 'email' },
    },
    steps: [{ id: 'typeform', label: 'Typeform', match: () => location.hostname === new URL(siteById('aitoolsinc').url).hostname, run: ctx => ctx.typeform() }],
    success: /We[’']ll be in touch over the next few days to proceed with your listing\./i,
    protocol: { transport: 'typeform-page-js', method: null, action: null, queueDays: 90, queueText: '30–90 day listing time', terms: 'none', verified: 'live-receipt', checkedAt: '2026-11-04' },
    note: { en: 'Free queue 30–90 days. Three questions: tool name, URL, then required first/last name and email. Live receipt verified.', zh: '免费队列 30–90 天；三题：工具名、网址、联系人名/姓/邮箱。姓名缺失时等待补齐；已实测收到回执。' },
  },
  {
    id: 'bestaitools', name: 'Best AI Tools', domain: 'bestaitools.com', url: 'https://www.bestaitools.com/tool-suggestion-form/', login: false,
    form: '#wpforms-form-442',
    fill: { '#wpforms-442-field_0': 'firstName', '#wpforms-442-field_0-last': 'lastName', '#wpforms-442-field_1': 'email', '#wpforms-442-field_3': 'name', '#wpforms-442-field_4': 'url', '#wpforms-442-field_2': 'description' },
    skip: ['#wpforms-442-field_5', '#wpforms-442-field_6'], submit: '#wpforms-submit-442',
    success: /Thanks for suggesting a new tool!/i,
    protocol: { transport: 'wpforms-page-js', method: 'POST', action: '/tool-suggestion-form/', queueDays: null, queueText: 'a few days', terms: 'none', verified: 'live-receipt', checkedAt: '2026-11-04' },
    note: { en: 'Free suggestion form, no reciprocal link. Requires real first/last name; leave both honeypots empty. Queue not quantified. Live receipt verified.', zh: '实测建议表单免费、无互链；需要真实名/姓，两个诱捕字段留空。审核约几天，上限未知；已有回执。' },
  },
  {
    id: 'yjpoo', name: '映技派', domain: 'yjpoo.com', url: 'https://www.yjpoo.com/submit-ai-tool/', login: false,
    form: 'form:has(#attr_28)', fill: { '#attr_28': 'name', '#attr_30': 'url', '#attr_38': 'description' },
    submit: 'input[type=submit]', reviewBeforeSubmit: true, maxReviewDays: 1,
    success: /^操作成功$/,
    protocol: { transport: 'html-form', method: 'POST', action: '/index.php?m=home&c=Lists&a=gbook_submit&lang=cn', encoding: 'multipart/form-data', queueDays: 1, queueText: '一般24小时内审核', terms: 'none', verified: 'live-receipt', checkedAt: '2026-11-04' },
    note: { en: 'Free, no backlink; usually reviewed within 24h. Search for an existing listing before the final manual click. Live text receipt verified; screenshot was after its 5s redirect.', zh: '实测免费、无互链，一般24小时审核；先站内查重，再人工最终点击。已读到“操作成功”，截图为5秒跳转后页面。' },
  },
  {
    id: 'launchingnext', name: 'Launching Next', domain: 'launchingnext.com', url: 'https://www.launchingnext.com/submit/', login: false,
    form: 'form:has([name=startupname])',
    fill: { '[name=startupname]': 'name', '[name=startupurl]': 'url', '[name=description]': 'launchHeadline', '[name=fulldescription]': 'description', '[name=tags]': 'tags', '[name=user]': 'fullName', '[name=email]': 'email' },
    skip: ['[name=funding]', '[name=marketing_budget]', '[name=newsletter_optin]', '[name=math]'],
    humanFields: ['input[name=math]'], submit: 'input[name=formSubmit]',
    success: /thank you|thanks for|submission.*received|startup.*submitted|successfully submitted/i,
    protocol: { transport: 'html-form', method: 'POST', action: '/submit/', encoding: 'application/x-www-form-urlencoded', queueDays: null, terms: 'none', verified: 'form-only-human-check', checkedAt: '2026-11-03' },
    note: { en: 'Free ordinary submission; queue unknown. Fill the quick human check yourself; optional funding/budget/newsletter remain untouched. Skip the optional $99 upgrade.', zh: '普通提交免费、排期未知；手动填写人机校验后继续，融资/预算/订阅不代填；不购买后续 $99 加速。' },
  },
  {
    id: 'futuretools', name: 'Future Tools', domain: 'futuretools.io', url: 'https://futuretools.io/submit-a-tool', login: false,
    form: 'form:has(#tool_name)', skip: ['[name=newsletter_opt_in]'],
    productPricing: ['input[name=pricing_tier]'],
    fill: { '#tool_name': 'name', '#tool_url': 'url', '#description': 'description', '#submitter_email': 'email' },
    afterFill(ctx, root) {
      const tier = {Free:'free', Freemium:'freemium', Paid:'paid', 'Free Trial':'free_trial'}[ctx.product.pricing];
      const radio = tier && root.querySelector(`input[name=pricing_tier][value=${tier}]`);
      if (radio && !radio.checked) radio.click();
    },
    validate(ctx, root) {
      const chosen = root.querySelector('input[name=pricing_tier]:checked');
      if (ctx.product.pricing === 'Free Trial' && chosen?.value !== 'free_trial') return ['No matching Free Trial product pricing option; review manually'];
      return chosen ? [] : ['Choose the product pricing model'];
    },
    submit: /^Submit Tool$/i, success: /thank you|thanks for|submitted successfully|submission.*received|we[’']ll review/i,
    protocol: { transport: 'page-js', method: null, action: null, queueDays: null, terms: 'none', verified: 'form-only-captcha-blocked', checkedAt: '2026-11-03' },
    note: { en: 'Free form; queue unknown. Product pricing is independent of submission cost. Complete CAPTCHA yourself.', zh: '免费投稿表单，排期未知；产品定价与投稿费用分开。实测被验证码拦截，需手动完成。' },
  },
  {
    id: 'aitoolslibrary', name: 'AI Tools Library', domain: 'aitools.sh', url: 'https://aitools.sh/submit-a-tool/', login: false,
    form: 'form:has(#tool_name)',
    fill: { '#tool_name': 'name', '#tool_url': 'url', '#tool_description': 'description', '#tool_tags': 'tags', '#submitter_name': 'fullName', '#submitter_email': 'email' },
    afterFill(ctx, root) {
      const sel = root.querySelector('#tool_pricing');
      const label = ctx.product.pricing === 'Paid' ? 'Paid/Premium' : ctx.product.pricing === 'Free Trial' ? 'Free Trial' : ['Free', 'Freemium'].includes(ctx.product.pricing) ? 'Free/Freemium' : '';
      if (label) ctx.setField(sel, label);
    },
    validate(ctx, root) {
      return ctx.product.pricing === 'Free Trial' && !/^free trial$/i.test(root.querySelector('#tool_pricing')?.selectedOptions[0]?.text || '') ? ['No matching Free Trial product pricing option; review manually'] : [];
    },
    submit: /^Submit for review$/i,
    success: /Thanks! Your tool was submitted and is pending review\./i,
    protocol: { transport: 'html-form', method: 'POST', action: 'https://aitools.sh/wp-admin/admin-post.php', encoding: 'application/x-www-form-urlencoded', queueDays: null, terms: 'none', verified: 'live-receipt', checkedAt: '2026-11-03' },
    note: { en: 'Free ordinary submission, no backlink. Queue unknown; live receipt verified.', zh: '普通投稿实测免费、无需互链；排期未知。已收到审核回执。' },
  },
  {
    id: 'reviewai', name: 'ReviewAI', domain: 'reviewai.net', url: 'https://reviewai.net/#submit', login: false,
    form: '#add-form',
    fill: { '[name=name]': 'name', '[name=url]': 'url', '[name=desc]': 'description', '[name=email]': 'email' },
    skip: ['[name=website]'], submit: /^Submit for review$/i,
    success: /Thanks! We[’']ll review your tool and publish it soon\./i,
    protocol: { transport: 'page-js', method: null, action: null, queueDays: null, terms: 'none', verified: 'live-receipt', checkedAt: '2026-11-03' },
    note: { en: 'Free, no backlink; queue unknown. Live receipt verified.', zh: '免费、无需互链；排期未知。已实测收到审核回执。' },
  },
  {
    id: 'humanornot', name: 'Human or Not', domain: 'humanornot.co', url: 'https://www.humanornot.co/submit-tool', login: false,
    form: '#wf-form-Tool-submit', fill: { '#Email-2': 'email', '#URL-2': 'url' },
    submit: '#wf-form-Tool-submit input[type=submit]',
    success: /Thank you! Your submission has been received!/i,
    maxReviewDays: 2,
    protocol: { transport: 'webflow-js', method: null, action: null, queueDays: 2, terms: 'none', verified: 'live-receipt', checkedAt: '2026-11-03' },
    note: { en: 'Free; URL and email only; publication within 48 hours. Live receipt verified.', zh: '免费，仅网址和邮箱；标明 48 小时内发布。已实测收到审核回执。' },
  },
  {
    id: 'thetoolbus', name: 'TheToolBus', domain: 'thetoolbus.ai', url: 'https://www.thetoolbus.ai/ai-tools/submit', login: false,
    form: '#submit-form', skip: ['[name=_honey]'],
    fill: { '#tool-name': 'name', '#tool-url': 'url', '#tool-description': 'description', '#submitter-email': 'email', '#tool-pricing': 'pricing' },
    check: ['input[name=placement][value=directory]'], free: /^Directory listing\s+Free\b/i,
    afterFill(ctx, root) {
      const media = /video|audio|image|字幕|视频/i.test([ctx.product.name, ctx.product.tagline, ...(ctx.product.tags || [])].join(' '));
      ctx.setField(root.querySelector('#tool-category'), media ? 'Media Tools' : 'AI Tools');
    },
    validate(ctx, root) {
      return ctx.product.pricing === 'Free Trial' && !/^free trial$/i.test(root.querySelector('#tool-pricing')?.selectedOptions[0]?.text || '') ? ['No matching Free Trial product pricing option; review manually'] : [];
    },
    submit: /^Submit Tool$/i,
    success: /Tool submitted|Thanks for your submission\. We[’']ll review it/i,
    protocol: { transport: 'html-form', method: 'POST', action: '/api/forms?form=ai_tool_submission', encoding: 'application/x-www-form-urlencoded', queueDays: null, queueText: 'within a few days', terms: 'none', verified: 'live-receipt', checkedAt: '2026-11-03' },
    note: { en: 'Free Directory listing; Sponsored is excluded. Review in a few days. Product pricing is independent of listing fees.', zh: '选择免费 Directory listing，排除 Sponsored；审核约几天。产品定价与收录费用分开。' },
  },
  {
    id: 'jayde', name: 'Jayde', domain: 'jayde.com', url: 'https://www.jayde.com/submit.html', login: false,
    form: '#submission-form',
    fill: { '#f-url': 'url', '#f-email': 'email', '#f-business': 'name', '#f-description': 'description' },
    // Optional personal/address/social fields are intentionally left untouched.
    skip: ['[name=company_website]', '#f-name', '#f-address', '#f-phone', '#f-zip', '#f-country', '#f-state', '#f-industry', '#f-facebook', '#f-twitter', '#f-youtube', '#f-logo', '#f-gmap'],
    submit: /^Add my Site$/i, success: /Your site has been added to the directory\./i, maxReviewDays: 0,
    protocol: { transport: 'html-form', method: 'POST', action: '/submit.html', encoding: 'application/x-www-form-urlencoded', queueDays: 0, terms: 'submission-accepts', termsUrl: 'https://www.jayde.com/terms.html', verified: 'live-listed', checkedAt: '2026-11-03' },
    note: { en: 'Free, instant listing. Submitting accepts Jayde terms; controlled by the Agree to terms setting.', zh: '免费即时收录；提交即接受 Jayde 条款，受“自动勾选同意条款”设置控制。' },
  },
  {
    id: 'kisuche', name: 'KI-Suche', domain: 'ki-suche.io', url: 'https://www.ki-suche.io/einreichen', login: false,
    form: 'form:has([name=tag_slug])', skip: ['[name=company]'],
    fill: { '[name=title]': 'name', '[name=url]': 'url', '[name=description]': 'description' },
    submit: /^Tool einreichen$/i, success: /Danke für deine Einreichung!/i,
    protocol: { transport: 'page-js', method: null, action: null, formMethod: 'POST', queueDays: null, terms: 'none', verified: 'live-receipt', checkedAt: '2026-11-03' },
    note: { en: 'Free; category required, description ≤600 characters; queue unknown. Live receipt verified.', zh: '免费，分类必选、描述最多 600 字；排期未知。已实测收到审核回执。' },
  },
  {
    id: 'ai138', name: 'AI工具网', domain: 'ai138.com', url: 'https://www.ai138.com/submit', login: false,
    form: 'form:has([name=post_title])',
    fill: { '[name=post_title]': 'name', '[name=link]': 'url', '[name=sescribe]': 'tagline', '[name=post_content]': 'description', '[name=tags]': 'tags', '[name=user_name]': 'fullName', '[name=contact_details]': 'email' },
    beforeFill() {
      document.querySelector('.tg-plan[data-plan=free]')?.click();
    },
    afterFill(ctx, root) {
      if (/video|视频/i.test([ctx.product.name, ctx.product.tagline, ...(ctx.product.tags || [])].join(' '))) {
        const sel = root.querySelector('#post_cat');
        const opt = sel && [...sel.options].find(o => /AI视频编辑器/.test(o.text));
        if (opt) ctx.setField(sel, opt.text.trim());
      }
    },
    submit: /^提交审核$/,
    validate(ctx, root) {
      const errors = [];
      if (!document.querySelector('.tg-plan[data-plan=free].active') || document.querySelector('#submitTotalNum')?.textContent.trim() !== '0') errors.push('Free listing with zero total is required');
      for (const name of ['post_title', 'link', 'sescribe']) if (!root.querySelector(`[name=${name}]`)?.value.trim()) errors.push(`Missing ${name}`);
      return errors;
    },
    success: /提交成功|投稿成功|已收到您的投稿|已提交.*审核/,
    protocol: { transport: 'page-js', method: null, action: null, queueDays: null, terms: 'none', verified: 'live-attempt-unconfirmed', checkedAt: '2026-11-03' },
    note: { en: 'Free submission, optional backlink. Queue unknown; live attempt has no confirmed receipt yet.', zh: '免费提交，互链可选；排期未知。实测已点击，尚无明确回执，不应重复提交 RTFV。' },
  },
  {
    id: 'withaitools',
    name: 'With AI Tools',
    domain: 'withaitools.com',
    url: 'https://www.withaitools.com/submit',
    login: false,
    form: 'form:has(input[type=url])',
    submit:/^Submit$/i,
    success:/^Your tool (?:has been |was )?(?:submitted|listed|added)(?: successfully)?[.!]?$/i,
    steps:[{id:'already-listed',label:'sForm',match:()=>[...document.querySelectorAll('h2')].some(h=>h.textContent.trim()==='Already listed'),run(ctx){ctx.fail('Already listed: verify the existing public entry; do not submit again or rename.');}},
      {id:'public-listing',label:'sForm',match:()=>location.pathname.startsWith('/tools/')&&!!document.querySelector('h1'),run(ctx){
        const domain=new URL(ctx.product.url).hostname.replace(/^www\./,'');
        const own=[...document.querySelectorAll('a[href]')].some(a=>{try{return new URL(a.href).hostname.replace(/^www\./,'')===domain;}catch(e){return false;}});
        if(own)ctx.fail('Already listed: public website verified; do not count this as a new submission. '+document.querySelector('h1').textContent.trim());else ctx.status('Verify that the public listing links to the actual product website','warn');
      }}],
    protocol:{transport:'page-js',method:null,action:null,queueDays:null,queueText:'Existing listing verified; new listing queue unknown',terms:'none',verified:'live-existing-public-listing',checkedAt:'2026-11-05',freeStatus:'Pricing says every tool gets a free listing forever; RTFV already existed since2026-10-14'},
    note: { en: 'Free URL-only extraction. Already listed stops for deduplication, not a new receipt. Verify the public website link; site-generated pricing may be inaccurate.', zh: '免费URL自动提取。Already listed按已有去重，不算新回执；核对公开页面官网链接。站点生成的定价可能不准确。' },
  },
  {
    id: 'apprater',
    name: 'AppRater',
    domain: 'apprater.net',
    url: 'https://apprater.net/#submit',
    login: false,
    form: 'form:has([name=appUrl])',
    skip: ['input[name=website]'], // unlabelled honeypot
    check: ['input[name=platform][value="Web" i]'],
    note: { en: 'No account: name, URL, description, tags, submitter name and email', zh: '免登录：App 名称、网址、介绍、标签、提交人姓名和邮箱' },
  },
  {
    id: 'aigist',
    name: 'Aigist',
    domain: 'aigist.org',
    url: 'https://aigist.org/submit-tool',
    login: false,
    form: 'form:has([name=short_description])',
    fill:{'[name=title]':'name','[name=url]':'url','[name=short_description]':'tagline','[name=full_description]':'description','[name=email]':'email','#contact_first_name':'firstName'},
    skip:['#starting_price','#main_alternative','#wants_visibility_finding','#buyer_description','#newsletter_email'],
    category: { select: '#category_selector' }, // each choice adds a chip to categories_json
    afterFill(ctx,root){for(const checkbox of root.querySelectorAll('[name="pricing_options[]"]')){const chosen=checkbox.value===ctx.product.pricing;if(checkbox.checked!==chosen)checkbox.click();}},
    validate(ctx,root){return [...root.querySelectorAll('[name="pricing_options[]"]')].some(e=>e.value===ctx.product.pricing&&e.checked)?[]:['Select the exact product pricing option'];},
    success:/^(?:Thank you for (?:your submission|submitting your tool)|Your tool (?:has been )?submitted successfully)/i,
    protocol:{transport:'html-form',method:'POST',action:'/submit-tool-action.php',queueDays:null,queueText:'Usually5 business days',terms:'none',verified:'live-form-captcha-blocked',checkedAt:'2026-11-05'},
    note: { en: 'Free manual review, usually5 business days. Exact Free Trial checkbox supported; no visibility email opt-in. Wait for reCAPTCHA; live submission skipped as requested.', zh: '免费人工审核，通常5工作日；支持精确Free Trial，不勾选增值邮件。等待人工reCAPTCHA，本批按要求跳过实投。' },
  },
  {
    id: 'rankmyai',
    name: 'RankmyAI',
    domain: 'rankmyai.com',
    url: 'https://www.rankmyai.com/tool-addition',
    login: false,
    form: 'form:has([name=your-email])',
    fill:{'#your-name':'fullName','#your-email':'email','#what-is-the-name-of-the-tool':'name','#tool-website-url-or-subdomain':'url','#use-what-are-the-most-prominent-use-cases-or-functionalities-of-your-tool':'useCases','#give-a-short-description-of-your-tool':'description','#legal-company-name-or-developers-full-name-if-not-a-company':'legalName','#pricing-paidfreemiumfree':'pricing'},
    skip:['#legal-company-name-or-developers-full-name-if-not-a-company','#what-is-the-producthunt-profile-link-of-your-tool','#official-company-registration-number-if-applicable','#company-website','#linkedin-url','#year-founded-in-which-year-was-your-business-founded','#number-of-employees','#country-where-the-headquarter-of-the-company-is-located','#stateprovince-where-the-headquarter-of-the-company-is-located','#city-where-the-headquarter-of-the-company-is-located','#street-address-of-the-companys-headquarters','#postal-code-of-the-companys-headquarters','#what-is-the-pricing-page-url-of-your-tool','#api-availability-yesno','#mcp-connector-availability-yesno'],
    submit:/^Send(?:\s|$)/i,
    validate(ctx,root){
      const required=['#your-name','#your-email','#what-is-the-name-of-the-tool','#tool-website-url-or-subdomain','#use-what-are-the-most-prominent-use-cases-or-functionalities-of-your-tool','#give-a-short-description-of-your-tool','#legal-company-name-or-developers-full-name-if-not-a-company'];
      const missing=required.filter(sel=>!root.querySelector(sel)?.value.trim()).map(sel=>sel.slice(1));
      if(!ctx.valueOf('legalName'))missing.push('Confirm the legal company name or actual individual developer; contact name is not proof');
      if(!ctx.valueOf('firstName')&&!ctx.valueOf('lastName'))missing.push('Provide the real submitter name');
      return missing;
    },
    success:/^(?:Thank you.*(?:submission|tool|information)|Your (?:tool|submission).*(?:received|submitted)|Message sent successfully)/i,
    protocol:{transport:'page-js-form',method:'POST',action:'https://www.rankmyai.com/ajax/addition-form',queueDays:null,terms:'none-observed',verified:'live-attempt-unconfirmed',checkedAt:'2026-11-05',freeStatus:'Official tool addition form explicitly free of charge; no required backlink'},
    note: { en: 'Free; dedicated website and significant AI component required. Legal company/developer identity is a separate confirmed product field, never the brand or contact by inference. Optional corporate facts/API/MCP/socials left blank. Free Trial fits free-text pricing; queue unknown. RTFV attempt cleared the form without a receipt; never retry blindly.', zh: '官方明确免费，需独立网址和主要AI功能。合法公司/开发者身份须单独确认，不从产品品牌或联系人推断；未知公司资料/API/MCP/社交留空。Free Trial可写自由文本定价；排期未知。RTFV已尝试但清空表单后无回执，不盲目重投。' },
  },
  {
    id: 'exactseek',
    name: 'ExactSeek',
    domain: 'exactseek.com',
    url: 'https://www.exactseek.com/add.html',
    login: false,
    form: 'form:has(#URL)',
    // One <label> wraps the whole table, so the generic matching can't tell the fields apart.
    fill: { '#URL': 'url', '#NAME': 'fullName', '#EMAIL': 'email' },
    check: ['input[name=agree]'],
    confirmEmail: true,
    success:/^(?:Thank you.*(?:submi|adding)|Your (?:site|submission).*(?:received|added|submitted)|Please (?:check|verify|confirm) your email)/i,
    protocol:{transport:'html-form',method:'POST',action:'/cgi-bin/eadd-t-new.cgi',queueDays:null,terms:'submission-accepts',termsUrl:'https://www.exactseek.com/terms.html',accountSideEffect:'SiteProNews webmaster newsletter; explicit user consent required',verified:'live-attempt-unconfirmed',checkedAt:'2026-11-05'},
    note: { en: 'Free URL/name/email; actively agree to terms and attached SiteProNews subscription. Email verification needed. Empty CGI header is not a receipt; uncertain attempts must not be retried.', zh: '免费网址/姓名/邮箱；主动同意条款及附带SiteProNews订阅，需要邮件验证。空白CGI页头不算回执，未确认尝试不重投。' },
  },
  {
    id: 'activesearchresults',
    name: 'Active Search Results',
    domain: 'activesearchresults.com',
    url: 'https://www.activesearchresults.com/addwebsite.php',
    login: false,
    form:'form:has(input[name=url])',fill:{'input[name=url]':'url','input[name=email]':'email'},
    submit: 'input[name=submiturl]',
    confirmEmail: false,
    steps:[{id:'accept-cookies',label:'sForm',match:()=>!!document.querySelector('#asr-cookie-accept'),async run(ctx){document.querySelector('#asr-cookie-accept').click();await ctx.sleep(300);}}],
    success:/^(?:Added Web Site Confirmation|Thank you for adding your Web site to the Active Search Results search engine\.)$/i,
    protocol:{transport:'html-form',method:'POST',action:'/addwebsite.php',queueDays:1,queueText:'Usually1–2hours; hourly crawl/index, no sign-in or email activation',terms:'none',verified:'live-receipt',checkedAt:'2026-11-05'},
    note: { en: 'Live free receipt verified. URL + email; usually searchable in1–2hours. Official form explicitly requires no sign-in or email activation.', zh: '已实测免费回执；网址+邮箱，通常1–2小时可搜索。官网明确无需登录或邮件激活，插件不再等待不存在的确认邮件。' },
  },
  {
    id: 'nextools',
    name: 'NexTools',
    domain: 'nextools.live',
    url: 'https://nextools.live/contact/',
    login: false,
    form: 'form.wpforms-form',
    reviewBeforeSubmit:true,
    skip:['#wpforms-3161-field_4','#wpforms-3161-field_5'],
    submit:/^Submit$/i,success:/^(?:Thanks for contacting us!|Your message has been sent successfully\.|Thank you for contacting us\.)/i,
    // No submission page: send the request through the contact form.
    fill: {
      '[name="wpforms[fields][0]"]': 'fullName',
      '[name="wpforms[fields][1]"]': 'email',
      '[name="wpforms[fields][3]"]': 'contactSubject',
      '[name="wpforms[fields][2]"]': 'contactMessage',
    },
    protocol:{transport:'wpforms-page-js',method:'POST',action:'/contact/',queueDays:null,queueText:'Contact response24–48hours, listing queue unknown',terms:'none',verified:'live-attempt-unconfirmed',checkedAt:'2026-11-05',freeStatus:'Contact request is free; directory eligibility awaits response'},
    note: { en: 'Contact listing request, not guaranteed inclusion. Fill and review fee eligibility. RTFV attempt has no receipt; do not retry. Ignore incorrect email-domain suggestion.', zh: '联系表单收录申请，不保证收录；先填表核实免费资格。RTFV已尝试但无回执，不重投；忽略错误邮箱域名建议。' },
  },
  {
    id: 'aitoolboard',
    name: 'AIToolboard',
    domain: 'aitoolboard.com',
    url: 'https://aitoolboard.com/submit',
    login: 'email',
    form: 'form:has([name=listing_type])',
    // Unlabelled inputs (placeholders only). Category and pricing are plain selects; "Tool Image" and "Company Logo"
    // are uploads. Submitting shows a native alert, then lands on /my-account?tab=tools with the tool "Pending".
    fill: {
      'input[placeholder^="e.g., ChatGPT"]': 'name',
      'input[placeholder^="Brief description"]': 'tagline',
      'input[placeholder^="http://example.com"]': 'url',
      'input[placeholder^="AI, chatbot"]': 'tags',
    },
    free: /^free listing/i,
    reviewBeforeSubmit:true,
    validate(ctx,root){
      const pricing=[...root.querySelectorAll('select')].find(s=>[...s.options].some(o=>/^Enterprise$/i.test(o.text.trim())));
      return pricing && ![...pricing.options].some(o=>o.text.trim().toLowerCase()===ctx.valueOf('pricing').toLowerCase())?['No exact product pricing option; never replace Free Trial with Free, Freemium or Paid']:[];
    },
    protocol:{transport:'page-js',method:null,action:null,queueDays:null,terms:'unknown',verified:'live-form-pricing-blocked',checkedAt:'2026-11-05'},
    note: { en: 'Free Listing selected; required product pricing has no Free Trial. Image required. Review only until exact pricing is available.', zh: '可选Free Listing，但必填产品定价无Free Trial；必需工具图片，默认填表后暂停检查。' },
  },
  {
    id: 'youtools',
    name: 'YouTools',
    domain: 'youtools.ai',
    url: 'https://youtools.ai/submit-tool',
    login: 'oauth',
    form: 'form:has([name=root_domain])',
    fill: { '[name=root_domain]': 'rootUrl' },
    free: /^free\s*\$0/i,
    submit: /^submit for review(?:\s*\((?:free|\$0(?:\.00)?)\))?$/i,
    protocol:{transport:'page-js',method:null,action:null,queueDays:21,queueText:'Free2–3weeks; nofollow',terms:'unknown',verified:'live-free-form-login-skipped',checkedAt:'2026-11-05'},
    note: { en: 'Select Free $0 instead of default paid Basic; 2–3 weeks, nofollow. Google sign-in on submit was skipped by user; later Pick3 flow is an older adapter, not verified this time.', zh: '从默认付费Basic切换Free $0（2–3周、nofollow）；提交弹Google登录，用户选择跳过。后续Pick3为旧配置，本轮未验证。' },
    steps: [
      {
        // Free plan: after Submit, tick three listed tools and press Next (then it goes back to the home page).
        id: 'pick3',
        label: 'sForm',
        match: () => [...document.querySelectorAll('[role=dialog]')].some((d) => /pick 3 better tools/i.test(d.textContent)),
        run: (ctx) => ctx.pickInDialog(/pick 3 better tools/i, 3, /^next$/i),
      },
    ],
  },
  {
    id: 'baitools',
    name: 'BAI.tools',
    domain: 'bai.tools',
    maxReviewDays: 180, // published free queue: 1–6 months
    url: 'https://bai.tools/submit-ai-tools',
    login: 'oauth',
    // FREE LISTING is preselected (a card, not a button). Signed out, Submit goes to /api/auth/signin (Google);
    // signed in, it posts and lands on /finish ("Submission Successful"). Submissions are listed at /my.
    submit: /^submit your ai tool$/i,
    note: { en: 'Name + URL, FREE LISTING (standard review 1–6 months); Google sign-in', zh: '名称 + 网址，FREE LISTING（普通审核约 1–6 个月）；Google 登录' },
  },
  {
    id: 'startupstash',
    name: 'Startup Stash',
    domain: 'startupstash.com',
    extraHosts: [/^form\.typeform\.com$/],
    extraPath:/^\/to\/b8EyDE\/?$/,
    url: 'https://form.typeform.com/to/b8EyDE',
    login: false,
    reviewBeforeSubmit:true,
    typeformPause:/advertise with us/i,
    protocol:{transport:'typeform-page',method:null,action:null,queueDays:null,terms:'unknown',verified:'live-form-review-only',checkedAt:'2026-11-05',freeStatus:'Listing application reaches thank-you when advertising is answered No. Yes opens campaign timing and a budget starting under $3,000. Work email required; Gmail, Outlook and Yahoo are rejected. Category list includes Videos.'},
    note: { en: 'Typeform now loads. It asks for name, work email, product name, short and long descriptions, URL, category and logo. Answer No to advertising; that skips the paid campaign questions and ends the listing application. The plugin pauses on that question. Not submitted.', zh: '问卷现在可以打开。要姓名、工作邮箱、产品名、短描述、长描述、网址、分类和 Logo。广告问题必须答 No，才会跳过付费投放和预算题并结束收录申请。插件停在这一题，未投稿。' },
    steps: [
      {
        id: 'typeform',
        label: 'Typeform',
        match: () => location.hostname === 'form.typeform.com' && /^\/to\/b8EyDE\/?$/.test(location.pathname),
        run: (ctx) => ctx.typeform(),
      },
    ],
  },
  {
    id: 'brownbook',
    name: 'Brownbook',
    domain: 'brownbook.net',
    url: 'https://www.brownbook.net/add-business',
    login: 'email',
    form: 'form:has([name=zip_code])',
    fill: {
      '[name=name]': 'name',
      '[name=address]': 'street',
      '[name=city]': 'city',
      '[name=zip_code]': 'zip',
      '[name=phone]': 'phone',
      '[name=website]': 'url',
      '[name=display_website]': 'url',
      '[name=email]': 'email',
    },
    reviewBeforeSubmit:true,
    draftSubmit:/^Next$/i,
    steps:[{id:'registration-review',label:'sSignup',match:()=>[...document.querySelectorAll('input[type=password]')].filter(e=>e.getClientRects().length).length>1,run(ctx){ctx.status('Complete account registration, terms and CAPTCHA yourself; no new password will be filled','warn');}}],
    beforeFill: async (ctx, form) => {
      const category = [...form.querySelectorAll('input')].find(i => /select category/i.test(i.placeholder));
      if(category && !category.value && /software|video|AI/i.test((ctx.product.tags || []).join(' '))){
        category.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));category.click();await ctx.sleep(800);
        const search=[...document.querySelectorAll('input')].find(i=>/search categories/i.test(i.placeholder));
        if(search){
          ctx.setField(search,'software');await ctx.sleep(1800);
          // Never select an arbitrary first result or an unrelated industry code.
          const option=[...document.querySelectorAll('[role=option]')].find(o=>/^Software Publishers(?:\s|$)/i.test(ctx.textOf(o)));
          option?.click();await ctx.sleep(500);
        }
      }
      const country=[...form.querySelectorAll('button[role=combobox]')].find(b=>/select country/i.test(ctx.textOf(b)));
      const value=ctx.valueOf('country');
      if(country && value){
        country.click();await ctx.sleep(500);
        const search=document.querySelector('input[placeholder="Search countries..."]');
        if(search){ctx.setField(search,value);await ctx.sleep(500);}
        const option=[...document.querySelectorAll('[role=option]')].find(o=>ctx.textOf(o).trim().toLowerCase()===value.toLowerCase());
        option?.click();await ctx.sleep(500);
      }
    },
    validate(ctx){return ctx.valueOf('country')?[]:['Provide the actual business country; never infer it from language or timezone'];},
    success:/^Your business (?:has been |was )?(?:added|submitted) successfully[.!]?$/i,
    protocol:{transport:'page-js',method:null,action:null,queueDays:null,terms:'registration-accepts',verified:'live-registration-captcha-blocked',checkedAt:'2026-11-05',category:'Software Publishers NAICS513210 for software products; exact match only'},
    note: { en: 'Per-product actual country required. Address and phone are optional in observed form. Step2 needs registration, terms and CAPTCHA; review only, no automatic credential entry.', zh: '使用每个产品的真实经营国家；本轮地址电话可选。第二步需注册、条款和验证码，默认暂停检查，不自动录入新密码。' },
  },
  {
    id: 'chatableapps',
    name: 'ChatableApps',
    domain: 'chatableapps.com',
    url: 'https://chatableapps.com/submit',
    login: 'email',
    emailOnly:true,
    reviewBeforeSubmit:true,
    start: /^(start your listing|start free)$/i,
    // "Start your listing" → sign-in dialog (Google or magic link) → /dashboard/tools/create, a wizard:
    // notice → basics & media → details → extras → launch post → plan (Standard preselected: switch to Free) → Create.
    // Success lands on /fast-pass?source=submit-success ("Your submission is in the queue").
    free: /^free plan/i,
    submit: /^(next|create)$/i,
    draftSubmit:/^Next$/i,
    productPricing:['[id="form.price_type"]'],
    findSubmit(ctx,root){const buttons=[...root.querySelectorAll('button')].filter(ctx.shown);return buttons.find(b=>ctx.textOf(b)==='Next')||buttons.find(b=>ctx.textOf(b)==='Create')||null;},
    validate(ctx,root){return root.querySelector('[id="form.price_type"]')&&ctx.valueOf('pricing')==='Free Trial'?['No exact Free Trial product-pricing option; never replace it with Free, Paid or Freemium']:[];},
    fill: {
      '[id="form.name"]': 'name',
      '[id="form.short_description.en"]': 'tagline',
      '[id="form.long_description.en"]': 'description',
      '[id="form.url"]': 'url',
    },
    beforeFill: async (ctx, form) => {
      // Let the site's Smart Autofill draft everything it can (pricing, media…) first; ours overwrites the basics.
      if(ctx.valueOf('pricing')==='Free Trial')return; // required enum has no exact Free Trial; do not generate a wrong model
      const auto = document.getElementById('form.autofill_url');
      if (auto && ctx.shown(auto) && !auto.value) {
        ctx.setField(auto, ctx.valueOf('rootUrl'));
        const go = [...form.querySelectorAll('button')].find((b) => /^autofill$/i.test(ctx.textOf(b)));
        if (go) {
          ctx.status(ctx.t('bAutofill'));
          go.click();
          await ctx.sleep(30000);
        }
      }
      const chips = { 'form.advantages.en': 'features', 'form.core_features.en': 'features', 'form.use_cases.en': 'useCases' };
      for (const [id, key] of Object.entries(chips)) {
        const input = document.getElementById(id);
        const box = input && input.closest('div').parentElement;
        // Already has chips (autofill or an earlier pass): leave it.
        if (input && ctx.shown(input) && box && !box.querySelector('[class*=badge], [class*=tag-item], .fi-badge')) {
          await ctx.addChips(input, ctx.valueOf(key).split(/\n|,/));
        }
      }
    },
    protocol:{transport:'page-js',method:null,action:null,queueDays:30,queueText:'Free about one month; nofollow',terms:'unknown',verified:'live-authenticated-pricing-blocked',checkedAt:'2026-11-05',productPricingOptions:['Free','Paid','Freemium (Free + Paid)']},
    note: { en: 'Email magic link can land in Spam. Authenticated, own tools empty. Free listing about a month, but required product pricing has no Free Trial: RTFV stops. Prefer active Next over persistent Create; Next is draft. No false pricing or final submission.', zh: '邮箱magic link可能进垃圾邮件；已登录、本人工具清单为空。免费收录约一个月，但产品定价必填且无Free Trial，RTFV停止。优先Next而非始终显示的Create；Next只算草稿，不误填定价或最终投稿。' },
  },
  {
    id: 'trylaunch',
    name: 'Launch',
    domain: 'trylaunch.ai',
    url: 'https://trylaunch.ai/submit',
    login: 'oauth',
    // Five-step wizard in one form: launch type + name/tagline/URL → icon + hero image → description, categories,
    // platform → plan (Free is preselected) → review ("Submit to Launch"). Listed under /my-products as Scheduled.
    form: 'main form',
    submit: /^(next|submit to launch)$/i,
    check: ['#platform-web'],
    beforeFill: async (ctx, form) => {
      const nameShown = [...form.querySelectorAll('[name=name]')].some(ctx.shown);
      const founder = [...form.querySelectorAll('button, [role=radio]')].find((b) => /founder launch/i.test(ctx.textOf(b)));
      if (founder && !nameShown) {
        founder.click();
        await ctx.sleep(1200);
      }
      const cats = [...form.querySelectorAll('*')].find((e) => /^Categories/i.test(ctx.textOf(e)) && e.querySelector('[role=checkbox]'));
      if (cats) await ctx.pickCheckboxes(cats.parentElement || cats, 1);
    },
    note: { en: 'Five steps; icon and hero image required; Free plan launches after the paid queue (~7 days); Google sign-in', zh: '五步向导；图标和 Hero 图必传；Free 排在付费之后（约 7 天上线）；Google 登录' },
  },
  {
    id: 'bestofai',
    name: 'BestofAI',
    domain: 'bestofai.com',
    url: 'https://bestofai.com/',
    login: 'email',
    emailOnly:true,
    reviewBeforeSubmit:true,
    // The header's "Add Tool" opens the sign-in box (Google, or e-mail + password); signed in it is a link to
    // /tool/add: category (a button opening a searchable list of checkboxes), URL, title, tags, description →
    // "Submit Tool" → /success ("… was successfully added and now is under review!").
    start: /^(add tool|submit a tool)$/i,
    form: 'form:has([name=url])',
    submit: /^submit tool$/i,
    fill: {
      '#url': 'url',
      '#title': 'name',
      '#tags': 'tags',
      '#description': 'description',
    },
    beforeFill: async (ctx, form) => {
      // Category: a button that opens a searchable list of checkboxes; pick the one that fits the product.
      const boxes = [...form.querySelectorAll('input[type=checkbox][name=category]')];
      const opener = [...form.querySelectorAll('button')].find((b) => /tool categories/i.test(ctx.textOf(b)));
      if (!opener || !boxes.length || boxes.some((b) => b.checked)) return;
      opener.click();
      await ctx.sleep(900);
      await ctx.pickCheckboxes(boxes[0].closest('ul') || form, 1);
      const done = [...form.querySelectorAll('button')].find((b) => /^select$/i.test(ctx.textOf(b)) && ctx.shown(b));
      if (done) {
        done.click();
        await ctx.sleep(600);
      }
    },
    steps:[{id:'verified-account-error',label:'sLogin',match:()=>[...document.querySelectorAll('h1')].some(h=>/404.*Something went wrong/i.test(h.textContent))&&/User not found/i.test(document.body.innerText),run(ctx){ctx.fail('Verified account reached User not found on the submission page; stop without registering another account or submitting again');}}],
    protocol:{transport:'page-js',method:null,action:null,queueDays:null,terms:'unknown',verified:'live-auth-verified-site-error',checkedAt:'2026-11-05',freeStatus:'Authenticated submission page returns User not found; listing eligibility unverified'},
    note: { en: 'Email/password account and email verification completed. /tool/add returns404 User not found, even after reload; stop for website repair, no duplicate signup. Uses configured password for ordinary login.', zh: '邮箱账号及验证已完成；/tool/add刷新后仍404 User not found，需网站修复，不重复注册。普通登录仍读取配置密码自动提交。' },
  },
  {
    id: 'makerlist',
    name: 'Makerlist',
    domain: 'makerlist.io',
    url: 'https://makerlist.io/submit',
    login: 'oauth',
    // Signed out, /submit goes straight to Google and comes back to the home page.
    form: 'form:has(#urlo)',
    submit: 'a.item-submit', // a link, handled by the page's jQuery
    // Tags only accept the jQuery tag widget's whitelist; the chosen ones end up in the hidden "tags" input.
    beforeFill: (ctx, form) => {
      const src = [...document.scripts].map((x) => x.textContent).find((x) => /tagInputField/.test(x)) || '';
      const m = src.match(/whitelist:\s*(\[[^\]]*\])/);
      let list = [];
      try { list = m ? JSON.parse(m[1]).map((x) => x.trim()) : []; } catch (e) {}
      const picks = ctx.rankOptions([...new Set(list)].map((x) => ({ text: x.replace(/-/g, ' '), value: x }))).slice(0, 3);
      const hidden = form.querySelector('input[name=tags]');
      if (hidden && picks.length && !hidden.value) hidden.value = picks.map((o) => o.value).join(',');
    },
    note: { en: 'Google sign-in; PNG icon under 256 KB; tags from its own list', zh: 'Google 登录；图标只收 256KB 以内的 PNG；标签只能用它列表里的词' },
  },
  {
    id: 'scoutforge',
    name: 'Scout Forge',
    domain: 'scoutforge.net',
    url: 'https://scoutforge.net/app-register',
    login: 'email',
    form:'form:has(#url), form:has(#name):has(#shortDescription), form:has(#terms):has(#mailSubscription)',
    fill:{'#url':'url','#name':'name','#shortDescription':'tagline','#longDescription':'description'},
    skip:['input[name^="targetCustomers."]','input[name^="alternatives."]','textarea[name^="alternatives."]','input[placeholder="Select tags"]','input[name^="socialMedia."]','[data-autosubmit-ignore]'],
    submit:/^(Next|Submit Register)$/i,
    draftSubmit:/^Next$/i,
    reviewBeforeSubmit:true,
    beforeFill(ctx,root){const media=root.querySelector('#media');if(media)media.dataset.autosubmitImage='hero';if(root.querySelector('#terms'))for(const input of root.querySelectorAll('input:not([type=checkbox])'))input.dataset.autosubmitIgnore='true';},
    steps:[
      {id:'client-entry',label:'sForm',match:()=>location.pathname==='/dashboard/apps'&&!!document.querySelector('a[href="/app-register"]'),async run(ctx){document.querySelector('a[href="/app-register"]').click();await ctx.sleep(500);}},
      {id:'stale-auth-gate',label:'sLogin',match:()=>location.pathname==='/app-register'&&/User Registration Required/i.test(document.body.innerText),run(){location.href='/dashboard/apps';}},
    ],
    afterFill(ctx,root){
      // The URL extractor invents customer/comparison claims. Only supplied product fields are retained.
      for(const field of root.querySelectorAll('input[name^="targetCustomers."],input[name^="alternatives."],textarea[name^="alternatives."]'))self.AutoSubmitEngine.setNativeValue(field,'');
      if(ctx.autoAgree)for(const id of ['terms','mailSubscription']){const box=root.querySelector('#'+id);if(box&&!box.checked)box.click();}
    },
    validate(ctx,root){
      if(root.querySelector('#name'))return ['Review extracted logo, category and media; retain only accurate product details before Next'];
      if(root.querySelector('#terms') && (!root.querySelector('#terms').checked || !root.querySelector('#mailSubscription')?.checked))return ['Actively accept terms and the required email subscription, or stop'];
      return [];
    },
    success:/^Application Submitted Successfully!$/i,
    protocol:{transport:'page-js',method:null,action:null,queueDays:null,queueText:'Usually3–5business days',terms:'submission-accepts',termsUrl:'https://scoutforge.net/terms-and-conditions',privacyUrl:'https://scoutforge.net/privacy-policy',sideEffect:'Required email subscription',verified:'live-receipt-partial-adapter',checkedAt:'2026-11-05'},
    note: { en: 'Listing free; 3–5 business days. From My Apps click Submit new app (hard navigation can show stale auth gate). URL extraction → replace generated facts → logo/media<5MB/category review → optional socials → terms+email subscription → explicit receipt. Review-only pending full widget automation; credits/reviews/promotions separate.', zh: '免费收录，3–5工作日。从My Apps内点Submit new app，直接网址可能误报未登录。网址提取→恢复真实资料→检查Logo/小于5MB媒体/分类→社交可留空→条款及订阅→明确回执。复杂控件暂保留人工检查；不消费积分或购买评测推广。' },
  },
  {
    id: 'toolscout',
    name: 'ToolScout',
    domain: 'toolscout.ai',
    url: 'https://toolscout.ai/submit',
    login: 'email',
    emailOnly:true,
    reviewBeforeSubmit:true,
    form:'form[action="/submit"]',
    fill:{'#name':'name','#url':'url','#description':'description'},
    skip:['#downloadUrl','#pricingUrl','textarea:not(#description)'],
    free:/^STANDARD LISTING\s+Free\s*\$0/i,
    submit:/^(Next step:.*|Continue with Free|Submit for review)$/i,
    draftSubmit:/^(Next step:.*|Continue with Free)$/i,
    afterFill(ctx,root){
      const models=['Free','Freemium','Free Trial','Paid','Open Source','Waitlist','GPT Plugin','Deal'];
      for(const box of root.querySelectorAll('input[type=checkbox]')){const label=[...(box.labels||[])].map(l=>ctx.textOf(l)).join(' ').trim();if(models.includes(label)&&box.checked!==(label===ctx.valueOf('pricing')))box.click();}
    },
    validate(ctx,root){return root.querySelector('#name')?['name','url','description'].filter(id=>!root.querySelector('#'+id)?.value.trim()).map(id=>'Required: '+id):[];},
    steps:[{id:'human-community-gate',label:'sForm',match:()=>[...document.querySelectorAll('h1')].some(h=>h.textContent.trim()==='Support the community first')&&[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Submit for review'&&b.disabled),run(ctx){ctx.status('Manual community visits required; automated traffic is not supported. Skip this site or complete genuine browsing yourself.','warn');}}],
    success:/^(?:Your tool has been submitted for review\.?|Submission (?:received|successful)|Thank you for submitting)/i,
    protocol:{transport:'page-js-form',method:'POST',action:'/submit',queueDays:null,queueText:'A week or more; upper bound unknown (paid boost24–48h excluded)',terms:'auth-accepts',termsUrl:'https://toolscout.ai/tos',privacyUrl:'https://toolscout.ai/privacy-policy',verified:'live-authenticated-human-gate',checkedAt:'2026-11-05',mandatoryCommunityVisits:5,automatedVisits:false},
    note: { en: 'Email code login → main info → optional launch quiz → Standard Free $0 → exact Free Trial → mandatory human visits to5 community tools. User skipped this step; no automated traffic or final submission. Review only; final receipt unverified.', zh: '邮箱验证码登录→基本资料→可跳过推广问卷→Standard Free $0→精确Free Trial→强制人工浏览5个社区工具。用户选择跳过；不自动互访，也未最终提交，保持人工检查。' },
  },
  {
    id: 'alternativeme',
    name: 'Alternative.me',
    domain: 'alternative.me',
    url: 'https://alternative.me/login/',
    login: 'email',
    reviewBeforeSubmit:true,
    start: /^submit (a )?new software/i,
    steps:[{id:'unverified-account',label:'sCheckMail',match:()=>/Unverified Email-Address/i.test(document.body.innerText),run(ctx){ctx.status('Existing account awaits email verification; check the registered inbox (including Spam), do not create another account','warn');}}],
    protocol:{transport:'page-js',method:null,action:null,queueDays:null,terms:'unknown',verified:'live-account-email-unverified',checkedAt:'2026-11-05',freeStatus:'Registered account is Pending User; final listing conditions unverified'},
    note: { en: 'User registered, signed in, but email unverified; resend requested once and no matching mail found, including Spam. First software-name Next did not advance. Wait for verification; configured password handles ordinary login.', zh: '用户已注册登录，但邮箱未验证；已请求一次重发，含垃圾邮件仍未找到确认信。投稿名称Next无进展，等待验证；普通登录读取配置密码。' },
  },
  {
    id: 'startupbuffer',
    name: 'Startup Buffer',
    domain: 'startupbuffer.com',
    url: 'https://startupbuffer.com/site/submit',
    login: false,
    form:'form:has(#name), form:has(#pitch), form:has(#country)',
    fill:{'#name':'name','#url':'url','#pitch':'tagline','#description':'description','#country':'country','#tags':'tags'},
    submit:/^(Continue|Submit Now)$/i,
    draftSubmit:/^Continue$/i,
    beforeFill(ctx,root){for(const input of root.querySelectorAll('input[type=file]'))input.dataset.autosubmitImage='hero';},
    async afterFill(ctx,root){
      const category=root.querySelector('#primary_category');
      if(category&&!category.value){const options=[...category.options].map(o=>({text:o.text,value:o.value}));const pick=(/\bAI\b/i.test((ctx.product.tags||[]).join(' '))&&options.find(o=>o.text.trim()==='AI'))||ctx.rankOptions(options)[0];if(pick)ctx.setField(category,pick.text);}
      if(ctx.shown(root.querySelector('#pitch')))for(let n=0;n<30&&!root.querySelector('.dz-preview.dz-complete');n++)await ctx.sleep(500);
    },
    validate(ctx,root){return ctx.shown(root.querySelector('#pitch'))&&!root.querySelector('.dz-preview.dz-complete:not(.dz-error)')?['Upload the required screenshot (<=15MB) and wait for Dropzone completion']:[];},
    success:/^Your submission is in\.$/i,
    // Promotion/resume URLs carry private editing keys. Never export these as public receipt links.
    receiptUrl:loc=>/^\/(promote|site\/resume)\//.test(loc.pathname)?'https://startupbuffer.com/site/submit':loc.href,
    protocol:{transport:'page-js',method:null,action:null,queueDays:null,terms:'submission-accepts',termsUrl:'https://startupbuffer.com/site/tos',privacyUrl:'https://startupbuffer.com/site/privacy',verified:'live-receipt',checkedAt:'2026-11-05',freeStatus:'Submission in review; no promotion package attached; paid promotions optional'},
    note: { en: 'Basic info → Continue draft → story and completed screenshot upload<=15MB → Continue draft → country/category/tags → Submit Now. Require Your submission is in. Stop on optional paid promotion page; no package or backlink required, queue unknown. Private edit URL omitted from receipts.', zh: '基本资料→Continue草稿→介绍及截图上传完成（≤15MB）→Continue草稿→国家/分类/标签→Submit Now。仅Your submission is in算回执；付费推广可跳过、无强制互链、排期未知；不导出私密编辑链接。' },
  },

  {
    id: '10015',
    name: '10015 Tools',
    domain: '10015.io',
    maxReviewDays: 120, // published free queue: 3–4 months
    url: 'https://10015.io/product-finder/submit',
    login: 'email',
    loginPrompt: /you need to sign in or register to use this feature/i,
    form: 'main:has(#name):has(#url)',
    submit: /^submit product$/i,
    reviewBeforeSubmit: true, // custom category/image widgets need review; do not click the priority-review upsell
    fill: { '#name': 'name', '#url': 'url', '#tagline': 'tagline', '#shortDescription': 'description', '#description': 'description', '#otherTags': 'tags' },
    beforeFill: (ctx, form) => {
      for (const [id, key] of [['imageUploaded', 'hero'], ['iconUploaded', 'logo']]) {
        const input = form.querySelector(`#${id}`);
        if (input) input.dataset.autosubmitImage = key;
      }
    },
    validate: (ctx, form) => {
      const checks = [['#name', 1, 'Product Name'], ['#url', 1, 'Product URL'], ['#shortDescription', 60, 'Product Description'], ['#description', 200, 'Product Details']];
      const tagline = form.querySelector('#tagline');
      if (tagline && tagline.value.trim()) checks.push(['#tagline', 40, 'Product Tagline']);
      return checks.filter(([selector, min]) => (form.querySelector(selector)?.value || '').trim().length < min)
        .map(([, min, name]) => `${name}: min ${min} characters`);
    },
    note: { en: 'Free standard queue (3–4 months), no badge; sign-in required. Review categories and images, then submit manually; skip the paid priority review.', zh: '免费普通队列（约 3–4 个月），不需徽章；需要登录。检查分类和图片后手动提交，跳过付费加速。' },
    steps: [{
      id: 'fetchProduct',
      label: 'sForm',
      match: () => !!document.querySelector('#submittedUrl') && !document.querySelector('#name'),
      run: async (ctx) => {
        ctx.setField(document.querySelector('#submittedUrl'), ctx.valueOf('url'));
        const button = ctx.clickables().find((el) => el.matches('button') && /^submit url$/i.test(ctx.textOf(el)));
        if (button) { button.click(); await ctx.sleep(1500); }
      },
    }],
  },
  {
    id: 'viesearch',
    name: 'Viesearch',
    domain: 'viesearch.com',
    url: 'https://viesearch.com/submit',
    login: false,
    form: 'form:has(input[name=url]):has(input[name=email])',
    submit: /^submit$/i,
    fill: { '#url': 'url', '#title': 'name', '#description': 'description', '#email': 'email' },
    skip: ['#category-search'], // blank category means automatic categorization
    success:/^(?:Thank you.*submi|Your (?:site|website|URL|submission).*(?:submitted|received|pending|added)|Submission (?:received|successful)|URL submitted successfully)/i,
    protocol:{transport:'html-form',method:'POST',action:'/submit',queueDays:null,queueText:'Usually1–2business days; may take longer with volume',terms:'submission-accepts',termsUrl:'https://viesearch.com/terms',privacyUrl:'https://viesearch.com/privacy',guidelinesUrl:'https://viesearch.com/guidelines',standardsUrl:'https://viesearch.com/standards',verified:'live-filled-awaiting-consent',checkedAt:'2026-11-05',reciprocal:'Only optional RECIPROCAL/Verified status needs backlink; ordinary submission does not'},
    note: { en: 'Free ordinary listing; usually1–2 business days. URL/email required, title/description optional, category automatic. Submit accepts Terms/Privacy/Guidelines/Standards; reciprocal badge optional, not claimed. Require explicit receipt.', zh: '普通收录免费，通常1–2工作日；网址邮箱必填，分类留空自动分配。提交接受条款/隐私/投稿规范/社区标准；互链仅额外认证，不申领。必须有明确回执。' },
  },
  {
    id: 'tinylaunchpad',
    name: 'TinyLaunchpad',
    domain: 'tinylaunchpad.com',
    url: 'https://tinylaunchpad.com/projects/submit',
    login: 'oauth',
    free: /^free(?: launch)?(?:\s|$)/i,
    reviewBeforeSubmit: true, // authenticated scheduling form still needs a live review
    note: { en: 'Free launch, no badge. Sign in, review the launch date and Free plan, then submit manually; dofollow links only for the top 3 free launches.', zh: '免费发布，不需徽章。登录后检查发布日期和 Free 方案，再手动提交；免费发布仅前三名获得 dofollow 链接。' },
  },
].filter((site) => !(site.maxReviewDays > CONFIG.maxReviewDays));

function fillVideoNavigationCategory(ctx,root) {
  const select=root.querySelector('select[name=category],#tougaocategorg_sites');
  if(!select || !/video/i.test(ctx.product.tags?.join(' ')||''))return;
  const options=[...select.options];
  const option=options.find(o=>/视频剪辑/.test(o.text))||options.find(o=>/AI视频工具|视频类/.test(o.text));
  if(option)ctx.setField(select,option.text.trim());
}
function validateNavigationCategory(ctx,root) {
  const select=root.querySelector('select[name=category],#tougaocategorg_sites');
  return select && (!select.value||select.value==='0')?['Choose an accurate category']:[];
}

function siteById(id) {
  return SITES.find((s) => s.id === id);
}

// Calendar labels omit the year; infer only the next occurrence and compare calendar days.
function tinyLaunchDate(text, now = new Date()) {
  const m=String(text).match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:,?\s+(20\d{2}))?\b/i);
  if(!m)return null;
  const month=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[1].slice(0,3).toLowerCase());
  const day=Number(m[2]),today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());
  let year=m[3]?Number(m[3]):now.getFullYear(),stamp=Date.UTC(year,month,day);
  if(!m[3]&&stamp<today)stamp=Date.UTC(++year,month,day);
  const date=new Date(stamp);if(date.getUTCMonth()!==month||date.getUTCDate()!==day)return null;
  return {iso:date.toISOString().slice(0,10),days:(stamp-today)/86400000};
}
function tinyLaunchDateAllowed(iso,now=new Date()) {
  if(!/^20\d{2}-\d{2}-\d{2}$/.test(iso||''))return false;
  const days=(Date.parse(iso+'T00:00:00Z')-Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()))/86400000;
  return days>=0&&days<=CONFIG.maxReviewDays;
}
async function pickTinyLaunchDate(ctx) {
  for(let page=0;page<2;page++) {
    const buttons=ctx.clickables().filter(b=>b.tagName==='BUTTON');
    const slots=buttons.map(button=>({button,date:tinyLaunchDate(ctx.textOf(button)),free:/\bFree available\b/i.test(ctx.textOf(button))})).filter(s=>s.date);
    const available=slots.filter(s=>s.free&&s.date.days>=0&&s.date.days<=CONFIG.maxReviewDays).sort((a,b)=>a.date.days-b.date.days)[0];
    if(available){sessionStorage.setItem('as_tinylaunch_date',available.date.iso);available.button.click();await ctx.sleep(500);return;}
    const next=buttons.find(b=>ctx.textOf(b)==='Next Page'&&!b.disabled);
    if(!slots.length||slots.some(s=>s.date.days>CONFIG.maxReviewDays)||!next||page===1)break;
    next.click();await ctx.sleep(800);
  }
  ctx.fail('No available free launch slot within 100 days; no paid option selected');
}
async function configureTinyLaunch(ctx) {
  const heading=[...document.querySelectorAll('h2')].find(h=>/^Configure Launch for/.test(h.textContent.trim()));
  const date=tinyLaunchDate(heading?.textContent);
  if(!date||date.days<0||date.days>CONFIG.maxReviewDays)return ctx.fail('No confirmed free launch date within 100 days');
  sessionStorage.setItem('as_tinylaunch_date',date.iso);
  const standard=ctx.clickables().find(b=>b.tagName==='BUTTON'&&/^Standard\s+Free\b/i.test(ctx.textOf(b)));
  if(!standard)return ctx.fail('Free Standard launch is not available');
  standard.click();await ctx.sleep(300);
  const none=[...document.querySelectorAll('input[type=radio],[role=radio]')].filter(ctx.shown).filter(el=>{
    const labels=[...[...(el.labels||[])].map(l=>l.textContent),el.closest('label')?.textContent,el.getAttribute('aria-label'),
      ...(el.getAttribute('aria-labelledby')||'').split(/\s+/).map(id=>document.getElementById(id)?.textContent),ctx.textOf(el)];
    return labels.some(text=>/^None\s*[—–-]\s*\$0$/i.test(String(text||'').replace(/\s+/g,' ').trim()));
  });
  if(none.length!==2)return ctx.status('Select None — $0 for both optional services before continuing','warn');
  for(const radio of none)if(!ctx.isChecked(radio))radio.click();
  await ctx.sleep(300);
  if(!none.every(ctx.isChecked))return ctx.status('Both optional services must be None — $0','warn');
  const button=ctx.clickables().find(b=>ctx.textOf(b)==='Schedule Free Launch');
  if(!button)return ctx.status('Wait for the zero-cost Schedule Free Launch button','warn');
  return ctx.submit(heading.closest('[role=dialog]')||document.body,button);
}

function siteForHost(hostname, pathname = '') {
  const host = hostname.replace(/^www\./, '');
  return SITES.find((s) => host === s.domain || host.endsWith(`.${s.domain}`) ||
    ((s.extraHosts || []).some((re) => re.test(hostname)) && (!s.extraPath || s.extraPath.test(pathname))));
}
