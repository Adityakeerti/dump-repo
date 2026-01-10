# api/routes/diagnostics.py

from fastapi import APIRouter
from config.settings import settings
from memory.interface import MemoryPort

router = APIRouter(prefix="/diagnostics")

memory: MemoryPort | None = None


def set_memory_backend(memory_backend: MemoryPort):
    global memory
    memory = memory_backend


@router.get("/health")
def health_check():
    if memory is None:
        return {"status": "error", "reason": "memory not initialized"}

    return {
        "status": "ok",
        "app": settings.app_name,
        "env": settings.app_env,
        "llm_provider": settings.llm_provider,
        "mongo_connected": memory.ping(),
        "vector_db": settings.vector_db,
    }
