# Changelog

## 0.11.0

- Aggiunti marca, modello, matricola e carica di targa della macchina durante aggiunta e prelievo di refrigerante.
- GWP compilato automaticamente per i refrigeranti più comuni e modificabile per miscele particolari.
- Calcolo automatico in kg e tonnellate di CO₂ equivalente per gas movimentato e carica macchina.
- Campo separato per il gas realmente disperso, con calcolo dell’emissione stimata in CO₂ equivalente.
- Dati ambientali visibili nel registro amministratore, nel portale QR e nelle schede PDF.

## 0.10.1

- Ogni modifica a un movimento del registro bombola richiede la password amministratore.
- La password viene verificata dal server, non viene salvata nel browser ed è rimossa dal modulo dopo ogni tentativo.
- Dopo cinque password errate le modifiche vengono bloccate temporaneamente per 15 minuti.

## 0.10.0

- Aggiunta area amministratore esterna protetta da password su `/admin/`.
- L’accesso Ingress da Home Assistant continua a funzionare senza password aggiuntiva.
- Sessione amministratore firmata di 8 ore, blocco tentativi, cookie sicuri e protezione CSRF.
- Il pulsante “Stampa QR” apre una pagina di stampa autonoma fuori dall’iframe di Home Assistant.
- Aggiunto il pulsante “Disconnetti” nell’area amministratore esterna.

## 0.9.0

- L'amministratore può modificare i movimenti già presenti nel registro di ogni bombola.
- Dopo una correzione vengono ricalcolati in ordine tutti i residui successivi e il valore attuale della bombola.
- I movimenti corretti vengono contrassegnati nel registro mantenendo data e operatore originali.
- Nella creazione della bombola si inseriscono tara e gas presente; il peso totale viene calcolato automaticamente.
- Data e operatore dei movimenti restano invariati per mantenere la tracciabilità del registro.

## 0.8.3

- Interfaccia del registro QR adattata automaticamente a iPhone, Android, tablet e computer.
- Eliminato lo scorrimento orizzontale causato da moduli, collegamenti e contenuti lunghi.
- Finestre amministrative a schermo intero sui telefoni e comandi ridisposti sui display più stretti.
- Campi ottimizzati per evitare lo zoom automatico durante la compilazione su iPhone.

## 0.8.2

- Aggiunto nel registro QR il pulsante “Chiudi e disconnetti”.
- Alla chiusura la sessione dell'operatore viene eliminata immediatamente dal telefono.
- Su iPhone/Safari, se la scheda non può essere chiusa automaticamente, il portale torna alla pagina precedente mantenendo l'utente disconnesso.

## 0.8.1

- Corretto su Safari/iPhone il salvataggio degli operatori: la lista si aggiorna subito senza chiudere e riaprire la finestra.
- Corretto l'accesso al registro tramite QR con nome operatore e PIN.
- Resa stabile la gestione asincrona dei moduli per bombole e movimenti.

## 0.8.0

- Gestione amministrativa degli operatori autorizzati al registro bombole.
- Nome e PIN personale obbligatori prima di visualizzare i dati della bombola.
- PIN memorizzati soltanto come hash PBKDF2 con salt casuale.
- Sessioni temporanee limitate alla singola bombola e revocabili disattivando l'operatore, cambiando il PIN o rigenerando il QR.
- Ogni movimento riporta automaticamente il nome dell'operatore autenticato.

## 0.7.2

- Risolto il conflitto di avvio con la porta host 8100 già occupata.
- Il portale continua ad ascoltare sulla porta interna 8100, ma usa per impostazione predefinita la porta host 48100.

## 0.7.1

- Impediti invii multipli durante il salvataggio di bombole e movimenti su dispositivi mobili.
- Forzato l'aggiornamento dell'add-on per sostituire i vecchi QR Ingress con il portale esterno sicuro.
- Uniformata la versione delle API private e pubbliche.

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
