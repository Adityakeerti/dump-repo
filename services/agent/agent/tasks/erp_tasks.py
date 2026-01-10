# agent/tasks/erp_tasks.py

from typing import Dict, Any


def handle_erp_request(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Agent task: create ERP request (no execution here).
    """

    return {
        "type": "erp_request",
        "status": "created",
        "payload": payload,
        "message": "ERP request created and sent for approval.",
    }
