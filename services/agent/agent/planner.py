# agent/planner.py

from typing import Dict
from agent.tasks.base import TaskStatus


class AgentPlanner:
    """
    Turns a natural-language intent into a concrete plan.
    """

    def plan(self, intent: str, payload: Dict) -> Dict:
        """
        Returns a plan dict with a task_type and normalized payload.
        Deterministic rules only (no LLM here).
        """

        text = intent.lower()

        if "notice" in text:
            return {
                "task_type": "notice_fetch",
                "payload": payload,
            }

        if "library" in text or "book" in text:
            return {
                "task_type": "library_search",
                "payload": payload,
            }

        if "change" in text or "update" in text:
            return {
                "task_type": "erp_request",
                "payload": payload,
            }

        return {
            "task_type": "generic_action",
            "payload": payload,
        }
