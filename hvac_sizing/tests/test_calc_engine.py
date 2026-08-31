import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from calc_engine import calculate_project, humidity_ratio


class CalculationTests(unittest.TestCase):
    def test_humidity_ratio_increases_with_rh(self):
        self.assertGreater(humidity_ratio(30, 70), humidity_ratio(30, 40))

    def test_quick_calculation(self):
        result = calculate_project({
            "method": "quick",
            "rooms": [{"name": "Sala", "length": 5, "width": 4, "height": 2.7,
                       "quick_w_m3_cooling": 35, "quick_w_m3_heating": 40,
                       "quick_insulation_factor": 1, "quick_exposure_factor": 1,
                       "quick_glazing_factor": 1, "people": 0, "margin_percent": 0}],
        })
        self.assertEqual(result["rooms"][0]["total_cooling_w"], 1890)
        self.assertEqual(result["totals"]["area_m2"], 20)

    def test_professional_totals_equal_room_sum(self):
        payload = {
            "method": "professional",
            "climate": {"summer_outdoor_c": 35, "summer_outdoor_rh": 60,
                        "summer_indoor_c": 26, "summer_indoor_rh": 50,
                        "winter_outdoor_c": -5, "winter_indoor_c": 20},
            "rooms": [{"name": "Ufficio", "length": 6, "width": 4, "height": 3,
                       "wall_area": 30, "wall_u": 0.7, "window_area": 5, "window_u": 1.4,
                       "solar_irradiance_w_m2": 500, "window_g_value": 0.55,
                       "shading_factor": 0.7, "infiltration_ach": 0.5,
                       "people": 4, "lighting_w": 250, "equipment_w": 500,
                       "margin_percent": 10}],
        }
        result = calculate_project(payload)
        room = result["rooms"][0]
        self.assertGreater(room["total_cooling_w"], room["sensible_cooling_w"])
        self.assertEqual(result["totals"]["cooling_w"], room["total_cooling_w"])
        self.assertGreater(room["heating_w"], 0)


if __name__ == "__main__":
    unittest.main()
