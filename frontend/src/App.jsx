import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ProjectList from './components/ProjectList';
import ProjectWorkspace from './components/ProjectWorkspace';
import { getProjects } from './api';

export default function App() {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const list = await getProjects();
      setProjects(list);
      // If active project is open, update its reference
      if (activeProject) {
        const updated = list.find(p => p.id === activeProject.id);
        if (updated) {
          setActiveProject(updated);
        }
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar 
        activeProject={activeProject}
        onNavigateHome={() => setActiveProject(null)}
        onNewProject={() => {
          setActiveProject(null);
        }}
      />

      <main style={{ flex: 1 }}>
        {activeProject ? (
          <ProjectWorkspace 
            project={activeProject}
            onBack={() => {
              setActiveProject(null);
              fetchProjects();
            }}
          />
        ) : (
          <ProjectList 
            projects={projects}
            onSelectProject={(proj) => setActiveProject(proj)}
            onRefresh={fetchProjects}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '2rem 1rem',
        borderTop: '1px solid var(--border-subtle)',
        color: 'var(--text-dim)',
        fontSize: '0.8rem',
        marginTop: 'auto'
      }}>
        ResearchMind AI • Intelligent Literature Review, Paper Comparison & Research Gap Identification • MSE Prototype 2026
      </footer>
    </div>
  );
}
