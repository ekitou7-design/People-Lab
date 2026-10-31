# People-Lab 协作入口

TalentFoundry 规划阶段。当前实现仍为 HR-V2；Order2People 尚未实现。

## 开始前
- 阅读 [产品定位](docs/PRODUCT.md) → [阶段一 PRD](docs/PHASE-1-PRD.md) → [数据与接口](docs/API-CONTRACTS.md) → [分工](docs/WORKSTREAMS.md)。现有运行说明见 README.md，现有 API 以 shared/API.md、shared/contracts.ts 和服务端实现为准。
- 检查当前目录、Git 状态、远程 main、开放 PR 和文件认领。记录本轮允许修改的文件；发现队友修改或归属冲突，先报告并协调。
- 当前批准范围只有上述规划文档及本文件；业务开发须等待用户审核。

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
