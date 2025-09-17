#!/usr/bin/env node
/**
 * rss-mark-page.mjs
 * 给目标 md 文件注入/合并 frontmatter：
 *   type: page
 *   list: false
 *   hidden: true
 *   publish: false （可用 --keep-publish 跳过）
 *
 * 用法：
 *   node scripts/rss-mark-page.mjs                    # 默认 docs/rss.md（找不到则尝试 docs/blog/rss.md）
 *   node scripts/rss-mark-page.mjs --path docs/rss.md
 *   node scripts/rss-mark-page.mjs --keep-publish     # 不改 publish
 *   node scripts/rss-mark-page.mjs --dry-run          # 只打印变更，不写回
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const get = (k, def=null) => {
  const i = args.indexOf(k);
  if (i >= 0) return true;
  const kv = args.find(a => a.startsWith(k+'='));
  if (kv) return kv.slice(k.length+1);
  return def;
};

const explicitPath = get('--path', null);
const keepPublish  = !!get('--keep-publish', false);
const dryRun       = !!get('--dry-run', false);

const candidates = explicitPath
  ? [explicitPath]
  : ['docs/rss.md','docs/blog/rss.md'];

const file = candidates.find(f => fs.existsSync(f));
if (!file) {
  console.error('[rss-mark-page] 未找到目标文件。请用 --path 指定，例如 --path docs/rss.md');
  process.exit(2);
}

const src = fs.readFileSync(file, 'utf8');

function parseFM(txt){
  const m = /^---\s*([\s\S]*?)\s*---\s*/m.exec(txt);
  if (!m) return { head:'', body:txt, data:{} };
  const head = m[1];
  const body = txt.slice(m[0].length);
  const data = {};
  for (const line of head.split(/\r?\n/)) {
    if (!line.trim() || /^#/.test(line)) continue;
    const mm = /^([A-Za-z0-9_\-]+)\s*:\s*(.*)$/.exec(line);
    if (!mm) continue;
    let v = mm[2].trim();
    if (/^(true|false)$/i.test(v)) v = v.toLowerCase()==='true';
    else if (/^\d{4}-\d{2}-\d{2}/.test(v)) { /* date-like, keep string */ }
    else if (/^\[.*\]$/.test(v)) { /* array-ish, keep string */ }
    else v = v.replace(/^['"]|['"]$/g,'');
    data[mm[1]] = v;
  }
  return { head, body, data };
}

function stringifyFM(data){
  const lines = [];
  for (const [k,v] of Object.entries(data)) {
    if (Array.isArray(v)) lines.push(`${k}: [${v.join(', ')}]`);
    else if (typeof v === 'boolean') lines.push(`${k}: ${v ? 'true' : 'false'}`);
    else lines.push(`${k}: ${v}`);
  }
  return `---\n${lines.join('\n')}\n---\n`;
}

const { head, body, data } = parseFM(src);
const merged = { ...data };

merged.type = 'page';
merged.list = false;
merged.hidden = true;
if (!keepPublish) merged.publish = false;

const out = stringifyFM(merged) + body;

if (dryRun) {
  console.log('[rss-mark-page] DRY RUN - 将写入的 frontmatter：\n' + stringifyFM(merged));
  process.exit(0);
} else {
  fs.writeFileSync(file, out, 'utf8');
  console.log(`[rss-mark-page] 已更新 ${file}`);
}
