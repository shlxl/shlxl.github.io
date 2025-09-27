import {
  loadCategoryRegistry,
  collectCategoryOverview,
  writeCategoryRegistry,
  nextMenuOrder,
  rewriteCategoryReferences,
  renameRegistryTitle,
  removeRegistryByTitle,
  syncCategoryNavArtifacts,
  safeSyncCategoryNav,
  removeRegistryByDir,
  collectCategoryUsage
} from '../core/categories.mjs';
import { readBody, send } from '../lib/http-utils.mjs';
import { BLOG_DIR } from '../core/config.mjs';
import path from 'node:path';
import fs from 'node:fs';

async function getCategories(req, res) {
  try {
    const registry = loadCategoryRegistry();
    const usage = collectCategoryOverview();
    const items = registry.items.map(entry => {
      const title = String(entry.title || '').trim();
      const stats = usage.get(title) || { total: 0, published: 0, latestPublished: null, latestAny: null };
      const dirKey = (entry.dir || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
      let absDir = '';
      let hasDirectory = false;
      let hasIndex = false;
      let indexAbs = '';
      if (dirKey) {
        absDir = path.join(BLOG_DIR, dirKey);
        try {
          if (fs.existsSync(absDir) && fs.statSync(absDir).isDirectory()) {
            hasDirectory = true;
            indexAbs = path.join(absDir, 'index.md');
            if (fs.existsSync(indexAbs) && fs.statSync(indexAbs).isFile()) {
              hasIndex = true;
            }
          }
        } catch { } // ignore errors
      }
      const issues = [];
      if (dirKey && !hasDirectory) issues.push('missing-dir');
      if (hasDirectory && !hasIndex) issues.push('missing-index');
      if (entry.publish === false) issues.push('unpublished');
      if (entry.menuEnabled === false) issues.push('menu-disabled');
      if ((stats.total || 0) === 0) issues.push('unused');
      const latestPublished = stats.latestPublished || null;
      const latestAny = stats.latestAny || null;
      return {
        id: dirKey || title,
        title,
        menuLabel: entry.menuLabel || title || dirKey,
        dir: dirKey,
        publish: entry.publish !== false,
        menuEnabled: entry.menuEnabled !== false,
        menuOrder: entry.menuOrder,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        postCount: stats.total || 0,
        publishedCount: stats.published || 0,
        latestPublishedAt: latestPublished?.at || '',
        latestPublishedRel: latestPublished?.rel || '',
        latestPublishedTitle: latestPublished?.title || '',
        latestPostAt: latestAny?.at || '',
        latestPostRel: latestAny?.rel || '',
        latestPostTitle: latestAny?.title || '',
        hasDirectory,
        hasIndex,
        dirPath: dirKey ? path.relative(path.resolve(BLOG_DIR, '..', '..'), absDir).replace(/\\/g, '/') : '',
        absDir: absDir || '',
        indexPath: hasIndex ? path.relative(path.resolve(BLOG_DIR, '..', '..'), indexAbs).replace(/\\/g, '/') : '',
        indexRel: hasIndex ? path.relative(BLOG_DIR, indexAbs).replace(/\\/g, '/') : '',
        link: '/blog/' + (dirKey ? `${dirKey.replace(/\/+$/, '')}/` : ''),
        issues
      };
    });
    const knownTitles = new Set(items.map(item => item.title));
    const orphans = [];
    for (const [title, bucket] of usage.entries()) {
      if (knownTitles.has(title)) continue;
      const latestPublished = bucket.latestPublished || null;
      const latestAny = bucket.latestAny || null;
      orphans.push({
        title,
        postCount: bucket.total || 0,
        publishedCount: bucket.published || 0,
        latestPublishedAt: latestPublished?.at || '',
        latestPublishedRel: latestPublished?.rel || '',
        latestPublishedTitle: latestPublished?.title || '',
        latestPostAt: latestAny?.at || '',
        latestPostRel: latestAny?.rel || '',
        latestPostTitle: latestAny?.title || ''
      });
    }
    orphans.sort((a, b) => (b.latestPostAt || '').localeCompare(a.latestPostAt || ''));
    send(res, 200, { ok: true, registry: { version: registry.version, updatedAt: registry.updatedAt }, items, orphans });
  } catch (e) {
    send(res, 500, { ok: false, error: e.message });
  }
}

async function createCategory(req, res) {
  try {
    const body = await readBody(req);
    const title = String(body.title || '').trim();
    const dir = (body.dir || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (!title) return send(res, 400, { ok: false, error: '缺少分类名称' });
    if (!dir) return send(res, 400, { ok: false, error: '缺少目录标识' });
    const registry = loadCategoryRegistry();
    if (registry.items.some(item => (item.dir || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') === dir)) {
      return send(res, 409, { ok: false, error: '目录已存在' });
    }
    if (registry.items.some(item => String(item.title || '').trim() === title)) {
      return send(res, 409, { ok: false, error: '分类名称已存在' });
    }
    const publish = body.publish === undefined ? true : !!body.publish;
    const menuEnabled = body.menuEnabled === undefined ? publish : !!body.menuEnabled;
    const now = new Date().toISOString();
    const menuOrder = Number.isFinite(Number(body.menuOrder)) ? Number(body.menuOrder) : nextMenuOrder(registry.items);
    registry.items.push({
      dir,
      title,
      menuLabel: String(body.menuLabel || '').trim() || title,
      publish,
      menuEnabled,
      menuOrder,
      createdAt: now,
      updatedAt: now
    });
    const written = writeCategoryRegistry(registry);
    const item = written.items.find(entry => (entry.dir || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') === dir);
    if (body.createDir !== false) {
      const absDir = path.join(BLOG_DIR, dir);
      fs.mkdirSync(absDir, { recursive: true });
    }
    const navSync = safeSyncCategoryNav();
    send(res, 200, { ok: true, item, navSync });
  } catch (e) {
    send(res, 500, { ok: false, error: e.message });
  }
}

async function updateCategory(req, res) {
  try {
    const body = await readBody(req);
    const originalDir = (body.dir || body.originalDir || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (!originalDir) return send(res, 400, { ok: false, error: '缺少分类目录标识' });
    const registry = loadCategoryRegistry();
    const idx = registry.items.findIndex(item => (item.dir || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') === originalDir);
    if (idx === -1) return send(res, 404, { ok: false, error: '分类不存在' });
    const entry = registry.items[idx];
    const oldTitle = String(entry.title || '').trim();
    const targetDir = (body.nextDir || body.dir || entry.dir).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    const desiredTitle = body.title !== undefined ? String(body.title || '').trim() : oldTitle;
    if (!desiredTitle) return send(res, 400, { ok: false, error: '分类名称不能为空' });
    if (!targetDir) return send(res, 400, { ok: false, error: '目录标识不能为空' });
    if (targetDir !== originalDir && registry.items.some((item, i) => i !== idx && (item.dir || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') === targetDir)) {
      return send(res, 409, { ok: false, error: '目标目录已存在' });
    }
    if (desiredTitle !== oldTitle && registry.items.some((item, i) => i !== idx && String(item.title || '').trim() === desiredTitle)) {
      return send(res, 409, { ok: false, error: '分类名称冲突' });
    }
    const publish = body.publish === undefined ? entry.publish : !!body.publish;
    const menuEnabled = body.menuEnabled === undefined ? entry.menuEnabled : !!body.menuEnabled;
    const menuOrder = body.menuOrder !== undefined && Number.isFinite(Number(body.menuOrder))
      ? Number(body.menuOrder)
      : entry.menuOrder;
    const menuLabelInput = body.menuLabel !== undefined ? String(body.menuLabel || '').trim() : null;
    const ensureDir = body.ensureDir === false ? false : true;
    let dirMove = null;
    if (targetDir !== originalDir) {
      const srcDir = path.join(BLOG_DIR, originalDir);
      const dstDir = path.join(BLOG_DIR, targetDir);
      if (fs.existsSync(dstDir)) {
        return send(res, 409, { ok: false, error: '目标目录已存在于文件系统' });
      }
      if (fs.existsSync(srcDir)) {
        fs.mkdirSync(path.dirname(dstDir), { recursive: true });
        fs.renameSync(srcDir, dstDir);
        dirMove = { from: path.relative(path.resolve(BLOG_DIR, '..', '..'), srcDir).replace(/\\/g, '/'), to: path.relative(path.resolve(BLOG_DIR, '..', '..'), dstDir).replace(/\\/g, '/') };
      } else if (ensureDir) {
        fs.mkdirSync(dstDir, { recursive: true });
      }
    }
    const now = new Date().toISOString();
    entry.dir = targetDir;
    entry.title = desiredTitle;
    if (menuLabelInput !== null) {
      entry.menuLabel = menuLabelInput || desiredTitle || targetDir;
    } else if (!entry.menuLabel) {
      entry.menuLabel = desiredTitle || targetDir;
    }
    entry.publish = publish;
    entry.menuEnabled = menuEnabled;
    entry.menuOrder = menuOrder;
    entry.updatedAt = now;
    let rewrite = null;
    if (desiredTitle !== oldTitle && body.rewrite === false) {
      // skip rewrite
    } else if (desiredTitle !== oldTitle) {
      rewrite = rewriteCategoryReferences({ from: oldTitle, to: desiredTitle, mode: 'rename' });
    }
    const written = writeCategoryRegistry(registry);
    const item = written.items.find(it => (it.dir || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') === targetDir);
    const navSync = safeSyncCategoryNav();
    send(res, 200, { ok: true, item, dirMove, rewrite, navSync });
  } catch (e) {
    send(res, 500, { ok: false, error: e.message });
  }
}

async function toggleCategory(req, res) {
  try {
    const body = await readBody(req);
    const dir = (body.dir || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (!dir) return send(res, 400, { ok: false, error: '缺少分类目录标识' });
    const fieldRaw = String(body.field || '').trim();
    const field = fieldRaw === 'menu' ? 'menuEnabled' : fieldRaw || 'publish';
    if (!['publish', 'menuEnabled'].includes(field)) {
      return send(res, 400, { ok: false, error: '不支持的字段' });
    }
    const registry = loadCategoryRegistry();
    const entry = registry.items.find(item => (item.dir || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') === dir);
    if (!entry) return send(res, 404, { ok: false, error: '分类不存在' });
    entry[field] = !!body.value;
    entry.updatedAt = new Date().toISOString();
    const written = writeCategoryRegistry(registry);
    const item = written.items.find(it => (it.dir || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') === dir);
    const navSync = safeSyncCategoryNav();
    send(res, 200, { ok: true, item, navSync });
  } catch (e) {
    send(res, 500, { ok: false, error: e.message });
  }
}

async function deleteCategory(req, res) {
  try {
    const body = await readBody(req);
    const dir = (body.dir || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (!dir) return send(res, 400, { ok: false, error: '缺少分类目录标识' });
    const registry = loadCategoryRegistry();
    const entry = registry.items.find(item => (item.dir || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') === dir);
    if (!entry) return send(res, 404, { ok: false, error: '分类不存在' });
    const title = String(entry.title || '').trim();
    if (title) {
      const usage = collectCategoryUsage(title);
      if (usage.total > 0) {
        const checklist = {
          category: title,
          dir,
          total: usage.total,
          posts: usage.posts.map(p => ({ rel: p.rel, title: p.title, publish: p.publish, draft: p.draft, isLocal: p.isLocal })),
          instructions:
            [
              '1. 运行“分类批处理”任务：重命名或移除该分类。',
              '2. 确认所有文章的 categories frontmatter 已完成迁移。',
              '3. 再次尝试删除该分类。'
            ],
          jobEndpoint: '/api/categories/rewrite'
        };
        return send(res, 409, { ok: false, error: `分类「${title}」仍被 ${usage.total} 篇文章引用，已阻止删除。`, checklist });
      }
    }
    removeRegistryByDir(dir);
    let removedIndex = null;
    if (body.hard) {
      const absDir = entry.dir ? path.join(BLOG_DIR, entry.dir) : '';
      if (absDir && fs.existsSync(absDir)) {
        try {
          const contents = fs.readdirSync(absDir);
          if (!contents.length) {
            fs.rmdirSync(absDir);
          } else if (contents.length === 1 && contents[0].toLowerCase() === 'index.md') {
            const indexFile = path.join(absDir, contents[0]);
            const trashed = moveToTrash(indexFile); // Assuming moveToTrash is defined elsewhere
            removedIndex = { trashed: path.basename(trashed) };
            const remaining = fs.readdirSync(absDir);
            if (!remaining.length) fs.rmdirSync(absDir);
          }
        } catch { } // ignore errors
      }
    }
    const navSync = safeSyncCategoryNav();
    send(res, 200, { ok: true, removedIndex, navSync });
  } catch (e) {
    send(res, 500, { ok: false, error: e.message });
  }
}

async function rewriteCategory(req, res) {
  try {
    const body = await readBody(req);
    const from = String(body.from || body.category || '').trim();
    const mode = body.mode === 'remove' ? 'remove' : 'rename';
    const dryRun = !!body.dryRun;
    const to = mode === 'rename' ? String(body.to || '').trim() : '';
    if (!from) return send(res, 400, { ok: false, error: 'missing from' });
    if (mode === 'rename' && !to) return send(res, 400, { ok: false, error: 'missing to' });
    const result = rewriteCategoryReferences({ from, to, mode, dryRun });
    if (!dryRun) {
      if (mode === 'rename') {
        renameRegistryTitle(from, to);
      } else {
        removeRegistryByTitle(from);
      }
    }
    const summary = mode === 'rename'
      ? `${dryRun ? '预览' : '更新'} ${result.updated} 篇：${from} → ${to}`
      : `${dryRun ? '预览' : '更新'} ${result.updated} 篇：移除 ${from}`;
    const files = result.files.map(f => ({ rel: f.rel, before: f.before, after: f.after }));
    send(res, 200, { ok: true, from, to, mode, dryRun, updated: result.updated, files, summary });
  } catch (e) {
    send(res, 500, { ok: false, error: e.message });
  }
}

async function syncNav(req, res) {
  try {
    const result = syncCategoryNavArtifacts();
    send(res, 200, { ok: true, ...result });
  } catch (e) {
    send(res, 500, { ok: false, error: e.message });
  }
}

export {
  getCategories as apiCategories,
  createCategory as apiCategoriesCreate,
  updateCategory as apiCategoriesUpdate,
  toggleCategory as apiCategoriesToggle,
  deleteCategory as apiCategoriesDelete,
  rewriteCategory as apiCategoryRewrite,
  syncNav as apiCategoriesNavSync
};