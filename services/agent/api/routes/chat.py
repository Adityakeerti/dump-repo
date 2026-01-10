from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Dict, Optional, List
from datetime import datetime, timezone

from memory.interface import MemoryPort
from chatbot.service import ChatbotService
from agent.service import AgentService
from orchestration.mode_switch import build_graph


router = APIRouter()

# --------------------------------------------------
# Injected dependencies (set at app startup)
# --------------------------------------------------

memory: Optional[MemoryPort] = None
chatbot_service: Optional[ChatbotService] = None
agent_service: Optional[AgentService] = None
graph = None


def set_memory_backend(memory_backend: MemoryPort):
    """
    Called once during app startup.
    Wires memory + services + orchestration graph.
    """
    global memory, chatbot_service, agent_service, graph

    memory = memory_backend
    chatbot_service = ChatbotService(memory_backend)
    agent_service = AgentService(memory_backend)
    graph = build_graph(chatbot_service, agent_service)


# --------------------------------------------------
# Schemas
# --------------------------------------------------

class ChatRequest(BaseModel):
    message: str
    user_context: Optional[Dict] = None


class ChatResponse(BaseModel):
    status: str
    message: str
    rag_used: bool = False
    retrieved_chunks: List[str] = Field(default_factory=list)


# --------------------------------------------------
# Endpoint
# --------------------------------------------------

@router.post("/", response_model=ChatResponse)
def chat_endpoint(
    payload: ChatRequest
):
    """
    Chat endpoint - authentication handled by frontend/backend-ai.
    Agent1 trusts the user_context provided in the request.
    """
    if not all([memory, chatbot_service, agent_service, graph]):
        raise RuntimeError("Dependencies not initialized")

    # Extract user info from request payload (frontend sends authenticated user data)
    user_context = payload.user_context or {}
    user_id = user_context.get("email") or user_context.get("user_id") or "anonymous"
    user_email = user_context.get("email", user_id)
    user_role = user_context.get("role", "STUDENT")
    user_name = user_context.get("name") or user_context.get("full_name", "User")

    # ---- Sync user profile in MongoDB ----
    user_profile = memory.get_user_profile(user_id)
    if not user_profile:
        # Create user profile on first interaction
        memory.update_user_profile(user_id, {
            "user_id": user_id,
            "email": user_email,
            "role": user_role,
            "full_name": user_name,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    # ---- Build complete user context ----
    complete_user_context = {
        "user_id": user_id,
        "email": user_email,
        "role": user_role,
        "full_name": user_name
    }
    complete_user_context.update(user_context)  # Merge with frontend data

    # ---- Store incoming user message ----
    memory.store_message(
        user_id=user_id,
        role="user",
        content=payload.message,
        metadata={
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "role": user_role
        },
    )

    # ---- Orchestrated execution ----
    result = graph.invoke(
        {
            "user_id": user_id,
            "message": payload.message,
            "user_context": complete_user_context,
            "intent": None,
            "response": None,
            "task_created": None,
        }
    )

    # ---- Agent path ----
    if result.get("task_created"):
        return ChatResponse(
            status="agent_task_created",
            message=result["response"],
        )

    # ---- Chat path ----
    chat_result = result["response"]

    return ChatResponse(
        status="chat",
        message=chat_result["answer"],
        rag_used=chat_result["rag_used"],
        retrieved_chunks=chat_result["chunks"],
    )
