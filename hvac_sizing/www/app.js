const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const n = value => Number(value || 0);
const tr = value => window.AppI18n?.translate(value) || value;
const EXTERNAL_ADMIN = window.location.pathname.startsWith('/admin/');

function cookieValue(name) {
  const prefix = `${name}=`;
  const item = document.cookie.split(';').map(value => value.trim()).find(value => value.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : '';
}

let method = 'guided';
let currentProjectId = null;
let rooms = [];
let lastCalculationResult = null;
let lastCalculationPdfUrls = {};
const APP_PAGES = new Set(['sizing', 'cylinders', 'performance', 'commissioning', 'accounts', 'no-access']);

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
  if (window.appAccess && selected !== 'no-access' && !(selected === 'accounts' ? window.appAccess.role === 'admin' : window.canAccess(selected))) selected = 'no-access';
  $$('[data-app-page]').forEach(node => node.classList.toggle('page-hidden', node.dataset.appPage !== selected));
  $$('[data-page-button]').forEach(button => button.classList.toggle('active', button.dataset.pageButton === selected));
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
let fieldHelpIndex = 0;
function field(key, label, value, extra = '') {
  const helpId = `room-field-help-${++fieldHelpIndex}`;
  return `<label>${label}<input data-key="${key}" type="number" value="${value}" aria-describedby="${helpId}" ${extra}><small class="field-help" id="${helpId}">${escapeHtml(tr(ROOM_FIELD_HELP[key]))}</small></label>`;
}

function renderRooms() {
  fieldHelpIndex = 0;
  $('#sizing-method-help').textContent = tr(method === 'guided' ? 'Rispondi alle domande del locale. Il calcolo stima i coefficienti e mostra le ipotesi nel risultato. Non servono W/m³.' : method === 'quick' ? "Calcolo rapido: stima iniziale con coefficienti indicativi da verificare per il locale." : "Calcolo professionale: verifica clima, superfici e dati tecnici. Le superfici usano la temperatura esterna; ambienti confinanti a temperature diverse richiedono una valutazione specifica.");
  const container = $('#rooms');
  container.innerHTML = rooms.map((room, index) => `
    <article class="room-card" data-id="${room.id}">
      <div class="room-head">
        <div class="room-title"><span class="room-index">${index + 1}</span><input data-key="name" value="${escapeHtml(room.name)}" aria-label="Nome locale"></div>
        <button class="delete-room" data-delete="${room.id}">Elimina</button>
      </div>
      <div class="room-body">
        <div class="grid four">
          ${field('length', 'Lunghezza m', room.length, 'step="0.01"')}
          ${field('width', 'Larghezza m', room.width, 'step="0.01"')}
          ${field('height', method === 'guided' ? 'Altezza media m' : 'Altezza m', room.height, 'step="0.01"')}
          ${simpleChoice(room, 'margin_choice')}
        </div>
        ${method === 'guided' ? guidedFields(room) : method === 'quick' ? quickFields(room) : professionalFields(room)}
      </div>
    </article>`).join('');
  $('#room-count').textContent = `${rooms.length} ${rooms.length === 1 ? 'locale' : 'locali'}`;
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
  const selected = EXPOSURE_OPTIONS.some(item => item.value === room.quick_orientation)
    ? room.quick_orientation : 'custom';
  const helpId = `room-field-help-${++fieldHelpIndex}`;
  return `<div class="exposure-field">
    <label>${tr('Esposizione delle finestre')}
      <select data-key="quick_orientation" aria-describedby="${helpId}">
        ${EXPOSURE_OPTIONS.map(item => `<option value="${item.value}" ${item.value === selected ? 'selected' : ''}>${tr(item.label)}</option>`).join('')}
      </select>
      <small id="${helpId}" class="field-help">${tr('Verso dove guardano le finestre principali? Puoi usare la bussola del telefono. Se sono su più lati, scegli “Non so / più esposizioni”.')}</small>
    </label>
    <p class="field-help exposure-note">${tr('La scelta applica una correzione indicativa della stima rapida, non un calcolo del sole reale. Ombre, località e superficie dei vetri possono cambiare il risultato.')}</p>
    <details class="exposure-details" ${selected === 'custom' ? 'open' : ''}>
      <summary>${tr('Correzione applicata / modifica manuale')}</summary>
      ${field('quick_exposure_factor', 'Fattore esposizione', room.quick_exposure_factor ?? 1, 'step="0.05" min="0"')}
      <small class="field-help">${tr('1 = nessuna correzione; 1,10 = +10% sulla quota di base estiva. Con ombreggiamento o condizioni particolari, verifica il valore manualmente.')}</small>
    </details>
  </div>`;
}

// UI presets are transparent heuristics for the existing quick estimate.
const SIMPLE_CHOICES = {
  insulation_choice: {
    key: 'quick_insulation_factor', label: 'Com’è isolato il locale?', numericLabel: 'Fattore isolamento', extra: 'step="0.05" min="0"',
    help: 'Considera pareti e tetto. Sono categorie indicative, non classi energetiche. Se non sai, scegli “Non so”: non viene applicata una correzione.',
    options: [
      ['unknown', 'Non so — nessuna correzione', 1],
      ['good', 'Ben isolato — cappotto e tetto isolato', 0.8],
      ['average', 'Isolamento intermedio', 1],
      ['poor', 'Poco isolato — pareti e tetto non isolati', 1.2]
    ]
  },
  glazing_choice: {
    key: 'quick_glazing_factor', label: 'Quante superfici vetrate ci sono?', numericLabel: 'Fattore vetrate', extra: 'step="0.05" min="0"',
    help: 'Considera quanto spazio occupano i vetri sulle pareti esterne. Conta la superficie, non il numero di finestre. Questa scelta riguarda il raffrescamento.',
    options: [
      ['unknown', 'Non so — nessuna correzione', 1],
      ['few', 'Poche o nessuna — piccole finestre', 0.9],
      ['average', 'Intermedie — parte della parete', 1],
      ['large', 'Molte — grandi vetrate o pareti di vetro', 1.2]
    ]
  },
  margin_choice: {
    key: 'margin_percent', label: 'Potenza extra (margine)', numericLabel: 'Margine %', extra: 'min="0" max="50"',
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
  const helpId = `room-field-help-${++fieldHelpIndex}`;
  return `<div class="simple-choice">
    <label>${tr(config.label)}<select data-key="${choiceKey}" aria-describedby="${helpId}">
      ${[...config.options, ['custom', 'Valore manuale / progetto precedente']].map(option => `<option value="${option[0]}" ${selected === option[0] ? 'selected' : ''}>${tr(option[1])}</option>`).join('')}
    </select><small id="${helpId}" class="field-help">${tr(config.help)}</small></label>
    <details class="exposure-details" ${selected === 'custom' ? 'open' : ''}>
      <summary>${tr('Valore applicato / modifica manuale')}</summary>
      ${field(config.key, config.numericLabel, room[config.key], config.extra)}
    </details>
  </div>`;
}

function quickFields(room) {
  return `<p class="subheading">Caratteristiche del locale</p>
  <p class="field-help quick-assumptions">${tr('Le scelte applicano correzioni indicative della stima rapida. Puoi vedere e modificare ogni valore nei dettagli. I dati sconosciuti restano da verificare.')}</p>
  <div class="grid four">
    ${simpleChoice(room, 'insulation_choice')}
    ${exposureFields(room)}
    ${simpleChoice(room, 'glazing_choice')}
  </div>
  <p class="subheading">Persone, luci e apparecchi</p><div class="grid four">
    ${field('people', 'Persone', room.people)}
    ${field('lighting_w', 'Illuminazione W', room.lighting_w)}
    ${field('equipment_w', 'Apparecchiature W', room.equipment_w)}
  </div>
  <details class="sizing-advanced">
    <summary>${tr('Impostazioni avanzate — potenza di base')}</summary>
    <p class="field-help">${tr('Per iniziare sono precompilati 35 W/m³ per raffreddare e 40 W/m³ per scaldare. Sono ipotesi di partenza da verificare, non valori adatti a ogni edificio. I progetti già salvati conservano i loro valori.')}</p>
    <div class="grid four">
      ${field('quick_w_m3_cooling', 'Base raffrescamento W/m³', room.quick_w_m3_cooling)}
      ${field('quick_w_m3_heating', 'Base riscaldamento W/m³', room.quick_w_m3_heating)}
    </div>
  </details>`;
}

function professionalFields(room) {
  return `
    <p class="subheading">Involucro edilizio</p><div class="grid four">
      ${field('wall_area', 'Pareti esterne m²', room.wall_area, 'step="0.01"')}
      ${field('wall_u', 'U pareti W/m²K', room.wall_u, 'step="0.01"')}
      ${field('window_area', 'Finestre m²', room.window_area, 'step="0.01"')}
      ${field('window_u', 'U finestre W/m²K', room.window_u, 'step="0.01"')}
      ${field('roof_area', 'Tetto/solaio m²', room.roof_area, 'step="0.01"')}
      ${field('roof_u', 'U tetto W/m²K', room.roof_u, 'step="0.01"')}
      ${field('floor_area', 'Pavimento m²', room.floor_area, 'step="0.01"')}
      ${field('floor_u', 'U pavimento W/m²K', room.floor_u, 'step="0.01"')}
    </div>
    <p class="subheading">Sole, aria e umidità</p><div class="grid four">
      ${field('solar_irradiance_w_m2', 'Irradianza finestra W/m²', room.solar_irradiance_w_m2)}
      ${field('window_g_value', 'Fattore solare vetro g', room.window_g_value, 'step="0.01" min="0" max="1"')}
      ${field('shading_factor', 'Fattore schermatura', room.shading_factor, 'step="0.01" min="0" max="1.5"')}
      ${field('infiltration_ach', 'Infiltrazioni vol/h', room.infiltration_ach, 'step="0.1"')}
      ${field('ventilation_m3h', 'Aria esterna m³/h', room.ventilation_m3h)}
    </div>
    <p class="subheading">Carichi interni</p><div class="grid four">
      ${field('people', 'Persone', room.people)}
      ${field('occupancy_factor', 'Contemporaneità persone', room.occupancy_factor, 'step="0.05" min="0" max="1"')}
      ${field('person_sensible_w', 'Sensibile per persona W', room.person_sensible_w)}
      ${field('person_latent_w', 'Latente per persona W', room.person_latent_w)}
      ${field('lighting_w', 'Illuminazione installata W', room.lighting_w)}
      ${field('lighting_factor', 'Uso illuminazione', room.lighting_factor, 'step="0.05" min="0" max="1"')}
      ${field('equipment_w', 'Apparecchiature installate W', room.equipment_w)}
      ${field('equipment_factor', 'Uso apparecchiature', room.equipment_factor, 'step="0.05" min="0" max="1"')}
    </div>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

function syncRoomInput(event) {
  const input = event.target.closest('[data-key]');
  if (!input) return;
  const card = input.closest('.room-card');
  const room = rooms.find(item => item.id === card.dataset.id);
  if (syncGuidedInput(input, room)) return;
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
  const data = await response.json().catch(() => ({error: 'Errore di comunicazione'}));
  if (EXTERNAL_ADMIN && response.status === 401) {
    window.location.replace('/admin/login');
    throw new Error('Sessione amministratore scaduta');
  }
  if (!response.ok) throw new Error(window.AppI18n?.translate(data.error || 'Operazione non riuscita') || data.error || 'Operazione non riuscita');
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
  try {
    const result = await api('calculate', {method: 'POST', body: JSON.stringify(projectPayload())});
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
    lastCalculationResult = result;
    renderResults(result);
    $('#results').scrollIntoView({behavior: 'smooth', block: 'start'});
  } catch (error) { toast(error.message, true); }
}

function renderResults(result) {
  const pdfLanguage = window.AppI18n?.getLanguage() || 'it';
  const lastCalculationPdfUrl = lastCalculationPdfUrls[pdfLanguage];
  const target = $('#results');
  target.classList.remove('hidden');
  target.innerHTML = `
    <div class="section-title"><div><p class="eyebrow">${tr('RISULTATO')} ${tr(result.method.toUpperCase())}</p><h2>${escapeHtml(result.project_name)}</h2></div></div>
    <div class="report-actions">${lastCalculationPdfUrl ? `<a class="button primary" href="${lastCalculationPdfUrl}" download="dimensionamento-${pdfLanguage}.pdf">${tr('Scarica PDF del calcolo')}</a><a class="button secondary" href="${lastCalculationPdfUrl}" target="_blank" rel="noopener">${tr('Apri PDF / stampa')}</a>` : ''}<p class="field-help">${tr('Il PDF contiene i dati dell’ultimo calcolo riuscito. Dopo una modifica, ricalcola per aggiornarlo.')}</p></div>
    ${result.outdoor ? `<section class="guided-result"><h3>${tr('Proposta unità esterna')}</h3><p><strong>${escapeHtml(result.outdoor.configuration)}</strong> · ${result.outdoor.indoor_units} ${tr('unità interne')}</p><p>${escapeHtml(result.outdoor.assumption)}</p><p>${tr('Freddo')}: <strong>${result.outdoor.cooling_kw} kW</strong> · ${tr('Caldo')}: <strong>${result.outdoor.heating_kw} kW</strong></p><ul>${result.outdoor.notes.map(note=>`<li>${escapeHtml(note)}</li>`).join('')}</ul></section>` : ''}
    <div class="totals">
      <div class="metric"><span>Superficie totale</span><strong>${result.totals.area_m2} m²</strong></div>
      <div class="metric"><span>Volume totale</span><strong>${result.totals.volume_m3} m³</strong></div>
      <div class="metric cool"><span>Potenza frigorifera</span><strong>${result.totals.cooling_kw} kW</strong></div>
      <div class="metric heat"><span>Potenza riscaldamento</span><strong>${result.totals.heating_kw} kW</strong></div>
    </div>
    <div class="result-scroll"><table class="result-table"><thead><tr><th>Locale</th><th>m²</th><th>Sensibile</th><th>Latente</th><th>Freddo totale</th><th>Caldo</th><th>SHR</th></tr></thead><tbody>
      ${result.rooms.map(room => `<tr><td><strong>${escapeHtml(room.name)}</strong></td><td>${room.area_m2}</td><td>${room.sensible_cooling_w} W</td><td>${room.latent_cooling_w} W</td><td><strong>${room.total_cooling_kw} kW</strong></td><td><strong>${room.heating_kw} kW</strong></td><td>${room.shr}</td></tr>`).join('')}
    </tbody></table></div>${guidedResultDetails(result)}<p class="disclaimer">${escapeHtml(tr(result.disclaimer))}</p>`;
}

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

  if (data.hose_size === '0.25') {
    notes.push('La frusta da 1/4" limita molto la portata in vuoto profondo. Una 3/8" o 1/2" corta migliora sensibilmente i tempi.');
  }
  if (!data.core_removed) {
    notes.push('Lo Schrader ancora montato può essere una forte strozzatura. Un core remover professionale aumenta molto la conduttanza.');
  }
  if (data.system_state === 'used') {
    notes.push('Su un impianto già funzionato l’olio può rilasciare lentamente refrigerante disciolto e umidità: il valore può scendere lentamente o oscillare.');
  }
  if (data.system_state === 'open') {
    notes.push('Se l’impianto è rimasto aperto all’atmosfera, considera umidità elevata e più cicli di evacuazione con rottura del vuoto a azoto secco.');
  }
  if (!data.oil_fresh) {
    notes.push('Olio della pompa non pulito: sostituirlo può migliorare molto il vuoto finale.');
  }
  if (data.nitrogen_tested) {
    notes.push('La prova di tenuta con azoto superata rende meno probabile una perdita importante, ma il test di risalita resta utile.');
  }

  if (data.rise_start > 0 && data.rise_end > 0 && data.rise_minutes > 0) {
    const rise = data.rise_end - data.rise_start;
    const rate = rise / data.rise_minutes;
    if (rise <= 0) {
      notes.push('Il test di risalita non mostra aumento: dato ottimo, verifica comunque che la pompa sia realmente isolata.');
    } else if (data.rise_end <= 1000 && rate <= 50) {
      notes.push(`Test risalita favorevole: +${Math.round(rise)} micron in ${data.rise_minutes} min (${Math.round(rate)} micron/min).`);
    } else if (rate <= 150) {
      if (level === 'ok') level = 'warn';
      notes.push(`Risalita moderata: +${Math.round(rise)} micron in ${data.rise_minutes} min. Possibile degassamento/umidità residua; ripeti l’evacuazione.`);
    } else {
      level = 'danger';
      title = 'Risalita troppo rapida';
      notes.push(`Risalita di circa ${Math.round(rate)} micron/min: controlla perdite, raccordi, valvole e presenza di forte umidità.`);
    }
  } else {
    notes.push('Quando arrivi al valore obiettivo, isola la pompa e registra inizio/fine del test di risalita per distinguere meglio umidità e perdita.');
  }

  if (data.refrigerant === 'R290') {
    notes.push('R290 è infiammabile: lavora solo con attrezzatura/procedure idonee A3, circuito privo di refrigerante e area adeguatamente ventilata.');
  }

  const progress = reduction > 0 ? `${Math.max(0, Math.min(100, reduction)).toFixed(0)}%` : '—';
  target.className = `vacuum-result ${level}`;
  target.innerHTML = `
    <div class="vacuum-summary">
      <div><span>Diagnosi</span><strong>${escapeHtml(tr(title))}</strong></div>
      <div><span>Micron attuali</span><strong>${Math.round(data.current_micron)}</strong></div>
      <div><span>Riduzione dal valore iniziale</span><strong>${progress}</strong></div>
      <div><span>Velocità media</span><strong>${slope > 0 ? `${Math.round(slope)} µm/min` : '—'}</strong></div>
    </div>
    <ol class="diagnostic-list">${notes.map(note => `<li>${escapeHtml(tr(note))}</li>`).join('')}</ol>
    <div class="procedure-box"><strong>Procedura consigliata</strong><p>Continua fino al valore previsto dal costruttore; per riferimento operativo, punta a ≤500 micron. Poi isola la pompa e osserva la risalita per 10–15 minuti. Se serve rompere il vuoto, isola la pompa, introduci azoto secco con riduttore e poi evacua nuovamente.</p></div>`;
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

async function saveProject() {
  try {
    const result = await api('projects', {method: 'POST', body: JSON.stringify(projectPayload())});
    currentProjectId = result.id; toast('Progetto salvato');
  } catch (error) { toast(error.message, true); }
}

async function showProjects() {
  try {
    const projects = await api('projects');
    $('#projects-list').innerHTML = projects.length ? projects.map(project => `<div class="project-item"><div><strong>${escapeHtml(project.name)}</strong><small>${new Date(project.updated_at).toLocaleString(window.AppI18n?.locale() || 'it-IT')}</small></div><button class="button secondary" data-open="${project.id}">Apri</button><button class="delete-room" data-remove="${project.id}">Elimina</button></div>`).join('') : '<p class="disclaimer">Nessun progetto salvato.</p>';
    if (!$('#projects-dialog').open) $('#projects-dialog').showModal();
  } catch (error) { toast(error.message, true); }
}

async function loadProject(id) {
  const project = await api(`projects/${id}`); const p = project.payload;
  currentProjectId = project.id; method = p.method || 'quick'; rooms = p.rooms || [defaults()];
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
  applyMethod(); renderRooms(); $('#projects-dialog').close(); toast('Progetto caricato');
}

function applyMethod() {
  $$('.method').forEach(button => button.classList.toggle('active', button.dataset.method === method));
  $('#climate-panel').classList.toggle('hidden', method === 'quick');
  $('#climate-panel').classList.toggle('guided-climate', method === 'guided');
}

function newProject() {
  currentProjectId = null; method = 'guided'; rooms = [defaults()];
  $('#project-name').value = 'Nuovo impianto'; $('#customer').value = ''; $('#location').value = '';
  $('#results').classList.add('hidden'); applyMethod(); renderRooms();
}

function toast(message, error = false) {
  const node = $('#toast'); node.textContent = window.AppI18n?.translate(message) || message; node.style.background = error ? 'var(--danger)' : 'var(--green)';
  node.classList.add('show'); setTimeout(() => node.classList.remove('show'), 6500);
}

$('#rooms').addEventListener('input', syncRoomInput);
$('#rooms').addEventListener('change', event => {
  const input = event.target.closest('[data-key]');
  if (!input) return;
  const room = rooms.find(r=>r.id===input.closest('.room-card').dataset.id);
  if (input.dataset.key === 'guided_window_count') {
    const count = Number(input.value);
    if (!Number.isInteger(count) || count < 0 || count > 30) { toast('Inserisci da 0 a 30 finestre.', true); return; }
    room.guided_windows ||= [];
    room.guided_windows.length = Math.min(count, room.guided_windows.length);
    while (room.guided_windows.length < count) room.guided_windows.push({width:'',height:'',glass:'unknown',orientation:'unknown',shade:'unknown',position:'wall'});
    renderRooms();
  } else if (input.dataset.key === 'guided_attic' || input.dataset.key.startsWith('guided_wall_') || (method === 'guided' && ['length','width'].includes(input.dataset.key))) renderRooms();
});
$('#rooms').addEventListener('click', event => {
  const button = event.target.closest('[data-delete]'); if (!button) return;
  if (rooms.length === 1) return toast('Deve rimanere almeno un locale', true);
  rooms = rooms.filter(room => room.id !== button.dataset.delete); renderRooms();
});
$$('.method').forEach(button => button.addEventListener('click', () => { method = button.dataset.method; applyMethod(); renderRooms(); }));
$('#add-room').addEventListener('click', () => { const room = defaults(); room.name = `Locale ${rooms.length + 1}`; rooms.push(room); renderRooms(); });
$('#calculate').addEventListener('click', calculate);
window.addEventListener('app-language-changed', () => {
  renderRooms();
  if (lastCalculationResult && !$('#results').classList.contains('hidden')) renderResults(lastCalculationResult);
  if (!$('#vacuum-result').classList.contains('hidden')) analyzeVacuum();
});
$('#save-project').addEventListener('click', saveProject);
$('#open-projects').addEventListener('click', showProjects);
$('#close-projects').addEventListener('click', () => $('#projects-dialog').close());
$('#new-project').addEventListener('click', newProject);
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

const GUIDED_LABELS = {
  guided_heat: ['Temperatura desiderata in inverno °C', 'Temperatura nella stanza quando riscaldi, non quella dell’aria in uscita.'],
  guided_cool: ['Temperatura desiderata in estate °C', 'Temperatura nella stanza quando raffreschi.'],
  guided_roof_area: ['Superficie delle falde sopra il locale m²', 'Somma delle superfici inclinate del tetto, lucernari compresi. Non coincide necessariamente con il pavimento.']
};
const boundaryOptions = [['unknown', 'Da scegliere'], ['outside', 'Esterno'], ['same', 'Stanza alla stessa temperatura'], ['unheated', 'Locale non riscaldato']];
function guidedSelect(key, label, value, options, help = '', attrs = '') {
  const id = `room-field-help-${++fieldHelpIndex}`;
  return `<label>${tr(label)}<select data-key="${key}" ${attrs} aria-describedby="${id}">${options.map(([v,t]) => `<option value="${v}" ${v === value ? 'selected' : ''}>${tr(t)}</option>`).join('')}</select><small class="field-help" id="${id}">${tr(help)}</small></label>`;
}
function guidedNumber(key, label, value, help, attrs = '') {
  const id = `room-field-help-${++fieldHelpIndex}`;
  return `<label>${tr(label)}<input data-key="${key}" type="number" value="${escapeHtml(value ?? '')}" ${attrs} aria-describedby="${id}"><small class="field-help" id="${id}">${tr(help)}</small></label>`;
}
function guidedFields(room) {
  const walls = room.guided_walls || ['unknown','unknown','unknown','unknown'];
  const windows = room.guided_windows || [];
  return `<section class="guided-section"><h3>${tr('1. Comfort e isolamento')}</h3><div class="grid four">
    ${Object.entries(GUIDED_LABELS).filter(([k])=>k!=='guided_roof_area').map(([k,[l,h]])=>guidedNumber(k,l,room[k],h,'step="0.5"')).join('')}
    ${guidedSelect('guided_insulation','Isolamento della casa',room.guided_insulation || 'unknown', [['unknown','Non so'],['good','Buono — cappotto e isolamento continuo'],['medium','Medio — isolamento parziale'],['poor','Scarso — senza isolamento']], 'Scegli lo stato effettivo. I valori tecnici vengono stimati e mostrati nel risultato.')}
  </div></section>
  <section class="guided-section"><h3>${tr('2. Pareti esterne e interne')}</h3>
    <p class="field-help">${tr('Per un locale rettangolare: A e C sono i lati della lunghezza; B e D quelli della larghezza. Indica cosa c’è oltre ogni parete. Le finestre saranno sottratte automaticamente.')}</p>
    <div class="grid four">${walls.map((v,i)=>guidedSelect(`guided_wall_${i}`,`${tr('Parete')} ${'ABCD'[i]} · ${i%2 ? room.width : room.length} m`,v,boundaryOptions)).join('')}</div>
    <p class="field-help guided-wall-count">${tr('Pareti esterne')}: ${walls.filter(x=>x==='outside').length} · ${tr('Pareti interne')}: ${walls.filter(x=>['same','unheated'].includes(x)).length} · ${tr('Da scegliere')}: ${walls.filter(x=>x==='unknown').length}</p>
  </section>
  <section class="guided-section"><h3>${tr('3. Mansarda, sopra e sotto')}</h3><div class="grid four">
    ${guidedSelect('guided_attic','La stanza è una mansarda?',room.guided_attic || 'unknown',[['unknown','Da scegliere'],['no','No'],['yes','Sì — direttamente sotto le falde del tetto']])}
    ${room.guided_attic==='yes' ? guidedNumber('guided_roof_area',... [GUIDED_LABELS.guided_roof_area[0],room.guided_roof_area,GUIDED_LABELS.guided_roof_area[1]],'min="0.1" step="0.1"') : guidedSelect('guided_above','Cosa c’è sopra?',room.guided_above || 'unknown',boundaryOptions,'Scegli “Esterno” se sopra c’è un tetto piano o un terrazzo.')}
    ${guidedSelect('guided_below','Cosa c’è sotto?',room.guided_below || 'unknown',[...boundaryOptions,['ground','Terreno']], 'Per cantina o garage non riscaldati scegli “Locale non riscaldato”.')}
  </div></section>
  <section class="guided-section"><h3>${tr('4. Finestre e vetri')}</h3>
    ${guidedNumber('guided_window_count','Quante finestre o portefinestre?', windows.length,'0 se assenti. Compila le misure di ciascuna finestra, telaio compreso.','min="0" max="30" step="1"')}
    ${windows.map((win,i)=>`<div class="guided-window"><h4>${tr('Finestra')} ${i+1}</h4><div class="grid four">
      ${guidedNumber('window_width','Larghezza cm',win.width,'',`data-window="${i}" min="1" step="1"`)}
      ${guidedNumber('window_height','Altezza cm',win.height,'',`data-window="${i}" min="1" step="1"`)}
      ${guidedSelect('window_glass','Tipo di vetro',win.glass,[['unknown','Non so'],['single','Singolo'],['double_old','Doppio — vecchio o tipo non noto'],['double_low','Doppio basso emissivo'],['triple','Triplo']], 'Due lastre non significano automaticamente vetro basso emissivo.',`data-window="${i}"`)}
      ${guidedSelect('window_orientation','Esposizione',win.orientation,EXPOSURE_OPTIONS.filter(o=>o.value!=='custom').map(o=>[o.value,o.label]),'',`data-window="${i}"`)}
      ${guidedSelect('window_shade','Protezione dal sole in estate',win.shade,[['unknown','Non so'],['none','Nessuna / protezione aperta'],['external','Tapparella o tenda esterna chiusa al sole']], 'Se la protezione resta aperta, scegli “Nessuna / protezione aperta”.',`data-window="${i}"`)}
      ${guidedSelect('window_position','Posizione finestra',win.position || 'wall',[['wall','Sulla parete esterna'],['roof','Lucernario sul tetto']], '',`data-window="${i}"`)}
    </div></div>`).join('')}
  </section>
  <section class="guided-section"><h3>${tr('5. Persone e apparecchi accesi')}</h3><div class="grid four">
    ${field('people','Persone',room.people,'min="0"')}${field('lighting_w','Illuminazione W',room.lighting_w,'min="0"')}${field('equipment_w','Apparecchiature W',room.equipment_w,'min="0"')}
  </div></section>`;
}
function syncGuidedInput(input, room) {
  const key = input.dataset.key;
  if (key.startsWith('guided_wall_')) {
    room.guided_walls ||= ['unknown','unknown','unknown','unknown'];
    room.guided_walls[Number(key.slice(-1))] = input.value;
    return true;
  }
  if (input.dataset.window !== undefined) {
    const win = room.guided_windows[Number(input.dataset.window)];
    win[key.replace('window_','')] = input.type === 'number' ? (input.value === '' ? '' : Number(input.value)) : input.value;
    return true;
  }
  if (key === 'guided_window_count') return true; // resize on change, preserving focus while typing
  return false;
}
function guidedResultDetails(result) {
  return result.rooms.filter(room=>room.guided_details).map(room=>`<section class="guided-result"><h3>${escapeHtml(room.name)}</h3>
    <p class="field-help">${tr('Risultato indicativo basato sui dati inseriti e sulle seguenti ipotesi:')}</p>
    <ul>${room.guided_notes.map(note=>`<li>${escapeHtml(tr(note))}</li>`).join('')}</ul>
    <details class="sizing-advanced"><summary>${tr('Mostra dati e coefficienti usati')}</summary>
    <dl>${Object.entries(room.guided_details).map(([label,value])=>`<div><dt>${tr(label)}</dt><dd>${value}</dd></div>`).join('')}</dl></details>
  </section>`).join('');
}

newProject();
showAppPage(getAppRoute().page, false);

// Free the mobile viewport while editing; restore controls after focus or keyboard closes.
(() => {
  const mobile = () => matchMedia('(max-width: 900px)').matches && matchMedia('(pointer: coarse)').matches;
  const editable = node => node?.matches('input:not([readonly]):not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), textarea');
  let keyboardOpen = false;
  document.addEventListener('focusin', event => {
    if (mobile() && editable(event.target)) {
      document.body.classList.add('editing-mobile');
      setTimeout(() => { if (document.activeElement === event.target) event.target.scrollIntoView({block:'center', behavior:'smooth'}); }, 250);
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
