(function(){
  const TOKEN_KEY = 'blogAdminToken';
  let token = localStorage.getItem(TOKEN_KEY) || '';

  const getOverlay = () => document.getElementById('login-overlay');
  const getPasswordInput = () => document.getElementById('login-password');
  const getErrorBox = () => document.getElementById('login-error');
  const getHelpBox = () => document.getElementById('login-help');

  function setError(message){
    const box = getErrorBox();
    if(box) box.textContent = message || '';
  }

  function showOverlay(message){
    const overlay = getOverlay();
    if(!overlay) return;
    const help = getHelpBox();
    if(help) help.textContent = message || '请输入访问密码以继续。';
    overlay.classList.remove('hidden');
    document.body.classList.remove('authed');
    setError('');
    const input = getPasswordInput();
    if(input){
      input.value = '';
      setTimeout(()=>input.focus(), 50);
    }
  }

  function hideOverlay(){
    const overlay = getOverlay();
    if(!overlay) return;
    overlay.classList.add('hidden');
    document.body.classList.add('authed');
    setError('');
    const input = getPasswordInput();
    if(input) input.value = '';
  }

  function persistToken(value){
    token = value || '';
    if(token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }

  async function login(){
    const input = getPasswordInput();
    const password = input ? input.value.trim() : '';
    if(!password){
      setError('请输入密码');
      if(input) input.focus();
      return;
    }
    try{
      const res = await fetch('/api/login', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ password })
      });
      if(res.status === 401){
        setError('密码错误或无访问权限');
        if(input){ input.focus(); input.select(); }
        return;
      }
      const json = await res.json().catch(()=>({ ok:false, error:'Bad JSON' }));
      if(!json.ok || !json.token){
        throw new Error(json.error || '登录失败');
      }
      persistToken(json.token);
      hideOverlay();
      document.dispatchEvent(new CustomEvent('admin-auth-changed', { detail:{ authed:true } }));
    }catch(err){
      setError(err.message || '登录失败');
    }
  }

  async function logout(message){
    const current = token;
    if(current){
      try{
        await fetch('/api/logout', {
          method:'POST',
          headers:{ Authorization: `Bearer ${current}` }
        });
      }catch{ /* ignore network failures during logout */ }
    }
    persistToken('');
    showOverlay(message || '已退出登录，请重新输入密码。');
    document.dispatchEvent(new CustomEvent('admin-auth-changed', { detail:{ authed:false } }));
  }

  function authHeaders(headers={}){
    if(!headers || typeof headers !== 'object') headers = {};
    if(token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  function handleUnauthorized(){
    logout('登录已过期，请重新输入密码。');
  }

  window.AdminAuth = {
    login,
    logout,
    authHeaders,
    handleUnauthorized,
    showOverlay,
    isAuthed: ()=>Boolean(token)
  };

  document.addEventListener('DOMContentLoaded', ()=>{
    const submitBtn = document.getElementById('login-submit');
    if(submitBtn){
      submitBtn.addEventListener('click', login);
    }
    const pwdInput = getPasswordInput();
    if(pwdInput){
      pwdInput.addEventListener('keydown', e=>{
        if(e.key === 'Enter'){
          e.preventDefault();
          login();
        }
      });
    }
    const logoutBtn = document.getElementById('btn-logout');
    if(logoutBtn){
      logoutBtn.addEventListener('click', ()=>logout());
    }
    if(token){
      document.body.classList.add('authed');
      hideOverlay();
    }else{
      showOverlay();
    }
  });
})();
