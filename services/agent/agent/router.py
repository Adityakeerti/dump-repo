# agent/router.py

from typing import Dict, Any

from agent.planner import AgentPlanner
from agent.executor import AgentExecutor


class AgentRouter:
    """
    High-level agent routing:
    intent -> plan -> execute
    """

    def __init__(self):
        self.planner = AgentPlanner()
        self.executor = AgentExecutor()

    def run(self, intent: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        plan = self.planner.plan(intent, payload)
        return self.executor.execute(
            task_type=plan["task_type"],
            payload=plan["payload"],
        )
