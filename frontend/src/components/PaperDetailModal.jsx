import React, { useState } from 'react';
import { X, FileText, CheckCircle2, AlertCircle, Copy, Check, Hash, Calendar, Users, BookOpen, Layers } from 'lucide-react';

export default function PaperDetailModal({ paper, onClose }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'text' | 'metadata'

  if (!paper) return null;

  const handleCopy = () => {
    if (paper.full_text) {
      navigator.clipboard.writeText(paper.full_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const textLength = paper.full_text ? paper.full_text.length : 0;
  const wordCount = paper.full_text ? paper.full_text.trim().split(/\s+/).length : 0;
  const previewText = paper.full_text ? paper.full_text.slice(0, 3000) : 'No extracted text available.';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="glass-panel" 
        onClick={e => e.stopPropagation()}
        style={{
          width: '900px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#FFFFFF',
          border: '1px solid #CBD5E1',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          background: '#F8FAFC'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
            <div style={{
              padding: '0.65rem',
              borderRadius: '10px',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: '#2563EB',
              marginTop: '0.2rem'
            }}>
              <FileText size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span className={`badge badge-${paper.status === 'ready' ? 'ready' : paper.status === 'failed' ? 'danger' : 'processing'}`}>
                  {paper.status}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  PyMuPDF Extracted
                </span>
              </div>
              <h2 style={{ fontSize: '1.25rem', lineHeight: 1.3, color: 'var(--text-primary)', maxWidth: '680px', fontWeight: 800 }}>
                {paper.title || paper.filename}
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                Source: <span style={{ fontFamily: 'var(--font-mono)', color: '#2563EB', fontWeight: 600 }}>{paper.filename}</span>
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ padding: '0.4rem', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '1.25rem',
          padding: '0 1.75rem',
          borderBottom: '1px solid var(--border)',
          background: '#FFFFFF'
        }}>
          {[
            { id: 'overview', label: 'Extracted Overview & Abstract' },
            { id: 'text', label: `Full Text Preview (${wordCount.toLocaleString()} words)` },
            { id: 'metadata', label: 'Technical Metadata & Chunks' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none',
                border: 'none',
                color: activeTab === tab.id ? '#2563EB' : 'var(--text-dim)',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '0.9rem',
                padding: '0.85rem 0.25rem',
                borderBottom: activeTab === tab.id ? '2px solid #2563EB' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Content */}
        <div style={{ padding: '1.75rem', overflowY: 'auto', flex: 1, background: '#F8FAFC' }}>
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Key Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                <div className="glass-card" style={{ padding: '1rem', background: '#FFFFFF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 700 }}>
                    <BookOpen size={14} /> PAGE COUNT
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                    {paper.page_count || '1'} <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)' }}>pages</span>
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '1rem', background: '#FFFFFF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 700 }}>
                    <Layers size={14} /> CHUNKS CREATED
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563EB', marginTop: '0.25rem' }}>
                    {paper.chunk_count || 1} <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)' }}>chunks</span>
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '1rem', background: '#FFFFFF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 700 }}>
                    <Calendar size={14} /> PUBLICATION YEAR
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#4F46E5', marginTop: '0.25rem' }}>
                    {paper.year || 'Detected'}
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '1rem', background: '#FFFFFF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 700 }}>
                    <Users size={14} /> AUTHORS
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {paper.authors || 'Extracted via NLP'}
                  </div>
                </div>
              </div>

              {/* Abstract Card */}
              <div className="glass-card" style={{ background: '#FFFFFF', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '0.92rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1D4ED8', fontWeight: 700 }}>
                    Extracted Abstract
                  </h3>
                  <span className="badge badge-info">PyMuPDF Text Boundary</span>
                </div>
                <p style={{
                  fontSize: '0.94rem',
                  lineHeight: 1.7,
                  color: 'var(--text-secondary)',
                  background: '#F8FAFC',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  fontStyle: paper.abstract ? 'normal' : 'italic'
                }}>
                  {paper.abstract || 'No explicit abstract heading detected. Full text chunking and semantic embeddings generated directly from document body.'}
                </p>
              </div>

              {/* Status Message */}
              {paper.status_message && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.85rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  fontSize: '0.88rem',
                  color: '#1E40AF'
                }}>
                  <CheckCircle2 size={16} color="#2563EB" />
                  <span><strong>Processing telemetry:</strong> {paper.status_message}</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'text' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 500 }}>
                  Displaying first 3,000 characters of extracted text ({textLength.toLocaleString()} characters total):
                </span>
                <button 
                  onClick={handleCopy}
                  className="btn btn-secondary btn-sm"
                  style={{ gap: '0.35rem' }}
                >
                  {copied ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied' : 'Copy Full Text'}</span>
                </button>
              </div>

              <pre style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                fontSize: '0.86rem',
                color: '#0F172A',
                lineHeight: 1.7,
                maxHeight: '450px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                fontFamily: 'var(--font-mono)'
              }}>
                {previewText}
              </pre>
            </div>
          )}

          {activeTab === 'metadata' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '0.92rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                Structured Extraction Metadata (JSON)
              </h3>
              <pre style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                fontSize: '0.85rem',
                color: '#0369A1',
                lineHeight: 1.6,
                maxHeight: '400px',
                overflowY: 'auto',
                fontFamily: 'var(--font-mono)'
              }}>
                {JSON.stringify({
                  id: paper.id,
                  filename: paper.filename,
                  file_size_bytes: paper.file_size,
                  page_count: paper.page_count,
                  extracted_text_length: textLength,
                  chunk_count: paper.chunk_count,
                  status: paper.status,
                  created_at: paper.created_at,
                  metadata_json: paper.metadata_json
                }, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1rem 1.75rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: '#FFFFFF'
        }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
