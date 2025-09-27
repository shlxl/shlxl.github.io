#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { program } from 'commander';

const BLOG_DIR = 'docs/blog';
const TRASH_DIR = 'docs/.trash';

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

function stamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

program
  .argument('<slug>', 'The slug of the post to remove')
  .option('--hard', 'Permanently delete the post');

program.parse(process.argv);

const slug = program.args[0];
const options = program.opts();

if (!slug) {
  console.error('用法: node scripts/post-remove.mjs <slug> [--hard]');
  process.exit(1);
}

const file = findMdBySlug(BLOG_DIR, slug);
if (!file) {
  console.error(`[remove] 未找到 slug=${slug}`);
  process.exit(2);
}

if (options.hard) {
  fs.unlinkSync(file);
  console.log(`[remove] 已永久删除：${file}`);
} else {
  fs.mkdirSync(TRASH_DIR, { recursive: true });
  const target = path.join(TRASH_DIR, `${stamp()}-${path.basename(file)}`);
  fs.renameSync(file, target);
  console.log(`[remove] 已移入回收站：${target}`);
}