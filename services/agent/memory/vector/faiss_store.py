# memory/vector/faiss_store.py

"""
FAISS Vector Store - Reliable alternative to ChromaDB
No corruption issues, faster similarity search
"""

from typing import List, Dict, Any
import os
import pickle
import logging

from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

logger = logging.getLogger(__name__)


class FAISSVectorStore:
    """
    FAISS-based vector store for RAG.
    More reliable than ChromaDB, no corruption issues.
    """
    
    def __init__(self, path: str = "./vector_store"):
        """
        Initialize FAISS vector store.
        
        Args:
            path: Directory to store FAISS index
        """
        self.path = path
        self._embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        self._store = None
        self._load_or_create()
    
    def _load_or_create(self):
        """Load existing FAISS index or create new one."""
        index_path = os.path.join(self.path, "index.faiss")
        
        if os.path.exists(index_path):
            try:
                logger.info(f"Loading existing FAISS index from {self.path}")
                self._store = FAISS.load_local(
                    self.path,
                    self._embeddings,
                    allow_dangerous_deserialization=True
                )
                logger.info("✅ FAISS index loaded successfully")
            except Exception as e:
                logger.warning(f"Failed to load index: {e}. Creating new one.")
                self._store = None
        
        if self._store is None:
            logger.info("Creating new FAISS index")
            # Create empty index with dummy document
            dummy_doc = Document(page_content="initialization", metadata={"type": "dummy"})
            self._store = FAISS.from_documents([dummy_doc], self._embeddings)
            self._save()
    
    def _save(self):
        """Persist FAISS index to disk."""
        try:
            os.makedirs(self.path, exist_ok=True)
            self._store.save_local(self.path)
            logger.debug(f"FAISS index saved to {self.path}")
        except Exception as e:
            logger.error(f"Failed to save FAISS index: {e}")
    
    def add_texts(self, texts: List[str], metadatas: List[Dict[str, Any]] = None) -> None:
        """
        Add text chunks to vector store.
        
        Args:
            texts: List of text strings to embed and store
            metadatas: Optional metadata for each text
        """
        if not texts:
            return
        
        try:
            # Convert to Documents
            documents = [
                Document(page_content=text, metadata=meta or {})
                for text, meta in zip(texts, metadatas or [{}] * len(texts))
            ]
            
            # Add to FAISS
            self._store.add_documents(documents)
            
            # Save after adding
            self._save()
            
            logger.info(f"✅ Added {len(texts)} texts to FAISS vector store")
            
        except Exception as e:
            logger.error(f"Failed to add texts to FAISS: {e}")
            raise
    
    def similarity_search(self, query: str, k: int = 5) -> List[str]:
        """
        Search for similar documents.
        
        Args:
            query: Search query
            k: Number of results to return
            
        Returns:
            List of text content from matching documents
        """
        try:
            # Perform similarity search
            docs = self._store.similarity_search(query, k=k)
            
            # Filter out dummy initialization document
            results = [
                doc.page_content 
                for doc in docs 
                if doc.metadata.get("type") != "dummy"
            ]
            
            return results
            
        except Exception as e:
            logger.error(f"Similarity search failed: {e}")
            return []
    
    def clear(self):
        """Clear all vectors from store."""
        try:
            # Recreate empty store
            dummy_doc = Document(page_content="initialization", metadata={"type": "dummy"})
            self._store = FAISS.from_documents([dummy_doc], self._embeddings)
            self._save()
            logger.info("✅ FAISS store cleared")
        except Exception as e:
            logger.error(f"Failed to clear FAISS store: {e}")
