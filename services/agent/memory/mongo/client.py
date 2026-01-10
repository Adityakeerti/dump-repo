# memory/mongo/client.py

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta

from pymongo import MongoClient, ASCENDING
from pymongo.errors import PyMongoError

from memory.interface import MemoryPort


class MongoClientProvider(MemoryPort):
    """
    MongoDB-backed implementation of MemoryPort.
    This is the SINGLE source of truth for persistence.
    """

    def __init__(self, uri: str, db_name: str):
        self.client = MongoClient(uri)
        self.db = self.client[db_name]
        self._ensure_indexes()

    # --------------------------------------------------
    # Diagnostics
    # --------------------------------------------------

    def ping(self) -> bool:
        try:
            self.client.admin.command("ping")
            return True
        except PyMongoError:
            return False

    # --------------------------------------------------
    # User profile
    # --------------------------------------------------

    def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        profile = self.db.user_profiles.find_one(
            {"user_id": user_id},
            {"_id": 0},
        )
        return profile or {}

    def update_user_profile(self, user_id: str, data: Dict[str, Any]) -> None:
        self.db.user_profiles.update_one(
            {"user_id": user_id},
            {"$set": data},
            upsert=True,
        )

    # --------------------------------------------------
    # Chat memory
    # --------------------------------------------------

    def store_message(
        self,
        user_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.db.chat_messages.insert_one(
            {
                "user_id": user_id,
                "role": role,
                "content": content,
                "metadata": metadata or {},
                "created_at": datetime.now(timezone.utc),
            }
        )

    def get_recent_messages(
        self,
        user_id: str,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        cursor = (
            self.db.chat_messages.find(
                {"user_id": user_id},
                {"_id": 0},
            )
            .sort("created_at", -1)
            .limit(limit)
        )
        return list(reversed(list(cursor)))

    # --------------------------------------------------
    # Agent tasks
    # --------------------------------------------------

    def store_agent_task(self, task: Dict[str, Any]) -> None:
        self.db.agent_tasks.insert_one(task)

    def update_agent_task(self, task_id: str, data: Dict[str, Any]) -> None:
        self.db.agent_tasks.update_one(
            {"task_id": task_id},
            {
                "$set": {
                    **data,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

    def fetch_pending_tasks(self) -> List[Dict[str, Any]]:
        cursor = self.db.agent_tasks.find(
            {"status": "PENDING"},
            {"_id": 0},
        ).sort("created_at", ASCENDING)
        return list(cursor)

    # --------------------------------------------------
    # Long-term memory (stub, future-ready)
    # --------------------------------------------------

    def store_memory_snippet(
        self,
        user_id: str,
        content: str,
        tags: List[str],
    ) -> None:
        self.db.long_memory.insert_one(
            {
                "user_id": user_id,
                "content": content,
                "tags": tags,
                "created_at": datetime.now(timezone.utc),
            }
        )

    def search_memory(
        self,
        user_id: str,
        query: str,
        limit: int = 5,
    ) -> List[str]:
        # Placeholder: semantic search comes later
        cursor = self.db.long_memory.find(
            {"user_id": user_id},
            {"_id": 0, "content": 1},
        ).limit(limit)
        return [doc["content"] for doc in cursor]

    # --------------------------------------------------
    # Indexes
    # --------------------------------------------------

    def _ensure_indexes(self):
        # Chat messages
        self.db.chat_messages.create_index(
            [("user_id", ASCENDING), ("created_at", ASCENDING)]
        )
        self.db.chat_messages.create_index(
            "created_at",
            expireAfterSeconds=int(timedelta(days=30).total_seconds()),
        )

        # Agent tasks
        self.db.agent_tasks.create_index(
            [("status", ASCENDING), ("updated_at", ASCENDING)]
        )
        self.db.agent_tasks.create_index(
            "updated_at",
            expireAfterSeconds=int(timedelta(days=7).total_seconds()),
        )

        # User profiles
        self.db.user_profiles.create_index(
            "user_id",
            unique=True,
        )
