// All people, policies and SOPs in this catalog are fictional demonstration data.
export const baseActors = [
  { id: 'actor-hr', name: '许知夏', role: 'hr', title: 'HR 管理员' },
  { id: 'actor-manager', name: '周明远', role: 'manager', title: '质量主管' },
];

export const position = {
  id: 'pos-quality', title: '质量检验员', department: '质量管理部',
  location: '苏州 · 演示工厂', headcount: 1, salaryRange: '6–9K · 演示岗位',
  description: '负责来料与过程检验、检验数据记录及不合格品隔离与上报，与生产班组共同追踪异常闭环。所有岗位资料均为比赛演示样例。',
  abilities: [
    { id: 'drawing', name: '图纸识读', requirement: '能够核对图纸版本，理解基本尺寸、公差与检验项目。', mandatory: true },
    { id: 'inspection', name: '检验与记录', requirement: '按检验作业指导书使用量具，并完整记录批次、项目和测量结果。', mandatory: true },
    { id: 'reporting', name: '异常上报', requirement: '发现不合格品后隔离、记录、按规定上报，并跟踪处理结果。', mandatory: true },
    { id: 'coordination', name: '协同交接', requirement: '与生产及质量负责人清晰交接异常状态、责任人与后续事项。', mandatory: false },
  ],
};

export const candidates = [
  {
    id: 'cand-chen', name: '陈雨桐', initials: '陈', color: 'violet', education: '大专 · 机械制造与自动化',
    experience: '3 年质量检验经验', summary: '熟悉来料与制程检验，有尺寸测量和记录经验；书面异常闭环能力需要面试核实。',
    stage: 'screening', skills: ['游标卡尺', '来料检验', '图纸识读', '检验记录'],
    resume: { sections: [
      { id: 'chen-profile', title: '个人概况', content: '陈雨桐，机械制造与自动化专业大专毕业，具有 3 年汽车零部件企业质量检验经验。此人为虚构演示候选人。' },
      { id: 'chen-experience', title: '工作经历 · 质量检验员', content: '负责来料尺寸检验，核对图纸版本与尺寸公差，使用游标卡尺和千分尺完成测量，并在检验记录表填写批次、检验项目和测量结果。发现尺寸异常后口头通知当班班长。' },
      { id: 'chen-project', title: '项目与协作', content: '参与建立交接班检验清单，与生产班组交接待检批次和异常状态，协助新同事熟悉量具点检流程。' },
    ] },
    evidence: [
      { abilityId: 'drawing', status: 'supported', summary: '简历提供图纸版本与公差核对的直接描述。', quote: '核对图纸版本与尺寸公差', sectionId: 'chen-experience' },
      { abilityId: 'inspection', status: 'supported', summary: '有量具使用及批次、项目、结果记录的经历。', quote: '使用游标卡尺和千分尺完成测量，并在检验记录表填写批次、检验项目和测量结果', sectionId: 'chen-experience' },
      { abilityId: 'reporting', status: 'unverified', summary: '描述了口头通知，尚未提供书面报告、隔离及闭环证据。需通过面试核实，不等于不会。', quote: '发现尺寸异常后口头通知当班班长', sectionId: 'chen-experience' },
      { abilityId: 'coordination', status: 'supported', summary: '有跨班组交接与带教描述。', quote: '与生产班组交接待检批次和异常状态', sectionId: 'chen-project' },
    ],
    interviewQuestions: [
      '请结合一次实际检验，说明如何核对图纸版本、选择量具并填写检验记录。',
      '当你口头通知班长后，是否还会隔离不合格品、填写异常报告并确认处理结果？请举例。',
      '交接班时，如何避免待处理异常被下一班遗漏？',
    ],
  },
  {
    id: 'cand-lin', name: '林嘉宁', initials: '林', color: 'blue', education: '本科 · 材料成型及控制工程',
    experience: '应届毕业 · 6 个月质量实习', summary: '具备实验测量、检验数据整理和异常报告实习经历；生产图纸应用深度需要核实。',
    stage: 'screening', skills: ['实验测量', '数据整理', '异常记录', '团队协作'],
    resume: { sections: [
      { id: 'lin-profile', title: '个人概况', content: '林嘉宁，材料成型及控制工程本科毕业，具有 6 个月质量部门实习经历。此人为虚构演示候选人。' },
      { id: 'lin-internship', title: '实习经历 · 质量助理', content: '按照导师提供的检验指导书完成样件测量，记录测量数据和样件编号；协助填写异常记录单，由质量工程师复核后上报。' },
      { id: 'lin-project', title: '毕业项目与协作', content: '在课程项目中接触机械图纸，参与材料试样分析。与三名同学共同完成实验分工、数据汇总及结果汇报。' },
    ] },
    evidence: [
      { abilityId: 'drawing', status: 'unverified', summary: '课程中接触过图纸，未说明生产现场的版本与公差核对经验。', quote: '在课程项目中接触机械图纸', sectionId: 'lin-project' },
      { abilityId: 'inspection', status: 'supported', summary: '提供指导书下的样件测量和记录经历，独立作业能力需面试确认。', quote: '按照导师提供的检验指导书完成样件测量，记录测量数据和样件编号', sectionId: 'lin-internship' },
      { abilityId: 'reporting', status: 'supported', summary: '提供填写异常记录并经工程师复核上报的经历。', quote: '协助填写异常记录单，由质量工程师复核后上报', sectionId: 'lin-internship' },
      { abilityId: 'coordination', status: 'supported', summary: '有明确的团队分工与汇报经历。', quote: '共同完成实验分工、数据汇总及结果汇报', sectionId: 'lin-project' },
    ],
    interviewQuestions: [
      '如果现场图纸与检验指导书的版本不一致，你会如何处理？',
      '请说明实习中的一份异常记录包含哪些字段，哪些步骤需要工程师复核。',
      '哪些检验项目能够独立完成，哪些仍需要带教？',
    ],
  },
  {
    id: 'cand-zhou', name: '周启航', initials: '周', color: 'amber', education: '大专 · 数控技术',
    experience: '5 年生产现场经验', summary: '熟悉加工图纸、首件自检和班组交接；候选人明确表示需要学习质量异常报告模板。',
    stage: 'screening', skills: ['加工图纸', '首件自检', '现场交接', '量具使用'],
    resume: { sections: [
      { id: 'zhou-profile', title: '个人概况', content: '周启航，数控技术专业大专毕业，具有 5 年机加工生产现场经验，希望转岗至质量检验。此人为虚构演示候选人。' },
      { id: 'zhou-experience', title: '工作经历 · 数控操作员', content: '根据加工图纸确认尺寸与公差，使用量具完成首件自检并填写自检记录。负责交接设备状态、在制批次和待处理问题。' },
      { id: 'zhou-development', title: '自述与发展意向', content: '熟悉口头交接，暂未使用过质量异常报告模板，需要培训。希望系统学习独立检验流程与异常闭环。' },
    ] },
    evidence: [
      { abilityId: 'drawing', status: 'supported', summary: '有现场图纸尺寸与公差确认经历。', quote: '根据加工图纸确认尺寸与公差', sectionId: 'zhou-experience' },
      { abilityId: 'inspection', status: 'supported', summary: '具备首件自检经验；转岗后的独立检验范围仍需核实。', quote: '使用量具完成首件自检并填写自检记录', sectionId: 'zhou-experience' },
      { abilityId: 'reporting', status: 'gap', summary: '候选人明确自述未使用过质量异常报告模板，可在面试确认后纳入培养计划。', quote: '暂未使用过质量异常报告模板，需要培训', sectionId: 'zhou-development' },
      { abilityId: 'coordination', status: 'supported', summary: '有设备、批次与问题交接经历。', quote: '负责交接设备状态、在制批次和待处理问题', sectionId: 'zhou-experience' },
    ],
    interviewQuestions: [
      '首件自检与独立质量检验有哪些不同？哪些结果需要复核？',
      '请描述一次异常交接，哪些信息应补充到书面报告中？',
      '对于异常报告模板和闭环要求，你希望先练习哪些内容？',
    ],
  },
];

export const knowledge = [
  {
    id: 'policy-leave', title: '员工请假与审批制度', category: '员工制度', version: '演示 v1.0', effectiveDate: '2026-01-01',
    summary: '演示员工享有 3 天初始可用年假，支持单个工作日的整天或半天申请，由主管审批。', sourceLabel: 'People-Lab 演示制度 · 非企业真实制度',
    sections: [
      { id: 'leave-balance', title: '1. 假期额度', content: '本演示为每位正式入职员工初始化 3 天可用年假。余额以员工档案的实际记录为准；待审批申请不扣减余额，主管批准时重新校验并扣减。' },
      { id: 'leave-request', title: '2. 申请范围与材料', content: '本演示一次申请仅覆盖一个工作日，可选择上午、下午或全天，半天计 0.5 天、全天计 1 天。请填写日期、时段与请假原因。周末和过去日期不可申请。' },
      { id: 'leave-approval', title: '3. 审批与结果', content: '员工确认提交后，由所属主管或 HR 审批。批准后扣减余额；拒绝必须说明原因且不扣减余额。员工可在服务页面查看待审批、已批准或已拒绝状态。' },
    ],
  },
  {
    id: 'guide-onboarding', title: '新员工入职与服务指南', category: '入职指南', version: '演示 v1.0', effectiveDate: '2026-01-01',
    summary: '完成资料核对、协议确认和入职说明后，HR 确认入职，系统开放员工服务与岗位培训。', sourceLabel: 'People-Lab 演示指南 · 非企业真实制度',
    sections: [
      { id: 'onboarding-materials', title: '1. 入职材料与确认', content: '演示入职清单包含身份与资料核对、入职协议确认、入职说明与主管交接三个项目。本系统仅记录核对状态，请勿上传真实身份证、银行卡或其他敏感材料。' },
      { id: 'onboarding-activation', title: '2. 正式入职', content: 'HR 完成全部入职清单并确认入职后，员工档案转为在职，系统分配岗位必修培训，以及 HR 明确确认的发展任务。简历中缺少证据的能力不会自动变成培训缺陷。' },
      { id: 'onboarding-service', title: '3. 员工自助与人工支持', content: '在职员工可查询演示制度、申请请假、查看自己的申请与培训进度。知识库缺少可靠依据时，服务助手会创建人工工单，由 HR 补充答复。' },
    ],
  },
  {
    id: 'sop-quality', title: '质量检验与不合格品处置 SOP', category: '岗位 SOP', version: '演示 v1.0', effectiveDate: '2026-01-01',
    summary: '按版本核对、隔离标识、完整记录、规定上报、复核闭环的步骤处理检验异常。', sourceLabel: 'People-Lab 自编演示 SOP · 不作为真实作业依据',
    sections: [
      { id: 'sop-preparation', title: '1. 检验准备', content: '开始检验前，核对图纸与作业指导书版本、产品批次及量具状态。根据受控文件确认检验项目和判定标准；信息冲突时先请主管确认，不自行变更标准。' },
      { id: 'sop-isolate', title: '2. 隔离与标识', content: '发现不合格品后，立即隔离并清晰标识相关产品与批次，防止继续流入下一工序；不得擅自放行或自行丢弃。' },
      { id: 'sop-record', title: '3. 记录与证据', content: '记录批次、检验项目、测量值、判定依据与发现时间，保留相关证据，使后续处理人员能够复核。' },
      { id: 'sop-report', title: '4. 上报与交接', content: '按演示流程向质量主管上报，说明异常现象、影响范围和已采取的隔离措施，并交接待处理事项。' },
      { id: 'sop-followup', title: '5. 复核与闭环', content: '跟进主管处理意见，记录处理结果与责任人，经复核确认后更新异常状态；未经授权不得恢复流转。' },
      { id: 'sop-assessment', title: '6. 培训验收说明', content: '本演练以隔离、记录、上报、跟进四个步骤为固定评分标准。演练通过仅代表满足本次模拟任务要求，不代表获得真实操作资格；实际岗位验收由企业规定的考核人员完成。' },
    ],
  },
];

export const trainingScenario = {
  title: '发现尺寸异常，你会怎样处理？',
  prompt: '你在来料检验中发现一批零件的关键尺寸超出图纸要求。请选择应采取的处置步骤，并补充你的交接说明。此题依据自编演示 SOP，不作为真实作业指导。',
  steps: [
    { id: 'report', label: '向质量主管上报', description: '说明异常现象、影响范围和已采取的措施。', required: true },
    { id: 'continue', label: '先让产品继续流转', description: '认为问题不大，等下一工序再决定。', required: false },
    { id: 'isolate', label: '隔离并标识异常批次', description: '防止相关产品继续进入下一工序。', required: true },
    { id: 'followup', label: '跟进处理与复核闭环', description: '记录处理结果和责任人，待授权复核后更新状态。', required: true },
    { id: 'discard', label: '直接丢弃不合格品', description: '不记录、不上报，自行处置。', required: false },
    { id: 'record', label: '记录测量值并保留证据', description: '记录批次、项目、测量值、依据与发现时间。', required: true },
  ],
};

export function createSeedState() {
  return {
    schemaVersion: 1,
    candidates: structuredClone(candidates), employees: [], onboardings: [], leaves: [],
    trainingTasks: [], tickets: [], messages: [], events: [],
  };
}
