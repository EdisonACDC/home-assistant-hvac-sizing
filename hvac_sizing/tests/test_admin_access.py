import json
import sys
import tempfile
import threading
import types
import unittest
import urllib.error
import urllib.request
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


class ExternalAdminAccessTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="hvac-admin-")
        root = Path(self.temporary.name)
        app.DATA_DIR = root
        app.DB_PATH = root / "projects.db"
        app.OPTIONS_PATH = root / "options.json"
        app.QR_SECRET_PATH = root / "qr-secret.key"
        app.FAILED_ADMIN_ATTEMPTS.clear()
        app.OPTIONS_PATH.write_text(json.dumps({
            "external_url": "https://bombole.example",
            "admin_password": "Password-Sicura-2468",
        }))
        self.old_port = app.PORT
        self.private_server = app.ThreadingHTTPServer(("127.0.0.1", 0), app.Handler)
        app.PORT = self.private_server.server_port
        threading.Thread(target=self.private_server.serve_forever, daemon=True).start()
        self.public_server = app.ThreadingHTTPServer(("127.0.0.1", 0), app.PublicHandler)
        threading.Thread(target=self.public_server.serve_forever, daemon=True).start()
        self.base = f"http://127.0.0.1:{self.public_server.server_port}"

    def tearDown(self):
        self.public_server.shutdown()
        self.public_server.server_close()
        self.private_server.shutdown()
        self.private_server.server_close()
        app.PORT = self.old_port
        self.temporary.cleanup()

    def request(self, path, payload=None, method=None, headers=None):
        body = None if payload is None else json.dumps(payload).encode()
        request = urllib.request.Request(
            self.base + path,
            data=body,
            method=method,
            headers={"Content-Type": "application/json", **(headers or {})},
        )
        try:
            with urllib.request.urlopen(request, timeout=3) as response:
                content_type = response.headers.get("Content-Type", "")
                raw = response.read()
                data = json.loads(raw) if "application/json" in content_type else raw.decode()
                return response.status, data, response.headers
        except urllib.error.HTTPError as error:
            raw = error.read()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                data = raw.decode()
            return error.code, data, error.headers

    def login(self):
        status, _, headers = self.request(
            "/admin/api/login", {"password": "Password-Sicura-2468"}, "POST"
        )
        self.assertEqual(status, 200)
        cookies = headers.get_all("Set-Cookie")
        session = next(value.split(";", 1)[0] for value in cookies if value.startswith("hvac_admin_session="))
        csrf_pair = next(value.split(";", 1)[0] for value in cookies if value.startswith("hvac_admin_csrf="))
        csrf = csrf_pair.split("=", 1)[1]
        return f"{session}; {csrf_pair}", csrf

    def test_external_admin_requires_password_and_csrf(self):
        self.assertEqual(self.request("/admin/api/health")[0], 401)
        self.assertEqual(self.request("/admin/api/login", {"password": "sbagliata"}, "POST")[0], 403)
        cookie, csrf = self.login()
        status, page, _ = self.request("/admin/", headers={"Cookie": cookie})
        self.assertEqual(status, 200)
        self.assertIn("Dimensionamento Climatizzazione", page)
        status, health, _ = self.request("/admin/api/health", headers={"Cookie": cookie})
        self.assertEqual(status, 200)
        self.assertEqual(health["version"], app.APP_VERSION)
        cylinder = {
            "name": "Bombola esterna", "code": "EXT-1", "refrigerant": "R32",
            "tare_kg": 4.0, "current_gas_kg": 2.0,
        }
        self.assertEqual(self.request("/admin/api/cylinders", cylinder, "POST", {"Cookie": cookie})[0], 403)
        status, created, _ = self.request(
            "/admin/api/cylinders", cylinder, "POST",
            {"Cookie": cookie, "X-Admin-CSRF": csrf},
        )
        self.assertEqual(status, 201)
        self.assertEqual(created["total_weight_kg"], 6.0)
        self.assertEqual(
            self.request("/admin/api/logout", {}, "POST", {"Cookie": cookie, "X-Admin-CSRF": csrf})[0],
            200,
        )

    def test_home_assistant_private_port_needs_no_extra_password(self):
        private_base = f"http://127.0.0.1:{self.private_server.server_port}"
        with urllib.request.urlopen(private_base + "/api/health", timeout=3) as response:
            self.assertEqual(response.status, 200)


if __name__ == "__main__":
    unittest.main()
