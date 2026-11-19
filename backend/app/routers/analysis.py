"""
Analysis Router - Run analyses and get results
"""
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import io

from app.database import get_db, AsyncSessionLocal
from app.models.user import User
from app.models.project import Project
from app.models.paper import Paper, PaperStatus
from app.models.analysis import Analysis, SimilarityResult, ResearchDomain, ResearchGap, AnalysisType, AnalysisStatus
from app.schemas.analysis import (
    AnalysisRequest, AnalysisResponse, SimilarityResultResponse,
    ResearchDomainResponse, ResearchGapResponse, DashboardResponse,
)
from app.services.auth_service import get_current_user
from app.services.similarity_service import run_similarity_analysis
from app.services.clustering_service import run_domain_discovery
from app.services.gap_detection_service import run_gap_detection
from app.services.novelty_service import run_novelty_analysis
from app.services.trend_service import run_trend_analysis
from app.services.literature_review_service import run_literature_review
from app.services.report_service import generate_pdf_report

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/analysis", tags=["Analysis"])


async def _run_full_analysis(project_id: uuid.UUID, analysis_id: uuid.UUID):
    """Run all analysis stages sequentially in background."""
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(Analysis).where(Analysis.id == analysis_id))
            analysis = result.scalar_one()

            analysis.status = AnalysisStatus.PROCESSING.value
            analysis.results_json = {}
            await db.commit()

            # Stage 1: Similarity
            analysis.status_message = "Running similarity analysis..."
            await db.commit()
            await run_similarity_analysis(project_id, analysis, db)

            # Refresh for next stage
            await db.refresh(analysis)
            analysis.status = AnalysisStatus.PROCESSING.value

            # Stage 2: Domain Discovery
            analysis.status_message = "Discovering research domains..."
            await db.commit()
            await run_domain_discovery(project_id, analysis, db)

            await db.refresh(analysis)
            analysis.status = AnalysisStatus.PROCESSING.value

            # Stage 3: Gap Detection
            analysis.status_message = "Detecting research gaps..."
            await db.commit()
            await run_gap_detection(project_id, analysis, db)

            await db.refresh(analysis)
            analysis.status = AnalysisStatus.PROCESSING.value

            # Stage 4: Novelty (Prototype)
            try:
                analysis.status_message = "Computing novelty metrics..."
                await db.commit()
                await run_novelty_analysis(project_id, analysis, db)
            except Exception as e:
                logger.warning(f"Novelty stage deferred/skipped: {e}")

            await db.refresh(analysis)
            analysis.status = AnalysisStatus.PROCESSING.value

            # Stage 5: Trends (Prototype)
            try:
                analysis.status_message = "Analyzing research trends..."
                await db.commit()
                await run_trend_analysis(project_id, analysis, db)
            except Exception as e:
                logger.warning(f"Trend stage deferred/skipped: {e}")

            # Stage 6: Literature Review (Prototype)
            try:
                analysis.status_message = "Generating synthesis notes..."
                await db.commit()
                await run_literature_review(project_id, analysis, db)
            except Exception as e:
                logger.warning(f"Literature review stage deferred/skipped: {e}")

            # Final status
            await db.refresh(analysis)
            analysis.status = AnalysisStatus.COMPLETED.value
            analysis.status_message = "Multi-paper intelligence analysis completed successfully"
            await db.commit()

            logger.info(f"Full analysis completed for project {project_id}")

        except Exception as e:
            try:
                await db.refresh(analysis)
                analysis.status = AnalysisStatus.FAILED.value
                analysis.status_message = f"Analysis failed: {str(e)}"
                await db.commit()
            except Exception:
                pass
            logger.error(f"Full analysis failed: {e}")


@router.post("/{project_id}/run", response_model=AnalysisResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_analysis(
    project_id: str,
    request: AnalysisRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Start a full analysis for a project."""
    # Verify project
    proj_result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.user_id == current_user.id)
    )
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check we have enough ready papers
    paper_result = await db.execute(
        select(Paper)
        .where(Paper.project_id == project_id)
        .where(Paper.status == PaperStatus.READY.value)
    )
    ready_papers = paper_result.scalars().all()
    if len(list(ready_papers)) < 2:
        raise HTTPException(
            status_code=400,
            detail="Need at least 2 papers with completed processing to run analysis",
        )

    # Create analysis record
    analysis = Analysis(
        project_id=str(project_id),
        analysis_type=request.analysis_type,
        status=AnalysisStatus.QUEUED.value,
        status_message="Analysis queued",
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)

    # Run in background
    background_tasks.add_task(_run_full_analysis, str(project_id), analysis.id)

    return analysis


@router.get("/{project_id}/status", response_model=AnalysisResponse)
async def get_analysis_status(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the latest analysis status for a project."""
    proj_result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.user_id == current_user.id)
    )
    if not proj_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(
        select(Analysis)
        .where(Analysis.project_id == project_id)
        .order_by(Analysis.created_at.desc())
        .limit(1)
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="No analysis found")

    return analysis


@router.get("/{project_id}/results", response_model=AnalysisResponse)
async def get_analysis_results(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get full analysis results."""
    proj_result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.user_id == current_user.id)
    )
    if not proj_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(
        select(Analysis)
        .where(Analysis.project_id == project_id)
        .where(Analysis.status == AnalysisStatus.COMPLETED.value)
        .order_by(Analysis.created_at.desc())
        .limit(1)
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="No completed analysis found")

    return analysis


@router.get("/{project_id}/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get dashboard data for a project."""
    proj_result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.user_id == current_user.id)
    )
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Paper count
    from sqlalchemy import func
    count_result = await db.execute(
        select(func.count(Paper.id)).where(Paper.project_id == project_id)
    )
    paper_count = count_result.scalar() or 0

    # Latest analysis
    analysis_result = await db.execute(
        select(Analysis)
        .where(Analysis.project_id == project_id)
        .order_by(Analysis.created_at.desc())
        .limit(1)
    )
    analysis = analysis_result.scalar_one_or_none()

    # Domains
    domain_result = await db.execute(
        select(ResearchDomain).join(Analysis).where(Analysis.project_id == project_id)
    )
    domains = [ResearchDomainResponse.model_validate(d) for d in domain_result.scalars().all()]

    # Gaps
    gap_result = await db.execute(
        select(ResearchGap).join(Analysis).where(Analysis.project_id == project_id)
    )
    gaps = [ResearchGapResponse.model_validate(g) for g in gap_result.scalars().all()]

    dashboard = DashboardResponse(
        project_id=project.id,
        project_name=project.name,
        paper_count=paper_count,
        analysis_status=analysis.status if analysis else None,
        similarity_matrix=analysis.results_json.get("similarity_matrix") if analysis and analysis.results_json else None,
        domains=domains,
        gaps=gaps,
        novelty_scores=analysis.results_json.get("novelty") if analysis and analysis.results_json else None,
        trend_data=analysis.results_json.get("trends") if analysis and analysis.results_json else None,
        recommendations=None,
    )
    return dashboard


@router.get("/{project_id}/report")
async def download_report(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download PDF report."""
    proj_result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.user_id == current_user.id)
    )
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        pdf_bytes = await generate_pdf_report(project.id, project.name, db)
        safe_name = "".join(c for c in project.name if c.isalnum() or c in (' ', '_', '-')).strip() or "Project"
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="ResearchMind_Report_{safe_name}.pdf"'
            },
        )
    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")
