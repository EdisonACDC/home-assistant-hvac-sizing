(() => {
  const store = window.CylinderOffline;
  const dictionary = {
    it: {
      secure_portal:'PORTALE SICURO BOMBOLE', title:'Registro refrigerante', loading:'Caricamento scheda…', operator_access:'ACCESSO OPERATORE', identify:'Identificati per visualizzare il registro', authorized_only:'Possono entrare soltanto gli operatori salvati e attivati dall’amministratore.', login:'Accedi al registro', logged_as:'Operatore collegato', close_logout:'Chiudi e disconnetti', limited_access:'Accesso limitato', single_cylinder:'Solo questa bombola', gas_remaining:'Gas effettivo residuo', total_weight:'Peso totale', tare:'Tara bombola', capacity:'Capacità', register:'REGISTRAZIONE', movement:'Carico, scarico o pesatura', operator:'Nome operatore', pin:'PIN personale', operation:'Operazione', weighing:'Pesatura bombola', add:'Aggiunta refrigerante', remove:'Prelievo refrigerante', scale_weight:'Peso totale sulla bilancia kg', amount:'Quantità refrigerante kg', machine_climate:'Dati macchina e impatto climatico', machine_brand:'Marca macchina', machine_model:'Modello macchina', machine_serial:'Matricola / numero di serie', machine_charge:'Carica macchina di targa kg', gwp:'GWP refrigerante', emitted:'Gas disperso / perdita stimata kg (opzionale)', moved_co2:'CO₂e gas movimentato', machine_co2:'CO₂e carica macchina', emission_co2:'Emissione stimata', notes:'Note / impianto / cliente', save:'Registra movimento', audit:'REGISTRO', history:'Storico movimenti', security:'Sicurezza', security_text:'L’accesso è personale e limitato alla bombola mostrata. Il PIN non viene salvato: l’accesso resta valido 8 ore su questo telefono.', admin:'Accesso amministratore', empty:'Nessun movimento registrato.', initial:'Registrazione iniziale', saved:'Movimento registrato correttamente', invalid_link:'Collegamento QR non valido', failed:'Operazione non riuscita', op_weighing:'Pesatura', op_weighing_sub:'Peso sulla bilancia', op_remove:'Prelievo', op_remove_sub:'Carica in macchina', op_add:'Aggiunta', op_add_sub:'Recupero o travaso', before:'Prima', after:'Dopo', minus_tare:'tara', negative:'Il residuo risulterebbe negativo: controlla il valore.', over_capacity:'Il residuo supera la capacità della bombola: controlla il valore.', save_weighing:'Registra pesatura', save_remove:'Registra prelievo', save_add:'Registra aggiunta',
      offline_banner:'Senza rete · dati salvati il {date}. I movimenti restano sul telefono e partono appena torna la connessione.',
      offline_nodata:'Senza rete e senza dati salvati per questa bombola: puoi comunque registrare il movimento, verrà inviato dopo.',
      offline_nologin:'Senza rete: registra pure il movimento. Quando torna la connessione ti verranno chiesti nome e PIN per inviarlo.',
      queued_saved:'Salvato sul telefono: verrà inviato appena torna la rete.', pending_title:'In attesa di invio', projected:'Residuo previsto',
      pending_count_one:'1 movimento in attesa di invio', pending_count_many:'{n} movimenti in attesa di invio', send_now:'Invia ora',
      sent:'Movimenti inviati: {n}.', still_offline:'Ancora senza rete: riprovo automaticamente.', login_to_send:'Accedi per inviare i movimenti in attesa.',
      review:'Da verificare dall’amministratore', not_sent:'Non inviato', delete:'Elimina', unknown_cylinder:'Bombola', offline_operator:'senza rete',
      app_link:'App Bombole: scansione QR anche senza rete'
    },
    de: {
      secure_portal:'SICHERES FLASCHENPORTAL', title:'Kältemittelregister', loading:'Datenblatt wird geladen…', operator_access:'BEDIENERZUGANG', identify:'Identifizieren Sie sich, um das Register anzuzeigen', authorized_only:'Nur vom Administrator gespeicherte und aktivierte Bediener dürfen sich anmelden.', login:'Register öffnen', logged_as:'Angemeldeter Bediener', close_logout:'Schließen und abmelden', limited_access:'Eingeschränkter Zugriff', single_cylinder:'Nur diese Flasche', gas_remaining:'Tatsächlicher Restinhalt', total_weight:'Gesamtgewicht', tare:'Flaschen-Tara', capacity:'Kapazität', register:'ERFASSUNG', movement:'Zugabe, Entnahme oder Wägung', operator:'Name des Bedieners', pin:'Persönliche PIN', operation:'Vorgang', weighing:'Flasche wiegen', add:'Kältemittel hinzufügen', remove:'Kältemittel entnehmen', scale_weight:'Gesamtgewicht auf der Waage kg', amount:'Kältemittelmenge kg', machine_climate:'Anlagendaten und Klimawirkung', machine_brand:'Anlagenhersteller', machine_model:'Anlagenmodell', machine_serial:'Seriennummer', machine_charge:'Nennfüllmenge der Anlage kg', gwp:'GWP des Kältemittels', emitted:'Ausgetretenes Gas / geschätzter Verlust kg (optional)', moved_co2:'CO₂e der bewegten Gasmenge', machine_co2:'CO₂e der Anlagenfüllung', emission_co2:'Geschätzte Emission', notes:'Notizen / Anlage / Kunde', save:'Vorgang erfassen', audit:'REGISTER', history:'Bewegungsverlauf', security:'Sicherheit', security_text:'Der Zugriff ist persönlich und auf die angezeigte Flasche beschränkt. Die PIN wird nicht gespeichert: Die Anmeldung gilt 8 Stunden auf diesem Telefon.', admin:'Administratorzugang', empty:'Keine Bewegung erfasst.', initial:'Ersterfassung', saved:'Vorgang erfolgreich erfasst', invalid_link:'Ungültiger oder widerrufener QR-Link', failed:'Vorgang fehlgeschlagen', op_weighing:'Wägung', op_weighing_sub:'Gewicht auf der Waage', op_remove:'Entnahme', op_remove_sub:'In Anlage gefüllt', op_add:'Zugabe', op_add_sub:'Rückgewinnung oder Umfüllen', before:'Vorher', after:'Nachher', minus_tare:'Tara', negative:'Die Restmenge wäre negativ: Wert prüfen.', over_capacity:'Die Restmenge übersteigt die Flaschenkapazität: Wert prüfen.', save_weighing:'Wägung erfassen', save_remove:'Entnahme erfassen', save_add:'Zugabe erfassen',
      offline_banner:'Ohne Netz · Daten gespeichert am {date}. Vorgänge bleiben auf dem Telefon und werden gesendet, sobald die Verbindung zurück ist.',
      offline_nodata:'Ohne Netz und ohne gespeicherte Daten für diese Flasche: Der Vorgang kann trotzdem erfasst werden und wird später gesendet.',
      offline_nologin:'Ohne Netz: Vorgang ruhig erfassen. Sobald die Verbindung zurück ist, werden Name und PIN zum Senden abgefragt.',
      queued_saved:'Auf dem Telefon gespeichert: wird gesendet, sobald das Netz zurück ist.', pending_title:'Wartet auf Übertragung', projected:'Voraussichtlicher Restinhalt',
      pending_count_one:'1 Vorgang wartet auf Übertragung', pending_count_many:'{n} Vorgänge warten auf Übertragung', send_now:'Jetzt senden',
      sent:'Gesendete Vorgänge: {n}.', still_offline:'Weiterhin ohne Netz: neuer Versuch erfolgt automatisch.', login_to_send:'Zum Senden der wartenden Vorgänge anmelden.',
      review:'Vom Administrator zu prüfen', not_sent:'Nicht gesendet', delete:'Löschen', unknown_cylinder:'Flasche', offline_operator:'ohne Netz',
      app_link:'App Flaschen: QR-Scan auch ohne Netz'
    }
  };
  const $ = selector => document.querySelector(selector);
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  let language = 'it';
  try { language = localStorage.getItem('cylinder-portal-language') || (navigator.language.toLowerCase().startsWith('de') ? 'de' : 'it'); } catch (_) {}
  let cylinder = null;
  let offline = false;
  let savedAt = '';
  const parts = location.pathname.split('/').filter(Boolean);
  const cylinderId = parts[0] === 'c' ? parts[1] : '';
  const token = parts[0] === 'c' ? parts[2] : '';
  const endpoint = `/api/public/cylinders/${encodeURIComponent(cylinderId)}/${encodeURIComponent(token)}`;
  let sessionToken = store.getSession(cylinderId)?.token || '';

  function t(key, fallback, values = {}) { return (dictionary[language]?.[key] || fallback || key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? ''); }
  const locale = () => language === 'de' ? 'de-DE' : 'it-IT';
  const when = value => new Date(value).toLocaleString(locale(), {dateStyle:'short', timeStyle:'short'});
  function applyLanguage() {
    document.documentElement.lang = language;
    document.querySelectorAll('[data-t]').forEach(node => node.textContent = t(node.dataset.t, node.textContent));
    document.querySelectorAll('[data-lang]').forEach(button => button.classList.toggle('active', button.dataset.lang === language));
    if (!$('#content').classList.contains('hidden')) render();
    operationFields();
  }
  const kg = value => `${Number(value || 0).toLocaleString(locale(),{minimumFractionDigits:3,maximumFractionDigits:3})} kg`;
  function decimal(value) {
    let normalized=String(value??'').trim().replace(/[\s ]/g,'');
    if(normalized.includes(',')&&normalized.includes('.')) normalized=normalized.lastIndexOf(',')>normalized.lastIndexOf('.')?normalized.replaceAll('.','').replace(',','.'):normalized.replaceAll(',','');
    else normalized=normalized.replace(',','.');
    return normalized;
  }
  async function api(url, options={}, authenticated=true) {
    const headers={'Content-Type':'application/json',...(authenticated&&sessionToken?{'Authorization':`Bearer ${sessionToken}`}:{})};
    const response = await fetch(url,{...options,headers:{...headers,...(options.headers||{})}});
    const data = await response.json().catch(()=>({error:'Errore di comunicazione', error_de:'Verbindungsfehler'}));
    if (!response.ok) {
      const error = new Error((language === 'de' && data.error_de) || data.error || t('failed', 'Operazione non riuscita'));
      error.status = response.status;
      throw error;
    }
    return data;
  }
  const isNetworkError = error => error instanceof TypeError || error?.status === 503;
  function operationName(value) {
    const it={initial:'Registrazione iniziale',weighing:'Pesatura',add:'Aggiunta',remove:'Prelievo'};
    const de={initial:'Ersterfassung',weighing:'Wägung',add:'Zugabe',remove:'Entnahme'};
    return (language === 'de' ? de : it)[value] || value;
  }
  const co2=value=>`${Number(value||0).toLocaleString(locale(),{minimumFractionDigits:3,maximumFractionDigits:3})} kg CO₂e`;
  const tco2=value=>Number(value||0)>=1?`${(Number(value||0)/1000).toLocaleString(locale(),{minimumFractionDigits:3,maximumFractionDigits:3})} t CO₂e`:`${Number(value||0).toLocaleString(locale(),{minimumFractionDigits:3,maximumFractionDigits:3})} kg CO₂e`;
  const pending = () => store.queue().filter(item => item.cylinder_id === cylinderId);

  function render() {
    const queued = pending();
    $('#cylinder-code').textContent = cylinder?.code || '';
    $('#cylinder-name').textContent = cylinder?.name || t('unknown_cylinder');
    $('#cylinder-refrigerant').textContent = cylinder?.refrigerant || '—';
    $('#cylinder-refrigerant').classList.toggle('hidden', !cylinder);
    const projected = store.projectedGas(cylinder, cylinderId);
    const showProjected = cylinder && queued.some(item => item.status !== 'error');
    $('#gas-label').textContent = showProjected ? t('projected') : t('gas_remaining');
    $('#gas-remaining').textContent = cylinder ? kg(showProjected ? projected : cylinder.current_gas_kg) : '—';
    $('#total-weight').textContent = cylinder ? kg(showProjected ? projected + Number(cylinder.tare_kg || 0) : cylinder.total_weight_kg) : '—';
    $('#tare').textContent = cylinder ? kg(cylinder.tare_kg) : '—';
    $('#capacity').textContent = cylinder?.capacity_kg == null ? '—' : kg(cylinder.capacity_kg);
    const banner = $('#offline-banner');
    banner.classList.toggle('hidden', !offline);
    banner.textContent = !cylinder ? t('offline_nodata') : !sessionToken ? t('offline_nologin') : t('offline_banner', '', {date: savedAt ? when(savedAt) : '—'});
    renderPending(queued);
    const history = cylinder?.history || [];
    $('#history').innerHTML=history.length ? history.map(item=>{
      const date=when(item.created_at);
      const detail=item.operation==='weighing'?`${t('total_weight','Peso totale')} ${kg(item.total_weight_kg)}`:`${item.operation==='remove'?'−':'+'}${kg(Math.abs(item.amount_kg||0))}`;
      const edited=item.edited_at?` · ${language==='de'?'Vom Administrator korrigiert':'Corretto dall’amministratore'}`:'';
      const machine=[item.machine_brand,item.machine_model,item.machine_serial].filter(Boolean).join(' · ');
      const climate=item.gwp==null?'':`${machine?`${machine} · `:''}GWP ${Number(item.gwp).toLocaleString(locale())} · ${t('moved_co2','CO₂e gas movimentato')}: ${tco2(item.co2_equivalent_kg)}${item.emission_co2_equivalent_kg==null?'':` · ${t('emission_co2','Emissione stimata')}: ${tco2(item.emission_co2_equivalent_kg)}`}`;
      const note=item.operation==='initial'&&item.notes==='Registrazione iniziale'?'':item.notes;
      const review=item.review_reason?`<small class="queue-error">${escapeHtml(t('review'))}</small>`:'';
      return `<div class="history-row history-${['add','remove','weighing','initial'].includes(item.operation) ? item.operation : 'other'}"><time>${escapeHtml(date)}</time><div><strong class="history-operation">${escapeHtml(operationName(item.operation))}</strong><small>${escapeHtml(item.operator_name||'—')} · ${escapeHtml(detail)}${note?` · ${escapeHtml(note)}`:''}${escapeHtml(edited)}</small>${climate?`<small class="climate-detail">${climate.split(' · ').map(part => `<span>${escapeHtml(part)}</span>`).join('')}</small>`:''}${review}</div><div class="value">${item.review_reason?'—':kg(item.gas_after_kg)}</div></div>`;
    }).join(''):`<div class="empty">${t('empty','Nessun movimento registrato.')}</div>`;
  }

  function renderPending(queued = pending()) {
    $('#pending-panel').classList.toggle('hidden', !queued.length);
    $('#pending-count').textContent = queued.length === 1 ? t('pending_count_one') : t('pending_count_many', '', {n: queued.length});
    $('#pending-list').innerHTML = queued.map(item => {
      const payload = item.payload || {};
      const detail = payload.operation === 'weighing' ? `${t('total_weight')} ${kg(payload.total_weight_kg)}` : `${payload.operation === 'remove' ? '−' : '+'}${kg(payload.amount_kg)}`;
      const error = item.status === 'error' ? `<small class="queue-error">${escapeHtml(t('not_sent'))}: ${escapeHtml((language === 'de' && item.error_de) || item.error)}</small>` : '';
      const remove = item.status === 'error' ? `<button type="button" class="link-button" data-delete="${escapeHtml(item.client_id)}">${escapeHtml(t('delete'))}</button>` : '';
      return `<div class="history-row queue-row"><time>${escapeHtml(when(item.measured_at))}</time><div><strong>${escapeHtml(operationName(payload.operation))}</strong><small>${escapeHtml(detail)}</small>${error}</div><div class="value">${remove}</div></div>`;
    }).join('');
  }

  function showContent() {
    $('#loading').classList.add('hidden');
    $('#login-panel').classList.add('hidden');
    $('#content').classList.remove('hidden');
    $('#logged-operator').textContent = cylinder?.operator_name || store.getSession(cylinderId)?.operator || (offline ? t('offline_operator') : '—');
    render();
    operationFields();
  }
  function showLogin(message = '') {
    $('#loading').classList.add('hidden');
    $('#content').classList.add('hidden');
    $('#login-panel').classList.remove('hidden');
    $('#login-error').textContent = message;
    $('#login-error').classList.toggle('hidden', !message);
  }
  function goOffline() {
    offline = true;
    const cached = store.getCylinder(cylinderId);
    if (cached) { cylinder = cached.cylinder; savedAt = cached.saved_at; }
    showContent();
  }

  async function load() {
    if (!cylinderId || !token) throw new Error(t('invalid_link','Collegamento QR non valido'));
    if (!navigator.onLine) { goOffline(); return; }
    if (!sessionToken) {
      try {
        // Verifica che il link sia valido e che il server risponda prima di chiedere il PIN.
        await fetch(`${endpoint}`, {headers: {'Content-Type': 'application/json'}});
      } catch (_) { goOffline(); return; }
      showLogin(pending().length ? t('login_to_send') : '');
      return;
    }
    try {
      window.syncMachineBrands?.();
      cylinder = await api(endpoint);
      offline = false;
      store.saveCylinder(cylinderId, token, cylinder);
      savedAt = new Date().toISOString();
      showContent();
      await sendPending();
    } catch (error) {
      if (isNetworkError(error)) { goOffline(); return; }
      sessionToken = '';
      store.clearSession(cylinderId);
      showLogin(pending().length ? t('login_to_send') : '');
    }
  }

  async function sendPending() {
    if (!store.queue().length || !navigator.onLine) return;
    const result = await store.flush(async id => id === cylinderId ? store.getSession(cylinderId) : null);
    const message = $('#pending-message');
    if (result.sent) {
      message.textContent = t('sent', '', {n: result.sent});
      try { cylinder = await api(endpoint); store.saveCylinder(cylinderId, token, cylinder); savedAt = new Date().toISOString(); } catch (_) {}
    } else if (result.offline) {
      message.textContent = t('still_offline');
    }
    if (result.needsLogin.includes(cylinderId)) { sessionToken = ''; showLogin(t('login_to_send')); return; }
    render();
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
      store.saveSession(cylinderId, sessionToken, result.expires_in, result.operator?.name);
      formElement.querySelector('[name="pin"]').value='';
      await load();
    } catch(error) {
      if (isNetworkError(error)) { goOffline(); return; }
      $('#login-error').textContent=error.message;
      $('#login-error').classList.remove('hidden');
    } finally { $('#login-submit').disabled=false; }
  });

  function resetForm(formElement) {
    formElement.querySelector('[name="total_weight_kg"]').value='';
    formElement.querySelector('[name="amount_kg"]').value='';
    formElement.querySelector('[name="notes"]').value='';
    ['machine_brand','machine_model','machine_serial','machine_charge_kg','gwp','emitted_kg'].forEach(name=>formElement.elements[name].value='');
    window.syncMachineBrands?.();
  }
  function showFormMessage(text, kind) {
    const box = $('#form-error');
    box.textContent = text;
    box.classList.remove('hidden', 'error', 'success');
    box.classList.add(kind);
  }
  function queueMovement(payload, formElement) {
    store.enqueue({cylinder_id: cylinderId, token, code: cylinder?.code || '', payload});
    resetForm(formElement);
    render();
    operationFields();
    showFormMessage(t('queued_saved'), 'success');
  }

  $('#operation-form').addEventListener('submit',async event=>{
    event.preventDefault();
    const formElement=event.currentTarget;
    $('#form-error').classList.add('hidden');
    const payload=Object.fromEntries(new FormData(formElement).entries());
    payload.total_weight_kg=decimal(payload.total_weight_kg);
    payload.amount_kg=decimal(payload.amount_kg);
    payload.machine_charge_kg=decimal(payload.machine_charge_kg);
    payload.gwp=decimal(payload.gwp);
    payload.emitted_kg=decimal(payload.emitted_kg);
    if (offline || !navigator.onLine || !sessionToken) { queueMovement(payload, formElement); return; }
    $('#submit').disabled=true;
    try {
      const body = {...payload, client_id: (window.crypto?.randomUUID?.() || undefined), measured_at: new Date().toISOString()};
      await api(`${endpoint}/transactions`,{method:'POST',body:JSON.stringify(body)});
      resetForm(formElement);
      cylinder=await api(endpoint);
      store.saveCylinder(cylinderId, token, cylinder);
      savedAt = new Date().toISOString();
      render();
      operationFields();
      showFormMessage(t('saved','Movimento registrato correttamente'), 'success');
    } catch(error) {
      if (isNetworkError(error)) { offline = true; queueMovement(payload, formElement); return; }
      showFormMessage(error.message, 'error');
    } finally { $('#submit').disabled=false; }
  });

  function operationFields() {
    const weighing=$('#operation').value==='weighing';
    $('#total-field').classList.toggle('hidden',!weighing);
    $('#amount-field').classList.toggle('hidden',weighing);
    $('#total-field input').required=weighing;
    $('#amount-field input').required=!weighing;
    $('#machine-fields').classList.toggle('hidden',weighing);
    const gwp=$('#operation-form [name="gwp"]');
    gwp.required=!weighing && cylinder?.gwp == null;
    if(!weighing&&!gwp.value) gwp.value=cylinder?.gwp??'';
    document.querySelectorAll('[data-op]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.op===$('#operation').value)));
    $('#submit').textContent=t(`save_${$('#operation').value}`);
    updateEnvironmentPreview();
    updateBeforeAfter();
  }
  function updateBeforeAfter(){
    const target=$('#before-after');
    if(!cylinder){target.classList.add('hidden');return;}
    target.classList.remove('hidden');
    const operation=$('#operation').value;
    const form=$('#operation-form');
    const before=Number(store.projectedGas(cylinder, cylinderId) ?? cylinder.current_gas_kg);
    let after=null, extra='';
    if(operation==='weighing'){
      const total=Number(decimal(form.elements.total_weight_kg.value)||0);
      if(total){after=total-Number(cylinder.tare_kg||0);extra=`<small class="co2">${kg(total)} − ${escapeHtml(t('minus_tare'))} ${kg(cylinder.tare_kg)}</small>`;}
    } else {
      const amount=Number(decimal(form.elements.amount_kg.value)||0);
      if(amount) after=operation==='add'?before+amount:before-amount;
    }
    const negative=after!==null&&after<0;
    const over=after!==null&&cylinder.capacity_kg!=null&&after>Number(cylinder.capacity_kg);
    const warning=negative?t('negative'):over?t('over_capacity'):'';
    target.innerHTML=`<div><span>${escapeHtml(t('before'))}</span><strong>${kg(before)}</strong></div><b class="arrow" aria-hidden="true">→</b><div><span>${escapeHtml(t('after'))}</span><strong class="${warning?'bad':''}">${after===null?'—':kg(Math.max(0,after))}</strong></div>${extra}${warning?`<small class="co2 bad">${escapeHtml(warning)}</small>`:''}`;
  }
  function updateEnvironmentPreview(){
    if($('#operation').value==='weighing')return;
    const form=$('#operation-form');
    const amount=Number(decimal(form.elements.amount_kg.value)||0),gwp=Number(decimal(form.elements.gwp.value)||0),charge=Number(decimal(form.elements.machine_charge_kg.value)||0),emitted=Number(decimal(form.elements.emitted_kg.value)||0);
    $('#environment-preview').innerHTML=`${t('moved_co2','CO₂e gas movimentato')}: <strong>${co2(amount*gwp)} · ${tco2(amount*gwp)}</strong><br>${t('machine_co2','CO₂e carica macchina')}: <strong>${co2(charge*gwp)}</strong>${emitted?`<br>${t('emission_co2','Emissione stimata')}: <strong>${co2(emitted*gwp)} · ${tco2(emitted*gwp)}</strong>`:''}`;
  }

  $('#operation').addEventListener('change',operationFields);
  $('#operation-form').addEventListener('input',event=>{if(['amount_kg','machine_charge_kg','gwp','emitted_kg'].includes(event.target.name))updateEnvironmentPreview();if(['amount_kg','total_weight_kg'].includes(event.target.name))updateBeforeAfter();});
  document.querySelectorAll('[data-op]').forEach(button=>button.addEventListener('click',()=>{$('#operation').value=button.dataset.op;operationFields();(button.dataset.op==='weighing'?$('#total-field input'):$('#amount-field input')).focus();}));
  $('#pending-list').addEventListener('click', event => {
    const button = event.target.closest('[data-delete]');
    if (!button) return;
    store.removeFromQueue(button.dataset.delete);
    render();
  });
  $('#pending-send').addEventListener('click', () => sendPending());
  $('#logout').addEventListener('click',()=>{
    sessionToken='';
    store.clearSession(cylinderId);
    cylinder=null;
    $('#content').classList.add('hidden');
    $('#login-panel').classList.remove('hidden');
    window.close();
    setTimeout(()=>{ if (!document.hidden && history.length > 1) history.back(); },150);
  });
  window.addEventListener('online', () => { if (offline) load().catch(() => {}); else sendPending(); });
  window.addEventListener('offline', () => { offline = true; if (!$('#content').classList.contains('hidden')) render(); });
  document.querySelectorAll('[data-lang]').forEach(button=>button.addEventListener('click',()=>{language=button.dataset.lang;try{localStorage.setItem('cylinder-portal-language',language);}catch(_){}applyLanguage();}));
  store.registerServiceWorker();
  applyLanguage(); operationFields();
  load().catch(error=>{$('#loading').classList.add('hidden');$('#error').textContent=error.message;$('#error').classList.remove('hidden');});
})();
