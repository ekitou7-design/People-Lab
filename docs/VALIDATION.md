# 本轮验证记录（2026-10-31）

基线07d465d，独立fix/talent-execution-ux；远端main=433bc23、PR #4 head=07d465d，使用本机代理核实未漂移。原47项接口测试保留，其中不成立的重复调配成功用例改为严格拒绝/回滚/原数值断言；新增正式供给变化1项、目标/外部占用2项，共50项。

|命令|结果|
|---|---|
|npm run build|通过|
|npm test / npm run test|50/50通过|
|PLAYWRIGHT_CHANNEL=chrome npm run test|通过（同接口套件）|
|PLAYWRIGHT_CHANNEL=chrome npm run test:e2e|通过，脚本日志与test-results产物为准|
|PLAYWRIGHT_CHANNEL=chrome npm run test:order2people|通过；报告检查项 11（具体语义见脚本，不视为接口测试数量）|
|PLAYWRIGHT_CHANNEL=chrome npm run test:skillbridge|通过；报告检查项 20（具体语义见脚本，不视为接口测试数量）|
|PLAYWRIGHT_CHANNEL=chrome npm run test:talent-execution|通过；报告检查项 13（具体语义见脚本，不视为接口测试数量）|
|npm run test:audit|12/12问答、4/4边界通过|

## 实际浏览器路径

使用系统Chrome操作虚构资料、随机端口、临时SQLite。依次载入两个样例，确认范围计算10/8/2，HR确认并分析；批准调配后填写主管和风险说明仍被容量硬校验拒绝，后端无新增占用；批准并生成招聘草稿，关联既有候选人及关闭；批准并执行培养任务，点击后无手动刷新即见真实任务；通过资格维护API正式核验既有转岗员工（不是伪造页面状态，也不是培训自动授予），返回生产立即见stale、导出禁用；重算10/10/0，HR确认，SkillBridge不再显示已关闭缺口；刷新后培训任务仍唯一存在。

资格生效通过真实维护API输入，页面跳转、审核、执行、重算与查看均通过浏览器点击。没有把这一流程描述为全程纯表单录入。接口额外验证历史数值不变、过期执行409回滚、目标/外部订单占用数值、培训完成不授予资格及重复执行幂等。

## 失败记录与修正

原调配脚本要求重复使用已分配8h，是错误业务期待，已替换为更严格的409/零写入/2h仍在断言，同时补充真实供给变化成功路径。扩展浏览器验收第一轮命中隐藏页面同名任务，第二轮最后刷新步骤使用了错误导航名称；修正为可见任务与已有aria-label，保留失败日志。完整验收另发现首页摘要导致旧SkillBridge脚本匹配隐藏“已批准”文本，改为精确可见徽标后通过。未删套件、跳过路径、放宽容量资格权限或添加固定等待。

## 证据与范围

test-results/order2people/desktop.png、tablet.png、mobile.png为1440/1024/390截图，1024有内容视图通过无页级横向溢出断言。test-results/talent-execution/report.json与desktop.png记录本轮闭环。运行产物不提交Git；用户交付目录保留日志和截图副本。

未单独新增服务进程重启、同步失败故障注入、完整长标识/错误/高级折叠矩阵或人工计时演示验收，不能由刷新通过推断这些已验收。部分时段调配目前显式阻断，未声明分钟级调配写入成功。用户应先审核PR依赖与这些边界，再决定合并。
