import os
from typing import Any
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import llm_service
import server as mcp_server

load_dotenv()

app = FastAPI(
    title="Hostel Database MCP AI Server",
    version="1.0.0",
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
        "mcp_server": "FastMCP with @mcp.tool()",
        "endpoints": {
            "root": "GET / (Default API Status)",
            "ask": "POST /ask (Send database questions - queries LLM first, selects MCP tools)",
            "collections": "GET /collections (List allowed database collections)",
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


@app.post("/ask", response_model=QueryResponse)
def ask(request: QueryRequest) -> QueryResponse:
    """Main API endpoint for answering database questions using LLM -> MCP tool execution flow."""
    try:
        result = llm_service.ask_question(
            request.question,
            session_id=request.session_id,
            history=request.history,
        )
        result["session_id"] = request.session_id
        return QueryResponse(**result)
    except Exception as exc:
        return QueryResponse(
            success=False,
            question=request.question,
            answer="Sorry, an error occurred while processing your request.",
            error=str(exc),
            session_id=request.session_id,
        )


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOSTEL_API_HOST", "127.0.0.1")
    port = int(os.getenv("HOSTEL_API_PORT", "8000"))
    uvicorn.run("api:app", host=host, port=port, reload=False)
