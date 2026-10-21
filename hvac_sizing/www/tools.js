/* Strumenti: convertitore di unità, kW ↔ BTU/h, GWP e controllo perdite (0.16.0). */
(() => {
  const q = selector => document.querySelector(selector);
  const t = value => window.AppI18n?.translate(value) || value;
  const locale = () => window.AppI18n?.locale() || 'it-IT';
  const fmt = (value, digits = 3) => {
    if (!Number.isFinite(value)) return '—';
    const abs = Math.abs(value);
    const d = abs >= 10000 ? 0 : abs >= 100 ? Math.min(digits, 1) : abs >= 1 ? Math.min(digits, 2) : digits;
    return value.toLocaleString(locale(), {maximumFractionDigits: d, minimumFractionDigits: 0});
  };
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[char]));

  const ATM_BAR = 1.01325;
  // Ogni unità: fattore verso l'unità base della grandezza (bar, Pa, W).
  const QUANTITIES = {
    pressure: {base: 'bar', units: {bar: 1, kPa: 0.01, MPa: 10, psi: 0.0689476, 'kg/cm²': 0.980665, inHg: 0.0338639}, initial: 'bar', note: 'Il riferimento “Relativa” è la lettura del manometro; “Assoluta” aggiunge la pressione atmosferica standard (1,013 bar).'},
    vacuum: {base: 'Pa', units: {micron: 0.133322, Pa: 1, mbar: 100, Torr: 133.322, inHg: 3386.39, kPa: 1000}, initial: 'micron', note: 'Valori assoluti: 1 micron = 1 µmHg = 0,133 Pa. Obiettivo operativo tipico ≤ 500 micron.'},
    power: {base: 'W', units: {kW: 1000, W: 1, 'BTU/h': 0.29307107, 'kcal/h': 1.163, TR: 3516.853}, initial: 'kW', note: 'TR = tonnellata di refrigerazione (12.000 BTU/h).'},
    temp: {units: {'°C': null, '°F': null, K: null}, initial: '°C', note: 'Per le differenze di temperatura: 1 K = 1 °C, 1 K = 1,8 °F.'}
  };
  let quantity = 'pressure';

  function toCelsius(value, unit) { return unit === '°F' ? (value - 32) / 1.8 : unit === 'K' ? value - 273.15 : value; }
  function fromCelsius(value, unit) { return unit === '°F' ? value * 1.8 + 32 : unit === 'K' ? value + 273.15 : value; }

  function fillUnits(selected) {
    const units = Object.keys(QUANTITIES[quantity].units);
    q('#conv-unit').innerHTML = units.map(unit => `<option value="${esc(unit)}"${unit === selected ? ' selected' : ''}>${esc(unit)}</option>`).join('');
    q('#conv-ref-field').classList.toggle('hidden', quantity !== 'pressure');
  }

  function convert() {
    const raw = q('#conv-value').value;
    const value = Number(raw);
    const unit = q('#conv-unit').value;
    const config = QUANTITIES[quantity];
    const out = q('#conv-out');
    q('#conv-note').textContent = t(config.note);
    if (raw === '' || !Number.isFinite(value)) { out.innerHTML = ''; return; }
    let cells;
    if (quantity === 'temp') {
      const celsius = toCelsius(value, unit);
      cells = Object.keys(config.units).map(target => [target, fromCelsius(celsius, target)]);
      if (celsius < -273.15) { out.innerHTML = `<p class="notice warn"><b class="ic">!</b><span>${esc(t('Valore sotto lo zero assoluto.'))}</span></p>`; return; }
    } else if (quantity === 'pressure') {
      const absolute = q('#conv-ref').value === 'a';
      const barValue = value * config.units[unit];
      const gauge = absolute ? barValue - ATM_BAR : barValue;
      const abs = absolute ? barValue : barValue + ATM_BAR;
      cells = Object.entries(config.units).map(([target, factor]) => [`${target} ${t('relativa')}`, gauge / factor, target === unit && !absolute]);
      cells.push([`bar ${t('assoluta')}`, abs, unit === 'bar' && absolute], [`psi ${t('assoluta')} (psia)`, abs / config.units.psi, unit === 'psi' && absolute]);
    } else {
      const base = value * config.units[unit];
      cells = Object.entries(config.units).map(([target, factor]) => [target, base / factor, target === unit]);
    }
    out.innerHTML = cells.map(([label, result, source]) => `<div class="conv-cell${source || (quantity === 'temp' && label === unit) ? ' src' : ''}"><span>${esc(label)}</span><strong>${fmt(result)}</strong></div>`).join('');
  }

  q('.conv-tabs').addEventListener('click', event => {
    const button = event.target.closest('[data-q]');
    if (!button) return;
    quantity = button.dataset.q;
    document.querySelectorAll('.conv-tabs [data-q]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    fillUnits(QUANTITIES[quantity].initial);
    q('#conv-value').value = {pressure: '10', vacuum: '500', power: '3.5', temp: '7'}[quantity];
    convert();
  });
  ['#conv-value', '#conv-unit', '#conv-ref'].forEach(id => q(id).addEventListener('input', convert));
  q('#conv-unit').addEventListener('change', convert);
  q('#conv-ref').addEventListener('change', convert);

  /* ---------- kW ↔ BTU/h ---------- */
  const SIZES = [7000, 9000, 12000, 15000, 18000, 21000, 24000, 30000, 36000, 42000, 48000];
  function updateBtu() {
    const kw = Number(q('#kw-in').value);
    if (!(kw > 0)) { q('#btu-out').textContent = '—'; q('#btu-sizes').innerHTML = ''; return; }
    const btu = kw * 1000 / 0.29307107;
    q('#btu-out').textContent = Math.round(btu).toLocaleString(locale());
    const first = SIZES.find(size => size >= btu);
    q('#btu-sizes').innerHTML = SIZES.map(size => {
      const sizeKw = size * 0.29307107 / 1000;
      const cls = size === first ? ' fit' : size < btu ? ' under' : '';
      return `<div class="size${cls}"><b>${(size / 1000).toLocaleString(locale())}k</b><small>${fmt(sizeKw, 1)} kW${size === first ? ` · ${esc(t('consigliata'))}` : ''}</small></div>`;
    }).join('');
  }
  q('#kw-in').addEventListener('input', updateBtu);

  /* ---------- GWP e controllo perdite ---------- */
  let gwpTable = {};
  const NOT_FGAS = new Set(['R290', 'R600A', 'R717', 'R744']);
  const HFO = new Set(['R1234YF', 'R1234ZE', 'R1233ZD']);
  const PREFERRED = ['R32', 'R410A', 'R454B', 'R290', 'R407C', 'R134A', 'R1234YF', 'R744'];

  function fillGases() {
    const names = Object.keys(gwpTable);
    const ordered = [...PREFERRED.filter(name => names.includes(name)), ...names.filter(name => !PREFERRED.includes(name)).sort()];
    const label = name => name.replace(/^R(\d+)([A-Z]+)$/, (m, num, suffix) => `R${num}${suffix.length > 1 ? suffix.toLowerCase() : suffix}`);
    q('#gas-select').innerHTML = ordered.map(name => `<option value="${esc(name)}">${esc(label(name))} · GWP ${esc(fmt(gwpTable[name], 2))}</option>`).join('');
    updateGas();
  }

  function updateGas() {
    const gas = q('#gas-select').value;
    const gwp = Number(gwpTable[gas]);
    const charge = Number(q('#gas-charge').value);
    const target = q('#gas-result');
    if (!gas || !(charge >= 0)) { target.innerHTML = ''; return; }
    const tonnes = charge * gwp / 1000;
    const hermetic = q('#gas-hermetic').checked;
    const detector = q('#gas-detector').checked;
    let state = 'ok', title, detail;
    if (NOT_FGAS.has(gas)) {
      title = t('Nessun controllo F-gas per CO₂e');
      detail = t('Refrigerante naturale: non rientra negli obblighi di controllo perdite F-gas. Restano le norme di sicurezza (es. A3 infiammabile per R290/R600a).');
    } else if (HFO.has(gas)) {
      if (charge >= 1 && !(hermetic && charge < 2)) {
        state = 'warn';
        title = t('Controllo perdite ogni {n} mesi').replace('{n}', detector ? 24 : 12);
        detail = t('HFO dell’allegato II: il controllo si applica da 1 kg di carica, indipendentemente dalla CO₂e.');
      } else {
        title = t('Nessun controllo periodico obbligatorio');
        detail = t('HFO dell’allegato II sotto 1 kg (o ermetica sotto 2 kg).');
      }
    } else if (tonnes >= 5 && !(hermetic && tonnes < 10)) {
      state = 'warn';
      const months = tonnes >= 500 ? (detector ? 6 : 3) : tonnes >= 50 ? (detector ? 12 : 6) : (detector ? 24 : 12);
      title = t('Controllo perdite ogni {n} mesi').replace('{n}', months);
      detail = tonnes >= 500 ? t('Da 500 t CO₂e il rilevatore automatico di perdite è obbligatorio.') : t('Soglia da 5 t CO₂e; con rilevatore automatico l’intervallo raddoppia.');
    } else {
      title = t('Nessun controllo periodico obbligatorio');
      detail = hermetic && tonnes >= 5 ? t('Apparecchiatura ermeticamente sigillata ed etichettata sotto 10 t CO₂e.') : t('Sotto 5 t CO₂e.');
    }
    target.innerHTML = `<div class="kpi"><span>GWP</span><strong>${esc(fmt(gwp, 2))}</strong></div>
      <div class="kpi"><span>${esc(t('CO₂ equivalente'))}</span><strong>${esc(fmt(tonnes, 3))}<small> t</small></strong></div>
      <div class="leak ${state}"><span>${esc(t('Controllo perdite'))}</span><strong>${esc(title)}</strong><small>${esc(detail)}</small></div>`;
  }
  ['#gas-select', '#gas-charge', '#gas-hermetic', '#gas-detector'].forEach(id => q(id).addEventListener('input', updateGas));
  ['#gas-select', '#gas-hermetic', '#gas-detector'].forEach(id => q(id).addEventListener('change', updateGas));

  async function loadGwp() {
    try {
      const data = await api('refrigerants');
      gwpTable = data.gwp || {};
    } catch (_) {
      gwpTable = {R32: 675, R410A: 2088, R454B: 465, R290: 0.02, R407C: 1774, R134A: 1430, R1234YF: 0.5, R744: 1};
    }
    fillGases();
  }

  fillUnits('bar');
  convert();
  updateBtu();
  loadGwp();
  window.addEventListener('app-language-changed', () => { convert(); updateBtu(); updateGas(); });
})();
