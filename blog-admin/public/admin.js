const $=(s,r=document)=>r.querySelector(s);const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const toast=(m,ok=true)=>{const t=$('#toast');t.textContent=m;t.style.borderColor=ok?'#2b376c':'#804040';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600);};
let ALL_ITEMS=[], QUERY='';

async function api(path, method='GET', data){
  const opt = { method, headers:{ 'Content-Type':'application/json' } };
  if(data) opt.body = JSON.stringify(data);
  const res = await fetch(path, opt);
  const json = await res.json().catch(()=>({ok:false, error:'Bad JSON'}));
  if(!json.ok){
    const err = new Error(json.error || '操作失败');
    err.detail = { out: json.out, err: json.err };
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

function render(items){
  const data = items.filter(x=>matches(x, QUERY));
  const isDraft = x=> x.abs.includes('/_local/');
  const drafts   = data.filter(x=>x.type==='post' && isDraft(x) && !x.hidden);
  const pubs     = data.filter(x=>x.type==='post' && !isDraft(x) &&  x.publish && !x.hidden);
  const archived = data.filter(x=>x.type==='post' && !isDraft(x) && !x.publish && !x.hidden);
  const sections = data.filter(x=>x.type==='section');
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

  $('#tbl-sections tbody').innerHTML = sections.map(x=>`<tr>
    <td>${x.title||'(无标题)'}</td><td>${x.rel}</td><td>${x.publish?'✅':'❌'}</td>
    <td class="row-actions">
      <button data-sact="republish" data-rel="${x.rel}">上架</button>
      <button data-sact="archive"   data-rel="${x.rel}">下架</button>
      <button data-sact="open"      data-rel="${x.rel}">VS Code</button>
      <button data-sact="edit"      data-rel="${x.rel}">编辑</button>
      <button data-sact="remove"    data-rel="${x.rel}">回收站</button>
      <button data-sact="remove-hard" data-rel="${x.rel}">永久删</button>
    </td>
  </tr>`).join('');

  $('#tbl-pages tbody').innerHTML = pages.map(x=>`<tr>
    <td>${x.title||'(无标题)'}</td><td><code>${x.rel}</code></td><td>${x.type}</td>
    <td class="row-actions">
      <button data-pact="show"   data-rel="${x.rel}">显示到文章列表</button>
      <button data-pact="hide"   data-rel="${x.rel}">隐藏</button>
      <button data-pact="markpg" data-rel="${x.rel}">设为 page</button>
      <button data-pact="open"   data-rel="${x.rel}">VS Code</button>
    </td>
  </tr>`).join('');

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
      }catch(e){ toast((e.detail?.err || e.detail?.out || e.message).slice(0,400), false); }
    });
  });

  // sections actions
  $$('#tbl-sections [data-sact]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const rel=btn.dataset.rel; const item = idx[rel];
      try{
        if(btn.dataset.sact==='open'){
          if(!item?.abs) return toast('没有绝对路径',false);
          window.location.href = toVSCodeUri(item.abs); return;
        }
        if(btn.dataset.sact==='edit'){
          const title = prompt('标题（留空不改）', item.title || '');
          const doPub = confirm('是否设 publish:true ？取消=不改');
          const patch = {}; if(title && title!==item.title) patch.title = title; if(doPub) patch.publish = true;
          await api('/api/update-meta','POST',{rel, patch}); toast('已更新');
        }else if(btn.dataset.sact==='republish'){
          await api('/api/republish','POST',{rel}); toast('已上架');
        }else if(btn.dataset.sact==='archive'){
          await api('/api/archive','POST',{rel}); toast('已下架');
        }else if(btn.dataset.sact==='remove'){
          if(!confirm('移入回收站？')) return; await api('/api/remove','POST',{rel}); toast('已移入回收站');
        }else if(btn.dataset.sact==='remove-hard'){
          if(!confirm('永久删除？')) return; await api('/api/remove','POST',{rel,hard:true}); toast('已永久删除');
        }
        await refresh(); await loadTrash();
      }catch(e){ toast((e.detail?.err || e.detail?.out || e.message).slice(0,400), false); }
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
      }catch(e){ toast((e.detail?.err || e.detail?.out || e.message).slice(0,400), false); }
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
        }catch(e){ toast((e.detail?.err || e.detail?.out || e.message).slice(0,400), false); }
      });
    });
  }catch(e){ toast((e.detail?.err || e.detail?.out || e.message).slice(0,400), false); }
}

async function refresh(){ const r = await api('/api/list'); ALL_ITEMS = r.items || []; render(ALL_ITEMS); }
async function main(){
  $('#btn-refresh').addEventListener('click', async ()=>{ await refresh(); await loadTrash(); });
  $('#btn-clear').addEventListener('click', ()=>{ $('#q').value=''; QUERY=''; render(ALL_ITEMS); loadTrash(); });
  $('#q').addEventListener('input', e=>{ QUERY = e.target.value || ''; render(ALL_ITEMS); loadTrash(); });

  $('#btn-create').addEventListener('click', async ()=>{
    const p={ title:$('#title').value.trim(), desc:$('#desc').value.trim(), tags:$('#tags').value.trim(), cat:$('#cat').value.trim(), slug:$('#slug').value.trim(), cover:$('#cover').value.trim() };
    if(!p.title){ toast('请填写标题',false); return; }
    try{ await api('/api/new-local','POST',p); toast('草稿已创建'); $('#slug').value=''; await refresh(); }
    catch(e){ toast((e.detail?.err || e.detail?.out || e.message).slice(0,400), false); }
  });

  $('#btn-build').addEventListener('click', async ()=>{ try{ await api('/api/build','POST'); toast('构建完成'); } catch(e){ toast((e.detail?.err || e.detail?.out || e.message).slice(0,400), false); } });
  $('#btn-preview').addEventListener('click', async ()=>{ try{ const r = await api('/api/preview','POST'); toast('已启动本地预览'); if (r.url) window.open(r.url, '_blank'); } catch(e){ toast((e.detail?.err || e.detail?.out || e.message).slice(0,400), false); } });
  $('#btn-aliases').addEventListener('click', async ()=>{ try{ await api('/api/aliases','POST'); toast('别名已生成'); } catch(e){ toast((e.detail?.err || e.detail?.out || e.message).slice(0,400), false); } });
  $('#btn-deploy').addEventListener('click', async ()=>{ try{ await api('/api/deploy','POST'); toast('部署已执行'); } catch(e){ toast((e.detail?.err || e.detail?.out || e.message).slice(0,400), false); } });

  await refresh(); await loadTrash();
}
main();
