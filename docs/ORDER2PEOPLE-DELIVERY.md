# Order2People 第一阶段交付记录

状态：实现、本地验收及作者审查完成；远程交付状态以当前 PR 和最终交付消息为准。

## 使用与演示

沿用 README 的 Node >=22.13 安装、启动方式。`npm ci`、`npm run build`、`npm start`，打开本机服务，HR 或主管进入“生产需求”。无模型服务依赖。

1. HR 点击“载入 / 重置演示样例”。创建虚构检验员、100 件订单、单位人工 360 秒标准、有效资格和 8h 日历。明确来源均为 demo。恢复操作只为标记样例创建新版本，保留历史、手工订单和原 HR-V2 记录。
2. 检查每日数量、批次、分析与执行窗口；勾选完整范围确认，点击“确认输入并计算”。预期需求 10h、已分配 8h、缺口 2h，人数为 null。
3. 查看技能要求、人员容量、工时公式、来源、资格排除与竞争需求。HR 确认结果，再导出 SkillBridge JSON。刷新可恢复已保存数据。
4. 重置样例或更新任意相关输入，旧快照标记 stale，不能再次确认或导出。重新计算会创建新快照。保留旧快照用于历史查看。
5. 使用字段表单新建另一笔 20 件、相同工艺/时段的订单，从已保存订单准备每日草稿，确认完整性后联合计算：需求 12h、供给仍为 8h、缺口 4h。

五种字段表单涵盖订单、单工序标准、资格、单班次无休假日历和占用。多工序、休息日、多班次/休假、历史查看及版本更新使用展开的结构化编辑。跨日订单需明确拆分到自然日，不猜测每日数量。单项标准未知时可保存空值，计算阻断。

## 验证证据

实际执行，使用临时数据库，不重置日常数据：

| 检查 | 当前结果 |
| --- | --- |
| npm test | 30 项通过：14 项旧业务、12 项引擎、2 项 API 综合闭环、2 项输入校验 |
| npm run build | 通过（最终代码构建） |
| PLAYWRIGHT_CHANNEL=chrome npm run test:order2people:e2e | 9 项通过，包括人工订单表单与多订单联合容量、下载、刷新、过期、blocked、390px 布局 |
| PLAYWRIGHT_CHANNEL=chrome npm run test:e2e | 原有 52 项浏览器验收通过 |
| npm run test:audit | 原助手 12/12 场景，4/4 边界通过 |
| git diff --check | 通过（最终改动检查） |

浏览器默认使用 Playwright Chromium；本机未安装对应下载版本，实际使用已安装的 Google Chrome。可设置 PLAYWRIGHT_CHANNEL=chrome；原脚本只新增可选浏览器通道，不改变断言。浏览器截图及机器报告运行后位于 test-results/（不提交）。SQLite 重启持久化由 API 测试验证；浏览器刷新另有独立验证。

引擎检查包含黄金数值、缺失标准/日历、资格无效/撤销/过期、多技能共享守恒、非贪心最大流、占用与休假并集、同源订单重算、准备工时、非法每日数据、历史工艺版本、窗口中途失效及不同执行窗口。API 检查包含版本、幂等、确认导出门、过期、员工拒绝、重启、演示恢复保留历史和原业务。

## 模块及接入

- server/order2people-engine.mjs：整数秒、日桶内区间分段、稳定最大流；不预订容量。
- server/order2people-records.mjs、validation.mjs：输入及来源校验。
- server/order2people-api.mjs、demo.mjs：版本、快照、SQLite 聚合、权限、幂等及虚构样例。
- src/v2/Order2People*：录入、每日分解、容量/缺口、依据、确认与导出；原外壳仅增加入口。
- shared/order2people.ts：新增共享类型；原 contracts.ts 不变。
- tests/order2people-*、scripts/order2people-e2e.mjs：业务与浏览器验收。

SkillBridge 使用 `GET /api/v1/order2people/calculations/:id/skillbridge-demands`，仅 HR、confirmed + complete + 非 stale；零缺口 demands=[]。字段包括 schemaVersion、稳定需求 ID、calculationId、inputHash、engineVersion、订单版本、工序/岗位/技能资格、窗口、gapSeconds、来源、假设和确认记录。没有员工姓名或敏感资格证据，不创建培训或招聘任务。完整接口见 API-CONTRACTS.md。

## 限制与待完成门

单场地 demo、Asia/Shanghai、日内可切分人工工作量；不保证工序先后、设备物料、连续作业或完整排产。现有演示身份头不是真实认证。AI 解析属于 P1，未实现；SkillBridge 消费模块未实现，仅提供结构化输出。没有输入单人净容量与可互换组合，因此人力当量/招聘人数不推算。

作者审查及本地验收已完成；团队非作者审核应在 PR 内进行，不自动合并。分支提交和 PR 的实际标识见 GitHub 及最终交付消息。远程 main 已由 GitHub 连接器核实为 2d60c74a1f5775dca75ee46ee89107d39da42f9a，暂无开放 PR；直接 Git 网络不可用，后续使用连接器 Git Data API 保持独立分支交付，需校验远程树与本地一致。

## 作者代码审查记录

检查新增引擎、输入验证、API、共享类型、页面、测试及原业务接线差异。修正工艺历史版本读取、未知/不完整输入、资格中途失效、全班次容量超出分析窗口、日历重复、人工元数据覆盖和前端跨日容量加总。新增对应测试已执行。确认既有 HR-V2 业务仅新增 API mount、导航入口及可选浏览器通道；未改写原招聘、入职、请假、培训实现。团队非作者审核待 PR；未自行合并。
