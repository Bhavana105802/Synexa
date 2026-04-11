import logging
import os
import shutil
import subprocess
from pathlib import Path

from typing import Optional

logger = logging.getLogger(__name__)

CONVERTIBLE_EXTENSIONS = {".docx", ".doc", ".txt", ".rtf", ".odt"}

_SOFFICE_CANDIDATES = [
    "soffice",
    "/usr/bin/soffice",
    "/usr/lib/libreoffice/program/soffice",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
]


def is_convertible(filename: str) -> bool:
    return Path(filename).suffix.lower() in CONVERTIBLE_EXTENSIONS


def _find_soffice() -> Optional[str]:
    for candidate in _SOFFICE_CANDIDATES:
        if shutil.which(candidate) or os.path.isfile(candidate):
            return candidate
    return None


def _txt_to_pdf(input_path: str, output_dir: str) -> str:
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.platypus import Paragraph, SimpleDocTemplate
        from reportlab.lib.enums import TA_LEFT
        from reportlab.lib.styles import ParagraphStyle
    except ImportError:
        raise RuntimeError(
            "reportlab is required for TXT→PDF conversion.\n"
            "Install it with:  pip install reportlab"
        )

    os.makedirs(output_dir, exist_ok=True)
    pdf_path = os.path.join(output_dir, Path(input_path).stem + ".pdf")

    if os.path.isfile(pdf_path):
        logger.info(f"[Converter] Cache hit (TXT): {pdf_path}")
        return pdf_path

    with open(input_path, "r", encoding="utf-8", errors="replace") as f:
        raw_text = f.read()

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=20 * mm, bottomMargin=20 * mm,
    )

    mono = ParagraphStyle(
        name="Mono",
        fontName="Courier",
        fontSize=9,
        leading=13,
        alignment=TA_LEFT,
        wordWrap="LTR",
    )

    story = []
    for line in raw_text.splitlines():
        safe = (
            line
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            or " "
        )
        story.append(Paragraph(safe, mono))

    doc.build(story)
    logger.info(f"[Converter] ✅ TXT→PDF: {pdf_path} ({os.path.getsize(pdf_path)//1024} KB)")
    return pdf_path


def _docx_to_pdf_libreoffice(input_path: str, output_dir: str) -> str:
    soffice = _find_soffice()
    if not soffice:
        raise RuntimeError(
            "LibreOffice not found.\n"
            "  Ubuntu/Debian: sudo apt install libreoffice\n"
            "  macOS:         brew install --cask libreoffice"
        )

    os.makedirs(output_dir, exist_ok=True)
    pdf_path = os.path.join(output_dir, Path(input_path).stem + ".pdf")

    if os.path.isfile(pdf_path):
        logger.info(f"[Converter] Cache hit (DOCX): {pdf_path}")
        return pdf_path

    cmd = [
        soffice, "--headless", "--norestore", "--nofirststartwizard",
        "--convert-to", "pdf", "--outdir", output_dir, input_path,
    ]
    logger.info(f"[Converter] LibreOffice: {' '.join(cmd)}")

    try:
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
    except subprocess.TimeoutExpired:
        raise RuntimeError(f"LibreOffice timed out for: {input_path}")

    if result.returncode != 0:
        stderr = result.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"LibreOffice exit {result.returncode}: {stderr}")

    if not os.path.isfile(pdf_path):
        candidates = list(Path(output_dir).glob("*.pdf"))
        if candidates:
            pdf_path = str(candidates[-1])
        else:
            raise RuntimeError(f"LibreOffice ran OK but no PDF found in {output_dir}")

    logger.info(f"[Converter] ✅ DOCX→PDF: {pdf_path}")
    return pdf_path


def convert_to_pdf(input_path: str, output_dir: str) -> str:
    ext = Path(input_path).suffix.lower()
    if ext == ".txt":
        return _txt_to_pdf(input_path, output_dir)
    return _docx_to_pdf_libreoffice(input_path, output_dir)