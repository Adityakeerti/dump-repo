# orchestration/mode_switch.py

from typing import Dict, Any, TypedDict

from langgraph.graph import StateGraph, END

from orchestration.intent_classifier import classify_intent, IntentType
from chatbot.service import ChatbotService
from agent.service import AgentService


# -------------------------
# Graph State
# -------------------------

class ChatState(TypedDict):
    user_id: str
    message: str
    user_context: Dict[str, Any]
    intent: str | None
    response: str | None
    task_created: bool | None


# -------------------------
# Node functions
# -------------------------

def classify_node(state: ChatState) -> ChatState:
    intent = classify_intent(
        user_input=state["message"],
        user_context=state.get("user_context", {}),
    )
    state["intent"] = intent
    return state


def chat_node(chatbot: ChatbotService):
    def _node(state: ChatState) -> ChatState:
        response = chatbot.handle_message(
            user_id=state["user_id"],
            message=state["message"],
            user_context=state.get("user_context", {}),
        )
        state["response"] = response
        state["task_created"] = False
        return state
    return _node


def agent_node(agent: AgentService):
    def _node(state: ChatState) -> ChatState:
        # AgentService already polls; here we just acknowledge task creation
        state["task_created"] = True
        state["response"] = "Agent task created and queued."
        return state
    return _node


# -------------------------
# Graph factory
# -------------------------

def build_graph(chatbot: ChatbotService, agent: AgentService):
    graph = StateGraph(ChatState)

    graph.add_node("classify", classify_node)
    graph.add_node("chat", chat_node(chatbot))
    graph.add_node("agent", agent_node(agent))

    graph.set_entry_point("classify")

    graph.add_conditional_edges(
        "classify",
        lambda s: s["intent"],
        {
            IntentType.CHAT: "chat",
            IntentType.AGENT: "agent",
        },
    )

    graph.add_edge("chat", END)
    graph.add_edge("agent", END)

    return graph.compile()
