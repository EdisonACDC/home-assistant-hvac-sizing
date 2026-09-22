import json
import sys
import tempfile
import threading
import types
import unittest
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

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


class PublicPortalSecurityTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="hvac-security-")
        root = Path(self.temporary.name)
        app.DATA_DIR = root
        app.DB_PATH = root / "projects.db"
        app.OPTIONS_PATH = root / "options.json"
        app.QR_SECRET_PATH = root / "qr-secret.key"
        app.FAILED_PIN_ATTEMPTS.clear()
        app.OPTIONS_PATH.write_text(json.dumps({"external_url": "https://bombole.example", "operator_pin": "2468"}))
        now = datetime.now(timezone.utc).isoformat()
        with app.db_connection() as db:
            db.execute(
                "INSERT INTO cylinders (id,code,name,refrigerant,tare_kg,capacity_kg,current_gas_kg,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                ("c1", "R32-1", "Prova", "R32", 4.0, 5.0, 2.0, "privata", now, now),
            )
        self.token = app.cylinder_access_token("c1", 1)
        self.server = app.ThreadingHTTPServer(("127.0.0.1", 0), app.PublicHandler)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.base = f"http://127.0.0.1:{self.server.server_port}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.temporary.cleanup()

    def request(self, path, payload=None, method=None):
        body = None if payload is None else json.dumps(payload).encode()
        request = urllib.request.Request(self.base + path, data=body, method=method, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(request, timeout=3) as response:
                return response.status, json.loads(response.read())
        except urllib.error.HTTPError as error:
            return error.code, json.loads(error.read())

    def test_public_port_exposes_only_authorized_cylinder(self):
        status, payload = self.request(f"/api/public/cylinders/c1/{self.token}")
        self.assertEqual(status, 200)
        self.assertEqual(payload["code"], "R32-1")
        self.assertNotIn("notes", payload)
        self.assertEqual(self.request("/api/projects")[0], 404)
        self.assertEqual(self.request("/api/public/cylinders/c1/falso")[0], 404)
        self.assertEqual(self.request(f"/api/public/cylinders/c1/{self.token}", {}, "DELETE")[0], 405)
        self.assertEqual(self.request(f"/api/public/cylinders/c1/{self.token}", {}, "PUT")[0], 405)

    def test_pin_transaction_and_qr_revocation(self):
        endpoint = f"/api/public/cylinders/c1/{self.token}/transactions"
        self.assertEqual(self.request(endpoint, {"pin": "0000", "operator_name": "Tecnico", "operation": "add", "amount_kg": 0.5}, "POST")[0], 403)
        self.assertEqual(self.request(endpoint, {"pin": "2468", "operator_name": "Tecnico", "operation": "add", "amount_kg": 0.5}, "POST")[0], 201)
        with app.db_connection() as db:
            db.execute("UPDATE cylinders SET qr_version = qr_version + 1 WHERE id = ?", ("c1",))
        self.assertEqual(self.request(f"/api/public/cylinders/c1/{self.token}")[0], 404)


if __name__ == "__main__":
    unittest.main()
