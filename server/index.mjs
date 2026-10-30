import { createApp } from './app.mjs';

const port = Number(process.env.HRFLOW_PORT || process.env.PORT || 3220);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('HRFLOW_PORT / PORT 必须是有效端口。');
const { app, close } = createApp({ ...(process.env.HRFLOW_DATA_DIR ? { dataDir: process.env.HRFLOW_DATA_DIR } : {}) });
const server = app.listen(port, '127.0.0.1', () => {
  console.log(`HRFlow Demo listening on http://127.0.0.1:${port} (local demo, no real authentication or external AI)`);
});
server.on('error', (error) => { console.error(`HRFlow 启动失败：${error.message}`); close(); process.exitCode = 1; });
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  server.close(() => { close(); process.exitCode = 0; });
  server.closeIdleConnections();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
