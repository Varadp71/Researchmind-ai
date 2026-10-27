import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Upload, AlertCircle, Search, Eye, Trash2,
  CheckCircle2, Clock, RefreshCw, FolderKanban
} from 'lucide-react';
import { getProjects, getPapers, uploadPaper, deletePaper } from '../api';

export default function Papers() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getProjects()
      .then(list => {
        setProjects(list);
        if (list.length > 0) setSelectedProjectId(list[0].id);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    setLoading(true);
    getPapers(selectedProjectId)
      .then(setPapers)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedProjectId]);

  const handleUpload = async (files) => {
    if (!selectedProjectId) return;
    setUploading(true);
    setError(null);
    try {
      for (const f of files) {
        await uploadPaper(selectedProjectId, f);
      }
      const list = await getPapers(selectedProjectId);
      setPapers(list);
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

  const handleDelete = async (paperId) => {
    if (!confirm('Delete this paper?')) return;
    try {
      await deletePaper(selectedProjectId, paperId);
      setPapers(papers.filter(p => p.id !== paperId));
    } catch (err) {
      setError(err.message);
    }
  };

  const filtered = papers.filter(p =>
    !searchQuery || (p.title || p.filename || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusConfig = {
    uploaded: { color: 'badge-info', icon: Clock },
    processing: { color: 'badge-primary', icon: RefreshCw },
    extracted: { color: 'badge-accent', icon: CheckCircle2 },
    ready: { color: 'badge-success', icon: CheckCircle2 },
    failed: { color: 'badge-danger', icon: AlertCircle },
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={28} style={{ color: 'var(--primary-light)' }} />
              Research Papers
            </h1>
            <p>Upload, process, and manage your PDF research papers</p>
          </div>
        </div>
      </div>

      {error && <div className="error-banner mb-3"><AlertCircle size={18} />{error}</div>}

      {/* Project selector */}
      <div className="card-flat mb-3" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
            <FolderKanban size={16} />
            Project:
          </div>
          {projects.length === 0 ? (
            <Link to="/projects" className="btn btn-primary btn-sm">Create a Project First</Link>
          ) : (
            <select
              className="input"
              style={{ maxWidth: 300 }}
              value={selectedProjectId || ''}
              onChange={e => setSelectedProjectId(e.target.value)}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          <div style={{ marginLeft: 'auto', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" placeholder="Search papers..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.25rem', maxWidth: 220 }} />
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      {selectedProjectId && (
        <div
          className={`upload-zone mb-3 ${dragOver ? 'drag-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('papers-file-input').click()}
        >
          <input id="papers-file-input" type="file" accept=".pdf" multiple hidden
            onChange={e => handleUpload(Array.from(e.target.files))} />
          <Upload size={36} style={{ color: 'var(--primary-light)', marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>
            {uploading ? 'Uploading PDFs...' : 'Drop Research PDFs Here'}
          </h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            Supports multiple files • PDF format • Up to 50MB each
          </p>
          {uploading && (
            <div style={{ marginTop: '1rem', width: 200, margin: '1rem auto 0' }}>
              <div className="progress-bar"><div className="progress-fill" style={{ width: '65%' }} /></div>
            </div>
          )}
        </div>
      )}

      {/* Paper Grid */}
      {loading ? (
        <div className="grid-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 140 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <FileText />
          <h3>{papers.length === 0 ? 'No Papers Uploaded' : 'No Matching Papers'}</h3>
          <p style={{ fontSize: '0.85rem' }}>
            {papers.length === 0 ? 'Upload PDF research papers to begin' : 'Try a different search term'}
          </p>
        </div>
      ) : (
        <div className="grid-2">
          {filtered.map((p, i) => {
            const sc = statusConfig[p.status] || statusConfig.uploaded;
            const StatusIcon = sc.icon;
            return (
              <div key={p.id} className={`card animate-in animate-in-delay-${(i % 4) + 1}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, marginRight: '1rem' }}>
                    <h4 style={{ fontSize: '0.95rem', marginBottom: '0.25rem' }}>{p.title || p.filename || 'Untitled'}</h4>
                    {p.authors && <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>{p.authors}</div>}
                    {p.filename && p.title && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{p.filename}</div>
                    )}
                  </div>
                  <span className={`badge ${sc.color}`}>
                    <StatusIcon size={11} />
                    {p.status}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {p.page_count && <span className="badge badge-neutral">{p.page_count} pages</span>}
                    {p.year && <span className="badge badge-neutral">{p.year}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <Link to={`/papers/${p.id}?project=${selectedProjectId}`} className="btn btn-ghost btn-sm">
                      <Eye size={14} /> View
                    </Link>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(p.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
