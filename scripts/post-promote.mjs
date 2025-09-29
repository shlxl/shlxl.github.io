#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { program } from 'commander';
import { resolveColumnDir } from './lib/columns.js';
import { extractFrontmatterBlockFromContent, parseFrontmatterString, parseFrontmatterArray } from './lib/frontmatter.js';
import { safeSyncCategoryNav } from '../blog-admin/core/categories.mjs';

const BLOG_DIR = 'docs/blog';
const LOCAL_SUBDIR = process.env.LOCAL_SUBDIR || '_local';

function findLocalDraft(slug) {
  const localDir = path.join(BLOG_DIR, LOCAL_SUBDIR);
  if (!fs.existsSync(localDir)) return null;
  const files = fs.readdirSync(localDir);
  const target = `${slug}.md`;
  if (files.includes(target)) {
    return path.join(localDir, target);
  }
  return null;
}

function formatNow(tz = 'Asia/Shanghai') {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

if (typeof program.argument === 'function') {
  program.argument('<slug>', 'The slug of the post to promote');
} else if (typeof program.arguments === 'function') {
  program.arguments('<slug>');
}

program
  .option('--set-date', 'Set the post date to the current time');

program.parse(process.argv);

const slug = program.args[0];
const options = program.opts();

console.log(`[debug] 正在发布 slug: ${slug}`);

const localFile = findLocalDraft(slug);

if (!localFile) {
  console.error(`❌ 在 ${LOCAL_SUBDIR} 中找不到草稿: ${slug}.md`);
  process.exit(1);
}

console.log(`[debug] 找到了草稿文件: ${localFile}`);

const content = fs.readFileSync(localFile, 'utf8');
console.log(`[debug] 文件内容:\n---\n${content}\n---`);

const fm = extractFrontmatterBlockFromContent(content);

if (!fm) {
  console.error('❌ frontmatter 解析失败');
  process.exit(1);
}

console.log(`[debug] 解析出的 frontmatter 块:\n---\n${fm}\n---`);

const categories = parseFrontmatterArray(fm, 'categories');
console.log(`[debug] 解析出的 categories 数组:`, categories);

const cat = categories[0] || '';
console.log(`[debug] 使用的分类是: '${cat}'`);

if (!cat) {
  console.error('❌ 草稿需要设置 categories 才能发布');
  process.exit(1);
}

const date = options.setDate ? formatNow() : parseFrontmatterString(fm, 'date') || formatNow();
const year = date.slice(0, 4);
const columnDir = resolveColumnDir(cat);
const outDir = columnDir ? path.join(BLOG_DIR, columnDir) : path.join(BLOG_DIR, year);
const outFile = path.join(outDir, `${slug}.md`);

if (fs.existsSync(outFile)) {
  console.error(`❌ 正式目录中已存在同名文章: ${outFile}`);
  process.exit(2);
}

let newContent = content.replace(/draft:\s*true/g, 'draft: false');
newContent = newContent.replace(/publish:\s*false/g, 'publish: true');

if (options.setDate) {
  newContent = newContent.replace(/date:.*/, `date: ${date}`);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, newContent, 'utf8');
fs.unlinkSync(localFile);

console.log(`✅ 文章已发布: ${outFile}`);

console.log('[sync] 正在同步分类导航...');
const syncResult = safeSyncCategoryNav();
if (syncResult.ok) {
  console.log(`✅ 分类导航已同步: ${syncResult.json}`);
} else {
  console.error(`❌ 分类导航同步失败: ${syncResult.error}`);
}
