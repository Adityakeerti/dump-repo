# tools/documents/loaders.py

from langchain.document_loaders import PyPDFLoader, TextLoader


def load_document(path: str):
    if path.endswith(".pdf"):
        return PyPDFLoader(path).load()

    return TextLoader(path).load()
