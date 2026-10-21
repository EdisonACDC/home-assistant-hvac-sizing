"""Nuova grafica 0.16.0: file statici, caratteri locali, anteprima e permessi delle nuove API."""

import re
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import app  # noqa: E402
from calc_engine import calculate_project  # noqa: E402

WWW = Path(__file__).resolve().parents[1] / "www"
USER = {"role": "user", "permissions": {"sizing": "view", "cylinders": "none", "performance": "none", "commissioning": "none"}}
NO_SIZING = {"role": "user", "permissions": {"sizing": "none", "cylinders": "edit", "performance": "none", "commissioning": "none"}}


class StaticFilesTests(unittest.TestCase):
    def test_every_script_and_style_in_index_is_served(self):
        page = (WWW / "index.html").read_text(encoding="utf-8")
        for name in re.findall(r'(?:src|href)="([\w.-]+\.(?:js|css))\?v=', page):
            with self.subTest(name=name):
                self.assertIn(name, app.APP_FILES)
                self.assertTrue((WWW / app.APP_FILES[name]).is_file())

    def test_fonts_are_local_and_present(self):
        for name, relative in app.FONT_FILES.items():
            with self.subTest(name=name):
                self.assertTrue((WWW / relative).is_file())
                self.assertEqual(app.CONTENT_TYPES[".woff2"], "font/woff2")
        css = (WWW / "styles.css").read_text(encoding="utf-8")
        self.assertNotIn("fonts.googleapis", css)
        self.assertTrue((WWW / "fonts" / "LICENSE-OFL.txt").is_file())

    def test_no_inline_style_attributes_blocked_by_csp(self):
        for name in ("index.html", "public.html", "app.js", "cylinders.js", "diagnostics.js", "tools.js", "ui.js", "public.js"):
            with self.subTest(name=name):
                self.assertNotRegex((WWW / name).read_text(encoding="utf-8"), r'\sstyle="')

    def test_versions_are_aligned(self):
        self.assertEqual(app.APP_VERSION, "0.16.1")
        self.assertIn("bombole-0.16.1", (WWW / "sw.js").read_text(encoding="utf-8"))
        for name in ("index.html", "public.html", "bombole-app.html", "admin-login.html"):
            with self.subTest(name=name):
                self.assertNotIn("v=0.16.0", (WWW / name).read_text(encoding="utf-8"))


class NewApiPermissionTests(unittest.TestCase):
    def test_preview_follows_sizing_permission(self):
        self.assertTrue(app.app_api_allowed(USER, "POST", "/api/preview"))
        self.assertFalse(app.app_api_allowed(USER, "GET", "/api/preview"))
        self.assertFalse(app.app_api_allowed(NO_SIZING, "POST", "/api/preview"))

    def test_refrigerant_table_is_read_only_for_everyone(self):
        self.assertTrue(app.app_api_allowed(NO_SIZING, "GET", "/api/refrigerants"))
        self.assertFalse(app.app_api_allowed(NO_SIZING, "POST", "/api/refrigerants"))


class PreviewTests(unittest.TestCase):
    def test_preview_matches_full_calculation(self):
        payload = {"method": "guided", "climate": {"summer_outdoor_c": 34, "summer_outdoor_rh": 50, "summer_indoor_c": 26,
                                                   "summer_indoor_rh": 50, "winter_outdoor_c": -8, "winter_indoor_c": 20},
                   "rooms": [{"name": "Soggiorno", "length": 5, "width": 4, "height": 2.7, "guided_heat": 21, "guided_cool": 26,
                              "guided_insulation": "unknown", "guided_walls": ["outside", "same", "same", "same"],
                              "guided_attic": "no", "guided_above": "same", "guided_below": "unheated",
                              "guided_windows": [{"width": 120, "height": 140, "glass": "unknown", "orientation": "s",
                                                  "shade": "none", "position": "wall", "wall": "A"}],
                              "people": 2, "lighting_w": 50, "equipment_w": 100, "margin_percent": 10}]}
        full = calculate_project(payload)
        self.assertGreater(full["rooms"][0]["total_cooling_kw"], 0)
        # Il campo "wall" serve solo al disegno: senza di esso il risultato non cambia.
        del payload["rooms"][0]["guided_windows"][0]["wall"]
        self.assertEqual(calculate_project(payload)["rooms"][0]["total_cooling_kw"], full["rooms"][0]["total_cooling_kw"])


class CapacityApiTests(unittest.TestCase):
    """0.16.1: capacità impostabile sulle bombole già registrate, solo per gli amministratori."""

    def test_only_admin_can_change_capacity(self):
        user = {"role": "user", "permissions": {"sizing": "none", "cylinders": "edit", "performance": "none", "commissioning": "none"}}
        self.assertFalse(app.app_api_allowed(user, "POST", "/api/cylinders/abc/capacity"))
        self.assertTrue(app.app_api_allowed({"role": "admin", "permissions": {}}, "POST", "/api/cylinders/abc/capacity"))

    def test_capacity_route_and_german_errors(self):
        source = (Path(__file__).resolve().parents[1] / "app.py").read_text(encoding="utf-8")
        self.assertIn('endswith("/capacity")', source)
        from errors_i18n import translate_error
        self.assertNotEqual(translate_error("La capacità è inferiore al gas già registrato nella bombola"),
                            "La capacità è inferiore al gas già registrato nella bombola")


if __name__ == "__main__":
    unittest.main()
