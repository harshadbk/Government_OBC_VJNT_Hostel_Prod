import json
import os
import re
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

import server as mcp_server

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
# Default to high-capability 70B model with fallback to 8B model
GROQ_MODELS = [
    os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
    "llama-3.1-8b-instant",
]
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MAX_MEMORY_TURNS = 12
MEMORY_FILE = Path(__file__).with_name(".conversation_memory.json")

# Asia/Kolkata timezone
IST = timezone(timedelta(hours=5, minutes=30), name="Asia/Kolkata")


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


def get_mcp_tool_definitions() -> list[dict[str, Any]]:
    """Return JSON schemas of general-purpose FastMCP server tools for Groq LLM."""
    return [
        {
            "type": "function",
            "function": {
                "name": "list_collections",
                "description": "List all allowed hostel database collections, descriptions, and current document counts.",
                "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
            },
        },
        {
            "type": "function",
            "function": {
                "name": "describe_schema",
                "description": "Describe queryable schema and fields for all collections or a specific collection.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "collection_name": {
                            "type": "string",
                            "description": "Optional collection name ('users', 'attendances', 'leaveapplications', 'notices', 'staffs', 'admins').",
                        },
                    },
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "get_database_stats",
                "description": "Get high-level aggregated statistics of the hostel database (total students, total distinct rooms, notices, pending leaves, approved leaves, staff, and breakdowns).",
                "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
            },
        },
        {
            "type": "function",
            "function": {
                "name": "find_documents",
                "description": "Query documents from any collection with safe filter, projection, sort, and limit. Use to lookup students by name/room/department/year/district, notices, leaves, or staff.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "collection": {
                            "type": "string",
                            "description": "Collection name ('users', 'attendances', 'leaveapplications', 'notices', 'staffs', 'uploads', 'channels', 'messages', 'admins').",
                        },
                        "filter": {
                            "type": "object",
                            "description": "Safe MongoDB filter (e.g. {'roomNumber': '14'}, {'department': 'Computer'}, {'fullName': {'$regex': 'Rahul', '$options': 'i'}}, {'district': 'Pune'}, {'status': 'Pending'}).",
                        },
                        "projection": {
                            "type": "object",
                            "description": "Optional fields to include (e.g. {'fullName': 1, 'roomNumber': 1, 'department': 1, 'year': 1}).",
                        },
                        "sort": {
                            "type": "object",
                            "description": "Optional sort order (e.g. {'createdAt': -1}, {'roomNumber': 1}).",
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Max documents to return (default 20, max 50).",
                        },
                    },
                    "required": ["collection"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "count_documents",
                "description": "Count matching documents in any collection (e.g. total students, pending leaves, students in a room or department).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "collection": {"type": "string", "description": "Collection name."},
                        "filter": {"type": "object", "description": "Optional filter query (e.g. {'status': 'Pending'}, {'department': 'Civil'})."},
                    },
                    "required": ["collection"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "aggregate_documents",
                "description": "Execute a safe read-only aggregation pipeline ($match, $project, $sort, $limit, $group, $unwind, $count) for grouping, counting by department/year/block/district, or complex analytics.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "collection": {"type": "string", "description": "Collection name."},
                        "pipeline": {
                            "type": "array",
                            "items": {"type": "object"},
                            "description": "Aggregation pipeline stages (e.g. [{'$group': {'_id': '$department', 'count': {'$sum': 1}}}, {'$sort': {'count': -1}}]).",
                        },
                        "limit": {"type": "integer", "description": "Max documents (max 50)."},
                    },
                    "required": ["collection", "pipeline"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "search_database",
                "description": "Perform a global multi-collection keyword search across student profiles, notices, staff, and leave applications.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Keyword to search (name, roll number, room, district, notice title, staff position)."},
                        "limit": {"type": "integer", "description": "Max results per collection."},
                    },
                    "required": ["query"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "get_daily_attendance",
                "description": "Query daily hostel attendance for a specific date or latest date (Asia/Kolkata timezone) with status breakdown ('Present', 'Absent', 'Leave') and student lists.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "attendance_date": {
                            "type": "string",
                            "description": "Date in YYYY-MM-DD format (or 'latest'). Defaults to latest available date in IST.",
                        },
                        "status": {
                            "type": "string",
                            "description": "Optional status filter ('Present', 'Absent', 'Leave'). If omitted, returns total counts for all statuses.",
                        },
                        "student_username": {
                            "type": "string",
                            "description": "Optional student username to check attendance status for.",
                        },
                    },
                    "additionalProperties": False,
                },
            },
        },
    ]


def call_llm(messages: list[dict[str, Any]], tools: list[dict[str, Any]] | None = None, model_name: str | None = None) -> dict[str, Any]:
    """Execute chat completion request against Groq LLM API with fallback support."""
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not configured in environment variables.")

    candidate_models = [model_name] if model_name else GROQ_MODELS
    last_err: Exception | None = None

    for model in candidate_models:
        if not model:
            continue
        try:
            payload: dict[str, Any] = {
                "model": model,
                "messages": messages,
                "temperature": 0.1,
            }
            if tools:
                payload["tools"] = tools
                payload["tool_choice"] = "auto"

            req = urllib.request.Request(
                GROQ_API_URL,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                    "User-Agent": "Hostel-MCP-Server/2.0",
                },
            )

            with urllib.request.urlopen(req, timeout=35) as response:
                return json.loads(response.read().decode("utf-8"))
        except Exception as exc:
            last_err = exc
            continue

    raise RuntimeError(f"All Groq models failed. Last error: {last_err}")


def extract_text_tool_calls(text: str) -> list[dict[str, Any]]:
    """Extract tool calls if model emitted XML pseudo-tags like <find_documents>{...}</find_documents>."""
    if not text:
        return []
    calls = []
    for tool_name in mcp_server.TOOLS_MAP:
        pattern = rf"<{tool_name}>(.*?)</{tool_name}>"
        matches = re.findall(pattern, text, re.DOTALL)
        for match in matches:
            try:
                args = json.loads(match.strip())
            except Exception:
                args = {}
            calls.append({
                "function": {
                    "name": tool_name,
                    "arguments": json.dumps(args),
                }
            })
    return calls


def execute_llm_mcp_pipeline(
    question: str,
    session_id: str | None = None,
    history: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Orchestrate User -> Groq LLM -> MCP Client -> FastMCP Server Tools -> MongoDB."""
    today_ist = datetime.now(IST).strftime("%Y-%m-%d")
    system_prompt = (
        f"You are the Expert AI Assistant for the Government OBC/VJNT Hostel Management System.\n"
        f"Database Name: {mcp_server.DATABASE_NAME} | Timezone: Asia/Kolkata | Current Date: {today_ist}\n\n"
        f"COLLECTIONS & SCHEMA:\n"
        f"1. 'users' (all resident hostel students):\n"
        f"   - Fields: username, fullName, rollNumber, department (e.g. Computer, IT, Mechanical, Civil, AIML), year (1, 2, 3, 4), hostelBlock (A, B, etc.), roomNumber ('14', '101', etc.), village, taluka, district, course, classYear, college_name, stream, admissionDate.\n"
        f"2. 'attendances':\n"
        f"   - Fields: date ('YYYY-MM-DD'), students: [{{ username, roomNumber, status: 'Present' | 'Absent' | 'Leave' }}], markedBy, firstSavedAt.\n"
        f"3. 'leaveapplications':\n"
        f"   - Fields: userId, username, fullName, reason, startDate, endDate, status ('Pending' | 'Approved' | 'Rejected'), adminNote, comebackMarked.\n"
        f"4. 'notices':\n"
        f"   - Fields: title, content, severity ('low', 'medium', 'high', 'urgent'), createdAt.\n"
        f"5. 'staffs':\n"
        f"   - Fields: name, position (e.g. Rector, Warden, Guard), createdAt.\n"
        f"6. 'admins':\n"
        f"   - Fields: username, role ('admin', 'attendance_taker'), status, isActive.\n"
        f"7. 'uploads':\n"
        f"   - Fields: title, description, dueDate, requestedBy, submissions.\n\n"
        f"CORE INSTRUCTIONS:\n"
        f"- For greetings, respond politely and briefly.\n"
        f"- For database queries, ALWAYS call one or more FastMCP tools to fetch accurate real data.\n"
        f"- Use find_documents, count_documents, aggregate_documents, get_daily_attendance, or search_database.\n"
        f"- For names/strings matching, use case-insensitive regex: {{'fullName': {{'$regex': 'query', '$options': 'i'}}}} or search_database.\n"
        f"- For room occupants, query collection 'users' with {{'roomNumber': '14'}}.\n"
        f"- For attendance, use get_daily_attendance() (it automatically handles latest date in Asia/Kolkata).\n"
        f"- Present answers clearly with exact numbers, occupant lists, or structured summaries. Never fabricate data."
    )

    messages: list[dict[str, Any]] = [{"role": "system", "content": system_prompt}]

    if history:
        for msg in history[-8:]:
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
    elif session_id:
        stored = load_memory().get(session_id, [])
        for item in stored[-4:]:
            messages.append({"role": "user", "content": item["question"]})
            messages.append({"role": "assistant", "content": item["answer"]})

    messages.append({"role": "user", "content": question})

    tools = get_mcp_tool_definitions()
    executed_tools: list[dict[str, Any]] = []

    for turn in range(5):
        res = call_llm(messages, tools=tools)
        choice = res["choices"][0]["message"]
        tool_calls = choice.get("tool_calls") or []

        # If LLM generated text-based pseudo tool calls, parse and execute them
        if not tool_calls:
            text_content = choice.get("content") or ""
            extracted = extract_text_tool_calls(text_content)
            if extracted:
                tool_calls = extracted

        if not tool_calls:
            final_answer = choice.get("content") or "No response generated."
            return {
                "success": True,
                "question": question,
                "answer": final_answer,
                "source": "groq-llm-direct" if turn == 0 else "groq-llm-with-mcp-tools",
                "tools_used": executed_tools,
                "data": executed_tools[-1]["data"] if executed_tools else None,
            }

        messages.append(choice)

        for tc in tool_calls:
            func_name = tc["function"]["name"]
            func_args_str = tc["function"].get("arguments") or "{}"
            try:
                func_args = json.loads(func_args_str)
            except Exception:
                func_args = {}

            tool_call_id = tc.get("id", f"call_{func_name}_{turn}")

            try:
                tool_result = mcp_server.execute_tool(func_name, func_args)
            except Exception as exc:
                tool_result = {"success": False, "error": str(exc)}

            executed_tools.append({
                "tool": func_name,
                "arguments": func_args,
                "data": tool_result,
            })

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call_id,
                "content": json.dumps(mcp_server.serialize(tool_result), ensure_ascii=False),
            })

    return {
        "success": True,
        "question": question,
        "answer": f"Executed {len(executed_tools)} MCP tools to query the database.",
        "source": "groq-llm-max-iterations",
        "tools_used": executed_tools,
        "data": executed_tools[-1]["data"] if executed_tools else None,
    }


def local_deterministic_fallback(question: str) -> dict[str, Any]:
    """Deterministic fallback using FastMCP tools when LLM is unreachable."""
    q = question.lower().strip()

    if any(k in q for k in ["hello", "hi", "hey", "what can you do", "help me"]):
        return {
            "success": True,
            "question": question,
            "answer": (
                "Hello! I am your Hostel Management AI Assistant. I can look up student records, "
                "room allocations, attendance statistics, notices, staff members, and leave applications."
            ),
            "source": "conversational-fallback",
        }

    if any(token in q for token in ["by department", "by dept", "per department"]):
        data = mcp_server.aggregate_documents(
            "users",
            pipeline=[{"$group": {"_id": "$department", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}],
        )
        docs = data.get("documents", [])
        summary = ", ".join(f"{item.get('_id') or 'Unspecified'}: {item.get('count')}" for item in docs)
        return {
            "success": True,
            "question": question,
            "answer": f"Students breakdown by department: {summary}.",
            "source": "deterministic-fallback",
            "data": data,
        }

    if any(token in q for token in ["by year", "per year"]):
        data = mcp_server.aggregate_documents(
            "users",
            pipeline=[{"$group": {"_id": "$year", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}],
        )
        docs = data.get("documents", [])
        summary = ", ".join(f"{item.get('_id') or 'Unspecified'}: {item.get('count')}" for item in docs)
        return {
            "success": True,
            "question": question,
            "answer": f"Students breakdown by year: {summary}.",
            "source": "deterministic-fallback",
            "data": data,
        }

    if any(k in q for k in ["stats", "overview", "total students", "summary", "how many students"]):
        data = mcp_server.get_database_stats()
        stats = data.get("stats", {})
        ans = (
            f"Hostel Overview (Asia/Kolkata): {stats.get('total_students')} registered students in {stats.get('total_distinct_rooms')} rooms. "
            f"{stats.get('pending_leave_applications')} pending leave applications, {stats.get('total_notices')} notices, and {stats.get('total_staff')} staff members."
        )
        return {"success": True, "question": question, "answer": ans, "source": "deterministic-fallback", "data": data}

    if "room" in q:
        match = re.search(r"room\s*(?:no\.?|number)?\s*([A-Za-z0-9_-]+)", question, re.IGNORECASE)
        if match:
            room_no = match.group(1)
            data = mcp_server.find_documents("users", filter={"roomNumber": room_no})
            docs = data.get("documents", [])
            if docs:
                names = [f"{d.get('fullName') or d.get('username')} ({d.get('department')}, Yr {d.get('year')})" for d in docs]
                ans = f"Room {room_no} has {len(docs)} occupant(s): " + "; ".join(names) + "."
            else:
                ans = f"No occupants found for Room {room_no}."
            return {"success": True, "question": question, "answer": ans, "source": "deterministic-fallback", "data": data}

    if "absent" in q:
        data = mcp_server.get_daily_attendance(status="Absent")
        docs = data.get("students", [])
        dt = data.get("date", "")
        if docs:
            ans = f"Found {len(docs)} absent student(s) on {dt} (Asia/Kolkata)."
        else:
            ans = f"No absent students recorded for {dt} (Asia/Kolkata)."
        return {"success": True, "question": question, "answer": ans, "source": "deterministic-fallback", "data": data}

    if "attendance" in q:
        data = mcp_server.get_daily_attendance()
        docs = data.get("status_counts", [])
        dt = data.get("date", "")
        if docs:
            breakdown = ", ".join(f"{item.get('_id')}: {item.get('count')}" for item in docs)
            ans = f"Attendance summary for {dt} (Asia/Kolkata): {breakdown}."
        else:
            ans = f"No attendance records found for {dt} (Asia/Kolkata)."
        return {"success": True, "question": question, "answer": ans, "source": "deterministic-fallback", "data": data}

    if "notice" in q:
        data = mcp_server.find_documents("notices", sort={"createdAt": -1}, limit=5)
        docs = data.get("documents", [])
        titles = [f"'{n.get('title')}'" for n in docs]
        ans = f"Recent notices ({len(docs)}): " + ", ".join(titles) if docs else "No notices found."
        return {"success": True, "question": question, "answer": ans, "source": "deterministic-fallback", "data": data}

    if "leave" in q:
        data = mcp_server.find_documents("leaveapplications", sort={"submittedAt": -1}, limit=10)
        docs = data.get("documents", [])
        ans = f"Found {len(docs)} recent leave application(s)."
        return {"success": True, "question": question, "answer": ans, "source": "deterministic-fallback", "data": data}

    if "staff" in q or "warden" in q or "rector" in q:
        data = mcp_server.find_documents("staffs", limit=10)
        docs = data.get("documents", [])
        if docs:
            staff_list = [f"{s.get('name')} ({s.get('position')})" for s in docs]
            ans = f"Hostel Staff ({len(docs)}): " + "; ".join(staff_list) + "."
        else:
            ans = "No staff members found."
        return {"success": True, "question": question, "answer": ans, "source": "deterministic-fallback", "data": data}

    # Universal search fallback
    data = mcp_server.search_database(question, limit=5)
    return {
        "success": True,
        "question": question,
        "answer": f"Searched database for '{question}'.",
        "source": "search-fallback",
        "data": data,
    }


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
            fallback = local_deterministic_fallback(clean_q)
            fallback["groq_error"] = f"LLM error: {exc}"
            remember_interaction(session_id, clean_q, fallback.get("answer") or "")
            return fallback

    fallback = local_deterministic_fallback(clean_q)
    remember_interaction(session_id, clean_q, fallback.get("answer") or "")
    return fallback
