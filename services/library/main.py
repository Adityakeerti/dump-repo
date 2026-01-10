from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import library
from database import engine, Base

# Create tables if they don't exist (helpful for local dev, though schema is already there)
# Base.metadata.create_all(bind=engine)

app = FastAPI(title="Library Management Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(library.router, prefix="/api/library", tags=["library"])

@app.get("/")
def read_root():
    return {"message": "Library Management Service is running"}
