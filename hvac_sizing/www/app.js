const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const n = value => Number(value || 0);
const dec = (value, digits) => Number(value || 0).toLocaleString(window.AppI18n?.locale() || 'it-IT', {minimumFractionDigits: digits, maximumFractionDigits: digits});
const plain = value => typeof value === 'number' ? value.toLocaleString(window.AppI18n?.locale() || 'it-IT', {maximumFractionDigits: 2}) : value;
const tr = value => window.AppI18n?.translate(value) || value;
// Frase traducibile con valori: il modello resta nel dizionario, i numeri vengono inseriti dopo.
const trf = (template, values = {}) => tr(template).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
const serverError = data => (window.AppI18n?.getLanguage() === 'de' && data.error_de) || tr(data.error || 'Operazione non riuscita');
const EXTERNAL_ADMIN = window.location.pathname.startsWith('/admin/');

function cookieValue(name) {
  const prefix = `${name}=`;
  const item = document.cookie.split(';').map(value => value.trim()).find(value => value.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : '';
}

let method = 'guided';
let currentProjectId = null;
let rooms = [];
let activeRoomId = null;
const roomStep = {};
const previews = {};
let projectGeneration = 0;
let lastCalculationResult = null;
let lastCalculationPdfUrls = {};
const APP_PAGES = new Set(['sizing', 'cylinders', 'performance', 'commissioning', 'tools', 'accounts', 'no-access']);
const OPEN_PAGES = new Set(['tools']);

function routeUrls() {
  const urls = [new URL(window.location.href)];
  try {
    if (window.parent && window.parent !== window) urls.push(new URL(window.parent.location.href));
  } catch (_) {}
  try {
    if (document.referrer) urls.push(new URL(document.referrer));
  } catch (_) {}
  return urls;
}

function getAppRoute() {
  let page = '';
  let cylinderId = '';
  for (const url of routeUrls()) {
    page ||= url.searchParams.get('page') || '';
    cylinderId ||= url.searchParams.get('bombola') || '';
    const hash = decodeURIComponent(url.hash.replace(/^#/, ''));
    const [hashPage, hashId] = hash.split('/');
    if (APP_PAGES.has(hashPage)) page ||= hashPage;
    if (hashPage === 'cylinders' && hashId) cylinderId ||= hashId;
  }
  if (cylinderId) page = 'cylinders';
  return {page: APP_PAGES.has(page) ? page : 'sizing', cylinderId};
}

function updateAppRoute(page, cylinderId = '') {
  const url = new URL(window.location.href);
  url.searchParams.delete('page');
  url.searchParams.delete('bombola');
  url.hash = cylinderId ? `${page}/${encodeURIComponent(cylinderId)}` : page;
  history.replaceState({}, '', url);
}

function showAppPage(page, updateUrl = true) {
  let selected = APP_PAGES.has(page) ? page : 'sizing';
  const allowed = OPEN_PAGES.has(selected) || selected === 'no-access'
    || (selected === 'accounts' ? window.appAccess?.role === 'admin' : window.canAccess?.(selected));
  if (window.appAccess && !allowed) selected = 'no-access';
  $$('[data-app-page]').forEach(node => node.classList.toggle('page-hidden', node.dataset.appPage !== selected));
  $$('[data-page-button]').forEach(button => {
    const active = button.dataset.pageButton === selected;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  $$('details.menu[open]').forEach(menu => { menu.open = false; });
  if (updateUrl) updateAppRoute(selected);
  window.scrollTo({top: 0, behavior: 'smooth'});
}

window.getAppRoute = getAppRoute;
window.updateAppRoute = updateAppRoute;
window.showAppPage = showAppPage;

const defaults = () => ({
  id: crypto.randomUUID(), name: 'Locale 1',
  guided_heat: 21, guided_cool: 26, guided_insulation: 'unknown',
  guided_walls: ['unknown','unknown','unknown','unknown'], guided_attic: 'unknown', guided_above: 'unknown', guided_below: 'unknown', guided_windows: [], length: 5, width: 4, height: 2.7,
  people: 2, lighting_w: 150, equipment_w: 100, margin_percent: 10,
  insulation_choice: 'unknown', glazing_choice: 'unknown', margin_choice: 'ten',
  quick_w_m3_cooling: 35, quick_w_m3_heating: 40, quick_insulation_factor: 1,
  quick_exposure_factor: 1, quick_orientation: 'unknown', quick_glazing_factor: 1,
  wall_area: 24, wall_u: 0.7, window_area: 4, window_u: 1.4,
  roof_area: 0, roof_u: 0.25, floor_area: 0, floor_u: 0.35,
  solar_irradiance_w_m2: 450, window_g_value: 0.55, shading_factor: 0.7,
  infiltration_ach: 0.5, ventilation_m3h: 0, occupancy_factor: 1,
  person_sensible_w: 75, person_latent_w: 55, lighting_factor: 1, equipment_factor: 1
});

// A new room has no example measurements; technical coefficients retain their presets.
const blankRoom = () => ({...defaults(), length: '', width: '', height: '',
  guided_heat: '', guided_cool: '', people: 0, lighting_w: 0, equipment_w: 0,
  wall_area: 0, window_area: 0});

function clearCalculation() {
  projectGeneration++;
  lastCalculationResult = null;
  Object.values(lastCalculationPdfUrls).forEach(url => URL.revokeObjectURL(url));
  lastCalculationPdfUrls = {};
  $('#results').innerHTML = '';
  $('#results').classList.add('hidden');
}

const ROOM_FIELD_HELP = {
  "length": "Misura interna del locale in metri, es. 5. Non lasciare 0.",
  "width": "Misura interna in metri, es. 4. Lunghezza × larghezza dà i m². Non lasciare 0.",
  "height": "Dal pavimento al soffitto in metri, es. 2,7. Non lasciare 0.",
  "margin_percent": "Riserva aggiunta alla potenza: 10 = +10%; 0 = nessuna riserva.",
  "quick_w_m3_cooling": "Potenza di base per ogni m³, prima dei fattori e dei carichi interni. 35 è un valore iniziale da verificare; 0 non significa “non so”.",
  "quick_w_m3_heating": "Potenza di base in riscaldamento per ogni m³. 40 è un valore iniziale da verificare; non azzerare se il dato è sconosciuto.",
  "quick_insulation_factor": "1 = nessuna correzione; sotto 1 riduce, sopra 1 aumenta la stima estiva e invernale. Non usare 0 per un dato sconosciuto.",
  "quick_exposure_factor": "Correzione del raffrescamento per esposizione al sole: 1 = neutro, sopra 1 aumenta la stima. Non mettere 0 se non sai.",
  "quick_glazing_factor": "Correzione del raffrescamento per le vetrate: 1 = neutro. Anche senza finestre non mettere 0: annullerebbe tutta la quota di base.",
  "people": "Numero di persone previste nel locale. 0 solo se non occupato.",
  "lighting_w": "Somma dei watt delle luci: es. 5 lampade da 10 W = 50 W. 0 se assenti o spente. Nel metodo professionale applica anche il fattore di uso.",
  "equipment_w": "Watt assorbiti da PC, TV e altre apparecchiature che scaldano il locale. Escludi il climatizzatore. 0 se assenti o spente.",
  "wall_area": "Somma delle pareti verso esterno: lunghezza × altezza, togliendo finestre e porte già conteggiate a parte. 0 se assenti.",
  "window_area": "Superficie totale delle finestre verso esterno in m². 0 se non ci sono finestre.",
  "roof_area": "Superficie del soffitto/tetto esposta verso esterno. 0 se sopra c’è un locale alla stessa temperatura.",
  "floor_area": "Superficie del pavimento verso esterno. 0 verso un locale alla stessa temperatura. Il modello non distingue il terreno dall’aria esterna.",
  "solar_irradiance_w_m2": "Sole incidente sulle finestre nelle condizioni di progetto. 0 solo se escludi questo apporto; il valore iniziale è da verificare.",
  "window_g_value": "Quota di sole che attraversa il vetro, da scheda tecnica: 0,55 = 55%. Non mettere 0 se sconosciuta; senza finestre azzera i m².",
  "shading_factor": "1 = nessuna riduzione; 0,7 = resta il 70% del sole; 0 = apporto solare escluso.",
  "infiltration_ach": "Ricambi d’aria per fessure/aperture ogni ora. 0 esclude le infiltrazioni. Non contare qui aria già inserita in “Aria esterna”.",
  "ventilation_m3h": "Portata aggiuntiva di aria esterna immessa, non ricircolo. 0 se assente. Si somma alle infiltrazioni; il recupero di calore non è modellato.",
  "occupancy_factor": "Quota di persone presenti insieme: 1 = tutte; 0,5 = metà; 0 = nessuna.",
  "person_sensible_w": "Calore per persona che aumenta la temperatura. Valore iniziale 75 W da verificare per l’attività. Se nessuno è presente, azzera “Persone”.",
  "person_latent_w": "Calore legato all’umidità prodotta da una persona. Valore iniziale 55 W da verificare; 0 esclude questo contributo.",
  "lighting_factor": "Quota delle luci accese insieme: 1 = tutte; 0,5 = metà; 0 = spente.",
  "equipment_factor": "Quota di utilizzo delle apparecchiature: 1 = pieno carico; 0,5 = metà; 0 = spente.",
  "wall_u": "Trasmittanza U da scheda tecnica o stratigrafia: più bassa = più isolamento. Se l’elemento manca, metti 0 nella superficie, non qui.",
  "window_u": "Trasmittanza U da scheda tecnica o stratigrafia: più bassa = più isolamento. Se l’elemento manca, metti 0 nella superficie, non qui.",
  "roof_u": "Trasmittanza U da scheda tecnica o stratigrafia: più bassa = più isolamento. Se l’elemento manca, metti 0 nella superficie, non qui.",
  "floor_u": "Trasmittanza U da scheda tecnica o stratigrafia: più bassa = più isolamento. Se l’elemento manca, metti 0 nella superficie, non qui."
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

/* ---------- Campi con unità nel campo e aiuto dietro ⓘ ---------- */
function labelWithHelp(label, help) {
  const info = UI.info(help);
  return {head: `<span class="label-row"><span>${escapeHtml(tr(label))}</span>${info.button}</span>`, panel: info.panel};
}
function field(key, label, value, extra = '', unit = '') {
  const {head, panel} = labelWithHelp(label, ROOM_FIELD_HELP[key]);
  const input = `<input data-key="${key}" type="number" inputmode="decimal" value="${escapeHtml(value ?? '')}" ${extra}>`;
  return `<label>${head}${unit ? `<span class="unit-field">${input}<em>${escapeHtml(unit)}</em></span>` : input}${panel}</label>`;
}
function selectField(key, label, value, options, help = '', attrs = '') {
  const {head, panel} = labelWithHelp(label, help);
  return `<label>${head}<select data-key="${key}" ${attrs}>${options.map(([v, text]) => `<option value="${escapeHtml(v)}" ${v === value ? 'selected' : ''}>${escapeHtml(tr(text))}</option>`).join('')}</select>${panel}</label>`;
}
function numberField(key, label, value, help, attrs = '', unit = '') {
  const {head, panel} = labelWithHelp(label, help);
  const input = `<input data-key="${key}" type="number" inputmode="decimal" value="${escapeHtml(value ?? '')}" ${attrs}>`;
  return `<label>${head}${unit ? `<span class="unit-field">${input}<em>${escapeHtml(unit)}</em></span>` : input}${panel}</label>`;
}

// Indicative application presets for the quick estimate, not normative solar coefficients.
// Existing numeric factors are retained as custom values when loading older projects.
const EXPOSURE_OPTIONS = [
  {value: 'unknown', label: 'Non so / più esposizioni', factor: 1},
  {value: 'n', label: 'Nord', factor: 1},
  {value: 'ne', label: 'Nord-est', factor: 1.05},
  {value: 'e', label: 'Est', factor: 1.10},
  {value: 'se', label: 'Sud-est', factor: 1.10},
  {value: 's', label: 'Sud', factor: 1.10},
  {value: 'sw', label: 'Sud-ovest', factor: 1.15},
  {value: 'w', label: 'Ovest', factor: 1.15},
  {value: 'nw', label: 'Nord-ovest', factor: 1.05},
  {value: 'custom', label: 'Valore manuale / progetto precedente'}
];

function exposureFields(room) {
  const selected = EXPOSURE_OPTIONS.some(item => item.value === room.quick_orientation) ? room.quick_orientation : 'custom';
  return `<div class="exposure-field">
    ${selectField('quick_orientation', 'Esposizione delle finestre', selected, EXPOSURE_OPTIONS.map(item => [item.value, item.label]), 'Verso dove guardano le finestre principali? Puoi usare la bussola del telefono. Se sono su più lati, scegli “Non so / più esposizioni”.')}
    <details class="advanced" ${selected === 'custom' ? 'open' : ''}>
      <summary>${tr('Correzione applicata / modifica manuale')}</summary>
      ${field('quick_exposure_factor', 'Fattore esposizione', room.quick_exposure_factor ?? 1, 'step="0.05" min="0"', '×')}
    </details>
  </div>`;
}

// UI presets are transparent heuristics for the existing quick estimate.
const SIMPLE_CHOICES = {
  insulation_choice: {
    key: 'quick_insulation_factor', label: 'Com’è isolato il locale?', numericLabel: 'Fattore isolamento', extra: 'step="0.05" min="0"', unit: '×',
    help: 'Considera pareti e tetto. Sono categorie indicative, non classi energetiche. Se non sai, scegli “Non so”: non viene applicata una correzione.',
    options: [
      ['unknown', 'Non so — nessuna correzione', 1],
      ['good', 'Ben isolato — cappotto e tetto isolato', 0.8],
      ['average', 'Isolamento intermedio', 1],
      ['poor', 'Poco isolato — pareti e tetto non isolati', 1.2]
    ]
  },
  glazing_choice: {
    key: 'quick_glazing_factor', label: 'Quante superfici vetrate ci sono?', numericLabel: 'Fattore vetrate', extra: 'step="0.05" min="0"', unit: '×',
    help: 'Considera quanto spazio occupano i vetri sulle pareti esterne. Conta la superficie, non il numero di finestre. Questa scelta riguarda il raffrescamento.',
    options: [
      ['unknown', 'Non so — nessuna correzione', 1],
      ['few', 'Poche o nessuna — piccole finestre', 0.9],
      ['average', 'Intermedie — parte della parete', 1],
      ['large', 'Molte — grandi vetrate o pareti di vetro', 1.2]
    ]
  },
  margin_choice: {
    key: 'margin_percent', label: 'Potenza extra (margine)', numericLabel: 'Margine', extra: 'min="0" max="50"', unit: '%',
    help: 'Riserva aggiunta al risultato: con +10%, 3 kW diventano 3,3 kW. Non sostituisce i dati mancanti.',
    options: [
      ['zero', 'Nessuna riserva — 0%', 0],
      ['five', 'Aggiungi il 5%', 5],
      ['ten', 'Aggiungi il 10%', 10],
      ['fifteen', 'Aggiungi il 15%', 15],
      ['twenty', 'Aggiungi il 20%', 20]
    ]
  }
};

function simpleChoice(room, choiceKey) {
  const config = SIMPLE_CHOICES[choiceKey];
  const selected = config.options.find(option => option[0] === room[choiceKey] && option[2] === Number(room[config.key]))?.[0] || 'custom';
  return `<div class="simple-choice">
    ${selectField(choiceKey, config.label, selected, [...config.options.map(option => [option[0], option[1]]), ['custom', 'Valore manuale / progetto precedente']], config.help)}
    <details class="advanced" ${selected === 'custom' ? 'open' : ''}>
      <summary>${tr('Valore applicato / modifica manuale')}</summary>
      ${field(config.key, config.numericLabel, room[config.key], config.extra, config.unit)}
    </details>
  </div>`;
}

/* ---------- Passi del locale ---------- */
const filled = value => value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value));
const positive = value => filled(value) && Number(value) > 0;
const dimsOk = room => ['length', 'width', 'height'].every(key => positive(room[key]));
const wallsOf = room => {
  const walls = Array.isArray(room.guided_walls) ? [...room.guided_walls] : [];
  while (walls.length < 4) walls.push('unknown');
  return walls.slice(0, 4);
};
const BOUNDARY = [['outside', 'Esterno'], ['same', 'Stanza alla stessa temperatura'], ['unheated', 'Locale non riscaldato']];
const BOUNDARY_SHORT = {outside: 'Esterno', same: 'Interna', unheated: 'Non risc.'};

function stepsFor(currentMethod) {
  const measures = {
    key: 'measures', title: 'Misure', heading: 'Misure del locale', sub: 'Misure interne, in metri.',
    render: room => `<div class="grid three">
        ${field('length', currentMethod === 'guided' ? 'Lunghezza (lati A e C)' : 'Lunghezza', room.length, 'step="0.01" min="0.1"', 'm')}
        ${field('width', currentMethod === 'guided' ? 'Larghezza (lati B e D)' : 'Larghezza', room.width, 'step="0.01" min="0.1"', 'm')}
        ${field('height', currentMethod === 'guided' ? 'Altezza media' : 'Altezza', room.height, 'step="0.01" min="0.1"', 'm')}
      </div>
      <div class="grid two margin-row">${simpleChoice(room, 'margin_choice')}</div>`,
    complete: dimsOk
  };
  const loads = {
    key: 'loads', title: 'Carichi', heading: 'Persone e apparecchi accesi', sub: 'Calore prodotto dentro il locale.',
    render: room => `<div class="grid three">
        ${field('people', 'Persone', room.people, 'min="0" step="1"')}
        ${field('lighting_w', 'Illuminazione', room.lighting_w, 'min="0"', 'W')}
        ${field('equipment_w', 'Apparecchiature', room.equipment_w, 'min="0"', 'W')}
      </div>`,
    complete: room => ['people', 'lighting_w', 'equipment_w'].every(key => !filled(room[key]) || Number(room[key]) >= 0)
  };
  if (currentMethod === 'quick') {
    return [measures, {
      key: 'features', title: 'Caratteristiche', heading: 'Caratteristiche del locale', sub: 'Le scelte applicano correzioni indicative della stima rapida.',
      render: room => `<div class="grid three">${simpleChoice(room, 'insulation_choice')}${exposureFields(room)}${simpleChoice(room, 'glazing_choice')}</div>
        <details class="advanced"><summary>${tr('Impostazioni avanzate — potenza di base')}</summary>
          <p class="field-help">${tr('Per iniziare sono precompilati 35 W/m³ per raffreddare e 40 W/m³ per scaldare. Sono ipotesi di partenza da verificare, non valori adatti a ogni edificio. I progetti già salvati conservano i loro valori.')}</p>
          <div class="grid two">${field('quick_w_m3_cooling', 'Base raffrescamento', room.quick_w_m3_cooling, '', 'W/m³')}${field('quick_w_m3_heating', 'Base riscaldamento', room.quick_w_m3_heating, '', 'W/m³')}</div>
        </details>`,
      complete: () => true
    }, loads];
  }
  if (currentMethod === 'professional') {
    return [measures, {
      key: 'envelope', title: 'Involucro', heading: 'Involucro edilizio', sub: 'Superfici disperdenti e trasmittanze.',
      render: room => `<div class="grid four">
          ${field('wall_area', 'Pareti esterne', room.wall_area, 'step="0.01" min="0"', 'm²')}${field('wall_u', 'U pareti', room.wall_u, 'step="0.01" min="0"', 'W/m²K')}
          ${field('window_area', 'Finestre', room.window_area, 'step="0.01" min="0"', 'm²')}${field('window_u', 'U finestre', room.window_u, 'step="0.01" min="0"', 'W/m²K')}
          ${field('roof_area', 'Tetto/solaio', room.roof_area, 'step="0.01" min="0"', 'm²')}${field('roof_u', 'U tetto', room.roof_u, 'step="0.01" min="0"', 'W/m²K')}
          ${field('floor_area', 'Pavimento', room.floor_area, 'step="0.01" min="0"', 'm²')}${field('floor_u', 'U pavimento', room.floor_u, 'step="0.01" min="0"', 'W/m²K')}
        </div>`,
      complete: () => true
    }, {
      key: 'air', title: 'Sole e aria', heading: 'Sole, aria e umidità', sub: 'Apporti solari, infiltrazioni e aria esterna.',
      render: room => `<div class="grid three">
          ${field('solar_irradiance_w_m2', 'Irradianza finestra', room.solar_irradiance_w_m2, 'min="0"', 'W/m²')}
          ${field('window_g_value', 'Fattore solare vetro g', room.window_g_value, 'step="0.01" min="0" max="1"')}
          ${field('shading_factor', 'Fattore schermatura', room.shading_factor, 'step="0.01" min="0" max="1.5"')}
          ${field('infiltration_ach', 'Infiltrazioni', room.infiltration_ach, 'step="0.1" min="0"', 'vol/h')}
          ${field('ventilation_m3h', 'Aria esterna', room.ventilation_m3h, 'min="0"', 'm³/h')}
        </div>`,
      complete: () => true
    }, {
      key: 'loads', title: 'Carichi', heading: 'Carichi interni', sub: 'Persone, luci e apparecchiature con i fattori di uso.',
      render: room => `<div class="grid four">
          ${field('people', 'Persone', room.people, 'min="0" step="1"')}${field('occupancy_factor', 'Contemporaneità persone', room.occupancy_factor, 'step="0.05" min="0" max="1"')}
          ${field('person_sensible_w', 'Sensibile per persona', room.person_sensible_w, 'min="0"', 'W')}${field('person_latent_w', 'Latente per persona', room.person_latent_w, 'min="0"', 'W')}
          ${field('lighting_w', 'Illuminazione installata', room.lighting_w, 'min="0"', 'W')}${field('lighting_factor', 'Uso illuminazione', room.lighting_factor, 'step="0.05" min="0" max="1"')}
          ${field('equipment_w', 'Apparecchiature installate', room.equipment_w, 'min="0"', 'W')}${field('equipment_factor', 'Uso apparecchiature', room.equipment_factor, 'step="0.05" min="0" max="1"')}
        </div>`,
      complete: () => true
    }];
  }
  return [measures, {
    key: 'comfort', title: 'Comfort', heading: 'Comfort e isolamento', sub: 'Temperature volute nella stanza e stato dell’isolamento.',
    render: room => `<div class="grid three">
        ${numberField('guided_heat', 'Temperatura desiderata in inverno', room.guided_heat, 'Temperatura nella stanza quando riscaldi, non quella dell’aria in uscita.', 'step="0.5" min="5" max="35"', '°C')}
        ${numberField('guided_cool', 'Temperatura desiderata in estate', room.guided_cool, 'Temperatura nella stanza quando raffreschi.', 'step="0.5" min="16" max="35"', '°C')}
        ${selectField('guided_insulation', 'Isolamento della casa', room.guided_insulation || 'unknown', [['unknown', 'Non so'], ['good', 'Buono — cappotto e isolamento continuo'], ['medium', 'Medio — isolamento parziale'], ['poor', 'Scarso — senza isolamento']], 'Scegli lo stato effettivo. I valori tecnici vengono stimati e mostrati nel risultato.')}
      </div>`,
    complete: room => positive(room.guided_heat) && positive(room.guided_cool)
  }, {
    key: 'walls', title: 'Pareti', heading: 'Cosa c’è oltre ogni parete?', sub: 'Tocca un lato della pianta o usa i pulsanti accanto.',
    render: wallsStep,
    complete: room => wallsOf(room).every(value => value !== 'unknown')
  }, {
    key: 'above', title: 'Sopra e sotto', heading: 'Mansarda, sopra e sotto', sub: 'Il tetto e il pavimento contano quanto le pareti.',
    render: room => `<div class="grid three">
        ${selectField('guided_attic', 'La stanza è una mansarda?', room.guided_attic || 'unknown', [['unknown', 'Da scegliere'], ['no', 'No'], ['yes', 'Sì — direttamente sotto le falde del tetto']])}
        ${room.guided_attic === 'yes'
          ? numberField('guided_roof_area', 'Superficie delle falde sopra il locale', room.guided_roof_area, 'Somma delle superfici inclinate del tetto, lucernari compresi. Non coincide necessariamente con il pavimento.', 'min="0.1" step="0.1"', 'm²')
          : selectField('guided_above', 'Cosa c’è sopra?', room.guided_above || 'unknown', [['unknown', 'Da scegliere'], ...BOUNDARY], 'Scegli “Esterno” se sopra c’è un tetto piano o un terrazzo.')}
        ${selectField('guided_below', 'Cosa c’è sotto?', room.guided_below || 'unknown', [['unknown', 'Da scegliere'], ...BOUNDARY, ['ground', 'Terreno']], 'Per cantina o garage non riscaldati scegli “Locale non riscaldato”.')}
      </div>`,
    complete: room => ['yes', 'no'].includes(room.guided_attic)
      && (room.guided_attic === 'yes' ? positive(room.guided_roof_area) : ['outside', 'same', 'unheated'].includes(room.guided_above))
      && ['outside', 'same', 'unheated', 'ground'].includes(room.guided_below)
  }, {
    key: 'windows', title: 'Finestre', heading: 'Finestre e vetri', sub: 'Misure con il telaio. Le finestre vengono tolte dalla parete in automatico.',
    render: windowsStep,
    complete: room => (room.guided_windows || []).every(win => positive(win.width) && positive(win.height))
  }, loads];
}

function currentStep(room) {
  const steps = stepsFor(method);
  return Math.min(Math.max(roomStep[room.id] || 0, 0), steps.length - 1);
}
function progressOf(room) {
  const steps = stepsFor(method);
  const done = steps.filter(step => step.complete(room)).length;
  return {done, total: steps.length, complete: done === steps.length};
}

function wallsStep(room) {
  const walls = wallsOf(room);
  const L = n(room.length), W = n(room.width);
  const ratio = L > 0 && W > 0 ? Math.min(2, Math.max(.5, L / W)) : 1.25;
  const planW = ratio >= 1 ? 100 : ratio * 100;
  const planH = ratio >= 1 ? 100 / ratio : 100;
  const windows = room.guided_windows || [];
  const sides = [L, W, L, W];
  const marks = index => {
    const letter = 'ABCD'[index];
    const own = windows.filter(win => (win.position || 'wall') === 'wall' && (win.wall || defaultWall(room)) === letter);
    return own.map((win, k) => {
      const share = sides[index] > 0 ? Math.min(.9 / own.length, (n(win.width) / 100) / sides[index]) : .2;
      const centre = (k + .5) / own.length;
      const start = Math.max(0, (centre - share / 2) * 100);
      return index % 2 === 0
        ? `<span class="win ab" data-left="${start.toFixed(1)}" data-w="${(share * 100).toFixed(1)}"></span>`
        : `<span class="win bd" data-top="${start.toFixed(1)}" data-h="${(share * 100).toFixed(1)}"></span>`;
    }).join('');
  };
  const skylights = windows.filter(win => win.position === 'roof').length;
  const label = value => tr(BOUNDARY_SHORT[value] || 'Da scegliere');
  return `<div class="plan-wrap">
      <div class="plan-box"><div class="plan" data-w="${planW.toFixed(1)}" data-h="${planH.toFixed(1)}" data-left="${((100 - planW) / 2).toFixed(1)}" data-top="${((100 - planH) / 2).toFixed(1)}">
        <div class="plan-room"><div><b>${escapeHtml(room.name || tr('Locale'))}</b><span>${L && W ? `${dec(L * W, 1)} m²` : tr('Misure mancanti')}</span>${skylights ? `<span>${trf('Lucernari: {n}', {n: skylights})}</span>` : ''}</div></div>
        ${['a', 'b', 'c', 'd'].map((side, i) => `<button type="button" class="wall ${side}" data-wall="${i}" data-t="${walls[i]}" aria-label="${escapeHtml(`${tr('Parete')} ${'ABCD'[i]}: ${tr(BOUNDARY.find(item => item[0] === walls[i])?.[1] || 'Da scegliere')}. ${tr('Tocca per cambiare')}`)}">${marks(i)}</button><span class="wlabel ${side}">${'ABCD'[i]}</span>`).join('')}
      </div></div>
      <div class="wall-list">${walls.map((value, i) => `<div class="wall-row">
          <span class="tag ${value === 'outside' ? 'outside' : ''}">${'ABCD'[i]}</span>
          <div><div class="opts" role="group" aria-label="${escapeHtml(`${tr('Parete')} ${'ABCD'[i]} · ${sides[i] ? `${dec(sides[i], 2)} m` : ''}`)}">${BOUNDARY.map(([key]) => `<button type="button" class="opt" data-wall="${i}" data-set="${key}" aria-pressed="${value === key}">${escapeHtml(tr(BOUNDARY_SHORT[key]))}</button>`).join('')}</div>
          <small class="field-help">${tr('Parete')} ${'ABCD'[i]} · ${sides[i] ? `${dec(sides[i], 2)} m` : tr('misura mancante')} · ${escapeHtml(label(value))}</small></div>
        </div>`).join('')}</div>
    </div>
    <div class="legend"><span><i class="l-out"></i>${tr('Esterna')}</span><span><i class="l-same"></i>${tr('Interna riscaldata')}</span><span><i class="l-unh"></i>${tr('Non riscaldato')}</span><span><i class="l-win"></i>${tr('Finestra')}</span></div>
    <p class="wall-count">${tr('Pareti esterne')}: ${walls.filter(x => x === 'outside').length} · ${tr('Pareti interne')}: ${walls.filter(x => ['same', 'unheated'].includes(x)).length} · ${tr('Da scegliere')}: ${walls.filter(x => x === 'unknown').length}</p>`;
}

function defaultWall(room) {
  const index = wallsOf(room).indexOf('outside');
  return 'ABCD'[index >= 0 ? index : 0];
}

function windowsStep(room) {
  const windows = room.guided_windows || [];
  const walls = wallsOf(room);
  const wallOptions = ['A', 'B', 'C', 'D'].map((letter, i) => [letter, `${tr('Parete')} ${letter} · ${tr(BOUNDARY_SHORT[walls[i]] || 'Da scegliere')}`]);
  return `<div class="grid three">${numberField('guided_window_count', 'Quante finestre o portefinestre?', windows.length, '0 se assenti. Compila le misure di ciascuna finestra, telaio compreso.', 'min="0" max="30" step="1"')}</div>
    ${windows.map((win, i) => `<div class="guided-window"><h4>${tr('Finestra')} ${i + 1}${(win.position || 'wall') === 'wall' ? `<span class="tag">${escapeHtml(win.wall || defaultWall(room))}</span>` : `<span class="tag">${tr('tetto')}</span>`}</h4><div class="grid three">
      ${numberField('window_width', 'Larghezza', win.width, '', `data-window="${i}" min="1" step="1"`, 'cm')}
      ${numberField('window_height', 'Altezza', win.height, '', `data-window="${i}" min="1" step="1"`, 'cm')}
      ${selectField('window_position', 'Posizione finestra', win.position || 'wall', [['wall', 'Sulla parete esterna'], ['roof', 'Lucernario sul tetto']], '', `data-window="${i}"`)}
      ${(win.position || 'wall') === 'wall' ? selectField('window_wall', 'Su quale parete?', win.wall || defaultWall(room), wallOptions, 'Serve per disegnarla sulla pianta; il calcolo usa l’esposizione.', `data-window="${i}"`) : ''}
      ${selectField('window_glass', 'Tipo di vetro', win.glass, [['unknown', 'Non so'], ['single', 'Singolo'], ['double_old', 'Doppio — vecchio o tipo non noto'], ['double_low', 'Doppio basso emissivo'], ['triple', 'Triplo']], 'Due lastre non significano automaticamente vetro basso emissivo.', `data-window="${i}"`)}
      ${selectField('window_orientation', 'Esposizione', win.orientation, EXPOSURE_OPTIONS.filter(o => o.value !== 'custom').map(o => [o.value, o.label]), '', `data-window="${i}"`)}
      ${selectField('window_shade', 'Protezione dal sole in estate', win.shade, [['unknown', 'Non so'], ['none', 'Nessuna / protezione aperta'], ['external', 'Tapparella o tenda esterna chiusa al sole']], 'Se la protezione resta aperta, scegli “Nessuna / protezione aperta”.', `data-window="${i}"`)}
    </div></div>`).join('')}`;
}

/* ---------- Disegno della pagina Calcolo ---------- */
function activeRoom() {
  return rooms.find(room => room.id === activeRoomId) || rooms[0];
}

function methodHelp() {
  return tr(method === 'guided'
    ? 'Rispondi alle domande del locale. Il calcolo stima i coefficienti e mostra le ipotesi nel risultato. Non servono W/m³.'
    : method === 'quick'
      ? 'Calcolo rapido: stima iniziale con coefficienti indicativi da verificare per il locale.'
      : 'Calcolo professionale: verifica clima, superfici e dati tecnici. Le superfici usano la temperatura esterna; ambienti confinanti a temperature diverse richiedono una valutazione specifica.');
}

function renderRooms() {
  if (!rooms.length) rooms = [blankRoom()];
  if (!rooms.some(room => room.id === activeRoomId)) activeRoomId = rooms[0].id;
  $('#sizing-method-help').textContent = methodHelp();
  renderEditor();
  renderRoomList();
  renderLive();
  renderCalcBar();
}

function renderRoomList() {
  $('#room-total').textContent = String(rooms.length);
  $('#room-list').innerHTML = rooms.map((room, index) => {
    const progress = progressOf(room);
    const step = stepsFor(method)[currentStep(room)];
    const status = progress.complete ? tr('Completo') : !dimsOk(room) ? tr('Mancano le misure') : trf('Passo {k} di {n}', {k: currentStep(room) + 1, n: progress.total});
    const preview = previews[room.id]?.result;
    return `<button type="button" class="room-chip${room.id === activeRoomId ? ' active' : ''}" data-room="${room.id}" aria-current="${room.id === activeRoomId}" title="${escapeHtml(step ? tr(step.title) : '')}">
      <span class="idx">${index + 1}</span>
      <span><strong>${escapeHtml(room.name || `${tr('Locale')} ${index + 1}`)}</strong><small>${escapeHtml(status)}</small><span class="prog${progress.complete ? ' complete' : ''}"><i data-w="${(progress.done / progress.total * 100).toFixed(0)}"></i></span></span>
      <span class="kw">${preview ? `<b>${dec(preview.total_cooling_kw, 1)}</b><br><u>${dec(preview.heating_kw, 1)}</u>` : '—<br>—'}</span>
    </button>`;
  }).join('');
  UI.applyGeometry($('#room-list'));
}

let renderingEditor = false;
function renderEditor() {
  if (renderingEditor) return;
  renderingEditor = true;
  try {
    // Chiude prima il campo attivo: il suo evento "change" aggiorna i dati prima del nuovo disegno.
    const focused = document.activeElement;
    if (focused && $('#rooms').contains(focused)) focused.blur();
    drawEditor();
  } finally {
    renderingEditor = false;
  }
}
function drawEditor() {
  const room = activeRoom();
  const index = rooms.indexOf(room);
  const steps = stepsFor(method);
  const stepIndex = currentStep(room);
  const step = steps[stepIndex];
  $('#rooms').innerHTML = `<article class="room-card" data-id="${room.id}">
    <div class="room-head">
      <div class="room-title"><span class="room-index">${index + 1}</span><input data-key="name" value="${escapeHtml(room.name)}" aria-label="${escapeHtml(tr('Nome locale'))}"></div>
      <div class="room-actions"><button class="button ghost small" type="button" data-duplicate="${room.id}">${tr('Duplica')}</button><button class="button danger small" type="button" data-delete="${room.id}">${tr('Elimina')}</button></div>
    </div>
    <div class="room-body">
      <div class="steps" role="tablist" aria-label="${escapeHtml(tr('Passi del locale'))}">${steps.map((item, i) => `<button type="button" role="tab" class="step${i === stepIndex ? ' now' : item.complete(room) ? ' done' : ''}" data-step="${i}" aria-selected="${i === stepIndex}"><span></span><b>${i + 1} ${escapeHtml(tr(item.title))}</b></button>`).join('')}</div>
      <h3 class="step-title">${escapeHtml(tr(step.heading))}</h3>
      <p class="step-sub">${escapeHtml(tr(step.sub))}</p>
      <div class="step-body">${step.render(room)}</div>
      <div class="step-nav">
        ${stepIndex > 0 ? `<button type="button" class="button ghost" data-go="prev">← ${escapeHtml(tr(steps[stepIndex - 1].title))}</button>` : ''}
        ${stepIndex < steps.length - 1
          ? `<button type="button" class="button primary" data-go="next">${escapeHtml(tr('Avanti'))}: ${escapeHtml(tr(steps[stepIndex + 1].title))} →</button>`
          : `<button type="button" class="button primary" data-go="calc">${escapeHtml(tr('Calcola potenze'))}</button>`}
      </div>
    </div>
  </article>`;
  UI.applyGeometry($('#rooms'));
}

function refreshStepMarkers() {
  const room = activeRoom();
  const steps = stepsFor(method);
  const stepIndex = currentStep(room);
  $$('#rooms .step').forEach((button, i) => {
    button.classList.toggle('done', i !== stepIndex && steps[i].complete(room));
  });
}

/* ---------- Anteprima della potenza ---------- */
const CLIMATE_DEFAULTS = {summer_outdoor_c: 35, summer_outdoor_rh: 50, summer_indoor_c: 26, summer_indoor_rh: 50, winter_outdoor_c: -5, winter_indoor_c: 20};

function climateMissing() {
  if (method === 'quick') return false;
  const keys = ['summer-outdoor', 'summer-rh-out', 'summer-rh-in', 'winter-outdoor', ...(method === 'professional' ? ['summer-indoor', 'winter-indoor'] : [])];
  return keys.some(id => $(`#${id}`).value === '');
}

function missingItems(room) {
  const items = [];
  const steps = stepsFor(method);
  if (!dimsOk(room)) items.push({text: 'Misure del locale', step: 0});
  if (method === 'guided') {
    if (!steps[1].complete(room)) items.push({text: 'Temperature desiderate', step: 1});
    const unknown = wallsOf(room).filter(value => value === 'unknown').length;
    if (unknown) items.push({text: trf('Pareti da scegliere: {n}', {n: unknown}), step: 2});
    if (!steps[3].complete(room)) items.push({text: 'Mansarda, sopra e sotto', step: 3});
    (room.guided_windows || []).forEach((win, i) => {
      if (!(positive(win.width) && positive(win.height))) items.push({text: trf('Misure della finestra {n}', {n: i + 1}), step: 4});
    });
  }
  if (climateMissing()) items.push({text: 'Clima di progetto', step: 'climate'});
  return items;
}

/** Copia del locale con valori neutri al posto dei dati mancanti, per vedere subito l'ordine di grandezza. */
function previewRoom(room) {
  if (!dimsOk(room)) return null;
  const copy = JSON.parse(JSON.stringify(room));
  let partial = false;
  ['people', 'lighting_w', 'equipment_w'].forEach(key => { if (!filled(copy[key])) copy[key] = 0; });
  if (!filled(copy.margin_percent)) { copy.margin_percent = 10; partial = true; }
  if (method === 'guided') {
    if (!positive(copy.guided_heat)) { copy.guided_heat = 20; partial = true; }
    if (!positive(copy.guided_cool)) { copy.guided_cool = 26; partial = true; }
    copy.guided_walls = wallsOf(copy).map(value => { if (value === 'unknown') { partial = true; return 'same'; } return value; });
    if (!['yes', 'no'].includes(copy.guided_attic)) { copy.guided_attic = 'no'; partial = true; }
    if (copy.guided_attic === 'yes' && !positive(copy.guided_roof_area)) { copy.guided_roof_area = n(copy.length) * n(copy.width); partial = true; }
    if (copy.guided_attic !== 'yes' && !['same', 'unheated', 'outside'].includes(copy.guided_above)) { copy.guided_above = 'same'; partial = true; }
    if (!['same', 'unheated', 'outside', 'ground'].includes(copy.guided_below)) { copy.guided_below = 'same'; partial = true; }
    const complete = (copy.guided_windows || []).filter(win => positive(win.width) && positive(win.height));
    if (complete.length !== (copy.guided_windows || []).length) partial = true;
    copy.guided_windows = complete.filter(win => win.position !== 'roof' || copy.guided_attic === 'yes');
    if (!copy.guided_insulation) copy.guided_insulation = 'unknown';
  }
  return {room: copy, partial};
}

function previewClimate() {
  const payload = projectPayload().climate;
  Object.entries(CLIMATE_DEFAULTS).forEach(([key, value]) => {
    if (payload[key] === null || payload[key] === undefined) payload[key] = value;
  });
  return {climate: payload, partial: climateMissing()};
}

const previewTimers = {};
let previewGeneration = 0;
function schedulePreview(roomId, delay = 450) {
  clearTimeout(previewTimers[roomId]);
  previewTimers[roomId] = setTimeout(() => runPreview(roomId), delay);
}
function scheduleAllPreviews() {
  previewGeneration++;
  rooms.forEach((room, i) => schedulePreview(room.id, 150 + i * 120));
}

async function runPreview(roomId) {
  const room = rooms.find(item => item.id === roomId);
  if (!room) return;
  const generation = previewGeneration;
  const prepared = previewRoom(room);
  if (!prepared) {
    previews[roomId] = {result: null, partial: true, error: ''};
    renderAfterPreview();
    return;
  }
  const climate = previewClimate();
  try {
    const result = await api('preview', {method: 'POST', body: JSON.stringify({
      method, project_name: 'preview', language: window.AppI18n?.getLanguage() || 'it', climate: climate.climate, rooms: [prepared.room]
    })});
    if (generation !== previewGeneration && !rooms.some(item => item.id === roomId)) return;
    previews[roomId] = {result: result.rooms[0], partial: prepared.partial || climate.partial, error: ''};
  } catch (error) {
    previews[roomId] = {result: null, partial: true, error: error.message};
  }
  renderAfterPreview();
}
function renderAfterPreview() {
  renderRoomList();
  renderLive();
  renderCalcBar();
}

const BREAKDOWN_GROUPS = [
  ['Pareti e tetto', ['trasmissione_pareti', 'trasmissione_tetto', 'trasmissione_pavimento', 'confinanti_estate', 'sole_tetto']],
  ['Finestre e sole', ['trasmissione_finestre', 'apporto_solare_finestre']],
  ['Aria e umidità', ['aria_sensibile', 'aria_latente']],
  ['Persone e apparecchi', ['persone_sensibile', 'persone_latente', 'illuminazione', 'apparecchiature']],
  ['Involucro (stima rapida)', ['involucro_rapido']],
  ['Persone, luci e apparecchi', ['persone_luci_apparecchi']],
];

function renderLive() {
  const room = activeRoom();
  const state = previews[room.id];
  const missing = missingItems(room);
  const result = state?.result;
  const pill = result ? (state.partial || missing.length ? `<span class="pill warn">${tr('Anteprima')}</span>` : `<span class="pill ok">${tr('Dati completi')}</span>`) : `<span class="pill neutral">${tr('In attesa')}</span>`;
  let body = '';
  if (result) {
    const groups = BREAKDOWN_GROUPS.map(([label, keys]) => [label, keys.reduce((sum, key) => sum + n(result.breakdown?.[key]), 0)]).filter(([, value]) => value > 0);
    const max = Math.max(1, ...groups.map(([, value]) => value));
    body = `<div class="kpis">
        <div class="kpi cool"><span>${tr('Freddo')}</span><strong>${dec(result.total_cooling_kw, 2)}<small> kW</small></strong></div>
        <div class="kpi heat"><span>${tr('Caldo')}</span><strong>${dec(result.heating_kw, 2)}<small> kW</small></strong></div>
      </div>
      ${groups.length ? `<div class="breakdown"><span class="breakdown-title">${tr('Carico estivo per voce')}</span>${groups.map(([label, value]) => `<div class="bd"><span>${escapeHtml(tr(label))}</span><span class="bar"><i data-w="${(value / max * 100).toFixed(0)}"></i></span><b>${dec(value, 0)} W</b></div>`).join('')}</div>` : ''}`;
  } else if (state?.error) {
    body = `<p class="notice err live-error"><b class="ic" aria-hidden="true">!</b><span>${escapeHtml(state.error)}</span></p>`;
  } else {
    body = `<p class="field-help">${tr('Inserisci lunghezza, larghezza e altezza per vedere la potenza.')}</p>`;
  }
  $('#live-panel').innerHTML = `<div class="live-head"><h3>${escapeHtml(room.name || tr('Locale'))}</h3>${pill}</div>${body}
    ${missing.length ? `<div class="missing"><span class="breakdown-title">${tr('Mancano ancora')}</span>${missing.map(item => `<button type="button" class="missing-item" data-goto="${item.step}">${escapeHtml(tr(item.text))}</button>`).join('')}</div>` : ''}
    <p class="live-note">${tr('Il valore definitivo arriva con “Calcola potenze” e il PDF. Margine compreso; le voci sono prima del margine.')}</p>`;
  UI.applyGeometry($('#live-panel'));
}

function renderCalcBar() {
  $('#room-count').textContent = `${rooms.length} ${tr(rooms.length === 1 ? 'locale' : 'locali')}`;
  const done = rooms.map(room => previews[room.id]?.result).filter(Boolean);
  const missing = rooms.reduce((sum, room) => sum + missingItems(room).length, 0);
  const cool = done.reduce((sum, item) => sum + n(item.total_cooling_w), 0) / 1000;
  const heat = done.reduce((sum, item) => sum + n(item.heating_w), 0) / 1000;
  $('#calc-live').innerHTML = done.length
    ? `<b>${dec(cool, 1)} kW</b> ${tr('freddo')} · <u>${dec(heat, 1)} kW</u> ${tr('caldo')}${missing ? ` · ${trf(missing === 1 ? 'manca 1 dato' : 'mancano {n} dati', {n: missing})}` : ''}`
    : escapeHtml(tr('I risultati restano separati per ogni ambiente'));
}

/* ---------- Modifica dei dati ---------- */
function syncRoomInput(event) {
  const input = event.target.closest('[data-key]');
  if (!input) return;
  const card = input.closest('.room-card');
  const room = rooms.find(item => item.id === card.dataset.id);
  if (!syncGuidedInput(input, room)) {
    room[input.dataset.key] = input.type === 'number' ? (input.value === '' ? '' : n(input.value)) : input.value;
    const choice = SIMPLE_CHOICES[input.dataset.key];
    if (choice) {
      const selected = choice.options.find(option => option[0] === input.value);
      if (selected) room[choice.key] = selected[2];
      const group = input.closest('.simple-choice');
      group.querySelector('input').value = room[choice.key];
      group.querySelector('details').open = input.value === 'custom';
    } else {
      const choiceKey = Object.keys(SIMPLE_CHOICES).find(key => SIMPLE_CHOICES[key].key === input.dataset.key);
      if (choiceKey) {
        room[choiceKey] = 'custom';
        input.closest('.simple-choice').querySelector('select').value = 'custom';
      }
    }
    if (input.dataset.key === 'quick_orientation') {
      const preset = EXPOSURE_OPTIONS.find(item => item.value === input.value);
      if (preset && preset.factor !== undefined) room.quick_exposure_factor = preset.factor;
      const group = input.closest('.exposure-field');
      group.querySelector('[data-key="quick_exposure_factor"]').value = room.quick_exposure_factor ?? 1;
      group.querySelector('details').open = input.value === 'custom';
    } else if (input.dataset.key === 'quick_exposure_factor') {
      room.quick_orientation = 'custom';
      input.closest('.exposure-field').querySelector('select').value = 'custom';
    }
  }
  refreshStepMarkers();
  renderRoomList();
  renderLive();
  schedulePreview(room.id);
}

function syncGuidedInput(input, room) {
  const key = input.dataset.key;
  if (input.dataset.window !== undefined) {
    const win = room.guided_windows[Number(input.dataset.window)];
    win[key.replace('window_', '')] = input.type === 'number' ? (input.value === '' ? '' : Number(input.value)) : input.value;
    return true;
  }
  if (key === 'guided_window_count') return true; // resize on change, preserving focus while typing
  return false;
}

function setWall(room, index, value) {
  room.guided_walls = wallsOf(room);
  room.guided_walls[index] = value;
  renderEditor();
  renderRoomList();
  renderLive();
  schedulePreview(room.id, 150);
  const target = $(`#rooms .wall[data-wall="${index}"]`);
  target?.focus({preventScroll: true});
}

function goToStep(index) {
  const room = activeRoom();
  roomStep[room.id] = index;
  renderEditor();
  renderRoomList();
  const card = $('#rooms .room-card');
  if (card && card.getBoundingClientRect().top < 0) card.scrollIntoView({behavior: 'smooth', block: 'start'});
}

function duplicateRoom(id) {
  const source = rooms.find(room => room.id === id) || activeRoom();
  const copy = JSON.parse(JSON.stringify(source));
  copy.id = crypto.randomUUID();
  copy.name = `${source.name || tr('Locale')} (${tr('copia')})`;
  rooms.splice(rooms.indexOf(source) + 1, 0, copy);
  activeRoomId = copy.id;
  roomStep[copy.id] = roomStep[source.id] || 0;
  clearCalculation();
  renderRooms();
  schedulePreview(copy.id, 50);
  toast('Locale duplicato: cambia nome e misure.');
}

function commissioningPayload() {
  return {
    refrigerant: $('#vac-refrigerant').value,
    system_state: $('#vac-system-state').value,
    hose_size: $('#vac-hose-size').value,
    minutes: n($('#vac-minutes').value),
    start_micron: n($('#vac-start').value),
    current_micron: n($('#vac-current').value),
    rise_start: n($('#vac-rise-start').value),
    rise_end: n($('#vac-rise-end').value),
    rise_minutes: n($('#vac-rise-minutes').value),
    core_removed: $('#vac-core-removed').checked,
    nitrogen_tested: $('#vac-nitrogen-tested').checked,
    oil_fresh: $('#vac-oil-fresh').checked
  };
}

function projectPayload() {
  return {
    id: currentProjectId,
    project_name: $('#project-name').value.trim() || 'Nuovo progetto',
    customer: $('#customer').value.trim(), location: $('#location').value.trim(), method,
    language: window.AppI18n?.getLanguage() || 'it',
    climate: {
      summer_outdoor_c: ($('#summer-outdoor').value === '' ? null : n($('#summer-outdoor').value)), summer_outdoor_rh: ($('#summer-rh-out').value === '' ? null : n($('#summer-rh-out').value)),
      summer_indoor_c: ($('#summer-indoor').value === '' ? null : n($('#summer-indoor').value)), summer_indoor_rh: ($('#summer-rh-in').value === '' ? null : n($('#summer-rh-in').value)),
      winter_outdoor_c: ($('#winter-outdoor').value === '' ? null : n($('#winter-outdoor').value)), winter_indoor_c: ($('#winter-indoor').value === '' ? null : n($('#winter-indoor').value)), heating_factor: 1
    },
    commissioning: commissioningPayload(),
    rooms
  };
}

async function api(path, options = {}) {
  const headers = {'Content-Type': 'application/json', ...(options.headers || {})};
  const method = String(options.method || 'GET').toUpperCase();
  if (EXTERNAL_ADMIN && !['GET', 'HEAD'].includes(method)) headers['X-Admin-CSRF'] = cookieValue('hvac_admin_csrf');
  const response = await fetch(`api/${path}`, {...options, headers});
  const data = await response.json().catch(() => ({error: 'Errore di comunicazione', error_de: 'Verbindungsfehler'}));
  if (EXTERNAL_ADMIN && response.status === 401) {
    window.location.replace('/admin/login');
    throw new Error('Sessione amministratore scaduta');
  }
  if (!response.ok) throw new Error(serverError(data));
  return data;
}

async function externalAdminLogout() {
  if (!EXTERNAL_ADMIN) return;
  const button = $('#external-admin-logout');
  button.disabled = true;
  try {
    await api('logout', {method: 'POST', body: '{}'});
  } catch (_) {}
  window.location.replace('/admin/login');
}

async function calculate() {
  const generation = projectGeneration;
  const button = $('#calculate');
  button.disabled = true;
  try {
    const result = await api('calculate', {method: 'POST', body: JSON.stringify(projectPayload())});
    if (generation !== projectGeneration) return;
    Object.values(lastCalculationPdfUrls).forEach(url => URL.revokeObjectURL(url));
    lastCalculationPdfUrls = {};
    const pdfs = result.pdf_languages || {[window.AppI18n?.getLanguage() || 'it']: result.pdf_base64};
    for (const [language, encoded] of Object.entries(pdfs)) {
      if (!encoded) continue;
      const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
      lastCalculationPdfUrls[language] = URL.createObjectURL(new Blob([bytes], {type: 'application/pdf'}));
    }
    delete result.pdf_base64;
    delete result.pdf_languages;
    result.calculated_at = new Date().toISOString();
    lastCalculationResult = result;
    renderResults(result);
    $('#results').scrollIntoView({behavior: 'smooth', block: 'start'});
  } catch (error) {
    toast(error.message, true);
    focusErrorRoom(error.message);
  } finally {
    button.disabled = false;
  }
}

/** Dopo un errore del calcolo apre il locale indicato nel messaggio, se lo trova. */
function focusErrorRoom(message) {
  const room = rooms.find(item => item.name && String(message).startsWith(`${item.name} —`));
  if (room && room.id !== activeRoomId) {
    activeRoomId = room.id;
    renderRooms();
  }
}

function renderResults(result) {
  const pdfLanguage = window.AppI18n?.getLanguage() || 'it';
  const pdfUrl = lastCalculationPdfUrls[pdfLanguage];
  const target = $('#results');
  const maxKw = Math.max(0.001, ...result.rooms.map(room => Math.max(n(room.total_cooling_kw), n(room.heating_kw))));
  const time = result.calculated_at ? new Date(result.calculated_at).toLocaleTimeString(window.AppI18n?.locale() || 'it-IT', {hour: '2-digit', minute: '2-digit'}) : '';
  const outdoor = result.outdoor;
  target.classList.remove('hidden');
  target.innerHTML = `
    <div class="results-head">
      <div><p class="eyebrow">${tr('RISULTATO')} · ${tr(result.method.toUpperCase())}</p><h2>${escapeHtml(tr(result.project_name))}</h2></div>
      <div class="report-actions">${time ? `<span class="pill ok">${trf('Calcolato alle {time}', {time})}</span>` : ''}${pdfUrl ? `<a class="button primary" href="${pdfUrl}" download="dimensionamento-${pdfLanguage}.pdf">${tr('Scarica PDF del calcolo')}</a><a class="button secondary" href="${pdfUrl}" target="_blank" rel="noopener">${tr('Apri PDF / stampa')}</a>` : ''}</div>
    </div>
    <p class="field-help">${tr('Il PDF contiene i dati dell’ultimo calcolo riuscito. Dopo una modifica, ricalcola per aggiornarlo.')}</p>
    <div class="totals">
      <div class="kpi"><span>${tr('Superficie totale')}</span><strong>${dec(result.totals.area_m2, 1)}<small> m²</small></strong></div>
      <div class="kpi"><span>${tr('Volume totale')}</span><strong>${dec(result.totals.volume_m3, 1)}<small> m³</small></strong></div>
      <div class="kpi cool"><span>${tr('Potenza frigorifera')}</span><strong>${dec(result.totals.cooling_kw, 2)}<small> kW</small></strong></div>
      <div class="kpi heat"><span>${tr('Potenza riscaldamento')}</span><strong>${dec(result.totals.heating_kw, 2)}<small> kW</small></strong></div>
    </div>
    <div class="results-grid">
      <div class="result-card">
        <div class="section-title"><h3>${tr('Per locale')}</h3><div class="legend"><span><i class="l-win"></i>${tr('Freddo')}</span><span><i class="l-out"></i>${tr('Caldo')}</span></div></div>
        <div class="rbars">${result.rooms.map(room => `<div class="rbar"><strong>${escapeHtml(room.name)}</strong><div class="tracks"><i class="c" data-w="${(n(room.total_cooling_kw) / maxKw * 100).toFixed(1)}"></i><i class="h" data-w="${(n(room.heating_kw) / maxKw * 100).toFixed(1)}"></i></div><div class="vals"><span class="cool-text">${dec(room.total_cooling_kw, 2)}</span> / <span class="heat-text">${dec(room.heating_kw, 2)}</span> kW</div></div>`).join('')}</div>
      </div>
      ${outdoor ? `<div class="result-card">
        <div class="section-title"><h3>${tr('Proposta unità esterna')}</h3><span class="pill neutral">${tr('Indicativa')}</span></div>
        <div class="unit-prop"><div class="odu" aria-hidden="true"></div><div><strong>${escapeHtml(outdoor.configuration)}</strong><div class="field-help">${outdoor.indoor_units} ${tr('unità interne')} · ${tr('Freddo')} ${dec(outdoor.cooling_kw, 2)} kW · ${tr('Caldo')} ${dec(outdoor.heating_kw, 2)} kW</div><div class="idu-dots" aria-hidden="true">${'<i></i>'.repeat(Math.min(outdoor.indoor_units, 12))}</div></div></div>
        <p class="field-help">${escapeHtml(outdoor.assumption)}</p>
        <ul class="result-notes">${outdoor.notes.map(note => `<li>${escapeHtml(note)}</li>`).join('')}</ul>
      </div>` : ''}
    </div>
    <details class="sizing-advanced"><summary>${tr('Tabella tecnica: sensibile, latente e SHR')}</summary>
      <div class="result-scroll"><table class="result-table"><thead><tr><th>${tr('Locale')}</th><th>m²</th><th>${tr('Sensibile')}</th><th>${tr('Latente')}</th><th>${tr('Freddo totale')}</th><th>${tr('Caldo')}</th><th>SHR</th></tr></thead><tbody>
        ${result.rooms.map(room => `<tr><td><strong>${escapeHtml(room.name)}</strong></td><td>${dec(room.area_m2, 1)}</td><td>${dec(room.sensible_cooling_w, 0)} W</td><td>${dec(room.latent_cooling_w, 0)} W</td><td><strong>${dec(room.total_cooling_kw, 2)} kW</strong></td><td><strong>${dec(room.heating_kw, 2)} kW</strong></td><td>${dec(room.shr, 2)}</td></tr>`).join('')}
      </tbody></table></div>
    </details>
    ${guidedResultDetails(result)}<p class="disclaimer">${escapeHtml(tr(result.disclaimer))}</p>`;
  UI.applyGeometry(target);
}

function guidedResultDetails(result) {
  return result.rooms.filter(room => room.guided_details).map(room => `<section class="guided-result"><h3>${escapeHtml(room.name)}</h3>
    <p class="field-help">${tr('Risultato indicativo basato sui dati inseriti e sulle seguenti ipotesi:')}</p>
    <ul>${room.guided_notes.map(note => `<li>${escapeHtml(tr(note))}</li>`).join('')}</ul>
    <details class="sizing-advanced"><summary>${tr('Mostra dati e coefficienti usati')}</summary>
    <dl>${Object.entries(room.guided_details).map(([label, value]) => `<div><dt>${tr(label)}</dt><dd>${escapeHtml(plain(value))}</dd></div>`).join('')}</dl></details>
  </section>`).join('');
}

/* ---------- Vuoto ---------- */
function analyzeVacuum() {
  const data = commissioningPayload();
  const target = $('#vacuum-result');
  const notes = [];
  let level = 'ok';
  let title = 'Evacuazione in buona direzione';

  if (!data.current_micron) {
    toast('Inserisci il valore attuale in micron', true);
    return;
  }

  const reduction = data.start_micron > 0 ? ((data.start_micron - data.current_micron) / data.start_micron) * 100 : 0;
  const slope = data.minutes > 0 && data.start_micron > data.current_micron ? (data.start_micron - data.current_micron) / data.minutes : 0;

  if (data.current_micron <= 500) {
    title = 'Vuoto profondo raggiunto';
    notes.push('Se il costruttore non prescrive un valore diverso, sei nella zona utile per eseguire il test di risalita.');
  } else if (data.current_micron <= 1000) {
    level = 'warn';
    title = 'Vuoto ancora incompleto';
    notes.push('Il valore è sotto 1000 micron ma non ancora nella zona obiettivo. Continua l’evacuazione e guarda la tendenza.');
  } else {
    level = 'danger';
    title = 'Vuoto insufficiente';
    notes.push('Se il valore resta sopra 1000 micron per molto tempo, verifica restrizioni, umidità, collegamenti e olio della pompa.');
  }

  if (data.hose_size === '0.25') notes.push('La frusta da 1/4" limita molto la portata in vuoto profondo. Una 3/8" o 1/2" corta migliora sensibilmente i tempi.');
  if (!data.core_removed) notes.push('Lo Schrader ancora montato può essere una forte strozzatura. Un core remover professionale aumenta molto la conduttanza.');
  if (data.system_state === 'used') notes.push('Su un impianto già funzionato l’olio può rilasciare lentamente refrigerante disciolto e umidità: il valore può scendere lentamente o oscillare.');
  if (data.system_state === 'open') notes.push('Se l’impianto è rimasto aperto all’atmosfera, considera umidità elevata e più cicli di evacuazione con rottura del vuoto a azoto secco.');
  if (!data.oil_fresh) notes.push('Olio della pompa non pulito: sostituirlo può migliorare molto il vuoto finale.');
  if (data.nitrogen_tested) notes.push('La prova di tenuta con azoto superata rende meno probabile una perdita importante, ma il test di risalita resta utile.');

  let rate = null;
  const hasRise = data.rise_start > 0 && data.rise_end > 0 && data.rise_minutes > 0;
  if (hasRise) {
    const rise = data.rise_end - data.rise_start;
    rate = rise / data.rise_minutes;
    const values = {rise: Math.round(rise), minutes: data.rise_minutes, rate: Math.round(rate), end: Math.round(data.rise_end)};
    if (rise <= 0) {
      notes.push(tr('Il test di risalita non mostra aumento: dato ottimo, verifica comunque che la pompa sia realmente isolata.'));
    } else if (rate > 150) {
      level = 'danger';
      title = 'Risalita troppo rapida';
      notes.push(trf('Risalita di circa {rate} micron/min: controlla perdite, raccordi, valvole e presenza di forte umidità.', values));
    } else if (data.rise_end > 1000) {
      level = 'danger';
      title = 'Risalita oltre la soglia';
      notes.push(trf('Dopo il test il vuoto è salito a {end} micron, oltre 1000: cerca perdite o umidità, poi ripeti evacuazione e test.', values));
    } else if (rate <= 50) {
      notes.push(trf('Test risalita favorevole: +{rise} micron in {minutes} min ({rate} micron/min).', values));
    } else {
      if (level === 'ok') level = 'warn';
      notes.push(trf('Risalita moderata: +{rise} micron in {minutes} min. Possibile degassamento/umidità residua; ripeti l’evacuazione.', values));
    }
  } else {
    notes.push('Quando arrivi al valore obiettivo, isola la pompa e registra inizio/fine del test di risalita per distinguere meglio umidità e perdita.');
  }

  if (data.refrigerant === 'R290') notes.push('R290 è infiammabile: lavora solo con attrezzatura/procedure idonee A3, circuito privo di refrigerante e area adeguatamente ventilata.');

  const progress = reduction > 0 ? `${Math.max(0, Math.min(100, reduction)).toFixed(0)}%` : '—';
  const evacuation = data.start_micron > 0 && data.minutes > 0 ? [{t: 0, v: data.start_micron}, {t: data.minutes, v: data.current_micron}] : [{t: 0, v: data.current_micron}];
  const riseStart = data.minutes > 0 ? data.minutes : 0;
  const chart = UI.vacuumChart({
    evacuation: evacuation.length === 2 ? evacuation : [],
    rise: hasRise ? [{t: riseStart, v: data.rise_start}, {t: riseStart + data.rise_minutes, v: data.rise_end}] : null,
    ariaLabel: trf('Andamento del vuoto: da {a} a {b} micron', {a: Math.round(data.start_micron || data.current_micron), b: Math.round(hasRise ? data.rise_end : data.current_micron)})
  });
  const symbol = level === 'ok' ? '✓' : level === 'warn' ? '!' : '✕';
  target.className = `vacuum-result ${level}`;
  target.innerHTML = `
    <div class="verdict"><div class="lamp ${level}" aria-hidden="true">${symbol}</div><div><span>${tr('Diagnosi')}</span><strong>${escapeHtml(tr(title))}</strong></div><span class="pill ${level === 'ok' ? 'ok' : level === 'warn' ? 'warn' : 'err'}">${Math.round(data.current_micron).toLocaleString(window.AppI18n?.locale() || 'it-IT')} ${tr('micron')}</span></div>
    ${chart}
    <div class="vacuum-summary">
      <div class="kpi"><span>${tr('Micron attuali')}</span><strong>${Math.round(data.current_micron).toLocaleString(window.AppI18n?.locale() || 'it-IT')}</strong></div>
      <div class="kpi"><span>${tr('Riduzione dal valore iniziale')}</span><strong>${progress}</strong></div>
      <div class="kpi"><span>${tr('Velocità media')}</span><strong>${slope > 0 ? `${Math.round(slope)}<small> µm/min</small>` : '—'}</strong></div>
      <div class="kpi"><span>${tr('Risalita')}</span><strong>${rate === null ? '—' : `${Math.round(rate)}<small> µm/min</small>`}</strong></div>
    </div>
    <ol class="diagnostic-list">${notes.map(note => `<li>${escapeHtml(tr(note))}</li>`).join('')}</ol>
    <div class="procedure-box"><strong>${tr('Procedura consigliata')}</strong><p>${tr('Continua fino al valore previsto dal costruttore; per riferimento operativo, punta a ≤500 micron. Poi isola la pompa e osserva la risalita per 10–15 minuti. Se serve rompere il vuoto, isola la pompa, introduci azoto secco con riduttore e poi evacua nuovamente.')}</p></div>`;
}

function resetVacuum() {
  $('#vac-start').value = '';
  $('#vac-current').value = '';
  $('#vac-rise-start').value = '';
  $('#vac-rise-end').value = '';
  $('#vac-minutes').value = '0';
  $('#vac-rise-minutes').value = '10';
  $('#vacuum-result').className = 'vacuum-result hidden';
  $('#vacuum-result').innerHTML = '';
}

/* ---------- Progetti ---------- */
async function saveProject() {
  try {
    const result = await api('projects', {method: 'POST', body: JSON.stringify(projectPayload())});
    currentProjectId = result.id; updateProjectState(); toast('Progetto salvato');
  } catch (error) { toast(error.message, true); }
}

async function showProjects() {
  try {
    const projects = await api('projects');
    $('#projects-list').innerHTML = projects.length ? projects.map(project => `<div class="project-item"><div><strong>${escapeHtml(project.name)}</strong><small>${new Date(project.updated_at).toLocaleString(window.AppI18n?.locale() || 'it-IT')}</small></div><button class="button secondary small" data-open="${project.id}">${tr('Apri')}</button><button class="button danger small" data-remove="${project.id}">${tr('Elimina')}</button></div>`).join('') : `<p class="disclaimer">${tr('Nessun progetto salvato.')}</p>`;
    if (!$('#projects-dialog').open) $('#projects-dialog').showModal();
  } catch (error) { toast(error.message, true); }
}

async function loadProject(id) {
  const project = await api(`projects/${id}`); const p = project.payload;
  clearCalculation();
  currentProjectId = project.id; method = p.method || 'quick'; rooms = p.rooms || [defaults()];
  Object.keys(previews).forEach(key => delete previews[key]);
  activeRoomId = rooms[0]?.id || null;
  $('#project-name').value = p.project_name || project.name; $('#customer').value = p.customer || ''; $('#location').value = p.location || '';
  const climate = p.climate || {};
  $('#summer-outdoor').value = climate.summer_outdoor_c ?? 35; $('#summer-rh-out').value = climate.summer_outdoor_rh ?? 50;
  $('#summer-indoor').value = climate.summer_indoor_c ?? 26; $('#summer-rh-in').value = climate.summer_indoor_rh ?? 50;
  $('#winter-outdoor').value = climate.winter_outdoor_c ?? -5; $('#winter-indoor').value = climate.winter_indoor_c ?? 20;
  const c = p.commissioning || {};
  $('#vac-refrigerant').value = c.refrigerant || 'R32'; $('#vac-system-state').value = c.system_state || 'new'; $('#vac-hose-size').value = c.hose_size || '0.25';
  $('#vac-minutes').value = c.minutes ?? 60; $('#vac-start').value = c.start_micron || ''; $('#vac-current').value = c.current_micron || '';
  $('#vac-rise-start').value = c.rise_start || ''; $('#vac-rise-end').value = c.rise_end || ''; $('#vac-rise-minutes').value = c.rise_minutes ?? 10;
  $('#vac-core-removed').checked = Boolean(c.core_removed); $('#vac-nitrogen-tested').checked = Boolean(c.nitrogen_tested); $('#vac-oil-fresh').checked = c.oil_fresh !== false;
  applyMethod(); renderRooms(); scheduleAllPreviews(); updateProjectState(); $('#projects-dialog').close(); toast('Progetto caricato');
}

function applyMethod() {
  $$('.method').forEach(button => button.classList.toggle('active', button.dataset.method === method));
  $('#climate-panel').classList.toggle('hidden', method === 'quick');
  $('#climate-panel').classList.toggle('guided-climate', method === 'guided');
}

function updateProjectState() {
  $('#project-state').textContent = tr(currentProjectId ? 'Progetto salvato' : 'Nuovo progetto — da salvare');
  $('.project-state-row').classList.toggle('unsaved', !currentProjectId);
}

function newProject() {
  clearCalculation();
  currentProjectId = null; method = 'guided'; rooms = [blankRoom()];
  activeRoomId = rooms[0].id;
  Object.keys(previews).forEach(key => delete previews[key]);
  $('#project-name').value = ''; $('#customer').value = ''; $('#location').value = '';
  updateProjectState();
  $$('#climate-panel input').forEach(input => { input.value = ''; });
  $$('#commissioning input, #commissioning select').forEach(input => {
    if (input.type === 'checkbox') input.checked = false;
    else if (input.tagName === 'SELECT') input.selectedIndex = 0;
    else input.value = '';
  });
  $('#vacuum-result').innerHTML = '';
  $('#vacuum-result').classList.add('hidden');
  applyMethod(); renderRooms();
}

function toast(message, error = false) {
  const node = $('#toast'); node.textContent = window.AppI18n?.translate(message) || message; node.style.background = error ? 'var(--danger)' : 'var(--green)';
  node.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 6500);
}

/* ---------- Eventi ---------- */
$('#rooms').addEventListener('input', syncRoomInput);
$('#rooms').addEventListener('change', event => {
  const input = event.target.closest('[data-key]');
  if (!input) return;
  const room = rooms.find(r => r.id === input.closest('.room-card').dataset.id);
  if (input.dataset.key === 'guided_window_count') {
    const count = Number(input.value);
    if (!Number.isInteger(count) || count < 0 || count > 30) { toast('Inserisci da 0 a 30 finestre.', true); return; }
    room.guided_windows ||= [];
    room.guided_windows.length = Math.min(count, room.guided_windows.length);
    while (room.guided_windows.length < count) room.guided_windows.push({width: '', height: '', glass: 'unknown', orientation: 'unknown', shade: 'unknown', position: 'wall', wall: defaultWall(room)});
    renderEditor(); renderRoomList(); renderLive(); schedulePreview(room.id, 100);
  } else if (['guided_attic', 'window_position', 'name'].includes(input.dataset.key) || (method === 'guided' && ['length', 'width'].includes(input.dataset.key) && currentStep(room) === 2)) {
    const focusKey = input.dataset.key;
    renderEditor(); renderRoomList(); renderLive();
    if (focusKey === 'name') $('#rooms [data-key="name"]')?.blur();
  }
});
$('#rooms').addEventListener('click', event => {
  const wall = event.target.closest('[data-wall]');
  const room = activeRoom();
  if (wall) {
    const index = Number(wall.dataset.wall);
    const order = ['outside', 'same', 'unheated'];
    const current = wallsOf(room)[index];
    const next = wall.dataset.set || order[(order.indexOf(current) + 1) % order.length];
    setWall(room, index, next);
    return;
  }
  const step = event.target.closest('[data-step]');
  if (step) { goToStep(Number(step.dataset.step)); return; }
  const go = event.target.closest('[data-go]');
  if (go) {
    if (go.dataset.go === 'calc') { calculate(); return; }
    goToStep(currentStep(room) + (go.dataset.go === 'next' ? 1 : -1));
    return;
  }
  const duplicate = event.target.closest('[data-duplicate]');
  if (duplicate) { duplicateRoom(duplicate.dataset.duplicate); return; }
  const button = event.target.closest('[data-delete]');
  if (!button) return;
  if (rooms.length === 1) return toast('Deve rimanere almeno un locale', true);
  rooms = rooms.filter(item => item.id !== button.dataset.delete);
  delete previews[button.dataset.delete];
  activeRoomId = rooms[0].id;
  clearCalculation();
  renderRooms();
});
$('#room-list').addEventListener('click', event => {
  const chip = event.target.closest('[data-room]');
  if (!chip) return;
  activeRoomId = chip.dataset.room;
  renderRooms();
  if (matchMedia('(max-width: 760px)').matches) $('#rooms').scrollIntoView({behavior: 'smooth', block: 'start'});
});
$('#live-panel').addEventListener('click', event => {
  const item = event.target.closest('[data-goto]');
  if (!item) return;
  if (item.dataset.goto === 'climate') {
    $('#climate-panel').scrollIntoView({behavior: 'smooth', block: 'center'});
    $('#climate-panel input')?.focus({preventScroll: true});
    return;
  }
  goToStep(Number(item.dataset.goto));
  $('#rooms').scrollIntoView({behavior: 'smooth', block: 'start'});
});
$('#climate-panel').addEventListener('input', () => { renderLive(); scheduleAllPreviews(); });
$$('.method').forEach(button => button.addEventListener('click', () => {
  method = button.dataset.method;
  Object.keys(previews).forEach(key => delete previews[key]);
  Object.keys(roomStep).forEach(key => delete roomStep[key]);
  applyMethod(); renderRooms(); scheduleAllPreviews();
}));
$('#add-room').addEventListener('click', () => {
  const room = blankRoom(); room.name = `${tr('Locale')} ${rooms.length + 1}`;
  rooms.push(room); activeRoomId = room.id; clearCalculation(); renderRooms();
  $('#rooms [data-key="length"]')?.focus();
});
$('#duplicate-room').addEventListener('click', () => duplicateRoom(activeRoomId));
$('#calculate').addEventListener('click', calculate);
window.addEventListener('app-language-changed', () => {
  updateProjectState();
  renderRooms();
  if (lastCalculationResult && !$('#results').classList.contains('hidden')) renderResults(lastCalculationResult);
  if (!$('#vacuum-result').classList.contains('hidden')) analyzeVacuum();
});
$('#save-project').addEventListener('click', saveProject);
$('#open-projects').addEventListener('click', showProjects);
$('#close-projects').addEventListener('click', () => $('#projects-dialog').close());
$('#new-project').addEventListener('click', () => {
  newProject();
  showAppPage('sizing');
  $('#project-name').scrollIntoView({block: 'center', behavior: 'smooth'});
  toast('Nuovo progetto: inserisci i dati.');
});
if (EXTERNAL_ADMIN) {
  $('#external-admin-logout').classList.remove('hidden');
  $('#external-admin-logout').addEventListener('click', externalAdminLogout);
}
$$('[data-page-button]').forEach(button => button.addEventListener('click', () => showAppPage(button.dataset.pageButton)));
$('#analyze-vacuum').addEventListener('click', analyzeVacuum);
$('#reset-vacuum').addEventListener('click', resetVacuum);
$('#projects-list').addEventListener('click', async event => {
  const open = event.target.closest('[data-open]'); const remove = event.target.closest('[data-remove]');
  try { if (open) await loadProject(open.dataset.open); if (remove) { await api(`projects/${remove.dataset.remove}`, {method: 'DELETE'}); await showProjects(); } }
  catch (error) { toast(error.message, true); }
});

newProject();
showAppPage(getAppRoute().page, false);

// Free the mobile viewport while editing; restore controls after focus or keyboard closes.
(() => {
  const mobile = () => matchMedia('(max-width: 760px)').matches && matchMedia('(pointer: coarse)').matches;
  const editable = node => node?.matches('input:not([readonly]):not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), textarea');
  let keyboardOpen = false;
  document.addEventListener('focusin', event => {
    if (mobile() && editable(event.target)) {
      document.body.classList.add('editing-mobile');
      setTimeout(() => { if (document.activeElement === event.target) event.target.scrollIntoView({block: 'center', behavior: 'smooth'}); }, 250);
    }
  });
  document.addEventListener('focusout', () => setTimeout(() => {
    if (!editable(document.activeElement)) document.body.classList.remove('editing-mobile');
  }, 50));
  window.visualViewport?.addEventListener('resize', () => {
    const open = window.innerHeight - window.visualViewport.height > 120;
    if (keyboardOpen && !open) document.body.classList.remove('editing-mobile');
    else if (open && mobile() && editable(document.activeElement)) document.body.classList.add('editing-mobile');
    keyboardOpen = open;
  });
})();
