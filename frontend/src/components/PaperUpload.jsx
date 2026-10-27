import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, FolderPlus } from 'lucide-react';
import { uploadPaper } from '../api';

export default function PaperUpload({ projectId, onUploadComplete }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState([]);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);

    const pdfFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      setError('Please select PDF files only.');
      setUploading(false);
      return;
    }

    const statuses = pdfFiles.map(f => ({ name: f.name, status: 'uploading' }));
    setUploadStatus(statuses);

    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      try {
        await uploadPaper(projectId, file);
        setUploadStatus(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'success' } : s));
      } catch (err) {
        setUploadStatus(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'error', error: err.message } : s));
      }
    }

    setUploading(false);
    if (onUploadComplete) {
      onUploadComplete();
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '2rem', background: '#FFFFFF' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
            <UploadCloud size={20} color="#2563EB" />
            Upload Research Papers (PDF)
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            Upload 2 or more PDF research papers. PyMuPDF will extract full-text, parse metadata, and compute sentence embeddings.
          </p>
        </div>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: isDragging ? '2px dashed #2563EB' : '2px dashed #CBD5E1',
          borderRadius: 'var(--radius-md)',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          background: isDragging ? '#EFF6FF' : '#F8FAFC',
          cursor: uploading ? 'wait' : 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem'
        }}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          multiple 
          accept=".pdf" 
          style={{ display: 'none' }} 
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
        />

        <div style={{
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#2563EB'
        }}>
          {uploading ? <Loader2 size={26} className="spin" /> : <UploadCloud size={26} />}
        </div>

        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
            {uploading ? 'Processing & Ingesting Papers...' : 'Drop Research PDFs Here or Click to Browse'}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Compatible with single/multi-column academic papers • Up to 50MB per PDF
          </div>
        </div>

        {error && (
          <div className="error-banner" style={{ marginTop: '0.75rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Upload status badges list */}
        {uploadStatus.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'center' }}>
            {uploadStatus.map((s, idx) => (
              <span 
                key={idx} 
                className={`badge ${s.status === 'success' ? 'badge-ready' : s.status === 'error' ? 'badge-danger' : 'badge-processing'}`}
                style={{ fontSize: '0.75rem' }}
              >
                {s.name}: {s.status}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
