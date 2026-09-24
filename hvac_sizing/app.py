"""Server HTTP senza dipendenze esterne, compatibile con Home Assistant Ingress."""

from __future__ import annotations

import io
import base64
import hashlib
import hmac
import html
import http.client
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
from http.cookies import SimpleCookie
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
FAILED_ADMIN_ATTEMPTS: dict[str, list[float]] = {}
FAILED_PIN_LOCK = threading.Lock()
OPERATOR_SESSION_SECONDS = 8 * 60 * 60
ADMIN_SESSION_SECONDS = 8 * 60 * 60


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


def qr_svg(target_url: str) -> bytes:
    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=4)
    qr.add_data(target_url)
    qr.make(fit=True)
    output = io.BytesIO()
    qr.make_image(image_factory=qrcode.image.svg.SvgPathImage).save(output)
    return output.getvalue()


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
    if "edited_at" not in transaction_columns:
        connection.execute("ALTER TABLE cylinder_transactions ADD COLUMN edited_at TEXT")
    environmental_columns = {
        "machine_brand": "TEXT NOT NULL DEFAULT ''",
        "machine_model": "TEXT NOT NULL DEFAULT ''",
        "machine_serial": "TEXT NOT NULL DEFAULT ''",
        "machine_charge_kg": "REAL",
        "gwp": "REAL",
        "co2_equivalent_kg": "REAL",
        "emitted_kg": "REAL",
        "emission_co2_equivalent_kg": "REAL",
    }
    for column, definition in environmental_columns.items():
        if column not in transaction_columns:
            connection.execute(f"ALTER TABLE cylinder_transactions ADD COLUMN {column} {definition}")
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


REFRIGERANT_GWP = {
    "R32": 675, "R134A": 1430, "R404A": 3922, "R407C": 1774,
    "R407F": 1825, "R410A": 2088, "R422D": 2729, "R449A": 1282,
    "R290": 3, "R600A": 3, "R744": 1, "R717": 0,
    "R1234YF": 4, "R1234ZE": 7, "R454B": 466, "R513A": 631,
}


def refrigerant_gwp(refrigerant: object) -> float | None:
    key = re.sub(r"[^A-Z0-9]", "", str(refrigerant or "").upper())
    return REFRIGERANT_GWP.get(key)


def transaction_payload(row: sqlite3.Row) -> dict:
    result = dict(row)
    for key in ("machine_charge_kg", "gwp", "co2_equivalent_kg", "emitted_kg", "emission_co2_equivalent_kg"):
        if result.get(key) is not None:
            result[key] = round(float(result[key]), 3)
    result["co2_equivalent_t"] = None if result.get("co2_equivalent_kg") is None else round(result["co2_equivalent_kg"] / 1000, 6)
    result["machine_co2_equivalent_kg"] = None
    result["machine_co2_equivalent_t"] = None
    if result.get("machine_charge_kg") is not None and result.get("gwp") is not None:
        result["machine_co2_equivalent_kg"] = round(result["machine_charge_kg"] * result["gwp"], 3)
        result["machine_co2_equivalent_t"] = round(result["machine_co2_equivalent_kg"] / 1000, 6)
    result["emission_co2_equivalent_t"] = None if result.get("emission_co2_equivalent_kg") is None else round(result["emission_co2_equivalent_kg"] / 1000, 6)
    return result


def environmental_values(payload: dict, refrigerant: object, operation: str) -> tuple:
    if operation not in {"add", "remove"}:
        return "", "", "", None, None, None, None, None
    brand = str(payload.get("machine_brand") or "").strip()[:120]
    model = str(payload.get("machine_model") or "").strip()[:120]
    serial = str(payload.get("machine_serial") or "").strip()[:120]
    machine_charge = number(payload.get("machine_charge_kg"), "la carica della macchina", required=False)
    default_gwp = refrigerant_gwp(refrigerant)
    gwp = number(payload.get("gwp", default_gwp), "il GWP")
    emitted = number(payload.get("emitted_kg"), "il gas disperso", required=False)
    amount = number(payload.get("amount_kg"), "la quantità")
    co2_equivalent = round(amount * gwp, 3)
    emission_equivalent = None if emitted is None else round(emitted * gwp, 3)
    return brand, model, serial, machine_charge, gwp, co2_equivalent, emitted, emission_equivalent


def cylinder_payload(row: sqlite3.Row, history: list[sqlite3.Row] | None = None) -> dict:
    result = dict(row)
    result["tare_kg"] = round(result["tare_kg"], 3)
    result["current_gas_kg"] = round(result["current_gas_kg"], 3)
    if result["capacity_kg"] is not None:
        result["capacity_kg"] = round(result["capacity_kg"], 3)
    result["total_weight_kg"] = round(result["tare_kg"] + result["current_gas_kg"], 3)
    result["gwp"] = refrigerant_gwp(result["refrigerant"])
    if history is not None:
        result["history"] = [transaction_payload(item) for item in history]
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


def admin_rate_limited(address: str) -> bool:
    cutoff = time.monotonic() - 900
    with FAILED_PIN_LOCK:
        attempts = [stamp for stamp in FAILED_ADMIN_ATTEMPTS.get(address, []) if stamp >= cutoff]
        FAILED_ADMIN_ATTEMPTS[address] = attempts
        return len(attempts) >= 5


def configured_admin_password() -> str:
    return str(load_options().get("admin_password") or "")


def verify_admin_password(address: str, supplied: object) -> bool:
    configured = configured_admin_password()
    if len(configured) < 10 or admin_rate_limited(address):
        return False
    valid = secrets.compare_digest(str(supplied or ""), configured)
    with FAILED_PIN_LOCK:
        if valid:
            FAILED_ADMIN_ATTEMPTS.pop(address, None)
        else:
            FAILED_ADMIN_ATTEMPTS.setdefault(address, []).append(time.monotonic())
    return valid


def admin_session_token() -> tuple[str, str]:
    password = configured_admin_password()
    if len(password) < 10:
        raise ValueError("Configura una password amministratore di almeno 10 caratteri")
    csrf = secrets.token_urlsafe(24)
    payload = json.dumps({
        "exp": int(time.time()) + ADMIN_SESSION_SECONDS,
        "csrf": csrf,
        "pv": hashlib.sha256(password.encode()).hexdigest()[:20],
    }, separators=(",", ":"), sort_keys=True).encode()
    encoded = base64.urlsafe_b64encode(payload).decode().rstrip("=")
    signature = hmac.new(qr_secret(), f"admin:{encoded}".encode(), hashlib.sha256).digest()
    return f"{encoded}.{base64.urlsafe_b64encode(signature).decode().rstrip('=')}", csrf


def admin_session_payload(token: str) -> dict | None:
    try:
        encoded, supplied_signature = token.split(".", 1)
        expected = hmac.new(qr_secret(), f"admin:{encoded}".encode(), hashlib.sha256).digest()
        supplied = base64.urlsafe_b64decode(supplied_signature + "=" * (-len(supplied_signature) % 4))
        if not secrets.compare_digest(supplied, expected):
            return None
        raw = base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4))
        payload = json.loads(raw)
        password = configured_admin_password()
        if len(password) < 10 or int(payload.get("exp", 0)) < int(time.time()):
            return None
        fingerprint = hashlib.sha256(password.encode()).hexdigest()[:20]
        if not secrets.compare_digest(str(payload.get("pv") or ""), fingerprint):
            return None
        return payload
    except (ValueError, TypeError, KeyError, json.JSONDecodeError):
        return None


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
        "gwp": refrigerant_gwp(full["refrigerant"]),
        "history": [transaction_payload(item) for item in history[:50]],
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
        environmental = environmental_values(payload, row["refrigerant"], operation)
        db.execute("UPDATE cylinders SET current_gas_kg = ?, updated_at = ? WHERE id = ?", (after, now, cylinder_id))
        db.execute(
            """INSERT INTO cylinder_transactions
            (id, cylinder_id, operation, amount_kg, total_weight_kg, gas_before_kg, gas_after_kg,
             notes, operator_name, created_at, machine_brand, machine_model, machine_serial,
             machine_charge_kg, gwp, co2_equivalent_kg, emitted_kg, emission_co2_equivalent_kg)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (transaction_id, cylinder_id, operation, amount, total, before, after, notes, operator, now, *environmental),
        )
        updated = db.execute("SELECT * FROM cylinders WHERE id = ?", (cylinder_id,)).fetchone()
    return cylinder_payload(updated)


def recalculate_cylinder_transactions(db: sqlite3.Connection, cylinder_id: str) -> sqlite3.Row:
    cylinder = db.execute("SELECT * FROM cylinders WHERE id = ?", (cylinder_id,)).fetchone()
    if not cylinder:
        raise LookupError("Bombola non trovata")
    transactions = db.execute(
        "SELECT * FROM cylinder_transactions WHERE cylinder_id = ? ORDER BY created_at ASC, rowid ASC",
        (cylinder_id,),
    ).fetchall()
    balance = 0.0
    for transaction in transactions:
        operation = transaction["operation"]
        total = transaction["total_weight_kg"]
        if operation == "initial":
            amount = number(transaction["amount_kg"], "il gas iniziale")
            after = amount
            total = round(cylinder["tare_kg"] + after, 3)
        elif operation == "weighing":
            total = number(total, "il peso totale")
            if total < cylinder["tare_kg"]:
                raise ValueError("Una pesatura del registro è inferiore alla tara")
            after = round(total - cylinder["tare_kg"], 3)
            amount = round(after - balance, 3)
        elif operation in {"add", "remove"}:
            amount = number(transaction["amount_kg"], "la quantità")
            if amount <= 0:
                raise ValueError("La quantità deve essere maggiore di zero")
            after = round(balance + amount if operation == "add" else balance - amount, 3)
            total = None
        else:
            raise ValueError("Il registro contiene un’operazione non valida")
        if after < 0:
            raise ValueError("La modifica rende negativo il refrigerante in un movimento successivo")
        if cylinder["capacity_kg"] is not None and after > cylinder["capacity_kg"]:
            raise ValueError("La modifica supera la capacità della bombola in un movimento del registro")
        db.execute(
            "UPDATE cylinder_transactions SET amount_kg = ?, total_weight_kg = ?, gas_before_kg = ?, gas_after_kg = ? WHERE id = ?",
            (amount, total, balance, after, transaction["id"]),
        )
        balance = after
    now = datetime.now(timezone.utc).isoformat()
    db.execute("UPDATE cylinders SET current_gas_kg = ?, updated_at = ? WHERE id = ?", (balance, now, cylinder_id))
    return db.execute("SELECT * FROM cylinders WHERE id = ?", (cylinder_id,)).fetchone()


def update_cylinder_transaction(cylinder_id: str, transaction_id: str, payload: dict) -> dict:
    with db_connection() as db:
        transaction = db.execute(
            "SELECT * FROM cylinder_transactions WHERE id = ? AND cylinder_id = ?",
            (transaction_id, cylinder_id),
        ).fetchone()
        if not transaction:
            raise LookupError("Movimento non trovato")
        operation = str(payload.get("operation") or transaction["operation"])
        if transaction["operation"] == "initial":
            if operation != "initial":
                raise ValueError("La registrazione iniziale non può cambiare tipo")
            amount = number(payload.get("amount_kg"), "il gas iniziale")
            total = None
        else:
            if operation not in {"weighing", "add", "remove"}:
                raise ValueError("Operazione non valida")
            if operation == "weighing":
                total = number(payload.get("total_weight_kg"), "il peso totale")
                amount = 0.0
            else:
                amount = number(payload.get("amount_kg"), "la quantità")
                if amount <= 0:
                    raise ValueError("La quantità deve essere maggiore di zero")
                total = None
        notes = str(payload.get("notes") or "").strip()[:500]
        cylinder = db.execute("SELECT refrigerant FROM cylinders WHERE id = ?", (cylinder_id,)).fetchone()
        environmental = environmental_values(payload, cylinder["refrigerant"], operation)
        edited_at = datetime.now(timezone.utc).isoformat()
        db.execute(
            """UPDATE cylinder_transactions SET operation = ?, amount_kg = ?, total_weight_kg = ?, notes = ?,
            machine_brand = ?, machine_model = ?, machine_serial = ?, machine_charge_kg = ?, gwp = ?,
            co2_equivalent_kg = ?, emitted_kg = ?, emission_co2_equivalent_kg = ?, edited_at = ? WHERE id = ?""",
            (operation, amount, total, notes, *environmental, edited_at, transaction_id),
        )
        updated = recalculate_cylinder_transactions(db, cylinder_id)
        history = db.execute(
            "SELECT * FROM cylinder_transactions WHERE cylinder_id = ? ORDER BY created_at DESC, rowid DESC",
            (cylinder_id,),
        ).fetchall()
    return cylinder_payload(updated, history)


def delete_cylinder_transaction(cylinder_id: str, transaction_id: str) -> dict:
    with db_connection() as db:
        transaction = db.execute(
            "SELECT * FROM cylinder_transactions WHERE id = ? AND cylinder_id = ?",
            (transaction_id, cylinder_id),
        ).fetchone()
        if not transaction:
            raise LookupError("Movimento non trovato")
        if transaction["operation"] == "initial":
            raise ValueError("La registrazione iniziale non può essere eliminata")
        db.execute("DELETE FROM cylinder_transactions WHERE id = ?", (transaction_id,))
        updated = recalculate_cylinder_transactions(db, cylinder_id)
        history = db.execute(
            "SELECT * FROM cylinder_transactions WHERE cylinder_id = ? ORDER BY created_at DESC, rowid DESC",
            (cylinder_id,),
        ).fetchall()
    return cylinder_payload(updated, history)


APP_VERSION = "0.11.1"


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

    def _send_html(self, content: str, status: int = 200, *, csp: str | None = None) -> None:
        encoded = content.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self._security_headers()
        if csp:
            self.send_header("Content-Security-Policy", csp)
        self.end_headers()
        self.wfile.write(encoded)

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
            self._send_svg(qr_svg(target_url), f"bombola-{safe_filename(row['code'])}.svg")
            return
        if path.startswith("/api/cylinders/") and path.endswith("/qr-print"):
            cylinder_id = path.split("/")[3]
            with db_connection() as db:
                row = db.execute("SELECT * FROM cylinders WHERE id = ?", (cylinder_id,)).fetchone()
            if not row:
                self._error("Bombola non trovata", 404)
                return
            target_url = public_cylinder_url(row)
            if not target_url:
                self._error("Configura external_url nelle opzioni dell’add-on prima di stampare il QR", 503)
                return
            svg = qr_svg(target_url).decode("utf-8")
            title = f"{html.escape(row['code'])} · {html.escape(row['refrigerant'])}"
            page = f"""<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QR {html.escape(row['code'])}</title><style>
            *{{box-sizing:border-box}}body{{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;color:#102030;background:#eef3f6}}main{{width:min(92vw,520px);padding:24px;text-align:center;background:white;border-radius:18px;box-shadow:0 12px 40px #0002}}svg{{width:min(78vw,340px);height:auto}}h1{{font-size:22px}}p{{overflow-wrap:anywhere;color:#526675}}button{{min-height:48px;width:100%;border:0;border-radius:11px;background:#159dc0;color:white;font-size:17px;font-weight:800}}@media print{{body{{background:white}}main{{width:100%;box-shadow:none}}button,p{{display:none}}svg{{width:70mm}}}}
            </style></head><body><main><h1>{title}</h1>{svg}<p>{html.escape(target_url)}</p><button type="button" onclick="window.print()">Stampa QR code</button></main><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),300));</script></body></html>"""
            self._send_html(page, csp="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'")
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
                if payload.get("current_gas_kg") not in (None, ""):
                    gas = number(payload.get("current_gas_kg"), "il gas refrigerante")
                    total = round(tare + gas, 3)
                else:
                    total = number(payload.get("total_weight_kg"), "il peso totale")
                    gas = round(total - tare, 3)
                capacity = number(payload.get("capacity_kg"), "la capacità", required=False)
                if not name or not code or not refrigerant:
                    raise ValueError("Nome, codice e refrigerante sono obbligatori")
                if total < tare:
                    raise ValueError("Il peso totale non può essere inferiore alla tara")
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

    def do_PUT(self) -> None:
        path = self._path()
        try:
            payload = self._json_body()
            parts = path.strip("/").split("/")
            if len(parts) == 5 and parts[:2] == ["api", "cylinders"] and parts[3] == "transactions":
                if len(configured_admin_password()) < 10:
                    self._error("Configura una password amministratore di almeno 10 caratteri", 503)
                    return
                address = self.client_address[0]
                if admin_rate_limited(address):
                    self._error("Troppi tentativi. Riprova tra 15 minuti", 429)
                    return
                if not verify_admin_password(address, payload.pop("admin_password", "")):
                    self._error("Password amministratore non valida", 403)
                    return
                result = update_cylinder_transaction(parts[2], parts[4], payload)
                self._send_json(result)
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
        parts = path.strip("/").split("/")
        if len(parts) == 5 and parts[:2] == ["api", "cylinders"] and parts[3] == "transactions":
            try:
                payload = self._json_body()
                if len(configured_admin_password()) < 10:
                    self._error("Configura una password amministratore di almeno 10 caratteri", 503)
                    return
                address = self.client_address[0]
                if admin_rate_limited(address):
                    self._error("Troppi tentativi. Riprova tra 15 minuti", 429)
                    return
                if not verify_admin_password(address, payload.get("admin_password")):
                    self._error("Password amministratore non valida", 403)
                    return
                self._send_json(delete_cylinder_transaction(parts[2], parts[4]))
            except (ValueError, json.JSONDecodeError) as exc:
                self._error(str(exc))
            except LookupError as exc:
                self._error(str(exc), 404)
            except Exception as exc:
                print(f"Errore eliminazione movimento: {exc!r}", flush=True)
                self._error("Errore interno durante l’elaborazione", 500)
            return
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

    def _cookie_value(self, name: str) -> str:
        try:
            cookies = SimpleCookie(self.headers.get("Cookie", ""))
            return cookies[name].value if name in cookies else ""
        except (KeyError, ValueError):
            return ""

    def _admin_session(self) -> dict | None:
        return admin_session_payload(self._cookie_value("hvac_admin_session"))

    def _admin_csrf_valid(self, session: dict) -> bool:
        header = self.headers.get("X-Admin-CSRF", "")
        cookie = self._cookie_value("hvac_admin_csrf")
        expected = str(session.get("csrf") or "")
        return bool(expected and header and cookie) and secrets.compare_digest(header, expected) and secrets.compare_digest(cookie, expected)

    def _redirect(self, location: str) -> None:
        self.send_response(HTTPStatus.SEE_OTHER)
        self.send_header("Location", location)
        self.send_header("Cache-Control", "no-store")
        self._security_headers()
        self.end_headers()

    def _send_admin_login(self, token: str, csrf: str) -> None:
        encoded = json.dumps({"authenticated": True, "expires_in": ADMIN_SESSION_SECONDS}, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Set-Cookie", f"hvac_admin_session={token}; Max-Age={ADMIN_SESSION_SECONDS}; Path=/admin; Secure; HttpOnly; SameSite=Strict")
        self.send_header("Set-Cookie", f"hvac_admin_csrf={csrf}; Max-Age={ADMIN_SESSION_SECONDS}; Path=/admin; Secure; SameSite=Strict")
        self._security_headers()
        self.end_headers()
        self.wfile.write(encoded)

    def _clear_admin_session(self) -> None:
        encoded = b'{"authenticated":false}'
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Set-Cookie", "hvac_admin_session=; Max-Age=0; Path=/admin; Secure; HttpOnly; SameSite=Strict")
        self.send_header("Set-Cookie", "hvac_admin_csrf=; Max-Age=0; Path=/admin; Secure; SameSite=Strict")
        self._security_headers()
        self.end_headers()
        self.wfile.write(encoded)

    def _serve_admin_asset(self, filename: str, *, login_asset: bool = False) -> None:
        login_allowed = {"admin-login.html", "admin-login.js", "admin-login.css"}
        app_allowed = {"index.html", "i18n.js", "app.js", "diagnostics.js", "cylinders.js", "styles.css", "diagnostics.css"}
        allowed = login_allowed if login_asset else app_allowed
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

    def _proxy_admin_request(self) -> None:
        parsed = urlparse(self.path)
        target = parsed.path[len("/admin"):]
        if not target.startswith("/api/"):
            self._error("Endpoint non trovato", 404)
            return
        if parsed.query:
            target = f"{target}?{parsed.query}"
        length = int(self.headers.get("Content-Length", "0"))
        if length > 2_000_000:
            self._error("Richiesta troppo grande", 413)
            return
        body = self.rfile.read(length) if length else None
        headers = {"Content-Type": self.headers.get("Content-Type", "application/json")}
        connection = http.client.HTTPConnection("127.0.0.1", PORT, timeout=45)
        try:
            connection.request(self.command, target, body=body, headers=headers)
            response = connection.getresponse()
            content = response.read()
            self.send_response(response.status)
            for name in ("Content-Type", "Content-Disposition", "Content-Security-Policy"):
                value = response.getheader(name)
                if value:
                    self.send_header(name, value)
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "no-store")
            self._security_headers()
            self.end_headers()
            self.wfile.write(content)
        except (OSError, http.client.HTTPException):
            self._error("Servizio amministrativo temporaneamente non disponibile", 503)
        finally:
            connection.close()

    def _authorize_admin_api(self) -> dict | None:
        session = self._admin_session()
        if not session:
            self._error("Sessione amministratore scaduta", 401)
            return None
        if self.command in {"POST", "PUT", "PATCH", "DELETE"} and not self._admin_csrf_valid(session):
            self._error("Protezione della sessione non valida. Accedi nuovamente", 403)
            return None
        return session

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
        if parts == ["admin", "login"]:
            if self._admin_session():
                self._redirect("/admin/")
            else:
                self._serve_admin_asset("admin-login.html", login_asset=True)
            return
        if len(parts) == 2 and parts[0] == "admin" and parts[1] in {"admin-login.js", "admin-login.css"}:
            self._serve_admin_asset(parts[1], login_asset=True)
            return
        if parts and parts[0] == "admin":
            session = self._admin_session()
            if not session:
                if len(parts) >= 2 and parts[1] == "api":
                    self._error("Accedi come amministratore", 401)
                else:
                    self._redirect("/admin/login")
                return
            if len(parts) >= 2 and parts[1] == "api":
                self._proxy_admin_request()
                return
            if parts == ["admin"]:
                if not urlparse(self.path).path.endswith("/"):
                    self._redirect("/admin/")
                else:
                    self._serve_admin_asset("index.html")
                return
            if len(parts) == 2:
                self._serve_admin_asset(parts[1])
                return
            self._error("Pagina non trovata", 404)
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
        if parts == ["admin", "api", "login"]:
            if len(configured_admin_password()) < 10:
                self._error("Configura nelle opzioni dell’add-on una password amministratore di almeno 10 caratteri", 503)
                return
            address = self._client_key()
            if admin_rate_limited(address):
                self._error("Troppi tentativi. Riprova tra 15 minuti", 429)
                return
            try:
                payload = self._json_body()
                if not verify_admin_password(address, payload.get("password")):
                    self._error("Password amministratore non valida", 403)
                    return
                token, csrf = admin_session_token()
                self._send_admin_login(token, csrf)
            except (ValueError, json.JSONDecodeError) as exc:
                self._error(str(exc))
            return
        if parts == ["admin", "api", "logout"]:
            if self._authorize_admin_api():
                self._clear_admin_session()
            return
        if len(parts) >= 2 and parts[:2] == ["admin", "api"]:
            if self._authorize_admin_api():
                self._proxy_admin_request()
            return
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
        parts = self._parts()
        if len(parts) >= 2 and parts[:2] == ["admin", "api"]:
            if self._authorize_admin_api():
                self._proxy_admin_request()
            return
        self._error("Operazione non consentita", 405)

    def do_PUT(self) -> None:
        parts = self._parts()
        if len(parts) >= 2 and parts[:2] == ["admin", "api"]:
            if self._authorize_admin_api():
                self._proxy_admin_request()
            return
        self._error("Operazione non consentita", 405)

    def do_PATCH(self) -> None:
        parts = self._parts()
        if len(parts) >= 2 and parts[:2] == ["admin", "api"]:
            if self._authorize_admin_api():
                self._proxy_admin_request()
            return
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
