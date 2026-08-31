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


def calculate_project(payload: dict[str, Any]) -> dict[str, Any]:
    method = payload.get("method", "quick")
    climate = payload.get("climate") or {}
    rooms = payload.get("rooms") or []
    calculator = calculate_professional if method == "professional" else calculate_quick
    results = [calculator(room, climate) for room in rooms]
    cooling_w = sum(item["total_cooling_w"] for item in results)
    heating_w = sum(item["heating_w"] for item in results)
    return {
        "project_name": payload.get("project_name") or "Nuovo progetto",
        "method": "professionale" if method == "professional" else "rapido",
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

