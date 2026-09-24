(() => {
  const dictionary = {
    it: {
      secure_portal:'PORTALE SICURO BOMBOLE', title:'Registro refrigerante', loading:'Caricamento scheda…', operator_access:'ACCESSO OPERATORE', identify:'Identificati per visualizzare il registro', authorized_only:'Possono entrare soltanto gli operatori salvati e attivati dall’amministratore.', login:'Accedi al registro', logged_as:'Operatore collegato', close_logout:'Chiudi e disconnetti', limited_access:'Accesso limitato', single_cylinder:'Solo questa bombola', gas_remaining:'Gas effettivo residuo', total_weight:'Peso totale', tare:'Tara bombola', capacity:'Capacità', register:'REGISTRAZIONE', movement:'Carico, scarico o pesatura', operator:'Nome operatore', pin:'PIN personale', operation:'Operazione', weighing:'Pesatura bombola', add:'Aggiunta refrigerante', remove:'Prelievo refrigerante', scale_weight:'Peso totale sulla bilancia kg', amount:'Quantità refrigerante kg', notes:'Note / impianto / cliente', save:'Registra movimento', audit:'REGISTRO', history:'Storico movimenti', security:'Sicurezza', security_text:'L’accesso è personale, temporaneo e limitato alla bombola mostrata. Il PIN non viene salvato sul telefono.', admin:'Accesso amministratore Home Assistant', empty:'Nessun movimento registrato.', initial:'Registrazione iniziale', saved:'Movimento registrato correttamente', invalid_link:'Collegamento QR non valido'
    },
    de: {
      secure_portal:'SICHERES FLASCHENPORTAL', title:'Kältemittelregister', loading:'Datenblatt wird geladen…', operator_access:'BEDIENERZUGANG', identify:'Identifizieren Sie sich, um das Register anzuzeigen', authorized_only:'Nur vom Administrator gespeicherte und aktivierte Bediener dürfen sich anmelden.', login:'Register öffnen', logged_as:'Angemeldeter Bediener', close_logout:'Schließen und abmelden', limited_access:'Eingeschränkter Zugriff', single_cylinder:'Nur diese Flasche', gas_remaining:'Tatsächlicher Restinhalt', total_weight:'Gesamtgewicht', tare:'Flaschen-Tara', capacity:'Kapazität', register:'ERFASSUNG', movement:'Zugabe, Entnahme oder Wägung', operator:'Name des Bedieners', pin:'Persönliche PIN', operation:'Vorgang', weighing:'Flasche wiegen', add:'Kältemittel hinzufügen', remove:'Kältemittel entnehmen', scale_weight:'Gesamtgewicht auf der Waage kg', amount:'Kältemittelmenge kg', notes:'Notizen / Anlage / Kunde', save:'Vorgang erfassen', audit:'REGISTER', history:'Bewegungsverlauf', security:'Sicherheit', security_text:'Der Zugriff ist persönlich, zeitlich begrenzt und auf die angezeigte Flasche beschränkt. Die PIN wird nicht auf dem Telefon gespeichert.', admin:'Administratorzugang über Home Assistant', empty:'Keine Bewegung erfasst.', initial:'Ersterfassung', saved:'Vorgang erfolgreich erfasst', invalid_link:'Ungültiger oder widerrufener QR-Link'
    }
  };
  const $ = selector => document.querySelector(selector);
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  let language = localStorage.getItem('cylinder-portal-language') || (navigator.language.toLowerCase().startsWith('de') ? 'de' : 'it');
  let cylinder = null;
  const parts = location.pathname.split('/').filter(Boolean);
  const cylinderId = parts[0] === 'c' ? parts[1] : '';
  const token = parts[0] === 'c' ? parts[2] : '';
  const endpoint = `/api/public/cylinders/${encodeURIComponent(cylinderId)}/${encodeURIComponent(token)}`;
  const sessionKey = `cylinder-session-${cylinderId}`;
  let sessionToken = sessionStorage.getItem(sessionKey) || '';

  function t(key, fallback) { return dictionary[language]?.[key] || fallback || key; }
  function applyLanguage() {
    document.documentElement.lang = language;
    document.querySelectorAll('[data-t]').forEach(node => node.textContent = t(node.dataset.t, node.textContent));
    document.querySelectorAll('[data-lang]').forEach(button => button.classList.toggle('active', button.dataset.lang === language));
    if (cylinder) render();
  }
  const kg = value => `${Number(value || 0).toLocaleString(language === 'de' ? 'de-DE' : 'it-IT',{minimumFractionDigits:3,maximumFractionDigits:3})} kg`;
  function decimal(value) {
    let normalized=String(value??'').trim().replace(/[\s\u00a0]/g,'');
    if(normalized.includes(',')&&normalized.includes('.')) normalized=normalized.lastIndexOf(',')>normalized.lastIndexOf('.')?normalized.replaceAll('.','').replace(',','.'):normalized.replaceAll(',','');
    else normalized=normalized.replace(',','.');
    return normalized;
  }
  async function api(url, options={}, authenticated=true) {
    const headers={'Content-Type':'application/json',...(authenticated&&sessionToken?{'Authorization':`Bearer ${sessionToken}`}:{})};
    const response = await fetch(url,{...options,headers:{...headers,...(options.headers||{})}});
    const data = await response.json().catch(()=>({error:'Errore di comunicazione'}));
    if (!response.ok) throw new Error(data.error || 'Operazione non riuscita');
    return data;
  }
  function operationName(value) {
    const it={initial:'Registrazione iniziale',weighing:'Pesatura',add:'Aggiunta',remove:'Prelievo'};
    const de={initial:'Ersterfassung',weighing:'Wägung',add:'Zugabe',remove:'Entnahme'};
    return (language === 'de' ? de : it)[value] || value;
  }
  function render() {
    $('#cylinder-code').textContent=cylinder.code;
    $('#cylinder-name').textContent=cylinder.name;
    $('#cylinder-refrigerant').textContent=cylinder.refrigerant;
    $('#gas-remaining').textContent=kg(cylinder.current_gas_kg);
    $('#total-weight').textContent=kg(cylinder.total_weight_kg);
    $('#tare').textContent=kg(cylinder.tare_kg);
    $('#capacity').textContent=cylinder.capacity_kg == null ? '—' : kg(cylinder.capacity_kg);
    $('#history').innerHTML=cylinder.history.length ? cylinder.history.map(item=>{
      const date=new Date(item.created_at).toLocaleString(language==='de'?'de-DE':'it-IT',{dateStyle:'short',timeStyle:'short'});
      const detail=item.operation==='weighing'?`${t('total_weight','Peso totale')} ${kg(item.total_weight_kg)}`:`${item.operation==='remove'?'−':'+'}${kg(Math.abs(item.amount_kg||0))}`;
      const edited=item.edited_at?` · ${language==='de'?'Vom Administrator korrigiert':'Corretto dall’amministratore'}`:'';
      return `<div class="history-row"><time>${escapeHtml(date)}</time><div><strong>${escapeHtml(operationName(item.operation))}</strong><small>${escapeHtml(item.operator_name||'—')} · ${escapeHtml(detail)}${item.notes?` · ${escapeHtml(item.notes)}`:''}${escapeHtml(edited)}</small></div><div class="value">${kg(item.gas_after_kg)}</div></div>`;
    }).join(''):`<div class="empty">${t('empty','Nessun movimento registrato.')}</div>`;
  }
  function operationFields() {
    const weighing=$('#operation').value==='weighing';
    $('#total-field').classList.toggle('hidden',!weighing);
    $('#amount-field').classList.toggle('hidden',weighing);
    $('#total-field input').required=weighing;
    $('#amount-field input').required=!weighing;
  }
  async function load() {
    if (!cylinderId || !token) throw new Error(t('invalid_link','Collegamento QR non valido'));
    $('#loading').classList.add('hidden');
    if (!sessionToken) { $('#login-panel').classList.remove('hidden'); return; }
    try {
      cylinder=await api(endpoint);
      $('#logged-operator').textContent=cylinder.operator_name;
      $('#login-panel').classList.add('hidden');
      $('#content').classList.remove('hidden');
      render();
    } catch(error) {
      sessionToken=''; sessionStorage.removeItem(sessionKey);
      $('#content').classList.add('hidden');
      $('#login-panel').classList.remove('hidden');
    }
  }
  $('#login-form').addEventListener('submit',async event=>{
    event.preventDefault();
    const formElement=event.currentTarget;
    $('#login-error').classList.add('hidden');
    $('#login-submit').disabled=true;
    try {
      const payload=Object.fromEntries(new FormData(formElement).entries());
      const result=await api(`${endpoint}/login`,{method:'POST',body:JSON.stringify(payload)},false);
      sessionToken=result.session_token;
      sessionStorage.setItem(sessionKey,sessionToken);
      formElement.querySelector('[name="pin"]').value='';
      await load();
    } catch(error) {
      $('#login-error').textContent=error.message;
      $('#login-error').classList.remove('hidden');
    } finally { $('#login-submit').disabled=false; }
  });
  $('#operation-form').addEventListener('submit',async event=>{
    event.preventDefault();
    const formElement=event.currentTarget;
    $('#form-error').classList.add('hidden');
    const form=new FormData(formElement);
    const payload=Object.fromEntries(form.entries());
    payload.total_weight_kg=decimal(payload.total_weight_kg);
    payload.amount_kg=decimal(payload.amount_kg);
    $('#submit').disabled=true;
    try {
      await api(`${endpoint}/transactions`,{method:'POST',body:JSON.stringify(payload)});
      formElement.querySelector('[name="total_weight_kg"]').value='';
      formElement.querySelector('[name="amount_kg"]').value='';
      formElement.querySelector('[name="notes"]').value='';
      cylinder=await api(endpoint);
      render();
      $('#form-error').textContent=t('saved','Movimento registrato correttamente');
      $('#form-error').classList.remove('hidden');
      $('#form-error').classList.remove('error');
      $('#form-error').classList.add('success');
    } catch(error) {
      $('#form-error').textContent=error.message;
      $('#form-error').classList.remove('hidden');
      $('#form-error').classList.add('error');
      $('#form-error').classList.remove('success');
    } finally { $('#submit').disabled=false; }
  });
  $('#operation').addEventListener('change',operationFields);
  $('#logout').addEventListener('click',()=>{
    sessionToken='';
    sessionStorage.removeItem(sessionKey);
    cylinder=null;
    $('#content').classList.add('hidden');
    $('#login-panel').classList.remove('hidden');
    window.close();
    setTimeout(()=>{ if (!document.hidden && history.length > 1) history.back(); },150);
  });
  document.querySelectorAll('[data-lang]').forEach(button=>button.addEventListener('click',()=>{language=button.dataset.lang;localStorage.setItem('cylinder-portal-language',language);applyLanguage();}));
  applyLanguage(); operationFields();
  load().catch(error=>{$('#loading').classList.add('hidden');$('#error').textContent=error.message;$('#error').classList.remove('hidden');});
})();
