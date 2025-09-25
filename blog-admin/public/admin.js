const $=(s,r=document)=>r.querySelector(s);const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const toast=(m,ok=true)=>{const t=$('#toast');t.textContent=m;t.style.borderColor=ok?'#2b376c':'#804040';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600);};
const showError=(err)=>{if(!err)return;if(err.status===401)return;const msg=(err.detail?.err||err.detail?.out||err.message||'操作失败').slice(0,400);if(!msg)return;toast(msg,false);};
let ALL_ITEMS=[], QUERY='', CATEGORY_CACHE=[];

async function api(path, method='GET', data){
  const opt={method,headers:AdminAuth.authHeaders({'Content-Type':'application/json'})};
  if(data) opt.body=JSON.stringify(data);

  let res;
  try{
    res=await fetch(path,opt);
  }catch(networkErr){
    const err=new Error('Unable to reach admin backend. Is `node blog-admin/server.mjs` running?');
    err.detail={err:networkErr.message};
    err.status=0;
    throw err;
  }

  const text=await res.text();
  let json;
  try{json=text?JSON.parse(text):null;}catch{json=null;}

  if(res.status===401){
    AdminAuth.handleUnauthorized();
    const err=new Error('未授权或登录已过期');
    err.detail={err:'未授权或登录已过期'};
    err.status=401;
    throw err;
  }

  if(res.status===404){
    const err=new Error('接口未找到，请确认后台是否支持该操作');
    err.detail={err:json?.error||'接口返回 404 Not Found'};
    err.status=404;
    throw err;
  }

  if(!res.ok){
    const err=new Error(json?.error||`请求失败 (${res.status})`);
    err.detail={out:json?.out,err:json?.error||json?.err};
    err.status=res.status;
    throw err;
  }

  if(!json?.ok){
    const err=new Error(json?.error||'操作失败');
    err.detail={...json,out:json?.out,err:json?.err||json?.error};
    err.status=res.status;
    throw err;
  }

  return json;
}
function toVSCodeUri(abs){ const p = abs.replace(/\\/g,'/').replace(/^([A-Za-z]):/, '/$1:'); return 'vscode://file' + encodeURI(p); }
function matches(item, q){
  if(!q) return true;
  const s = q.toLowerCase();
  return [
    item.title, item.slug, item.date, item.rel,
    (item.tags||[]).join(' '),
    (item.categories||[]).join(' ')
  ].join(' ').toLowerCase().includes(s);
}

async function handleCategoryChecklist(checklist){
  if(!checklist) return;
  const posts = Array.isArray(checklist.posts) ? checklist.posts : [];
  const total = checklist.total ?? posts.length;
  const lines = [];
  const name = checklist.category || '(未命名)';
  lines.push(`分类「${name}」仍被 ${total} 篇文章引用，已阻止删除。`);
  if(posts.length){
    lines.push('', '受影响文章：');
    posts.slice(0,10).forEach((p,idx)=>{
      const status = [p.publish?'已发布':null, p.draft?'草稿标记':null, p.isLocal?'本地草稿':null].filter(Boolean).join('/');
      lines.push(`- ${p.title||p.rel||`(#${idx+1})`} (${p.rel||''})${status?` [${status}]`:''}`);
    });
    if(posts.length>10) lines.push(`… 以及另外 ${posts.length-10} 篇。`);
  }
  if(Array.isArray(checklist.instructions) && checklist.instructions.length){
    lines.push('', '下一步：');
    checklist.instructions.forEach(step=>lines.push(step));
  }
  alert(lines.join('\n'));
  const promptHint = checklist.jobEndpoint ? `（后台任务：${checklist.jobEndpoint}）` : '';
  const input = prompt(`输入新的分类名称以批量重命名${promptHint}。\n输入 “-” 或 “remove” 可仅移除该分类。\n留空或取消则退出。`, '');
  if(input === null) return;
  const trimmed = input.trim();
  if(!trimmed){ toast('已取消批量操作', false); return; }
  let payload;
  let label;
  if(trimmed === '-' || trimmed.toLowerCase()==='remove'){
    payload = { from: name, mode: 'remove' };
    label = '移除分类';
  }else{
    payload = { from: name, to: trimmed, mode: 'rename' };
    label = `重命名为 ${trimmed}`;
  }
  try{
    const result = await api('/api/categories/rewrite','POST', payload);
    toast(result.summary || `分类批处理完成：${label}`);
    await refresh();
    await loadTrash();
  }catch(e){
    toast((e.detail?.err || e.detail?.out || e.message).slice(0,400), false);
  }
}

function syncColumnSelect(categories){
  const select = $('#column');
  if(!select) return;
  const placeholder = select.dataset.placeholder || '选择分类';
  const current = select.value;
  select.innerHTML = '';
  const seen = new Set();

  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.textContent = placeholder;
  select.appendChild(placeholderOption);

  const ordered = Array.isArray(categories)
    ? [...categories].sort((a,b)=>{
        const ao = Number(a.menuOrder||0);
        const bo = Number(b.menuOrder||0);
        if(ao!==bo) return ao-bo;
        return String(a.title||'').localeCompare(String(b.title||''));
      })
    : [];

  ordered.forEach(item=>{
    const rawTitle = String(item.title||'').trim();
    if(!rawTitle || seen.has(rawTitle)) return;
    seen.add(rawTitle);
    const option = document.createElement('option');
    option.value = rawTitle;
    let label = rawTitle;
    if(item.publish === false) label += '（未上架）';
    else if(item.menuEnabled === false) label += '（菜单未上架）';
    option.textContent = label;
    if(rawTitle === current) option.selected = true;
    select.appendChild(option);
  });

  if(current && !seen.has(current)) select.value = '';
}

function render(items, categories=[]){
  const data = items.filter(x=>matches(x, QUERY));
  const isDraft = x=>{
    const rel = String(x?.rel||'');
    if(rel.startsWith('_local/')) return true;
    const abs = String(x?.abs||'');
    if(!abs) return false;
    return abs.includes('/_local/') || abs.includes('\\_local\\');
  };
  const drafts   = data.filter(x=>x.type==='post' && isDraft(x) && !x.hidden);
  const pubs     = data.filter(x=>x.type==='post' && !isDraft(x) &&  x.publish && !x.hidden);
  const archived = data.filter(x=>x.type==='post' && !isDraft(x) && !x.publish && !x.hidden);
  const pages    = data.filter(x=>x.type==='page'); // 显式列出来

  const tag=arr=>arr.map(t=>`<span class="badge">${t}</span>`).join('');
  const rowPost = (x, extraBtns='')=>`<tr>
    <td>${x.title}</td><td>${x.slug}</td><td>${x.date||''}</td>${x.publish!==undefined?`<td>${x.publish?'✅':'❌'}</td>`:''}
    <td>${tag(x.tags||[])}</td><td>${(x.categories||[]).join(', ')}</td>
    <td class="row-actions">
      ${extraBtns}
      <button data-act="open"  data-rel="${x.rel}">VS Code</button>
      <button data-act="edit"  data-rel="${x.rel}">编辑</button>
      <button data-act="remove" data-rel="${x.rel}">回收站</button>
      <button data-act="remove-hard" data-rel="${x.rel}">永久删</button>
    </td>
  </tr>`;

  $('#tbl-drafts tbody').innerHTML   = drafts.map(x=>rowPost(x, `<button data-act="promote" data-rel="${x.rel}">发布</button>`)).join('');
  $('#tbl-pubs tbody').innerHTML     = pubs.map(x=>rowPost(x, `<button data-act="archive" data-rel="${x.rel}">下架</button>`)).join('');
  $('#tbl-archived tbody').innerHTML = archived.map(x=>rowPost(x, `<button data-act="archive" data-rel="${x.rel}">下架</button><button data-act="republish" data-rel="${x.rel}">重新上架</button>`)).join('');

  $('#tbl-pages tbody').innerHTML = pages.map(x=>`<tr>
    <td>${x.title||'(无标题)'}</td><td><code>${x.rel}</code></td><td>${x.type}</td>
    <td class="row-actions">
      <button data-pact="show"   data-rel="${x.rel}">显示到文章列表</button>
      <button data-pact="hide"   data-rel="${x.rel}">隐藏</button>
      <button data-pact="markpg" data-rel="${x.rel}">设为 page</button>
      <button data-pact="open"   data-rel="${x.rel}">VS Code</button>
    </td>
  </tr>`).join('');

  syncColumnSelect(categories);

  const idx = Object.fromEntries(data.map(x=>[x.rel,x]));

  // posts actions
  $$('#tbl-drafts [data-act],#tbl-pubs [data-act],#tbl-archived [data-act]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const rel=btn.dataset.rel; const item = idx[rel];
      try{
        if(btn.dataset.act==='open'){
          if(!item?.abs) return toast('没有绝对路径',false);
          window.location.href = toVSCodeUri(item.abs); return;
        }
        if(btn.dataset.act==='edit'){
          const title = prompt('标题（留空不改）', item.title || '');
          const tags  = prompt('标签（逗号分隔，留空不改）', (item.tags||[]).join(','));
          const cats  = prompt('分类（逗号分隔，留空不改）', (item.categories||[]).join(','));
          const doPub = confirm('是否同时设 publish:true ？取消=不改');
          const patch = {};
          if(title && title!==item.title) patch.title = title;
          if(tags!==null && tags.trim()!=='') patch.tags = tags;
          if(cats!==null && cats.trim()!=='') patch.categories = cats;
          if(doPub) patch.publish = true;
          await api('/api/update-meta','POST',{rel, patch});
          toast('已更新 frontmatter');
        }else if(btn.dataset.act==='promote'){
          await api('/api/promote','POST',{rel,setDate:true}); toast(`发布成功`);
        }else if(btn.dataset.act==='archive'){
          await api('/api/archive','POST',{rel}); toast(`已下架`);
        }else if(btn.dataset.act==='republish'){
          await api('/api/republish','POST',{rel}); toast(`已重新上架`);
        }else if(btn.dataset.act==='remove'){
          if(!confirm(`移入回收站？`)) return;
          await api('/api/remove','POST',{rel,hard:false}); toast(`已移入回收站`);
        }else if(btn.dataset.act==='remove-hard'){
          if(!confirm(`永久删除？不可恢复！`)) return;
          await api('/api/remove','POST',{rel,hard:true}); toast(`已永久删除`);
        }
        await refresh(); await loadTrash();
      }catch(e){
        if(e.detail?.checklist){
          await handleCategoryChecklist(e.detail.checklist);
        }else{
          showError(e);
        }
      }
    });
  });

  // pages actions
  $$('#tbl-pages [data-pact]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const rel=btn.dataset.rel; const item = idx[rel];
      try{
        if(btn.dataset.pact==='open'){
          if(!item?.abs) return toast('没有绝对路径',false);
          window.location.href = toVSCodeUri(item.abs); return;
        }
        if(btn.dataset.pact==='hide'){
          await api('/api/update-meta','POST',{rel, patch:{ list: false, hidden: true, type: 'page' }});
          toast('已隐藏（list:false, hidden:true, type:page）');
        }else if(btn.dataset.pact==='show'){
          await api('/api/update-meta','POST',{rel, patch:{ list: true, hidden: false, type: 'post' }});
          toast('已设为文章（显示在列表）');
        }else if(btn.dataset.pact==='markpg'){
          await api('/api/update-meta','POST',{rel, patch:{ type: 'page', list: false }});
          toast('已标记为 page');
        }
        await refresh();
      }catch(e){ showError(e); }
    });
  });
}

async function loadTrash(){
  try{
    const r = await api('/api/trash','GET');
    $('#tbl-trash tbody').innerHTML = (r.items||[])
      .filter(x=> (QUERY ? (x.name+x.slug).toLowerCase().includes(QUERY.toLowerCase()) : true))
      .map(x=>`<tr>
        <td>${x.name}</td><td>${x.slug}</td>
        <td>${new Date(x.mtime).toLocaleString()}</td>
        <td class="row-actions">
          <button data-tact="restore" data-name="${x.name}" data-slug="${x.slug}">恢复到草稿</button>
          <button data-tact="delete"  data-name="${x.name}">永久删</button>
        </td></tr>`).join('');
    $$('#tbl-trash [data-tact]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const name=btn.dataset.name, slug=btn.dataset.slug;
        try{
          if(btn.dataset.tact==='restore'){ await api('/api/trash/restore','POST',{name,slug}); toast('已恢复到草稿'); }
          else if(btn.dataset.tact==='delete'){ if(!confirm(`永久删除 ${name} ？`)) return; await api('/api/trash/delete','POST',{name}); toast('已永久删除'); }
          await refresh(); await loadTrash();
        }catch(e){ showError(e); }
      });
    });
  }catch(e){
    if(e.status===404){ $('#tbl-trash tbody').innerHTML=''; return; }
    showError(e);
  }
}

async function refresh(){
  const [listRes, categoriesRes] = await Promise.all([
    api('/api/list'),
    api('/api/categories').catch(()=>({ items: [] }))
  ]);
  ALL_ITEMS = listRes.items || [];
  CATEGORY_CACHE = categoriesRes?.items || [];
  render(ALL_ITEMS, CATEGORY_CACHE);
}
async function main(){
  $('#btn-refresh').addEventListener('click', async ()=>{ try{ await refresh(); await loadTrash(); }catch(e){ showError(e); }});
  $('#btn-clear').addEventListener('click', ()=>{ $('#q').value=''; QUERY=''; render(ALL_ITEMS, CATEGORY_CACHE); loadTrash().catch(showError); });
  $('#q').addEventListener('input', e=>{ QUERY = e.target.value || ''; render(ALL_ITEMS, CATEGORY_CACHE); loadTrash().catch(showError); });

  $('#btn-create').addEventListener('click', async ()=>{
    const column = $('#column').value.trim();
    const extraCat = $('#cat').value.trim();
    const category = column || extraCat;
    const p={
      title:$('#title').value.trim(),
      desc:$('#desc').value.trim(),
      tags:$('#tags').value.trim(),
      cat:category,
      slug:$('#slug').value.trim(),
      cover:$('#cover').value.trim()
    };
    if(!p.title){ toast('请填写标题',false); return; }
    try{
      await api('/api/new-local','POST',p);
      toast('草稿已创建');
      $('#slug').value='';
      $('#column').value='';
      $('#cat').value='';
      await refresh();
    }
    catch(e){ showError(e); }
  });

  $('#btn-build').addEventListener('click', async ()=>{ try{ await api('/api/build','POST'); toast('构建完成'); } catch(e){ showError(e); } });
  $('#btn-preview').addEventListener('click', async ()=>{ try{ const r = await api('/api/preview','POST'); toast('已启动本地预览'); if (r.url) window.open(r.url, '_blank'); } catch(e){ showError(e); } });
  $('#btn-aliases').addEventListener('click', async ()=>{ try{ await api('/api/aliases','POST'); toast('别名已生成'); } catch(e){ showError(e); } });
  $('#btn-deploy').addEventListener('click', async ()=>{ try{ await api('/api/deploy','POST'); toast('部署已执行'); } catch(e){ showError(e); } });

  if(AdminAuth.isAuthed()){
    try{
      await refresh();
      await loadTrash();
    }catch(e){ showError(e); }
  }
  document.addEventListener('admin-auth-changed', async e=>{
    if(e.detail?.authed){
      try{
        await refresh();
        await loadTrash();
      }catch(err){ showError(err); }
    }else{
      ALL_ITEMS = [];
      $('#tbl-drafts tbody').innerHTML = '';
      $('#tbl-pubs tbody').innerHTML = '';
      $('#tbl-archived tbody').innerHTML = '';
      $('#tbl-pages tbody').innerHTML = '';
      $('#tbl-trash tbody').innerHTML = '';
    }
  });
}
main();
