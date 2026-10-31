# 使用说明：订单到人才执行反馈

## 安装与运行

使用 Node.js 22.13 或以上版本。首次安装才执行 npm ci；已有依赖无需重复安装。

```sh
npm run build
HRFLOW_PORT=3225 HRFLOW_DATA_DIR=/absolute/path/to/your-demo-data npm start
```

打开 http://127.0.0.1:3225。停止服务后数据仍保留；HRFLOW_DATA_DIR 是你的业务数据库目录，请不要指向其他队友的日常目录。演示仅用虚构资料，身份切换不是真实登录。Windows启动方法沿用README。

## 第一次演示

1. 从首页“从订单识别能力缺口”进入生产主线；原招聘、入职、年假与培训入口保留。
2. 如需演示培养路径，先到SkillBridge载入内部人才样例，再到生产需求载入标准样例。两个动作会写入虚构人员、资格、日历及版本，可能使已有计算过期，须在最终计算前完成；不会全局清除其他业务记录。
3. 核对订单、工艺、每日数量、执行窗口、资格、日历与占用完整性，再勾选完整范围并计算。标准案例为10h需求、8h分配、2h缺口。
4. HR确认结果后前往SkillBridge，发起分析。建议来自规则与当前业务证据，审批不等于执行。
5. 原检验员已分配8h，没有可重复用于补缺口的增量。即使主管签字，执行端仍拒绝容量不足的调配。
6. 培养：填写审核说明并由HR批准，再执行创建任务；点击“查看已创建的培训任务”应立即显示员工、任务、来源与回链。任务完成不能变成正式岗位资格。
7. 招聘：HR批准后执行生成需求草稿；可关联已有候选人或关闭需求，不会自动生成人选或录用。
8. 同步失败若提示“已创建，暂未同步”，点重试同步，不要重新办理。历史执行关联记录和重复执行保护仍保留。

## 真正关闭能力缺口

需要有真实供给变化，例如资格负责人正式核验并在生产输入维护中把转岗员工资格保存为新版本（verified，等级、资格类型、来源与有效窗口均满足要求）。只完成培训不能做此更改的证据。

输入变化后，返回生产需求看到stale。使用保留的范围与每日数量核对草稿，重新确认完整性并计算、HR确认。示例转岗员正式资格生效且原班次完整有效时，可得到10/10/0；旧10/8/2快照保留。SkillBridge读取新确认结果，不再提供已关闭的缺口。

blocked表示资料缺失，查看具体原因并补录；stale表示输入变化，需要重新计算。不要清库、重置日常数据或直接修改历史JSON来解决。部分区间调配若无法证明实际区间，服务端会明确拒绝；当前版本没有分钟级排程能力。

## 测试与排错

```sh
npm run build
npm test
PLAYWRIGHT_CHANNEL=chrome npm run test
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e
PLAYWRIGHT_CHANNEL=chrome npm run test:order2people
PLAYWRIGHT_CHANNEL=chrome npm run test:skillbridge
PLAYWRIGHT_CHANNEL=chrome npm run test:talent-execution
npm run test:audit
npm run test
```

浏览器测试使用系统Chrome，测试自动创建临时SQLite和端口。不要运行 playwright install chromium。报告与截图位于 test-results/。接口409表示当前操作不成立：核对错误码、输入版本和完整性；不要绕过服务端校验。准确本轮结果见 VALIDATION.md。
