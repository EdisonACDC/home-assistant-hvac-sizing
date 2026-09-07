(() => {
  const $d = selector => document.querySelector(selector);
  const num = id => {
    const el = $d(id);
    if (!el || el.value === '') return null;
    const value = Number(el.value);
    return Number.isFinite(value) ? value : null;
  };
  const text = id => $d(id)?.value || '';
  const checked = id => Boolean($d(id)?.checked);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

  function performancePayload() {
    return {
      access: text('#perf-access') || 'low_only',
      refrigerant: text('#perf-refrigerant'),
      mode: text('#perf-mode'),
      compressor: text('#perf-compressor'),
      runtime_min: num('#perf-runtime'),
      outdoor_c: num('#perf-outdoor'),
      return_air_c: num('#perf-return-air'),
      rh_percent: num('#perf-rh'),
      supply_air_c: num('#perf-supply-air'),
      low_bar_g: num('#perf-low-bar'),
      high_bar_g: num('#perf-high-bar'),
      evap_sat_c: num('#perf-evap-sat'),
      cond_sat_c: num('#perf-cond-sat'),
      suction_line_c: num('#perf-suction-line'),
      liquid_line_c: num('#perf-liquid-line'),
      discharge_line_c: num('#perf-discharge-line'),
      current_a: num('#perf-current'),
      rated_current_a: num('#perf-rated-current'),
      filters_clean: checked('#perf-filters-clean'),
      outdoor_clean: checked('#perf-outdoor-clean'),
      fan_high: checked('#perf-fan-high')
    };
  }

  function badge(label, value, state = '') {
    return `<div class="diag-metric ${state}"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
  }

  function addFinding(findings, severity, title, detail) {
    findings.push({severity, title, detail});
  }

  function updateAccessUI() {
    const full = text('#perf-access') === 'low_high';
    document.querySelectorAll('.perf-high-only').forEach(el => {
      el.style.display = full ? '' : 'none';
    });
  }

  function analyzePerformance() {
    const d = performancePayload();
    const target = $d('#performance-result');
    const findings = [];
    const metrics = [];
    const fullAccess = d.access === 'low_high';

    if (d.return_air_c === null || d.supply_air_c === null) {
      if (typeof toast === 'function') toast('Inserisci temperatura ambiente/ritorno e temperatura aria in uscita', true);
      return;
    }

    const cooling = d.mode === 'cooling';
    const deltaAir = cooling ? d.return_air_c - d.supply_air_c : d.supply_air_c - d.return_air_c;
    const superheat = d.suction_line_c !== null && d.evap_sat_c !== null ? d.suction_line_c - d.evap_sat_c : null;
    const subcool = fullAccess && d.cond_sat_c !== null && d.liquid_line_c !== null ? d.cond_sat_c - d.liquid_line_c : null;

    metrics.push(badge(cooling ? 'ΔT aria raffrescamento' : 'ΔT aria riscaldamento', `${deltaAir.toFixed(1)} K`, deltaAir > 0 ? 'ok' : 'danger'));
    metrics.push(badge('Surriscaldamento', superheat === null ? '—' : `${superheat.toFixed(1)} K`));
    if (fullAccess) metrics.push(badge('Sottoraffreddamento', subcool === null ? '—' : `${subcool.toFixed(1)} K`));
    metrics.push(badge(fullAccess ? 'Pressioni LP / HP' : 'Pressione LP', fullAccess ? `${d.low_bar_g ?? '—'} / ${d.high_bar_g ?? '—'} bar(g)` : `${d.low_bar_g ?? '—'} bar(g)`));

    if (d.runtime_min !== null && d.runtime_min < 10) {
      addFinding(findings, 'warn', 'Macchina non ancora stabilizzata', 'Per una diagnosi affidabile lascia lavorare la macchina almeno 10–15 minuti in condizioni stabili, salvo diversa procedura del costruttore.');
    }

    if (cooling) {
      if (deltaAir <= 0) addFinding(findings, 'danger', 'Nessun raffreddamento lato aria', 'La temperatura di mandata non è inferiore a quella di ritorno. Verifica modalità, compressore, ventilazione e letture.');
      else if (deltaAir < 6) addFinding(findings, 'danger', 'ΔT aria basso', 'La resa lato aria appare insufficiente. Prima di giudicare il refrigerante verifica portata aria, carico ambiente, frequenza inverter e pulizia delle batterie.');
      else if (deltaAir < 8) addFinding(findings, 'warn', 'ΔT aria moderatamente basso', 'Può essere compatibile con elevata portata aria o inverter modulato. Va incrociato con temperatura di evaporazione e surriscaldamento.');
      else if (deltaAir <= 14) addFinding(findings, 'ok', 'Scambio lato aria plausibile', 'Il salto termico è compatibile con molte condizioni normali di raffrescamento.');
      else if (deltaAir <= 18) addFinding(findings, 'warn', 'ΔT aria elevato', 'Può indicare portata aria ridotta, batteria sporca, ambiente molto secco o evaporatore molto freddo.');
      else addFinding(findings, 'danger', 'ΔT aria molto elevato', 'Controlla prioritariamente portata aria e possibile brina/ghiaccio prima di intervenire sul circuito frigorifero.');
    } else {
      if (deltaAir <= 0) addFinding(findings, 'danger', 'Nessun riscaldamento lato aria', 'La mandata non è più calda del ritorno. Verifica modalità, sbrinamento, compressore e letture.');
      else if (deltaAir < 10) addFinding(findings, 'warn', 'ΔT riscaldamento basso', 'Può dipendere da modulazione inverter, carico ridotto, sbrinamento recente o condizioni esterne sfavorevoli.');
      else if (deltaAir <= 25) addFinding(findings, 'ok', 'Scambio lato aria plausibile', 'Il salto termico è compatibile con molte condizioni normali di riscaldamento.');
      else addFinding(findings, 'warn', 'ΔT riscaldamento elevato', 'Controlla portata aria e velocità ventilatore; un flusso ridotto può far salire molto la mandata.');
    }

    if (!d.filters_clean || !d.fan_high) {
      addFinding(findings, 'warn', 'Portata aria non verificata', 'Filtri sporchi o ventilatore non in condizione di prova possono falsare ΔT, evaporazione e surriscaldamento. Correggi prima il lato aria.');
    }
    if (!d.outdoor_clean) {
      addFinding(findings, 'warn', 'Scambio esterno non verificato', 'Una batteria esterna sporca o ostruita altera pressioni, temperature e assorbimento; pulisci e ripeti la prova.');
    }

    if (d.evap_sat_c !== null && cooling) {
      const evapApproach = d.return_air_c - d.evap_sat_c;
      metrics.push(badge('Approach ritorno→evaporazione', `${evapApproach.toFixed(1)} K`));
      if (d.evap_sat_c <= 0 && d.rh_percent !== null && d.rh_percent >= 50) {
        addFinding(findings, 'warn', 'Evaporazione molto bassa', 'Con umidità significativa aumenta il rischio di brina. Verifica portata aria, sensori, carico e controllo EEV.');
      }
      if (evapApproach < 4) addFinding(findings, 'warn', 'Evaporazione vicina alla temperatura ambiente', 'Controlla che la macchina sia sotto carico e che la temperatura di saturazione sia corretta.');
    }

    if (superheat !== null) {
      if (superheat < 0) addFinding(findings, 'danger', 'Surriscaldamento negativo', 'Dato fisicamente incoerente nel punto di misura: verifica pressione/temperatura di saturazione e posizione della pinza.');
      else if (superheat < 1) addFinding(findings, 'danger', 'Surriscaldamento quasi nullo', 'Possibile ritorno di liquido o misura errata. Su inverter/EEV verifica stabilità e specifica del costruttore.');
      else if (superheat < 3) addFinding(findings, 'warn', 'Surriscaldamento basso', 'Non modificare la carica da questo solo dato. Su EEV/inverter può essere una condizione gestita elettronicamente.');
      else if (superheat <= 12) addFinding(findings, 'ok', 'Surriscaldamento plausibile', 'Valore generalmente compatibile con molte macchine in condizioni stabili; il target esatto resta quello del costruttore.');
      else if (superheat <= 20) addFinding(findings, 'warn', 'Surriscaldamento alto', 'Può indicare evaporatore affamato, EEV poco aperta, carico basso, restrizione o carica insufficiente. Servono altri dati prima di concludere.');
      else addFinding(findings, 'danger', 'Surriscaldamento molto alto', 'Verifica carica, restrizioni, EEV/capillare e correttezza delle misure. Non intervenire sulla carica senza conferme ulteriori.');
    } else if (d.low_bar_g !== null) {
      addFinding(findings, 'info', 'Pressione bassa disponibile ma SH non calcolabile', 'Per sfruttare bene la sola presa di bassa inserisci anche la temperatura di evaporazione letta dal manifold e la temperatura del tubo di aspirazione.');
    }

    if (fullAccess) {
      if (d.low_bar_g !== null && d.high_bar_g !== null && d.high_bar_g <= d.low_bar_g) {
        addFinding(findings, 'danger', 'Pressioni non coerenti', 'L’alta deve risultare superiore alla bassa in normale funzionamento. Controlla collegamenti e dati inseriti.');
      }
      if (subcool !== null) {
        if (subcool < 0) addFinding(findings, 'danger', 'Sottoraffreddamento negativo', 'Verifica temperatura di condensazione, temperatura linea liquido e punti di misura.');
        else if (subcool < 2) addFinding(findings, 'warn', 'Sottoraffreddamento basso', 'Può dipendere da condizioni di carico/modulazione o da scarso liquido disponibile; confronta con manuale di servizio.');
        else if (subcool <= 10) addFinding(findings, 'ok', 'Sottoraffreddamento plausibile', 'Valore compatibile con molti circuiti, ma non sostituisce il target specifico del costruttore.');
        else if (subcool <= 18) addFinding(findings, 'warn', 'Sottoraffreddamento alto', 'Può essere legato a carica elevata, forte condensazione o restrizione a valle. Incrocia con HP, temperatura esterna e assorbimento.');
        else addFinding(findings, 'danger', 'Sottoraffreddamento molto alto', 'Verifica carica, restrizioni e condizioni di condensazione prima di qualsiasi intervento.');
      }
      if (d.cond_sat_c !== null && d.outdoor_c !== null && cooling) {
        const condApproach = d.cond_sat_c - d.outdoor_c;
        metrics.push(badge('Approach condensazione→esterna', `${condApproach.toFixed(1)} K`));
        if (condApproach > 25) addFinding(findings, 'warn', 'Condensazione alta rispetto all’esterno', 'Verifica batteria esterna, ventilatore e ricircolo aria. Alta condensazione da sola non dimostra sovraccarica.');
      }
    } else {
      addFinding(findings, 'info', 'Modalità split · sola bassa pressione', 'È normale non avere HP e sottoraffreddamento su molti split. L’assistente non penalizza questi dati mancanti e non dichiara carica corretta/errata dalla sola LP.');
    }

    if (d.discharge_line_c !== null) {
      metrics.push(badge('T mandata compressore', `${d.discharge_line_c.toFixed(1)} °C`, d.discharge_line_c > 110 ? 'danger' : d.discharge_line_c > 95 ? 'warn' : ''));
      if (d.discharge_line_c > 110) addFinding(findings, 'danger', 'Temperatura mandata molto alta', 'Verifica surriscaldamento, raffreddamento compressore, restrizioni e limiti specifici del costruttore.');
      else if (d.discharge_line_c > 95) addFinding(findings, 'warn', 'Temperatura mandata elevata', 'Tendenza da controllare insieme a surriscaldamento, carico e ventilazione.');
    }

    if (d.current_a !== null && d.rated_current_a !== null && d.rated_current_a > 0) {
      const load = d.current_a / d.rated_current_a * 100;
      metrics.push(badge('Assorbimento vs riferimento', `${load.toFixed(0)}%`, load > 115 ? 'danger' : load > 100 ? 'warn' : ''));
      if (load > 115) addFinding(findings, 'danger', 'Assorbimento oltre riferimento', 'Controlla tensione, scambio termico, carico e dati di targa. Su inverter il confronto è valido solo se il riferimento corrisponde alla condizione di lavoro.');
    }

    if (d.compressor === 'inverter') {
      addFinding(findings, 'info', 'Interpretazione inverter / EEV', 'Frequenza compressore ed EEV possono modificare rapidamente LP, SH e ΔT. Evita conclusioni sulla carica se la macchina sta modulando; stabilizza il carico e usa, quando disponibile, il service tool del costruttore.');
    }

    let chargeConfidence = 'bassa';
    if (fullAccess && superheat !== null && subcool !== null && d.runtime_min >= 10 && d.filters_clean && d.outdoor_clean) chargeConfidence = 'alta';
    else if (!fullAccess && superheat !== null && d.runtime_min >= 10 && d.filters_clean && d.outdoor_clean) chargeConfidence = 'media';
    metrics.push(badge('Affidabilità diagnosi carica', chargeConfidence.toUpperCase()));

    if (!fullAccess) {
      addFinding(findings, 'info', 'Limite diagnostico dichiarato', 'Con la sola bassa pressione si può valutare bene il comportamento dell’evaporatore, ma non confermare con certezza sovraccarica o sottocarica senza dati aggiuntivi o procedura del costruttore.');
    }

    if (d.refrigerant === 'R290') {
      addFinding(findings, 'danger', 'Refrigerante A3 infiammabile', 'Per R290 usa attrezzatura e procedure idonee A3 e rispetta integralmente le istruzioni del costruttore.');
    }

    const dangerCount = findings.filter(f => f.severity === 'danger').length;
    const warnCount = findings.filter(f => f.severity === 'warn').length;
    let overall = 'ok';
    let title = 'Funzionamento complessivamente plausibile';
    if (dangerCount) { overall = 'danger'; title = 'Anomalia tecnica da approfondire'; }
    else if (warnCount >= 2) { overall = 'warn'; title = 'Funzionamento da verificare'; }
    else if (warnCount === 1) { overall = 'warn'; title = 'Funzionamento plausibile con una verifica'; }

    target.className = `vacuum-result ${overall}`;
    target.innerHTML = `
      <div class="diagnostic-head"><div><span>Esito tecnico</span><strong>${esc(title)}</strong></div><div class="diagnostic-score">${dangerCount ? 'STOP' : warnCount ? 'CHECK' : 'OK'}</div></div>
      <div class="diag-metrics">${metrics.join('')}</div>
      <div class="findings">${findings.map(f => `<article class="finding ${f.severity}"><strong>${esc(f.title)}</strong><p>${esc(f.detail)}</p></article>`).join('')}</div>
      <div class="procedure-box"><strong>Ordine professionale di diagnosi</strong><p>1) verifica pulizia e portata aria; 2) stabilizza la macchina; 3) misura ritorno e mandata aria; 4) registra LP e temperatura di evaporazione; 5) misura il tubo aspirazione e calcola SH; 6) se HP è realmente disponibile, aggiungi condensazione e SC; 7) incrocia assorbimento e temperature; 8) solo alla fine valuta carica, EEV/restrizioni o scambio termico. Il manuale di servizio della macchina prevale sempre.</p></div>`;
  }

  function resetPerformance() {
    ['#perf-low-bar','#perf-high-bar','#perf-evap-sat','#perf-cond-sat','#perf-suction-line','#perf-liquid-line','#perf-discharge-line','#perf-current','#perf-rated-current'].forEach(id => { const el = $d(id); if (el) el.value = ''; });
    if ($d('#perf-runtime')) $d('#perf-runtime').value = '15';
    if ($d('#perf-access')) $d('#perf-access').value = 'low_only';
    updateAccessUI();
    if ($d('#performance-result')) { $d('#performance-result').className = 'vacuum-result hidden'; $d('#performance-result').innerHTML = ''; }
  }

  function fillPerformance(data = {}) {
    const map = {
      '#perf-access':'access','#perf-refrigerant':'refrigerant','#perf-mode':'mode','#perf-compressor':'compressor','#perf-runtime':'runtime_min','#perf-outdoor':'outdoor_c',
      '#perf-return-air':'return_air_c','#perf-rh':'rh_percent','#perf-supply-air':'supply_air_c','#perf-low-bar':'low_bar_g','#perf-high-bar':'high_bar_g',
      '#perf-evap-sat':'evap_sat_c','#perf-cond-sat':'cond_sat_c','#perf-suction-line':'suction_line_c','#perf-liquid-line':'liquid_line_c',
      '#perf-discharge-line':'discharge_line_c','#perf-current':'current_a','#perf-rated-current':'rated_current_a'
    };
    Object.entries(map).forEach(([id,key]) => {
      const el = $d(id);
      if (!el || data[key] === undefined || data[key] === null) return;
      el.value = data[key];
    });
    if ($d('#perf-access') && !data.access) $d('#perf-access').value = 'low_only';
    if ($d('#perf-filters-clean')) $d('#perf-filters-clean').checked = data.filters_clean !== false;
    if ($d('#perf-outdoor-clean')) $d('#perf-outdoor-clean').checked = data.outdoor_clean !== false;
    if ($d('#perf-fan-high')) $d('#perf-fan-high').checked = data.fan_high !== false;
    updateAccessUI();
  }

  if (typeof projectPayload === 'function') {
    const baseProjectPayload = projectPayload;
    projectPayload = function() {
      const payload = baseProjectPayload();
      payload.performance_test = performancePayload();
      return payload;
    };
  }

  if (typeof loadProject === 'function') {
    const baseLoadProject = loadProject;
    loadProject = async function(id) {
      await baseLoadProject(id);
      try {
        const project = await api(`projects/${id}`);
        fillPerformance(project.payload?.performance_test || {});
      } catch (_) {}
    };
  }

  $d('#perf-access')?.addEventListener('change', updateAccessUI);
  $d('#analyze-performance')?.addEventListener('click', analyzePerformance);
  $d('#reset-performance')?.addEventListener('click', resetPerformance);
  $d('#go-performance')?.addEventListener('click', () => $d('#performance-test')?.scrollIntoView({behavior:'smooth', block:'start'}));
  updateAccessUI();
})();
