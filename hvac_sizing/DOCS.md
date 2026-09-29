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
