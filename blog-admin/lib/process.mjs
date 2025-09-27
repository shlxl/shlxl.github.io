import { spawn } from 'node:child_process';
import path from 'node:path';
import { PROJECT_ROOT, SCRIPTS_DIR } from '../core/config.mjs';

export function runCmd(cmd, args = [], opts = { cwd: PROJECT_ROOT }) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: opts.cwd, shell: process.platform === 'win32', env: process.env });
    let out = '', err = '';
    p.stdout.on('data', d => out += String(d));
    p.stderr.on('data', d => err += String(d));
    p.on('close', c => c === 0 ? resolve({ out, err }) : reject(Object.assign(new Error('fail'), { out, err, code: c })));
    p.on('error', reject);
  });
}

export const runNodeScript = (rel, args = []) => runCmd(process.execPath, [path.join(SCRIPTS_DIR, rel), ...args]);