"""
Novelty Scoring Service - Multi-signal novelty analysis
"""
import uuid
import logging
import numpy as np
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.paper import Paper, PaperChunk, PaperStatus
from app.models.analysis import Analysis, AnalysisStatus

logger = logging.getLogger(__name__)


def _compute_semantic_uniqueness(paper_embedding: np.ndarray, other_embeddings: list[np.ndarray]) -> float:
    """How semantically unique is this paper compared to all others? Higher = more novel."""
    if not other_embeddings:
        return 1.0
    similarities = [float(np.dot(paper_embedding, other.T)) for other in other_embeddings]
    max_sim = max(similarities)
    avg_sim = np.mean(similarities)
    # Novelty inversely related to similarity to closest paper
    return float(1.0 - (0.6 * max_sim + 0.4 * avg_sim))


def _analyze_topic_uniqueness(paper: Paper, all_papers: list) -> dict:
    """Analyze unique topic combinations in a paper."""
    paper_text = (paper.full_text or "").lower()
    
    # Common research topics to check
    topics = [
        "machine learning", "deep learning", "natural language processing",
        "computer vision", "reinforcement learning", "transfer learning",
        "transformer", "attention mechanism", "generative", "adversarial",
        "classification", "detection", "segmentation", "optimization",
        "distributed", "federated", "privacy", "security", "blockchain",
        "healthcare", "education", "finance", "robotics", "autonomous",
        "graph neural", "knowledge graph", "recommendation", "sentiment",
    ]

    paper_topics = [t for t in topics if t in paper_text]

    # Check which topics are unique to this paper
    other_texts = [(p.full_text or "").lower() for p in all_papers if p.id != paper.id]
    unique_topics = []
    shared_topics = []

    for topic in paper_topics:
        if not any(topic in ot for ot in other_texts):
            unique_topics.append(topic)
        else:
            shared_topics.append(topic)

    # Topic combination uniqueness
    topic_combo_score = len(unique_topics) / max(len(paper_topics), 1)

    return {
        "paper_topics": paper_topics,
        "unique_topics": unique_topics,
        "shared_topics": shared_topics,
        "topic_uniqueness_score": round(topic_combo_score, 4),
    }


async def run_novelty_analysis(
    project_id: uuid.UUID,
    analysis: Analysis,
    db: AsyncSession,
) -> Analysis:
    """
    Compute novelty scores for each paper using multiple signals:
    1. Semantic uniqueness (embedding distance to peers)
    2. Topic combination uniqueness
    3. Composite novelty score
    """
    try:
        analysis.status = AnalysisStatus.PROCESSING.value
        analysis.status_message = "Computing novelty scores..."
        await db.commit()

        # Get papers
        result = await db.execute(
            select(Paper)
            .where(Paper.project_id == project_id)
            .where(Paper.status == PaperStatus.READY.value)
            .options(selectinload(Paper.chunks))
        )
        papers = list(result.scalars().all())

        if len(papers) < 2:
            analysis.status = AnalysisStatus.FAILED.value
            analysis.status_message = "Need at least 2 papers for novelty analysis"
            await db.commit()
            return analysis

        # Compute mean embeddings per paper
        paper_embeddings = {}
        for paper in papers:
            embs = [np.array(c.embedding) for c in paper.chunks if c.embedding is not None]
            if embs:
                paper_embeddings[str(paper.id)] = np.mean(embs, axis=0)

        novelty_scores = {}
        for paper in papers:
            pid = str(paper.id)
            if pid not in paper_embeddings:
                continue

            # Signal 1: Semantic uniqueness
            other_embs = [emb for k, emb in paper_embeddings.items() if k != pid]
            semantic_score = _compute_semantic_uniqueness(paper_embeddings[pid], other_embs)

            # Signal 2: Topic uniqueness
            topic_analysis = _analyze_topic_uniqueness(paper, papers)

            # Composite score (weighted combination)
            composite = 0.6 * semantic_score + 0.4 * topic_analysis["topic_uniqueness_score"]

            # Classify novelty level
            if composite >= 0.7:
                level = "High"
            elif composite >= 0.4:
                level = "Moderate"
            else:
                level = "Low"

            novelty_scores[pid] = {
                "paper_title": paper.title,
                "composite_score": round(composite, 4),
                "semantic_uniqueness": round(semantic_score, 4),
                "topic_uniqueness": topic_analysis["topic_uniqueness_score"],
                "unique_topics": topic_analysis["unique_topics"],
                "novelty_level": level,
                "explanation": f"This paper shows {level.lower()} novelty. "
                    f"Semantic uniqueness: {semantic_score:.2f}, "
                    f"Topic uniqueness: {topic_analysis['topic_uniqueness_score']:.2f}. "
                    f"{'Unique topics: ' + ', '.join(topic_analysis['unique_topics']) if topic_analysis['unique_topics'] else 'No unique topics compared to other papers.'}",
            }

        analysis.results_json = analysis.results_json or {}
        analysis.results_json["novelty"] = novelty_scores
        analysis.status = AnalysisStatus.COMPLETED.value
        analysis.status_message = f"Computed novelty scores for {len(novelty_scores)} papers"
        analysis.completed_at = datetime.now(timezone.utc)
        await db.commit()

        logger.info(f"Novelty analysis completed for {len(novelty_scores)} papers")
        return analysis

    except Exception as e:
        analysis.status = AnalysisStatus.FAILED.value
        analysis.status_message = f"Novelty analysis failed: {str(e)}"
        await db.commit()
        logger.error(f"Novelty analysis failed: {e}")
        raise
