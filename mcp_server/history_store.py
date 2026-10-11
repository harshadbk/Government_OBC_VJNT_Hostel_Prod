"""Chat history for the MCP AI server, stored in MongoDB Atlas through the backend.

The MongoDB user this server uses is read-only, so every /ask interaction is
POSTed to the Node backend (POST /api/mcp-history), which owns the write
connection. Sending happens on a background thread so answering is never
delayed. If the backend cannot be reached, the entry is appended to a local
backlog file and re-sent on the next successful save.

Config (.env):
    BACKEND_API_URL   e.g. http://localhost:5000 or https://api.hostelmanagement.online
    MCP_HISTORY_KEY   shared secret; must match MCP_HISTORY_KEY in backend/.env
"""

import json
import os
import threading
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any

from server import IST

BACKEND_API_URL = (os.getenv("BACKEND_API_URL") or "http://localhost:5000").rstrip("/")
MCP_HISTORY_KEY = os.getenv("MCP_HISTORY_KEY", "")
BACKLOG_FILE = Path(os.getenv("MCP_HISTORY_BACKLOG") or Path(__file__).with_name("history_backlog.jsonl"))
MAX_ANSWER_CHARS = 20000
TIMEOUT_SECONDS = 10

_lock = threading.Lock()


def _summarize_tools(tools_used: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    """Keep tool name, arguments and outcome; drop the raw result rows (large and may hold personal data)."""
    summary = []
    for t in tools_used or []:
        data = t.get("data")
        entry: dict[str, Any] = {"tool": t.get("tool"), "arguments": t.get("arguments") or {}}
        if isinstance(data, dict):
            entry["ok"] = data.get("success") is not False
            if data.get("error"):
                entry["error"] = str(data["error"])[:300]
            for key in ("count", "total", "returned"):
                if isinstance(data.get(key), int):
                    entry["rows"] = data[key]
                    break
        summary.append(entry)
    return summary


def _post(entry: dict[str, Any]) -> bool:
    req = urllib.request.Request(
        f"{BACKEND_API_URL}/api/mcp-history",
        data=json.dumps(entry, ensure_ascii=False, default=str).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-mcp-key": MCP_HISTORY_KEY},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as response:
            return 200 <= response.status < 300
    except urllib.error.HTTPError as exc:
        print(f"[history] backend rejected chat ({exc.code}): {exc.read().decode('utf-8', 'ignore')[:200]}")
        # 4xx (bad key / bad payload) will not fix itself by retrying, so don't keep it in the backlog
        return 400 <= exc.code < 500
    except Exception as exc:
        print(f"[history] backend unreachable: {exc}")
        return False


def _append_backlog(entry: dict[str, Any]) -> None:
    with open(BACKLOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False, default=str) + "\n")


def _flush_backlog() -> None:
    if not BACKLOG_FILE.exists():
        return
    lines = [line for line in BACKLOG_FILE.read_text(encoding="utf-8").splitlines() if line.strip()]
    remaining = []
    for i, line in enumerate(lines):
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if not _post(entry):
            remaining = lines[i:]
            break
    if remaining:
        BACKLOG_FILE.write_text("\n".join(remaining) + "\n", encoding="utf-8")
    else:
        BACKLOG_FILE.unlink(missing_ok=True)


def _send(entry: dict[str, Any]) -> None:
    with _lock:
        try:
            if _post(entry):
                _flush_backlog()
            else:
                _append_backlog(entry)
        except Exception as exc:  # pragma: no cover - logging only
            print(f"[history] failed to save chat: {exc}")


def build_entry(
    *,
    question: str,
    result: dict[str, Any],
    duration_ms: int,
    session_id: str | None = None,
    admin_user: str | None = None,
    client_ip: str | None = None,
) -> dict[str, Any]:
    return {
        "created_at": datetime.now(IST).isoformat(timespec="seconds"),
        "session_id": session_id,
        "admin_user": admin_user,
        "client_ip": client_ip,
        "question": question,
        "answer": (result.get("answer") or "")[:MAX_ANSWER_CHARS],
        "success": bool(result.get("success")) and not result.get("error"),
        "source": result.get("source"),
        "iterations": result.get("iterations"),
        "tools_used": _summarize_tools(result.get("tools_used")),
        "duration_ms": duration_ms,
        "error": result.get("error"),
        "groq_error": result.get("groq_error"),
    }


def record(**kwargs: Any) -> None:
    """Queue one /ask interaction for storage. Never raises: history must not break answering."""
    try:
        entry = build_entry(**kwargs)
    except Exception as exc:  # pragma: no cover - logging only
        print(f"[history] could not build entry: {exc}")
        return
    if not MCP_HISTORY_KEY:
        print("[history] MCP_HISTORY_KEY is not set; chat not saved.")
        return
    threading.Thread(target=_send, args=(entry,), daemon=True).start()
