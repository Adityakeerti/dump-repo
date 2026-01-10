# memory/mongo/agent_store.py

from typing import Dict, Any, List
from datetime import datetime, timezone
from agent.tasks.base import TaskStatus


class AgentTaskStore:
    def __init__(self, db):
        self.collection = db.agent_tasks

    def create(self, task: Dict[str, Any]):
        self.collection.insert_one(task)

    def fetch_pending(self) -> List[Dict[str, Any]]:
        return list(
            self.collection.find(
                {"status": TaskStatus.PENDING}
            )
        )

    def update(self, task_id: str, updates: Dict[str, Any]):
        updates["updated_at"] = datetime.now(timezone.utc)
        self.collection.update_one(
            {"task_id": task_id},
            {"$set": updates},
        )

    def cancel(self, task_id: str) -> bool:
        """
        Safe cancellation:
        - Only PENDING or RUNNING tasks can be cancelled
        """
        result = self.collection.update_one(
            {
                "task_id": task_id,
                "status": {"$in": [TaskStatus.PENDING, TaskStatus.RUNNING]},
            },
            {
                "$set": {
                    "status": TaskStatus.CANCELLED,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        return result.modified_count == 1
