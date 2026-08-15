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
│  - 24 @mcp.tool()       │    │  2. If conversational -> Reply  │
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
- Standalone MCP server exposing 24 tools using official `@mcp.tool()` decorators.
- Zero LLM dependencies or prompts embedded inside.
- Implements safe MongoDB reading, aggregation pipelines, projections, and sensitive field redaction.
- Run for MCP Clients: `python server.py`

### 2. `llm_service.py` (External LLM & Tool Orchestrator)
- First receives the user query.
- Queries Groq LLM with context and schemas of all MCP server tools.
- Evaluates if the LLM can answer directly or must invoke specific MCP server tools.
- Executes selected MCP tool(s) via `server.execute_tool(...)`, receives factual data, and produces a factual, synthesized answer.
- Seamless fallback to deterministic local logic if the LLM is offline.

### 3. `api.py` (FastAPI REST Server)
- Exposes `/ask`, `/collections`, and `/health` endpoints.
- Bridges external web applications to the `llm_service` and `server`.
- Run: `python api.py`

---

## 🛠️ Registered FastMCP Tools (`@mcp.tool()`)

| Category | Tool Name | Description |
| :--- | :--- | :--- |
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
python api.py
```
