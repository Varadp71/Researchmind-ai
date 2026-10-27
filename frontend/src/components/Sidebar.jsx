import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Brain, LayoutDashboard, FolderKanban, FileText, FlaskConical,
  Compass, Search, BarChart3, Settings, Sparkles
} from 'lucide-react';

const navItems = [
  { section: 'Overview' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },

  { section: 'Research' },
  { to: '/papers', icon: FileText, label: 'Papers' },
  { to: '/analysis', icon: FlaskConical, label: 'Analysis' },

  { section: 'Intelligence' },
  { to: '/domains', icon: Compass, label: 'Research Domains' },
  { to: '/gaps', icon: Search, label: 'Research Gaps' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },

  { section: 'System' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      {/* Brand */}
      <NavLink to="/dashboard" style={{ textDecoration: 'none' }}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <Brain size={22} color="#ffffff" />
          </div>
          <div className="sidebar-brand-text">
            <h2>ResearchMind AI</h2>
            <span>Research Intelligence</span>
          </div>
        </div>
      </NavLink>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item, i) => {
          if (item.section) {
            return (
              <div key={i} className="sidebar-section-label">
                {item.section}
              </div>
            );
          }

          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar-link${isActive ? ' active' : ''}`
              }
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {item.badge && <span className="sidebar-badge">{item.badge}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
          <Sparkles size={13} color="#2563EB" />
          <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>MSE Prototype 2026</span>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>PyMuPDF • MiniLM • PostgreSQL</span>
      </div>
    </aside>
  );
}
