// Generate reviewable documentation from the same catalog used by the extension.
// Reads recorded evidence only; this script never visits or submits to a website.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const progressReport = require('./write-progress-report');

const root = path.resolve(__dirname, '..');
const auditPath = path.join(root, 'docs/candidate-audit-2026-11-03.json');
const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
const sites = vm.runInNewContext(fs.readFileSync(path.join(root, 'src/sites.js'), 'utf8') + '; SITES');
const reviewed = sites.filter(site => site.protocol);
const date = audit.updatedDate || audit.date;
const cell = value => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
const code = value => '`' + String(value ?? '').replaceAll('`', '\\`').replaceAll('\n', ' ') + '`';
const queue = (days, text) => text || (days == null ? '未知' : `${days} 天`);
const write = (file, value) => fs.writeFileSync(path.join(root, file), value);

const manifest = sites.map(site => ({
  id: site.id, name: site.name, domain: site.domain, url: site.url,
  sourceDomains: site.sourceDomains || [], automaticFinalSubmit: !site.reviewBeforeSubmit,
  executionMode: 'browser-dom', login: site.login,
  emailOnly: !!site.emailOnly,
  extraHosts: (site.extraHosts || []).map(String),
  extraPath: site.extraPath ? String(site.extraPath) : null,
  form: site.form || null, fill: site.fill || {}, skip: site.skip || [],
  check: site.check || [], productPricing: site.productPricing || [],
  optionalReciprocalNo: site.optionalReciprocalNo || null,
  humanFields: site.humanFields || [], category: site.category || null,
  humanChallenges: site.humanChallenges || [], emailLinkPattern: site.emailLinkPattern ? String(site.emailLinkPattern) : null,
  typeformContact: site.typeformContact ? { question: String(site.typeformContact.question), fill: site.typeformContact.fill } : null,
  free: site.free ? String(site.free) : null,
  start: site.start ? String(site.start) : null,
  submit: site.submit ? String(site.submit) : null,
  draftSubmit: site.draftSubmit ? String(site.draftSubmit) : null,
  success: site.success ? String(site.success) : null,
  reviewBeforeSubmit: !!site.reviewBeforeSubmit,
  hooks: ['beforeFill', 'afterFill', 'validate', 'isDraftSubmit', 'findSubmit'].filter(key => typeof site[key] === 'function'),
  steps: (site.steps || []).map(step => ({ id: step.id, label: step.label })),
  protocol: site.protocol || null,
  verification: site.protocol?.verified || 'existing-adapter',
  note: site.note || {},
}));

for (const row of audit.sites) {
  const site = manifest.find(site => site.domain === row.domain || site.sourceDomains.includes(row.domain));
  if (!site) continue;
  row.adapterId = site.id;
  row.adapterVerification = site.verification;
  row.submissionMethod ||= { mode: 'browser-dom' };
  row.submissionMethod.adapterAvailable = true;
  row.submissionMethod.automationReady = !site.reviewBeforeSubmit;
  row.submissionMethod.adapter = site;
  if (site.protocol) {
    row.protocol = site.protocol;
    row.queueDays = site.protocol.queueDays;
  }
}
write('docs/supported-sites.json', JSON.stringify({ date, count: manifest.length, executionMode: 'browser-dom', sites: manifest }, null, 2) + '\n');
if (audit.execution?.progressChecklist) audit.execution.progressChecklist.firstReviewDomains = progressReport.firstReviewDomains(audit);
write('docs/candidate-audit-2026-11-03.json', JSON.stringify(audit, null, 2) + '\n');

let supported = `# 支持站点与页面提交流程（${date}）\n\n`;
supported += `当前目录共 **${sites.length}** 项，其中 **${reviewed.length}** 项具有本轮表单分析记录。已有适配、表单本地测试、真实站点回执是不同验证层级，见各项说明。\n\n`;
supported += '插件通过打开页面、填写字段、选择免费收录、主动勾选条款复选框和点击按钮提交。验证码与缺失的账号/必填资料需要人工处理；未公开的排期标注为未知。表单声明的方法和地址只用于维护记录，不用于直接调用提交 API。\n\n';
supported += '普通邮箱密码登录读取批量页的本地配置，模拟填入并点击；支持先邮箱后密码的两步登录。密码错误时停止，不据此重复注册。Gmail验证检索包括垃圾邮件和垃圾箱，同时限定收件人、站点及请求时间。历史查重或用户暂缓的站点默认不勾选，也不计作投稿成功。\n\n';
supported += '配置数量包含仅填表并暂停的流程，不表示每项都能自动完成。AI工具阁的网址免费条件尚未单独确认，外贸百科最终流程未验证，两者默认仅填表等待检查；Aier、ToolTrove缺少Free Trial时停止；验证码、原创文案或素材缺失也不算提交成功。\n\n';
supported += '产品可设置按顺序使用的重名备用名称。只有已提交后收到明确的“Name - has already been taken”等名称错误才切换；网址重复、普通报错和回执未知都不改名重投。原产品名保持不变，JSON/CSV保留实际投稿名与尝试名称。\n\n';
supported += '公开截图/主图网址与本地上传图片分别保存；需要图片网址的表单不会接收本地data URL。共享问卷域名同时匹配表单路径。AIAI.Tools明确选互链No，第二页Done仍需最后一次Submit；SubmitYourAITool要求JPEG≤1MB并等上传完成。Toolhunter最终要求徽章才发布，已从可选目录排除。\n\n';
supported += '| 站点 | 入口 | 登录 | 最终点击 | 验证层级 | 说明 |\n| --- | --- | --- | --- | --- | --- |\n';
for (const site of manifest) supported += `| ${cell(site.name)} | [${site.domain}](${site.url}) | ${site.login || '不需要'} | ${site.reviewBeforeSubmit ? '人工检查后点击' : '自动（必要时等待人工）'} | ${site.verification} | ${cell(site.note.zh)} |\n`;
supported += '\n## 页面字段与动作\n\n';
for (const site of manifest) {
  supported += `### ${site.name}\n\n`;
  supported += `- 入口：[${site.domain}](${site.url})\n- 表单：${site.form ? code(site.form) : '按网址字段识别提交表单'}\n- 提交按钮：${site.submit ? code(site.submit) : '在表单内识别提交按钮'}\n`;
  if (site.free) supported += `- 免费选项：${code(site.free)}\n`;
  if (site.check.length) supported += `- 主动勾选：${site.check.map(code).join('、')}；条款勾选受 autoAgree 设置控制\n`;
  if (site.humanFields.length) supported += `- 人工校验：${site.humanFields.map(code).join('、')}；插件等待输入，不解题\n`;
  if (site.humanChallenges.length) supported += `- 弹出校验：${site.humanChallenges.map(code).join('、')}；插件等待人工完成及弹层消失\n`;
  if (site.productPricing.length) supported += `- 产品定价字段（与收录费分开）：${site.productPricing.map(code).join('、')}\n`;
  if (site.success) supported += `- 成功提示：${code(site.success)}\n`;
  if (site.draftSubmit) supported += `- 草稿动作：${code(site.draftSubmit)}；只进入下一步，不记为已提交或最终尝试\n`;
  if (site.hooks.includes('isDraftSubmit')) supported += '- 同名按钮分步判断：按当前页面字段判断草稿与最终Submit；中间Done提示不算最终回执\n';
  if (site.hooks.length) supported += `- 自定义处理：${site.hooks.map(code).join('、')}，实现见 src/sites.js\n`;
  if (site.steps.length) supported += `- 分步动作：${site.steps.map(step => code(step.id)).join('、')}\n`;
  if (site.typeformContact) supported += `- Typeform 联系人页：${code(site.typeformContact.question)}；字段 ${Object.entries(site.typeformContact.fill).map(([sel, key]) => code(sel) + ' → ' + key).join('、')}；名/姓缺失时等待补齐\n`;
  if (site.protocol) {
    const p = site.protocol;
    supported += `- 排期：${queue(p.queueDays,p.queueText)}；验证：${code(p.verified)}\n`;
    supported += `- 表单声明：${p.method ? code(p.method + ' ' + (p.action || '')) : '由页面 JavaScript 处理，实际请求方法/地址未确认'}\n`;
    if (p.declaredMethod) supported += `- HTML默认声明方法：${code(p.declaredMethod)}；不能据此推断页面JavaScript实际请求\n`;
    if (p.authSubscription) supported += `- 登录附带订阅：${p.authSubscription}；插件等待本人确认点击\n`;
    if (p.freeStatus) supported += `- 免费条件验证范围：${p.freeStatus}\n`;
    if (p.accountSideEffect) supported += `- 附带账号：${p.accountSideEffect}\n`;
    supported += `- 条款处理：${p.terms === 'submission-accepts' ? '提交即接受条款；关闭自动同意时等待人工最终点击' : p.terms === 'auth-accepts' ? '邮箱登录/注册即接受条款；关闭自动同意时等待人工继续' : '未观察到必须单独勾选的条款控件'}${p.termsUrl ? '（' + p.termsUrl + '）' : ''}\n`;
  }
  if (Object.keys(site.fill).length) {
    supported += '\n| 字段选择器 | 产品资料 |\n| --- | --- |\n';
    for (const [selector, key] of Object.entries(site.fill)) supported += `| ${code(selector)} | ${key} |\n`;
  }
  if (site.skip.length) supported += '\n跳过：' + site.skip.map(code).join('、') + '。\n';
  supported += '\n';
}
write('docs/supported-sites.md', supported);

const states = {};
for (const row of audit.sites) states[row.status] = (states[row.status] || 0) + 1;
const formCount = audit.sites.filter(row => ['form', 'flow-snapshot', 'live-page-flow'].includes(row.analysisLevel)).length;
let report = `# 站点提交结构与筛选台账（${date}）\n\n`;
report += `输入清单去重后 **${audit.sites.length}** 个域名，**${formCount}** 个已有表单或流程结构记录。当前插件 **${sites.length}** 项，其中 **${reviewed.length}** 项有分层结构记录。其余保留访问阻塞、需登录、待分析或排除原因，不能当作全部已适配。\n\n`;
report += '执行方式与全部可选站点的字段、按钮、免费方案、校验和成功提示见 [支持站点与页面流程](supported-sites.md)，机器可读配置见 [supported-sites.json](supported-sites.json)。\n\n';
report += '规则：仅免费、无强制互链或徽章，公开队列上限不得超过 100 天。确认免费且无互链、排期未知的渠道可以提交，并单独标注。所有自动提交通过页面 DOM 操作完成。\n\n';
if (audit.execution?.realSiteTestingDeferred) report += '2026-11-04 用户选择先完成代码和记录，暂不继续真实站点实测。新增本地测试不会产生真实投稿。\n\n';
else report += '2026-11-04 内置浏览器权限已恢复，用户已授权继续真实站点实测；以下记录区分真实回执、本地测试和未确认尝试。\n\n';
report += '## RTFV 实际提交记录\n\n| 站点 | 结果 | 排期 | 证据 |\n| --- | --- | --- | --- |\n';
for (const row of audit.sites.filter(row => row.submission)) report += `| ${row.domain} | ${cell(row.submission.status)}：${cell(row.submission.message)}${row.submission.submittedName ? '（投稿名：'+cell(row.submission.submittedName)+'）' : ''} | ${queue(row.queueDays,row.protocol?.queueText || row.queueNote)} | ${row.proofImage ? '[' + (row.proofNote ? '后续页面，见备注' : '截图') + '](' + row.proofImage.replace(/^docs\//, '') + ')' : row.emailEvidence ? '[邮件回执](' + row.emailEvidence.displayUrl + ')' : '无明确成功截图'} |\n`;
const uncertain = audit.sites.filter(row => row.submission?.status === 'attempted-unconfirmed').map(row => row.domain).join('、');
report += `\nJayde 返回已加入目录，其余成功回执仅代表待审核。${uncertain} 尚未确认结果，核对后再重试；Future Tools 仍被验证码阻塞。\n\n`;
report += 'Toolhunter虽显示Accepted/approved，但最终明确要求添加徽章并验证才发布，因此记为已接收未发布、排除强制互链，不计入免费无互链成功回执。\n\n';
for (const row of audit.sites.filter(row => row.proofNote)) report += `- ${row.domain} 截图备注：${row.proofNote}\n`;
report += '\n';
if (audit.execution?.productPricing) {
  report += `## 产品定价资料更正\n\nRTFV 产品收费模式以用户明确确认为准：**${audit.execution.productPricing.value}**；这与目录投稿费用无关。目录投稿仍只选免费。\n\n`;
  report += '| 站点 | 原提交值 | 正确值 | 状态 |\n| --- | --- | --- | --- |\n';
  for (const row of audit.sites.filter(row => row.dataCorrections?.length)) {
    const c = row.dataCorrections.at(-1);
    report += `| ${row.domain} | ${c.submittedValue} | ${c.correctValue} | ${c.status} |\n`;
  }
  report += '\n上述4站保留更正待办，不重复投稿。用户已选择“仅保留记录，暂不发送”；联系入口与可审阅文字见 [定价更正草稿](rtfv-data-corrections-2026-11-04.md)。AIGCLIST 没有 Free Trial 下拉项，已将可选定价留空，并在审核备注写明提供免费试用。\n\n';
}
report += '## 全部候选\n\n表单声明、字段名、必填和长度规则、页面观察及原始回执见 [完整 JSON 台账](candidate-audit-2026-11-03.json)。部分首轮抓取只记录前 30 个字段与前 20 个选项；登录后表单和动态问卷后续页未获取时保留待分析状态。\n\n';
report += '| 域名 | 状态 | 分析层级 | 队列 | 原因或下一步 |\n| --- | --- | --- | --- | --- |\n';
for (const row of audit.sites) report += `| ${row.domain} | ${row.status} | ${row.analysisLevel} | ${queue(row.queueDays)} | ${cell(row.reason || row.queueNote || row.browserObservation?.decisionReason || row.browserObservation?.formError)} |\n`;
report += '\n## 状态计数\n\n' + Object.entries(states).map(([key, value]) => `- ${key}：${value}`).join('\n') + '\n';
write('docs/submission-protocols-2026-11-03.md', report);

let readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
for (const [lang, header, login] of [['en', '| Site | Account | Notes |', {false:'–', email:'Email', oauth:'OAuth'}], ['zh', '| 站点 | 账号 | 说明 |', {false:'免登录', email:'邮箱', oauth:'OAuth'}]]) {
  const start = readme.indexOf(header);
  if (start < 0) continue;
  let end = readme.indexOf('\n\n', start);
  if (end < 0) end = readme.length;
  const table = header + '\n| --- | --- | --- |\n' + sites.map(site => `| ${cell(site.name)} | ${login[String(site.login)]} | ${cell(site.note?.[lang])} |`).join('\n');
  readme = readme.slice(0, start) + table + readme.slice(end);
}
write('README.md', readme);
write('docs/submission-progress.md', progressReport(audit, manifest));
console.log(JSON.stringify({ catalog: sites.length, reviewedAdapters: reviewed.length, candidates: audit.sites.length, formRecords: formCount, states }, null, 2));
