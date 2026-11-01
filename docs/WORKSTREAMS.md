# 多人协作与集成规则

> 当前交付导航（2026-10-31）：[评委上手](JUDGES-QUICKSTART.md) · [使用说明](USER-GUIDE.md) · [队友移交](HANDOFF.md) · [文档索引](README.md)。本任务集成入口为PR #5，含PR #4依赖；以GitHub确认合并状态。下文原阶段/验证记录保留对应时间语境。


状态：历史规划与本次实施记录。用户 Goal 已授权 W1–W5，由当前 Agent 串行实施；不表示队友已接受建议分工。

## 基线与已知风险

2026-10-31 独立克隆，main/origin/main 为 `2d60c74a1f5775dca75ee46ee89107d39da42f9a`；初始无修改，未见 AGENTS.md。远程只看到 main，GitHub 开放 PR 查询为空。原聊天目录不是仓库，不能检查其他人的电脑或未推送修改。本轮分支 `docs/talentfoundry-phase1-planning`，不提交、不推送、不创建 PR，先交用户审核。

| 潜在冲突 | 解决方式 |
| --- | --- |
| 队友正在撰写同名规划文档或已有私有分支 | 开工前登记认领，发现重叠先报告；合并内容须双方确认，不整文件覆盖 |
| shared/contracts.ts、shared/API.md 的公共类型 | 单一契约负责人整合；契约变更先记录和明确通知消费者 |
| server/app.mjs 路由/权限与 server/store.mjs 聚合存储 | 集成负责人串行处理入口和持久化接线；其他分支不顺手改动 |
| WorkbenchApp、WorkspaceShell、types、公共样式 | 由前端集成负责人统一接导航/角色入口；页面任务避免并发改共享文件 |
| 同一人在多订单/技能中重复计时 | 引擎统一分配完整 scope，不能各开发者各算一份容量再相加 |
| 新模型被误映射为已有 Ability、培训成绩 | 使用明确映射并人工验证资格；旧类型语义保持 |
| 数据迁移与日常演示数据 | 先备份、设计前向迁移/恢复并单独审核；禁止 reset 替代迁移 |

## 建议工作流与文件归属

所有实际负责人、分支、路径均待 M0 指定。新模块路径在契约冻结后确定，避免为规划先建空业务目录。

| 工作流 | 责任 | 认领范围建议 | 依赖与验收 |
| --- | --- | --- | --- |
| W0 产品/契约 | 范围、黄金案例、语义与版本 | 本轮五份文档；未来共享契约由指定一人维护 | 用户审核；其他流据此开发 |
| W1 基础数据 | 工艺标准、资格、日历、已有占用与来源 | 后续独立数据模块与测试；存储入口由 W3 接线 | W0；完整/缺失/撤销/有效期案例 |
| W2 计算引擎 | 输入验证、工时守恒、最大流、可重放解释 | 后续纯计算模块和专属测试，不触及 UI 或 HR 流程 | W0；可用固定快照先行，后接 W1 |
| W3 API/持久化 | 路由、权限、幂等、版本并发和快照 | 未来新增 API 模块；独占 server/app.mjs、store.mjs 接线 | W1/W2；契约测试、旧 API 回归 |
| W4 页面/提取 | 订单、补录、结果依据、确认、导出 | 独立页面；共享外壳由一位负责人接线 | W0 可用标记为测试夹具的数据并行；联调依赖 W3 |
| W5 集成/验收 | 兼容回归、导出消费者校验和发布说明 | 新验收脚本；修改现有测试须认领 | 各流完成后闭环；所有 P0 用例通过 |

W4 的 AI 提取是 P1，可独立延后；没有模型服务时保留人工录入。W2 不调用大模型，不依赖真实员工数据。SkillBridge 只校验需求输出结构，不实施迁移推荐。

## 认领登记（开发前必填）

| 任务 | 开发者 | 分支 | 文件允许范围 | 状态 | 依赖/交接 PR |
| --- | --- | --- | --- | --- | --- |
| 本轮规划 | 当前 Agent，待用户审核 | docs/talentfoundry-phase1-planning | AGENTS.md、docs/PRODUCT.md、docs/PHASE-1-PRD.md、docs/API-CONTRACTS.md、docs/WORKSTREAMS.md | 文档草案 | 尚无 PR |
| W1–W5 | 待指定 | 待建立 | 待确认 | 未开始 | W0 审核 |

任务交接必须记录：输入/输出、文件归属、依赖版本、完成证据、未决项和释放认领时间。Agent 不得把未回复视为同意；发现冲突时可继续不重叠的工作，但不能修改争议文件。此规范允许多人分工，不代表当前自动启动其他 Agent 或给队友发送消息的授权。

## 分支、接口与合并

1. 开始时获取远程信息，检查 status、差异、分支及 PR；创建独立短期分支。不得直接在 main 开发。脏文件先确认归属，不覆盖、不自动 stash/reset。
2. PR 控制单一目标，列出允许文件和依赖。共享文件由认领负责人整合；不同分支用契约/测试夹具衔接，不能依赖彼此未提交文件。
3. 接口变化先在 API-CONTRACTS 记录提案、影响方和确认状态，由负责人通知相关开发者并记录确认；未经确认不能落地破坏性变更。用户未授权 Agent 发消息时，由人类完成通知或另行授权。
4. 建议合并顺序：规划与契约 → 基础数据/纯引擎 → API/持久化 → UI → 集成验收。可先并行开发，依赖未合并时标记阻塞，不把测试替身当集成通过。
5. 合并前对齐最新 main，在自己的分支解决冲突；涉及他人语义请原负责人复核。由至少一位非作者审阅；契约负责人复核共享接口，用户确认范围变更后才扩大任务。
6. PR 验证按 AGENTS.md 执行；报告区分本轮执行/历史/未执行。业务数据使用临时目录和端口，保留 HR-V2 原测试与功能。
7. 用户 Goal 已授权第一阶段业务实现、提交和 PR；不自动合并或进入下一阶段。

## 集成完成条件

所有 P0 验收通过，原招聘/入职/年假/培训闭环未退化；缺失/过期结果不能输出执行需求；相同输入/引擎版本可重放；逐人总分配守恒；权限、并发与幂等有证据；SkillBridge 输出字段通过契约检查。仍未实现的模块保持规划标识。

审核待确认：具体负责人和场地权限；按日可切分假设是否适用；工艺/资格数据责任人；正式模型是否纳入 P1；实际基础数据来源与更新频率。上述事项不妨碍本轮文档交付，但应在相关开发开始前确认。

## 本次实施认领（2026-10-31）
用户在 Goal 中明确授权完成 W1–W5、提交和 PR；原规划等待授权条件解除。当前 Agent 串行负责 `feat/order2people-phase1`，允许范围：新增 `server/order2people-*`、`tests/order2people-*`、`src/v2/Order2People*`、业务契约与交付文档；集成接线限 `server/app.mjs`、`src/v2/{WorkbenchApp,WorkspaceShell,types}`、必要测试脚本/package scripts。保留 HR-V2 原业务含义和数据。

决策：PRD 与契约优先；P1 AI 不实现。演示 scope 固定为 demo，由服务端授予 actor-manager/actor-hr，员工无权限。仅向后兼容新增端点，不需要改变旧消费者；未向外部队友发消息。非作者团队审核在 PR 后由团队完成。

实施验证：引擎、API、前端、演示和自动化检查已实现；实际验收见 ORDER2PEOPLE-DELIVERY.md。团队非作者审核安排在 PR 中，合并门仍保留。

## SkillBridge 第二阶段授权记录（2026-10-31）

用户 Goal 在本轮会话中明确授权解除 AGENTS.md 第8行"进入 SkillBridge 实现仍须另行授权"的阻断，批准按本次任务说明开始 SkillBridge 第一版实现。授权范围：内部人才发现、技能差距分析、调配/培养/外部招聘三类供给路径建议、与招聘/培训模块的真实数据连接、HR 审核留痕。

本授权修订第32行"SkillBridge 只校验需求输出结构，不实施迁移推荐"的历史规划：该限制适用于第一阶段 Order2People 交付窗口（M1–M4，未涉及 SkillBridge 实现）；第二阶段起，SkillBridge 在只读消费已确认 Order2People 快照的前提下，新增确定性技能规则分析与人工审核留痕，不修改、不重算上游快照，不自动把培训完成或简历关键词转为正式资格。

分支：`feat/skillbridge-phase2`，基于最新 `origin/main`（`c6c165a`）。允许范围：新增 `server/skillbridge-*.mjs`、`shared/skillbridge.ts`、`tests/skillbridge-*.test.mjs`、`scripts/skillbridge-e2e.mjs`、`src/v2/SkillBridge*.tsx`、`src/v2/SkillBridge.css`；集成接线限 `server/app.mjs`（挂载新路由）、`src/v2/{WorkbenchApp,WorkspaceShell,types}.tsx/ts`（新增导航项与跳转目标）、`src/v2/Order2PeoplePage.tsx`（新增"发起 SkillBridge 分析"入口按钮）、`package.json`（新增 test 脚本）。不改动 Order2People 计算引擎（`order2people-engine.mjs`）、不改既有 HR-V2 业务语义、不删除队友未提交代码。

品牌统一 PR #2（`chore/brand-people-lab`）在远程未合并；本轮不等待其合并，也不修改该分支涉及的文件；如与其产生视觉冲突，交由该 PR 负责人后续统一调整。

## SkillBridge 共享接口提案（2026-10-31，待实现后随 PR 通知）

按 API-CONTRACTS.md 第97行标注的未来消费接口方向，新增：

| 提案 | 说明 | 影响方 | 确认状态 |
| --- | --- | --- | --- |
| `GET/POST /api/v1/skillbridge/cases` | 围绕一个 Order2People `demandId` 发起/查看分析会话；只读消费 `skillbridge-demands` 导出，拒绝 stale/未确认/不完整的上游需求 | Order2People（只读消费者，不改其数据）、未来 Capability Graph/Simulator | 本轮实现，PR 中请求团队确认 |
| `GET /api/v1/skillbridge/cases/:id/candidates` | 内部人才发现结果：已验证/潜在可迁移/证据不足三分类 + 当前可用容量 | 员工资格与日历数据（只读） | 同上 |
| `POST /api/v1/skillbridge/cases/:id/proposals` | HR 创建调配/培养/外部招聘路径草稿 | 招聘模块（候选人/stage）、培训模块（TrainingTask） | 同上 |
| `PATCH /api/v1/skillbridge/proposals/:id/review` | HR 审核状态与留痕 | 同上 | 同上 |

兼容性：新增 `/api/v1/skillbridge` 前缀，不改动既有 `/api/v1/order2people/*`、`/api/bootstrap` 或 HR-V2 端点语义；错误形状沿用 `{error:{code,message,details}}`。

## 第三阶段 人才执行闭环授权记录（2026-10-31）

用户 Goal 明确授权本轮会话合并 PR #2、PR #3 后，继续开发第三阶段：把 Order2People 能力缺口、SkillBridge 方案与招聘、培训模块的真实数据与状态连接起来，形成可操作闭环。本授权落地第76-85行"SkillBridge 共享接口提案"中标注的 `POST .../proposals/:id/execute` 写入方向（原提案路径名为 `cases/:id/proposals`，实现时改为对既有 `proposals/:id` 追加 `/execute` 子资源，语义一致：仍是"HR 对某一方案采取的、会写入招聘/培训模块的动作"，仅路径形式调整，已在 API-CONTRACTS.md 记录变更）。

分支：`feat/talent-execution`，基于已合并 PR #2、PR #3 后的最新 `main`。允许范围：
- 新增 `server/skillbridge-api.mjs` 的 `execute`/`requisitions` 端点（同文件内新增，未新建文件）、`tests/talent-execution.test.mjs`、`scripts/talent-execution-e2e.mjs`。
- `shared/skillbridge.ts` 新增 `ProposalExecution`/`RecruitmentRequisition` 类型；`shared/contracts.ts` 的 `TrainingTask` 新增可选 `skillBridgeCaseId`/`skillBridgeProposalId` 字段（向后兼容，不改变现有字段）。
- 集成接线限 `src/v2/SkillBridgePage.tsx`（执行表单与落地状态展示）、`src/v2/RecruitmentPage.tsx`（新增招聘需求草稿区块）、`src/v2/TrainingPage.tsx`（新增 SkillBridge 来源回链提示）、对应 CSS、`package.json`（新增 `test:talent-execution:e2e` 脚本）。
- 不改动 `order2people-engine.mjs` 的计算语义；内部调配复用 Order2People 既有 `POST /reservations` 校验逻辑（`validateRecord('reservations', ...)`）与既有 `invalidate()` 过期机制写入同一 `state.order2people.reservations` 集合，未新增平行的容量模型。
- 不自动批准任何方案：执行端点只接受 `status=hr_approved` 的方案；内部调配额外要求请求体显式提供主管确认人与风险说明，不满足则 400，不写入任何记录。
- 不把培训完成等同于资格：`development_plan` 执行创建的 `TrainingTask` 完成后不触碰 `state.order2people.qualifications`，正式资格仍须经 Order2People 既有资格维护流程人工录入。
- `external_requisition` 执行只创建招聘需求草稿，不创建或虚构 `Candidate`；HR 须在招聘工作台手工关联已存在的候选人。
- 同时修复 `PATCH /proposals/:id/review` 此前只有前端隐藏表单、服务端未重新校验 stale 的缺口（见 API-CONTRACTS.md 执行规则小节），审核与执行均在服务端重新判定 `demand_stale`。

验证：`npm run build`、`npm test`（36/36）、`npm run test:order2people:e2e`、`npm run test:skillbridge:e2e`（含新增的审批→执行两步校验）、`npm run test:talent-execution:e2e`（新增，内部调配表单约束 + 容量占用 + 需求草稿关联全流程）、`npm run test:audit` 均已本轮执行且通过，详见 PR 描述。未破坏历史 Order2People/SkillBridge 计算快照格式；未清除演示数据，仅通过临时数据库测试。

### 2026-10-31 局部修复认领
独立工作副本，分支 fix/talent-execution-ux，基于 07d465d。认领 SkillBridge 引擎/API/契约及回归、Workbench 同步、生产表单局部样式与首页入口。保留全部日常数据库和历史快照，不修改共享分支，不自动合并。尚未完成全部验收前不能视为可合并。

## 2026-10-31 修复说明入口

[使用说明](USER-GUIDE.md) · [队友及 Agent 移交](HANDOFF.md) · [本轮验证](VALIDATION.md)。容量以未承诺增量为准，资格覆盖完整需求窗口；部分时段调配无法证明区间时显式阻断。历史发布/阶段记录不是本轮验收。

## 2026-10-31 独立最终产品验收认领

用户另行授权环境搭建、完整功能与浏览器验收，以及有证据的 P0/P1 修复。基线为已核实远程 main `55d03a56140a9518a24d53435c05f001f07a7d64`，使用独立工作树与分支 `fix/final-product-audit`，所有操作资料均为隔离库中的虚构演示数据。

首项认领：`tests/skillbridge-api.test.mjs` 的服务重启资源清理。Windows 实测在第三实例仍持有 SQLite 时先删除临时目录，出现 EPERM 并留下 HTTP 句柄；修复只调整测试资源生命周期，不改变业务规则或断言。交付文档允许追加本轮验证、移交和最终验收报告；后续发现需要改动其他业务文件时，先在此增量记录范围和证据。

并行分工：另一 Codex 负责成熟 HR 产品用语调研、全站文案规范化及语言风格统一。本分支不做全站文案重写或导航批量改名，不修改或新建 `docs/UX-WRITING.md`；P0/P1 必需的局部提示变更须在 PR 列明页面和具体文字。通过独立 PR 交付，不自动合并。

## 2026-10-31 首页生产入口视觉修整

用户以首页截图明确授权美化“从订单识别能力缺口”卡片。基于已合并PR #6后的main `5431c3b`，独立分支 `codex/dashboard-production-card`；认领 `src/v2/DashboardPage.tsx` 该卡片标记、新增局部样式 `src/v2/DashboardProduction.css`，以及本轮验证/移交追加。保留现有数据读取、权限、按钮文案和跳转，不重写全站文案，不修改 `docs/UX-WRITING.md` 或文案研究分支的其他文件。只修卡片间距、信息层次、布局及响应式，通过独立PR交付，不自动合并。

## 2026-10-31 蓝白浅色工作台视觉优化

用户以四张产品设计参考图明确授权全站 UI 美化，并要求模块一 AI 招聘 Agent 改为浅色。基于已合并 PR #7 的最新 main `e98a501`，独立分支 `ui/light-workspace-polish`；认领 `src/main.tsx` 样式入口、`src/v2/v2.css` 设计变量、新增 `WorkspaceTheme.css` 共享浅色主题、`RecruitmentPage.tsx` 样式入口与新增 `Recruitment.css` 招聘页局部样式，以及本轮分工、移交和验证记录。

保留现有页面结构、文案、角色权限、数据读取、状态变更与全部业务规则，不增加依赖、虚构指标或 AI 评分。全站采用浅色导航、白色卡片和蓝色交互反馈，招聘页保持候选人队列/能力证据/简历原文三栏及移动端切换。只优化样式与响应式，不批量改写文案，不修改 API 或测试断言；用户已明确授权本轮提交 PR 并合并。提交前已整合 PR #8 文案更新，保留其实际页面名称与验证选择器。

## 2026-10-31 阶段 B 文案认领

PR #6、#7 已合并，基线 main `e98a501`，独立分支 `refactor/product-copy`。范围：src/v2 页面文字及展示标签、必要的前端文案映射；server/app.mjs 仅可见提示；四项浏览器脚本的可见名称选择器、相关文案断言；UX-WRITING 正式规范、阶段 A 研究档案、使用/演示/验证文档。计算引擎、API 字段、真实枚举、资格/权限/工时规则及数据库均不修改。复用阶段 A 的23项来源，按现状逐条复核，不将125项建议视为强制替换。不覆盖其他工作区。测试仅使用临时库；不自动合并。

## 2026-11-01 README 当前界面截图更新

用户授权更新 GitHub README 及过期配图。基线为已同步的 main `4533b95`，当前无开放 PR；独立分支 `docs/refresh-readme-screenshots`。认领范围：`README.md`、`docs/images/current/` 新截图、本条认领记录。使用现有浏览器脚本、临时数据库与虚构样例采集当前界面；保留历史截图、业务源码和日常数据。通过 PR 交付，等待审核。

本轮验证：`npm run build` 通过；`PLAYWRIGHT_CHANNEL=chrome npm run test:e2e` 通过52项检查；独立样例完成10/8/2计算、HR确认及人才方案分析并采集5张当前截图。未重跑接口测试与问答审计；历史图及报告保留原样。

用户补充 README 内容清单：本轮同步完善项目简介、背景、核心功能、产品亮点、截图、技术架构、快速开始、使用流程、进度及团队致谢。以现有产品/使用文档与源码为依据，规划单独标注，未虚构成员职责、模型接入或许可。
