import React from 'react';
import { Link } from 'react-router-dom';
import {
  Brain, FileText, FlaskConical, Compass, Search, ArrowRight,
  Sparkles, Layers, BookOpen, GitCompare, TrendingUp, Shield
} from 'lucide-react';

const features = [
  {
    icon: FileText,
    color: 'var(--primary-subtle)',
    iconColor: 'var(--primary-light)',
    title: 'PDF Text Extraction',
    desc: 'PyMuPDF-powered extraction of text, metadata, titles, authors, abstracts, and keywords from research PDFs.',
  },
  {
    icon: Layers,
    color: 'var(--accent-glow)',
    iconColor: 'var(--accent-light)',
    title: 'Semantic Embeddings',
    desc: 'all-MiniLM-L6-v2 transformer model generates dense semantic representations of every paper chunk.',
  },
  {
    icon: GitCompare,
    color: 'var(--success-glow)',
    iconColor: 'var(--success)',
    title: 'Multi-Paper Comparison',
    desc: 'Pairwise cosine similarity analysis reveals semantic relationships across your entire paper collection.',
  },
  {
    icon: Compass,
    color: 'var(--warning-glow)',
    iconColor: 'var(--warning)',
    title: 'Domain Discovery',
    desc: 'HDBSCAN clustering automatically identifies research domains, subfields, and topic hierarchies.',
  },
  {
    icon: Search,
    color: 'var(--danger-glow)',
    iconColor: 'var(--danger)',
    title: 'Research Gap Detection',
    desc: 'Cross-paper contrastive analysis surfaces under-explored areas and potential research opportunities.',
  },
  {
    icon: TrendingUp,
    color: 'rgba(59, 130, 246, 0.15)',
    iconColor: '#60a5fa',
    title: 'Research Intelligence',
    desc: 'Comprehensive dashboards synthesize similarity matrices, domain maps, gap analyses, and trend insights.',
  },
];

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero */}
      <section className="hero-section">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)',
            background: 'var(--primary-subtle)', border: '1px solid rgba(99,102,241,0.2)',
            marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--primary-light)',
            fontWeight: 500
          }}>
            <Sparkles size={14} />
            MSE Prototype — Research Intelligence Platform
          </div>

          <h1 className="hero-title">ResearchMind AI</h1>

          <p className="hero-subtitle">
            An Intelligent Research Assistant for Literature Review,
            Multi-Paper Comparison, and Research Gap Identification
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/dashboard" className="btn btn-primary btn-lg">
              <Brain size={20} />
              Open Dashboard
              <ArrowRight size={16} />
            </Link>
            <Link to="/projects" className="btn btn-secondary btn-lg">
              <BookOpen size={20} />
              View Projects
            </Link>
          </div>

          {/* Tech stack badges */}
          <div style={{
            display: 'flex', gap: '0.5rem', justifyContent: 'center',
            marginTop: '2.5rem', flexWrap: 'wrap'
          }}>
            {['FastAPI', 'React', 'PyMuPDF', 'all-MiniLM-L6-v2', 'HDBSCAN', 'PostgreSQL'].map(t => (
              <span key={t} className="badge badge-neutral">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '4rem 2.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', marginBottom: '0.5rem' }}>
            Research Intelligence Pipeline
          </h2>
          <p style={{ color: 'var(--text-dim)', maxWidth: '500px', margin: '0 auto' }}>
            From raw PDFs to actionable research insights — fully automated
          </p>
        </div>

        <div className="grid-3">
          {features.map((f, i) => (
            <div key={i} className={`feature-card animate-in animate-in-delay-${i % 4 + 1}`}>
              <div className="feature-card-icon" style={{ background: f.color, color: f.iconColor }}>
                <f.icon size={22} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pipeline visualization */}
      <section style={{ padding: '2rem 2.5rem 5rem', maxWidth: '900px', margin: '0 auto' }}>
        <div className="card" style={{ padding: '2.5rem' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <FlaskConical size={20} style={{ color: 'var(--primary-light)' }} />
            End-to-End Analysis Pipeline
          </h3>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.5rem', flexWrap: 'wrap'
          }}>
            {[
              'Upload PDFs', 'Text Extraction', 'Semantic Embeddings',
              'Similarity Analysis', 'Domain Discovery', 'Gap Detection', 'Intelligence Dashboard'
            ].map((step, i) => (
              <React.Fragment key={i}>
                <div style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-subtle)',
                  border: '1px solid rgba(99,102,241,0.15)',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                }}>
                  {step}
                </div>
                {i < 6 && <ArrowRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
