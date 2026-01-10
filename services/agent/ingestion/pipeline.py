# ingestion/pipeline.py

from tools.documents.loaders import load_document
from tools.documents.chunker import chunk_documents
from tools.documents.embeddings import embed_and_store
from memory.vector.chroma import ChromaVectorStore


def ingest_document(path: str, metadata: dict):
    docs = load_document(path)
    chunks = chunk_documents(docs)

    vector_store = ChromaVectorStore()
    embed_and_store(chunks, vector_store, metadata)
