"""
Clustering Service - HDBSCAN for Research Domain Discovery with Gemini / Heuristic extraction
"""
import uuid
import logging
import re
import numpy as np
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.paper import Paper, PaperChunk, PaperStatus
from app.models.analysis import Analysis, ResearchDomain, AnalysisStatus
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _get_paper_embedding(paper: Paper) -> np.ndarray | None:
    """Compute mean embedding for a paper from its chunk embeddings."""
    embeddings = [
        np.array(c.embedding) for c in paper.chunks
        if c.embedding is not None
    ]
    if not embeddings:
        return None
    return np.mean(embeddings, axis=0)


def extract_keywords_from_texts(texts: list[str], top_n: int = 8) -> list[str]:
    """Extract top research keywords/phrases from paper texts using frequency analysis."""
    # List of common stopwords to exclude
    stopwords = {
        'the', 'and', 'for', 'that', 'this', 'with', 'from', 'our', 'are', 'was',
        'were', 'using', 'used', 'which', 'can', 'been', 'have', 'has', 'based',
        'approach', 'method', 'paper', 'results', 'proposed', 'study', 'show',
        'such', 'also', 'more', 'into', 'than', 'between', 'each', 'through',
        'during', 'these', 'their', 'other', 'some', 'about', 'over', 'both'
    }
    
    word_counts = {}
    for text in texts:
        # Match alphanumeric words of length >= 4
        words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
        for w in words:
            if w not in stopwords:
                word_counts[w] = word_counts.get(w, 0) + 1
                
    # Sort by frequency
    sorted_words = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)
    return [word.capitalize() for word, _ in sorted_words[:top_n]]


def detect_domain_heuristics(papers: list[Paper]) -> tuple[str, list[str]]:
    """Heuristic domain identification based on keywords in paper titles and abstracts."""
    domain_map = {
        "Artificial Intelligence & Machine Learning": [
            "deep learning", "neural network", "transformer", "reinforcement learning",
            "machine learning", "supervised", "latent", "embedding", "llm", "diffusion"
        ],
        "Natural Language Processing & Speech": [
            "nlp", "language model", "translation", "speech", "acoustic", "syntactic",
            "text classification", "sentiment", "token", "parsing", "dialogue"
        ],
        "Computer Vision & Pattern Recognition": [
            "vision", "image", "segmentation", "object detection", "cnn", "optical",
            "visual", "pixels", "video", "convolutional", "spatial"
        ],
        "Data Systems, Cloud & Distributed Computing": [
            "database", "distributed", "storage", "throughput", "latency", "pipeline",
            "concurrency", "scalability", "cache", "cloud", "fault-tolerant"
        ],
        "Cybersecurity, Privacy & Cryptography": [
            "security", "privacy", "vulnerability", "encryption", "adversarial",
            "authentication", "malware", "exploit", "cryptographic"
        ],
        "Bioinformatics & Computational Health": [
            "genomic", "protein", "medical", "clinical", "biomedical", "disease",
            "patient", "cellular", "biological", "molecular"
        ]
    }
    
    combined_text = " ".join([
        f"{p.title} {p.abstract or ''} {(p.full_text or '')[:1000]}"
        for p in papers
    ]).lower()
    
    scores = {}
    for domain, kws in domain_map.items():
        score = sum(combined_text.count(kw) for kw in kws)
        scores[domain] = score
        
    best_domain = max(scores, key=scores.get)
    if scores[best_domain] == 0:
        best_domain = "Applied Computing & Computational Sciences"
        
    topics = [kw.title() for kw in domain_map.get(best_domain, []) if kw in combined_text][:5]
    if not topics:
        topics = ["Empirical Analysis", "Algorithmic Design", "Performance Evaluation"]
        
    return best_domain, topics


async def run_domain_discovery(
    project_id: uuid.UUID,
    analysis: Analysis,
    db: AsyncSession,
) -> Analysis:
    """
    Discover research domains using clustering and semantic domain extraction.
    """
    try:
        try:
            from sklearn.cluster import HDBSCAN
        except ImportError:
            from sklearn.cluster import AgglomerativeClustering as HDBSCAN

        analysis.status = AnalysisStatus.PROCESSING.value
        analysis.status_message = "Preparing embeddings for domain discovery..."
        await db.commit()

        # Get all ready papers with chunks
        result = await db.execute(
            select(Paper)
            .where(Paper.project_id == project_id)
            .where(Paper.status == PaperStatus.READY.value)
            .options(selectinload(Paper.chunks))
        )
        papers = list(result.scalars().all())

        if len(papers) < 2:
            analysis.status = AnalysisStatus.FAILED.value
            analysis.status_message = "Need at least 2 papers for domain discovery"
            await db.commit()
            return analysis

        # Compute paper embeddings
        paper_embeddings = []
        valid_papers = []
        for paper in papers:
            emb = _get_paper_embedding(paper)
            if emb is not None:
                paper_embeddings.append(emb)
                valid_papers.append(paper)

        if len(valid_papers) < 2:
            analysis.status = AnalysisStatus.FAILED.value
            analysis.status_message = "Not enough papers with embeddings"
            await db.commit()
            return analysis

        X = np.array(paper_embeddings)

        # Primary Domain and Topics detection
        primary_domain, detected_topics = detect_domain_heuristics(valid_papers)
        
        # Extract keywords across all papers
        all_paper_texts = [f"{p.title} {p.abstract or ''}" for p in valid_papers]
        extracted_kws = extract_keywords_from_texts(all_paper_texts, top_n=10)

        # Run clustering
        labels = [0] * len(valid_papers)
        if len(valid_papers) >= 3:
            try:
                clusterer = HDBSCAN(min_cluster_size=2)
                labels = clusterer.fit_predict(X).tolist()
            except Exception:
                labels = [0] * len(valid_papers)

        clusters = {}
        for idx, label in enumerate(labels):
            label_int = int(label)
            if label_int not in clusters:
                clusters[label_int] = []
            clusters[label_int].append(valid_papers[idx])

        # Delete any existing domains for this analysis
        existing_domains = await db.execute(
            select(ResearchDomain).where(ResearchDomain.analysis_id == analysis.id)
        )
        for ed in existing_domains.scalars():
            await db.delete(ed)
        await db.flush()

        domain_data = []
        for label, cluster_papers in clusters.items():
            cluster_kws = extract_keywords_from_texts(
                [f"{p.title} {p.abstract or ''}" for p in cluster_papers], top_n=5
            )
            
            sub_name = f"{primary_domain}" if len(clusters) == 1 else f"{primary_domain}: Focus Area {abs(label) + 1}"
            sub_desc = f"Cluster of {len(cluster_papers)} paper(s) exploring {', '.join(cluster_kws[:3]) if cluster_kws else 'core methodology'}."

            domain = ResearchDomain(
                analysis_id=analysis.id,
                cluster_label=label,
                name=sub_name,
                description=sub_desc,
                keywords=cluster_kws or extracted_kws[:5],
                paper_ids=[str(p.id) for p in cluster_papers],
                size=len(cluster_papers),
            )
            db.add(domain)
            domain_data.append({
                "cluster_label": label,
                "name": sub_name,
                "description": sub_desc,
                "keywords": cluster_kws or extracted_kws[:5],
                "paper_count": len(cluster_papers),
                "paper_titles": [p.title for p in cluster_papers],
            })

        analysis.results_json = analysis.results_json or {}
        analysis.results_json["domains"] = domain_data
        analysis.results_json["primary_domain"] = primary_domain
        analysis.results_json["topics"] = detected_topics
        analysis.results_json["all_keywords"] = extracted_kws
        analysis.results_json["total_clusters"] = len(clusters)
        analysis.status = AnalysisStatus.COMPLETED.value
        analysis.status_message = f"Discovered primary domain: {primary_domain}"
        analysis.completed_at = datetime.now(timezone.utc)
        await db.commit()

        logger.info(f"Domain discovery completed: {primary_domain}, {len(clusters)} clusters")
        return analysis

    except Exception as e:
        analysis.status = AnalysisStatus.FAILED.value
        analysis.status_message = f"Domain discovery failed: {str(e)}"
        await db.commit()
        logger.error(f"Domain discovery failed: {e}")
        raise
