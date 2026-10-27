import React from 'react';
import { FileText, Eye, Trash2, RefreshCw, Layers, CheckCircle2, Clock, AlertTriangle, BookOpen } from 'lucide-react';
import { deletePaper, reprocessPaper } from '../api';

export default function PaperList({ projectId, papers, onPaperSelect, onRefresh }) {
  const handleDelete = async (paperId, title) => {
    if (window.confirm(`Remove paper "${title}" from project?`)) {
      try {
        await deletePaper(projectId, paperId);
        onRefresh();
      } catch (err) {
        alert(`Failed to delete paper: ${err.message}`);
      }
    }
  };

  const handleReprocess = async (paperId) => {
    try {
      await reprocessPaper(projectId, paperId);
      onRefresh();
    } catch (err) {
      alert(`Failed to reprocess: ${err.message}`);
    }
  };

  if (!papers || papers.length === 0) {
    return (
      <div className="glass-panel" style={{
        padding: '3rem 2rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        background: '#FFFFFF'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: '#F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-dim)'
        }}>
          <FileText size={28} />
        </div>
        <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>No papers uploaded yet</h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', maxWidth: '420px' }}>
          Upload at least 2 research papers in PDF format above to begin literature comparison and research gap detection.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ overflow: 'hidden', background: '#FFFFFF' }}>
      <div style={{
        padding: '1.25rem 1.75rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#F8FAFC'
      }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
            <FileText size={18} color="#2563EB" />
            Project Papers ({papers.length})
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
            Extracted with PyMuPDF • Sentence embeddings via all-MiniLM-L6-v2
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="btn btn-secondary btn-sm"
          style={{ gap: '0.35rem' }}
          title="Refresh papers status"
        >
          <RefreshCw size={14} />
          <span>Refresh Status</span>
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{
              borderBottom: '1px solid var(--border)',
              background: '#F8FAFC',
              color: 'var(--text-dim)',
              fontSize: '0.75rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700
            }}>
              <th style={{ padding: '0.85rem 1.75rem' }}>#</th>
              <th style={{ padding: '0.85rem 1rem' }}>Paper Details</th>
              <th style={{ padding: '0.85rem 1rem' }}>Pages & Size</th>
              <th style={{ padding: '0.85rem 1rem' }}>PyMuPDF Chunks</th>
              <th style={{ padding: '0.85rem 1rem' }}>Status</th>
              <th style={{ padding: '0.85rem 1.75rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {papers.map((paper, index) => {
              const isReady = paper.status === 'ready' || paper.status === 'extracted';
              const isProcessing = paper.status === 'extracting' || paper.status === 'embedding' || paper.status === 'uploaded';
              const isFailed = paper.status === 'failed';

              return (
                <tr
                  key={paper.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Index */}
                  <td style={{ padding: '1rem 1.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    P{index + 1}
                  </td>

                  {/* Title & Metadata */}
                  <td style={{ padding: '1rem 1rem', maxWidth: '380px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: '0.2rem' }}>
                      {paper.title || paper.filename}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', color: '#2563EB', fontWeight: 600 }}>{paper.filename}</span>
                      {paper.year && <span>• {paper.year}</span>}
                      {paper.authors && (
                        <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          • {paper.authors}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Pages & Size */}
                  <td style={{ padding: '1rem 1rem', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      <BookOpen size={14} color="#2563EB" />
                      <span>{paper.page_count ? `${paper.page_count} page${paper.page_count > 1 ? 's' : ''}` : '1 page'}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {paper.file_size ? `${(paper.file_size / 1024).toFixed(1)} KB` : ''}
                    </div>
                  </td>

                  {/* Chunks */}
                  <td style={{ padding: '1rem 1rem' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      color: '#1D4ED8',
                      padding: '0.25rem 0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      fontWeight: 600
                    }}>
                      <Layers size={13} />
                      <span>{paper.chunk_count !== undefined ? `${paper.chunk_count} chunk${paper.chunk_count > 1 ? 's' : ''}` : '1 chunk'}</span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td style={{ padding: '1rem 1rem' }}>
                    {isReady && (
                      <span className="badge badge-ready" title={paper.status_message}>
                        <CheckCircle2 size={12} /> Ready
                      </span>
                    )}
                    {isProcessing && (
                      <span className="badge badge-processing" title={paper.status_message}>
                        <Clock size={12} /> {paper.status}
                      </span>
                    )}
                    {isFailed && (
                      <span className="badge badge-danger" title={paper.status_message}>
                        <AlertTriangle size={12} /> Failed
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '1rem 1.75rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onPaperSelect(paper.id)}
                        style={{ padding: '0.4rem 0.75rem', gap: '0.35rem' }}
                        title="View PyMuPDF extracted text & metadata"
                      >
                        <Eye size={14} color="#2563EB" />
                        <span>Inspect Intel</span>
                      </button>

                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleReprocess(paper.id)}
                        style={{ padding: '0.4rem', color: 'var(--text-dim)' }}
                        title="Reprocess extraction"
                      >
                        <RefreshCw size={14} />
                      </button>

                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDelete(paper.id, paper.title)}
                        style={{ padding: '0.4rem', color: 'var(--danger)' }}
                        title="Delete paper"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
