# orchestration/intent_classifier.py

from enum import Enum
from typing import Dict


class IntentType(str, Enum):
    CHAT = "chat"
    AGENT = "agent"


def classify_intent(user_input: str, user_context: Dict) -> IntentType:
    """
    Deterministic intent classifier.

    Rules only.
    No ML.
    No LLM.
    """

    text = user_input.lower()

    agent_keywords = [
        "fetch",
        "find",
        "search",
        "load",
        "request",
        "change",
        "update",
        "submit",
    ]

    for word in agent_keywords:
        if word in text:
            return IntentType.AGENT

    return IntentType.CHAT
