import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderPlus, FolderKanban, ArrowRight, Trash2, Calendar,
  FileText, Sparkles, AlertCircle, Brain
} from 'lucide-react';
import { getProjects, createProject, deleteProject } from '../api';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await getProjects();
      setProjects(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setSubmitting(true);
      const proj = await createProject({ name: name.trim(), description: description.trim() });
      setShowModal(false);
      setName('');
      setDescription('');
      navigate(`/projects/${proj.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this project and all its papers?')) return;
    try {
      await deleteProject(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FolderKanban size={28} style={{ color: 'var(--primary-light)' }} />
              Research Projects
            </h1>
            <p>Organize your research papers and analyses into projects</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <FolderPlus size={18} />
            New Project
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner mb-3">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 180, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <FolderKanban size={56} style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>No Research Projects</h3>
          <p style={{ color: 'var(--text-dim)', marginBottom: '1.5rem', maxWidth: 400, margin: '0 auto 1.5rem' }}>
            Create your first project to begin uploading research papers and running intelligent analysis.
          </p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <FolderPlus size={18} />
            Create First Project
          </button>
        </div>
      ) : (
        <div className="grid-3">
          {projects.map((p, i) => (
            <div key={p.id} className={`card animate-in animate-in-delay-${(i % 4) + 1}`} style={{ cursor: 'pointer', position: 'relative' }}
              onClick={() => navigate(`/projects/${p.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--primary-light)',
                }}>
                  <Brain size={22} />
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--text-muted)', padding: '0.3rem' }}
                  onClick={e => { e.stopPropagation(); handleDelete(p.id); }}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <h3 style={{ fontSize: '1rem', marginBottom: '0.35rem' }}>{p.name}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '1rem', lineHeight: 1.5,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {p.description || 'No description'}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <span className="badge badge-primary">
                    <FileText size={11} /> {p.paper_count || 0} papers
                  </span>
                </div>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
              </div>

              {p.created_at && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Calendar size={11} />
                  {new Date(p.created_at).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} style={{ color: 'var(--primary-light)' }} />
              New Research Project
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Group related papers for comparative analysis
            </p>

            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                  Project Name *
                </label>
                <input className="input" placeholder="e.g. Transformer Architectures Review" value={name} onChange={e => setName(e.target.value)} autoFocus />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                  Description
                </label>
                <textarea className="input" rows={3} placeholder="Brief description of the research scope..." value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !name.trim()}>
                  {submitting ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Creating...</> : <><FolderPlus size={16} /> Create Project</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
