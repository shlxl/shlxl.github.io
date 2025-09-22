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
    err.detail = { ...json, out: json.out, err: json.err || json.error };
    throw err;
  }
  return json;
}
function fmtTime(ms){ try{ return new Date(ms).toLocaleString(); }catch{ return '' } }

async function showCategoryChecklist(checklist){
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
  const answer = prompt(`输入新的分类名称以批量重命名${promptHint}。\n输入 “-” 或 “remove” 可仅移除该分类。\n留空或取消则退出。`, '');
  if(answer === null) return;
  const trimmed = answer.trim();
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
  }catch(err){
    toast((err.detail?.err || err.detail?.out || err.message).slice(0,400), false);
  }
}

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
      }catch(e){
        if(e.detail?.checklist){
          await showCategoryChecklist(e.detail.checklist);
        }else{
          toast((e.detail?.err || e.detail?.out || e.message).slice(0,400), false);
        }
      }
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
