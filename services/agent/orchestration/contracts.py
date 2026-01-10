# orchestration/contracts.py

from abc import ABC, abstractmethod
from typing import Dict, Any


class OrchestrationEngine(ABC):
    """
    Safe abstraction layer between:
    - LangChain
    - LangGraph

    API, services, and memory depend ONLY on this contract.
    """

    @abstractmethod
    def run(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        pass
