# People-Lab 产品定位与阶段规划

> 当前交付导航（2026-10-31）：[评委上手](JUDGES-QUICKSTART.md) · [使用说明](USER-GUIDE.md) · [队友移交](HANDOFF.md) · [文档索引](README.md)。本任务集成入口为PR #5，含PR #4依赖；以GitHub确认合并状态。下文原阶段/验证记录保留对应时间语境。


状态：2026-10-31。产品与仓库名称统一为 People-Lab。阶段一 Order2People、阶段二 SkillBridge、阶段三人才执行闭环（SkillBridge 方案→真实招聘需求草稿/培训任务/内部调配容量占用）均已实现并提交 PR，待团队审核合并；验收证据见 ORDER2PEOPLE-DELIVERY.md 与各阶段 PR 描述。Capability Graph、Talent Simulator、Talent Agent 仍为规划，未实现。

## 现状与依据

检查基线：main / origin/main `2d60c74a1f5775dca75ee46ee89107d39da42f9a`（HR-V2）。独立克隆初始工作区干净；远程当时仅见 main，GitHub 查询未返回开放 PR。无法据此判断队友未推送工作。

| 路径 | 已有职责与边界 |
| --- | --- |
| src/v2/ | React + TypeScript 六个业务页面、WorkspaceShell、WorkbenchApp 与公共 UI/样式 |
| server/app.mjs | Express API、演示角色隔离、招聘/入职/请假/培训/工单业务校验 |
| server/catalog.mjs | 虚构岗位、候选人、制度与 SOP，固定规则材料 |
| server/store.mjs | Node 内置 SQLite，版本化业务聚合及独立幂等记录，事务写入 |
| shared/contracts.ts、shared/API.md | 当前 HR-V2 类型和直返 JSON API |
| tests/、scripts/ | 接口测试、浏览器闭环、助手规则审计、Windows 启停 |
| docs/ | HR-V1/V2 发布、验收、演示、设计与历史报告 |

已具备招聘录用→入职→员工服务/年假审批、SOP 培训与复练、知识引用及驾驶舱。演示身份由 x-demo-actor 指定，不是真实认证；问答、简历匹配和培训反馈为固定资料和规则，未接入 LLM/RAG。现有 Employee 不含可计算的技能资格、生产日历和任务占用；Position.headcount 是现有岗位字段，不能用作订单推算结果。

依据：README.md、shared/API.md、shared/contracts.ts、server 实现及 docs/releases/HR-V2.md。历史报告记载 build、14 项接口、52 项浏览器检查通过；本轮仅检查源码与文档，未重跑业务测试。

## 定位、用户与问题

People-Lab 面向智能制造，将生产需求、人员技能、能力缺口、招聘、培训和组织决策连成可追溯闭环。第一阶段服务生产主管与 HR：回答“指定订单窗口内，哪些工序能力存在多少未覆盖工时、为什么、还缺什么信息”。输出支持决策，不自动下达招聘、培训或排班指令。

| 用户 | 当前痛点 | 目标价值 |
| --- | --- | --- |
| 生产主管 | 订单量难转成可复核的用工依据 | 确认工艺、数量、窗口和工时标准 |
| HR/人才规划人员 | 岗位人数与实际可用能力脱节 | 看见按技能、资格和时段拆分的缺口 |
| 工艺/资格数据维护者 | 标准版本、资质与实际执行不一致 | 提供有来源、有效期和责任人的基础数据 |
| 管理者 | 招聘/调配/培训方案缺少共同基线 | 后续在同一需求快照上比较方案 |

## 模块关系与长期方向（均为规划）

| 模块 | 职责 | 上下游 |
| --- | --- | --- |
| Order2People | 从订单与工序标准形成确定性能力工时缺口 | 接生产数据，输出需求快照 |
| SkillBridge | 分析可迁移技能与待培养路径 | 接收需求快照；资格未确认不能计入供给 |
| Capability Graph | 分析关键能力依赖及脆弱点 | 使用统一技能 ID 和来源关系 |
| Talent Simulator | 比较调配、招聘、培训等假设 | 复用快照与引擎；假设结果单独标记 |
| Talent Agent | 在授权下执行任务并反馈结果 | 关联需求与执行记录，不能绕过确认 |

模块共享稳定标识、版本和证据。SkillBridge 建议、课程完成、Agent 反馈均不能直接改写资格或历史计算。现有 HR-V2 功能保留；SkillBridge 与招聘/培训的连接已在第三阶段按明确授权实现（见 WORKSTREAMS.md 第三阶段记录），仅限 HR 已批准方案的人工执行动作，不自动批准人事决策、不自动把培训完成或内部调配转为正式资格。Talent Agent 的自动执行仍为规划，未实现。

## 阶段与成功标准

1. 阶段一 Order2People：订单人工录入/结构化草稿、标准工艺引用、资格与可用工时校验、确定性分配、缺口解释、SkillBridge JSON 输出。已实现，见 ORDER2PEOPLE-DELIVERY.md。
2. 阶段二 SkillBridge：只读消费已确认 Order2People 需求，内部人才分类、技能差距分析、三类供给路径建议、HR 审核留痕。已实现。
3. 阶段三 人才执行闭环：HR 对已批准的 SkillBridge 方案执行真实写入——内部培养生成 Training 模块的真实任务（回链原分析，完成不自动等于资格）、外部招聘生成 Recruitment 模块的需求草稿（不自动生成候选人）、内部调配生成 Order2People 的真实容量占用（按既有规则使相关计算过期）。已实现，待团队审核。
4. 后续阶段：能力依赖分析（Capability Graph）、方案仿真（Talent Simulator）、受控 Agent 执行（Talent Agent）。顺序与范围待另行评审，不承诺时间，均未实现。

阶段一成功指标：每项结果可回溯到输入版本与分配明细；人员可用工时不被重复计入；关键数据缺失时不输出最终缺口；订单变更后旧结果明确过期；结构化需求可独立读取。禁止以演示人数或 AI 自由文本替代计算。

非目标：完整 APS 排产、设备/物料约束优化、真实招聘自动投递、自动认证、工资核算、生产互联网部署。阶段一结论是约定人力与时间桶模型内的覆盖缺口，不宣称订单必然可交付。

入口：[阶段一 PRD](PHASE-1-PRD.md) · [接口](API-CONTRACTS.md) · [分工](WORKSTREAMS.md)。

## 2026-10-31 修复说明入口

[使用说明](USER-GUIDE.md) · [队友及 Agent 移交](HANDOFF.md) · [本轮验证](VALIDATION.md)。容量以未承诺增量为准，资格覆盖完整需求窗口；部分时段调配无法证明区间时显式阻断。历史发布/阶段记录不是本轮验收。
