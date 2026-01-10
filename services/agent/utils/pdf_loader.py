# utils/pdf_loader.py
import pdfplumber

def extract_text_from_pdf(path: str) -> str:
    pages = []

    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages.append(text)

    return "\n".join(pages)
