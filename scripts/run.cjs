const { spawn } = require('node:child_process');
const path = require('node:path');
const net = require('node:net');
const backendOnly = process.argv[2] === 'backend';
const dev = process.argv[2] !== 'start';
const root = path.resolve(__dirname, '..');
const run = args => spawn(process.execPath, args, { cwd: root, stdio: 'inherit', windowsHide: true });
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue;
    if (process.platform === 'win32') {
      spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    } else child.kill();
  }
  process.exitCode = code;
}
function track(child) {
  children.push(child);
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => stop(code ?? 0));
}
function occupied(port) {
  return new Promise(resolve => {
    const socket = net.connect({ port, host: 'localhost' });
    socket.setTimeout(1500);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => { socket.destroy(); resolve(false); });
    socket.once('timeout', () => { socket.destroy(); resolve(true); });
  });
}
async function main() {
  const backendPort = Number(process.env.PORT ?? 3001);
  const ports = backendOnly ? [backendPort] : [3000, backendPort];
  const busy = (await Promise.all(ports.map(async port => await occupied(port) ? port : null))).filter(port => port !== null);
  if (busy.length) {
    console.error(`Port(s) ${busy.join(', ')} are already in use. No new servers were started.`);
    console.error('If this is your running application, open http://localhost:3000/login.');
    console.error('To restart, press Ctrl+C in its original terminal, then run npm run dev once.');
    process.exitCode = 1;
    return;
  }
  if (dev) {
    const build = run([require.resolve('typescript/bin/tsc'), '-p', 'backend/tsconfig.json']);
    children.push(build);
    const code = await new Promise((resolve, reject) => { build.once('exit', resolve); build.once('error', reject); });
    if (stopping || code !== 0) { stop(code ?? 1); return; }
  }
  if (!backendOnly) track(run([require.resolve('next/dist/bin/next'), dev ? 'dev' : 'start', 'frontend']));
  if (dev) track(run([require.resolve('typescript/bin/tsc'), '-p', 'backend/tsconfig.json', '--watch', '--preserveWatchOutput']));
  track(run([...(dev ? ['--watch'] : []), path.join(root, 'backend/dist/backend/src/main.js')]));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
main().catch(error => { console.error(error.message); stop(1); });
