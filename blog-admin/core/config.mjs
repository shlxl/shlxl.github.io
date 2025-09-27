import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PROJECT_ROOT = path.resolve(__dirname, '../..');
export const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');
export const BLOG_DIR = path.join(DOCS_DIR, 'blog');
export const VP_DIR = path.join(DOCS_DIR, '.vitepress');
export const PUBLIC_DIR = path.join(PROJECT_ROOT, 'blog-admin', 'public');
export const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts');

export const CATEGORY_REGISTRY_FILE = path.join(VP_DIR, 'categories.map.json');
export const CATEGORY_NAV_FILE = path.join(VP_DIR, 'categories.nav.json');
export const CATEGORY_REGISTRY_VERSION = 2;

export const PREVIEW_PORT = Number(process.env.PREVIEW_PORT || 4173);
export const DIST_DIR = path.join(DOCS_DIR, '.vitepress', 'dist');
export const TRASH_DIR = path.join(DOCS_DIR, '.trash');
export const LOCAL_DIR = path.join(BLOG_DIR, '_local');
