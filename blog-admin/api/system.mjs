import { runCmd, runNodeScript } from '../lib/process.mjs';
import { send } from '../lib/http-utils.mjs';
import { DIST_DIR, PREVIEW_PORT, PROJECT_ROOT } from '../core/config.mjs';
import fs from 'node:fs';
import { spawn } from 'node:child_process';

async function ensureBuilt() {
  const ok = fs.existsSync(DIST_DIR) && fs.existsSync(path.join(DIST_DIR, 'index.html'));
  if (ok) return 'already';
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const r = await runCmd(npx, ['vitepress', 'build', 'docs']);
  return r.out || 'built';
}

export async function apiBuild(req, res) {
  try {
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const r = await runCmd(npx, ['vitepress', 'build', 'docs']);
    send(res, 200, { ok: true, out: r.out.trim() });
  } catch (e) {
    send(res, 500, { ok: false, error: e.message, out: e.out, err: e.err });
  }
}

export async function apiPreview(req, res) {
  try {
    await ensureBuilt();
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const child = spawn(npx, ['vitepress', 'preview', 'docs', '--host', '--port', String(PREVIEW_PORT)], { cwd: PROJECT_ROOT, shell: process.platform === 'win32', env: process.env, detached: true, stdio: 'ignore', windowsHide: true });
    child.unref();
    send(res, 200, { ok: true, url: `http://127.0.0.1:${PREVIEW_PORT}` });
  } catch (e) {
    send(res, 500, { ok: false, error: e.message, out: e.out, err: e.err });
  }
}

export async function apiDeploy(req, res) {
  try {
    const r = await runNodeScript('deploy-local.mjs', []);
    send(res, 200, { ok: true, out: r.out.trim() });
  } catch (e) {
    send(res, 500, { ok: false, error: e.message, out: e.out, err: e.err });
  }
}

export async function apiAliases(req, res) {
  try {
    const r = await runNodeScript('gen-alias-redirects.mjs', []);
    send(res, 200, { ok: true, out: r.out.trim() });
  } catch (e) {
    send(res, 500, { ok: false, error: e.message, out: e.out, err: e.err });
  }
}
