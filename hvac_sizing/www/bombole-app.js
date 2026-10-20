/* App Bombole: scanner QR, bombole recenti e invio dei movimenti registrati senza rete. */
(() => {
  const store = window.CylinderOffline;
  const dictionary = {
    it: {
      secure_portal: 'PORTALE SICURO BOMBOLE', app_title: 'Bombole', scan: 'Scansiona bombola', scan_stop: 'Chiudi fotocamera',
      scan_help: 'Inquadra il QR sulla bombola. Funziona anche senza rete.', scan_looking: 'Cerco il QR…',
      scan_not_cylinder: 'Questo QR non è di una bombola del registro.', scan_no_camera: 'Fotocamera non disponibile. Consenti l’accesso alla fotocamera nelle impostazioni del browser.',
      scan_no_reader: 'Questo telefono non riesce a leggere i QR qui. Usa la fotocamera del telefono quando c’è rete.',
      queue_eyebrow: 'SENZA RETE', queue_one: '1 movimento in attesa di invio', queue_many: '{n} movimenti in attesa di invio',
      send_now: 'Invia ora', sending: 'Invio in corso…', sent: 'Movimenti inviati: {n}.', still_offline: 'Ancora senza rete: invio automatico appena torna la connessione.',
      login_needed: 'Per inviare i movimenti di {code} accedi con nome e PIN. Il PIN non viene salvato.', login_send: 'Accedi e invia',
      operator: 'Nome operatore', pin: 'PIN personale', item_error: 'Non inviato', delete: 'Elimina',
      recent_eyebrow: 'SU QUESTO TELEFONO', recent_title: 'Bombole recenti', recent_empty: 'Nessuna bombola aperta su questo telefono. Scansiona un QR con la rete per salvarla.',
      saved_at: 'dati del {date}', offline_banner: 'Senza rete: puoi aprire le bombole salvate e registrare movimenti, verranno inviati dopo.',
      install_title: 'Installa sul telefono', install_ios: 'iPhone: in Safari tocca Condividi e poi “Aggiungi alla schermata Home”.',
      install_android: 'Android: in Chrome apri il menu ⋮ e scegli “Installa app” o “Aggiungi a schermata Home”.',
      install_why: 'Apri sempre i QR con il pulsante Scansiona di questa app: così le bombole si aprono anche senza rete.',
      weighing: 'Pesatura', add: 'Aggiunta', remove: 'Prelievo', total: 'Totale'
    },
    de: {
      secure_portal: 'SICHERES FLASCHENPORTAL', app_title: 'Flaschen', scan: 'Flasche scannen', scan_stop: 'Kamera schließen',
      scan_help: 'QR-Code auf der Flasche erfassen. Funktioniert auch ohne Netz.', scan_looking: 'QR-Code wird gesucht…',
      scan_not_cylinder: 'Dieser QR-Code gehört zu keiner Flasche im Register.', scan_no_camera: 'Kamera nicht verfügbar. Kamerazugriff in den Browsereinstellungen erlauben.',
      scan_no_reader: 'Dieses Telefon kann hier keine QR-Codes lesen. Bei Netz die Telefonkamera verwenden.',
      queue_eyebrow: 'OHNE NETZ', queue_one: '1 Vorgang wartet auf Übertragung', queue_many: '{n} Vorgänge warten auf Übertragung',
      send_now: 'Jetzt senden', sending: 'Wird gesendet…', sent: 'Gesendete Vorgänge: {n}.', still_offline: 'Weiterhin ohne Netz: automatische Übertragung, sobald die Verbindung zurück ist.',
      login_needed: 'Zum Senden der Vorgänge von {code} mit Name und PIN anmelden. Die PIN wird nicht gespeichert.', login_send: 'Anmelden und senden',
      operator: 'Name des Bedieners', pin: 'Persönliche PIN', item_error: 'Nicht gesendet', delete: 'Löschen',
      recent_eyebrow: 'AUF DIESEM TELEFON', recent_title: 'Zuletzt geöffnete Flaschen', recent_empty: 'Auf diesem Telefon wurde noch keine Flasche geöffnet. QR-Code mit Netz scannen, um sie zu speichern.',
      saved_at: 'Daten vom {date}', offline_banner: 'Ohne Netz: gespeicherte Flaschen lassen sich öffnen und Vorgänge erfassen; sie werden später gesendet.',
      install_title: 'Auf dem Telefon installieren', install_ios: 'iPhone: In Safari auf Teilen und dann „Zum Home-Bildschirm“ tippen.',
      install_android: 'Android: In Chrome das Menü ⋮ öffnen und „App installieren“ oder „Zum Startbildschirm hinzufügen“ wählen.',
      install_why: 'QR-Codes immer mit der Scan-Taste dieser App öffnen: So lassen sich Flaschen auch ohne Netz öffnen.',
      weighing: 'Wägung', add: 'Zugabe', remove: 'Entnahme', total: 'Gesamt'
    }
  };
  const $ = selector => document.querySelector(selector);
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[char]));
  let language = 'it';
  try { language = localStorage.getItem('cylinder-portal-language') || (navigator.language.toLowerCase().startsWith('de') ? 'de' : 'it'); } catch (_) {}
  const t = (key, values = {}) => (dictionary[language][key] || dictionary.it[key] || key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
  const locale = () => language === 'de' ? 'de-DE' : 'it-IT';
  const kg = value => `${Number(value || 0).toLocaleString(locale(), {minimumFractionDigits: 3, maximumFractionDigits: 3})} kg`;
  const when = value => new Date(value).toLocaleString(locale(), {dateStyle: 'short', timeStyle: 'short'});

  function applyLanguage() {
    document.documentElement.lang = language;
    document.querySelectorAll('[data-t]').forEach(node => { node.textContent = t(node.dataset.t); });
    document.querySelectorAll('[data-lang]').forEach(button => button.classList.toggle('active', button.dataset.lang === language));
    renderAll();
  }

  /* ---------- Scanner ---------- */
  let stream = null;
  let scanning = false;
  let detector = null;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', {willReadFrequently: true});

  async function readFrame(video) {
    if (detector) {
      const codes = await detector.detect(video).catch(() => []);
      return codes[0]?.rawValue || '';
    }
    if (typeof window.jsQR !== 'function' || !video.videoWidth) return '';
    const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    return window.jsQR(image.data, image.width, image.height, {inversionAttempts: 'attemptBoth'})?.data || '';
  }

  async function startScan() {
    const status = $('#scan-status');
    if (!navigator.mediaDevices?.getUserMedia) { status.textContent = t('scan_no_camera'); return; }
    if ('BarcodeDetector' in window) {
      try {
        const formats = await window.BarcodeDetector.getSupportedFormats();
        if (formats.includes('qr_code')) detector = new window.BarcodeDetector({formats: ['qr_code']});
      } catch (_) { detector = null; }
    }
    if (!detector && typeof window.jsQR !== 'function') { status.textContent = t('scan_no_reader'); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({video: {facingMode: {ideal: 'environment'}}, audio: false});
    } catch (_) {
      status.textContent = t('scan_no_camera');
      return;
    }
    const video = $('#scan-video');
    video.srcObject = stream;
    await video.play().catch(() => {});
    $('#scanner').classList.remove('hidden');
    $('#scan-start').classList.add('hidden');
    status.textContent = t('scan_looking');
    scanning = true;
    while (scanning) {
      const text = await readFrame(video);
      if (text) {
        const link = store.parseCylinderLink(text);
        if (link) {
          stopScan();
          location.href = link.path;
          return;
        }
        status.textContent = t('scan_not_cylinder');
      }
      await new Promise(resolve => setTimeout(resolve, 180));
    }
  }
  function stopScan() {
    scanning = false;
    stream?.getTracks().forEach(track => track.stop());
    stream = null;
    $('#scanner').classList.add('hidden');
    $('#scan-start').classList.remove('hidden');
    $('#scan-status').textContent = t('scan_help');
  }

  /* ---------- Coda ---------- */
  let memoryCredentials = null; // solo in memoria, mai salvati
  let pendingLogin = null;

  function describe(item) {
    const payload = item.payload || {};
    const detail = payload.operation === 'weighing'
      ? `${t('total')} ${kg(payload.total_weight_kg)}`
      : `${payload.operation === 'remove' ? '−' : '+'}${kg(payload.amount_kg)}`;
    return `${t(payload.operation)} · ${detail}`;
  }

  function renderQueue() {
    const items = store.queue();
    $('#queue-panel').classList.toggle('hidden', !items.length);
    $('#queue-title').textContent = items.length === 1 ? t('queue_one') : t('queue_many', {n: items.length});
    $('#queue-list').innerHTML = items.map(item => {
      const error = item.status === 'error' ? `<small class="queue-error">${escapeHtml(t('item_error'))}: ${escapeHtml((language === 'de' && item.error_de) || item.error)}</small>` : '';
      const remove = item.status === 'error' ? `<button type="button" class="link-button" data-delete="${escapeHtml(item.client_id)}">${escapeHtml(t('delete'))}</button>` : '';
      return `<div class="history-row queue-row"><time>${escapeHtml(when(item.measured_at))}</time><div><strong>${escapeHtml(item.code || '')}</strong><small>${escapeHtml(describe(item))}</small>${error}</div><div class="value">${remove}</div></div>`;
    }).join('');
  }

  function renderRecent() {
    const recent = store.recentCylinders();
    $('#recent-list').innerHTML = recent.length ? recent.map(item => `
      <a class="history-row recent-row" href="/c/${encodeURIComponent(item.id)}/${encodeURIComponent(item.token)}">
        <time>${escapeHtml(item.code)}</time>
        <div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.refrigerant)} · ${escapeHtml(t('saved_at', {date: when(item.saved_at)}))}</small></div>
        <div class="value">${kg(store.projectedGas({current_gas_kg: item.current_gas_kg, tare_kg: store.getCylinder(item.id)?.cylinder?.tare_kg}, item.id))}</div>
      </a>`).join('') : `<div class="empty">${escapeHtml(t('recent_empty'))}</div>`;
  }

  function renderNetwork() {
    const banner = $('#network-banner');
    banner.textContent = t('offline_banner');
    banner.classList.toggle('hidden', navigator.onLine);
  }

  function renderAll() {
    renderQueue();
    renderRecent();
    renderNetwork();
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone;
    $('#install-panel').classList.toggle('hidden', Boolean(standalone));
  }

  async function loginFor(cylinderId, token) {
    if (!memoryCredentials) {
      const code = store.queue().find(item => item.cylinder_id === cylinderId)?.code || '';
      pendingLogin = {cylinderId, token};
      $('#queue-login-help').textContent = t('login_needed', {code});
      $('#queue-login').classList.remove('hidden');
      return null;
    }
    try {
      const response = await fetch(`/api/public/cylinders/${encodeURIComponent(cylinderId)}/${encodeURIComponent(token)}/login`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(memoryCredentials)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        memoryCredentials = null;
        throw new Error((language === 'de' && data.error_de) || data.error || '');
      }
      store.saveSession(cylinderId, data.session_token, data.expires_in, data.operator?.name);
      return store.getSession(cylinderId);
    } catch (error) {
      if (error instanceof TypeError) return null;
      $('#queue-login-error').textContent = error.message;
      $('#queue-login-error').classList.remove('hidden');
      $('#queue-login').classList.remove('hidden');
      return null;
    }
  }

  async function send() {
    if (!store.queue().length) return;
    const message = $('#queue-message');
    message.textContent = t('sending');
    const result = await store.flush(loginFor);
    if (result.sent) message.textContent = t('sent', {n: result.sent});
    else if (result.offline) message.textContent = t('still_offline');
    else if (!result.needsLogin.length) message.textContent = '';
    if (!result.needsLogin.length) $('#queue-login').classList.add('hidden');
    renderAll();
  }

  $('#queue-login').addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    memoryCredentials = {operator_name: form.get('operator_name'), pin: form.get('pin')};
    event.currentTarget.elements.pin.value = '';
    $('#queue-login-error').classList.add('hidden');
    $('#queue-login').classList.add('hidden');
    if (pendingLogin) await loginFor(pendingLogin.cylinderId, pendingLogin.token);
    pendingLogin = null;
    await send();
  });
  $('#queue-list').addEventListener('click', event => {
    const button = event.target.closest('[data-delete]');
    if (!button) return;
    store.removeFromQueue(button.dataset.delete);
    renderAll();
  });
  $('#queue-send').addEventListener('click', send);
  $('#scan-start').addEventListener('click', startScan);
  $('#scan-stop').addEventListener('click', stopScan);
  document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => {
    language = button.dataset.lang;
    try { localStorage.setItem('cylinder-portal-language', language); } catch (_) {}
    applyLanguage();
  }));
  window.addEventListener('online', () => { renderNetwork(); send(); });
  window.addEventListener('offline', renderNetwork);
  window.addEventListener('cylinder-queue-changed', renderQueue);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopScan(); });

  store.registerServiceWorker();
  applyLanguage();
  if (navigator.onLine) send();
})();
