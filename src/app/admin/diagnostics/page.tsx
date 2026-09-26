'use client';

import { useState, useEffect } from 'react';
import { getServerDiagnosticsAction, sendTestEmailAction, getEvolutionAction, type ServerDiagnostics, type EvolutionReport } from '@/app/actions/diagnosticsActions';

interface EmailTestState {
  email: string;
  sending: boolean;
  result: { success: boolean; messageId?: string; error?: string } | null;
}

interface DiagnosticsState {
  data: ServerDiagnostics | null;
  evolution: EvolutionReport | null;
  loading: boolean;
  error: string | null;
  copied: boolean;
  emailTest: EmailTestState;
}

export default function DiagnosticsPage() {
  const [state, setState] = useState<DiagnosticsState>({
    data: null,
    evolution: null,
    loading: true,
    error: null,
    copied: false,
    emailTest: { email: '', sending: false, result: null }
  });

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const loadDiagnostics = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const [data, evolution] = await Promise.all([
        getServerDiagnosticsAction(),
        getEvolutionAction().catch(() => null)
      ]);
      setState(prev => ({
        ...prev,
        data,
        evolution,
        loading: false,
        emailTest: {
          ...prev.emailTest,
          email: prev.emailTest.email || data.userMetrics.userEmail || ''
        }
      }));
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

    const text = JSON.stringify({ ...state.data, evolution: state.evolution }, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setState(prev => ({ ...prev, copied: true }));
      setTimeout(() => setState(prev => ({ ...prev, copied: false })), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const setEmailTest = (patch: Partial<EmailTestState>) => {
    setState(prev => ({ ...prev, emailTest: { ...prev.emailTest, ...patch } }));
  };

  const handleSendTestEmail = async () => {
    const email = state.emailTest.email.trim();
    if (!email || state.emailTest.sending) return;

    setEmailTest({ sending: true, result: null });
    try {
      const result = await sendTestEmailAction(email);
      setEmailTest({ sending: false, result });
    } catch (err: any) {
      setEmailTest({ sending: false, result: { success: false, error: err.message || 'Erro inesperado' } });
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
    const restricted = state.error.toLowerCase().includes('acesso restrito');
    if (restricted) {
      return (
        <div style={{ padding: '2rem', color: '#fbbf24' }}>
          <h2>🔒 Acesso restrito</h2>
          <p style={{ color: '#94a3b8' }}>
            Esta tela é apenas para administradores da plataforma.
          </p>
          <p style={{ color: '#64748b', fontSize: '0.8rem' }}>
            Configure <code>ADMIN_EMAILS</code> (emails separados por vírgula) no env do servidor para liberar seu acesso.
          </p>
          <button onClick={() => window.location.href = '/dashboard'} style={{
            background: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px',
            padding: '0.5rem 1rem', cursor: 'pointer', marginTop: '1rem'
          }}>
            ← Voltar ao painel
          </button>
        </div>
      );
    }
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

      {/* Alertas Estruturais */}
      {state.evolution && (
        <section style={{ marginBottom: '2rem', background: '#1e293b', padding: '1.5rem', borderRadius: '8px', border: '1px solid #334155' }}>
          <h2 style={{ marginTop: 0, color: state.evolution.structuralAlerts.length > 0 ? '#ef4444' : '#10b981' }}>
            🚨 Alertas Estruturais
            {state.evolution.structuralAlerts.length > 0 && (
              <span style={{ fontSize: '0.9rem', marginLeft: '0.5rem', color: '#94a3b8' }}>
                ({state.evolution.structuralAlerts.length})
              </span>
            )}
          </h2>

          {state.evolution.structuralAlerts.length === 0 ? (
            <div style={{
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid #10b981',
              borderRadius: '6px',
              padding: '1rem',
              color: '#34d399'
            }}>
              ✅ Nenhum problema estrutural detectado — integridade dos dados consistente.
            </div>
          ) : (
            state.evolution.structuralAlerts.map(alert => (
              <div key={alert.id} style={{
                background: '#0f172a',
                border: `1px solid ${alertColor(alert.severity)}`,
                borderRadius: '6px',
                padding: '0.85rem 1rem',
                marginBottom: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <span style={{
                    background: alertColor(alert.severity),
                    color: '#0f172a',
                    borderRadius: '999px',
                    padding: '0.1rem 0.6rem',
                    fontSize: '0.7rem',
                    fontWeight: 'bold'
                  }}>
                    {alert.severity}
                  </span>
                  <strong style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>{alert.title}</strong>
                </div>
                <p style={{ margin: '0.5rem 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>{alert.detail}</p>
                {alert.fix && (
                  <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.78rem' }}>
                    💡 {alert.fix}
                  </p>
                )}
              </div>
            ))
          )}
        </section>
      )}

      {/* Evolução do Produto */}
      {state.evolution && (
        <section style={{ marginBottom: '2rem', background: '#1e293b', padding: '1.5rem', borderRadius: '8px', border: '1px solid #334155' }}>
          <h2 style={{ marginTop: 0, color: '#7c3aed' }}>📈 Evolução do Produto</h2>

          {/* Veredito */}
          <div style={{
            background: '#0f172a',
            border: `1px solid ${verdictColor(state.evolution.verdict.status)}`,
            borderRadius: '6px',
            padding: '1rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: verdictColor(state.evolution.verdict.status) }}>
                {statusLabel(state.evolution.verdict.status)}
              </span>
              <span style={{
                background: verdictColor(state.evolution.verdict.status),
                color: '#0f172a',
                borderRadius: '999px',
                padding: '0.15rem 0.65rem',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}>
                score {state.evolution.verdict.score}/100
              </span>
              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                gerado em {new Date(state.evolution.generatedAt).toLocaleString('pt-BR')}
              </span>
            </div>
            <ul style={{ margin: '0.75rem 0 0', paddingLeft: '1.25rem' }}>
              {state.evolution.verdict.insights.map((ins, i) => (
                <li key={i} style={{ color: '#cbd5e1', marginBottom: '0.35rem', fontSize: '0.875rem' }}>{ins}</li>
              ))}
            </ul>
          </div>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <Kpi label="CADASTROS (30D)" value={state.evolution.kpis.new30d} delta={state.evolution.kpis.signupDeltaPct} color="#ec4899" />
            <Kpi label="USUÁRIOS ATIVOS (MAU)" value={state.evolution.kpis.mau} color="#60a5fa" />
            <Kpi label="RETENÇÃO SEMANAL (WAU/MAU)" value={state.evolution.kpis.retentionWauMau === null ? '—' : `${state.evolution.kpis.retentionWauMau}%`} color="#a78bfa" />
            <Kpi label="ATIVAÇÃO (30D)" value={`${state.evolution.kpis.activationRatePct}%`} color="#10b981" />
            <Kpi label="AÇÕES (30D)" value={state.evolution.kpis.actions30d} delta={state.evolution.kpis.actionsDeltaPct} color="#f97316" />
            <Kpi label="CHURN (30D)" value={state.evolution.kpis.churnRatePct === null ? '—' : `${state.evolution.kpis.churnRatePct}%`} color={state.evolution.kpis.churnRatePct !== null && state.evolution.kpis.churnRatePct > 50 ? '#ef4444' : '#34d399'} />
          </div>

          {/* Cadastros por mês */}
          <div style={{ background: '#0f172a', borderRadius: '6px', padding: '1rem', marginBottom: '1rem', border: '1px solid #334155' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.75rem' }}>CADASTROS POR MÊS (ÚLTIMOS 12)</div>
            <BarChart
              data={state.evolution.signupsByMonth.map(s => ({ label: s.month.slice(5), value: s.count }))}
              color="#ec4899"
            />
          </div>

          {/* Atividade semanal */}
          <div style={{ background: '#0f172a', borderRadius: '6px', padding: '1rem', marginBottom: '1.25rem', border: '1px solid #334155' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.75rem' }}>AÇÕES POR SEMANA / USUÁRIOS DISTINTOS (ÚLTIMAS 8 SEMANAS)</div>
            <BarChart
              data={state.evolution.activityByWeek.map(a => ({ label: a.week.slice(5), value: a.actions }))}
              color="#f97316"
              secondary={state.evolution.activityByWeek.map(a => ({ label: a.week.slice(5), value: a.users }))}
              secondaryColor="#60a5fa"
            />
          </div>

          {/* Quem está acessando */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            <div style={{ background: '#0f172a', borderRadius: '6px', padding: '1rem', border: '1px solid #334155' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
                🔑 ÚLTIMOS ACESSOS (SESSÕES — {state.evolution.recentSessions.length})
              </div>
              {state.evolution.recentSessions.length === 0 && (
                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Nenhuma sessão registrada.</div>
              )}
              {state.evolution.recentSessions.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', padding: '0.35rem 0', borderBottom: '1px solid #1e293b', fontSize: '0.8rem' }}>
                  <span style={{ color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  <span style={{ color: '#64748b', flexShrink: 0 }}>{new Date(s.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>

            <div style={{ background: '#0f172a', borderRadius: '6px', padding: '1rem', border: '1px solid #334155' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
                🌐 TENTATIVAS DE LOGIN POR IP ({state.evolution.loginAttempts.length})
              </div>
              {state.evolution.loginAttempts.length === 0 && (
                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Sem tentativas registradas.</div>
              )}
              {state.evolution.loginAttempts.map((a, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', padding: '0.35rem 0', borderBottom: '1px solid #1e293b', fontSize: '0.8rem' }}>
                  <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{a.ip}</span>
                  <span style={{ color: a.count > 5 ? '#ef4444' : '#64748b', flexShrink: 0 }}>
                    {a.count}× · {new Date(a.lastAttempt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Email Test */}
      <section style={{ marginBottom: '2rem', background: '#1e293b', padding: '1.5rem', borderRadius: '8px', border: '1px solid #334155' }}>
        <h2 style={{ marginTop: 0, color: '#7c3aed' }}>📧 Teste de Envio de E-mail</h2>
        <p style={{ color: '#94a3b8', marginTop: 0 }}>
          Dispara um e-mail real via Resend para validar a configuração do servidor.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="email"
            value={state.emailTest.email}
            onChange={e => setEmailTest({ email: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') handleSendTestEmail(); }}
            placeholder="destinatario@exemplo.com"
            style={{
              flex: '1 1 260px',
              maxWidth: '400px',
              background: '#0f172a',
              color: '#e2e8f0',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              fontFamily: 'monospace',
              fontSize: '0.875rem'
            }}
          />
          <button
            onClick={handleSendTestEmail}
            disabled={state.emailTest.sending || !state.emailTest.email.trim()}
            style={{
              background: state.emailTest.sending ? '#475569' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem 1.5rem',
              cursor: state.emailTest.sending || !state.emailTest.email.trim() ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              opacity: state.emailTest.sending || !state.emailTest.email.trim() ? 0.6 : 1
            }}
          >
            {state.emailTest.sending ? '⏳ Enviando...' : '📤 Enviar E-mail de Teste'}
          </button>
        </div>
        {state.emailTest.result && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            borderRadius: '6px',
            border: `1px solid ${state.emailTest.result.success ? '#10b981' : '#ef4444'}`,
            background: state.emailTest.result.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: state.emailTest.result.success ? '#34d399' : '#f87171'
          }}>
            {state.emailTest.result.success ? (
              <>
                ✅ E-mail enviado com sucesso!
                {state.emailTest.result.messageId && (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                    Message ID: {state.emailTest.result.messageId}
                  </div>
                )}
              </>
            ) : (
              <>❌ Falha no envio: {state.emailTest.result.error}</>
            )}
          </div>
        )}
      </section>

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

function verdictColor(status: EvolutionReport['verdict']['status']): string {
  if (status === 'SAUDAVEL') return '#10b981';
  if (status === 'ATENCAO') return '#f59e0b';
  return '#ef4444';
}

function alertColor(severity: 'CRITICO' | 'ATENCAO' | 'INFO'): string {
  if (severity === 'CRITICO') return '#ef4444';
  if (severity === 'ATENCAO') return '#f59e0b';
  return '#60a5fa';
}

function statusLabel(status: EvolutionReport['verdict']['status']): string {
  if (status === 'SAUDAVEL') return 'SAUDÁVEL';
  if (status === 'ATENCAO') return 'ATENÇÃO';
  return 'CRÍTICO';
}

function Kpi({ label, value, delta, color }: {
  label: string;
  value: number | string;
  delta?: number | null;
  color: string;
}) {
  const deltaColor = delta === null || delta === undefined ? '#64748b' : delta > 0 ? '#34d399' : delta < 0 ? '#f87171' : '#64748b';
  const deltaText = delta === null || delta === undefined ? '' : `${delta > 0 ? '+' : ''}${delta}% vs 30d ant.`;

  return (
    <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '6px', border: '1px solid #334155' }}>
      <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginBottom: '0.5rem' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color }}>{value}</div>
      {deltaText && <div style={{ fontSize: '0.7rem', color: deltaColor, marginTop: '0.25rem' }}>{deltaText}</div>}
    </div>
  );
}

function BarChart({ data, color, secondary, secondaryColor }: {
  data: Array<{ label: string; value: number }>;
  color: string;
  secondary?: Array<{ label: string; value: number }>;
  secondaryColor?: string;
}) {
  const max = Math.max(1, ...data.map(d => d.value), ...(secondary || []).map(d => d.value));

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '110px', overflowX: 'auto' }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '28px', flex: 1, height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', flex: 1, width: '100%', justifyContent: 'center' }}>
            <div style={{
              width: secondary ? '45%' : '70%',
              height: `${Math.max(3, (d.value / max) * 100)}%`,
              background: color,
              borderRadius: '3px 3px 0 0',
              minHeight: '3px'
            }} />
            {secondary && secondary[i] && (
              <div style={{
                width: '45%',
                height: `${Math.max(3, (secondary[i].value / max) * 100)}%`,
                background: secondaryColor || '#60a5fa',
                borderRadius: '3px 3px 0 0',
                minHeight: '3px'
              }} />
            )}
          </div>
          <div style={{ fontSize: '0.6rem', color: '#64748b', marginTop: '0.35rem', whiteSpace: 'nowrap' }}>{d.label}</div>
          <div style={{ fontSize: '0.65rem', color: '#cbd5e1', fontWeight: 600 }}>{d.value}</div>
        </div>
      ))}
    </div>
  );
}
