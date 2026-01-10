from pydantic import BaseModel

class LLMConfig(BaseModel):
    provider: str
    model_id: str
    temperature: float = 0.2
    max_tokens: int = 1024

class EmbeddingConfig(BaseModel):
    provider: str = "huggingface"
    model_id: str = "sentence-transformers/all-MiniLM-L6-v2"

    