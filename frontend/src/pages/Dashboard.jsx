import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Brain, Compass, Search, TrendingUp, Activity,
  ArrowRight, FolderKanban, Sparkles, AlertCircle, Clock,
  CheckCircle2, BarChart3
} from 'lucide-react';
import { getProjects, checkHealth } from '../api';

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [backendStatus, setBackendStatus] = useState('checking'); // checking | online | offline
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check backend health
    checkHealth()
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline'));

    // Load projects
    getProjects()
      .then(setProjects)
      .catch(err => setError(err.message));
  }, []);

  const totalPapers = projects.reduce((sum, p) => sum + (p.paper_count || 0), 0);

  const stats = [
    { icon: FolderKanban, label: 'Projects', value: projects.length, color: 'primary' },
    { icon: FileText, label: 'Papers Uploaded', value: totalPapers, color: 'accent' },
    { icon: Compass, label: 'Research Domains', value: '—', color: 'warning' },
    { icon: Search, label: 'Potential Gaps', value: '—', color: 'danger' },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Brain size={28} style={{ color: 'var(--primary-light)' }} />
              Research Intelligence Dashboard
            </h1>
            <p>Monitor your research analysis pipeline and intelligence outputs</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              background: backendStatus === 'online' ? 'var(--success-glow)' : backendStatus === 'offline' ? 'var(--danger-glow)' : 'var(--primary-subtle)',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: backendStatus === 'online' ? 'var(--success)' : backendStatus === 'offline' ? 'var(--danger)' : 'var(--primary)',
                boxShadow: backendStatus === 'online' ? '0 0 8px var(--success)' : 'none',
              }} />
              <span style={{ color: backendStatus === 'online' ? 'var(--success)' : backendStatus === 'offline' ? 'var(--danger)' : 'var(--primary-light)' }}>
                {backendStatus === 'online' ? 'Backend Online' : backendStatus === 'offline' ? 'Backend Offline' : 'Checking...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="error-banner mb-3">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid-4 mb-3 animate-in">
        {stats.map((s, i) => (
          <div key={i} className={`stat-card animate-in animate-in-delay-${i + 1}`}>
            <div className={`stat-icon ${s.color}`}>
              <s.icon size={24} />
            </div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Recent Projects */}
        <div className="card animate-in animate-in-delay-1">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FolderKanban size={18} style={{ color: 'var(--primary-light)' }} />
              Recent Projects
            </h3>
            <Link to="/projects" className="btn btn-ghost btn-sm">
              View All <ArrowRight size={14} />
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <FolderKanban size={40} />
              <h3>No Projects Yet</h3>
              <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Create your first research project to get started</p>
              <Link to="/projects" className="btn btn-primary btn-sm">
                Create Project
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {projects.slice(0, 4).map(p => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                    textDecoration: 'none', color: 'inherit',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                >
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                      {p.paper_count || 0} papers
                    </div>
                  </div>
                  <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Analysis Pipeline Status */}
        <div className="card animate-in animate-in-delay-2">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Activity size={18} style={{ color: 'var(--accent-light)' }} />
            Analysis Pipeline
          </h3>

          <div className="pipeline">
            {[
              { label: 'PDF Upload & Ingestion', status: 'completed', detail: 'PyMuPDF extraction ready' },
              { label: 'Text Extraction & Parsing', status: 'completed', detail: 'Metadata, abstract, sections' },
              { label: 'Semantic Embeddings', status: 'completed', detail: 'all-MiniLM-L6-v2 model' },
              { label: 'Similarity Analysis', status: 'completed', detail: 'Cosine similarity matrix' },
              { label: 'Domain Discovery', status: 'completed', detail: 'HDBSCAN clustering' },
              { label: 'Gap Detection', status: 'completed', detail: 'Cross-paper contrastive analysis' },
            ].map((step, i, arr) => (
              <div key={i} className="pipeline-step">
                {i < arr.length - 1 && <div className="pipeline-connector" />}
                <div className={`pipeline-dot ${step.status}`}>
                  {step.status === 'completed' && <CheckCircle2 size={18} />}
                  {step.status === 'processing' && <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />}
                  {step.status === 'pending' && <Clock size={16} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{step.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{step.detail}</div>
                </div>
                <span className={`badge badge-${step.status === 'completed' ? 'success' : step.status === 'processing' ? 'primary' : 'neutral'}`}>
                  {step.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Research Domains Preview */}
        <div className="card animate-in animate-in-delay-3">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Compass size={18} style={{ color: 'var(--warning)' }} />
            Research Domains
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { name: 'Machine Learning & AI', papers: 'Upload papers to discover', color: 'var(--primary-light)' },
              { name: 'Natural Language Processing', papers: 'domains automatically', color: 'var(--accent-light)' },
              { name: 'Computer Vision', papers: 'via HDBSCAN clustering', color: 'var(--success)' },
            ].map((d, i) => (
              <div key={i} style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                borderLeft: `3px solid ${d.color}`,
              }}>
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{d.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{d.papers}</div>
              </div>
            ))}
          </div>
          <Link to="/domains" className="btn btn-ghost btn-sm mt-2" style={{ width: '100%', justifyContent: 'center' }}>
            Explore Domains <ArrowRight size={14} />
          </Link>
        </div>

        {/* Research Gaps Preview */}
        <div className="card animate-in animate-in-delay-4">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Search size={18} style={{ color: 'var(--danger)' }} />
            Research Gaps
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { title: 'Cross-Domain Analysis', desc: 'Run analysis on uploaded papers to detect gaps' },
              { title: 'Methodology Comparison', desc: 'Contrastive analysis reveals unexplored methods' },
              { title: 'Future Research Directions', desc: 'AI-powered suggestion engine' },
            ].map((g, i) => (
              <div key={i} style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ fontWeight: 500, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={13} style={{ color: 'var(--primary-light)' }} />
                  {g.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>{g.desc}</div>
              </div>
            ))}
          </div>
          <Link to="/gaps" className="btn btn-ghost btn-sm mt-2" style={{ width: '100%', justifyContent: 'center' }}>
            View Gap Analysis <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
