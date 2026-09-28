# Hostel Management System - FastMCP Server & LLM Service

A production-ready, cleanly separated Model Context Protocol (MCP) server and AI Orchestration service for the Government OBC/VJNT Hostel Management System.

---

## 🏛️ Architecture Overview

The system is strictly separated into modular layers:

```
┌────────────────────────────────────────────────────────┐
│               Client Interfaces                        │
│   (MCP Clients: Claude Desktop / Cursor / Antigravity) │
│   (REST Clients: React Admin Frontend / Web UI)        │
└──────────────────┬───────────────────┬─────────────────┘
                   │                   │
                   │ (MCP Protocol)    │ (HTTP /ask)
                   ▼                   ▼
┌─────────────────────────┐    ┌─────────────────────────────────┐
│     Pure MCP Server     │    │       External LLM Service      │
│      (server.py)        │    │        (llm_service.py)         │
│                         │    │                                 │
│  - Pure FastMCP         │◄───┤  1. Query goes to LLM first     │
│  - 19 read-only tools   │    │  2. If conversational -> Reply  │
│  - Safe Mongo Queries   │    │  3. If DB needed -> Select MCP  │
│  - Direct DB Access     │    │     server tool & synthesize    │
└────────────┬────────────┘    └────────────────┬────────────────┘
             │                                  │
             │                                  ▼
             │                         ┌──────────────────┐
             │                         │   FastAPI API    │
             │                         │    (api.py)      │
             │                         └──────────────────┘
             ▼
┌─────────────────────────┐
│   MongoDB Atlas Cloud   │
│   (Hostel Collections)  │
└─────────────────────────┘
```

---

## 📦 Components

### 1. `server.py` (Pure FastMCP Server)
- Standalone MCP server exposing 19 strictly read-only tools using `@mcp.tool()` decorators (mcp SDK 2.x `MCPServer`).
- Zero LLM dependencies or prompts embedded inside.
- Implements safe MongoDB reading, aggregation pipelines, projections, and sensitive field redaction.
- Operator/stage whitelists: no writes, no `$where`/`$function`/`$out`/`$merge`, `$lookup` only between whitelisted collections.
- Passwords, emails, phones, Aadhaar/bank data and file URLs can never be returned, filtered, grouped or sorted on.
- Tolerates messy user-entered data: string equality on free-text fields is case/whitespace-insensitive,
  `"14"` and `14` both match, and ISO date strings work against datetime fields.
- Run for MCP Clients: `python server.py`

### 2. `llm_service.py` (External LLM & Tool Orchestrator)
- First receives the user query.
- Queries Groq LLM (default `openai/gpt-oss-120b`, fallbacks `qwen/qwen3.8-27b`, `openai/gpt-oss-20b`; override with `GROQ_MODEL` / `GROQ_FALLBACK_MODELS` in `.env`).
- Tool schemas are generated from the MCP server itself; only tools relevant to the question are sent, to stay within Groq free-tier token limits.
- Evaluates if the LLM can answer directly or must invoke specific MCP server tools.
- Executes selected MCP tool(s) via `server.execute_tool(...)`, receives factual data, and produces a factual, synthesized answer.
- Seamless fallback to deterministic local logic if the LLM is offline.

### 3. `api.py` (FastAPI REST Server)
- Exposes `/ask`, `/collections`, `/tools` and `/health` endpoints.
- Bridges external web applications to the `llm_service` and `server`.
- Run: `python api.py`

---

## 🛠️ Registered MCP Tools (all read-only)

| Category | Tool | Description |
| :--- | :--- | :--- |
| **Overview** | `get_database_stats` | Dashboard: students, rooms, latest attendance, leaves, complaints, staff, breakdowns. |
| | `get_recent_activity` | New students, notices, complaints, leaves, messages in the last N days. |
| **Students & Rooms** | `find_students` | Fuzzy multi-filter search (name, department, year, room, district, college, caste category, missing fields...). |
| | `get_student_profile` | 360° view of one student: profile, roommates, attendance, leaves, complaints, documents. |
| | `get_room_details` | Occupants of a room with latest attendance, or occupancy of all rooms. |
| **Attendance** | `get_daily_attendance` | One day ('today', 'yesterday', DD/MM/YYYY...): counts, %, absent list, student/room status. |
| | `get_attendance_report` | Date range: per-student %, daily trend, defaulters (`below_percent`), perfect attendance (`min_percent`). |
| **Leaves / Complaints** | `get_leave_applications` | Filter by status, student, dates; who is on leave on a date; not-returned. |
| | `get_complaints` | Filter by status/category/priority/room/student; breakdowns and avg resolution time. |
| **Documents** | `get_document_status` | Which certificates each student uploaded (never URLs); missing documents. |
| **Community** | `get_community_messages` | Chat messages with sender names, reactions, moderation report summary. |
| **Generic** | `find_documents` | Filter/projection/sort/pagination on any collection (returns `total_matched`). |
| | `count_documents` | Count with any filter. |
| | `aggregate_documents` | Read-only pipelines incl. `$lookup`, `$facet`, `$bucket`, `$addFields`, date/string expressions. |
| | `group_and_count` | Counts per field value, merging spelling variants ('CSE' / 'cse '). |
| | `get_distinct_values` | Real values of a field with counts (to discover spellings). |
| | `search_database` | Keyword search across students, staff, notices, complaints, leaves, messages, uploads. |
| | `describe_schema` / `list_collections` | Fields, types, enum values and counts. |

Run `python test_suite.py` (or `python test_suite.py --no-llm`) to verify tools, security rules and the LLM pipeline.

--- | :--- | :--- |
| **System** | `list_collections` | List allowed MongoDB collections and document counts. |
| | `describe_schema` | Describe queryable schema and fields for collections. |
| | `get_database_stats` | High-level overview (total students, rooms, notices, leaves, staff). |
| **Students & Rooms** | `get_student` | Lookup student profile by username, roll number, or name. |
| | `search_students` | Multi-field search (department, year, room, block, district, course). |
| | `get_room_occupants` | Occupancy details and student list for a specific room. |
| | `aggregate_students_by` | Aggregate student counts grouped by `department`, `year`, `hostelBlock`, `district`, `course`. |
| **Attendance** | `get_attendance_by_date` | Daily attendance document for a date (YYYY-MM-DD). |
| | `get_absent_students` | List absent students for a specific date. |
| | `get_attendance_status_counts` | Summary counts of present vs absent students. |
| | `get_student_attendance_history` | Historical attendance log and rate for a student. |
| **Leaves** | `get_leave_applications` | Filtered leave applications (Pending, Approved, Rejected). |
| | `get_students_on_leave` | Students on approved leave covering a target date. |
| | `aggregate_leaves_by_status` | Status count breakdown of leave applications. |
| **Notices & Staff** | `get_recent_notices` | Recent notice board posts with severity filter. |
| | `get_staff_list` | Hostel staff and wardens list. |
| | `get_upload_requests` | Document submission requests and student progress. |
| **Community** | `get_community_channels` | Active community channels. |
| | `get_community_messages` | Recent non-deleted chat messages. |
| | `get_message_reports` | Moderation reports for messages. |
| **Generic DB** | `find_documents` | Safe filtering and projection on any collection. |
| | `count_documents` | Count matching documents in any collection. |
| | `aggregate_documents` | Execute safe aggregation pipeline stages. |
| | `search_database` | Multi-collection global text search. |

---

## 🚀 Running the Server

### Standard MCP Client (Claude Desktop / Cursor / Antigravity)
Add this to your MCP config:
```json
{
  "mcpServers": {
    "hostel-management": {
      "command": "d:\\React Develeoment\\hostel_management_system\\mcp_server\\venv\\Scripts\\python.exe",
      "args": [
        "d:\\React Develeoment\\hostel_management_system\\mcp_server\\server.py"
      ],
      "env": {
        "MDB_MCP_CONNECTION_STRING": "your_mongo_connection_string",
        "DATABASE_NAME": "test"
      }
    }
  }
}
```

### FastAPI REST Server
```bash
cd mcp_server
.\venv\Scripts\python.exe -m uvicorn api:app --reload
```
