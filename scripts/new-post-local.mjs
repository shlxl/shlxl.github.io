#!/usr/bin/env node
// 本地开发专用：在 docs/blog/_local 生成草稿文章 + 默认封面
// 用法：npm run new:local -- "你的标题" --desc "摘要" --tags "前端,经验" --cat "工程化" [--slug my-slug]
// 环境变量：LOCAL_SUBDIR（默认 _local）

import fs from 'node:fs';
import path from 'node:path';
import { program } from 'commander';

function getTZParts(d = new Date(), tz = 'Asia/Shanghai') {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const parts = fmt.formatToParts(d).reduce((a, p) => (a[p.type] = p.value, a), {});
  return parts;
}

function formatDate() {
  const { year, month, day, hour, minute, second } = getTZParts();
  return `${year}/${month}/${day} ${hour}:${minute}:${second}`;
}

function slugify(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s-]+/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function escYaml(s) {
  return String(s).replace(/"/g, '\\"');
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function createCoverSVG(title, outPath) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">\n  <rect width="1200" height="630" fill="#A1745D"/>\n  <text x="60" y="200" font-size="48" fill="#fff" font-weight="700">${escYaml(title)}</text>\n  <text x="60" y="260" font-size="20" fill="#fff" opacity=".8">Generated at ${formatDate()}</text>\n</svg>`;
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, svg, 'utf8');
}

if (typeof program.argument === 'function') {
  program.argument('[title]', 'Post title');
} else if (typeof program.arguments === 'function') {
  program.arguments('[title]');
}

program
  .option('-t, --title <string>', 'Post title')
  .option('-d, --desc <string>', 'Post description', '待补充摘要...')
  .option('--tags <string>', 'Comma-separated tags', '')
  .option('-c, --cat <string>', 'Category name', '')
  .option('-s, --slug <string>', 'Post slug')
  .option('--cover <string>', 'Cover image URL');

program.parse(process.argv);

const options = program.opts();
const title = program.args[0] || options.title;

if (!title) {
  console.error('用法: npm run new:local -- "标题" [--desc 摘要] [--tags 前端,经验] [--cat 工程化] [--slug 自定义]');
  process.exit(1);
}

const date = formatDate();
let slug = options.slug ? String(options.slug) : slugify(title);
if (!slug) slug = 'post-' + Date.now();

const tags = (options.tags ? String(options.tags) : '').split(',').map(s => s.trim()).filter(Boolean);
const cat = (options.cat || '').trim();
const desc = options.desc;
const localSubdir = process.env.LOCAL_SUBDIR || '_local';
const blogDir = path.resolve(process.cwd(), 'docs/blog', localSubdir);
const imagesDir = path.resolve(process.cwd(), 'docs/public/images');

ensureDir(blogDir);
ensureDir(imagesDir);

const filePath = path.join(blogDir, `${slug}.md`);
if (fs.existsSync(filePath)) {
  console.error(`❌ 已存在: ${filePath}`);
  process.exit(2);
}

const defaultCover = `/images/${slug}-cover.svg`;
const cover = options.cover || defaultCover;
const coverFsPath = path.resolve(process.cwd(), 'docs/public' + cover);

if (!fs.existsSync(coverFsPath) && cover.startsWith('/images/') && cover.endsWith('.svg')) {
  createCoverSVG(title, coverFsPath);
}

const fm = [
  '---',
  `title: "${escYaml(title)}"`,
  `date: "${date}"`,
  `description: "${escYaml(desc)}"`,
  `tags: [${tags.join(', ')}]`,
  `categories: [${cat}]`,
  `cover: "${escYaml(cover)}"`,
  'publish: false',
  'draft: true',
  '---',
  '',
  '> 草稿：在本地验证通过后，再用 post:promote 迁入正式目录并发布。',
  ''
].join('\n');

fs.writeFileSync(filePath, fm, 'utf8');
console.log(`\n✅ 草稿已创建: ${filePath}`);
console.log(`💡 建议运行: npm run docs:dev   # 已在运行则浏览器会自动热更新`);
console.log(`🔗 本地路由: /blog/${localSubdir}/${slug}.html (如启用 cleanUrls 则去掉 .html)`);
