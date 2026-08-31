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

function projectPayload() {
  return {
    id: currentProjectId,
    project_name: $('#project-name').value.trim() || 'Nuovo progetto',
    customer: $('#customer').value.trim(), location: $('#location').value.trim(), method,
    climate: {
      summer_outdoor_c: n($('#summer-outdoor').value), summer_outdoor_rh: n($('#summer-rh-out').value),
      summer_indoor_c: n($('#summer-indoor').value), summer_indoor_rh: n($('#summer-rh-in').value),
      winter_outdoor_c: n($('#winter-outdoor').value), winter_indoor_c: n($('#winter-indoor').value), heating_factor: 1
    }, rooms
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
$('#projects-list').addEventListener('click', async event => {
  const open = event.target.closest('[data-open]'); const remove = event.target.closest('[data-remove]');
  try { if (open) await loadProject(open.dataset.open); if (remove) { await api(`projects/${remove.dataset.remove}`, {method: 'DELETE'}); await showProjects(); } }
  catch (error) { toast(error.message, true); }
});

newProject();
