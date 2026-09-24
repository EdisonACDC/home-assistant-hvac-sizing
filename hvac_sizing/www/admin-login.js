(() => {
  const form=document.querySelector('#admin-login-form');
  const error=document.querySelector('#admin-login-error');
  const submit=document.querySelector('#admin-login-submit');
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    error.classList.add('hidden');
    submit.disabled=true;
    try {
      const response=await fetch('/admin/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.querySelector('#admin-password').value})});
      const data=await response.json().catch(()=>({error:'Errore di comunicazione'}));
      if(!response.ok) throw new Error(data.error||'Accesso non riuscito');
      location.replace('/admin/');
    } catch(reason) {
      error.textContent=reason.message;
      error.classList.remove('hidden');
      document.querySelector('#admin-password').select();
    } finally { submit.disabled=false; }
  });
})();
