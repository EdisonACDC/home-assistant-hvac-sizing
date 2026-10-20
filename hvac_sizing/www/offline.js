/* Memoria offline del portale bombole: copia dei dati, sessioni e coda dei movimenti sul telefono. */
(() => {
  const PREFIX = 'hvac-cylinders:';
  const QUEUE_KEY = `${PREFIX}queue`;
  const RECENT_KEY = `${PREFIX}recent`;

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }
  function remove(key) {
    try { localStorage.removeItem(key); } catch (_) {}
  }
  function uuid() {
    if (window.crypto?.randomUUID) return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    (window.crypto || {}).getRandomValues?.(bytes);
    return [...bytes].map((byte, index) => (index === 4 || index === 6 || index === 8 || index === 10 ? '-' : '') + byte.toString(16).padStart(2, '0')).join('') || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  /* Riconosce l'indirizzo stampato nel QR: /c/<bombola>/<token>. */
  function parseCylinderLink(text) {
    try {
      const url = new URL(String(text || '').trim(), location.origin);
      const match = url.pathname.match(/^\/c\/([A-Za-z0-9-]{8,64})\/([A-Za-z0-9_-]{10,200})\/?$/);
      return match ? {id: match[1], token: match[2], path: `/c/${match[1]}/${match[2]}`} : null;
    } catch (_) {
      return null;
    }
  }

  /* Dati della bombola salvati per aprirla senza rete. */
  function saveCylinder(id, token, cylinder) {
    // Salva solo dati completi della bombola (mai risposte parziali o di errore).
    if (!id || !cylinder || !cylinder.code || !cylinder.name || cylinder.current_gas_kg == null) return;
    const savedAt = new Date().toISOString();
    write(`${PREFIX}data:${id}`, {cylinder, token, saved_at: savedAt});
    const recent = read(RECENT_KEY, []).filter(item => item.id !== id);
    recent.unshift({id, token, code: cylinder.code, name: cylinder.name, refrigerant: cylinder.refrigerant,
      current_gas_kg: cylinder.current_gas_kg, saved_at: savedAt});
    write(RECENT_KEY, recent.slice(0, 30));
  }
  function getCylinder(id) {
    return read(`${PREFIX}data:${id}`, null);
  }
  function recentCylinders() {
    return read(RECENT_KEY, []).filter(item => item && item.id && item.code);
  }

  /* Sessione operatore: vale 8 ore, solo per la bombola su cui è stata aperta. Il PIN non viene salvato. */
  function saveSession(id, token, seconds, operatorName) {
    write(`${PREFIX}session:${id}`, {token, operator: operatorName || '', expires: Date.now() + Math.max(0, Number(seconds || 0) - 60) * 1000});
  }
  function getSession(id) {
    const session = read(`${PREFIX}session:${id}`, null);
    if (!session || !session.token || session.expires <= Date.now()) return null;
    return session;
  }
  function clearSession(id) {
    remove(`${PREFIX}session:${id}`);
  }

  /* Coda dei movimenti registrati senza rete. */
  function queue() {
    return read(QUEUE_KEY, []);
  }
  function saveQueue(items) {
    write(QUEUE_KEY, items);
    window.dispatchEvent(new CustomEvent('cylinder-queue-changed', {detail: {count: items.length}}));
  }
  function enqueue(item) {
    const items = queue();
    const entry = {
      client_id: uuid(), measured_at: new Date().toISOString(), status: 'pending', error: '', ...item
    };
    items.push(entry);
    saveQueue(items);
    return entry;
  }
  function removeFromQueue(clientId) {
    saveQueue(queue().filter(item => item.client_id !== clientId));
  }
  function updateQueueItem(clientId, changes) {
    saveQueue(queue().map(item => item.client_id === clientId ? {...item, ...changes} : item));
  }

  /* Residuo previsto: ultimo valore noto più i movimenti ancora in coda. */
  function projectedGas(cylinder, cylinderId) {
    if (!cylinder) return null;
    let gas = Number(cylinder.current_gas_kg || 0);
    const tare = Number(cylinder.tare_kg || 0);
    queue().filter(item => item.cylinder_id === cylinderId && item.status !== 'error').forEach(item => {
      const payload = item.payload || {};
      if (payload.operation === 'weighing') gas = Number(payload.total_weight_kg || 0) - tare;
      else if (payload.operation === 'add') gas += Number(payload.amount_kg || 0);
      else if (payload.operation === 'remove') gas -= Number(payload.amount_kg || 0);
    });
    return Math.round(gas * 1000) / 1000;
  }

  let flushing = null;
  /**
   * Invia i movimenti in coda, uno alla volta e in ordine.
   * login(cylinderId, token) deve restituire una sessione valida (chiedendo il PIN) oppure null.
   */
  function flush(login) {
    if (flushing) return flushing;
    flushing = (async () => {
      const result = {sent: 0, needsLogin: [], errors: 0, offline: false};
      for (const item of queue()) {
        if (item.status === 'error') { result.errors += 1; continue; }
        let session = getSession(item.cylinder_id);
        if (!session && login) session = await login(item.cylinder_id, item.token);
        if (!session) {
          if (!result.needsLogin.includes(item.cylinder_id)) result.needsLogin.push(item.cylinder_id);
          continue;
        }
        let response;
        try {
          response = await fetch(`/api/public/cylinders/${encodeURIComponent(item.cylinder_id)}/${encodeURIComponent(item.token)}/transactions`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${session.token}`},
            body: JSON.stringify({...item.payload, client_id: item.client_id, measured_at: item.measured_at, queued: true})
          });
        } catch (_) {
          result.offline = true;
          break;
        }
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
          removeFromQueue(item.client_id);
          saveCylinder(item.cylinder_id, item.token, data);
          result.sent += 1;
        } else if (response.status === 401) {
          clearSession(item.cylinder_id);
          if (!result.needsLogin.includes(item.cylinder_id)) result.needsLogin.push(item.cylinder_id);
        } else if (response.status === 429 || response.status >= 500) {
          result.offline = true;
          break;
        } else {
          updateQueueItem(item.client_id, {status: 'error', error: data.error || '', error_de: data.error_de || ''});
          result.errors += 1;
        }
      }
      return result;
    })();
    return flushing.finally(() => { flushing = null; });
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', {scope: '/'}).catch(() => {});
  }

  window.CylinderOffline = {
    parseCylinderLink, saveCylinder, getCylinder, recentCylinders, saveSession, getSession, clearSession,
    queue, enqueue, removeFromQueue, projectedGas, flush, registerServiceWorker
  };
})();
