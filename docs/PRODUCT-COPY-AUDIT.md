# People-Lab 竞品调研与全站文案审计（阶段A）

日期：2026-10-31（Asia/Shanghai）。正式仓库：https://github.com/ekitou7-design/People-Lab 。审计固定基线：main `55d03a56140a9518a24d53435c05f001f07a7d64`（合并PR #5的提交）。当前开放PR查询为空；这不是另一开发者P0/P1已结束或未推送工作不存在的证据。阶段B仍须明确授权。

本轮仅在独立研究副本的 `docs/product-copy-research` 分支新增 UX-WRITING.md、PRODUCT-COPY-AUDIT.md、PRODUCT-COPY-MAPPING.md。不修改现有业务代码、AGENTS及共享协作文档，不触碰另一开发者分支，不推送main、不合并PR。未启动应用、未接入真实员工数据；结论是源码与官方资料的静态审计，不是当前界面布局或业务验收。

## 交付索引与核心判断

| 交付 | 位置 |
|---|---|
| 竞品调研报告及官方来源 | 本文第1节 |
| 全站问题清单与功能移交 | 本文第2—4节；逐项见替换表 |
| 企业HR统一术语表、状态表、风格草案 | [UX-WRITING.md](UX-WRITING.md) |
| 页面级修改对照与预计代码/冲突文件 | [PRODUCT-COPY-MAPPING.md](PRODUCT-COPY-MAPPING.md) |

核心判断：本项目主要需要让文字准确反映对象与阶段。最值得优先处理的是“资格匹配≠可直接上岗”“培训完成≠岗位资格”“审核批准≠执行”“需求草稿≠正式发布职位”，以及生产工时口径和剩余增量的区别。无需借文案任务重新设计视觉、增加审批流程或引入新AI能力。

## 1. 竞品调研报告

研究优先取官方手册、帮助、培训课程、真实表单与演示截图。未登录商业租户；不声称实测线上流程或使用了每家最新付费版本。证据等级使用R1（可读取操作正文/表单/课程）、R2（官方搜索索引/目录摘要）、R3（营销背景）。下方国内笔记A/B/C分别对应R1/R2/R3，与问题分类A—H无关。竞品摘录仅为少量原词；中文建议单独标为研究者建议。

北森本轮只取得营销资料，金蝶和用友以官方摘要/目录为主，飞书正文受访问限制；已如实记录。没有用其他产品术语替这几家补造后台菜单、按钮、状态或错误。当前不足以宣称八家均已完成同深度实操取证。

### 国内来源

| 来源ID | 产品与来源 | 已核实用语（短摘） | 取证与适用边界 |
|---|---|---|---|
| C1 | [Moka管理员操作手册](https://mokahr.dochelp.cn/d/1980825569286213634.html)，更新2025-10-22 | “职位管理”“招聘需求”“添加候选人”“安排面试” | A：全文成功打开，含真实操作截图。第3章有总览、招聘概览；3.4/3.5附近为职位与候选人操作。需求在职位管理页面左上切换进入，职位创建另含招聘流程、绑定HC等设置。因此需求、职位、候选人是不同对象。不能把候选人筛选结论解释为已获准录用，也不能把绑定HC自动等同于People-Lab内部需求状态。帮助中心链接指向mokahr.udesk.cn/hc；该入口本次访问受限。 |
| C2 | [飞书招聘员工入门手册](https://www.feishu.cn/hc/zh-CN/articles/856890248633-飞书招聘员工入门手册) | “招聘工作台”“我的任务”“简历评估”“候选人列表” | B：官方搜索索引提供完整操作段及截图标记，直接打开正文为0行。手册说明任务区分简历评估、面试评价、Offer审批；职位列表与候选人列表按用人经理权限显示。能支持招聘对象、任务命名，不能据此证明People-Lab有相同角色权限。 |
| C3 | [飞书审批管理员手册](https://www.feishu.cn/hc/zh-CN/articles/360033971554-飞书审批管理员手册) | “录用”“待入职”“办理人”“同意”“拒绝” | B：官方索引正文可读，直接打开0行。录用审批通过进入待入职名单；审批节点与办理节点有分别。说明审批通过、业务办理、生效时间并非同一事实。不能照搬自动同步能力到People-Lab。 |
| C4 | [飞书审批常见问题](https://www.feishu.cn/hc/zh-CN/articles/360045410394-飞书审批常见问题) | “发起申请”“自助服务”“申请离职”“提交” | B：官方索引明确列出飞书审批与飞书人事两条不同操作路径。可支持员工服务用任务动词命名；不应将所有HR操作都笼统叫审批，也不能把服务入口和正式人事记录合并。 |
| C5 | [钉钉使用手册：设置入职登记表](https://notes.dingtalk.com/p/Y7kmby3lP40KXLq2/docs/Y7kmbqPenYNJjXLq) | “智能人事”“入职管理”“办理入职”“编辑入职登记表” | B：官方域名索引可读，直接打开两次超时。索引明确后台路径为工作台→智能人事→入职管理→办理入职。适合人事办理导航与按钮参考；登记表填写不是完成入职，不能把资料收集等同于员工建档完成。 |
| C6 | [钉钉模板中心：请假](https://appcenter.dingtalk.com/template/detail.html?templateId=59708) | “请假类型”“开始时间”“结束时间”“请假事由” | A：官方表单预览正文成功打开，字段带必填提示，含附件。可直接参照员工请假表单字段。模板页未证明批准后的假期扣减或跨系统同步行为；不能补出不存在的后续能力。 |
| C7 | [盖雅工场劳动力管理解决方案实践](https://support.huaweicloud.com/gaiawfm-saasapp/盖雅工场劳动力管理解决方案实践.pdf)，华为云官方文档，版本1.0，2024-08-14，33页 | “出勤管理”“请假管理”“生效”“审批”“个人排班” | A：实施手册全文成功打开。PDF第21页（印刷17）有请假管理，规定未生效记录才能删除；第22页（印刷18）另列审批/签核动作；第24-25页（印刷20-21）为个人排班/复制排班。官方PDF已请求截图，但本工具只返回引用、未向当前会话显示可检查像素，因此不声称已完成截图视觉核验。能证明出勤/排班和请假生效/审批有语义差别；不直接证明People-Lab工时计算公式，也不借用此手册的旧式“删除生效”等表达作为推荐。 |
| C8 | [盖雅智能排班系统](https://www.gaiaworks.cn/solution/smart-schedulers.html) | “总需求工时”“人力缺口”“可用时间” | C：成功打开的厂商产品介绍，含界面图片链接。只作为业务概念背景，不能把介绍小标题当作已核验菜单。它描述订单/生产计划→人力需求，按技能证照和可用时间匹配、管理者审核发布。这支持区分需求量与可用量的业务思路，但People-Lab的需求工时/可用工时/已分配工时定义必须依据自己的合同及代码。 |
| C9 | [北森招聘管理系统](https://www.beisen.com/product/recruitment/) | “招聘需求管理”“职位广告”“简历筛选” | C：官网产品页全文成功打开，未取得HR后台操作手册。官网指向用户社区users.italent.cn；社区打开无正文。故这三项仅是厂商介绍中的业务分类，不标注为真实导航或按钮。第三方文库有北森手册，本次没有采用。可支持需求与职位发布区分；不能证明其后台状态词、空态或错误文案。 |
| C10 | [金蝶云星瀚V6.0：人才发展云任职资格考核安排二开指导](https://club.kdcloud.com/article/697488638036165376) | “任职资格”“考核安排”“启动考核” | B：金蝶官方社区技术资料搜索摘要可读，正文打开Cache miss。它描述资格流程存在考核评价与决议评价两个阶段；只作资格业务参考，非全套界面验证。不能把技能条目或培训结业直接叫资格通过。 |
| C11 | [金蝶AI HR培训、帮助中心及demo环境入口说明](https://vip.kingdee.com/article/825396109538875904)，2026-05-18 | “核心人力云”“工时假勤云”“组织发展云” | B/C：官方社区入口说明搜索可读，正文Cache miss。说明产品帮助与演示环境入口；未登录演示环境，未获取其岗位资格菜单或空态。不得将产品云分类当作本次实际导航观察。 |
| C12 | [用友帮助中心](https://help.yonyou.com/) | “组织与员工管理”“时间管理”“人才发展”“人力共享” | B：官方帮助中心目录的索引可读，直接打开没有可读正文。用于补充成熟HR知识分类；不能声称已读取其具体操作页。 |


### 国际来源

| ID | 产品、来源及证据 | 核实原词（每来源短引合计不超过25词） | 对 People-Lab 的启示和业务边界 |
|---|---|---|---|
| I1 | Workday 官方教育手册 [Job Requisitions](https://doc.workday.com/workday-education/en-us/course-manuals/recruiting-for-administrators/job-requisitions.html?toc=3) | Create Job Requisition；Edit Job Requisition；Qualifications；Find Candidates；Awaiting Action | 招聘需求承载空缺数量、目标入职日、职位信息、任职条件，候选人是独立对象。建议区分招聘需求、招聘职位、候选人、应聘申请；招聘需求、岗位、发布信息的关闭和冻结影响不相同。 |
| I2 | Workday 官方管理员指南 [Manage Skills and Experience](https://doc.workday.com/admin-guide/en-us/human-capital-management/worker-information/worker-experience/dan1370797326964.html) | Skills；Certifications；Competencies；Training；Compare to Job | 官方分别管理技能、认证、能力、培训并与岗位要求比较。建议员工技能、资格证书、能力评价、培训记录各自保留；培训完成不等于获得岗位资格。 |
| I3 | Workday 官方管理员指南 [Enter Time Off Requests](https://doc.workday.com/admin-guide/en-us/human-capital-management/absence/time-off/time-off-requests/jan1372182343029.html) | Request Absence；Manage Absence；Submit Request；Daily Quantity；Comment to Approver | 提交请求后仍可能需要审批；按天、按小时计划分别显示单位。建议提交请假申请、待审批；不能在请求提交成功时提示请假已批准。 |
| I4 | Workday 官网公开 PDF 含产品界面 [Hubs Guide—25R2](https://www.workday.com/content/dam/web/en-us/documents/datasheets/guide-to-the-hubs-experience.pdf) | Job Requisitions；Candidates；Browse Jobs；My Applications；My Learning；Plan；Explore | 招聘工作台分开需求和候选人；员工内部找工作与HR管理招聘用不同入口。建议内部职位、我的申请、我的学习。PDF有 Workday Confidential 页脚，虽官网公开，本次仅链接和记录术语，不转载整页截图；截图含较旧示例数据，不能称为当前租户界面。 |
| I5 | SAP 官方公开 KBA [3360995：Status与Requisition Status差别](https://userapps.support.sap.com/sap/support/knowledge/en/3360995) | Status；Requisition Status；pre-approved；approved；closed | 业务显示状态可配置，系统状态另有语义。文案统一只能调整显示层，不能改内部枚举。pre-approved在此指尚在审批路径中，不能误译为已预批准。 |
| I6 | SAP 官方培训含界面图 [Using Opportunity Marketplace as an End User](https://learning.sap.com/courses/sap-successfactors-platform-administration/using-opportunity-marketplace-as-an-end-user_cc735729-e36d-4665-a625-cb188843c276) | Opportunity Marketplace；Create Assignment；Discover Open Jobs；Learn New Skills；Draft；Published；Ongoing；Closed | 区分内部职位、短期项目机会、学习、导师、职业方向。assignment可全职或兼职，通常少于12个月。建议内部职位、项目机会、学习建议，不能全部称调岗，推荐不等于已调动。 |
| I7 | SAP 官方培训 [Using Opportunity Marketplace Assignments](https://learning.sap.com/courses/sap-successfactors-career-development-planning-and-mentoring-project-team-orientation/using-opportunity-marketplace-assignments-2) | Publication Pending Approval；Published；Applied；Assignments Owned by Me | 创建、审批、发布、申请、录用邀请、接受、完成不同。建议待发布审批、已发布、已申请；不得直接套到本项目已批准、已执行，需核对动作和责任人。 |
| I8 | SAP 官方公开 KBA [2914215：入职工作台访问](https://userapps.support.sap.com/sap/support/knowledge/en/2914215) | Home；Onboarding；Onboarding Dashboard；Admin Center；Manage Permission Roles | 入职入口及新员工、任务可见范围受权限和责任分工影响。建议入职管理、入职任务、办理进度。没有可见记录不等于企业暂无新员工。 |
| I9 | SAP 官方培训 [Describing SAP SuccessFactors Learning](https://learning.sap.com/courses/explore-sap-successfactors-solutions/using-sap-successfactors-learning_f1845233-56de-46cf-bf9b-9b5f9b7a1416) | Learning Assignments；Learning History；Required Learning；Start Course；Verify Course Completion；Assign Learning；Manage Approvals | 分别定义学习项、班次、课程集合、项目、分配任务及历史。建议培训任务、培训记录、必修培训、开始学习、分配培训。学习完成、考试完成、评价通过、资格生效分开。官方注明一个练习当前无法在练习系统执行，不可称实测流程。 |
| I10 | SAP 官方培训含界面和评分审批 [Describing the Growth Portfolio](https://learning.sap.com/courses/sap-successfactors-platform-administration/describing-the-growth-portfolio_fddc687e-67a1-4fb5-ab6b-f9033e925687) | Skills；Competencies；Certificates；Proficiency Rating；Proficiency Gaps；Pending Approval；Edit Proficiency | 技能、能力、证书分项；评分可记录来源、日期、操作者及审批。建议技能熟练度、能力评价、熟练度差距，不把自评写成资格已认证。课程明确同时存在非智能推荐与机器学习推荐，不能把规则计算包装为AI自主决策。 |
| I11 | SAP 官方公开故障帮助 [2335363：缺少Print Certificate按钮](https://userapps.support.sap.com/sap/support/knowledge/en/2335363) | Print Certificate；Learning History；Completion Status；Credit Given | 完成课程后生成证明受权限、完成状态及事件类型限制。建议查看培训记录、打印结业证明，结业证明不等于职业资格证书；无权限、未获学分、类型不支持须区分，不能统称系统错误。 |


### 研究维度与采用决定

| 维度 | 已获得的主要证据 | People-Lab采用建议及界限 |
|---|---|---|
| 一级/二级导航 | C1操作菜单，C2任务分类（索引），I4工作台、I8入职 | 业务对象作导航；不抄竞品完整信息架构 |
| 招聘需求/职位/候选人 | C1、I1 | 三对象分开；本项目需求工时不能擅自变成招聘人数 |
| 入职办理 | C3、C5索引，I8 | 录用、待入职、确认入职分开；空态说明可见范围 |
| 员工服务、请假审批 | C4索引、C6真实表单、I3 | 发起/预览/提交/审批/余额更新各写实际结果；本项目仅年假 |
| 培训 | I9、I11 | 培训任务、学习记录、演练反馈、复练分开；不增加未实现课程管理 |
| 技能与资格 | C10摘要、I2、I10 | 技能、资格证据、能力评价及有效期分别表达 |
| 生产用工及工时 | C7操作手册；C8仅背景 | 采用出勤/排班业务概念；需求/可用/分配/增量公式完全以本项目为准 |
| 内部人才流动 | I6、I7 | 内部职位、项目机会、培养与调配不同；本项目只实施受约束的工时占用 |
| 按钮与状态 | C1、C3索引、C6、I1、I3、I5、I9 | 动词+对象，状态按对象映射，批准和执行分开 |
| 空态与错误 | I8权限范围、I11具体错误条件 | 未取得全产品通用错误/空态实录；项目建议为自拟，不冒称“竞品同款” |

不转载商业后台整页截图；手册和课程中的界面可通过官方链接复核。盖雅PDF已读取操作正文，但截图像素未完成视觉核验；Workday PDF含历史示例和Confidential页脚，本次只链接。SAP部分Help Portal正文不可读，已改用官方课程/KBA。

### 可归纳、不可照搬

可归纳的是对象式导航、动词按钮、按对象分开的状态，以及分层的技能/资格/学习记录。不可照搬的是竞品的权限模型、岗位发布流程、批准后自动同步能力、劳动力排程能力或其自有AI能力。本项目计算缺口、日桶分配和增量工时没有找到完全对应的竞品UI标签，必须标为项目自拟规范。

## 2. 审计范围、方法及覆盖

已读取AGENTS、README、PRODUCT、PHASE-1-PRD、API-CONTRACTS及WORKSTREAMS；以shared/contracts.ts、order2people.ts、skillbridge.ts和服务端实际实现核对显示语义。逐文件检查所有src/v2页面、共享组件、导航、演示指南、空态、状态映射、可见错误及aria-label；CSS只读检索未发现需独立替换的自然语言内容。还读取server/app/catalog及order2people/skillbridge的引擎、校验、记录和API中的可见提示。原文行号与固定基线校验一致。

| 模块 | src/v2覆盖文件 | 主要检查面 |
|---|---|---|
| 管理驾驶舱 | DashboardPage.tsx | 待办、指标、角色标题、入口动词 |
| 招聘管理 | RecruitmentPage.tsx | 需求草稿、职位要求、候选人证据/阶段、录用、关联 |
| 入职管理 | OnboardingPage.tsx | 清单、待入职/已入职、日期、确认后任务 |
| 员工服务 | ServicePage.tsx | 制度引用、年假预览/提交/审批、人工咨询、角色空态 |
| 培训管理 | TrainingPage.tsx | 必修/培养/复练、学习/演练/完成、来源回链 |
| 企业知识库 | KnowledgePage.tsx | 制度/指南/SOP、版本、引用章节、返回任务 |
| Order2People | Order2PeoplePage.tsx、Order2PeopleEntryForm.tsx、Order2PeoplePlanningForm.tsx | 生产输入、每日需求、资格、工时、计算/确认/导出、阻断/过期 |
| SkillBridge | SkillBridgePage.tsx | 人选分类、资格差距、增量工时、方案、审核、历史 |
| 人才执行闭环 | SkillBridgePage.tsx＋RecruitmentPage.tsx＋TrainingPage.tsx＋Order2PeoplePage.tsx | 独立审核/执行、创建对象、回链、容量占用、过期及409回滚 |

全站还检查 WorkspaceShell.tsx、WorkbenchApp.tsx、ui.tsx、types.ts、4个CSS文件及src/main.tsx。ui默认“关闭弹窗”等可保留；types没有用户可见业务文案。人才执行闭环无独立页面，不假造第九页。

## 3. 问题清单

共125条候选建议；同条可归多类，类别计数不可相加当作独立问题数。涉及语义复核43条；语义标记不等于需要改业务逻辑。每条完整的原文、行号、建议、竞品参考、理由、语义及冲突字段见[逐页对照表](PRODUCT-COPY-MAPPING.md)。

| 类别 | 候选数 | 代表问题ID |
|---|---|---|
| A 文案过长 | 27 | COPY-006、COPY-007、COPY-009、COPY-011、COPY-026、COPY-027、COPY-030、COPY-044、COPY-049、COPY-050、COPY-057、COPY-062、COPY-065、COPY-070、COPY-075、COPY-082、COPY-083、COPY-084、COPY-086、COPY-087、 |
| B 用词不规范 | 33 | COPY-014、COPY-020、COPY-024、COPY-025、COPY-029、COPY-031、COPY-034、COPY-041、COPY-042、COPY-048、COPY-056、COPY-060、COPY-061、COPY-063、COPY-066、COPY-067、COPY-069、COPY-071、COPY-072、COPY-073、 |
| C AI/营销修辞 | 4 | COPY-005、COPY-008、COPY-011、COPY-037 |
| D 名称不统一 | 41 | COPY-001、COPY-002、COPY-003、COPY-004、COPY-010、COPY-017、COPY-018、COPY-019、COPY-021、COPY-023、COPY-029、COPY-032、COPY-033、COPY-036、COPY-040、COPY-043、COPY-045、COPY-052、COPY-053、COPY-054、 |
| E HR不易理解 | 52 | COPY-001、COPY-005、COPY-007、COPY-008、COPY-009、COPY-012、COPY-014、COPY-020、COPY-023、COPY-024、COPY-025、COPY-026、COPY-027、COPY-031、COPY-034、COPY-038、COPY-041、COPY-042、COPY-049、COPY-055、 |
| F 按钮含义不清 | 18 | COPY-013、COPY-028、COPY-047、COPY-058、COPY-062、COPY-069、COPY-070、COPY-075、COPY-076、COPY-078、COPY-090、COPY-091、COPY-097、COPY-098、COPY-099、COPY-100、COPY-101、COPY-108 |
| G 状态/提示误导 | 24 | COPY-015、COPY-016、COPY-021、COPY-022、COPY-027、COPY-039、COPY-046、COPY-048、COPY-051、COPY-054、COPY-058、COPY-059、COPY-067、COPY-074、COPY-079、COPY-080、COPY-094、COPY-095、COPY-097、COPY-104、 |
| H 解释干扰操作 | 15 | COPY-006、COPY-030、COPY-035、COPY-037、COPY-038、COPY-044、COPY-050、COPY-055、COPY-065、COPY-087、COPY-088、COPY-096、COPY-102、COPY-103、COPY-116 |

C类发现的是现有抽象协同/品牌修辞，并未发现遍布全站的“AI自主决策”承诺。当前规则演示标记大多准确，应保留；不为满足预设结论而虚构AI营销问题。

| 问题ID | 模块与基线位置 | 当前文案（锚点） | 分类/问题 |
|---|---|---|---|
| COPY-001 | 全站导航；src/v2/WorkspaceShell.tsx:21 | 招聘证据审阅 | D/E；一级导航描述业务模块，具体证据审阅保留为页内视图；与招聘需求草稿区并存。 |
| COPY-002 | 全站导航；src/v2/WorkspaceShell.tsx:24 | 岗位培养 | D；导航、页标题与任务入口统一；仅当前学习任务模块适用，不将发展意向全部改成培训。 |
| COPY-003 | 全站导航；src/v2/WorkspaceShell.tsx:25 | 企业知识 | D；与知识页标题保持一致。 |
| COPY-004 | 全站导航；src/v2/WorkspaceShell.tsx:20 | 人才工作台 | D；管理端导航与本轮模块名称对应；员工身份保留“我的工作台”，阶段B按身份复核。 |
| COPY-005 | 全站导航；src/v2/WorkspaceShell.tsx:39 | 智造人才工作空间 | C/E；减少品牌修辞，不影响演示企业及制造场景标识。 |
| COPY-006 | 全站反馈；src/v2/WorkbenchApp.tsx:63 | 操作已保存，业务记录已同步 | A/H；成功反馈简短明确；部分成功未同步的专用错误必须单独保留。 |
| COPY-007 | 全站加载；src/v2/WorkbenchApp.tsx:88 | 正在连接人才协同工作台… | A/E；实际请求读取工作台数据，使用常见加载表述。 |
| COPY-008 | 演示指南；src/v2/WorkbenchApp.tsx:113 | 用一位新同事，走通人才协同 | C/E；指南标题说明用途，演示身份、虚构资料、人工决定说明继续保留。 |
| COPY-009 | 演示指南；src/v2/WorkbenchApp.tsx:93 | 订单→缺口→人才路径→人工审核→执行反馈 | A/E；路径细节已在正文说明，标题聚焦任务；不暗示批准等于执行。 |
| COPY-010 | 管理驾驶舱；src/v2/DashboardPage.tsx:74 | 人才协同工作台 | D；管理端与导航统一；员工身份建议“我的工作台”，需按角色文案分支复核。 |
| COPY-011 | 管理驾驶舱；src/v2/DashboardPage.tsx:74 | 从当前的人与任务出发，推进招聘、员工服务与岗位培养。 | A/C；以可查看的业务对象替代抽象协同叙述。 |
| COPY-012 | 管理驾驶舱；src/v2/DashboardPage.tsx:75 | 从订单识别能力缺口 | E；按订单计算的是具备资格供给约束下的工时缺口，不是员工能力评价。 |
| COPY-013 | 管理驾驶舱；src/v2/DashboardPage.tsx:75 | 开始生产需求诊断 | F；按钮仅导航到生产需求页，不直接启动诊断或计算。 |
| COPY-014 | 管理驾驶舱；src/v2/DashboardPage.tsx:78 | 现在需要推进 | B/E；使用HR常用任务名称，不暗示所有记录都可立即执行。 |
| COPY-015 | 管理驾驶舱；src/v2/DashboardPage.tsx:78 | 项可推进 | G；列表含待核实、待复练等任务，“可推进”易被理解为可执行。 |
| COPY-016 | 管理驾驶舱；src/v2/DashboardPage.tsx:81 | 当前事项已处理 | G；空列表仅说明当前范围无待办，不能证明所有事项已处理。 |
| COPY-017 | 管理驾驶舱；src/v2/DashboardPage.tsx:45 | 继续岗位培养 | D；对应现有培训任务入口，保持任务语义。 |
| COPY-018 | 管理驾驶舱；src/v2/DashboardPage.tsx:60 | 待完成培养 | D；与培训页统计对象一致，不改统计口径。 |
| COPY-019 | 管理驾驶舱；src/v2/DashboardPage.tsx:61 | 已完成培养 | D；与培训页原任务完成数一致，不包含资格认定。 |
| COPY-020 | 管理驾驶舱；src/v2/DashboardPage.tsx:50 | 岗位能力模型 | B/E；数据是岗位要求集合，无需引入模型概念；保留能力项粒度。 |
| COPY-021 | 招聘管理；src/v2/RecruitmentPage.tsx:12 | draft: '待处理' | D/G；招聘需求内部draft对应草稿，不能表示已经正式提报或进入审批。 |
| COPY-022 | 招聘管理；src/v2/RecruitmentPage.tsx:10 | 确认待提升 | G；当前gap种子证据为候选人自述，并不证明HR已面试核实；确认培养需求仍在录用弹窗单独完成。推荐词仍保留待核实，避免仅凭自述认定缺陷。 |
| COPY-023 | 招聘管理；src/v2/RecruitmentPage.tsx:101 | 招聘证据审阅 | D/E；该页同时含需求草稿、阶段与录用处理，页标题覆盖完整对象；证据审阅保留子视图名称。 |
| COPY-024 | 招聘管理；src/v2/RecruitmentPage.tsx:134 | 候选人队列 | B/E；列表并非任务调度队列，使用常见HR名称。 |
| COPY-025 | 招聘管理；src/v2/RecruitmentPage.tsx:137 | 下一步核实问题 | B/E；列表为面试问题建议，不是系统要求逐项执行的任务。 |
| COPY-026 | 招聘管理；src/v2/RecruitmentPage.tsx:108 | 来自 SkillBridge 的招聘需求草稿 | A/E；来源移到次要说明保留，区分招聘需求与已发布招聘职位。 |
| COPY-027 | 招聘管理；src/v2/RecruitmentPage.tsx:108 | 由能力缺口分析生成，非正式招聘申请；请人工关联已有候选人或在完成评估后关闭 | A/E/G；避免“能力缺口”误读为个人评价；保留草稿边界和可执行动作。 |
| COPY-028 | 招聘管理；src/v2/RecruitmentPage.tsx:122 | >关联</button> | F；按钮写明关联对象；不会发布职位或自动录用。 |
| COPY-029 | 招聘管理；src/v2/RecruitmentPage.tsx:142 | 人工确认的培养需求 | B/D；只改当前用于生成培训任务的确认项，不把未核实证据缺失变为培训缺陷。此处是人员发展意向，不将其本身等同于已分配的培训任务。 |
| COPY-030 | 入职管理；src/v2/OnboardingPage.tsx:42 | 把录用决定衔接为一份可核验的清单，再开启员工服务与岗位培养。 | A/H；用当前操作概括页面，入职后的系统影响在确认前另行保留。 |
| COPY-031 | 入职管理；src/v2/OnboardingPage.tsx:45 | 入职办理队列 | B/E；列表包含已入职和待入职记录，名称不限定待办。 |
| COPY-032 | 入职管理；src/v2/OnboardingPage.tsx:51 | 已正式入职 | D；与左侧相同记录的completed展示一致。 |
| COPY-033 | 入职管理；src/v2/OnboardingPage.tsx:51 | 待入职核验 | D；pending不区分核验前后，详细清单进度单独显示。 |
| COPY-034 | 入职管理；src/v2/OnboardingPage.tsx:55 | 入职后将衔接 | B/E；明确系统分配任务的动作，保留任务数。 |
| COPY-035 | 入职管理；src/v2/OnboardingPage.tsx:57 | 员工档案已生效，培训任务已创建一次。 | H；“一次”是幂等实现说明，不是操作必需信息；不得改写实际任务数或重复创建行为。 |
| COPY-036 | 入职管理；src/v2/OnboardingPage.tsx:57 | 查看岗位培养任务 | D；与培训管理统一，保留员工过滤参数。 |
| COPY-037 | 员工服务；src/v2/ServicePage.tsx:133 | 制度有依据，办理有进度，关键操作由本人确认。 | C/H；说明现有可用功能；本人确认提交责任在预览继续保留。 |
| COPY-038 | 员工服务；src/v2/ServicePage.tsx:148 | 当前办理任务 · 同一张卡片完成 | H/E；移除布局自述，直接说明卡片办理的业务。 |
| COPY-039 | 员工服务；src/v2/ServicePage.tsx:148 | 申请办理结果 | G；提交后可能仍待审批，不能让标题暗示办理完成。 |
| COPY-040 | 员工服务；src/v2/ServicePage.tsx:153 | 请假原因 | D；当前表单标题为请假事由，保持placeholder同义称呼一致。 |
| COPY-041 | 员工服务；src/v2/ServicePage.tsx:164 | 暂无人工接管工单 | B/E；对HR展示业务事项，避免接管术语；已有工单编号与状态保留。 |
| COPY-042 | 员工服务；src/v2/ServicePage.tsx:164 | 知识库暂无依据的问题，由 HR 接管回复。 | B/E；动作明确，避免抽象“接管”；不能改成助手已解决。 |
| COPY-043 | 培训管理；src/v2/TrainingPage.tsx:68 | 岗位培训 | D；导航与页标题一致；具体岗位培训任务仍可保留岗位范围。 |
| COPY-044 | 培训管理；src/v2/TrainingPage.tsx:68 | 岗位必修与人工确认的发展任务，共用同一份演示 SOP 和可追溯的演练记录。 | A/H；功能概述简短；演示SOP适用范围在资料与风险提示中保留。 |
| COPY-045 | 培训管理；src/v2/TrainingPage.tsx:71 | 我的培养任务 | D；与培训管理使用同一任务名称。 |
| COPY-046 | 培训管理；src/v2/TrainingPage.tsx:74 | 确认培养需求 | G；当前标签描述已创建任务类型，不是待点击的确认动作；确认责任在详情保留。保持development来源属性，与必修任务区分。 |
| COPY-047 | 培训管理；src/v2/TrainingPage.tsx:80 | 查看协同进度 | F；按钮只导航驾驶舱，没有独立协同进度页。 |
| COPY-048 | 培训管理；src/v2/TrainingPage.tsx:80 | 根据右侧反馈补齐遗漏步骤，复习后再完成一次演练。复练通过会同步完成原任务。 | B/G；去除“右侧”方位，兼容移动端纵向排版；保留原任务完成规则。 |
| COPY-049 | 企业知识库；src/v2/KnowledgePage.tsx:30 | 制度、入职指引与岗位 SOP，共享同一来源、版本和引用章节。 | A/E；使用用户查阅行为描述；SOP可在资料标题保留首次中文释义。 |
| COPY-050 | 企业知识库；src/v2/KnowledgePage.tsx:33 | 已定位到原任务引用的章节，正文高亮保持来源对应。 | A/H；实现细节不必重复解释，引用定位事实保留。 |
| COPY-051 | 企业知识库；src/v2/KnowledgePage.tsx:33 | 当前引用 / 选中章节 | G；手动选中章节未必是原任务引用，不能混淆引用来源与阅读选中状态。 |
| COPY-052 | 员工服务（服务端提示）；server/app.mjs:377 | textField(body.reason, '请假原因' | D；仅字段校验展示名与表单统一，不改变reason字段、校验或API。 |
| COPY-053 | 员工服务（助手回复）；server/app.mjs:184 | 本 Demo 仅支持年假制度查询与办理 | D；中文演示用语统一；未支持假别与人工处理边界必须保留。 |
| COPY-054 | 培训管理（服务端提示）；server/app.mjs:440 | 该任务已通过，请查看已保存的培训结果。 | D/G；completed是任务完成；用演练结果避免暗示岗位资质考核已通过。 |
| COPY-055 | Order2People；src/v2/Order2PeoplePage.tsx:68 | People-Lab · Order2People 第一阶段 | E/H；开发阶段与日常任务无关；品牌留副标即可 |
| COPY-056 | Order2People；src/v2/Order2PeoplePage.tsx:68 | 生产需求与能力诊断 | B/E；用普通HR能理解的业务对象命名；导航同步 |
| COPY-057 | Order2People；src/v2/Order2PeoplePage.tsx:68 | 订单人工工时 → 合格人员共享容量 → 未覆盖工时。确定性计算，不推断招聘人数。 | A/E；保留输出边界，避免共享容量术语 |
| COPY-058 | Order2People；src/v2/Order2PeoplePage.tsx:68 | 载入 / 重置演示样例 | F/G；端点按新版本恢复指定样例并保留历史，区别全站清空重置 |
| COPY-059 | Order2People；src/v2/Order2PeoplePage.tsx:68 | 样例：100 件 × 360 秒；合格可用 8h；预期缺口 2h | G；固定工具栏样例不能冒充当前计算；其他数据加入后不保证2h |
| COPY-060 | Order2People；src/v2/Order2PeoplePage.tsx:70 | 1. 维护生产输入 | B/E；输入是技术词，明确业务内容 |
| COPY-061 | Order2People；src/v2/Order2PeoplePage.tsx:14 | 已承诺任务 | B/D；明确已保存的任务时间占用；不等于计算分配 |
| COPY-062 | Order2People；src/v2/Order2PeoplePage.tsx:71 | 从已保存订单准备每日需求草稿 | A/F；按钮直陈动作；旁边保留基于已保存订单及跨日人工拆分说明 |
| COPY-063 | Order2People；src/v2/Order2PeoplePage.tsx:72 | 人员容量对比 | B/E；这里比较分配与可用工时，并非生产设备产能 |
| COPY-064 | Order2People；src/v2/Order2PeoplePage.tsx:72 | 每位人员跨技能共享容量；分配用于分析，不代表产能预订。 | E；保留工时守恒与不预订边界 |
| COPY-065 | Order2People；src/v2/Order2PeoplePage.tsx:73 | 3. 诊断记录与计算依据 | A/H；长依据已有详情承载；标题简短 |
| COPY-066 | Order2People；src/v2/Order2PeoplePage.tsx:73 | 尚无诊断。先录入订单、工艺、资格、日历和占用完整性，再计算。 | B/E；明确是记录为空及下一步，不称没有缺口 |
| COPY-067 | Order2People；src/v2/Order2PeoplePage.tsx:73 | {r.status} | B/E/G；展示映射，不改变内部状态值；大括号为方案说明，不可机械粘贴 |
| COPY-068 | Order2People；src/v2/Order2PeoplePage.tsx:73 | 同日竞争需求： | E；解释跨需求争用同一工时的事实 |
| COPY-069 | Order2People；src/v2/Order2PeoplePage.tsx:73 | 导出 SkillBridge JSON | B/E/F；明确导出对象和文件格式；不移除技术格式事实 |
| COPY-070 | Order2People；src/v2/Order2PeoplePage.tsx:73 | 前往 SkillBridge 分析 | A/D/F；navigate仅跳页，不应叫发起分析 |
| COPY-071 | Order2People；src/v2/Order2PeopleEntryForm.tsx:9 | 单位人工秒数 | B/D；保留秒单位与人工含义 |
| COPY-072 | Order2People；src/v2/Order2PeopleEntryForm.tsx:9 | 每批准备人工秒数 | B/D；明确每批而非每件；仍是人工工时 |
| COPY-073 | Order2People；src/v2/Order2PeopleEntryForm.tsx:10 | 已激活员工编号 | B/E；active对应本项目在职，保留只能引用active员工约束 |
| COPY-074 | Order2People；src/v2/Order2PeopleEntryForm.tsx:40 | 已核验有效资格 | G；verified只表示核验状态，是否对当前窗口有效仍须校验有效期 |
| COPY-075 | Order2People；src/v2/Order2PeopleEntryForm.tsx:40 | 保存表单记录 | A/F；省略实现载体，保留动作 |
| COPY-076 | Order2People；src/v2/Order2PeoplePlanningForm.tsx:35 | 结构化草稿格式无效，请在高级编辑中修正。 | D/E/F；指向页面已有同名入口，不改校验规则 |
| COPY-077 | Order2People；src/v2/Order2PeoplePlanningForm.tsx:38 | 每日批次 | B/D；值为批次计数而非批次编号 |
| COPY-078 | Order2People；src/v2/Order2PeoplePlanningForm.tsx:38 | 移除此草稿行 | B/F；只删除当前未提交行，不删除已保存订单 |
| COPY-079 | SkillBridge；src/v2/SkillBridgePage.tsx:13 | 已验证可直接上岗 | G；该分类不校验剩余工时或主管确认，不能承诺直接上岗 |
| COPY-080 | SkillBridge；src/v2/SkillBridgePage.tsx:13 | 潜在可迁移技能 | B/G；规则含低等级、未核验、过期或培训记录，并未证明技能迁移 |
| COPY-081 | SkillBridge；src/v2/SkillBridgePage.tsx:13 | 证据不足待核实 | B；句读清晰，不等于没有能力 |
| COPY-082 | SkillBridge；src/v2/SkillBridgePage.tsx:19 | 待 HR 审核 | A/D；上下文已明确HR；此处draft生成后即待审核 |
| COPY-083 | 人才执行闭环；src/v2/SkillBridgePage.tsx:21 | 尚未落地执行 | A/B；去掉落地套话，独立于审核状态 |
| COPY-084 | 人才执行闭环；src/v2/SkillBridgePage.tsx:21 | 已落地执行 | A/B；只表示执行写入，不能表示培训或招聘完成 |
| COPY-085 | 人才执行闭环；src/v2/SkillBridgePage.tsx:23 | 容量占用 | B/E；说明占用对象而非设备容量 |
| COPY-086 | SkillBridge；src/v2/SkillBridgePage.tsx:106 | SkillBridge · 能力供给分析 | A/E；中文业务名称，品牌保留在现有标题中，无需增加副标元素 |
| COPY-087 | SkillBridge；src/v2/SkillBridgePage.tsx:111 | 只读消费 Order2People 已确认需求：内部有没有合适的人？没有现成人选时谁具备可迁移技能？什么时候必须考虑外部招聘？ | A/E/H；去掉只读消费等实现词和连续提问，不承诺必须招聘 |
| COPY-088 | SkillBridge；src/v2/SkillBridgePage.tsx:113 | 技能匹配基于已验证资格与人工证据，不使用大模型推理；培训完成或简历关键词不会被当作正式资格。 | A/E/H；保留依据和资格边界；规则演示说明在演示标记保留 |
| COPY-089 | SkillBridge；src/v2/SkillBridgePage.tsx:119 | 请先在生产需求页面完成计算并由 HR 确认结果；blocked/stale 结果不会出现在此处。 | B/E；不向普通HR暴露英文内部枚举 |
| COPY-090 | SkillBridge；src/v2/SkillBridgePage.tsx:119 | 前往生产需求与能力诊断 | A/D/F；与导航对齐 |
| COPY-091 | SkillBridge；src/v2/SkillBridgePage.tsx:127 | 发起 SkillBridge 分析 | A/E/F；该动作创建分析记录，区别仅导航按钮 |
| COPY-092 | SkillBridge；src/v2/SkillBridgePage.tsx:21 | 上游已过期 | B/E；说明哪个业务对象过期 |
| COPY-093 | SkillBridge；src/v2/SkillBridgePage.tsx:148 | 2 / 3. 内部人才与技能差距 | B/D/E；主表比较资格要求与证据，不把差距当能力缺失 |
| COPY-094 | SkillBridge；src/v2/SkillBridgePage.tsx:149 | 没有任何在职人员具备相关技能证据，内部无法形成可靠供给。 | G；数据覆盖有限，不能断言所有员工没有能力 |
| COPY-095 | SkillBridge；src/v2/SkillBridgePage.tsx:159 |  · 可用  | D/G；availableSecondsInWindow已减原计算分配，区别总可用工时 |
| COPY-096 | SkillBridge；src/v2/SkillBridgePage.tsx:165 | 同一缺口的三类可选路径，均为可解释建议，不代表确定承诺 | E/H；保留人工审核及执行校验，不承诺可实施 |
| COPY-097 | 人才执行闭环；src/v2/SkillBridgePage.tsx:194 | 执行方案 | F/G；明确写入后果；是分支展示建议，不能整句粘贴 |
| COPY-098 | 人才执行闭环；src/v2/SkillBridgePage.tsx:193 | 确认执行 | F；表单标题和说明须明确对象，并保留主管确认与风险字段 |
| COPY-099 | 人才执行闭环；src/v2/SkillBridgePage.tsx:198 | 查看已创建的培训任务 | A/F；状态已有已执行，无需重复 |
| COPY-100 | 人才执行闭环；src/v2/SkillBridgePage.tsx:199 | 前往招聘工作台查看需求草稿 | A/F；实际仅跳招聘页，若不能定位记录须保留为“前往招聘管理”，不承诺定位 |
| COPY-101 | 人才执行闭环；src/v2/SkillBridgePage.tsx:200 | 前往生产需求查看占用与重新计算 | A/F；保留旁注“查看占用后重新计算并确认”；按钮只是跳页 |
| COPY-102 | SkillBridge；src/v2/SkillBridgePage.tsx:208 | 5. HR 审核状态与下一步 | A/H；已存在状态和执行区，避免重复步骤计数 |
| COPY-103 | SkillBridge；src/v2/SkillBridgePage.tsx:208 | 方案状态与审核记录持久化保存，刷新页面不会丢失 | E/H；避免持久化实现术语；不删除实际审核人/时间/说明 |
| COPY-104 | 人才执行闭环；src/v2/SkillBridgePage.tsx:56 | 已创建，暂未同步。请重试同步，勿重复执行。 | G；act复用于发起分析、审核、执行，泛称创建不准确；该分支已知前序写入成功 |
| COPY-105 | SkillBridge；server/skillbridge-engine.mjs:38 | 已验证 | D；仅资格证据summary显示词统一；禁止改变资格判断或历史记录 |
| COPY-106 | SkillBridge；server/skillbridge-engine.mjs:140 | 当日可用容量 | D/E；该方案说明采用剩余增量，必须与工时口径一致 |
| COPY-107 | SkillBridge；server/skillbridge-engine.mjs:161 | 由主管审批后再纳入正式供给 | G；主管审批不能替代资格核验；只修建议文字，不放宽规则 |
| COPY-108 | SkillBridge；server/skillbridge-engine.mjs:142 | 在人员排班中落实调配 | F/G；本项目无独立排班管理页面；不指向未实现操作 |
| COPY-109 | SkillBridge；server/skillbridge-engine.mjs:169 | 已存在至少一条可靠的内部调配路径 | G；工时匹配不等于部分时段可执行 |
| COPY-110 | 人才执行闭环；server/skillbridge-api.mjs:356 | 资格或增量容量不足；原分配不能再次用于补缺口 | D/E；不猜复合错误的具体原因，保留硬约束 |
| COPY-111 | 人才执行闭环；server/skillbridge-api.mjs:361 | 须补充可核验的实际调配区间及目标订单；当前模型不能安全表达部分时段承诺 | E/G；明确当前无法支持，不暗示仅补字段就可执行 |
| COPY-112 | SkillBridge；server/skillbridge-api.mjs:186 | 审核结果须为 hr_approved 或 hr_rejected | B/E；仅改变可见message，内部decision和错误码保留 |
| COPY-113 | 招聘管理；server/skillbridge-api.mjs:276 | 状态须为 draft/open/closed | B/E；按招聘需求对象映射，不改枚举 |
| COPY-114 | Order2People；server/order2people-engine.mjs:91 | 日历、占用或资格完整性尚未确认 | B/E；缺失资料不是没有人员；不将未知变零 |
| COPY-115 | Order2People；server/order2people-engine.mjs:178 | Asia/Shanghai 自然日；日桶内人工工时可切分 | E；保留模型假设，避免日桶术语 |
| COPY-116 | Order2People；server/order2people-engine.mjs:178 | 按人员 ID、需求 ID 稳定排序最大流；分配不预订产能 | E/H；业务摘要；最大流算法和排序留技术/详情依据，不改算法 |
| COPY-117 | Order2People；server/order2people-api.mjs:104 | 结果版本冲突 | E；给出恢复动作，不能自动确认旧结果 |
| COPY-118 | 全站导航；src/v2/WorkspaceShell.tsx:18 | 生产需求与能力 | D/E；可见导航改业务名；同步aria-label，品牌保留副标 |
| COPY-119 | 全站导航；src/v2/WorkspaceShell.tsx:19 | SkillBridge 能力供给 | D/E；中文业务名称便于HR理解；SkillBridge保留在已有页标题中 |
| COPY-120 | 全站导航；src/v2/WorkspaceShell.tsx:18 | label: '生产需求' | D；无障碍名称与可见导航一致，不改变page标识 |
| COPY-121 | 全站导航；src/v2/WorkspaceShell.tsx:19 | label: 'SkillBridge' | D；无障碍名称与可见导航一致，不改内部page |
| COPY-122 | 全站导航；src/v2/WorkspaceShell.tsx:21 | label: '招聘工作台' | D；与可见导航及页面标题一致 |
| COPY-123 | 全站导航；src/v2/WorkspaceShell.tsx:24 | label: '岗位培训' | D；与可见导航及页面标题一致 |
| COPY-124 | 全站导航；src/v2/WorkspaceShell.tsx:39 | 招聘 · 服务 · 岗位培养 | D；与实际模块名对应 |
| COPY-125 | 全站导航；src/v2/WorkspaceShell.tsx:22 | label: '入职管理', title: '入职办理' | D；模块导航使用统一名，办理入职留作任务动作 |

## 4. 保留项与功能移交

- 演示环境、虚构人员、演示制度及SOP不作为真实作业依据的事实说明，不以“去营销”为由删除。
- HR负责录用，实际入职须完成核验；未写明能力不自动视为缺陷，培训需求由HR核实后选择。
- “操作已保存，但最新数据暂未同步。请重新连接后查看，请勿重复办理。”必须与请求失败严格区分，不能统一成“操作失败请重试”。
- 申请预览、本人才提交、批准时复核和扣减余额；拒绝原因必填。pending仍未扣减余额。
- “演练结果是学习证据，不替代实际岗位操作考核”、SkillBridge任务完成不代表取得资格、评分依据和原任务/复练关联规则。
- 重置确认中所有将被清空的业务对象与保留/恢复范围。
- 员工权限、未入职限制、自己的培训任务限制，以及服务端403/409既有行为。
- 筛选空态“当前阶段没有候选人”、按钮“预览申请”“提交申请”“批准申请”“拒绝申请”“确认录用”“确认入职”“开始学习”“提交演练”“查看制度原文”已经明确，可直接保留。
- catalog中真实制造作业“隔离、记录、上报、跟进复核”等要求属于场景内容，不能因包含“闭环”一词就全局替换；保留实质步骤。可将泛化营销性“全链路闭环”与作业专业名词分开。
- 候选人原文是审阅证据，阶段B不为风格统一改写简历原文及quote；避免破坏精确引用高亮。

## 仅交功能负责人复核，不在文案分支修复

1. RecruitmentPage.tsx:107-109：requisitionError仅在requisitions.length>0区块内显示。首次列表请求失败而列表为空时，错误可能不可见。需要功能负责人复核错误呈现，不用“暂无草稿”掩盖请求失败。
2. ServicePage.tsx:154：年假预计余额使用Math.max(0, balance-days)，余额不足时仍显示0；不能仅换词让不足申请显得可提交。后端会拒绝提交；是否提前说明不足属于交互/业务验收范围。
3. WorkbenchApp.tsx:114：重置说明列举旧HR-V2对象，未覆盖Order2People与SkillBridge的清理范围。需要功能负责人按store.reset实际行为确定范围，再写最终确认文案；不能凭文案研究推断是否清除生产数据。
4. RecruitmentPage.tsx:12/108/126：requisition内部draft仅草稿；open可由按钮或关联候选人触发。不能把open统一成“已批准”或“已发布”，必须明确它未经过正式招聘职位发布流程。
5. RecruitmentPage.tsx:10与server/catalog.mjs候选人周启航gap：当前“确认待提升”暗示已完成HR核实，而证据只到候选人自述。建议“待核实提升需求”；后续确认动作交功能负责人确认状态责任。
6. OnboardingPage.tsx:52的“入职日期”取employee.joinDate，默认建档日期且可以API维护；是否代表计划入职或实际到岗日期需负责人确定。未列机械替换，不能擅改为实际日期。
7. TrainingPage.tsx:80的“当前为管理者查看模式”由!canTrain决定，若员工进入他人记录也会落入此状态。权限可达性需功能负责人验证；安全的展示建议“当前为查看模式”，但不据此修改权限逻辑。
8. “管理驾驶舱”与员工工作台应按身份区分。静态导航目前同一个title，阶段B若需增加按身份标签属局部展示分支；不能把员工页面统一称企业管理驾驶舱。


### 生产用工与执行补充移交

- SkillBridge“资格符合要求”只描述资格，不代表增量工时充足、主管已确认或可核验的实际区间存在。先准确改展示，不能通过删硬约束让执行成功。
- ASSIGNMENT_INTERVAL_REQUIRED反映当前模型不能证明部分时段承诺；不得承诺填写文本即可解决。若需新增区间录入/模型能力，留给功能任务。
- 调配执行使依赖的计算过期；409失败事务回滚，不能因为兼容枚举存在就写“已保存阻断状态”。
- 方案说明的小时数使用Math.round而页面工时有小数，存在显示精度差异风险，需负责人确认；本轮不改数字格式化逻辑或计算结果。
- 生成每日需求草稿沿用订单窗口，跨日拆分和批次仍需人工核对；这些约束不可作为“解释过多”删除。

以上为源码风险，未经本轮浏览器复现，不给出P0/P1定级、不声称已经发生数据错误。记录在本文供功能负责人接手；本轮未发送对外消息或创建问题单。

## 5. 协作、验证与实施边界

预计代码与共享文件逐项见替换表末尾。所有候选src/v2文件都可能与另一开发者的页面、导航、状态、布局修复重叠；server/app、skillbridge API/engine也是高风险。实际文件归属需要对方释放或修复PR合并后确认；当前不能认定无冲突。

阶段A文档验证：核查每条原文存在于固定基线对应行；核查来源编号、相对文档链接、九模块覆盖、术语口径及新增文件白名单。仅文档变更不安装依赖、不运行构建和业务测试，遵循AGENTS纯文档规则；不引用历史通过数为本轮证据。官方链接以本轮工具访问结果为准，访问受限项保留说明。

阶段B必须重新核实最新main并逐项评估变化后的原文；待明确指令后创建refactor/product-copy，局部修改可见文字，不改API/数据库/枚举/业务规则。同步必要选择器、操作指南和AGENTS入口，完成构建、单元/接口、相关浏览器及1440/390实际布局检查。独立PR，不自动合并。

文案研究与替换方案已完成，等待功能修复 PR 合并后实施。
