# People-Lab 协作入口

People-Lab：阶段一 Order2People、阶段二 SkillBridge、阶段三人才执行闭环（SkillBridge 方案执行为招聘需求草稿/培训任务/内部调配占用）已有实现，HR-V2 保留；部分时段调配仍受显式阻断限制，不能称全部执行路径已验收。验收证据与演示见 docs/ORDER2PEOPLE-DELIVERY.md 及各阶段 PR 描述。

## 开始前
- 阅读 [产品定位](docs/PRODUCT.md) → [阶段一 PRD](docs/PHASE-1-PRD.md) → [数据与接口](docs/API-CONTRACTS.md) → [分工](docs/WORKSTREAMS.md)。现有运行说明见 README.md，现有 API 以 shared/API.md、shared/contracts.ts 和服务端实现为准。
- 检查当前目录、Git 状态、远程 main、开放 PR 和文件认领。记录本轮允许修改的文件；发现队友修改或归属冲突，先报告并协调。
- 用户 Goal 已逐阶段授权开发、测试与 PR；当前认领见 WORKSTREAMS。后续模块（Capability Graph、Talent Simulator、Talent Agent 自动执行）仍须另行授权。

## Git 与范围
- 每位开发者使用独立分支，通过 PR 合并；禁止直接修改或推送 main、强推共享分支、覆盖他人修改。
- 不自动 stash、reset、删除或提交他人文件；脏工作区先识别归属，必要时使用独立 worktree。
- 未经确认不删除现有功能、不重构无关模块、不修改队友负责的文件；不重置数据库，不提交运行数据、凭据或真实员工资料。
- 保持 React/TypeScript/Vite、Express、Node 内置 SQLite 兼容，不因规划引入框架或依赖。
- 接口先协商后实现：在 API-CONTRACTS 与 WORKSTREAMS 记录变更、影响方及确认状态，由负责人明确通知受影响开发者。Agent 不得自行对外发送消息，除非获得授权。

## 业务与验证
- AI 只做理解、提取、提示；人数和缺口必须由版本化确定性计算产生。缺失数据不填零，培训通过不等于岗位资质。
- 代码 PR 按影响执行 npm test、npm run build；页面或闭环变更补 npm run test:e2e，助手边界变化补 npm run test:audit。使用临时数据库，禁止借测试重置日常数据。
- 计算新增测试须覆盖工时守恒、多技能不重复计时、资格有效期、占用重叠、版本变化和阻断条件。
- 纯文档检查链接、术语、契约与验收一致性，无需安装依赖或运行应用；历史验收不得当作本轮测试结果。
- PR 写清范围、文件、验证证据、兼容影响、未决事项；规划必须标注未实现。完成后展示差异，等待审核，不自行进入下一阶段。

## 修复分支接手必读
- 接手 fix/talent-execution-ux 时先读 docs/HANDOFF.md、docs/USER-GUIDE.md、docs/VALIDATION.md，再定位对应测试；不要重新全项目审阅或重复实施三个既有修复提交。
- 使用 git status、branch --show-current、log 核对分支与未提交修改。node_modules 可能是本地复用依赖的软链接，绝不提交。禁止reset/clean/stash覆盖队友工作。
- 2026-10-31最新用户已明确授权本任务相关分支合并上传；统一通过PR #5合入main，包含PR #4依赖提交，保留提交历史，不重复应用依赖。不把本次授权延伸到未来PR或无关队友分支。合并前核对远程HEAD、检查结果与完整差异，失败或冲突不得强推。
- 标准案例10/8/2不允许同一8h再次补缺口；原错误成功断言应以业务正确性重建，并保留主管确认、容量拒绝、零写入和重算数值等严格校验。
- 真正供给变化须经正式资格/班次等业务维护，旧结果stale、新计算、新HR确认；培训完成不创建或升级资格。历史case与历史计算数值不变。
- 失败409事务回滚，不会保存blocked_stale；引用此状态前检查契约和实际存储。输入版本、角色、资格和容量均由服务端检查，主管风险确认不能代替硬约束。
- 浏览器选择PLAYWRIGHT_CHANNEL=chrome；npm test是接口测试，:e2e命令才是浏览器测试。每个场景独立数据目录和端口，绝不测试日常库。连续两轮同类修复失败应报告新证据，不盲目重试。
- 交付须更新当前使用说明、移交、契约和验证记录；历史release/design报告保留原时间与事实，不把历史通过数覆盖成本轮结果。不将本机绝对路径写入通用说明。

## 面向队友与评委的文档维护
- 当前文档入口为docs/README.md。评委先读docs/JUDGES-QUICKSTART.md，操作者读USER-GUIDE.md，维护者读HANDOFF.md和API-CONTRACTS.md。
- 更改按钮/导航/角色/初始化顺序时同步改评委指南和演示脚本，按实际aria-label与可见文案描述；不要让评委自行猜编号或数据库目录。
- 样例先内部人才、后生产输入、最后计算确认。禁止在确认结果后悄悄加入员工；载入样例会写入虚构数据与版本，可能使旧结果stale。
- USER-GUIDE保留故障恢复、版本更新与数据目录说明；HANDOFF保留文件职责、幂等、历史与容量边界；VALIDATION记录每次真实运行，不把仅文档修改写成重新验收。
- 历史release、设计和测试文档保留原结果与日期，添加当前文档导航，不改写为本轮证据。PR合并状态以GitHub实时状态为准。
- 不替评委假造操作耗时、点击次数、AI指标或“自动取得岗位资格”。不支持的部分区间调配明确说明阻断原因。
