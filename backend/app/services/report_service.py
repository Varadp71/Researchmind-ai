"""
Report Generation Service - PDF report using ReportLab
"""
import uuid
import io
import logging
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.paper import Paper, PaperStatus
from app.models.analysis import Analysis, ResearchDomain, ResearchGap, SimilarityResult

logger = logging.getLogger(__name__)


async def generate_pdf_report(
    project_id: uuid.UUID,
    project_name: str,
    db: AsyncSession,
) -> bytes:
    """Generate a comprehensive PDF report for a project."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib.colors import HexColor
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        PageBreak, HRFlowable
    )
    from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=72,
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle', parent=styles['Title'],
        fontSize=24, spaceAfter=30,
        textColor=HexColor('#1a365d'),
    )
    heading_style = ParagraphStyle(
        'CustomHeading', parent=styles['Heading1'],
        fontSize=16, spaceAfter=12, spaceBefore=20,
        textColor=HexColor('#2d3748'),
    )
    subheading_style = ParagraphStyle(
        'CustomSubHeading', parent=styles['Heading2'],
        fontSize=13, spaceAfter=8, spaceBefore=12,
        textColor=HexColor('#4a5568'),
    )
    body_style = ParagraphStyle(
        'CustomBody', parent=styles['Normal'],
        fontSize=10, spaceAfter=8,
        alignment=TA_JUSTIFY,
    )

    elements = []

    # Title Page
    elements.append(Spacer(1, 2 * inch))
    elements.append(Paragraph("ResearchMind AI", title_style))
    elements.append(Paragraph("Research Analysis Report", heading_style))
    elements.append(Spacer(1, 0.5 * inch))
    elements.append(Paragraph(f"<b>Project:</b> {project_name}", body_style))
    elements.append(Paragraph(
        f"<b>Generated:</b> {datetime.now().strftime('%B %d, %Y at %H:%M')}",
        body_style,
    ))
    elements.append(PageBreak())

    # Get data
    paper_result = await db.execute(
        select(Paper)
        .where(Paper.project_id == project_id)
        .where(Paper.status == PaperStatus.READY.value)
    )
    papers = list(paper_result.scalars().all())

    # Papers Section
    elements.append(Paragraph("1. Papers Analyzed", heading_style))
    elements.append(HRFlowable(width="100%", color=HexColor('#e2e8f0')))

    for i, paper in enumerate(papers, 1):
        elements.append(Paragraph(f"<b>{i}. {paper.title}</b>", subheading_style))
        if paper.authors:
            elements.append(Paragraph(f"Authors: {paper.authors}", body_style))
        if paper.year:
            elements.append(Paragraph(f"Year: {paper.year}", body_style))
        if paper.abstract:
            elements.append(Paragraph(f"Abstract: {paper.abstract[:500]}", body_style))
        elements.append(Spacer(1, 8))

    # Analysis Results
    analysis_result = await db.execute(
        select(Analysis).where(Analysis.project_id == project_id)
    )
    analyses = list(analysis_result.scalars().all())

    for analysis in analyses:
        if not analysis.results_json:
            continue

        # Similarity results
        if "similarity_matrix" in analysis.results_json:
            elements.append(PageBreak())
            elements.append(Paragraph("2. Similarity Analysis", heading_style))
            elements.append(HRFlowable(width="100%", color=HexColor('#e2e8f0')))
            matrix = analysis.results_json["similarity_matrix"]
            titles = analysis.results_json.get("paper_titles", [])
            elements.append(Paragraph(
                f"Pairwise similarity computed for {len(titles)} papers.",
                body_style,
            ))

            if matrix and titles:
                # Build table
                header = [""] + [t[:20] + "..." if len(t) > 20 else t for t in titles]
                table_data = [header]
                for i, row in enumerate(matrix):
                    label = titles[i][:20] + "..." if len(titles[i]) > 20 else titles[i]
                    table_data.append([label] + [f"{v:.2f}" for v in row])
                
                t = Table(table_data, repeatRows=1)
                t.setStyle(TableStyle([
                    ('FONTSIZE', (0, 0), (-1, -1), 7),
                    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#edf2f7')),
                    ('BACKGROUND', (0, 0), (0, -1), HexColor('#edf2f7')),
                    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cbd5e0')),
                    ('ALIGN', (1, 1), (-1, -1), 'CENTER'),
                ]))
                elements.append(t)

        # Domains
        if "domains" in analysis.results_json:
            elements.append(Spacer(1, 20))
            elements.append(Paragraph("3. Research Domains", heading_style))
            elements.append(HRFlowable(width="100%", color=HexColor('#e2e8f0')))
            for d in analysis.results_json["domains"]:
                elements.append(Paragraph(f"<b>{d['name']}</b>", subheading_style))
                if d.get("description"):
                    elements.append(Paragraph(d["description"], body_style))
                elements.append(Paragraph(f"Papers: {d.get('paper_count', 0)}", body_style))

        # Gaps
        if "gap_detection" in analysis.results_json:
            elements.append(PageBreak())
            elements.append(Paragraph("4. Research Gaps", heading_style))
            elements.append(HRFlowable(width="100%", color=HexColor('#e2e8f0')))

            gap_result = await db.execute(
                select(ResearchGap).where(ResearchGap.analysis_id == analysis.id)
            )
            gaps = list(gap_result.scalars().all())
            for gap in gaps:
                elements.append(Paragraph(f"<b>{gap.title}</b>", subheading_style))
                elements.append(Paragraph(gap.description, body_style))
                if gap.future_direction:
                    elements.append(Paragraph(
                        f"<i>Future Direction: {gap.future_direction}</i>", body_style
                    ))

        # Novelty
        if "novelty" in analysis.results_json:
            elements.append(Spacer(1, 20))
            elements.append(Paragraph("5. Novelty Analysis", heading_style))
            elements.append(HRFlowable(width="100%", color=HexColor('#e2e8f0')))
            for pid, data in analysis.results_json["novelty"].items():
                elements.append(Paragraph(
                    f"<b>{data['paper_title']}</b> — {data['novelty_level']} novelty ({data['composite_score']:.2f})",
                    body_style,
                ))
                elements.append(Paragraph(data.get("explanation", ""), body_style))

        # Trends
        if "trends" in analysis.results_json:
            elements.append(Spacer(1, 20))
            elements.append(Paragraph("6. Trend Analysis", heading_style))
            elements.append(HRFlowable(width="100%", color=HexColor('#e2e8f0')))
            trends = analysis.results_json["trends"]
            top = trends.get("top_topics", [])
            if top:
                elements.append(Paragraph("Top Research Topics:", subheading_style))
                for topic, count in top[:10]:
                    elements.append(Paragraph(f"• {topic}: {count} mentions", body_style))

        # Literature Review
        if "literature_review" in analysis.results_json:
            elements.append(PageBreak())
            elements.append(Paragraph("7. Literature Review", heading_style))
            elements.append(HRFlowable(width="100%", color=HexColor('#e2e8f0')))
            review = analysis.results_json["literature_review"]
            # Split by paragraphs
            for para in review.get("full_text", "").split("\n\n"):
                para = para.strip()
                if not para:
                    continue
                if para.startswith("## "):
                    elements.append(Paragraph(para.replace("## ", ""), subheading_style))
                elif para.startswith("### "):
                    elements.append(Paragraph(para.replace("### ", ""), subheading_style))
                else:
                    # Clean markdown formatting for PDF
                    clean = para.replace("**", "").replace("*", "")
                    elements.append(Paragraph(clean, body_style))

    # Build PDF
    doc.build(elements)
    return buffer.getvalue()
