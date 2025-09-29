import { spawn } from 'node:child_process';
import path from 'node:path';
import { PROJECT_ROOT, SCRIPTS_DIR } from '../core/config.mjs';

function isCmdLike(bin = '') {
  return /\.(cmd|bat)$/i.test(bin);
}

export function runCmd(cmd, args = [], opts = {}) {
  const cwd = opts?.cwd || PROJECT_ROOT;
  const extraEnv = opts?.env || {};
  const shellOverride = opts?.shell;
  const isWindows = process.platform === 'win32';
  const shouldUseShell = shellOverride ?? (isWindows && isCmdLike(cmd));

  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      shell: shouldUseShell,
      env: { ...process.env, ...extraEnv },
      windowsHide: isWindows
    });
    let out = '';
    let err = '';
    child.stdout.on('data', d => { out += String(d); });
    child.stderr.on('data', d => { err += String(d); });
    child.on('close', code => {
      if (code === 0) resolve({ out, err });
      else reject(Object.assign(new Error('fail'), { out, err, code }));
    });
    child.on('error', reject);
  });
}

export const runNodeScript = (rel, args = []) => runCmd(process.execPath, [path.join(SCRIPTS_DIR, rel), ...args], { shell: false });