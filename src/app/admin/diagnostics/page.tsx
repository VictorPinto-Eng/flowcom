'use client';

import { useState, useEffect } from 'react';
import { getServerDiagnosticsAction, type ServerDiagnostics } from '@/app/actions/diagnosticsActions';

interface DiagnosticsState {
  data: ServerDiagnostics | null;
  loading: boolean;
  error: string | null;
  copied: boolean;
}

export default function DiagnosticsPage() {
  const [state, setState] = useState<DiagnosticsState>({
    data: null,
    loading: true,
    error: null,
    copied: false
  });

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const loadDiagnostics = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const data = await getServerDiagnosticsAction();
      setState(prev => ({ ...prev, data, loading: false }));
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err.message || 'Failed to load diagnostics',
        loading: false
      }));
    }
  };

  const copyToClipboard = async () => {
    if (!state.data) return;

    const text = JSON.stringify(state.data, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setState(prev => ({ ...prev, copied: true }));
      setTimeout(() => setState(prev => ({ ...prev, copied: false })), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (state.loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
        <p>Carregando diagnósticos...</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div style={{ padding: '2rem', color: '#ef4444' }}>
        <h2>Erro</h2>
        <p>{state.error}</p>
        <button onClick={loadDiagnostics} style={{
          background: '#7c3aed',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '0.5rem 1rem',
          cursor: 'pointer'
        }}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!state.data) return null;

  return (
    <div style={{ padding: '2rem', background: '#0f172a', color: '#fff', fontFamily: 'monospace', fontSize: '0.875rem' }}>
      <h1>🔍 Server Diagnostics</h1>
      <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
        Timestamp: {new Date(state.data.timestamp).toLocaleString('pt-BR')}
      </p>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => window.location.href = '/dashboard'} style={{
          background: '#334155',
          color: '#e2e8f0',
          border: '1px solid #475569',
          borderRadius: '8px',
          padding: '0.75rem 1.5rem',
          cursor: 'pointer',
          fontWeight: 600
        }}>
          ← Voltar
        </button>
        <button onClick={copyToClipboard} style={{
          background: state.copied ? '#10b981' : '#7c3aed',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '0.75rem 1.5rem',
          cursor: 'pointer',
          fontWeight: 600
        }}>
          {state.copied ? '✅ Copiado!' : '📋 Copiar JSON'}
        </button>
        <button onClick={loadDiagnostics} style={{
          background: '#1e293b',
          color: '#94a3b8',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '0.75rem 1.5rem',
          cursor: 'pointer'
        }}>
          🔄 Atualizar
        </button>
      </div>

      {/* Database Metrics */}
      <section style={{ marginBottom: '2rem', background: '#1e293b', padding: '1.5rem', borderRadius: '8px', border: '1px solid #334155' }}>
        <h2 style={{ marginTop: 0, color: '#7c3aed' }}>📊 Database Metrics</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '6px', border: '1px solid #334155' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.5rem' }}>TOTAL WORKSPACES</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#60a5fa' }}>{state.data.database.totalWorkspaces}</div>
          </div>
          <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '6px', border: '1px solid #334155' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.5rem' }}>TOTAL BOARDS</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#a78bfa' }}>{state.data.database.totalBoards}</div>
          </div>
          <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '6px', border: '1px solid #334155' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.5rem' }}>TOTAL CARDS</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>{state.data.database.totalCards}</div>
          </div>
          <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '6px', border: '1px solid #334155' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.5rem' }}>TOTAL ACTIONS</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f97316' }}>{state.data.database.totalCardActions}</div>
          </div>
          <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '6px', border: '1px solid #334155' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.5rem' }}>TOTAL USERS</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ec4899' }}>{state.data.database.totalUsers}</div>
          </div>
        </div>
      </section>

      {/* User Metrics */}
      <section style={{ marginBottom: '2rem', background: '#1e293b', padding: '1.5rem', borderRadius: '8px', border: '1px solid #334155' }}>
        <h2 style={{ marginTop: 0, color: '#7c3aed' }}>👤 Your Accessible Data</h2>
        <div style={{ color: '#94a3b8', marginBottom: '1rem' }}>
          <p><strong>User:</strong> {state.data.userMetrics.userName} ({state.data.userMetrics.userSeqid})</p>
          <p><strong>Workspaces Owned:</strong> {state.data.userMetrics.workspacesOwned}</p>
          <p><strong>Workspaces as Member:</strong> {state.data.userMetrics.workspacesAsMember}</p>
          <p><strong>Boards Accessible:</strong> {state.data.userMetrics.totalBoardsAccessible}</p>
          <p><strong>Cards Accessible:</strong> {state.data.userMetrics.totalCardsAccessible}</p>
          <p><strong>Card Actions Accessible:</strong> {state.data.userMetrics.totalCardActionsAccessible}</p>
        </div>
      </section>

      {/* Top Workspaces */}
      <section style={{ marginBottom: '2rem', background: '#1e293b', padding: '1.5rem', borderRadius: '8px', border: '1px solid #334155' }}>
        <h2 style={{ marginTop: 0, color: '#7c3aed' }}>⚡ Top Workspaces by Card Count</h2>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.875rem'
        }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>Workspace</th>
              <th style={{ textAlign: 'center', padding: '0.75rem', color: '#94a3b8' }}>Boards</th>
              <th style={{ textAlign: 'center', padding: '0.75rem', color: '#94a3b8' }}>Cards</th>
            </tr>
          </thead>
          <tbody>
            {state.data.topWorkspaces.map((ws, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #334155', opacity: idx === 0 ? 1 : 0.8 }}>
                <td style={{ padding: '0.75rem', color: idx === 0 ? '#fbbf24' : '#e2e8f0' }}>{ws.workspaceName}</td>
                <td style={{ textAlign: 'center', padding: '0.75rem', color: '#60a5fa' }}>{ws.boardCount}</td>
                <td style={{ textAlign: 'center', padding: '0.75rem', color: '#34d399' }}>{ws.cardCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Recommendations */}
      <section style={{ marginBottom: '2rem', background: '#1e293b', padding: '1.5rem', borderRadius: '8px', border: '1px solid #334155' }}>
        <h2 style={{ marginTop: 0, color: '#7c3aed' }}>💡 Recommendations</h2>
        <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
          {state.data.recommendations.map((rec, idx) => (
            <li key={idx} style={{ marginBottom: '0.5rem', color: '#cbd5e1' }}>
              {rec}
            </li>
          ))}
        </ul>
      </section>

      {/* Raw JSON */}
      <section style={{ marginBottom: '2rem', background: '#1e293b', padding: '1.5rem', borderRadius: '8px', border: '1px solid #334155' }}>
        <h2 style={{ marginTop: 0, color: '#7c3aed' }}>📋 Raw JSON (Para compartilhar)</h2>
        <pre style={{
          background: '#0f172a',
          padding: '1rem',
          borderRadius: '6px',
          overflow: 'auto',
          fontSize: '0.75rem',
          border: '1px solid #334155',
          color: '#cbd5e1',
          maxHeight: '400px'
        }}>
          {JSON.stringify(state.data, null, 2)}
        </pre>
      </section>
    </div>
  );
}
