# Dimensionamento Climatizzazione Pro

Add-on/Home Assistant App per stimare la potenza frigorifera e termica richiesta da ogni locale.

## Versione 0.16.0

- calcolo rapido parametrico in W/m³;
- calcolo professionale a bilancio termico;
- carichi sensibili e latenti separati;
- trasmissioni di pareti, finestre, tetto e pavimento;
- apporti solari, persone, illuminazione e apparecchiature;
- ventilazione, infiltrazioni e umidità;
- risultati e totali distinti per locale;
- progetti salvati in modo persistente;
- interfaccia responsive tramite Ingress di Home Assistant.
- magazzino bombole con tara, peso totale e residuo netto sempre aggiornato;
- QR code individuale per aprire la scheda della bombola dal telefono;
- storico di pesature, aggiunte e prelievi di refrigerante.
- schede A4 stampabili e scaricabili in PDF, singolarmente o per tutto il magazzino.
- interfaccia selezionabile in italiano o tedesco, compresi i PDF delle bombole.
- pagine separate per Dimensionamento, Bombole, Diagnosi e Vuoto.
- QR delle bombole con collegamento stabile a Home Assistant e apertura diretta della scheda corretta.
- portale esterno separato sulla porta host 48100, limitato alla singola bombola;
- operatori autorizzati gestiti dall'amministratore con PIN personale cifrato;
- accesso al registro solo dopo autenticazione, con sessione temporanea revocabile;
- QR protetti con token firmato e revocabile, senza indirizzo locale di Home Assistant;
- PIN operatore, blocco dopo tentativi errati e registrazione del nome dell'operatore;
- applicazione completa disponibile soltanto agli amministratori Home Assistant.
- accesso amministratore esterno protetto da password su `/admin/`, con sessione temporanea e protezione CSRF.
- pagina di stampa QR dedicata, compatibile con browser mobili e fuori dall’iframe Ingress.
- password amministratore richiesta nuovamente per ogni modifica ai movimenti di una bombola.
- dati di marca, modello, matricola e carica di targa della macchina nei movimenti di carico e prelievo.
- GWP automatico e calcolo di CO₂ equivalente per carica macchina, gas movimentato ed eventuale perdita stimata.
- eliminazione protetta da password dei singoli movimenti, con ricalcolo automatico del registro.
- app Bombole installabile sul telefono (`/app/`): scansione QR integrata e registrazione dei movimenti anche senza rete, con invio automatico al ritorno della connessione.
- nuova grafica (0.16.0): locale compilato a passi, pianta delle pareti cliccabile, potenza stimata in tempo reale, barra di navigazione in basso sul telefono, bombole disegnate con livello e scorta bassa, diagnosi con scale a semaforo, grafico del vuoto e pagina Strumenti (convertitore, kW ↔ BTU/h, GWP e controllo perdite).

## Portale esterno sicuro

1. Nelle opzioni dell'add-on imposta `external_url` con l'indirizzo HTTPS del tuo dominio, per esempio `https://bombole.tuodominio.it`.
2. Imposta `admin_password` con una password amministratore di almeno 10 caratteri.
3. Nel Cloudflare Tunnel inoltra il dominio alla porta `48100` del dispositivo Home Assistant. Non aprire la porta 48100 sul router: il blocco dei tentativi conta l’indirizzo reale solo per le richieste che arrivano dal tunnel.
4. L’area amministratore esterna sarà disponibile su `https://<tuo-dominio>/admin/`.
5. Mantieni la porta privata `8099` disponibile esclusivamente tramite Ingress; da Home Assistant non viene richiesta la password aggiuntiva.

Il portale QR espone soltanto lettura e movimenti della bombola autorizzata. Le funzioni complete sulla porta pubblica sono raggiungibili esclusivamente dopo il login amministratore protetto.

## Installazione locale

1. Copiare la cartella `hvac_sizing` nella directory `/addons` di Home Assistant OS.
2. In Home Assistant aprire **Impostazioni → App → App store**.
3. Dal menu in alto a destra selezionare **Controlla aggiornamenti**.
4. Aprire **Dimensionamento Climatizzazione Pro**, installare e avviare.
5. Attivare **Mostra nella barra laterale**.

## Metodo rapido

Il carico base deriva dal volume del locale moltiplicato per un valore W/m³ modificabile. I fattori di isolamento, esposizione e vetrate permettono di adattare la stima. Persone, luci e apparecchiature sono aggiunte come carichi interni.

## Metodo professionale

Il motore calcola:

- trasmissione: `U × A × ΔT`;
- apporto solare vetrato: `A × irradianza × g × schermatura`;
- carico sensibile dell’aria: `0,335 × m³/h × ΔT`;
- carico latente da differenza di umidità specifica;
- carichi interni e margine di progetto.

Il risultato è una stima tecnica trasparente e non sostituisce un calcolo normativo firmato. Prima della scelta definitiva delle macchine vanno verificati dati edilizi, condizioni climatiche di progetto, portate di ventilazione, contemporaneità e prescrizioni locali.

## Riferimenti progettuali

- VDI 2078 / VDI 6007 per carico frigorifero dinamico e risposta termica degli ambienti;
- EN 12831-1 per il carico di riscaldamento;
- EN ISO 52016-1 per fabbisogni, temperature interne e carichi sensibili/latenti.

## Licenza

© 2026 Marius Grosu — distribuito con licenza **MIT** (vedi [LICENSE](LICENSE)). Puoi usarlo, anche per lavoro, modificarlo e condividerlo, mantenendo il nome dell’autore e questa licenza.

Il programma è fornito "così com’è", senza garanzie. I risultati di dimensionamento, diagnosi e registro F-gas sono stime tecniche da verificare: la responsabilità delle scelte di progetto, dell’installazione e della tenuta dei registri resta di chi lo usa.

Componenti di terzi inclusi: caratteri Inter, Barlow Semi Condensed e JetBrains Mono (SIL Open Font License 1.1, `hvac_sizing/www/fonts/LICENSE-OFL.txt`); jsQR (Apache License 2.0, `hvac_sizing/www/vendor/jsqr-LICENSE.txt`).

### Lizenz (Deutsch)

© 2026 Marius Grosu — unter der **MIT**-Lizenz veröffentlicht (siehe [LICENSE](LICENSE)). Nutzung, auch beruflich, Änderung und Weitergabe sind erlaubt, sofern Autorenname und Lizenz erhalten bleiben. Die Software wird „wie besehen“ ohne Gewährleistung bereitgestellt; Auslegungs-, Diagnose- und F-Gas-Ergebnisse sind zu prüfende technische Schätzungen, die Verantwortung liegt beim Anwender.
