import os
import uuid
import logging

from app.services.file_loader import SUPPORTED_EXTENSIONS, get_file_type

logger = logging.getLogger(__name__)


def save_upload_file(upload_file_bytes: bytes, filename: str, documents_dir: str) -> tuple:
    os.makedirs(documents_dir, exist_ok=True)

    unique_prefix = str(uuid.uuid4())[:8]
    safe_filename = f"{unique_prefix}_{filename}"
    file_path = os.path.join(documents_dir, safe_filename)

    with open(file_path, "wb") as f:
        f.write(upload_file_bytes)

    logger.info(f"Saved uploaded file: {file_path}")
    return file_path, filename


def validate_file_extension(filename: str) -> bool:
    return get_file_type(filename) is not None


def validate_pdf_extension(filename: str) -> bool:
    return validate_file_extension(filename)


def get_supported_extensions_str() -> str:
    return ", ".join(SUPPORTED_EXTENSIONS.keys())