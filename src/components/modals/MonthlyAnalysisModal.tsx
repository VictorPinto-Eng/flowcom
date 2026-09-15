'use client';

import styles from './EditEventModal.module.css';

interface MonthlyData {
  monthLabel: string;
  totalCompleted: number;
  inProgress: number;
  overdue: number;
  completionRate: number;
  avgCompletionDays: number | null;
  bySector: Array<{ count: number; name: string; acronym: string }>;
  byUser: Array<{ count: number; name: string }>;
  weeklyTimeline: Array<{ week: number; label: string; count: number }>;
}

interface MonthlyAnalysisModalProps {
  data: MonthlyData;
  onClose: () => void;
}

export default function MonthlyAnalysisModal({ data, onClose }: MonthlyAnalysisModalProps) {
  const maxWeekly = Math.max(...data.weeklyTimeline.map(w => w.count), 1);
  const maxSector = Math.max(...data.bySector.map(s => s.count), 1);
  const maxUser = Math.max(...data.byUser.map(u => u.count), 1);

  const getSectorColor = (acronym: string) => {
    const upper = acronym.toUpperCase();
    if (upper === 'JUR') return '#3b82f6';
    if (upper === 'FNC') return '#ef4444';
    if (upper === 'ENG') return '#f59e0b';
    return '#7c3aed';
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '650px', maxHeight: '85vh' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
            📊 Análise Mensal — {data.monthLabel}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#64748b',
              padding: '0.25rem',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        <div style={{
          overflowY: 'auto',
          maxHeight: 'calc(85vh - 60px)',
          padding: '1.25rem'
        }}>
          {/* Métricas principais */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.75rem',
            marginBottom: '1.25rem'
          }}>
            <MetricCard icon="✅" value={data.totalCompleted} label="Concluídas" color="#10b981" />
            <MetricCard icon="⏳" value={data.inProgress} label="Em Andamento" color="#3b82f6" />
            <MetricCard icon="⚠️" value={data.overdue} label="Atrasadas" color="#ef4444" />
            <MetricCard icon="📈" value={`${data.completionRate}%`} label="Taxa Conclusão" color="#6366f1" />
          </div>

          {data.avgCompletionDays !== null && (
            <div style={{
              textAlign: 'center',
              fontSize: '0.8rem',
              color: '#64748b',
              marginBottom: '1.25rem'
            }}>
              Tempo médio de conclusão: <strong style={{ color: '#0f172a' }}>{data.avgCompletionDays} dias</strong>
            </div>
          )}

          {/* Evolução Semanal */}
          <SectionTitle>📈 Evolução Semanal</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {data.weeklyTimeline.map((week) => (
              <div key={week.week} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', width: '45px', textAlign: 'right' }}>
                  {week.label}
                </span>
                <div style={{
                  flex: 1,
                  height: '20px',
                  background: '#f1f5f9',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(week.count / maxWeekly) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                    minWidth: week.count > 0 ? '8px' : '0'
                  }} />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', width: '25px' }}>
                  {week.count}
                </span>
              </div>
            ))}
          </div>

          {/* Por Setor */}
          {data.bySector.length > 0 && (
            <>
              <SectionTitle>🏢 Por Setor</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {data.bySector.map((sector) => (
                  <div key={sector.acronym} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      fontSize: '0.65rem',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      background: `${getSectorColor(sector.acronym)}20`,
                      color: getSectorColor(sector.acronym),
                      fontWeight: 700,
                      width: '50px',
                      textAlign: 'center'
                    }}>
                      {sector.acronym}
                    </span>
                    <div style={{
                      flex: 1,
                      height: '16px',
                      background: '#f1f5f9',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${(sector.count / maxSector) * 100}%`,
                        height: '100%',
                        background: getSectorColor(sector.acronym),
                        borderRadius: '4px',
                        minWidth: sector.count > 0 ? '8px' : '0'
                      }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a', width: '25px' }}>
                      {sector.count}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Top Performers */}
          {data.byUser.length > 0 && (
            <>
              <SectionTitle>👥 Top Performers</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {data.byUser.slice(0, 5).map((user, idx) => (
                  <div key={user.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#cd7f32' : '#64748b',
                      width: '20px',
                      textAlign: 'center'
                    }}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`}
                    </span>
                    <div style={{
                      flex: 1,
                      height: '16px',
                      background: '#f1f5f9',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${(user.count / maxUser) * 100}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                        borderRadius: '4px',
                        minWidth: user.count > 0 ? '8px' : '0'
                      }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', flex: 1 }}>
                      {user.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', width: '25px' }}>
                      {user.count}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontSize: '0.8rem',
      fontWeight: 700,
      color: '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      margin: '0 0 0.5rem 0'
    }}>
      {children}
    </h3>
  );
}

function MetricCard({ icon, value, label, color }: { icon: string; value: string | number; label: string; color: string }) {
  return (
    <div style={{
      background: '#f8fafc',
      borderRadius: '8px',
      padding: '0.75rem',
      textAlign: 'center',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{icon}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{label}</div>
    </div>
  );
}
