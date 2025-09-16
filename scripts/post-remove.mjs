#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const BLOG_DIR = 'docs/blog';
const TRASH_DIR = 'docs/.trash';
const slug = process.argv.slice(2).find(a=>!a.startsWith('--'));
const hard = process.argv.includes('--hard');

if(!slug){ console.error('用法: node scripts/post-remove.mjs <slug> [--hard]'); process.exit(1); }

const file = findMdBySlug(BLOG_DIR, slug);
if(!file){ console.error(`[remove] 未找到 slug=${slug}`); process.exit(2); }

if(hard){
  fs.unlinkSync(file);
  console.log(`[remove] 已永久删除：${file}`);
}else{
  fs.mkdirSync(TRASH_DIR,{recursive:true});
  const target = path.join(TRASH_DIR, `${stamp()}-${path.basename(file)}`);
  fs.renameSync(file, target);
  console.log(`[remove] 已移入回收站：${target}`);
}

function findMdBySlug(dir, slug){
  if(!fs.existsSync(dir)) return '';
  for(const name of fs.readdirSync(dir)){
    const p = path.join(dir,name); const st=fs.statSync(p);
    if(st.isDirectory()){ const r=findMdBySlug(p,slug); if(r) return r; }
    else if(name.toLowerCase()===(slug.toLowerCase()+'.md')) return p;
  }
  return '';
}
function stamp(){ const d=new Date(); const pad=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
