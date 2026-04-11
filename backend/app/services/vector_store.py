import os
import shutil
import logging
from typing import List

from langchain_community.vectorstores import FAISS
from langchain.schema import Document

from app.config import settings
from app.services.embeddings import get_embedding_model

logger = logging.getLogger(__name__)


def _doc_path(user_id: str, document_id: str) -> str:
    path = os.path.join(settings.VECTORSTORE_DIR, user_id, document_id)
    os.makedirs(path, exist_ok=True)
    return path


def _index_exists(user_id: str, document_id: str) -> bool:
    return os.path.exists(
        os.path.join(settings.VECTORSTORE_DIR, user_id, document_id, "index.faiss")
    )


def _flat_index_exists() -> bool:
    return os.path.exists(os.path.join(settings.VECTORSTORE_DIR, "index.faiss"))


def resolve_document_id(user_id: str, document_id: str) -> str:
    if document_id and document_id not in ("default", "", None):
        if _index_exists(user_id, document_id):
            return document_id

    user_dir = os.path.join(settings.VECTORSTORE_DIR, user_id)
    if os.path.isdir(user_dir):
        candidates = []
        for entry in os.scandir(user_dir):
            if entry.is_dir():
                faiss_file = os.path.join(entry.path, "index.faiss")
                if os.path.exists(faiss_file):
                    candidates.append((entry.name, os.path.getmtime(faiss_file)))
        if candidates:
            candidates.sort(key=lambda x: x[1], reverse=True)
            resolved = candidates[0][0]
            logger.info(f"[VS] Resolved '{document_id}' → '{resolved}' (user='{user_id}')")
            return resolved

    if _flat_index_exists():
        logger.info("[VS] Using legacy flat index at vectorstore/index.faiss")
        return "__flat__"

    return document_id


def add_documents_to_vectorstore(
    chunks: List[Document],
    user_id: str = "default",
    document_id: str = "default",
) -> int:
    embeddings = get_embedding_model()
    path = _doc_path(user_id, document_id)
    logger.info(f"[VS] Creating index user='{user_id}' doc='{document_id}'")
    store = FAISS.from_documents(chunks, embeddings)
    store.save_local(path)
    total = store.index.ntotal
    logger.info(f"[VS] Saved {total} vectors → {path}")
    return total


def load_vectorstore(
    user_id: str = "default",
    document_id: str = "default",
) -> FAISS:
    document_id = resolve_document_id(user_id, document_id)

    if document_id == "__flat__":
        embeddings = get_embedding_model()
        store = FAISS.load_local(
            settings.VECTORSTORE_DIR,
            embeddings,
            allow_dangerous_deserialization=True,
        )
        logger.info("[VS] Loaded legacy flat index")
        return store

    if not _index_exists(user_id, document_id):
        raise FileNotFoundError(
            f"No index found for document '{document_id}' (user='{user_id}'). "
            "Please upload a document first via POST /upload."
        )

    embeddings = get_embedding_model()
    path = _doc_path(user_id, document_id)
    store = FAISS.load_local(
        path, embeddings, allow_dangerous_deserialization=True
    )
    logger.info(f"[VS] Loaded index user='{user_id}' doc='{document_id}'")
    return store


def delete_document_index(user_id: str, document_id: str) -> bool:
    path = os.path.join(settings.VECTORSTORE_DIR, user_id, document_id)
    if os.path.exists(path):
        shutil.rmtree(path)
        logger.info(f"[VS] Deleted user='{user_id}' doc='{document_id}'")
        return True
    return False