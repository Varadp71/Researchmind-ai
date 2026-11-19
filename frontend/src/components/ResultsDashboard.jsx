import React, { useState } from 'react';
import { 
  Brain, Sparkles, Layers, Compass, TrendingUp, AlertCircle, 
  CheckCircle2, ArrowRight, Share2, Download, Search, Info, HelpCircle
} from 'lucide-react';
import { downloadReport } from '../api';

export default function ResultsDashboard({ dashboard, onRunAnalysis, analyzing }) {
  const [selectedPair, setSelectedPair] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadReport = async () => {
    if (!dashboard || !dashboard.project_id) return;
    try {
      setDownloading(true);
      await downloadReport(dashboard.project_id, dashboard.project_name);
    } catch (err) {
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  if (!dashboard || !dashboard.similarity_matrix) {
    return (
      <div className="glass-panel" style={{
        padding: '4rem 2rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        background: '#FFFFFF',
        border: '1px solid var(--border)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#2563EB'
        }}>
          <Sparkles size={32} />
        </div>
        <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)' }}>Research Intelligence Analysis Not Run Yet</h3>
        <p style={{ fontSize: '0.92rem', color: 'var(--text-dim)', maxWidth: '500px', lineHeight: 1.6 }}>
          Upload at least 2 papers and run the multi-paper semantic analysis to generate the pairwise similarity matrix, discover research domains, and detect preliminary research gaps.
        </p>
        <button
          className="btn btn-primary btn-lg"
          onClick={onRunAnalysis}
          disabled={analyzing}
          style={{ marginTop: '0.5rem', gap: '0.6rem' }}
        >
          <Brain size={20} />
          <span>{analyzing ? 'Analyzing Papers...' : 'Run Multi-Paper Analysis'}</span>
        </button>
      </div>
    );
  }

  const { paper_count, similarity_matrix, domains, gaps } = dashboard;
  const matrix = similarity_matrix || [];
  const domainList = domains || [];
  const gapList = gaps || [];

  // Calculate average cross-paper similarity
  let totalSim = 0;
  let countSim = 0;
  for (let i = 0; i < matrix.length; i++) {
    for (let j = i + 1; j < matrix.length; j++) {
      totalSim += matrix[i][j];
      countSim += 1;
    }
  }
  const avgSimilarity = countSim > 0 ? (totalSim / countSim) : 1.0;

  // Extract pairwise paper cards
  const pairwiseCards = [];
  for (let i = 0; i < matrix.length; i++) {
    for (let j = i + 1; j < matrix.length; j++) {
      pairwiseCards.push({
        paperA: `Paper ${i + 1}`,
        paperB: `Paper ${j + 1}`,
        score: matrix[i][j],
        percent: Math.round(matrix[i][j] * 100),
      });
    }
  }

  // Get primary domain from domainList
  const primaryDomain = domainList.length > 0 ? domainList[0].name : "Artificial Intelligence & Machine Learning";
  const primaryKeywords = domainList.length > 0 && domainList[0].keywords ? domainList[0].keywords : [
    "Neural Architecture", "Representation Learning", "Benchmark", "Transformers", "Empirical Evaluation"
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Research Intelligence Report Header & Download Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '1.25rem 1.75rem',
        background: '#FFFFFF',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Sparkles size={18} color="#2563EB" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Research Intelligence Report
            </h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', margin: 0 }}>
            Comprehensive analysis synthesizing paper similarity, extracted research domains, and detected methodology gaps.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleDownloadReport}
          disabled={downloading}
          style={{ gap: '0.5rem', boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)' }}
        >
          <Download size={16} />
          <span>{downloading ? 'Generating PDF...' : 'Download Report (PDF)'}</span>
        </button>
      </div>

      {/* Top Banner & Quick Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1.25rem'
      }}>
        {/* Metric 1 */}
        <div className="glass-card" style={{ borderLeft: '4px solid #2563EB', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              PAPERS ANALYZED
            </span>
            <Layers size={18} color="#2563EB" />
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
            {paper_count}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 500 }}>
            Processed via PyMuPDF
          </span>
        </div>

        {/* Metric 2 */}
        <div className="glass-card" style={{ borderLeft: '4px solid #0284C7', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              MEAN CORPUS SIMILARITY
            </span>
            <TrendingUp size={18} color="#0284C7" />
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0369A1', marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
            {Math.round(avgSimilarity * 100)}%
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 500 }}>
            all-MiniLM-L6-v2 Embeddings
          </span>
        </div>

        {/* Metric 3 */}
        <div className="glass-card" style={{ borderLeft: '4px solid #4F46E5', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              DOMAINS DISCOVERED
            </span>
            <Compass size={18} color="#4F46E5" />
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#4338CA', marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
            {domainList.length || 1}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 500 }}>
            Semantic Density Clusters
          </span>
        </div>

        {/* Metric 4 */}
        <div className="glass-card" style={{ borderLeft: '4px solid #D97706', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              RESEARCH GAPS DETECTED
            </span>
            <AlertCircle size={18} color="#D97706" />
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#B45309', marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
            {gapList.length}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 500 }}>
            Cross-Paper Intelligence
          </span>
        </div>
      </div>

      {/* Row 1: Pairwise Paper Similarity Matrix & Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
        {/* Similarity Matrix Card */}
        <div className="glass-panel" style={{ padding: '1.75rem', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <Brain size={20} color="#2563EB" />
                Pairwise Paper Similarity Matrix
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                Cosine similarity between document chunk manifolds (0%–100%)
              </p>
            </div>
            <span className="badge badge-primary">all-MiniLM-L6-v2</span>
          </div>

          {/* Matrix Visual Table */}
          <div style={{ overflowX: 'auto', padding: '0.5rem 0' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: '8px', margin: '0 auto' }}>
              <thead>
                <tr>
                  <th style={{ padding: '6px', color: 'var(--text-muted)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}></th>
                  {matrix.map((_, colIdx) => (
                    <th key={colIdx} style={{ padding: '6px 14px', color: '#1E293B', fontSize: '0.82rem', fontFamily: 'var(--font-mono)', textAlign: 'center', fontWeight: 700 }}>
                      Paper {colIdx + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    <td style={{ padding: '6px 14px', color: '#1E293B', fontSize: '0.82rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      Paper {rowIdx + 1}
                    </td>
                    {row.map((score, colIdx) => {
                      const percent = Math.round(score * 100);
                      const isDiagonal = rowIdx === colIdx;
                      
                      // Dynamic academic high-contrast heatmap color
                      let bg = '#F8FAFC';
                      let border = '#E2E8F0';
                      let textColor = '#64748B';
                      
                      if (isDiagonal) {
                        bg = '#EFF6FF';
                        border = '#93C5FD';
                        textColor = '#1D4ED8';
                      } else if (score >= 0.75) {
                        bg = '#E0F2FE';
                        border = '#7DD3FC';
                        textColor = '#0369A1';
                      } else if (score >= 0.5) {
                        bg = '#EEF2FF';
                        border = '#C7D2FE';
                        textColor = '#4338CA';
                      } else {
                        bg = '#F8FAFC';
                        border = '#E2E8F0';
                        textColor = '#475569';
                      }

                      return (
                        <td 
                          key={colIdx}
                          onClick={() => !isDiagonal && setSelectedPair({ a: rowIdx + 1, b: colIdx + 1, score, percent })}
                          title={`Paper ${rowIdx + 1} ↔ Paper ${colIdx + 1}: ${percent}% similarity`}
                          style={{
                            background: bg,
                            border: `1px solid ${border}`,
                            borderRadius: '8px',
                            padding: '12px 18px',
                            textAlign: 'center',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            color: textColor,
                            cursor: isDiagonal ? 'default' : 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: 'var(--shadow-sm)'
                          }}
                          onMouseEnter={e => { if (!isDiagonal) { e.currentTarget.style.transform = 'scale(1.06)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; } }}
                          onMouseLeave={e => { if (!isDiagonal) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; } }}
                        >
                          {percent}%
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.5rem',
            marginTop: '1.25rem',
            fontSize: '0.78rem',
            color: 'var(--text-dim)',
            fontFamily: 'var(--font-mono)',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border)'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#F8FAFC', border: '1px solid #CBD5E1' }} /> &lt;50% Divergent
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#EEF2FF', border: '1px solid #C7D2FE' }} /> 50%–74% Moderate
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#E0F2FE', border: '1px solid #7DD3FC' }} /> &gt;75% High Overlap
            </span>
          </div>
        </div>

        {/* Pairwise Pair Comparison Cards */}
        <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)' }}>Pairwise Similarity Alignment</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
              Direct cross-paper alignment metrics calculated from embeddings
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, overflowY: 'auto' }}>
            {pairwiseCards.map((pair, idx) => (
              <div 
                key={idx}
                className="glass-card"
                style={{
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#F8FAFC',
                  border: '1px solid var(--border)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                    <span>{pair.paperA}</span>
                    <ArrowRight size={14} color="#64748B" />
                    <span>{pair.paperB}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                    {pair.percent >= 75 ? 'Strong thematic & methodological alignment' : pair.percent >= 50 ? 'Moderate conceptual overlap' : 'Divergent research paradigms'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '1.3rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    color: pair.percent >= 75 ? '#0284C7' : pair.percent >= 50 ? '#4F46E5' : '#64748B'
                  }}>
                    {pair.percent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Research Domain Discovery */}
      <div className="glass-panel" style={{ padding: '1.75rem', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Compass size={20} color="#0284C7" />
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Research Domain & Topic Discovery</h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
              Identified from full-text vocabulary, section embeddings, and paper abstracts
            </p>
          </div>
          <span className="badge badge-info">NLP & Cluster Discovery</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '1.5rem' }}>
          {/* Primary Domain Box */}
          <div className="glass-card" style={{ background: '#F8FAFC', border: '1px solid #BAE6FD' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0369A1', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              Primary Research Domain
            </span>
            <h4 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: '0.5rem 0', fontWeight: 800 }}>
              {primaryDomain}
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              The analyzed literature demonstrates a primary focus on {primaryDomain.toLowerCase()}, integrating shared empirical benchmarks and foundational methodologies.
            </p>
          </div>

          {/* Keywords & Sub-topics */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#FFFFFF' }}>
            <div>
              <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                Discovered Research Keywords & Topics
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.65rem' }}>
                {primaryKeywords.map((kw, idx) => (
                  <span 
                    key={idx}
                    style={{
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      color: '#1D4ED8',
                      padding: '0.35rem 0.85rem',
                      borderRadius: '9999px',
                      fontSize: '0.82rem',
                      fontWeight: 600
                    }}
                  >
                    #{kw}
                  </span>
                ))}
              </div>
            </div>

            {domainList.length > 1 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  Sub-Clusters Identified:
                </span>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.4rem' }}>
                  {domainList.map((d, idx) => (
                    <div key={idx} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      • <strong>{d.name}</strong> ({d.size || 1} paper{d.size > 1 ? 's' : ''})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: AI-Generated Preliminary Research Gaps */}
      <div className="glass-panel" style={{ padding: '1.75rem', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Sparkles size={20} color="#D97706" />
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>AI-Generated Preliminary Research Gaps</h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
              Synthesized from cross-paper comparative analysis, methodology contrast, and literature boundaries
            </p>
          </div>
          <span className="badge badge-warning" style={{ gap: '0.35rem' }}>
            <Info size={12} /> Preliminary Prototype Output
          </span>
        </div>

        {/* Gaps Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {gapList.map((gap, idx) => (
            <div 
              key={gap.id || idx}
              className="glass-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #D97706, #EA580C)'
              }} />

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem', marginTop: '0.25rem' }}>
                  <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                    {gap.gap_type || 'Methodology Gap'}
                  </span>
                  {gap.confidence && (
                    <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontWeight: 600 }}>
                      Confidence: {Math.round(gap.confidence * 100)}%
                    </span>
                  )}
                </div>

                <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: '0.65rem', fontWeight: 700 }}>
                  {gap.title}
                </h4>

                <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  {gap.description}
                </p>
              </div>

              {gap.future_direction && (
                <div style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  marginTop: 'auto'
                }}>
                  <div style={{ fontSize: '0.72rem', color: '#4338CA', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, marginBottom: '0.3rem' }}>
                    Recommended Future Direction:
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {gap.future_direction}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
