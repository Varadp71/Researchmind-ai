import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, Brain, Sparkles, Play, RefreshCw,
  Upload, CheckCircle2, Clock, AlertCircle, Trash2, Eye,
  FlaskConical, BarChart3, Layers
} from 'lucide-react';
import { getProject, getPapers, getPaper, uploadPaper, deletePaper, startAnalysis, getAnalysisStatus, getDashboard } from '../api';

export default function ProjectWorkspace() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [papers, setPapers] = useState([]);
  const [activeTab, setActiveTab] = useState('papers');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [proj, paperList] = await Promise.all([
        getProject(projectId),
        getPapers(projectId),
      ]);
      setProject(proj);
      setPapers(paperList);
      // Try loading analysis/dashboard
      try {
        const status = await getAnalysisStatus(projectId);
        setAnalysisStatus(status);
      } catch (_) {}
      try {
        const dash = await getDashboard(projectId);
        setDashboard(dash);
      } catch (_) {}
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (files) => {
    setUploading(true);
    setError(null);
    try {
      for (const file of files) {
        await uploadPaper(projectId, file);
      }
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    if (files.length) handleUpload(files);
  };

  const handleRunAnalysis = async () => {
    try {
      setAnalyzing(true);
      setError(null);
      await startAnalysis(projectId);
      // Poll for completion
      const poll = setInterval(async () => {
        try {
          const status = await getAnalysisStatus(projectId);
          setAnalysisStatus(status);
          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(poll);
            setAnalyzing(false);
            if (status.status === 'completed') {
              const dash = await getDashboard(projectId);
              setDashboard(dash);
              setActiveTab('results');
            }
          }
        } catch (_) {
          clearInterval(poll);
          setAnalyzing(false);
        }
      }, 2000);
    } catch (err) {
      setError(err.message);
      setAnalyzing(false);
    }
  };

  const handleDeletePaper = async (paperId) => {
    try {
      await deletePaper(projectId, paperId);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const viewPaperDetail = async (paperId) => {
    try {
      const detail = await getPaper(projectId, paperId);
      setSelectedPaper(detail);
    } catch (err) {
      setError(err.message);
    }
  };

  const statusBadge = (status) => {
    const map = {
      uploaded: 'badge-info', processing: 'badge-primary',
      extracted: 'badge-accent', ready: 'badge-success', failed: 'badge-danger',
    };
    return <span className={`badge ${map[status] || 'badge-neutral'}`}>{status}</span>;
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')}>
            <ArrowLeft size={16} /> Projects
          </button>
        </div>
        <div className="page-header-row">
          <div>
            <h1>{project?.name || 'Project'}</h1>
            <p>{project?.description || 'Research project workspace'}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={load}>
              <RefreshCw size={16} /> Refresh
            </button>
            <button className="btn btn-primary" onClick={handleRunAnalysis} disabled={analyzing || papers.length < 2}>
              {analyzing ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Analyzing...</>
                : <><FlaskConical size={16} /> Run Analysis</>}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-banner mb-3"><AlertCircle size={18} />{error}</div>}

      {/* Tabs */}
      <div className="tabs">
        {[
          { key: 'papers', icon: FileText, label: 'Papers', count: papers.length },
          { key: 'results', icon: BarChart3, label: 'Results Dashboard' },
        ].map(t => (
          <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            <t.icon size={16} />
            {t.label}
            {t.count !== undefined && <span className="badge badge-neutral" style={{ marginLeft: '0.25rem' }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'papers' && (
        <>
          {/* Upload Zone */}
          <div
            className={`upload-zone mb-3 ${dragOver ? 'drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input').click()}
          >
            <input id="file-input" type="file" accept=".pdf" multiple hidden
              onChange={e => handleUpload(Array.from(e.target.files))} />
            <Upload size={40} style={{ color: 'var(--primary-light)', marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.35rem' }}>
              {uploading ? 'Uploading...' : 'Drop Research PDFs Here'}
            </h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              or click to browse • PDF files up to 50MB
            </p>
            {uploading && (
              <div style={{ marginTop: '1rem', width: '200px', margin: '1rem auto 0' }}>
                <div className="progress-bar"><div className="progress-fill" style={{ width: '60%' }} /></div>
              </div>
            )}
          </div>

          {/* Paper List */}
          {papers.length === 0 ? (
            <div className="empty-state">
              <FileText />
              <h3>No Papers Uploaded</h3>
              <p style={{ fontSize: '0.85rem' }}>Upload PDF research papers to begin analysis</p>
            </div>
          ) : (
            <div className="card-flat" style={{ overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Paper</th>
                    <th>Authors</th>
                    <th>Status</th>
                    <th>Pages</th>
                    <th style={{ width: 100 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {papers.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {p.title || p.filename || 'Untitled'}
                        </div>
                        {p.filename && p.title && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{p.filename}</div>
                        )}
                      </td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.authors || '—'}
                      </td>
                      <td>{statusBadge(p.status)}</td>
                      <td>{p.page_count || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => viewPaperDetail(p.id)} title="View Details">
                            <Eye size={14} />
                          </button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}
                            onClick={() => handleDeletePaper(p.id)} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === 'results' && (
        <div>
          {!dashboard ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <FlaskConical size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <h3>No Analysis Results Yet</h3>
              <p style={{ color: 'var(--text-dim)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                Upload at least 2 papers and run analysis to see results
              </p>
              <button className="btn btn-primary" onClick={handleRunAnalysis} disabled={analyzing || papers.length < 2}>
                <Play size={16} /> Run Analysis
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Similarity Matrix */}
              {dashboard.similarity_matrix && (
                <div className="card">
                  <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Layers size={18} style={{ color: 'var(--primary-light)' }} />
                    Paper Similarity Matrix
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th></th>
                          {(dashboard.paper_labels || []).map((l, i) => (
                            <th key={i} style={{ fontSize: '0.65rem', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.similarity_matrix.map((row, ri) => (
                          <tr key={ri}>
                            <td style={{ fontWeight: 500, fontSize: '0.75rem', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {(dashboard.paper_labels || [])[ri] || `Paper ${ri + 1}`}
                            </td>
                            {row.map((val, ci) => {
                              const v = typeof val === 'number' ? val : 0;
                              const hue = v > 0.7 ? 130 : v > 0.4 ? 45 : 220;
                              return (
                                <td key={ci} style={{
                                  textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600,
                                  background: `hsla(${hue}, 60%, 50%, ${v * 0.25})`,
                                  color: ri === ci ? 'var(--text-muted)' : 'var(--text-primary)',
                                }}>
                                  {v.toFixed(2)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Domains */}
              {dashboard.domains && dashboard.domains.length > 0 && (
                <div className="card">
                  <h3 style={{ marginBottom: '1rem' }}>Discovered Domains</h3>
                  <div className="grid-3">
                    {dashboard.domains.map((d, i) => (
                      <div key={i} className="card-flat" style={{ borderLeft: '3px solid var(--primary)' }}>
                        <h4>{d.name || `Domain ${i + 1}`}</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{d.description || ''}</p>
                        {d.keywords && (
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                            {d.keywords.slice(0, 5).map((k, j) => <span key={j} className="badge badge-primary">{k}</span>)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gaps */}
              {dashboard.gaps && dashboard.gaps.length > 0 && (
                <div className="card">
                  <h3 style={{ marginBottom: '1rem' }}>Research Gaps Detected</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {dashboard.gaps.map((g, i) => (
                      <div key={i} className="card-flat" style={{ borderLeft: '3px solid var(--warning)' }}>
                        <h4>{g.title || `Gap ${i + 1}`}</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{g.description || ''}</p>
                        {g.confidence && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <div className="progress-bar" style={{ width: 120 }}>
                              <div className="progress-fill" style={{ width: `${g.confidence * 100}%` }} />
                            </div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              Confidence: {(g.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Paper Detail Modal */}
      {selectedPaper && (
        <div className="modal-overlay" onClick={() => setSelectedPaper(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, maxHeight: '90vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h2>{selectedPaper.title || selectedPaper.filename || 'Paper Details'}</h2>
                {selectedPaper.authors && <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: '0.25rem' }}>{selectedPaper.authors}</p>}
              </div>
              {statusBadge(selectedPaper.status)}
            </div>

            {selectedPaper.abstract && (
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Abstract</h4>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>{selectedPaper.abstract}</p>
              </div>
            )}

            <div className="grid-2" style={{ marginBottom: '1.25rem' }}>
              {selectedPaper.year && (
                <div className="card-flat"><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Year</div><div style={{ fontWeight: 600 }}>{selectedPaper.year}</div></div>
              )}
              {selectedPaper.page_count && (
                <div className="card-flat"><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pages</div><div style={{ fontWeight: 600 }}>{selectedPaper.page_count}</div></div>
              )}
            </div>

            {selectedPaper.keywords && selectedPaper.keywords.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Keywords</h4>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {selectedPaper.keywords.map((k, i) => <span key={i} className="badge badge-primary">{k}</span>)}
                </div>
              </div>
            )}

            {selectedPaper.extracted_text && (
              <div>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Extracted Text Preview</h4>
                <div style={{
                  maxHeight: 200, overflow: 'auto', padding: '1rem', borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-deepest)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
                  lineHeight: 1.6, color: 'var(--text-dim)',
                }}>
                  {selectedPaper.extracted_text.substring(0, 2000)}
                  {selectedPaper.extracted_text.length > 2000 && '...'}
                </div>
              </div>
            )}

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedPaper(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
