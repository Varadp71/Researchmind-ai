"""
PDF Processing Service - PyMuPDF-based extraction pipeline
"""
import os
import re
import uuid
import logging
from pathlib import Path
from typing import Optional

import pymupdf
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.paper import Paper, PaperChunk, PaperStatus
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Default chunk parameters
CHUNK_SIZE = 512  # tokens approx (words as rough proxy)
CHUNK_OVERLAP = 50


def ensure_upload_dir():
    """Create upload directory if it doesn't exist."""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


def clean_text(text: str) -> str:
    """Clean extracted text: normalize whitespace, remove control chars."""
    # Remove null bytes and control characters (keep newlines/tabs)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    # Normalize multiple spaces
    text = re.sub(r' {2,}', ' ', text)
    # Normalize multiple newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def extract_metadata_from_text(text: str, filename: str) -> dict:
    """Try to extract title, authors, year from the first page text."""
    lines = [l.strip() for l in text[:3000].split('\n') if l.strip()]
    
    metadata = {
        "title": filename.replace('.pdf', '').replace('_', ' ').replace('-', ' '),
        "authors": None,
        "year": None,
        "abstract": None,
    }

    # Try to find title (usually one of the first non-trivial lines)
    for line in lines[:10]:
        if len(line) > 15 and len(line) < 300 and not line.startswith(('http', 'www', 'doi')):
            metadata["title"] = line
            break

    # Try to find year
    year_match = re.search(r'(20[0-2]\d|19[89]\d)', text[:5000])
    if year_match:
        metadata["year"] = int(year_match.group(1))

    # Try to find abstract
    abstract_match = re.search(
        r'(?i)abstract[:\s.\-—]*\n?(.*?)(?:\n\n|keywords|introduction|1[\.\s])',
        text[:5000],
        re.DOTALL,
    )
    if abstract_match:
        abstract = clean_text(abstract_match.group(1))
        if len(abstract) > 50:
            metadata["abstract"] = abstract[:2000]

    return metadata


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[dict]:
    """
    Split text into overlapping chunks.
    Returns list of {text, start_idx, word_count}.
    """
    words = text.split()
    if not words:
        return []

    chunks = []
    i = 0
    idx = 0
    while i < len(words):
        end = min(i + chunk_size, len(words))
        chunk_words = words[i:end]
        chunk_text = ' '.join(chunk_words)
        chunks.append({
            "text": chunk_text,
            "index": idx,
            "word_count": len(chunk_words),
        })
        idx += 1
        i += chunk_size - overlap
        if end >= len(words):
            break

    return chunks


async def process_pdf(paper_id: uuid.UUID, db: AsyncSession) -> Paper:
    """
    Full PDF processing pipeline:
    1. Open PDF with PyMuPDF
    2. Extract text page by page
    3. Extract metadata
    4. Clean text
    5. Chunk text
    6. Store chunks in database
    """
    # Get paper record
    result = await db.execute(select(Paper).where(Paper.id == paper_id))
    paper = result.scalar_one_or_none()
    if not paper:
        raise ValueError(f"Paper {paper_id} not found")

    try:
        # Update status
        paper.status = PaperStatus.EXTRACTING.value
        paper.status_message = "Extracting text from PDF..."
        await db.commit()

        filepath = paper.filepath
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"PDF file not found: {filepath}")

        # Open and extract with PyMuPDF
        doc = pymupdf.open(filepath)
        paper.page_count = len(doc)

        # Extract text page by page
        full_text = ""
        page_texts = []
        for page_num, page in enumerate(doc):
            page_text = page.get_text("text")
            page_texts.append({"page": page_num + 1, "text": page_text})
            full_text += page_text + "\n\n"

        doc.close()

        if not full_text.strip():
            paper.status = PaperStatus.FAILED.value
            paper.status_message = "No text could be extracted from PDF (possibly scanned/image-based)"
            await db.commit()
            return paper

        # Clean text
        full_text = clean_text(full_text)
        paper.full_text = full_text

        # Extract metadata
        metadata = extract_metadata_from_text(full_text, paper.filename)
        if metadata["title"] and paper.title == paper.filename:
            paper.title = metadata["title"]
        if metadata["authors"]:
            paper.authors = metadata["authors"]
        if metadata["year"]:
            paper.year = metadata["year"]
        if metadata["abstract"]:
            paper.abstract = metadata["abstract"]
        paper.metadata_json = metadata

        # Chunk text
        chunks = chunk_text(full_text)
        paper.status_message = f"Creating {len(chunks)} chunks..."
        await db.commit()

        # Delete existing chunks (in case of reprocessing)
        existing_chunks = await db.execute(
            select(PaperChunk).where(PaperChunk.paper_id == paper_id)
        )
        for chunk in existing_chunks.scalars():
            await db.delete(chunk)
        await db.flush()

        # Store new chunks
        for chunk_data in chunks:
            chunk = PaperChunk(
                paper_id=paper_id,
                chunk_index=chunk_data["index"],
                chunk_text=chunk_data["text"],
                token_count=chunk_data["word_count"],
            )
            db.add(chunk)

        paper.status = PaperStatus.EXTRACTED.value
        paper.status_message = f"Extracted {len(chunks)} chunks from {paper.page_count} pages"
        await db.commit()

        logger.info(f"Processed paper {paper_id}: {len(chunks)} chunks from {paper.page_count} pages")
        return paper

    except Exception as e:
        paper.status = PaperStatus.FAILED.value
        paper.status_message = f"Processing failed: {str(e)}"
        await db.commit()
        logger.error(f"PDF processing failed for {paper_id}: {e}")
        raise
