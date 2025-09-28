#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { program } from 'commander';

const BLOG_DIR = 'docs/blog';

function findMdBySlug(dir, slug) {
  if (!fs.existsSync(dir)) return '';
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      const r = findMdBySlug(p, slug);
      if (r) return r;
    } else if (name.toLowerCase() === (slug.toLowerCase() + '.md')) {
      return p;
    }
  }
  return '';
}

if (typeof program.argument === 'function') {
  program.argument('<slug>', 'The slug of the post to archive');
} else if (typeof program.arguments === 'function') {
  program.arguments('<slug>');
}

program.parse(process.argv);

const slug = program.args[0];

if (!slug) {
  console.error('用法: node scripts/post-archive.mjs <slug>');
  process.exit(1);
}

const file = findMdBySlug(BLOG_DIR, slug);
if (!file) {
  console.error(`[archive] 未找到 slug=${slug}`);
  process.exit(2);
}

let txt = fs.readFileSync(file, 'utf8');
const m = /^---\s*([\s\S]*?)\s*---/m.exec(txt);
if (!m) {
  console.error(`[archive] 文件缺少 frontmatter: ${file}`);
  process.exit(3);
}
let fm = m[1];
if (/^\s*publish\s*:/m.test(fm)) {
  fm = fm.replace(/^\s*publish\s*:.*$/m, 'publish: false');
} else {
  fm = fm + '\npublish: false';
}
txt = txt.replace(/^---\s*([\s\S]*?)\s*---/, `---\n${fm.trim()}\n---`);
fs.writeFileSync(file, txt, 'utf8');
console.log(`[archive] 已下架：${file}`);
