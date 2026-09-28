"""Smoke tests for the MCP tools and the LLM pipeline. Run: python test_suite.py [--no-llm]"""

import json
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

import llm_service
import server as mcp

passed = failed = 0


def check(name, fn, expect_error=False, assert_fn=None):
    global passed, failed
    try:
        result = fn()
        json.dumps(result)
        if expect_error:
            raise AssertionError("expected the call to be rejected")
        if assert_fn and not assert_fn(result):
            raise AssertionError(f"unexpected result: {json.dumps(result)[:300]}")
        print(f"[OK]   {name}")
        passed += 1
    except Exception as exc:
        if expect_error and not isinstance(exc, AssertionError):
            print(f"[OK]   {name} (blocked: {exc})")
            passed += 1
        else:
            print(f"[FAIL] {name}: {exc}")
            failed += 1


print("=" * 60)
print("1. MCP TOOLS")
print("=" * 60)
check("list_collections", mcp.list_collections, assert_fn=lambda r: len(r["collections"]) == len(mcp.COLLECTIONS))
check("describe_schema", lambda: mcp.describe_schema("users"))
check("get_database_stats", mcp.get_database_stats, assert_fn=lambda r: r["stats"]["total_students"] >= 0)
check("get_distinct_values", lambda: mcp.get_distinct_values("users", "department"))
check("find_documents str/int room", lambda: mcp.find_documents("users", {"roomNumber": 14}),
      assert_fn=lambda r: r["total_matched"] == mcp.find_documents("users", {"roomNumber": "14"})["total_matched"])
check("find_documents case-insensitive", lambda: mcp.find_documents("users", {"department": "cse"}))
check("count_documents date string", lambda: mcp.count_documents("users", {"createdAt": {"$gte": "2020-01-01"}}))
check("aggregate_documents", lambda: mcp.aggregate_documents("users", [{"$group": {"_id": "$department", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]))
check("group_and_count", lambda: mcp.group_and_count("users", "district"))
check("search_database", lambda: mcp.search_database("sangli"))
check("find_students", lambda: mcp.find_students(department="nursing"))
check("get_student_profile", lambda: mcp.get_student_profile("viraj_thakare"))
check("get_room_details", lambda: mcp.get_room_details("14"))
check("get_room_details all", mcp.get_room_details)
check("get_daily_attendance", mcp.get_daily_attendance)
check("get_attendance_report", lambda: mcp.get_attendance_report(below_percent=75))
check("get_leave_applications", lambda: mcp.get_leave_applications(on_leave_date="today"))
check("get_complaints", mcp.get_complaints)
check("get_document_status", lambda: mcp.get_document_status(only_incomplete=True))
check("get_community_messages", mcp.get_community_messages)
check("get_recent_activity", lambda: mcp.get_recent_activity(7))

print("\n" + "=" * 60)
print("2. SECURITY (all must be blocked or redacted)")
print("=" * 60)
check("filter on password", lambda: mcp.find_documents("users", {"password": {"$exists": True}}), expect_error=True)
check("$where", lambda: mcp.find_documents("users", {"$where": "true"}), expect_error=True)
check("$out stage", lambda: mcp.aggregate_documents("users", [{"$out": "hack"}]), expect_error=True)
check("$merge stage", lambda: mcp.aggregate_documents("users", [{"$merge": "hack"}]), expect_error=True)
check("group on email", lambda: mcp.aggregate_documents("users", [{"$group": {"_id": "$email"}}]), expect_error=True)
check("$objectToArray", lambda: mcp.aggregate_documents("users", [{"$project": {"x": {"$objectToArray": "$$ROOT"}}}]), expect_error=True)
check("$lookup non-whitelisted", lambda: mcp.aggregate_documents("users", [{"$lookup": {"from": "sessions", "localField": "a", "foreignField": "b", "as": "x"}}]), expect_error=True)
check("$$ROOT push is redacted", lambda: mcp.aggregate_documents("users", [{"$group": {"_id": None, "all": {"$push": "$$ROOT"}}}]),
      assert_fn=lambda r: not any(k in json.dumps(r) for k in ('"password"', '"email"', '"accountNumber"', '"aadhaarNumber"')))

if "--no-llm" not in sys.argv:
    print("\n" + "=" * 60)
    print("3. LLM + MCP PIPELINE")
    print("=" * 60)
    for q in [
        "How many students are in the hostel and how many rooms are occupied?",
        "Who lives in room 14?",
        "Which students were absent on the latest attendance day?",
        "Which students have attendance below 50% this month?",
        "Give me student breakdown by department",
        "What is the Aadhaar number of viraj?",
    ]:
        res = llm_service.ask_question(q)
        print(f"\nQ: {q}\nSource: {res.get('source')} | Tools: {[t.get('tool') for t in res.get('tools_used') or []]}")
        if res.get("groq_error"):
            print(f"LLM error: {res['groq_error']}")
        print(f"A: {res.get('answer')}")

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
