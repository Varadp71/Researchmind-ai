import React from 'react';
import { Brain, PlusCircle, ChevronRight, Sparkles } from 'lucide-react';

export default function Navbar({ activeProject, onNavigateHome, onNewProject }) {
  return (
    <header style={{
      background: '#FFFFFF',
      borderBottom: '1px solid var(--border)',
      padding: '0.85rem 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Brand / Title & Context */}
      <div 
        onClick={onNavigateHome}
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
      >
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
        }}>
          <Brain size={20} color="#FFFFFF" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              ResearchMind
            </span>
            <span style={{
              background: '#EFF6FF',
              color: '#2563EB',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.12rem 0.45rem',
              borderRadius: '4px',
              border: '1px solid #BFDBFE',
              fontFamily: 'var(--font-mono)'
            }}>AI</span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>
            Literature Review & Research Gap Identification
          </p>
        </div>
      </div>

      {/* Project Breadcrumb if active */}
      {activeProject && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: '#F1F5F9',
          padding: '0.35rem 0.85rem',
          borderRadius: '9999px',
          border: '1px solid #E2E8F0',
          fontSize: '0.84rem'
        }}>
          <span 
            onClick={onNavigateHome}
            style={{ color: 'var(--text-dim)', cursor: 'pointer', transition: 'color 0.15s' }}
            onMouseEnter={e => e.target.style.color = '#2563EB'}
            onMouseLeave={e => e.target.style.color = 'var(--text-dim)'}
          >
            Projects
          </span>
          <ChevronRight size={14} color="#94A3B8" />
          <span style={{ color: '#2563EB', fontWeight: 700 }}>{activeProject.name}</span>
        </div>
      )}

      {/* Engine Status & CTA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div className="badge badge-ready" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16A34A' }} />
          <span>PyMuPDF • MiniLM • PostgreSQL</span>
        </div>

        {onNewProject && (
          <button 
            className="btn btn-primary btn-sm"
            onClick={onNewProject}
            style={{ gap: '0.4rem' }}
          >
            <PlusCircle size={15} />
            <span>New Project</span>
          </button>
        )}
      </div>
    </header>
  );
}
