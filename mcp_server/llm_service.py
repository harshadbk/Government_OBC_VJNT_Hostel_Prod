import json
import os
import re
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

import server as mcp_server

load_dotenv(Path(__file__).with_name(".env"))

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
# First model is preferred; the rest are fallbacks. Override with GROQ_MODEL / GROQ_FALLBACK_MODELS (comma separated).
GROQ_MODELS = [
    m.strip()
    for m in [os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")]
    + os.getenv("GROQ_FALLBACK_MODELS", "qwen/qwen3.8-27b,openai/gpt-oss-20b").split(",")
    if m.strip()
]
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MAX_TOOL_TURNS = 8
MAX_TOOL_RESULT_CHARS = 9000
MAX_MEMORY_TURNS = 12
MEMORY_FILE = Path(__file__).with_name(".conversation_memory.json")

IST = mcp_server.IST


# ============================================================================
# CONVERSATION MEMORY
# ============================================================================

def load_memory() -> dict[str, list[dict[str, Any]]]:
    """Load conversation history for chat sessions."""
    if not MEMORY_FILE.exists():
        return {}
    try:
        with open(MEMORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def save_memory(memory: dict[str, list[dict[str, Any]]]) -> None:
    """Persist conversation history to file."""
    try:
        with open(MEMORY_FILE, "w", encoding="utf-8") as f:
            json.dump(memory, f, indent=2, ensure_ascii=False)
    except Exception:
        pass


def remember_interaction(session_id: str | None, question: str, answer: str, tool_history: list[dict[str, Any]] | None = None) -> None:
    """Save an interaction turn to session memory."""
    if not session_id:
        return
    memory = load_memory()
    history = memory.setdefault(session_id, [])
    history.append({
        "timestamp": datetime.now(IST).isoformat(),
        "question": question,
        "answer": answer,
        "tools_used": [t.get("tool") for t in (tool_history or [])],
    })
    memory[session_id] = history[-MAX_MEMORY_TURNS:]
    save_memory(memory)


# ============================================================================
# TOOL DEFINITIONS (derived from the MCP server - single source of truth)
# ============================================================================

def _simplify_schema(schema: Any) -> Any:
    """Strip pydantic noise (titles, Optional anyOf-null wrappers) so smaller LLMs read schemas reliably."""
    if isinstance(schema, list):
        return [_simplify_schema(s) for s in schema]
    if not isinstance(schema, dict):
        return schema
    if "anyOf" in schema:
        options = [o for o in schema["anyOf"] if o.get("type") != "null"]
        if len(options) == 1:
            merged = {**{k: v for k, v in schema.items() if k != "anyOf"}, **options[0]}
            return _simplify_schema(merged)
    out: dict[str, Any] = {}
    for key, value in schema.items():
        if key in {"title", "default"}:
            continue
        if key == "additionalProperties" and value is True:
            continue
        out[key] = _simplify_schema(value) if key != "properties" else {k: _simplify_schema(v) for k, v in value.items()}
    return out


def _compact_param_descriptions(schema: dict[str, Any], max_len: int = 110) -> dict[str, Any]:
    for prop in schema.get("properties", {}).values():
        desc = prop.get("description")
        if desc and len(desc) > max_len:
            prop["description"] = desc[:max_len].rsplit(" ", 1)[0] + "..."
    return schema


def get_mcp_tool_definitions() -> list[dict[str, Any]]:
    """OpenAI-style tool definitions for every registered MCP tool.
    Kept compact because the full list is re-sent on every turn (Groq free tier is ~8k tokens/minute)."""
    definitions = []
    for tool in mcp_server.get_tool_schemas():
        description = re.sub(r"\s+", " ", tool["description"]).strip()
        if len(description) > 260:
            description = description[:260].rsplit(" ", 1)[0] + "..."
        params = _simplify_schema(tool["parameters"])
        if tool["name"] != "aggregate_documents":  # keep the pipeline example intact
            params = _compact_param_descriptions(params)
        definitions.append({
            "type": "function",
            "function": {
                "name": tool["name"],
                "description": description,
                "parameters": params,
            },
        })
    return definitions


# Generic tools can answer any question; domain tools are added when the question mentions their topic.
CORE_TOOLS = {"find_documents", "count_documents", "aggregate_documents", "get_distinct_values", "group_and_count", "search_database"}
TOPIC_TOOLS: list[tuple[str, set[str]]] = [
    (r"attend|absent|present|bunk|defaulter|percent|%", {"get_daily_attendance", "get_attendance_report"}),
    (r"room|roommate|occupan|lives?\b|staying", {"get_room_details", "find_students"}),
    (r"leave|holiday|going home|on leave|comeback|return", {"get_leave_applications"}),
    (r"complain|issue|problem|mainten|electric|plumb|clean|wifi|wi-fi|mess|food", {"get_complaints"}),
    (r"document|certificate|aadha|marksheet|bonafide|domicile|income|upload|submission", {"get_document_status"}),
    (r"message|chat|community|announcement|reported|moderat|spam", {"get_community_messages"}),
    (r"recent|new|latest|last \d+ days|this week|past week|activity|today", {"get_recent_activity"}),
    (r"overview|stats|statistic|summary|dashboard|total|how many|count|staff|warden|rector|admin", {"get_database_stats"}),
    (r"schema|collection|field|table|structure", {"describe_schema", "list_collections"}),
    (r"student|who|name|profile|about|detail|department|dept|year|college|district|taluka|village|caste|obc|vjnt|stream|roll", {"find_students", "get_student_profile"}),
]


def select_tools(question: str, history: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Pick the tools relevant to this question (plus recent context) to stay within the LLM token budget."""
    text = " ".join([question] + [m.get("content", "") for m in history[-2:] if m.get("role") == "user"]).lower()
    wanted = set(CORE_TOOLS)
    for pattern, names in TOPIC_TOOLS:
        if re.search(pattern, text):
            wanted |= names
    if wanted == CORE_TOOLS:  # nothing matched: likely a name or free-form question
        wanted |= {"find_students", "get_student_profile", "get_database_stats"}
    return [t for t in get_mcp_tool_definitions() if t["function"]["name"] in wanted]


# ============================================================================
# GROQ CLIENT
# ============================================================================

class LLMError(RuntimeError):
    def __init__(self, message: str, rate_limited: bool = False):
        super().__init__(message)
        self.rate_limited = rate_limited


def _post_groq(payload: dict[str, Any]) -> dict[str, Any]:
    req = urllib.request.Request(
        GROQ_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "Hostel-MCP-Server/3.0",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def call_llm(messages: list[dict[str, Any]], tools: list[dict[str, Any]] | None = None, tool_choice: str = "auto") -> dict[str, Any]:
    """Chat completion against Groq with model fallback, rate-limit retry and readable errors."""
    if not GROQ_API_KEY:
        raise LLMError("GROQ_API_KEY is not configured in environment variables.")

    for round_no in range(2):
        try:
            return _call_models(messages, tools, tool_choice)
        except LLMError as exc:
            # Every model hit its per-minute limit: wait for the window to reset once, then retry
            if round_no == 0 and exc.rate_limited:
                time.sleep(RATE_LIMIT_RESET_WAIT)
                continue
            raise
    raise LLMError("unreachable")


RATE_LIMIT_RESET_WAIT = 25


def _call_models(messages: list[dict[str, Any]], tools: list[dict[str, Any]] | None, tool_choice: str) -> dict[str, Any]:
    errors: list[str] = []
    rate_limited = True
    for model in GROQ_MODELS:
        payload: dict[str, Any] = {"model": model, "messages": messages, "temperature": 0.1, "max_tokens": 2500}
        if model.startswith("openai/gpt-oss"):
            payload["reasoning_effort"] = "medium"
        elif model.startswith("qwen/"):
            payload["reasoning_format"] = "hidden"
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = tool_choice

        for attempt in range(2):
            try:
                result = _post_groq(payload)
                result["_model"] = model
                return result
            except urllib.error.HTTPError as exc:
                body = exc.read().decode("utf-8", errors="replace")
                try:
                    err = json.loads(body).get("error", {})
                except json.JSONDecodeError:
                    err = {"message": body[:300]}
                # The model produced a malformed tool call: recover it from failed_generation if possible
                if err.get("code") == "tool_use_failed" and err.get("failed_generation"):
                    recovered = extract_text_tool_calls(err["failed_generation"])
                    if recovered:
                        return {"_model": model, "choices": [{"message": {"role": "assistant", "content": None, "tool_calls": recovered}}]}
                if exc.code == 429 and attempt == 0:
                    # Per-minute token limit: a short wait on the preferred model beats a weaker fallback
                    hint = re.search(r"try again in ([\d.]+)s", err.get("message", ""))
                    wait = float(hint.group(1)) if hint else float(exc.headers.get("retry-after", "5") or 5)
                    if wait <= 20:
                        time.sleep(wait + 0.5)
                        continue
                rate_limited &= exc.code in (413, 429)
                errors.append(f"{model}: HTTP {exc.code} {err.get('message', '')[:200]}")
                break
            except Exception as exc:  # network errors, timeouts
                rate_limited = False
                errors.append(f"{model}: {exc}")
                break
    raise LLMError("All Groq models failed. " + " | ".join(errors), rate_limited=rate_limited)


def extract_text_tool_calls(text: str) -> list[dict[str, Any]]:
    """Recover tool calls a model wrote as text, e.g. <find_documents>{...}</find_documents>
    or {"name": "find_documents", "arguments": {...}}."""
    if not text:
        return []
    calls: list[dict[str, Any]] = []
    for tool_name in mcp_server.TOOLS_MAP:
        for match in re.findall(rf"<{tool_name}>(.*?)</{tool_name}>", text, re.DOTALL):
            try:
                args = json.loads(match.strip() or "{}")
            except json.JSONDecodeError:
                args = {}
            calls.append({"name": tool_name, "arguments": args})
        for match in re.findall(rf"<function={tool_name}>?\s*(\{{.*?\}})\s*</function>", text, re.DOTALL):
            try:
                calls.append({"name": tool_name, "arguments": json.loads(match)})
            except json.JSONDecodeError:
                pass
    if not calls:
        try:
            obj = json.loads(text.strip())
            if isinstance(obj, dict) and obj.get("name") in mcp_server.TOOLS_MAP:
                args = obj.get("arguments") or obj.get("parameters") or {}
                calls.append({"name": obj["name"], "arguments": json.loads(args) if isinstance(args, str) else args})
        except (json.JSONDecodeError, TypeError):
            pass
    return [
        {"id": f"call_text_{i}", "type": "function", "function": {"name": c["name"], "arguments": json.dumps(c["arguments"])}}
        for i, c in enumerate(calls)
    ]


def _compact_json(data: Any) -> str:
    """Serialize a tool result for the LLM, trimming oversized lists so it fits the context budget."""
    text = json.dumps(mcp_server.serialize(data), ensure_ascii=False, separators=(",", ":"))
    if len(text) <= MAX_TOOL_RESULT_CHARS:
        return text

    def shrink(value: Any, max_items: int) -> Any:
        if isinstance(value, list):
            trimmed = [shrink(v, max_items) for v in value[:max_items]]
            if len(value) > max_items:
                trimmed.append(f"... {len(value) - max_items} more items omitted (use filters/limit/skip or an aggregate count)")
            return trimmed
        if isinstance(value, dict):
            return {k: shrink(v, max_items) for k, v in value.items()}
        if isinstance(value, str) and len(value) > 400:
            return value[:400] + "..."
        return value

    for max_items in (60, 30, 15, 8, 4):
        text = json.dumps(shrink(mcp_server.serialize(data), max_items), ensure_ascii=False, separators=(",", ":"))
        if len(text) <= MAX_TOOL_RESULT_CHARS:
            return text
    return text[:MAX_TOOL_RESULT_CHARS] + '..."[truncated]"'


# ============================================================================
# ORCHESTRATION
# ============================================================================

def build_system_prompt() -> str:
    now = datetime.now(IST)
    return f"""You are the AI data assistant for a Government OBC/VJNT Boys Hostel Management System.
You answer admin questions using ONLY data returned by the read-only database tools.
Current date/time: {now:%Y-%m-%d %H:%M} (Asia/Kolkata). Database: {mcp_server.DATABASE_NAME}.

COLLECTIONS
- users: every document is a resident student. username, fullName, rollNumber, department, year, roomNumber,
  college_name, stream, village, taluka, district, caste, casteCategory (OBC/VJNT/NT-C), admissionDate, createdAt.
  Values are free text typed by students (e.g. department 'CSE', 'cse', 'Computer Engineering ', many empty).
- attendances: one doc per day {{date:'YYYY-MM-DD', students:[{{username, roomNumber, status:'Present'|'Absent'}}], markedBy}}.
- leaveapplications: username, fullName, reason, startDate, endDate ('YYYY-MM-DD'), status Pending/Approved/Rejected, comebackMarked.
- complaints: title, description, category, priority Low/Medium/High/Urgent, status Pending/In Progress/Resolved/Rejected, roomNumber, isAnonymous, adminResponse.
- notices (title, content, severity low/medium/high), staffs (name, position), admins (username, role, status),
  documents (which certificates each student uploaded), uploads (document requests + submissions),
  messages (community chat), messagereports (moderation reports).
Contact details, passwords, bank/Aadhaar data and file URLs are private and never available.

HOW TO WORK
1. Greetings/small talk/questions about yourself: reply briefly without tools.
2. Any question about hostel data: ALWAYS call tools first; never answer from memory or guess.
3. Prefer specialised tools: get_student_profile (one student), find_students (lists/filters), get_room_details,
   get_daily_attendance (one day), get_attendance_report (date ranges, percentages, defaulters), get_leave_applications,
   get_complaints, get_document_status, get_community_messages, get_recent_activity, get_database_stats,
   group_and_count (counts per department/district/room/etc). get_room_details() with no room lists every room with occupants.
   Use find_documents / count_documents / aggregate_documents for anything else, and get_distinct_values to learn real
   spellings before filtering free-text fields. For complex questions chain several tool calls.
4. If a filter returns nothing, retry once with a broader/partial match (e.g. find_students(department='comp'))
   or check get_distinct_values before concluding.
5. If the data truly isn't there, say clearly: "This information is not available in the hostel database" (and say
   what is missing, e.g. "no leave applications have been submitted yet" or "department is not filled for 46 students").
   Never invent names, numbers or dates.
6. Relative dates ('today', 'yesterday', 'last week', 'this month') are relative to the current IST date above.
   If today's attendance is not marked yet, say so and give the latest recorded date.
7. If several students match a name, list the candidates and ask which one.

ANSWER STYLE
- Lead with the direct answer (exact numbers), then supporting details.
- Use short markdown lists or tables for multiple students; show full name (or username if name empty) and room.
- Mention when a list was truncated and the total count.
- Keep answers concise and factual."""


def _normalize_history(history: list[dict[str, Any]] | None, session_id: str | None) -> list[dict[str, Any]]:
    messages: list[dict[str, Any]] = []
    if history:
        for msg in history[-8:]:
            role = str(msg.get("role", "user")).lower()
            role = "assistant" if role in {"assistant", "bot", "ai", "model"} else "user"
            content = str(msg.get("content") or msg.get("text") or "").strip()
            if content:
                messages.append({"role": role, "content": content[:2000]})
    elif session_id:
        for item in load_memory().get(session_id, [])[-4:]:
            messages.append({"role": "user", "content": item["question"]})
            messages.append({"role": "assistant", "content": item["answer"][:2000]})
    return messages


def execute_llm_mcp_pipeline(
    question: str,
    session_id: str | None = None,
    history: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """User -> Groq LLM -> MCP tools -> MongoDB -> Groq LLM -> answer."""
    prior = _normalize_history(history, session_id)
    messages: list[dict[str, Any]] = [{"role": "system", "content": build_system_prompt()}, *prior]
    messages.append({"role": "user", "content": question})

    tools = select_tools(question, prior)
    executed_tools: list[dict[str, Any]] = []
    model_used = None

    for turn in range(MAX_TOOL_TURNS):
        res = call_llm(messages, tools=tools)
        model_used = res.get("_model")
        choice = res["choices"][0]["message"]
        tool_calls = choice.get("tool_calls") or extract_text_tool_calls(choice.get("content") or "")

        if not tool_calls:
            answer = _clean_answer(choice.get("content"))
            return _result(question, answer or "I could not produce an answer.", executed_tools, model_used)

        # Only send back fields the API accepts
        messages.append({"role": "assistant", "content": choice.get("content") or "", "tool_calls": tool_calls})

        for idx, tc in enumerate(tool_calls):
            func_name = tc["function"]["name"]
            raw_args = tc["function"].get("arguments") or "{}"
            try:
                func_args = json.loads(raw_args) if isinstance(raw_args, str) else dict(raw_args)
            except json.JSONDecodeError:
                func_args = {}
            tool_call_id = tc.get("id") or f"call_{turn}_{idx}"
            tc["id"] = tool_call_id

            try:
                tool_result = mcp_server.execute_tool(func_name, func_args)
            except Exception as exc:
                tool_result = {
                    "success": False,
                    "error": str(exc),
                    "hint": "Fix the arguments and retry, or use another tool (describe_schema / get_distinct_values).",
                }

            executed_tools.append({"tool": func_name, "arguments": func_args, "data": mcp_server.serialize(tool_result)})
            messages.append({"role": "tool", "tool_call_id": tool_call_id, "content": _compact_json(tool_result)})

    # Out of tool turns: force a final answer from what was gathered
    messages.append({"role": "user", "content": "Using only the tool results above, give the final answer now. If the data is insufficient, say what is not available."})
    res = call_llm(messages)
    return _result(question, _clean_answer(res["choices"][0]["message"].get("content")) or "I could not complete this query.", executed_tools, res.get("_model"))


def _clean_answer(text: str | None) -> str:
    """Remove any leaked reasoning tags."""
    return re.sub(r"<think>.*?</think>", "", text or "", flags=re.DOTALL).strip()


def _result(question: str, answer: str, executed_tools: list[dict[str, Any]], model: str | None) -> dict[str, Any]:
    return {
        "success": True,
        "question": question,
        "answer": answer,
        "source": f"groq:{model}" + ("+mcp-tools" if executed_tools else ""),
        "iterations": len(executed_tools),
        "tools_used": executed_tools,
        "data": executed_tools[-1]["data"] if executed_tools else None,
    }


# ============================================================================
# DETERMINISTIC FALLBACK (used when the LLM is unavailable)
# ============================================================================

def _names(rows: list[dict[str, Any]]) -> str:
    return ", ".join(f"{r.get('fullName') or r.get('username')} (room {r.get('roomNumber')})" for r in rows)


def local_deterministic_fallback(question: str) -> dict[str, Any]:
    """Keyword-routed answers using MCP tools when the LLM is unreachable."""
    q = question.lower().strip()

    def reply(answer: str, data: Any = None) -> dict[str, Any]:
        return {"success": True, "question": question, "answer": answer, "source": "deterministic-fallback", "data": data}

    if re.fullmatch(r"(hi|hello|hey|namaste|good (morning|afternoon|evening))[!. ]*", q) or "what can you do" in q:
        return reply(
            "Hello! I am the Hostel Management AI Assistant. Ask me about students, rooms, attendance, "
            "leave applications, complaints, documents, notices, staff or community messages."
        )

    group_match = re.search(r"by (department|dept|year|district|taluka|college|stream|room|caste category|category)", q)
    if group_match:
        field = {"dept": "department", "college": "college_name", "room": "roomNumber",
                 "caste category": "casteCategory", "category": "casteCategory"}.get(group_match.group(1), group_match.group(1))
        data = mcp_server.group_and_count("users", field)
        summary = ", ".join(f"{g['value']}: {g['count']}" for g in data["groups"])
        return reply(f"Students by {field}: {summary}.", data)

    room = re.search(r"room\s*(?:no\.?|number)?\s*#?\s*(\d+)", q)
    if room:
        data = mcp_server.get_room_details(room.group(1))
        occ = data["occupants"]
        return reply(f"Room {room.group(1)} has {len(occ)} occupant(s): {_names([{**o, 'roomNumber': room.group(1)} for o in occ])}." if occ
                     else f"No occupants found for room {room.group(1)}.", data)

    if "attendance" in q or "absent" in q or "present" in q:
        day = "yesterday" if "yesterday" in q else None
        data = mcp_server.get_daily_attendance(day)
        if not data.get("found"):
            return reply(data.get("message", "No attendance found."), data)
        text = f"Attendance on {data['date']}: {data['present']} present, {data['absent']} absent ({data['attendance_percent']}%)."
        if "absent" in q and data.get("absent_students"):
            text += " Absent: " + _names(data["absent_students"]) + "."
        return reply(text, data)

    if "complaint" in q:
        data = mcp_server.get_complaints()
        return reply(f"{data['total_matched']} complaint(s). By status: {data['by_status'] or 'none'}.", data)

    if "leave" in q:
        data = mcp_server.get_leave_applications(on_leave_date="today" if "today" in q or "currently" in q else None)
        return reply(data.get("note") or f"{data['total_matched']} leave application(s) found. Breakdown: {data['all_time_status_breakdown']}.", data)

    if "notice" in q:
        data = mcp_server.find_documents("notices", sort={"createdAt": -1}, limit=5)
        titles = ", ".join(f"'{n.get('title')}'" for n in data["documents"])
        return reply(f"Recent notices: {titles}." if titles else "No notices found.", data)

    if any(k in q for k in ("staff", "warden", "rector", "guard")):
        data = mcp_server.find_documents("staffs", limit=20)
        staff = "; ".join(f"{s.get('name')} ({s.get('position')})" for s in data["documents"])
        return reply(f"Hostel staff: {staff}." if staff else "No staff records found.", data)

    if "document" in q or "certificate" in q:
        data = mcp_server.get_document_status(only_incomplete=True)
        return reply(f"{data['fully_complete_students']} of {data['students_considered']} students have uploaded all documents; "
                     f"{data['students_with_no_uploads']} have uploaded none.", data)

    if any(k in q for k in ("stats", "overview", "summary", "how many students", "total students", "dashboard")):
        data = mcp_server.get_database_stats()
        s = data["stats"]
        att = s["latest_attendance"]
        return reply(
            f"{s['total_students']} students in {s['occupied_rooms']} rooms. Latest attendance ({att.get('date')}): "
            f"{att.get('present')} present, {att.get('absent')} absent. Complaints: {s['complaints']}. "
            f"Leave applications: {s['leave_applications']}. Notices: {s['notices']}.", data)

    # Try the question as a student lookup, then as a generic keyword search
    words = [w for w in re.findall(r"[a-zA-Z_]{3,}", question) if w.lower() not in {
        "who", "what", "where", "show", "tell", "about", "student", "details", "the", "give", "find", "info", "information", "please", "profile", "and"}]
    if words:
        profile = mcp_server.get_student_profile(" ".join(words[:3]))
        if profile.get("found") and not profile.get("ambiguous"):
            p = profile["profile"]
            return reply(f"{p.get('fullName') or p.get('username')}: room {p.get('roomNumber')}, {p.get('department') or 'department not provided'}, "
                         f"attendance {profile['attendance']['attendance_percent']}% over {profile['attendance']['days_considered']} days.", profile)

    data = mcp_server.search_database(" ".join(words[:3]) or question, limit=5)
    if data["total_matches"]:
        return reply(f"Found {data['total_matches']} matching record(s) in: {', '.join(data['results'])}.", data)
    return reply("This information is not available in the hostel database (the AI model is currently unreachable, so only simple lookups are supported).", data)


def ask_question(
    question: str,
    session_id: str | None = None,
    history: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Public entry point for querying the hostel database."""
    clean_q = str(question or "").strip()
    if not clean_q:
        raise ValueError("Question cannot be empty.")

    if GROQ_API_KEY:
        try:
            response = execute_llm_mcp_pipeline(clean_q, session_id=session_id, history=history)
            remember_interaction(session_id, clean_q, response.get("answer") or "", response.get("tools_used"))
            return response
        except Exception as exc:
            try:
                fallback = local_deterministic_fallback(clean_q)
            except Exception as fb_exc:
                fallback = {"success": False, "question": clean_q, "answer": "Sorry, I could not answer that right now.", "error": str(fb_exc)}
            fallback["groq_error"] = f"LLM error: {exc}"
            remember_interaction(session_id, clean_q, fallback.get("answer") or "")
            return fallback

    fallback = local_deterministic_fallback(clean_q)
    remember_interaction(session_id, clean_q, fallback.get("answer") or "")
    return fallback
