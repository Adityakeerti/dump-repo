# memory/vector/chroma.py

from typing import List
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
import os
import shutil

from config.settings import settings


class ChromaVectorStore:
    """
    Thin wrapper around Chroma vector store.
    """

    def __init__(self, path: str | None = None):
        self.path = path or settings.vector_path
        self._store = None
        self._embeddings = None

    @property
    def embeddings(self):
        """Lazy load embeddings"""
        if self._embeddings is None:
            self._embeddings = HuggingFaceEmbeddings(
                model_name="sentence-transformers/all-MiniLM-L6-v2"
            )
        return self._embeddings

    @property
    def store(self):
        """Lazy load Chroma store with error handling"""
        if self._store is None:
            try:
                self._store = Chroma(
                    persist_directory=self.path,
                    embedding_function=self.embeddings,
                )
            except (KeyError, Exception) as e:
                # If database is corrupted, delete it and recreate
                if os.path.exists(self.path):
                    print(f"Warning: ChromaDB database corrupted, recreating at {self.path}")
                    try:
                        shutil.rmtree(self.path)
                    except Exception:
                        pass
                    # Also try to remove SQLite file if exists
                    sqlite_path = os.path.join(self.path, "chroma.sqlite3")
                    if os.path.exists(sqlite_path):
                        try:
                            os.remove(sqlite_path)
                        except Exception:
                            pass
                
                # Recreate with fresh database
                self._store = Chroma(
                    persist_directory=self.path,
                    embedding_function=self.embeddings,
                )
        return self._store

    def similarity_search(self, query: str, k: int = 5) -> List[str]:
        docs = self.store.similarity_search(query, k=k)
        return [doc.page_content for doc in docs]

    def add_texts(self, texts: List[str], metadatas: List[dict] | None = None):
        self.store.add_texts(texts=texts, metadatas=metadatas or [])
        self.store.persist()
