import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const children = [];
let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  for (const child of children) {
    if (child.exitCode === null) child.kill('SIGTERM');
  }
  const timeout = setTimeout(() => {
    for (const child of children) {
      if (child.exitCode === null) child.kill('SIGKILL');
    }
    process.exit(exitCode);
  }, 2_000);
  timeout.unref();
  Promise.all(children.map(child => child.exitCode !== null
    ? Promise.resolve()
    : new Promise(resolve => child.once('exit', resolve))))
    .then(() => process.exit(exitCode));
}

function launch(name, script, args, env = {}) {
  const child = spawn(process.execPath, [script, ...args], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    windowsHide: true,
  });
  children.push(child);
  child.once('error', error => {
    console.error(`[${name}] ${error.message}`);
    stop(1);
  });
  child.once('exit', (code, signal) => {
    if (!stopping) {
      console.error(`[${name}] exited (${signal ?? code ?? 'unknown'}); stopping development services.`);
      stop(code || 1);
    }
  });
}

process.once('SIGINT', () => stop());
process.once('SIGTERM', () => stop());
process.once('SIGHUP', () => stop());

console.log('HRFlow API: http://127.0.0.1:3220');
console.log('HRFlow development UI: http://127.0.0.1:3221');
console.log('Press Ctrl+C to stop both services.');
launch('api', path.join(root, 'server', 'index.mjs'), [], { PORT: '3220' });
launch('vite', path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), [
  '--host', '127.0.0.1', '--port', '3221', '--strictPort',
]);
