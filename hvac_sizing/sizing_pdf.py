"""Printable snapshot of sizing results; no credentials or account data."""
import html
import io
from pathlib import Path
import reportlab
from calc_engine import outdoor_proposal
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime, timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle


PDF_DE = {'Finestre m²':'Fensterfläche m²', 'U pareti W/m²K':'U-Wert Wand W/m²K', 'U tetto W/m²K':'U-Wert Dach W/m²K', 'U pavimento W/m²K':'U-Wert Boden W/m²K', 'Margine %':'Reserve %', 'Non so': 'Unbekannt', 'Pareti esterne': 'Außenwände', 'Pareti interne': 'Innenwände', 'No': 'Nein', 'Terreno': 'Erdreich', 'Finestra': 'Fenster', 'Pareti esterne nette m²': 'Netto-Außenwandfläche m²', 'Temperatura interna invernale °C': 'Raumtemperatur Winter °C', 'Temperatura interna estiva °C': 'Raumtemperatur Sommer °C', 'U finestre medio W/m²K': 'Mittlerer Fenster-U-Wert W/m²K', 'Tetto verso esterno m²': 'Dachfläche zur Außenluft m²', 'Ricambi aria vol/h': 'Luftwechsel pro Stunde', 'Apporto solare finestre W': 'Solarer Fenstereintrag W', 'Stima guidata: isolamento e vetri usano valori indicativi, non misurati. Non è un calcolo normativo.': 'Geführte Schätzung: Dämmung und Verglasung verwenden Richtwerte, keine Messwerte. Keine normgerechte Berechnung.', 'La località non imposta automaticamente il clima: verifica le temperature esterne di progetto.': 'Der Ort stellt das Klima nicht automatisch ein: Auslegungs-Außentemperaturen prüfen.', 'Ricambio aria assunto 0,5 vol/h; umidità dai dati del clima. Ponti termici e inerzia non modellati.': 'Angenommener Luftwechsel 0,5/h; Feuchte aus Klimadaten. Wärmebrücken und thermische Trägheit nicht modelliert.', 'Sole sulle finestre stimato per esposizione; non è una simulazione oraria. Non sommare i picchi come se fossero simultanei.': 'Fenstersonneneintrag nach Ausrichtung geschätzt; keine stündliche Simulation. Spitzen nicht als gleichzeitig auftretend addieren.', 'Sono presenti dati sconosciuti: verifica le ipotesi nei dettagli prima di scegliere la macchina.': 'Unbekannte Daten vorhanden: Annahmen in den Details vor der Geräteauswahl prüfen.', 'Locali non riscaldati ipotizzati a 12 °C in inverno e 28 °C in estate; U pareti interne 1,5 W/m²K.': 'Unbeheizte Räume mit 12 °C im Winter und 28 °C im Sommer angenommen; Innenwand-U-Wert 1,5 W/m²K.', 'Terreno ipotizzato a 10 °C in inverno e 18 °C in estate: stima semplificata, senza modello del terreno.': 'Erdreich mit 10 °C im Winter und 18 °C im Sommer angenommen: vereinfachte Schätzung ohne Erdreichmodell.', 'Tetto: incremento estivo equivalente di 10 °C per il sole; superficie reale delle falde e isolamento da verificare.': 'Dach: äquivalenter sommerlicher Temperaturzuschlag von 10 °C für Sonne; tatsächliche Dachflächen und Dämmung prüfen.', 'Indica cosa c’è oltre ciascuna delle quattro pareti.': 'Angrenzung für jede der vier Wände auswählen.', 'Indica se è una mansarda e cosa c’è sopra e sotto.': 'Dachgeschoss sowie Angrenzung oben und unten angeben.', 'Seleziona lo stato di isolamento.': 'Dämmzustand auswählen.', 'Controlla il numero di finestre (massimo 30).': 'Fensterzahl prüfen (maximal 30).', 'Controlla tipo di vetro, esposizione e schermatura delle finestre.': 'Verglasung, Ausrichtung und Sonnenschutz prüfen.', 'Per i lucernari seleziona mansarda.': 'Für Dachfenster Dachgeschoss auswählen.', 'La superficie delle finestre supera quella delle pareti esterne o del tetto.': 'Fensterfläche überschreitet Außenwand- oder Dachfläche.'}

def generate_sizing_pdf(payload, result):
    de = payload.get('language') == 'de'
    def t(it, german): return german if de else it
    stream = io.BytesIO()
    font_dir = Path(reportlab.__file__).parent / 'fonts'
    if 'SizingVera' not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont('SizingVera', str(font_dir / 'Vera.ttf')))
        pdfmetrics.registerFont(TTFont('SizingVeraBold', str(font_dir / 'VeraBd.ttf')))
    styles = getSampleStyleSheet()
    for style_name in ('Normal', 'Title', 'Heading2'):
        styles[style_name].fontName = 'SizingVera' if style_name == 'Normal' else 'SizingVeraBold' 
    styles['Normal'].fontSize = 10
    styles['Normal'].leading = 14
    def p(value, style='Normal'):
        return Paragraph(html.escape(str(PDF_DE.get(str(value), value) if de else value)).replace('\n', '<br/>'), styles[style])
    story = [p(t('Dimensionamento climatizzazione', 'Klimaanlagen-Auslegung'), 'Title'),
             p(result['project_name'], 'Heading2'),
             p(t('Cliente: ', 'Kunde: ') + str(payload.get('customer') or '-')),
             p(t('Località: ', 'Ort: ') + str(payload.get('location') or '-')),
             p(t('Generato: ', 'Erstellt: ') + datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')),
             p(t('Metodo: ', 'Methode: ') + ({'guidato':'Geführt','rapido':'Schnell','professionale':'Professionell'}.get(result['method'],result['method']) if de else result['method'])), Spacer(1, 5*mm)]
    def table(rows, widths):
        obj = Table([[p(cell) for cell in row] for row in rows], colWidths=widths, repeatRows=1, hAlign='LEFT')
        obj.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#deedf4')),
          ('VALIGN',(0,0),(-1,-1),'TOP'),('BOTTOMPADDING',(0,0),(-1,-1),7),
          ('TOPPADDING',(0,0),(-1,-1),7),('LINEBELOW',(0,0),(-1,-1),.3,colors.HexColor('#b9cbd5'))]))
        return obj
    rows=[[t('Locale','Raum'),'m²',t('Freddo kW','Kühlen kW'),t('Caldo kW','Heizen kW')]]
    for room in result['rooms']:
        rows.append([room['name'],room['area_m2'],room['total_cooling_kw'],room['heating_kw']])
    rows.append([t('Totale','Gesamt'),result['totals']['area_m2'],result['totals']['cooling_kw'],result['totals']['heating_kw']])
    story += [table(rows,[80*mm,25*mm,35*mm,35*mm]), Spacer(1,4*mm),
              p(t('Proposta unità esterna','Vorschlag Außeneinheit'),'Heading2')]
    outdoor=result['outdoor']
    story += [p(outdoor['configuration']),p(outdoor['assumption']),
      p(t('Potenza termica da verificare: ','Zu prüfende thermische Leistung: ')+f"{outdoor['cooling_kw']} kW / {outdoor['heating_kw']} kW "+t('(freddo / caldo).','(Kühlen / Heizen).'))]
    story += [p(note) for note in outdoor['notes']]
    story += [p(t('Condizioni esterne inserite','Eingegebene Außenbedingungen'),'Heading2')]
    climate=payload.get('climate') or {}
    for key,it,ge in [('summer_outdoor_c','Estate esterna °C','Sommer außen °C'),('winter_outdoor_c','Inverno esterna °C','Winter außen °C'),('summer_outdoor_rh','Umidità esterna %','Außenfeuchte %'),('summer_indoor_rh','Umidità interna %','Innenfeuchte %')]:
        story.append(p(f"{t(it,ge)}: {climate.get(key,'-')}"))
    if result['method']=='rapido':
        story.append(p(t('Nel metodo rapido le temperature non modificano i coefficienti volumetrici.','Im Schnellverfahren ändern die Temperaturen die volumetrischen Koeffizienten nicht.')))
    for room in result['rooms']:
        story.append(p(room['name'],'Heading2'))
        if room.get('guided_details'):
            story.append(table([[t('Dato / ipotesi','Daten / Annahme'),t('Valore','Wert')]]+[[k,v] for k,v in room['guided_details'].items()],[130*mm,45*mm]))
            story += [p(note) for note in room.get('guided_notes',[])]
        else:
            source=payload.get('rooms',[])[result['rooms'].index(room)]
            keys=['length','width','height','people','lighting_w','equipment_w','margin_percent']
            keys += ['quick_w_m3_cooling','quick_w_m3_heating','quick_insulation_factor','quick_exposure_factor','quick_glazing_factor'] if result['method']=='rapido' else ['wall_area','wall_u','window_area','window_u','roof_area','roof_u','floor_area','floor_u','infiltration_ach','ventilation_m3h','solar_irradiance_w_m2','window_g_value','shading_factor']
            story.append(table([[t('Dato inserito','Eingabe'),t('Valore','Wert')]]+[[key,source.get(key,'-')] for key in keys],[130*mm,45*mm]))
    story += [Spacer(1,4*mm),p(t('Stima indicativa, non selezione definitiva della macchina. Verificare dati e ipotesi prima dell’acquisto.','Unverbindliche Schätzung, keine endgültige Geräteauswahl. Daten und Annahmen vor dem Kauf prüfen.'))]
    def footer(canvas, doc):
        canvas.setFont('SizingVera',8);canvas.setFillColor(colors.HexColor('#526878'))
        canvas.drawString(18*mm,12*mm,'HVAC - '+t('Relazione di calcolo','Berechnungsbericht'))
        canvas.drawRightString(192*mm,12*mm,str(doc.page))
    SimpleDocTemplate(stream,pagesize=A4,rightMargin=17*mm,leftMargin=18*mm,topMargin=17*mm,bottomMargin=22*mm).build(story,onFirstPage=footer,onLaterPages=footer)
    return stream.getvalue()


def generate_sizing_pdf_languages(payload, result):
    """Render the same calculation snapshot in both supported languages."""
    return {language: generate_sizing_pdf(
        dict(payload, language=language),
        dict(result, outdoor=outdoor_proposal(result['rooms'], language)))
        for language in ('it', 'de')}
