#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { resolveColumnDir } from './lib/columns.js';

const BLOG_DIR = 'docs/blog';
const TZ = getArg('--tz') || 'Asia/Shanghai';

const title = getArg('--title') || firstPositional() || '未命名文章';
const desc  = getArg('--desc')  || '';
const tags  = (getArg('--tags') || '').split(',').map(s=>s.trim()).filter(Boolean);
const cat   = (getArg('--cat')   || '').trim();
const cover = getArg('--cover') || '';
const date  = getArg('--date')  || formatNow(TZ);
let slug    = getArg('--slug')  || slugify(title);
if(!slug) slug = 'post-' + formatNow(TZ).replace(/[^\d]/g,'');

if(!cat){
  console.error('[new-post] 需要通过 --cat 指定栏目名称（如 --cat "工程实践"）。');
  process.exit(1);
}

const year = date.slice(0,4);
const columnDir = resolveColumnDir(cat);
const outDir = columnDir ? path.join(BLOG_DIR, columnDir) : path.join(BLOG_DIR, year);
const outFile = path.join(outDir, `${slug}.md`);

ensureDir(outDir);
if (fs.existsSync(outFile)) {
  console.error(`[new-post] 已存在：${outFile}`);
  process.exit(1);
}

const fm = [
  '---',
  `title: "${escapeYaml(title)}"`,
  `date: "${date}"`,
  `description: "${escapeYaml(desc)}"`,
  `tags: [ ${tags.map(s=>`"${escapeYaml(s)}"`).join(', ')} ]`,
  `categories: [ "${escapeYaml(cat)}" ]`,
  cover ? `cover: "${escapeYaml(cover)}"` : null,
  'publish: true',
  'top: 1',
  '---',
  '',
  `> 写点什么吧……`,
  ''
].filter(Boolean).join('\n');

fs.writeFileSync(outFile, fm, 'utf8');
console.log(`[new-post] 已创建：${outFile}`);

function getArg(name){ const i=process.argv.indexOf(name); return i>=0? (process.argv[i+1]||'') : '' }
function firstPositional(){ return process.argv.slice(2).find(a=>!a.startsWith('--')) }
function ensureDir(d){ fs.mkdirSync(d,{recursive:true}) }
function escapeYaml(s){ return String(s).replace(/"/g,'\"') }
function slugify(s){
  return String(s).toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w\s-]+/g,'')
    .replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
}
function formatNow(tz){
  const d = new Date(new Date().toLocaleString('en-US',{ timeZone: tz }));
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
