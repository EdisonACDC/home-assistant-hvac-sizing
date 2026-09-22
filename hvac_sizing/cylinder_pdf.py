"""Generazione delle schede PDF A4 per il magazzino bombole."""

from __future__ import annotations

import html
import io
from datetime import datetime
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


BLUE = colors.HexColor("#0D2438")
CYAN = colors.HexColor("#169AAC")
GREEN = colors.HexColor("#16875D")
LIGHT = colors.HexColor("#EAF1F5")
MUTED = colors.HexColor("#587184")
WHITE = colors.white

GERMAN = {
    "SCHEDA BOMBOLA REFRIGERANTE": "KÄLTEMITTELFLASCHEN-DATENBLATT",
    "Codice": "Code", "Refrigerante": "Kältemittel",
    "Scansiona il QR per aprire la scheda e registrare pesature, aggiunte o prelievi.": "QR-Code scannen, um das Datenblatt zu öffnen und Wägungen, Zugaben oder Entnahmen zu erfassen.",
    "GAS EFFETTIVO RESIDUO": "TATSÄCHLICHER RESTINHALT", "PESO TOTALE": "GESAMTGEWICHT",
    "Tara bombola": "Flaschen-Tara", "Capacità gas": "Kältemittelkapazität", "Creata": "Erstellt",
    "Ultimo aggiornamento": "Letzte Aktualisierung", "Note": "Notizen", "STORICO MOVIMENTI": "BEWEGUNGSVERLAUF",
    "Data": "Datum", "Operazione": "Vorgang", "Quantità / peso": "Menge / Gewicht", "Residuo": "Restmenge",
    "Registrazione iniziale": "Ersterfassung", "Pesatura": "Wägung", "Aggiunta": "Zugabe", "Prelievo": "Entnahme",
    "Totale": "Gesamt", "Nessun movimento": "Keine Bewegung", "Nessuna bombola registrata": "Keine Flasche erfasst",
    "Dimensionamento Climatizzazione Pro · Magazzino bombole": "Klimaanlagen-Dimensionierung Pro · Kältemittellager",
    "Pagina": "Seite", "Schede bombole refrigerante": "Kältemittelflaschen-Datenblätter",
}


def tr(value: str, language: str) -> str:
    return GERMAN.get(value, value) if language == "de" else value


def kg(value: object) -> str:
    return f"{float(value or 0):,.3f}".replace(",", "X").replace(".", ",").replace("X", ".") + " kg"


def safe(value: object) -> str:
    return html.escape(str(value or ""))


def date_time(value: object, language: str = "it") -> str:
    try:
        parsed = datetime.fromisoformat(str(value))
        return parsed.strftime("%d.%m.%Y %H:%M" if language == "de" else "%d/%m/%Y %H:%M")
    except (TypeError, ValueError):
        return str(value or "—")


def cylinder_url(base_url: str, cylinder_id: str) -> str:
    parsed = urlparse(base_url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query["bombola"] = cylinder_id
    return urlunparse(parsed._replace(query=urlencode(query), fragment=""))


def qr_drawing(value: str, size: float = 35 * mm) -> Drawing:
    qr = QrCodeWidget(value)
    qr.barWidth = size
    qr.barHeight = size
    drawing = Drawing(size, size)
    drawing.add(qr)
    return drawing


def styles() -> dict:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("CylinderTitle", parent=base["Title"], fontName="Helvetica-Bold", fontSize=18, leading=21, textColor=BLUE, spaceAfter=2 * mm),
        "subtitle": ParagraphStyle("CylinderSubtitle", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=9, textColor=CYAN, spaceAfter=3 * mm),
        "heading": ParagraphStyle("CylinderHeading", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=11, textColor=BLUE, spaceBefore=3 * mm, spaceAfter=2 * mm),
        "body": ParagraphStyle("CylinderBody", parent=base["BodyText"], fontName="Helvetica", fontSize=8, leading=10, textColor=BLUE),
        "small": ParagraphStyle("CylinderSmall", parent=base["BodyText"], fontName="Helvetica", fontSize=7, leading=9, textColor=MUTED),
        "balance": ParagraphStyle("CylinderBalance", parent=base["Title"], fontName="Helvetica-Bold", fontSize=24, leading=27, textColor=GREEN, alignment=TA_CENTER),
        "balance_label": ParagraphStyle("CylinderBalanceLabel", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=8, textColor=MUTED, alignment=TA_CENTER),
    }


def cylinder_story(cylinder: dict, target_url: str, style: dict, language: str) -> list:
    capacity = "—" if cylinder.get("capacity_kg") is None else kg(cylinder["capacity_kg"])
    notes = safe(cylinder.get("notes")) or "—"
    header_text = [
        Paragraph(tr("SCHEDA BOMBOLA REFRIGERANTE", language), style["subtitle"]),
        Paragraph(safe(cylinder["name"]), style["title"]),
        Paragraph(f"{tr('Codice', language)}: <b>{safe(cylinder['code'])}</b> &nbsp;&nbsp; {tr('Refrigerante', language)}: <b>{safe(cylinder['refrigerant'])}</b>", style["body"]),
        Spacer(1, 2 * mm),
        Paragraph(tr("Scansiona il QR per aprire la scheda e registrare pesature, aggiunte o prelievi.", language), style["small"]),
    ]
    header = Table([[header_text, qr_drawing(target_url)]], colWidths=[137 * mm, 38 * mm])
    header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOX", (0, 0), (-1, -1), 0.7, CYAN),
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
        ("LEFTPADDING", (0, 0), (-1, -1), 5 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 4 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4 * mm),
    ]))

    balance = Table([
        [Paragraph(tr("GAS EFFETTIVO RESIDUO", language), style["balance_label"]), Paragraph(tr("PESO TOTALE", language), style["balance_label"])],
        [Paragraph(kg(cylinder["current_gas_kg"]), style["balance"]), Paragraph(kg(cylinder["total_weight_kg"]), style["balance"])],
    ], colWidths=[87.5 * mm, 87.5 * mm])
    balance.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.8, GREEN),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, GREEN),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#EDF8F3")),
        ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
    ]))

    details = Table([
        [tr("Tara bombola", language), kg(cylinder["tare_kg"]), tr("Capacità gas", language), capacity],
        [tr("Creata", language), date_time(cylinder["created_at"], language), tr("Ultimo aggiornamento", language), date_time(cylinder["updated_at"], language)],
        [tr("Note", language), Paragraph(notes, style["body"]), "", ""],
    ], colWidths=[32 * mm, 55.5 * mm, 37 * mm, 50.5 * mm])
    details.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#B7C6D0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CCD7DE")),
        ("BACKGROUND", (0, 0), (0, -1), LIGHT),
        ("BACKGROUND", (2, 0), (2, -1), LIGHT),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("SPAN", (1, 2), (3, 2)),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("TEXTCOLOR", (0, 0), (-1, -1), BLUE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 2.3 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.3 * mm),
    ]))

    operation_names = {key: tr(value, language) for key, value in {"initial": "Registrazione iniziale", "weighing": "Pesatura", "add": "Aggiunta", "remove": "Prelievo"}.items()}
    history_rows = [[tr(value, language) for value in ["Data", "Operazione", "Quantità / peso", "Residuo", "Note"]]]
    for item in cylinder.get("history", []):
        if item["operation"] == "weighing":
            measure = f"{tr('Totale', language)} {kg(item.get('total_weight_kg'))}"
        else:
            sign = "-" if item["operation"] == "remove" else "+"
            measure = f"{sign}{kg(abs(item.get('amount_kg') or 0))}"
        history_rows.append([
            date_time(item.get("created_at"), language),
            operation_names.get(item["operation"], item["operation"]),
            measure,
            kg(item.get("gas_after_kg")),
            Paragraph(safe(item.get("notes")) or "—", style["small"]),
        ])
    if len(history_rows) == 1:
        history_rows.append(["—", tr("Nessun movimento", language), "—", kg(cylinder["current_gas_kg"]), "—"])
    history = Table(history_rows, colWidths=[27 * mm, 36 * mm, 35 * mm, 26 * mm, 51 * mm], repeatRows=1)
    history.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#B7C6D0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, colors.HexColor("#F6F9FB")]),
        ("TOPPADDING", (0, 0), (-1, -1), 1.8 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.8 * mm),
    ]))

    return [
        header,
        Spacer(1, 4 * mm),
        balance,
        Spacer(1, 4 * mm),
        details,
        Paragraph(tr("STORICO MOVIMENTI", language), style["heading"]),
        history,
    ]


def _footer(canvas, document, language: str = "it") -> None:
    canvas.saveState()
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(17.5 * mm, 10 * mm, tr("Dimensionamento Climatizzazione Pro · Magazzino bombole", language))
    canvas.drawRightString(192.5 * mm, 10 * mm, f"{tr('Pagina', language)} {document.page}")
    canvas.restoreState()


def generate_cylinder_pdf(cylinders: list[dict], base_url: str, language: str = "it") -> bytes:
    output = io.BytesIO()
    document = SimpleDocTemplate(
        output,
        pagesize=A4,
        leftMargin=17.5 * mm,
        rightMargin=17.5 * mm,
        topMargin=15 * mm,
        bottomMargin=16 * mm,
        title=tr("Schede bombole refrigerante", language),
        author="Dimensionamento Climatizzazione Pro",
    )
    style = styles()
    story = []
    for index, cylinder in enumerate(cylinders):
        if index:
            story.append(PageBreak())
        target = cylinder_url(base_url, cylinder["id"])
        story.extend(cylinder_story(cylinder, target, style, language))
    if not story:
        story.append(KeepTogether([Paragraph(tr("Nessuna bombola registrata", language), style["title"])]))
    footer = lambda canvas, document: _footer(canvas, document, language)
    document.build(story, onFirstPage=footer, onLaterPages=footer)
    return output.getvalue()
