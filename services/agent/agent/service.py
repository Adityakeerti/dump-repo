# agent/service.py

import time
from typing import Dict, Any, List
from datetime import datetime, timezone

from memory.interface import MemoryPort
from agent.tasks.base import TaskStatus
from agent.router import AgentRouter


class AgentService:
    def __init__(self, memory: MemoryPort, poll_interval: int = 5):
        self.memory = memory
        self.poll_interval = poll_interval
        self.router = AgentRouter()
        self._running = False

    def start(self):
        self._running = True
        while self._running:
            self._process_pending_tasks()
            time.sleep(self.poll_interval)

    def stop(self):
        self._running = False

    def _process_pending_tasks(self):
        tasks: List[Dict[str, Any]] = self.memory.fetch_pending_tasks()

        for task in tasks:
            task_id = task["task_id"]
            user_id = task["user_id"]

            # Skip cancelled tasks
            if task.get("status") == TaskStatus.CANCELLED:
                continue

            try:
                self.memory.update_agent_task(
                    task_id=task_id,
                    updates={"status": TaskStatus.RUNNING},
                )

                result = self.router.run(
                    intent=task["intent"],
                    payload=task.get("payload", {}),
                )

                self.memory.update_agent_task(
                    task_id=task_id,
                    updates={
                        "status": TaskStatus.COMPLETED,
                        "result": result,
                    },
                )

                self.memory.store_message(
                    user_id=user_id,
                    role="agent",
                    content=self._format_result(result),
                    metadata={
                        "task_id": task_id,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "status": "completed",
                    },
                )

            except Exception as exc:
                self.memory.update_agent_task(
                    task_id=task_id,
                    updates={
                        "status": TaskStatus.FAILED,
                        "error": str(exc),
                    },
                )

                self.memory.store_message(
                    user_id=user_id,
                    role="agent",
                    content=f"Agent task failed: {str(exc)}",
                    metadata={
                        "task_id": task_id,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "status": "failed",
                    },
                )

    def _format_result(self, result: Dict[str, Any]) -> str:
        t = result.get("type")
        if t == "library_search":
            items = result.get("results", [])
            return "📚 Library results:\n" + "\n".join(f"- {i}" for i in items) if items else "No books found."
        if t == "notice_fetch":
            items = result.get("results", [])
            return "📢 Notices:\n" + "\n".join(f"- {i}" for i in items) if items else "No notices found."
        if t == "erp_request":
            return result.get("message", "ERP request created.")
        return "Agent task completed."
