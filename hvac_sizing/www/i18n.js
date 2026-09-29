(() => {
  const messages = {
    "Scarica PDF del calcolo": "Berechnungs-PDF herunterladen",
    "Apri PDF / stampa": "PDF öffnen / drucken",
    "Il PDF contiene i dati dell’ultimo calcolo riuscito. Dopo una modifica, ricalcola per aggiornarlo.": "Das PDF enthält die letzte erfolgreiche Berechnung. Nach Änderungen neu berechnen, um es zu aktualisieren.",
    "Proposta unità esterna": "Vorschlag Außeneinheit",
    "unità interne": "Innengeräte",
    "Freddo": "Kühlen",

    "Link di accesso da condividere": "Zugangslink zum Teilen",
    "Copia link": "Link kopieren",
    "Condividi": "Teilen",
    "Apri accesso": "Anmeldung öffnen",
    "Il link apre il login della app. Ogni utente entra con il proprio nome utente e password.": "Der Link öffnet die App-Anmeldung. Jeder Benutzer meldet sich mit eigenem Benutzernamen und Passwort an.",
    "Link copiato. Puoi incollarlo nel messaggio per l’utente.": "Link kopiert. Du kannst ihn in die Nachricht an den Benutzer einfügen.",
    "Seleziona e copia il link dal campo qui sopra.": "Link im obigen Feld markieren und kopieren.",
    "Accedi alla app con il tuo nome utente e la tua password.": "Melde dich mit deinem Benutzernamen und Passwort bei der App an.",

    "Utenti app": "App-Benutzer",
    "Amministratore": "Administrator",
    "Utente": "Benutzer",
    "Amministratore principale": "Hauptadministrator",
    "Configura external_url nelle opzioni dell’add-on.": "external_url in den Add-on-Optionen konfigurieren.",
    "Accesso non disponibile. Ricarica la pagina o accedi nuovamente.": "Zugriff nicht verfügbar. Seite neu laden oder erneut anmelden.",
    "Crea account": "Konto erstellen",
    "Modifica account": "Konto bearbeiten",
    "Attivo": "Aktiv",
    "Disattivato": "Deaktiviert",
    "Accesso completo": "Vollzugriff",
    "Consultazione": "Lesen",
    "Nessuna sezione abilitata": "Kein Bereich freigegeben",
    "Nessun account creato.": "Noch kein Konto erstellt.",
    "Account salvato. Le sessioni precedenti sono state revocate.": "Konto gespeichert. Bisherige Sitzungen wurden widerrufen.",
    "Chiedi all’amministratore di abilitare le sezioni del tuo account.": "Bitte den Administrator, Bereiche für dein Konto freizugeben.",
    "Account personali per l’accesso esterno. Gli amministratori hanno accesso completo; per gli utenti scegli le sezioni consentite. Gli operatori QR restano separati.": "Persönliche Konten für externen Zugriff. Administratoren haben Vollzugriff; für Benutzer die erlaubten Bereiche wählen. QR-Bediener bleiben getrennt.",
    "Accesso dall’esterno:": "Externer Zugriff:",
    "L’accesso tramite Home Assistant mantiene i privilegi amministrativi: condividi con gli utenti il collegamento esterno, non l’accesso Ingress.": "Der Zugriff über Home Assistant behält Administratorrechte: Benutzern den externen Link geben, nicht den Ingress-Zugang.",
    "Nuovo account": "Neues Konto",
    "Nome visualizzato": "Anzeigename",
    "Nome utente": "Benutzername",
    "Password": "Passwort",
    "Almeno 10 caratteri. In modifica lascia vuoto per mantenerla.": "Mindestens 10 Zeichen. Beim Bearbeiten leer lassen, um das Passwort beizubehalten.",
    "Ruolo": "Rolle",
    "Cosa può vedere e usare": "Sichtbare und nutzbare Bereiche",
    "Nascosto": "Ausgeblendet",
    "Consultazione / calcolo": "Lesen / berechnen",
    "Modifica / registra": "Bearbeiten / erfassen",
    "Consultazione: legge i dati e può eseguire calcoli senza salvare. Modifica: salva i progetti o registra bombole e movimenti. Cancellazione bombole, modifica dello storico e operatori QR restano agli amministratori. Diagnosi e vuoto sono strumenti locali, senza dati condivisi da salvare.": "Lesen: Daten ansehen und ohne Speichern berechnen. Bearbeiten: Projekte speichern oder Flaschen und Bewegungen erfassen. Flaschenlöschung, Verlaufsänderungen und QR-Bediener bleiben Administratoren vorbehalten. Diagnose und Vakuum sind lokale Werkzeuge ohne gemeinsame gespeicherte Daten.",
    "Il permesso su una sezione comprende tutti i progetti o tutte le bombole di quella sezione.": "Die Bereichsfreigabe umfasst alle Projekte oder Flaschen dieses Bereichs.",
    "Account attivo": "Konto aktiv",
    "Salva account": "Konto speichern",
    "Account esistenti": "Vorhandene Konten",
    "La password deve contenere da 10 a 128 caratteri": "Das Passwort muss 10 bis 128 Zeichen enthalten",
    "Account non trovato": "Konto nicht gefunden",
    "Nome utente: da 3 a 60 caratteri, lettere, numeri, punto, trattino o underscore": "Benutzername: 3 bis 60 Zeichen, Buchstaben, Ziffern, Punkt, Bindestrich oder Unterstrich",
    "Ruolo o permessi non validi": "Ungültige Rolle oder Berechtigungen",
    "Permessi non validi": "Ungültige Berechtigungen",
    "Deve rimanere almeno un account amministratore attivo": "Mindestens ein aktives Administratorkonto muss erhalten bleiben",
    "Nome utente già utilizzato": "Benutzername bereits vergeben",
    "Non hai il permesso per questa operazione": "Keine Berechtigung für diesen Vorgang",
    "Credenziali non valide o account disattivato": "Ungültige Zugangsdaten oder deaktiviertes Konto",

    "Inserisci le misure del locale e completa le domande della modalità scelta. Controlla i dati e le ipotesi nel risultato.": "Raummaße eingeben und die Fragen des gewählten Modus beantworten. Daten und Annahmen im Ergebnis prüfen.",
    "Calcolo guidato": "Geführte Berechnung",
    "GUIDATO": "GEFÜHRT",
    "Temperatura desiderata in inverno °C": "Gewünschte Raumtemperatur im Winter °C",
    "Temperatura nella stanza quando riscaldi, non quella dell’aria in uscita.": "Raumtemperatur beim Heizen, nicht die Temperatur der ausströmenden Luft.",
    "Temperatura desiderata in estate °C": "Gewünschte Raumtemperatur im Sommer °C",
    "Temperatura nella stanza quando raffreschi.": "Raumtemperatur beim Kühlen.",
    "Superficie delle falde sopra il locale m²": "Dachschrägenfläche über dem Raum m²",
    "Somma delle superfici inclinate del tetto, lucernari compresi. Non coincide necessariamente con il pavimento.": "Summe der geneigten Dachflächen einschließlich Dachfenster. Nicht unbedingt gleich der Bodenfläche.",
    "Da scegliere": "Bitte auswählen",
    "Esterno": "Außenluft",
    "Stanza alla stessa temperatura": "Raum mit gleicher Temperatur",
    "Locale non riscaldato": "Unbeheizter Raum",
    "1. Comfort e isolamento": "1. Komfort und Dämmung",
    "Isolamento della casa": "Gebäudedämmung",
    "Non so": "Unbekannt",
    "Buono — cappotto e isolamento continuo": "Gut — durchgehende Außendämmung",
    "Medio — isolamento parziale": "Mittel — teilweise gedämmt",
    "Scarso — senza isolamento": "Schlecht — ungedämmt",
    "Scegli lo stato effettivo. I valori tecnici vengono stimati e mostrati nel risultato.": "Tatsächlichen Zustand wählen. Technische Werte werden geschätzt und im Ergebnis angezeigt.",
    "2. Pareti esterne e interne": "2. Außen- und Innenwände",
    "Per un locale rettangolare: A e C sono i lati della lunghezza; B e D quelli della larghezza. Indica cosa c’è oltre ogni parete. Le finestre saranno sottratte automaticamente.": "Für rechteckige Räume: A und C sind die Längsseiten, B und D die Breitseiten. Wähle, was an jede Wand angrenzt. Fenster werden automatisch abgezogen.",
    "Parete": "Wand",
    "Pareti esterne": "Außenwände",
    "Pareti interne": "Innenwände",
    "3. Mansarda, sopra e sotto": "3. Dachgeschoss, darüber und darunter",
    "La stanza è una mansarda?": "Liegt der Raum direkt unter dem Schrägdach?",
    "No": "Nein",
    "Sì — direttamente sotto le falde del tetto": "Ja — direkt unter den Dachschrägen",
    "Cosa c’è sopra?": "Was befindet sich darüber?",
    "Scegli “Esterno” se sopra c’è un tetto piano o un terrazzo.": "Bei Flachdach oder Dachterrasse „Außenluft“ wählen.",
    "Cosa c’è sotto?": "Was befindet sich darunter?",
    "Terreno": "Erdreich",
    "Per cantina o garage non riscaldati scegli “Locale non riscaldato”.": "Bei unbeheiztem Keller oder Garage „Unbeheizter Raum“ wählen.",
    "4. Finestre e vetri": "4. Fenster und Verglasung",
    "Quante finestre o portefinestre?": "Wie viele Fenster oder Fenstertüren?",
    "0 se assenti. Compila le misure di ciascuna finestra, telaio compreso.": "0 wenn keine vorhanden sind. Maße jedes Fensters einschließlich Rahmen eingeben.",
    "Finestra": "Fenster",
    "Larghezza cm": "Breite cm",
    "Altezza cm": "Höhe cm",
    "Tipo di vetro": "Verglasungsart",
    "Singolo": "Einfachverglasung",
    "Doppio — vecchio o tipo non noto": "Zweifach — alt oder Typ unbekannt",
    "Doppio basso emissivo": "Zweifach-Wärmeschutzverglasung",
    "Triplo": "Dreifachverglasung",
    "Due lastre non significano automaticamente vetro basso emissivo.": "Zwei Scheiben bedeuten nicht automatisch Wärmeschutzverglasung.",
    "Esposizione": "Ausrichtung",
    "Protezione dal sole in estate": "Sonnenschutz im Sommer",
    "Nessuna / protezione aperta": "Keiner / Sonnenschutz offen",
    "Tapparella o tenda esterna chiusa al sole": "Rollladen oder Außenmarkise bei Sonne geschlossen",
    "Se la protezione resta aperta, scegli “Nessuna / protezione aperta”.": "Bleibt der Sonnenschutz offen, „Keiner / Sonnenschutz offen“ wählen.",
    "Posizione finestra": "Fensterposition",
    "Sulla parete esterna": "In der Außenwand",
    "Lucernario sul tetto": "Dachfenster",
    "5. Persone e apparecchi accesi": "5. Personen und eingeschaltete Geräte",
    "Risultato indicativo basato sui dati inseriti e sulle seguenti ipotesi:": "Unverbindliche Schätzung auf Grundlage der Eingaben und folgender Annahmen:",
    "Mostra dati e coefficienti usati": "Verwendete Daten und Koeffizienten anzeigen",
    "Altezza media m": "Mittlere Raumhöhe m",
    "Rispondi alle domande del locale. Il calcolo stima i coefficienti e mostra le ipotesi nel risultato. Non servono W/m³.": "Beantworte die Fragen zum Raum. Die Berechnung schätzt die Koeffizienten und zeigt ihre Annahmen im Ergebnis. Keine W/m³-Eingabe nötig.",
    "Inserisci da 0 a 30 finestre.": "Zwischen 0 und 30 Fenster eingeben.",
    "I valori esterni sono esempi da verificare per la località, non il meteo di oggi. Nel calcolo guidato scegli le temperature interne in ogni stanza.": "Die Außenwerte sind örtlich zu prüfende Beispiele, nicht das heutige Wetter. Im geführten Modus wird die Innentemperatur je Raum gewählt.",
    "Pareti esterne nette m²": "Netto-Außenwandfläche m²",
    "Temperatura interna invernale °C": "Raumtemperatur Winter °C",
    "Temperatura interna estiva °C": "Raumtemperatur Sommer °C",
    "U finestre medio W/m²K": "Mittlerer Fenster-U-Wert W/m²K",
    "Tetto verso esterno m²": "Dachfläche zur Außenluft m²",
    "Ricambi aria vol/h": "Luftwechsel pro Stunde",
    "Apporto solare finestre W": "Solarer Fenstereintrag W",
    "Stima guidata: isolamento e vetri usano valori indicativi, non misurati. Non è un calcolo normativo.": "Geführte Schätzung: Dämmung und Verglasung verwenden Richtwerte, keine Messwerte. Keine normgerechte Berechnung.",
    "La località non imposta automaticamente il clima: verifica le temperature esterne di progetto.": "Der Ort stellt das Klima nicht automatisch ein: Auslegungs-Außentemperaturen prüfen.",
    "Ricambio aria assunto 0,5 vol/h; umidità dai dati del clima. Ponti termici e inerzia non modellati.": "Angenommener Luftwechsel 0,5/h; Feuchte aus Klimadaten. Wärmebrücken und thermische Trägheit nicht modelliert.",
    "Sole sulle finestre stimato per esposizione; non è una simulazione oraria. Non sommare i picchi come se fossero simultanei.": "Fenstersonneneintrag nach Ausrichtung geschätzt; keine stündliche Simulation. Spitzen nicht als gleichzeitig auftretend addieren.",
    "Sono presenti dati sconosciuti: verifica le ipotesi nei dettagli prima di scegliere la macchina.": "Unbekannte Daten vorhanden: Annahmen in den Details vor der Geräteauswahl prüfen.",
    "Locali non riscaldati ipotizzati a 12 °C in inverno e 28 °C in estate; U pareti interne 1,5 W/m²K.": "Unbeheizte Räume mit 12 °C im Winter und 28 °C im Sommer angenommen; Innenwand-U-Wert 1,5 W/m²K.",
    "Terreno ipotizzato a 10 °C in inverno e 18 °C in estate: stima semplificata, senza modello del terreno.": "Erdreich mit 10 °C im Winter und 18 °C im Sommer angenommen: vereinfachte Schätzung ohne Erdreichmodell.",
    "Tetto: incremento estivo equivalente di 10 °C per il sole; superficie reale delle falde e isolamento da verificare.": "Dach: äquivalenter sommerlicher Temperaturzuschlag von 10 °C für Sonne; tatsächliche Dachflächen und Dämmung prüfen.",
    "Completa i dati richiesti del locale e del clima.": "Erforderliche Raum- und Klimadaten vervollständigen.",
    "Controlla misure, temperature e quantità: valore fuori intervallo.": "Maße, Temperaturen und Mengen prüfen: Wert außerhalb des Bereichs.",
    "Indica cosa c’è oltre ciascuna delle quattro pareti.": "Angrenzung für jede der vier Wände auswählen.",
    "Indica se è una mansarda e cosa c’è sopra e sotto.": "Dachgeschoss sowie Angrenzung oben und unten angeben.",
    "Seleziona lo stato di isolamento.": "Dämmzustand auswählen.",
    "Controlla il numero di finestre (massimo 30).": "Fensterzahl prüfen (maximal 30).",
    "Controlla tipo di vetro, esposizione e schermatura delle finestre.": "Verglasung, Ausrichtung und Sonnenschutz prüfen.",
    "Per i lucernari seleziona mansarda.": "Für Dachfenster Dachgeschoss auswählen.",
    "La superficie delle finestre supera quella delle pareti esterne o del tetto.": "Fensterfläche überschreitet Außenwand- oder Dachfläche.",

    "Com’è isolato il locale?": "Wie ist der Raum gedämmt?",
    "Considera pareti e tetto. Sono categorie indicative, non classi energetiche. Se non sai, scegli “Non so”: non viene applicata una correzione.": "Berücksichtige Wände und Dach. Dies sind grobe Kategorien, keine Energieklassen. Bei Unkenntnis „Unbekannt“ wählen: Es wird keine Korrektur angewandt.",
    "Non so — nessuna correzione": "Unbekannt — keine Korrektur",
    "Ben isolato — cappotto e tetto isolato": "Gut gedämmt — Außenwände und Dach gedämmt",
    "Isolamento intermedio": "Mittlere Dämmung",
    "Poco isolato — pareti e tetto non isolati": "Wenig gedämmt — Wände und Dach ungedämmt",
    "Quante superfici vetrate ci sono?": "Wie groß sind die Glasflächen?",
    "Considera quanto spazio occupano i vetri sulle pareti esterne. Conta la superficie, non il numero di finestre. Questa scelta riguarda il raffrescamento.": "Betrachte den Glasanteil an den Außenwänden. Entscheidend ist die Fläche, nicht die Fensterzahl. Diese Auswahl betrifft die Kühlung.",
    "Poche o nessuna — piccole finestre": "Wenig oder keine — kleine Fenster",
    "Intermedie — parte della parete": "Mittel — ein Teil der Wand",
    "Molte — grandi vetrate o pareti di vetro": "Viel — große Glasflächen oder Glaswände",
    "Potenza extra (margine)": "Zusätzliche Leistung (Reserve)",
    "Riserva aggiunta al risultato: con +10%, 3 kW diventano 3,3 kW. Non sostituisce i dati mancanti.": "Reserve zusätzlich zum Ergebnis: Mit +10 % werden aus 3 kW 3,3 kW. Sie ersetzt keine fehlenden Daten.",
    "Nessuna riserva — 0%": "Keine Reserve — 0 %",
    "Valore applicato / modifica manuale": "Angewandter Wert / manuell ändern",
    "Caratteristiche del locale": "Raumeigenschaften",
    "Le scelte applicano correzioni indicative della stima rapida. Puoi vedere e modificare ogni valore nei dettagli. I dati sconosciuti restano da verificare.": "Die Auswahl wendet grobe Korrekturen auf die Schnellschätzung an. Alle Werte sind in den Details sichtbar und änderbar. Unbekannte Angaben müssen noch geprüft werden.",
    "Persone, luci e apparecchi": "Personen, Beleuchtung und Geräte",
    "Impostazioni avanzate — potenza di base": "Erweiterte Einstellungen — Basisleistung",
    "Per iniziare sono precompilati 35 W/m³ per raffreddare e 40 W/m³ per scaldare. Sono ipotesi di partenza da verificare, non valori adatti a ogni edificio. I progetti già salvati conservano i loro valori.": "Als Startwerte sind 35 W/m³ zum Kühlen und 40 W/m³ zum Heizen eingetragen. Diese Annahmen müssen geprüft werden und passen nicht zu jedem Gebäude. Gespeicherte Projekte behalten ihre Werte.",
    "Aggiungi il 5%": "5 % hinzufügen",
    "Aggiungi il 10%": "10 % hinzufügen",
    "Aggiungi il 15%": "15 % hinzufügen",
    "Aggiungi il 20%": "20 % hinzufügen",

    "Non so / più esposizioni": "Unbekannt / mehrere Ausrichtungen",
    "Nord": "Nord",
    "Nord-est": "Nordost",
    "Est": "Ost",
    "Sud-est": "Südost",
    "Sud": "Süd",
    "Sud-ovest": "Südwest",
    "Ovest": "West",
    "Nord-ovest": "Nordwest",
    "Valore manuale / progetto precedente": "Manueller Wert / bisheriges Projekt",
    "Esposizione delle finestre": "Fensterausrichtung",
    "Verso dove guardano le finestre principali? Puoi usare la bussola del telefono. Se sono su più lati, scegli “Non so / più esposizioni”.": "In welche Richtung zeigen die Hauptfenster? Nutze den Handykompass. Bei mehreren Seiten wähle „Unbekannt / mehrere Ausrichtungen“.",
    "La scelta applica una correzione indicativa della stima rapida, non un calcolo del sole reale. Ombre, località e superficie dei vetri possono cambiare il risultato.": "Die Auswahl korrigiert die Schnellschätzung näherungsweise, sie berechnet keine tatsächliche Sonneneinstrahlung. Schatten, Standort und Glasfläche können das Ergebnis ändern.",
    "Correzione applicata / modifica manuale": "Angewandte Korrektur / manuell ändern",
    "1 = nessuna correzione; 1,10 = +10% sulla quota di base estiva. Con ombreggiamento o condizioni particolari, verifica il valore manualmente.": "1 = keine Korrektur; 1,10 = +10 % auf den sommerlichen Basisanteil. Bei Verschattung oder besonderen Bedingungen den Wert manuell prüfen.",

    "Misura interna del locale in metri, es. 5. Non lasciare 0.": "Innenlänge des Raums in Metern, z. B. 5. Nicht 0 lassen.",
    "Misura interna in metri, es. 4. Lunghezza × larghezza dà i m². Non lasciare 0.": "Innenbreite in Metern, z. B. 4. Länge × Breite ergibt m². Nicht 0 lassen.",
    "Dal pavimento al soffitto in metri, es. 2,7. Non lasciare 0.": "Vom Boden bis zur Decke in Metern, z. B. 2,7. Nicht 0 lassen.",
    "Riserva aggiunta alla potenza: 10 = +10%; 0 = nessuna riserva.": "Zusätzliche Leistungsreserve: 10 = +10 %; 0 = keine Reserve.",
    "Potenza di base per ogni m³, prima dei fattori e dei carichi interni. 35 è un valore iniziale da verificare; 0 non significa “non so”.": "Basisleistung je m³ vor Faktoren und inneren Lasten. 35 ist ein zu prüfender Startwert; 0 bedeutet nicht „unbekannt“.",
    "Potenza di base in riscaldamento per ogni m³. 40 è un valore iniziale da verificare; non azzerare se il dato è sconosciuto.": "Heiz-Basisleistung je m³. 40 ist ein zu prüfender Startwert; bei unbekanntem Wert nicht auf 0 setzen.",
    "1 = nessuna correzione; sotto 1 riduce, sopra 1 aumenta la stima estiva e invernale. Non usare 0 per un dato sconosciuto.": "1 = keine Korrektur; unter 1 sinkt, über 1 steigt die Sommer- und Winterschätzung. Für unbekannte Werte nicht 0 verwenden.",
    "Correzione del raffrescamento per esposizione al sole: 1 = neutro, sopra 1 aumenta la stima. Non mettere 0 se non sai.": "Kühlkorrektur für Sonneneinstrahlung: 1 = neutral, über 1 erhöht die Schätzung. Bei Unkenntnis nicht 0 eingeben.",
    "Correzione del raffrescamento per le vetrate: 1 = neutro. Anche senza finestre non mettere 0: annullerebbe tutta la quota di base.": "Kühlkorrektur für Glasflächen: 1 = neutral. Auch ohne Fenster nicht 0 eingeben: Der gesamte Basisanteil würde entfallen.",
    "Numero di persone previste nel locale. 0 solo se non occupato.": "Vorgesehene Personenzahl im Raum. 0 nur bei ungenutztem Raum.",
    "Somma dei watt delle luci: es. 5 lampade da 10 W = 50 W. 0 se assenti o spente. Nel metodo professionale applica anche il fattore di uso.": "Watt aller Leuchten addieren: z. B. 5 × 10 W = 50 W. 0 bei fehlender/ausgeschalteter Beleuchtung. Im Fachmodus zusätzlich den Nutzungsfaktor anwenden.",
    "Watt assorbiti da PC, TV e altre apparecchiature che scaldano il locale. Escludi il climatizzatore. 0 se assenti o spente.": "Aufnahmeleistung von PC, TV und anderen Geräten, die den Raum erwärmen. Klimagerät ausschließen. 0 bei fehlenden/ausgeschalteten Geräten.",
    "Somma delle pareti verso esterno: lunghezza × altezza, togliendo finestre e porte già conteggiate a parte. 0 se assenti.": "Außenwandflächen addieren: Länge × Höhe, separat erfasste Fenster und Türen abziehen. 0 wenn nicht vorhanden.",
    "Superficie totale delle finestre verso esterno in m². 0 se non ci sono finestre.": "Gesamte Außenfensterfläche in m². 0 wenn keine Fenster vorhanden sind.",
    "Superficie del soffitto/tetto esposta verso esterno. 0 se sopra c’è un locale alla stessa temperatura.": "Decken-/Dachfläche zur Außenluft. 0 bei einem Raum mit gleicher Temperatur darüber.",
    "Superficie del pavimento verso esterno. 0 verso un locale alla stessa temperatura. Il modello non distingue il terreno dall’aria esterna.": "Bodenfläche nach außen. 0 zu einem Raum mit gleicher Temperatur. Das Modell unterscheidet Erdreich nicht von Außenluft.",
    "Sole incidente sulle finestre nelle condizioni di progetto. 0 solo se escludi questo apporto; il valore iniziale è da verificare.": "Sonneneinstrahlung auf Fenster im Auslegungsfall. 0 nur zum Ausschluss dieses Beitrags; Startwert prüfen.",
    "Quota di sole che attraversa il vetro, da scheda tecnica: 0,55 = 55%. Non mettere 0 se sconosciuta; senza finestre azzera i m².": "Solardurchlass laut Glasdatenblatt: 0,55 = 55 %. Bei Unkenntnis nicht 0 setzen; ohne Fenster die m² auf 0 setzen.",
    "1 = nessuna riduzione; 0,7 = resta il 70% del sole; 0 = apporto solare escluso.": "1 = keine Reduktion; 0,7 = 70 % der Sonne verbleiben; 0 = Solarbeitrag ausgeschlossen.",
    "Ricambi d’aria per fessure/aperture ogni ora. 0 esclude le infiltrazioni. Non contare qui aria già inserita in “Aria esterna”.": "Luftwechsel pro Stunde durch Fugen/Öffnungen. 0 schließt Infiltration aus. Bereits als Außenluft erfasste Luft nicht doppelt zählen.",
    "Portata aggiuntiva di aria esterna immessa, non ricircolo. 0 se assente. Si somma alle infiltrazioni; il recupero di calore non è modellato.": "Zusätzlicher Außenluftstrom, keine Umluft. 0 wenn nicht vorhanden. Wird zur Infiltration addiert; Wärmerückgewinnung wird nicht modelliert.",
    "Quota di persone presenti insieme: 1 = tutte; 0,5 = metà; 0 = nessuna.": "Gleichzeitig anwesender Anteil: 1 = alle; 0,5 = die Hälfte; 0 = niemand.",
    "Calore per persona che aumenta la temperatura. Valore iniziale 75 W da verificare per l’attività. Se nessuno è presente, azzera “Persone”.": "Wärme je Person, die die Temperatur erhöht. Startwert 75 W passend zur Tätigkeit prüfen. Ohne Personen die Personenzahl auf 0 setzen.",
    "Calore legato all’umidità prodotta da una persona. Valore iniziale 55 W da verificare; 0 esclude questo contributo.": "Wärme durch Feuchteabgabe je Person. Startwert 55 W prüfen; 0 schließt diesen Beitrag aus.",
    "Quota delle luci accese insieme: 1 = tutte; 0,5 = metà; 0 = spente.": "Gleichzeitig eingeschalteter Beleuchtungsanteil: 1 = alle; 0,5 = die Hälfte; 0 = aus.",
    "Quota di utilizzo delle apparecchiature: 1 = pieno carico; 0,5 = metà; 0 = spente.": "Gerätenutzungsanteil: 1 = volle Last; 0,5 = halbe Last; 0 = aus.",
    "Trasmittanza U da scheda tecnica o stratigrafia: più bassa = più isolamento. Se l’elemento manca, metti 0 nella superficie, non qui.": "U-Wert aus Datenblatt oder Bauteilaufbau: niedriger = bessere Dämmung. Fehlt das Bauteil, seine Fläche auf 0 setzen, nicht diesen Wert.",
    "Temperatura esterna estiva di progetto della località, non quella letta oggi. 0 significa davvero 0 °C.": "Sommerliche Auslegungs-Außentemperatur des Orts, nicht die heutige Temperatur. 0 bedeutet tatsächlich 0 °C.",
    "Temperatura desiderata nel locale in estate, es. 26 °C. Non azzerare per saltare il campo.": "Gewünschte Raumtemperatur im Sommer, z. B. 26 °C. Zum Überspringen nicht 0 eingeben.",
    "Umidità relativa esterna associata alle condizioni estive. 50 = 50%; 0 indica aria completamente secca, non dato mancante.": "Relative Außenfeuchte bei den Sommerbedingungen. 50 = 50 %; 0 bedeutet völlig trockene Luft, keinen fehlenden Wert.",
    "Umidità relativa desiderata all’interno, es. 50%. Serve al carico di deumidificazione. 0 non significa “non so”.": "Gewünschte relative Innenfeuchte, z. B. 50 %. Für die Entfeuchtungslast. 0 bedeutet nicht „unbekannt“.",
    "Temperatura esterna invernale di progetto della località. Può essere negativa; 0 è valido solo se il dato è 0 °C.": "Winterliche Auslegungs-Außentemperatur des Orts. Negative Werte sind möglich; 0 nur bei tatsächlichen 0 °C.",
    "Temperatura desiderata nel locale in inverno, es. 20 °C. Non azzerare per saltare il campo.": "Gewünschte Raumtemperatur im Winter, z. B. 20 °C. Zum Überspringen nicht 0 eingeben.",
    "Come compilare": "So ausfüllen",
    "1. Inserisci le misure reali del locale. 2. Indica persone, luci e apparecchiature. 3. Controlla i coefficienti prima di calcolare.": "1. Tatsächliche Raummaße eingeben. 2. Personen, Leuchten und Geräte erfassen. 3. Koeffizienten vor der Berechnung prüfen.",
    "0 = assente, solo dove indicato. Nei fattori rapidi 1 = nessuna correzione. Un dato sconosciuto non va azzerato.": "0 = nicht vorhanden, nur wo angegeben. Bei Schnellfaktoren gilt 1 = keine Korrektur. Unbekannte Werte nicht auf 0 setzen.",
    "Calcolo rapido: stima iniziale con coefficienti indicativi da verificare per il locale.": "Schnellberechnung: erste Schätzung mit für den Raum zu prüfenden Richtkoeffizienten.",
    "Calcolo professionale: verifica clima, superfici e dati tecnici. Le superfici usano la temperatura esterna; ambienti confinanti a temperature diverse richiedono una valutazione specifica.": "Fachberechnung: Klima, Flächen und technische Daten prüfen. Flächen verwenden die Außentemperatur; angrenzende Räume mit anderen Temperaturen erfordern eine gesonderte Bewertung.",

    'Dimensionamento Climatizzazione Pro': 'Klimaanlagen-Dimensionierung Pro',
    'HVAC · CARICHI TERMICI · COLLAUDO': 'HVAC · KÜHLLAST · INBETRIEBNAHME',
    'Dimensionamento Climatizzazione': 'Klimaanlagen-Dimensionierung', 'Dimensionamento': 'Auslegung', 'Disconnetti': 'Abmelden',
    'Bombole': 'Flaschen', 'Diagnosi': 'Diagnose', 'Vuoto': 'Vakuum', 'Nuovo': 'Neu', 'Progetti': 'Projekte', 'Salva': 'Speichern',
    'Nome progetto': 'Projektname', 'Nuovo impianto': 'Neue Anlage', 'Cliente': 'Kunde', 'Nome o ragione sociale': 'Name oder Firma', 'Località': 'Ort', 'Città': 'Stadt',
    'Metodo di calcolo': 'Berechnungsmethode', 'Calcolo rapido': 'Schnellberechnung', 'Calcolo professionale': 'Fachberechnung',
    'MAGAZZINO REFRIGERANTE': 'KÄLTEMITTELLAGER', 'Bombole e quantità residue': 'Flaschen und Restmengen', 'PDF magazzino': 'Lager-PDF', 'Stampa schede': 'Datenblätter drucken', '+ Nuova bombola': '+ Neue Flasche',
    'Operatori QR': 'QR-Bediener', 'ACCESSI QR': 'QR-ZUGÄNGE', 'Operatori autorizzati': 'Autorisierte Bediener', 'Solo gli operatori attivi possono visualizzare il registro dopo avere inserito nome e PIN. Ogni operazione viene registrata con il loro nome.': 'Nur aktive Bediener können das Register nach Eingabe von Name und PIN sehen. Jeder Vorgang wird unter ihrem Namen protokolliert.', 'Nome operatore': 'Name des Bedieners', 'PIN personale': 'Persönliche PIN', 'es. Mario Rossi': 'z. B. Mario Rossi', 'Minimo 4 caratteri': 'Mindestens 4 Zeichen', 'Aggiungi operatore': 'Bediener hinzufügen', 'Elenco operatori': 'Bedienerliste', 'operatore': 'Bediener', 'operatori': 'Bediener', 'ATTIVO': 'AKTIV', 'DISATTIVATO': 'DEAKTIVIERT', 'Può accedere dai QR': 'QR-Zugriff erlaubt', 'Accesso revocato': 'Zugriff widerrufen', 'Disattiva': 'Deaktivieren', 'Attiva': 'Aktivieren', 'Cambia PIN': 'PIN ändern', 'Nessun operatore autorizzato.': 'Keine autorisierten Bediener.', 'Inserisci il nuovo PIN personale': 'Neue persönliche PIN eingeben', 'Eliminare operatore': 'Bediener löschen',
    'Cerca bombola': 'Flasche suchen', 'Nome, codice o refrigerante': 'Name, Code oder Kältemittel', 'Bombole registrate': 'Erfasste Flaschen',
    'DIAGNOSI PRESTAZIONI': 'LEISTUNGSDIAGNOSE', 'Controllo tecnico macchina in funzione': 'Technische Prüfung im Betrieb', 'Diagnosi professionale': 'Fachdiagnose',
    "Inserisci solo i dati realmente misurabili sulla macchina. L'assistente distingue gli split con una sola presa di servizio dai sistemi con bassa e alta accessibili e non diagnostica la carica da una sola pressione.": 'Gib nur tatsächlich an der Anlage messbare Werte ein. Der Assistent unterscheidet Splitgeräte mit nur einem Serviceanschluss von Systemen mit zugänglicher Nieder- und Hochdruckseite und beurteilt die Füllmenge nicht anhand nur eines Druckwerts.',
    'Macchina e condizioni di prova': 'Anlage und Prüfbedingungen', 'Accesso frigorifero': 'Kältekreis-Zugang', 'Split normale · solo bassa pressione': 'Normales Splitgerät · nur Niederdruck', 'Bassa + alta pressione accessibili': 'Nieder- und Hochdruck zugänglich',
    'Refrigerante': 'Kältemittel', 'Modalità': 'Betriebsart', 'Raffrescamento': 'Kühlen', 'Riscaldamento': 'Heizen', 'Tipo compressore': 'Verdichtertyp',
    'Tempo stabilizzazione min': 'Stabilisierungszeit min', 'Temperatura esterna °C': 'Außentemperatur °C', 'Temperatura ambiente/ritorno °C': 'Raum-/Rücklufttemperatur °C', 'Umidità ambiente %': 'Raumfeuchte %', 'Temperatura aria uscita unità interna °C': 'Zulufttemperatur Innengerät °C',
    'Valori frigoriferi e tubazioni': 'Kältekreis- und Rohrleitungswerte', 'Bassa pressione bar(g)': 'Niederdruck bar(g)', 'lettura manometri': 'Manometerwert', 'Temperatura evaporazione sat. °C': 'Sättigungs-Verdampfungstemperatur °C', 'lettura Testo': 'Messwert', 'Temperatura tubo aspirazione °C': 'Saugleitungstemperatur °C', 'pinza temperatura': 'Temperaturfühler',
    'Alta pressione bar(g)': 'Hochdruck bar(g)', 'Temperatura condensazione sat. °C': 'Sättigungs-Verflüssigungstemperatur °C', 'Temperatura tubo liquido °C': 'Flüssigkeitsleitungstemperatur °C', 'Temperatura mandata compressore °C': 'Verdichter-Austrittstemperatur °C', 'opzionale': 'optional', 'Corrente compressore A': 'Verdichterstrom A', 'Corrente nominale/riferimento A': 'Nenn-/Referenzstrom A', 'targa/manuale': 'Typenschild/Handbuch',
    'Filtri e batteria interna puliti': 'Filter und Innenwärmetauscher sauber', 'Batteria esterna pulita e ventilazione libera': 'Außenwärmetauscher sauber und Luftweg frei', 'Ventola interna alta durante il test': 'Hohe Innenlüfterstufe während der Prüfung', 'Analizza funzionamento': 'Betrieb analysieren', 'Azzera prova': 'Prüfung zurücksetzen',
    'Metodo:': 'Methode:', "con una sola presa di servizio la diagnosi usa soprattutto ΔT aria, temperatura di evaporazione, surriscaldamento, condizioni ambiente e assorbimento. L'assenza dell'alta non viene trattata come errore. Su inverter/EEV i dati vanno interpretati a macchina stabilizzata e le specifiche del costruttore prevalgono sempre.": 'Bei nur einem Serviceanschluss stützt sich die Diagnose vor allem auf Luft-ΔT, Verdampfungstemperatur, Überhitzung, Umgebungsbedingungen und Stromaufnahme. Ein fehlender Hochdruckwert gilt nicht als Fehler. Bei Inverter/EEV sind die Werte an der stabilisierten Anlage auszuwerten; die Herstellervorgaben haben immer Vorrang.',
    'VUOTO E MESSA IN SERVIZIO': 'VAKUUM UND INBETRIEBNAHME', 'Diagnosi evacuazione impianto': 'Diagnose der Evakuierung', 'Assistente tecnico': 'Technischer Assistent', 'Condizione impianto': 'Anlagenzustand', 'Nuovo / asciutto': 'Neu / trocken', 'Già funzionato / presenza olio': 'Bereits betrieben / Öl vorhanden', "Rimasto aperto all'atmosfera": 'Zur Atmosphäre offen gewesen',
    'Frusta principale': 'Hauptschlauch', '1/4" standard': '1/4" Standard', '3/8" vuoto': '3/8" Vakuum', '1/2" alto flusso': '1/2" Hochdurchfluss', 'Tempo evacuazione min': 'Evakuierungszeit min', 'Micron iniziali': 'Startwert Mikron', 'Micron attuali': 'Aktueller Wert Mikron', 'Test risalita - inizio micron': 'Anstiegstest – Start Mikron', 'Test risalita - fine micron': 'Anstiegstest – Ende Mikron', 'Durata test risalita min': 'Dauer Anstiegstest min',
    'Valvola a spillo rimossa': 'Ventileinsatz entfernt', 'Prova tenuta con azoto superata': 'Dichtheitsprüfung mit Stickstoff bestanden', 'Olio pompa nuovo / pulito': 'Pumpenöl neu / sauber', 'Analizza il vuoto': 'Vakuum analysieren', 'Azzera test': 'Test zurücksetzen',
    'Sicurezza:': 'Sicherheit:', 'azoto secco solo con riduttore. Non immettere azoto mentre la pompa del vuoto sta aspirando. Isola la pompa, rompi il vuoto con azoto, poi evacua di nuovo.': 'Trockenen Stickstoff nur mit Druckminderer verwenden. Keinen Stickstoff einleiten, während die Vakuumpumpe absaugt. Pumpe absperren, Vakuum mit Stickstoff brechen und anschließend erneut evakuieren.',
    'CONDIZIONI DI PROGETTO': 'AUSLEGUNGSBEDINGUNGEN', 'Clima interno ed esterno': 'Innen- und Außenklima', 'Estate esterna °C': 'Sommer außen °C', 'U.R. esterna %': 'Außenfeuchte %', 'Estate interna °C': 'Sommer innen °C', 'U.R. interna %': 'Innenfeuchte %', 'Inverno esterna °C': 'Winter außen °C', 'Inverno interna °C': 'Winter innen °C',
    'LOCALI': 'RÄUME', 'Dati per il calcolo': 'Berechnungsdaten', '+ Aggiungi locale': '+ Raum hinzufügen', 'I risultati restano separati per ogni ambiente': 'Die Ergebnisse bleiben je Raum getrennt', 'Calcola potenze': 'Leistung berechnen',
    'Progetti salvati': 'Gespeicherte Projekte', 'Chiudi': 'Schließen', 'Registra nuova bombola': 'Neue Flasche erfassen', 'Nome bombola': 'Flaschenname', 'es. R32 nuova 01': 'z. B. R32 neu 01', 'Codice identificativo': 'Kenncode', 'es. R32-001': 'z. B. R32-001', 'Tara bombola kg': 'Flaschen-Tara kg', 'Gas refrigerante presente kg': 'Vorhandenes Kältemittel kg', 'es. 2,500': 'z. B. 2,500', 'Peso totale calcolato kg': 'Berechnetes Gesamtgewicht kg', 'tara + gas': 'Tara + Kältemittel', 'Capacità refrigerante kg (opzionale)': 'Kältemittelkapazität kg (optional)', 'Peso totale automatico': 'Automatisches Gesamtgewicht', 'Tara + gas refrigerante presente': 'Tara + vorhandenes Kältemittel', 'Note': 'Notizen', 'Marca, numero di serie, proprietà…': 'Marke, Seriennummer, Eigentümer …', 'Salva bombola e crea QR': 'Flasche speichern und QR erstellen',
    'Bombola': 'Flasche', 'Registra movimento': 'Vorgang erfassen', 'Operazione': 'Vorgang', 'Pesatura bombola': 'Flasche wiegen', 'Prelievo refrigerante': 'Kältemittel entnehmen', 'Aggiunta refrigerante': 'Kältemittel hinzufügen', 'Peso totale sulla bilancia kg': 'Gesamtgewicht auf der Waage kg', 'Quantità refrigerante kg': 'Kältemittelmenge kg', 'Note / impianto / cliente': 'Notizen / Anlage / Kunde',
    'Dati macchina e impatto climatico': 'Anlagendaten und Klimawirkung', 'Marca macchina': 'Anlagenhersteller', 'Modello macchina': 'Anlagenmodell', 'Matricola / numero di serie': 'Seriennummer', 'Carica macchina di targa kg': 'Nennfüllmenge der Anlage kg', 'GWP refrigerante': 'GWP des Kältemittels', 'Gas disperso / perdita stimata kg (opzionale)': 'Ausgetretenes Gas / geschätzter Verlust kg (optional)', 'Gas movimentato': 'Bewegte Gasmenge', 'Carica macchina': 'Anlagenfüllung', 'Emissione stimata': 'Geschätzte Emission',
    'QR code bombola': 'QR-Code der Flasche', 'QR code della bombola': 'QR-Code der Flasche', 'Scansionandolo si apre direttamente questa scheda.': 'Beim Scannen öffnet sich dieses Datenblatt direkt.', 'Download PNG non riuscito. Aggiorna e riavvia l’add-on.': 'PNG-Download fehlgeschlagen. Add-on aktualisieren und neu starten.', 'Il server non ha restituito un PNG. Aggiorna e riavvia l’add-on.': 'Der Server hat kein PNG geliefert. Add-on aktualisieren und neu starten.', 'Scarica QR': 'QR herunterladen', 'Scarica QR in PNG': 'QR als PNG herunterladen', 'Stampa': 'Drucken', 'Revoca e rigenera QR': 'QR widerrufen und neu erstellen', 'SCHEDA A4': 'A4-DATENBLATT', 'Foglio completo della bombola': 'Vollständiges Flaschendatenblatt', 'Dati, quantità residua, QR code e storico movimenti.': 'Daten, Restmenge, QR-Code und Bewegungsverlauf.', 'Scarica PDF': 'PDF herunterladen', 'Stampa scheda': 'Datenblatt drucken', 'Storico movimenti': 'Bewegungsverlauf', 'Elimina bombola': 'Flasche löschen',
    'Gas residuo effettivo': 'Tatsächlicher Restinhalt', 'Peso totale calcolato': 'Berechnetes Gesamtgewicht', 'Capacità gas': 'Kältemittelkapazität', 'Registrazione iniziale': 'Ersterfassung', 'Pesatura': 'Wägung', 'Aggiunta': 'Zugabe', 'Prelievo': 'Entnahme', 'residuo': 'Restmenge', 'Nessun movimento registrato.': 'Keine Bewegung erfasst.', 'Modifica': 'Bearbeiten', 'MODIFICA REGISTRO': 'REGISTER BEARBEITEN', 'Correggi movimento': 'Vorgang korrigieren', 'La data e il nome dell’operatore restano invariati. Dopo il salvataggio vengono ricalcolati tutti i residui successivi.': 'Datum und Name des Bedieners bleiben unverändert. Nach dem Speichern werden alle nachfolgenden Restmengen neu berechnet.', 'Gas refrigerante iniziale kg': 'Anfängliches Kältemittel kg', 'Password amministratore per confermare': 'Administratorpasswort zur Bestätigung', 'La password non viene salvata.': 'Das Passwort wird nicht gespeichert.', 'ELIMINA MOVIMENTO': 'VORGANG LÖSCHEN', 'Conferma eliminazione': 'Löschen bestätigen', 'Il movimento verrà eliminato definitivamente e tutti i residui successivi saranno ricalcolati. La registrazione iniziale non può essere eliminata.': 'Der Vorgang wird endgültig gelöscht und alle nachfolgenden Restmengen werden neu berechnet. Die Ersterfassung kann nicht gelöscht werden.', 'Elimina movimento': 'Vorgang löschen', 'Movimento eliminato e residui ricalcolati': 'Vorgang gelöscht und Restmengen neu berechnet', 'Annulla': 'Abbrechen', 'Salva modifica': 'Änderung speichern', 'Amministratore': 'Administrator', 'Corretto dall’amministratore': 'Vom Administrator korrigiert',
    'Nessuna bombola corrisponde alla ricerca.': 'Keine Flasche entspricht der Suche.', 'Nessuna bombola registrata. Premi “Nuova bombola” per iniziare.': 'Keine Flasche erfasst. Drücke „Neue Flasche“, um zu beginnen.',
    'Coefficienti rapidi': 'Schnellkoeffizienten', 'Lunghezza m': 'Länge m', 'Larghezza m': 'Breite m', 'Altezza m': 'Höhe m', 'Margine %': 'Reserve %', 'Base raffrescamento W/m³': 'Basis Kühlen W/m³', 'Base riscaldamento W/m³': 'Basis Heizen W/m³', 'Fattore isolamento': 'Dämmfaktor', 'Fattore esposizione': 'Expositionsfaktor', 'Fattore vetrate': 'Verglasungsfaktor', 'Persone': 'Personen', 'Illuminazione W': 'Beleuchtung W', 'Apparecchiature W': 'Geräte W',
    'Involucro edilizio': 'Gebäudehülle', 'Pareti esterne m²': 'Außenwände m²', 'U pareti W/m²K': 'U-Wert Wände W/m²K', 'Finestre m²': 'Fenster m²', 'U finestre W/m²K': 'U-Wert Fenster W/m²K', 'Tetto/solaio m²': 'Dach/Decke m²', 'U tetto W/m²K': 'U-Wert Dach W/m²K', 'Pavimento m²': 'Boden m²', 'U pavimento W/m²K': 'U-Wert Boden W/m²K', 'Sole, aria e umidità': 'Sonne, Luft und Feuchte', 'Irradianza finestra W/m²': 'Sonneneinstrahlung Fenster W/m²', 'Fattore solare vetro g': 'Gesamtenergiedurchlassgrad g', 'Fattore schermatura': 'Verschattungsfaktor', 'Infiltrazioni vol/h': 'Infiltration 1/h', 'Aria esterna m³/h': 'Außenluft m³/h', 'Carichi interni': 'Interne Lasten', 'Contemporaneità persone': 'Anwesenheitsfaktor', 'Sensibile per persona W': 'Sensible Last je Person W', 'Latente per persona W': 'Latente Last je Person W', 'Illuminazione installata W': 'Installierte Beleuchtung W', 'Uso illuminazione': 'Nutzungsfaktor Beleuchtung', 'Apparecchiature installate W': 'Installierte Geräte W', 'Uso apparecchiature': 'Nutzungsfaktor Geräte', 'Nome locale': 'Raumname', 'Elimina': 'Löschen',
    'RISULTATO': 'ERGEBNIS', 'Superficie totale': 'Gesamtfläche', 'Volume totale': 'Gesamtvolumen', 'Potenza frigorifera': 'Kälteleistung', 'Potenza riscaldamento': 'Heizleistung', 'Potenza termica': 'Heizleistung', 'Volume': 'Volumen', 'Totale impianto': 'Gesamtanlage', 'Raffrescamento totale': 'Gesamtkühlleistung', 'Riscaldamento totale': 'Gesamtheizleistung', 'Locale': 'Raum', 'Sensibile': 'Sensibel', 'Latente': 'Latent', 'Freddo totale': 'Kühlen gesamt', 'Caldo': 'Heizen',
    'Stima tecnica di progetto: verificare dati, condizioni di progetto e requisiti normativi prima della selezione definitiva delle macchine.': 'Technische Auslegungsschätzung: Daten, Auslegungsbedingungen und normative Anforderungen vor der endgültigen Geräteauswahl prüfen.',
    'Apri': 'Öffnen', 'Nessun progetto salvato.': 'Keine Projekte gespeichert.', 'Progetto salvato': 'Projekt gespeichert', 'Progetto caricato': 'Projekt geladen', 'Progetto eliminato': 'Projekt gelöscht', 'Deve rimanere almeno un locale': 'Mindestens ein Raum muss erhalten bleiben', 'Operazione non riuscita': 'Vorgang fehlgeschlagen',
    'Bombola registrata e QR creato': 'Flasche gespeichert und QR-Code erstellt', 'Movimento registrato': 'Vorgang erfasst', 'Movimento modificato e residui ricalcolati': 'Vorgang geändert und Restmengen neu berechnet', 'Bombola eliminata': 'Flasche gelöscht', 'Accesso QR rigenerato. Ristampa il nuovo codice.': 'QR-Zugang neu erstellt. Bitte den neuen Code drucken.', 'Registra almeno una bombola prima di creare il PDF': 'Erfasse mindestens eine Flasche, bevor du das PDF erstellst', 'Registra almeno una bombola prima di stampare': 'Erfasse mindestens eine Flasche vor dem Drucken', 'Il browser ha bloccato la scheda PDF. Consenti i popup e riprova.': 'Der Browser hat das PDF-Fenster blockiert. Pop-ups erlauben und erneut versuchen.', 'Impossibile generare il QR. Chiudi e riapri la scheda oppure riavvia l’add-on.': 'Der QR-Code konnte nicht erstellt werden. Datenblatt schließen und erneut öffnen oder das Add-on neu starten.',
    'Operatore aggiunto': 'Bediener hinzugefügt', 'Accesso operatore revocato': 'Bedienerzugriff widerrufen', 'Operatore riattivato': 'Bediener reaktiviert', 'PIN aggiornato e sessioni precedenti revocate': 'PIN aktualisiert und frühere Sitzungen widerrufen', 'Operatore eliminato': 'Bediener gelöscht',
    'Residuo attuale': 'Aktuelle Restmenge', 'Nuovo residuo previsto': 'Voraussichtliche neue Restmenge', 'Peso totale': 'Gesamtgewicht', 'tara': 'Tara', 'di gas': 'Kältemittel',
    'Diagnosi': 'Diagnose', 'Riduzione dal valore iniziale': 'Reduktion gegenüber Startwert', 'Velocità media': 'Durchschnittsgeschwindigkeit', 'Procedura consigliata': 'Empfohlenes Verfahren', 'Evacuazione in buona direzione': 'Evakuierung entwickelt sich gut', 'Vuoto profondo raggiunto': 'Tiefvakuum erreicht', 'Vuoto ancora incompleto': 'Vakuum noch unvollständig', 'Vuoto insufficiente': 'Vakuum unzureichend', 'Risalita troppo rapida': 'Druckanstieg zu schnell', 'Inserisci il valore attuale in micron': 'Aktuellen Mikronwert eingeben',
    'Esito tecnico': 'Technisches Ergebnis', 'Ordine professionale di diagnosi': 'Fachgerechte Diagnosereihenfolge', 'Surriscaldamento': 'Überhitzung', 'Sottoraffreddamento': 'Unterkühlung', 'Pressione LP': 'Niederdruck', 'Pressioni LP / HP': 'Drücke ND / HD', 'Affidabilità diagnosi carica': 'Zuverlässigkeit der Füllmengendiagnose', 'Funzionamento complessivamente plausibile': 'Betrieb insgesamt plausibel', 'Anomalia tecnica da approfondire': 'Technische Abweichung genauer prüfen', 'Funzionamento da verificare': 'Betrieb prüfen', 'Funzionamento plausibile con una verifica': 'Betrieb plausibel, eine Prüfung erforderlich',
    'Macchina non ancora stabilizzata': 'Anlage noch nicht stabilisiert', 'Nessun raffreddamento lato aria': 'Keine luftseitige Kühlung', 'ΔT aria basso': 'Luft-ΔT niedrig', 'ΔT aria moderatamente basso': 'Luft-ΔT mäßig niedrig', 'Scambio lato aria plausibile': 'Luftseitiger Wärmeaustausch plausibel', 'ΔT aria elevato': 'Luft-ΔT hoch', 'ΔT aria molto elevato': 'Luft-ΔT sehr hoch', 'Nessun riscaldamento lato aria': 'Keine luftseitige Heizleistung', 'ΔT riscaldamento basso': 'Heiz-ΔT niedrig', 'ΔT riscaldamento elevato': 'Heiz-ΔT hoch', 'Portata aria non verificata': 'Luftvolumenstrom nicht geprüft', 'Scambio esterno non verificato': 'Außenwärmetauscher nicht geprüft', 'Evaporazione molto bassa': 'Verdampfungstemperatur sehr niedrig', 'Evaporazione vicina alla temperatura ambiente': 'Verdampfung nahe Raumtemperatur', 'Surriscaldamento negativo': 'Negative Überhitzung', 'Surriscaldamento quasi nullo': 'Überhitzung nahezu null', 'Surriscaldamento basso': 'Überhitzung niedrig', 'Surriscaldamento plausibile': 'Überhitzung plausibel', 'Surriscaldamento alto': 'Überhitzung hoch', 'Surriscaldamento molto alto': 'Überhitzung sehr hoch', 'Pressione bassa disponibile ma SH non calcolabile': 'Niederdruck vorhanden, Überhitzung nicht berechenbar', 'Pressioni non coerenti': 'Drücke nicht plausibel', 'Sottoraffreddamento negativo': 'Negative Unterkühlung', 'Sottoraffreddamento basso': 'Unterkühlung niedrig', 'Sottoraffreddamento plausibile': 'Unterkühlung plausibel', 'Sottoraffreddamento alto': 'Unterkühlung hoch', 'Sottoraffreddamento molto alto': 'Unterkühlung sehr hoch', 'Condensazione alta rispetto all’esterno': 'Verflüssigungstemperatur gegenüber außen hoch', 'Modalità split · sola bassa pressione': 'Splitbetrieb · nur Niederdruck', 'Temperatura mandata molto alta': 'Austrittstemperatur sehr hoch', 'Temperatura mandata elevata': 'Austrittstemperatur erhöht', 'Assorbimento oltre riferimento': 'Stromaufnahme über Referenz', 'Interpretazione inverter / EEV': 'Bewertung Inverter / EEV', 'Limite diagnostico dichiarato': 'Ausgewiesene Diagnosegrenze', 'Refrigerante A3 infiammabile': 'Entflammbares A3-Kältemittel',
    'ΔT aria raffrescamento': 'Luft-ΔT Kühlen', 'ΔT aria riscaldamento': 'Luft-ΔT Heizen', 'Approach ritorno→evaporazione': 'Annäherung Rückluft→Verdampfung', 'Approach condensazione→esterna': 'Annäherung Verflüssigung→Außenluft', 'T mandata compressore': 'Verdichter-Austrittstemperatur', 'Assorbimento vs riferimento': 'Stromaufnahme vs. Referenz',
    '1) verifica pulizia e portata aria; 2) stabilizza la macchina; 3) misura ritorno e mandata aria; 4) registra LP e temperatura di evaporazione; 5) misura il tubo aspirazione e calcola SH; 6) se HP è realmente disponibile, aggiungi condensazione e SC; 7) incrocia assorbimento e temperature; 8) solo alla fine valuta carica, EEV/restrizioni o scambio termico. Il manuale di servizio della macchina prevale sempre.': '1) Sauberkeit und Luftvolumenstrom prüfen; 2) Anlage stabilisieren; 3) Rück- und Zuluft messen; 4) Niederdruck und Verdampfungstemperatur erfassen; 5) Saugleitung messen und Überhitzung berechnen; 6) bei verfügbarem Hochdruck Verflüssigung und Unterkühlung ergänzen; 7) Stromaufnahme und Temperaturen abgleichen; 8) erst danach Füllmenge, EEV/Drosselstellen oder Wärmeaustausch bewerten. Das Servicehandbuch der Anlage hat immer Vorrang.',
    'Continua fino al valore previsto dal costruttore; per riferimento operativo, punta a ≤500 micron. Poi isola la pompa e osserva la risalita per 10–15 minuti. Se serve rompere il vuoto, isola la pompa, introduci azoto secco con riduttore e poi evacua nuovamente.': 'Bis zum vom Hersteller vorgegebenen Wert weiter evakuieren; als Betriebsrichtwert ≤500 Mikron anstreben. Danach die Pumpe absperren und den Anstieg 10–15 Minuten beobachten. Falls das Vakuum gebrochen werden muss, Pumpe absperren, trockenen Stickstoff über einen Druckminderer einleiten und anschließend erneut evakuieren.',
    'ALTA': 'HOCH', 'MEDIA': 'MITTEL', 'BASSA': 'NIEDRIG', 'RAPIDO': 'SCHNELL', 'PROFESSIONALE': 'FACHBERECHNUNG'
  };

  const reverse = Object.fromEntries(Object.entries(messages).map(([it, de]) => [de, it]));
  let language = localStorage.getItem('hvac-language') === 'de' ? 'de' : 'it';
  let applying = false;

  function translate(value, target = language) {
    const text = String(value ?? '');
    const table = target === 'de' ? messages : reverse;
    if (table[text]) return table[text];
    const room = text.match(/^Locale (\d+)$/);
    if (target === 'de' && room) return `Raum ${room[1]}`;
    const raum = text.match(/^Raum (\d+)$/);
    if (target === 'it' && raum) return `Locale ${raum[1]}`;
    const countIt = text.match(/^(\d+) (locale|locali)$/);
    if (target === 'de' && countIt) return `${countIt[1]} ${countIt[1] === '1' ? 'Raum' : 'Räume'}`;
    const countDe = text.match(/^(\d+) (Raum|Räume)$/);
    if (target === 'it' && countDe) return `${countDe[1]} ${countDe[1] === '1' ? 'locale' : 'locali'}`;
    return text;
  }

  function translateNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const match = node.nodeValue.match(/^(\s*)(.*?)(\s*)$/s);
      if (match && match[2]) node.nodeValue = `${match[1]}${translate(match[2])}${match[3]}`;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || ['SCRIPT', 'STYLE'].includes(node.tagName)) return;
    ['placeholder', 'aria-label', 'title'].forEach(attribute => {
      if (node.hasAttribute(attribute)) node.setAttribute(attribute, translate(node.getAttribute(attribute)));
    });
    [...node.childNodes].forEach(translateNode);
  }

  function apply(root = document.documentElement) {
    if (applying) return;
    applying = true;
    document.documentElement.lang = language;
    translateNode(root);
    document.title = translate(document.title);
    document.querySelectorAll('[data-language]').forEach(button => {
      const active = button.dataset.language === language;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    applying = false;
  }

  function setLanguage(next) {
    if (!['it', 'de'].includes(next) || next === language) return;
    language = next;
    localStorage.setItem('hvac-language', language);
    apply();
    window.dispatchEvent(new CustomEvent('app-language-changed', {detail: {language}}));
  }

  window.AppI18n = {apply, getLanguage: () => language, locale: () => language === 'de' ? 'de-DE' : 'it-IT', setLanguage, translate};
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.language)));
    apply();
    new MutationObserver(records => {
      if (applying) return;
      records.forEach(record => record.addedNodes.forEach(translateNode));
    }).observe(document.body, {childList: true, subtree: true});
  });
})();
