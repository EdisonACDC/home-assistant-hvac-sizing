import json
import sys
import tempfile
import threading
import types
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from unittest import mock

try:
    import qrcode  # noqa: F401
except ImportError:
    qrcode = types.ModuleType("qrcode")
    qrcode.constants = types.SimpleNamespace(ERROR_CORRECT_M=0)
    qrcode.QRCode = object
    qrcode_image = types.ModuleType("qrcode.image")
    qrcode_svg = types.ModuleType("qrcode.image.svg")
    qrcode_svg.SvgPathImage = object
    sys.modules.update({"qrcode": qrcode, "qrcode.image": qrcode_image, "qrcode.image.svg": qrcode_svg})

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import app


class CylinderRegisterTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="hvac-register-")
        root = Path(self.temporary.name)
        app.DATA_DIR = root
        app.DB_PATH = root / "projects.db"
        app.OPTIONS_PATH = root / "options.json"
        app.QR_SECRET_PATH = root / "qr-secret.key"
        self.admin_password = "Password-Sicura-2468"
        app.OPTIONS_PATH.write_text(json.dumps({
            "external_url": "https://bombole.example",
            "admin_password": self.admin_password,
        }))
        app.FAILED_ADMIN_ATTEMPTS.clear()
        self.server = app.ThreadingHTTPServer(("127.0.0.1", 0), app.Handler)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.base = f"http://127.0.0.1:{self.server.server_port}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.temporary.cleanup()

    def request(self, path, payload=None, method=None):
        body = None if payload is None else json.dumps(payload).encode()
        request = urllib.request.Request(
            self.base + path,
            data=body,
            method=method,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(request, timeout=3) as response:
                return response.status, json.loads(response.read())
        except urllib.error.HTTPError as error:
            return error.code, json.loads(error.read())

    def create_cylinder(self):
        status, cylinder = self.request(
            "/api/cylinders",
            {
                "name": "Bombola prova",
                "code": "R32-EDIT",
                "refrigerant": "R32",
                "tare_kg": "4,250",
                "current_gas_kg": "2,500",
                "capacity_kg": "5,000",
            },
            "POST",
        )
        self.assertEqual(status, 201)
        return cylinder

    def test_creation_calculates_total_from_tare_and_gas(self):
        cylinder = self.create_cylinder()
        self.assertEqual(cylinder["tare_kg"], 4.25)
        self.assertEqual(cylinder["current_gas_kg"], 2.5)
        self.assertEqual(cylinder["total_weight_kg"], 6.75)
        self.assertEqual(cylinder["gwp"], 675)

    def test_machine_data_gwp_and_co2_equivalent_are_recorded(self):
        cylinder = self.create_cylinder()
        status, _ = self.request(
            f"/api/cylinders/{cylinder['id']}/transactions",
            {
                "operation": "add",
                "amount_kg": 0.5,
                "machine_brand": "Toshiba",
                "machine_model": "RAS-5M34G3AVG-E",
                "machine_serial": "TEST-123",
                "machine_charge_kg": 2.4,
                "emitted_kg": 0.2,
            },
            "POST",
        )
        self.assertEqual(status, 201)
        _, detail = self.request(f"/api/cylinders/{cylinder['id']}")
        movement = next(item for item in detail["history"] if item["operation"] == "add")
        self.assertEqual(movement["machine_brand"], "Toshiba")
        self.assertEqual(movement["machine_model"], "RAS-5M34G3AVG-E")
        self.assertEqual(movement["gwp"], 675)
        self.assertEqual(movement["co2_equivalent_kg"], 337.5)
        self.assertEqual(movement["co2_equivalent_t"], 0.3375)
        self.assertEqual(movement["machine_co2_equivalent_kg"], 1620.0)
        self.assertEqual(movement["machine_co2_equivalent_t"], 1.62)
        self.assertEqual(movement["emission_co2_equivalent_kg"], 135.0)
        self.assertEqual(movement["emission_co2_equivalent_t"], 0.135)

    def test_qr_print_page_opens_as_standalone_html(self):
        cylinder = self.create_cylinder()
        with mock.patch.object(app, "qr_svg", return_value=b'<svg xmlns="http://www.w3.org/2000/svg"></svg>'):
            with urllib.request.urlopen(
                self.base + f"/api/cylinders/{cylinder['id']}/qr-print", timeout=3
            ) as response:
                page = response.read().decode()
                self.assertEqual(response.status, 200)
                self.assertIn("text/html", response.headers["Content-Type"])
                self.assertIn("Stampa QR code", page)

    def test_admin_edit_recalculates_following_register(self):
        cylinder = self.create_cylinder()
        cylinder_id = cylinder["id"]
        self.assertEqual(
            self.request(
                f"/api/cylinders/{cylinder_id}/transactions",
                {"operation": "remove", "amount_kg": 0.5, "notes": "Cliente"},
                "POST",
            )[0],
            201,
        )
        _, detail = self.request(f"/api/cylinders/{cylinder_id}")
        initial = next(item for item in detail["history"] if item["operation"] == "initial")
        status, updated = self.request(
            f"/api/cylinders/{cylinder_id}/transactions/{initial['id']}",
            {
                "operation": "initial",
                "amount_kg": 3.0,
                "notes": "Valore corretto",
                "admin_password": self.admin_password,
            },
            "PUT",
        )
        self.assertEqual(status, 200)
        self.assertEqual(updated["current_gas_kg"], 2.5)
        self.assertEqual(updated["total_weight_kg"], 6.75)
        chronological = list(reversed(updated["history"]))
        self.assertEqual(chronological[0]["gas_after_kg"], 3.0)
        self.assertEqual(chronological[0]["total_weight_kg"], 7.25)
        self.assertIsNotNone(chronological[0]["edited_at"])
        self.assertEqual(chronological[1]["gas_before_kg"], 3.0)
        self.assertEqual(chronological[1]["gas_after_kg"], 2.5)

    def test_invalid_historical_edit_is_rolled_back(self):
        cylinder = self.create_cylinder()
        cylinder_id = cylinder["id"]
        self.request(
            f"/api/cylinders/{cylinder_id}/transactions",
            {"operation": "remove", "amount_kg": 2.0},
            "POST",
        )
        _, detail = self.request(f"/api/cylinders/{cylinder_id}")
        initial = next(item for item in detail["history"] if item["operation"] == "initial")
        status, _ = self.request(
            f"/api/cylinders/{cylinder_id}/transactions/{initial['id']}",
            {
                "operation": "initial",
                "amount_kg": 1.0,
                "admin_password": self.admin_password,
            },
            "PUT",
        )
        self.assertEqual(status, 400)
        _, unchanged = self.request(f"/api/cylinders/{cylinder_id}")
        self.assertEqual(unchanged["current_gas_kg"], 0.5)
        saved_initial = next(item for item in unchanged["history"] if item["operation"] == "initial")
        self.assertEqual(saved_initial["gas_after_kg"], 2.5)

    def test_admin_edit_rejects_wrong_password_without_changing_register(self):
        cylinder = self.create_cylinder()
        cylinder_id = cylinder["id"]
        _, detail = self.request(f"/api/cylinders/{cylinder_id}")
        initial = next(item for item in detail["history"] if item["operation"] == "initial")

        status, response = self.request(
            f"/api/cylinders/{cylinder_id}/transactions/{initial['id']}",
            {
                "operation": "initial",
                "amount_kg": 4.0,
                "admin_password": "Password-Errata-0000",
            },
            "PUT",
        )

        self.assertEqual(status, 403)
        self.assertEqual(response["error"], "Password amministratore non valida")
        _, unchanged = self.request(f"/api/cylinders/{cylinder_id}")
        saved_initial = next(item for item in unchanged["history"] if item["operation"] == "initial")
        self.assertEqual(saved_initial["gas_after_kg"], 2.5)


if __name__ == "__main__":
    unittest.main()
