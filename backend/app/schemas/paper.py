"""
Paper schemas
"""
import uuid
from datetime import datetime
from pydantic import BaseModel


class PaperResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    authors: str | None
    year: int | None
    abstract: str | None
    filename: str
    file_size: int | None
    page_count: int | None
    status: str
    status_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaperDetailResponse(PaperResponse):
    full_text: str | None
    metadata_json: dict | None
    chunk_count: int = 0
    has_embeddings: bool = False


class PaperListResponse(BaseModel):
    papers: list[PaperResponse]
    total: int


class PaperChunkResponse(BaseModel):
    id: uuid.UUID
    chunk_index: int
    chunk_text: str
    page_number: int | None
    section: str | None
    has_embedding: bool = False

    model_config = {"from_attributes": True}
