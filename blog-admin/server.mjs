#!/usr/bin/env node
import { createServer } from 'node:http';
import { parse as parseUrl } from 'node:url';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 5174);
const HOST = process.env.HOST || '127.0.0.1';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');
const BLOG_DIR = path.join(DOCS_DIR, 'blog');
const PUBLIC_DIR = path.join(__dirname, 'public');
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts');

const PREVIEW_PORT = Number(process.env.PREVIEW_PORT || 4173);
const DIST_DIR = path.join(DOCS_DIR, '.vitepress', 'dist');

const TRASH_DIR = path.join(DOCS_DIR, '.trash');
const LOCAL_DIR = path.join(BLOG_DIR, '_local');

const JSON_HEADERS = {
  'Content-Type':'application/json; charset=utf-8',
  'Access-Control-Allow-Origin':'*'
};

function send(res, code, data){
  res.writeHead(code, JSON_HEADERS);
  res.end(typeof data === 'string' ? data : JSON.stringify(data));
}
function notFound(res){ send(res, 404, { ok:false, error:'Not found' }); }
function readBody(req){
  return new Promise((resolve,reject)=>{
    let s=''; req.on('data',d=>s+=d);
    req.on('end',()=>{ try{ resolve(s?JSON.parse(s):{});}catch{reject(new Error('Invalid JSON'));} });
    req.on('error',reject);
  });
}
function runCmd(cmd, args=[], opts={cwd: PROJECT_ROOT}){
  return new Promise((resolve,reject)=>{
    const p = spawn(cmd, args, { cwd: opts.cwd, shell: process.platform === 'win32', env: process.env });
    let out='', err='';
    p.stdout.on('data', d=> out+=String(d));
    p.stderr.on('data', d=> err+=String(d));
    p.on('close', c=> c===0 ? resolve({out,err}) : reject(Object.assign(new Error('fail'),{out,err,code:c})));
    p.on('error', reject);
  });
}
const runNodeScript = (rel, args=[]) => runCmd(process.execPath, [path.join(SCRIPTS_DIR, rel), ...args]);

function parseFM(txt=''){
  const m = /^---\s*([\s\S]*?)\s*---/m.exec(txt);
  const fm = {title:'',date:'',publish:undefined,draft:undefined,tags:[],categories:[],cover:''};
  if(!m) return fm;
  const h = m[1];
  const get = k=>{ const re=new RegExp('^\\s*'+k+'\\s*:\\s*(.*)$','mi'); const mm=re.exec(h); return mm? mm[1].trim() : '' };
  const list = k=> get(k).replace(/^\[|\]$/g,'').split(',').map(s=>s.trim().replace(/^["']|["']$/g,'')).filter(Boolean);
  fm.title = get('title').replace(/^["']|["']$/g,'');
  fm.date = get('date').replace(/^["']|["']$/g,'');
  fm.cover = get('cover').replace(/^["']|["']$/g,'');
  fm.publish = (/^\s*publish\s*:\s*(true|false)/mi.exec(h)||[])[1];
  fm.draft = (/^\s*draft\s*:\s*(true|false)/mi.exec(h)||[])[1];
  try{ fm.tags = list('tags'); }catch{}
  try{ fm.categories = list('categories'); }catch{}
  return fm;
}
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
const slugOf = p=> path.basename(p).replace(/\.md$/i,'');

function findMdBySlug(dir, slug){
  if(!fs.existsSync(dir)) return '';
  for(const name of fs.readdirSync(dir)){
    const p = path.join(dir,name); const st=fs.statSync(p);
    if(st.isDirectory()){ const r=findMdBySlug(p,slug); if(r) return r; }
    else if(name.toLowerCase()===(slug.toLowerCase()+'.md')) return p;
  }
  return '';
}
function setPublishFlag(file, publish){
  const fm = /^---\s*([\s\S]*?)\s*---/m;
  let txt = fs.readFileSync(file,'utf8');
  const m = fm.exec(txt); if(!m) throw new Error('frontmatter missing: '+file);
  let head = m[1];
  const put=(k,v)=>{ const re=new RegExp(`^\\s*${k}\\s*:\\s*.*$`,'mi'); head = re.test(head) ? head.replace(re, `${k}: ${v}`) : (head+`\n${k}: ${v}`); };
  put('publish', publish ? 'true' : 'false');
  if(publish) put('draft','false');
  txt = txt.replace(fm, `---\n${head.trim()}\n---`);
  fs.writeFileSync(file, txt, 'utf8');
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
  put('title', patch.title);
  put('date',  patch.date);
  put('cover', patch.cover);
  if (patch.publish !== undefined) put('publish', patch.publish ? 'true' : 'false');
  if (patch.draft   !== undefined) put('draft',   patch.draft   ? 'true' : 'false');
  if (patch.tags){
    const tags = Array.isArray(patch.tags) ? patch.tags : String(patch.tags).split(',').map(s=>s.trim()).filter(Boolean);
    put('tags', tags);
  }
  if (patch.categories){
    const cats = Array.isArray(patch.categories) ? patch.categories : String(patch.categories).split(',').map(s=>s.trim()).filter(Boolean);
    put('categories', cats);
  }
  const out = read.replace(FM, `---\n${head.trim()}\n---`);
  fs.writeFileSync(file, out, 'utf8');
}

// APIs
async function apiList(req,res){
  const files = walkMd(BLOG_DIR);
  const items = files.map(f=>{
    const txt = fs.readFileSync(f,'utf8');
    const fm = parseFM(txt);
    return {
      slug: slugOf(f),
      path: path.relative(PROJECT_ROOT,f).replace(/\\/g,'/'),
      abs:  f,
      title: fm.title || slugOf(f),
      date: fm.date || '',
      publish: fm.publish === 'true',
      draft: fm.draft === 'true',
      tags: fm.tags || [],
      categories: fm.categories || [],
      cover: fm.cover || '',
      location: f.includes(`${path.sep}_local${path.sep}`) ? 'draft' : 'published'
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
  const b = await readBody(req); if(!b.slug) return send(res,400,{ok:false,error:'missing slug'});
  const args=[ String(b.slug) ]; if(b.setDate) args.push('--set-date');
  try{ const r = await runNodeScript('post-promote.mjs', args); send(res,200,{ok:true,out:r.out.trim()}); }
  catch(e){ send(res,500,{ok:false,error:e.message,out:e.out,err:e.err}); }
}
async function apiArchive(req,res){
  const b = await readBody(req); if(!b.slug) return send(res,400,{ok:false,error:'missing slug'});
  try{ const r = await runNodeScript('post-archive.mjs', [ String(b.slug) ]); send(res,200,{ok:true,out:r.out.trim()}); }
  catch(e){ send(res,500,{ok:false,error:e.message,out:e.out,err:e.err}); }
}
async function apiRemove(req,res){
  const b = await readBody(req); if(!b.slug) return send(res,400,{ok:false,error:'missing slug'});
  const args=[ String(b.slug) ]; if(b.hard) args.push('--hard');
  try{ const r = await runNodeScript('post-remove.mjs', args); send(res,200,{ok:true,out:r.out.trim()}); }
  catch(e){ send(res,500,{ok:false,error:e.message,out:e.out,err:e.err}); }
}
async function apiAliases(req,res){
  try{ const r = await runNodeScript('gen-alias-redirects.mjs', []); send(res,200,{ok:true,out:r.out.trim()}); }
  catch(e){ send(res,500,{ok:false,error:e.message,out:e.out,err:e.err}); }
}
async function apiUpdateMeta(req,res){
  try{
    const b = await readBody(req);
    const { slug, patch } = b || {};
    if(!slug || !patch) return send(res,400,{ok:false,error:'missing slug or patch'});
    const file = findMdBySlug(BLOG_DIR, slug);
    if(!file) return send(res,404,{ok:false,error:'not found'});
    updateFrontmatter(file, patch);
    send(res,200,{ok:true,file:file.replace(PROJECT_ROOT+path.sep,'').replace(/\\+/g,'/')});
  }catch(e){ send(res,500,{ok:false,error:e.message}); }
}
async function ensureBuilt() {
  const ok = fs.existsSync(DIST_DIR) && fs.existsSync(path.join(DIST_DIR, 'index.html'));
  if (ok) return 'already';
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const r = await runCmd(npx, ['vitepress', 'build', 'docs']);
  return r.out || 'built';
}
async function apiBuild(req,res){
  try{
    const npx = process.platform==='win32' ? 'npx.cmd' : 'npx';
    const r = await runCmd(npx, ['vitepress','build','docs']);
    send(res,200,{ok:true,out:r.out.trim()});
  }catch(e){ send(res,500,{ok:false,error:e.message,out:e.out,err:e.err}); }
}
async function apiPreview(req, res) {
  try {
    await ensureBuilt();
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const child = spawn(
      npx,
      ['vitepress','preview','docs','--host','--port', String(PREVIEW_PORT)],
      { cwd: PROJECT_ROOT, shell: process.platform==='win32', env: process.env, detached: true, stdio: 'ignore', windowsHide: true }
    );
    child.unref();
    send(res, 200, { ok: true, url: `http://127.0.0.1:${PREVIEW_PORT}` });
  } catch (e) {
    send(res, 500, { ok: false, error: e.message, out: e.out, err: e.err });
  }
}
async function apiDeploy(req,res){
  try{ const r=await runNodeScript('deploy-local.mjs', []); send(res,200,{ok:true,out:r.out.trim()}); }
  catch(e){ send(res,500,{ok:false,error:e.message,out:e.out,err:e.err}); }
}
async function apiRepublish(req,res){
  try{
    const { slug } = await readBody(req);
    if(!slug) return send(res,400,{ok:false,error:'missing slug'});
    const file = findMdBySlug(BLOG_DIR, slug);
    if(!file)   return send(res,404,{ok:false,error:'not found'});
    setPublishFlag(file, true);
    send(res,200,{ok:true,file:file.replace(PROJECT_ROOT+path.sep,'').replace(/\\+/g,'/')});
  }catch(e){ send(res,500,{ok:false,error:e.message}); }
}
async function apiTrashList(req,res){
  try{
    if(!fs.existsSync(TRASH_DIR)) return send(res,200,{ok:true,items:[]});
    const items = fs.readdirSync(TRASH_DIR)
      .filter(n=>n.toLowerCase().endsWith('.md'))
      .map(n=>{
        const p = path.join(TRASH_DIR,n); const s = fs.statSync(p);
        const base = n.replace(/\.md$/i,'');
        const guess = base.replace(/^\d{8,14}[-_]?/,'');
        return { name:n, slug:guess, mtime:s.mtimeMs };
      }).sort((a,b)=>b.mtime-a.mtime);
    send(res,200,{ok:true,items});
  }catch(e){ send(res,500,{ok:false,error:e.message}); }
}
async function apiTrashRestore(req,res){
  try{
    const { slug, name } = await readBody(req);
    if(!fs.existsSync(TRASH_DIR)) return send(res,404,{ok:false,error:'trash not found'});
    const candidates = fs.readdirSync(TRASH_DIR).filter(n=>n.endsWith('.md'));
    let pick = name && candidates.includes(name) ? name
             : slug ? candidates.find(n=>n.toLowerCase().includes(slug.toLowerCase())) : '';
    if(!pick) return send(res,404,{ok:false,error:'no match in trash'});
    const src = path.join(TRASH_DIR, pick);
    fs.mkdirSync(LOCAL_DIR,{recursive:true});
    let dst = path.join(LOCAL_DIR, `${(slug||pick.replace(/\.md$/i,''))}.md`);
    if(fs.existsSync(dst)){
      const t = new Date(); const pad=n=>String(n).padStart(2,'0');
      const stamp=`${t.getFullYear()}${pad(t.getMonth()+1)}${pad(t.getDate())}${pad(t.getHours())}${pad(t.getMinutes())}${pad(t.getSeconds())}`;
      dst = path.join(LOCAL_DIR, `${(slug||'post')}.restored-${stamp}.md`);
    }
    fs.renameSync(src, dst);
    send(res,200,{ok:true,dst:dst.replace(PROJECT_ROOT+path.sep,'').replace(/\\+/g,'/')});
  }catch(e){ send(res,500,{ok:false,error:e.message}); }
}
async function apiTrashDelete(req,res){
  try{
    const { name } = await readBody(req);
    if(!name) return send(res,400,{ok:false,error:'missing name'});
    const p = path.join(TRASH_DIR, name);
    if(!p.startsWith(TRASH_DIR) || !fs.existsSync(p)) return send(res,404,{ok:false,error:'not found'});
    fs.unlinkSync(p);
    send(res,200,{ok:true});
  }catch(e){ send(res,500,{ok:false,error:e.message}); }
}
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
  } else {
    if (p === 'favicon.ico') { res.writeHead(204); return res.end(); }
    notFound(res);
  }
}
const server = createServer(async (req,res)=>{
  const { pathname } = parseUrl(req.url);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'content-type'});
    return res.end();
  }
  try{
    if(req.method==='GET'  && pathname==='/api/list')           return apiList(req,res);
    if(req.method==='POST' && pathname==='/api/new-local')       return apiNewLocal(req,res);
    if(req.method==='POST' && pathname==='/api/promote')         return apiPromote(req,res);
    if(req.method==='POST' && pathname==='/api/archive')         return apiArchive(req,res);
    if(req.method==='POST' && pathname==='/api/remove')          return apiRemove(req,res);
    if(req.method==='POST' && pathname==='/api/aliases')         return apiAliases(req,res);
    if(req.method==='POST' && pathname==='/api/build')           return apiBuild(req,res);
    if(req.method==='POST' && pathname==='/api/preview')         return apiPreview(req,res);
    if(req.method==='POST' && pathname==='/api/deploy')          return apiDeploy(req,res);

    if(req.method==='POST' && pathname==='/api/republish')       return apiRepublish(req,res);
    if(req.method==='GET'  && pathname==='/api/trash')           return apiTrashList(req,res);
    if(req.method==='POST' && pathname==='/api/trash/restore')   return apiTrashRestore(req,res);
    if(req.method==='POST' && pathname==='/api/trash/delete')    return apiTrashDelete(req,res);
    if(req.method==='POST' && pathname==='/api/update-meta')     return apiUpdateMeta(req,res);

    return serveStatic(req,res);
  }catch(e){ send(res,500,{ok:false,error:e.message}); }
});
server.listen(PORT, HOST, ()=>{
  console.log(`[admin] running   : http://${HOST}:${PORT}`);
  console.log(`[admin] PROJECT_ROOT: ${PROJECT_ROOT}`);
  console.log(`[admin] PUBLIC_DIR  : ${PUBLIC_DIR}`);
  console.log(`[admin] PREVIEW_PORT: ${PREVIEW_PORT}`);
});
