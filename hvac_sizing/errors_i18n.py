"""Traduzione tedesca dei messaggi di errore restituiti dal server.

Il server continua a rispondere con ``error`` in italiano e aggiunge ``error_de``:
le pagine scelgono il testo in base alla lingua attiva.
"""

from __future__ import annotations

import re

ERRORS_DE = {
    "Accedi come amministratore": "Als Administrator anmelden",
    "Accedi con un operatore autorizzato": "Mit einem berechtigten Bediener anmelden",
    "Aggiungi almeno un locale": "Mindestens einen Raum hinzufügen",
    "Bombola non trovata": "Flasche nicht gefunden",
    "Collegamento QR non valido o revocato": "Ungültiger oder widerrufener QR-Link",
    "Configura external_url nelle opzioni dell’add-on prima di creare i QR": "Vor dem Erstellen der QR-Codes external_url in den Add-on-Optionen konfigurieren",
    "Configura external_url nelle opzioni dell’add-on prima di stampare il QR": "Vor dem Drucken des QR-Codes external_url in den Add-on-Optionen konfigurieren",
    "Configura una password amministratore di almeno 10 caratteri": "Ein Administratorpasswort mit mindestens 10 Zeichen konfigurieren",
    "Endpoint non trovato": "Endpunkt nicht gefunden",
    "Errore interno durante l’elaborazione": "Interner Fehler bei der Verarbeitung",
    "Esiste già un operatore con questo nome": "Ein Bediener mit diesem Namen existiert bereits",
    "Esiste già una bombola con questo codice": "Eine Flasche mit diesem Code existiert bereits",
    "Il PIN deve contenere da 4 a 32 caratteri": "Die PIN muss 4 bis 32 Zeichen enthalten",
    "Il contenuto deve essere un oggetto JSON": "Der Inhalt muss ein JSON-Objekt sein",
    "Il peso totale non può essere inferiore alla tara": "Das Gesamtgewicht darf nicht unter der Tara liegen",
    "Il prelievo supera il refrigerante disponibile": "Die Entnahme übersteigt das verfügbare Kältemittel",
    "Il refrigerante calcolato supera la capacità impostata": "Das berechnete Kältemittel übersteigt die eingestellte Kapazität",
    "Il refrigerante risultante supera la capacità della bombola": "Das resultierende Kältemittel übersteigt die Flaschenkapazität",
    "Il registro contiene un’operazione non valida": "Das Register enthält einen ungültigen Vorgang",
    "Inserisci il nome dell’operatore": "Namen des Bedieners eingeben",
    "La modifica rende negativo il refrigerante in un movimento successivo": "Die Änderung macht das Kältemittel in einem späteren Vorgang negativ",
    "La modifica supera la capacità della bombola in un movimento del registro": "Die Änderung überschreitet die Flaschenkapazität in einem Registervorgang",
    "La quantità deve essere maggiore di zero": "Die Menge muss größer als null sein",
    "La registrazione iniziale non può cambiare tipo": "Die Ersterfassung kann ihren Typ nicht ändern",
    "La registrazione iniziale non può essere eliminata": "Die Ersterfassung kann nicht gelöscht werden",
    "Movimento non trovato": "Vorgang nicht gefunden",
    "Nome operatore o PIN non valido": "Bedienername oder PIN ungültig",
    "Nome, codice e refrigerante sono obbligatori": "Name, Code und Kältemittel sind Pflichtfelder",
    "Operatore non trovato": "Bediener nicht gefunden",
    "Operazione non consentita": "Vorgang nicht erlaubt",
    "Operazione non valida": "Ungültiger Vorgang",
    "Pagina non trovata": "Seite nicht gefunden",
    "Password amministratore non valida": "Ungültiges Administratorpasswort",
    "Progetto non trovato": "Projekt nicht gefunden",
    "Protezione della sessione non valida. Accedi nuovamente": "Sitzungsschutz ungültig. Bitte erneut anmelden",
    "Richiesta troppo grande": "Anfrage zu groß",
    "Risorsa non trovata": "Ressource nicht gefunden",
    "Servizio amministrativo temporaneamente non disponibile": "Verwaltungsdienst vorübergehend nicht verfügbar",
    "Sessione amministratore scaduta": "Administratorsitzung abgelaufen",
    "Sessione operatore scaduta o revocata": "Bedienersitzung abgelaufen oder widerrufen",
    "Troppi tentativi. Riprova tra 15 minuti": "Zu viele Versuche. In 15 Minuten erneut versuchen",
    "Una pesatura del registro è inferiore alla tara": "Eine Wägung im Register liegt unter der Tara",
    "Credenziali non valide o account disattivato": "Ungültige Anmeldedaten oder Konto deaktiviert",
    "Non hai il permesso per questa operazione": "Keine Berechtigung für diesen Vorgang",
    "Account non trovato": "Konto nicht gefunden",
    "Nome utente già utilizzato": "Benutzername bereits vergeben",
    "La password deve contenere da 10 a 128 caratteri": "Das Passwort muss 10 bis 128 Zeichen enthalten",
    "Nome utente: da 3 a 60 caratteri, lettere, numeri, punto, trattino o underscore": "Benutzername: 3 bis 60 Zeichen, Buchstaben, Ziffern, Punkt, Bindestrich oder Unterstrich",
    "Ruolo o permessi non validi": "Ungültige Rolle oder Berechtigungen",
    "Permessi non validi": "Ungültige Berechtigungen",
    "Deve rimanere almeno un account amministratore attivo": "Mindestens ein aktives Administratorkonto muss erhalten bleiben",
    "Indica cosa c’è oltre ciascuna delle quattro pareti.": "Für jede der vier Wände angeben, was dahinter liegt.",
    "Indica se è una mansarda e cosa c’è sopra e sotto.": "Angeben, ob es ein Dachgeschoss ist und was darüber und darunter liegt.",
    "Seleziona lo stato di isolamento.": "Dämmzustand auswählen.",
    "Controlla il numero di finestre (massimo 30).": "Anzahl der Fenster prüfen (höchstens 30).",
    "Controlla tipo di vetro, esposizione e schermatura delle finestre.": "Verglasung, Ausrichtung und Verschattung der Fenster prüfen.",
    "Per i lucernari seleziona mansarda.": "Für Dachfenster Dachgeschoss auswählen.",
    "La superficie delle finestre supera quella delle pareti esterne o del tetto.": "Die Fensterfläche übersteigt die Fläche der Außenwände oder des Dachs.",
}

FIELDS_DE = {
    "la tara": "Tara",
    "il gas refrigerante": "Kältemittel",
    "il peso totale": "Gesamtgewicht",
    "la capacità": "Kapazität",
    "la carica della macchina": "Anlagenfüllung",
    "il GWP": "GWP",
    "il gas disperso": "Ausgetretenes Gas",
    "la quantità": "Menge",
    "il gas iniziale": "Anfangsmenge",
}

_PATTERNS = (
    (re.compile(r"^Inserisci (.+)$"), lambda field: f"{FIELDS_DE.get(field, field)}: Wert eingeben"),
    (re.compile(r"^Controlla (.+): valore non valido$"), lambda field: f"{FIELDS_DE.get(field, field)}: ungültiger Wert"),
    (re.compile(r"^Controlla (.+): non può essere un valore negativo$"), lambda field: f"{FIELDS_DE.get(field, field)}: darf nicht negativ sein"),
)


def translate_error(message: str) -> str:
    """Restituisce la versione tedesca del messaggio, o il messaggio stesso se è già tradotto o sconosciuto."""
    text = str(message or "")
    if text in ERRORS_DE:
        return ERRORS_DE[text]
    for pattern, build in _PATTERNS:
        match = pattern.match(text)
        if match:
            return build(match.group(1))
    return text
