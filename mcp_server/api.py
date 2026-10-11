import os
import time
from pathlib import Path
from typing import Any
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import history_store
import llm_service
import server as mcp_server

load_dotenv(Path(__file__).with_name(".env"))

app = FastAPI(
    title="Hostel Database MCP AI Server",
    version="3.0.0",
    description="FastAPI AI Chatbot Endpoint with separated Groq LLM Orchestration and FastMCP Server Tools.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, description="Natural-language question about the hostel database.")
    session_id: str | None = Field(default=None, description="Optional chat session id for conversation memory.")
    history: list[dict[str, Any]] | None = Field(default=None, description="Optional recent chat messages for follow-up context.")
    user: str | None = Field(default=None, max_length=120, description="Optional admin username, stored in query history.")


class QueryResponse(BaseModel):
    success: bool
    question: str
    answer: str | None = None
    notes: str | None = None
    plan: dict[str, Any] | None = None
    data: Any | None = None
    source: str | None = None
    session_id: str | None = None
    iterations: int | None = None
    tools_used: list[dict[str, Any]] | None = None
    groq_error: str | None = None
    error: str | None = None


@app.get("/")
def root() -> dict[str, Any]:
    """Default API status endpoint."""
    return {
        "name": "Hostel Database MCP AI Server",
        "status": "online",
        "database": mcp_server.DATABASE_NAME,
        "collections": list(mcp_server.COLLECTIONS.keys()),
        "groq_llm_enabled": bool(os.getenv("GROQ_API_KEY")),
        "groq_models": llm_service.GROQ_MODELS,
        "tools": list(mcp_server.TOOLS_MAP),
        "mcp_server": "FastMCP with @mcp.tool()",
        "endpoints": {
            "root": "GET / (Default API Status)",
            "ask": "POST /ask (Send database questions - queries LLM first, selects MCP tools)",
            "collections": "GET /collections (List allowed database collections)",
            "tools": "GET /tools (List MCP tools and their parameters)",
        },
        "docs": "/docs",
    }


@app.get("/health")
def health() -> dict[str, Any]:
    """Health check endpoint."""
    return root()


@app.get("/collections")
def collections() -> dict[str, Any]:
    """List allowed collections and their approximate document counts."""
    return mcp_server.list_collections()


@app.get("/tools")
def tools() -> dict[str, Any]:
    """List the read-only MCP tools available to the assistant."""
    return {"success": True, "tools": mcp_server.get_tool_schemas()}


@app.post("/ask", response_model=QueryResponse)
def ask(request: QueryRequest, http_request: Request) -> QueryResponse:
    """Main API endpoint for answering database questions using LLM -> MCP tool execution flow."""
    started = time.perf_counter()
    try:
        result = llm_service.ask_question(
            request.question,
            session_id=request.session_id,
            history=request.history,
        )
    except Exception as exc:
        result = {
            "success": False,
            "question": request.question,
            "answer": "Sorry, an error occurred while processing your request.",
            "error": str(exc),
        }
    result["session_id"] = request.session_id
    history_store.record(
        question=request.question,
        result=result,
        duration_ms=round((time.perf_counter() - started) * 1000),
        session_id=request.session_id,
        admin_user=request.user,
        client_ip=http_request.client.host if http_request.client else None,
    )
    return QueryResponse(**result)


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOSTEL_API_HOST", "127.0.0.1")
    port = int(os.getenv("HOSTEL_API_PORT", "8000"))
    uvicorn.run("api:app", host=host, port=port, reload=False)