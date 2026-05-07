// Tiny wrapper that forwards SIGINT/SIGTERM to `next start` and exits 0
// on a signal-driven shutdown. Without this, pnpm reports ELIFECYCLE on
// every Ctrl-C because `next start` has no signal handling of its own.
import { spawn } from 'node:child_process';

const child = spawn('next', ['start', ...process.argv.slice(2)], { stdio: 'inherit' });

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('exit', (code, signal) => {
  process.exit(signal ? 0 : (code ?? 0));
});
