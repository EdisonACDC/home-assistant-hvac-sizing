"""Motore di calcolo trasparente per carichi HVAC stanza per stanza."""

from __future__ import annotations

import math
from typing import Any


AIR_HEAT_CAPACITY_WH_M3K = 0.335
AIR_DENSITY_KG_M3 = 1.2
WATER_LATENT_HEAT_J_KG = 2_501_000


def _number(value: Any, default: float = 0.0, minimum: float | None = 0.0) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError):
        result = default
    if not math.isfinite(result):
        result = default
    if minimum is not None:
        result = max(minimum, result)
    return result


def _saturation_pressure_pa(temp_c: float) -> float:
    """Magnus equation, sufficient for ordinary HVAC design temperatures."""
    return 610.94 * math.exp((17.625 * temp_c) / (temp_c + 243.04))


def humidity_ratio(temp_c: float, relative_humidity: float, pressure_pa: float = 101_325) -> float:
    rh = min(100.0, max(0.0, relative_humidity)) / 100.0
    vapor_pressure = rh * _saturation_pressure_pa(temp_c)
    return 0.62198 * vapor_pressure / max(1.0, pressure_pa - vapor_pressure)


def calculate_quick(room: dict[str, Any], climate: dict[str, Any]) -> dict[str, Any]:
    length = _number(room.get("length"))
    width = _number(room.get("width"))
    height = _number(room.get("height"), 2.7)
    area = length * width
    volume = area * height

    base_cooling = _number(room.get("quick_w_m3_cooling"), 35)
    base_heating = _number(room.get("quick_w_m3_heating"), 40)
    insulation = _number(room.get("quick_insulation_factor"), 1.0)
    exposure = _number(room.get("quick_exposure_factor"), 1.0)
    glazing = _number(room.get("quick_glazing_factor"), 1.0)
    people = _number(room.get("people"), 0)
    lighting = _number(room.get("lighting_w"), 0)
    equipment = _number(room.get("equipment_w"), 0)
    margin = _number(room.get("margin_percent"), 10) / 100

    envelope_cooling = volume * base_cooling * insulation * exposure * glazing
    internal = people * 120 + lighting + equipment
    sensible = envelope_cooling + internal
    latent = people * 55
    cooling = (sensible + latent) * (1 + margin)
    heating = volume * base_heating * insulation * _number(climate.get("heating_factor"), 1.0) * (1 + margin)

    return _result(room, area, volume, sensible * (1 + margin), latent * (1 + margin), cooling, heating, {
        "involucro_rapido": envelope_cooling,
        "persone_luci_apparecchi": internal,
        "margine_percento": margin * 100,
    }, "rapido")


def calculate_professional(room: dict[str, Any], climate: dict[str, Any]) -> dict[str, Any]:
    length = _number(room.get("length"))
    width = _number(room.get("width"))
    height = _number(room.get("height"), 2.7)
    area = length * width
    volume = area * height

    t_out_cool = _number(climate.get("summer_outdoor_c"), 35, None)
    rh_out = _number(climate.get("summer_outdoor_rh"), 50)
    t_in_cool = _number(climate.get("summer_indoor_c"), 26, None)
    rh_in = _number(climate.get("summer_indoor_rh"), 50)
    t_out_heat = _number(climate.get("winter_outdoor_c"), -5, None)
    t_in_heat = _number(climate.get("winter_indoor_c"), 20, None)
    delta_cool = max(0.0, t_out_cool - t_in_cool)
    delta_heat = max(0.0, t_in_heat - t_out_heat)

    components = (
        ("pareti", "wall_area", "wall_u"),
        ("finestre", "window_area", "window_u"),
        ("tetto", "roof_area", "roof_u"),
        ("pavimento", "floor_area", "floor_u"),
    )
    transmission_cool = 0.0
    transmission_heat = 0.0
    component_breakdown: dict[str, float] = {}
    for label, area_key, u_key in components:
        component_area = _number(room.get(area_key), 0)
        u_value = _number(room.get(u_key), 0)
        ua = component_area * u_value
        cool_value = ua * delta_cool
        heat_value = ua * delta_heat
        transmission_cool += cool_value
        transmission_heat += heat_value
        component_breakdown[f"trasmissione_{label}"] = cool_value

    window_area = _number(room.get("window_area"), 0)
    irradiance = _number(room.get("solar_irradiance_w_m2"), 450)
    g_value = min(1.0, _number(room.get("window_g_value"), 0.55))
    shading = min(1.5, _number(room.get("shading_factor"), 0.7))
    solar = window_area * irradiance * g_value * shading

    ach = _number(room.get("infiltration_ach"), 0.5)
    mechanical_airflow = _number(room.get("ventilation_m3h"), 0)
    airflow = volume * ach + mechanical_airflow
    air_sensible_cool = AIR_HEAT_CAPACITY_WH_M3K * airflow * delta_cool
    air_sensible_heat = AIR_HEAT_CAPACITY_WH_M3K * airflow * delta_heat

    w_out = humidity_ratio(t_out_cool, rh_out)
    w_in = humidity_ratio(t_in_cool, rh_in)
    dry_air_kg_s = AIR_DENSITY_KG_M3 * airflow / 3600
    air_latent = max(0.0, dry_air_kg_s * (w_out - w_in) * WATER_LATENT_HEAT_J_KG)

    people = _number(room.get("people"), 0)
    simultaneity = min(1.0, _number(room.get("occupancy_factor"), 1.0))
    people_sensible = people * _number(room.get("person_sensible_w"), 75) * simultaneity
    people_latent = people * _number(room.get("person_latent_w"), 55) * simultaneity
    lighting = _number(room.get("lighting_w"), 0) * min(1.0, _number(room.get("lighting_factor"), 1.0))
    equipment = _number(room.get("equipment_w"), 0) * min(1.0, _number(room.get("equipment_factor"), 1.0))

    sensible_before_margin = transmission_cool + solar + air_sensible_cool + people_sensible + lighting + equipment
    latent_before_margin = air_latent + people_latent
    margin = _number(room.get("margin_percent"), 10) / 100
    sensible = sensible_before_margin * (1 + margin)
    latent = latent_before_margin * (1 + margin)
    cooling = sensible + latent
    heating = (transmission_heat + air_sensible_heat) * (1 + margin)

    breakdown = {
        **component_breakdown,
        "trasmissione_totale": transmission_cool,
        "apporto_solare_finestre": solar,
        "aria_sensibile": air_sensible_cool,
        "aria_latente": air_latent,
        "persone_sensibile": people_sensible,
        "persone_latente": people_latent,
        "illuminazione": lighting,
        "apparecchiature": equipment,
        "portata_aria_totale_m3h": airflow,
        "margine_percento": margin * 100,
    }
    return _result(room, area, volume, sensible, latent, cooling, heating, breakdown, "professionale")


def _result(room: dict[str, Any], area: float, volume: float, sensible: float, latent: float,
            cooling: float, heating: float, breakdown: dict[str, float], method: str) -> dict[str, Any]:
    shr = sensible / cooling if cooling > 0 else 0
    return {
        "id": room.get("id"),
        "name": room.get("name") or "Locale senza nome",
        "method": method,
        "area_m2": round(area, 2),
        "volume_m3": round(volume, 2),
        "sensible_cooling_w": round(sensible),
        "latent_cooling_w": round(latent),
        "total_cooling_w": round(cooling),
        "total_cooling_kw": round(cooling / 1000, 2),
        "heating_w": round(heating),
        "heating_kw": round(heating / 1000, 2),
        "shr": round(shr, 3),
        "breakdown": {key: round(value, 2) for key, value in breakdown.items()},
    }


# Indicative presets for a simplified steady-state estimate, not certified design data.
GUIDED_INSULATION = {
    'good': (0.30, 0.25, 0.35), 'medium': (0.70, 0.60, 0.70),
    'poor': (1.50, 1.50, 1.20), 'unknown': (0.80, 0.80, 0.80),
}
GUIDED_GLASS = {'single': (5.0, 0.80), 'double_old': (2.8, 0.70),
                'double_low': (1.4, 0.55), 'triple': (0.9, 0.45), 'unknown': (2.8, 0.70)}
GUIDED_SUN = {'n': 150, 'ne': 300, 'e': 450, 'se': 450, 's': 450,
              'sw': 500, 'w': 500, 'nw': 300, 'unknown': 450}


def calculate_guided(room: dict[str, Any], climate: dict[str, Any]) -> dict[str, Any]:
    labels = {
        'length': ('Lunghezza (m)', 'Länge (m)'), 'width': ('Larghezza (m)', 'Breite (m)'),
        'height': ('Altezza (m)', 'Höhe (m)'),
        'guided_heat': ('Temperatura desiderata in inverno (°C)', 'Gewünschte Wintertemperatur (°C)'),
        'guided_cool': ('Temperatura desiderata in estate (°C)', 'Gewünschte Sommertemperatur (°C)'),
        'guided_roof_area': ('Superficie delle falde (m²)', 'Dachschrägenfläche (m²)'),
        'winter_outdoor_c': ('Temperatura esterna invernale (°C)', 'Außentemperatur Winter (°C)'),
        'summer_outdoor_c': ('Temperatura esterna estiva (°C)', 'Außentemperatur Sommer (°C)'),
        'summer_outdoor_rh': ('Umidità esterna (%)', 'Außenfeuchte (%)'),
        'summer_indoor_rh': ('Umidità interna (%)', 'Innenfeuchte (%)'),
        'people': ('Persone', 'Personen'), 'lighting_w': ('Illuminazione (W)', 'Beleuchtung (W)'),
        'equipment_w': ('Apparecchiature (W)', 'Geräte (W)'), 'margin_percent': ('Margine (%)', 'Reserve (%)'),
    }
    german = climate.get('_language') == 'de'
    def read(key, low=0, high=10000, source=None):
        data = room if source is None else source
        label = labels.get(key, (key, key))[int(german)]
        prefix = str(room.get('name') or ('Raum' if german else 'Locale'))
        if source is not None and source is not climate:
            index = next((i + 1 for i, item in enumerate(room.get('guided_windows', [])) if item is source), 1)
            prefix += f" · {'Fenster' if german else 'Finestra'} {index}"
            label = ('Breite (cm)' if key == 'width' else 'Höhe (cm)') if german else ('Larghezza (cm)' if key == 'width' else 'Altezza (cm)')
        raw = data.get(key)
        try:
            value = float(raw)
        except (TypeError, ValueError):
            message = 'Wert fehlt oder ist ungültig' if german else 'dato mancante o non valido'
            raise ValueError(f'{prefix} — {label}: {message}.')
        if not math.isfinite(value) or not low <= value <= high:
            if german:
                raise ValueError(f'{prefix} — {label}: eingegeben {raw}; zulässig {low:g} bis {high:g}.')
            raise ValueError(f'{prefix} — {label}: inserito {raw}; valore ammesso da {low:g} a {high:g}.')
        return value

    length, width, height = (read(k, 0.1, 100) for k in ('length', 'width', 'height'))
    walls = room.get('guided_walls')
    if not isinstance(walls, list) or len(walls) != 4 or any(x not in ('outside', 'same', 'unheated') for x in walls):
        raise ValueError('Indica cosa c’è oltre ciascuna delle quattro pareti.')
    attic = room.get('guided_attic')
    above, below = room.get('guided_above'), room.get('guided_below')
    if attic not in ('yes', 'no') or below not in ('same', 'unheated', 'outside', 'ground') or (attic == 'no' and above not in ('same', 'unheated', 'outside')):
        raise ValueError('Indica se è una mansarda e cosa c’è sopra e sotto.')
    insulation = room.get('guided_insulation', 'unknown')
    if insulation not in GUIDED_INSULATION:
        raise ValueError('Seleziona lo stato di isolamento.')
    wall_u, roof_u, floor_u = GUIDED_INSULATION[insulation]
    heat_in, cool_in = read('guided_heat', 5, 35), read('guided_cool', 16, 35)
    local_climate = dict(climate, winter_indoor_c=heat_in, summer_indoor_c=cool_in)
    for key, lo, hi in [('winter_outdoor_c', -50, 30), ('summer_outdoor_c', 10, 55),
                        ('summer_outdoor_rh', 0, 100), ('summer_indoor_rh', 0, 100)]:
        read(key, lo, hi, climate)
    windows = room.get('guided_windows', [])
    if not isinstance(windows, list) or len(windows) > 30:
        raise ValueError('Controlla il numero di finestre (massimo 30).')
    gross = sum(side * height for side, state in zip([length, width, length, width], walls) if state == 'outside')
    glass_area = window_ua = solar = roof_glass_area = 0.0
    for window in windows:
        area = read('width', 1, 1000, window) * read('height', 1, 1000, window) / 10000
        glazing = window.get('glass', 'unknown')
        orientation = window.get('orientation', 'unknown')
        shade = window.get('shade', 'unknown')
        position = window.get('position', 'wall')
        if glazing not in GUIDED_GLASS or orientation not in GUIDED_SUN or shade not in ('none', 'external', 'unknown') or position not in ('wall', 'roof'):
            raise ValueError('Controlla tipo di vetro, esposizione e schermatura delle finestre.')
        if position == 'roof' and attic != 'yes':
            raise ValueError('Per i lucernari seleziona mansarda.')
        u, g = GUIDED_GLASS[glazing]
        glass_area += area
        window_ua += area * u
        roof_glass_area += area if position == 'roof' else 0
        solar += area * g * (600 if position == 'roof' else GUIDED_SUN[orientation]) * (0.3 if shade == 'external' else 1)
    roof_area = read('guided_roof_area', 0.1, 10000) if attic == 'yes' else length * width
    if glass_area - roof_glass_area > gross + 1e-6 or roof_glass_area > roof_area:
        raise ValueError('La superficie delle finestre supera quella delle pareti esterne o del tetto.')
    outer_roof = attic == 'yes' or above == 'outside'
    derived = dict(room, wall_area=gross - glass_area + roof_glass_area, wall_u=wall_u,
                   window_area=glass_area, window_u=window_ua / glass_area if glass_area else 0,
                   roof_area=roof_area - roof_glass_area if outer_roof else 0, roof_u=roof_u,
                   floor_area=length * width if below == 'outside' else 0, floor_u=floor_u,
                   solar_irradiance_w_m2=solar / glass_area if glass_area else 0,
                   window_g_value=1, shading_factor=1, infiltration_ach=0.5, ventilation_m3h=0,
                   occupancy_factor=1, person_sensible_w=75, person_latent_w=55,
                   lighting_factor=1, equipment_factor=1,
                   people=read('people', 0, 500), lighting_w=read('lighting_w'), equipment_w=read('equipment_w'),
                   margin_percent=read('margin_percent', 0, 50))
    base = calculate_professional(derived, local_climate)
    # Adjacent unheated spaces are explicit scenario assumptions; no outside delta is applied to heated neighbours.
    adjacent_ua = sum(side * height * 1.5 for side, state in zip([length, width, length, width], walls) if state == 'unheated')
    adjacent_ua += length * width * roof_u if attic == 'no' and above == 'unheated' else 0
    adjacent_ua += length * width * floor_u if below == 'unheated' else 0
    extra_heat = adjacent_ua * max(0, heat_in - 12)
    extra_cool = adjacent_ua * max(0, 28 - cool_in)
    if below == 'ground':
        extra_heat += length * width * floor_u * max(0, heat_in - 10)
        extra_cool += length * width * floor_u * max(0, 18 - cool_in)
    roof_sun = derived['roof_area'] * roof_u * 10  # declared sol-air increment; no dynamic simulation
    factor = 1 + derived['margin_percent'] / 100
    sensible = base['sensible_cooling_w'] + (extra_cool + roof_sun) * factor
    latent = base['latent_cooling_w']
    result = _result(room, length * width, length * width * height, sensible, latent,
                     sensible + latent, base['heating_w'] + extra_heat * factor,
                     dict(base['breakdown'], confinanti_inverno=extra_heat, confinanti_estate=extra_cool,
                          sole_tetto=roof_sun), 'guidato')
    result['guided_details'] = {
        'Pareti esterne nette m²': round(derived['wall_area'], 2), 'Finestre m²': round(glass_area, 2),
        'Pareti esterne': walls.count('outside'), 'Pareti interne': 4 - walls.count('outside'),
        'Temperatura interna invernale °C': heat_in, 'Temperatura interna estiva °C': cool_in,
        'U pareti W/m²K': wall_u, 'U finestre medio W/m²K': round(derived['window_u'], 2),
        'U tetto W/m²K': roof_u, 'U pavimento W/m²K': floor_u,
        'Tetto verso esterno m²': round(derived['roof_area'], 2), 'Ricambi aria vol/h': 0.5,
        'Apporto solare finestre W': round(solar), 'Margine %': derived['margin_percent'],
    }
    result['guided_notes'] = [
        'Stima guidata: isolamento e vetri usano valori indicativi, non misurati. Non è un calcolo normativo.',
        'La località non imposta automaticamente il clima: verifica le temperature esterne di progetto.',
        'Ricambio aria assunto 0,5 vol/h; umidità dai dati del clima. Ponti termici e inerzia non modellati.',
        'Sole sulle finestre stimato per esposizione; non è una simulazione oraria. Non sommare i picchi come se fossero simultanei.',
    ]
    if insulation == 'unknown' or any(w.get('glass', 'unknown') == 'unknown' or w.get('orientation', 'unknown') == 'unknown' or w.get('shade', 'unknown') == 'unknown' for w in windows):
        result['guided_notes'].append('Sono presenti dati sconosciuti: verifica le ipotesi nei dettagli prima di scegliere la macchina.')
    if adjacent_ua:
        result['guided_notes'].append('Locali non riscaldati ipotizzati a 12 °C in inverno e 28 °C in estate; U pareti interne 1,5 W/m²K.')
    if below == 'ground':
        result['guided_notes'].append('Terreno ipotizzato a 10 °C in inverno e 18 °C in estate: stima semplificata, senza modello del terreno.')
    if outer_roof:
        result['guided_notes'].append('Tetto: incremento estivo equivalente di 10 °C per il sole; superficie reale delle falde e isolamento da verificare.')
    return result


def outdoor_proposal(results, language='it'):
    de = language == 'de'
    count = len(results)
    types = {1: 'Mono-split', 2: 'Dual-split', 3: 'Trial-split', 4: 'Quadri-split', 5: 'Penta-split'}
    configuration = types.get(count, 'Mehrere Außeneinheiten / projektspezifisches System' if de else 'Più unità esterne / sistema da progettare')
    return {
        'indoor_units': count, 'configuration': configuration,
        'cooling_kw': round(sum(r['total_cooling_w'] for r in results)/1000, 2),
        'heating_kw': round(sum(r['heating_w'] for r in results)/1000, 2),
        'assumption': ('Annahme: ein Innengerät je Raum; alle Räume gleichzeitig in derselben Betriebsart.' if de else 'Ipotesi: una unità interna per locale; tutti i locali utilizzati insieme nella stessa modalità.'),
        'notes': [
            ('Die Summe enthält bereits die gewählten Reserven. Es wird kein Gleichzeitigkeitsabschlag angewandt.' if de else 'La somma include già i margini scelti. Non viene applicata una riduzione per contemporaneità.'),
            ('Thermische Leistung, nicht elektrische Aufnahme. Bei den Auslegungs-Außentemperaturen die verfügbare Kühl- und Heizleistung prüfen.' if de else 'Sono potenze termiche, non consumi elettrici. Verificare la capacità disponibile in freddo e caldo alle temperature esterne di progetto.'),
            ('Anschlusszahl, zulässige Kombinationen, Leistung je Innengerät, Mindestmodulation, Rohrlängen und Abtauung in den Herstellerunterlagen prüfen.' if de else 'Verificare attacchi, combinazioni ammesse, potenza disponibile a ogni unità interna, modulazione minima, tubazioni e sbrinamento nelle tabelle del costruttore.'),
            ('Alternativ sind separate Mono-Split-Systeme möglich. Die Raumzahl allein bestimmt nicht das passende Außengerät.' if de else 'In alternativa sono possibili mono-split separati. Il numero dei locali da solo non determina l’unità esterna adatta.'),
        ]}


def calculate_project(payload: dict[str, Any]) -> dict[str, Any]:
    method = payload.get("method", "quick")
    climate = dict(payload.get("climate") or {}, _language=payload.get("language", "it"))
    rooms = payload.get("rooms") or []
    calculator = {"guided": calculate_guided, "professional": calculate_professional, "quick": calculate_quick}.get(method, calculate_quick)
    results = [calculator(room, climate) for room in rooms]
    cooling_w = sum(item["total_cooling_w"] for item in results)
    heating_w = sum(item["heating_w"] for item in results)
    return {
        "outdoor": outdoor_proposal(results, payload.get("language", "it")),
        "project_name": payload.get("project_name") or "Nuovo progetto",
        "method": {"guided": "guidato", "professional": "professionale"}.get(method, "rapido"),
        "rooms": results,
        "totals": {
            "rooms": len(results),
            "area_m2": round(sum(item["area_m2"] for item in results), 2),
            "volume_m3": round(sum(item["volume_m3"] for item in results), 2),
            "cooling_w": cooling_w,
            "cooling_kw": round(cooling_w / 1000, 2),
            "heating_w": heating_w,
            "heating_kw": round(heating_w / 1000, 2),
        },
        "disclaimer": "Stima tecnica di progetto: verificare dati, condizioni di progetto e requisiti normativi prima della selezione definitiva delle macchine.",
    }

