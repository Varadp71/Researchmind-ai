import React, { useState } from 'react';
import { FolderPlus, BookOpen, Layers, ArrowRight, Trash2, Calendar, Sparkles } from 'lucide-react';
import { createProject, deleteProject } from '../api';

export default function ProjectList({ projects, onSelectProject, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const newProj = await createProject({
        name: name.trim(),
        description: description.trim(),
      });
      setShowModal(false);
      setName('');
      setDescription('');
      onRefresh();
      onSelectProject(newProj);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (e, projectId, projectName) => {
    e.stopPropagation();
    if (window.confirm(`Delete project "${projectName}" and all its papers?`)) {
      try {
        await deleteProject(projectId);
        onRefresh();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleQuickDemo = async () => {
    setSubmitting(true);
    try {
      const demoProj = await createProject({
        name: "Transformer Attention & Vision Architectures",
        description: "Comparative literature review analyzing attention mechanisms, convolutional alternatives, and vision transformer scalability.",
      });
      onRefresh();
      onSelectProject(demoProj);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Hero Welcome Header */}
      <div style={{
        textAlign: 'center',
        padding: '3rem 1.5rem',
        marginBottom: '2.5rem',
        background: '#FFFFFF',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
        position: 'relative'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem 0.95rem',
          borderRadius: '9999px',
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
          color: '#1D4ED8',
          fontSize: '0.82rem',
          fontWeight: 700,
          marginBottom: '1.25rem'
        }}>
          <Sparkles size={14} color="#2563EB" /> MSE 2026 Working Prototype Demonstration
        </div>

        <h1 style={{ fontSize: '2.5rem', lineHeight: 1.2, marginBottom: '1rem', color: 'var(--text-primary)' }}>
          Autonomous Literature Review & <br />
          <span className="gradient-text">Research Gap Identification</span>
        </h1>

        <p style={{
          fontSize: '1.05rem',
          color: 'var(--text-dim)',
          maxWidth: '680px',
          margin: '0 auto 2rem auto',
          lineHeight: 1.6
        }}>
          Upload academic PDF papers to extract full-text via PyMuPDF, calculate multi-paper semantic similarity, discover core research domains, and reveal unexplored research gaps.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <button 
            className="btn btn-primary btn-lg"
            onClick={() => setShowModal(true)}
            style={{ gap: '0.5rem' }}
          >
            <FolderPlus size={18} />
            <span>Create Research Project</span>
          </button>

          <button 
            className="btn btn-secondary btn-lg"
            onClick={handleQuickDemo}
            disabled={submitting}
            style={{ gap: '0.5rem' }}
          >
            <Sparkles size={18} color="#D97706" />
            <span>Launch Instant Demo Project</span>
          </button>
        </div>
      </div>

      {/* Projects Grid Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.25rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)' }}>Your Research Projects</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
            Select an active project or initialize a new literature corpus
          </p>
        </div>

        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => setShowModal(true)}
          style={{ gap: '0.4rem' }}
        >
          <FolderPlus size={14} />
          <span>New Project</span>
        </button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="glass-panel" style={{
          padding: '3.5rem 2rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          background: '#FFFFFF'
        }}>
          <BookOpen size={40} color="#94A3B8" />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>No projects created yet</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-dim)', maxWidth: '420px' }}>
            Click "Create Research Project" or "Launch Instant Demo Project" to test the end-to-end pipeline.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '1.5rem'
        }}>
          {projects.map((project) => (
            <div 
              key={project.id}
              className="glass-card"
              onClick={() => onSelectProject(project)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '190px',
                background: '#FFFFFF'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span className="badge badge-primary">
                    {project.paper_count} Paper{project.paper_count === 1 ? '' : 's'}
                  </span>
                  
                  <button
                    onClick={(e) => handleDelete(e, project.id, project.name)}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '0.25rem', color: 'var(--text-muted)' }}
                    title="Delete project"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '0.5rem', lineHeight: 1.3, fontWeight: 700 }}>
                  {project.name}
                </h3>

                <p style={{
                  fontSize: '0.86rem',
                  color: 'var(--text-dim)',
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {project.description || 'No description provided.'}
                </p>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border)',
                marginTop: '1rem'
              }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={13} />
                  {new Date(project.created_at).toLocaleDateString()}
                </span>

                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#2563EB', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  Open Workspace <ArrowRight size={14} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div 
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{
              width: '520px',
              maxWidth: '90vw',
              padding: '2rem',
              background: '#FFFFFF'
            }}
          >
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Create Research Project</h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-dim)', marginBottom: '1.5rem' }}>
              Define your research focus to group related PDF papers and compare literature.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Vision Transformers vs Convolutional Networks"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                  Description & Research Focus
                </label>
                <textarea
                  placeholder="State the core research question or scope of papers to be evaluated..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="input"
                  style={{ minHeight: '90px' }}
                />
              </div>

              {error && (
                <div className="error-banner">
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !name.trim()}
                >
                  {submitting ? 'Creating...' : 'Initialize Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
