"""
Literature Review Generation Service
Generates structured, source-grounded literature reviews from processed papers.
When Gemini API key is available, uses LLM for synthesis; otherwise uses template-based generation.
"""
import uuid
import logging
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.paper import Paper, PaperStatus
from app.models.analysis import Analysis, ResearchDomain, ResearchGap, AnalysisStatus
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


def _generate_template_review(papers: list, domains: list, gaps: list) -> dict:
    """Generate a structured literature review without LLM (template-based)."""
    sections = []

    # 1. Introduction
    intro = "## Introduction\n\n"
    intro += f"This literature review covers {len(papers)} research papers"
    years = [p.year for p in papers if p.year]
    if years:
        intro += f" published between {min(years)} and {max(years)}"
    intro += ". The review examines key themes, methodologies, and findings across the literature.\n\n"
    sections.append({"title": "Introduction", "content": intro})

    # 2. Paper Summaries
    summaries = "## Paper Summaries\n\n"
    for i, paper in enumerate(papers, 1):
        summaries += f"### {i}. {paper.title}\n"
        if paper.authors:
            summaries += f"**Authors:** {paper.authors}\n"
        if paper.year:
            summaries += f"**Year:** {paper.year}\n"
        if paper.abstract:
            summaries += f"\n{paper.abstract}\n"
        else:
            # Use first chunk as summary
            if paper.chunks:
                first_text = paper.chunks[0].chunk_text[:500]
                summaries += f"\n{first_text}...\n"
        summaries += "\n"
    sections.append({"title": "Paper Summaries", "content": summaries})

    # 3. Research Domains
    if domains:
        domains_section = "## Research Domains\n\n"
        domains_section += f"The literature spans {len(domains)} identified research domains:\n\n"
        for d in domains:
            if d.cluster_label == -1:
                continue
            domains_section += f"### {d.name}\n"
            if d.description:
                domains_section += f"{d.description}\n"
            domains_section += f"- **Papers in domain:** {d.size}\n\n"
        sections.append({"title": "Research Domains", "content": domains_section})

    # 4. Research Gaps
    if gaps:
        gaps_section = "## Research Gaps\n\n"
        gaps_section += f"{len(gaps)} research gaps were identified:\n\n"
        for i, gap in enumerate(gaps, 1):
            gaps_section += f"### Gap {i}: {gap.title}\n"
            gaps_section += f"{gap.description}\n"
            if gap.confidence:
                gaps_section += f"- **Confidence:** {gap.confidence:.0%}\n"
            if gap.future_direction:
                gaps_section += f"- **Future Direction:** {gap.future_direction}\n"
            gaps_section += "\n"
        sections.append({"title": "Research Gaps", "content": gaps_section})

    # 5. Conclusion
    conclusion = "## Conclusion\n\n"
    conclusion += f"This review analyzed {len(papers)} papers"
    if domains:
        conclusion += f" across {len([d for d in domains if d.cluster_label != -1])} research domains"
    if gaps:
        conclusion += f", identifying {len(gaps)} research gaps"
    conclusion += ". The findings highlight both the strengths of current research and areas where further investigation is needed.\n"
    sections.append({"title": "Conclusion", "content": conclusion})

    # Combine
    full_review = "\n".join(s["content"] for s in sections)

    return {
        "full_text": full_review,
        "sections": sections,
        "paper_count": len(papers),
        "domain_count": len(domains),
        "gap_count": len(gaps),
        "generation_method": "template",
    }


async def run_literature_review(
    project_id: uuid.UUID,
    analysis: Analysis,
    db: AsyncSession,
) -> Analysis:
    """Generate a literature review from all papers in the project."""
    try:
        analysis.status = AnalysisStatus.PROCESSING.value
        analysis.status_message = "Generating literature review..."
        await db.commit()

        # Get papers
        result = await db.execute(
            select(Paper)
            .where(Paper.project_id == project_id)
            .where(Paper.status == PaperStatus.READY.value)
            .options(selectinload(Paper.chunks))
        )
        papers = list(result.scalars().all())

        if not papers:
            analysis.status = AnalysisStatus.FAILED.value
            analysis.status_message = "No papers available for literature review"
            await db.commit()
            return analysis

        # Get domains and gaps
        domain_result = await db.execute(
            select(ResearchDomain).join(Analysis).where(Analysis.project_id == project_id)
        )
        domains = list(domain_result.scalars().all())

        gap_result = await db.execute(
            select(ResearchGap).join(Analysis).where(Analysis.project_id == project_id)
        )
        gaps = list(gap_result.scalars().all())

        # Generate review (template-based for now; Gemini integration when key is available)
        review = _generate_template_review(papers, domains, gaps)

        analysis.results_json = analysis.results_json or {}
        analysis.results_json["literature_review"] = review
        analysis.status = AnalysisStatus.COMPLETED.value
        analysis.status_message = "Literature review generated"
        analysis.completed_at = datetime.now(timezone.utc)
        await db.commit()

        logger.info(f"Literature review generated for project {project_id}")
        return analysis

    except Exception as e:
        analysis.status = AnalysisStatus.FAILED.value
        analysis.status_message = f"Literature review failed: {str(e)}"
        await db.commit()
        logger.error(f"Literature review generation failed: {e}")
        raise
