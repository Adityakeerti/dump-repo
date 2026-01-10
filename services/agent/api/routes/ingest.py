# api/routes/ingest.py

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
import tempfile
import os

from utils.pdf_loader import extract_text_from_pdf
from utils.chunking import chunk_text
from memory.vector.chroma import ChromaVectorStore
from api.dependencies import extract_user_context, UserContext
from config.settings import load_permissions
from datetime import datetime, timezone

router = APIRouter()
vector_store = ChromaVectorStore()

# Roles allowed to ingest documents (admin and moderator only)
ALLOWED_INGEST_ROLES = {"ADMIN", "MODERATOR", "FACULTY"}


@router.post("/ingest")
async def ingest_document(
    file: UploadFile = File(...),
    user: UserContext = Depends(extract_user_context)
):
    """
    Correct document ingestion:
    PDF → text → chunks → vector DB
    
    Requires authentication and admin/moderator/faculty role.
    """
    
    # Check role permissions
    if user.role not in ALLOWED_INGEST_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Document ingestion requires ADMIN, MODERATOR, or FACULTY role. Current role: {user.role}"
        )

    # 1. Save PDF temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        # 2. Extract real text (THIS was missing)
        text = extract_text_from_pdf(tmp_path)

        if not text.strip():
            return {"status": "error", "reason": "No extractable text"}

        # 3. Chunk text
        chunks = chunk_text(text)

        # 4. Store vectors (ONLY this, nothing else)
        vector_store.add_texts(
            texts=chunks,
            metadatas=[{
                "source": file.filename,
                "uploaded_by": user.user_id,
                "uploaded_by_role": user.role,
                "uploaded_at": datetime.now(timezone.utc).isoformat()
            }] * len(chunks),
        )

        return {
            "status": "ingested",
            "chunks": len(chunks),
            "filename": file.filename,
        }

    finally:
        os.remove(tmp_path)
