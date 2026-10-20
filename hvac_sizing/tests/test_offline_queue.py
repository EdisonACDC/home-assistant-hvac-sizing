"""Movimenti registrati senza rete: niente doppioni, ordine per ora della misura, conflitti da verificare."""

import json
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import app  # noqa: E402


def iso(minutes_ago: float) -> str:
    return (datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)).isoformat()


class OfflineQueueTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="hvac-offline-")
        root = Path(self.temporary.name)
        app.DATA_DIR = root
        app.DB_PATH = root / "projects.db"
        app.OPTIONS_PATH = root / "options.json"
        app.QR_SECRET_PATH = root / "qr-secret.key"
        app.OPTIONS_PATH.write_text(json.dumps({"external_url": "https://bombole.example", "admin_password": "Password-Sicura-2468"}))
        app.FAILED_PIN_ATTEMPTS.clear()
        app.FAILED_TARGET_ATTEMPTS.clear()
        now = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        self.cylinder_id = "c0ffee00-0000-4000-8000-000000000001"
        with app.db_connection() as db:
            db.execute(
                "INSERT INTO cylinders (id, code, name, refrigerant, tare_kg, capacity_kg, current_gas_kg, notes, created_at, updated_at) "
                "VALUES (?, 'R32-001', 'R32 test', 'R32', 4.25, 9, 5, '', ?, ?)",
                (self.cylinder_id, now, now),
            )
            db.execute(
                "INSERT INTO cylinder_transactions (id, cylinder_id, operation, amount_kg, total_weight_kg, gas_before_kg, gas_after_kg, notes, created_at) "
                "VALUES ('init', ?, 'initial', 5, 9.25, 0, 5, 'Registrazione iniziale', ?)",
                (self.cylinder_id, now),
            )

    def tearDown(self):
        self.temporary.cleanup()

    def history(self):
        with app.db_connection() as db:
            return db.execute(
                "SELECT * FROM cylinder_transactions WHERE cylinder_id = ? ORDER BY created_at, rowid", (self.cylinder_id,)
            ).fetchall()

    def test_same_client_id_is_recorded_once(self):
        payload = {"operation": "remove", "amount_kg": "1", "client_id": "a1b2c3d4-0000-4000-8000-000000000001", "measured_at": iso(10)}
        first = app.record_cylinder_transaction(self.cylinder_id, payload, "Anna", queued=True)
        second = app.record_cylinder_transaction(self.cylinder_id, payload, "Anna", queued=True)
        self.assertEqual(first["current_gas_kg"], 4)
        self.assertEqual(second["current_gas_kg"], 4)
        self.assertTrue(second["duplicate"])
        self.assertEqual(len(self.history()), 2)

    def test_late_movement_is_placed_at_measurement_time(self):
        app.record_cylinder_transaction(self.cylinder_id, {"operation": "weighing", "total_weight_kg": "8,25"}, "Ufficio")  # adesso: 4 kg
        result = app.record_cylinder_transaction(
            self.cylinder_id,
            {"operation": "remove", "amount_kg": "0,5", "client_id": "late-0000-4000-8000-000000000002", "measured_at": iso(30)},
            "Anna", queued=True)
        operations = [row["operation"] for row in self.history()]
        self.assertEqual(operations, ["initial", "remove", "weighing"])
        # La pesatura successiva fissa il residuo reale: 8,25 − 4,25 = 4 kg.
        self.assertEqual(result["current_gas_kg"], 4)
        remove = [row for row in self.history() if row["operation"] == "remove"][0]
        self.assertEqual(remove["gas_after_kg"], 4.5)
        self.assertNotEqual(remove["received_at"], remove["created_at"])

    def test_conflicting_offline_movement_is_kept_for_review(self):
        result = app.record_cylinder_transaction(
            self.cylinder_id,
            {"operation": "remove", "amount_kg": "7", "client_id": "conf-0000-4000-8000-000000000003", "measured_at": iso(5)},
            "Anna", queued=True)
        self.assertEqual(result["current_gas_kg"], 5)
        flagged = [row for row in self.history() if row["review_reason"]]
        self.assertEqual(len(flagged), 1)
        self.assertEqual(flagged[0]["review_reason"], "Con questo movimento il residuo risulterebbe negativo")

    def test_online_movement_still_rejects_errors(self):
        with self.assertRaisesRegex(ValueError, "Il prelievo supera"):
            app.record_cylinder_transaction(self.cylinder_id, {"operation": "remove", "amount_kg": "7"}, "Anna")
        self.assertEqual(len(self.history()), 1)

    def test_admin_edit_resolves_review(self):
        app.record_cylinder_transaction(
            self.cylinder_id,
            {"operation": "remove", "amount_kg": "7", "client_id": "edit-0000-4000-8000-000000000004", "measured_at": iso(5)},
            "Anna", queued=True)
        flagged = [row for row in self.history() if row["review_reason"]][0]
        result = app.update_cylinder_transaction(self.cylinder_id, flagged["id"], {"operation": "remove", "amount_kg": "0,7", "gwp": "675"})
        self.assertEqual(result["current_gas_kg"], 4.3)
        self.assertFalse(any(row["review_reason"] for row in self.history()))

    def test_measurement_time_is_clamped(self):
        future = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
        result = app.record_cylinder_transaction(
            self.cylinder_id,
            {"operation": "add", "amount_kg": "1", "client_id": "futu-0000-4000-8000-000000000005", "measured_at": future},
            "Anna", queued=True)
        self.assertEqual(result["current_gas_kg"], 6)
        added = [row for row in self.history() if row["operation"] == "add"][0]
        self.assertLessEqual(datetime.fromisoformat(added["created_at"]), datetime.now(timezone.utc))
        past = app.record_cylinder_transaction(
            self.cylinder_id,
            {"operation": "add", "amount_kg": "1", "client_id": "past-0000-4000-8000-000000000006", "measured_at": "2001-01-01T00:00:00Z"},
            "Anna", queued=True)
        self.assertEqual(past["current_gas_kg"], 7)
        self.assertEqual([row["operation"] for row in self.history()][:2], ["initial", "add"])

    def test_invalid_client_id_is_ignored(self):
        self.assertIsNone(app.clean_client_id("x"))
        self.assertIsNone(app.clean_client_id("<script>alert(1)</script>"))
        self.assertEqual(app.clean_client_id("a1b2c3d4-0000"), "a1b2c3d4-0000")


class PortalOfflineRoutesTests(unittest.TestCase):
    def setUp(self):
        self.server = app.ThreadingHTTPServer(("127.0.0.1", 0), app.PublicHandler)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.base = f"http://127.0.0.1:{self.server.server_port}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()

    def get(self, path):
        try:
            with urllib.request.urlopen(self.base + path) as response:
                return response.status, response.headers, response.read()
        except urllib.error.HTTPError as error:
            return error.code, error.headers, error.read()

    def test_app_files_are_served(self):
        for path, kind in [("/app/", "text/html"), ("/sw.js", "javascript"), ("/offline.js", "javascript"),
                           ("/bombole-app.js", "javascript"), ("/vendor/jsqr.js", "javascript"),
                           ("/manifest.webmanifest", "manifest+json"), ("/app-icon-192.png", "image/png"),
                           ("/shell/portal", "text/html")]:
            with self.subTest(path=path):
                status, headers, _ = self.get(path)
                self.assertEqual(status, 200)
                self.assertIn(kind, headers["Content-Type"])

    def test_service_worker_scope_and_camera(self):
        status, headers, _ = self.get("/sw.js")
        self.assertEqual(headers["Service-Worker-Allowed"], "/")
        self.assertIn("camera=(self)", headers["Permissions-Policy"])

    def test_other_files_stay_private(self):
        for path in ("/app.py", "/www/index.html", "/vendor/../app.py", "/projects.db"):
            with self.subTest(path=path):
                self.assertIn(self.get(path)[0], (404, 400))


if __name__ == "__main__":
    unittest.main()
