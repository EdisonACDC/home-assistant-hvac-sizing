let cylinderItems = [];
let activeCylinder = null;
const ctr = value => window.AppI18n?.translate(value) || value;

const kg = value => `${Number(value || 0).toLocaleString(window.AppI18n?.locale() || 'it-IT', {minimumFractionDigits: 3, maximumFractionDigits: 3})} kg`;

function decimalText(value) {
  let normalized = String(value ?? '').trim().replace(/[\s\u00a0]/g, '');
  if (normalized.includes(',') && normalized.includes('.')) {
    normalized = normalized.lastIndexOf(',') > normalized.lastIndexOf('.')
      ? normalized.replaceAll('.', '').replace(',', '.')
      : normalized.replaceAll(',', '');
  } else {
    normalized = normalized.replace(',', '.');
  }
  return normalized;
}

function cylinderNumber(value) {
  const parsed = Number(decimalText(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formError(selector, message = '') {
  const node = $(selector);
  node.textContent = ctr(message);
  node.classList.toggle('hidden', !message);
}

function cylinderPdfUrl(id = null, download = false) {
  const path = id ? `api/cylinders/${encodeURIComponent(id)}/pdf` : 'api/cylinders/pdf';
  const parameters = new URLSearchParams();
  parameters.set('lang', window.AppI18n?.getLanguage() || 'it');
  if (download) parameters.set('download', '1');
  return `${path}?${parameters}`;
}

function openPdfForPrint(url) {
  const opened = window.open(url, '_blank', 'noopener');
  if (!opened) toast('Il browser ha bloccato la scheda PDF. Consenti i popup e riprova.', true);
}

async function loadCylinders(openFromQr = false) {
  try {
    cylinderItems = await api('cylinders');
    renderCylinders();
    const cylinderId = window.getAppRoute?.().cylinderId || '';
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
  $('#download-all-cylinders-pdf').href = cylinderPdfUrl(null, true);
  $('#download-all-cylinders-pdf').download = 'magazzino-bombole.pdf';
}

function updateNewCylinderPreview() {
  const tare = cylinderNumber($('#new-cylinder-tare').value);
  const total = cylinderNumber($('#new-cylinder-total').value);
  const net = Math.max(0, total - tare);
  $('#new-cylinder-net').textContent = kg(net);
}

async function createCylinder(event) {
  event.preventDefault();
  formError('#new-cylinder-error');
  const form = new FormData(event.currentTarget);
  const payload = Object.fromEntries(form.entries());
  ['tare_kg', 'total_weight_kg', 'capacity_kg'].forEach(key => { payload[key] = decimalText(payload[key]); });
  try {
    const created = await api('cylinders', {method: 'POST', body: JSON.stringify(payload)});
    event.currentTarget.reset();
    updateNewCylinderPreview();
    $('#new-cylinder-dialog').close();
    await loadCylinders();
    toast('Bombola registrata e QR creato');
    await openCylinder(created.id);
  } catch (error) {
    formError('#new-cylinder-error', error.message);
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
    const qrUrl = `api/cylinders/${encodeURIComponent(id)}/qr?lang=${window.AppI18n?.getLanguage() || 'it'}&v=${Date.now()}`;
    formError('#cylinder-qr-error');
    $('#cylinder-qr').src = qrUrl;
    $('#download-cylinder-qr').href = qrUrl;
    $('#download-cylinder-qr').download = `bombola-${activeCylinder.code}.svg`;
    $('#download-cylinder-pdf').href = cylinderPdfUrl(id, true);
    $('#download-cylinder-pdf').download = `scheda-bombola-${activeCylinder.code}.pdf`;
    $('.qr-card h3').textContent = `${activeCylinder.code} · ${activeCylinder.refrigerant}`;
    if (updateUrl) window.updateAppRoute?.('cylinders', id);
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
    const date = new Date(item.created_at).toLocaleString(window.AppI18n?.locale() || 'it-IT', {dateStyle: 'short', timeStyle: 'short'});
    const detail = item.operation === 'weighing'
      ? `${ctr('Peso totale')} ${kg(item.total_weight_kg)}`
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
  let explanation = `${ctr('Residuo attuale')}: <strong>${kg(after)}</strong>`;
  if (operation === 'weighing') {
    const total = cylinderNumber($('#operation-total').value);
    if (total) {
      after = Math.max(0, total - Number(activeCylinder.tare_kg));
      explanation = `${kg(total)} − ${ctr('tara')} ${kg(activeCylinder.tare_kg)} = <strong>${kg(after)} ${ctr('di gas')}</strong>`;
    }
  } else {
    const amount = cylinderNumber($('#operation-amount').value);
    after = operation === 'add' ? after + amount : after - amount;
    explanation = `${ctr('Nuovo residuo previsto')}: <strong>${kg(after)}</strong>`;
  }
  $('#operation-preview').innerHTML = explanation;
}

async function saveCylinderOperation(event) {
  event.preventDefault();
  formError('#cylinder-operation-error');
  const form = new FormData(event.currentTarget);
  const payload = Object.fromEntries(form.entries());
  ['total_weight_kg', 'amount_kg'].forEach(key => {
    if (key in payload) payload[key] = decimalText(payload[key]);
  });
  try {
    await api(`cylinders/${activeCylinder.id}/transactions`, {method: 'POST', body: JSON.stringify(payload)});
    event.currentTarget.reset();
    $('#cylinder-operation').value = 'weighing';
    setOperationFields();
    await loadCylinders();
    await openCylinder(activeCylinder.id, false);
    toast('Movimento registrato');
  } catch (error) {
    formError('#cylinder-operation-error', error.message);
    toast(error.message, true);
  }
}

function closeCylinderDialog() {
  $('#cylinder-dialog').close();
  activeCylinder = null;
  window.updateAppRoute?.('cylinders');
}

async function deleteActiveCylinder() {
  const question = window.AppI18n?.getLanguage() === 'de'
    ? `Flasche ${activeCylinder?.code || ''} und den gesamten Verlauf löschen?`
    : `Eliminare la bombola ${activeCylinder?.code || ''} e tutto lo storico?`;
  if (!activeCylinder || !confirm(question)) return;
  try {
    await api(`cylinders/${activeCylinder.id}`, {method: 'DELETE'});
    closeCylinderDialog();
    await loadCylinders();
    toast('Bombola eliminata');
  } catch (error) {
    toast(error.message, true);
  }
}

async function rotateActiveCylinderQr() {
  if (!activeCylinder) return;
  const question = window.AppI18n?.getLanguage() === 'de'
    ? 'Den bisherigen QR-Code widerrufen und einen neuen erstellen? Der alte Ausdruck funktioniert danach nicht mehr.'
    : 'Revocare il QR attuale e crearne uno nuovo? La vecchia stampa non funzionerà più.';
  if (!confirm(question)) return;
  try {
    await api(`cylinders/${activeCylinder.id}/rotate-qr`, {method: 'POST', body: '{}'});
    await openCylinder(activeCylinder.id, false);
    toast('Accesso QR rigenerato. Ristampa il nuovo codice.');
  } catch (error) { toast(error.message, true); }
}

$('#new-cylinder').addEventListener('click', () => {
  formError('#new-cylinder-error');
  $('#new-cylinder-dialog').showModal();
});
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
$('#rotate-cylinder-qr').addEventListener('click', rotateActiveCylinderQr);
$('#cylinder-qr').addEventListener('load', () => formError('#cylinder-qr-error'));
$('#cylinder-qr').addEventListener('error', () => formError('#cylinder-qr-error', 'Impossibile generare il QR. Chiudi e riapri la scheda oppure riavvia l’add-on.'));
$('#download-all-cylinders-pdf').addEventListener('click', event => {
  if (!cylinderItems.length) {
    event.preventDefault();
    toast('Registra almeno una bombola prima di creare il PDF', true);
  }
});
$('#print-all-cylinders').addEventListener('click', () => {
  if (!cylinderItems.length) return toast('Registra almeno una bombola prima di stampare', true);
  openPdfForPrint(cylinderPdfUrl());
});
$('#print-cylinder-sheet').addEventListener('click', () => {
  if (activeCylinder) openPdfForPrint(cylinderPdfUrl(activeCylinder.id));
});
$('#print-cylinder-qr').addEventListener('click', () => {
  document.body.classList.add('qr-printing');
  window.print();
  document.body.classList.remove('qr-printing');
});

loadCylinders(true);
window.addEventListener('app-language-changed', () => {
  renderCylinders();
  if (activeCylinder) {
    renderCylinderDetail();
    $('#download-cylinder-pdf').href = cylinderPdfUrl(activeCylinder.id, true);
    const qrUrl = `api/cylinders/${encodeURIComponent(activeCylinder.id)}/qr?lang=${window.AppI18n?.getLanguage() || 'it'}&v=${Date.now()}`;
    $('#cylinder-qr').src = qrUrl;
    $('#download-cylinder-qr').href = qrUrl;
  }
});
