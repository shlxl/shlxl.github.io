#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR  = process.env.SRC_DIR  || 'docs/blog';
const DIST_DIR = process.env.DIST_DIR || 'docs/.vitepress/dist';
const DEPLOY_BASE = normalizeBase(process.env.DEPLOY_BASE || '/');

function normalizeBase(b){ if(!b) return '/'; if(!b.startsWith('/')) b='/'+b; if(!b.endsWith('/')) b+='/'; return b; }
function scan(dir,out=[]){ if(!fs.existsSync(dir)) return out;
  for(const n of fs.readdirSync(dir)){ const p=path.join(dir,n); const s=fs.statSync(p);
    if(s.isDirectory()) scan(p,out); else if(n.toLowerCase().endsWith('.md')) out.push(p) }
  return out;
}
function readAliases(file){
  const t=fs.readFileSync(file,'utf8'); const m=/^---\s*([\s\S]*?)\s*---/m.exec(t); if(!m) return [];
  const fm=m[1]; const i=fm.indexOf('aliases:'); if(i<0) return []; const lines=fm.slice(i).split('\n').slice(1); const a=[];
  for(const line of lines){ const mm=/^\s*-\s*(.+?)\s*$/.exec(line); if(!mm) break;
    let v=mm[1].trim().replace(/^['"]|['"]$/g,''); if(!v) continue; if(!v.startsWith('/')) v='/'+v; a.push(v) }
  return a;
}
function mdToRoute(p){ const rel=path.relative('docs',p).replace(/\\/g,'/'); return '/'+rel.replace(/\.md$/i,'')+'.html' }
function toAbs(route){ route=route.startsWith('/')?route.slice(1):route; return DEPLOY_BASE+route }
function aliasToFile(a){
  let r=a.startsWith('/')?a.slice(1):a;
  if(r.startsWith(DEPLOY_BASE.slice(1))) r=r.slice(DEPLOY_BASE.slice(1).length);
  if(r.endsWith('/')) return path.join(DIST_DIR,r,'index.html');
  if(!path.extname(r)) return path.join(DIST_DIR,r,'index.html');
  return path.join(DIST_DIR,r);
}
function esc(s=''){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }
function ensureDir(f){ fs.mkdirSync(path.dirname(f),{recursive:true}) }
function writeRedirect(f,target){
  const html='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"/>' +
    '<meta http-equiv="refresh" content="0; url='+esc(target)+'"/>' +
    '<link rel="canonical" href="'+esc(target)+'"/><meta name="robots" content="noindex"/>' +
    '<title>Redirecting…</title><script>location.replace('+JSON.stringify(target)+');</script>' +
    '</head><body><p>Redirecting to <a href="'+esc(target)+'">'+esc(target)+'</a> …</p></body></html>';
  ensureDir(f); fs.writeFileSync(f,html,'utf8');
}

(function main(){
  if(!fs.existsSync(DIST_DIR)){ console.error(`[alias] dist 不存在：${DIST_DIR}，请先构建。`); process.exit(2) }
  const files=scan(SRC_DIR); let created=0,skip=0;
  for(const md of files){
    const aliases=readAliases(md); if(!aliases.length) continue;
    const target=toAbs(mdToRoute(md));
    for(const a of aliases){
      const out=aliasToFile(a); if(fs.existsSync(out)){ skip++; continue }
      writeRedirect(out,target); created++; console.log(`[alias] ${a}  →  ${target}`);
    }
  }
  console.log(`[alias] 完成：生成 ${created} 个；跳过 ${skip} 个已存在。`);
})();
