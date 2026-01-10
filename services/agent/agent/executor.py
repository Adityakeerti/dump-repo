# agent/executor.py

from typing import Dict, Any

from agent.tasks.notice_tasks import handle_notice_fetch
from agent.tasks.library_tasks import handle_library_search
from agent.tasks.erp_tasks import handle_erp_request


class AgentExecutor:
    """
    Executes a planned task by dispatching to task handlers.
    """

    def execute(self, task_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        if task_type == "notice_fetch":
            return handle_notice_fetch(payload)

        if task_type == "library_search":
            return handle_library_search(payload)

        if task_type == "erp_request":
            return handle_erp_request(payload)

        return {
            "message": "No-op generic action executed",
            "payload": payload,
        }
