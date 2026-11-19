import React, { useState } from 'react';
import { Brain, LogIn, Lock, Mail, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { loginUser, getCurrentUser } from '../api';

export default function LoginPage({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      setError('Please enter your email or username.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      setLoading(true);
      const tokenData = await loginUser(trimmedIdentifier, password);
      if (tokenData && tokenData.access_token) {
        localStorage.setItem('token', tokenData.access_token);
        // Fetch current user details
        const user = await getCurrentUser();
        if (onLoginSuccess) {
          onLoginSuccess(user);
        }
      } else {
        throw new Error('Authentication did not return a valid session token.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Incorrect email/username or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setIdentifier('researcher@researchmind.ai');
    setPassword('demo1234');
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
      background: 'var(--bg-deepest)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
        padding: '2.5rem 2.25rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle decorative top bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #2563EB, #4F46E5)'
        }} />

        {/* Branding & Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
            marginBottom: '0.85rem'
          }}>
            <Brain size={26} color="#FFFFFF" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              ResearchMind
            </span>
            <span style={{
              background: '#EFF6FF',
              color: '#2563EB',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.15rem 0.5rem',
              borderRadius: '4px',
              border: '1px solid #BFDBFE',
              fontFamily: 'var(--font-mono)'
            }}>AI</span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', margin: 0 }}>
            Sign in to access your literature review workspace
          </p>
        </div>

        {/* Error Alert Message */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#DC2626',
            fontSize: '0.84rem',
            lineHeight: 1.4,
            marginBottom: '1.5rem'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: '0.45rem'
            }}>
              Email or Username
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input"
                placeholder="researcher@researchmind.ai"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading}
                autoFocus
                style={{ paddingLeft: '2.5rem', width: '100%' }}
              />
              <Mail size={16} color="var(--text-muted)" style={{
                position: 'absolute',
                left: '0.9rem',
                top: '50%',
                transform: 'translateY(-50%)'
              }} />
            </div>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: '0.45rem'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{ paddingLeft: '2.5rem', width: '100%' }}
              />
              <Lock size={16} color="var(--text-muted)" style={{
                position: 'absolute',
                left: '0.9rem',
                top: '50%',
                transform: 'translateY(-50%)'
              }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%', marginTop: '0.5rem', gap: '0.5rem', justifyContent: 'center' }}
          >
            <LogIn size={18} />
            <span>{loading ? 'Signing in...' : 'Sign In to Workspace'}</span>
          </button>
        </form>

        {/* Demo Credentials Quick-Fill Helper */}
        <div style={{
          marginTop: '1.75rem',
          padding: '0.85rem 1rem',
          borderRadius: 'var(--radius-md)',
          background: '#F8FAFC',
          border: '1px dashed #CBD5E1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.78rem',
          color: 'var(--text-dim)'
        }}>
          <div>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Demo Account:</span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', marginTop: '2px' }}>
              researcher@researchmind.ai
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={fillDemoCredentials}
            style={{ color: '#2563EB', fontWeight: 600, fontSize: '0.76rem', padding: '0.2rem 0.5rem' }}
          >
            Auto-Fill
          </button>
        </div>
      </div>

      {/* Subtle Footer Note */}
      <div style={{
        marginTop: '1.5rem',
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
        textAlign: 'center'
      }}>
        ResearchMind AI • Literature Review & Research Gap Identification System
      </div>
    </div>
  );
}
