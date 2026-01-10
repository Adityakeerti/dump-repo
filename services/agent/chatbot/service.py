# chatbot/service.py

from typing import Dict, List
from datetime import datetime, timezone

from memory.interface import MemoryPort
from memory.vector.chroma import ChromaVectorStore
from config.settings import settings

# LangChain
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI


class ChatbotService:
    """
    Stable Gemini-powered chatbot with simple RAG.
    Vector store returns plain text chunks (str).
    """

    def __init__(self, memory: MemoryPort):
        self.memory = memory

        # -------------------------
        # Gemini LLM
        # -------------------------
        self.llm = ChatGoogleGenerativeAI(
            model=settings.gemini_model_id,
            google_api_key=settings.google_api_key,
            temperature=0.2,
        )

        # -------------------------
        # Vector Store (RAG) - Using FAISS
        # -------------------------
        from memory.vector.faiss_store import FAISSVectorStore
        self.vector_store = FAISSVectorStore(
            path=settings.vector_path
        )

        # -------------------------
        # Prompt + Chain
        # -------------------------
        self.prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You are an AI assistant. Use CONTEXT if relevant. "
                    "If context is insufficient, answer normally.",
                ),
                (
                    "human",
                    "QUESTION:\n{question}\n\nCONTEXT:\n{context}",
                ),
            ]
        )

        self.chain = self.prompt | self.llm | StrOutputParser()

    # --------------------------------------------------
    # RAG helpers
    # --------------------------------------------------
    def retrieve_chunks(self, query: str, k: int = 5) -> List[str]:
        """
        Public RAG retrieval helper (returns raw text chunks).
        """
        if not self.vector_store:
            return []

        # similarity_search RETURNS List[str]
        return self.vector_store.similarity_search(query, k=k)

    # --------------------------------------------------
    # Main chat entry
    # --------------------------------------------------
    def handle_message(
        self,
        user_id: str,
        message: str,
        user_context: Dict,
    ) -> Dict:
        """
        Main chatbot entry point.
        """

        # ---- RAG retrieval (with graceful fallback) ----
        chunks: List[str] = []
        try:
            chunks = self.vector_store.similarity_search(
                message,
                k=5,
            )
        except Exception as e:
            # ChromaDB error - continue without RAG
            import logging
            logging.warning(f"Vector store error (continuing without RAG): {str(e)}")
            chunks = []

        context = "\n\n".join(chunks) if chunks else "No relevant context."

        # ---- LLM call ----
        answer = self.chain.invoke(
            {
                "question": message,
                "context": context,
            }
        )

        # ---- Persist chatbot response ----
        self.memory.store_message(
            user_id=user_id,
            role="chatbot",
            content=answer,
            metadata={
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "rag_used": bool(chunks),
            },
        )

        return {
            "answer": answer,
            "rag_used": bool(chunks),
            "chunks": chunks,
        }
