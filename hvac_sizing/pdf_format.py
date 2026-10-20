"""Formati comuni dei PDF: numeri con la virgola, ora locale e CO₂ leggibile con ogni carattere."""

from __future__ import annotations

import os
from datetime import datetime, timezone

try:
    from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
except ImportError:  # pragma: no cover - Python < 3.9
    ZoneInfo = None
    ZoneInfoNotFoundError = Exception


def local_zone():
    """Fuso dell'impianto: TZ impostato da Home Assistant, altrimenti Europe/Rome; UTC se i dati mancano."""
    if ZoneInfo is None:
        return timezone.utc
    for name in (os.environ.get("TZ", "").strip(), "Europe/Rome"):
        if not name:
            continue
        try:
            return ZoneInfo(name)
        except (ZoneInfoNotFoundError, ValueError, OSError):
            continue
    return timezone.utc


def to_local(value: object = None) -> datetime | None:
    if value is None:
        moment = datetime.now(timezone.utc)
    else:
        try:
            moment = datetime.fromisoformat(str(value))
        except (TypeError, ValueError):
            return None
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return moment.astimezone(local_zone())


def date_time(value: object = None, language: str = "it") -> str:
    moment = to_local(value)
    if moment is None:
        return str(value or "—")
    text = moment.strftime("%d.%m.%Y %H:%M" if language == "de" else "%d/%m/%Y %H:%M")
    return text + (" UTC" if moment.utcoffset() is not None and moment.tzinfo == timezone.utc else "")


def number(value: object, decimals: int | None = None) -> str:
    """Numero con virgola decimale e punto delle migliaia (uguale in italiano e tedesco)."""
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return str(value if value not in (None, "") else "—")
    if decimals is None:
        text = f"{numeric:,.3f}".rstrip("0").rstrip(".")
    else:
        text = f"{numeric:,.{decimals}f}"
    if text in ("-0", "-0.0"):
        text = text[1:]
    return text.replace(",", "X").replace(".", ",").replace("X", ".")


def co2_markup(kilograms: object) -> str:
    """CO₂ equivalente per Paragraph di ReportLab: il pedice usa il tag <sub>, non il carattere ₂."""
    value = float(kilograms or 0)
    if value >= 1:
        return f"{number(value / 1000, 3)}&nbsp;t&nbsp;CO<sub>2</sub>e"
    return f"{number(value, 3)}&nbsp;kg&nbsp;CO<sub>2</sub>e"
