import React, { useState, useEffect } from 'react';
import {
  FileText, Brain, Sparkles, Layers, ArrowLeft, RefreshCw,
  Play, CheckCircle2, Clock, AlertCircle, FilePlus
} from 'lucide-react';
import PaperUpload from './PaperUpload';
import PaperList from './PaperList';
import ResultsDashboard from './ResultsDashboard';
import PaperDetailModal from './PaperDetailModal';
import { getPapers, getPaper, startAnalysis, getAnalysisStatus, getDashboard } from '../api';

export default function ProjectWorkspace({ project, onBack }) {
  const [papers, setPapers] = useState([]);
  const [activeTab, setActiveTab] = useState('papers'); // 'papers' | 'dashboard'
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [loadingPaper, setLoadingPaper] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [seeding, setSeeding] = useState(false);

  // Fetch papers for active project
  const loadPapers = async () => {
    try {
      const data = await getPapers(project.id);
      setPapers(data);
    } catch (err) {
      console.error('Failed to load papers:', err);
    }
  };

  // Fetch dashboard data
  const loadDashboard = async () => {
    try {
      const data = await getDashboard(project.id);
      setDashboard(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
  };

  useEffect(() => {
    loadPapers();
    loadDashboard();
  }, [project.id]);

  // Poll for paper processing status if any paper is processing
  useEffect(() => {
    const hasPending = papers.some(p =>
      p.status === 'uploaded' || p.status === 'extracting' || p.status === 'embedding'
    );
    if (!hasPending) return;

    const interval = setInterval(() => {
      loadPapers();
    }, 2000);

    return () => clearInterval(interval);
  }, [papers]);

  // Poll analysis status if analysis is running
  useEffect(() => {
    if (!analyzing) return;

    const interval = setInterval(async () => {
      try {
        const status = await getAnalysisStatus(project.id);
        setAnalysisStatus(status);
        if (status.status_message) {
          setStatusMessage(status.status_message);
        }

        if (status.status === 'completed') {
          setAnalyzing(false);
          await loadDashboard();
          setActiveTab('dashboard');
        } else if (status.status === 'failed') {
          setAnalyzing(false);
          alert(`Analysis failed: ${status.status_message}`);
        }
      } catch (err) {
        console.error('Error polling analysis:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [analyzing, project.id]);

  const handleStartAnalysis = async () => {
    const readyPapers = papers.filter(p => p.status === 'ready' || p.status === 'extracted');
    if (readyPapers.length < 2) {
      alert('You need at least 2 papers with completed PyMuPDF extraction to run semantic comparison and gap detection.');
      return;
    }

    try {
      setAnalyzing(true);
      setStatusMessage('Queuing semantic comparison across papers...');
      await startAnalysis(project.id);
    } catch (err) {
      setAnalyzing(false);
      alert(`Could not start analysis: ${err.message}`);
    }
  };

  const handleInspectPaper = async (paperId) => {
    try {
      setLoadingPaper(true);
      const detail = await getPaper(project.id, paperId);
      setSelectedPaper(detail);
    } catch (err) {
      alert(`Failed to load paper details: ${err.message}`);
    } finally {
      setLoadingPaper(false);
    }
  };

  // Helper to seed sample research papers for quick demonstration
  const handleLoadSamplePapers = async () => {
    setSeeding(true);
    try {
      const res = await fetch(`/api/papers/${project.id}/seed-samples`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer demo-token' }
      });
      if (res.ok) {
        await loadPapers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSeeding(false);
      loadPapers();
    }
  };

  const readyPapersCount = papers.filter(p => p.status === 'ready' || p.status === 'extracted').length;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Workspace Header */}
      <div className="glass-panel" style={{ padding: '1.75rem 2rem', marginBottom: '2rem', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <button
              onClick={onBack}
              className="btn btn-ghost btn-sm"
              style={{ padding: '0.2rem 0', color: 'var(--text-dim)', marginBottom: '0.5rem', gap: '0.35rem' }}
            >
              <ArrowLeft size={16} /> Back to Projects
            </button>
            <h1 style={{ fontSize: '1.8rem', lineHeight: 1.2, color: 'var(--text-primary)', fontWeight: 800 }}>
              {project.name}
            </h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-dim)', marginTop: '0.35rem', maxWidth: '780px' }}>
              {project.description || 'Active research literature corpus for multi-paper comparison and gap analysis.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleLoadSamplePapers}
              disabled={seeding}
              style={{ gap: '0.4rem' }}
            >
              <FilePlus size={15} color="#2563EB" />
              <span>{seeding ? 'Generating Samples...' : '+ Seed 3 Sample Papers'}</span>
            </button>

            {readyPapersCount >= 2 && (
              <button
                className="btn btn-primary"
                onClick={handleStartAnalysis}
                disabled={analyzing}
                style={{ gap: '0.5rem', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)' }}
              >
                <Brain size={18} />
                <span>{analyzing ? 'Running Analysis...' : 'Run Intelligence Analysis'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Analysis Progress Bar */}
        {analyzing && (
          <div style={{
            marginTop: '1.25rem',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{ width: '20px', height: '20px', border: '3px solid #2563EB', borderTopColor: 'transparent', borderRadius: '50%' }} className="spin" />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '0.35rem' }}>
                <span style={{ fontWeight: 700, color: '#1E40AF' }}>{statusMessage || 'Processing literature intelligence...'}</span>
                <span style={{ color: '#2563EB', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Active</span>
              </div>
              <div style={{ height: '5px', background: '#DBEAFE', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '65%', background: 'linear-gradient(90deg, #2563EB, #4F46E5)', borderRadius: '3px' }} />
              </div>
            </div>
          </div>
        )}

        {/* Workspace Tab Bar */}
        <div style={{
          display: 'flex',
          gap: '1.5rem',
          borderTop: '1px solid var(--border)',
          marginTop: '1.5rem',
          paddingTop: '1rem'
        }}>
          <button
            onClick={() => setActiveTab('papers')}
            style={{
              background: 'none',
              border: 'none',
              color: activeTab === 'papers' ? '#2563EB' : 'var(--text-dim)',
              fontWeight: activeTab === 'papers' ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              paddingBottom: '0.5rem',
              borderBottom: activeTab === 'papers' ? '2px solid #2563EB' : '2px solid transparent',
              transition: 'all 0.15s ease'
            }}
          >
            <FileText size={17} />
            <span>Papers & Extraction ({papers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            style={{
              background: 'none',
              border: 'none',
              color: activeTab === 'dashboard' ? '#2563EB' : 'var(--text-dim)',
              fontWeight: activeTab === 'dashboard' ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              paddingBottom: '0.5rem',
              borderBottom: activeTab === 'dashboard' ? '2px solid #2563EB' : '2px solid transparent',
              transition: 'all 0.15s ease'
            }}
          >
            <Sparkles size={17} color={dashboard?.similarity_matrix ? '#D97706' : 'currentColor'} />
            <span>Results & Insights</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      {activeTab === 'papers' ? (
        <div>
          <PaperUpload 
            projectId={project.id} 
            onUploadComplete={loadPapers}
          />
          <PaperList 
            projectId={project.id}
            papers={papers}
            onPaperSelect={handleInspectPaper}
            onRefresh={loadPapers}
          />
        </div>
      ) : (
        <ResultsDashboard 
          dashboard={dashboard}
          onRunAnalysis={handleStartAnalysis}
          analyzing={analyzing}
        />
      )}

      {/* Paper Detail Inspector Modal */}
      {selectedPaper && (
        <PaperDetailModal 
          paper={selectedPaper}
          onClose={() => setSelectedPaper(null)}
        />
      )}
    </div>
  );
}
