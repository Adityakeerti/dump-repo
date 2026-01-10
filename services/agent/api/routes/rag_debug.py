# api/routes/rag_debug.py

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List

from chatbot.service import ChatbotService
from memory.interface import MemoryPort
from api.dependencies import extract_user_context, UserContext

router = APIRouter(prefix="/rag")

memory: MemoryPort | None = None
chatbot: ChatbotService | None = None


def set_memory_backend(memory_backend: MemoryPort):
    global memory, chatbot
    memory = memory_backend
    chatbot = ChatbotService(memory_backend)


class RAGRequest(BaseModel):
    query: str
    k: int = 5


@router.post("/debug")
def rag_debug(
    payload: RAGRequest,
    user: UserContext = Depends(extract_user_context)
):
    if chatbot is None:
        raise RuntimeError("Chatbot not initialized")

    chunks = chatbot.retrieve_chunks(
        query=payload.query,
        k=payload.k,
    )

    return {
        "query": payload.query,
        "chunks_found": len(chunks),
        "chunks": chunks,
    }
