#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const DIST_DIR = process.env.DIST_DIR || 'docs/.vitepress/dist';
const OUT_DIR = process.env.PAGES_DIR || '.gh-pages';
const BRANCH = process.env.PAGES_BRANCH || 'gh-pages';

main().catch(e=>{ console.error('\n[deploy] ERROR:', e.message); process.exit(1); });

async function main(){
  assertGit();
  const { owner, repo } = parseOrigin();
  const base = process.env.DEPLOY_BASE || (repo.toLowerCase() === `${owner}.github.io`.toLowerCase() ? '/' : `/${repo}/`);
  log(`[env] repo=${owner}/${repo}  base=${base}  branch=${BRANCH}`);

  // 1) Build site with proper base
  if (!fs.existsSync(DIST_DIR) || isEmptyDir(DIST_DIR)) {
    log(`[build] dist 不存在或为空，开始构建…`);
    run(`DEPLOY_BASE="${base}" npx vitepress build docs`);
  } else {
    log(`[build] 发现已有 dist，如需重建请先清空或删除。`);
  }
  if (!fs.existsSync(DIST_DIR)) throw new Error(`未找到构建产物：${DIST_DIR}`);

  // 2) Prepare worktree
  safeRun(`git worktree remove ${OUT_DIR} --force`, true);
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  run(`git fetch origin --prune`);
  const exists = branchExistsRemote(BRANCH);
  if (exists) {
    run(`git worktree add -B ${BRANCH} ${OUT_DIR} origin/${BRANCH}`);
  } else {
    // 新建孤儿分支
    run(`git worktree add --detach ${OUT_DIR}`);
    run(`git -C ${OUT_DIR} checkout --orphan ${BRANCH}`);
  }

  // 3) Clear OUT_DIR except .git, then copy dist
  clearDirExceptGit(OUT_DIR);
  touch(path.join(OUT_DIR, '.nojekyll'));
  const cname = process.env.CNAME || '';
  if (cname) fs.writeFileSync(path.join(OUT_DIR, 'CNAME'), `${cname}\n`, 'utf8');
  copyDir(DIST_DIR, OUT_DIR);

  // 4) Commit & push
  run(`git -C ${OUT_DIR} config user.name "${process.env.GIT_USER || 'local-deployer'}"`);
  run(`git -C ${OUT_DIR} config user.email "${process.env.GIT_EMAIL || 'local@localhost'}"`);
  run(`git -C ${OUT_DIR} add -A`);
  run(`git -C ${OUT_DIR} commit -m "deploy: ${new Date().toISOString()}" --allow-empty`);
  run(`git -C ${OUT_DIR} push origin ${BRANCH} --force`);

  log(`[ok] 已发布到分支 ${BRANCH}。访问路径：`);
  log(repo.toLowerCase() === `${owner}.github.io`.toLowerCase()
    ? `https://${owner}.github.io/`
    : `https://${owner}.github.io/${repo}/`);
}

// ---------- helpers ----------
function run(cmd){ execSync(cmd, { stdio: 'inherit', shell: true }); }
function safeRun(cmd, quiet=false){ try{ execSync(cmd,{stdio:quiet?'ignore':'inherit', shell:true}); }catch{ /* ignore */ } }
function log(...a){ console.log(...a); }
function assertGit(){ try{ execSync('git --version', {stdio:'ignore'}); }catch{ throw new Error('未检测到 git，请先安装 Git'); } }
function parseOrigin(){
  const url = execSync('git remote get-url origin', { encoding:'utf8' }).trim();
  // 支持 https://github.com/owner/repo(.git) 或 git@github.com:owner/repo(.git)
  const m = /github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?$/i.exec(url);
  if(!m) throw new Error(`无法解析远程地址：${url}`);
  return { owner: m[1], repo: m[2] };
}
function branchExistsRemote(branch){
  try { execSync(`git ls-remote --exit-code --heads origin ${branch}`, {stdio:'ignore', shell:true}); return true; }
  catch { return false; }
}
function isEmptyDir(d){ try{ return fs.readdirSync(d).filter(n=>n!=='.git').length===0; }catch{ return true; } }
function clearDirExceptGit(dir){ if(!fs.existsSync(dir)) return; for(const n of fs.readdirSync(dir)){ if(n==='.git') continue; rm(path.join(dir,n)); } }
function rm(p){ if(!fs.existsSync(p)) return; const s=fs.statSync(p); if(s.isDirectory()) fs.rmSync(p,{recursive:true,force:true}); else fs.unlinkSync(p); }
function touch(p){ fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p,'','utf8'); }
function copyDir(src,dst){
  if (fs.cpSync) { fs.cpSync(src, dst, { recursive: true }); return; }
  // 兼容旧 Node
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src,name), d = path.join(dst,name);
    const st = fs.statSync(s);
    if (st.isDirectory()) { fs.mkdirSync(d,{recursive:true}); copyDir(s,d); }
    else { fs.copyFileSync(s,d); }
  }
}
