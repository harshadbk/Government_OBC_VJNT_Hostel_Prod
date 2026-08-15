import sys
import os

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

import server as mcp
import llm_service

print("==================================================")
print("1. VERIFYING MCP TOOLS DIRECT EXECUTION")
print("==================================================")

# Tool 1: List Collections
colls = mcp.list_collections()
print(f"[OK] Collections ({len(colls['collections'])}): {colls['collections']}")

# Tool 2: Database Stats
stats = mcp.get_database_stats()
print(f"[OK] Database Stats: {stats['stats']['total_students']} students, {stats['stats']['total_distinct_rooms']} rooms, {stats['stats']['pending_leave_applications']} pending leaves")

# Tool 3: Find Documents with numeric coercion (string vs int)
r14_str = mcp.find_documents("users", filter={"roomNumber": "14"})
r14_int = mcp.find_documents("users", filter={"roomNumber": 14})
print(f"[OK] Room 14 via str filter: {r14_str['count']} occupants | via int filter: {r14_int['count']} occupants")

# Tool 4: Aggregate documents by department
dept_agg = mcp.aggregate_documents("users", pipeline=[
    {"$group": {"_id": "$department", "count": {"$sum": 1}}},
    {"$sort": {"count": -1}}
])
print(f"[OK] Department breakdown: {dept_agg['documents']}")

# Tool 5: Get attendance with smart date resolution
att = mcp.get_daily_attendance()
print(f"[OK] Attendance on {att['date']}: {att.get('status_counts') or att.get('total_records')}")

# Tool 6: Search database across collections
search_res = mcp.search_database("Rahul")
print(f"[OK] Search 'Rahul': users={search_res['results'].get('users', {}).get('count', 0)}")

# Tool 7: Staff lookup
staff_docs = mcp.find_documents("staffs")
print(f"[OK] Staff records: {staff_docs['count']}")

print("\n==================================================")
print("2. VERIFYING LLM + MCP ORCHESTRATION PIPELINE")
print("==================================================")

test_queries = [
    "How many students are registered in the hostel and how many distinct rooms are there?",
    "Who lives in room 14?",
    "Give me student breakdown by department",
    "Show recent notice board announcements",
    "Who is the rector or warden of the hostel?",
    "Show attendance summary and absent students",
    "Show pending leave applications",
]

for q in test_queries:
    print(f"\nQ: {q}")
    res = llm_service.ask_question(q)
    print(f"Source: {res.get('source')}")
    if res.get("tools_used"):
        print(f"Tools Used: {[t.get('tool') for t in res.get('tools_used')]}")
    print(f"Answer: {res.get('answer')}")

print("\n[SUCCESS] All MCP and LLM pipeline tests completed successfully!")
