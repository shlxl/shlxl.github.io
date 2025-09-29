import fs from 'node:fs';
import path from 'node:path';
import {
  BLOG_DIR,
  VP_DIR,
  PROJECT_ROOT,
  CATEGORY_REGISTRY_FILE,
  CATEGORY_NAV_FILE,
  CATEGORY_REGISTRY_VERSION
} from './config.mjs';
import { walkMd, parseFM, relOf, isSection, slugOf, updateFrontmatter } from './fs-utils.mjs';

// #region Registry Helpers
export function normalizeDirKey(dir = '') {
  let s = String(dir || '').replace(/\\/g, '/');
  s = s.replace(/^\\+/, '');
  s = s.replace(/\\+$/, '');
  return s;
}

function coerceIso(value, fallback) {
  if (value) {
    try {
      const t = new Date(value).getTime();
      if (Number.isFinite(t)) return new Date(t).toISOString();
    } catch { } // eslint-disable-line no-empty
  }
  if (fallback) return fallback;
  return new Date().toISOString();
}

function extractRegistryCandidates(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.items)) return raw.items;
  if (raw && Array.isArray(raw.categories)) return raw.categories;
  if (raw && typeof raw === 'object') {
    return Object.entries(raw)
      .filter(([, v]) => typeof v === 'string')
      .map(([title, dir]) => ({ title, dir }));
  }
  return [];
}

function normalizeCategoryEntry(entry, index, fallbackDate) {
  if (!entry || typeof entry !== 'object') return null;
  const dir = normalizeDirKey(entry.dir || entry.path || entry.rel || entry.slug || '');
  let title = '';
  if (typeof entry.title === 'string') title = entry.title.trim();
  else if (typeof entry.text === 'string') title = entry.text.trim();
  else if (typeof entry.name === 'string') title = entry.name.trim();
  let menuLabel = '';
  if (typeof entry.menuLabel === 'string') menuLabel = entry.menuLabel.trim();
  else if (typeof entry.navLabel === 'string') menuLabel = entry.navLabel.trim();
  else if (typeof entry.label === 'string') menuLabel = entry.label.trim();
  const publish = entry.publish === undefined ? true : !!entry.publish;
  let menuEnabled;
  if (entry.menuEnabled !== undefined) menuEnabled = !!entry.menuEnabled;
  else if (entry.navEnabled !== undefined) menuEnabled = !!entry.navEnabled;
  else if (entry.enabled !== undefined) menuEnabled = !!entry.enabled;
  else if (entry.visible === false || entry.publish === false) menuEnabled = false;
  else menuEnabled = true;
  let menuOrder = Number(entry.menuOrder);
  if (!Number.isFinite(menuOrder)) menuOrder = index + 1;
  const fallback = coerceIso(fallbackDate, undefined);
  const createdAt = coerceIso(entry.createdAt || entry.lastUpdated, fallback);
  const updatedAt = coerceIso(entry.updatedAt || entry.lastUpdated, fallback);
  if (!dir && !title && !menuLabel) return null;
  const resolvedTitle = title || menuLabel || dir;
  const resolvedLabel = menuLabel || resolvedTitle;
  return {
    dir,
    title: resolvedTitle,
    menuLabel: resolvedLabel,
    publish,
    menuEnabled,
    menuOrder,
    createdAt,
    updatedAt
  };
}

function dedupeRegistryItems(items, fallbackDate) {
  const map = new Map();
  const fallback = coerceIso(fallbackDate, undefined);
  for (const entry of items) {
    const key = normalizeDirKey(entry.dir);
    if (!key) continue;
    const createdAt = coerceIso(entry.createdAt, fallback);
    const updatedAt = coerceIso(entry.updatedAt, createdAt);
    const normalized = {
      dir: key,
      title: entry.title || entry.menuLabel || key,
      menuLabel: entry.menuLabel || entry.title || key,
      publish: entry.publish !== false,
      menuEnabled: entry.menuEnabled !== false,
      menuOrder: Number(entry.menuOrder),
      createdAt,
      updatedAt
    };
    if (map.has(key)) {
      const existing = map.get(key);
      const prev = new Date(existing.updatedAt || existing.createdAt || fallback).getTime();
      const next = new Date(updatedAt).getTime();
      if (Number.isFinite(next) && (!Number.isFinite(prev) || next >= prev)) {
        map.set(key, normalized);
      }
    } else {
      map.set(key, normalized);
    }
  }
  return Array.from(map.values());
}

function normalizeMenuOrder(items) {
  const sorted = items.slice().sort((a, b) => {
    const oa = Number(a.menuOrder);
    const ob = Number(b.menuOrder);
    const fa = Number.isFinite(oa);
    const fb = Number.isFinite(ob);
    if (fa && fb && oa !== ob) return oa - ob;
    if (fa && !fb) return -1;
    if (!fa && fb) return 1;
    return (a.title || '').localeCompare(b.title || '');
  });
  const seen = new Set();
  let nextOrder = 1;
  return sorted.map(item => {
    let order = Number(item.menuOrder);
    if (!Number.isFinite(order) || order < 1) order = nextOrder;
    while (seen.has(order)) order++;
    seen.add(order);
    if (order >= nextOrder) nextOrder = order + 1;
    return { ...item, menuOrder: order };
  });
}

function prepareCategoryRegistry(raw, now = new Date().toISOString()) {
  const baseline = raw && typeof raw === 'object' ? raw : { items: [] };
  const fallback = coerceIso(baseline.updatedAt, now);
  const candidates = extractRegistryCandidates(baseline);
  const normalized = candidates
    .map((entry, idx) => normalizeCategoryEntry(entry, idx, fallback))
    .filter(Boolean);
  const deduped = dedupeRegistryItems(normalized, fallback);
  const ordered = normalizeMenuOrder(deduped);
  return {
    version: CATEGORY_REGISTRY_VERSION,
    updatedAt: coerceIso(baseline.updatedAt, fallback),
    items: ordered
  };
}

function backupCategoryRegistryFile(snapshot = '') {
  try {
    if (!fs.existsSync(CATEGORY_REGISTRY_FILE)) return null;
    const dir = path.dirname(CATEGORY_REGISTRY_FILE);
    const pad = n => String(n).padStart(2, '0');
    const t = new Date();
    const stamp = `${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}${pad(t.getHours())}${pad(t.getMinutes())}${pad(t.getSeconds())}`;
    const name = `categories.map.json.bak-${stamp}`;
    const file = path.join(dir, name);
    const payload = snapshot || fs.readFileSync(CATEGORY_REGISTRY_FILE, 'utf8');
    fs.writeFileSync(file, payload, 'utf8');
    return file;
  } catch {
    return null;
  }
}

export function loadCategoryRegistry() {
  let rawText = '';
  let parsed = null;
  try {
    if (fs.existsSync(CATEGORY_REGISTRY_FILE)) {
      rawText = fs.readFileSync(CATEGORY_REGISTRY_FILE, 'utf8');
      if (rawText.trim()) parsed = JSON.parse(rawText);
    }
  } catch {
    parsed = null;
  }
  const registry = prepareCategoryRegistry(parsed || { items: [] });
  const version = Number(parsed?.version || (Array.isArray(parsed) ? 1 : 0));
  if (version !== CATEGORY_REGISTRY_VERSION && rawText) {
    backupCategoryRegistryFile(rawText);
    return writeCategoryRegistry(registry);
  }
  if (!fs.existsSync(CATEGORY_REGISTRY_FILE)) {
    writeCategoryRegistry(registry);
  }
  return registry;
}

export function writeCategoryRegistry(registry) {
  const now = new Date().toISOString();
  const prepared = prepareCategoryRegistry({ ...(registry || {}), updatedAt: now }, now);
  prepared.updatedAt = now;
  fs.mkdirSync(path.dirname(CATEGORY_REGISTRY_FILE), { recursive: true });
  fs.writeFileSync(CATEGORY_REGISTRY_FILE, JSON.stringify(prepared, null, 2), 'utf8');
  return prepared;
}

export function nextMenuOrder(items) {
  let max = 0;
  for (const entry of items || []) {
    const n = Number(entry.menuOrder);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

export function touchRegistryEntry(dir, patch = {}) {
  const normalizedDir = normalizeDirKey(dir);
  if (!normalizedDir) return null;
  const registry = loadCategoryRegistry();
  const now = new Date().toISOString();
  let entry = registry.items.find(item => normalizeDirKey(item.dir) === normalizedDir);
  if (!entry) {
    entry = {
      dir: normalizedDir,
      title: '',
      menuLabel: '',
      publish: true,
      menuEnabled: true,
      menuOrder: nextMenuOrder(registry.items),
      createdAt: now,
      updatedAt: now
    };
    registry.items.push(entry);
  }
  if (patch.title !== undefined) {
    const value = String(patch.title || '').trim();
    entry.title = value || entry.title || normalizedDir;
  }
  if (patch.menuLabel !== undefined) {
    const value = String(patch.menuLabel || '').trim();
    entry.menuLabel = value || entry.title || normalizedDir;
  } else if (!entry.menuLabel) {
    entry.menuLabel = entry.title || normalizedDir;
  }
  if (patch.publish !== undefined) entry.publish = !!patch.publish;
  if (patch.menuEnabled !== undefined) entry.menuEnabled = !!patch.menuEnabled;
  if (patch.menuOrder !== undefined) {
    const order = Number(patch.menuOrder);
    if (Number.isFinite(order)) entry.menuOrder = order;
  }
  entry.updatedAt = now;
  if (!entry.createdAt) entry.createdAt = now;
  const written = writeCategoryRegistry(registry);
  return written.items.find(item => normalizeDirKey(item.dir) === normalizedDir) || null;
}

export function renameRegistryDir(oldDir, newDir) {
  const from = normalizeDirKey(oldDir);
  const to = normalizeDirKey(newDir);
  if (!from || !to) return null;
  const registry = loadCategoryRegistry();
  const idx = registry.items.findIndex(item => normalizeDirKey(item.dir) === from);
  if (idx === -1) return null;
  if (registry.items.some((item, i) => i !== idx && normalizeDirKey(item.dir) === to)) return null;
  registry.items[idx].dir = to;
  registry.items[idx].updatedAt = new Date().toISOString();
  const written = writeCategoryRegistry(registry);
  return written.items.find(item => normalizeDirKey(item.dir) === to) || null;
}

export function renameRegistryTitle(oldTitle, newTitle) {
  const from = String(oldTitle || '').trim();
  const to = String(newTitle || '').trim();
  if (!from || !to) return null;
  const registry = loadCategoryRegistry();
  const entry = registry.items.find(item => String(item.title || '').trim() === from);
  if (!entry) return null;
  entry.title = to;
  if (!entry.menuLabel || entry.menuLabel === from) entry.menuLabel = to;
  entry.updatedAt = new Date().toISOString();
  const written = writeCategoryRegistry(registry);
  return written.items.find(item => String(item.title || '').trim() === to) || null;
}

export function removeRegistryByDir(dir) {
  const target = normalizeDirKey(dir);
  if (!target) return false;
  const registry = loadCategoryRegistry();
  const before = registry.items.length;
  registry.items = registry.items.filter(item => normalizeDirKey(item.dir) !== target);
  if (registry.items.length === before) return false;
  writeCategoryRegistry(registry);
  return true;
}

export function removeRegistryByTitle(title) {
  const target = String(title || '').trim();
  if (!target) return false;
  const registry = loadCategoryRegistry();
  const before = registry.items.length;
  registry.items = registry.items.filter(item => String(item.title || '').trim() !== target);
  if (registry.items.length === before) return false;
  writeCategoryRegistry(registry);
  return true;
}

export function registryEntryByDir(dir) {
  const target = normalizeDirKey(dir);
  if (!target) return null;
  const registry = loadCategoryRegistry();
  return registry.items.find(item => normalizeDirKey(item.dir) === target) || null;
}

export function registryEntryByTitle(title) {
  const target = String(title || '').trim();
  if (!target) return null;
  const registry = loadCategoryRegistry();
  return registry.items.find(item => String(item.title || '').trim() === target) || null;
}
// #endregion

// #region Category Usage & Rewrite
export function collectCategoryUsage(category) {
  const target = String(category || '').trim();
  if (!target) return { category: '', posts: [], total: 0 };
  const files = walkMd(BLOG_DIR);
  const posts = [];
  for (const file of files) {
    if (isSection(file)) continue;
    const txt = fs.readFileSync(file, 'utf8');
    const fm = parseFM(txt);
    const list = (fm.categories || []).map(v => String(v || '').trim()).filter(Boolean);
    if (!list.length) continue;
    if (!list.includes(target)) continue;
    const rel = relOf(file);
    posts.push({
      rel,
      title: fm.title || slugOf(file),
      publish: fm.publish === true,
      draft: fm.draft === true,
      isLocal: rel.startsWith('_local/'),
      categories: list
    });
  }
  posts.sort((a, b) => a.rel.localeCompare(b.rel));
  return { category: target, posts, total: posts.length };
}

export function rewriteCategoryReferences({ from, to = '', mode = 'rename', dryRun = false, exclude = [] }) {
  const source = String(from || '').trim();
  const replacement = String(to || '').trim();
  const normalizedMode = mode === 'remove' ? 'remove' : 'rename';
  if (!source) return { updated: 0, files: [], mode: normalizedMode };
  if (normalizedMode === 'rename' && !replacement) return { updated: 0, files: [], mode: normalizedMode };
  const files = walkMd(BLOG_DIR);
  const skip = new Set((exclude || []).map(p => path.resolve(p)));
  const touched = [];
  for (const file of files) {
    if (skip.has(path.resolve(file))) continue;
    const txt = fs.readFileSync(file, 'utf8');
    const fm = parseFM(txt);
    const original = (fm.categories || []).map(v => String(v || '').trim()).filter(Boolean);
    if (!original.length) continue;
    const next = [];
    const seen = new Set();
    let changed = false;
    for (const cat of original) {
      if (cat === source) {
        if (normalizedMode === 'rename') {
          if (!seen.has(replacement)) {
            next.push(replacement);
            seen.add(replacement);
          }
        }
        changed = true;
      } else {
        if (!seen.has(cat)) {
          next.push(cat);
          seen.add(cat);
        } else {
          changed = true;
        }
      }
    }
    if (!changed) continue;
    touched.push({ file, rel: relOf(file), before: original, after: next });
    if (!dryRun) {
      updateFrontmatter(file, { categories: next });
    }
  }
  return { updated: touched.length, files: touched, mode: normalizedMode };
}
// #endregion

// #region Category Overview
function getCategoryBucket(map, key) {
  let bucket = map.get(key);
  if (!bucket) {
    bucket = { total: 0, published: 0, latestPublished: null, latestAny: null };
    map.set(key, bucket);
  }
  return bucket;
}

export function collectCategoryOverview() {
  const stats = new Map();
  const files = walkMd(BLOG_DIR);
  for (const file of files) {
    if (isSection(file)) continue;
    let txt = '';
    try {
      txt = fs.readFileSync(file, 'utf8');
    } catch { continue; } // eslint-disable-line no-empty
    const fm = parseFM(txt);
    const list = (fm.categories || []).map(v => String(v || '').trim()).filter(Boolean);
    if (!list.length) continue;
    const rel = relOf(file);
    let ts = Date.parse(fm.date || '');
    if (!Number.isFinite(ts)) {
      try {
        ts = fs.statSync(file).mtimeMs;
      } catch { ts = Date.now(); } // eslint-disable-line no-empty
    }
    const iso = new Date(ts).toISOString();
    const title = fm.title || slugOf(file);
    const isPublished = fm.publish === true && fm.draft !== true;
    for (const categoryName of list) {
      if (!categoryName) continue;
      const bucket = getCategoryBucket(stats, categoryName);
      bucket.total += 1;
      if (!bucket.latestAny || ts > bucket.latestAny.time) {
        bucket.latestAny = { time: ts, at: iso, rel, title };
      }
      if (isPublished) {
        bucket.published += 1;
        if (!bucket.latestPublished || ts > bucket.latestPublished.time) {
          bucket.latestPublished = { time: ts, at: iso, rel, title };
        }
      }
    }
  }
  return stats;
}
// #endregion

// #region Nav Sync
function buildCategoryNavItems() {
  const registry = loadCategoryRegistry();
  const blogRoot = path.resolve(BLOG_DIR);
  const usage = collectCategoryOverview();
  return registry.items
    .map(item => {
      if (item.menuEnabled === false) return null;
      const dir = normalizeDirKey(item.dir);
      if (!dir) return null;
      const safeDir = path.resolve(BLOG_DIR, dir);
      if (safeDir !== blogRoot && !safeDir.startsWith(blogRoot + path.sep)) return null;
      let hasIndex = false;
      try {
        const stat = fs.statSync(safeDir);
        if (!stat.isDirectory()) return null;
        const indexPath = path.join(safeDir, 'index.md');
        if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
          hasIndex = true;
        }
      } catch {
        return null;
      }
      const baseLink = '/blog/' + `${dir.replace(/\\+$/, '')}/`;
      const fallbackLink = hasIndex ? baseLink : '/blog/';
      const title = String(item.title || '').trim();
      const category = title || String(item.menuLabel || item.dir || '博客').trim();
      const stats = usage.get(title) || usage.get(category) || null;
      const latestPublished = stats?.latestPublished || null;
      const latestAny = stats?.latestAny || null;
      const latestLink = latestPublished?.rel ? relToRoute(latestPublished.rel) : '';
      const best = latestPublished || latestAny;
      const latestUpdatedAt = best?.at || '';
      const latestTitle = best?.title || '';
      const fallback = latestLink || fallbackLink;
      const link = latestLink || fallbackLink;
      return {
        text: item.menuLabel || item.title || dir || '博客',
        category,
        dir,
        link,
        fallback,
        menuOrder: Number(item.menuOrder) || 0,
        latestLink,
        latestUpdatedAt,
        latestTitle,
        postCount: stats?.total || 0,
        publishedCount: stats?.published || 0
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.menuOrder !== b.menuOrder) return a.menuOrder - b.menuOrder;
      return a.text.localeCompare(b.text);
    });
}

function relToRoute(rel = '') {
  let normalized = String(rel || '').trim();
  if (!normalized) return '';
  normalized = normalized.replace(/\\/g, '/');
  normalized = normalized.replace(/^\\+/, '');
  if (!normalized) return '';
  const lower = normalized.toLowerCase();
  if (lower === 'index.md') return '/blog/';
  if (lower.endsWith('/index.md')) {
    const base = normalized.slice(0, -'index.md'.length).replace(/\\+$/, '') + '/';
    return `/blog/${base}`.replace(/\\+$/, '/');
  }
  let trimmed = normalized;
  if (lower.endsWith('.md')) {
    trimmed = normalized.slice(0, -'.md'.length);
  }
  trimmed = trimmed.replace(/\\+$/, '');
  if (!trimmed) return '/blog/';
  return `/blog/${trimmed}`;
}

export function syncCategoryNavArtifacts(){
  const items = buildCategoryNavItems();
  const now = new Date().toISOString();
  fs.mkdirSync(VP_DIR, {recursive:true});
  const payload = { updatedAt: now, items };
  fs.writeFileSync(CATEGORY_NAV_FILE, JSON.stringify(payload, null, 2), 'utf8');
  const json = path.relative(PROJECT_ROOT, CATEGORY_NAV_FILE).replace(/\\/g,'/');
  return { items, updatedAt: now, json, config: null, patched: { mode:'json-only' } };
}

export function safeSyncCategoryNav() {
  try {
    const result = syncCategoryNavArtifacts();
    return { ok: true, ...result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[admin] category nav sync failed', err);
    return { ok: false, error: message };
  }
}


// #endregion