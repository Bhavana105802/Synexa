import os
import logging
from typing import List

from langchain_core.documents import Document


logger = logging.getLogger(__name__)

MIN_PAGE_CHARS = 30
MIN_TOTAL_CHARS = 100


def load_pdf(file_path: str) -> List[Document]:
    from langchain_community.document_loaders import PyPDFLoader

    print(f"\n{'='*60}")
    print(f"[PDF Loader] Loading: {os.path.basename(file_path)}")
    print(f"{'='*60}")
    logger.info(f"[PDF Loader] Loading: {file_path}")

    documents = []
    try:
        loader = PyPDFLoader(file_path)
        documents = loader.load()
        print(f"[PDF Loader] PyPDFLoader found {len(documents)} page(s)")
    except Exception as e:
        print(f"[PDF Loader] ⚠️  PyPDFLoader failed: {e}")
        print("[PDF Loader] → Skipping to OCR directly")
        logger.warning(f"[PDF Loader] PyPDFLoader failed: {e}")

    if documents:
        total_chars = 0
        empty_pages = 0

        for i, doc in enumerate(documents, start=1):
            page_text = doc.page_content.strip()
            page_chars = len(page_text)
            total_chars += page_chars

            if page_chars < MIN_PAGE_CHARS:
                empty_pages += 1
                print(f"[PDF Loader] Page {i}: ⚠️  {page_chars} chars (too low — likely scanned)")
            else:
                print(f"[PDF Loader] Page {i}: ✅ {page_chars} chars")

        print(f"\n[PDF Loader] Total extracted text: {total_chars} chars")
        print(f"[PDF Loader] Empty/scanned pages : {empty_pages}/{len(documents)}")

        needs_ocr = (total_chars < MIN_TOTAL_CHARS) or (empty_pages > 0)

        if not needs_ocr:
            for doc in documents:
                doc.metadata.setdefault("file_type", "pdf")
                doc.metadata.setdefault("document_name", os.path.basename(file_path))
            print(f"[PDF Loader] ✅ Text extraction sufficient. No OCR needed.")
            logger.info(f"[PDF Loader] Loaded {len(documents)} pages without OCR")
            return documents

        print(f"\n[PDF Loader] ⚠️  Text too sparse. Triggering OCR fallback...")
    else:
        print("[PDF Loader] No documents returned by PyPDFLoader. Triggering OCR.")

    print(f"[PDF Loader] 🔍 Running OCR on: {os.path.basename(file_path)}")
    logger.info("[PDF Loader] Running OCR fallback")

    from app.services.ocr import run_ocr_on_pdf
    ocr_documents = run_ocr_on_pdf(file_path)

    ocr_total = sum(len(d.page_content.strip()) for d in ocr_documents)
    print(f"\n[PDF Loader] OCR complete: {len(ocr_documents)} page(s), {ocr_total} chars")

    if ocr_documents:
        sample = ocr_documents[0].page_content[:500]
        print(f"[PDF Loader] OCR text sample (first 500 chars):\n{'-'*40}")
        print(sample)
        print("-" * 40)

    if not ocr_documents or ocr_total == 0:
        raise ValueError(
            f"Unable to extract text from '{os.path.basename(file_path)}'. "
            "Both normal extraction and OCR produced no readable text. "
            "Check: image quality, Tesseract installation, and file integrity."
        )

    print(f"[PDF Loader] ✅ OCR successful. Returning {len(ocr_documents)} page(s) to pipeline.\n")
    logger.info(f"[PDF Loader] OCR returned {len(ocr_documents)} pages")
    return ocr_documents