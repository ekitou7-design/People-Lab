# People-Lab 阶段 B 文案交付

日期：2026-10-31。基线：最新 main `e98a501969639a6b75997f9bc10dfc7bed2c480b`。实施前已核实 PR #6 合并（`5431c3b`），并保留 PR #7 的首页布局。独立分支 `refactor/product-copy`，不自动合并。

## 范围与计数

完成 **127项文案及展示调整**。计数口径为下表逐页调整项：同一项在同页多处使用不重复计数；状态映射、按身份/方案类型显示按钮、业务名称映射各以一个展示调整项计，不把运行时每条记录虚增为文案数量。文档和测试选择器不计入127项。服务端历史文字保持原样，前端映射已知表述；未知编号不猜测名称。

阶段 A 的23项来源未重新调研。125项建议不是本轮替换次数；结合新界面采用、改写或通过展示映射处理。前三份研究文件来自 `3b91757`，两份研究档案保持原阶段 A 内容，UX-WRITING 转为正式规范。

## 主要页面前后对照

| 页面 | 修改前 | 修改后 |
|---|---|---|
| 一级导航 | 生产需求与能力、SkillBridge 能力供给、招聘证据审阅、岗位培养 | 生产用工、人才方案、招聘管理、培训管理；可见名称与无障碍名称统一 |
| 首页 | 人才协同工作台；从当前的人与任务出发，推进招聘、员工服务与岗位培养 | 管理驾驶舱（员工为我的工作台）；查看招聘、入职、员工服务和培训进度 |
| 首页生产入口 | 订单→缺口→人才路径→人工审核→执行反馈的长说明 | 先计算用工缺口，再比较人才方案。方案须经人工审核，批准后另行执行。 |
| 招聘管理 | 确认待提升、候选人队列、待处理草稿、关联 | 待核实提升需求、候选人列表、草稿、关联候选人 |
| 入职管理 | 把录用决定衔接为一份可核验的清单，再开启员工服务与岗位培养 | 核验入职清单，确认员工实际入职。已入职/待入职按同一对象统一 |
| 员工服务 | 制度有依据，办理有进度，关键操作由本人确认；申请办理结果 | 查询制度、提交年假申请和查看办理进度；申请进度；请假事由 |
| 培训管理 | 岗位培训、我的培养任务、确认培养需求、查看协同进度 | 培训管理、我的培训任务、培养任务、返回工作台 |
| 企业知识库 | 制度、入职指引与岗位 SOP，共享同一来源、版本和引用章节 | 查阅员工制度、入职指南和岗位作业指导书；当前章节 |
| 生产用工 | 生产需求与能力诊断、calculated/confirmed/blocked/stale、人员容量对比 | 生产用工分析、待确认/已确认/无法计算/已过期、人员工时分配 |
| 人才方案 | 只读消费、已验证可直接上岗、潜在可迁移技能、可用 | 人才方案；资格符合要求；资格待补齐或核验；可新增分配工时 |
| 执行 | 执行方案、确认执行、已落地执行 | 创建培训任务/创建招聘需求草稿/创建调配占用、确认创建、已执行；确认区说明实际写入对象 |
| 0缺口 | 仍提示先计算并确认 | 已确认结果中没有待处理的用工缺口，可在生产用工中查看计算记录 |

## 专业术语与保留理由

- Order2People、SkillBridge：保留为页面品牌，导航采用中文业务名。
- HR：企业常用岗位简称；SOP：保留资料原题与引用，页面说明用“作业指导书”。
- JSON：仅导出和高级维护保留格式名；原 ID、版本、来源定位和资格类型在高级维护/原始依据保留，供核查和兼容。
- `inspect`、`pos-quality`、`inspection`、`quality-auth`：已知演示目录显示质量检验、质量检验员、检验与记录、质量检验资格；内部字段和导出不变，未知编号原样显示。
- 工时单位 h、资格等级与有效期：计算口径和判断依据，不能省略或写成人数。
- 风险与未知项：原列表数量和对应风险全部保留，精简实现术语；主管确认不能替代资格和剩余工时约束，培训不授资格。

## 验证

构建、单元/接口、四组浏览器和规则审计的最终结果记录在 VALIDATION.md；首次受本地端口限制及旧文案选择器影响的失败未记作通过。原有业务断言保留，新增展示映射测试与0缺口提示断言。

前后截图包含 main 与本分支的相同八个页面在1440px和390px各一组，以及有真实流程数据的 HR、生产、人才方案和执行截图；另有1024px现有回归。原始截图/日志保存在本次本地交付目录，不提交数据库、依赖或测试运行产物。截图用于本轮文字和布局抽样，不代表生产系统验收。

## 逐项调整清单

| # | 来源项 | 页面/文件 | 修改前 | 修改后 |
|---|---|---|---|---|
| 1 | COPY-001 | src/v2/WorkspaceShell.tsx | 招聘证据审阅 | 招聘管理 |
| 2 | COPY-002 | src/v2/WorkspaceShell.tsx | 岗位培养 | 培训管理 |
| 3 | COPY-003 | src/v2/WorkspaceShell.tsx | 企业知识 | 企业知识库 |
| 4 | COPY-005 | src/v2/WorkspaceShell.tsx | 智造人才工作空间 | 人才工作空间 |
| 5 | COPY-006 | src/v2/WorkbenchApp.tsx | 操作已保存，业务记录已同步 | 已保存 |
| 6 | COPY-007 | src/v2/WorkbenchApp.tsx | 正在连接人才协同工作台… | 正在加载工作台… |
| 7 | COPY-008 | src/v2/WorkbenchApp.tsx | 用一位新同事，走通人才协同 | 操作指南 |
| 8 | COPY-009 | src/v2/WorkbenchApp.tsx | 订单→缺口→人才路径→人工审核→执行反馈 | 计算用工缺口并审核方案 |
| 9 | COPY-011 | src/v2/DashboardPage.tsx | 从当前的人与任务出发，推进招聘、员工服务与岗位培养。 | 查看招聘、入职、员工服务和培训进度。 |
| 10 | COPY-012 | src/v2/DashboardPage.tsx | 从订单识别能力缺口 | 生产用工缺口 |
| 11 | COPY-013 | src/v2/DashboardPage.tsx | 开始生产需求诊断 | 前往生产用工 |
| 12 | COPY-014 | src/v2/DashboardPage.tsx | 现在需要推进 | 待办事项 |
| 13 | COPY-015 | src/v2/DashboardPage.tsx | 项可推进 | 项待办 |
| 14 | COPY-016 | src/v2/DashboardPage.tsx | 当前事项已处理 | 暂无待办事项 |
| 15 | COPY-017 | src/v2/DashboardPage.tsx | 继续岗位培养 | 继续培训 |
| 16 | COPY-018 | src/v2/DashboardPage.tsx | 待完成培养 | 待完成培训 |
| 17 | COPY-019 | src/v2/DashboardPage.tsx | 已完成培养 | 已完成培训 |
| 18 | COPY-020 | src/v2/DashboardPage.tsx | 岗位能力模型 | 岗位能力要求 |
| 19 | COPY-022 | src/v2/RecruitmentPage.tsx | 确认待提升 | 待核实提升需求 |
| 20 | COPY-023 | src/v2/RecruitmentPage.tsx | 招聘证据审阅 | 招聘管理 |
| 21 | COPY-024 | src/v2/RecruitmentPage.tsx | 候选人队列 | 候选人列表 |
| 22 | COPY-025 | src/v2/RecruitmentPage.tsx | 下一步核实问题 | 面试参考问题 |
| 23 | COPY-027 | src/v2/RecruitmentPage.tsx | 由能力缺口分析生成，非正式招聘申请；请人工关联已有候选人或在完成评估后关闭 | 根据用工缺口生成，尚未正式提报。可关联候选人或关闭需求。 |
| 24 | COPY-029 | src/v2/RecruitmentPage.tsx | 人工确认的培养需求 | 已核实的培养需求 |
| 25 | COPY-030 | src/v2/OnboardingPage.tsx | 把录用决定衔接为一份可核验的清单，再开启员工服务与岗位培养。 | 核验入职清单，确认员工实际入职。 |
| 26 | COPY-031 | src/v2/OnboardingPage.tsx | 入职办理队列 | 入职记录 |
| 27 | COPY-032 | src/v2/OnboardingPage.tsx | 已正式入职 | 已入职 |
| 28 | COPY-033 | src/v2/OnboardingPage.tsx | 待入职核验 | 待入职 |
| 29 | COPY-034 | src/v2/OnboardingPage.tsx | 入职后将衔接 | 入职后分配 |
| 30 | COPY-035 | src/v2/OnboardingPage.tsx | 员工档案已生效，培训任务已创建一次。 | 员工档案已生效，培训任务已创建。 |
| 31 | COPY-036 | src/v2/OnboardingPage.tsx | 查看岗位培养任务 | 查看培训任务 |
| 32 | COPY-037 | src/v2/ServicePage.tsx | 制度有依据，办理有进度，关键操作由本人确认。 | 查询制度、提交年假申请和查看办理进度。 |
| 33 | COPY-038 | src/v2/ServicePage.tsx | 当前办理任务 · 同一张卡片完成 | 年假申请 |
| 34 | COPY-039 | src/v2/ServicePage.tsx | 申请办理结果 | 申请进度 |
| 35 | COPY-040 | src/v2/ServicePage.tsx | 请假原因 | 请假事由 |
| 36 | COPY-041 | src/v2/ServicePage.tsx | 暂无人工接管工单 | 暂无人工咨询 |
| 37 | COPY-042 | src/v2/ServicePage.tsx | 知识库暂无依据的问题，由 HR 接管回复。 | 知识库无法回答的问题，由 HR 回复。 |
| 38 | COPY-043 | src/v2/TrainingPage.tsx | 岗位培训 | 培训管理 |
| 39 | COPY-044 | src/v2/TrainingPage.tsx | 岗位必修与人工确认的发展任务，共用同一份演示 SOP 和可追溯的演练记录。 | 查看培训任务、学习资料和演练记录。 |
| 40 | COPY-045 | src/v2/TrainingPage.tsx | 我的培养任务 | 我的培训任务 |
| 41 | COPY-046 | src/v2/TrainingPage.tsx | 确认培养需求 | 培养任务 |
| 42 | COPY-047 | src/v2/TrainingPage.tsx | 查看协同进度 | 返回工作台 |
| 43 | COPY-048 | src/v2/TrainingPage.tsx | 根据右侧反馈补齐遗漏步骤，复习后再完成一次演练。复练通过会同步完成原任务。 | 根据演练反馈补齐遗漏步骤，再次完成演练。复练通过后，原任务同步完成。 |
| 44 | COPY-049 | src/v2/KnowledgePage.tsx | 制度、入职指引与岗位 SOP，共享同一来源、版本和引用章节。 | 查阅员工制度、入职指南和岗位作业指导书。 |
| 45 | COPY-050 | src/v2/KnowledgePage.tsx | 已定位到原任务引用的章节，正文高亮保持来源对应。 | 已定位到引用章节。 |
| 46 | COPY-051 | src/v2/KnowledgePage.tsx | 当前引用 / 选中章节 | 当前章节 |
| 47 | COPY-055 | src/v2/Order2PeoplePage.tsx | People-Lab · Order2People 第一阶段 | Order2People |
| 48 | COPY-056 | src/v2/Order2PeoplePage.tsx | 生产需求与能力诊断 | 生产用工分析 |
| 49 | COPY-057 | src/v2/Order2PeoplePage.tsx | 订单人工工时 → 合格人员共享容量 → 未覆盖工时。确定性计算，不推断招聘人数。 | 根据订单工时和合格人员的可用工时计算缺口，不直接推算招聘人数。 |
| 50 | COPY-058 | src/v2/Order2PeoplePage.tsx | 载入 / 重置演示样例 | 载入或恢复生产样例 |
| 51 | COPY-059 | src/v2/Order2PeoplePage.tsx | 样例：100 件 × 360 秒；合格可用 8h；预期缺口 2h | 样例标准工况：需求10小时、可用8小时、缺口2小时；当前结果以实际输入为准。 |
| 52 | COPY-060 | src/v2/Order2PeoplePage.tsx | 1. 维护生产输入 | 1. 维护用工数据 |
| 53 | COPY-061 | src/v2/Order2PeoplePage.tsx | 已承诺任务 | 任务占用 |
| 54 | COPY-062 | src/v2/Order2PeoplePage.tsx | 从已保存订单准备每日需求草稿 | 生成每日需求草稿 |
| 55 | COPY-063 | src/v2/Order2PeoplePage.tsx | 人员容量对比 | 人员工时分配 |
| 56 | COPY-064 | src/v2/Order2PeoplePage.tsx | 每位人员跨技能共享容量；分配用于分析，不代表产能预订。 | 同一员工的工时由各项技能需求共用，不重复计算。本次分配仅用于分析，不预订工时。 |
| 57 | COPY-065 | src/v2/Order2PeoplePage.tsx | 3. 诊断记录与计算依据 | 3. 计算记录 |
| 58 | COPY-066 | src/v2/Order2PeoplePage.tsx | 尚无诊断。先录入订单、工艺、资格、日历和占用完整性，再计算。 | 暂无计算记录。请先补全订单、工艺、资格、班次和任务占用，并确认数据完整后计算。 |
| 59 | COPY-068 | src/v2/Order2PeoplePage.tsx | 同日竞争需求： | 同日共用人员工时的需求： |
| 60 | COPY-069 | src/v2/Order2PeoplePage.tsx | 导出 SkillBridge JSON | 导出缺口数据（JSON） |
| 61 | COPY-070 | src/v2/Order2PeoplePage.tsx | 前往 SkillBridge 分析 | 前往人才方案 |
| 62 | COPY-071 | src/v2/Order2PeopleEntryForm.tsx | 单位人工秒数 | 单位人工工时（秒） |
| 63 | COPY-072 | src/v2/Order2PeopleEntryForm.tsx | 每批准备人工秒数 | 每批准备人工工时（秒） |
| 64 | COPY-073 | src/v2/Order2PeopleEntryForm.tsx | 已激活员工编号 | 在职员工编号 |
| 65 | COPY-074 | src/v2/Order2PeopleEntryForm.tsx | 已核验有效资格 | 已核验 |
| 66 | COPY-075 | src/v2/Order2PeopleEntryForm.tsx | 保存表单记录 | 保存记录 |
| 67 | COPY-076 | src/v2/Order2PeoplePlanningForm.tsx | 结构化草稿格式无效，请在高级编辑中修正。 | 草稿格式有误，请展开“高级结构化草稿编辑”检查。 |
| 68 | COPY-077 | src/v2/Order2PeoplePlanningForm.tsx | 每日批次 | 每日批次数 |
| 69 | COPY-078 | src/v2/Order2PeoplePlanningForm.tsx | 移除此草稿行 | 删除草稿行 |
| 70 | COPY-079 | src/v2/SkillBridgePage.tsx | 已验证可直接上岗 | 资格符合要求 |
| 71 | COPY-080 | src/v2/SkillBridgePage.tsx | 潜在可迁移技能 | 资格待补齐或核验 |
| 72 | COPY-081 | src/v2/SkillBridgePage.tsx | 证据不足待核实 | 依据不足，待核实 |
| 73 | COPY-082 | src/v2/SkillBridgePage.tsx | 待 HR 审核 | 待审核 |
| 74 | COPY-086 | src/v2/SkillBridgePage.tsx | SkillBridge · 能力供给分析 | 人才方案 · SkillBridge |
| 75 | COPY-087 | src/v2/SkillBridgePage.tsx | 只读消费 Order2People 已确认需求：内部有没有合适的人？没有现成人选时谁具备可迁移技能？什么时候必须考虑外部招聘？ | 针对已确认的用工缺口，查看内部调配、培养和外部招聘方案。 |
| 76 | COPY-088 | src/v2/SkillBridgePage.tsx | 技能匹配基于已验证资格与人工证据，不使用大模型推理；培训完成或简历关键词不会被当作正式资格。 | 方案依据资格记录和人工核实材料生成。培训完成或简历关键词不等于岗位资格。 |
| 77 | COPY-089 | src/v2/SkillBridgePage.tsx | 请先在生产需求页面完成计算并由 HR 确认结果；blocked/stale 结果不会出现在此处。 | 请先完成用工计算并由HR确认结果。无法计算或已过期的结果不能用于分析。 |
| 78 | COPY-090 | src/v2/SkillBridgePage.tsx | 前往生产需求与能力诊断 | 前往生产用工 |
| 79 | COPY-091 | src/v2/SkillBridgePage.tsx | 发起 SkillBridge 分析 | 分析人才方案 |
| 80 | COPY-092 | src/v2/SkillBridgePage.tsx | 上游已过期 | 需求已过期 |
| 81 | COPY-093 | src/v2/SkillBridgePage.tsx | 2 / 3. 内部人才与技能差距 | 2. 内部人才与资格差距 |
| 82 | COPY-094 | src/v2/SkillBridgePage.tsx | 没有任何在职人员具备相关技能证据，内部无法形成可靠供给。 | 当前记录中未找到有相关依据的内部人选。请核查技能和资格资料。 |
| 83 | COPY-095 | src/v2/SkillBridgePage.tsx | · 可用 | · 可新增分配 |
| 84 | COPY-096 | src/v2/SkillBridgePage.tsx | 同一缺口的三类可选路径，均为可解释建议，不代表确定承诺 | 可选方案须经HR审核，执行前仍需核验资格和工时。 |
| 85 | COPY-102 | src/v2/SkillBridgePage.tsx | 5. HR 审核状态与下一步 | 审核记录 |
| 86 | COPY-103 | src/v2/SkillBridgePage.tsx | 方案状态与审核记录持久化保存，刷新页面不会丢失 | 审核记录已保存。 |
| 87 | COPY-083 | src/v2/SkillBridgePage.tsx | 尚未落地执行 | 未执行 |
| 88 | COPY-084 | src/v2/SkillBridgePage.tsx | 已落地执行 | 已执行 |
| 89 | COPY-085 | src/v2/SkillBridgePage.tsx | 容量占用 | 调配工时占用 |
| 90 | COPY-099 | src/v2/SkillBridgePage.tsx | 查看已创建的培训任务 | 查看培训任务 |
| 91 | COPY-118/120 | src/v2/WorkspaceShell.tsx | label: '生产需求', title: '生产需求与能力' | label: '生产用工', title: '生产用工' |
| 92 | COPY-119/121 | src/v2/WorkspaceShell.tsx | label: 'SkillBridge', title: 'SkillBridge 能力供给' | label: '人才方案', title: '人才方案' |
| 93 | COPY-004 | src/v2/WorkspaceShell.tsx | label: '驾驶舱', title: '人才工作台' | label: '管理驾驶舱', title: '管理驾驶舱' |
| 94 | COPY-122 | src/v2/WorkspaceShell.tsx | label: '招聘工作台' | label: '招聘管理' |
| 95 | COPY-123 | src/v2/WorkspaceShell.tsx | label: '岗位培训' | label: '培训管理' |
| 96 | COPY-125 | src/v2/WorkspaceShell.tsx | title: '入职办理' | title: '入职管理' |
| 97 | COPY-124 | src/v2/WorkspaceShell.tsx | 招聘 · 服务 · 培训管理 | 招聘 · 员工服务 · 培训 |
| 98 | B-employee-nav | src/v2/WorkspaceShell.tsx | &lt;span&gt;{item.title}&lt;/span&gt; | &lt;span&gt;{item.page === 'dashboard' &amp;&amp; data.actor.role === 'employee' ? '我的工作台' : item.title}&lt;/span&gt; |
| 99 | B-employee-breadcrumb | src/v2/WorkspaceShell.tsx | {items.find(item =&gt; item.page === page)?.title} | {page === 'dashboard' &amp;&amp; data.actor.role === 'employee' ? '我的工作台' : items.find(item =&gt; item.page === page)?.title} |
| 100 | B-employee-aria | src/v2/WorkspaceShell.tsx | aria-label={item.label} | aria-label={item.page === 'dashboard' &amp;&amp; data.actor.role === 'employee' ? '我的工作台' : item.label} |
| 101 | COPY-010 | src/v2/DashboardPage.tsx | title="人才协同工作台" | title={isEmployee ? '我的工作台' : '管理驾驶舱'} |
| 102 | B-home-intro | src/v2/DashboardPage.tsx | 订单 → 缺口 → 人才路径 → 人工审核 → 执行反馈。无结果时先准备生产输入；批准与执行分别留痕。 | 先计算用工缺口，再比较人才方案。方案须经人工审核，批准后另行执行。 |
| 103 | COPY-021 | src/v2/RecruitmentPage.tsx | draft: '待处理' | draft: '草稿' |
| 104 | COPY-028 | src/v2/RecruitmentPage.tsx | &gt;关联&lt;/button&gt; | &gt;关联候选人&lt;/button&gt; |
| 105 | COPY-026 | src/v2/RecruitmentPage.tsx | 来自 SkillBridge 的招聘需求草稿 | 招聘需求草稿 · 来自人才方案 |
| 106 | COPY-104 | src/v2/SkillBridgePage.tsx | 已创建，暂未同步。请重试同步，勿重复执行。 | 操作已保存，页面暂未同步。请重试同步，勿重复提交。 |
| 107 | B-eyebrow | src/v2/SkillBridgePage.tsx | People-Lab · SkillBridge 第二阶段 | SkillBridge |
| 108 | B-zero-gap | src/v2/SkillBridgePage.tsx | description="请先完成用工计算并由HR确认结果。无法计算或已过期的结果不能用于分析。" | description={eligibleCalculations.length ? '已确认结果中没有待处理的用工缺口，可在生产用工中查看计算记录。' : '请先完成用工计算并由 HR 确认结果。无法计算或已过期的结果不能用于分析。'} |
| 109 | B-empty-title | src/v2/SkillBridgePage.tsx | 暂无可处理的能力缺口 | 当前无待处理缺口 |
| 110 | B-step | src/v2/SkillBridgePage.tsx | 4. 人才供给方案 | 3. 可选人才方案 |
| 111 | COPY-100 | src/v2/SkillBridgePage.tsx | 前往招聘工作台查看需求草稿 | 前往招聘管理 |
| 112 | COPY-101 | src/v2/SkillBridgePage.tsx | 前往生产需求查看占用与重新计算 | 前往生产用工 |
| 113 | COPY-098 | src/v2/SkillBridgePage.tsx | 确认执行&lt;IconBolt | 确认创建&lt;IconBolt |
| 114 | COPY-097 | src/v2/SkillBridgePage.tsx | 执行方案&lt;IconBolt | {proposal.path === 'development_plan' ? '创建培训任务' : proposal.path === 'external_requisition' ? '创建招聘需求草稿' : '创建调配占用'}&lt;IconBolt |
| 115 | B-execution-object | src/v2/SkillBridgePage.tsx | &lt;div className="sb-review-form"&gt;                       {proposal.path | &lt;div className="sb-review-form"&gt;                       &lt;p&gt;{proposal.path === 'development_plan' ? '将创建培训任务，培训完成不授予岗位资格。' : proposal.path === 'external_requisition' ? '将创建招聘需求草稿，尚未正式提报。' : '将创建调配工时占用，须核验资格、可新增分配工时及原岗位影响。'}&lt;/p&gt;                       {proposal.path |
| 116 | B-match | src/v2/SkillBridgePage.tsx | verified_match: '已验证满足', adjacent_skill: '相近技能 · 待核实' | verified_match: '资格符合要求', adjacent_skill: '资格待补齐或核验' |
| 117 | COPY-067 | src/v2/Order2PeoplePage.tsx | {r.status} | {({ blocked: '无法计算', calculated: '待确认', confirmed: '已确认', stale: '已过期' })[r.status]} |
| 118 | B-business-labels | src/v2/Order2PeoplePage.tsx | 内部编号及服务端技术表述直接展示 | 已知业务名称及展示文案映射，未知编号原样保留 |
| 119 | B-business-labels | src/v2/SkillBridgePage.tsx | 内部编号及服务端技术表述直接展示 | 已知业务名称及展示文案映射，未知编号原样保留 |
| 120 | COPY-052/053/054 | server/app.mjs | '请假原因' | '请假事由' |
| 121 | COPY-052/053/054 | server/app.mjs | 本 Demo 仅支持年假制度查询与办理 | 本演示仅支持年假制度查询与办理 |
| 122 | COPY-052/053/054 | server/app.mjs | 该任务已通过，请查看已保存的培训结果。 | 该培训任务已完成，请查看已保存的演练结果。 |
| 123 | B-consistency | src/v2/TrainingPage.tsx | 岗位培养任务 | 培训任务 |
| 124 | B-consistency | src/v2/OnboardingPage.tsx | 项岗位培养 | 项培训 |
| 125 | B-consistency | src/v2/WorkbenchApp.tsx | 自动分配岗位培养任务 | 自动分配培训任务 |
| 126 | B-consistency | src/v2/TrainingPage.tsx | 本次结果已同步到岗位培养进度 | 本次结果已同步到培训进度 |
| 127 | B-consistency | src/v2/SkillBridgePage.tsx | 上游 Order2People 结果已变化并过期，本分析仅供历史查看，不能继续作为调配、培养或招聘的执行依据。 | 用工结果已过期。本分析仅供历史查看，不能继续执行调配、培养或招聘方案。 |
