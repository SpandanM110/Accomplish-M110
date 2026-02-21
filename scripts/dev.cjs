const { spawn, execSync } = require('child_process');
const path = require('path');

function killPort(port) {
  try {
    if (process.platform === 'win32') {
      const result = execSync(`netstat -ano | findstr :${port}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const lines = result.trim().split(/\r?\n/).filter(Boolean);
      const pids = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid)) {
          pids.add(pid);
        }
      }
      for (const pid of pids) {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
      }
      if (pids.size > 0) {
        console.log(`Killed existing process(es) on port ${port}`);
      }
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
      console.log(`Killed existing process on port ${port}`);
    }
  } catch {
    // No process on port
  }
}

killPort(5173);

const env = { ...process.env };
const isClean = process.env.CLEAN_START === '1';

const spawnOpts = {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
};
// Don't use detached on Windows - keeps processes attached so we see output and they stay alive
const detached = process.platform !== 'win32';
const web = spawn('pnpm', ['-F', '@accomplish/web', 'dev'], { ...spawnOpts, detached });

web.on('error', (err) => {
  console.error('[dev] Web server failed to start:', err.message);
  process.exit(1);
});

web.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error('[dev] Web server exited with code:', code);
  }
});

const waitOn = require(path.join(__dirname, '..', 'node_modules', 'wait-on'));
let electron;

waitOn({ resources: ['http://localhost:5173'], timeout: 60000 })
  .then(() => {
    console.log('[dev] Web server ready, starting Electron...');
    const electronCmd = isClean ? 'dev:clean' : process.platform === 'win32' ? 'dev:fast' : 'dev';
    electron = spawn('pnpm', ['-F', '@accomplish/desktop', electronCmd], { ...spawnOpts, detached });
    electron.on('exit', (code) => {
      console.log('[dev] Electron exited with code:', code);
      cleanup();
    });
    electron.on('error', (err) => {
      console.error('[dev] Electron failed to start:', err.message);
      cleanup(err);
    });
  })
  .catch((err) => {
    console.error('[dev] Failed waiting for web dev server:', err.message);
    cleanup(err);
  });

function cleanup(codeOrError) {
  for (const child of [web, electron]) {
    if (!child || child.killed) continue;
    try {
      if (process.platform === 'win32') {
        try {
          process.kill(child.pid, 'SIGTERM');
        } catch {
          process.kill(child.pid, 'SIGKILL');
        }
      } else {
        process.kill(-child.pid, 'SIGTERM');
      }
    } catch {}
  }
  killPort(5173);
  const isError = codeOrError instanceof Error || (codeOrError && typeof codeOrError === 'object');
  process.exit(isError ? 1 : 0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('uncaughtException', (err) => {
  console.error(err);
  cleanup(err);
});
process.on('unhandledRejection', (err) => {
  console.error(err);
  cleanup(err);
});
