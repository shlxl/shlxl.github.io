const $=(s,r=document)=>r.querySelector(s);const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const toast=(m,ok=true)=>{const t=$('#toast');t.textContent=m;t.style.borderColor=ok?'#2b376c':'#804040';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600);};

async function api(path, method='GET', data){
  const opt = { method, headers: AdminAuth.authHeaders({ 'Content-Type':'application/json' }) };
  if(data) opt.body = JSON.stringify(data);
  const res = await fetch(path, opt);
  if(res.status === 401){
    AdminAuth.handleUnauthorized();
    throw new Error('未授权或登录已过期');
  }
  const json = await res.json().catch(()=>({ok:false, error:'Bad JSON'}));
  if(!json.ok){
    const err = new Error(json.error || '操作失败');
    err.detail = { out: json.out, err: json.err };
    throw err;
  }
  return json;
}
function fmtTime(ms){ try{ return new Date(ms).toLocaleString(); }catch{ return '' } }

function render(list){
  $('#tbl-sections tbody').innerHTML = list.map(x=>`<tr>
    <td>${x.title||'(无标题)'}</td>
    <td><code>${x.rel}</code></td>
    <td>${x.childrenCount}</td>
    <td>${x.publish ? '✅' : '❌'}</td>
    <td>${fmtTime(x.mtime)}</td>
    <td class="row-actions">
      <button data-act="toggle" data-rel="${x.rel}" data-pub="${x.publish?'false':'true'}">${x.publish?'下架':'上架'}</button>
      <button data-act="rename" data-rel="${x.rel}">改路径</button>
      <button data-act="softdel" data-rel="${x.rel}">仅下架</button>
      <button data-act="harddel" data-rel="${x.rel}">移入回收站</button>
      <button data-act="open" data-abs="${x.abs}">VS Code</button>
    </td>
  </tr>`).join('');

  $$('#tbl-sections [data-act]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const rel=btn.dataset.rel, act=btn.dataset.act;
      try{
        if(act==='toggle'){
          await api('/api/sections/toggle','POST',{rel, publish: btn.dataset.pub==='true'});
          toast('已切换发布状态');
        }else if(act==='rename'){
          const newRel = prompt('新的相对路径（不含 index.md），例如 series/d2r2', rel.replace(/\/index\.md$/,''));
          if(!newRel || newRel===rel) return;
          const dry = await api('/api/sections/rename','POST',{rel, newRel, dryRun:true});
          if(!confirm(`将移动目录：\n${dry.plan.move.map(m=>m.from+' -> '+m.to).join('\n')}\n确认执行？`)) return;
          await api('/api/sections/rename','POST',{rel, newRel});
          toast('已改路径');
        }else if(act==='softdel'){
          await api('/api/sections/delete','POST',{rel, hard:false});
          toast('已下架（publish:false）');
        }else if(act==='harddel'){
          if(!confirm('仅会把 index.md 移入 .trash，不会删除子文章。确认？')) return;
          await api('/api/sections/delete','POST',{rel, hard:true});
          toast('已移入回收站');
        }else if(act==='open'){
          const abs=btn.dataset.abs; const p = abs.replace(/\\/g,'/').replace(/^([A-Za-z]):/, '/$1:');
          window.location.href = 'vscode://file' + encodeURI(p);
          return;
        }
        await refresh();
      }catch(e){ toast((e.detail?.err || e.detail?.out || e.message).slice(0,400), false); }
    });
  });
}
function renderTrash(list){
  $('#tbl-trash tbody').innerHTML = list.map(x=>`<tr>
    <td>${x.name}</td>
    <td><code>${x.guessRel}</code></td>
    <td>${fmtTime(x.mtime)}</td>
    <td class="row-actions">
      <button data-tact="restore" data-name="${x.name}">恢复</button>
    </td>
  </tr>`).join('');

  $$('#tbl-trash [data-tact]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const name=btn.dataset.name, act=btn.dataset.tact;
      try{
        if(act==='restore'){
          await api('/api/sections/restore','POST',{name});
          toast('已恢复到原路径');
          await refresh();
        }
      }catch(e){ toast((e.detail?.err || e.detail?.out || e.message).slice(0,400), false); }
    });
  });
}

async function refresh(){ 
  const r = await api('/api/sections'); 
  render(r.items||[]); 
  const t = await api('/api/sections/trash');
  renderTrash(t.items||[]);
}
async function navSync(){
  try{
    const r = await api('/api/sections/nav-sync','POST');
    let msg = `已生成 ${r.json}`;
    if(r.config){
      msg += r.patched?.mode==='patched'
        ? `，并写入 ${r.config} 的 /* ADMIN NAV START */ 区块`
        : `。未直接改 ${r.config}，你可以在该文件中添加如下标记块以后自动写入：\n/* ADMIN NAV START */\n  // admin will inject here\n/* ADMIN NAV END */`;
    }else{
      msg += `。未找到 VitePress 配置文件（docs/.vitepress/config.*），仅写入 JSON。`;
    }
    alert(msg);
  }catch(e){
    toast((e.detail?.err || e.detail?.out || e.message).slice(0,400), false);
  }
}

async function main(){
  $('#btn-refresh').addEventListener('click', refresh);
  $('#btn-nav-sync').addEventListener('click', navSync);
  $('#btn-create').addEventListener('click', async ()=>{
    const rel=$('#new-rel').value.trim().replace(/^\/+|\/+$/g,'');
    const title=$('#new-title').value.trim();
    const publish=$('#new-publish').value==='true';
    if(!rel){ toast('请填写相对路径',false); return; }
    try{ await api('/api/sections/create','POST',{rel, title, publish}); toast('已创建'); $('#new-rel').value=''; $('#new-title').value=''; await refresh(); }
    catch(e){ toast((e.detail?.err || e.detail?.out || e.message).slice(0,400), false); }
  });
  if(AdminAuth.isAuthed()){
    await refresh();
  }
  document.addEventListener('admin-auth-changed', async e=>{
    if(e.detail?.authed){
      await refresh();
    }else{
      $('#tbl-sections tbody').innerHTML = '';
      $('#tbl-trash tbody').innerHTML = '';
    }
  });
}
main();
