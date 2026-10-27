"""
Embedding Service - all-MiniLM-L6-v2 via sentence-transformers
"""
import uuid
import logging
import numpy as np
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.models.paper import Paper, PaperChunk, PaperStatus
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Lazy-loaded model singleton
_model = None


def get_model():
    """Load the sentence transformer model (lazy singleton)."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
        logger.info("Embedding model loaded successfully")
    return _model


def generate_embeddings(texts: list[str], batch_size: int = 64) -> np.ndarray:
    """Generate embeddings for a list of texts."""
    model = get_model()
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=False,
        normalize_embeddings=True,  # L2 normalization for cosine similarity
    )
    return embeddings


async def embed_paper_chunks(paper_id: uuid.UUID, db: AsyncSession) -> int:
    """
    Generate embeddings for all chunks of a paper.
    Returns the number of chunks embedded.
    """
    # Get paper
    result = await db.execute(select(Paper).where(Paper.id == paper_id))
    paper = result.scalar_one_or_none()
    if not paper:
        raise ValueError(f"Paper {paper_id} not found")

    try:
        paper.status = PaperStatus.EMBEDDING.value
        paper.status_message = "Generating semantic embeddings..."
        await db.commit()

        # Get chunks
        result = await db.execute(
            select(PaperChunk)
            .where(PaperChunk.paper_id == paper_id)
            .order_by(PaperChunk.chunk_index)
        )
        chunks = result.scalars().all()

        if not chunks:
            paper.status = PaperStatus.FAILED.value
            paper.status_message = "No text chunks found for embedding"
            await db.commit()
            return 0

        # Extract texts
        texts = [chunk.chunk_text for chunk in chunks]

        # Generate embeddings
        embeddings = generate_embeddings(texts)

        # Store embeddings
        for chunk, embedding in zip(chunks, embeddings):
            chunk.embedding = embedding.tolist()

        paper.status = PaperStatus.READY.value
        paper.status_message = f"Ready - {len(chunks)} chunks with embeddings"
        await db.commit()

        logger.info(f"Generated embeddings for paper {paper_id}: {len(chunks)} chunks")
        return len(chunks)

    except Exception as e:
        paper.status = PaperStatus.FAILED.value
        paper.status_message = f"Embedding failed: {str(e)}"
        await db.commit()
        logger.error(f"Embedding failed for paper {paper_id}: {e}")
        raise


def compute_cosine_similarity(emb_a: np.ndarray, emb_b: np.ndarray) -> float:
    """Compute cosine similarity between two embedding vectors."""
    if emb_a.ndim == 1:
        emb_a = emb_a.reshape(1, -1)
    if emb_b.ndim == 1:
        emb_b = emb_b.reshape(1, -1)
    # Since embeddings are already L2-normalized, cosine = dot product
    return float(np.dot(emb_a, emb_b.T)[0, 0])


def compute_paper_similarity(
    chunks_a: list[list[float]],
    chunks_b: list[list[float]]
) -> dict:
    """
    Compute overall similarity between two papers using their chunk embeddings.
    Returns overall score and detailed similarity info.
    """
    if not chunks_a or not chunks_b:
        return {"overall_score": 0.0, "details": "No embeddings available"}

    emb_a = np.array(chunks_a)
    emb_b = np.array(chunks_b)

    # Compute similarity matrix between all chunks
    sim_matrix = np.dot(emb_a, emb_b.T)

    # Overall score: mean of max similarities (best-match for each chunk)
    max_sim_a_to_b = sim_matrix.max(axis=1).mean()  # For each chunk in A, best match in B
    max_sim_b_to_a = sim_matrix.max(axis=0).mean()  # For each chunk in B, best match in A
    overall_score = float((max_sim_a_to_b + max_sim_b_to_a) / 2)

    # Average similarity
    avg_similarity = float(sim_matrix.mean())

    # Top matching chunk pairs
    top_k = min(5, sim_matrix.size)
    flat_indices = np.argsort(sim_matrix.flatten())[-top_k:][::-1]
    top_pairs = []
    for idx in flat_indices:
        i, j = divmod(idx, sim_matrix.shape[1])
        top_pairs.append({
            "chunk_a_idx": int(i),
            "chunk_b_idx": int(j),
            "similarity": float(sim_matrix[i, j]),
        })

    return {
        "overall_score": round(overall_score, 4),
        "avg_similarity": round(avg_similarity, 4),
        "max_similarity": float(sim_matrix.max()),
        "min_similarity": float(sim_matrix.min()),
        "top_matching_pairs": top_pairs,
    }
