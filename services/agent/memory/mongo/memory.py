# memory/mongo/memory.py

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from pymongo import MongoClient
from pymongo.errors import PyMongoError

from memory.interface import MemoryPort


class MongoMemory(MemoryPort):
    def __init__(self, uri: str, db_name: str):
        self.client = MongoClient(uri)
        self.db = self.client[db_name]

        # Collections
        self.messages = self.db.chat_messages
        self.user_profiles = self.db.user_profiles
        self.agent_tasks = self.db.agent_tasks
        self.long_memory = self.db.long_memory

    # -------------------------
    # Diagnostics
    # -------------------------
    def ping(self) -> bool:
        try:
            self.client.admin.command("ping")
            return True
        except PyMongoError:
            return False

    # -------------------------
    # User profile
    # -------------------------
    def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        doc = self.user_profiles.find_one({"user_id": user_id})
        return doc.get("data", {}) if doc else {}

    def update_user_profile(self, user_id: str, data: Dict[str, Any]) -> None:
        self.user_profiles.update_one(
            {"user_id": user_id},
            {"$set": {"data": data, "updated_at": datetime.now(timezone.utc)}},
            upsert=True,
        )

    # -------------------------
    # Chat memory
    # -------------------------
    def store_message(
        self,
        user_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.messages.insert_one(
            {
                "user_id": user_id,
                "role": role,
                "content": content,
                "metadata": metadata or {},
                "timestamp": datetime.now(timezone.utc),
            }
        )

    def get_recent_messages(
        self, user_id: str, limit: int = 20
    ) -> List[Dict[str, Any]]:
        cursor = (
            self.messages.find({"user_id": user_id})
            .sort("timestamp", -1)
            .limit(limit)
        )
        return list(reversed(list(cursor)))

    # -------------------------
    # Agent task memory
    # -------------------------
    def store_agent_task(self, task: Dict[str, Any]) -> None:
        self.agent_tasks.insert_one(task)

    def update_agent_task(self, task_id: str, data: Dict[str, Any]) -> None:
        self.agent_tasks.update_one(
            {"task_id": task_id},
            {"$set": data},
        )

    def fetch_pending_tasks(self) -> List[Dict[str, Any]]:
        return list(self.agent_tasks.find({"status": "pending"}))

    # -------------------------
    # Long-term memory
    # -------------------------
    def store_memory_snippet(
        self, user_id: str, content: str, tags: List[str]
    ) -> None:
        self.long_memory.insert_one(
            {
                "user_id": user_id,
                "content": content,
                "tags": tags,
                "timestamp": datetime.now(timezone.utc),
            }
        )

    def search_memory(
        self, user_id: str, query: str, limit: int = 5
    ) -> List[str]:
        # NOTE: naive text search for now (vector RAG handled elsewhere)
        cursor = (
            self.long_memory.find(
                {"user_id": user_id, "content": {"$regex": query, "$options": "i"}}
            )
            .limit(limit)
        )
        return [doc["content"] for doc in cursor]
