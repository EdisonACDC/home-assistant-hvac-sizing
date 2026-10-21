let cylinderItems = [];
let activeCylinder = null;
let activeTransaction = null;
let activeDeleteTransaction = null;
let operatorItems = [];
const ctr = value => window.AppI18n?.translate(value) || value;

const kg = value => `${Number(value || 0).toLocaleString(window.AppI18n?.locale() || 'it-IT', {minimumFractionDigits: 3, maximumFractionDigits: 3})} kg`;
const co2 = value => `${Number(value || 0).toLocaleString(window.AppI18n?.locale() || 'it-IT', {minimumFractionDigits: 3, maximumFractionDigits: 3})} kg CO₂e`;
const tco2 = value => Number(value || 0) >= 1
  ? `${(Number(value || 0) / 1000).toLocaleString(window.AppI18n?.locale() || 'it-IT', {minimumFractionDigits: 3, maximumFractionDigits: 3})} t CO₂e`
  : `${Number(value || 0).toLocaleString(window.AppI18n?.locale() || 'it-IT', {minimumFractionDigits: 3, maximumFractionDigits: 3})} kg CO₂e`;

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

let cylinderFilter = 'all';
const LOW_STOCK = 0.2;
const fillPercent = item => item.capacity_kg ? Math.max(0, Math.min(100, Number(item.current_gas_kg) / Number(item.capacity_kg) * 100)) : null;
const isLow = item => item.capacity_kg ? Number(item.current_gas_kg) < Number(item.capacity_kg) * LOW_STOCK : Number(item.current_gas_kg) <= 0;

function renderCylinderFilters() {
  const gases = [...new Set(cylinderItems.map(item => item.refrigerant))].sort();
  if (cylinderFilter !== 'all' && cylinderFilter !== 'low' && cylinderFilter !== 'review' && !gases.includes(cylinderFilter)) cylinderFilter = 'all';
  const lowCount = cylinderItems.filter(isLow).length;
  const reviewCount = cylinderItems.filter(item => item.review_count).length;
  const chips = [['all', `${ctr('Tutte')} · ${cylinderItems.length}`], ...gases.map(gas => [gas, gas])];
  if (lowCount) chips.push(['low', `${ctr('Scorta bassa')} · ${lowCount}`]);
  if (reviewCount) chips.push(['review', `${ctr('Da verificare')} · ${reviewCount}`]);
  $('#cylinder-filter').innerHTML = cylinderItems.length ? chips.map(([value, label]) => `<button type="button" class="chip" data-filter="${escapeHtml(value)}" aria-pressed="${cylinderFilter === value}">${escapeHtml(label)}</button>`).join('') : '';
}

function renderCylinders() {
  const search = ($('#cylinder-search').value || '').trim().toLowerCase();
  renderCylinderFilters();
  const visible = cylinderItems.filter(item => `${item.name} ${item.code} ${item.refrigerant}`.toLowerCase().includes(search)
    && (cylinderFilter === 'all' || (cylinderFilter === 'low' ? isLow(item) : cylinderFilter === 'review' ? item.review_count : item.refrigerant === cylinderFilter)));
  const totals = cylinderItems.reduce((result, item) => {
    result[item.refrigerant] = (result[item.refrigerant] || 0) + Number(item.current_gas_kg);
    return result;
  }, {});
  const lowCount = cylinderItems.filter(isLow).length;
  const reviews = cylinderItems.reduce((sum, item) => sum + Number(item.review_count || 0), 0);
  const badge = $('#nav-review-badge');
  if (badge) { badge.textContent = reviews ? String(reviews) : ''; badge.classList.toggle('hidden', !reviews); }
  $('#cylinder-summary').innerHTML = cylinderItems.length
    ? `<div class="stat"><span>${escapeHtml(ctr('Bombole registrate'))}</span><strong>${cylinderItems.length}</strong></div>${Object.entries(totals).sort().map(([gas, total]) => `<div class="stat"><span>${escapeHtml(ctr('Totale'))} ${escapeHtml(gas)}</span><strong>${Number(total).toLocaleString(window.AppI18n?.locale() || 'it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}<small> kg</small></strong></div>`).join('')}${lowCount ? `<div class="stat low"><span>${escapeHtml(ctr('Scorta bassa'))}</span><strong>${lowCount}</strong></div>` : ''}${reviews ? `<div class="stat low"><span>${escapeHtml(ctr('Movimenti da verificare'))}</span><strong>${reviews}</strong></div>` : ''}`
    : '';
  $('#cylinders-list').innerHTML = visible.length ? visible.map(item => {
    const low = isLow(item);
    const percent = fillPercent(item);
    return `<article class="cyl-card${low ? ' low' : ''}${item.review_count ? ' review' : ''}">
      <button class="cyl-open" type="button" data-cylinder="${item.id}" aria-label="${escapeHtml(`${ctr('Apri')} ${item.code} ${item.name}`)}">${UI.bottle(percent, low)}
      <span class="cyl-info">
        <span class="cyl-head"><span class="code">${escapeHtml(item.code)}</span><span class="refrigerant-pill">${escapeHtml(item.refrigerant)}</span></span>
        <span class="name">${escapeHtml(item.name)}</span>
        <span class="kg">${Number(item.current_gas_kg || 0).toLocaleString(window.AppI18n?.locale() || 'it-IT', {minimumFractionDigits: 3, maximumFractionDigits: 3})}<small> kg${item.capacity_kg ? ` / ${Number(item.capacity_kg).toLocaleString(window.AppI18n?.locale() || 'it-IT', {maximumFractionDigits: 1})} kg` : ''}</small></span>
        <span class="meta${low ? ' warn' : ''}">${low ? `${escapeHtml(ctr('Scorta bassa'))} · ` : ''}${escapeHtml(ctr('Peso totale stimato'))} ${kg(item.total_weight_kg)} · ${escapeHtml(ctr('Tara'))} ${kg(item.tare_kg)}</span>
        ${item.review_count ? `<span class="meta warn">${escapeHtml(item.review_count === 1 ? ctr('1 movimento da verificare') : `${item.review_count} ${ctr('movimenti da verificare')}`)}</span>` : ''}
      </span></button>
      <span class="cyl-acts" data-quick-op><button type="button" class="button secondary small" data-quick="weighing" data-id="${item.id}">${escapeHtml(ctr('Pesa'))}</button><button type="button" class="button ghost small" data-quick="remove" data-id="${item.id}">${escapeHtml(ctr('Preleva'))}</button><button type="button" class="button ghost small" data-quick="add" data-id="${item.id}">${escapeHtml(ctr('Aggiungi'))}</button></span>
    </article>`;
  }).join('') : `<div class="empty-state">${escapeHtml(ctr(cylinderItems.length ? 'Nessuna bombola corrisponde alla ricerca.' : 'Nessuna bombola registrata. Premi “Nuova bombola” per iniziare.'))}</div>`;
  UI.applyGeometry($('#cylinders-list'));
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
    const qrUrl = `api/cylinders/${encodeURIComponent(id)}/qr.png?lang=${window.AppI18n?.getLanguage() || 'it'}&v=${Date.now()}`;
    formError('#cylinder-qr-error');
    $('#cylinder-qr').src = qrUrl;
    $('#download-cylinder-qr').href = activeCylinder.qr_png_url || `api/cylinders/${encodeURIComponent(activeCylinder.id)}/qr.png`;
    $('#download-cylinder-qr').download = `bombola-${activeCylinder.code}.png`;
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
  const low = isLow(activeCylinder);
  const percent = fillPercent(activeCylinder);
  $('#cylinder-detail-metrics').innerHTML = `<div class="detail-hero">${UI.bottle(percent, low).replace('class="bottle', 'class="bottle big')}
    <div class="grid">
    <div class="kpi cool"><span>${ctr('Gas residuo effettivo')}</span><strong>${kg(activeCylinder.current_gas_kg)}</strong>${percent === null ? '' : `<small class="${low ? 'warn-text' : ''}">${Math.round(percent)}%${low ? ` · ${ctr('Scorta bassa')}` : ''}</small>`}</div>
    <div class="kpi"><span>${ctr('Peso totale calcolato')}</span><strong>${kg(activeCylinder.total_weight_kg)}</strong></div>
    <div class="kpi"><span>${ctr('Tara bombola')}</span><strong>${kg(activeCylinder.tare_kg)}</strong></div>
    <div class="kpi"><span>${ctr('Capacità gas')}</span><strong>${activeCylinder.capacity_kg == null ? '—' : kg(activeCylinder.capacity_kg)}</strong>${window.appAccess?.role === 'admin' ? `<button type="button" class="link-button" id="set-capacity">${ctr(activeCylinder.capacity_kg == null ? 'Imposta capacità' : 'Modifica')}</button>` : ''}</div>
    </div></div>`;
  UI.applyGeometry($('#cylinder-detail-metrics'));

  const names = {initial: 'Registrazione iniziale', weighing: 'Pesatura', add: 'Aggiunta', remove: 'Prelievo'};
  $('#cylinder-history').innerHTML = activeCylinder.history.length ? activeCylinder.history.map(item => {
    const date = new Date(item.created_at).toLocaleString(window.AppI18n?.locale() || 'it-IT', {dateStyle: 'short', timeStyle: 'short'});
    const detail = item.operation === 'weighing'
      ? `${ctr('Peso totale')} ${kg(item.total_weight_kg)}`
      : `${item.operation === 'remove' ? '−' : '+'}${kg(Math.abs(item.amount_kg || 0))}`;
    const edited = item.edited_at ? ` · ${ctr('Corretto dall’amministratore')}` : '';
    const late = item.received_at && (new Date(item.received_at) - new Date(item.created_at)) > 120000
      ? `<small class="offline-detail">${escapeHtml(ctr('Registrato senza rete, inviato il'))} ${escapeHtml(new Date(item.received_at).toLocaleString(window.AppI18n?.locale() || 'it-IT', {dateStyle: 'short', timeStyle: 'short'}))}</small>` : '';
    const review = item.review_reason ? `<small class="review-detail"><strong>${escapeHtml(ctr('Da verificare'))}</strong> · ${escapeHtml(ctr(item.review_reason))} · ${escapeHtml(ctr('Non conteggiato nel residuo: correggi o elimina il movimento.'))}</small>` : '';
    const machine = [item.machine_brand, item.machine_model, item.machine_serial].filter(Boolean).join(' · ');
    const climate = item.gwp == null ? '' : `${machine ? `${machine} · ` : ''}GWP ${Number(item.gwp).toLocaleString(window.AppI18n?.locale() || 'it-IT')} · ${ctr('Gas movimentato')}: ${tco2(item.co2_equivalent_kg)}${item.emission_co2_equivalent_kg == null ? '' : ` · ${ctr('Emissione stimata')}: ${tco2(item.emission_co2_equivalent_kg)}`}`;
    const note = item.operation === 'initial' && item.notes === 'Registrazione iniziale' ? '' : item.notes;
    const deleteButton = item.operation === 'initial' ? '' : `<button class="button danger history-delete" type="button" data-delete-transaction="${escapeHtml(item.id)}">Elimina</button>`;
    return `<div class="history-row history-${['add','remove','weighing','initial'].includes(item.operation) ? item.operation : 'other'}" data-transaction="${escapeHtml(item.id)}"><time>${escapeHtml(date)}</time><div><strong class="history-operation">${escapeHtml(names[item.operation] || item.operation)}</strong><small>${escapeHtml(detail)}${note ? ` · ${escapeHtml(note)}` : ''}${item.operator_name ? ` · ${escapeHtml(item.operator_name)}` : ''}${escapeHtml(edited)}</small>${climate ? `<small class="climate-detail">${climate.split(' · ').map(part => `<span>${escapeHtml(part)}</span>`).join('')}</small>` : ''}${late}${review}</div><div class="history-side"><div class="history-value"><strong>${item.review_reason ? '—' : kg(item.gas_after_kg)}</strong><small>residuo</small></div><div class="history-actions"><button class="button ghost history-edit" type="button" data-edit-transaction="${escapeHtml(item.id)}">Modifica</button>${deleteButton}</div></div></div>`;
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
  const environmental = operation === 'add' || operation === 'remove';
  $('#edit-machine-fields').classList.toggle('hidden', !environmental);
  $('#edit-transaction-gwp').required = environmental;
  $('#edit-transaction-amount-label').textContent = ctr(initial ? 'Gas refrigerante iniziale kg' : 'Quantità refrigerante kg');
  updateEditEnvironmentPreview();
}

function updateEditEnvironmentPreview() {
  const operation = $('#edit-transaction-operation').value;
  if (!['add', 'remove'].includes(operation)) return;
  const amount = cylinderNumber($('#edit-transaction-amount').value);
  const gwp = cylinderNumber($('#edit-transaction-gwp').value);
  const charge = cylinderNumber($('#edit-machine-charge').value);
  const emitted = cylinderNumber($('#edit-emitted-kg').value);
  $('#edit-environment-preview').innerHTML = `${ctr('Gas movimentato')}: <strong>${co2(amount * gwp)} · ${tco2(amount * gwp)}</strong><br>${ctr('Carica macchina')}: <strong>${co2(charge * gwp)}</strong>${emitted ? `<br>${ctr('Emissione stimata')}: <strong>${co2(emitted * gwp)} · ${tco2(emitted * gwp)}</strong>` : ''}`;
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
  $('#edit-machine-brand').value = activeTransaction.machine_brand || '';
  window.syncMachineBrands?.();
  $('#edit-machine-model').value = activeTransaction.machine_model || '';
  $('#edit-machine-serial').value = activeTransaction.machine_serial || '';
  $('#edit-machine-charge').value = transactionInputValue(activeTransaction.machine_charge_kg);
  $('#edit-transaction-gwp').value = activeTransaction.gwp ?? activeCylinder.gwp ?? '';
  $('#edit-emitted-kg').value = transactionInputValue(activeTransaction.emitted_kg);
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
    machine_brand: $('#edit-machine-brand').value,
    machine_model: $('#edit-machine-model').value,
    machine_serial: $('#edit-machine-serial').value,
    machine_charge_kg: decimalText($('#edit-machine-charge').value),
    gwp: decimalText($('#edit-transaction-gwp').value),
    emitted_kg: decimalText($('#edit-emitted-kg').value),
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

function openTransactionDelete(transactionId) {
  if (!activeCylinder) return;
  activeDeleteTransaction = activeCylinder.history.find(item => item.id === transactionId) || null;
  if (!activeDeleteTransaction || activeDeleteTransaction.operation === 'initial') return;
  const names = {weighing: 'Pesatura', add: 'Aggiunta', remove: 'Prelievo'};
  const date = new Date(activeDeleteTransaction.created_at).toLocaleString(window.AppI18n?.locale() || 'it-IT', {dateStyle: 'short', timeStyle: 'short'});
  const amount = activeDeleteTransaction.operation === 'weighing'
    ? `${ctr('Peso totale')} ${kg(activeDeleteTransaction.total_weight_kg)}`
    : kg(Math.abs(activeDeleteTransaction.amount_kg || 0));
  $('#delete-transaction-meta').textContent = `${ctr(names[activeDeleteTransaction.operation] || activeDeleteTransaction.operation)} · ${date} · ${amount}`;
  $('#delete-transaction-password').value = '';
  formError('#delete-transaction-error');
  $('#delete-transaction-dialog').showModal();
}

function closeTransactionDelete() {
  $('#delete-transaction-password').value = '';
  $('#delete-transaction-dialog').close();
  activeDeleteTransaction = null;
}

async function deleteTransaction(event) {
  event.preventDefault();
  if (!activeCylinder || !activeDeleteTransaction) return;
  const submitButton = event.currentTarget.querySelector('[type="submit"]');
  if (submitButton?.disabled) return;
  submitButton.disabled = true;
  formError('#delete-transaction-error');
  const cylinderId = activeCylinder.id;
  try {
    await api(`cylinders/${cylinderId}/transactions/${activeDeleteTransaction.id}`, {
      method: 'DELETE',
      body: JSON.stringify({admin_password: $('#delete-transaction-password').value}),
    });
    closeTransactionDelete();
    await loadCylinders();
    await openCylinder(cylinderId, false);
    toast('Movimento eliminato e residui ricalcolati');
  } catch (error) {
    $('#delete-transaction-password').value = '';
    $('#delete-transaction-password').focus();
    formError('#delete-transaction-error', error.message);
    toast(error.message, true);
  } finally {
    submitButton.disabled = false;
  }
}

const currentOperation = () => $('#cylinder-operation-form input[name="operation"]:checked')?.value || 'weighing';
function setOperation(value) {
  const radio = $(`#cylinder-operation-form input[name="operation"][value="${value}"]`);
  if (radio) radio.checked = true;
  setOperationFields();
}

function setOperationFields() {
  const operation = currentOperation();
  const weighing = operation === 'weighing';
  $('#amount-label').textContent = ctr(operation === 'remove' ? 'Quantità prelevata' : 'Quantità aggiunta');
  $('#operation-submit').textContent = ctr(weighing ? 'Registra pesatura' : operation === 'remove' ? 'Registra prelievo' : 'Registra aggiunta');
  $('#weighing-field').classList.toggle('hidden', !weighing);
  $('#amount-field').classList.toggle('hidden', weighing);
  $('#operation-total').required = weighing;
  $('#operation-amount').required = !weighing;
  const environmental = !weighing;
  $('#machine-fields').classList.toggle('hidden', !environmental);
  const gwpInput = $('#cylinder-operation-form [name="gwp"]');
  gwpInput.required = environmental;
  if (environmental && !gwpInput.value) gwpInput.value = activeCylinder?.gwp ?? '';
  updateOperationPreview();
  updateEnvironmentPreview();
}

function updateEnvironmentPreview() {
  if (!activeCylinder || currentOperation() === 'weighing') return;
  const form = $('#cylinder-operation-form');
  const amount = cylinderNumber($('#operation-amount').value);
  const gwp = cylinderNumber(form.elements.gwp.value);
  const charge = cylinderNumber(form.elements.machine_charge_kg.value);
  const emitted = cylinderNumber(form.elements.emitted_kg.value);
  $('#environment-preview').innerHTML = `${ctr('Gas movimentato')}: <strong>${co2(amount * gwp)} · ${tco2(amount * gwp)}</strong><br>${ctr('Carica macchina')}: <strong>${co2(charge * gwp)}</strong>${emitted ? `<br>${ctr('Emissione stimata')}: <strong>${co2(emitted * gwp)} · ${tco2(emitted * gwp)}</strong>` : ''}`;
}

function updateOperationPreview() {
  if (!activeCylinder) return;
  const operation = currentOperation();
  const before = Number(activeCylinder.current_gas_kg);
  let after = null;
  let co2Line = '';
  if (operation === 'weighing') {
    const total = cylinderNumber($('#operation-total').value);
    if (total) after = total - Number(activeCylinder.tare_kg);
  } else {
    const amount = cylinderNumber($('#operation-amount').value);
    if (amount) {
      after = operation === 'add' ? before + amount : before - amount;
      const gwp = cylinderNumber($('#cylinder-operation-form').elements.gwp.value);
      if (gwp) co2Line = `<small class="co2">${escapeHtml(ctr('Gas movimentato'))}: <b>${tco2(amount * gwp)}</b></small>`;
    }
  }
  const negative = after !== null && after < 0;
  const overCapacity = after !== null && activeCylinder.capacity_kg && after > Number(activeCylinder.capacity_kg);
  const note = negative ? ctr('Il residuo risulterebbe negativo: controlla il valore.') : overCapacity ? ctr('Il residuo supera la capacità della bombola: controlla il valore.') : '';
  $('#operation-preview').innerHTML = `<div><span>${escapeHtml(ctr('Prima'))}</span><strong>${kg(before)}</strong></div><b class="arrow" aria-hidden="true">→</b><div><span>${escapeHtml(ctr('Dopo'))}</span><strong class="${negative || overCapacity ? 'bad' : ''}">${after === null ? '—' : kg(Math.max(0, after))}</strong></div>${operation === 'weighing' && after !== null ? `<small class="co2">${kg(cylinderNumber($('#operation-total').value))} − ${escapeHtml(ctr('tara'))} ${kg(activeCylinder.tare_kg)}</small>` : ''}${co2Line}${note ? `<small class="co2 bad">${escapeHtml(note)}</small>` : ''}`;
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
  ['total_weight_kg', 'amount_kg', 'machine_charge_kg', 'gwp', 'emitted_kg'].forEach(key => {
    if (key in payload) payload[key] = decimalText(payload[key]);
  });
  try {
    await api(`cylinders/${activeCylinder.id}/transactions`, {method: 'POST', body: JSON.stringify(payload)});
    formElement.reset();
    setOperation('weighing');
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

async function setActiveCylinderCapacity() {
  if (!activeCylinder) return;
  const answer = prompt(ctr('Capacità di gas della bombola in kg (es. 12,5). Lascia vuoto per toglierla.'), activeCylinder.capacity_kg == null ? '' : String(activeCylinder.capacity_kg).replace('.', ','));
  if (answer === null) return;
  try {
    await api(`cylinders/${activeCylinder.id}/capacity`, {method: 'POST', body: JSON.stringify({capacity_kg: decimalText(answer)})});
    await loadCylinders();
    await openCylinder(activeCylinder.id, false);
    toast('Capacità aggiornata');
  } catch (error) { toast(error.message, true); }
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
  $('#operator-count').textContent = `${operatorItems.length} ${ctr(operatorItems.length === 1 ? 'operatore' : 'operatori')}`;
  $('#operators-list').innerHTML = operatorItems.length ? operatorItems.map(operator => `
    <div class="operator-row" data-operator="${operator.id}">
      <div><strong class="history-operation">${escapeHtml(operator.name)}</strong><span class="operator-status${operator.active ? '' : ' inactive'}">${operator.active ? 'ATTIVO' : 'DISATTIVATO'}</span><small>${operator.active ? 'Può accedere dai QR' : 'Accesso revocato'}</small></div>
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
  const qrLink = cylinderItems.find(item => item.qr_png_url)?.qr_png_url;
  $('#bombole-app-box').classList.toggle('hidden', !qrLink);
  if (qrLink) $('#bombole-app-link').value = `${new URL(qrLink).origin}/app/`;
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
$('#cylinders-list').addEventListener('click', async event => {
  const quick = event.target.closest('[data-quick]');
  if (quick) {
    await openCylinder(quick.dataset.id);
    setOperation(quick.dataset.quick);
    (quick.dataset.quick === 'weighing' ? $('#operation-total') : $('#operation-amount')).focus();
    return;
  }
  const card = event.target.closest('[data-cylinder]');
  if (card) openCylinder(card.dataset.cylinder);
});
$('#cylinder-filter').addEventListener('click', event => {
  const chip = event.target.closest('[data-filter]');
  if (!chip) return;
  cylinderFilter = chip.dataset.filter;
  renderCylinders();
});
$$('#cylinder-operation-form input[name="operation"]').forEach(radio => radio.addEventListener('change', setOperationFields));
$('#operation-total').addEventListener('input', updateOperationPreview);
$('#operation-amount').addEventListener('input', () => { updateOperationPreview(); updateEnvironmentPreview(); });
$('#cylinder-operation-form').addEventListener('input', event => {
  if (['machine_charge_kg', 'gwp', 'emitted_kg'].includes(event.target.name)) { updateEnvironmentPreview(); updateOperationPreview(); }
});
$('#cylinder-operation-form').addEventListener('submit', saveCylinderOperation);
$('#cylinder-history').addEventListener('click', event => {
  const editButton = event.target.closest('[data-edit-transaction]');
  const deleteButton = event.target.closest('[data-delete-transaction]');
  if (editButton) openTransactionEditor(editButton.dataset.editTransaction);
  if (deleteButton) openTransactionDelete(deleteButton.dataset.deleteTransaction);
});
$('#edit-transaction-operation').addEventListener('change', setEditTransactionFields);
$('#edit-transaction-form').addEventListener('input', event => {
  if (['amount_kg', 'machine_charge_kg', 'gwp', 'emitted_kg'].includes(event.target.name)) updateEditEnvironmentPreview();
});
$('#edit-transaction-form').addEventListener('submit', saveTransactionEdit);
$('#close-edit-transaction').addEventListener('click', closeTransactionEditor);
$('#cancel-edit-transaction').addEventListener('click', closeTransactionEditor);
$('#edit-transaction-dialog').addEventListener('cancel', event => { event.preventDefault(); closeTransactionEditor(); });
$('#delete-transaction-form').addEventListener('submit', deleteTransaction);
$('#close-delete-transaction').addEventListener('click', closeTransactionDelete);
$('#cancel-delete-transaction').addEventListener('click', closeTransactionDelete);
$('#delete-transaction-dialog').addEventListener('cancel', event => { event.preventDefault(); closeTransactionDelete(); });
$('#delete-cylinder').addEventListener('click', deleteActiveCylinder);
$('#cylinder-detail-metrics').addEventListener('click', event => { if (event.target.closest('#set-capacity')) setActiveCylinderCapacity(); });
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
  if (!activeCylinder.qr_print_url) return toast('Configura external_url nelle opzioni dell’add-on prima di stampare il QR', true);
  window.open(activeCylinder.qr_print_url, '_blank', 'noopener,noreferrer');
});

window.accessReady.then(me => { if (me && window.canAccess('cylinders')) loadCylinders(true); });
window.addEventListener('app-language-changed', () => {
  renderCylinders();
  if (activeCylinder) {
    renderCylinderDetail();
    $('#download-cylinder-pdf').href = cylinderPdfUrl(activeCylinder.id, true);
    const qrUrl = `api/cylinders/${encodeURIComponent(activeCylinder.id)}/qr.png?lang=${window.AppI18n?.getLanguage() || 'it'}&v=${Date.now()}`;
    $('#cylinder-qr').src = qrUrl;
    $('#download-cylinder-qr').href = activeCylinder.qr_png_url || `api/cylinders/${encodeURIComponent(activeCylinder.id)}/qr.png`;
  }
});

// Download actual binary data on the current authenticated origin (also in Ingress).
$('#download-cylinder-qr').addEventListener('click', async event => {
  event.preventDefault();
  if (!activeCylinder) return;
  const cylinder = activeCylinder;
  const button = event.currentTarget;
  if (button.dataset.busy) return;
  button.dataset.busy = '1';
  try {
    const response = await fetch(`api/cylinders/${encodeURIComponent(cylinder.id)}/qr.png?v=${Date.now()}`, {cache: 'no-store'});
    if (!response.ok) throw new Error(ctr('Download PNG non riuscito. Aggiorna e riavvia l’add-on.'));
    const buffer = await response.arrayBuffer();
    const signature = new Uint8Array(buffer, 0, Math.min(8, buffer.byteLength));
    if ([137,80,78,71,13,10,26,10].some((value,index) => signature[index] !== value)) {
      throw new Error(ctr('Il server non ha restituito un PNG. Aggiorna e riavvia l’add-on.'));
    }
    const blob = new Blob([buffer], {type:'image/png'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bombola-${String(cylinder.code).replace(/[^a-zA-Z0-9_-]/g,'_')}.png`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) { toast(error.message, true); }
  finally { delete button.dataset.busy; }
});
