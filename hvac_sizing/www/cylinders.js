let cylinderItems = [];
let activeCylinder = null;

const kg = value => `${Number(value || 0).toLocaleString('it-IT', {minimumFractionDigits: 3, maximumFractionDigits: 3})} kg`;

function cylinderLink(id) {
  const url = new URL(window.location.href);
  url.hash = '';
  url.searchParams.set('bombola', id);
  return url;
}

async function loadCylinders(openFromQr = false) {
  try {
    cylinderItems = await api('cylinders');
    renderCylinders();
    const cylinderId = new URL(window.location.href).searchParams.get('bombola');
    if (openFromQr && cylinderId) await openCylinder(cylinderId, false);
  } catch (error) {
    toast(error.message, true);
  }
}

function renderCylinders() {
  const search = ($('#cylinder-search').value || '').trim().toLowerCase();
  const visible = cylinderItems.filter(item => `${item.name} ${item.code} ${item.refrigerant}`.toLowerCase().includes(search));
  const totals = cylinderItems.reduce((result, item) => {
    result[item.refrigerant] = (result[item.refrigerant] || 0) + Number(item.current_gas_kg);
    return result;
  }, {});
  $('#cylinder-summary').innerHTML = cylinderItems.length
    ? `<div class="summary-chip"><span>Bombole registrate</span><strong>${cylinderItems.length}</strong></div>${Object.entries(totals).sort().map(([gas, total]) => `<div class="summary-chip"><span>Totale ${escapeHtml(gas)}</span><strong>${kg(total)}</strong></div>`).join('')}`
    : '';
  $('#cylinders-list').innerHTML = visible.length ? visible.map(item => `
    <button class="cylinder-card" type="button" data-cylinder="${item.id}">
      <span class="cylinder-card-head"><span><span class="cylinder-code">${escapeHtml(item.code)}</span><strong>${escapeHtml(item.name)}</strong></span><span class="refrigerant-pill">${escapeHtml(item.refrigerant)}</span></span>
      <span class="cylinder-balance">${kg(item.current_gas_kg)}</span>
      <small>Peso totale stimato ${kg(item.total_weight_kg)} · Tara ${kg(item.tare_kg)}</small>
    </button>`).join('') : `<div class="empty-state">${cylinderItems.length ? 'Nessuna bombola corrisponde alla ricerca.' : 'Nessuna bombola registrata. Premi “Nuova bombola” per iniziare.'}</div>`;
}

function updateNewCylinderPreview() {
  const tare = n($('#new-cylinder-tare').value);
  const total = n($('#new-cylinder-total').value);
  const net = Math.max(0, total - tare);
  $('#new-cylinder-net').textContent = kg(net);
}

async function createCylinder(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const payload = Object.fromEntries(form.entries());
  try {
    const created = await api('cylinders', {method: 'POST', body: JSON.stringify(payload)});
    event.currentTarget.reset();
    updateNewCylinderPreview();
    $('#new-cylinder-dialog').close();
    await loadCylinders();
    toast('Bombola registrata e QR creato');
    await openCylinder(created.id);
  } catch (error) {
    toast(error.message, true);
  }
}

async function openCylinder(id, updateUrl = true) {
  try {
    activeCylinder = await api(`cylinders/${id}`);
    $('#cylinder-detail-code').textContent = `${activeCylinder.code} · ${activeCylinder.refrigerant}`;
    $('#cylinder-detail-name').textContent = activeCylinder.name;
    renderCylinderDetail();
    setOperationFields();
    const directUrl = cylinderLink(id);
    const qrUrl = `api/cylinders/${encodeURIComponent(id)}/qr?url=${encodeURIComponent(directUrl.href)}`;
    $('#cylinder-qr').src = qrUrl;
    $('#download-cylinder-qr').href = qrUrl;
    $('#download-cylinder-qr').download = `bombola-${activeCylinder.code}.svg`;
    $('.qr-card h3').textContent = `${activeCylinder.code} · ${activeCylinder.refrigerant}`;
    if (updateUrl) history.replaceState({}, '', directUrl);
    if (!$('#cylinder-dialog').open) $('#cylinder-dialog').showModal();
  } catch (error) {
    toast(error.message, true);
  }
}

function renderCylinderDetail() {
  $('#cylinder-detail-metrics').innerHTML = `
    <div class="metric cool"><span>Gas residuo effettivo</span><strong>${kg(activeCylinder.current_gas_kg)}</strong></div>
    <div class="metric"><span>Peso totale calcolato</span><strong>${kg(activeCylinder.total_weight_kg)}</strong></div>
    <div class="metric"><span>Tara bombola</span><strong>${kg(activeCylinder.tare_kg)}</strong></div>
    <div class="metric"><span>Capacità gas</span><strong>${activeCylinder.capacity_kg == null ? '—' : kg(activeCylinder.capacity_kg)}</strong></div>`;

  const names = {initial: 'Registrazione iniziale', weighing: 'Pesatura', add: 'Aggiunta', remove: 'Prelievo'};
  $('#cylinder-history').innerHTML = activeCylinder.history.length ? activeCylinder.history.map(item => {
    const date = new Date(item.created_at).toLocaleString('it-IT', {dateStyle: 'short', timeStyle: 'short'});
    const detail = item.operation === 'weighing'
      ? `Peso totale ${kg(item.total_weight_kg)}`
      : `${item.operation === 'remove' ? '−' : '+'}${kg(Math.abs(item.amount_kg || 0))}`;
    return `<div class="history-row"><time>${escapeHtml(date)}</time><div><strong>${escapeHtml(names[item.operation] || item.operation)}</strong><small>${escapeHtml(detail)}${item.notes ? ` · ${escapeHtml(item.notes)}` : ''}</small></div><div class="history-value"><strong>${kg(item.gas_after_kg)}</strong><small>residuo</small></div></div>`;
  }).join('') : '<div class="empty-state">Nessun movimento registrato.</div>';
  updateOperationPreview();
}

function setOperationFields() {
  const weighing = $('#cylinder-operation').value === 'weighing';
  $('#weighing-field').classList.toggle('hidden', !weighing);
  $('#amount-field').classList.toggle('hidden', weighing);
  $('#operation-total').required = weighing;
  $('#operation-amount').required = !weighing;
  updateOperationPreview();
}

function updateOperationPreview() {
  if (!activeCylinder) return;
  const operation = $('#cylinder-operation').value;
  let after = Number(activeCylinder.current_gas_kg);
  let explanation = `Residuo attuale: <strong>${kg(after)}</strong>`;
  if (operation === 'weighing') {
    const total = n($('#operation-total').value);
    if (total) {
      after = Math.max(0, total - Number(activeCylinder.tare_kg));
      explanation = `${kg(total)} − tara ${kg(activeCylinder.tare_kg)} = <strong>${kg(after)} di gas</strong>`;
    }
  } else {
    const amount = n($('#operation-amount').value);
    after = operation === 'add' ? after + amount : after - amount;
    explanation = `Nuovo residuo previsto: <strong>${kg(after)}</strong>`;
  }
  $('#operation-preview').innerHTML = explanation;
}

async function saveCylinderOperation(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const payload = Object.fromEntries(form.entries());
  try {
    await api(`cylinders/${activeCylinder.id}/transactions`, {method: 'POST', body: JSON.stringify(payload)});
    event.currentTarget.reset();
    $('#cylinder-operation').value = 'weighing';
    setOperationFields();
    await loadCylinders();
    await openCylinder(activeCylinder.id, false);
    toast('Movimento registrato');
  } catch (error) {
    toast(error.message, true);
  }
}

function closeCylinderDialog() {
  $('#cylinder-dialog').close();
  activeCylinder = null;
  const url = new URL(window.location.href);
  url.searchParams.delete('bombola');
  history.replaceState({}, '', url);
}

async function deleteActiveCylinder() {
  if (!activeCylinder || !confirm(`Eliminare la bombola ${activeCylinder.code} e tutto lo storico?`)) return;
  try {
    await api(`cylinders/${activeCylinder.id}`, {method: 'DELETE'});
    closeCylinderDialog();
    await loadCylinders();
    toast('Bombola eliminata');
  } catch (error) {
    toast(error.message, true);
  }
}

$('#go-cylinders').addEventListener('click', () => $('#cylinders').scrollIntoView({behavior: 'smooth', block: 'start'}));
$('#new-cylinder').addEventListener('click', () => $('#new-cylinder-dialog').showModal());
$('#close-new-cylinder').addEventListener('click', () => $('#new-cylinder-dialog').close());
$('#close-cylinder').addEventListener('click', closeCylinderDialog);
$('#cylinder-dialog').addEventListener('cancel', event => {
  event.preventDefault();
  closeCylinderDialog();
});
$('#new-cylinder-form').addEventListener('submit', createCylinder);
$('#new-cylinder-tare').addEventListener('input', updateNewCylinderPreview);
$('#new-cylinder-total').addEventListener('input', updateNewCylinderPreview);
$('#cylinder-search').addEventListener('input', renderCylinders);
$('#cylinders-list').addEventListener('click', event => {
  const card = event.target.closest('[data-cylinder]');
  if (card) openCylinder(card.dataset.cylinder);
});
$('#cylinder-operation').addEventListener('change', setOperationFields);
$('#operation-total').addEventListener('input', updateOperationPreview);
$('#operation-amount').addEventListener('input', updateOperationPreview);
$('#cylinder-operation-form').addEventListener('submit', saveCylinderOperation);
$('#delete-cylinder').addEventListener('click', deleteActiveCylinder);
$('#print-cylinder-qr').addEventListener('click', () => {
  document.body.classList.add('qr-printing');
  window.print();
  document.body.classList.remove('qr-printing');
});

loadCylinders(true);
