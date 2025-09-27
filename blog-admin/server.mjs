import { createServer } from 'node:http';
import { parse as parseUrl } from 'node:url';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

import { apiLogin, apiLogout, ensureAuth } from './lib/auth.mjs';
import { notFound, send } from './lib/http-utils.mjs';
import { 
    apiList, 
    apiNewLocal, 
    apiPromote, 
    apiArchive, 
    apiRepublish, 
    apiRemove, 
    apiUpdateMeta, 
    apiTrashList, 
    apiTrashRestore, 
    apiTrashDelete 
} from './api/posts.mjs';
import { 
    apiCategories, 
    apiCategoriesCreate, 
    apiCategoriesUpdate, 
    apiCategoriesToggle, 
    apiCategoriesDelete, 
    apiCategoryRewrite, 
    apiCategoriesNavSync 
} from './api/categories.mjs';
import { apiBuild, apiPreview, apiDeploy, apiAliases } from './api/system.mjs';
import { PUBLIC_DIR, PROJECT_ROOT } from './core/config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 5174);
const HOST = process.env.HOST || '127.0.0.1';

function serveStatic(req, res) {
  const { pathname } = parseUrl(req.url);
  let p = pathname || '/';
  if (p === '/') p = 'index.html';
  if (p.startsWith('/')) p = p.slice(1);
  const file = path.join(PUBLIC_DIR, p);
  if (!file.startsWith(PUBLIC_DIR)) return notFound(res);
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    const ext = path.extname(file).toLowerCase();
    const map = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
    res.writeHead(200, { 'Content-Type': map[ext] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } else {
    if (p === 'favicon.ico') {
      res.writeHead(204);
      return res.end();
    }
    notFound(res);
  }
}

const server = createServer(async (req, res) => {
  const { pathname } = parseUrl(req.url);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  try {
    if (req.method === 'POST' && pathname === '/api/login') return apiLogin(req, res);

    const protectedApi = pathname?.startsWith('/api/') && pathname !== '/api/login';
    if (protectedApi) {
      const session = ensureAuth(req, res);
      if (!session) return;
      req.session = session;
    }

    if (req.method === 'POST' && pathname === '/api/logout') return apiLogout(req, res);
    if (req.method === 'GET' && pathname === '/api/list') return apiList(req, res);
    if (req.method === 'POST' && pathname === '/api/new-local') return apiNewLocal(req, res);
    if (req.method === 'POST' && pathname === '/api/promote') return apiPromote(req, res);
    if (req.method === 'POST' && pathname === '/api/archive') return apiArchive(req, res);
    if (req.method === 'POST' && pathname === '/api/republish') return apiRepublish(req, res);
    if (req.method === 'POST' && pathname === '/api/remove') return apiRemove(req, res);
    if (req.method === 'POST' && pathname === '/api/update-meta') return apiUpdateMeta(req, res);
    if (req.method === 'GET' && pathname === '/api/trash') return apiTrashList(req, res);
    if (req.method === 'POST' && pathname === '/api/trash/restore') return apiTrashRestore(req, res);
    if (req.method === 'POST' && pathname === '/api/trash/delete') return apiTrashDelete(req, res);
    if (req.method === 'POST' && pathname === '/api/aliases') return apiAliases(req, res);

    if (req.method === 'GET' && pathname === '/api/categories') return apiCategories(req, res);
    if (req.method === 'POST' && pathname === '/api/categories/create') return apiCategoriesCreate(req, res);
    if (req.method === 'POST' && pathname === '/api/categories/update') return apiCategoriesUpdate(req, res);
    if (req.method === 'POST' && pathname === '/api/categories/toggle') return apiCategoriesToggle(req, res);
    if (req.method === 'POST' && pathname === '/api/categories/delete') return apiCategoriesDelete(req, res);
    if (req.method === 'POST' && pathname === '/api/categories/rewrite') return apiCategoryRewrite(req, res);
    if (req.method === 'POST' && pathname === '/api/categories/nav-sync') return apiCategoriesNavSync(req, res);

    if (req.method === 'POST' && pathname === '/api/build') return apiBuild(req, res);
    if (req.method === 'POST' && pathname === '/api/preview') return apiPreview(req, res);
    if (req.method === 'POST' && pathname === '/api/deploy') return apiDeploy(req, res);

    return serveStatic(req, res);
  } catch (e) {
    send(res, 500, { ok: false, error: e.message });
  }
});

const shouldListen = process.env.ADMIN_SERVER_DISABLE_LISTEN !== '1';
if (shouldListen) {
  server.listen(PORT, HOST, () => {
    console.log(`[admin] running   : http://${HOST}:${PORT}`);
    console.log(`[admin] PROJECT_ROOT: ${PROJECT_ROOT}`);
    console.log(`[admin] PUBLIC_DIR  : ${PUBLIC_DIR}`);
  });
}