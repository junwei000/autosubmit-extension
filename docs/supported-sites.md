# 支持站点与页面提交流程（2026-11-05）

当前目录共 **62** 项，其中 **58** 项具有本轮表单分析记录。已有适配、表单本地测试、真实站点回执是不同验证层级，见各项说明。

插件通过打开页面、填写字段、选择免费收录、主动勾选条款复选框和点击按钮提交。验证码与缺失的账号/必填资料需要人工处理；未公开的排期标注为未知。表单声明的方法和地址只用于维护记录，不用于直接调用提交 API。

普通邮箱密码登录读取批量页的本地配置，模拟填入并点击；支持先邮箱后密码的两步登录。密码错误时停止，不据此重复注册。Gmail验证检索包括垃圾邮件和垃圾箱，同时限定收件人、站点及请求时间。历史查重或用户暂缓的站点默认不勾选，也不计作投稿成功。

配置数量包含仅填表并暂停的流程，不表示每项都能自动完成。AI工具阁的网址免费条件尚未单独确认，外贸百科最终流程未验证，两者默认仅填表等待检查；Aier、ToolTrove缺少Free Trial时停止；验证码、原创文案或素材缺失也不算提交成功。

产品可设置按顺序使用的重名备用名称。只有已提交后收到明确的“Name - has already been taken”等名称错误才切换；网址重复、普通报错和回执未知都不改名重投。原产品名保持不变，JSON/CSV保留实际投稿名与尝试名称。

公开截图/主图网址与本地上传图片分别保存；需要图片网址的表单不会接收本地data URL。共享问卷域名同时匹配表单路径。AIAI.Tools明确选互链No，第二页Done仍需最后一次Submit；SubmitYourAITool要求JPEG≤1MB并等上传完成。Toolhunter最终要求徽章才发布，已从可选目录排除。

| 站点 | 入口 | 登录 | 最终点击 | 验证层级 | 说明 |
| --- | --- | --- | --- | --- | --- |
| Forward Future | [forwardfuture.com](https://forwardfuture.com/tools/submit) | 不需要 | 人工检查后点击 | live-receipt | 免费公开表单，填写产品资料、实际定价、受众和标签。请检查自动填写的受众与标签，再点击提交审核。实测已取得编辑审核回执。 |
| AI Valley | [aivalley.ai](https://aivalley.ai/submit-tool/) | 不需要 | 人工检查后点击 | live-form-send-error | 公开Contact Form7：真实姓名/邮箱/工具名称网址；长短描述同名，按可见标签分别填。真实发送返回错误，无回执，排期未知。暂只填表检查，等待站点修复，不自动重试。 |
| AI Tools Network | [aitoolsnetwork.com](https://aitoolsnetwork.com/join/) | 不需要 | 人工检查后点击 | live-form-captcha-blocked | Basic 明确免费，走等候名单表单：主题、邮箱、网址、姓名和说明。Pro 每年 400 美元、Pro Plus 每年 550 美元是 Stripe 结账，不会打开。图形验证码要求选出汽车，蜜罐保持空白。只填表并暂停，排期未知。 |
| code.market | [code.market](https://code.market/newsletter/submit) | 不需要 | 人工检查后点击 | live-form-review-only | 摘要表单填写网址、最多5个词的名称、最多15个词的现有说明，并选择SaaS，Twitter留空。旁边9美元的周排名不会点击。只填表并暂停，排期未知，未投稿。 |
| Free AI Tools Directory | [free-ai-tools-directory.com](https://free-ai-tools-directory.com/submit-request/) | 不需要 | 人工检查后点击 | live-form-captcha-blocked | Gravity Form：工具名、网址、介绍和短说明。图片留空。没有收费或互链字段。可见的 reCAPTCHA 不代答。只填表并暂停，排期未知。 |
| Guide of AI Tool | [guideofaitool.com](https://www.guideofaitool.com/submit-ai-tool) | 不需要 | 人工检查后点击 | live-form-review-only | FAQ写明投稿完全免费，48小时内审核，不接受付费上榜。填写姓名、邮箱、工具名和网址。PayPal邮箱只作投稿参考，没有现成地址所以留空。只填表并暂停。 |
| Insidr.ai | [insidr.ai](https://www.insidr.ai/submit-tools/) | 不需要 | 人工检查后点击 | live-form-review-only | 目录表单填写工具名、网址、AI Video Tools、Free trial、介绍、姓名和邮箱。屏幕外的蜜罐保持空白。不打开 Advertise。只填表并暂停，排期未知。 |
| 设计狮 | [998877.com.cn](https://wj.qq.com/s2/8138981/1c44/) | 不需要 | 人工检查后点击 | live-form-eligibility-unconfirmed | 设计狮“申请收录”腾讯问卷：网址、推荐理由、邮箱。未见收费或互链控件。页面要求设计类站点并需行业知名度，因此只填表并暂停。排期未知，未投稿。 |
| AI未来百科 | [aihubpro.cn](https://www.aihubpro.cn/link-register) | 不需要 | 人工检查后点击 | live-form-login-required | 申请入驻表单可见：网站名称、网址、图标、介绍，分类选AI视频工具。必须先登录（邮箱密码或微信/微博/QQ），且必须上传图标。公开表单没有收费或互链控件，登录后的条件未核实。只填表并暂停，不自动注册或提交。 |
| AI Top Hub | [aitophub.com](https://aitophub.com/) | 不需要 | 自动（必要时等待人工） | live-receipt | SUBMIT TOOL→等待弹窗→真实姓名/邮箱/工具名称网址分类→30天内免费Regular→Submit Tool。附加信息写原描述和Free Trial，视频可留空；仅明确感谢页算成功。 |
| TinyLaunch | [tinylaunch.com](https://www.tinylaunch.com/dashboard/startups/new) | email | 自动（必要时等待人工） | live-scheduled-receipt | 邮箱验证→投稿人资料→产品草稿→100天内最早免费档期→Standard Free、两项附加服务None $0→跳过升级。仅Launch Scheduled算回执；不加徽章，不声称获得外链奖励。 |
| Submit Your AI Tool | [submityouraitool.com](https://embed.fillout.com/t/cBypbJX257us) | 不需要 | 自动（必要时等待人工） | live-receipt | 免费无互链，排期未知；打开实测Fillout表单。须完整加载邮箱字段、上传≤1MB的JPEG主图并等Upload complete；PNG会被拒绝。 |
| AIAI.Tools | [aiai.tools](https://tally.so/embed/3NADy0) | 不需要 | 自动（必要时等待人工） | live-receipt | 实测无收费，排期未知；互链明确选No。需公开PNG/JPG截图网址；Done!仍为中间页，须再点Submit并取得Form submitted回执。 |
| The AI Navigator | [theainavigator.com](https://www.theainavigator.com/submit-an-ai-tool) | 不需要 | 自动（必要时等待人工） | live-receipt | 实测投稿无收费或互链；排期未知。主动勾选隐私协议，社交账号和联盟链接留空。 |
| SonicRun | [sonicrun.com](https://www.sonicrun.com/freelisting.html) | 不需要 | 自动（必要时等待人工） | live-receipt-email-link | 免费30天收录、不保证通过；附带FreeWebMonitoring免费账户。Gmail读取验证链接后，只勾选免费表单并点Add Your Site，忽略两项收费升级。 |
| AI Siteleri | [aisiteleri.com](https://aisiteleri.com/yapay-zeka-oner/) | 不需要 | 自动（必要时等待人工） | live-receipt | 实测建议表单无收费或互链，排期未知；需真实名/姓。不接受网站建议的邮箱域名替换。 |
| AI News Hub | [ainewshub.org](https://www.ainewshub.org/submit-ai-tool) | 不需要 | 自动（必要时等待人工） | live-attempt-unconfirmed | FAQ确认免费基础收录、14–21工作日、每月最多2次。表单清空不算回执，未确认尝试不自动重投；关闭订阅弹窗。 |
| iForAI | [iforai.com](https://iforai.com/submit_website/) | 不需要 | 自动（必要时等待人工） | live-form-captcha-blocked | 普通投稿、优先审核打赏可选，无强制互链；视频剪辑分类，微信留空。等待人工图形验证码，本轮按用户要求跳过实投，无回执。 |
| AI工具阁 | [ai-to.cn](https://ai-to.cn/contribute/) | 不需要 | 人工检查后点击 | live-form-slider-blocked | 网址字段已适配；页面明确免费的是文章投稿，网址费用未单独说明。填好后暂停核实免费条件，不自动提交；点击会弹滑块，不能把文章免费当网址免费证据。 |
| 外贸百科 | [waimao21.com](https://waimao21.com/%e7%94%b3%e8%af%b7%e6%94%b6%e5%bd%95) | 不需要 | 人工检查后点击 | live-form-captcha-blocked | 仅操作网站表单；AI视频分类，简介上限50字符。当前无费用/互链控件，最终免费条件和图形验证码需人工检查后提交；本轮未实投。 |
| Aier | [aier.im](https://aier.im/submit) | 不需要 | 自动（必要时等待人工） | live-form-pricing-blocked | 已适配定价、分类和职业受控下拉框；没有Free Trial，RTFV停在定价校验，不改选其他模式。当前表单无收费/互链项，无真实回执。 |
| ToolTrove (AnyFP) | [tooltrove.net](https://tooltrove.net/submit) | 不需要 | 自动（必要时等待人工） | live-form-pricing-blocked | 免费收录，徽章仅用于dofollow。三步；至少60词、3项功能、用途/问题及2张真实截图，Next不算提交。没有Free Trial时暂停，不改选Paid。 |
| SaaSHub | [saashub.com](https://www.saashub.com/services/submit) | 不需要 | 自动（必要时等待人工） | live-receipt-name-fallback | 免费队列1–12周。网址检查→至少3个分类及相关竞品→仅点Free。明确重名才使用备用名称，本次以RTFV成功；不点$75/$99。 |
| A1 Gallery | [a1.gallery](https://www.a1.gallery/submit) | email | 自动（必要时等待人工） | live-receipt-email-link | 免费审核3–4周，无互链。邮箱登录附带每周订阅，插件填邮箱后等待本人确认点击，再从Gmail读取登录链接；仅提交网址，额外创作者选填。 |
| AIGCLIST | [aigclist.com](https://aigclist.com/submit) | email | 自动（必要时等待人工） | live-receipt | 免费nofollow审核，徽章可选。登录→网址查重→手工详情（长描述至少400字符）→保存草稿→Free $0。可选定价不操作，真实产品收费模式写审核备注；排期上限未知。 |
| Waild World | [waildworld.com](https://waildworld.com/) | 不需要 | 自动（必要时等待人工） | live-receipt | 实测提交免费、无互链；回执预计3天。提交即接受条款，产品定价与投稿费用分开。 |
| AI Marketing Directory | [aimarketing.directory](https://tally.so/embed/nG1V7j?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1) | 不需要 | 自动（必要时等待人工） | live-receipt | Tally实测投稿免费、无互链，排期未知；直接打开已观察到的问卷页面。第2页已显示提交成功，仅附可选付费加速，不点击。 |
| WebCatalog | [webcatalog.io](https://webcatalog.io/en/apps/submit) | email | 自动（必要时等待人工） | live-receipt-email-otp | 免费应用推荐；使用邮箱验证码登录，从转发到Gmail的邮件读取验证码。仅填写名称和网址，不代做开发者归属认证；排期未知。 |
| AI Tools for Marketers | [aitoolsmarketer.com](https://aitoolsmarketer.com/submit/) | 不需要 | 自动（必要时等待人工） | live-receipt | 免费普通队列约2–3周，徽章可选；主动取消默认加速推广。营销问题使用产品描述、用途和最多3个标签，需符合营销场景。 |
| AI Tools Inc | [aitools.inc](https://loxr142exnq.typeform.com/to/RB6ZnEf2) | 不需要 | 自动（必要时等待人工） | live-receipt | 免费队列 30–90 天；三题：工具名、网址、联系人名/姓/邮箱。姓名缺失时等待补齐；已实测收到回执。 |
| Best AI Tools | [bestaitools.com](https://www.bestaitools.com/tool-suggestion-form/) | 不需要 | 自动（必要时等待人工） | live-receipt | 实测建议表单免费、无互链；需要真实名/姓，两个诱捕字段留空。审核约几天，上限未知；已有回执。 |
| 映技派 | [yjpoo.com](https://www.yjpoo.com/submit-ai-tool/) | 不需要 | 人工检查后点击 | live-receipt | 实测免费、无互链，一般24小时审核；先站内查重，再人工最终点击。已读到“操作成功”，截图为5秒跳转后页面。 |
| Launching Next | [launchingnext.com](https://www.launchingnext.com/submit/) | 不需要 | 自动（必要时等待人工） | form-only-human-check | 普通提交免费、排期未知；手动填写人机校验后继续，融资/预算/订阅不代填；不购买后续 $99 加速。 |
| Future Tools | [futuretools.io](https://futuretools.io/submit-a-tool) | 不需要 | 自动（必要时等待人工） | form-only-captcha-blocked | 免费投稿表单，排期未知；产品定价与投稿费用分开。实测被验证码拦截，需手动完成。 |
| AI Tools Library | [aitools.sh](https://aitools.sh/submit-a-tool/) | 不需要 | 自动（必要时等待人工） | live-receipt | 普通投稿实测免费、无需互链；排期未知。已收到审核回执。 |
| ReviewAI | [reviewai.net](https://reviewai.net/#submit) | 不需要 | 自动（必要时等待人工） | live-receipt | 免费、无需互链；排期未知。已实测收到审核回执。 |
| Human or Not | [humanornot.co](https://www.humanornot.co/submit-tool) | 不需要 | 自动（必要时等待人工） | live-receipt | 免费，仅网址和邮箱；标明 48 小时内发布。已实测收到审核回执。 |
| TheToolBus | [thetoolbus.ai](https://www.thetoolbus.ai/ai-tools/submit) | 不需要 | 自动（必要时等待人工） | live-receipt | 选择免费 Directory listing，排除 Sponsored；审核约几天。产品定价与收录费用分开。 |
| Jayde | [jayde.com](https://www.jayde.com/submit.html) | 不需要 | 自动（必要时等待人工） | live-listed | 免费即时收录；提交即接受 Jayde 条款，受“自动勾选同意条款”设置控制。 |
| KI-Suche | [ki-suche.io](https://www.ki-suche.io/einreichen) | 不需要 | 自动（必要时等待人工） | live-receipt | 免费，分类必选、描述最多 600 字；排期未知。已实测收到审核回执。 |
| AI工具网 | [ai138.com](https://www.ai138.com/submit) | 不需要 | 自动（必要时等待人工） | live-attempt-unconfirmed | 免费提交，互链可选；排期未知。实测已点击，尚无明确回执，不应重复提交 RTFV。 |
| With AI Tools | [withaitools.com](https://www.withaitools.com/submit) | 不需要 | 自动（必要时等待人工） | live-existing-public-listing | 免费URL自动提取。Already listed按已有去重，不算新回执；核对公开页面官网链接。站点生成的定价可能不准确。 |
| AppRater | [apprater.net](https://apprater.net/#submit) | 不需要 | 自动（必要时等待人工） | existing-adapter | 免登录：App 名称、网址、介绍、标签、提交人姓名和邮箱 |
| Aigist | [aigist.org](https://aigist.org/submit-tool) | 不需要 | 自动（必要时等待人工） | live-form-captcha-blocked | 免费人工审核，通常5工作日；支持精确Free Trial，不勾选增值邮件。等待人工reCAPTCHA，本批按要求跳过实投。 |
| RankmyAI | [rankmyai.com](https://www.rankmyai.com/tool-addition) | 不需要 | 自动（必要时等待人工） | live-attempt-unconfirmed | 官方明确免费，需独立网址和主要AI功能。合法公司/开发者身份须单独确认，不从产品品牌或联系人推断；未知公司资料/API/MCP/社交留空。Free Trial可写自由文本定价；排期未知。RTFV已尝试但清空表单后无回执，不盲目重投。 |
| ExactSeek | [exactseek.com](https://www.exactseek.com/add.html) | 不需要 | 自动（必要时等待人工） | live-attempt-unconfirmed | 免费网址/姓名/邮箱；主动同意条款及附带SiteProNews订阅，需要邮件验证。空白CGI页头不算回执，未确认尝试不重投。 |
| Active Search Results | [activesearchresults.com](https://www.activesearchresults.com/addwebsite.php) | 不需要 | 自动（必要时等待人工） | live-receipt | 已实测免费回执；网址+邮箱，通常1–2小时可搜索。官网明确无需登录或邮件激活，插件不再等待不存在的确认邮件。 |
| NexTools | [nextools.live](https://nextools.live/contact/) | 不需要 | 人工检查后点击 | live-attempt-unconfirmed | 联系表单收录申请，不保证收录；先填表核实免费资格。RTFV已尝试但无回执，不重投；忽略错误邮箱域名建议。 |
| AIToolboard | [aitoolboard.com](https://aitoolboard.com/submit) | email | 人工检查后点击 | live-form-pricing-blocked | 可选Free Listing，但必填产品定价无Free Trial；必需工具图片，默认填表后暂停检查。 |
| YouTools | [youtools.ai](https://youtools.ai/submit-tool) | oauth | 自动（必要时等待人工） | live-free-form-login-skipped | 从默认付费Basic切换Free $0（2–3周、nofollow）；提交弹Google登录，用户选择跳过。后续Pick3为旧配置，本轮未验证。 |
| Startup Stash | [startupstash.com](https://form.typeform.com/to/b8EyDE) | 不需要 | 人工检查后点击 | live-form-review-only | 问卷现在可以打开。要姓名、工作邮箱、产品名、短描述、长描述、网址、分类和 Logo。广告问题必须答 No，才会跳过付费投放和预算题并结束收录申请。插件停在这一题，未投稿。 |
| Brownbook | [brownbook.net](https://www.brownbook.net/add-business) | email | 人工检查后点击 | live-registration-captcha-blocked | 使用每个产品的真实经营国家；本轮地址电话可选。第二步需注册、条款和验证码，默认暂停检查，不自动录入新密码。 |
| ChatableApps | [chatableapps.com](https://chatableapps.com/submit) | email | 人工检查后点击 | live-authenticated-pricing-blocked | 邮箱magic link可能进垃圾邮件；已登录、本人工具清单为空。免费收录约一个月，但产品定价必填且无Free Trial，RTFV停止。优先Next而非始终显示的Create；Next只算草稿，不误填定价或最终投稿。 |
| Launch | [trylaunch.ai](https://trylaunch.ai/submit) | oauth | 自动（必要时等待人工） | existing-adapter | 五步向导；图标和 Hero 图必传；Free 排在付费之后（约 7 天上线）；Google 登录 |
| BestofAI | [bestofai.com](https://bestofai.com/) | email | 人工检查后点击 | live-auth-verified-site-error | 邮箱账号及验证已完成；/tool/add刷新后仍404 User not found，需网站修复，不重复注册。普通登录仍读取配置密码自动提交。 |
| Makerlist | [makerlist.io](https://makerlist.io/submit) | oauth | 自动（必要时等待人工） | existing-adapter | Google 登录；图标只收 256KB 以内的 PNG；标签只能用它列表里的词 |
| Scout Forge | [scoutforge.net](https://scoutforge.net/app-register) | email | 人工检查后点击 | live-receipt-partial-adapter | 免费收录，3–5工作日。从My Apps内点Submit new app，直接网址可能误报未登录。网址提取→恢复真实资料→检查Logo/小于5MB媒体/分类→社交可留空→条款及订阅→明确回执。复杂控件暂保留人工检查；不消费积分或购买评测推广。 |
| ToolScout | [toolscout.ai](https://toolscout.ai/submit) | email | 人工检查后点击 | live-authenticated-human-gate | 邮箱验证码登录→基本资料→可跳过推广问卷→Standard Free $0→精确Free Trial→强制人工浏览5个社区工具。用户选择跳过；不自动互访，也未最终提交，保持人工检查。 |
| Alternative.me | [alternative.me](https://alternative.me/login/) | email | 人工检查后点击 | live-account-email-unverified | 用户已注册登录，但邮箱未验证；已请求一次重发，含垃圾邮件仍未找到确认信。投稿名称Next无进展，等待验证；普通登录读取配置密码。 |
| Startup Buffer | [startupbuffer.com](https://startupbuffer.com/site/submit) | 不需要 | 自动（必要时等待人工） | live-receipt | 基本资料→Continue草稿→介绍及截图上传完成（≤15MB）→Continue草稿→国家/分类/标签→Submit Now。仅Your submission is in算回执；付费推广可跳过、无强制互链、排期未知；不导出私密编辑链接。 |
| Viesearch | [viesearch.com](https://viesearch.com/submit) | 不需要 | 自动（必要时等待人工） | live-filled-awaiting-consent | 普通收录免费，通常1–2工作日；网址邮箱必填，分类留空自动分配。提交接受条款/隐私/投稿规范/社区标准；互链仅额外认证，不申领。必须有明确回执。 |
| TinyLaunchpad | [tinylaunchpad.com](https://tinylaunchpad.com/projects/submit) | oauth | 人工检查后点击 | existing-adapter | 免费发布，不需徽章。登录后检查发布日期和 Free 方案，再手动提交；免费发布仅前三名获得 dofollow 链接。 |

## 页面字段与动作

### Forward Future

- 入口：[forwardfuture.com](https://forwardfuture.com/tools/submit)
- 表单：`form:has(#websiteUrl):has(#tags)`
- 提交按钮：`/^Submit for review$/i`
- 产品定价字段（与收录费分开）：`#pricing`
- 成功提示：`/^(?:Tool submitted\. We['’]ll review it shortly\.|Your submission is now under review\.)$/i`
- 自定义处理：`afterFill`、`validate`，实现见 src/sites.js
- 排期：未知；验证：`live-receipt`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 免费条件验证范围：Free public form, no account or reciprocal link requirement observed. Editorial review duration unpublished.
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `#name` | name |
| `#websiteUrl` | url |
| `#description` | description |
| `#pricing` | pricing |

跳过：`#features`、`#useCases`、`#pricing`、`#tags`。

### AI Valley

- 入口：[aivalley.ai](https://aivalley.ai/submit-tool/)
- 表单：`form.wpcf7-form:has([name="ToolURL"])`
- 提交按钮：`input[type=submit]`
- 成功提示：`/^Thank you for your message\. It has been sent\.$/i`
- 自定义处理：`afterFill`、`validate`，实现见 src/sites.js
- 分步动作：`mail-send-failed`
- 排期：未知；验证：`live-form-send-error`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- HTML默认声明方法：`POST`；不能据此推断页面JavaScript实际请求
- 免费条件验证范围：Public form has no payment or required backlink controls; one live send returned explicit error. Final receipt and successful listing conditions not verified.
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `[name="your-name"]` | fullName |
| `[name="your-email"]` | email |
| `[name="ToolName"]` | name |
| `[name="ToolURL"]` | url |

跳过：`textarea[name="your-message"]`。

### AI Tools Network

- 入口：[aitoolsnetwork.com](https://aitoolsnetwork.com/join/)
- 表单：`form.wpcf7-form:has([name="cf-website"])`
- 提交按钮：`input#cf-submit`
- 成功提示：`/thank you for your message|your message has been sent/i`
- 自定义处理：`afterFill`、`validate`，实现见 src/sites.js
- 排期：未知；验证：`live-form-captcha-blocked`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- HTML默认声明方法：`POST`；不能据此推断页面JavaScript实际请求
- 免费条件验证范围：Basic plan is explicitly Free for a directory listing via the waiting-list form. Pro is $400/year and Pro Plus is $550/year; those Stripe checkout links are never opened.
- 条款处理：未观察到必须单独勾选的条款控件（https://aitoolsnetwork.com/terms-and-conditions/）

| 字段选择器 | 产品资料 |
| --- | --- |
| `[name="cf-email"]` | email |
| `[name="cf-website"]` | url |
| `[name="cf-name"]` | fullName |

跳过：`input[name="kc_honeypot"]`、`input[name="kc_captcha"]`。

### code.market

- 入口：[code.market](https://code.market/newsletter/submit)
- 表单：`form:has(#project_url)`
- 提交按钮：`/^Submit Project$/`
- 成功提示：`/your project has been submitted|thanks for submitting|added to the digest/i`
- 自定义处理：`afterFill`、`validate`，实现见 src/sites.js
- 排期：未知；验证：`live-form-review-only`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- HTML默认声明方法：`GET`；不能据此推断页面JavaScript实际请求
- 免费条件验证范围：Digest form has no payment or backlink control. A separate homepage control sells a week rank for $9 and is not used.
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `#project_url` | url |

跳过：`#twitter_handle`。

### Free AI Tools Directory

- 入口：[free-ai-tools-directory.com](https://free-ai-tools-directory.com/submit-request/)
- 表单：`form:has([name="input_7"])`
- 提交按钮：`#gform_submit_button_1`
- 成功提示：`/thanks for contacting us|your submission has been received/i`
- 自定义处理：`validate`，实现见 src/sites.js
- 排期：未知；验证：`live-form-captcha-blocked`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- HTML默认声明方法：`POST`；不能据此推断页面JavaScript实际请求
- 免费条件验证范围：Public Gravity Form has no payment or reciprocal-link field. The directory name says free; a separate submission fee was not stated. reCAPTCHA blocks automatic sending.
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `[name="input_6"]` | name |
| `[name="input_7"]` | url |
| `[name="input_8"]` | description |
| `[name="input_10"]` | tagline |

跳过：`input[type=file]`、`input.gfield_recaptcha_response`。

### Guide of AI Tool

- 入口：[guideofaitool.com](https://www.guideofaitool.com/submit-ai-tool)
- 表单：`form:has(#tool-url)`
- 提交按钮：`form:has(#tool-url) button[type=submit]`
- 成功提示：`/thank you|submitted|within 48 hours/i`
- 自定义处理：`validate`，实现见 src/sites.js
- 排期：2 天；验证：`live-form-review-only`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- HTML默认声明方法：`GET`；不能据此推断页面JavaScript实际请求
- 免费条件验证范围：FAQ says submission is completely free, reviewed within 48 hours, and the site does not accept payment to list or rank tools. PayPal email is labeled as a submission reference and is not invented.
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `#name` | fullName |
| `#email` | email |
| `#tool-name` | name |
| `#tool-url` | url |

跳过：`#paypal-email`。

### Insidr.ai

- 入口：[insidr.ai](https://www.insidr.ai/submit-tools/)
- 表单：`main:has(#tool-description)`
- 提交按钮：`/^Submit tool$/`
- 成功提示：`/thank you|submission received|we.ll review/i`
- 自定义处理：`afterFill`、`validate`，实现见 src/sites.js
- 排期：未知；验证：`live-form-review-only`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 免费条件验证范围：Submission form includes a Free trial product-pricing option. Sponsored placement is a separate Advertise link and is not opened. The page says it may email about sponsor options.
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `input[placeholder="e.g. Acme AI"]` | name |
| `input[placeholder="https://"]` | url |
| `#tool-description` | description |
| `input[placeholder="Your name"]` | fullName |
| `input[placeholder="you@company.com"]` | email |

跳过：`input[name="website_url"]`。

### 设计狮

- 入口：[998877.com.cn](https://wj.qq.com/s2/8138981/1c44/)
- 表单：`.question-list`
- 提交按钮：`button.btn-submit`
- 成功提示：`/提交成功|感谢你的参与|问卷已提交/`
- 自定义处理：`afterFill`、`validate`，实现见 src/sites.js
- 排期：未知；验证：`live-form-eligibility-unconfirmed`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 免费条件验证范围：Public Tencent survey has no payment or reciprocal-link control. The page asks for design sites with industry recognition, so eligibility is not treated as verified.
- 条款处理：未观察到必须单独勾选的条款控件

跳过：`input.inputs-input`。

### AI未来百科

- 入口：[aihubpro.cn](https://www.aihubpro.cn/link-register)
- 表单：`form:has(input[placeholder="网站网址"])`
- 提交按钮：`/^提交$/`
- 成功提示：`/您已提交成功，请等待审核通过/`
- 自定义处理：`afterFill`、`validate`，实现见 src/sites.js
- 排期：未知；验证：`live-form-login-required`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 免费条件验证范围：Public 申请入驻 form shows no payment or reciprocal-link control. Login and an icon are required; terms after login are not verified.
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `input[placeholder="网站名称"]` | name |
| `input[placeholder="网站网址"]` | url |
| `#link_content_1` | description |

跳过：`input[name=s]`。

### AI Top Hub

- 入口：[aitophub.com](https://aitophub.com/)
- 表单：`form:has([name="tool url"])`
- 提交按钮：`input[name=send]`
- 成功提示：`/^Thank you for submitting your tool$/i`
- 自定义处理：`afterFill`、`validate`，实现见 src/sites.js
- 分步动作：`open-submit`
- 排期：30 天；验证：`live-receipt`
- 表单声明：`POST `
- 免费条件验证范围：Regular within30days-free; Instant within24h costs49USD, never selected
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `[name="first name"]` | firstName |
| `[name="last name"]` | lastName |
| `[name=email]` | email |
| `[name="tool name"]` | name |
| `[name="tool url"]` | url |
| `[name="additional info"]` | description |

跳过：`[name="video review"]`。

### TinyLaunch

- 入口：[tinylaunch.com](https://www.tinylaunch.com/dashboard/startups/new)
- 表单：`body:has(#firstName):has(#handle), form:has(#name):has(#category)`
- 提交按钮：`/^(Save Profile|Create Startup)$/i`
- 主动勾选：`#terms`；条款勾选受 autoAgree 设置控制
- 成功提示：`/^Launch Scheduled$/i`
- 同名按钮分步判断：按当前页面字段判断草稿与最终Submit；中间Done提示不算最终回执
- 自定义处理：`beforeFill`、`afterFill`、`validate`、`isDraftSubmit`，实现见 src/sites.js
- 分步动作：`verify-email`、`new-startup`、`free-date`、`free-options`、`skip-upsell`
- 排期：Pick earliest available free date <=100 days; observed 2026-12-07 (33 days from 2026-11-04); review usually <24h；验证：`live-scheduled-receipt`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 条款处理：提交即接受条款；关闭自动同意时等待人工最终点击

| 字段选择器 | 产品资料 |
| --- | --- |
| `#firstName` | firstName |
| `#lastName` | lastName |
| `#name` | name |
| `#tagline` | tagline |
| `#url` | url |
| `[contenteditable=true]` | description |

跳过：`#xHandle`、`input[type=file]:not([data-autosubmit-image=logo])`。

### Submit Your AI Tool

- 入口：[submityouraitool.com](https://embed.fillout.com/t/cBypbJX257us)
- 表单：`body:has(input[aria-label="AI Tool Name:"])`
- 提交按钮：`/^Submit$/i`
- 成功提示：`/^(?:Thank you for your submission\.|We will review your information and get back to you shortly\.)$/i`
- 自定义处理：`beforeFill`、`afterFill`、`validate`，实现见 src/sites.js
- 排期：未知；验证：`live-receipt`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `input[aria-label="Email:"]` | email |
| `input[aria-label="AI Tool Name:"]` | name |
| `input[aria-label="Website"]` | url |
| `textarea[aria-label="Description"]` | description |

跳过：`input[type=file]`。

### AIAI.Tools

- 入口：[aiai.tools](https://tally.so/embed/3NADy0)
- 表单：`form`
- 提交按钮：`/^Submit$/i`
- 主动勾选：`#choice_9696e6e3-4baf-484d-a1e7-00d9db1df83d`；条款勾选受 autoAgree 设置控制
- 成功提示：`/^(?:Form submitted|Thanks for completing this form!)$/i`
- 同名按钮分步判断：按当前页面字段判断草稿与最终Submit；中间Done提示不算最终回执
- 自定义处理：`validate`、`isDraftSubmit`，实现见 src/sites.js
- 排期：未知；验证：`live-receipt`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `[aria-label="Your Name"]` | fullName |
| `[aria-label="Contact Email Address"]` | email |
| `[aria-label="Tool Name"]` | name |
| `[aria-label="URL"]` | url |
| `[placeholder="Screenshot URL"]` | heroUrl |

跳过：`#choice_8824cb86-ba35-4a65-8e5c-b0fdc99a31e2`。

### The AI Navigator

- 入口：[theainavigator.com](https://www.theainavigator.com/submit-an-ai-tool)
- 表单：`.s-email-form`
- 提交按钮：`/^Submit$/i`
- 主动勾选：`input[type=checkbox][id^=gdpr-]`；条款勾选受 autoAgree 设置控制
- 成功提示：`/Thanks for your submission to The AI Navigator!/i`
- 排期：未知；验证：`live-receipt`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 条款处理：提交即接受条款；关闭自动同意时等待人工最终点击

| 字段选择器 | 产品资料 |
| --- | --- |
| `[placeholder="name of the AI tool"]` | name |
| `[placeholder="start with https://"]` | url |
| `[placeholder="In simple and clear wording"]` | tagline |
| `[placeholder="First Last"]` | fullName |
| `input[name$="#email"]` | email |

跳过：`[placeholder="e.g. @the_ainavigator"]`、`input[name$="#shortText"][aria-label=input]`、`textarea[placeholder^="Anything else"]`。

### SonicRun

- 入口：[sonicrun.com](https://www.sonicrun.com/freelisting.html)
- 表单：`form:has(input[name=url]), form:has(input[name=verify])`
- 提交按钮：`/^(Submit|Add Your Site)$/i`
- 主动勾选：`input[name=terms]`；条款勾选受 autoAgree 设置控制
- 成功提示：`/^Submission Received$/i`
- 排期：30 天；验证：`live-receipt-email-link`
- 表单声明：`POST /cgi-bin/add.cgi`
- 附带账号：FreeWebMonitoring free account
- 条款处理：提交即接受条款；关闭自动同意时等待人工最终点击（https://www.sonicrun.com/tos.html）

| 字段选择器 | 产品资料 |
| --- | --- |
| `input[name=url]` | url |
| `input[name=email]` | email |
| `input[name=name]` | fullName |

### AI Siteleri

- 入口：[aisiteleri.com](https://aisiteleri.com/yapay-zeka-oner/)
- 表单：`#wpforms-form-1390`
- 提交按钮：`/^Gönder$/i`
- 成功提示：`/Bizimle iletişime geçtiğiniz için teşekkür ederiz!/i`
- 排期：未知；验证：`live-receipt`
- 表单声明：`POST /yapay-zeka-oner/`
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `#wpforms-1390-field_0` | firstName |
| `#wpforms-1390-field_0-last` | lastName |
| `#wpforms-1390-field_1` | email |
| `#wpforms-1390-field_3` | url |
| `#wpforms-1390-field_4` | namedDescription |

跳过：`[name="wpforms[hp]"]`。

### AI News Hub

- 入口：[ainewshub.org](https://www.ainewshub.org/submit-ai-tool)
- 表单：`#comp-lr80oeg6`
- 提交按钮：`/^Submit$/i`
- 产品定价字段（与收录费分开）：`#input_comp-lr80oeh4`
- 成功提示：`/^(?:Thanks|Thank you).*submi|^(?:Your )?(?:form|tool|submission).*(?:received|submitted successfully)/i`
- 分步动作：`dismiss-newsletter`
- 排期：14–21 business days; max 2 free submissions per user/month；验证：`live-attempt-unconfirmed`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- HTML默认声明方法：`GET`；不能据此推断页面JavaScript实际请求
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `#input_comp-lr80oegl` | name |
| `#input_comp-lr80oegu` | url |
| `#input_comp-m7iyrhh2` | tags |
| `#input_comp-lr80oeh4` | pricing |
| `#input_comp-lr80td2t` | email |
| `#textarea_comp-lr80oeh7` | description |
| `#input_comp-m7kiuhkp` | discoverySource |

### iForAI

- 入口：[iforai.com](https://iforai.com/submit_website/)
- 表单：`form:has(input[name=post_title])`
- 提交按钮：`/提交审核/`
- 人工校验：`[name=image_captcha]`；插件等待输入，不解题
- 成功提示：`/操作成功|提交成功|已提交.*审核/i`
- 自定义处理：`afterFill`、`validate`，实现见 src/sites.js
- 排期：未知；验证：`live-form-captcha-blocked`
- 表单声明：`POST `
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `[name=post_title]` | name |
| `[name=link]` | url |
| `[name=sescribe]` | tagline |
| `[name=post_content]` | description |
| `[name=tags]` | tags |
| `[name=user_name]` | fullName |
| `[name=contact_details]` | email |

跳过：`[name=wechat_id]`、`[name=image_captcha]`。

### AI工具阁

- 入口：[ai-to.cn](https://ai-to.cn/contribute/)
- 表单：`form:has(input[name=post_title])`
- 提交按钮：`/提交审核/`
- 弹出校验：`#slider_captcha_body`；插件等待人工完成及弹层消失
- 成功提示：`/操作成功|提交成功|已提交.*审核/i`
- 自定义处理：`afterFill`、`validate`，实现见 src/sites.js
- 排期：未知；验证：`live-form-slider-blocked`
- 表单声明：`POST `
- 免费条件验证范围：Website form has no fee or backlink controls; only article submission explicitly described as free
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `[name=post_title]` | name |
| `[name=link]` | url |
| `[name=sescribe]` | tagline |
| `[name=post_content]` | description |
| `[name=tags]` | tags |
| `[name=user_name]` | fullName |
| `[name=contact_details]` | email |

跳过：`[name=wechat_id]`。

### 外贸百科

- 入口：[waimao21.com](https://waimao21.com/%e7%94%b3%e8%af%b7%e6%94%b6%e5%bd%95)
- 表单：`form:has(#tougaocategorg_sites)`
- 提交按钮：`/^提交$/`
- 人工校验：`#input_veri`；插件等待输入，不解题
- 成功提示：`/操作成功|提交成功|已提交.*审核/i`
- 自定义处理：`afterFill`、`validate`，实现见 src/sites.js
- 排期：未知；验证：`live-form-captcha-blocked`
- 表单声明：`POST /%e7%94%b3%e8%af%b7%e6%94%b6%e5%bd%95`
- 免费条件验证范围：No fee or reciprocal controls observed; final acceptance blocked by CAPTCHA
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `[name=tougao_title]` | name |
| `[name=tougao_sites_link]` | url |
| `[name=tougao_sites_sescribe]` | tagline |
| `[name=tougao_sites_keywords]` | tags |
| `[name=tougao_content]` | description |

跳过：`[name=captcha_canvas]`。

### Aier

- 入口：[aier.im](https://aier.im/submit)
- 表单：`form:has(input[name=website_url])`
- 提交按钮：`/^Submit AI Tool for Review$/i`
- 产品定价字段（与收录费分开）：`select`、`[data-as-picker=pricing]`
- 成功提示：`/thank you.*submi|submission.*(?:received|successful)|tool.*submitted successfully/i`
- 自定义处理：`beforeFill`、`afterFill`、`validate`，实现见 src/sites.js
- 排期：2–3 business days；验证：`live-form-pricing-blocked`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- HTML默认声明方法：`GET`；不能据此推断页面JavaScript实际请求
- 免费条件验证范围：No fee or backlink step on displayed form; no final RTFV submission
- 条款处理：提交即接受条款；关闭自动同意时等待人工最终点击（https://aier.im/terms-of-service）

| 字段选择器 | 产品资料 |
| --- | --- |
| `[name=name]` | name |
| `[name=website_url]` | url |
| `[name=short_description]` | description |
| `[name=what_is_description]` | longDescription |
| `[name=pricing_details]` | pricingNote |
| `[name=submitter_name]` | fullName |
| `[name=submitter_email]` | email |

跳过：`[name=submitter_twitter]`、`[name=submitter_linkedin]`、`[name=video_url]`、`input[type=file]`、`[placeholder="Enter a question"]`、`[placeholder="Enter the answer"]`、`[placeholder="Add a key feature"]`、`[placeholder="Add a use case"]`。

### ToolTrove (AnyFP)

- 入口：[tooltrove.net](https://tooltrove.net/submit)
- 表单：`form:has(#websiteUrl)`
- 提交按钮：`/^(Next|Submit(?: your tool)?(?: for review)?)$/i`
- 产品定价字段（与收录费分开）：`#pricing`
- 成功提示：`/submission (?:has been )?received|thanks for submitting|tool.*submitted successfully/i`
- 草稿动作：`/^Next$/i`；只进入下一步，不记为已提交或最终尝试
- 自定义处理：`afterFill`、`validate`，实现见 src/sites.js
- 排期：Usually a couple of days；验证：`live-form-pricing-blocked`
- 表单声明：`POST `
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `#name` | name |
| `#websiteUrl` | url |
| `#email` | email |
| `#tagline` | tagline |
| `#description` | longDescription |
| `#features` | features |
| `#priceNote` | pricingNote |

跳过：`[name=website2]`、`#pricing`、`#audience`、`#problem`、`#screenshots`、`#videoUrl`。

### SaaSHub

- 入口：[saashub.com](https://www.saashub.com/services/submit)
- 表单：`form:has(#service_name)`
- 提交按钮：`/^Free$/i`
- 成功提示：`/was submitted successfully|Thanks for submitting/i`
- 草稿动作：`/^Continue$/i`；只进入下一步，不记为已提交或最终尝试
- 自定义处理：`afterFill`、`validate`，实现见 src/sites.js
- 分步动作：`website-check`、`submission-receipt`
- 排期：Free queue 1–12 weeks；验证：`live-receipt-name-fallback`
- 表单声明：`POST /services`
- 条款处理：提交即接受条款；关闭自动同意时等待人工最终点击（https://www.saashub.com/site/terms）

| 字段选择器 | 产品资料 |
| --- | --- |
| `#service_name` | name |
| `#service_tagline` | tagline |
| `#service_contact_email` | email |

跳过：`#service_linkedin_url`、`#react-select-2-input`、`#react-select-3-input`。

### A1 Gallery

- 入口：[a1.gallery](https://www.a1.gallery/submit)
- 表单：`#panel-website form:has(input[name="Site-link"])`
- 提交按钮：`/^Submit website\s*→?$/i`
- 成功提示：`/Thanks, we[’']ll review your site soon/i`
- 分步动作：`login-before-submission`、`newsletter-login-consent`
- 排期：3–4 weeks；验证：`live-receipt-email-link`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- HTML默认声明方法：`GET`；不能据此推断页面JavaScript实际请求
- 登录附带订阅：weekly email; manual consent before sending login link；插件等待本人确认点击
- 条款处理：邮箱登录/注册即接受条款；关闭自动同意时等待人工继续（https://www.a1.gallery/terms）

| 字段选择器 | 产品资料 |
| --- | --- |
| `input[name="Site-link"]` | url |

跳过：`[name=_honeypot]`、`[name=Creator]`。

### AIGCLIST

- 入口：[aigclist.com](https://aigclist.com/submit)
- 表单：`#submit-details`
- 提交按钮：`/^Save draft & choose plan$/i`
- 产品定价字段（与收录费分开）：`#pricing`
- 成功提示：`/Submitted\s*[—-]\s*awaiting review|Your listing is in the free review queue/i`
- 草稿动作：`/^Save draft & choose plan$/i`；只进入下一步，不记为已提交或最终尝试
- 自定义处理：`afterFill`、`validate`，实现见 src/sites.js
- 分步动作：`email-signin`、`website-check`、`manual-details`、`free-review`
- 排期：Usually a few days; queue position is not a number of days；验证：`live-receipt`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `#name` | name |
| `#tagline` | tagline |
| `#content` | longDescription |
| `#notes` | pricingNote |

跳过：`#pricing`、`#discountCode`。

### Waild World

- 入口：[waildworld.com](https://waildworld.com/)
- 表单：`form:has(input[name=title])`
- 提交按钮：`/^Submit$/i`
- 产品定价字段（与收录费分开）：`input[name="models[]"]`
- 成功提示：`/Thank you for submitting your tool!/i`
- 自定义处理：`afterFill`，实现见 src/sites.js
- 排期：3 天；验证：`live-receipt`
- 表单声明：`POST index`
- 条款处理：提交即接受条款；关闭自动同意时等待人工最终点击（https://waildworld.com/terms-of-service）

| 字段选择器 | 产品资料 |
| --- | --- |
| `[name=title]` | name |
| `[name=url]` | url |
| `[name=desc]` | description |
| `[name=name]` | fullName |
| `[name=email]` | email |
| `[name=message]` | description |

### AI Marketing Directory

- 入口：[aimarketing.directory](https://tally.so/embed/nG1V7j?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1)
- 表单：`form`
- 提交按钮：`/^Submit$/i`
- 成功提示：`/^Form submitted$/i`
- 排期：未知；验证：`live-receipt`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `[id="e2e74529-7f39-407c-acba-49f16b296c66"]` | name |
| `[id="c4fd90a3-f2fe-4df9-a6f2-08f86d373727"]` | url |
| `[id="6755a0ea-8261-44db-a68a-38b7670adb44"]` | description |
| `[id="51ba7a53-68ff-4eb7-a266-2925e2939a73"]` | fullName |
| `input[type=email]` | email |

### WebCatalog

- 入口：[webcatalog.io](https://webcatalog.io/en/apps/submit)
- 表单：`form:has(#appName)`
- 提交按钮：`/^Submit recommendation$/i`
- 成功提示：`/The request has been sent successfully\./i`
- 分步动作：`email-option`
- 排期：未知；验证：`live-receipt-email-otp`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 条款处理：邮箱登录/注册即接受条款；关闭自动同意时等待人工继续（https://webcatalog.io/legal/terms-of-service）

| 字段选择器 | 产品资料 |
| --- | --- |
| `#appName` | name |
| `#url` | url |

### AI Tools for Marketers

- 入口：[aitoolsmarketer.com](https://aitoolsmarketer.com/submit/)
- 表单：`#submit`
- 提交按钮：`/^Submit your tool$/i`
- 主动勾选：`input[name=launch_preference][value=standard_queue]`；条款勾选受 autoAgree 设置控制
- 产品定价字段（与收录费分开）：`input[name=pricing_model]`
- 成功提示：`/^Thanks, .+ is submitted\.$/i`
- 自定义处理：`afterFill`、`validate`，实现见 src/sites.js
- 排期：standard editorial queue usually 2–3 weeks; email status within 24h；验证：`live-receipt`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `#tool_url` | url |
| `#tool_name` | name |
| `#tagline` | tagline |
| `#description` | description |
| `#marketing_problem` | description |
| `#marketing_help` | useCases |
| `#marketing_jobs` | marketingJobs |
| `#name` | fullName |
| `#email` | email |

跳过：`[name=website]`、`#secondary_category`、`#starting_price`、`#pricing_url`、`#replaces`、`#audience`、`#alternative_to`、`input[type=file]`、`#demo_video`、`#company`、`#founded`、`#headquarters`、`[id^=social_]`、`#affiliate_url`、`#reader_offer`、`#relation`。

### AI Tools Inc

- 入口：[aitools.inc](https://loxr142exnq.typeform.com/to/RB6ZnEf2)
- 表单：按网址字段识别提交表单
- 提交按钮：在表单内识别提交按钮
- 成功提示：`/We[’']ll be in touch over the next few days to proceed with your listing\./i`
- 分步动作：`typeform`
- Typeform 联系人页：`/where can we reach you/i`；字段 `[id="79ae6a70-8c70-4401-af9f-844c83bea8ff"]` → firstName、`[id="a77c3def-7695-4e69-9c08-0b1dd64ad6c7"]` → lastName、`input[type=email]` → email；名/姓缺失时等待补齐
- 排期：30–90 day listing time；验证：`live-receipt`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 条款处理：未观察到必须单独勾选的条款控件

### Best AI Tools

- 入口：[bestaitools.com](https://www.bestaitools.com/tool-suggestion-form/)
- 表单：`#wpforms-form-442`
- 提交按钮：`#wpforms-submit-442`
- 成功提示：`/Thanks for suggesting a new tool!/i`
- 排期：a few days；验证：`live-receipt`
- 表单声明：`POST /tool-suggestion-form/`
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `#wpforms-442-field_0` | firstName |
| `#wpforms-442-field_0-last` | lastName |
| `#wpforms-442-field_1` | email |
| `#wpforms-442-field_3` | name |
| `#wpforms-442-field_4` | url |
| `#wpforms-442-field_2` | description |

跳过：`#wpforms-442-field_5`、`#wpforms-442-field_6`。

### 映技派

- 入口：[yjpoo.com](https://www.yjpoo.com/submit-ai-tool/)
- 表单：`form:has(#attr_28)`
- 提交按钮：`input[type=submit]`
- 成功提示：`/^操作成功$/`
- 排期：一般24小时内审核；验证：`live-receipt`
- 表单声明：`POST /index.php?m=home&c=Lists&a=gbook_submit&lang=cn`
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `#attr_28` | name |
| `#attr_30` | url |
| `#attr_38` | description |

### Launching Next

- 入口：[launchingnext.com](https://www.launchingnext.com/submit/)
- 表单：`form:has([name=startupname])`
- 提交按钮：`input[name=formSubmit]`
- 人工校验：`input[name=math]`；插件等待输入，不解题
- 成功提示：`/thank you|thanks for|submission.*received|startup.*submitted|successfully submitted/i`
- 排期：未知；验证：`form-only-human-check`
- 表单声明：`POST /submit/`
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `[name=startupname]` | name |
| `[name=startupurl]` | url |
| `[name=description]` | launchHeadline |
| `[name=fulldescription]` | description |
| `[name=tags]` | tags |
| `[name=user]` | fullName |
| `[name=email]` | email |

跳过：`[name=funding]`、`[name=marketing_budget]`、`[name=newsletter_optin]`、`[name=math]`。

### Future Tools

- 入口：[futuretools.io](https://futuretools.io/submit-a-tool)
- 表单：`form:has(#tool_name)`
- 提交按钮：`/^Submit Tool$/i`
- 产品定价字段（与收录费分开）：`input[name=pricing_tier]`
- 成功提示：`/thank you|thanks for|submitted successfully|submission.*received|we[’']ll review/i`
- 自定义处理：`afterFill`、`validate`，实现见 src/sites.js
- 排期：未知；验证：`form-only-captcha-blocked`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `#tool_name` | name |
| `#tool_url` | url |
| `#description` | description |
| `#submitter_email` | email |

跳过：`[name=newsletter_opt_in]`。

### AI Tools Library

- 入口：[aitools.sh](https://aitools.sh/submit-a-tool/)
- 表单：`form:has(#tool_name)`
- 提交按钮：`/^Submit for review$/i`
- 成功提示：`/Thanks! Your tool was submitted and is pending review\./i`
- 自定义处理：`afterFill`、`validate`，实现见 src/sites.js
- 排期：未知；验证：`live-receipt`
- 表单声明：`POST https://aitools.sh/wp-admin/admin-post.php`
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `#tool_name` | name |
| `#tool_url` | url |
| `#tool_description` | description |
| `#tool_tags` | tags |
| `#submitter_name` | fullName |
| `#submitter_email` | email |

### ReviewAI

- 入口：[reviewai.net](https://reviewai.net/#submit)
- 表单：`#add-form`
- 提交按钮：`/^Submit for review$/i`
- 成功提示：`/Thanks! We[’']ll review your tool and publish it soon\./i`
- 排期：未知；验证：`live-receipt`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `[name=name]` | name |
| `[name=url]` | url |
| `[name=desc]` | description |
| `[name=email]` | email |

跳过：`[name=website]`。

### Human or Not

- 入口：[humanornot.co](https://www.humanornot.co/submit-tool)
- 表单：`#wf-form-Tool-submit`
- 提交按钮：`#wf-form-Tool-submit input[type=submit]`
- 成功提示：`/Thank you! Your submission has been received!/i`
- 排期：2 天；验证：`live-receipt`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `#Email-2` | email |
| `#URL-2` | url |

### TheToolBus

- 入口：[thetoolbus.ai](https://www.thetoolbus.ai/ai-tools/submit)
- 表单：`#submit-form`
- 提交按钮：`/^Submit Tool$/i`
- 免费选项：`/^Directory listing\s+Free\b/i`
- 主动勾选：`input[name=placement][value=directory]`；条款勾选受 autoAgree 设置控制
- 成功提示：`/Tool submitted|Thanks for your submission\. We[’']ll review it/i`
- 自定义处理：`afterFill`、`validate`，实现见 src/sites.js
- 排期：within a few days；验证：`live-receipt`
- 表单声明：`POST /api/forms?form=ai_tool_submission`
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `#tool-name` | name |
| `#tool-url` | url |
| `#tool-description` | description |
| `#submitter-email` | email |
| `#tool-pricing` | pricing |

跳过：`[name=_honey]`。

### Jayde

- 入口：[jayde.com](https://www.jayde.com/submit.html)
- 表单：`#submission-form`
- 提交按钮：`/^Add my Site$/i`
- 成功提示：`/Your site has been added to the directory\./i`
- 排期：0 天；验证：`live-listed`
- 表单声明：`POST /submit.html`
- 条款处理：提交即接受条款；关闭自动同意时等待人工最终点击（https://www.jayde.com/terms.html）

| 字段选择器 | 产品资料 |
| --- | --- |
| `#f-url` | url |
| `#f-email` | email |
| `#f-business` | name |
| `#f-description` | description |

跳过：`[name=company_website]`、`#f-name`、`#f-address`、`#f-phone`、`#f-zip`、`#f-country`、`#f-state`、`#f-industry`、`#f-facebook`、`#f-twitter`、`#f-youtube`、`#f-logo`、`#f-gmap`。

### KI-Suche

- 入口：[ki-suche.io](https://www.ki-suche.io/einreichen)
- 表单：`form:has([name=tag_slug])`
- 提交按钮：`/^Tool einreichen$/i`
- 成功提示：`/Danke für deine Einreichung!/i`
- 排期：未知；验证：`live-receipt`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `[name=title]` | name |
| `[name=url]` | url |
| `[name=description]` | description |

跳过：`[name=company]`。

### AI工具网

- 入口：[ai138.com](https://www.ai138.com/submit)
- 表单：`form:has([name=post_title])`
- 提交按钮：`/^提交审核$/`
- 成功提示：`/提交成功|投稿成功|已收到您的投稿|已提交.*审核/`
- 自定义处理：`beforeFill`、`afterFill`、`validate`，实现见 src/sites.js
- 排期：未知；验证：`live-attempt-unconfirmed`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `[name=post_title]` | name |
| `[name=link]` | url |
| `[name=sescribe]` | tagline |
| `[name=post_content]` | description |
| `[name=tags]` | tags |
| `[name=user_name]` | fullName |
| `[name=contact_details]` | email |

### With AI Tools

- 入口：[withaitools.com](https://www.withaitools.com/submit)
- 表单：`form:has(input[type=url])`
- 提交按钮：`/^Submit$/i`
- 成功提示：`/^Your tool (?:has been |was )?(?:submitted|listed|added)(?: successfully)?[.!]?$/i`
- 分步动作：`already-listed`、`public-listing`
- 排期：Existing listing verified; new listing queue unknown；验证：`live-existing-public-listing`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 免费条件验证范围：Pricing says every tool gets a free listing forever; RTFV already existed since2026-10-14
- 条款处理：未观察到必须单独勾选的条款控件

### AppRater

- 入口：[apprater.net](https://apprater.net/#submit)
- 表单：`form:has([name=appUrl])`
- 提交按钮：在表单内识别提交按钮
- 主动勾选：`input[name=platform][value="Web" i]`；条款勾选受 autoAgree 设置控制

跳过：`input[name=website]`。

### Aigist

- 入口：[aigist.org](https://aigist.org/submit-tool)
- 表单：`form:has([name=short_description])`
- 提交按钮：在表单内识别提交按钮
- 成功提示：`/^(?:Thank you for (?:your submission|submitting your tool)|Your tool (?:has been )?submitted successfully)/i`
- 自定义处理：`afterFill`、`validate`，实现见 src/sites.js
- 排期：Usually5 business days；验证：`live-form-captcha-blocked`
- 表单声明：`POST /submit-tool-action.php`
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `[name=title]` | name |
| `[name=url]` | url |
| `[name=short_description]` | tagline |
| `[name=full_description]` | description |
| `[name=email]` | email |
| `#contact_first_name` | firstName |

跳过：`#starting_price`、`#main_alternative`、`#wants_visibility_finding`、`#buyer_description`、`#newsletter_email`。

### RankmyAI

- 入口：[rankmyai.com](https://www.rankmyai.com/tool-addition)
- 表单：`form:has([name=your-email])`
- 提交按钮：`/^Send(?:\s|$)/i`
- 成功提示：`/^(?:Thank you.*(?:submission|tool|information)|Your (?:tool|submission).*(?:received|submitted)|Message sent successfully)/i`
- 自定义处理：`validate`，实现见 src/sites.js
- 排期：未知；验证：`live-attempt-unconfirmed`
- 表单声明：`POST https://www.rankmyai.com/ajax/addition-form`
- 免费条件验证范围：Official tool addition form explicitly free of charge; no required backlink
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `#your-name` | fullName |
| `#your-email` | email |
| `#what-is-the-name-of-the-tool` | name |
| `#tool-website-url-or-subdomain` | url |
| `#use-what-are-the-most-prominent-use-cases-or-functionalities-of-your-tool` | useCases |
| `#give-a-short-description-of-your-tool` | description |
| `#legal-company-name-or-developers-full-name-if-not-a-company` | legalName |
| `#pricing-paidfreemiumfree` | pricing |

跳过：`#legal-company-name-or-developers-full-name-if-not-a-company`、`#what-is-the-producthunt-profile-link-of-your-tool`、`#official-company-registration-number-if-applicable`、`#company-website`、`#linkedin-url`、`#year-founded-in-which-year-was-your-business-founded`、`#number-of-employees`、`#country-where-the-headquarter-of-the-company-is-located`、`#stateprovince-where-the-headquarter-of-the-company-is-located`、`#city-where-the-headquarter-of-the-company-is-located`、`#street-address-of-the-companys-headquarters`、`#postal-code-of-the-companys-headquarters`、`#what-is-the-pricing-page-url-of-your-tool`、`#api-availability-yesno`、`#mcp-connector-availability-yesno`。

### ExactSeek

- 入口：[exactseek.com](https://www.exactseek.com/add.html)
- 表单：`form:has(#URL)`
- 提交按钮：在表单内识别提交按钮
- 主动勾选：`input[name=agree]`；条款勾选受 autoAgree 设置控制
- 成功提示：`/^(?:Thank you.*(?:submi|adding)|Your (?:site|submission).*(?:received|added|submitted)|Please (?:check|verify|confirm) your email)/i`
- 排期：未知；验证：`live-attempt-unconfirmed`
- 表单声明：`POST /cgi-bin/eadd-t-new.cgi`
- 附带账号：SiteProNews webmaster newsletter; explicit user consent required
- 条款处理：提交即接受条款；关闭自动同意时等待人工最终点击（https://www.exactseek.com/terms.html）

| 字段选择器 | 产品资料 |
| --- | --- |
| `#URL` | url |
| `#NAME` | fullName |
| `#EMAIL` | email |

### Active Search Results

- 入口：[activesearchresults.com](https://www.activesearchresults.com/addwebsite.php)
- 表单：`form:has(input[name=url])`
- 提交按钮：`input[name=submiturl]`
- 成功提示：`/^(?:Added Web Site Confirmation|Thank you for adding your Web site to the Active Search Results search engine\.)$/i`
- 分步动作：`accept-cookies`
- 排期：Usually1–2hours; hourly crawl/index, no sign-in or email activation；验证：`live-receipt`
- 表单声明：`POST /addwebsite.php`
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `input[name=url]` | url |
| `input[name=email]` | email |

### NexTools

- 入口：[nextools.live](https://nextools.live/contact/)
- 表单：`form.wpforms-form`
- 提交按钮：`/^Submit$/i`
- 成功提示：`/^(?:Thanks for contacting us!|Your message has been sent successfully\.|Thank you for contacting us\.)/i`
- 排期：Contact response24–48hours, listing queue unknown；验证：`live-attempt-unconfirmed`
- 表单声明：`POST /contact/`
- 免费条件验证范围：Contact request is free; directory eligibility awaits response
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `[name="wpforms[fields][0]"]` | fullName |
| `[name="wpforms[fields][1]"]` | email |
| `[name="wpforms[fields][3]"]` | contactSubject |
| `[name="wpforms[fields][2]"]` | contactMessage |

跳过：`#wpforms-3161-field_4`、`#wpforms-3161-field_5`。

### AIToolboard

- 入口：[aitoolboard.com](https://aitoolboard.com/submit)
- 表单：`form:has([name=listing_type])`
- 提交按钮：在表单内识别提交按钮
- 免费选项：`/^free listing/i`
- 自定义处理：`validate`，实现见 src/sites.js
- 排期：未知；验证：`live-form-pricing-blocked`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `input[placeholder^="e.g., ChatGPT"]` | name |
| `input[placeholder^="Brief description"]` | tagline |
| `input[placeholder^="http://example.com"]` | url |
| `input[placeholder^="AI, chatbot"]` | tags |

### YouTools

- 入口：[youtools.ai](https://youtools.ai/submit-tool)
- 表单：`form:has([name=root_domain])`
- 提交按钮：`/^submit for review(?:\s*\((?:free|\$0(?:\.00)?)\))?$/i`
- 免费选项：`/^free\s*\$0/i`
- 分步动作：`pick3`
- 排期：Free2–3weeks; nofollow；验证：`live-free-form-login-skipped`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `[name=root_domain]` | rootUrl |

### Startup Stash

- 入口：[startupstash.com](https://form.typeform.com/to/b8EyDE)
- 表单：按网址字段识别提交表单
- 提交按钮：在表单内识别提交按钮
- 分步动作：`typeform`
- 排期：未知；验证：`live-form-review-only`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 免费条件验证范围：Listing application reaches thank-you when advertising is answered No. Yes opens campaign timing and a budget starting under $3,000. Work email required; Gmail, Outlook and Yahoo are rejected. Category list includes Videos.
- 条款处理：未观察到必须单独勾选的条款控件

### Brownbook

- 入口：[brownbook.net](https://www.brownbook.net/add-business)
- 表单：`form:has([name=zip_code])`
- 提交按钮：在表单内识别提交按钮
- 成功提示：`/^Your business (?:has been |was )?(?:added|submitted) successfully[.!]?$/i`
- 草稿动作：`/^Next$/i`；只进入下一步，不记为已提交或最终尝试
- 自定义处理：`beforeFill`、`validate`，实现见 src/sites.js
- 分步动作：`registration-review`
- 排期：未知；验证：`live-registration-captcha-blocked`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `[name=name]` | name |
| `[name=address]` | street |
| `[name=city]` | city |
| `[name=zip_code]` | zip |
| `[name=phone]` | phone |
| `[name=website]` | url |
| `[name=display_website]` | url |
| `[name=email]` | email |

### ChatableApps

- 入口：[chatableapps.com](https://chatableapps.com/submit)
- 表单：按网址字段识别提交表单
- 提交按钮：`/^(next|create)$/i`
- 免费选项：`/^free plan/i`
- 产品定价字段（与收录费分开）：`[id="form.price_type"]`
- 草稿动作：`/^Next$/i`；只进入下一步，不记为已提交或最终尝试
- 自定义处理：`beforeFill`、`validate`、`findSubmit`，实现见 src/sites.js
- 排期：Free about one month; nofollow；验证：`live-authenticated-pricing-blocked`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `[id="form.name"]` | name |
| `[id="form.short_description.en"]` | tagline |
| `[id="form.long_description.en"]` | description |
| `[id="form.url"]` | url |

### Launch

- 入口：[trylaunch.ai](https://trylaunch.ai/submit)
- 表单：`main form`
- 提交按钮：`/^(next|submit to launch)$/i`
- 主动勾选：`#platform-web`；条款勾选受 autoAgree 设置控制
- 自定义处理：`beforeFill`，实现见 src/sites.js

### BestofAI

- 入口：[bestofai.com](https://bestofai.com/)
- 表单：`form:has([name=url])`
- 提交按钮：`/^submit tool$/i`
- 自定义处理：`beforeFill`，实现见 src/sites.js
- 分步动作：`verified-account-error`
- 排期：未知；验证：`live-auth-verified-site-error`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 免费条件验证范围：Authenticated submission page returns User not found; listing eligibility unverified
- 条款处理：未观察到必须单独勾选的条款控件

| 字段选择器 | 产品资料 |
| --- | --- |
| `#url` | url |
| `#title` | name |
| `#tags` | tags |
| `#description` | description |

### Makerlist

- 入口：[makerlist.io](https://makerlist.io/submit)
- 表单：`form:has(#urlo)`
- 提交按钮：`a.item-submit`
- 自定义处理：`beforeFill`，实现见 src/sites.js

### Scout Forge

- 入口：[scoutforge.net](https://scoutforge.net/app-register)
- 表单：`form:has(#url), form:has(#name):has(#shortDescription), form:has(#terms):has(#mailSubscription)`
- 提交按钮：`/^(Next|Submit Register)$/i`
- 成功提示：`/^Application Submitted Successfully!$/i`
- 草稿动作：`/^Next$/i`；只进入下一步，不记为已提交或最终尝试
- 自定义处理：`beforeFill`、`afterFill`、`validate`，实现见 src/sites.js
- 分步动作：`client-entry`、`stale-auth-gate`
- 排期：Usually3–5business days；验证：`live-receipt-partial-adapter`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 条款处理：提交即接受条款；关闭自动同意时等待人工最终点击（https://scoutforge.net/terms-and-conditions）

| 字段选择器 | 产品资料 |
| --- | --- |
| `#url` | url |
| `#name` | name |
| `#shortDescription` | tagline |
| `#longDescription` | description |

跳过：`input[name^="targetCustomers."]`、`input[name^="alternatives."]`、`textarea[name^="alternatives."]`、`input[placeholder="Select tags"]`、`input[name^="socialMedia."]`、`[data-autosubmit-ignore]`。

### ToolScout

- 入口：[toolscout.ai](https://toolscout.ai/submit)
- 表单：`form[action="/submit"]`
- 提交按钮：`/^(Next step:.*|Continue with Free|Submit for review)$/i`
- 免费选项：`/^STANDARD LISTING\s+Free\s*\$0/i`
- 成功提示：`/^(?:Your tool has been submitted for review\.?|Submission (?:received|successful)|Thank you for submitting)/i`
- 草稿动作：`/^(Next step:.*|Continue with Free)$/i`；只进入下一步，不记为已提交或最终尝试
- 自定义处理：`afterFill`、`validate`，实现见 src/sites.js
- 分步动作：`human-community-gate`
- 排期：A week or more; upper bound unknown (paid boost24–48h excluded)；验证：`live-authenticated-human-gate`
- 表单声明：`POST /submit`
- 条款处理：邮箱登录/注册即接受条款；关闭自动同意时等待人工继续（https://toolscout.ai/tos）

| 字段选择器 | 产品资料 |
| --- | --- |
| `#name` | name |
| `#url` | url |
| `#description` | description |

跳过：`#downloadUrl`、`#pricingUrl`、`textarea:not(#description)`。

### Alternative.me

- 入口：[alternative.me](https://alternative.me/login/)
- 表单：按网址字段识别提交表单
- 提交按钮：在表单内识别提交按钮
- 分步动作：`unverified-account`
- 排期：未知；验证：`live-account-email-unverified`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 免费条件验证范围：Registered account is Pending User; final listing conditions unverified
- 条款处理：未观察到必须单独勾选的条款控件

### Startup Buffer

- 入口：[startupbuffer.com](https://startupbuffer.com/site/submit)
- 表单：`form:has(#name), form:has(#pitch), form:has(#country)`
- 提交按钮：`/^(Continue|Submit Now)$/i`
- 成功提示：`/^Your submission is in\.$/i`
- 草稿动作：`/^Continue$/i`；只进入下一步，不记为已提交或最终尝试
- 自定义处理：`beforeFill`、`afterFill`、`validate`，实现见 src/sites.js
- 排期：未知；验证：`live-receipt`
- 表单声明：由页面 JavaScript 处理，实际请求方法/地址未确认
- 免费条件验证范围：Submission in review; no promotion package attached; paid promotions optional
- 条款处理：提交即接受条款；关闭自动同意时等待人工最终点击（https://startupbuffer.com/site/tos）

| 字段选择器 | 产品资料 |
| --- | --- |
| `#name` | name |
| `#url` | url |
| `#pitch` | tagline |
| `#description` | description |
| `#country` | country |
| `#tags` | tags |

### Viesearch

- 入口：[viesearch.com](https://viesearch.com/submit)
- 表单：`form:has(input[name=url]):has(input[name=email])`
- 提交按钮：`/^submit$/i`
- 成功提示：`/^(?:Thank you.*submi|Your (?:site|website|URL|submission).*(?:submitted|received|pending|added)|Submission (?:received|successful)|URL submitted successfully)/i`
- 排期：Usually1–2business days; may take longer with volume；验证：`live-filled-awaiting-consent`
- 表单声明：`POST /submit`
- 条款处理：提交即接受条款；关闭自动同意时等待人工最终点击（https://viesearch.com/terms）

| 字段选择器 | 产品资料 |
| --- | --- |
| `#url` | url |
| `#title` | name |
| `#description` | description |
| `#email` | email |

跳过：`#category-search`。

### TinyLaunchpad

- 入口：[tinylaunchpad.com](https://tinylaunchpad.com/projects/submit)
- 表单：按网址字段识别提交表单
- 提交按钮：在表单内识别提交按钮
- 免费选项：`/^free(?: launch)?(?:\s|$)/i`

