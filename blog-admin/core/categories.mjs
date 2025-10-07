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

const DEFAULT_NAV_GROUPS = [
  { id: 'primary', label: '主导航', type: 'primary', menuOrder: 1, link: '/blog/' }
];

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

function normalizeNavGroupEntry(entry, fallbackOrder = 100, seenIds = new Set()) {
  if (!entry || typeof entry !== 'object') return null;
  const candidateId = typeof entry.id === 'string' ? entry.id.trim() : '';
  const fallbackId = typeof entry.slug === 'string' ? entry.slug.trim() : '';
  let id = candidateId || fallbackId;
  if (!id) return null;
  id = id.toLowerCase().replace(/[^a-z0-9\-]+/g, '-').replace(/^-+|-+$/g, '') || 'primary';
  if (seenIds.has(id)) return null;
  const labelSource = typeof entry.label === 'string'
    ? entry.label
    : (typeof entry.text === 'string' ? entry.text : '');
  const label = labelSource.trim() || (id === 'primary' ? '主导航' : id);
  const typeSource = typeof entry.type === 'string' ? entry.type.trim().toLowerCase() : '';
  const type = typeSource === 'primary' ? 'primary' : 'dropdown';
  const link = typeof entry.link === 'string' ? entry.link.trim() : '';
  let menuOrder = Number(entry.menuOrder);
  if (!Number.isFinite(menuOrder)) menuOrder = fallbackOrder;
  seenIds.add(id);
  return { id, label, type, menuOrder, link: link || undefined };
}

function normalizeRegistryGroups(raw) {
  const seen = new Set();
  const groups = [];
  const candidates = Array.isArray(raw)
    ? raw
    : raw && Array.isArray(raw.groups)
      ? raw.groups
      : [];
  for (const [index, entry] of candidates.entries()) {
    const normalized = normalizeNavGroupEntry(entry, 100 + index, seen);
    if (normalized) groups.push(normalized);
  }
  for (const fallback of DEFAULT_NAV_GROUPS) {
    if (!seen.has(fallback.id)) {
      groups.push({ ...fallback });
      seen.add(fallback.id);
    }
  }
  groups.sort((a, b) => {
    if (a.menuOrder !== b.menuOrder) return a.menuOrder - b.menuOrder;
    return a.id.localeCompare(b.id);
  });
  return groups;
}

function slugifyGroupId(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function nextGroupOrder(groups) {
  let max = 0;
  for (const group of groups || []) {
    const n = Number(group?.menuOrder);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

export function normalizeNavGroupId(value, groups) {
  const raw = typeof value === 'string' ? value.trim() : '';
  let candidate = raw;
  if (!candidate) candidate = 'primary';
  const lowered = candidate.toLowerCase();
  if (lowered === 'archive' || lowered === 'primary') {
    candidate = lowered;
  }
  if (Array.isArray(groups) && groups.length) {
    const hit = groups.find((group) => group?.id === candidate);
    if (hit) return hit.id;
    const loweredHit = groups.find((group) => group?.id?.toLowerCase?.() === lowered);
    if (loweredHit) return loweredHit.id;
    const primary = groups.find((group) => group?.id === 'primary');
    if (primary) return primary.id;
  }
  return candidate || 'primary';
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

function normalizeCategoryEntry(entry, index, fallbackDate, groups) {
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
  const navGroupId = normalizeNavGroupId(entry.navGroupId || entry.navGroup || entry.group || entry.menuGroup, groups);
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
    navGroupId,
    menuOrder,
    createdAt,
    updatedAt
  };
}

function dedupeRegistryItems(items, fallbackDate, groups) {
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
      navGroupId: normalizeNavGroupId(entry.navGroupId || entry.navGroup || entry.group || entry.menuGroup, groups),
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
  const groups = normalizeRegistryGroups(baseline.groups || baseline.navGroups || []);
  const candidates = extractRegistryCandidates(baseline);
  const normalized = candidates
    .map((entry, idx) => normalizeCategoryEntry(entry, idx, fallback, groups))
    .filter(Boolean);
  const deduped = dedupeRegistryItems(normalized, fallback, groups).map((entry) => ({
    ...entry,
    navGroupId: normalizeNavGroupId(entry.navGroupId, groups)
  }));
  const ordered = normalizeMenuOrder(deduped);
  return {
    version: CATEGORY_REGISTRY_VERSION,
    updatedAt: coerceIso(baseline.updatedAt, fallback),
    items: ordered,
    groups
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
    bucket = { total: 0, published: 0, latestPublished: null, latestAny: null, earliestPublished: null };
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
        if (!bucket.earliestPublished || ts < bucket.earliestPublished.time) {
          bucket.earliestPublished = { time: ts, at: iso, rel, title };
        }
      }
    }
  }
  return stats;
}

function loadExistingCategoryNavSnapshot() {
  try {
    if (!fs.existsSync(CATEGORY_NAV_FILE)) return [];
    const raw = fs.readFileSync(CATEGORY_NAV_FILE, 'utf8');
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed?.items)
      ? parsed.items
      : Array.isArray(parsed)
        ? parsed
        : [];
    if (!Array.isArray(items)) return [];
    return items.filter(entry => entry && typeof entry === 'object');
  } catch {
    return [];
  }
}

function normalizeRouteCandidate(route = '') {
  let normalized = String(route || '').trim();
  if (!normalized) return '';
  normalized = normalized.split('\\').join('/');
  normalized = normalized.replace(/[?#].*$/, '');
  if (!normalized.startsWith('/')) normalized = '/' + normalized;
  normalized = normalized.replace(/\/+/g, '/');
  if (!normalized.startsWith('/blog')) return '';
  return normalized;
}

function resolveRouteToFile(route) {
  const normalized = normalizeRouteCandidate(route);
  if (!normalized || normalized === '/blog/') return null;
  let relative = normalized.slice('/blog/'.length);
  if (!relative) return null;
  if (relative.endsWith('/')) relative = relative.slice(0, -1);
  if (!relative) return null;
  const directPath = path.join(BLOG_DIR, `${relative}.md`);
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return directPath;
  }
  const indexPath = path.join(BLOG_DIR, relative, 'index.md');
  if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
    return indexPath;
  }
  return null;
}

function isRoutePublishedForCategory(route, category) {
  const normalizedCategory = String(category || '').trim();
  if (!normalizedCategory) return false;
  const file = resolveRouteToFile(route);
  if (!file) return false;
  let txt = '';
  try {
    txt = fs.readFileSync(file, 'utf8');
  } catch {
    return false;
  }
  const fm = parseFM(txt);
  if (fm.publish !== true) return false;
  if (fm.draft === true) return false;
  const categories = (fm.categories || []).map(v => String(v || '').trim()).filter(Boolean);
  return categories.includes(normalizedCategory);
}

function resolvePersistedCategoryLink(navItem, category) {
  if (!navItem || typeof navItem !== 'object') return '';
  const candidate = normalizeRouteCandidate(navItem.link || '');
  if (!candidate || candidate === '/blog/') return '';
  if (!isRoutePublishedForCategory(candidate, category)) return '';
  return candidate;
}

// #endregion

// #region Nav Sync
function buildCategoryNavItems() {
  const registry = loadCategoryRegistry();
  const groups = Array.isArray(registry.groups) ? registry.groups : normalizeRegistryGroups([]);
  const blogRoot = path.resolve(BLOG_DIR);
  const usage = collectCategoryOverview();
  const previousNav = loadExistingCategoryNavSnapshot();
  const previousByDir = new Map();
  const previousByCategory = new Map();
  for (const entry of previousNav) {
    if (!entry || typeof entry !== 'object') continue;
    const dirKey = normalizeDirKey(entry.dir);
    if (dirKey && !previousByDir.has(dirKey)) {
      previousByDir.set(dirKey, entry);
    }
    const categoryKey = String(entry.category || '').trim();
    if (categoryKey && !previousByCategory.has(categoryKey)) {
      previousByCategory.set(categoryKey, entry);
    }
  }
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
      const publishedCount = stats?.published || 0;
      const hasPublished = publishedCount > 0;
      const latestPublished = hasPublished ? stats?.latestPublished || null : null;
      const earliestPublished = hasPublished ? stats?.earliestPublished || null : null;
      const previousNavItem = hasPublished
        ? previousByDir.get(dir) || previousByCategory.get(category) || null
        : null;
      const earliestLink = earliestPublished ? relToRoute(earliestPublished.rel) : '';

      let fallbackRoute = hasIndex ? baseLink : '/blog/';
      let latestLink = fallbackRoute;
      let latestUpdatedAt = '';
      let latestTitle = '';

      if (hasPublished && latestPublished) {
        const candidate = relToRoute(latestPublished.rel);
        if (candidate) {
          latestLink = candidate;
        }
        latestUpdatedAt = latestPublished.at || '';
        latestTitle = latestPublished.title || '';
      } else if (!hasPublished) {
        fallbackRoute = '/blog/';
        latestLink = fallbackRoute;
      }

      let persistedLink = '';
      if (hasPublished && previousNavItem) {
        const candidate = resolvePersistedCategoryLink(previousNavItem, category);
        if (candidate && candidate !== latestLink) {
          persistedLink = candidate;
        }
      }

      let link = fallbackRoute;

      if (hasPublished) {
        if (persistedLink) {
          link = persistedLink;
        } else if (earliestLink) {
          link = earliestLink;
        } else if (latestLink) {
          link = latestLink;
        }
      }

      return {
        text: item.menuLabel || item.title || dir || '博客',
        category,
        dir,
        link,
        fallback: fallbackRoute,
        fallbackLink: fallbackRoute,
        navGroupId: normalizeNavGroupId(item.navGroupId, groups),
        menuEnabled: item.menuEnabled !== false,
        menuOrder: Number(item.menuOrder) || 0,
        latestLink,
        latestUpdatedAt,
        latestTitle,
        postCount: stats?.total || 0,
        publishedCount
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
  const registry = loadCategoryRegistry();
  const items = buildCategoryNavItems();
  const groups = Array.isArray(registry.groups) ? registry.groups : normalizeRegistryGroups([]);
  const now = new Date().toISOString();
  fs.mkdirSync(VP_DIR, {recursive:true});
  const payload = { updatedAt: now, items, groups };
  fs.writeFileSync(CATEGORY_NAV_FILE, JSON.stringify(payload, null, 2), 'utf8');
  const json = path.relative(PROJECT_ROOT, CATEGORY_NAV_FILE).replace(/\\/g,'/');
  return { items, groups, updatedAt: now, json, config: null, patched: { mode:'json-only' } };
}

export function safeSyncCategoryNav() {
  try {
    const result = syncCategoryNavArtifacts();
    return { ok: true, ...result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[admin] category nav sync failed', err);
    console.log('[DEBUG] Category nav sync failed with error:', message);
    return { ok: false, error: message };
  }
}


// #endregion

export function listNavGroups() {
  const registry = loadCategoryRegistry();
  return Array.isArray(registry.groups) ? registry.groups : [];
}

export function createNavGroup(input) {
  const registry = loadCategoryRegistry();
  const groups = Array.isArray(registry.groups) ? registry.groups.slice() : [];
  const labelRaw = typeof input?.label === 'string' ? input.label.trim() : '';
  let id = slugifyGroupId(input?.id);
  if (!id) id = slugifyGroupId(labelRaw);
  if (!id) id = `group-${Date.now().toString(36)}`;
  if (id === 'primary') {
    throw new Error('主导航分组无法重复创建');
  }
  if (groups.some(group => group.id === id)) {
    throw new Error(`分组标识「${id}」已存在`);
  }
  const type = input?.type === 'primary' ? 'primary' : 'dropdown';
  const menuOrderInput = Number(input?.menuOrder);
  const menuOrder = Number.isFinite(menuOrderInput) ? menuOrderInput : nextGroupOrder(groups);
  const linkRaw = typeof input?.link === 'string' ? input.link.trim() : '';
  groups.push({
    id,
    label: labelRaw || id,
    type,
    menuOrder,
    link: linkRaw || undefined
  });
  registry.groups = groups;
  const written = writeCategoryRegistry(registry);
  const navSync = safeSyncCategoryNav();
  const group = written.groups.find(item => item.id === id) || null;
  return { group, registry: written, navSync };
}

export function updateNavGroup(params) {
  const registry = loadCategoryRegistry();
  const groups = Array.isArray(registry.groups) ? registry.groups : [];
  const currentId = slugifyGroupId(params?.id);
  if (!currentId) {
    throw new Error('缺少分组标识');
  }
  const entry = groups.find(group => group.id === currentId);
  if (!entry) {
    throw new Error(`未找到分组「${currentId}」`);
  }
  if (entry.id === 'primary' && params?.type === 'dropdown') {
    throw new Error('主导航分组无法改为下拉类型');
  }
  let targetId = entry.id;
  if (params?.nextId !== undefined) {
    const normalized = slugifyGroupId(params.nextId);
    if (!normalized) {
      throw new Error('新的分组标识不合法');
    }
    if (normalized === 'primary') {
      throw new Error('无法将其他分组改名为 primary');
    }
    if (groups.some(group => group.id === normalized && group !== entry)) {
      throw new Error(`分组标识「${normalized}」已存在`);
    }
    const previousId = entry.id;
    entry.id = normalized;
    targetId = normalized;
    for (const item of registry.items) {
      if (normalizeNavGroupId(item.navGroupId, groups) === previousId) {
        item.navGroupId = normalized;
      }
    }
  }
  if (params?.label !== undefined) {
    const trimmed = String(params.label || '').trim();
    if (trimmed) entry.label = trimmed;
  }
  if (params?.type && entry.id !== 'primary') {
    entry.type = params.type === 'primary' ? 'primary' : 'dropdown';
  }
  if (params?.menuOrder !== undefined) {
    const orderNum = Number(params.menuOrder);
    if (Number.isFinite(orderNum)) entry.menuOrder = orderNum;
  }
  if (params?.link !== undefined) {
    const trimmed = String(params.link || '').trim();
    entry.link = trimmed || undefined;
  }
  registry.groups = groups;
  const written = writeCategoryRegistry(registry);
  const navSync = safeSyncCategoryNav();
  const group = written.groups.find(item => item.id === targetId) || null;
  return { group, registry: written, navSync };
}

export function deleteNavGroup(id) {
  const registry = loadCategoryRegistry();
  const groups = Array.isArray(registry.groups) ? registry.groups : [];
  const targetId = slugifyGroupId(id);
  if (!targetId || targetId === 'primary') {
    throw new Error('无法删除主导航分组');
  }
  const index = groups.findIndex(group => group.id === targetId);
  if (index === -1) {
    throw new Error(`未找到分组「${targetId}」`);
  }
  const inUse = registry.items.some(item => normalizeNavGroupId(item.navGroupId, groups) === targetId);
  if (inUse) {
    throw new Error(`分组「${targetId}」仍有关联分类，无法删除`);
  }
  groups.splice(index, 1);
  registry.groups = groups;
  const written = writeCategoryRegistry(registry);
  const navSync = safeSyncCategoryNav();
  return { removed: targetId, registry: written, navSync };
}
