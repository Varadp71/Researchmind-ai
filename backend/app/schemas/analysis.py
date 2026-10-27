"""
Analysis schemas
"""
import uuid
from datetime import datetime
from pydantic import BaseModel


class AnalysisRequest(BaseModel):
    analysis_type: str = "full"


class AnalysisResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    analysis_type: str
    status: str
    status_message: str | None
    created_at: datetime
    completed_at: datetime | None
    results_json: dict | None = None

    model_config = {"from_attributes": True}


class SimilarityResultResponse(BaseModel):
    id: uuid.UUID
    paper_a_id: uuid.UUID
    paper_b_id: uuid.UUID
    paper_a_title: str | None = None
    paper_b_title: str | None = None
    overall_score: float
    details_json: dict | None

    model_config = {"from_attributes": True}


class ResearchDomainResponse(BaseModel):
    id: uuid.UUID
    cluster_label: int
    name: str
    description: str | None
    keywords: list | None
    paper_ids: list | None
    size: int | None

    model_config = {"from_attributes": True}


class ResearchGapResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    evidence_json: dict | None
    related_paper_ids: list | None
    domain: str | None
    confidence: float | None
    gap_type: str | None
    future_direction: str | None

    model_config = {"from_attributes": True}


class DashboardResponse(BaseModel):
    project_id: uuid.UUID
    project_name: str
    paper_count: int
    analysis_status: str | None
    similarity_matrix: list | None = None
    domains: list[ResearchDomainResponse] = []
    gaps: list[ResearchGapResponse] = []
    novelty_scores: dict | None = None
    trend_data: dict | None = None
    recommendations: list | None = None
