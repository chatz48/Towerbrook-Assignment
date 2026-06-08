from fastapi import UploadFile
from pypdf import PdfReader
from io import BytesIO


async def parse_upload(file: UploadFile | None, text: str | None) -> tuple[str, str | None]:
    parts = [text or ""]
    title = None
    if file:
        title = file.filename
        raw = await file.read()
        if file.filename.lower().endswith(".pdf"):
            reader = PdfReader(BytesIO(raw))
            parts.append("\n".join(page.extract_text() or "" for page in reader.pages))
        else:
            parts.append(raw.decode("utf-8", errors="ignore"))
    return "\n\n".join(part for part in parts if part), title
