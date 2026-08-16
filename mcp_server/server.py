import json
import os
import re
from datetime import date, datetime, timedelta, timezone
from typing import Any

from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient

try:
    from mcp.server.fastmcp import FastMCP
except ImportError:
    from mcp.server import MCPServer as FastMCP

load_dotenv()

MONGO_URI = os.getenv("MDB_MCP_CONNECTION_STRING")
DATABASE_NAME = os.getenv("DATABASE_NAME", "test")
DEFAULT_LIMIT = 20
MAX_LIMIT = 50

# Asia/Kolkata timezone (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30), name="Asia/Kolkata")

if not MONGO_URI:
    raise RuntimeError("MDB_MCP_CONNECTION_STRING is missing in environment variables")

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
db = client[DATABASE_NAME]

# Initialize FastMCP Server
mcp = FastMCP("Hostel MCP Server")

# Whitelist of allowed collections and readable fields
COLLECTIONS: dict[str, dict[str, Any]] = {
    "admins": {
        "description": "Admin accounts and login status.",
        "fields": ["username", "role", "status", "isActive", "lastLoginAt", "createdAt", "updatedAt"],
    },
    "attendances": {
        "description": "Daily attendance records. Each document contains date (YYYY-MM-DD) and students array.",
        "fields": ["date", "students.username", "students.roomNumber", "students.status", "markedBy", "firstSavedAt", "createdAt", "updatedAt"],
    },
    "channels": {
        "description": "Community channel definitions.",
        "fields": ["name", "description", "type", "isActive", "isDefault", "createdBy", "createdAt", "updatedAt"],
    },
    "documents": {
        "description": "Student document upload status. Sensitive URLs are automatically redacted.",
        "fields": ["userId", "createdAt", "updatedAt"],
    },
    "leaveapplications": {
        "description": "Student leave applications and status (Pending, Approved, Rejected).",
        "fields": [
            "userId", "username", "fullName", "reason", "startDate", "endDate", "status",
            "comebackMarked", "comebackDate", "comebackMarkedAt", "comebackReminderSent",
            "notificationCount", "adminNote", "submittedAt", "createdAt", "updatedAt",
        ],
    },
    "messagereports": {
        "description": "Community message moderation reports.",
        "fields": ["messageId", "reportedBy", "reason", "description", "status", "reviewedBy", "reviewedAt", "createdAt", "updatedAt"],
    },
    "messages": {
        "description": "Community chat messages.",
        "fields": [
            "channel", "channelId", "senderId", "senderModel", "content", "replyTo",
            "isEdited", "isDeleted", "deletedAt", "deletedByRole", "reactions.emoji",
            "createdAt", "updatedAt",
        ],
    },
    "notices": {
        "description": "Hostel notice board announcements.",
        "fields": ["title", "content", "severity", "createdAt", "updatedAt"],
    },
    "staffs": {
        "description": "Hostel staff and warden records.",
        "fields": ["name", "position", "createdAt", "updatedAt"],
    },
    "uploads": {
        "description": "Document upload requests and student submissions.",
        "fields": ["title", "description", "dueDate", "requestedBy", "submissions.userId", "submissions.username", "submissions.uploadedAt", "createdAt"],
    },
    "users": {
        "description": "Student profiles (all documents in this collection are hostel students). Fields include username, rollNumber, department, year, hostelBlock, roomNumber, fullName, village, taluka, district, course, classYear, college_name, stream, admissionDate.",
        "fields": [
            "username", "rollNumber", "department", "year", "hostelBlock", "roomNumber",
            "fullName", "village", "taluka", "district", "course", "classYear",
            "commonEntranceExam", "college_name", "stream", "admissionDate", "createdAt", "updatedAt",
        ],
    },
}

COLLECTION_ALIASES: dict[str, str] = {
    "admin": "admins",
    "attendance": "attendances",
    "channel": "channels",
    "document": "documents",
    "leave": "leaveapplications",
    "leaves": "leaveapplications",
    "leaveapplication": "leaveapplications",
    "leave_applications": "leaveapplications",
    "leave_application": "leaveapplications",
    "message": "messages",
    "report": "messagereports",
    "reports": "messagereports",
    "message_report": "messagereports",
    "messagereport": "messagereports",
    "notice": "notices",
    "staff": "staffs",
    "upload": "uploads",
    "student": "users",
    "students": "users",
    "user": "users",
}

SENSITIVE_FIELD_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in [
        "password", "token", "secret", "api.*key", "email", "phone", "mobile",
        "aadhaar", "aadhar", "bank", "account", "ifsc", "address", "url$",
        "fileUrl", "attachmentUrl", "imageUrl", "photoUrl", "publicId",
        "aadharCardUrl", "casteCertificateUrl", "incomeCertificateUrl",
        "domicileCertificateUrl", "collegeAdmissionReceiptUrl",
        "bonafideCertificateUrl", "casteValidityCertificateUrl",
        "previousYearMarksheetUrl",
    ]
]

# Strict whitelists of safe operators (prevents arbitrary destructive or unsafe MongoDB operators)
ALLOWED_QUERY_OPERATORS = {
    "$eq", "$ne", "$gt", "$gte", "$lt", "$lte", "$in", "$nin", "$regex",
    "$options", "$and", "$or", "$nor", "$exists", "$elemMatch", "$size",
}
ALLOWED_PIPELINE_STAGES = {"$match", "$project", "$sort", "$limit", "$group", "$unwind", "$count"}
ALLOWED_GROUP_OPERATORS = {"$sum", "$avg", "$min", "$max", "$first", "$last", "$push", "$addToSet"}


def get_current_ist_date() -> str:
    """Return the current date in Asia/Kolkata (IST) timezone formatted as YYYY-MM-DD."""
    return datetime.now(IST).strftime("%Y-%m-%d")


def resolve_collection_name(name: str) -> str:
    """Normalize and validate target collection name."""
    normalized = str(name or "").strip().lower()
    resolved = COLLECTION_ALIASES.get(normalized, normalized)
    if resolved not in COLLECTIONS:
        allowed = ", ".join(sorted(COLLECTIONS.keys()))
        raise ValueError(f"Collection '{name}' is not permitted. Allowed collections: {allowed}")
    return resolved


def is_sensitive_field(field_name: str) -> bool:
    """Check if field matches any sensitive pattern (passwords, tokens, bank info)."""
    return any(pattern.search(str(field_name)) for pattern in SENSITIVE_FIELD_PATTERNS)


def build_safe_projection(collection: str, requested_projection: dict[str, Any] | None = None) -> dict[str, int]:
    """Build a secure projection dictionary enforcing redaction of sensitive fields."""
    base = {
        "password": 0, "email": 0, "phone": 0, "mobileNumber": 0, "fathersMobileNumber": 0,
        "aadhaarNumber": 0, "aadharNumber": 0, "aadhaarBankName": 0, "aadharBankName": 0,
        "BankName": 0, "bankBranch": 0, "accountNumber": 0, "ifscCode": 0, "address": 0,
        "photoUrl": 0, "imageUrl": 0, "fileUrl": 0, "attachmentUrl": 0, "publicId": 0,
        "aadharCardUrl": 0, "casteCertificateUrl": 0, "incomeCertificateUrl": 0,
        "domicileCertificateUrl": 0, "collegeAdmissionReceiptUrl": 0,
        "bonafideCertificateUrl": 0, "casteValidityCertificateUrl": 0,
        "previousYearMarksheetUrl": 0,
    }

    # Redact sensitive schema fields
    for field in COLLECTIONS[collection]["fields"]:
        root = field.split(".")[0]
        if is_sensitive_field(root):
            base[root] = 0

    if not requested_projection:
        return base

    inclusions = {str(k): v for k, v in requested_projection.items() if str(k) != "_id" and bool(v)}
    if inclusions:
        safe_inc: dict[str, int] = {}
        for field in inclusions:
            if not is_sensitive_field(field):
                safe_inc[field] = 1
        safe_inc["_id"] = 1 if requested_projection.get("_id") else 0
        return safe_inc

    for k, v in requested_projection.items():
        if not bool(v):
            base[str(k)] = 0
    if "_id" in requested_projection:
        base["_id"] = 1 if requested_projection["_id"] else 0

    return base


def serialize(value: Any) -> Any:
    """Recursively convert MongoDB types (ObjectId, datetime) to JSON serializable structures."""
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, list):
        return [serialize(item) for item in value]
    if isinstance(value, dict):
        return {str(k): serialize(v) for k, v in value.items()}
    return value


def redact_sensitive_values(value: Any) -> Any:
    """Mask any sensitive keys that might appear in raw documents."""
    if isinstance(value, list):
        return [redact_sensitive_values(item) for item in value]
    if not isinstance(value, dict):
        return serialize(value)

    cleaned: dict[str, Any] = {}
    for k, v in value.items():
        if is_sensitive_field(k):
            cleaned[k] = "[REDACTED]"
        else:
            cleaned[k] = redact_sensitive_values(v)
    return cleaned


def coerce_object_ids(value: Any) -> Any:
    """Convert valid 24-character hexadecimal ID strings into MongoDB ObjectIds."""
    if isinstance(value, list):
        return [coerce_object_ids(item) for item in value]
    if not isinstance(value, dict):
        return value

    coerced: dict[str, Any] = {}
    for k, v in value.items():
        if isinstance(v, str) and ObjectId.is_valid(v) and (k == "_id" or k.endswith("Id") or k.endswith("_id")):
            coerced[k] = ObjectId(v)
        else:
            coerced[k] = coerce_object_ids(v)
    return coerced


def validate_query_filter(value: Any, context: str = "filter", allowed_operators: set[str] | None = None) -> None:
    """Validate query operators to block unauthorized MongoDB expressions or destructive operations."""
    allowed = allowed_operators or ALLOWED_QUERY_OPERATORS
    if isinstance(value, list):
        for item in value:
            validate_query_filter(item, context, allowed)
        return

    if isinstance(value, str) and value.startswith("$") and is_sensitive_field(value[1:]):
        raise ValueError(f"Query references sensitive field '{value[1:]}' in {context}")

    if not isinstance(value, dict):
        return

    for key, val in value.items():
        if key.startswith("$"):
            if key not in allowed:
                raise ValueError(f"Operator '{key}' is forbidden in {context}")
        else:
            if is_sensitive_field(key):
                raise ValueError(f"Filtering on sensitive field '{key}' is forbidden")
        validate_query_filter(val, context, allowed)


def clamp_limit(limit: int | None, default_val: int = DEFAULT_LIMIT) -> int:
    """Enforce safe limits on document result sets."""
    return min(max(int(limit or default_val), 1), MAX_LIMIT)


# ============================================================================
# GENERAL-PURPOSE MCP TOOLS (REGISTERED WITH @mcp.tool())
# ============================================================================

@mcp.tool()
def list_collections() -> dict[str, Any]:
    """List all allowed hostel MongoDB collections, descriptions, and estimated document counts."""
    return {
        "success": True,
        "database": DATABASE_NAME,
        "collections": [
            {
                "name": name,
                "description": meta["description"],
                "count": db[name].estimated_document_count(),
            }
            for name, meta in COLLECTIONS.items()
        ],
    }


@mcp.tool()
def describe_schema(collection_name: str | None = None) -> dict[str, Any]:
    """Describe queryable schema, allowed fields, and descriptions for hostel collections.
    
    Args:
        collection_name: Optional specific collection to describe (e.g. 'users', 'attendances', 'leaveapplications').
    """
    if collection_name:
        resolved = resolve_collection_name(collection_name)
        return {
            "success": True,
            "database": DATABASE_NAME,
            "collection": resolved,
            "schema": {resolved: COLLECTIONS[resolved]},
        }
    return {
        "success": True,
        "database": DATABASE_NAME,
        "schema": COLLECTIONS,
    }


NUMERIC_STRING_FIELDS = {"roomNumber", "year", "rollNumber", "classYear", "students.roomNumber"}


def normalize_filter_types(query_filter: Any) -> Any:
    """Ensure filters for numeric string/int fields match either string or integer in MongoDB. and also some attendance related filters as well"""
    if not isinstance(query_filter, dict):
        return query_filter

    normalized: dict[str, Any] = {}
    for k, v in query_filter.items():
        if k in NUMERIC_STRING_FIELDS and not isinstance(v, dict):
            str_v = str(v).strip()
            if str_v.isdigit():
                normalized[k] = {"$in": [str_v, int(str_v)]}
            else:
                normalized[k] = v
        elif isinstance(v, dict):
            normalized[k] = normalize_filter_types(v)
        elif isinstance(v, list):
            normalized[k] = [normalize_filter_types(item) if isinstance(item, dict) else item for item in v]
        else:
            normalized[k] = v
    return normalized


@mcp.tool()
def find_documents(
    collection: str,
    filter: dict[str, Any] | None = None,
    projection: dict[str, Any] | None = None,
    sort: dict[str, int] | None = None,
    limit: int = 20,
) -> dict[str, Any]:
    """Query documents from an allowed collection with safe filtering, projection, sorting, and pagination.
    
    Args:
        collection: Target collection name (e.g. 'users', 'attendances', 'notices', 'leaveapplications', 'staffs').
        filter: Safe MongoDB filter query (e.g. {"roomNumber": "14"}, {"department": "AIML"}, {"status": "Pending"}, {"district": {"$regex": "Pune", "$options": "i"}}).
        projection: Optional projection dictionary to include/exclude specific fields (e.g. {"fullName": 1, "roomNumber": 1}).
        sort: Optional sort order (e.g. {"createdAt": -1}, {"roomNumber": 1}).
        limit: Number of documents to return (max 50).
    """
    resolved = resolve_collection_name(collection)
    raw_filter = coerce_object_ids(filter or {})
    validate_query_filter(raw_filter, "filter")
    filter_doc = normalize_filter_types(raw_filter)

    if sort:
        validate_query_filter(sort, "sort")

    cursor = db[resolved].find(
        filter_doc,
        projection=build_safe_projection(resolved, projection),
    )
    if sort:
        cursor = cursor.sort(list(sort.items()))

    docs = list(cursor.limit(clamp_limit(limit)))
    return {
        "success": True,
        "database": DATABASE_NAME,
        "collection": resolved,
        "count": len(docs),
        "documents": redact_sensitive_values(docs),
    }


@mcp.tool()
def count_documents(
    collection: str,
    filter: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Count documents matching an optional filter in any allowed collection.
    
    Args:
        collection: Target collection name (e.g. 'users', 'notices', 'leaveapplications').
        filter: Optional query filter (e.g. {"status": "Pending"}, {"year": "3"}).
    """
    resolved = resolve_collection_name(collection)
    raw_filter = coerce_object_ids(filter or {})
    validate_query_filter(raw_filter, "filter")
    filter_doc = normalize_filter_types(raw_filter)

    return {
        "success": True,
        "database": DATABASE_NAME,
        "collection": resolved,
        "count": db[resolved].count_documents(filter_doc),
    }


@mcp.tool()
def aggregate_documents(
    collection: str,
    pipeline: list[dict[str, Any]],
    limit: int = 50,
) -> dict[str, Any]:
    """Run a safe read-only aggregation pipeline ($match, $project, $sort, $limit, $group, $unwind, $count).
    
    Args:
        collection: Target collection name (e.g. 'users', 'attendances', 'leaveapplications').
        pipeline: List of valid aggregation stages (e.g. [{"$group": {"_id": "$department", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]).
        limit: Maximum results to return (max 50).
    """
    resolved = resolve_collection_name(collection)
    if not isinstance(pipeline, list):
        raise ValueError("Pipeline must be a list of aggregation stage dictionaries.")

    safe_pipeline: list[dict[str, Any]] = []
    for stage in pipeline:
        if not isinstance(stage, dict) or len(stage) != 1:
            raise ValueError("Each aggregate stage must contain exactly one operator (e.g. {'$match': ...}).")

        op_name = next(iter(stage))
        if op_name not in ALLOWED_PIPELINE_STAGES:
            raise ValueError(f"Aggregation stage '{op_name}' is not allowed.")

        stage_payload = stage[op_name]
        if op_name == "$project":
            safe_stage = {"$project": build_safe_projection(resolved, stage_payload)}
        elif op_name == "$limit":
            safe_stage = {"$limit": clamp_limit(stage_payload)}
        elif op_name == "$match":
            validate_query_filter(stage_payload, f"aggregation stage {op_name}")
            safe_stage = {"$match": normalize_filter_types(coerce_object_ids(stage_payload))}
        else:
            allowed_ops = ALLOWED_QUERY_OPERATORS | ALLOWED_GROUP_OPERATORS if op_name == "$group" else ALLOWED_QUERY_OPERATORS
            validate_query_filter(stage_payload, f"aggregation stage {op_name}", allowed_ops)
            safe_stage = {op_name: coerce_object_ids(stage_payload)}
        safe_pipeline.append(safe_stage)

    if not any("$limit" in stage for stage in safe_pipeline):
        safe_pipeline.append({"$limit": clamp_limit(limit)})

    rows = list(db[resolved].aggregate(safe_pipeline, maxTimeMS=10000))
    return {
        "success": True,
        "database": DATABASE_NAME,
        "collection": resolved,
        "count": len(rows),
        "documents": redact_sensitive_values(rows),
    }


@mcp.tool()
def search_database(
    query: str,
    collections: list[str] | None = None,
    limit: int = 15,
) -> dict[str, Any]:
    """Perform a global multi-collection keyword search across students, notices, staff, and leaves.
    
    Args:
        query: Search term (e.g. student name, room number, department, notice keyword, district, taluka).
        collections: Optional list of specific collections to search. Defaults to ['users', 'notices', 'staffs', 'leaveapplications'].
        limit: Maximum matching documents per collection.
    """
    clean_q = str(query or "").strip()
    if not clean_q:
        raise ValueError("Search query cannot be empty.")

    regex = {"$regex": re.escape(clean_q), "$options": "i"}
    targets = collections or ["users", "notices", "staffs", "leaveapplications"]
    results: dict[str, Any] = {}

    for coll in targets:
        try:
            resolved = resolve_collection_name(coll)
            search_filter: dict[str, Any] = {}
            if resolved == "users":
                search_filter = {"$or": [
                    {"fullName": regex},
                    {"username": regex},
                    {"rollNumber": regex},
                    {"department": regex},
                    {"roomNumber": {"$in": [clean_q, int(clean_q)] if clean_q.isdigit() else [clean_q]}},
                    {"hostelBlock": regex},
                    {"district": regex},
                    {"taluka": regex},
                    {"village": regex},
                    {"course": regex},
                    {"stream": regex},
                    {"college_name": regex},
                ]}
            elif resolved == "notices":
                search_filter = {"$or": [{"title": regex}, {"content": regex}, {"severity": regex}]}
            elif resolved == "staffs":
                search_filter = {"$or": [{"name": regex}, {"position": regex}]}
            elif resolved == "leaveapplications":
                search_filter = {"$or": [{"fullName": regex}, {"username": regex}, {"reason": regex}, {"status": regex}]}
            else:
                continue

            found = find_documents(resolved, filter=search_filter, limit=limit)
            results[resolved] = {
                "count": found["count"],
                "documents": found["documents"],
            }
        except Exception as err:
            results[coll] = {"error": str(err)}

    return {
        "success": True,
        "query": clean_q,
        "results": results,
    }


@mcp.tool()
def get_daily_attendance(
    attendance_date: str | None = None,
    status: str | None = None,
    student_username: str | None = None,
) -> dict[str, Any]:
    """Query daily hostel attendance using Asia/Kolkata timezone with status breakdown, student list, or student-specific history.
    
    Args:
        attendance_date: Optional date in YYYY-MM-DD format (or 'latest'). Defaults to current date, or latest available date if today has no records.
        status: Optional status filter ('Present', 'Absent', 'Leave'). If omitted, returns summary counts for all statuses.
        student_username: Optional student username to check attendance for.
    """
    recent_dates = [doc["date"] for doc in db["attendances"].find({}, {"date": 1, "_id": 0}).sort("date", -1).limit(7)]
    
    if not attendance_date or attendance_date.strip().lower() == "latest":
        today = get_current_ist_date()
        today_exists = db["attendances"].find_one({"date": today})
        target_date = today if today_exists else (recent_dates[0] if recent_dates else today)
    else:
        target_date = str(attendance_date).strip()

    pipeline: list[dict[str, Any]] = [
        {"$match": {"date": target_date}},
        {"$unwind": "$students"},
    ]

    if student_username:
        clean_user = student_username.strip()
        pipeline.append({"$match": {"students.username": {"$regex": f"^{re.escape(clean_user)}$", "$options": "i"}}})

    if status:
        stat_clean = status.capitalize()
        pipeline.append({"$match": {"students.status": stat_clean}})
        pipeline.append({"$project": {
            "_id": 0,
            "date": 1,
            "username": "$students.username",
            "roomNumber": "$students.roomNumber",
            "status": "$students.status",
        }})
        docs = list(db["attendances"].aggregate(pipeline))
        return {
            "success": True,
            "timezone": "Asia/Kolkata",
            "date": target_date,
            "filter_status": stat_clean,
            "count": len(docs),
            "students": docs,
            "available_dates": recent_dates,
        }

    if student_username:
        pipeline.append({"$project": {
            "_id": 0,
            "date": 1,
            "username": "$students.username",
            "roomNumber": "$students.roomNumber",
            "status": "$students.status",
        }})
        docs = list(db["attendances"].aggregate(pipeline))
        return {
            "success": True,
            "timezone": "Asia/Kolkata",
            "date": target_date,
            "student": student_username,
            "records": docs,
            "available_dates": recent_dates,
        }

    # Summary breakdown when no status filter is provided
    pipeline.extend([
        {"$group": {"_id": "$students.status", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ])
    summary_docs = list(db["attendances"].aggregate(pipeline))
    return {
        "success": True,
        "timezone": "Asia/Kolkata",
        "date": target_date,
        "total_records": sum(item.get("count", 0) for item in summary_docs),
        "status_counts": summary_docs,
        "available_dates": recent_dates,
    }


@mcp.tool()
def get_database_stats() -> dict[str, Any]:
    """Get high-level aggregated statistics of the hostel database (total students, rooms, notices, leaves, staff)."""
    student_count = db["users"].count_documents({})
    distinct_rooms = len(db["users"].distinct("roomNumber"))
    notice_count = db["notices"].count_documents({})
    pending_leaves = db["leaveapplications"].count_documents({"status": "Pending"})
    approved_leaves = db["leaveapplications"].count_documents({"status": "Approved"})
    staff_count = db["staffs"].count_documents({})

    dept_breakdown = list(db["users"].aggregate([
        {"$group": {"_id": "$department", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]))

    year_breakdown = list(db["users"].aggregate([
        {"$group": {"_id": "$year", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]))

    return {
        "success": True,
        "timezone": "Asia/Kolkata",
        "current_date": get_current_ist_date(),
        "stats": {
            "total_students": student_count,
            "total_distinct_rooms": distinct_rooms,
            "total_notices": notice_count,
            "pending_leave_applications": pending_leaves,
            "approved_leave_applications": approved_leaves,
            "total_staff": staff_count,
            "students_by_department": dept_breakdown,
            "students_by_year": year_breakdown,
        },
    }


# Tool lookup map for external invocation (e.g. by LLM service)
TOOLS_MAP = {
    "list_collections": list_collections,
    "describe_schema": describe_schema,
    "find_documents": find_documents,
    "count_documents": count_documents,
    "aggregate_documents": aggregate_documents,
    "search_database": search_database,
    "get_daily_attendance": get_daily_attendance,
    "get_database_stats": get_database_stats,
}


def execute_tool(tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    """Execute a registered FastMCP tool by name with arguments."""
    if tool_name not in TOOLS_MAP:
        raise ValueError(f"Tool '{tool_name}' not found in MCP Server tool registry.")
    func = TOOLS_MAP[tool_name]
    return func(**arguments)


# Backward compatibility helper for API endpoints
def get_collections_summary() -> dict[str, Any]:
    return list_collections()


def run() -> None:
    """Run FastMCP server over standard input/output (stdio)."""
    mcp.run(transport="stdio")


if __name__ == "__main__":
    mcp.run(transport="stdio")
