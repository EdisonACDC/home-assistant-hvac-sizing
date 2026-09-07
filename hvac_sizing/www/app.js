const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const n = value => Number(value || 0);

let method = 'quick';
let currentProjectId = null;
let rooms = [];

const defaults = () => ({
  id: crypto.randomUUID(), name: 'Locale 1', length: 5, width: 4, height: 2.7,
  people: 2, lighting_w: 150, equipment_w: 100, margin_percent: 10,
  quick_w_m3_cooling: 35, quick_w_m3_heating: 40, quick_insulation_factor: 1,
  quick_exposure_factor: 1, quick_glazing_factor: 1,
  wall_area: 24, wall_u: 0.7, window_area: 4, window_u: 1.4,
  roof_area: 0, roof_u: 0.25, floor_area: 0, floor_u: 0.35,
  solar_irradiance_w_m2: 450, window_g_value: 0.55, shading_factor: 0.7,
  infiltration_ach: 0.5, ventilation_m3h: 0, occupancy_factor: 1,
  person_sensible_w: 75, person_latent_w: 55, lighting_factor: 1, equipment_factor: 1
});

function field(key, label, value, extra = '') {
  return `<label>${label}<input data-key="${key}" type="number" value="${value}" ${extra}></label>`;
}

function renderRooms() {
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
          ${field('height', 'Altezza m', room.height, 'step="0.01"')}
          ${field('margin_percent', 'Margine %', room.margin_percent, 'min="0" max="50"')}
        </div>
        ${method === 'quick' ? quickFields(room) : professionalFields(room)}
      </div>
    </article>`).join('');
  $('#room-count').textContent = `${rooms.length} ${rooms.length === 1 ? 'locale' : 'locali'}`;
}

function quickFields(room) {
  return `<p class="subheading">Coefficienti rapidi</p><div class="grid four">
    ${field('quick_w_m3_cooling', 'Base raffrescamento W/m³', room.quick_w_m3_cooling)}
    ${field('quick_w_m3_heating', 'Base riscaldamento W/m³', room.quick_w_m3_heating)}
    ${field('quick_insulation_factor', 'Fattore isolamento', room.quick_insulation_factor, 'step="0.05"')}
    ${field('quick_exposure_factor', 'Fattore esposizione', room.quick_exposure_factor, 'step="0.05"')}
    ${field('quick_glazing_factor', 'Fattore vetrate', room.quick_glazing_factor, 'step="0.05"')}
    ${field('people', 'Persone', room.people)}
    ${field('lighting_w', 'Illuminazione W', room.lighting_w)}
    ${field('equipment_w', 'Apparecchiature W', room.equipment_w)}
  </div>`;
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
  room[input.dataset.key] = input.type === 'number' ? n(input.value) : input.value;
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
    climate: {
      summer_outdoor_c: n($('#summer-outdoor').value), summer_outdoor_rh: n($('#summer-rh-out').value),
      summer_indoor_c: n($('#summer-indoor').value), summer_indoor_rh: n($('#summer-rh-in').value),
      winter_outdoor_c: n($('#winter-outdoor').value), winter_indoor_c: n($('#winter-indoor').value), heating_factor: 1
    },
    commissioning: commissioningPayload(),
    rooms
  };
}

async function api(path, options = {}) {
  const response = await fetch(`api/${path}`, {headers: {'Content-Type': 'application/json'}, ...options});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Operazione non riuscita');
  return data;
}

async function calculate() {
  try {
    const result = await api('calculate', {method: 'POST', body: JSON.stringify(projectPayload())});
    renderResults(result);
    $('#results').scrollIntoView({behavior: 'smooth', block: 'start'});
  } catch (error) { toast(error.message, true); }
}

function renderResults(result) {
  const target = $('#results');
  target.classList.remove('hidden');
  target.innerHTML = `
    <div class="section-title"><div><p class="eyebrow">RISULTATO ${result.method.toUpperCase()}</p><h2>${escapeHtml(result.project_name)}</h2></div></div>
    <div class="totals">
      <div class="metric"><span>Superficie totale</span><strong>${result.totals.area_m2} m²</strong></div>
      <div class="metric"><span>Volume totale</span><strong>${result.totals.volume_m3} m³</strong></div>
      <div class="metric cool"><span>Potenza frigorifera</span><strong>${result.totals.cooling_kw} kW</strong></div>
      <div class="metric heat"><span>Potenza riscaldamento</span><strong>${result.totals.heating_kw} kW</strong></div>
    </div>
    <div class="result-scroll"><table class="result-table"><thead><tr><th>Locale</th><th>m²</th><th>Sensibile</th><th>Latente</th><th>Freddo totale</th><th>Caldo</th><th>SHR</th></tr></thead><tbody>
      ${result.rooms.map(room => `<tr><td><strong>${escapeHtml(room.name)}</strong></td><td>${room.area_m2}</td><td>${room.sensible_cooling_w} W</td><td>${room.latent_cooling_w} W</td><td><strong>${room.total_cooling_kw} kW</strong></td><td><strong>${room.heating_kw} kW</strong></td><td>${room.shr}</td></tr>`).join('')}
    </tbody></table></div><p class="disclaimer">${escapeHtml(result.disclaimer)}</p>`;
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
      <div><span>Diagnosi</span><strong>${escapeHtml(title)}</strong></div>
      <div><span>Micron attuali</span><strong>${Math.round(data.current_micron)}</strong></div>
      <div><span>Riduzione dal valore iniziale</span><strong>${progress}</strong></div>
      <div><span>Velocità media</span><strong>${slope > 0 ? `${Math.round(slope)} µm/min` : '—'}</strong></div>
    </div>
    <ol class="diagnostic-list">${notes.map(note => `<li>${escapeHtml(note)}</li>`).join('')}</ol>
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
    $('#projects-list').innerHTML = projects.length ? projects.map(project => `<div class="project-item"><div><strong>${escapeHtml(project.name)}</strong><small>${new Date(project.updated_at).toLocaleString('it-IT')}</small></div><button class="button secondary" data-open="${project.id}">Apri</button><button class="delete-room" data-remove="${project.id}">Elimina</button></div>`).join('') : '<p class="disclaimer">Nessun progetto salvato.</p>';
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
  $('#climate-panel').classList.toggle('hidden', method !== 'professional');
}

function newProject() {
  currentProjectId = null; method = 'quick'; rooms = [defaults()];
  $('#project-name').value = 'Nuovo impianto'; $('#customer').value = ''; $('#location').value = '';
  $('#results').classList.add('hidden'); applyMethod(); renderRooms();
}

function toast(message, error = false) {
  const node = $('#toast'); node.textContent = message; node.style.background = error ? 'var(--danger)' : 'var(--green)';
  node.classList.add('show'); setTimeout(() => node.classList.remove('show'), 2600);
}

$('#rooms').addEventListener('input', syncRoomInput);
$('#rooms').addEventListener('click', event => {
  const button = event.target.closest('[data-delete]'); if (!button) return;
  if (rooms.length === 1) return toast('Deve rimanere almeno un locale', true);
  rooms = rooms.filter(room => room.id !== button.dataset.delete); renderRooms();
});
$$('.method').forEach(button => button.addEventListener('click', () => { method = button.dataset.method; applyMethod(); renderRooms(); }));
$('#add-room').addEventListener('click', () => { const room = defaults(); room.name = `Locale ${rooms.length + 1}`; rooms.push(room); renderRooms(); });
$('#calculate').addEventListener('click', calculate);
$('#save-project').addEventListener('click', saveProject);
$('#open-projects').addEventListener('click', showProjects);
$('#close-projects').addEventListener('click', () => $('#projects-dialog').close());
$('#new-project').addEventListener('click', newProject);
$('#go-commissioning').addEventListener('click', () => $('#commissioning').scrollIntoView({behavior: 'smooth', block: 'start'}));
$('#analyze-vacuum').addEventListener('click', analyzeVacuum);
$('#reset-vacuum').addEventListener('click', resetVacuum);
$('#projects-list').addEventListener('click', async event => {
  const open = event.target.closest('[data-open]'); const remove = event.target.closest('[data-remove]');
  try { if (open) await loadProject(open.dataset.open); if (remove) { await api(`projects/${remove.dataset.remove}`, {method: 'DELETE'}); await showProjects(); } }
  catch (error) { toast(error.message, true); }
});

newProject();
