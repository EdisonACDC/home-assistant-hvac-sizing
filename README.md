# Dimensionamento Climatizzazione Pro

Add-on/Home Assistant App per stimare la potenza frigorifera e termica richiesta da ogni locale.

## Versione 0.1.0

- calcolo rapido parametrico in W/m³;
- calcolo professionale a bilancio termico;
- carichi sensibili e latenti separati;
- trasmissioni di pareti, finestre, tetto e pavimento;
- apporti solari, persone, illuminazione e apparecchiature;
- ventilazione, infiltrazioni e umidità;
- risultati e totali distinti per locale;
- progetti salvati in modo persistente;
- interfaccia responsive tramite Ingress di Home Assistant.

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
