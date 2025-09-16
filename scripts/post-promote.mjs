#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const slug=process.argv.slice(2).find(a=>!a.startsWith('--'));
const setDate=process.argv.includes('--set-date');
if(!slug){ console.error('用法: npm run post:promote -- <slug> [--set-date]'); process.exit(1); }

const src=path.resolve('docs/blog/_local', `${slug}.md`);
if(!fs.existsSync(src)){ console.error('未找到草稿: '+src); process.exit(2); }
let txt=fs.readFileSync(src,'utf8');
const fm=/^---\s*([\s\S]*?)\s*---/m; const m=fm.exec(txt); if(!m){ console.error('缺少 frontmatter: '+src); process.exit(3); }
let head=m[1];
function put(key,val){ const re=new RegExp(`^\\s*${key}\\s*:.*$`,'m'); if(re.test(head)) head=head.replace(re,`${key}: ${val}`); else head+=`\n${key}: ${val}`; }
put('publish','true');
put('draft','false');
if(setDate){ const now=new Date(); const pad=n=>String(n).padStart(2,'0'); const date=`${now.getFullYear()}/${pad(now.getMonth()+1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`; put('date',`\"${date}\"`); }

let year=(/\b(\d{4})\/(?:\d{2})\//.exec(head)||[])[1] || String(new Date().getFullYear());
const dstDir=path.resolve('docs/blog', year);
fs.mkdirSync(dstDir,{recursive:true});
const dst=path.join(dstDir, `${slug}.md`);

const newTxt=txt.replace(fm,`---\n${head.trim()}\n---`);
fs.writeFileSync(dst,newTxt,'utf8');
fs.unlinkSync(src);
console.log(`✅ 已发布到: ${dst}`);
console.log('提示: 若改过 slug，请在新文 frontmatter 写 aliases: 并运行 npm run docs:aliases');
