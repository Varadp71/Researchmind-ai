"""
Trend Analysis Service
"""
import uuid
import logging
import numpy as np
from collections import Counter
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.paper import Paper, PaperStatus
from app.models.analysis import Analysis, ResearchDomain, AnalysisStatus

logger = logging.getLogger(__name__)

# Topics to track
TRACKED_TOPICS = [
    "machine learning", "deep learning", "natural language processing",
    "computer vision", "reinforcement learning", "transfer learning",
    "transformer", "attention", "generative adversarial", "generative ai",
    "large language model", "bert", "gpt", "diffusion model",
    "federated learning", "explainable ai", "graph neural network",
    "self-supervised", "contrastive learning", "few-shot",
    "knowledge graph", "recommendation system", "sentiment analysis",
    "object detection", "semantic segmentation", "question answering",
    "text generation", "image generation", "speech recognition",
    "autonomous", "robotics", "healthcare ai", "drug discovery",
    "climate", "sustainability", "ethics", "bias", "fairness",
]


def _extract_topic_frequencies(papers: list) -> dict:
    """Count topic mentions across all papers."""
    topic_counts = Counter()
    topic_papers = {}

    for paper in papers:
        text = (paper.full_text or "").lower()
        for topic in TRACKED_TOPICS:
            count = text.count(topic)
            if count > 0:
                topic_counts[topic] += count
                if topic not in topic_papers:
                    topic_papers[topic] = []
                topic_papers[topic].append({
                    "paper_id": str(paper.id),
                    "title": paper.title,
                    "mentions": count,
                })

    return {"counts": dict(topic_counts), "papers": topic_papers}


def _analyze_temporal_trends(papers: list) -> dict:
    """Analyze how topics distribute over publication years."""
    year_topics = {}

    for paper in papers:
        year = paper.year
        if not year:
            continue
        if year not in year_topics:
            year_topics[year] = Counter()
        text = (paper.full_text or "").lower()
        for topic in TRACKED_TOPICS:
            if topic in text:
                year_topics[year][topic] += 1

    # Sort by year
    sorted_years = sorted(year_topics.keys())

    # Identify trends
    emerging = []
    declining = []

    if len(sorted_years) >= 2:
        recent_year = sorted_years[-1]
        recent_topics = set(year_topics[recent_year].keys())
        older_topics = set()
        for y in sorted_years[:-1]:
            older_topics.update(year_topics[y].keys())

        emerging = list(recent_topics - older_topics)
        declining = list(older_topics - recent_topics)

    return {
        "year_distribution": {str(y): dict(year_topics[y]) for y in sorted_years},
        "years_covered": sorted_years,
        "emerging_topics": emerging,
        "declining_topics": declining,
    }


def _compute_research_concentration(topic_freq: dict) -> dict:
    """Measure how concentrated research is on certain topics."""
    counts = topic_freq["counts"]
    if not counts:
        return {"concentration_score": 0, "dominant_topics": [], "niche_topics": []}

    values = list(counts.values())
    total = sum(values)

    # Sort by frequency
    sorted_topics = sorted(counts.items(), key=lambda x: x[1], reverse=True)

    # Dominant (top 20%) and niche (bottom 20%)
    n = len(sorted_topics)
    dominant = [t[0] for t in sorted_topics[:max(1, n // 5)]]
    niche = [t[0] for t in sorted_topics[-max(1, n // 5):]]

    # Concentration (Herfindahl index)
    if total > 0:
        proportions = np.array(values) / total
        hhi = float(np.sum(proportions ** 2))
    else:
        hhi = 0

    return {
        "concentration_score": round(hhi, 4),
        "dominant_topics": dominant,
        "niche_topics": niche,
        "topic_count": len(counts),
    }


async def run_trend_analysis(
    project_id: uuid.UUID,
    analysis: Analysis,
    db: AsyncSession,
) -> Analysis:
    """
    Analyze research trends across the paper collection.
    """
    try:
        analysis.status = AnalysisStatus.PROCESSING.value
        analysis.status_message = "Analyzing research trends..."
        await db.commit()

        result = await db.execute(
            select(Paper)
            .where(Paper.project_id == project_id)
            .where(Paper.status == PaperStatus.READY.value)
        )
        papers = list(result.scalars().all())

        if not papers:
            analysis.status = AnalysisStatus.FAILED.value
            analysis.status_message = "No papers available for trend analysis"
            await db.commit()
            return analysis

        # Topic frequencies
        topic_freq = _extract_topic_frequencies(papers)

        # Temporal trends
        temporal = _analyze_temporal_trends(papers)

        # Research concentration
        concentration = _compute_research_concentration(topic_freq)

        # Get domain info
        domain_result = await db.execute(
            select(ResearchDomain).join(Analysis).where(Analysis.project_id == project_id)
        )
        domains = list(domain_result.scalars().all())
        domain_growth = {d.name: d.size for d in domains if d.cluster_label != -1}

        analysis.results_json = analysis.results_json or {}
        analysis.results_json["trends"] = {
            "topic_frequencies": topic_freq["counts"],
            "top_topics": sorted(topic_freq["counts"].items(), key=lambda x: x[1], reverse=True)[:15],
            "temporal_trends": temporal,
            "research_concentration": concentration,
            "domain_growth": domain_growth,
            "paper_count": len(papers),
            "years_span": temporal.get("years_covered", []),
        }
        analysis.status = AnalysisStatus.COMPLETED.value
        analysis.status_message = f"Trend analysis completed for {len(papers)} papers"
        analysis.completed_at = datetime.now(timezone.utc)
        await db.commit()

        logger.info(f"Trend analysis completed for project {project_id}")
        return analysis

    except Exception as e:
        analysis.status = AnalysisStatus.FAILED.value
        analysis.status_message = f"Trend analysis failed: {str(e)}"
        await db.commit()
        logger.error(f"Trend analysis failed: {e}")
        raise
