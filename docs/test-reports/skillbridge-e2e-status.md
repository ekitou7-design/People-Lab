# SkillBridge E2E 状态（2026-10-31）

结论：SkillBridge 浏览器 E2E 未通过（16 项检查通过，第 17 项失败）。本文不声称其通过。

## 环境
`PLAYWRIGHT_CHANNEL=chrome npm run test:skillbridge:e2e`，使用系统 Chrome，临时数据库，未下载 Chromium。

## 已通过的检查（16）
Order2People 2h 缺口；从生产需求页进入 SkillBridge；列出缺口；发起分析；演示员工标注为虚构；分类为潜在可迁移；展示核验动作；三类路径可见；HR 批准并留痕；跳转培训工作台；跳转招聘工作台；刷新后审核结果保留；上游过期后案例冻结且无审核入口。

## 失败项
- 步骤：390px 移动端布局检查（scripts/skillbridge-e2e.mjs 约第 122 行）
- 错误：`locator.click: Timeout 30000ms exceeded. waiting for getByRole('button', { name: 'SkillBridge', exact: true })`
- 复现：`PLAYWRIGHT_CHANNEL=chrome npm run test:skillbridge:e2e`；脚本在 `setViewportSize(390x844)` 后直接点击侧栏按钮。
- 判断：测试脚本问题，非产品缺陷。移动端侧栏默认折叠（order2people-e2e 也断言此行为），须先点击"打开导航"。该判断来自代码阅读，未再运行验证。
- 阻塞原因：已用完约定的修复次数，按指示停止重试。未验证项：390px 无横向溢出。

## 过程中的发现
- 真实产品缺陷（已修复）：SkillBridge 页面保持挂载，进入时不重新加载上游计算，导致缺口列表为空。已改为每次导航刷新。
- 产品缺口（已补）：上游过期后无入口查看历史案例，已新增"已有分析记录"列表。
- 脚本问题（已修）：演示员工须在计算前载入（新增在职员工按契约使旧结果过期）；路径文案选择器违反 strict mode。
- 未放宽或删除任何业务断言；失败时脚本现在输出截图、页面文本与计算状态到 test-results/skillbridge/（已被 git 忽略）。
