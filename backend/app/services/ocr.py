import logging
import os
from typing import List

from langchain_core.documents import Document


logger = logging.getLogger(__name__)

MIN_CHARS_PER_PAGE = 30
MIN_TOTAL_CHARS = 100
OCR_DPI = 300


def _tesseract_available() -> bool:
    try:
        import pytesseract
        version = pytesseract.get_tesseract_version()
        print(f"[OCR] ✅ Tesseract version: {version}")
        return True
    except Exception as e:
        print(f"[OCR] ❌ Tesseract not found: {e}")
        return False


def _opencv_available() -> bool:
    try:
        import cv2
        return True
    except ImportError:
        return False


def _preprocess_image(pil_image):
    from PIL import Image, ImageEnhance, ImageFilter
    import numpy as np

    gray = pil_image.convert("L")

    w, h = gray.size
    if w < 1000 or h < 1000:
        scale = max(1000 / w, 1000 / h)
        new_w, new_h = int(w * scale), int(h * scale)
        gray = gray.resize((new_w, new_h), Image.LANCZOS)
        print(f"[OCR] 📐 Upscaled image from {w}×{h} to {new_w}×{new_h}")

    gray = ImageEnhance.Contrast(gray).enhance(2.0)

    if _opencv_available():
        import cv2
        img_array = np.array(gray)

        binary = cv2.adaptiveThreshold(
            img_array,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            blockSize=31,
            C=10
        )

        denoised = cv2.fastNlMeansDenoising(binary, h=10)
        result = Image.fromarray(denoised)
        print("[OCR] 🔧 Preprocessing: OpenCV adaptive threshold applied")
    else:
        sharpened = gray.filter(ImageFilter.SHARPEN)
        result = sharpened.point(lambda x: 0 if x < 140 else 255, "1").convert("L")
        print("[OCR] 🔧 Preprocessing: Pillow threshold applied (install opencv-python for better results)")

    return result


def _ocr_single_image(pil_image, page_num: int) -> str:
    import pytesseract

    preprocessed = _preprocess_image(pil_image)

    results = []
    for psm in (6, 11):
        config = f"--oem 3 --psm {psm}"
        try:
            text = pytesseract.image_to_string(preprocessed, lang="eng", config=config)
            results.append(text.strip())
        except Exception as e:
            logger.warning(f"[OCR] PSM {psm} failed on page {page_num}: {e}")

    best = max(results, key=len) if results else ""
    print(f"[OCR] Page {page_num}: extracted {len(best)} chars")
    if best:
        print(f"[OCR] Page {page_num} sample: {best[:200]!r}")
    else:
        print(f"[OCR] ⚠️  Page {page_num}: no text extracted")
    return best


def run_ocr_on_pdf(file_path: str) -> List[Document]:
    try:
        from pdf2image import convert_from_path
        import pytesseract
    except ImportError as e:
        raise ImportError(
            f"OCR dependencies missing: {e}. "
            "Run: pip install pdf2image pytesseract pillow"
        ) from e

    if not _tesseract_available():
        raise RuntimeError(
            "Tesseract OCR binary not found.\n"
            "  Ubuntu/Debian : sudo apt-get install tesseract-ocr\n"
            "  macOS         : brew install tesseract\n"
            "  Windows       : https://github.com/UB-Mannheim/tesseract/wiki"
        )

    print(f"[OCR] 🚀 Starting OCR pipeline on: {file_path}")
    logger.info(f"[OCR] Starting OCR on PDF: {file_path}")

    try:
        images = convert_from_path(
            file_path,
            dpi=OCR_DPI,
            fmt="png",
            thread_count=2,
        )
        print(f"[OCR] 📄 Converted PDF to {len(images)} image(s) at {OCR_DPI} DPI")
    except Exception as e:
        raise RuntimeError(
            f"[OCR] Failed to convert PDF to images: {e}\n"
            "Make sure poppler is installed:\n"
            "  Ubuntu/Debian : sudo apt-get install poppler-utils\n"
            "  macOS         : brew install poppler"
        ) from e

    documents = []
    total_chars = 0

    for page_num, image in enumerate(images, start=1):
        text = _ocr_single_image(image, page_num)

        if len(text) >= MIN_CHARS_PER_PAGE:
            total_chars += len(text)
            doc = Document(
                page_content=text,
                metadata={
                    "source": file_path,
                    "page": page_num - 1,
                    "file_type": "pdf_ocr",
                    "document_name": os.path.basename(file_path),
                }
            )
            documents.append(doc)
        else:
            print(f"[OCR] ⚠️  Page {page_num} skipped (too little text: {len(text)} chars)")

    print(f"[OCR] ✅ Done. Pages with usable text: {len(documents)}/{len(images)}")
    print(f"[OCR] Total characters extracted: {total_chars}")
    logger.info(
        f"[OCR] Completed: {len(documents)}/{len(images)} pages, "
        f"{total_chars} total chars"
    )

    if not documents:
        raise ValueError(
            "Unable to extract text from document. "
            "OCR produced no readable text across all pages. "
            "Possible causes: very low image quality, non-English script "
            "(try installing tesseract language packs), or completely blank pages."
        )

    return documents


def run_ocr_on_image(file_path: str) -> List[Document]:
    try:
        import pytesseract
        from PIL import Image
    except ImportError as e:
        raise ImportError(
            f"OCR dependencies missing: {e}. "
            "Run: pip install pytesseract pillow"
        ) from e

    if not _tesseract_available():
        raise RuntimeError(
            "Tesseract OCR binary not found.\n"
            "  Ubuntu/Debian : sudo apt-get install tesseract-ocr"
        )

    print(f"[OCR] 🖼️  Running OCR on image: {file_path}")
    logger.info(f"[OCR] OCR on image: {file_path}")

    try:
        pil_image = Image.open(file_path)
    except Exception as e:
        raise RuntimeError(f"[OCR] Cannot open image '{file_path}': {e}") from e

    text = _ocr_single_image(pil_image, page_num=1)

    if len(text) < MIN_CHARS_PER_PAGE:
        raise ValueError(
            f"Unable to extract text from image '{os.path.basename(file_path)}'. "
            f"OCR returned only {len(text)} characters. "
            "The image may be too blurry, too small, or have no readable text."
        )

    doc = Document(
        page_content=text,
        metadata={
            "source": file_path,
            "page": 0,
            "file_type": "image_ocr",
            "document_name": os.path.basename(file_path),
        }
    )
    logger.info(f"[OCR] Image done: {len(text)} chars")
    return [doc]


def needs_ocr(documents: List[Document], threshold: int = MIN_TOTAL_CHARS) -> bool:
    texts = [d.page_content.strip() for d in documents]
    total = sum(len(t) for t in texts)
    empty_pages = sum(1 for t in texts if len(t) < MIN_CHARS_PER_PAGE)

    print(f"[OCR] Text extraction check: total={total} chars, "
          f"empty_pages={empty_pages}/{len(documents)}")

    if total < threshold:
        print(f"[OCR] ⚠️  Total text ({total}) < threshold ({threshold}). OCR needed.")
        logger.info(f"[OCR] needs_ocr=True: total {total} < {threshold}")
        return True

    if empty_pages > 0:
        print(f"[OCR] ⚠️  {empty_pages} page(s) have < {MIN_CHARS_PER_PAGE} chars. OCR needed.")
        logger.info(f"[OCR] needs_ocr=True: {empty_pages} near-empty pages")
        return True

    print(f"[OCR] ✅ Text extraction OK: {total} chars across {len(documents)} page(s). No OCR needed.")
    return False