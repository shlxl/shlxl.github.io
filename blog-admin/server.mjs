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

// ---- ignore rules (.adminignore) ----
function loadIgnores(){
  const file = path.join(BLOG_DIR, '.adminignore');
  let lines = [];
  if (fs.existsSync(file)) {
    lines = fs.readFileSync(file,'utf8').split(/\r?\n/).map(s=>s.trim()).filter(s=>s && !s.startsWith('#'));
  }
  // default ignores for root pages:
  lines.push('rss.md','blog.md');
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
  if (path.dirname(abs)===BLOG_DIR && (base==='rss.md' || base==='blog.md')) return true;
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
async function apiRemove(req,res){
  const b = await readBody(req);
  const rel = b.rel || (b.slug ? b.slug+'.md' : '');
  const t = rel ? path.join(BLOG_DIR, rel) : '';
  if(!t || !fs.existsSync(t)) return send(res,404,{ok:false,error:'target not found'});
  if(isSection(t)){
    try{ const dst = moveToTrash(t); return send(res,200,{ok:true,trash:dst}); }
    catch(e){ return send(res,500,{ok:false,error:e.message}); }
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
    updateFrontmatter(file, b.patch||{});
    send(res,200,{ok:true,file:relOf(file)});
  }catch(e){ send(res,500,{ok:false,error:e.message}); }
}
async function apiAliases(req,res){ try{ const r = await runNodeScript('gen-alias-redirects.mjs', []); send(res,200,{ok:true,out:r.out.trim()}); } catch(e){ send(res,500,{ok:false,error:e.message,out:e.out,err:e.err}); } }

// ---------- Sections APIs v2 ----------
function listSections(){
  const files = walkMd(BLOG_DIR).filter(isSection);
  return files.map(f=>{
    const st = fs.statSync(f);
    const fm = parseFM(fs.readFileSync(f,'utf8'));
    const dir = path.dirname(f);
    const children = fs.readdirSync(dir).filter(n=>/\.md$/i.test(n) && n.toLowerCase()!=='index.md').length;
    return {
      rel: relOf(f),
      abs: f,
      dir: path.relative(BLOG_DIR, dir).replace(/\\/g,'/'),
      title: fm.title || path.basename(dir),
      publish: fm.publish === 'true',
      draft: fm.draft === 'true',
      childrenCount: children,
      mtime: st.mtimeMs
    };
  }).sort((a,b)=> b.mtime-a.mtime);
}
function listSectionTrash(){
  if(!fs.existsSync(TRASH_DIR)) return [];
  const out = [];
  for(const n of fs.readdirSync(TRASH_DIR)){
    const p = path.join(TRASH_DIR, n);
    if(fs.statSync(p).isFile() && /\.md$/i.test(n)){
      const m = n.match(/^\d{14}-(.+)$/);
      if(!m) continue;
      const raw = m[1];
      const guessRel = raw.replace(/_/g,'/');
      if(!/index\.md$/i.test(guessRel)) continue;
      const st = fs.statSync(p);
      out.push({ name:n, guessRel, mtime: st.mtimeMs });
    }
  }
  out.sort((a,b)=> b.mtime - a.mtime);
  return out;
}
async function apiSections(req,res){ send(res,200,{ok:true, items:listSections()}); }
async function apiSectionToggle(req,res){
  try{
    const { rel, publish } = await readBody(req);
    if(!rel) return send(res,400,{ok:false,error:'missing rel'});
    const file = path.join(BLOG_DIR, rel);
    if(!fs.existsSync(file)) return send(res,404,{ok:false,error:'not found'});
    setPublishFlag(file, !!publish);
    send(res,200,{ok:true});
  }catch(e){ send(res,500,{ok:false,error:e.message}); }
}
async function apiSectionCreate(req,res){
  try{
    const { rel, title, publish } = await readBody(req);
    if(!rel) return send(res,400,{ok:false,error:'missing rel (like "series" or "series/d2r")'});
    const dir = path.join(BLOG_DIR, rel);
    fs.mkdirSync(dir,{recursive:true});
    const file = path.join(dir, 'index.md');
    if(fs.existsSync(file)) return send(res,409,{ok:false,error:'index.md already exists'});
    const fm = `---\ntitle: ${title||path.basename(dir)}\npublish: ${publish===false?'false':'true'}\ndraft: false\n---\n\n# ${title||path.basename(dir)}\n`;
    fs.writeFileSync(file, fm, 'utf8');
    send(res,200,{ok:true, rel: relOf(file)});
  }catch(e){ send(res,500,{ok:false,error:e.message}); }
}
async function apiSectionRename(req,res){
  try{
    const { rel, newRel, dryRun } = await readBody(req);
    if(!rel || !newRel) return send(res,400,{ok:false,error:'missing rel or newRel'});
    const srcDir = path.dirname(path.join(BLOG_DIR, rel));
    const dstDir = path.join(BLOG_DIR, newRel);
    const plan = { move: [{ from: srcDir, to: dstDir }] };
    if(dryRun) return send(res,200,{ok:true, plan});
    if(!fs.existsSync(srcDir)) return send(res,404,{ok:false,error:'src not exist'});
    if(fs.existsSync(dstDir)) return send(res,409,{ok:false,error:'target exists'});
    fs.mkdirSync(path.dirname(dstDir),{recursive:true});
    fs.renameSync(srcDir, dstDir);
    send(res,200,{ok:true, rel:newRel+'/index.md'});
  }catch(e){ send(res,500,{ok:false,error:e.message}); }
}
async function apiSectionDelete(req,res){
  try{
    const { rel, hard } = await readBody(req);
    if(!rel) return send(res,400,{ok:false,error:'missing rel'});
    const file = path.join(BLOG_DIR, rel);
    if(!fs.existsSync(file)) return send(res,404,{ok:false,error:'not found'});
    if(hard){
      fs.mkdirSync(TRASH_DIR,{recursive:true});
      const name = rel.replace(/[\\/]/g,'_');
      const stamp = new Date().toISOString().replace(/[-:.TZ]/g,'');
      const dst = path.join(TRASH_DIR, `${stamp}-${name}`);
      fs.renameSync(file, dst);
      return send(res,200,{ok:true, trashed: path.basename(dst)});
    }else{
      setPublishFlag(file, false);
      return send(res,200,{ok:true});
    }
  }catch(e){ send(res,500,{ok:false,error:e.message}); }
}
async function apiSectionTrash(req,res){ try{ send(res,200,{ok:true, items:listSectionTrash()}); } catch(e){ send(res,500,{ok:false,error:e.message}); } }
async function apiSectionRestore(req,res){
  try{
    const { name } = await readBody(req);
    if(!name) return send(res,400,{ok:false,error:'missing name'});
    const src = path.join(TRASH_DIR, name);
    if(!fs.existsSync(src)) return send(res,404,{ok:false,error:'trash file not found'});
    const m = name.match(/^\d{14}-(.+)$/); if(!m) return send(res,400,{ok:false,error:'bad trash name'});
    const guessRel = m[1].replace(/_/g,'/');
    const dst = path.join(BLOG_DIR, guessRel);
    fs.mkdirSync(path.dirname(dst), {recursive:true});
    if(fs.existsSync(dst)) return send(res,409,{ok:false,error:'target already exists', rel: guessRel});
    fs.renameSync(src, dst);
    send(res,200,{ok:true, rel: guessRel});
  }catch(e){ send(res,500,{ok:false,error:e.message}); }
}

// ---------- Nav sync ----------
function publishedSectionsToNav(){
  const items = listSections().filter(x=>x.publish);
  return items.map(x=>{
    const dir = x.dir;
    const link = '/blog/' + (dir ? (dir.replace(/\/+$/,'') + '/') : '');
    return { text: x.title || (dir || '博客'), link };
  });
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
  const payload = `${start}\n  // 由 Blog Admin 自动生成：栏目导航\n  ${JSON.stringify(navItems, null, 2)}\n  ${end}`;
  if(txt.includes(start) && txt.includes(end)){
    txt = txt.replace(new RegExp(`${start}[\\s\\S]*?${end}`,'m'), payload);
    fs.writeFileSync(file, txt, 'utf8');
    return { mode:'patched' };
  }
  return { mode:'missing-markers', payload };
}
async function apiNavSync(req,res){
  try{
    const items = publishedSectionsToNav();
    fs.mkdirSync(VP_DIR, {recursive:true});
    const jsonFile = path.join(VP_DIR, 'sections.nav.json');
    fs.writeFileSync(jsonFile, JSON.stringify(items, null, 2), 'utf8');

    const cfg = findConfigFile();
    let patched = { mode:'json-only' };
    if(cfg){
      patched = patchConfigWithMarkers(cfg, items);
    }
    send(res,200,{ok:true, items, json: path.relative(PROJECT_ROOT, jsonFile).replace(/\\/g,'/'), config: cfg?path.relative(PROJECT_ROOT,cfg).replace(/\\/g,'/'):null, patched });
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
    if(req.method==='POST' && pathname==='/api/aliases')          return apiAliases(req,res);

    if(req.method==='GET'  && pathname==='/api/sections')         return apiSections(req,res);
    if(req.method==='POST' && pathname==='/api/sections/toggle')  return apiSectionToggle(req,res);
    if(req.method==='POST' && pathname==='/api/sections/create')  return apiSectionCreate(req,res);
    if(req.method==='POST' && pathname==='/api/sections/rename')  return apiSectionRename(req,res);
    if(req.method==='POST' && pathname==='/api/sections/delete')  return apiSectionDelete(req,res);
    if(req.method==='GET'  && pathname==='/api/sections/trash')   return apiSectionTrash(req,res);
    if(req.method==='POST' && pathname==='/api/sections/restore') return apiSectionRestore(req,res);
    if(req.method==='POST' && pathname==='/api/sections/nav-sync')return apiNavSync(req,res);

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
