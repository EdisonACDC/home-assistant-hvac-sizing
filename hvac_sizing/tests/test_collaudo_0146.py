"""Regressioni dei difetti trovati nel collaudo della versione 0.14.5."""

import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import app  # noqa: E402
from calc_engine import calculate_project  # noqa: E402
from cylinder_pdf import generate_cylinder_pdf  # noqa: E402
from errors_i18n import translate_error  # noqa: E402
from pdf_format import co2_markup, date_time, number  # noqa: E402

CLIMATE = {"summer_outdoor_c": 32, "summer_outdoor_rh": 50, "summer_indoor_c": 26,
           "summer_indoor_rh": 50, "winter_outdoor_c": -15, "winter_indoor_c": 20}


class GwpTests(unittest.TestCase):
    def test_values_follow_regulation_2024_573(self):
        expected = {"R449A": 1396, "R454B": 465, "R513A": 629, "R1234yf": 0.5, "R1234ze": 1.37,
                    "R290": 0.02, "R600a": 0, "R32": 675, "R410A": 2088, "R452A": 2139, "R448A": 1386}
        for gas, gwp in expected.items():
            with self.subTest(gas=gas):
                self.assertEqual(app.refrigerant_gwp(gas), gwp)

    def test_table_has_43_refrigerants_plus_ammonia(self):
        self.assertEqual(len(app.REFRIGERANT_GWP), 45)  # 43 gas + alias R507A + R717

    def test_empty_gwp_uses_refrigerant_value(self):
        values = app.environmental_values({"amount_kg": "0,65", "gwp": ""}, "R410A", "remove")
        self.assertEqual(values[4], 2088)
        self.assertAlmostEqual(values[5], 1357.2)


class ValidationTests(unittest.TestCase):
    def test_quick_rejects_missing_dimensions(self):
        with self.assertRaisesRegex(ValueError, "Lunghezza"):
            calculate_project({"method": "quick", "rooms": [{"name": "Vuoto"}], "climate": CLIMATE})

    def test_professional_rejects_negative_values_in_german(self):
        payload = {"method": "professional", "language": "de", "climate": CLIMATE,
                   "rooms": [{"name": "Büro", "length": 5, "width": 4, "wall_area": -10}]}
        with self.assertRaisesRegex(ValueError, "Wandfläche"):
            calculate_project(payload)

    def test_quick_people_match_other_methods(self):
        room = {"name": "Q", "length": 5, "width": 4, "height": 2.7, "people": 2, "margin_percent": 0,
                "quick_w_m3_cooling": 0, "quick_w_m3_heating": 0}
        result = calculate_project({"method": "quick", "rooms": [room], "climate": CLIMATE})["rooms"][0]
        self.assertEqual(result["sensible_cooling_w"], 150)
        self.assertEqual(result["latent_cooling_w"], 110)

    def test_limits_use_decimal_comma(self):
        with self.assertRaisesRegex(ValueError, "da 0,1 a 100"):
            calculate_project({"method": "quick", "rooms": [{"name": "L", "length": 0, "width": 3}], "climate": CLIMATE})


class ErrorTranslationTests(unittest.TestCase):
    def test_fixed_messages(self):
        self.assertEqual(translate_error("Nome operatore o PIN non valido"), "Bedienername oder PIN ungültig")
        self.assertEqual(translate_error("Il prelievo supera il refrigerante disponibile"), "Die Entnahme übersteigt das verfügbare Kältemittel")

    def test_field_messages(self):
        self.assertEqual(translate_error("Controlla la tara: non può essere un valore negativo"), "Tara: darf nicht negativ sein")
        self.assertEqual(translate_error("Inserisci il peso totale"), "Gesamtgewicht: Wert eingeben")

    def test_every_server_error_has_german(self):
        import re
        source = (Path(app.__file__)).read_text(encoding="utf-8")
        messages = set(re.findall(r'(?:ValueError|_error)\(\s*["\']([^"\'{]{8,})["\']', source))
        untranslated = sorted(m for m in messages if translate_error(m) == m)
        self.assertEqual(untranslated, [])

    def test_negative_message_is_gender_neutral(self):
        with self.assertRaisesRegex(ValueError, "^Controlla la tara: non può essere un valore negativo$"):
            app.number("-1", "la tara")


class ProxyTests(unittest.TestCase):
    def test_only_tunnel_addresses_are_trusted(self):
        self.assertTrue(app.trusted_proxy("127.0.0.1"))
        self.assertTrue(app.trusted_proxy("172.30.32.1"))
        self.assertFalse(app.trusted_proxy("192.168.1.50"))
        self.assertFalse(app.trusted_proxy("10.0.0.7"))

    def test_target_limit_blocks_after_ten_failures(self):
        target = "pin:test-cylinder"
        app.clear_target_failures(target)
        for _ in range(app.TARGET_ATTEMPT_LIMIT):
            self.assertFalse(app.target_rate_limited(target))
            app.record_target_failure(target)
        self.assertTrue(app.target_rate_limited(target))
        app.clear_target_failures(target)
        self.assertFalse(app.target_rate_limited(target))


class PdfFormatTests(unittest.TestCase):
    def test_numbers_use_decimal_comma(self):
        self.assertEqual(number(1.48, 2), "1,48")
        self.assertEqual(number(1250.5, 1), "1.250,5")
        self.assertEqual(number(20.0), "20")

    def test_co2_uses_subscript_markup(self):
        self.assertEqual(co2_markup(1357.2), "1,357&nbsp;t&nbsp;CO<sub>2</sub>e")
        self.assertEqual(co2_markup(0.013), "0,013&nbsp;kg&nbsp;CO<sub>2</sub>e")

    def test_dates_are_local(self):
        previous = os.environ.get("TZ")
        os.environ["TZ"] = "Europe/Rome"
        try:
            self.assertEqual(date_time("2026-10-20T18:34:00+00:00", "it"), "20/10/2026 20:34")
            self.assertEqual(date_time("2026-01-10T18:34:00+00:00", "de"), "10.01.2026 19:34")
        finally:
            if previous is None:
                os.environ.pop("TZ", None)
            else:
                os.environ["TZ"] = previous

    def test_cylinder_pdf_has_no_missing_glyph(self):
        cylinder = {"id": "x", "code": "R410-003", "name": "R410A", "refrigerant": "R410A", "tare_kg": 5.1,
                    "capacity_kg": 10, "current_gas_kg": 3.9, "total_weight_kg": 9, "notes": "",
                    "created_at": "2026-10-20T18:34:00+00:00", "updated_at": "2026-10-20T18:34:00+00:00",
                    "history": [{"operation": "remove", "amount_kg": 0.65, "gas_after_kg": 3.9, "gwp": 2088,
                                 "co2_equivalent_kg": 1357.2, "created_at": "2026-10-20T18:34:00+00:00", "notes": ""}]}
        pdf = generate_cylinder_pdf([cylinder], "https://example.test", "it")
        self.assertTrue(pdf.startswith(b"%PDF"))


if __name__ == "__main__":
    unittest.main()
