(() => {
  const sections = {sizing:'Dimensionamento', cylinders:'Bombole', performance:'Diagnosi', commissioning:'Vuoto'};
  let users = [];
  const form = document.querySelector('#account-form');
  const t = value => window.AppI18n?.translate(value) || value;
  window.canAccess = (section, edit = false) => {
    const me = window.appAccess;
    if (!me) return false;
    return me.role === 'admin' || (edit ? me.permissions[section] === 'edit' : ['view','edit'].includes(me.permissions[section]));
  };
  function applyAccess(me) {
    window.appAccess = me;
    document.body.dataset.appRole = me.role;
    Object.keys(sections).forEach(key => document.body.dataset[`access${key[0].toUpperCase()+key.slice(1)}`] = me.role === 'admin' ? 'edit' : me.permissions[key] || 'none');
    const allowed = Object.keys(sections).filter(key=>window.canAccess(key));
    const page = getAppRoute().page;
    showAppPage(page === 'accounts' && me.role === 'admin' ? page : allowed.includes(page) ? page : allowed[0] || 'no-access');
    document.querySelector('#account-login-link').textContent = me.login_url || t('Configura external_url nelle opzioni dell’add-on.');
    document.querySelector('#current-app-user').textContent = `${me.name} · ${t(me.role === 'admin' ? 'Amministratore' : 'Utente')}`;
    document.body.classList.remove('access-pending');
  }
  window.accessReady = api('me').then(me=>{applyAccess(me); return me;}).catch(error=>{
    document.querySelector('#access-error').textContent = t('Accesso non disponibile. Ricarica la pagina o accedi nuovamente.');
    document.querySelector('#access-error').classList.remove('hidden');
    return null;
  });
  function roleChanged() {
    document.querySelector('#account-permissions').classList.toggle('hidden', form.elements.role.value === 'admin');
  }
  function resetForm() {
    form.reset(); form.elements.id.value = ''; form.elements.active.checked = true;
    form.elements.password.required = true;
    document.querySelector('#account-editor-title').textContent = t('Crea account');
    roleChanged();
  }
  function renderUsers() {
    document.querySelector('#accounts-list').innerHTML = users.map(user=>`<article class="account-row">
      <div><strong>${escapeHtml(user.name)}</strong><p>${escapeHtml(user.username)} · ${t(user.role === 'admin' ? 'Amministratore' : 'Utente')} · ${t(user.active ? 'Attivo' : 'Disattivato')}</p>
      <small>${user.role === 'admin' ? t('Accesso completo') : Object.entries(sections).filter(([key])=>user.permissions[key]!=='none').map(([key,label])=>`${t(label)}: ${t(user.permissions[key]==='edit'?'Modifica':'Consultazione')}`).join(' · ') || t('Nessuna sezione abilitata')}</small></div>
      <button type="button" class="button secondary" data-edit-account="${escapeHtml(user.id)}">${t('Modifica')}</button></article>`).join('') || `<p>${t('Nessun account creato.')}</p>`;
  }
  async function loadUsers() {
    try { users = await api('users'); renderUsers(); } catch(error) { toast(error.message,true); }
  }
  document.querySelector('#go-accounts').addEventListener('click',()=>loadUsers());
  document.querySelector('#account-new').addEventListener('click',resetForm);
  form.elements.role.addEventListener('change',roleChanged);
  document.querySelector('#accounts-list').addEventListener('click',event=>{
    const button=event.target.closest('[data-edit-account]'); if(!button)return;
    const user=users.find(u=>u.id===button.dataset.editAccount);if(!user)return;
    form.elements.id.value=user.id; form.elements.username.value=user.username;form.elements.name.value=user.name;
    form.elements.role.value=user.role;form.elements.active.checked=user.active;
    form.elements.password.value='';form.elements.password.required=false;
    for(const key of Object.keys(sections))form.elements[`permission_${key}`].value=user.permissions[key]||'none';
    document.querySelector('#account-editor-title').textContent=t('Modifica account');roleChanged();form.scrollIntoView({behavior:'smooth'});
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();const submit=form.querySelector('[type="submit"]');submit.disabled=true;
    const payload={username:form.elements.username.value,name:form.elements.name.value,role:form.elements.role.value,active:form.elements.active.checked,
      permissions:Object.fromEntries(Object.keys(sections).map(key=>[key,form.elements[`permission_${key}`].value]))};
    if(form.elements.password.value)payload.password=form.elements.password.value;
    const id=form.elements.id.value;
    try {
      await api(id ? `users/${encodeURIComponent(id)}` : 'users',{method:id?'PUT':'POST',body:JSON.stringify(payload)});
      if(id && id===window.appAccess.id){location.replace('/admin/login');return;}
      resetForm();await loadUsers();toast('Account salvato. Le sessioni precedenti sono state revocate.');
    } catch(error){toast(error.message,true);}finally{submit.disabled=false;}
  });
  window.addEventListener('app-language-changed',renderUsers);
  window.accessReady.then(me=>{if(me?.role==='admin' && getAppRoute().page==='accounts')loadUsers();});
})();
