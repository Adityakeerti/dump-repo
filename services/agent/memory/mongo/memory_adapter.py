# memory/mongo/memory_adapter.py

from typing import Dict, Any, List

from memory.interface import MemoryPort
from memory.mongo.client import MongoDBClient
from memory.mongo.chat_store import ChatStore
from memory.mongo.profile_store import ProfileStore
from memory.mongo.agent_store import AgentTaskStore


class MongoMemoryAdapter(MemoryPort):
    """
    Concrete MongoDB-backed implementation of MemoryPort.

    This class is the ONLY place where:
    - MongoDB
    - collections
    - stores
    are composed together.

    Everything else depends only on MemoryPort.
    """

    def __init__(self):
        client = MongoDBClient()

        self._chat_store = ChatStore(client)
        self._profile_store = ProfileStore(client)
        self._agent_store = AgentTaskStore(client)

    # --------------------------------------------------
    # User profile
    # --------------------------------------------------

    def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        return self._profile_store.get_user_profile(user_id)

    def update_user_profile(self, user_id: str, data: Dict[str, Any]) -> None:
        self._profile_store.update_user_profile(user_id, data)

    # --------------------------------------------------
    # Chat memory
    # --------------------------------------------------

    def get_recent_messages(
        self,
        user_id: str,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        return self._chat_store.get_recent_messages(user_id, limit)

    def store_message(
        self,
        user_id: str,
        role: str,
        content: str,
        metadata: Dict[str, Any] | None = None,
    ) -> None:
        self._chat_store.store_message(
            user_id=user_id,
            role=role,
            content=content,
            metadata=metadata or {},
        )

    # --------------------------------------------------
    # Agent task memory
    # --------------------------------------------------

    def store_agent_task(self, task: Dict[str, Any]) -> None:
        self._agent_store.store_task(task)

    def update_agent_task(self, task_id: str, updates: Dict[str, Any]) -> None:
        self._agent_store.update_task(task_id, updates)

    def fetch_pending_tasks(self) -> List[Dict[str, Any]]:
        return self._agent_store.fetch_pending_tasks()

    # --------------------------------------------------
    # Long-term memory (stub for now)
    # --------------------------------------------------

    def store_memory_snippet(
        self,
        user_id: str,
        content: str,
        tags: List[str],
    ) -> None:
        """
        Will later store condensed memory into vector DB.
        """
        # Not implemented yet (STEP 7+)
        pass

    def search_memory(
        self,
        user_id: str,
        query: str,
        limit: int = 5,
    ) -> List[str]:
        """
        Will later perform semantic search over long-term memory.
        """
        # Not implemented yet (STEP 7+)
        return []
