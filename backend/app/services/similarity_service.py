"""
Similarity Analysis Service
"""
import uuid
import logging
import numpy as np
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.paper import Paper, PaperChunk, PaperStatus
from app.models.analysis import Analysis, SimilarityResult, AnalysisType, AnalysisStatus
from app.services.embedding_service import compute_paper_similarity

logger = logging.getLogger(__name__)


async def run_similarity_analysis(
    project_id: uuid.UUID,
    analysis: Analysis,
    db: AsyncSession,
) -> Analysis:
    """
    Run pairwise similarity analysis for all papers in a project.
    """
    try:
        analysis.status = AnalysisStatus.PROCESSING.value
        analysis.status_message = "Loading paper embeddings..."
        await db.commit()

        # Get all ready papers with their chunks
        result = await db.execute(
            select(Paper)
            .where(Paper.project_id == project_id)
            .where(Paper.status == PaperStatus.READY.value)
            .options(selectinload(Paper.chunks))
        )
        papers = result.scalars().all()

        if len(papers) < 2:
            analysis.status = AnalysisStatus.FAILED.value
            analysis.status_message = "Need at least 2 papers with embeddings for comparison"
            await db.commit()
            return analysis

        analysis.status_message = f"Comparing {len(papers)} papers..."
        await db.commit()

        # Build similarity matrix
        similarity_matrix = []
        paper_titles = [p.title for p in papers]
        paper_ids = [str(p.id) for p in papers]

        for i, paper_a in enumerate(papers):
            row = []
            chunks_a = [c.embedding for c in paper_a.chunks if c.embedding is not None]
            for j, paper_b in enumerate(papers):
                if i == j:
                    row.append(1.0)
                    continue
                if i > j:
                    # Reuse already computed value (symmetric)
                    row.append(similarity_matrix[j][i])
                    continue

                chunks_b = [c.embedding for c in paper_b.chunks if c.embedding is not None]
                sim_result = compute_paper_similarity(chunks_a, chunks_b)

                # Store pairwise result
                sr = SimilarityResult(
                    analysis_id=analysis.id,
                    paper_a_id=paper_a.id,
                    paper_b_id=paper_b.id,
                    overall_score=sim_result["overall_score"],
                    details_json=sim_result,
                )
                db.add(sr)
                row.append(sim_result["overall_score"])

            similarity_matrix.append(row)

        # Store results
        analysis.results_json = {
            "similarity_matrix": similarity_matrix,
            "paper_titles": paper_titles,
            "paper_ids": paper_ids,
            "paper_count": len(papers),
        }
        analysis.status = AnalysisStatus.COMPLETED.value
        analysis.status_message = f"Compared {len(papers)} papers successfully"
        analysis.completed_at = datetime.now(timezone.utc)
        await db.commit()

        logger.info(f"Similarity analysis completed for project {project_id}")
        return analysis

    except Exception as e:
        analysis.status = AnalysisStatus.FAILED.value
        analysis.status_message = f"Similarity analysis failed: {str(e)}"
        await db.commit()
        logger.error(f"Similarity analysis failed: {e}")
        raise
