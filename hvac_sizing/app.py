"""Server HTTP senza dipendenze esterne, compatibile con Home Assistant Ingress."""

from __future__ import annotations

import io
import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

import qrcode
import qrcode.image.svg

from calc_engine import calculate_project


APP_DIR = Path(__file__).parent
WWW_DIR = APP_DIR / "www"
DATA_DIR = Path(os.environ.get("HVAC_DATA_DIR", APP_DIR / ".data"))
DB_PATH = DATA_DIR / "projects.db"
PORT = int(os.environ.get("HVAC_PORT", "8099"))


def db_connection() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute(
        """CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            payload TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"""
    )
    connection.execute(
        """CREATE TABLE IF NOT EXISTS cylinders (
            id TEXT PRIMARY KEY,
            code TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            refrigerant TEXT NOT NULL,
            tare_kg REAL NOT NULL,
            capacity_kg REAL,
            current_gas_kg REAL NOT NULL DEFAULT 0,
            notes TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"""
    )
    connection.execute(
        """CREATE TABLE IF NOT EXISTS cylinder_transactions (
            id TEXT PRIMARY KEY,
            cylinder_id TEXT NOT NULL,
            operation TEXT NOT NULL,
            amount_kg REAL,
            total_weight_kg REAL,
            gas_before_kg REAL NOT NULL,
            gas_after_kg REAL NOT NULL,
            notes TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            FOREIGN KEY (cylinder_id) REFERENCES cylinders(id) ON DELETE CASCADE
        )"""
    )
    connection.execute("CREATE INDEX IF NOT EXISTS idx_cylinder_transactions_cylinder ON cylinder_transactions(cylinder_id, created_at DESC)")
    return connection


def number(value: object, field: str, *, required: bool = True) -> float | None:
    if value in (None, ""):
        if required:
            raise ValueError(f"Inserisci {field}")
        return None
    try:
        result = round(float(value), 3)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field.capitalize()} non valido") from exc
    if result < 0:
        raise ValueError(f"{field.capitalize()} non può essere negativo")
    return result


def cylinder_payload(row: sqlite3.Row, history: list[sqlite3.Row] | None = None) -> dict:
    result = dict(row)
    result["tare_kg"] = round(result["tare_kg"], 3)
    result["current_gas_kg"] = round(result["current_gas_kg"], 3)
    if result["capacity_kg"] is not None:
        result["capacity_kg"] = round(result["capacity_kg"], 3)
    result["total_weight_kg"] = round(result["tare_kg"] + result["current_gas_kg"], 3)
    if history is not None:
        result["history"] = [dict(item) for item in history]
    return result


class Handler(BaseHTTPRequestHandler):
    server_version = "HVACSizing/0.5"

    def log_message(self, fmt: str, *args: object) -> None:
        print(f"{self.address_string()} - {fmt % args}", flush=True)

    def _path(self) -> str:
        path = unquote(urlparse(self.path).path)
        marker = "/api/"
        if marker in path:
            return path[path.index(marker):]
        return path

    def _json_body(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if length > 2_000_000:
            raise ValueError("Richiesta troppo grande")
        raw = self.rfile.read(length) if length else b"{}"
        value = json.loads(raw)
        if not isinstance(value, dict):
            raise ValueError("Il contenuto deve essere un oggetto JSON")
        return value

    def _send_json(self, value: object, status: int = 200) -> None:
        encoded = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(encoded)

    def _send_svg(self, content: bytes, filename: str) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "image/svg+xml; charset=utf-8")
        self.send_header("Content-Disposition", f'inline; filename="{filename}"')
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(content)

    def _error(self, message: str, status: int = 400) -> None:
        self._send_json({"error": message}, status)

    def do_GET(self) -> None:
        path = self._path()
        if path == "/api/health":
            self._send_json({"status": "ok", "version": "0.5.0"})
            return
        if path == "/api/projects":
            with db_connection() as db:
                rows = db.execute("SELECT id, name, created_at, updated_at FROM projects ORDER BY updated_at DESC").fetchall()
            self._send_json([dict(row) for row in rows])
            return
        if path.startswith("/api/projects/"):
            project_id = path.rsplit("/", 1)[-1]
            with db_connection() as db:
                row = db.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
            if not row:
                self._error("Progetto non trovato", 404)
                return
            self._send_json({"id": row["id"], "name": row["name"], "payload": json.loads(row["payload"]),
                             "created_at": row["created_at"], "updated_at": row["updated_at"]})
            return
        if path == "/api/cylinders":
            with db_connection() as db:
                rows = db.execute("SELECT * FROM cylinders ORDER BY refrigerant, name COLLATE NOCASE").fetchall()
            self._send_json([cylinder_payload(row) for row in rows])
            return
        if path.startswith("/api/cylinders/") and path.endswith("/qr"):
            cylinder_id = path.split("/")[3]
            query = parse_qs(urlparse(self.path).query)
            target_url = str(query.get("url", [""])[0])
            if not target_url.startswith(("http://", "https://")) or len(target_url) > 2000:
                self._error("Indirizzo QR non valido")
                return
            with db_connection() as db:
                row = db.execute("SELECT code FROM cylinders WHERE id = ?", (cylinder_id,)).fetchone()
            if not row:
                self._error("Bombola non trovata", 404)
                return
            qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=4)
            qr.add_data(target_url)
            qr.make(fit=True)
            output = io.BytesIO()
            qr.make_image(image_factory=qrcode.image.svg.SvgPathImage).save(output)
            self._send_svg(output.getvalue(), f"bombola-{row['code']}.svg")
            return
        if path.startswith("/api/cylinders/"):
            cylinder_id = path.split("/")[3]
            with db_connection() as db:
                row = db.execute("SELECT * FROM cylinders WHERE id = ?", (cylinder_id,)).fetchone()
                history = db.execute(
                    "SELECT * FROM cylinder_transactions WHERE cylinder_id = ? ORDER BY created_at DESC", (cylinder_id,)
                ).fetchall()
            if not row:
                self._error("Bombola non trovata", 404)
                return
            self._send_json(cylinder_payload(row, history))
            return
        self._serve_static(path)

    def do_POST(self) -> None:
        path = self._path()
        try:
            payload = self._json_body()
            if path == "/api/calculate":
                if not payload.get("rooms"):
                    self._error("Aggiungi almeno un locale")
                    return
                self._send_json(calculate_project(payload))
                return
            if path == "/api/projects":
                now = datetime.now(timezone.utc).isoformat()
                project_id = str(payload.get("id") or uuid.uuid4())
                name = str(payload.get("project_name") or "Nuovo progetto")[:160]
                stored = json.dumps(payload, ensure_ascii=False)
                with db_connection() as db:
                    existing = db.execute("SELECT created_at FROM projects WHERE id = ?", (project_id,)).fetchone()
                    created_at = existing["created_at"] if existing else now
                    db.execute(
                        "INSERT OR REPLACE INTO projects (id, name, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                        (project_id, name, stored, created_at, now),
                    )
                self._send_json({"id": project_id, "name": name, "updated_at": now}, HTTPStatus.CREATED)
                return
            if path == "/api/cylinders":
                name = str(payload.get("name") or "").strip()[:120]
                code = str(payload.get("code") or "").strip().upper()[:50]
                refrigerant = str(payload.get("refrigerant") or "").strip().upper()[:30]
                tare = number(payload.get("tare_kg"), "la tara")
                total = number(payload.get("total_weight_kg"), "il peso totale")
                capacity = number(payload.get("capacity_kg"), "la capacità", required=False)
                if not name or not code or not refrigerant:
                    raise ValueError("Nome, codice e refrigerante sono obbligatori")
                if total < tare:
                    raise ValueError("Il peso totale non può essere inferiore alla tara")
                gas = round(total - tare, 3)
                if capacity is not None and gas > capacity:
                    raise ValueError("Il refrigerante calcolato supera la capacità impostata")
                now = datetime.now(timezone.utc).isoformat()
                cylinder_id = str(uuid.uuid4())
                transaction_id = str(uuid.uuid4())
                notes = str(payload.get("notes") or "").strip()[:500]
                try:
                    with db_connection() as db:
                        db.execute(
                            "INSERT INTO cylinders (id, code, name, refrigerant, tare_kg, capacity_kg, current_gas_kg, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                            (cylinder_id, code, name, refrigerant, tare, capacity, gas, notes, now, now),
                        )
                        db.execute(
                            "INSERT INTO cylinder_transactions (id, cylinder_id, operation, amount_kg, total_weight_kg, gas_before_kg, gas_after_kg, notes, created_at) VALUES (?, ?, 'initial', ?, ?, 0, ?, ?, ?)",
                            (transaction_id, cylinder_id, gas, total, gas, "Registrazione iniziale", now),
                        )
                        row = db.execute("SELECT * FROM cylinders WHERE id = ?", (cylinder_id,)).fetchone()
                except sqlite3.IntegrityError as exc:
                    raise ValueError("Esiste già una bombola con questo codice") from exc
                self._send_json(cylinder_payload(row), HTTPStatus.CREATED)
                return
            if path.startswith("/api/cylinders/") and path.endswith("/transactions"):
                cylinder_id = path.split("/")[3]
                operation = str(payload.get("operation") or "")
                if operation not in {"weighing", "add", "remove"}:
                    raise ValueError("Operazione non valida")
                now = datetime.now(timezone.utc).isoformat()
                with db_connection() as db:
                    row = db.execute("SELECT * FROM cylinders WHERE id = ?", (cylinder_id,)).fetchone()
                    if not row:
                        self._error("Bombola non trovata", 404)
                        return
                    before = round(row["current_gas_kg"], 3)
                    total = None
                    amount = None
                    if operation == "weighing":
                        total = number(payload.get("total_weight_kg"), "il peso totale")
                        if total < row["tare_kg"]:
                            raise ValueError("Il peso totale non può essere inferiore alla tara")
                        after = round(total - row["tare_kg"], 3)
                        amount = round(after - before, 3)
                    else:
                        amount = number(payload.get("amount_kg"), "la quantità")
                        if amount <= 0:
                            raise ValueError("La quantità deve essere maggiore di zero")
                        after = round(before + amount if operation == "add" else before - amount, 3)
                    if after < 0:
                        raise ValueError("Il prelievo supera il refrigerante disponibile")
                    if row["capacity_kg"] is not None and after > row["capacity_kg"]:
                        raise ValueError("Il refrigerante risultante supera la capacità della bombola")
                    transaction_id = str(uuid.uuid4())
                    notes = str(payload.get("notes") or "").strip()[:500]
                    db.execute(
                        "UPDATE cylinders SET current_gas_kg = ?, updated_at = ? WHERE id = ?",
                        (after, now, cylinder_id),
                    )
                    db.execute(
                        "INSERT INTO cylinder_transactions (id, cylinder_id, operation, amount_kg, total_weight_kg, gas_before_kg, gas_after_kg, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        (transaction_id, cylinder_id, operation, amount, total, before, after, notes, now),
                    )
                    updated = db.execute("SELECT * FROM cylinders WHERE id = ?", (cylinder_id,)).fetchone()
                self._send_json(cylinder_payload(updated), HTTPStatus.CREATED)
                return
            self._error("Endpoint non trovato", 404)
        except (ValueError, json.JSONDecodeError) as exc:
            self._error(str(exc))
        except Exception as exc:  # keep details in logs, not in the browser
            print(f"Errore: {exc!r}", flush=True)
            self._error("Errore interno durante l’elaborazione", 500)

    def do_DELETE(self) -> None:
        path = self._path()
        if path.startswith("/api/cylinders/"):
            cylinder_id = path.split("/")[3]
            with db_connection() as db:
                db.execute("DELETE FROM cylinder_transactions WHERE cylinder_id = ?", (cylinder_id,))
                cursor = db.execute("DELETE FROM cylinders WHERE id = ?", (cylinder_id,))
            if not cursor.rowcount:
                self._error("Bombola non trovata", 404)
                return
            self._send_json({"deleted": cylinder_id})
            return
        if path.startswith("/api/projects/"):
            project_id = path.rsplit("/", 1)[-1]
            with db_connection() as db:
                cursor = db.execute("DELETE FROM projects WHERE id = ?", (project_id,))
            if not cursor.rowcount:
                self._error("Progetto non trovato", 404)
                return
            self._send_json({"deleted": project_id})
            return
        self._error("Endpoint non trovato", 404)

    def _serve_static(self, path: str) -> None:
        filename = path.rsplit("/", 1)[-1]
        if not filename or "." not in filename:
            filename = "index.html"
        allowed = {"index.html", "app.js", "diagnostics.js", "cylinders.js", "styles.css", "diagnostics.css"}
        if filename not in allowed:
            self.send_error(404)
            return
        file_path = WWW_DIR / filename
        content = file_path.read_bytes()
        content_types = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8"}
        self.send_response(200)
        self.send_header("Content-Type", content_types[file_path.suffix])
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:")
        self.end_headers()
        self.wfile.write(content)


if __name__ == "__main__":
    db_connection().close()
    print(f"HVAC Sizing in ascolto sulla porta {PORT}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
