# Changelog

## 0.4.0

- Diagnosi prestazioni separata tra split con sola presa di bassa pressione e sistemi con bassa + alta accessibili.
- In modalità "solo bassa" i campi HP, condensazione e sottoraffreddamento vengono nascosti e non sono richiesti.
- Valutazione professionale con ΔT aria, temperatura di evaporazione, surriscaldamento, condizioni ambiente, pulizia/portata aria e assorbimento.
- Livello di affidabilità della diagnosi carica: bassa, media o alta in base ai dati realmente disponibili.
- Su inverter/EEV l'add-on evita conclusioni automatiche sulla carica durante modulazione o con dati insufficienti.
- La sola pressione di aspirazione non viene mai usata come prova di sottocarica o sovraccarica.
- Aggiunto ordine diagnostico professionale: lato aria → stabilizzazione → ΔT → LP/Tsat → SH → HP/SC se disponibili → assorbimento → valutazione finale.

## 0.3.0

- Nuova sezione "Diagnosi prestazioni" per testare una macchina in funzione.
- Inserimento temperature ambiente/ritorno, aria in uscita, temperatura esterna e umidità.
- Inserimento bassa/alta pressione del manifold e temperature di evaporazione/condensazione lette dallo strumento.
- Calcolo automatico di ΔT aria, surriscaldamento, sottoraffreddamento e approach termici.
- Incrocio tecnico tra portata aria, pressioni, temperature, SH/SC, temperatura di mandata compressore e assorbimento.
- Diagnosi guidata senza giudicare la carica refrigerante da una sola pressione.
- Supporto compressori inverter e on/off con avvertenze dedicate per EEV e modulazione.
- Dati della prova prestazioni salvati insieme al progetto.
- Interfaccia responsive per telefono, tablet e PC.

## 0.2.0

- Nuova sezione "Vuoto e messa in servizio".
- Diagnosi guidata in base a micron iniziali/attuali, tempo di evacuazione e test di risalita.
- Valutazione di fruste 1/4", 3/8" e 1/2" e presenza/rimozione dello Schrader.
- Indicazioni per impianti nuovi, già funzionati o rimasti aperti all'atmosfera.
- Supporto R32, R410A, R134a e avvertenze dedicate per R290.
- Memorizzazione dei dati di collaudo insieme al progetto.
- Procedura guidata per rottura del vuoto con azoto secco e sicurezza d'uso.
- Interfaccia responsive ottimizzata per telefono, tablet e PC.

## 0.1.0

- Prima versione installabile.
- Calcolo rapido e professionale.
- Gestione di più locali per progetto.
- Carichi sensibili, latenti, frigoriferi e termici.
- Archivio persistente dei progetti.
- Interfaccia italiana responsive tramite Ingress.
