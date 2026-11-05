// One durable checklist, regenerated from the directory audit after every batch.
const success = new Set(['submitted','listed','submitted-pending-review','submitted-listed','submitted-scheduled']);
const followupGroups = [
  ['access','访问、跳转或表单故障',['access-blocked','unexpected-redirect','form-access-blocked','site-error','form-not-rendered']],
  ['entry','入口、免费条件或完整流程待核实',['needs-entry-review','no-public-entry-found','needs-free-verification','free-plan-not-observed','existing-adapter','needs-form-analysis']],
  ['login','登录、邮件或验证码',['waiting-login','waiting-email-verification','waiting-captcha','blocked-registration-captcha','supported-waiting-human']],
  ['product','产品资料或定价选项不匹配',['missing-required-information','blocked-product-pricing']],
  ['manual','需人工处理、暂缓或查重',['manual-community','manual-only-submission','user-skipped','dedup-review-requested','waiting-terms']],
  ['other','其他需单独跟进',[]],
];
const followupByStatus = new Map(followupGroups.flatMap(([key,,states]) => states.map(status => [status,key])));

function groupCandidates(audit) {
  const batched = new Set((audit.execution?.batches || []).flatMap(batch => batch.domains));
  return audit.sites.map(row => {
    if (success.has(row.submission?.status)) return {row,group:'submitted'};
    if (/^excluded-/.test(row.status)) return {row,group:'excluded'};
    if (row.submission?.status === 'attempted-unconfirmed' || row.status === 'attempted-unconfirmed') return {row,group:'uncertain'};
    // A homepage scan is not a detailed submission review. Any concrete blocker,
    // prior batch, or known form stays out of the first-review queue.
    const observation = row.browserObservation;
    if (row.status === 'needs-entry-review' && row.analysisLevel === 'homepage' && !batched.has(row.domain) &&
        !row.submission && !row.adapterId && !observation?.formObservation && !observation?.error && !observation?.formError) {
      return {row,group:'first-review'};
    }
    return {row,group:followupByStatus.get(row.status) || 'other'};
  });
}

module.exports = function progressReport(audit, catalog) {
  const escape = value => String(value ?? '').replaceAll('|','\\|').replaceAll('\n',' ').trim();
  const labels = {
    'access-blocked':'访问被阻挡','needs-entry-review':'待查投稿入口','waiting-login':'待登录后核查',
    'unexpected-redirect':'跳转异常，未到达目标站',
    'no-public-entry-found':'未找到公开投稿入口','site-error':'网站或投稿入口异常','missing-required-information':'缺少必填资料/合适选项',
    'existing-adapter':'已有配置，真实流程待核实','needs-form-analysis':'待分析完整表单','needs-free-verification':'待确认免费条件',
    'form-not-rendered':'投稿表单未加载','attempted-unconfirmed':'已尝试，结果未确认','waiting-captcha':'等待人工验证码',
    'manual-community':'社区渠道，需单独判断适用性','supported-waiting-human':'已适配，等待人工处理',
    'blocked-product-pricing':'无对应产品定价选项','form-access-blocked':'表单访问被阻挡','blocked-registration-captcha':'注册被验证码阻挡',
    'free-plan-not-observed':'未观察到免费方案','excluded-paid':'排除：收费','excluded-service':'排除：不适用的服务',
    'excluded-parked':'排除：域名停放','excluded-backlink':'排除：强制互链','excluded-unrelated':'排除：与投稿无关',
    'excluded-closed-submissions':'排除：关闭投稿','excluded-queue':'排除：排期超过100天','excluded-ineligible':'排除：不符合收录要求',
    'excluded-closed':'排除：站点已关闭','excluded-reciprocal-required':'排除：必须添加徽章/互链',
    'excluded-duplicate-channel':'排除：与已投稿渠道重复',
    'excluded-already-listed':'排除：已存在公开收录，不重复投稿',
    'waiting-terms':'等待本次协议确认',
    'dedup-review-requested':'待核对历史，暂停重投',
    'waiting-email-verification':'等待账号邮箱验证',
    'manual-only-submission':'站点仅接受人工投稿',
    'user-skipped':'用户选择先跳过',
  };
  const rows = groupCandidates(audit).map(({row,group}) => {
    const adapter = catalog.find(site => site.domain === row.domain || site.sourceDomains.includes(row.domain));
    return {row,submitted:group==='submitted',excluded:group==='excluded',adapter,group};
  });
  const count=group=>rows.filter(row=>row.group===group).length;
  const firstReview = count('first-review');
  const followup = followupGroups.reduce((sum,[key]) => sum + count(key),0);
  let output = `# 投稿总进度表\n\n更新：${audit.updatedDate || audit.date}。这份表作为后续每批结束后的统一清单；由完整台账生成，不另维护一份容易失步的手工统计。\n\n`;
  output += '**勾选规则**：“核查已结项”只勾明确回执或有确定排除依据的项目；“投稿已确认”只勾有成功回执/确认邮件的项目。已适配、已填表、注册成功、草稿保存、点击后无回执均不算投稿成功。排除项也不计作投稿成功。\n\n';
  output += `| 统计 | 数量 |\n| --- | ---: |\n| 候选域名（去重） | ${rows.length} |\n| **主队列：尚未逐站核查** | **${firstReview}** |\n| 已接触，待单独跟进 | ${followup} |\n| 已尝试但结果未确认（不自动重投） | ${count('uncertain')} |\n| 已确认投稿 | ${count('submitted')} |\n| 已排除 | ${count('excluded')} |\n| 插件配置总数（含需人工及仅填表流程） | ${catalog.length} |\n\n`;
  output += `后续每批只从主队列选，最多 ${audit.execution?.batchSize ?? 10} 站；不足就做剩余站，不用跟进项凑数。主队列的站点只有首页初筛记录，尚未逐站核查投稿流程，也未记录具体阻塞。原“未完成”合计 ${firstReview+followup+count('uncertain')} 站，包含三类，不能用来表示还有多少新站可做。\n\n| 跟进事项分类 | 数量 |\n| --- | ---: |\n`;
  for (const [key,label] of followupGroups) if(count(key)) output+=`| ${label} | ${count(key)} |\n`;
  output+=`| 结果未确认（另列，先查证） | ${count('uncertain')} |\n\n`;
  output += '## 每批检查记录\n\n| 核查批次完成 | 批次 | 核查站数 | 新增明确回执 | 状态 | 记录 |\n| --- | --- | ---: | ---: | --- | --- |\n';
  output += '| ☑ | 历史成功回执（未按十站分批） | — | 16 | 见完整台账 | [完整台账](submission-protocols-2026-11-03.md) |\n';
  for(const batch of audit.execution?.batches || [])output += `| ${batch.status==='complete'?'☑':'☐'} | ${escape(batch.id)} | ${batch.domains.length} | ${batch.newReceipts ?? 0} | ${batch.status==='complete'?'本批核查结束；未提交项见原因':'正在核查'} | [本批明细](${batch.report.replace(/^docs\//,'')}) |\n`;
  output += '\n下面每行的复选标记都会随批次记录同步更新。插件配置数量与已投稿数量分别统计。\n';
  const sections = [
    ['first-review','主队列：尚未逐站核查'],
    ...followupGroups.filter(([key])=>count(key)).map(([key,label])=>[key,`单独跟进：${label}`]),
    ['uncertain','结果未确认：先查证，不重投'],['submitted','已确认投稿'],['excluded','已核实排除：不再进入免费投稿队列'],
  ];
  for(const [group,title] of sections) {
    output += `\n## ${title}（${count(group)}）\n\n| 核查已结项 | 投稿已确认 | 站点 | 插件配置 | 当前结果 / 未完成原因 | 证据或后续 |\n| --- | --- | --- | --- | --- | --- |\n`;
    for(const {row,submitted,excluded,adapter} of rows.filter(r=>r.group===group).sort((a,b)=>a.row.domain.localeCompare(b.row.domain))) {
      const label=submitted?(row.submission.status==='submitted-listed'?'已收录':row.submission.status==='submitted-scheduled'?'免费发布已预约，待审核':'已提交，待审核'):(labels[row.status]||row.status);
      const reason=String(submitted?row.submission.message:row.reason||row.queueNote||row.browserObservation?.decisionReason||'尚未完成核实').slice(0,260);
      const proof=row.proofImage||row.submission?.proofImage;
      const evidence=proof?`[截图](${proof.replace(/^docs\//,'')})`:row.emailEvidence?.displayUrl?`[确认邮件](${row.emailEvidence.displayUrl})`:'[台账](candidate-audit-2026-11-03.json)';
      const url=adapter?.url||`https://${row.domain}`;
      const mode=adapter?(adapter.reviewBeforeSubmit?'仅填表，待人工检查':'已适配'):'—';
      output += `| ${submitted||excluded?'☑':'☐'} | ${submitted?'☑':'☐'} | [${escape(row.domain)}](${url}) | ${mode} | ${escape(label)}：${escape(reason)} | ${evidence} |\n`;
    }
  }
  const outside=catalog.filter(site=>!audit.sites.some(row=>site.domain===row.domain||site.sourceDomains.includes(row.domain)));
  if(outside.length){
    output += `\n## 用户清单之外的既有插件站点（${outside.length}）\n\n这些是原有配置，未计入上述候选域名统计，也未据此勾选RTFV已投稿。\n\n| 站点 | 插件配置 | 真实提交状态 |\n| --- | --- | --- |\n`;
    for(const site of outside)output+=`| [${escape(site.domain)}](${site.url}) | 已有配置 | 未在本任务确认RTFV回执 |\n`;
  }
  output += '\n免费、互链、排期、字段与协议的详细依据见[结构台账](submission-protocols-2026-11-03.md)。只读或网站无法访问的检查不等于验证了完整投稿流程。\n';
  return output;
};

module.exports.firstReviewDomains = audit => groupCandidates(audit).filter(({group})=>group==='first-review').map(({row})=>row.domain);
