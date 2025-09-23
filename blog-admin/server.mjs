#!/usr/bin/env node
import { createServer } from 'node:http';
import { parse as parseUrl } from 'node:url';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 5174);
const HOST = process.env.HOST || '127.0.0.1';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');
const BLOG_DIR = path.join(DOCS_DIR, 'blog');
const VP_DIR = path.join(DOCS_DIR, '.vitepress');
const PUBLIC_DIR = path.join(__dirname, 'public');
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts');
const CATEGORY_REGISTRY_FILE = path.join(VP_DIR, 'categories.map.json');
const CATEGORY_NAV_FILE = path.join(VP_DIR, 'categories.nav.json');
const CATEGORY_REGISTRY_VERSION = 2;

const PREVIEW_PORT = Number(process.env.PREVIEW_PORT || 4173);
const DIST_DIR = path.join(DOCS_DIR, '.vitepress', 'dist');
const TRASH_DIR = path.join(DOCS_DIR, '.trash');
const LOCAL_DIR = path.join(BLOG_DIR, '_local');

const RAW_ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || process.env.BLOG_ADMIN_PASSWORD || process.env.ADMIN_PASS || '').trim();
const ADMIN_PASSWORD = RAW_ADMIN_PASSWORD;
const FALLBACK_PASSWORD = ADMIN_PASSWORD ? '' : (process.env.ADMIN_PASSWORD_FALLBACK || 'admin');
const SESSION_TTL_MS = Number(process.env.ADMIN_SESSION_TTL || (12 * 60 * 60 * 1000));
if(!ADMIN_PASSWORD){
  console.warn('[admin] ADMIN_PASSWORD not set, using fallback password "admin". Set ADMIN_PASSWORD to override.');
}
const SESSIONS = new Map();

const JSON_HEADERS = {
  'Content-Type':'application/json; charset=utf-8',
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'Content-Type, Authorization',
  'Access-Control-Allow-Methods':'GET,POST,OPTIONS'
};

function send(res, code, data){ res.writeHead(code, JSON_HEADERS); res.end(typeof data==='string'?data:JSON.stringify(data)); }
function notFound(res){ send(res,404,{ok:false,error:'Not found'}); }
function readBody(req){ return new Promise((resolve,reject)=>{ let s=''; req.on('data',d=>s+=d); req.on('end',()=>{ try{ resolve(s?JSON.parse(s):{});}catch{reject(new Error('Invalid JSON'));} }); req.on('error',reject); }); }
function runCmd(cmd, args=[], opts={cwd: PROJECT_ROOT}){
  return new Promise((resolve,reject)=>{
    const p = spawn(cmd, args, { cwd: opts.cwd, shell: process.platform==='win32', env: process.env });
    let out='', err=''; p.stdout.on('data', d=> out+=String(d)); p.stderr.on('data', d=> err+=String(d));
    p.on('close', c=> c===0 ? resolve({out,err}) : reject(Object.assign(new Error('fail'),{out,err,code:c})));
    p.on('error', reject);
  });
}
const runNodeScript = (rel, args=[]) => runCmd(process.execPath, [path.join(SCRIPTS_DIR, rel), ...args]);

function cleanupSessions(){
  const now = Date.now();
  for(const [token, session] of SESSIONS){
    if(!session || session.expiresAt <= now) SESSIONS.delete(token);
  }
}
function verifyPassword(password){
  const target = ADMIN_PASSWORD || FALLBACK_PASSWORD;
  if(!target) return false;
  return String(password || '').trim() === target;
}
function createSession(){
  cleanupSessions();
  const token = randomUUID();
  const session = { token, expiresAt: Date.now() + SESSION_TTL_MS };
  SESSIONS.set(token, session);
  return session;
}
function tokenFromReq(req){
  const auth = req.headers?.authorization || req.headers?.Authorization || '';
  if(typeof auth === 'string'){
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if(m) return m[1].trim();
  }
  return '';
}
function ensureSession(token){
  if(!token) return null;
  const session = SESSIONS.get(token);
  if(!session) return null;
  if(session.expiresAt <= Date.now()){
    SESSIONS.delete(token);
    return null;
  }
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return session;
}
function ensureAuth(req,res){
  const token = tokenFromReq(req);
  const session = ensureSession(token);
  if(!session){
    unauthorized(res);
    return null;
  }
  return session;
}
function unauthorized(res){ send(res,401,{ok:false,error:'未授权或登录已过期'}); }

async function apiLogin(req,res){
  try{
    const body = await readBody(req);
    if(!verifyPassword(body.password)){
      return send(res,401,{ok:false,error:'密码错误'});
    }
    const session = createSession();
    send(res,200,{ok:true,token:session.token,ttl:SESSION_TTL_MS});
  }catch(e){ send(res,500,{ok:false,error:e.message}); }
}
async function apiLogout(req,res){
  const token = tokenFromReq(req);
  if(token) SESSIONS.delete(token);
  send(res,200,{ok:true});
}

const relOf  = p=> path.relative(BLOG_DIR, p).replace(/\\/g,'/');
const isSection = p => path.basename(p).toLowerCase()==='index.md';
const slugOf = p=> path.basename(p).replace(/\.md$/i,'');

// ---- frontmatter utils ----
function parseFM(txt=''){
  const m = /^---\s*([\s\S]*?)\s*---/m.exec(txt);
  const fm = {title:'',date:'',publish:undefined,draft:undefined,tags:[],categories:[],cover:'',list:undefined,hidden:undefined,type:undefined};
  if(!m) return fm;
  const h = m[1];
  const get = k=>{ const re=new RegExp('^\\s*'+k+'\\s*:\\s*(.*)$','mi'); const mm=re.exec(h); return mm? mm[1].trim() : '' };
  const list = k=> get(k).replace(/^\[|\]$/g,'').split(',').map(s=>s.trim().replace(/^["']|["']$/g,'')).filter(Boolean);
  fm.title = get('title').replace(/^["']|["']$/g,'');
  fm.date = get('date').replace(/^["']|["']$/g,'');
  fm.cover = get('cover').replace(/^["']|["']$/g,'');
  fm.publish = (/^\s*publish\s*:\s*(true|false)/mi.exec(h)||[])[1];
  fm.draft = (/^\s*draft\s*:\s*(true|false)/mi.exec(h)||[])[1];
  fm.list = (/^\s*list\s*:\s*(true|false|0|1)/mi.exec(h)||[])[1];
  fm.hidden = (/^\s*hidden\s*:\s*(true|false)/mi.exec(h)||[])[1];
  fm.type = (get('type') || '').replace(/^['"]|['"]$/g,'');
  try{ fm.tags = list('tags'); }catch{}; try{ fm.categories = list('categories'); }catch{};
  return fm;
}
function updateFrontmatter(file, patch={}){
  const FM = /^---\s*([\s\S]*?)\s*---/m;
  const read = fs.readFileSync(file,'utf8');
  const m = FM.exec(read);
  if(!m) throw new Error('frontmatter missing: '+file);
  let head = m[1];
  const put = (k, v) => {
    if (v === undefined || v === null) return;
    const re = new RegExp(`^\\s*${k}\\s*:\\s*.*$`,'mi');
    const val = Array.isArray(v) ? `[${v.map(x=>String(x)).join(', ')}]` : String(v);
    head = re.test(head) ? head.replace(re, `${k}: ${val}`) : (head + `\n${k}: ${val}`);
  };
  for (const [k,v] of Object.entries(patch||{})) put(k, v);
  const out = read.replace(FM, `---\n${head.trim()}\n---`); fs.writeFileSync(file, out, 'utf8');
}
function setPublishFlag(file, publish){
  updateFrontmatter(file, { publish: publish ? 'true' : 'false', draft: publish ? 'false' : undefined });
}

// ---- category registry helpers ----
function normalizeDirKey(dir=''){
  return String(dir||'').replace(/\\/g,'/').replace(/^\/+|\/+$/g,'');
}
function coerceIso(value, fallback){
  if(value){
    try{
      const t = new Date(value).getTime();
      if(Number.isFinite(t)) return new Date(t).toISOString();
    }catch{}
  }
  if(fallback) return fallback;
  return new Date().toISOString();
}
function extractRegistryCandidates(raw){
  if(Array.isArray(raw)) return raw;
  if(raw && Array.isArray(raw.items)) return raw.items;
  if(raw && Array.isArray(raw.categories)) return raw.categories;
  if(raw && typeof raw === 'object'){
    return Object.entries(raw)
      .filter(([,v])=>typeof v === 'string')
      .map(([title, dir])=>({ title, dir }));
  }
  return [];
}
function normalizeCategoryEntry(entry, index, fallbackDate){
  if(!entry || typeof entry !== 'object') return null;
  const dir = normalizeDirKey(entry.dir || entry.path || entry.rel || entry.slug || '');
  let title = '';
  if(typeof entry.title === 'string') title = entry.title.trim();
  else if(typeof entry.text === 'string') title = entry.text.trim();
  else if(typeof entry.name === 'string') title = entry.name.trim();
  let menuLabel = '';
  if(typeof entry.menuLabel === 'string') menuLabel = entry.menuLabel.trim();
  else if(typeof entry.navLabel === 'string') menuLabel = entry.navLabel.trim();
  else if(typeof entry.label === 'string') menuLabel = entry.label.trim();
  const publish = entry.publish === undefined ? true : !!entry.publish;
  let menuEnabled;
  if(entry.menuEnabled !== undefined) menuEnabled = !!entry.menuEnabled;
  else if(entry.navEnabled !== undefined) menuEnabled = !!entry.navEnabled;
  else if(entry.enabled !== undefined) menuEnabled = !!entry.enabled;
  else if(entry.visible === false || entry.publish === false) menuEnabled = false;
  else menuEnabled = true;
  let menuOrder = Number(entry.menuOrder);
  if(!Number.isFinite(menuOrder)) menuOrder = index + 1;
  const fallback = coerceIso(fallbackDate, undefined);
  const createdAt = coerceIso(entry.createdAt || entry.lastUpdated, fallback);
  const updatedAt = coerceIso(entry.updatedAt || entry.lastUpdated, fallback);
  if(!dir && !title && !menuLabel) return null;
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
function dedupeRegistryItems(items, fallbackDate){
  const map = new Map();
  const fallback = coerceIso(fallbackDate, undefined);
  for(const entry of items){
    const key = normalizeDirKey(entry.dir);
    if(!key) continue;
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
    if(map.has(key)){
      const existing = map.get(key);
      const prev = new Date(existing.updatedAt || existing.createdAt || fallback).getTime();
      const next = new Date(updatedAt).getTime();
      if(Number.isFinite(next) && (!Number.isFinite(prev) || next >= prev)){
        map.set(key, normalized);
      }
    }else{
      map.set(key, normalized);
    }
  }
  return Array.from(map.values());
}
function normalizeMenuOrder(items){
  const sorted = items.slice().sort((a,b)=>{
    const oa = Number(a.menuOrder);
    const ob = Number(b.menuOrder);
    const fa = Number.isFinite(oa);
    const fb = Number.isFinite(ob);
    if(fa && fb && oa !== ob) return oa - ob;
    if(fa && !fb) return -1;
    if(!fa && fb) return 1;
    return (a.title||'').localeCompare(b.title||'');
  });
  const seen = new Set();
  let nextOrder = 1;
  return sorted.map(item=>{
    let order = Number(item.menuOrder);
    if(!Number.isFinite(order) || order < 1) order = nextOrder;
    while(seen.has(order)) order++;
    seen.add(order);
    if(order >= nextOrder) nextOrder = order + 1;
    return { ...item, menuOrder: order };
  });
}
function prepareCategoryRegistry(raw, now = new Date().toISOString()){
  const baseline = raw && typeof raw === 'object' ? raw : { items: [] };
  const fallback = coerceIso(baseline.updatedAt, now);
  const candidates = extractRegistryCandidates(baseline);
  const normalized = candidates
    .map((entry, idx)=>normalizeCategoryEntry(entry, idx, fallback))
    .filter(Boolean);
  const deduped = dedupeRegistryItems(normalized, fallback);
  const ordered = normalizeMenuOrder(deduped);
  return {
    version: CATEGORY_REGISTRY_VERSION,
    updatedAt: coerceIso(baseline.updatedAt, fallback),
    items: ordered
  };
}
function backupCategoryRegistryFile(snapshot=''){
  try{
    if(!fs.existsSync(CATEGORY_REGISTRY_FILE)) return null;
    const dir = path.dirname(CATEGORY_REGISTRY_FILE);
    const pad = n=>String(n).padStart(2,'0');
    const t = new Date();
    const stamp = `${t.getFullYear()}${pad(t.getMonth()+1)}${pad(t.getDate())}${pad(t.getHours())}${pad(t.getMinutes())}${pad(t.getSeconds())}`;
    const name = `categories.map.json.bak-${stamp}`;
    const file = path.join(dir, name);
    const payload = snapshot || fs.readFileSync(CATEGORY_REGISTRY_FILE,'utf8');
    fs.writeFileSync(file, payload, 'utf8');
    return file;
  }catch{
    return null;
  }
}
function loadCategoryRegistry(){
  let rawText = '';
  let parsed = null;
  try{
    if(fs.existsSync(CATEGORY_REGISTRY_FILE)){
      rawText = fs.readFileSync(CATEGORY_REGISTRY_FILE,'utf8');
      if(rawText.trim()) parsed = JSON.parse(rawText);
    }
  }catch{
    parsed = null;
  }
  const registry = prepareCategoryRegistry(parsed || { items: [] });
  const version = Number(parsed?.version || (Array.isArray(parsed) ? 1 : 0));
  if(version !== CATEGORY_REGISTRY_VERSION && rawText){
    backupCategoryRegistryFile(rawText);
    return writeCategoryRegistry(registry);
  }
  if(!fs.existsSync(CATEGORY_REGISTRY_FILE)){
    writeCategoryRegistry(registry);
  }
  return registry;
}
function writeCategoryRegistry(registry){
  const now = new Date().toISOString();
  const prepared = prepareCategoryRegistry({ ...(registry||{}), updatedAt: now }, now);
  prepared.updatedAt = now;
  fs.mkdirSync(path.dirname(CATEGORY_REGISTRY_FILE), { recursive:true });
  fs.writeFileSync(CATEGORY_REGISTRY_FILE, JSON.stringify(prepared, null, 2), 'utf8');
  return prepared;
}
function nextMenuOrder(items){
  let max = 0;
  for(const entry of items || []){
    const n = Number(entry.menuOrder);
    if(Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}
function touchRegistryEntry(dir, patch={}){
  const normalizedDir = normalizeDirKey(dir);
  if(!normalizedDir) return null;
  const registry = loadCategoryRegistry();
  const now = new Date().toISOString();
  let entry = registry.items.find(item=>normalizeDirKey(item.dir)===normalizedDir);
  if(!entry){
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
  if(patch.title !== undefined){
    const value = String(patch.title||'').trim();
    entry.title = value || entry.title || normalizedDir;
  }
  if(patch.menuLabel !== undefined){
    const value = String(patch.menuLabel||'').trim();
    entry.menuLabel = value || entry.title || normalizedDir;
  }else if(!entry.menuLabel){
    entry.menuLabel = entry.title || normalizedDir;
  }
  if(patch.publish !== undefined) entry.publish = !!patch.publish;
  if(patch.menuEnabled !== undefined) entry.menuEnabled = !!patch.menuEnabled;
  if(patch.menuOrder !== undefined){
    const order = Number(patch.menuOrder);
    if(Number.isFinite(order)) entry.menuOrder = order;
  }
  entry.updatedAt = now;
  if(!entry.createdAt) entry.createdAt = now;
  const written = writeCategoryRegistry(registry);
  return written.items.find(item=>normalizeDirKey(item.dir)===normalizedDir) || null;
}
function renameRegistryDir(oldDir, newDir){
  const from = normalizeDirKey(oldDir);
  const to = normalizeDirKey(newDir);
  if(!from || !to) return null;
  const registry = loadCategoryRegistry();
  const idx = registry.items.findIndex(item=>normalizeDirKey(item.dir)===from);
  if(idx===-1) return null;
  if(registry.items.some((item,i)=>i!==idx && normalizeDirKey(item.dir)===to)) return null;
  registry.items[idx].dir = to;
  registry.items[idx].updatedAt = new Date().toISOString();
  const written = writeCategoryRegistry(registry);
  return written.items.find(item=>normalizeDirKey(item.dir)===to) || null;
}
function renameRegistryTitle(oldTitle, newTitle){
  const from = String(oldTitle||'').trim();
  const to = String(newTitle||'').trim();
  if(!from || !to) return null;
  const registry = loadCategoryRegistry();
  const entry = registry.items.find(item=>String(item.title||'').trim()===from);
  if(!entry) return null;
  entry.title = to;
  if(!entry.menuLabel || entry.menuLabel === from) entry.menuLabel = to;
  entry.updatedAt = new Date().toISOString();
  const written = writeCategoryRegistry(registry);
  return written.items.find(item=>String(item.title||'').trim()===to) || null;
}
function removeRegistryByDir(dir){
  const target = normalizeDirKey(dir);
  if(!target) return false;
  const registry = loadCategoryRegistry();
  const before = registry.items.length;
  registry.items = registry.items.filter(item=>normalizeDirKey(item.dir)!==target);
  if(registry.items.length === before) return false;
  writeCategoryRegistry(registry);
  return true;
}
function removeRegistryByTitle(title){
  const target = String(title||'').trim();
  if(!target) return false;
  const registry = loadCategoryRegistry();
  const before = registry.items.length;
  registry.items = registry.items.filter(item=>String(item.title||'').trim()!==target);
  if(registry.items.length === before) return false;
  writeCategoryRegistry(registry);
  return true;
}
function registryEntryByDir(dir){
  const target = normalizeDirKey(dir);
  if(!target) return null;
  const registry = loadCategoryRegistry();
  return registry.items.find(item=>normalizeDirKey(item.dir)===target) || null;
}
function registryEntryByTitle(title){
  const target = String(title||'').trim();
  if(!target) return null;
  const registry = loadCategoryRegistry();
  return registry.items.find(item=>String(item.title||'').trim()===target) || null;
}

function collectCategoryUsage(category){
  const target = String(category||'').trim();
  if(!target) return { category:'', posts:[], total:0 };
  const files = walkMd(BLOG_DIR);
  const posts = [];
  for(const file of files){
    if(isSection(file)) continue;
    const txt = fs.readFileSync(file,'utf8');
    const fm = parseFM(txt);
    const list = (fm.categories||[]).map(v=>String(v||'').trim()).filter(Boolean);
    if(!list.length) continue;
    if(!list.includes(target)) continue;
    const rel = relOf(file);
    posts.push({
      rel,
      title: fm.title || slugOf(file),
      publish: fm.publish === 'true',
      draft: fm.draft === 'true',
      isLocal: rel.startsWith('_local/'),
      categories: list
    });
  }
  posts.sort((a,b)=>a.rel.localeCompare(b.rel));
  return { category: target, posts, total: posts.length };
}

function rewriteCategoryReferences({ from, to='', mode='rename', dryRun=false, exclude=[] }){
  const source = String(from||'').trim();
  const replacement = String(to||'').trim();
  const normalizedMode = mode === 'remove' ? 'remove' : 'rename';
  if(!source) return { updated:0, files:[], mode: normalizedMode };
  if(normalizedMode==='rename' && !replacement) return { updated:0, files:[], mode: normalizedMode };
  const files = walkMd(BLOG_DIR);
  const skip = new Set((exclude||[]).map(p=>path.resolve(p)));
  const touched = [];
  for(const file of files){
    if(skip.has(path.resolve(file))) continue;
    const txt = fs.readFileSync(file,'utf8');
    const fm = parseFM(txt);
    const original = (fm.categories||[]).map(v=>String(v||'').trim()).filter(Boolean);
    if(!original.length) continue;
    const next=[];
    const seen=new Set();
    let changed=false;
    for(const cat of original){
      if(cat === source){
        if(normalizedMode==='rename'){
          if(!seen.has(replacement)){
            next.push(replacement);
            seen.add(replacement);
          }
        }
        changed = true;
      }else{
        if(!seen.has(cat)){
          next.push(cat);
          seen.add(cat);
        }else{
          changed = true;
        }
      }
    }
    if(!changed) continue;
    touched.push({ file, rel: relOf(file), before: original, after: next });
    if(!dryRun){
      updateFrontmatter(file, { categories: next });
    }
  }
  return { updated: touched.length, files: touched, mode: normalizedMode };
}

// ---- ignore rules (.adminignore) ----
function loadIgnores(){
  const file = path.join(BLOG_DIR, '.adminignore');
  let lines = [];
  if (fs.existsSync(file)) {
    lines = fs.readFileSync(file,'utf8').split(/\r?\n/).map(s=>s.trim()).filter(s=>s && !s.startsWith('#'));
  }
  // default ignores for root pages:
  lines.push('blog.md');
  return Array.from(new Set(lines));
}
function toRegex(glob){
  const esc = s=> s.replace(/[.+^${}()|[\]\\]/g,'\\$&');
  let re = '^' + glob.split('*').map(esc).join('.*') + '$';
  re = re.replace(/\?/g,'.');
  return new RegExp(re,'i');
}
const IGNORE_PATTERNS = loadIgnores().map(g=>({glob:g,re:toRegex(g)}));
function shouldIgnore(rel, abs, fm){
  if (String(fm.list).toLowerCase()==='false' || String(fm.list)==='0') return true;
  if (String(fm.hidden).toLowerCase()==='true') return true;
  if (IGNORE_PATTERNS.some(p=>p.re.test(rel))) return true;
  const base = path.basename(abs).toLowerCase();
  if (path.dirname(abs)===BLOG_DIR && (base==='blog.md')) return true;
  return false;
}
function typeOf(rel, abs, fm){
  const t = (fm.type||'').toLowerCase();
  if (t==='post'||t==='section'||t==='page') return t;
  if (isSection(abs)) return 'section';
  if (shouldIgnore(rel,abs,fm)) return 'page';
  return 'post';
}

// ---- fs utilities ----
function walkMd(dir, out=[]){
  if(!fs.existsSync(dir)) return out;
  for(const n of fs.readdirSync(dir)){
    const p=path.join(dir,n);
    const s=fs.statSync(p);
    if(s.isDirectory()) walkMd(p,out);
    else if(/\.md$/i.test(n)) out.push(p);
  }
  return out;
}

// ---------- Posts APIs ----------
async function apiList(req,res){
  const files = walkMd(BLOG_DIR);
  const items = files.map(f=>{
    const txt = fs.readFileSync(f,'utf8'); const fm = parseFM(txt);
    const rel = relOf(f);
    const itemType = typeOf(rel, f, fm);
    const hidden = itemType==='page' ? true : false;
    return {
      slug: path.basename(f).replace(/\.md$/i,''),
      path: path.relative(PROJECT_ROOT,f).replace(/\\/g,'/'),
      rel,
      abs:  f,
      title: fm.title || path.basename(f).replace(/\.md$/i,''),
      date: fm.date || '',
      publish: fm.publish === 'true',
      draft: fm.draft === 'true',
      tags: fm.tags || [],
      categories: fm.categories || [],
      cover: fm.cover || '',
      kind: isSection(f) ? 'section' : 'post', // 保持向后兼容
      type: itemType,                            // 新字段
      hidden                                     // 新字段
    };
  });
  items.sort((a,b)=> String(b.date).localeCompare(String(a.date)));
  send(res, 200, { ok:true, items });
}
async function apiNewLocal(req,res){
  const b = await readBody(req);
  const args=[];
  if(b.title) args.push('--title', String(b.title));
  if(b.desc)  args.push('--desc',  String(b.desc));
  if(b.tags)  args.push('--tags',  Array.isArray(b.tags)? b.tags.join(',') : String(b.tags));
  if(b.cat)   args.push('--cat',   String(b.cat));
  if(b.slug)  args.push('--slug',  String(b.slug));
  if(b.cover) args.push('--cover', String(b.cover));
  try{ const r = await runNodeScript('new-post-local.mjs', args); send(res,200,{ok:true,out:r.out.trim()}); }
  catch(e){ send(res,500,{ok:false,error:e.message,out:e.out,err:e.err}); }
}
async function apiPromote(req,res){
  const b = await readBody(req);
  const rel = b.rel || (b.slug ? b.slug+'.md' : '');
  const t = rel ? path.join(BLOG_DIR, rel) : '';
  if(!t || !fs.existsSync(t)) return send(res,404,{ok:false,error:'target not found'});
  if(isSection(t)) return send(res,400,{ok:false,error:'section cannot be promoted'});
  const args=[ slugOf(t) ]; if(b.setDate) args.push('--set-date');
  try{ const r = await runNodeScript('post-promote.mjs', args); send(res,200,{ok:true,out:r.out.trim()}); }
  catch(e){ send(res,500,{ok:false,error:e.message,out:e.out,err:e.err}); }
}
async function apiArchive(req,res){
  const b = await readBody(req);
  const rel = b.rel || (b.slug ? b.slug+'.md' : '');
  const t = rel ? path.join(BLOG_DIR, rel) : '';
  if(!t || !fs.existsSync(t)) return send(res,404,{ok:false,error:'target not found'});
  if(isSection(t)){ try{ setPublishFlag(t,false); return send(res,200,{ok:true,mode:'section'});}catch(e){ return send(res,500,{ok:false,error:e.message}); } }
  try{ const r = await runNodeScript('post-archive.mjs', [ slugOf(t) ]); send(res,200,{ok:true,out:r.out.trim(),mode:'post'}); }
  catch(e){ send(res,500,{ok:false,error:e.message,out:e.out,err:e.err}); }
}
async function apiRepublish(req,res){
  const b = await readBody(req);
  const rel = b.rel || (b.slug ? b.slug+'.md' : '');
  const t = rel ? path.join(BLOG_DIR, rel) : '';
  if(!t || !fs.existsSync(t)) return send(res,404,{ok:false,error:'target not found'});
  try{ setPublishFlag(t,true); send(res,200,{ok:true}); }
  catch(e){ send(res,500,{ok:false,error:e.message}); }
}
function moveToTrash(file){
  fs.mkdirSync(TRASH_DIR, {recursive:true});
  const rel = relOf(file).replace(/[\\/]/g,'_');
  const t = new Date(); const pad=n=>String(n).padStart(2,'0');
  const stamp=`${t.getFullYear()}${pad(t.getMonth()+1)}${pad(t.getDate())}${pad(t.getHours())}${pad(t.getMinutes())}${pad(t.getSeconds())}`;
  const name = `${stamp}-${rel}`.replace(/\.md$/i,'') + '.md';
  const dst = path.join(TRASH_DIR, name);
  fs.renameSync(file, dst);
  return dst;
}

function sanitizeSlug(value){
  let out = String(value || '').trim();
  if(!out) return '';
  out = out.replace(/[\\/]+/g, '-');
  out = out.replace(/[:*?"<>|]+/g, '');
  out = out.replace(/\s+/g, '-');
  out = out.replace(/-+/g, '-');
  out = out.replace(/^[-_]+|[-_]+$/g, '');
  return out;
}

function deriveSlugFromTrashName(name){
  const base = String(name || '').replace(/\.md$/i,'');
  const matchWithDash = base.match(/^\d{8}-\d{6}-(.+)$/);
  const matchCompact = base.match(/^\d{14}-(.+)$/);
  let candidate = '';
  if(matchWithDash && matchWithDash[1]) candidate = matchWithDash[1];
  else if(matchCompact && matchCompact[1]) candidate = matchCompact[1];
  else candidate = base;
  candidate = candidate.replace(/_/g,'-');
  const sanitized = sanitizeSlug(candidate);
  return sanitized || sanitizeSlug(base) || candidate;
}

function ensureDraftFrontmatter(file){
  let txt = '';
  try{ txt = fs.readFileSync(file,'utf8'); }
  catch{ return; }
  const FM = /^---\s*([\s\S]*?)\s*---/m;
  if(!FM.test(txt)){
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
  try{
    updateFrontmatter(file, { publish: 'false', draft: 'true' });
  }catch{
    const m = FM.exec(txt);
    if(!m) return;
    let head = m[1];
    const put = (key, val)=>{
      const re = new RegExp(`^\\s*${key}\\s*:.*$`,'mi');
      if(re.test(head)) head = head.replace(re, `${key}: ${val}`);
      else head = `${head}\n${key}: ${val}`;
    };
    put('publish','false');
    put('draft','true');
    const next = txt.replace(FM, `---\n${head.trim()}\n---`);
    fs.writeFileSync(file, next, 'utf8');
  }
}

function listTrashEntries(){
  if(!fs.existsSync(TRASH_DIR)) return [];
  const names = fs.readdirSync(TRASH_DIR).filter(n=>/\.md$/i.test(n));
  const items = [];
  for(const name of names){
    const abs = path.join(TRASH_DIR, name);
    let stat;
    try{ stat = fs.statSync(abs); }
    catch{ continue; }
    if(!stat.isFile()) continue;
    let title = '';
    try{ title = parseFM(fs.readFileSync(abs,'utf8')).title || ''; }
    catch{}
    items.push({
      name,
      slug: deriveSlugFromTrashName(name),
      title,
      mtime: stat.mtimeMs,
      size: stat.size
    });
  }
  items.sort((a,b)=> b.mtime - a.mtime);
  return items;
}

function restoreTrashEntry(name, slug=''){
  const safe = path.basename(String(name||''));
  if(!safe) throw new Error('缺少文件名');
  if(safe !== name) throw new Error('非法文件名');
  const src = path.join(TRASH_DIR, safe);
  if(!fs.existsSync(src) || !fs.statSync(src).isFile()) throw new Error('目标不存在');
  let targetSlug = sanitizeSlug(slug);
  if(!targetSlug){
    targetSlug = deriveSlugFromTrashName(safe);
  }
  if(!targetSlug){
    try{
      const fm = parseFM(fs.readFileSync(src,'utf8'));
      targetSlug = sanitizeSlug(fm.title);
    }catch{}
  }
  if(!targetSlug) targetSlug = `restored-${Date.now()}`;
  fs.mkdirSync(LOCAL_DIR,{recursive:true});
  const base = targetSlug;
  let finalSlug = targetSlug;
  let dest = path.join(LOCAL_DIR, `${finalSlug}.md`);
  let idx = 1;
  while(fs.existsSync(dest)){
    finalSlug = `${base}-${idx++}`;
    dest = path.join(LOCAL_DIR, `${finalSlug}.md`);
  }
  fs.renameSync(src, dest);
  try{ ensureDraftFrontmatter(dest); }
  catch{}
  return { slug: finalSlug, rel: relOf(dest) };
}

function deleteTrashEntry(name){
  const safe = path.basename(String(name||''));
  if(!safe) return false;
  if(safe !== name) return false;
  const file = path.join(TRASH_DIR, safe);
  if(!fs.existsSync(file)) return false;
  if(!fs.statSync(file).isFile()) return false;
  fs.unlinkSync(file);
  return true;
}

async function apiTrashList(req,res){
  try{
    const items = listTrashEntries();
    send(res,200,{ok:true,items});
  }catch(e){ send(res,500,{ok:false,error:e.message}); }
}

async function apiTrashRestore(req,res){
  try{
    const body = await readBody(req);
    const name = String(body.name||'').trim();
    if(!name) return send(res,400,{ok:false,error:'缺少文件名'});
    const slug = body.slug === undefined ? '' : String(body.slug||'').trim();
    const restored = restoreTrashEntry(name, slug);
    send(res,200,{ok:true,name,slug:restored.slug,rel:restored.rel});
  }catch(e){ send(res,500,{ok:false,error:e.message}); }
}

async function apiTrashDelete(req,res){
  try{
    const body = await readBody(req);
    const name = String(body.name||'').trim();
    if(!name) return send(res,400,{ok:false,error:'缺少文件名'});
    const ok = deleteTrashEntry(name);
    if(!ok) return send(res,404,{ok:false,error:'目标不存在'});
    send(res,200,{ok:true});
  }catch(e){ send(res,500,{ok:false,error:e.message}); }
}
async function apiRemove(req,res){
  const b = await readBody(req);
  const rel = b.rel || (b.slug ? b.slug+'.md' : '');
  const t = rel ? path.join(BLOG_DIR, rel) : '';
  if(!t || !fs.existsSync(t)) return send(res,404,{ok:false,error:'target not found'});
  if(isSection(t)){
    const relPath = relOf(t);
    const relDir = normalizeDirKey(relPath.replace(/\/?index\.md$/i,''));
    let categoryTitle = '';
    if(relDir){ const entry = registryEntryByDir(relDir); if(entry?.title) categoryTitle = String(entry.title).trim(); }
    if(!categoryTitle){
      try{ const fm = parseFM(fs.readFileSync(t,'utf8')); categoryTitle = String(fm.title||'').trim(); }
      catch{}
    }
    if(b.hard){
      if(categoryTitle){
        const usage = collectCategoryUsage(categoryTitle);
        if(usage.total>0){
          const checklist = {
            category: categoryTitle,
            dir: relDir,
            rel: relPath,
            total: usage.total,
            posts: usage.posts.map(p=>({ rel: p.rel, title: p.title, publish: p.publish, draft: p.draft, isLocal: p.isLocal })),
            instructions: [
              '1. 运行“分类批处理”任务：重命名或移除该分类。',
              '2. 确认所有文章的 categories frontmatter 已完成迁移。',
              '3. 再次尝试删除栏目 index.md。'
            ],
            jobEndpoint: '/api/categories/rewrite'
          };
          return send(res,409,{ok:false,error:`分类「${categoryTitle}」仍被 ${usage.total} 篇文章引用，已阻止删除。`, checklist});
        }
      }
      try{
        const dst = moveToTrash(t);
        if(relDir) removeRegistryByDir(relDir);
        if(categoryTitle) removeRegistryByTitle(categoryTitle);
        return send(res,200,{ok:true,trash:dst});
      }catch(e){ return send(res,500,{ok:false,error:e.message}); }
    }else{
      try{
        setPublishFlag(t,false);
        if(relDir) touchRegistryEntry(relDir, { publish: false });
        return send(res,200,{ok:true});
      }catch(e){ return send(res,500,{ok:false,error:e.message}); }
    }
  }
  const args=[ slugOf(t) ]; if(b.hard) args.push('--hard');
  try{ const r = await runNodeScript('post-remove.mjs', args); send(res,200,{ok:true,out:r.out.trim()}); }
  catch(e){ send(res,500,{ok:false,error:e.message,out:e.out,err:e.err}); }
}
async function apiUpdateMeta(req,res){
  try{
    const b = await readBody(req);
    const rel = b.rel || (b.slug ? b.slug+'.md' : '');
    let file = rel ? path.join(BLOG_DIR, rel) : '';
    if(!rel || !fs.existsSync(file)){
      const files = walkMd(BLOG_DIR,[]);
      const hit = files.find(f=> path.basename(f).toLowerCase() === (String(b.slug||'')+'.md').toLowerCase());
      file = hit || '';
    }
    if(!file) return send(res,404,{ok:false,error:'target not found'});

    const beforeTxt = fs.readFileSync(file,'utf8');
    const beforeFm = parseFM(beforeTxt);

    updateFrontmatter(file, b.patch||{});

    const afterTxt = fs.readFileSync(file,'utf8');
    const afterFm = parseFM(afterTxt);
    let rewrite = null;

    if(isSection(file)){
      const relFile = relOf(file);
      const dir = normalizeDirKey(relFile.replace(/\/?index\.md$/i,''));
      if(dir) touchRegistryEntry(dir, { title: afterFm.title || beforeFm.title || path.basename(dir), publish: afterFm.publish === 'true' });
      const from = String(beforeFm.title||'').trim();
      const to = String(afterFm.title||'').trim();
      if(from && to && from !== to){
        rewrite = rewriteCategoryReferences({ from, to, mode:'rename', exclude:[file] });
        renameRegistryTitle(from, to);
      }
    }

    send(res,200,{ok:true,file:relOf(file), rewrite});
  }catch(e){ send(res,500,{ok:false,error:e.message}); }
}
async function apiAliases(req,res){ try{ const r = await runNodeScript('gen-alias-redirects.mjs', []); send(res,200,{ok:true,out:r.out.trim()}); } catch(e){ send(res,500,{ok:false,error:e.message,out:e.out,err:e.err}); } }

async function apiCategoryRewrite(req,res){
  try{
    const body = await readBody(req);
    const from = String(body.from || body.category || '').trim();
    const mode = body.mode === 'remove' ? 'remove' : 'rename';
    const dryRun = !!body.dryRun;
    const to = mode === 'rename' ? String(body.to||'').trim() : '';
    if(!from) return send(res,400,{ok:false,error:'missing from'});
    if(mode==='rename' && !to) return send(res,400,{ok:false,error:'missing to'});
    const result = rewriteCategoryReferences({ from, to, mode, dryRun });
    if(!dryRun){
      if(mode==='rename'){
        renameRegistryTitle(from, to);
      }else{
        removeRegistryByTitle(from);
      }
    }
    const summary = mode==='rename'
      ? `${dryRun?'预览':'更新'} ${result.updated} 篇：${from} → ${to}`
      : `${dryRun?'预览':'更新'} ${result.updated} 篇：移除 ${from}`;
    const files = result.files.map(f=>({ rel: f.rel, before: f.before, after: f.after }));
    send(res,200,{ok:true, from, to, mode, dryRun, updated: result.updated, files, summary});
  }catch(e){ send(res,500,{ok:false,error:e.message}); }
}

function getCategoryBucket(map, key){
  let bucket = map.get(key);
  if(!bucket){
    bucket = { total:0, published:0, latestPublished:null, latestAny:null };
    map.set(key, bucket);
  }
  return bucket;
}
function collectCategoryOverview(){
  const stats = new Map();
  const files = walkMd(BLOG_DIR);
  for(const file of files){
    if(isSection(file)) continue;
    let txt = '';
    try{ txt = fs.readFileSync(file,'utf8'); }
    catch{ continue; }
    const fm = parseFM(txt);
    const list = (fm.categories||[]).map(v=>String(v||'').trim()).filter(Boolean);
    if(!list.length) continue;
    const rel = relOf(file);
    let ts = Date.parse(fm.date || '');
    if(!Number.isFinite(ts)){
      try{ ts = fs.statSync(file).mtimeMs; }
      catch{ ts = Date.now(); }
    }
    const iso = new Date(ts).toISOString();
    const title = fm.title || slugOf(file);
    const isPublished = fm.publish === 'true' && fm.draft !== 'true';
    for(const categoryName of list){
      if(!categoryName) continue;
      const bucket = getCategoryBucket(stats, categoryName);
      bucket.total += 1;
      if(!bucket.latestAny || ts > bucket.latestAny.time){
        bucket.latestAny = { time: ts, at: iso, rel, title };
      }
      if(isPublished){
        bucket.published += 1;
        if(!bucket.latestPublished || ts > bucket.latestPublished.time){
          bucket.latestPublished = { time: ts, at: iso, rel, title };
        }
      }
    }
  }
  return stats;
}
async function apiCategories(req,res){
  try{
    const registry = loadCategoryRegistry();
    const usage = collectCategoryOverview();
    const items = registry.items.map(entry=>{
      const title = String(entry.title||'').trim();
      const stats = usage.get(title) || { total:0, published:0, latestPublished:null, latestAny:null };
      const dirKey = normalizeDirKey(entry.dir);
      let absDir = '';
      let hasDirectory = false;
      let hasIndex = false;
      let indexAbs = '';
      if(dirKey){
        absDir = path.join(BLOG_DIR, dirKey);
        try{
          if(fs.existsSync(absDir) && fs.statSync(absDir).isDirectory()){
            hasDirectory = true;
            indexAbs = path.join(absDir, 'index.md');
            if(fs.existsSync(indexAbs) && fs.statSync(indexAbs).isFile()){
              hasIndex = true;
            }
          }
        }catch{}
      }
      const issues = [];
      if(dirKey && !hasDirectory) issues.push('missing-dir');
      if(hasDirectory && !hasIndex) issues.push('missing-index');
      if(entry.publish === false) issues.push('unpublished');
      if(entry.menuEnabled === false) issues.push('menu-disabled');
      if((stats.total||0) === 0) issues.push('unused');
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
        dirPath: dirKey ? path.relative(PROJECT_ROOT, absDir).replace(/\\/g,'/') : '',
        absDir: absDir || '',
        indexPath: hasIndex ? path.relative(PROJECT_ROOT, indexAbs).replace(/\\/g,'/') : '',
        indexRel: hasIndex ? relOf(indexAbs) : '',
        link: '/blog/' + (dirKey ? `${dirKey.replace(/\/+$/,'')}/` : ''),
        issues
      };
    });
    const knownTitles = new Set(items.map(item=>item.title));
    const orphans = [];
    for(const [title, bucket] of usage.entries()){
      if(knownTitles.has(title)) continue;
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
    orphans.sort((a,b)=> (b.latestPostAt||'').localeCompare(a.latestPostAt||''));
    send(res,200,{ ok:true, registry:{ version: registry.version, updatedAt: registry.updatedAt }, items, orphans });
  }catch(e){ send(res,500,{ok:false,error:e.message}); }
}
async function apiCategoriesCreate(req,res){
  try{
    const body = await readBody(req);
    const title = String(body.title||'').trim();
    const dir = normalizeDirKey(body.dir || '');
    if(!title) return send(res,400,{ok:false,error:'缺少分类名称'});
    if(!dir) return send(res,400,{ok:false,error:'缺少目录标识'});
    const registry = loadCategoryRegistry();
    if(registry.items.some(item=>normalizeDirKey(item.dir)===dir)){
      return send(res,409,{ok:false,error:'目录已存在'});
    }
    if(registry.items.some(item=>String(item.title||'').trim()===title)){
      return send(res,409,{ok:false,error:'分类名称已存在'});
    }
    const publish = body.publish === undefined ? true : !!body.publish;
    const menuEnabled = body.menuEnabled === undefined ? publish : !!body.menuEnabled;
    const now = new Date().toISOString();
    const menuOrder = Number.isFinite(Number(body.menuOrder)) ? Number(body.menuOrder) : nextMenuOrder(registry.items);
    registry.items.push({
      dir,
      title,
      menuLabel: String(body.menuLabel||'').trim() || title,
      publish,
      menuEnabled,
      menuOrder,
      createdAt: now,
      updatedAt: now
    });
    const written = writeCategoryRegistry(registry);
    const item = written.items.find(entry=>normalizeDirKey(entry.dir)===dir);
    if(body.createDir !== false){
      const absDir = path.join(BLOG_DIR, dir);
      fs.mkdirSync(absDir,{recursive:true});
    }
    const navSync = safeSyncCategoryNav();
    send(res,200,{ok:true, item, navSync});
  }catch(e){ send(res,500,{ok:false,error:e.message}); }
}
async function apiCategoriesUpdate(req,res){
  try{
    const body = await readBody(req);
    const originalDir = normalizeDirKey(body.dir || body.originalDir || '');
    if(!originalDir) return send(res,400,{ok:false,error:'缺少分类目录标识'});
    const registry = loadCategoryRegistry();
    const idx = registry.items.findIndex(item=>normalizeDirKey(item.dir)===originalDir);
    if(idx === -1) return send(res,404,{ok:false,error:'分类不存在'});
    const entry = registry.items[idx];
    const oldTitle = String(entry.title||'').trim();
    const targetDir = normalizeDirKey(body.nextDir || body.dir || entry.dir);
    const desiredTitle = body.title !== undefined ? String(body.title||'').trim() : oldTitle;
    if(!desiredTitle) return send(res,400,{ok:false,error:'分类名称不能为空'});
    if(!targetDir) return send(res,400,{ok:false,error:'目录标识不能为空'});
    if(targetDir !== originalDir && registry.items.some((item,i)=>i!==idx && normalizeDirKey(item.dir)===targetDir)){
      return send(res,409,{ok:false,error:'目标目录已存在'});
    }
    if(desiredTitle !== oldTitle && registry.items.some((item,i)=>i!==idx && String(item.title||'').trim()===desiredTitle)){
      return send(res,409,{ok:false,error:'分类名称冲突'});
    }
    const publish = body.publish === undefined ? entry.publish : !!body.publish;
    const menuEnabled = body.menuEnabled === undefined ? entry.menuEnabled : !!body.menuEnabled;
    const menuOrder = body.menuOrder !== undefined && Number.isFinite(Number(body.menuOrder))
      ? Number(body.menuOrder)
      : entry.menuOrder;
    const menuLabelInput = body.menuLabel !== undefined ? String(body.menuLabel||'').trim() : null;
    const ensureDir = body.ensureDir === false ? false : true;
    let dirMove = null;
    if(targetDir !== originalDir){
      const srcDir = path.join(BLOG_DIR, originalDir);
      const dstDir = path.join(BLOG_DIR, targetDir);
      if(fs.existsSync(dstDir)){
        return send(res,409,{ok:false,error:'目标目录已存在于文件系统'});
      }
      if(fs.existsSync(srcDir)){
        fs.mkdirSync(path.dirname(dstDir), {recursive:true});
        fs.renameSync(srcDir, dstDir);
        dirMove = { from: path.relative(PROJECT_ROOT, srcDir).replace(/\\/g,'/'), to: path.relative(PROJECT_ROOT, dstDir).replace(/\\/g,'/') };
      }else if(ensureDir){
        fs.mkdirSync(dstDir, {recursive:true});
      }
    }else if(ensureDir && targetDir){
      const absDir = path.join(BLOG_DIR, targetDir);
      if(!fs.existsSync(absDir)) fs.mkdirSync(absDir,{recursive:true});
    }
    const now = new Date().toISOString();
    entry.dir = targetDir;
    entry.title = desiredTitle;
    if(menuLabelInput !== null){
      entry.menuLabel = menuLabelInput || desiredTitle || targetDir;
    }else if(!entry.menuLabel){
      entry.menuLabel = desiredTitle || targetDir;
    }
    entry.publish = publish;
    entry.menuEnabled = menuEnabled;
    entry.menuOrder = menuOrder;
    entry.updatedAt = now;
    let rewrite = null;
    if(desiredTitle !== oldTitle && body.rewrite === false){
      // skip rewrite
    }else if(desiredTitle !== oldTitle){
      rewrite = rewriteCategoryReferences({ from: oldTitle, to: desiredTitle, mode:'rename' });
    }
    const written = writeCategoryRegistry(registry);
    const item = written.items.find(it=>normalizeDirKey(it.dir)===targetDir);
    const navSync = safeSyncCategoryNav();
    send(res,200,{ok:true, item, dirMove, rewrite, navSync});
  }catch(e){ send(res,500,{ok:false,error:e.message}); }
}
async function apiCategoriesToggle(req,res){
  try{
    const body = await readBody(req);
    const dir = normalizeDirKey(body.dir || '');
    if(!dir) return send(res,400,{ok:false,error:'缺少分类目录标识'});
    const fieldRaw = String(body.field||'').trim();
    const field = fieldRaw === 'menu' ? 'menuEnabled' : fieldRaw || 'publish';
    if(!['publish','menuEnabled'].includes(field)){
      return send(res,400,{ok:false,error:'不支持的字段'});
    }
    const registry = loadCategoryRegistry();
    const entry = registry.items.find(item=>normalizeDirKey(item.dir)===dir);
    if(!entry) return send(res,404,{ok:false,error:'分类不存在'});
    entry[field] = !!body.value;
    entry.updatedAt = new Date().toISOString();
    const written = writeCategoryRegistry(registry);
    const item = written.items.find(it=>normalizeDirKey(it.dir)===dir);
    const navSync = safeSyncCategoryNav();
    send(res,200,{ok:true, item, navSync});
  }catch(e){ send(res,500,{ok:false,error:e.message}); }
}
async function apiCategoriesDelete(req,res){
  try{
    const body = await readBody(req);
    const dir = normalizeDirKey(body.dir || '');
    if(!dir) return send(res,400,{ok:false,error:'缺少分类目录标识'});
    const registry = loadCategoryRegistry();
    const entry = registry.items.find(item=>normalizeDirKey(item.dir)===dir);
    if(!entry) return send(res,404,{ok:false,error:'分类不存在'});
    const title = String(entry.title||'').trim();
    if(title){
      const usage = collectCategoryUsage(title);
      if(usage.total > 0){
        const checklist = {
          category: title,
          dir,
          total: usage.total,
          posts: usage.posts.map(p=>({ rel: p.rel, title: p.title, publish: p.publish, draft: p.draft, isLocal: p.isLocal })),
          instructions: [
            '1. 运行“分类批处理”任务：重命名或移除该分类。',
            '2. 确认所有文章的 categories frontmatter 已完成迁移。',
            '3. 再次尝试删除该分类。'
          ],
          jobEndpoint: '/api/categories/rewrite'
        };
        return send(res,409,{ok:false,error:`分类「${title}」仍被 ${usage.total} 篇文章引用，已阻止删除。`, checklist});
      }
    }
    removeRegistryByDir(dir);
    let removedIndex = null;
    if(body.hard){
      const absDir = entry.dir ? path.join(BLOG_DIR, entry.dir) : '';
      if(absDir && fs.existsSync(absDir)){
        try{
          const contents = fs.readdirSync(absDir);
          if(!contents.length){
            fs.rmdirSync(absDir);
          }else if(contents.length===1 && contents[0].toLowerCase()==='index.md'){
            const indexFile = path.join(absDir, contents[0]);
            const trashed = moveToTrash(indexFile);
            removedIndex = { trashed: path.basename(trashed) };
            const remaining = fs.readdirSync(absDir);
            if(!remaining.length) fs.rmdirSync(absDir);
          }
        }catch{}
      }
    }
    const navSync = safeSyncCategoryNav();
    send(res,200,{ok:true, removedIndex, navSync});
  }catch(e){ send(res,500,{ok:false,error:e.message}); }
}

// ---------- Nav sync ----------
function buildCategoryNavItems(){
  const registry = loadCategoryRegistry();
  const blogRoot = path.resolve(BLOG_DIR);
  return registry.items
    .map(item=>{
      // 顶部导航仅由菜单上架状态控制，内容发布与否不再影响可见性。
      if(item.menuEnabled === false) return null;
      const dir = normalizeDirKey(item.dir);
      if(!dir) return null;
      const safeDir = path.resolve(BLOG_DIR, dir);
      if(safeDir !== blogRoot && !safeDir.startsWith(blogRoot + path.sep)) return null;
      try{
        const stat = fs.statSync(safeDir);
        if(!stat.isDirectory()) return null;
      }catch{
        return null;
      }
      const link = '/blog/' + `${dir.replace(/\/+$/,'')}/`;
      return {
        text: item.menuLabel || item.title || dir || '博客',
        category: item.title || item.menuLabel || dir || '博客',
        dir,
        link,
        fallback: link,
        menuOrder: Number(item.menuOrder) || 0
      };
    })
    .filter(Boolean)
    .sort((a,b)=>{
      if(a.menuOrder !== b.menuOrder) return a.menuOrder - b.menuOrder;
      return a.text.localeCompare(b.text);
    });
}
function syncCategoryNavArtifacts(){
  const items = buildCategoryNavItems();
  const now = new Date().toISOString();
  fs.mkdirSync(VP_DIR, {recursive:true});
  const payload = { updatedAt: now, items };
  fs.writeFileSync(CATEGORY_NAV_FILE, JSON.stringify(payload, null, 2), 'utf8');
  const json = path.relative(PROJECT_ROOT, CATEGORY_NAV_FILE).replace(/\\/g,'/');
  const cfg = findConfigFile();
  let config = null;
  let patched = { mode:'json-only' };
  if(cfg){
    patched = patchConfigWithMarkers(cfg, items);
    config = path.relative(PROJECT_ROOT, cfg).replace(/\\/g,'/');
  }
  return { items, updatedAt: now, json, config, patched };
}
function safeSyncCategoryNav(){
  try{
    const result = syncCategoryNavArtifacts();
    return { ok:true, ...result };
  }catch(err){
    const message = err instanceof Error ? err.message : String(err);
    console.error('[admin] category nav sync failed', err);
    return { ok:false, error: message };
  }
}
function findConfigFile(){
  const cands = ['config.ts','config.mts','config.js','config.mjs'];
  for(const n of cands){
    const p = path.join(VP_DIR, n);
    if(fs.existsSync(p)) return p;
  }
  return '';
}
function patchConfigWithMarkers(file, navItems){
  const start = '/* ADMIN NAV START */';
  const end   = '/* ADMIN NAV END */';
  let txt = fs.readFileSync(file, 'utf8');
  const payload = `${start}\nconst adminGeneratedNav = ${JSON.stringify(navItems, null, 2)};\n${end}`;
  if(txt.includes(start) && txt.includes(end)){
    txt = txt.replace(new RegExp(`${start}[\\s\\S]*?${end}`,'m'), payload);
    fs.writeFileSync(file, txt, 'utf8');
    return { mode:'patched' };
  }
  return { mode:'missing-markers', payload };
}
async function apiCategoriesNavSync(req,res){
  try{
    const result = syncCategoryNavArtifacts();
    send(res,200,{ ok:true, ...result });
  }catch(e){ send(res,500,{ok:false,error:e.message}); }
}

// ---------- build/preview/deploy ----------
async function ensureBuilt(){ const ok = fs.existsSync(DIST_DIR) && fs.existsSync(path.join(DIST_DIR, 'index.html')); if(ok) return 'already'; const npx=process.platform==='win32'?'npx.cmd':'npx'; const r=await runCmd(npx,['vitepress','build','docs']); return r.out||'built'; }
async function apiBuild(req,res){ try{ const npx = process.platform==='win32'?'npx.cmd':'npx'; const r = await runCmd(npx, ['vitepress','build','docs']); send(res,200,{ok:true,out:r.out.trim()}); }catch(e){ send(res,500,{ok:false,error:e.message,out:e.out,err:e.err}); } }
async function apiPreview(req,res){ try{ await ensureBuilt(); const npx=process.platform==='win32'?'npx.cmd':'npx'; const child=spawn(npx,['vitepress','preview','docs','--host','--port',String(PREVIEW_PORT)],{cwd:PROJECT_ROOT,shell:process.platform==='win32',env:process.env,detached:true,stdio:'ignore',windowsHide:true}); child.unref(); send(res,200,{ok:true,url:`http://127.0.0.1:${PREVIEW_PORT}`}); }catch(e){ send(res,500,{ok:false,error:e.message,out:e.out,err:e.err}); } }
async function apiDeploy(req,res){ try{ const r=await runNodeScript('deploy-local.mjs',[]); send(res,200,{ok:true,out:r.out.trim()}); }catch(e){ send(res,500,{ok:false,error:e.message,out:e.out,err:e.err}); } }

function serveStatic(req, res) {
  const { pathname } = parseUrl(req.url);
  let p = pathname || '/';
  if (p === '/') p = 'index.html';
  if (p.startsWith('/')) p = p.slice(1);
  const file = path.join(PUBLIC_DIR, p);
  if (!file.startsWith(PUBLIC_DIR)) return notFound(res);
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    const ext = path.extname(file).toLowerCase();
    const map = { '.html':'text/html; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.ico':'image/x-icon' };
    res.writeHead(200, { 'Content-Type': map[ext] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } else { if (p === 'favicon.ico') { res.writeHead(204); return res.end(); } notFound(res); }
}

const server = createServer(async (req,res)=>{
  const { pathname } = parseUrl(req.url);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin':'*',
      'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers':'Content-Type, Authorization'
    });
    return res.end();
  }
  try{
    if(req.method==='POST' && pathname==='/api/login')            return apiLogin(req,res);

    const protectedApi = pathname?.startsWith('/api/') && pathname !== '/api/login';
    if(protectedApi){
      const session = ensureAuth(req,res);
      if(!session) return;
      req.session = session;
    }

    if(req.method==='POST' && pathname==='/api/logout')           return apiLogout(req,res);
    if(req.method==='GET'  && pathname==='/api/list')             return apiList(req,res);
    if(req.method==='POST' && pathname==='/api/new-local')        return apiNewLocal(req,res);
    if(req.method==='POST' && pathname==='/api/promote')          return apiPromote(req,res);
    if(req.method==='POST' && pathname==='/api/archive')          return apiArchive(req,res);
    if(req.method==='POST' && pathname==='/api/republish')        return apiRepublish(req,res);
    if(req.method==='POST' && pathname==='/api/remove')           return apiRemove(req,res);
    if(req.method==='POST' && pathname==='/api/update-meta')      return apiUpdateMeta(req,res);
    if(req.method==='GET'  && pathname==='/api/trash')             return apiTrashList(req,res);
    if(req.method==='POST' && pathname==='/api/trash/restore')     return apiTrashRestore(req,res);
    if(req.method==='POST' && pathname==='/api/trash/delete')      return apiTrashDelete(req,res);
    if(req.method==='POST' && pathname==='/api/aliases')          return apiAliases(req,res);
    if(req.method==='POST' && pathname==='/api/categories/rewrite') return apiCategoryRewrite(req,res);

    if(req.method==='GET'  && pathname==='/api/categories')        return apiCategories(req,res);
    if(req.method==='POST' && pathname==='/api/categories/create') return apiCategoriesCreate(req,res);
    if(req.method==='POST' && pathname==='/api/categories/update') return apiCategoriesUpdate(req,res);
    if(req.method==='POST' && pathname==='/api/categories/toggle') return apiCategoriesToggle(req,res);
    if(req.method==='POST' && pathname==='/api/categories/delete') return apiCategoriesDelete(req,res);
    if(req.method==='POST' && pathname==='/api/categories/nav-sync') return apiCategoriesNavSync(req,res);

    if(req.method==='POST' && pathname==='/api/build')            return apiBuild(req,res);
    if(req.method==='POST' && pathname==='/api/preview')          return apiPreview(req,res);
    if(req.method==='POST' && pathname==='/api/deploy')           return apiDeploy(req,res);

    return serveStatic(req,res);
  }catch(e){ send(res,500,{ok:false,error:e.message}); }
});
server.listen(PORT, HOST, ()=>{
  console.log(`[admin] running   : http://${HOST}:${PORT}`);
  console.log(`[admin] PROJECT_ROOT: ${PROJECT_ROOT}`);
  console.log(`[admin] PUBLIC_DIR  : ${PUBLIC_DIR}`);
  console.log(`[admin] PREVIEW_PORT: ${PREVIEW_PORT}`);
});
