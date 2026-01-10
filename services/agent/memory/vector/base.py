# memory/vector/base.py

from abc import ABC, abstractmethod
from typing import List


class VectorStorePort(ABC):
    """
    Abstract vector store contract.
    """

    @abstractmethod
    def add_texts(self, texts: List[str], metadatas: List[dict]) -> None:
        pass

    @abstractmethod
    def similarity_search(self, query: str, k: int = 5) -> List[str]:
        pass
