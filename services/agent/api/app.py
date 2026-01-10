# api/app.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.chat import router as chat_router
from api.routes.ingest import router as ingest_router
from api.routes.diagnostics import router as diagnostics_router
from api.routes.rag_debug import router as rag_router

from memory.mongo.client import MongoClientProvider
from config.settings import settings

from api.routes.chat import set_memory_backend as chat_set_memory
from api.routes.diagnostics import set_memory_backend as diag_set_memory
from api.routes.rag_debug import set_memory_backend as rag_set_memory


def create_app() -> FastAPI:
    import logging
    logging.basicConfig(level=logging.INFO)
    
    app = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
    )

    # -------------------------
    # CORS Middleware
    # -------------------------
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # In production, specify exact origins
        allow_credentials=True,
        allow_methods=["*"],  # Allows all methods including OPTIONS
        allow_headers=["*"],  # Allows all headers including Authorization
    )

    # -------------------------
    # Memory backend (shared)
    # -------------------------
    memory = MongoClientProvider(
        uri=settings.mongo_uri,
        db_name=settings.mongo_db,
    )

    # Inject memory into routes
    chat_set_memory(memory)
    diag_set_memory(memory)
    rag_set_memory(memory)

    # -------------------------
    # Routers
    # -------------------------
    app.include_router(chat_router, prefix="/chat", tags=["chat"])
    app.include_router(ingest_router, prefix="/documents", tags=["documents"])
    app.include_router(diagnostics_router, tags=["diagnostics"])
    app.include_router(rag_router, tags=["rag"])

    return app


app = create_app()
