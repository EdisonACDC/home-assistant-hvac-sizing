# Changelog

## 0.7.0

- Nuovo portale esterno bombole separato dall'interfaccia amministrativa.
- QR con token HMAC casuale, revocabile e non collegato all'indirizzo locale di Home Assistant.
- Accesso operatore limitato a una sola bombola, con pesatura, aggiunta e prelievo.
- PIN operatore obbligatorio, limite tentativi e nome operatore nel registro.
- App completa riservata agli amministratori Home Assistant tramite Ingress.
- Porta pubblica 8100 predisposta per Cloudflare Tunnel e dominio HTTPS configurabile.
- PDF aggiornati con i nuovi collegamenti QR protetti.

## 0.6.1

- Corretto il QR: non usa più l'indirizzo temporaneo dell'iframe Ingress.
- Il QR apre Home Assistant, entra nella pagina Bombole e mostra direttamente la bombola selezionata.
- Separate Dimensionamento, Bombole, Diagnosi e Vuoto in pagine dedicate.
- Spostati Nuovo, Progetti e Salva nella pagina Dimensionamento.

## 0.6.0

- Aggiunto selettore Italiano / Deutsch con preferenza memorizzata.
- Tradotte interfaccia, magazzino bombole e schede PDF in tedesco.
- PDF e formattazione di date e quantità seguono la lingua selezionata.

## 0.5.2

- Corretto il salvataggio delle bombole da iPhone e tastiere italiane con pesi inseriti usando la virgola decimale.
- Accettati automaticamente sia `4,250` sia `4.250` per tara, peso totale e quantità dei movimenti.
- Errori di salvataggio mostrati direttamente dentro la finestra della bombola.
- Stato di generazione QR visibile con messaggio dedicato in caso di errore.

## 0.5.1

- Scheda PDF A4 scaricabile per ogni bombola.
- Stampa della scheda completa con dati, tara, peso totale, residuo, QR e storico movimenti.
- PDF unico del magazzino con una scheda separata per ogni bombola.
- Pulsanti dedicati per scaricare o stampare una singola scheda e tutte le schede insieme.

## 0.5.0

- Nuovo magazzino bombole refrigerante con archivio persistente.
- QR code individuale, scaricabile e stampabile, che apre direttamente la scheda della bombola.
- Registrazione di tara, peso totale, tipo di refrigerante, capacità e note.
- Calcolo automatico del gas effettivo residuo: peso totale meno tara.
- Movimenti separati per pesatura, aggiunta e prelievo, con blocco dei valori impossibili.
- Storico completo con data, quantità precedente, quantità risultante e note di lavoro.
- Riepilogo automatico delle quantità disponibili divise per refrigerante.
- Interfaccia responsive ottimizzata per scansione e utilizzo da telefono.

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
