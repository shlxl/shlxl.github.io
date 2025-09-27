import fs from 'node:fs';
import path from 'node:path';
import {
  frontmatterToObject,
  parseFrontmatterArray,
  parseFrontmatterBoolean,
  parseFrontmatterContent,
  parseFrontmatterString
} from '../../scripts/lib/frontmatter.js';
import { BLOG_DIR, TRASH_DIR, LOCAL_DIR } from './config.mjs';

// #region Path & Slug Utilities
export const relOf = p => path.relative(BLOG_DIR, p).replace(/\\/g, '/');
export const isSection = p => path.basename(p).toLowerCase() === 'index.md';
export const slugOf = p => path.basename(p).replace(/\.md$/i, '');

export function sanitizeSlug(value) {
  let out = String(value || '').trim();
  if (!out) return '';
  out = out.replace(/[\\/]+/g, '-');
  out = out.replace(/[:*?"<>|]+/g, '');
  out = out.replace(/\s+/g, '-');
  out = out.replace(/-+/g, '-');
  out = out.replace(/^[-_]+|[-_]+$/g, '');
  return out;
}
// #endregion

// #region Frontmatter Utilities
export function parseFM(txt = '') {
  const { block } = parseFrontmatterContent(txt);
  const fm = { title: '', date: '', publish: undefined, draft: undefined, tags: [], categories: [], cover: '', list: undefined, hidden: undefined, type: undefined };
  if (!block) return fm;
  const base = frontmatterToObject(block);
  fm.title = parseFrontmatterString(block, 'title');
  fm.date = parseFrontmatterString(block, 'date');
  fm.cover = parseFrontmatterString(block, 'cover');
  fm.type = typeof base.type === 'string' ? String(base.type).trim() || undefined : undefined;
  fm.tags = parseFrontmatterArray(block, 'tags');
  fm.categories = parseFrontmatterArray(block, 'categories');
  fm.publish = parseFrontmatterBoolean(block, 'publish');
  fm.draft = parseFrontmatterBoolean(block, 'draft');
  fm.list = normalizeTriState(base.list);
  fm.hidden = normalizeTriState(base.hidden);
  return fm;
}

function normalizeTriState(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const str = String(value).trim().toLowerCase();
  if (!str) return undefined;
  if (str === 'true' || str === '1' || str === 'yes') return true;
  if (str === 'false' || str === '0' || str === 'no') return false;
  return undefined;
}

export function updateFrontmatter(file, patch = {}) {
  const FM = /^---\s*([\s\S]*?)\s*---/m;
  const read = fs.readFileSync(file, 'utf8');
  const m = FM.exec(read);
  if (!m) throw new Error('frontmatter missing: ' + file);
  let head = m[1];
  const put = (k, v) => {
    if (v === undefined || v === null) return;
    const re = new RegExp(`^\s*${k}\s*:\s*.*$`, 'mi');
    const val = Array.isArray(v) ? `[${v.map(x => String(x)).join(', ')}]` : String(v);
    head = re.test(head) ? head.replace(re, `${k}: ${val}`) : (head + `\n${k}: ${val}`);
  };
  for (const [k, v] of Object.entries(patch || {})) put(k, v);
  const out = read.replace(FM, `---\n${head.trim()}\n---`);
  fs.writeFileSync(file, out, 'utf8');
}

export function setPublishFlag(file, publish) {
  updateFrontmatter(file, { publish: publish ? 'true' : 'false', draft: publish ? 'false' : undefined });
}

export function ensureDraftFrontmatter(file) {
  let txt = '';
  try {
    txt = fs.readFileSync(file, 'utf8');
  } catch { return; }
  const FM = /^---\s*([\s\S]*?)\s*---/m;
  if (!FM.test(txt)) {
    const fallback = [
      '---',
      `title: "${slugOf(file)}"`, 
      'publish: false',
      'draft: true',
      '---',
      '',
      txt
    ].join('\n');
    fs.writeFileSync(file, fallback, 'utf8');
    return;
  }
  try {
    updateFrontmatter(file, { publish: 'false', draft: 'true' });
  } catch {
    const m = FM.exec(txt);
    if (!m) return;
    let head = m[1];
    const put = (key, val) => {
      const re = new RegExp(`^\s*${key}\s*:.*$`, 'mi');
      if (re.test(head)) head = head.replace(re, `${key}: ${val}`);
      else head = `${head}\n${key}: ${val}`;
    };
    put('publish', 'false');
    put('draft', 'true');
    const next = txt.replace(FM, `---\n${head.trim()}\n---`);
    fs.writeFileSync(file, next, 'utf8');
  }
}
// #endregion

// #region Filesystem & Ignore Rules
export function walkMd(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const n of fs.readdirSync(dir)) {
    const p = path.join(dir, n);
    const s = fs.statSync(p);
    if (s.isDirectory()) walkMd(p, out);
    else if (/\.md$/i.test(n)) out.push(p);
  }
  return out;
}

function loadIgnores() {
  const file = path.join(BLOG_DIR, '.adminignore');
  let lines = [];
  if (fs.existsSync(file)) {
    lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'));
  }
  lines.push('blog.md');
  return Array.from(new Set(lines));
}

function toRegex(glob) {
  const esc = s => s.replace(/[.+^${}()|[\]]/g, '\\$&');
  let re = '^' + glob.split('*').map(esc).join('.*') + '$';
  re = re.replace(/\?/g, '.');
  return new RegExp(re, 'i');
}

const IGNORE_PATTERNS = loadIgnores().map(g => ({ glob: g, re: toRegex(g) }));

export function shouldIgnore(rel, abs, fm) {
  if (String(fm.list).toLowerCase() === 'false' || String(fm.list) === '0') return true;
  if (String(fm.hidden).toLowerCase() === 'true') return true;
  if (IGNORE_PATTERNS.some(p => p.re.test(rel))) return true;
  const base = path.basename(abs).toLowerCase();
  if (path.dirname(abs) === BLOG_DIR && (base === 'blog.md')) return true;
  return false;
}

export function typeOf(rel, abs, fm) {
  const t = (fm.type || '').toLowerCase();
  if (t === 'post' || t === 'section' || t === 'page') return t;
  if (isSection(abs)) return 'section';
  if (shouldIgnore(rel, abs, fm)) return 'page';
  return 'post';
}
// #endregion

// #region Trash Utilities
export function moveToTrash(file) {
  fs.mkdirSync(TRASH_DIR, { recursive: true });
  const rel = relOf(file).replace(/[\\/]/g, '_');
  const t = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}${pad(t.getHours())}${pad(t.getMinutes())}${pad(t.getSeconds())}`;
  const name = `${stamp}-${rel}`.replace(/\.md$/i, '') + '.md';
  const dst = path.join(TRASH_DIR, name);
  fs.renameSync(file, dst);
  return dst;
}

export function deriveSlugFromTrashName(name) {
  const base = String(name || '').replace(/\.md$/i, '');
  const matchWithDash = base.match(/^\d{8}-\d{6}-(.+)$/);
  const matchCompact = base.match(/^\d{14}-(.+)$/);
  let candidate = '';
  if (matchWithDash && matchWithDash[1]) candidate = matchWithDash[1];
  else if (matchCompact && matchCompact[1]) candidate = matchCompact[1];
  else candidate = base;
  candidate = candidate.replace(/_/g, '-');
  const sanitized = sanitizeSlug(candidate);
  return sanitized || sanitizeSlug(base) || candidate;
}

export function listTrashEntries() {
    if (!fs.existsSync(TRASH_DIR)) return [];
    const names = fs.readdirSync(TRASH_DIR).filter(n => /\.md$/i.test(n));
    const items = [];
    for (const name of names) {
        const abs = path.join(TRASH_DIR, name);
        let stat;
        try {
            stat = fs.statSync(abs);
        } catch { continue; }
        if (!stat.isFile()) continue;
        let title = '';
        try {
            title = parseFM(fs.readFileSync(abs, 'utf8')).title || '';
        } catch { } 
        items.push({
            name,
            slug: deriveSlugFromTrashName(name),
            title,
            mtime: stat.mtimeMs,
            size: stat.size
        });
    }
    items.sort((a, b) => b.mtime - a.mtime);
    return items;
}

export function restoreTrashEntry(name, slug = '') {
    const safe = path.basename(String(name || ''));
    if (!safe) throw new Error('缺少文件名');
    if (safe !== name) throw new Error('非法文件名');
    const src = path.join(TRASH_DIR, safe);
    if (!fs.existsSync(src) || !fs.statSync(src).isFile()) throw new Error('目标不存在');
    let targetSlug = sanitizeSlug(slug);
    if (!targetSlug) {
        targetSlug = deriveSlugFromTrashName(safe);
    }
    if (!targetSlug) {
        try {
            const fm = parseFM(fs.readFileSync(src, 'utf8'));
            targetSlug = sanitizeSlug(fm.title);
        } catch { } 
    }
    if (!targetSlug) targetSlug = `restored-${Date.now()}`;
    fs.mkdirSync(LOCAL_DIR, { recursive: true });
    const base = targetSlug;
    let finalSlug = targetSlug;
    let dest = path.join(LOCAL_DIR, `${finalSlug}.md`);
    let idx = 1;
    while (fs.existsSync(dest)) {
        finalSlug = `${base}-${idx++}`;
        dest = path.join(LOCAL_DIR, `${finalSlug}.md`);
    }
    fs.renameSync(src, dest);
    try {
        ensureDraftFrontmatter(dest);
    } catch { } 
    return { slug: finalSlug, rel: relOf(dest) };
}

export function deleteTrashEntry(name) {
    const safe = path.basename(String(name || ''));
    if (!safe) return false;
    if (safe !== name) return false;
    const file = path.join(TRASH_DIR, safe);
    if (!fs.existsSync(file)) return false;
    if (!fs.statSync(file).isFile()) return false;
    fs.unlinkSync(file);
    return true;
}
// #endregion