"""Read-only FastMCP server for the Hostel Management System MongoDB database.

Every tool here is strictly read-only. Sensitive fields (passwords, contact
details, bank/Aadhaar data, file URLs) are never returned or filterable.
"""

import inspect
import json
import os
import re
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated, Any

from bson import ObjectId
from dotenv import load_dotenv
from pydantic import Field
from pymongo import MongoClient

try:
    from mcp.server import MCPServer as FastMCP  # mcp >= 2.0
except ImportError:  # pragma: no cover - older SDKs
    from mcp.server.fastmcp import FastMCP

# Load .env next to this file so the server works regardless of the launching cwd
# (MCP clients such as Claude Desktop start it from their own directory).
load_dotenv(Path(__file__).with_name(".env"))

MONGO_URI = os.getenv("MDB_MCP_CONNECTION_STRING")
DATABASE_NAME = os.getenv("DATABASE_NAME", "test")
DEFAULT_LIMIT = 25
MAX_LIMIT = 200
QUERY_TIMEOUT_MS = 15000

# Asia/Kolkata timezone (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30), name="Asia/Kolkata")

if not MONGO_URI:
    raise RuntimeError("MDB_MCP_CONNECTION_STRING is missing in environment variables")

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000, tz_aware=True, tzinfo=IST)
db = client[DATABASE_NAME]

mcp = FastMCP(
    "Hostel MCP Server",
    instructions=(
        "Read-only access to the hostel management MongoDB database (Asia/Kolkata timezone). "
        "Prefer the domain tools (find_students, get_student_profile, get_room_details, "
        "get_daily_attendance, get_attendance_report, get_leave_applications, get_complaints, "
        "get_document_status, get_community_messages, get_recent_activity, get_database_stats). "
        "Use get_distinct_values to discover the exact spelling of values (data is user-entered "
        "and inconsistent), and find_documents / aggregate_documents for anything else. "
        "String equality filters are matched case- and whitespace-insensitively."
    ),
)

# ============================================================================
# SCHEMA (whitelisted collections and readable fields)
# ============================================================================

COLLECTIONS: dict[str, dict[str, Any]] = {
    "users": {
        "description": "Hostel student profiles (every document is a resident student). Values are free text typed by students, so spellings/case vary.",
        "fields": {
            "username": "string, unique login id (e.g. 'viraj_thakare')",
            "fullName": "string, may be empty",
            "rollNumber": "string",
            "department": "string, free text (e.g. 'CSE', 'cse', 'AIML', 'Nursing', 'Pharmacy')",
            "year": "string, free text (e.g. '3', '4 Years', '5.5 year')",
            "roomNumber": "string ('1'..'17')",
            "college_name": "string, free text",
            "stream": "string, free text (e.g. 'Engineering', 'Medical')",
            "village": "string", "taluka": "string", "district": "string",
            "caste": "string", "casteCategory": "string ('OBC', 'VJNT', 'NT-C', ...)",
            "admissionDate": "datetime or null",
            "createdAt": "datetime (registration time)",
        },
    },
    "attendances": {
        "description": "One document per day. students[] holds each student's status for that date.",
        "fields": {
            "date": "string 'YYYY-MM-DD' (IST)",
            "students": "array of {username, roomNumber, status: 'Present'|'Absent'}",
            "students.username": "string", "students.roomNumber": "string", "students.status": "'Present' | 'Absent'",
            "markedBy": "string", "firstSavedAt": "datetime", "createdAt": "datetime", "updatedAt": "datetime",
        },
    },
    "leaveapplications": {
        "description": "Student leave applications.",
        "fields": {
            "userId": "ObjectId -> users._id", "username": "string", "fullName": "string", "reason": "string",
            "startDate": "string 'YYYY-MM-DD'", "endDate": "string 'YYYY-MM-DD'",
            "status": "'Pending' | 'Approved' | 'Rejected'",
            "comebackMarked": "bool", "comebackDate": "string", "comebackMarkedAt": "datetime",
            "comebackReminderSent": "bool", "notificationCount": "number", "adminNote": "string",
            "submittedAt": "datetime", "createdAt": "datetime", "updatedAt": "datetime",
        },
    },
    "complaints": {
        "description": "Complaint box entries raised by students.",
        "fields": {
            "title": "string", "description": "string",
            "category": "'Room Maintenance' | 'Electrical' | 'Plumbing' | 'Cleanliness & Hygiene' | 'Mess & Food' | 'Wi-Fi & Internet' | 'Security' | 'Other'",
            "priority": "'Low' | 'Medium' | 'High' | 'Urgent'",
            "status": "'Pending' | 'In Progress' | 'Resolved' | 'Rejected'",
            "studentName": "string ('Anonymous Student' when anonymous)", "roomNumber": "string",
            "userId": "ObjectId -> users._id or null", "isAnonymous": "bool",
            "adminResponse.response": "string", "adminResponse.respondedBy": "string", "adminResponse.respondedAt": "datetime",
            "resolvedAt": "datetime", "createdAt": "datetime", "updatedAt": "datetime",
        },
    },
    "notices": {
        "description": "Notice board announcements.",
        "fields": {"title": "string", "content": "string", "severity": "'low' | 'medium' | 'high'", "createdAt": "datetime", "updatedAt": "datetime"},
    },
    "staffs": {
        "description": "Hostel staff (rector, warden, guard, ...).",
        "fields": {"name": "string", "position": "string", "createdAt": "datetime", "updatedAt": "datetime"},
    },
    "admins": {
        "description": "Admin panel accounts.",
        "fields": {
            "username": "string", "role": "'admin' | 'attendance_taker'",
            "status": "'pending_verification' | 'active' | 'disabled'", "isActive": "bool",
            "lastLoginAt": "datetime", "createdAt": "datetime", "updatedAt": "datetime",
        },
    },
    "documents": {
        "description": "Per-student uploaded certificates. URLs are never exposed; use get_document_status for which documents are uploaded.",
        "fields": {"userId": "ObjectId -> users._id", "createdAt": "datetime", "updatedAt": "datetime"},
    },
    "uploads": {
        "description": "Admin document requests and student submissions.",
        "fields": {
            "title": "string", "description": "string", "dueDate": "datetime", "requestedBy": "string",
            "submissions.userId": "string", "submissions.username": "string", "submissions.uploadedAt": "datetime",
            "createdAt": "datetime",
        },
    },
    "messages": {
        "description": "Community chat messages.",
        "fields": {
            "channel": "'announcement' | 'general'", "channelId": "string",
            "senderId": "ObjectId -> users._id or admins._id", "senderModel": "'User' | 'Admin'",
            "content": "string", "replyTo": "ObjectId or null", "isEdited": "bool", "isDeleted": "bool",
            "deletedAt": "datetime", "deletedByRole": "'owner' | 'admin' | null", "reactions.emoji": "string",
            "createdAt": "datetime", "updatedAt": "datetime",
        },
    },
    "messagereports": {
        "description": "Moderation reports on community messages.",
        "fields": {
            "messageId": "ObjectId -> messages._id", "reportedBy": "ObjectId -> users._id",
            "reason": "'Spam' | 'Harassment' | 'Abusive content' | 'Inappropriate content' | 'Misleading information' | 'Other'",
            "description": "string", "status": "'Pending' | 'Reviewed' | 'Dismissed' | 'Action Taken'",
            "reviewedBy": "string", "reviewedAt": "datetime", "createdAt": "datetime", "updatedAt": "datetime",
        },
    },
}

COLLECTION_ALIASES: dict[str, str] = {
    "admin": "admins",
    "attendance": "attendances",
    "complaint": "complaints",
    "complaint_box": "complaints",
    "document": "documents",
    "docs": "documents",
    "leave": "leaveapplications",
    "leaves": "leaveapplications",
    "leaveapplication": "leaveapplications",
    "leave_applications": "leaveapplications",
    "leave_application": "leaveapplications",
    "message": "messages",
    "chat": "messages",
    "report": "messagereports",
    "reports": "messagereports",
    "message_report": "messagereports",
    "message_reports": "messagereports",
    "messagereport": "messagereports",
    "notice": "notices",
    "staff": "staffs",
    "upload": "uploads",
    "student": "users",
    "students": "users",
    "user": "users",
}

DOCUMENT_TYPES = [
    "aadharCardUrl", "casteCertificateUrl", "incomeCertificateUrl", "domicileCertificateUrl",
    "collegeAdmissionReceiptUrl", "bonafideCertificateUrl", "casteValidityCertificateUrl",
    "previousYearMarksheetUrl",
]

SENSITIVE_FIELD_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in [
        "password", "token", "secret", "api.*key", "email", "phone", "mobile",
        "aadhaar", "aadhar", "bank", "account", "ifsc", "^address$", "url$", "publicId",
    ]
]

# Fields stored as datetimes; ISO date strings in filters are converted automatically.
DATETIME_FIELDS = {
    "createdAt", "updatedAt", "submittedAt", "admissionDate", "lastLoginAt", "resolvedAt",
    "dueDate", "reviewedAt", "deletedAt", "comebackMarkedAt", "comebackReminderSentAt",
    "firstSavedAt", "uploadedAt", "respondedAt",
}

# Free-text fields where exact string equality is relaxed to case/whitespace-insensitive matching.
TEXT_MATCH_FIELDS = {
    "username", "fullName", "rollNumber", "department", "year", "roomNumber", "college_name",
    "stream", "village", "taluka", "district", "caste", "casteCategory", "name", "position",
    "status", "severity", "category", "priority", "role", "channel", "reason", "studentName",
    "students.username", "students.roomNumber", "students.status", "submissions.username",
    "title", "senderModel", "markedBy",
}

# ---------------------------------------------------------------------------
# Operator whitelists (anything not listed here is rejected)
# ---------------------------------------------------------------------------

ALLOWED_QUERY_OPERATORS = {
    "$eq", "$ne", "$gt", "$gte", "$lt", "$lte", "$in", "$nin", "$regex", "$options",
    "$and", "$or", "$nor", "$not", "$exists", "$type", "$elemMatch", "$size", "$all", "$expr",
}

ALLOWED_PIPELINE_STAGES = {
    "$match", "$project", "$addFields", "$set", "$unset", "$sort", "$limit", "$skip", "$group",
    "$unwind", "$count", "$sortByCount", "$bucket", "$facet", "$lookup", "$replaceRoot",
    "$replaceWith", "$sample", "$unionWith",
}

ALLOWED_EXPRESSION_OPERATORS = {
    # accumulators
    "$sum", "$avg", "$min", "$max", "$first", "$last", "$push", "$addToSet", "$count", "$stdDevPop",
    "$stdDevSamp", "$top", "$bottom", "$topN", "$bottomN", "$firstN", "$lastN", "$maxN", "$minN",
    # arithmetic
    "$add", "$subtract", "$multiply", "$divide", "$mod", "$abs", "$ceil", "$floor", "$round", "$trunc",
    "$pow", "$sqrt",
    # comparison / boolean / conditional
    "$eq", "$ne", "$gt", "$gte", "$lt", "$lte", "$cmp", "$and", "$or", "$not", "$cond", "$ifNull",
    "$switch", "$in",
    # string
    "$concat", "$toLower", "$toUpper", "$trim", "$ltrim", "$rtrim", "$substr", "$substrCP",
    "$strLenCP", "$split", "$indexOfCP", "$regexMatch", "$regexFind", "$replaceAll", "$replaceOne",
    "$strcasecmp",
    # type conversion
    "$toString", "$toInt", "$toDouble", "$toDate", "$toObjectId", "$toBool", "$convert", "$type", "$isNumber",
    # dates
    "$dateToString", "$dateFromString", "$dateDiff", "$dateAdd", "$dateSubtract", "$dateTrunc",
    "$year", "$month", "$dayOfMonth", "$dayOfWeek", "$dayOfYear", "$hour", "$week", "$isoWeek",
    # arrays / objects
    "$size", "$filter", "$map", "$reduce", "$arrayElemAt", "$slice", "$concatArrays", "$isArray",
    "$reverseArray", "$sortArray", "$setUnion", "$setIntersection", "$setDifference", "$anyElementTrue",
    "$allElementsTrue", "$mergeObjects", "$let", "$literal", "$range", "$zip", "$indexOfArray",
    # sub-options that look like operators
    "$regex", "$options", "$exists", "$elemMatch", "$nin", "$all",
}

# Keys inside stages/expressions that are plain option names (no $ prefix) are fine;
# these are explicitly forbidden anywhere as they can execute code or leak field names.
FORBIDDEN_OPERATORS = {
    "$where", "$function", "$accumulator", "$out", "$merge", "$objectToArray", "$getField",
    "$setField", "$unsetField", "$jsonSchema", "$currentOp", "$collStats", "$indexStats",
    "$planCacheStats", "$listSessions", "$text",
}


# ============================================================================
# HELPERS
# ============================================================================

def now_ist() -> datetime:
    return datetime.now(IST)


def get_current_ist_date() -> str:
    """Return the current date in Asia/Kolkata (IST) formatted as YYYY-MM-DD."""
    return now_ist().strftime("%Y-%m-%d")


def resolve_collection_name(name: str) -> str:
    """Normalize and validate a collection name (accepts common aliases)."""
    normalized = str(name or "").strip().lower().replace(" ", "_")
    resolved = COLLECTION_ALIASES.get(normalized, normalized)
    if resolved not in COLLECTIONS:
        allowed = ", ".join(sorted(COLLECTIONS.keys()))
        raise ValueError(f"Collection '{name}' is not permitted. Allowed collections: {allowed}")
    return resolved


def is_sensitive_field(field_name: str) -> bool:
    """True if any segment of a (dotted) field path is sensitive."""
    parts = str(field_name).lstrip("$").split(".")
    return any(pattern.search(part) for part in parts for pattern in SENSITIVE_FIELD_PATTERNS)


def serialize(value: Any) -> Any:
    """Recursively convert MongoDB types (ObjectId, datetime) to JSON-serializable values."""
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(IST).isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, (list, tuple)):
        return [serialize(item) for item in value]
    if isinstance(value, dict):
        return {str(k): serialize(v) for k, v in value.items()}
    if isinstance(value, bytes):
        return "<binary>"
    return value


def redact_sensitive_values(value: Any) -> Any:
    """Drop sensitive keys anywhere in the result and serialize the rest."""
    if isinstance(value, list):
        return [redact_sensitive_values(item) for item in value]
    if not isinstance(value, dict):
        return serialize(value)
    return {
        str(k): redact_sensitive_values(v)
        for k, v in value.items()
        if k != "__v" and not is_sensitive_field(k)
    }


def sensitive_exclusion_projection() -> dict[str, int]:
    """Projection that excludes every known sensitive field (used when no inclusion list is given)."""
    return {
        "password": 0, "email": 0, "phone": 0, "mobileNumber": 0, "fathersMobileNumber": 0,
        "aadhaarNumber": 0, "BankName": 0, "bankBranch": 0, "accountNumber": 0, "ifscCode": 0,
        "address": 0, "photoUrl": 0, "imageUrl": 0, "publicId": 0, "studentEmail": 0,
        "studentPhone": 0, "attachmentUrl": 0, "submissions.fileUrl": 0, "submissions.publicId": 0,
        "__v": 0, **{doc_type: 0 for doc_type in DOCUMENT_TYPES},
    }


def build_safe_projection(requested: dict[str, Any] | None) -> dict[str, Any]:
    """Build a find() projection that never includes sensitive fields."""
    if not requested:
        return sensitive_exclusion_projection()

    requested = {str(k): v for k, v in requested.items()}
    inclusions = {k: v for k, v in requested.items() if k != "_id" and v not in (0, False)}
    if inclusions:
        safe: dict[str, Any] = {}
        for field, val in inclusions.items():
            if is_sensitive_field(field):
                continue
            if isinstance(val, str) and val.strip().lower() in {"1", "true"}:
                safe[field] = 1
            elif isinstance(val, (dict, str)):
                validate_expression(val, "projection")
                safe[field] = val
            else:
                safe[field] = 1
        if not safe:
            raise ValueError("Projection only requested sensitive fields, which cannot be returned.")
        if "_id" in requested:
            safe["_id"] = 1 if requested["_id"] not in (0, False) else 0
        return safe

    projection = sensitive_exclusion_projection()
    for k in requested:
        projection[k] = 0
    return projection


def _check_field_reference(value: str, context: str) -> None:
    if value.startswith("$") and not value.startswith("$$") and is_sensitive_field(value[1:]):
        raise ValueError(f"Referencing sensitive field '{value[1:]}' in {context} is forbidden.")
    if value.startswith("$$"):
        var_path = value[2:].split(".", 1)
        if len(var_path) == 2 and is_sensitive_field(var_path[1]):
            raise ValueError(f"Referencing sensitive field '{var_path[1]}' in {context} is forbidden.")


def validate_query_filter(value: Any, context: str = "filter") -> None:
    """Validate a query filter: only whitelisted operators and no sensitive fields."""
    if isinstance(value, list):
        for item in value:
            validate_query_filter(item, context)
        return
    if isinstance(value, str):
        _check_field_reference(value, context)
        return
    if not isinstance(value, dict):
        return

    for key, val in value.items():
        key = str(key)
        if key.startswith("$"):
            if key in FORBIDDEN_OPERATORS or key not in ALLOWED_QUERY_OPERATORS:
                raise ValueError(f"Operator '{key}' is not allowed in {context}.")
            if key == "$expr":
                validate_expression(val, context)
                continue
        elif is_sensitive_field(key):
            raise ValueError(f"Filtering on sensitive field '{key}' is forbidden.")
        validate_query_filter(val, context)


def validate_expression(value: Any, context: str) -> None:
    """Validate an aggregation expression tree (whitelisted operators, no sensitive fields)."""
    if isinstance(value, list):
        for item in value:
            validate_expression(item, context)
        return
    if isinstance(value, str):
        _check_field_reference(value, context)
        return
    if not isinstance(value, dict):
        return

    for key, val in value.items():
        key = str(key)
        if key.startswith("$"):
            if key in FORBIDDEN_OPERATORS or (
                key not in ALLOWED_EXPRESSION_OPERATORS and key not in ALLOWED_QUERY_OPERATORS
            ):
                raise ValueError(f"Operator '{key}' is not allowed in {context}.")
            if key == "$literal":
                continue
        elif is_sensitive_field(key):
            raise ValueError(f"Sensitive field '{key}' cannot be used in {context}.")
        validate_expression(val, context)


def clamp_limit(limit: Any, default_val: int = DEFAULT_LIMIT) -> int:
    """Enforce safe limits on result sets."""
    try:
        value = int(limit) if limit not in (None, "") else default_val
    except (TypeError, ValueError):
        value = default_val
    return min(max(value, 1), MAX_LIMIT)


def parse_date_input(value: Any, default: str | None = None) -> str | None:
    """Parse flexible date input ('today', 'yesterday', '27/09/2026', '2026-9-27', '3 days ago') to YYYY-MM-DD (IST)."""
    if value is None or str(value).strip() == "":
        return default
    text = str(value).strip().lower()
    today = now_ist().date()
    if text in {"today", "now"}:
        return today.isoformat()
    if text == "yesterday":
        return (today - timedelta(days=1)).isoformat()
    if text == "tomorrow":
        return (today + timedelta(days=1)).isoformat()
    ago = re.fullmatch(r"(\d+)\s*days?\s*ago", text)
    if ago:
        return (today - timedelta(days=int(ago.group(1)))).isoformat()

    text = text.split("t")[0] if re.match(r"\d{4}-\d{1,2}-\d{1,2}t", text) else text
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%d.%m.%Y", "%d %b %Y", "%d %B %Y", "%b %d %Y", "%B %d %Y", "%b %d, %Y", "%B %d, %Y"):
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            continue
    raise ValueError(f"Could not understand date '{value}'. Use YYYY-MM-DD.")


def to_ist_datetime(value: str, end_of_day: bool = False) -> datetime:
    """Convert a date or datetime string into an aware datetime (IST)."""
    text = str(value).strip()
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=IST)
        if len(text) <= 10 and end_of_day:
            parsed = parsed + timedelta(days=1) - timedelta(microseconds=1)
        return parsed
    except ValueError:
        day = datetime.fromisoformat(parse_date_input(text))
        start = day.replace(tzinfo=IST)
        return start + timedelta(days=1) - timedelta(microseconds=1) if end_of_day else start


ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}([T ][\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$")


def text_equals_regex(value: str) -> dict[str, str]:
    """Case/whitespace-insensitive exact match for messy free-text fields."""
    return {"$regex": rf"^\s*{re.escape(value.strip())}\s*$", "$options": "i"}


def normalize_filter(value: Any, field: str | None = None) -> Any:
    """Make LLM-written filters match real data.

    - 24-hex strings on *_id / *Id fields -> ObjectId
    - ISO date strings on datetime fields -> datetime (IST)
    - plain string equality on free-text fields -> case/whitespace-insensitive regex
    """
    if isinstance(value, list):
        return [normalize_filter(item, field) for item in value]

    leaf = (field or "").split(".")[-1]
    is_id_field = bool(field) and (leaf == "_id" or leaf.endswith("Id") or leaf in {"replyTo", "reportedBy"})
    is_dt_field = leaf in DATETIME_FIELDS

    if isinstance(value, str):
        if is_id_field and ObjectId.is_valid(value):
            return ObjectId(value)
        if is_dt_field and ISO_DATE_RE.match(value.strip()):
            return to_ist_datetime(value)
        return value

    if not isinstance(value, dict):
        return value

    result: dict[str, Any] = {}
    for key, val in value.items():
        key = str(key)
        if key in {"$and", "$or", "$nor"}:
            result[key] = [normalize_filter(item) for item in (val if isinstance(val, list) else [val])]
        elif key == "$expr":
            result[key] = val
        elif key == "$regex":
            result[key] = val
            # LLMs usually intend case-insensitive matching
            if "$options" not in value and isinstance(val, str):
                result["$options"] = "i"
        elif key in {"$options", "$exists", "$size", "$type"}:
            result[key] = val
        elif key == "$elemMatch":
            has_operators = isinstance(val, dict) and any(str(k).startswith("$") for k in val)
            result[key] = normalize_filter(val, field) if has_operators else normalize_filter(val)
        elif key.startswith("$"):
            # Comparison operator on the current field
            if is_dt_field and key in {"$gt", "$gte", "$lt", "$lte"} and isinstance(val, str) and ISO_DATE_RE.match(val.strip()):
                result[key] = to_ist_datetime(val, end_of_day=key in {"$lte", "$gt"})
            elif (key in {"$in", "$nin"} and field in TEXT_MATCH_FIELDS and isinstance(val, list)
                  and all(isinstance(v, (str, int, float)) and not isinstance(v, bool) for v in val)):
                result[key] = [re.compile(rf"^\s*{re.escape(str(v).strip())}\s*$", re.IGNORECASE) for v in val]
            elif key == "$eq" and field in TEXT_MATCH_FIELDS and isinstance(val, str):
                result.update(text_equals_regex(val))
            else:
                result[key] = normalize_filter(val, field)
        else:
            # key is a field name
            if isinstance(val, str) and key in TEXT_MATCH_FIELDS:
                result[key] = text_equals_regex(val)
            elif isinstance(val, (int, float)) and not isinstance(val, bool) and key in TEXT_MATCH_FIELDS:
                result[key] = text_equals_regex(str(val))
            elif isinstance(val, str) and leaf_is_dt(key) and ISO_DATE_RE.match(val.strip()) and len(val.strip()) == 10:
                start = to_ist_datetime(val)
                result[key] = {"$gte": start, "$lt": start + timedelta(days=1)}
            else:
                result[key] = normalize_filter(val, key)
    return result


def leaf_is_dt(field: str) -> bool:
    return field.split(".")[-1] in DATETIME_FIELDS


def prepare_filter(raw: Any) -> dict[str, Any]:
    """Validate + normalize a user/LLM supplied filter."""
    if raw in (None, "", []):
        return {}
    if not isinstance(raw, dict):
        raise ValueError("filter must be a JSON object, e.g. {\"department\": \"CSE\"}.")
    validate_query_filter(raw, "filter")
    return normalize_filter(raw)


def normalize_sort(sort: Any) -> list[tuple[str, int]]:
    """Accept {'field': 1|-1|'asc'|'desc'} or 'field' / '-field'."""
    if not sort:
        return []
    if isinstance(sort, str):
        sort = {sort.lstrip("-"): -1 if sort.startswith("-") else 1}
    if not isinstance(sort, dict):
        raise ValueError("sort must be an object like {\"createdAt\": -1}.")
    pairs: list[tuple[str, int]] = []
    for field, direction in sort.items():
        if is_sensitive_field(field):
            raise ValueError(f"Sorting on sensitive field '{field}' is forbidden.")
        if isinstance(direction, str):
            direction = -1 if direction.strip().lower() in {"-1", "desc", "descending"} else 1
        pairs.append((str(field), -1 if int(direction) < 0 else 1))
    return pairs


def validate_pipeline(pipeline: Any, depth: int = 0) -> list[dict[str, Any]]:
    """Validate and normalize an aggregation pipeline. Recurses into $facet / $lookup / $unionWith."""
    if depth > 3:
        raise ValueError("Aggregation pipeline is nested too deeply.")
    if isinstance(pipeline, dict):
        pipeline = [pipeline]
    if not isinstance(pipeline, list):
        raise ValueError("pipeline must be a list of stage objects.")

    safe: list[dict[str, Any]] = []
    for stage in pipeline:
        if not isinstance(stage, dict) or len(stage) != 1:
            raise ValueError("Each aggregation stage must contain exactly one operator, e.g. {'$match': {...}}.")
        op, payload = next(iter(stage.items()))
        if op not in ALLOWED_PIPELINE_STAGES:
            raise ValueError(f"Aggregation stage '{op}' is not allowed. Allowed: {', '.join(sorted(ALLOWED_PIPELINE_STAGES))}")
        ctx = f"stage {op}"

        if op == "$match":
            validate_query_filter(payload, ctx)
            safe.append({"$match": normalize_filter(payload)})
        elif op == "$project":
            safe.append({"$project": build_safe_projection(payload)})
        elif op in {"$limit", "$skip"}:
            safe.append({op: clamp_limit(payload) if op == "$limit" else max(int(payload), 0)})
        elif op == "$sample":
            size = payload.get("size", 10) if isinstance(payload, dict) else 10
            safe.append({"$sample": {"size": clamp_limit(size)}})
        elif op == "$sort":
            safe.append({"$sort": dict(normalize_sort(payload))})
        elif op == "$unset":
            safe.append({"$unset": payload})
        elif op == "$count":
            safe.append({"$count": str(payload)})
        elif op == "$facet":
            if not isinstance(payload, dict):
                raise ValueError("$facet expects an object of sub-pipelines.")
            safe.append({"$facet": {str(k): validate_pipeline(v, depth + 1) for k, v in payload.items()}})
        elif op in {"$lookup", "$unionWith"}:
            if isinstance(payload, str):
                payload = {"coll": payload}
            if not isinstance(payload, dict):
                raise ValueError(f"{op} expects an object.")
            payload = dict(payload)
            coll_key = "from" if op == "$lookup" else "coll"
            payload[coll_key] = resolve_collection_name(payload.get(coll_key, ""))
            for key in ("localField", "foreignField"):
                if key in payload and is_sensitive_field(payload[key]):
                    raise ValueError(f"{op} cannot use sensitive field '{payload[key]}'.")
            if "let" in payload:
                validate_expression(payload["let"], ctx)
            if "pipeline" in payload:
                payload["pipeline"] = validate_pipeline(payload["pipeline"], depth + 1)
            safe.append({op: payload})
        else:
            # $group, $addFields, $set, $unwind, $sortByCount, $bucket, $replaceRoot, $replaceWith
            validate_expression(payload, ctx)
            safe.append({op: payload})
    return safe


def run_aggregate(collection: str, pipeline: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return list(db[collection].aggregate(pipeline, maxTimeMS=QUERY_TIMEOUT_MS, allowDiskUse=False))


def fuzzy_regex(value: str) -> dict[str, str]:
    """Case-insensitive 'contains' regex, tolerant of extra whitespace between words."""
    words = [re.escape(w) for w in str(value).strip().split()]
    return {"$regex": r"\s*".join(words) if words else "", "$options": "i"}


def student_display_names(usernames: list[str]) -> dict[str, dict[str, Any]]:
    """Map usernames -> {fullName, roomNumber, department} for friendlier output."""
    if not usernames:
        return {}
    rows = db["users"].find(
        {"username": {"$in": list(set(usernames))}},
        {"_id": 0, "username": 1, "fullName": 1, "roomNumber": 1, "department": 1, "year": 1},
    )
    return {r["username"]: r for r in rows}


def find_student_doc(identifier: str) -> list[dict[str, Any]]:
    """Resolve a student by _id, username, roll number or (partial) full name."""
    ident = str(identifier or "").strip()
    if not ident:
        raise ValueError("Student identifier cannot be empty.")
    projection = sensitive_exclusion_projection()
    if ObjectId.is_valid(ident):
        doc = db["users"].find_one({"_id": ObjectId(ident)}, projection)
        if doc:
            return [doc]
    for query in (
        {"username": text_equals_regex(ident)},
        {"rollNumber": text_equals_regex(ident)},
        {"fullName": text_equals_regex(ident)},
        # whole-word prefix match ('viraj' -> 'Viraj Thakare', not 'Pruthviraj')
        {"$or": [
            {"fullName": {"$regex": rf"(^|\s){re.escape(ident)}", "$options": "i"}},
            {"username": {"$regex": rf"(^|_){re.escape(ident.replace(' ', '_'))}", "$options": "i"}},
        ]},
        {"$or": [{"fullName": fuzzy_regex(ident)}, {"username": fuzzy_regex(ident.replace(" ", "_"))}]},
    ):
        docs = list(db["users"].find(query, projection).limit(10))
        if docs:
            return docs
    # Last resort: every word must appear in the full name (handles middle names)
    words = [w for w in ident.split() if len(w) > 1]
    if len(words) > 1:
        docs = list(db["users"].find({"$and": [{"fullName": fuzzy_regex(w)} for w in words]}, projection).limit(10))
        if docs:
            return docs
    return []


# ============================================================================
# GENERIC READ-ONLY TOOLS
# ============================================================================

@mcp.tool()
def list_collections() -> dict[str, Any]:
    """List every queryable hostel collection with a description and exact document count."""
    return {
        "success": True,
        "database": DATABASE_NAME,
        "collections": [
            {"name": name, "description": meta["description"], "count": db[name].count_documents({})}
            for name, meta in COLLECTIONS.items()
        ],
    }


@mcp.tool()
def describe_schema(
    collection_name: Annotated[str | None, Field(description="Optional collection (e.g. 'users', 'complaints'). Omit for all.")] = None,
) -> dict[str, Any]:
    """Describe fields, types and allowed enum values of hostel collections. Use before writing custom filters."""
    names = [resolve_collection_name(collection_name)] if collection_name else list(COLLECTIONS)
    return {
        "success": True,
        "database": DATABASE_NAME,
        "timezone": "Asia/Kolkata",
        "notes": [
            "String equality on free-text fields (department, district, status, ...) is matched case/whitespace-insensitively.",
            "Datetime fields accept ISO date strings in filters, e.g. {'createdAt': {'$gte': '2026-09-01'}}.",
            "Use get_distinct_values to see real spellings before filtering users on department/year/college/district.",
        ],
        "schema": {name: COLLECTIONS[name] for name in names},
    }


@mcp.tool()
def get_distinct_values(
    collection: Annotated[str, Field(description="Collection name, e.g. 'users'.")],
    field: Annotated[str, Field(description="Field to inspect, e.g. 'department', 'district', 'status', 'students.status'.")],
    filter: Annotated[dict[str, Any] | None, Field(description="Optional filter applied first.")] = None,
    limit: Annotated[int, Field(description="Max distinct values (default 100).")] = 100,
) -> dict[str, Any]:
    """List the distinct values of a field with how many documents have each value (most common first).
    Essential for messy free-text fields: shows every real spelling so you can filter correctly."""
    resolved = resolve_collection_name(collection)
    if is_sensitive_field(field):
        raise ValueError(f"Field '{field}' is sensitive and cannot be listed.")
    pipeline: list[dict[str, Any]] = []
    match = prepare_filter(filter)
    if match:
        pipeline.append({"$match": match})
    parts = field.split(".")
    for i in range(1, len(parts)):
        prefix = ".".join(parts[:i])
        pipeline.append({"$unwind": {"path": f"${prefix}", "preserveNullAndEmptyArrays": True}})
    pipeline += [
        {"$group": {"_id": f"${field}", "count": {"$sum": 1}}},
        {"$sort": {"count": -1, "_id": 1}},
        {"$limit": clamp_limit(limit, 100)},
    ]
    rows = run_aggregate(resolved, pipeline)
    return {
        "success": True,
        "collection": resolved,
        "field": field,
        "distinct_count": len(rows),
        "values": [{"value": serialize(r["_id"]), "count": r["count"]} for r in rows],
    }


@mcp.tool()
def find_documents(
    collection: Annotated[str, Field(description="Collection name: users, attendances, leaveapplications, complaints, notices, staffs, admins, documents, uploads, messages, messagereports.")],
    filter: Annotated[dict[str, Any] | None, Field(description="MongoDB filter, e.g. {'department': 'CSE'}, {'fullName': {'$regex': 'rahul', '$options': 'i'}}, {'createdAt': {'$gte': '2026-09-01'}}.")] = None,
    projection: Annotated[dict[str, Any] | None, Field(description="Fields to include, e.g. {'fullName': 1, 'roomNumber': 1}.")] = None,
    sort: Annotated[dict[str, Any] | None, Field(description="Sort, e.g. {'createdAt': -1}.")] = None,
    limit: Annotated[int, Field(description="Max documents (default 25, max 200).")] = DEFAULT_LIMIT,
    skip: Annotated[int, Field(description="Documents to skip for pagination.")] = 0,
) -> dict[str, Any]:
    """Query documents from any collection with filtering, projection, sorting and pagination.
    Returns total_matched (all matches) as well as the returned page."""
    resolved = resolve_collection_name(collection)
    filter_doc = prepare_filter(filter)
    cursor = db[resolved].find(filter_doc, projection=build_safe_projection(projection), max_time_ms=QUERY_TIMEOUT_MS)
    sort_pairs = normalize_sort(sort)
    if sort_pairs:
        cursor = cursor.sort(sort_pairs)
    skip = max(int(skip or 0), 0)
    page_limit = clamp_limit(limit)
    docs = list(cursor.skip(skip).limit(page_limit))
    total = db[resolved].count_documents(filter_doc, maxTimeMS=QUERY_TIMEOUT_MS)
    return {
        "success": True,
        "collection": resolved,
        "filter": serialize(filter or {}),
        "total_matched": total,
        "returned": len(docs),
        "has_more": skip + len(docs) < total,
        "documents": redact_sensitive_values(docs),
        **({"note": "No documents match this filter. Try get_distinct_values to check real spellings."} if total == 0 else {}),
    }


@mcp.tool()
def count_documents(
    collection: Annotated[str, Field(description="Collection name.")],
    filter: Annotated[dict[str, Any] | None, Field(description="Optional filter, e.g. {'status': 'Pending'}.")] = None,
) -> dict[str, Any]:
    """Count documents matching an optional filter in any collection."""
    resolved = resolve_collection_name(collection)
    filter_doc = prepare_filter(filter)
    return {
        "success": True,
        "collection": resolved,
        "filter": serialize(filter or {}),
        "count": db[resolved].count_documents(filter_doc, maxTimeMS=QUERY_TIMEOUT_MS),
    }


@mcp.tool()
def aggregate_documents(
    collection: Annotated[str, Field(description="Collection to aggregate.")],
    pipeline: Annotated[list[dict[str, Any]], Field(description="Stages: $match $group $project $addFields $set $unset $sort $limit $skip $unwind $count $sortByCount $bucket $facet $lookup $replaceRoot $sample $unionWith. Example: [{'$group': {'_id': {'$toLower': {'$trim': {'input': '$department'}}}, 'count': {'$sum': 1}}}, {'$sort': {'count': -1}}].")],
    limit: Annotated[int, Field(description="Max result rows (default 100, max 200).")] = 100,
) -> dict[str, Any]:
    """Run a read-only aggregation pipeline for complex analytics: grouping, joins ($lookup between
    whitelisted collections), date bucketing, percentages, facets, etc."""
    resolved = resolve_collection_name(collection)
    safe_pipeline = validate_pipeline(pipeline)
    if not any(("$limit" in stage or "$count" in stage) for stage in safe_pipeline[-2:]):
        safe_pipeline.append({"$limit": clamp_limit(limit, 100)})
    rows = run_aggregate(resolved, safe_pipeline)
    return {
        "success": True,
        "collection": resolved,
        "count": len(rows),
        "documents": redact_sensitive_values(rows),
    }


@mcp.tool()
def group_and_count(
    collection: Annotated[str, Field(description="Collection, e.g. 'users', 'complaints', 'leaveapplications'.")],
    group_by: Annotated[str, Field(description="Field to group on, e.g. 'department', 'district', 'roomNumber', 'status', 'category'.")],
    filter: Annotated[dict[str, Any] | None, Field(description="Optional filter applied before grouping.")] = None,
    normalize_text: Annotated[bool, Field(description="Merge values differing only in case/spaces (default true).")] = True,
) -> dict[str, Any]:
    """Count documents per value of a field (e.g. students per department/district/room/year,
    complaints per category). Merges 'CSE', 'cse ' etc. when normalize_text is true."""
    resolved = resolve_collection_name(collection)
    if is_sensitive_field(group_by):
        raise ValueError(f"Cannot group by sensitive field '{group_by}'.")
    pipeline: list[dict[str, Any]] = []
    match = prepare_filter(filter)
    if match:
        pipeline.append({"$match": match})
    parts = group_by.split(".")
    for i in range(1, len(parts)):
        pipeline.append({"$unwind": f"${'.'.join(parts[:i])}"})
    key: Any = f"${group_by}"
    if normalize_text:
        key = {"$cond": [
            {"$eq": [{"$type": key}, "string"]},
            {"$toLower": {"$trim": {"input": key}}},
            key,
        ]}
    pipeline += [
        {"$group": {"_id": key, "count": {"$sum": 1}, "spellings": {"$addToSet": f"${group_by}"}}},
        {"$sort": {"count": -1, "_id": 1}},
        {"$limit": MAX_LIMIT},
    ]
    rows = run_aggregate(resolved, pipeline)
    total = sum(r["count"] for r in rows)
    groups = []
    for r in rows:
        value = r["_id"]
        label = "(empty / not provided)" if value in (None, "") else (r["spellings"][0].strip() if normalize_text and isinstance(value, str) else value)
        groups.append({
            "value": serialize(label),
            "count": r["count"],
            "percent": round(r["count"] * 100 / total, 1) if total else 0,
            **({"variants": serialize(r["spellings"])} if len(r["spellings"]) > 1 else {}),
        })
    return {"success": True, "collection": resolved, "group_by": group_by, "filter": serialize(filter or {}), "total": total, "groups": groups}


@mcp.tool()
def search_database(
    query: Annotated[str, Field(description="Keyword: a name, username, room, department, district, notice text, complaint text, staff position...")],
    collections: Annotated[list[str] | None, Field(description="Optional collections to restrict the search to.")] = None,
    limit: Annotated[int, Field(description="Max matches per collection (default 10).")] = 10,
) -> dict[str, Any]:
    """Keyword search across students, staff, notices, complaints, leave applications, messages and uploads."""
    clean_q = str(query or "").strip()
    if not clean_q:
        raise ValueError("Search query cannot be empty.")
    regex = fuzzy_regex(clean_q)
    search_fields = {
        "users": ["fullName", "username", "rollNumber", "department", "roomNumber", "district", "taluka",
                  "village", "stream", "college_name", "casteCategory"],
        "staffs": ["name", "position"],
        "notices": ["title", "content", "severity"],
        "complaints": ["title", "description", "category", "studentName", "roomNumber", "status"],
        "leaveapplications": ["fullName", "username", "reason", "status"],
        "messages": ["content"],
        "uploads": ["title", "description", "submissions.username"],
        "admins": ["username", "role"],
    }
    targets = [resolve_collection_name(c) for c in collections] if collections else list(search_fields)
    results: dict[str, Any] = {}
    total = 0
    for coll in targets:
        fields = search_fields.get(coll)
        if not fields:
            continue
        search_filter: dict[str, Any] = {"$or": [{f: regex} for f in fields]}
        if coll == "users" and clean_q.isdigit():
            search_filter["$or"] += [{"roomNumber": text_equals_regex(clean_q)}, {"rollNumber": text_equals_regex(clean_q)}]
        if coll == "messages":
            search_filter = {"$and": [search_filter, {"isDeleted": {"$ne": True}}]}
        docs = list(db[coll].find(search_filter, sensitive_exclusion_projection()).limit(clamp_limit(limit, 10)))
        if docs:
            results[coll] = {"count": len(docs), "documents": redact_sensitive_values(docs)}
            total += len(docs)
    return {
        "success": True,
        "query": clean_q,
        "total_matches": total,
        "results": results,
        **({"note": f"No records mention '{clean_q}'."} if total == 0 else {}),
    }


# ============================================================================
# STUDENT & ROOM TOOLS
# ============================================================================

@mcp.tool()
def find_students(
    name: Annotated[str | None, Field(description="Part of full name or username.")] = None,
    department: Annotated[str | None, Field(description="Department text, partial match (e.g. 'cse', 'nursing', 'ai').")] = None,
    year: Annotated[str | None, Field(description="Year, partial match (e.g. '3', '4').")] = None,
    room_number: Annotated[str | None, Field(description="Exact room number.")] = None,
    district: Annotated[str | None, Field(description="District, partial match.")] = None,
    taluka: Annotated[str | None, Field(description="Taluka, partial match.")] = None,
    village: Annotated[str | None, Field(description="Village, partial match.")] = None,
    college: Annotated[str | None, Field(description="College name, partial match (e.g. 'walchand').")] = None,
    stream: Annotated[str | None, Field(description="Stream, partial match (e.g. 'engineering', 'medical').")] = None,
    caste_category: Annotated[str | None, Field(description="Caste category, e.g. 'OBC', 'VJNT', 'NT-C'.")] = None,
    caste: Annotated[str | None, Field(description="Caste, partial match.")] = None,
    roll_number: Annotated[str | None, Field(description="Exact roll number.")] = None,
    admitted_after: Annotated[str | None, Field(description="Admission date lower bound YYYY-MM-DD.")] = None,
    admitted_before: Annotated[str | None, Field(description="Admission date upper bound YYYY-MM-DD.")] = None,
    missing_field: Annotated[str | None, Field(description="Only students whose given profile field is empty, e.g. 'fullName', 'department'.")] = None,
    sort_by: Annotated[str, Field(description="Sort field: roomNumber, fullName, username, department, createdAt.")] = "roomNumber",
    limit: Annotated[int, Field(description="Max students (default 100).")] = 100,
) -> dict[str, Any]:
    """Find hostel students using any combination of fuzzy, case-insensitive filters.
    Returns total matches plus each student's key profile fields."""
    clauses: list[dict[str, Any]] = []
    if name:
        clauses.append({"$or": [
            {"fullName": fuzzy_regex(name)},
            {"username": fuzzy_regex(name.replace(" ", "_"))},
            {"$and": [{"fullName": fuzzy_regex(w)} for w in name.split()]} if len(name.split()) > 1 else {"username": fuzzy_regex(name)},
        ]})
    partials = {
        "department": department, "year": year, "district": district, "taluka": taluka,
        "village": village, "college_name": college, "stream": stream, "caste": caste,
    }
    for field, val in partials.items():
        if val:
            clauses.append({field: fuzzy_regex(val)})
    if room_number:
        clauses.append({"roomNumber": text_equals_regex(str(room_number))})
    if roll_number:
        clauses.append({"rollNumber": text_equals_regex(str(roll_number))})
    if caste_category:
        clauses.append({"casteCategory": text_equals_regex(caste_category)})
    if admitted_after:
        clauses.append({"admissionDate": {"$gte": to_ist_datetime(parse_date_input(admitted_after))}})
    if admitted_before:
        clauses.append({"admissionDate": {"$lte": to_ist_datetime(parse_date_input(admitted_before), end_of_day=True)}})
    if missing_field:
        if is_sensitive_field(missing_field):
            raise ValueError("Cannot check sensitive fields.")
        clauses.append({"$or": [{missing_field: {"$exists": False}}, {missing_field: None}, {missing_field: {"$regex": r"^\s*$"}}]})

    query = {"$and": clauses} if clauses else {}
    fields = ["username", "fullName", "rollNumber", "department", "year", "roomNumber", "college_name",
              "stream", "district", "taluka", "village", "casteCategory", "admissionDate"]
    sort_field = sort_by if sort_by in fields + ["createdAt"] else "roomNumber"
    pipeline: list[dict[str, Any]] = [{"$match": query}]
    if sort_field == "roomNumber":
        pipeline += [
            {"$addFields": {"_roomSort": {"$convert": {"input": "$roomNumber", "to": "int", "onError": 99999, "onNull": 99999}}}},
            {"$sort": {"_roomSort": 1, "fullName": 1}},
        ]
    else:
        pipeline.append({"$sort": {sort_field: -1 if sort_field == "createdAt" else 1}})
    pipeline += [{"$limit": clamp_limit(limit, 100)}, {"$project": {"_id": 0, **{f: 1 for f in fields}}}]
    docs = run_aggregate("users", pipeline)
    total = db["users"].count_documents(query)
    return {
        "success": True,
        "criteria": {k: v for k, v in {
            "name": name, "department": department, "year": year, "room_number": room_number, "district": district,
            "taluka": taluka, "village": village, "college": college, "stream": stream, "caste_category": caste_category,
            "caste": caste, "roll_number": roll_number, "admitted_after": admitted_after, "admitted_before": admitted_before,
            "missing_field": missing_field,
        }.items() if v},
        "total_matched": total,
        "returned": len(docs),
        "students": redact_sensitive_values(docs),
        **({"note": "No students match. Use get_distinct_values('users', <field>) to see real values."} if total == 0 else {}),
    }


@mcp.tool()
def get_student_profile(
    identifier: Annotated[str, Field(description="Student username, roll number, full/partial name, or _id.")],
    attendance_days: Annotated[int, Field(description="How many recent attendance days to summarise (default 30).")] = 30,
) -> dict[str, Any]:
    """Complete 360° view of one student: profile, roommates, attendance summary and recent absences,
    leave applications, complaints, and which documents are uploaded."""
    matches = find_student_doc(identifier)
    if not matches:
        return {"success": True, "found": False, "message": f"No student matches '{identifier}'."}
    if len(matches) > 1:
        return {
            "success": True,
            "found": True,
            "ambiguous": True,
            "message": f"{len(matches)} students match '{identifier}'. Ask which one, or use the exact username.",
            "candidates": redact_sensitive_values([
                {k: m.get(k) for k in ("username", "fullName", "rollNumber", "department", "year", "roomNumber")}
                for m in matches
            ]),
        }

    student = matches[0]
    username = student.get("username")
    user_id = student.get("_id")

    roommates = list(db["users"].find(
        {"roomNumber": student.get("roomNumber"), "username": {"$ne": username}},
        {"_id": 0, "username": 1, "fullName": 1, "department": 1, "year": 1},
    )) if student.get("roomNumber") else []

    att_rows = run_aggregate("attendances", [
        {"$sort": {"date": -1}},
        {"$limit": clamp_limit(attendance_days, 30)},
        {"$unwind": "$students"},
        {"$match": {"students.username": username}},
        {"$project": {"_id": 0, "date": 1, "status": "$students.status"}},
        {"$sort": {"date": -1}},
    ])
    present = sum(1 for r in att_rows if r["status"] == "Present")
    absent_dates = [r["date"] for r in att_rows if r["status"] == "Absent"]

    leaves = list(db["leaveapplications"].find(
        {"$or": [{"userId": user_id}, {"username": username}]},
        {"_id": 0, "reason": 1, "startDate": 1, "endDate": 1, "status": 1, "comebackMarked": 1, "adminNote": 1, "submittedAt": 1},
    ).sort("submittedAt", -1).limit(20))

    complaints = list(db["complaints"].find(
        {"userId": user_id},
        {"_id": 0, "title": 1, "category": 1, "priority": 1, "status": 1, "createdAt": 1, "isAnonymous": 1},
    ).sort("createdAt", -1).limit(20))

    doc_record = db["documents"].find_one({"userId": user_id}) or {}
    documents = {t.replace("Url", ""): bool(str(doc_record.get(t) or "").strip()) for t in DOCUMENT_TYPES}

    return {
        "success": True,
        "found": True,
        "profile": redact_sensitive_values({k: v for k, v in student.items() if k != "_id"}),
        "roommates": serialize(roommates),
        "attendance": {
            "days_considered": len(att_rows),
            "present": present,
            "absent": len(absent_dates),
            "attendance_percent": round(present * 100 / len(att_rows), 1) if att_rows else None,
            "absent_dates": absent_dates,
            "latest": att_rows[0] if att_rows else None,
        },
        "leave_applications": {"count": len(leaves), "items": serialize(leaves)},
        "complaints": {"count": len(complaints), "items": serialize(complaints)},
        "documents_uploaded": documents if doc_record else "No document record for this student.",
    }


@mcp.tool()
def get_room_details(
    room_number: Annotated[str | None, Field(description="Room number. Omit to get occupancy of every room.")] = None,
) -> dict[str, Any]:
    """Room occupancy: occupants of one room (with department/year and latest attendance),
    or a summary of all rooms with occupant counts."""
    if room_number:
        room = str(room_number).strip()
        occupants = list(db["users"].find(
            {"roomNumber": text_equals_regex(room)},
            {"_id": 0, "username": 1, "fullName": 1, "department": 1, "year": 1, "college_name": 1, "district": 1},
        ).sort("fullName", 1))
        latest = db["attendances"].find_one({}, {"date": 1, "students": 1}, sort=[("date", -1)])
        if latest:
            status_by_user = {s.get("username"): s.get("status") for s in latest.get("students", [])}
            for occ in occupants:
                occ["latestAttendance"] = status_by_user.get(occ["username"], "Not marked")
        return {
            "success": True,
            "room_number": room,
            "occupant_count": len(occupants),
            "latest_attendance_date": latest.get("date") if latest else None,
            "occupants": serialize(occupants),
            **({"note": f"Room {room} has no registered occupants."} if not occupants else {}),
        }

    rows = run_aggregate("users", [
        {"$group": {"_id": {"$trim": {"input": {"$ifNull": ["$roomNumber", ""]}}}, "count": {"$sum": 1},
                    "occupants": {"$push": {"$cond": [{"$gt": [{"$strLenCP": {"$ifNull": ["$fullName", ""]}}, 0]}, "$fullName", "$username"]}}}},
        {"$addFields": {"_n": {"$convert": {"input": "$_id", "to": "int", "onError": 99999, "onNull": 99999}}}},
        {"$sort": {"_n": 1}},
    ])
    rooms = [{"room_number": r["_id"] or "(not assigned)", "occupant_count": r["count"], "occupants": r["occupants"]} for r in rows]
    counts = [r["occupant_count"] for r in rooms if r["room_number"] != "(not assigned)"]
    return {
        "success": True,
        "total_rooms": len(counts),
        "total_students": sum(r["occupant_count"] for r in rooms),
        "max_occupancy": max(counts) if counts else 0,
        "min_occupancy": min(counts) if counts else 0,
        "average_occupancy": round(sum(counts) / len(counts), 2) if counts else 0,
        "rooms": rooms,
    }


# ============================================================================
# ATTENDANCE TOOLS
# ============================================================================

@mcp.tool()
def get_daily_attendance(
    attendance_date: Annotated[str | None, Field(description="Date: YYYY-MM-DD, 'today', 'yesterday', 'latest', '3 days ago', DD/MM/YYYY. Default: today, or latest recorded date if today is not marked.")] = None,
    status: Annotated[str | None, Field(description="Optional 'Present' or 'Absent' to list only those students.")] = None,
    student_username: Annotated[str | None, Field(description="Optional student username/name to check.")] = None,
    room_number: Annotated[str | None, Field(description="Optional room filter.")] = None,
) -> dict[str, Any]:
    """Attendance for a single day (IST): present/absent counts and percentage, list of students by status
    (with full names and rooms), or one student's status that day."""
    recent_dates = [d["date"] for d in db["attendances"].find({}, {"date": 1, "_id": 0}).sort("date", -1).limit(10)]
    requested = str(attendance_date or "").strip().lower()
    today = get_current_ist_date()
    if requested == "latest" or (not requested and today not in recent_dates):
        target_date = recent_dates[0] if recent_dates else today
    elif not requested:
        target_date = today
    else:
        target_date = parse_date_input(attendance_date)

    record = db["attendances"].find_one({"date": target_date}, {"_id": 0})
    if not record:
        return {
            "success": True,
            "date": target_date,
            "found": False,
            "message": f"No attendance was recorded for {target_date}.",
            "recent_recorded_dates": recent_dates,
        }

    students = record.get("students", [])
    if student_username:
        matches = find_student_doc(student_username)
        wanted = {m["username"] for m in matches} or {student_username.strip()}
        students = [s for s in students if s.get("username") in wanted or s.get("username", "").lower() == student_username.strip().lower()]
    if room_number:
        students = [s for s in students if str(s.get("roomNumber", "")).strip() == str(room_number).strip()]

    names = student_display_names([s.get("username") for s in students])
    enriched = [{
        "username": s.get("username"),
        "fullName": names.get(s.get("username"), {}).get("fullName") or None,
        "roomNumber": s.get("roomNumber"),
        "department": names.get(s.get("username"), {}).get("department") or None,
        "status": s.get("status"),
    } for s in students]

    present = sum(1 for s in enriched if s["status"] == "Present")
    absent = sum(1 for s in enriched if s["status"] == "Absent")
    total_students = db["users"].count_documents({})
    result: dict[str, Any] = {
        "success": True,
        "found": True,
        "timezone": "Asia/Kolkata",
        "date": target_date,
        "is_today": target_date == get_current_ist_date(),
        "marked_by": record.get("markedBy"),
        "total_marked": len(enriched),
        "present": present,
        "absent": absent,
        "attendance_percent": round(present * 100 / len(enriched), 1) if enriched else None,
        "recent_recorded_dates": recent_dates,
    }
    if not student_username and not room_number:
        marked_usernames = {s.get("username") for s in record.get("students", [])}
        result["registered_students"] = total_students
        result["not_marked_count"] = max(total_students - len(marked_usernames), 0)

    if status:
        wanted_status = status.strip().capitalize()
        listed = [s for s in enriched if s["status"] == wanted_status]
        result.update({"filter_status": wanted_status, "count": len(listed), "students": listed})
    elif student_username or room_number:
        result["students"] = enriched
        if student_username and not enriched:
            result["message"] = f"'{student_username}' was not marked on {target_date}."
    else:
        result["absent_students"] = [s for s in enriched if s["status"] == "Absent"]
    return result


@mcp.tool()
def get_attendance_report(
    start_date: Annotated[str | None, Field(description="Range start (YYYY-MM-DD / 'yesterday' / '7 days ago'). Default: 30 days ago.")] = None,
    end_date: Annotated[str | None, Field(description="Range end. Default: today.")] = None,
    student_username: Annotated[str | None, Field(description="Optional: only this student (username or name) - returns day-by-day history.")] = None,
    room_number: Annotated[str | None, Field(description="Optional room filter.")] = None,
    below_percent: Annotated[float | None, Field(description="Optional: only students whose attendance % is below this, e.g. 75.")] = None,
    min_percent: Annotated[float | None, Field(description="Optional: only students at or above this %, e.g. 100 for perfect attendance.")] = None,
    sort: Annotated[str, Field(description="'lowest' (default) or 'highest' attendance first.")] = "lowest",
    limit: Annotated[int, Field(description="Max students listed (default 100).")] = 100,
) -> dict[str, Any]:
    """Attendance over a date range: per-student present/absent days and percentage, daily trend,
    overall rate, most-absent students, and students below a threshold. Also gives one student's full history."""
    end = parse_date_input(end_date, get_current_ist_date())
    start = parse_date_input(start_date, (datetime.fromisoformat(end) - timedelta(days=30)).date().isoformat())
    if start > end:
        start, end = end, start

    date_match = {"date": {"$gte": start, "$lte": end}}
    student_match: dict[str, Any] = {}
    if student_username:
        matches = find_student_doc(student_username)
        if len(matches) > 1:
            return {"success": True, "ambiguous": True, "candidates": [
                {"username": m.get("username"), "fullName": m.get("fullName"), "roomNumber": m.get("roomNumber")} for m in matches]}
        uname = matches[0]["username"] if matches else student_username.strip()
        student_match["students.username"] = uname
    if room_number:
        student_match["students.roomNumber"] = str(room_number).strip()

    base = [{"$match": date_match}, {"$unwind": "$students"}]
    if student_match:
        base.append({"$match": student_match})

    days_recorded = db["attendances"].count_documents(date_match)
    if days_recorded == 0:
        return {"success": True, "start_date": start, "end_date": end, "days_recorded": 0,
                "message": f"No attendance records between {start} and {end}."}

    if student_username:
        history = run_aggregate("attendances", base + [
            {"$project": {"_id": 0, "date": 1, "status": "$students.status", "roomNumber": "$students.roomNumber"}},
            {"$sort": {"date": -1}},
        ])
        present = sum(1 for h in history if h["status"] == "Present")
        return {
            "success": True,
            "student": student_match["students.username"],
            "start_date": start, "end_date": end,
            "days_recorded": days_recorded,
            "days_marked": len(history),
            "present": present,
            "absent": len(history) - present,
            "attendance_percent": round(present * 100 / len(history), 1) if history else None,
            "absent_dates": [h["date"] for h in history if h["status"] == "Absent"],
            "history": history,
            **({"message": "Student has no attendance entries in this range."} if not history else {}),
        }

    per_student = run_aggregate("attendances", base + [
        {"$group": {
            "_id": "$students.username",
            "roomNumber": {"$last": "$students.roomNumber"},
            "present": {"$sum": {"$cond": [{"$eq": ["$students.status", "Present"]}, 1, 0]}},
            "absent": {"$sum": {"$cond": [{"$eq": ["$students.status", "Absent"]}, 1, 0]}},
            "absentDates": {"$push": {"$cond": [{"$eq": ["$students.status", "Absent"]}, "$date", "$$REMOVE"]}},
        }},
        {"$addFields": {"total": {"$add": ["$present", "$absent"]}}},
        {"$addFields": {"percent": {"$round": [{"$multiply": [{"$divide": ["$present", {"$max": ["$total", 1]}]}, 100]}, 1]}}},
    ])
    daily = run_aggregate("attendances", base + [
        {"$group": {
            "_id": "$date",
            "present": {"$sum": {"$cond": [{"$eq": ["$students.status", "Present"]}, 1, 0]}},
            "absent": {"$sum": {"$cond": [{"$eq": ["$students.status", "Absent"]}, 1, 0]}},
        }},
        {"$sort": {"_id": 1}},
    ])

    names = student_display_names([r["_id"] for r in per_student])
    rows = [{
        "username": r["_id"],
        "fullName": names.get(r["_id"], {}).get("fullName") or None,
        "roomNumber": r.get("roomNumber"),
        "present": r["present"], "absent": r["absent"], "percent": r["percent"],
        "absentDates": sorted(r.get("absentDates") or []),
    } for r in per_student]
    if below_percent is not None:
        rows = [r for r in rows if r["percent"] < float(below_percent)]
    if min_percent is not None:
        rows = [r for r in rows if r["percent"] >= float(min_percent)]
    rows.sort(key=lambda r: (r["percent"], -r["absent"]), reverse=(sort == "highest"))

    total_present = sum(d["present"] for d in daily)
    total_marks = total_present + sum(d["absent"] for d in daily)
    return {
        "success": True,
        "timezone": "Asia/Kolkata",
        "start_date": start, "end_date": end,
        "days_recorded": days_recorded,
        "overall_attendance_percent": round(total_present * 100 / total_marks, 1) if total_marks else None,
        "students_count": len(rows),
        "perfect_attendance_count": sum(1 for r in rows if r["absent"] == 0),
        "daily_trend": [{"date": d["_id"], "present": d["present"], "absent": d["absent"],
                         "percent": round(d["present"] * 100 / max(d["present"] + d["absent"], 1), 1)} for d in daily],
        "students": rows[:clamp_limit(limit, 100)],
    }


# ============================================================================
# LEAVES, COMPLAINTS, DOCUMENTS, COMMUNITY
# ============================================================================

@mcp.tool()
def get_leave_applications(
    status: Annotated[str | None, Field(description="'Pending', 'Approved' or 'Rejected'.")] = None,
    student: Annotated[str | None, Field(description="Username or name of a student.")] = None,
    on_leave_date: Annotated[str | None, Field(description="Only leaves covering this date (e.g. 'today') - answers 'who is on leave today'.")] = None,
    submitted_from: Annotated[str | None, Field(description="Submitted on/after this date.")] = None,
    submitted_to: Annotated[str | None, Field(description="Submitted on/before this date.")] = None,
    not_returned: Annotated[bool, Field(description="Only approved leaves whose comeback has not been marked.")] = False,
    limit: Annotated[int, Field(description="Max applications (default 50).")] = 50,
) -> dict[str, Any]:
    """Leave applications with filters plus a status breakdown. Use on_leave_date='today' for students currently on leave."""
    clauses: list[dict[str, Any]] = []
    if status:
        clauses.append({"status": text_equals_regex(status)})
    if student:
        matches = find_student_doc(student)
        ors: list[dict[str, Any]] = [{"fullName": fuzzy_regex(student)}, {"username": fuzzy_regex(student)}]
        ors += [{"userId": m["_id"]} for m in matches]
        clauses.append({"$or": ors})
    if on_leave_date:
        day = parse_date_input(on_leave_date)
        clauses.append({"startDate": {"$lte": day}, "endDate": {"$gte": day}})
        if not status:
            clauses.append({"status": "Approved"})
    if submitted_from:
        clauses.append({"submittedAt": {"$gte": to_ist_datetime(parse_date_input(submitted_from))}})
    if submitted_to:
        clauses.append({"submittedAt": {"$lte": to_ist_datetime(parse_date_input(submitted_to), end_of_day=True)}})
    if not_returned:
        clauses.append({"status": "Approved", "comebackMarked": {"$ne": True}})

    query = {"$and": clauses} if clauses else {}
    docs = list(db["leaveapplications"].find(query, sensitive_exclusion_projection())
                .sort("submittedAt", -1).limit(clamp_limit(limit, 50)))
    breakdown = run_aggregate("leaveapplications", [{"$group": {"_id": "$status", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}])
    total = db["leaveapplications"].count_documents(query)
    return {
        "success": True,
        "total_matched": total,
        "returned": len(docs),
        "all_time_status_breakdown": {str(r["_id"]): r["count"] for r in breakdown},
        "applications": redact_sensitive_values(docs),
        **({"note": "No leave applications match." if db["leaveapplications"].estimated_document_count()
            else "The leave applications collection is empty - no leave has ever been submitted."} if total == 0 else {}),
    }


@mcp.tool()
def get_complaints(
    status: Annotated[str | None, Field(description="'Pending', 'In Progress', 'Resolved' or 'Rejected'.")] = None,
    category: Annotated[str | None, Field(description="e.g. 'Electrical', 'Plumbing', 'Mess & Food', 'Wi-Fi & Internet'. Partial match.")] = None,
    priority: Annotated[str | None, Field(description="'Low', 'Medium', 'High' or 'Urgent'.")] = None,
    room_number: Annotated[str | None, Field(description="Room number.")] = None,
    student: Annotated[str | None, Field(description="Student name/username (non-anonymous complaints only).")] = None,
    keyword: Annotated[str | None, Field(description="Text to find in title/description.")] = None,
    created_from: Annotated[str | None, Field(description="Created on/after date.")] = None,
    created_to: Annotated[str | None, Field(description="Created on/before date.")] = None,
    limit: Annotated[int, Field(description="Max complaints (default 50).")] = 50,
) -> dict[str, Any]:
    """Complaint box entries with filters, plus breakdowns by status, category and priority and average resolution time."""
    clauses: list[dict[str, Any]] = []
    if status:
        clauses.append({"status": text_equals_regex(status)})
    if category:
        clauses.append({"category": fuzzy_regex(category)})
    if priority:
        clauses.append({"priority": text_equals_regex(priority)})
    if room_number:
        clauses.append({"roomNumber": text_equals_regex(str(room_number))})
    if student:
        ids = [m["_id"] for m in find_student_doc(student)]
        clauses.append({"isAnonymous": {"$ne": True}, "$or": [{"studentName": fuzzy_regex(student)}, {"userId": {"$in": ids}}]})
    if keyword:
        clauses.append({"$or": [{"title": fuzzy_regex(keyword)}, {"description": fuzzy_regex(keyword)}]})
    if created_from:
        clauses.append({"createdAt": {"$gte": to_ist_datetime(parse_date_input(created_from))}})
    if created_to:
        clauses.append({"createdAt": {"$lte": to_ist_datetime(parse_date_input(created_to), end_of_day=True)}})
    query = {"$and": clauses} if clauses else {}

    docs = list(db["complaints"].find(query, sensitive_exclusion_projection()).sort("createdAt", -1).limit(clamp_limit(limit, 50)))
    for d in docs:
        if d.get("isAnonymous"):
            d.pop("userId", None)
            d["studentName"] = "Anonymous Student"

    facets = run_aggregate("complaints", [
        {"$match": query},
        {"$facet": {
            "by_status": [{"$group": {"_id": "$status", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}],
            "by_category": [{"$group": {"_id": "$category", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}],
            "by_priority": [{"$group": {"_id": "$priority", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}],
            "resolution": [
                {"$match": {"resolvedAt": {"$ne": None}}},
                {"$group": {"_id": None, "avgHours": {"$avg": {"$divide": [{"$subtract": ["$resolvedAt", "$createdAt"]}, 3600000]}}, "n": {"$sum": 1}}},
            ],
        }},
    ])[0]
    to_map = lambda rows: {str(r["_id"]): r["count"] for r in rows}  # noqa: E731
    resolution = facets["resolution"][0] if facets["resolution"] else None
    total = sum(r["count"] for r in facets["by_status"])
    return {
        "success": True,
        "total_matched": total,
        "returned": len(docs),
        "by_status": to_map(facets["by_status"]),
        "by_category": to_map(facets["by_category"]),
        "by_priority": to_map(facets["by_priority"]),
        "average_resolution_hours": round(resolution["avgHours"], 1) if resolution else None,
        "complaints": redact_sensitive_values(docs),
        **({"note": "No complaints match these filters."} if total == 0 else {}),
    }


@mcp.tool()
def get_document_status(
    student: Annotated[str | None, Field(description="Optional student name/username to check.")] = None,
    document_type: Annotated[str | None, Field(description="Optional document: aadharCard, casteCertificate, incomeCertificate, domicileCertificate, collegeAdmissionReceipt, bonafideCertificate, casteValidityCertificate, previousYearMarksheet.")] = None,
    only_incomplete: Annotated[bool, Field(description="Only list students missing at least one document (or the given document).")] = False,
) -> dict[str, Any]:
    """Which certificates each student has uploaded (true/false; URLs are never exposed), per-document
    upload counts, and students who have not uploaded anything."""
    doc_types = DOCUMENT_TYPES
    if document_type:
        wanted = document_type.strip().lower().replace(" ", "").replace("url", "")
        doc_types = [t for t in DOCUMENT_TYPES if wanted in t.lower().replace("url", "")]
        if not doc_types:
            raise ValueError(f"Unknown document type '{document_type}'. Options: {', '.join(t[:-3] for t in DOCUMENT_TYPES)}")

    user_query: dict[str, Any] = {}
    if student:
        matches = find_student_doc(student)
        if not matches:
            return {"success": True, "found": False, "message": f"No student matches '{student}'."}
        user_query = {"_id": {"$in": [m["_id"] for m in matches]}}

    users = list(db["users"].find(user_query, {"username": 1, "fullName": 1, "roomNumber": 1}))
    records = {d["userId"]: d for d in db["documents"].find({"userId": {"$in": [u["_id"] for u in users]}})}
    per_doc_counts = {t[:-3]: 0 for t in doc_types}
    rows = []
    no_uploads = complete = 0
    for u in users:
        rec = records.get(u["_id"], {})
        status = {t[:-3]: bool(str(rec.get(t) or "").strip()) for t in doc_types}
        for k, v in status.items():
            per_doc_counts[k] += int(v)
        missing = [k for k, v in status.items() if not v]
        uploaded = len(status) - len(missing)
        no_uploads += uploaded == 0
        complete += not missing
        if only_incomplete and not missing:
            continue
        rows.append({
            "username": u.get("username"), "fullName": u.get("fullName") or None, "roomNumber": u.get("roomNumber"),
            "has_document_record": bool(rec), "uploaded_count": uploaded, "missing": missing,
            **({"documents": status} if student else {}),
        })
    rows.sort(key=lambda r: r["uploaded_count"])
    return {
        "success": True,
        "documents_checked": [t[:-3] for t in doc_types],
        "students_considered": len(users),
        "students_with_no_uploads": no_uploads,
        "fully_complete_students": complete,
        "uploads_per_document": per_doc_counts,
        "students": rows,
    }


@mcp.tool()
def get_community_messages(
    channel: Annotated[str | None, Field(description="'general' or 'announcement'.")] = None,
    sender: Annotated[str | None, Field(description="Sender username/name.")] = None,
    keyword: Annotated[str | None, Field(description="Text contained in the message.")] = None,
    include_deleted: Annotated[bool, Field(description="Include deleted messages (default false).")] = False,
    limit: Annotated[int, Field(description="Max messages (default 30).")] = 30,
) -> dict[str, Any]:
    """Recent community chat messages with sender names resolved, reaction counts, and moderation report summary."""
    clauses: list[dict[str, Any]] = []
    if channel:
        clauses.append({"channel": text_equals_regex(channel)})
    if keyword:
        clauses.append({"content": fuzzy_regex(keyword)})
    if not include_deleted:
        clauses.append({"isDeleted": {"$ne": True}})
    if sender:
        ids = [m["_id"] for m in find_student_doc(sender)]
        ids += [a["_id"] for a in db["admins"].find({"username": fuzzy_regex(sender)}, {"_id": 1})]
        clauses.append({"senderId": {"$in": ids}})
    query = {"$and": clauses} if clauses else {}

    msgs = list(db["messages"].find(query).sort("createdAt", -1).limit(clamp_limit(limit, 30)))
    user_ids = [m["senderId"] for m in msgs if m.get("senderModel", "User") == "User"]
    admin_ids = [m["senderId"] for m in msgs if m.get("senderModel") == "Admin"]
    users = {u["_id"]: (u.get("fullName") or u.get("username")) for u in db["users"].find({"_id": {"$in": user_ids}}, {"fullName": 1, "username": 1})}
    admins = {a["_id"]: f"{a.get('username')} (admin)" for a in db["admins"].find({"_id": {"$in": admin_ids}}, {"username": 1})}
    items = [{
        "id": str(m["_id"]),
        "channel": m.get("channel"),
        "sender": users.get(m.get("senderId")) or admins.get(m.get("senderId")) or "Unknown",
        "content": "[deleted]" if m.get("isDeleted") else m.get("content"),
        "isEdited": m.get("isEdited", False),
        "reactions": sum(len(r.get("users", [])) for r in m.get("reactions", [])),
        "createdAt": serialize(m.get("createdAt")),
    } for m in msgs]
    report_breakdown = run_aggregate("messagereports", [{"$group": {"_id": "$status", "count": {"$sum": 1}}}])
    return {
        "success": True,
        "total_matched": db["messages"].count_documents(query),
        "returned": len(items),
        "messages": items,
        "moderation_reports": {str(r["_id"]): r["count"] for r in report_breakdown} or "No message reports.",
    }


@mcp.tool()
def get_recent_activity(
    days: Annotated[int, Field(description="Look-back window in days (default 7).")] = 7,
) -> dict[str, Any]:
    """What happened recently across the hostel: new students, notices, complaints, leave applications,
    messages, uploads and attendance days in the last N days."""
    days = max(1, min(int(days or 7), 365))
    since = now_ist() - timedelta(days=days)
    since_date = since.date().isoformat()

    def recent(coll: str, fields: list[str], date_field: str = "createdAt") -> dict[str, Any]:
        q = {date_field: {"$gte": since}}
        docs = list(db[coll].find(q, {"_id": 0, **{f: 1 for f in fields}}).sort(date_field, -1).limit(20))
        return {"count": db[coll].count_documents(q), "latest": redact_sensitive_values(docs)}

    att = run_aggregate("attendances", [
        {"$match": {"date": {"$gte": since_date}}},
        {"$unwind": "$students"},
        {"$group": {"_id": "$date", "present": {"$sum": {"$cond": [{"$eq": ["$students.status", "Present"]}, 1, 0]}}, "total": {"$sum": 1}}},
        {"$sort": {"_id": -1}},
    ])
    return {
        "success": True,
        "since": since.isoformat(),
        "days": days,
        "new_students": recent("users", ["username", "fullName", "department", "roomNumber", "createdAt"]),
        "notices": recent("notices", ["title", "severity", "createdAt"]),
        "complaints": recent("complaints", ["title", "category", "priority", "status", "createdAt"]),
        "leave_applications": recent("leaveapplications", ["fullName", "startDate", "endDate", "status", "submittedAt"], "submittedAt"),
        "messages": {"count": db["messages"].count_documents({"createdAt": {"$gte": since}, "isDeleted": {"$ne": True}})},
        "uploads": recent("uploads", ["title", "dueDate", "createdAt"]),
        "attendance_days": [{"date": a["_id"], "present": a["present"], "total": a["total"]} for a in att],
    }


@mcp.tool()
def get_database_stats() -> dict[str, Any]:
    """High-level hostel dashboard: students, rooms, latest attendance, leaves, complaints, notices,
    staff, admins, documents and community counts, plus breakdowns by department, year, district and caste category."""
    total_students = db["users"].count_documents({})
    rooms = [r for r in db["users"].distinct("roomNumber") if str(r).strip()]
    latest_att = get_daily_attendance("latest")

    def breakdown(field: str) -> list[dict[str, Any]]:
        return group_and_count("users", field)["groups"]

    def status_map(coll: str, field: str = "status") -> dict[str, int]:
        return {str(r["_id"]): r["count"] for r in run_aggregate(coll, [{"$group": {"_id": f"${field}", "count": {"$sum": 1}}}])}

    return {
        "success": True,
        "timezone": "Asia/Kolkata",
        "current_datetime": now_ist().isoformat(timespec="minutes"),
        "stats": {
            "total_students": total_students,
            "occupied_rooms": len(rooms),
            "latest_attendance": {k: latest_att.get(k) for k in ("date", "present", "absent", "attendance_percent", "total_marked")},
            "attendance_days_recorded": db["attendances"].count_documents({}),
            "leave_applications": status_map("leaveapplications") or "none",
            "complaints": status_map("complaints") or "none",
            "notices": db["notices"].count_documents({}),
            "staff": [{"name": s.get("name"), "position": s.get("position")} for s in db["staffs"].find({}, {"name": 1, "position": 1})],
            "admins_by_role": status_map("admins", "role"),
            "students_with_documents_record": db["documents"].count_documents({}),
            "upload_requests": db["uploads"].count_documents({}),
            "community_messages": db["messages"].count_documents({"isDeleted": {"$ne": True}}),
            "message_reports": status_map("messagereports") or "none",
            "students_by_department": breakdown("department"),
            "students_by_year": breakdown("year"),
            "students_by_district": breakdown("district"),
            "students_by_caste_category": breakdown("casteCategory"),
            "students_by_college": breakdown("college_name"),
        },
    }


# ============================================================================
# TOOL REGISTRY FOR THE LLM SERVICE
# ============================================================================

TOOLS_MAP = {
    fn.__name__: fn
    for fn in (
        get_database_stats, find_students, get_student_profile, get_room_details,
        get_daily_attendance, get_attendance_report, get_leave_applications, get_complaints,
        get_document_status, get_community_messages, get_recent_activity, group_and_count,
        get_distinct_values, search_database, find_documents, count_documents,
        aggregate_documents, describe_schema, list_collections,
    )
}


def get_tool_schemas() -> list[dict[str, Any]]:
    """Return name/description/JSON-schema of each registered MCP tool (single source of truth)."""
    registered = {t.name: t for t in mcp._tool_manager.list_tools()}
    schemas = []
    for name in TOOLS_MAP:
        tool = registered[name]
        schemas.append({"name": name, "description": (tool.description or "").strip(), "parameters": tool.parameters})
    return schemas


def execute_tool(tool_name: str, arguments: dict[str, Any] | None) -> dict[str, Any]:
    """Execute a tool by name. Tolerates LLM quirks: JSON-encoded string args, 'null' strings, unknown keys."""
    if tool_name not in TOOLS_MAP:
        raise ValueError(f"Tool '{tool_name}' not found. Available: {', '.join(TOOLS_MAP)}")
    func = TOOLS_MAP[tool_name]
    params = inspect.signature(func).parameters
    clean: dict[str, Any] = {}
    for key, val in (arguments or {}).items():
        if key not in params:
            continue
        if isinstance(val, str):
            stripped = val.strip()
            if stripped.lower() in {"", "null", "none", "undefined"}:
                continue
            if stripped[:1] in "{[":
                try:
                    val = json.loads(stripped)
                except json.JSONDecodeError:
                    pass
        clean[key] = val
    return func(**clean)


# Backward compatibility helper for API endpoints
def get_collections_summary() -> dict[str, Any]:
    return list_collections()


def run() -> None:
    """Run the MCP server over stdio."""
    mcp.run(transport="stdio")


if __name__ == "__main__":
    run()
