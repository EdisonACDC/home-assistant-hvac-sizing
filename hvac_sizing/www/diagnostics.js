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

  function analyzePerformance() {
    const d = performancePayload();
    const target = $d('#performance-result');
    const findings = [];
    const metrics = [];

    if (d.return_air_c === null || d.supply_air_c === null) {
      if (typeof toast === 'function') toast('Inserisci temperatura ambiente/ritorno e temperatura aria in uscita', true);
      return;
    }

    const cooling = d.mode === 'cooling';
    const deltaAir = cooling ? d.return_air_c - d.supply_air_c : d.supply_air_c - d.return_air_c;
    let superheat = null;
    let subcool = null;

    if (d.suction_line_c !== null && d.evap_sat_c !== null) superheat = d.suction_line_c - d.evap_sat_c;
    if (d.cond_sat_c !== null && d.liquid_line_c !== null) subcool = d.cond_sat_c - d.liquid_line_c;

    metrics.push(badge(cooling ? 'ΔT aria raffrescamento' : 'ΔT aria riscaldamento', `${deltaAir.toFixed(1)} K`, deltaAir > 0 ? 'ok' : 'danger'));
    metrics.push(badge('Surriscaldamento', superheat === null ? '—' : `${superheat.toFixed(1)} K`));
    metrics.push(badge('Sottoraffreddamento', subcool === null ? '—' : `${subcool.toFixed(1)} K`));
    metrics.push(badge('Pressioni', d.low_bar_g !== null && d.high_bar_g !== null ? `${d.low_bar_g.toFixed(2)} / ${d.high_bar_g.toFixed(2)} bar(g)` : '—'));

    if (d.runtime_min !== null && d.runtime_min < 10) {
      addFinding(findings, 'warn', 'Macchina non ancora stabilizzata', 'Per una diagnosi affidabile lascia lavorare la macchina almeno 10–15 minuti in condizioni stabili, salvo diversa procedura del costruttore.');
    }

    if (cooling) {
      if (deltaAir < 6) addFinding(findings, 'danger', 'ΔT aria basso', 'La resa frigorifera lato aria appare insufficiente. Prima di pensare alla carica verifica portata aria, filtri, batteria interna, frequenza inverter e condizioni di carico.');
      else if (deltaAir < 8) addFinding(findings, 'warn', 'ΔT aria un po’ basso', 'Può essere normale con alta portata aria o inverter modulato, ma va incrociato con SH, SC e condizioni ambiente.');
      else if (deltaAir <= 14) addFinding(findings, 'ok', 'Scambio aria plausibile', 'Il salto termico lato aria è compatibile con un funzionamento frigorifero regolare in molte condizioni operative.');
      else if (deltaAir <= 18) addFinding(findings, 'warn', 'ΔT aria elevato', 'Può indicare portata aria ridotta, filtro/batteria sporchi o ambiente molto secco. Controlla prima il flusso aria.');
      else addFinding(findings, 'danger', 'ΔT aria molto elevato', 'Prima di giudicare il circuito frigorifero controlla fortemente la portata aria e possibile evaporatore troppo freddo/brinato.');
    } else {
      if (deltaAir < 10) addFinding(findings, 'warn', 'ΔT aria riscaldamento basso', 'Verifica se l’inverter sta modulando, se la macchina è in sbrinamento o se le condizioni esterne limitano la resa.');
      else if (deltaAir <= 25) addFinding(findings, 'ok', 'Scambio aria plausibile', 'Il salto termico lato aria è compatibile con molte condizioni di riscaldamento.');
      else addFinding(findings, 'warn', 'ΔT aria elevato', 'Controlla portata aria e temperatura batteria; un flusso ridotto può far aumentare molto la temperatura di mandata.');
    }

    if (!d.filters_clean || !d.fan_high) {
      addFinding(findings, 'warn', 'Portata aria non verificata', 'Una diagnosi frigorifera affidabile richiede filtri puliti e portata aria nota/stabile. Pressioni e ΔT possono essere falsati da un problema lato aria.');
    }
    if (!d.outdoor_clean) {
      addFinding(findings, 'warn', 'Batteria esterna da verificare', 'Uno scambio esterno ridotto altera pressione di condensazione/evaporazione e assorbimento. Pulisci e libera il flusso prima di diagnosticare la carica.');
    }

    if (superheat !== null) {
      if (superheat < 1) addFinding(findings, 'danger', 'Surriscaldamento quasi nullo', 'Possibile ritorno di liquido o misura non corretta. Verifica posizione della pinza, stabilità della macchina e dati del costruttore.');
      else if (superheat < 3) addFinding(findings, 'warn', 'Surriscaldamento basso', 'Su EEV/inverter può essere gestito elettronicamente; non aggiungere o togliere refrigerante basandoti solo su questo dato.');
      else if (superheat <= 12) addFinding(findings, 'ok', 'Surriscaldamento plausibile', 'Valore generalmente compatibile con molte macchine, ma il target esatto dipende da EEV/capillare, carico e specifica del costruttore.');
      else if (superheat <= 20) addFinding(findings, 'warn', 'Surriscaldamento alto', 'Possibile evaporatore affamato, bassa portata di refrigerante, carico basso o controllo EEV. Incrocia con SC, pressioni e ΔT aria.');
      else addFinding(findings, 'danger', 'Surriscaldamento molto alto', 'Controlla carica, restrizioni, valvola di espansione e corretta lettura della temperatura di saturazione.');
    }

    if (subcool !== null) {
      if (subcool < 0) addFinding(findings, 'danger', 'Sottoraffreddamento negativo', 'La misura è incoerente o il liquido non è completamente condensato nel punto misurato. Verifica sensori, pressioni e punto di misura.');
      else if (subcool < 2) addFinding(findings, 'warn', 'Sottoraffreddamento basso', 'Può indicare poco liquido disponibile o condizioni di modulazione; su inverter/EEV va sempre confrontato con il manuale di servizio.');
      else if (subcool <= 10) addFinding(findings, 'ok', 'Sottoraffreddamento plausibile', 'Valore generalmente compatibile con molti circuiti in condizioni stabili. Il target esatto resta quello del costruttore.');
      else if (subcool <= 18) addFinding(findings, 'warn', 'Sottoraffreddamento alto', 'Può essere legato a carica elevata, condensatore molto efficiente o restrizione a valle. Incrocia con alta pressione e assorbimento.');
      else addFinding(findings, 'danger', 'Sottoraffreddamento molto alto', 'Verifica carica, restrizioni e condizioni di condensazione prima di qualsiasi intervento.');
    }

    if (d.low_bar_g !== null && d.high_bar_g !== null) {
      if (d.high_bar_g <= d.low_bar_g) addFinding(findings, 'danger', 'Pressioni non coerenti', 'L’alta pressione deve essere superiore alla bassa. Controlla collegamenti e inserimento dati.');
      else addFinding(findings, 'info', 'Pressioni registrate', 'Le pressioni sono utili soprattutto convertite nelle rispettive temperature di saturazione e confrontate con temperatura aria/tubi. Non esiste una pressione “giusta” unica senza conoscere il carico.');
    }

    if (d.evap_sat_c !== null && d.return_air_c !== null && cooling) {
      const approach = d.return_air_c - d.evap_sat_c;
      metrics.push(badge('Approach aria→evaporazione', `${approach.toFixed(1)} K`));
      if (approach < 5) addFinding(findings, 'warn', 'Evaporazione molto vicina all’aria ambiente', 'Controlla che la temperatura di saturazione inserita sia corretta e che la macchina sia realmente sotto carico.');
      if (d.evap_sat_c <= 0 && d.rh_percent !== null && d.rh_percent > 50) addFinding(findings, 'warn', 'Rischio brina evaporatore', 'Con evaporazione prossima o sotto 0 °C e umidità significativa, controlla distribuzione aria e possibile formazione di ghiaccio.');
    }

    if (d.cond_sat_c !== null && d.outdoor_c !== null && cooling) {
      const condApproach = d.cond_sat_c - d.outdoor_c;
      metrics.push(badge('Approach condensazione→esterna', `${condApproach.toFixed(1)} K`));
      if (condApproach > 25) addFinding(findings, 'warn', 'Condensazione alta rispetto all’esterno', 'Verifica batteria esterna, ventilatore, ricircolo aria e carico. Un’alta condensazione non significa automaticamente sovraccarica.');
    }

    if (d.discharge_line_c !== null) {
      metrics.push(badge('T mandata compressore', `${d.discharge_line_c.toFixed(1)} °C`, d.discharge_line_c > 110 ? 'danger' : d.discharge_line_c > 95 ? 'warn' : ''));
      if (d.discharge_line_c > 110) addFinding(findings, 'danger', 'Temperatura mandata molto alta', 'Condizione da approfondire subito: verifica surriscaldamento, raffreddamento compressore, carica, restrizioni e limiti specifici del costruttore.');
    }

    if (d.current_a !== null && d.rated_current_a !== null && d.rated_current_a > 0) {
      const load = d.current_a / d.rated_current_a * 100;
      metrics.push(badge('Assorbimento vs riferimento', `${load.toFixed(0)}%`, load > 115 ? 'danger' : load > 100 ? 'warn' : ''));
      if (load > 115) addFinding(findings, 'danger', 'Assorbimento elevato', 'Controlla tensione, condensazione, ventilazione, carico meccanico e dati di targa. Su inverter usa il riferimento corretto per la frequenza/capacità del momento.');
    }

    if (d.compressor === 'inverter') {
      addFinding(findings, 'info', 'Macchina inverter', 'La frequenza del compressore e l’apertura EEV possono cambiare rapidamente pressioni, SH, SC e ΔT. La diagnosi va fatta a condizioni stabilizzate e, se possibile, leggendo frequenza/comando dal service tool.');
    }

    if (d.refrigerant === 'R290') {
      addFinding(findings, 'danger', 'Refrigerante A3 infiammabile', 'Per R290 usa attrezzatura e procedure idonee A3 e rispetta le istruzioni del costruttore prima di collegare o scollegare strumenti.');
    }

    const dangerCount = findings.filter(f => f.severity === 'danger').length;
    const warnCount = findings.filter(f => f.severity === 'warn').length;
    let overall = 'ok';
    let title = 'Funzionamento complessivamente plausibile';
    if (dangerCount) { overall = 'danger'; title = 'Anomalia tecnica da approfondire'; }
    else if (warnCount >= 2) { overall = 'warn'; title = 'Funzionamento da verificare'; }
    else if (warnCount === 1) { overall = 'warn'; title = 'Funzionamento plausibile con una verifica'; }

    if (superheat === null || subcool === null) {
      addFinding(findings, 'info', 'Diagnosi carica non completa', 'Per una valutazione più professionale inserisci temperatura di evaporazione/condensazione dal Testo e le temperature dei tubi. Senza SH e SC non conviene giudicare la carica del refrigerante.');
    }

    target.className = `vacuum-result ${overall}`;
    target.innerHTML = `
      <div class="diagnostic-head"><div><span>Esito tecnico</span><strong>${esc(title)}</strong></div><div class="diagnostic-score">${dangerCount ? 'STOP' : warnCount ? 'CHECK' : 'OK'}</div></div>
      <div class="diag-metrics">${metrics.join('')}</div>
      <div class="findings">${findings.map(f => `<article class="finding ${f.severity}"><strong>${esc(f.title)}</strong><p>${esc(f.detail)}</p></article>`).join('')}</div>
      <div class="procedure-box"><strong>Ordine di diagnosi consigliato</strong><p>1) stabilizza macchina e portata aria; 2) verifica ΔT lato aria; 3) controlla temperature di saturazione; 4) calcola SH/SC; 5) incrocia pressioni, temperature e assorbimento; 6) solo dopo valuta carica, EEV/restrizioni o scambio termico. I target del manuale di servizio prevalgono sempre.</p></div>`;
  }

  function resetPerformance() {
    ['#perf-low-bar','#perf-high-bar','#perf-evap-sat','#perf-cond-sat','#perf-suction-line','#perf-liquid-line','#perf-discharge-line','#perf-current','#perf-rated-current'].forEach(id => { const el = $d(id); if (el) el.value = ''; });
    if ($d('#perf-runtime')) $d('#perf-runtime').value = '15';
    if ($d('#performance-result')) { $d('#performance-result').className = 'vacuum-result hidden'; $d('#performance-result').innerHTML = ''; }
  }

  function fillPerformance(data = {}) {
    const map = {
      '#perf-refrigerant':'refrigerant','#perf-mode':'mode','#perf-compressor':'compressor','#perf-runtime':'runtime_min','#perf-outdoor':'outdoor_c',
      '#perf-return-air':'return_air_c','#perf-rh':'rh_percent','#perf-supply-air':'supply_air_c','#perf-low-bar':'low_bar_g','#perf-high-bar':'high_bar_g',
      '#perf-evap-sat':'evap_sat_c','#perf-cond-sat':'cond_sat_c','#perf-suction-line':'suction_line_c','#perf-liquid-line':'liquid_line_c',
      '#perf-discharge-line':'discharge_line_c','#perf-current':'current_a','#perf-rated-current':'rated_current_a'
    };
    Object.entries(map).forEach(([id,key]) => { const el = $d(id); if (el && data[key] !== undefined && data[key] !== null) el.value = data[key]; });
    if ($d('#perf-filters-clean')) $d('#perf-filters-clean').checked = data.filters_clean !== false;
    if ($d('#perf-outdoor-clean')) $d('#perf-outdoor-clean').checked = data.outdoor_clean !== false;
    if ($d('#perf-fan-high')) $d('#perf-fan-high').checked = data.fan_high !== false;
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

  $d('#analyze-performance')?.addEventListener('click', analyzePerformance);
  $d('#reset-performance')?.addEventListener('click', resetPerformance);
  $d('#go-performance')?.addEventListener('click', () => $d('#performance-test')?.scrollIntoView({behavior:'smooth', block:'start'}));
})();
