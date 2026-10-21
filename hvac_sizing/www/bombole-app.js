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
      weighing: 'Pesatura', add: 'Aggiunta', remove: 'Prelievo', total: 'Totale',
      ready_eyebrow: 'PROVA SENZA RETE', ready_ok: 'Pronta per l’uso senza rete', ready_partial: 'Quasi pronta', ready_no: 'Non ancora pronta senza rete',
      check_home: 'Aperta dall’icona sulla schermata Home', check_home_no: 'Aperta nel browser: aggiungila alla schermata Home (istruzioni qui sotto)',
      check_sw: 'Memoria per l’uso senza rete attiva', check_sw_wait: 'Memoria senza rete in preparazione: ricarica la pagina una volta con la rete',
      check_sw_no: 'Questo browser non salva le pagine per l’uso senza rete: usa l’icona sulla schermata Home',
      check_saved: 'Bombole salvate su questo telefono: {n}', check_saved_no: 'Nessuna bombola salvata: con la rete scansiona le bombole che userai e accedi con nome e PIN',
      howto_title: 'Come installarla con {browser}',
      other_browsers: 'Istruzioni per gli altri browser', browser_other: 'questo browser',
      ios_safari: 'Tocca Condividi (quadrato con freccia) e poi “Aggiungi alla schermata Home”.',
      ios_chrome: 'Tocca Condividi nella barra dell’indirizzo (in alto a destra) e poi “Aggiungi alla schermata Home”.',
      ios_firefox: 'Tocca il menu ☰ (in basso a destra), poi Condividi e “Aggiungi alla schermata Home”.',
      ios_edge: 'Tocca il menu ··· (in basso), poi Condividi e “Aggiungi alla schermata Home”.',
      ios_other: 'Apri il menu Condividi del browser e scegli “Aggiungi alla schermata Home”. Se manca, apri questo indirizzo in Safari.',
      ios_note: 'Su iPhone l’uso senza rete funziona solo dall’icona sulla schermata Home, con qualunque browser tu l’abbia aggiunta.',
      android_chrome: 'Apri il menu ⋮ (in alto a destra) e scegli “Installa app” o “Aggiungi a schermata Home”.',
      android_firefox: 'Apri il menu ⋮ e scegli “Installa” o “Aggiungi alla schermata Home”.',
      android_samsung: 'Apri il menu ☰ (in basso a destra), poi “Aggiungi pagina a” → “Schermata Home”.',
      android_edge: 'Apri il menu ··· (in basso) e scegli “Aggiungi al telefono” o “Installa app”.',
      android_other: 'Apri il menu del browser e scegli “Installa” o “Aggiungi alla schermata Home”.',
      desktop: 'Sul computer: in Chrome o Edge usa l’icona di installazione nella barra dell’indirizzo; in Firefox e Safari tieni la pagina nei preferiti.',
      label_ios: 'iPhone / iPad', label_android: 'Android', label_desktop: 'Computer',
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
      weighing: 'Wägung', add: 'Zugabe', remove: 'Entnahme', total: 'Gesamt',
      ready_eyebrow: 'TEST OHNE NETZ', ready_ok: 'Bereit für die Nutzung ohne Netz', ready_partial: 'Fast bereit', ready_no: 'Noch nicht bereit ohne Netz',
      check_home: 'Über das Symbol auf dem Home-Bildschirm geöffnet', check_home_no: 'Im Browser geöffnet: zum Home-Bildschirm hinzufügen (Anleitung unten)',
      check_sw: 'Speicher für die Nutzung ohne Netz aktiv', check_sw_wait: 'Offline-Speicher wird vorbereitet: Seite einmal mit Netz neu laden',
      check_sw_no: 'Dieser Browser speichert keine Seiten für die Nutzung ohne Netz: das Symbol auf dem Home-Bildschirm verwenden',
      check_saved: 'Auf diesem Telefon gespeicherte Flaschen: {n}', check_saved_no: 'Keine Flasche gespeichert: mit Netz die benötigten Flaschen scannen und mit Name und PIN anmelden',
      howto_title: 'So installierst du sie mit {browser}',
      other_browsers: 'Anleitung für andere Browser', browser_other: 'diesem Browser',
      ios_safari: 'Auf Teilen (Quadrat mit Pfeil) und dann „Zum Home-Bildschirm“ tippen.',
      ios_chrome: 'In der Adressleiste (oben rechts) auf Teilen und dann „Zum Home-Bildschirm“ tippen.',
      ios_firefox: 'Menü ☰ (unten rechts) öffnen, dann Teilen und „Zum Home-Bildschirm“.',
      ios_edge: 'Menü ··· (unten) öffnen, dann Teilen und „Zum Home-Bildschirm“.',
      ios_other: 'Im Teilen-Menü des Browsers „Zum Home-Bildschirm“ wählen. Fehlt der Eintrag, diese Adresse in Safari öffnen.',
      ios_note: 'Auf dem iPhone funktioniert die Nutzung ohne Netz nur über das Symbol auf dem Home-Bildschirm, egal mit welchem Browser es hinzugefügt wurde.',
      android_chrome: 'Menü ⋮ (oben rechts) öffnen und „App installieren“ oder „Zum Startbildschirm hinzufügen“ wählen.',
      android_firefox: 'Menü ⋮ öffnen und „Installieren“ oder „Zum Startbildschirm hinzufügen“ wählen.',
      android_samsung: 'Menü ☰ (unten rechts) öffnen, dann „Seite hinzufügen zu“ → „Startbildschirm“.',
      android_edge: 'Menü ··· (unten) öffnen und „Zum Telefon hinzufügen“ oder „App installieren“ wählen.',
      android_other: 'Im Browsermenü „Installieren“ oder „Zum Startbildschirm hinzufügen“ wählen.',
      desktop: 'Am Computer: In Chrome oder Edge das Installationssymbol in der Adressleiste verwenden; in Firefox und Safari die Seite als Lesezeichen speichern.',
      label_ios: 'iPhone / iPad', label_android: 'Android', label_desktop: 'Computer',
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

  /* ---------- Prova senza rete: browser riconosciuto e controlli ---------- */
  function detectBrowser() {
    const ua = navigator.userAgent || '';
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const android = /Android/.test(ua);
    const platform = ios ? 'ios' : android ? 'android' : 'desktop';
    let browser = 'other';
    if (/EdgiOS|EdgA|Edg\//.test(ua)) browser = 'edge';
    else if (/FxiOS|Firefox\//.test(ua)) browser = 'firefox';
    else if (/SamsungBrowser/.test(ua)) browser = 'samsung';
    else if (/OPiOS|OPR\/|OPT\//.test(ua)) browser = 'other';
    else if (/CriOS|Chrome\//.test(ua)) browser = 'chrome';
    else if (/Safari\//.test(ua) && ios) browser = 'safari';
    else if (/Safari\//.test(ua) && !android) browser = 'safari';
    if (platform === 'ios' && browser === 'samsung') browser = 'other';
    return {platform, browser};
  }
  const BROWSER_NAMES = {safari: 'Safari', chrome: 'Chrome', firefox: 'Firefox', edge: 'Edge', samsung: 'Samsung Internet'};
  const IOS_BROWSERS = ['safari', 'chrome', 'firefox', 'edge'];
  const ANDROID_BROWSERS = ['chrome', 'firefox', 'samsung', 'edge'];
  const howto = (platform, browser) => platform === 'desktop' ? t('desktop')
    : t(`${platform}_${(platform === 'ios' ? IOS_BROWSERS : ANDROID_BROWSERS).includes(browser) ? browser : 'other'}`);

  function renderReady() {
    const {platform, browser} = detectBrowser();
    const standalone = Boolean(window.matchMedia?.('(display-mode: standalone)').matches || window.matchMedia?.('(display-mode: fullscreen)').matches || navigator.standalone);
    const swSupported = 'serviceWorker' in navigator;
    const swActive = swSupported && Boolean(navigator.serviceWorker.controller);
    const saved = store.recentCylinders().length;
    const checks = [];
    checks.push({ok: standalone, text: t(standalone ? 'check_home' : 'check_home_no'), soft: platform !== 'ios'});
    checks.push({ok: swActive, text: t(swActive ? 'check_sw' : swSupported ? 'check_sw_wait' : 'check_sw_no')});
    checks.push({ok: saved > 0, text: saved ? t('check_saved', {n: saved}) : t('check_saved_no')});
    // Su iPhone serve l'icona sulla schermata Home; su Android e computer il browser basta, ma l'icona è comunque consigliata.
    const essential = checks.filter(check => !check.soft);
    const ready = essential.every(check => check.ok);
    const state = ready && checks.every(check => check.ok) ? 'ok' : ready ? 'partial' : 'no';
    $('#ready-panel').className = `panel ready-panel ${state}`;
    $('#ready-title').textContent = t(state === 'ok' ? 'ready_ok' : state === 'partial' ? 'ready_partial' : 'ready_no');
    const name = BROWSER_NAMES[browser] || t('browser_other');
    $('#ready-browser').textContent = `${t(`label_${platform}`)} · ${name}`;
    $('#ready-checks').innerHTML = checks.map(check => `<li class="${check.ok ? 'ok' : check.soft ? 'soft' : 'no'}"><b aria-hidden="true">${check.ok ? '✓' : check.soft ? '!' : '✕'}</b><span>${escapeHtml(check.text)}</span></li>`).join('');
    $('#ready-howto').innerHTML = standalone ? '' : `<strong>${escapeHtml(t('howto_title', {browser: name}))}</strong><p>${escapeHtml(howto(platform, browser))}</p>${platform === 'ios' ? `<p class="login-help">${escapeHtml(t('ios_note'))}</p>` : ''}`;
    const list = (key, browsers) => `<h3>${escapeHtml(t(`label_${key}`))}</h3><ul>${browsers.map(item => `<li><b>${BROWSER_NAMES[item]}</b> — ${escapeHtml(t(`${key}_${item}`))}</li>`).join('')}</ul>`;
    $('#ready-all').innerHTML = `${list('ios', IOS_BROWSERS)}<p class="login-help">${escapeHtml(t('ios_note'))}</p>${list('android', ANDROID_BROWSERS)}<h3>${escapeHtml(t('label_desktop'))}</h3><p>${escapeHtml(t('desktop'))}</p>`;
  }

  function renderAll() {
    renderQueue();
    renderRecent();
    renderNetwork();
    renderReady();
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
  navigator.serviceWorker?.addEventListener('controllerchange', renderReady);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) renderReady(); });
  window.addEventListener('offline', renderNetwork);
  window.addEventListener('cylinder-queue-changed', renderQueue);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopScan(); });

  store.registerServiceWorker();
  applyLanguage();
  if (navigator.onLine) send();
})();
