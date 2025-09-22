const $=(s,r=document)=>r.querySelector(s);const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const toast=(m,ok=true)=>{const t=$('#toast');if(!t)return;t.textContent=m;t.style.borderColor=ok?'#2b376c':'#804040';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600);};
const ISSUE_LABELS={
  'missing-dir':'目录缺失',
  'missing-index':'缺少 index.md',
  'unpublished':'内容未上架',
  'menu-disabled':'菜单未上架',
  'unused':'未被引用'
};
const STATE={ items:[], orphans:[] };
function toastWithNavSync(message, navSync, ok=true){
  const base=String(message||'').trim()||'操作完成';
  if(!navSync){ toast(base.slice(0,400), ok); return; }
  if(navSync.ok){
    const touches=[];
    if(navSync.json) touches.push(navSync.json);
    if(navSync.config) touches.push(navSync.config);
    const suffix=touches.length?`（${touches.join('、')}）`:'';
    toast(`${base}；导航已同步${suffix}`.slice(0,400), ok);
  }else{
    const err=String(navSync.error||'未知错误');
    toast(`${base}；导航同步失败：${err}`.slice(0,400), false);
  }
}

function fmtTime(iso){ if(!iso) return ''; try{ return new Date(iso).toLocaleString(); }catch{ return ''; } }
function toVSCodeUri(abs){ if(!abs) return ''; const norm=abs.replace(/\\/g,'/'); const win=norm.replace(/^([A-Za-z]):/, '/$1:'); return 'vscode://file'+encodeURI(win); }

async function api(path, method='GET', data){
  const opt={ method, headers: AdminAuth.authHeaders({'Content-Type':'application/json'}) };
  if(data) opt.body = JSON.stringify(data);
  let res;
  try{ res = await fetch(path,opt); }
  catch(networkErr){ const err=new Error('后台接口无法访问，请确认 server.mjs 是否启动。'); err.detail={err:networkErr.message}; throw err; }
  const text = await res.text();
  let json = null; try{ json = text?JSON.parse(text):null; }catch{}
  if(res.status===401){ AdminAuth.handleUnauthorized(); const err=new Error('未授权或登录已过期'); err.status=401; err.detail={err:'未授权或登录已过期'}; throw err; }
  if(res.status===404){ const err=new Error(json?.error||'接口未找到'); err.status=404; err.detail={err:json?.error}; throw err; }
  if(!res.ok){ const err=new Error(json?.error||`请求失败 (${res.status})`); err.status=res.status; err.detail={out:json?.out, err:json?.err||json?.error}; throw err; }
  if(!json?.ok){ const err=new Error(json?.error||'操作失败'); err.status=res.status; err.detail={...json, out:json?.out, err:json?.err||json?.error}; throw err; }
  return json;
}

function describeIssues(list){ if(!Array.isArray(list)||!list.length) return '—'; return list.map(code=>ISSUE_LABELS[code]||code).join('、'); }
function formatCount(item){ const total=Number(item.postCount||0); const published=Number(item.publishedCount||0); if(!total) return '0'; if(total===published) return String(total); return `${published}/${total}`; }
function latestText(item){ const title=item.latestPublishedTitle||item.latestPostTitle||''; const when=item.latestPublishedAt||item.latestPostAt||''; if(!title) return '—'; const ts=fmtTime(when); return ts?`${title}（${ts}）`:title; }

async function runCategoryRewrite(name){ const source=String(name||'').trim(); if(!source) return false; const promptHint='输入新的分类名称以批量重命名。\n输入 “-” 或 “remove” 可仅移除该分类引用。'; const input=prompt(`${promptHint}\n留空或取消则退出。`, source); if(input===null) return false; const trimmed=input.trim(); if(!trimmed){ toast('已取消批处理',false); return false; } let payload,label; if(trimmed==='-'||trimmed.toLowerCase()==='remove'){ payload={ from:source, mode:'remove' }; label='移除分类引用'; }else{ payload={ from:source, to:trimmed, mode:'rename' }; label=`重命名为 ${trimmed}`; }
  try{ const r=await api('/api/categories/rewrite','POST',payload); toast(r.summary || `分类批处理完成：${label}`); await refresh(); return true; }
  catch(e){ toast((e.detail?.err||e.detail?.out||e.message||'操作失败').slice(0,400), false); return false; }
}

async function showCategoryChecklist(checklist){ if(!checklist) return; const posts=Array.isArray(checklist.posts)?checklist.posts:[]; const total=checklist.total ?? posts.length; const lines=[]; const name=checklist.category || '(未命名)'; lines.push(`分类「${name}」仍被 ${total} 篇文章引用，已阻止删除。`); if(posts.length){ lines.push('', '受影响文章：'); posts.slice(0,10).forEach((p,idx)=>{ const status=[p.publish?'已发布':null, p.draft?'草稿标记':null, p.isLocal?'本地草稿':null].filter(Boolean).join('/'); lines.push(`- ${p.title||p.rel||`(#${idx+1})`} (${p.rel||''})${status?` [${status}]`:''}`); }); if(posts.length>10) lines.push(`… 以及另外 ${posts.length-10} 篇。`); }
  if(Array.isArray(checklist.instructions)&&checklist.instructions.length){ lines.push('', '下一步：'); checklist.instructions.forEach(step=>lines.push(step)); }
  alert(lines.join('\n'));
  await runCategoryRewrite(name);
}

async function handleEdit(dir){
  const normalized=String(dir||'').trim();
  const item=STATE.items.find(x=>String(x.dir||'').trim()===normalized);
  if(!item){ toast('未找到对应分类', false); return; }
  const namePrompt=prompt('分类名称', item.title||'');
  if(namePrompt===null) return;
  const title=namePrompt.trim();
  if(!title){ toast('分类名称不能为空', false); return; }
  const navPrompt=prompt('导航显示文案（留空表示沿用分类名）', item.menuLabel||title);
  if(navPrompt===null) return;
  const menuLabel=navPrompt.trim();
  const dirPrompt=prompt('目录（docs/blog 下）', item.dir||'');
  if(dirPrompt===null) return;
  const nextDir=dirPrompt.trim();
  if(!nextDir){ toast('目录不能为空', false); return; }
  let ensureDir=true;
  if(item.dir !== nextDir){ ensureDir = confirm('若目标目录不存在，是否自动创建？（确定=是，取消=否）'); }
  let rewriteFlag=true;
  if(item.title !== title){ rewriteFlag = confirm('是否同步重写所有文章中的分类引用？（取消则跳过批量重写）'); }
  const payload={ dir:item.dir, title, menuLabel, nextDir, ensureDir, rewrite: rewriteFlag };
  const res = await api('/api/categories/update','POST', payload);
  let msg='分类已更新';
  if(res.dirMove?.to){ msg=`分类已更新，目录已移动到 ${res.dirMove.to}`; }
  else if(res.rewrite?.summary){ msg=res.rewrite.summary; }
  toastWithNavSync(msg, res.navSync, true);
}

function renderCategories(list){
  const tbody=$('#tbl-categories tbody');
  if(!tbody) return;
  tbody.innerHTML=(list||[]).map(item=>{
    const issues=describeIssues(item.issues);
    const count=formatCount(item);
    const latest=latestText(item);
    const title=item.title||'(未命名)';
    const menuLabel=item.menuLabel||'';
    const dir=item.dir||'';
    const dirDisplay=dir?`<code>${dir}</code>`:'<em>（未设置）</em>';
    const publishBtn=item.publish?'下架内容':'上架内容';
    const menuBtn=item.menuEnabled?'下架菜单':'上架菜单';
    const latestHover=item.latestPublishedAt||item.latestPostAt?fmtTime(item.latestPublishedAt||item.latestPostAt):'';
    const countTitle=item.postCount===item.publishedCount
      ? `${item.postCount} 篇文章（全部已发布）`
      : `${item.publishedCount} 篇已发布 / 总计 ${item.postCount}`;
    return `<tr>
      <td>${title}</td>
      <td>${menuLabel || '—'}</td>
      <td>${dirDisplay}</td>
      <td title="${countTitle}">${count}</td>
      <td>${item.publish?'✅':'❌'}</td>
      <td>${item.menuEnabled?'✅':'❌'}</td>
      <td title="${latestHover}">${latest}</td>
      <td>${issues}</td>
      <td class="row-actions">
        <button data-act="edit" data-dir="${dir}">编辑</button>
        <button data-act="toggle-publish" data-dir="${dir}" data-value="${!item.publish}">${publishBtn}</button>
        <button data-act="toggle-menu" data-dir="${dir}" data-value="${!item.menuEnabled}">${menuBtn}</button>
        <button data-act="rewrite" data-title="${title}">批处理</button>
        <button data-act="delete" data-dir="${dir}">删除</button>
        <button data-act="delete-hard" data-dir="${dir}">硬删除</button>
        <button data-act="open" data-dir="${dir}" data-abs="${item.absDir||''}" data-index="${item.hasIndex?'true':'false'}">VS Code</button>
      </td>
    </tr>`;
  }).join('');

  $$('#tbl-categories [data-act]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const dir=btn.dataset.dir||'';
      const title=btn.dataset.title||'';
      try{
        if(btn.dataset.act==='edit'){
          await handleEdit(dir);
        }else if(btn.dataset.act==='toggle-publish'){
          const res = await api('/api/categories/toggle','POST',{ dir, field:'publish', value: btn.dataset.value==='true' });
          toastWithNavSync('已更新内容上架状态', res.navSync, true);
        }else if(btn.dataset.act==='toggle-menu'){
          const res = await api('/api/categories/toggle','POST',{ dir, field:'menuEnabled', value: btn.dataset.value==='true' });
          toastWithNavSync('已更新菜单上架状态', res.navSync, true);
        }else if(btn.dataset.act==='delete'){
          if(!dir){ toast('缺少目录标识',false); return; }
          if(!confirm('确认删除该分类？（不会移除目录）')) return;
          const res = await api('/api/categories/delete','POST',{ dir });
          toastWithNavSync('已删除分类', res.navSync, true);
        }else if(btn.dataset.act==='delete-hard'){
          if(!dir){ toast('缺少目录标识',false); return; }
          if(!confirm('确认删除该分类并尝试移除目录？')) return;
          const res = await api('/api/categories/delete','POST',{ dir, hard:true });
          toastWithNavSync('已删除分类，目录如为空将被移除', res.navSync, true);
        }else if(btn.dataset.act==='rewrite'){
          await runCategoryRewrite(title || dir);
        }else if(btn.dataset.act==='open'){
          const abs=btn.dataset.abs||'';
          if(!abs){ toast('没有可打开的目录', false); return; }
          const hasIndex=btn.dataset.index==='true';
          const base=abs.replace(/\\/g,'/').replace(/\/$/,'');
          const target=hasIndex?`${base}/index.md`:base;
          window.location.href=toVSCodeUri(target);
          return;
        }
        await refresh();
      }catch(e){
        if(e.detail?.checklist){ await showCategoryChecklist(e.detail.checklist); }
        else toast((e.detail?.err||e.detail?.out||e.message||'操作失败').slice(0,400), false);
      }
    });
  });
}

function renderIssues(list){
  const tbody=$('#tbl-issues tbody');
  if(!tbody) return;
  if(!list || !list.length){ tbody.innerHTML='<tr><td colspan="4"><em>暂无异常分类</em></td></tr>'; return; }
  tbody.innerHTML=list.map(item=>{
    const count=item.postCount ? `${item.publishedCount}/${item.postCount}` : '0';
    const latest=item.latestPostTitle ? `${item.latestPostTitle}${item.latestPostAt?`（${fmtTime(item.latestPostAt)}）`:''}` : '—';
    return `<tr>
      <td>${item.title}</td>
      <td>${count}</td>
      <td>${latest}</td>
      <td class="row-actions">
        <button data-oact="fill" data-title="${item.title}">补登记</button>
        <button data-oact="rewrite" data-title="${item.title}">批处理</button>
      </td>
    </tr>`;
  }).join('');

  $$('#tbl-issues [data-oact]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const title=btn.dataset.title||'';
      if(btn.dataset.oact==='fill'){
        const titleInput=$('#new-title'); if(titleInput) titleInput.value=title;
        const menuInput=$('#new-menu'); if(menuInput) menuInput.value=title;
        const dirInput=$('#new-dir'); if(dirInput) dirInput.focus();
        toast('已将分类名称填入新建表单');
      }else if(btn.dataset.oact==='rewrite'){
        await runCategoryRewrite(title);
      }
    });
  });
}

async function refresh(){
  try{
    const res = await api('/api/categories');
    STATE.items = res.items || [];
    STATE.orphans = res.orphans || [];
    renderCategories(STATE.items);
    renderIssues(STATE.orphans);
  }catch(e){ toast((e.detail?.err||e.detail?.out||e.message||'刷新失败').slice(0,400), false); }
}

async function navSync(){
  try{
    const res = await api('/api/categories/nav-sync','POST');
    let msg = `已生成 ${res.json}`;
    if(res.config){
      msg += res.patched?.mode==='patched'
        ? `，并写入 ${res.config} 的 /* ADMIN NAV START */ 区块`
        : `。未直接修改 ${res.config}，请确认配置文件中存在标记块。`;
    }else{
      msg += '。未找到 VitePress 配置文件，仅生成 JSON。';
    }
    alert(msg);
  }catch(e){ toast((e.detail?.err||e.detail?.out||e.message||'导航同步失败').slice(0,400), false); }
}

function readCreateForm(){
  const title=($('#new-title')?.value||'').trim();
  const dir=($('#new-dir')?.value||'').trim();
  const menuLabel=($('#new-menu')?.value||'').trim();
  const publish=$('#new-publish')?.value!=='false';
  const menuEnabled=$('#new-menu-enabled')?.value!=='false';
  const orderRaw=($('#new-order')?.value||'').trim();
  const orderNum=orderRaw?Number(orderRaw):NaN;
  const createDir=$('#new-create-dir')?.checked!==false;
  const payload={ title, dir, menuLabel, publish, menuEnabled, createDir };
  if(Number.isFinite(orderNum)) payload.menuOrder=orderNum;
  return payload;
}

function resetCreateForm(){
  const title=$('#new-title'); if(title) title.value='';
  const menu=$('#new-menu'); if(menu) menu.value='';
  const dir=$('#new-dir'); if(dir) dir.value='';
  const order=$('#new-order'); if(order) order.value='';
  const publish=$('#new-publish'); if(publish) publish.value='true';
  const menuEnabled=$('#new-menu-enabled'); if(menuEnabled) menuEnabled.value='true';
  const createDir=$('#new-create-dir'); if(createDir) createDir.checked=true;
}

async function main(){
  $('#btn-refresh')?.addEventListener('click', refresh);
  $('#btn-nav-sync')?.addEventListener('click', navSync);
  $('#btn-create')?.addEventListener('click', async ()=>{
    const payload = readCreateForm();
    if(!payload.title){ toast('请填写分类名称', false); return; }
    if(!payload.dir){ toast('请填写目录', false); return; }
    try{
      const res = await api('/api/categories/create','POST', payload);
      toastWithNavSync('分类已创建', res.navSync, true);
      resetCreateForm();
      await refresh();
    }catch(e){ toast((e.detail?.err||e.detail?.out||e.message||'创建失败').slice(0,400), false); }
  });

  document.addEventListener('admin-auth-changed', async e=>{
    if(e.detail?.authed){ await refresh(); }
    else{
      const catBody=$('#tbl-categories tbody'); if(catBody) catBody.innerHTML='';
      const issueBody=$('#tbl-issues tbody'); if(issueBody) issueBody.innerHTML='';
    }
  });

  if(AdminAuth.isAuthed()) await refresh();
}

main();
