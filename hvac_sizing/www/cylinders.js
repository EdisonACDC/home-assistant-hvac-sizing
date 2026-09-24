let cylinderItems = [];
let activeCylinder = null;
let activeTransaction = null;
let operatorItems = [];
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
  const gas = cylinderNumber($('#new-cylinder-gas').value);
  const total = Math.max(0, tare + gas);
  const formatted = total.toLocaleString(window.AppI18n?.locale() || 'it-IT', {minimumFractionDigits: 3, maximumFractionDigits: 3});
  $('#new-cylinder-total').value = ($('#new-cylinder-tare').value || $('#new-cylinder-gas').value) ? formatted : '';
  $('#new-cylinder-net').textContent = kg(total);
}

async function createCylinder(event) {
  event.preventDefault();
  const formElement = event.currentTarget;
  formError('#new-cylinder-error');
  const submitButton = formElement.querySelector('[type="submit"]');
  if (submitButton?.disabled) return;
  if (submitButton) submitButton.disabled = true;
  const form = new FormData(formElement);
  const payload = Object.fromEntries(form.entries());
  ['tare_kg', 'current_gas_kg', 'total_weight_kg', 'capacity_kg'].forEach(key => { payload[key] = decimalText(payload[key]); });
  try {
    const created = await api('cylinders', {method: 'POST', body: JSON.stringify(payload)});
    formElement.reset();
    updateNewCylinderPreview();
    $('#new-cylinder-dialog').close();
    await loadCylinders();
    toast('Bombola registrata e QR creato');
    await openCylinder(created.id);
  } catch (error) {
    formError('#new-cylinder-error', error.message);
    toast(error.message, true);
  } finally {
    if (submitButton) submitButton.disabled = false;
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
    const edited = item.edited_at ? ` · ${ctr('Corretto dall’amministratore')}` : '';
    return `<div class="history-row" data-transaction="${escapeHtml(item.id)}"><time>${escapeHtml(date)}</time><div><strong>${escapeHtml(names[item.operation] || item.operation)}</strong><small>${escapeHtml(detail)}${item.notes ? ` · ${escapeHtml(item.notes)}` : ''}${item.operator_name ? ` · ${escapeHtml(item.operator_name)}` : ''}${escapeHtml(edited)}</small></div><div class="history-side"><div class="history-value"><strong>${kg(item.gas_after_kg)}</strong><small>residuo</small></div><button class="button ghost history-edit" type="button" data-edit-transaction="${escapeHtml(item.id)}">Modifica</button></div></div>`;
  }).join('') : '<div class="empty-state">Nessun movimento registrato.</div>';
  updateOperationPreview();
}

function transactionInputValue(value) {
  if (value == null || value === '') return '';
  return Number(value).toLocaleString(window.AppI18n?.locale() || 'it-IT', {minimumFractionDigits: 3, maximumFractionDigits: 3});
}

function setEditTransactionFields() {
  const operation = $('#edit-transaction-operation').value;
  const weighing = operation === 'weighing';
  const initial = operation === 'initial';
  $('#edit-transaction-total-field').classList.toggle('hidden', !weighing);
  $('#edit-transaction-amount-field').classList.toggle('hidden', weighing);
  $('#edit-transaction-total').required = weighing;
  $('#edit-transaction-amount').required = !weighing;
  $('#edit-transaction-amount-label').textContent = ctr(initial ? 'Gas refrigerante iniziale kg' : 'Quantità refrigerante kg');
}

function openTransactionEditor(transactionId) {
  if (!activeCylinder) return;
  activeTransaction = activeCylinder.history.find(item => item.id === transactionId) || null;
  if (!activeTransaction) return;
  const initial = activeTransaction.operation === 'initial';
  const operation = $('#edit-transaction-operation');
  operation.value = activeTransaction.operation;
  operation.disabled = initial;
  $('#edit-transaction-total').value = activeTransaction.operation === 'weighing' ? transactionInputValue(activeTransaction.total_weight_kg) : '';
  $('#edit-transaction-amount').value = initial
    ? transactionInputValue(activeTransaction.gas_after_kg)
    : transactionInputValue(activeTransaction.amount_kg);
  $('#edit-transaction-notes').value = activeTransaction.notes || '';
  $('#edit-transaction-password').value = '';
  const date = new Date(activeTransaction.created_at).toLocaleString(window.AppI18n?.locale() || 'it-IT', {dateStyle: 'short', timeStyle: 'short'});
  $('#edit-transaction-meta').textContent = `${date} · ${activeTransaction.operator_name || ctr('Amministratore')}`;
  formError('#edit-transaction-error');
  setEditTransactionFields();
  $('#edit-transaction-dialog').showModal();
}

function closeTransactionEditor() {
  $('#edit-transaction-password').value = '';
  $('#edit-transaction-dialog').close();
  activeTransaction = null;
}

async function saveTransactionEdit(event) {
  event.preventDefault();
  if (!activeCylinder || !activeTransaction) return;
  const formElement = event.currentTarget;
  const submitButton = formElement.querySelector('[type="submit"]');
  if (submitButton?.disabled) return;
  if (submitButton) submitButton.disabled = true;
  formError('#edit-transaction-error');
  const payload = {
    operation: activeTransaction.operation === 'initial' ? 'initial' : $('#edit-transaction-operation').value,
    total_weight_kg: decimalText($('#edit-transaction-total').value),
    amount_kg: decimalText($('#edit-transaction-amount').value),
    notes: $('#edit-transaction-notes').value,
    admin_password: $('#edit-transaction-password').value,
  };
  const cylinderId = activeCylinder.id;
  try {
    await api(`cylinders/${cylinderId}/transactions/${activeTransaction.id}`, {method: 'PUT', body: JSON.stringify(payload)});
    closeTransactionEditor();
    await loadCylinders();
    await openCylinder(cylinderId, false);
    toast('Movimento modificato e residui ricalcolati');
  } catch (error) {
    $('#edit-transaction-password').value = '';
    $('#edit-transaction-password').focus();
    formError('#edit-transaction-error', error.message);
    toast(error.message, true);
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
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
  const formElement = event.currentTarget;
  formError('#cylinder-operation-error');
  const submitButton = formElement.querySelector('[type="submit"]');
  if (submitButton?.disabled) return;
  if (submitButton) submitButton.disabled = true;
  const form = new FormData(formElement);
  const payload = Object.fromEntries(form.entries());
  ['total_weight_kg', 'amount_kg'].forEach(key => {
    if (key in payload) payload[key] = decimalText(payload[key]);
  });
  try {
    await api(`cylinders/${activeCylinder.id}/transactions`, {method: 'POST', body: JSON.stringify(payload)});
    formElement.reset();
    $('#cylinder-operation').value = 'weighing';
    setOperationFields();
    await loadCylinders();
    await openCylinder(activeCylinder.id, false);
    toast('Movimento registrato');
  } catch (error) {
    formError('#cylinder-operation-error', error.message);
    toast(error.message, true);
  } finally {
    if (submitButton) submitButton.disabled = false;
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

async function loadOperators() {
  operatorItems = await api('operators');
  renderOperators();
}

function renderOperators() {
  $('#operator-count').textContent = `${operatorItems.length} ${operatorItems.length === 1 ? 'operatore' : 'operatori'}`;
  $('#operators-list').innerHTML = operatorItems.length ? operatorItems.map(operator => `
    <div class="operator-row" data-operator="${operator.id}">
      <div><strong>${escapeHtml(operator.name)}</strong><span class="operator-status${operator.active ? '' : ' inactive'}">${operator.active ? 'ATTIVO' : 'DISATTIVATO'}</span><small>${operator.active ? 'Può accedere dai QR' : 'Accesso revocato'}</small></div>
      <div class="operator-actions">
        <button class="button secondary" type="button" data-operator-action="toggle">${operator.active ? 'Disattiva' : 'Attiva'}</button>
        <button class="button ghost" type="button" data-operator-action="pin">Cambia PIN</button>
        <button class="delete-room" type="button" data-operator-action="delete">Elimina</button>
      </div>
    </div>`).join('') : '<div class="empty-state">Nessun operatore autorizzato.</div>';
}

async function createOperator(event) {
  event.preventDefault();
  const formElement = event.currentTarget;
  formError('#operator-form-error');
  const submitButton = formElement.querySelector('[type="submit"]');
  if (submitButton?.disabled) return;
  if (submitButton) submitButton.disabled = true;
  try {
    const payload = Object.fromEntries(new FormData(formElement).entries());
    await api('operators', {method: 'POST', body: JSON.stringify(payload)});
    formElement.reset();
    await loadOperators();
    toast('Operatore aggiunto');
  } catch (error) {
    formError('#operator-form-error', error.message);
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

async function handleOperatorAction(event) {
  const button = event.target.closest('[data-operator-action]');
  const row = event.target.closest('[data-operator]');
  if (!button || !row) return;
  const operator = operatorItems.find(item => item.id === row.dataset.operator);
  if (!operator) return;
  try {
    if (button.dataset.operatorAction === 'toggle') {
      await api(`operators/${operator.id}/toggle`, {method: 'POST', body: '{}'});
      toast(operator.active ? 'Accesso operatore revocato' : 'Operatore riattivato');
    } else if (button.dataset.operatorAction === 'pin') {
      const pin = prompt(ctr('Inserisci il nuovo PIN personale'));
      if (pin === null) return;
      await api(`operators/${operator.id}/pin`, {method: 'POST', body: JSON.stringify({pin})});
      toast('PIN aggiornato e sessioni precedenti revocate');
    } else if (button.dataset.operatorAction === 'delete') {
      if (!confirm(`${ctr('Eliminare operatore')} ${operator.name}?`)) return;
      await api(`operators/${operator.id}`, {method: 'DELETE'});
      toast('Operatore eliminato');
    }
    await loadOperators();
  } catch (error) {
    toast(error.message, true);
  }
}

$('#new-cylinder').addEventListener('click', () => {
  formError('#new-cylinder-error');
  $('#new-cylinder-dialog').showModal();
});
$('#manage-operators').addEventListener('click', async () => {
  formError('#operator-form-error');
  try {
    await loadOperators();
    $('#operators-dialog').showModal();
  } catch (error) { toast(error.message, true); }
});
$('#close-operators').addEventListener('click', () => $('#operators-dialog').close());
$('#new-operator-form').addEventListener('submit', createOperator);
$('#operators-list').addEventListener('click', handleOperatorAction);
$('#close-new-cylinder').addEventListener('click', () => $('#new-cylinder-dialog').close());
$('#close-cylinder').addEventListener('click', closeCylinderDialog);
$('#cylinder-dialog').addEventListener('cancel', event => {
  event.preventDefault();
  closeCylinderDialog();
});
$('#new-cylinder-form').addEventListener('submit', createCylinder);
$('#new-cylinder-tare').addEventListener('input', updateNewCylinderPreview);
$('#new-cylinder-gas').addEventListener('input', updateNewCylinderPreview);
$('#cylinder-search').addEventListener('input', renderCylinders);
$('#cylinders-list').addEventListener('click', event => {
  const card = event.target.closest('[data-cylinder]');
  if (card) openCylinder(card.dataset.cylinder);
});
$('#cylinder-operation').addEventListener('change', setOperationFields);
$('#operation-total').addEventListener('input', updateOperationPreview);
$('#operation-amount').addEventListener('input', updateOperationPreview);
$('#cylinder-operation-form').addEventListener('submit', saveCylinderOperation);
$('#cylinder-history').addEventListener('click', event => {
  const button = event.target.closest('[data-edit-transaction]');
  if (button) openTransactionEditor(button.dataset.editTransaction);
});
$('#edit-transaction-operation').addEventListener('change', setEditTransactionFields);
$('#edit-transaction-form').addEventListener('submit', saveTransactionEdit);
$('#close-edit-transaction').addEventListener('click', closeTransactionEditor);
$('#cancel-edit-transaction').addEventListener('click', closeTransactionEditor);
$('#edit-transaction-dialog').addEventListener('cancel', event => { event.preventDefault(); closeTransactionEditor(); });
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
  if (!activeCylinder) return;
  openPdfForPrint(`api/cylinders/${encodeURIComponent(activeCylinder.id)}/qr-print`);
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
