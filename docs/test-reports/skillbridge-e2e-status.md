# SkillBridge E2E 状态（2026-10-31，更新：移动端导航修复后）

> 历史记录：下文仅对应当时版本与验证，不代表当前交付。最新见[文档导航](../README.md)、[评委上手](../JUDGES-QUICKSTART.md)及[本轮验证](../VALIDATION.md)。


结论：SkillBridge 浏览器 E2E 全部通过（18 项检查全部通过，含 390px 无横向溢出断言）。

## 环境
`PLAYWRIGHT_CHANNEL=chrome npm run test:skillbridge:e2e`，使用系统 Chrome，临时数据库，未下载 Chromium。

## 修复内容
- 文件：`scripts/skillbridge-e2e.mjs`（移动端布局检查段，约第 120-130 行）。
- 根因：导航侧栏在 ≤860px 时通过 CSS（`src/v2/v2.css` 第 24 行 `@media(max-width:860px)`）折叠为 `transform:translateX(-100%); visibility:hidden`，按钮节点仍在 DOM 中但不可见/不可交互。脚本在 `setViewportSize(390x844)` 后直接点击 `SkillBridge` 导航按钮，命中隐藏节点导致超时，而非产品缺陷。
- 修复：在点击 `SkillBridge` 前，用 `page.getByRole('button', { name: '打开导航' }).isVisible()` 判断导航是否已折叠；若折叠，先点击该按钮展开侧栏（对应 `src/v2/WorkspaceShell.tsx` 第 44 行的汉堡菜单按钮，`aria-label` 随展开状态在"打开导航"/"关闭导航"间切换），再点击 `SkillBridge`。未使用固定等待时间或盲目重复点击，仅做一次条件判断+点击。
- 未改动任何业务断言；390px 下 `document.documentElement.scrollWidth <= innerWidth + 1` 的检查原样保留。

## 已通过的检查（18）
Order2People 2h 缺口；从生产需求页进入 SkillBridge；列出缺口；发起分析；演示员工标注为虚构；分类为潜在可迁移；展示核验动作；三类路径可见；HR 批准并留痕；跳转培训工作台；跳转招聘工作台；刷新后审核结果保留；上游过期后案例冻结且无审核入口；**390px SkillBridge 布局无横向溢出（已修复通过）**；无浏览器运行时错误。

## 回归验证
- `PLAYWRIGHT_CHANNEL=chrome npm run test:skillbridge:e2e` → 18/18 通过。
- `npm run build` → 通过（tsc --noEmit + vite build 无错误）。
- `npm test` → 32/32 通过，无回归。

## 过程中的发现
- 真实产品缺陷（已修复）：SkillBridge 页面保持挂载，进入时不重新加载上游计算，导致缺口列表为空。已改为每次导航刷新。
- 产品缺口（已补）：上游过期后无入口查看历史案例，已新增"已有分析记录"列表。
- 脚本问题（已修）：演示员工须在计算前载入（新增在职员工按契约使旧结果过期）；路径文案选择器违反 strict mode。
- 未放宽或删除任何业务断言；失败时脚本现在输出截图、页面文本与计算状态到 test-results/skillbridge/（已被 git 忽略）。
