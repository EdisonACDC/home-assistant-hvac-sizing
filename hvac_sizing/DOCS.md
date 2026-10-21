# Dimensionamento Climatizzazione Pro

Apri l’app dalla barra laterale di Home Assistant, crea il progetto e aggiungi tutti i locali da calcolare.

## Calcolo rapido

Usa il volume e coefficienti modificabili. È adatto a sopralluoghi e stime preliminari quando non sono disponibili stratigrafie e valori U.

## Calcolo professionale

Richiede condizioni climatiche, superfici disperdenti, trasmittanze, vetrate, apporti solari, aria esterna, occupazione e carichi elettrici. Restituisce per ogni locale:

- carico sensibile;
- carico latente;
- potenza frigorifera totale;
- potenza di riscaldamento;
- rapporto SHR.

I progetti vengono conservati nel volume dati persistente dell’app.

> Il risultato è una stima tecnica verificabile e non sostituisce una relazione normativa firmata da un professionista abilitato.



## Calcolo guidato (0.12.0)

Il metodo `guided` è distinto dai metodi precedenti: usa superfici, differenze di temperatura e carichi interni; non i coefficienti W/m³ del rapido. I progetti salvati mantengono il metodo originale.

Per locali rettangolari A/C seguono la lunghezza e B/D la larghezza. Si dichiarano le quattro adiacenze, le misure di ogni apertura e, in mansarda, altezza media e superficie reale delle falde. Le finestre vengono sottratte dalla superficie opaca; i lucernari dal tetto. Ambienti alla stessa temperatura non aggiungono dispersione. Le pareti interne verso ambienti non riscaldati sono trattate separatamente.

Il modello resta una stima stazionaria, non un dimensionamento normativo né una simulazione dinamica. I preset sono ipotesi dell’app, non valori certificati derivati dalle fonti sottostanti. U parete/tetto/pavimento: buono 0,30/0,25/0,35; medio 0,70/0,60/0,70; scarso 1,50/1,50/1,20; sconosciuto 0,80/0,80/0,80 W/m²K. Vetri U/g: singolo 5,0/0,80; doppio vecchio o ignoto 2,8/0,70; doppio basso emissivo 1,4/0,55; triplo 0,9/0,45. U finestra è un'approssimazione dell'intero serramento; richiedere Uw reale per il progetto definitivo.

Aria: 0,5 ricambi/ora. Locali non riscaldati: 12 °C inverno e 28 °C estate, pareti interne U=1,5. Terreno: 10/18 °C, senza modello geometrico del terreno. Sole: irraggiamenti indicativi per orientamento (150–500 W/m²; lucernari 600), schermatura esterna chiusa fattore 0,3; sole sul tetto rappresentato da +10 K equivalenti estivi. Non si modellano ponti termici, inerzia, recuperatori, picchi simultanei o clima derivato dalla città. Le temperature esterne precompilate sono esempi da sostituire con dati di progetto locali. I risultati dichiarano queste ipotesi. Ogni temperatura interna appartiene al singolo locale.

Riferimenti di principio (non fonti dei preset):
- DOE, prestazioni di finestre: U-factor e solar heat gain coefficient: https://www.energy.gov/cmei/femp/purchasing-energy-efficient-residential-windows-doors-and-skylights
- EnergyPlus Engineering Reference, bilanci delle superfici e limiti rispetto a una simulazione dinamica: https://energyplus.net/assets/nrel_custom/pdfs/pdfs_v24.2.0/EngineeringReference.pdf


## Utenti app (0.13.0)

Aprire **Utenti app** come amministratore. Creare un nome utente univoco (lettere, numeri, punto, trattino, underscore), password di 10–128 caratteri e ruolo. L’amministratore accede a tutto e gestisce gli account. Per un utente scegliere i permessi di ciascuna sezione:

- Nascosto: nessuna navigazione e nessun accesso alle API dei dati della sezione.
- Consultazione/calcolo: lettura dei progetti o del registro bombole; calcoli consentiti senza salvataggio.
- Modifica/registra: salvataggio/eliminazione progetti, creazione bombole e registrazione movimenti. Eliminazione bombole, modifica/eliminazione movimenti esistenti, rotazione QR e gestione operatori sono riservate agli amministratori.
- Diagnosi e vuoto sono calcolatori locali: i due livelli abilitati consentono l’uso dello strumento, senza archivio condiviso.

I permessi riguardano **tutti** i dati della sezione, non singole bombole o progetti. Gli operatori QR e i loro PIN restano separati.

Gli account si collegano via HTTPS a `external_url` + `/admin/`, con nome utente e password. Il vecchio amministratore principale continua ad accedere lasciando il nome utente vuoto e usando `admin_password` dell’add-on. L’accesso Home Assistant Ingress è un’interfaccia amministrativa fidata: non condividere tale accesso con gli utenti limitati e non esporre la porta privata a Internet. I permessi degli account non sostituiscono le autorizzazioni Home Assistant.

Le password degli account sono memorizzate con salt casuale e PBKDF2-HMAC-SHA256. Le sessioni firmate durano fino a otto ore e verificano a ogni richiesta account attivo e versione autorizzativa. Modificare password, ruolo, permessi o stato revoca tutte le sessioni precedenti dell’account. Cambiare il proprio account richiede un nuovo accesso. Non è possibile disattivare o declassare l’ultimo account amministratore attivo. Il recupero resta possibile dall’Ingress amministrativo o con l’amministratore principale.

I cookie sono Secure/HttpOnly/SameSite e le scritture richiedono CSRF. Gli account condividono il limite di cinque tentativi falliti per indirizzo in quindici minuti. Gli amministratori con account personale possono confermare modifiche allo storico con la propria password. Il registro dei nuovi movimenti riporta il nome dell’account autenticato.


## Nuova grafica (0.16.0)

- **Calcolo**: a sinistra l’elenco dei locali, al centro il locale aperto con i passi, a destra la potenza stimata in tempo reale. Nel calcolo guidato tocca un lato della pianta per scegliere cosa c’è oltre la parete (Esterno → Interna → Non riscaldato). L’anteprima usa valori neutri per i dati non ancora inseriti e li elenca in "Mancano ancora".
- **Bombole**: tocca la scheda per aprirla oppure usa Pesa / Preleva / Aggiungi. Prima di salvare vedi il residuo "Prima → Dopo"; un valore negativo o oltre la capacità è segnato in rosso.
- **Strumenti**: convertitore di unità, kW ↔ BTU/h e controllo perdite F-gas. Le soglie sono quelle del Regolamento (UE) 2024/573: verifica sempre sul testo ufficiale prima di un rapporto.

Se qualcosa non funziona puoi tornare alla 0.15.0 installando l’add-on dal ramo `ripristino-0.15.0`.

## App Bombole e uso senza rete (0.15.0)

Apri `https://<tuo-dominio>/app/` sul telefono di ogni operatore e aggiungilo alla schermata Home:

- iPhone: in Safari tocca Condividi → "Aggiungi alla schermata Home";
- Android: in Chrome menu ⋮ → "Installa app" o "Aggiungi a schermata Home".

L’indirizzo esatto è nella finestra **Operatori QR**. Non servono app store né costi aggiuntivi.

Come si usa:

1. Con la rete, apri una volta le bombole che userai e accedi con nome e PIN: il telefono le salva.
2. In cantina o nei locali tecnici apri i QR con il pulsante **Scansiona bombola** dell’app. Su iPhone non usare la fotocamera normale: aprirebbe Safari, che ha una memoria separata dall’app.
3. Senza rete la scheda mostra l’ultimo residuo noto con la data. I movimenti restano sul telefono ("in attesa di invio") e il residuo mostrato diventa "Residuo previsto".
4. Quando torna la rete i movimenti partono da soli. Se l’accesso di 8 ore è scaduto, l’app chiede nome e PIN per inviarli.

Regole di sicurezza: nessun movimento entra nel registro senza un operatore verificato; il PIN resta solo in memoria durante l’invio; ogni movimento ha un codice univoco e non viene registrato due volte.

Movimenti "da verificare": se un movimento arrivato in ritardo renderebbe negativo il residuo, superasse la capacità o fosse una pesata sotto la tara, viene salvato ma escluso dal residuo. L’elenco bombole e lo storico lo segnalano; correggilo con **Modifica** o eliminalo.

Su iPhone Safari può cancellare i dati dei siti non usati per alcuni giorni: con l’app aggiunta alla schermata Home questo non succede.
