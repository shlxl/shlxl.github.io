import fs from 'node:fs';
import path from 'node:path';
import {
  BLOG_DIR,
  PROJECT_ROOT
} from './config.mjs';
import {
  relOf,
  isSection,
  slugOf,
  parseFM,
  updateFrontmatter,
  setPublishFlag,
  walkMd,
  typeOf,
  moveToTrash
} from './fs-utils.mjs';
import { runNodeScript } from '../lib/process.mjs';
import { registryEntryByDir, removeRegistryByDir, removeRegistryByTitle, touchRegistryEntry, renameRegistryTitle, collectCategoryUsage, rewriteCategoryReferences, normalizeDirKey } from './categories.mjs';

// #region Core Post Functions
export function listPosts() {
  const files = walkMd(BLOG_DIR);
  const items = files.map(f => {
    const txt = fs.readFileSync(f, 'utf8');
    const fm = parseFM(txt);
    const rel = relOf(f);
    const itemType = typeOf(rel, f, fm);
    const hidden = itemType === 'page' ? true : false;
    return {
      slug: path.basename(f).replace(/\.md$/i, ''),
      path: path.relative(PROJECT_ROOT, f).replace(/\\/g, '/'),
      rel,
      abs: f,
      title: fm.title || path.basename(f).replace(/\.md$/i, ''),
      date: fm.date || '',
      publish: fm.publish === true,
      draft: fm.draft === true,
      tags: fm.tags || [],
      categories: fm.categories || [],
      cover: fm.cover || '',
      kind: isSection(f) ? 'section' : 'post', // 保持向后兼容
      type: itemType, // 新字段
      hidden // 新字段
    };
  });
  items.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return items;
}

export async function updateMeta(rel, patch) {
  let file = rel ? path.join(BLOG_DIR, rel) : '';
  if (!rel || !fs.existsSync(file)) {
    const files = walkMd(BLOG_DIR, []);
    const hit = files.find(f => path.basename(f).toLowerCase() === (String(patch.slug || '') + '.md').toLowerCase());
    file = hit || '';
  }
  if (!file) throw new Error('target not found');

  const beforeTxt = fs.readFileSync(file, 'utf8');
  const beforeFm = parseFM(beforeTxt);

  updateFrontmatter(file, patch || {});

  const afterTxt = fs.readFileSync(file, 'utf8');
  const afterFm = parseFM(afterTxt);
  let rewrite = null;

  if (isSection(file)) {
    const relFile = relOf(file);
    const dir = normalizeDirKey(relFile.replace(/\/?index\.md$/i, ''));
    if (dir) touchRegistryEntry(dir, { title: afterFm.title || beforeFm.title || path.basename(dir), publish: afterFm.publish === true });
    const from = String(beforeFm.title || '').trim();
    const to = String(afterFm.title || '').trim();
    if (from && to && from !== to) {
      rewrite = rewriteCategoryReferences({ from, to, mode: 'rename', exclude: [file] });
      renameRegistryTitle(from, to);
    }
  }

  return { file: relOf(file), rewrite };
}

export async function removePost(rel, hard) {
  const t = rel ? path.join(BLOG_DIR, rel) : '';
  if (!t || !fs.existsSync(t)) throw new Error('target not found');

  if (isSection(t)) {
    const relPath = relOf(t);
    const relDir = normalizeDirKey(relPath.replace(/\/?index\.md$/i, ''));
    let categoryTitle = '';
    if (relDir) {
      const entry = registryEntryByDir(relDir);
      if (entry?.title) categoryTitle = String(entry.title).trim();
    }
    if (!categoryTitle) {
      try {
        const fm = parseFM(fs.readFileSync(t, 'utf8'));
        categoryTitle = String(fm.title || '').trim();
      } catch { } 
    }
    if (hard) {
      if (categoryTitle) {
        const usage = collectCategoryUsage(categoryTitle);
        if (usage.total > 0) {
          const checklist = {
            category: categoryTitle,
            dir: relDir,
            rel: relPath,
            total: usage.total,
            posts: usage.posts.map(p => ({ rel: p.rel, title: p.title, publish: p.publish, draft: p.draft, isLocal: p.isLocal })),
            instructions: [
              '1. 运行“分类批处理”任务：重命名或移除该分类。',
              '2. 确认所有文章的 categories frontmatter 已完成迁移。',
              '3. 再次尝试删除分类 index.md。'
            ],
            jobEndpoint: '/api/categories/rewrite'
          };
          throw Object.assign(new Error(`分类「${categoryTitle}」仍被 ${usage.total} 篇文章引用，已阻止删除。`), { checklist, code: 409 });
        }
      }
      const dst = moveToTrash(t);
      if (relDir) removeRegistryByDir(relDir);
      if (categoryTitle) removeRegistryByTitle(categoryTitle);
      return { trash: dst };
    } else {
      setPublishFlag(t, false);
      if (relDir) touchRegistryEntry(relDir, { publish: false });
      return { success: true };
    }
  }

  // For regular posts, delegate to the script
  const args = [slugOf(t)];
  if (hard) args.push('--hard');
  const { out } = await runNodeScript('post-remove.mjs', args);
  return { out: out.trim() };
}

export async function archivePost(rel) {
  const t = rel ? path.join(BLOG_DIR, rel) : '';
  if (!t || !fs.existsSync(t)) throw new Error('target not found');
  if (isSection(t)) {
    setPublishFlag(t, false);
    return { mode: 'section' };
  }
  const { out } = await runNodeScript('post-archive.mjs', [slugOf(t)]);
  return { out: out.trim(), mode: 'post' };
}

export async function republishPost(rel) {
  const t = rel ? path.join(BLOG_DIR, rel) : '';
  if (!t || !fs.existsSync(t)) throw new Error('target not found');
  setPublishFlag(t, true);
  return { success: true };
}

export async function promotePost(rel, setDate) {
  const t = rel ? path.join(BLOG_DIR, rel) : '';
  if (!t || !fs.existsSync(t)) throw new Error('target not found');
  if (isSection(t)) throw new Error('section cannot be promoted');
  const args = [slugOf(t)];
  if (setDate) args.push('--set-date');
  const { out } = await runNodeScript('post-promote.mjs', args);
  return { out: out.trim() };
}

export async function newLocalPost(body) {
  const args = [];
  if (body.title) args.push('--title', String(body.title));
  if (body.desc) args.push('--desc', String(body.desc));
  if (body.tags) args.push('--tags', Array.isArray(body.tags) ? body.tags.join(',') : String(body.tags));
  if (body.cat) args.push('--cat', String(body.cat));
  if (body.slug) args.push('--slug', String(body.slug));
  if (body.cover) args.push('--cover', String(body.cover));
  const { out } = await runNodeScript('new-post-local.mjs', args);
  return { out: out.trim() };
}
// #endregion
