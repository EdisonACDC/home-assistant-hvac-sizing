"""Server HTTP senza dipendenze esterne, compatibile con Home Assistant Ingress."""

from __future__ import annotations

import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

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
    return connection


class Handler(BaseHTTPRequestHandler):
    server_version = "HVACSizing/0.1"

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

    def _error(self, message: str, status: int = 400) -> None:
        self._send_json({"error": message}, status)

    def do_GET(self) -> None:
        path = self._path()
        if path == "/api/health":
            self._send_json({"status": "ok", "version": "0.1.0"})
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
            self._error("Endpoint non trovato", 404)
        except (ValueError, json.JSONDecodeError) as exc:
            self._error(str(exc))
        except Exception as exc:  # keep details in logs, not in the browser
            print(f"Errore: {exc!r}", flush=True)
            self._error("Errore interno durante l’elaborazione", 500)

    def do_DELETE(self) -> None:
        path = self._path()
        if not path.startswith("/api/projects/"):
            self._error("Endpoint non trovato", 404)
            return
        project_id = path.rsplit("/", 1)[-1]
        with db_connection() as db:
            cursor = db.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        if not cursor.rowcount:
            self._error("Progetto non trovato", 404)
            return
        self._send_json({"deleted": project_id})

    def _serve_static(self, path: str) -> None:
        filename = path.rsplit("/", 1)[-1]
        if not filename or "." not in filename:
            filename = "index.html"
        allowed = {"index.html", "app.js", "styles.css"}
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

