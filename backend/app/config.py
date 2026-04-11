import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "openai")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
    HF_MODEL_ID: str = os.getenv("HF_MODEL_ID", "mistralai/Mistral-7B-Instruct-v0.1")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3")

    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB_NAME: str = os.getenv("MONGO_DB_NAME", "synexa_db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "change-me")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", 1440))

    DOCUMENTS_DIR: str = os.getenv("DOCUMENTS_DIR", "data/documents")
    VECTORSTORE_DIR: str = os.getenv("VECTORSTORE_DIR", "vectorstore")

    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", 800))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", 150))

    TOP_K_RESULTS: int = int(os.getenv("TOP_K_RESULTS", 7))

    OCR_MIN_CHARS: int = int(os.getenv("OCR_MIN_CHARS", 50))


settings = Settings()