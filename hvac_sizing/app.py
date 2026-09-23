"""Server HTTP senza dipendenze esterne, compatibile con Home Assistant Ingress."""

from __future__ import annotations

import io
import base64
import hashlib
import hmac
import ipaddress
import json
import os
import re
import secrets
import sqlite3
import threading
import time
import uuid
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

import qrcode
import qrcode.image.svg

from calc_engine import calculate_project
from cylinder_pdf import generate_cylinder_pdf


APP_DIR = Path(__file__).parent
WWW_DIR = APP_DIR / "www"
DATA_DIR = Path(os.environ.get("HVAC_DATA_DIR", APP_DIR / ".data"))
DB_PATH = DATA_DIR / "projects.db"
PORT = int(os.environ.get("HVAC_PORT", "8099"))
PUBLIC_PORT = int(os.environ.get("HVAC_PUBLIC_PORT", "8100"))
OPTIONS_PATH = DATA_DIR / "options.json"
QR_SECRET_PATH = DATA_DIR / "qr-secret.key"
FAILED_PIN_ATTEMPTS: dict[str, list[float]] = {}
FAILED_PIN_LOCK = threading.Lock()
OPERATOR_SESSION_SECONDS = 8 * 60 * 60


def load_options() -> dict:
    try:
        value = json.loads(OPTIONS_PATH.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def external_url() -> str:
    value = str(load_options().get("external_url") or "").strip().rstrip("/")
    return value if valid_web_url(value) and urlparse(value).scheme == "https" else ""


def qr_secret() -> bytes:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    try:
        secret = QR_SECRET_PATH.read_bytes()
        if len(secret) >= 32:
            return secret
    except OSError:
        pass
    secret = secrets.token_bytes(32)
    try:
        descriptor = os.open(QR_SECRET_PATH, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:
        return QR_SECRET_PATH.read_bytes()
    with os.fdopen(descriptor, "wb") as stream:
        stream.write(secret)
    return secret


def cylinder_access_token(cylinder_id: str, version: int) -> str:
    digest = hmac.new(qr_secret(), f"{cylinder_id}:{version}".encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).decode().rstrip("=")


def public_cylinder_url(cylinder: dict | sqlite3.Row) -> str:
    base = external_url()
    if not base:
        return ""
    token = cylinder_access_token(str(cylinder["id"]), int(cylinder["qr_version"]))
    return f"{base}/c/{cylinder['id']}/{token}"


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
    connection.execute(
        """CREATE TABLE IF NOT EXISTS cylinder_operators (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL COLLATE NOCASE UNIQUE,
            pin_salt TEXT NOT NULL,
            pin_hash TEXT NOT NULL,
            active INTEGER NOT NULL DEFAULT 1,
            auth_version INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"""
    )
    cylinder_columns = {row[1] for row in connection.execute("PRAGMA table_info(cylinders)")}
    if "qr_version" not in cylinder_columns:
        connection.execute("ALTER TABLE cylinders ADD COLUMN qr_version INTEGER NOT NULL DEFAULT 1")
    transaction_columns = {row[1] for row in connection.execute("PRAGMA table_info(cylinder_transactions)")}
    if "operator_name" not in transaction_columns:
        connection.execute("ALTER TABLE cylinder_transactions ADD COLUMN operator_name TEXT NOT NULL DEFAULT ''")
    connection.execute("CREATE INDEX IF NOT EXISTS idx_cylinder_transactions_cylinder ON cylinder_transactions(cylinder_id, created_at DESC)")
    return connection


def number(value: object, field: str, *, required: bool = True) -> float | None:
    if value in (None, ""):
        if required:
            raise ValueError(f"Inserisci {field}")
        return None
    try:
        if isinstance(value, str):
            normalized = value.strip().replace(" ", "").replace("\u00a0", "")
            if "," in normalized and "." in normalized:
                if normalized.rfind(",") > normalized.rfind("."):
                    normalized = normalized.replace(".", "").replace(",", ".")
                else:
                    normalized = normalized.replace(",", "")
            else:
                normalized = normalized.replace(",", ".")
            value = normalized
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


def valid_web_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc) and len(value) <= 2000


def safe_filename(value: object) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "-", str(value or "bombola")).strip("-.") or "bombola"


def public_access_allowed(cylinder: sqlite3.Row, token: str) -> bool:
    expected = cylinder_access_token(str(cylinder["id"]), int(cylinder["qr_version"]))
    return bool(token) and secrets.compare_digest(token, expected)


def pin_rate_limited(address: str) -> bool:
    cutoff = time.monotonic() - 900
    with FAILED_PIN_LOCK:
        attempts = [stamp for stamp in FAILED_PIN_ATTEMPTS.get(address, []) if stamp >= cutoff]
        FAILED_PIN_ATTEMPTS[address] = attempts
        return len(attempts) >= 5


def record_failed_pin_attempt(address: str) -> None:
    with FAILED_PIN_LOCK:
        FAILED_PIN_ATTEMPTS.setdefault(address, []).append(time.monotonic())


def verify_operator_pin(address: str, supplied: object) -> bool:
    configured = str(load_options().get("operator_pin") or "")
    if len(configured) < 4 or pin_rate_limited(address):
        return False
    valid = secrets.compare_digest(str(supplied or ""), configured)
    with FAILED_PIN_LOCK:
        if valid:
            FAILED_PIN_ATTEMPTS.pop(address, None)
        else:
            FAILED_PIN_ATTEMPTS.setdefault(address, []).append(time.monotonic())
    return valid


def hash_operator_pin(pin: object, salt: bytes | None = None) -> tuple[str, str]:
    value = str(pin or "")
    if len(value) < 4 or len(value) > 32:
        raise ValueError("Il PIN deve contenere da 4 a 32 caratteri")
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", value.encode(), salt, 310_000)
    return base64.urlsafe_b64encode(salt).decode(), base64.urlsafe_b64encode(digest).decode()


def operator_pin_matches(operator: sqlite3.Row, supplied: object) -> bool:
    try:
        salt = base64.urlsafe_b64decode(operator["pin_salt"].encode())
        _, candidate = hash_operator_pin(supplied, salt)
    except (ValueError, TypeError):
        return False
    return secrets.compare_digest(candidate, operator["pin_hash"])


def operator_payload(operator: sqlite3.Row) -> dict:
    return {
        "id": operator["id"], "name": operator["name"], "active": bool(operator["active"]),
        "created_at": operator["created_at"], "updated_at": operator["updated_at"],
    }


def operator_session_token(operator: sqlite3.Row, cylinder: sqlite3.Row) -> str:
    payload = json.dumps({
        "o": operator["id"], "ov": int(operator["auth_version"]), "c": cylinder["id"],
        "qv": int(cylinder["qr_version"]), "exp": int(time.time()) + OPERATOR_SESSION_SECONDS,
    }, separators=(",", ":"), sort_keys=True).encode()
    encoded = base64.urlsafe_b64encode(payload).decode().rstrip("=")
    signature = hmac.new(qr_secret(), f"operator:{encoded}".encode(), hashlib.sha256).digest()
    return f"{encoded}.{base64.urlsafe_b64encode(signature).decode().rstrip('=')}"


def operator_from_session(cylinder: sqlite3.Row, authorization: str) -> sqlite3.Row | None:
    if not authorization.startswith("Bearer "):
        return None
    try:
        encoded, supplied_signature = authorization[7:].strip().split(".", 1)
        expected = hmac.new(qr_secret(), f"operator:{encoded}".encode(), hashlib.sha256).digest()
        supplied = base64.urlsafe_b64decode(supplied_signature + "=" * (-len(supplied_signature) % 4))
        if not secrets.compare_digest(supplied, expected):
            return None
        raw = base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4))
        payload = json.loads(raw)
        if payload.get("c") != cylinder["id"] or int(payload.get("qv", 0)) != int(cylinder["qr_version"]):
            return None
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        with db_connection() as db:
            operator = db.execute("SELECT * FROM cylinder_operators WHERE id = ?", (payload.get("o"),)).fetchone()
        if not operator or not operator["active"] or int(payload.get("ov", 0)) != int(operator["auth_version"]):
            return None
        return operator
    except (ValueError, TypeError, KeyError, json.JSONDecodeError):
        return None


def public_cylinder_payload(cylinder: sqlite3.Row, history: list[sqlite3.Row]) -> dict:
    full = cylinder_payload(cylinder)
    return {
        "id": full["id"], "code": full["code"], "name": full["name"],
        "refrigerant": full["refrigerant"], "tare_kg": full["tare_kg"],
        "capacity_kg": full["capacity_kg"], "current_gas_kg": full["current_gas_kg"],
        "total_weight_kg": full["total_weight_kg"], "updated_at": full["updated_at"],
        "history": [
            {
                "operation": item["operation"], "amount_kg": item["amount_kg"],
                "total_weight_kg": item["total_weight_kg"], "gas_after_kg": item["gas_after_kg"],
                "notes": item["notes"], "operator_name": item["operator_name"],
                "created_at": item["created_at"],
            }
            for item in history[:50]
        ],
    }


def record_cylinder_transaction(cylinder_id: str, payload: dict, operator_name: str = "") -> dict:
    operation = str(payload.get("operation") or "")
    if operation not in {"weighing", "add", "remove"}:
        raise ValueError("Operazione non valida")
    now = datetime.now(timezone.utc).isoformat()
    with db_connection() as db:
        row = db.execute("SELECT * FROM cylinders WHERE id = ?", (cylinder_id,)).fetchone()
        if not row:
            raise LookupError("Bombola non trovata")
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
        operator = str(operator_name or "").strip()[:120]
        db.execute("UPDATE cylinders SET current_gas_kg = ?, updated_at = ? WHERE id = ?", (after, now, cylinder_id))
        db.execute(
            "INSERT INTO cylinder_transactions (id, cylinder_id, operation, amount_kg, total_weight_kg, gas_before_kg, gas_after_kg, notes, operator_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (transaction_id, cylinder_id, operation, amount, total, before, after, notes, operator, now),
        )
        updated = db.execute("SELECT * FROM cylinders WHERE id = ?", (cylinder_id,)).fetchone()
    return cylinder_payload(updated)


APP_VERSION = "0.8.3"


class Handler(BaseHTTPRequestHandler):
    server_version = f"HVACSizing/{APP_VERSION}"

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

    def _security_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        self.send_header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

    def _send_json(self, value: object, status: int = 200) -> None:
        encoded = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self._security_headers()
        self.end_headers()
        self.wfile.write(encoded)

    def _send_svg(self, content: bytes, filename: str) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "image/svg+xml; charset=utf-8")
        self.send_header("Content-Disposition", f'inline; filename="{filename}"')
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self._security_headers()
        self.end_headers()
        self.wfile.write(content)

    def _send_pdf(self, content: bytes, filename: str, download: bool) -> None:
        disposition = "attachment" if download else "inline"
        self.send_response(200)
        self.send_header("Content-Type", "application/pdf")
        self.send_header("Content-Disposition", f'{disposition}; filename="{safe_filename(filename)}"')
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self._security_headers()
        self.end_headers()
        self.wfile.write(content)

    def _error(self, message: str, status: int = 400) -> None:
        self._send_json({"error": message}, status)

    def do_GET(self) -> None:
        path = self._path()
        if path == "/api/health":
            self._send_json({"status": "ok", "version": APP_VERSION})
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
        if path == "/api/operators":
            with db_connection() as db:
                rows = db.execute("SELECT * FROM cylinder_operators ORDER BY name COLLATE NOCASE").fetchall()
            self._send_json([operator_payload(row) for row in rows])
            return
        if path == "/api/cylinders/pdf":
            query = parse_qs(urlparse(self.path).query)
            if not external_url():
                self._error("Configura external_url nelle opzioni dell’add-on prima di creare i QR", 503)
                return
            with db_connection() as db:
                rows = db.execute("SELECT * FROM cylinders ORDER BY refrigerant, name COLLATE NOCASE").fetchall()
                cylinders = []
                for row in rows:
                    history = db.execute(
                        "SELECT * FROM cylinder_transactions WHERE cylinder_id = ? ORDER BY created_at DESC", (row["id"],)
                    ).fetchall()
                    item = cylinder_payload(row, history)
                    item["public_url"] = public_cylinder_url(row)
                    cylinders.append(item)
            language = "de" if query.get("lang", [""])[0] == "de" else "it"
            pdf = generate_cylinder_pdf(cylinders, "", language)
            download = query.get("download", [""])[0] == "1"
            self._send_pdf(pdf, "magazzino-bombole.pdf", download)
            return
        if path.startswith("/api/cylinders/") and path.endswith("/qr"):
            cylinder_id = path.split("/")[3]
            with db_connection() as db:
                row = db.execute("SELECT * FROM cylinders WHERE id = ?", (cylinder_id,)).fetchone()
            if not row:
                self._error("Bombola non trovata", 404)
                return
            target_url = public_cylinder_url(row)
            if not target_url:
                self._error("Configura external_url nelle opzioni dell’add-on prima di creare i QR", 503)
                return
            qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=4)
            qr.add_data(target_url)
            qr.make(fit=True)
            output = io.BytesIO()
            qr.make_image(image_factory=qrcode.image.svg.SvgPathImage).save(output)
            self._send_svg(output.getvalue(), f"bombola-{safe_filename(row['code'])}.svg")
            return
        if path.startswith("/api/cylinders/") and path.endswith("/pdf"):
            cylinder_id = path.split("/")[3]
            query = parse_qs(urlparse(self.path).query)
            if not external_url():
                self._error("Configura external_url nelle opzioni dell’add-on prima di creare i QR", 503)
                return
            with db_connection() as db:
                row = db.execute("SELECT * FROM cylinders WHERE id = ?", (cylinder_id,)).fetchone()
                history = db.execute(
                    "SELECT * FROM cylinder_transactions WHERE cylinder_id = ? ORDER BY created_at DESC", (cylinder_id,)
                ).fetchall()
            if not row:
                self._error("Bombola non trovata", 404)
                return
            cylinder = cylinder_payload(row, history)
            cylinder["public_url"] = public_cylinder_url(row)
            language = "de" if query.get("lang", [""])[0] == "de" else "it"
            pdf = generate_cylinder_pdf([cylinder], "", language)
            download = query.get("download", [""])[0] == "1"
            self._send_pdf(pdf, f"scheda-bombola-{safe_filename(row['code'])}.pdf", download)
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
            if path == "/api/operators":
                name = " ".join(str(payload.get("name") or "").strip().split())[:120]
                if not name:
                    raise ValueError("Inserisci il nome dell’operatore")
                salt, pin_hash = hash_operator_pin(payload.get("pin"))
                now = datetime.now(timezone.utc).isoformat()
                operator_id = str(uuid.uuid4())
                try:
                    with db_connection() as db:
                        db.execute(
                            "INSERT INTO cylinder_operators (id,name,pin_salt,pin_hash,active,auth_version,created_at,updated_at) VALUES (?,?,?,?,1,1,?,?)",
                            (operator_id, name, salt, pin_hash, now, now),
                        )
                        row = db.execute("SELECT * FROM cylinder_operators WHERE id = ?", (operator_id,)).fetchone()
                except sqlite3.IntegrityError as exc:
                    raise ValueError("Esiste già un operatore con questo nome") from exc
                self._send_json(operator_payload(row), HTTPStatus.CREATED)
                return
            if path.startswith("/api/operators/") and path.endswith("/toggle"):
                operator_id = path.split("/")[3]
                now = datetime.now(timezone.utc).isoformat()
                with db_connection() as db:
                    row = db.execute("SELECT * FROM cylinder_operators WHERE id = ?", (operator_id,)).fetchone()
                    if not row:
                        self._error("Operatore non trovato", 404)
                        return
                    db.execute(
                        "UPDATE cylinder_operators SET active = ?, auth_version = auth_version + 1, updated_at = ? WHERE id = ?",
                        (0 if row["active"] else 1, now, operator_id),
                    )
                    updated = db.execute("SELECT * FROM cylinder_operators WHERE id = ?", (operator_id,)).fetchone()
                self._send_json(operator_payload(updated))
                return
            if path.startswith("/api/operators/") and path.endswith("/pin"):
                operator_id = path.split("/")[3]
                salt, pin_hash = hash_operator_pin(payload.get("pin"))
                now = datetime.now(timezone.utc).isoformat()
                with db_connection() as db:
                    cursor = db.execute(
                        "UPDATE cylinder_operators SET pin_salt = ?, pin_hash = ?, auth_version = auth_version + 1, updated_at = ? WHERE id = ?",
                        (salt, pin_hash, now, operator_id),
                    )
                if not cursor.rowcount:
                    self._error("Operatore non trovato", 404)
                    return
                self._send_json({"updated": operator_id})
                return
            if path.startswith("/api/cylinders/") and path.endswith("/transactions"):
                cylinder_id = path.split("/")[3]
                self._send_json(record_cylinder_transaction(cylinder_id, payload, "Amministratore"), HTTPStatus.CREATED)
                return
            if path.startswith("/api/cylinders/") and path.endswith("/rotate-qr"):
                cylinder_id = path.split("/")[3]
                with db_connection() as db:
                    cursor = db.execute("UPDATE cylinders SET qr_version = qr_version + 1 WHERE id = ?", (cylinder_id,))
                    row = db.execute("SELECT * FROM cylinders WHERE id = ?", (cylinder_id,)).fetchone()
                if not cursor.rowcount or not row:
                    self._error("Bombola non trovata", 404)
                    return
                self._send_json({"rotated": cylinder_id, "public_url": public_cylinder_url(row)})
                return
            self._error("Endpoint non trovato", 404)
        except (ValueError, json.JSONDecodeError) as exc:
            self._error(str(exc))
        except LookupError as exc:
            self._error(str(exc), 404)
        except Exception as exc:  # keep details in logs, not in the browser
            print(f"Errore: {exc!r}", flush=True)
            self._error("Errore interno durante l’elaborazione", 500)

    def do_DELETE(self) -> None:
        path = self._path()
        if path.startswith("/api/operators/"):
            operator_id = path.split("/")[3]
            with db_connection() as db:
                cursor = db.execute("DELETE FROM cylinder_operators WHERE id = ?", (operator_id,))
            if not cursor.rowcount:
                self._error("Operatore non trovato", 404)
                return
            self._send_json({"deleted": operator_id})
            return
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
        allowed = {"index.html", "i18n.js", "app.js", "diagnostics.js", "cylinders.js", "styles.css", "diagnostics.css"}
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
        self._security_headers()
        self.send_header("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:")
        self.end_headers()
        self.wfile.write(content)


class PublicHandler(Handler):
    """Portale esterno limitato: nessuna API amministrativa viene esposta."""

    server_version = f"HVACCylinderPortal/{APP_VERSION}"

    def log_message(self, fmt: str, *args: object) -> None:
        # Non scrivere nei log token QR presenti nel percorso.
        print(f"{self.address_string()} - richiesta portale bombole", flush=True)

    def _parts(self) -> list[str]:
        return [part for part in unquote(urlparse(self.path).path).split("/") if part]

    def _client_key(self) -> str:
        candidate = self.headers.get("CF-Connecting-IP", "").strip()
        try:
            return str(ipaddress.ip_address(candidate)) if candidate else self.client_address[0]
        except ValueError:
            return self.client_address[0]

    def _authorized_cylinder(self, cylinder_id: str, token: str) -> sqlite3.Row | None:
        with db_connection() as db:
            row = db.execute("SELECT * FROM cylinders WHERE id = ?", (cylinder_id,)).fetchone()
        return row if row and public_access_allowed(row, token) else None

    def _serve_public_asset(self, filename: str) -> None:
        allowed = {"public.html", "public.js", "public.css"}
        if filename not in allowed:
            self._error("Risorsa non trovata", 404)
            return
        file_path = WWW_DIR / filename
        content = file_path.read_bytes()
        content_types = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8"}
        self.send_response(200)
        self.send_header("Content-Type", content_types[file_path.suffix])
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self._security_headers()
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; base-uri 'none'; object-src 'none'; style-src 'self'; "
            "script-src 'self'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'",
        )
        self.end_headers()
        self.wfile.write(content)

    def do_GET(self) -> None:
        parts = self._parts()
        if parts == ["health"]:
            self._send_json({"status": "ok", "service": "cylinder-portal", "version": APP_VERSION})
            return
        if parts in (["public.js"], ["public.css"]):
            self._serve_public_asset(parts[0])
            return
        if len(parts) == 3 and parts[0] == "c":
            if not self._authorized_cylinder(parts[1], parts[2]):
                self._error("Collegamento QR non valido o revocato", 404)
                return
            self._serve_public_asset("public.html")
            return
        if len(parts) == 5 and parts[:3] == ["api", "public", "cylinders"]:
            cylinder = self._authorized_cylinder(parts[3], parts[4])
            if not cylinder:
                self._error("Collegamento QR non valido o revocato", 404)
                return
            operator = operator_from_session(cylinder, self.headers.get("Authorization", ""))
            if not operator:
                self._error("Accedi con un operatore autorizzato", 401)
                return
            with db_connection() as db:
                history = db.execute(
                    "SELECT * FROM cylinder_transactions WHERE cylinder_id = ? ORDER BY created_at DESC", (parts[3],)
                ).fetchall()
            result = public_cylinder_payload(cylinder, history)
            result["operator_name"] = operator["name"]
            self._send_json(result)
            return
        self._error("Pagina non trovata", 404)

    def do_POST(self) -> None:
        parts = self._parts()
        if len(parts) != 6 or parts[:3] != ["api", "public", "cylinders"] or parts[5] not in {"login", "transactions"}:
            self._error("Operazione non consentita", 404)
            return
        cylinder = self._authorized_cylinder(parts[3], parts[4])
        if not cylinder:
            self._error("Collegamento QR non valido o revocato", 404)
            return
        address = self._client_key()
        if pin_rate_limited(address):
            self._error("Troppi tentativi. Riprova tra 15 minuti", 429)
            return
        try:
            payload = self._json_body()
            if parts[5] == "login":
                operator_name = " ".join(str(payload.get("operator_name") or "").strip().split())[:120]
                with db_connection() as db:
                    operator = db.execute(
                        "SELECT * FROM cylinder_operators WHERE name = ? COLLATE NOCASE AND active = 1", (operator_name,)
                    ).fetchone()
                if not operator or not operator_pin_matches(operator, payload.get("pin")):
                    record_failed_pin_attempt(address)
                    self._error("Nome operatore o PIN non valido", 403)
                    return
                with FAILED_PIN_LOCK:
                    FAILED_PIN_ATTEMPTS.pop(address, None)
                self._send_json({
                    "session_token": operator_session_token(operator, cylinder),
                    "operator": operator_payload(operator), "expires_in": OPERATOR_SESSION_SECONDS,
                })
                return
            operator = operator_from_session(cylinder, self.headers.get("Authorization", ""))
            if not operator:
                self._error("Sessione operatore scaduta o revocata", 401)
                return
            result = record_cylinder_transaction(parts[3], payload, operator["name"])
            self._send_json(result, HTTPStatus.CREATED)
        except (ValueError, json.JSONDecodeError) as exc:
            self._error(str(exc))
        except LookupError as exc:
            self._error(str(exc), 404)
        except Exception as exc:
            print(f"Errore portale bombole: {type(exc).__name__}", flush=True)
            self._error("Errore interno durante l’elaborazione", 500)

    def do_DELETE(self) -> None:
        self._error("Operazione non consentita", 405)

    def do_PUT(self) -> None:
        self._error("Operazione non consentita", 405)

    def do_PATCH(self) -> None:
        self._error("Operazione non consentita", 405)

    def do_OPTIONS(self) -> None:
        # Nessun CORS: il portale accetta richieste soltanto dalla propria origine.
        self._error("Operazione non consentita", 405)


if __name__ == "__main__":
    db_connection().close()
    qr_secret()
    public_server = ThreadingHTTPServer(("0.0.0.0", PUBLIC_PORT), PublicHandler)
    threading.Thread(target=public_server.serve_forever, name="cylinder-portal", daemon=True).start()
    print(f"Portale bombole sicuro in ascolto sulla porta {PUBLIC_PORT}", flush=True)
    print(f"HVAC Sizing privato in ascolto sulla porta {PORT}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
