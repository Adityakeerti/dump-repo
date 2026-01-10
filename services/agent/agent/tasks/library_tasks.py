# agent/tasks/library_tasks.py

from typing import Dict, Any
from memory.vector.chroma import ChromaVectorStore
from config.settings import load_permissions


def handle_library_search(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Agent task: search library documents using RAG.
    """

    query = payload.get("raw_input", "")
    role = payload.get("role", "student")

    permissions = load_permissions()
    perms = permissions["roles"].get(role, {})
    denied_tags = set(perms.get("denied_tags", []))

    vector_store = ChromaVectorStore()
    chunks = vector_store.similarity_search(query, k=5)

    filtered = []
    for chunk in chunks:
        if any(tag in chunk.lower() for tag in denied_tags):
            continue
        filtered.append(chunk)

    return {
        "type": "library_search",
        "results": filtered[:3],
    }
