# tools/documents/chunker.py

from langchain.text_splitter import RecursiveCharacterTextSplitter


def chunk_documents(docs, chunk_size: int = 500, overlap: int = 50):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=overlap,
    )
    return splitter.split_documents(docs)
