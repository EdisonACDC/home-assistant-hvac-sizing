/* Componenti grafici comuni dell'app (0.16.0).
   Le dimensioni (barre, livelli, lancette) vengono applicate da JavaScript e non con attributi style,
   perché l'accesso esterno blocca gli stili scritti nell'HTML. */
(() => {
  const t = value => window.AppI18n?.translate(value) || value;
  const locale = () => window.AppI18n?.locale() || 'it-IT';
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[char]));
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const num = (value, digits = 1) => Number(value || 0).toLocaleString(locale(), {minimumFractionDigits: digits, maximumFractionDigits: digits});

  let helpCounter = 0;
  /** Pulsante ⓘ con testo di aiuto nascosto finché non viene toccato. */
  function info(text) {
    if (!text) return {button: '', panel: ''};
    const id = `help-${++helpCounter}`;
    return {
      button: `<button type="button" class="info-button" aria-expanded="false" aria-controls="${id}" aria-label="${escapeHtml(t('Mostra aiuto'))}">i</button>`,
      panel: `<small class="field-help" id="${id}" hidden>${escapeHtml(t(text))}</small>`
    };
  }

  /** Applica larghezze, altezze e posizioni lette dagli attributi data-*. */
  function applyGeometry(root = document) {
    root.querySelectorAll('[data-w]').forEach(node => { node.style.width = `${clamp(Number(node.dataset.w) || 0, 0, 100)}%`; });
    root.querySelectorAll('[data-h]').forEach(node => { node.style.height = `${clamp(Number(node.dataset.h) || 0, 0, 100)}%`; });
    root.querySelectorAll('[data-left]').forEach(node => { node.style.left = `${clamp(Number(node.dataset.left) || 0, 0, 100)}%`; });
    root.querySelectorAll('[data-top]').forEach(node => { node.style.top = `${clamp(Number(node.dataset.top) || 0, 0, 100)}%`; });
    root.querySelectorAll('[data-ratio]').forEach(node => { node.style.aspectRatio = node.dataset.ratio; });
  }

  /**
   * Scala a semaforo. zones: [[fine, 'danger'|'warn'|'ok'], ...] in ordine crescente, l'ultima arriva a max.
   * Restituisce HTML; la posizione della lancetta viene applicata da applyGeometry.
   */
  function gauge({label, sub = '', value, unit = '', min, max, zones, digits = 1}) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return '';
    const span = max - min;
    let start = min;
    const segments = zones.map(([end, state]) => {
      const left = (start - min) / span * 100;
      const width = (Math.min(end, max) - start) / span * 100;
      start = Math.min(end, max);
      return `<i class="zone ${state}" data-left="${left.toFixed(2)}" data-w="${width.toFixed(2)}"></i>`;
    }).join('');
    const state = zones.find(([end]) => Number(value) <= end)?.[1] || zones[zones.length - 1][1];
    const position = clamp((Number(value) - min) / span * 100, 0, 100);
    return `<div class="gauge ${state}">
      <div class="gauge-label"><strong>${escapeHtml(t(label))}</strong>${sub ? `<small>${escapeHtml(t(sub))}</small>` : ''}</div>
      <div class="gauge-scale" role="img" aria-label="${escapeHtml(`${t(label)}: ${num(value, digits)} ${unit} · ${t(state === 'ok' ? 'nella norma' : state === 'warn' ? 'da verificare' : 'fuori norma')}`)}">${segments}<span class="needle" data-left="${position.toFixed(2)}"></span></div>
      <div class="gauge-value">${num(value, digits)}${unit ? ` ${escapeHtml(unit)}` : ''}</div>
    </div>`;
  }

  /** Bombola disegnata con livello di riempimento. */
  function bottle(percent, low = false) {
    const level = percent === null || percent === undefined ? null : clamp(percent, 0, 100);
    const label = level === null ? t('Capacità non indicata') : `${t('Piena al')} ${Math.round(level)}%`;
    // Senza capacità non si può disegnare il livello: bombola tratteggiata con "?" invece di una bombola vuota.
    const body = level === null ? '<span class="q" aria-hidden="true">?</span>' : `<span class="fill" data-h="${level.toFixed(1)}"></span>`;
    return `<span class="bottle${low ? ' low' : ''}${level === null ? ' unknown' : ''}" role="img" aria-label="${escapeHtml(label)}"><span class="neck"></span><span class="body">${body}</span></span>`;
  }

  /**
   * Grafico del vuoto: evacuazione e test di risalita su scala logaritmica.
   * points: [{t: minuti, v: micron}], rise: [{t, v}] o null.
   */
  function vacuumChart({evacuation = [], rise = null, ariaLabel = ''}) {
    const all = [...evacuation, ...(rise || [])].filter(point => point.v > 0);
    if (all.length < 2) return '';
    const W = 560, H = 250, L = 56, R = 16, T = 16, B = 34;
    const maxT = Math.max(...all.map(point => point.t), 1);
    const lo = 100, hi = Math.max(2000, ...all.map(point => point.v)) * 1.15;
    const x = time => L + (time / maxT) * (W - L - R);
    const y = value => T + (1 - (Math.log10(clamp(value, lo, hi)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (H - T - B);
    const ticks = [100, 250, 500, 1000, 2500, 5000, 10000, 25000].filter(value => value <= hi);
    const path = list => list.map((point, index) => `${index ? 'L' : 'M'}${x(point.t).toFixed(1)},${y(point.v).toFixed(1)}`).join(' ');
    // Curva di evacuazione: discesa esponenziale tra i due punti noti.
    let evacuationPath = '';
    if (evacuation.length >= 2) {
      const [a, b] = [evacuation[0], evacuation[evacuation.length - 1]];
      const samples = Array.from({length: 24}, (_, index) => {
        const k = index / 23;
        return {t: a.t + (b.t - a.t) * k, v: a.v * Math.pow(b.v / a.v, 1 - Math.pow(1 - k, 2.2))};
      });
      evacuationPath = path(samples);
    }
    const riseState = rise && rise.length >= 2 ? (rise[1].v > 1000 || (rise[1].v - rise[0].v) / Math.max(rise[1].t - rise[0].t, 1) > 150 ? 'danger' : (rise[1].v - rise[0].v) / Math.max(rise[1].t - rise[0].t, 1) > 50 ? 'warn' : 'ok') : '';
    const timeTicks = [0, maxT / 2, maxT].map(value => Math.round(value));
    return `<svg class="vacuum-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(ariaLabel)}">
      <rect class="zone-bad" x="${L}" y="${T}" width="${W - L - R}" height="${(y(1000) - T).toFixed(1)}"></rect>
      <rect class="zone-mid" x="${L}" y="${y(1000).toFixed(1)}" width="${W - L - R}" height="${(y(500) - y(1000)).toFixed(1)}"></rect>
      <rect class="zone-good" x="${L}" y="${y(500).toFixed(1)}" width="${W - L - R}" height="${(H - B - y(500)).toFixed(1)}"></rect>
      ${ticks.map(value => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(value).toFixed(1)}" y2="${y(value).toFixed(1)}"></line><text class="axis" x="${L - 6}" y="${(y(value) + 4).toFixed(1)}" text-anchor="end">${value.toLocaleString(locale())}</text>`).join('')}
      <line class="target" x1="${L}" x2="${W - R}" y1="${y(500).toFixed(1)}" y2="${y(500).toFixed(1)}"></line>
      <text class="target-label" x="${W - R - 4}" y="${(y(500) - 6).toFixed(1)}" text-anchor="end">${escapeHtml(t('obiettivo'))} ≤ 500 µ</text>
      ${evacuationPath ? `<path class="line evac" d="${evacuationPath}"></path>` : ''}
      ${rise && rise.length >= 2 ? `<path class="line rise ${riseState}" d="${path(rise)}"></path><circle class="dot ${riseState}" cx="${x(rise[1].t).toFixed(1)}" cy="${y(rise[1].v).toFixed(1)}" r="5"></circle>` : ''}
      ${evacuation.length ? `<circle class="dot evac" cx="${x(evacuation[evacuation.length - 1].t).toFixed(1)}" cy="${y(evacuation[evacuation.length - 1].v).toFixed(1)}" r="5"></circle>` : ''}
      ${timeTicks.map((value, index) => `<text class="axis" x="${x(value).toFixed(1)}" y="${H - 10}" text-anchor="${index === 0 ? 'start' : index === 2 ? 'end' : 'middle'}">${value} min</text>`).join('')}
      <text class="axis unit" x="8" y="${T + 4}">µ</text>
    </svg>`;
  }

  // Aiuti: un tocco su ⓘ mostra o nasconde il testo.
  document.addEventListener('click', event => {
    const button = event.target.closest('.info-button');
    if (!button) return;
    event.preventDefault();
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    if (!panel) return;
    const open = panel.hidden;
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  });

  // Menu a tendina (utente, altre azioni): si chiudono toccando fuori.
  document.addEventListener('click', event => {
    const item = event.target.closest('details.menu .menu-item');
    document.querySelectorAll('details.menu[open]').forEach(menu => { if (!menu.contains(event.target) || (item && menu.contains(item))) menu.open = false; });
  });

  window.UI = {info, applyGeometry, gauge, bottle, vacuumChart, num, clamp, escapeHtml};
})();
