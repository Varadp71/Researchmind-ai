"""
Papers Router - Upload and processing
"""
import os
import uuid
import shutil
import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.database import get_db, AsyncSessionLocal
from app.models.user import User
from app.models.project import Project
from app.models.paper import Paper, PaperChunk, PaperStatus
from app.schemas.paper import PaperResponse, PaperDetailResponse, PaperListResponse
from app.services.auth_service import get_current_user
from app.services.pdf_service import ensure_upload_dir, process_pdf
from app.services.embedding_service import embed_paper_chunks
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/papers", tags=["Papers"])


async def _process_paper_background(paper_id: uuid.UUID):
    """Background task: extract text and generate embeddings."""
    async with AsyncSessionLocal() as db:
        try:
            await process_pdf(paper_id, db)
            await embed_paper_chunks(paper_id, db)
        except Exception as e:
            logger.error(f"Background processing failed for paper {paper_id}: {e}")


@router.post("/{project_id}/upload", response_model=PaperResponse, status_code=status.HTTP_201_CREATED)
async def upload_paper(
    project_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a PDF paper to a project."""
    # Verify project ownership
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate file
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    # Check file size
    contents = await file.read()
    file_size = len(contents)
    if file_size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds {settings.MAX_FILE_SIZE_MB}MB limit",
        )

    # Save file
    ensure_upload_dir()
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}_{file.filename}"
    filepath = os.path.join(settings.UPLOAD_DIR, safe_filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    # Create paper record
    paper = Paper(
        project_id=uuid.UUID(project_id),
        title=file.filename.replace('.pdf', '').replace('_', ' ').replace('-', ' '),
        filename=file.filename,
        filepath=filepath,
        file_size=file_size,
        status=PaperStatus.UPLOADED.value,
        status_message="Uploaded, queued for processing",
    )
    db.add(paper)
    await db.commit()
    await db.refresh(paper)

    # Start background processing
    background_tasks.add_task(_process_paper_background, paper.id)

    return paper


@router.get("/{project_id}", response_model=PaperListResponse)
async def list_papers(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all papers in a project."""
    # Verify project
    proj_result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.user_id == current_user.id)
    )
    if not proj_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(
        select(Paper)
        .where(Paper.project_id == project_id)
        .order_by(Paper.created_at.desc())
    )
    papers = result.scalars().all()
    return PaperListResponse(papers=list(papers), total=len(list(papers)))


@router.get("/{project_id}/{paper_id}", response_model=PaperDetailResponse)
async def get_paper(
    project_id: str,
    paper_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get paper details."""
    # Verify project
    proj_result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.user_id == current_user.id)
    )
    if not proj_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(
        select(Paper)
        .where(Paper.id == paper_id)
        .where(Paper.project_id == project_id)
        .options(selectinload(Paper.chunks))
    )
    paper = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    chunk_count = len(paper.chunks)
    has_embeddings = any(c.embedding is not None for c in paper.chunks)

    return PaperDetailResponse(
        id=paper.id,
        project_id=paper.project_id,
        title=paper.title,
        authors=paper.authors,
        year=paper.year,
        abstract=paper.abstract,
        filename=paper.filename,
        file_size=paper.file_size,
        page_count=paper.page_count,
        status=paper.status,
        status_message=paper.status_message,
        created_at=paper.created_at,
        full_text=paper.full_text,
        metadata_json=paper.metadata_json,
        chunk_count=chunk_count,
        has_embeddings=has_embeddings,
    )


@router.delete("/{project_id}/{paper_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_paper(
    project_id: str,
    paper_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a paper."""
    proj_result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.user_id == current_user.id)
    )
    if not proj_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(
        select(Paper).where(Paper.id == paper_id).where(Paper.project_id == project_id)
    )
    paper = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    # Delete file
    if paper.filepath and os.path.exists(paper.filepath):
        os.remove(paper.filepath)

    await db.delete(paper)
    await db.commit()


@router.post("/{project_id}/{paper_id}/reprocess", response_model=PaperResponse)
async def reprocess_paper(
    project_id: str,
    paper_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reprocess a paper (re-extract and re-embed)."""
    proj_result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.user_id == current_user.id)
    )
    if not proj_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(
        select(Paper).where(Paper.id == paper_id).where(Paper.project_id == project_id)
    )
    paper = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    paper.status = PaperStatus.UPLOADED.value
    paper.status_message = "Queued for reprocessing"
    await db.commit()

    background_tasks.add_task(_process_paper_background, paper.id)
    return paper


@router.post("/{project_id}/seed-samples")
async def seed_sample_papers(
    project_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Seed project with 3 real research paper PDFs generated via PyMuPDF."""
    import pymupdf
    ensure_upload_dir()

    samples = [
        {
            "filename": "Vaswani_Attention_Is_All_You_Need.pdf",
            "title": "Attention Is All You Need",
            "authors": "Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit",
            "year": 2017,
            "abstract": "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train.",
            "text": "Attention Is All You Need\n\nAshish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit\nGoogle Brain and Google Research (2017)\n\nAbstract: The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train.\n\n1. Introduction\nRecurrent neural networks, long short-term memory and gated recurrent neural networks in particular, have been firmly established as state of the art approaches in sequence modeling and transduction problems such as language modeling and machine translation. Recurrent models typically factor computation along the symbol positions of the input and output sequences. Aligning the positions to steps in computation time, they generate a sequence of hidden states h_t, as a function of the previous hidden state h_{t-1} and the input for position t. This inherently sequential nature precludes parallelization within training examples, which becomes critical at longer sequence lengths, as memory constraints limit batching across examples.\n\nIn this work we propose the Transformer, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism to draw global dependencies between input and output. The Transformer allows for significantly more parallelization and can reach a new state of the art in translation quality.\n\n2. Model Architecture and Attention Mechanism\nMost competitive neural sequence transduction models have an encoder-decoder structure. Here, the encoder maps an input sequence of symbol representations (x_1, ..., x_n) to a sequence of continuous representations z = (z_1, ..., z_n). Given z, the decoder then generates an output sequence (y_1, ..., y_m) of symbols one element at a time.\n\nAn attention function can be described as mapping a query and a set of key-value pairs to an output, where the query, keys, values, and output are all vectors. The output is computed as a weighted sum of the values, where the weight assigned to each value is computed by a compatibility function of the query with the corresponding key. We compute the dot products of the query with all keys, divide each by sqrt(d_k), and apply a softmax function to obtain the weights on the values."
        },
        {
            "filename": "Dosovitskiy_Vision_Transformer.pdf",
            "title": "An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale",
            "authors": "Alexey Dosovitskiy, Lucas Beyer, Alexander Kolesnikov, Neil Houlsby",
            "year": 2020,
            "abstract": "While the Transformer architecture has become the de-facto standard for natural language processing tasks, its applications to computer vision remain limited. In vision, attention is either applied in conjunction with convolutional networks, or used to replace certain components of convolutional networks while keeping their overall structure in place. We show that this reliance on CNNs is not necessary and a pure transformer applied directly to sequences of image patches can perform very well on image classification tasks.",
            "text": "An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale\n\nAlexey Dosovitskiy, Lucas Beyer, Alexander Kolesnikov, Neil Houlsby\nGoogle Research, Brain Team (2020)\n\nAbstract: While the Transformer architecture has become the de-facto standard for natural language processing tasks, its applications to computer vision remain limited. In vision, attention is either applied in conjunction with convolutional networks, or used to replace certain components of convolutional networks while keeping their overall structure in place. We show that this reliance on CNNs is not necessary and a pure transformer applied directly to sequences of image patches can perform very well on image classification tasks. When pre-trained on large amounts of data and transferred to multiple mid-sized or small image recognition benchmarks, Vision Transformer (ViT) attains excellent results compared to state-of-the-art convolutional networks while requiring substantially fewer computational resources to train.\n\n1. Introduction\nSelf-attention based architectures, in particular Transformers, have become the model of choice in natural language processing (NLP). The dominant approach is to pre-train on a large text corpus and then fine-tune on a smaller task-specific dataset. Thanks to Transformers computational efficiency and scalability, it has become possible to train models of unprecedented size with over 100B parameters. With the models and datasets growing, there is still no sign of saturating performance.\n\nInspired by NLP Transformer successes, multiple works try combining CNN-like architectures with self-attention, some completely replacing the convolutions. The latter models, while theoretically efficient, have not yet been scaled effectively on modern hardware accelerators due to specialized attention patterns. Therefore, in large-scale image recognition, classic ResNet-like architectures remain state of the art.\n\nIn this work, we show that a pure Vision Transformer (ViT) applied directly to sequences of 16x16 image patches reaches top-1 accuracy of 88.55% on ImageNet while maintaining strong computational efficiency.\n\n2. Vision Transformer Architecture\nIn the standard Transformer architecture, 1D sequences of token embeddings are expected. To handle 2D images, we reshape the image into a sequence of flattened 2D patches. The patches are linearly projected to a D-dimensional vector space and position embeddings are added to preserve spatial positional information."
        },
        {
            "filename": "He_Deep_Residual_Learning_ResNet.pdf",
            "title": "Deep Residual Learning for Image Recognition",
            "authors": "Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun",
            "year": 2016,
            "abstract": "Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously. We explicitly reformulate the layers as learning residual functions with reference to the layer inputs, instead of learning unreferenced functions. We provide comprehensive empirical evidence showing that these residual networks are easier to optimize, and can gain accuracy from considerably increased depth.",
            "text": "Deep Residual Learning for Image Recognition\n\nKaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun\nMicrosoft Research (2016)\n\nAbstract: Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously. We explicitly reformulate the layers as learning residual functions with reference to the layer inputs, instead of learning unreferenced functions. We provide comprehensive empirical evidence showing that these residual networks are easier to optimize, and can gain accuracy from considerably increased depth. On the ImageNet dataset we evaluate residual nets with a depth of up to 152 layers—8x deeper than VGG nets but still having lower complexity.\n\n1. Introduction\nDeep convolutional neural networks have led to a series of breakthroughs for image classification. Deep networks naturally integrate low/mid/high-level features and classifiers in an end-to-end multi-layer fashion, and the levels of features can be enriched by the number of stacked layers (depth). Recent evidence reveals that network depth is of crucial importance, and the leading results on the challenging ImageNet dataset all exploit very deep models.\n\nDriven by the significance of depth, a question arises: Is learning better networks as easy as stacking more layers? An obstacle to answering this question was the notorious problem of vanishing/exploding gradients, which hamper convergence from the beginning. This problem has been largely addressed by normalized initialization and intermediate normalization layers.\n\nWhen deeper networks are able to start converging, a degradation problem has been exposed: with the network depth increasing, accuracy gets saturated and then degrades rapidly. In this paper, we address the degradation problem by introducing a deep residual learning framework. Instead of hoping each few stacked layers directly fit a desired underlying mapping, we explicitly let these layers fit a residual mapping F(x) = H(x) - x.\n\n2. Residual Learning Framework\nIf the added layers can be constructed as identity mappings, a deeper model should have no higher training error than its shallower counterpart. The degradation problem suggests that the solvers might have difficulties in approximating identity mappings by multiple nonlinear layers. With the residual learning reformulation, if identity mappings are optimal, the solvers may simply drive the weights of the multiple nonlinear layers toward zero to approach identity mappings."
        }
    ]

    created_papers = []
    for s in samples:
        # Check if already exists in project
        exist = await db.execute(
            select(Paper).where(Paper.project_id == project_id).where(Paper.filename == s["filename"])
        )
        if exist.scalar_one_or_none():
            continue

        file_id = str(uuid.uuid4())
        safe_filename = f"{file_id}_{s['filename']}"
        filepath = os.path.join(settings.UPLOAD_DIR, safe_filename)

        # Generate genuine PDF with PyMuPDF
        doc = pymupdf.open()
        page = doc.new_page(width=595, height=842) # A4
        page.insert_text((50, 72), s["text"], fontsize=11, fontname="helv")
        doc.save(filepath)
        doc.close()

        file_size = os.path.getsize(filepath)

        paper = Paper(
            project_id=uuid.UUID(project_id),
            title=s["title"],
            authors=s["authors"],
            year=s["year"],
            abstract=s["abstract"],
            filename=s["filename"],
            filepath=filepath,
            file_size=file_size,
            status=PaperStatus.UPLOADED.value,
            status_message="Sample paper generated, queued for PyMuPDF processing",
        )
        db.add(paper)
        await db.commit()
        await db.refresh(paper)

        # Immediately queue for PyMuPDF processing & embedding
        background_tasks.add_task(_process_paper_background, paper.id)
        created_papers.append(paper)

    return {"seeded": len(created_papers), "message": "Sample papers queued for PyMuPDF extraction"}
