# tools/documents/embeddings.py

from typing import List
from memory.vector.base import VectorStorePort


def embed_and_store(
    chunks,
    vector_store: VectorStorePort,
    metadata: dict,
):
    texts = [c.page_content for c in chunks]
    metadatas = [{**metadata} for _ in texts]

    vector_store.add_texts(texts, metadatas)
