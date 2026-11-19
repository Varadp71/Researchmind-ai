import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ProjectList from './components/ProjectList';
import ProjectWorkspace from './components/ProjectWorkspace';
import LoginPage from './components/LoginPage';
import { getProjects, getCurrentUser } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check existing session on load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        } catch (err) {
          console.warn('Session token invalid or expired:', err);
          localStorage.removeItem('token');
          setUser(null);
        }
      }
      setAuthChecking(false);
    };
    checkAuth();
  }, []);

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
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setActiveProject(null);
    setProjects([]);
  };

  if (authChecking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-deepest)',
        color: 'var(--text-dim)',
        fontSize: '0.9rem'
      }}>
        Loading ResearchMind AI...
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        user={user}
        onLogout={handleLogout}
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
