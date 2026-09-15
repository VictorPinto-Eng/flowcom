'use client';

import { useRouter } from 'next/navigation';
import styles from './EditEventModal.module.css';

interface Activity {
  seqid: string;
  name: string;
  workspaceName: string;
  sector: string | null;
  sectorName: string | null;
  previsto: string | null;
  dtatv: string | null;
  ownerName: string | null;
  cardsCount: number;
}

interface ActiveActivitiesModalProps {
  activities: Activity[];
  onClose: () => void;
}

export default function ActiveActivitiesModal({ activities, onClose }: ActiveActivitiesModalProps) {
  const router = useRouter();

  const handleActivityClick = (seqid: string) => {
    router.push(`/dashboard/board/${seqid}`);
    onClose();
  };

  const getSectorColor = (sector: string | null) => {
    if (!sector) return { bg: '#f1f5f9', color: '#64748b' };
    const upper = sector.toUpperCase();
    if (upper === 'JUR') return { bg: '#dbeafe', color: '#2563eb' };
    if (upper === 'FNC') return { bg: '#fee2e2', color: '#dc2626' };
    if (upper === 'ENG') return { bg: '#fef3c7', color: '#d97706' };
    return { bg: '#f3e8ff', color: '#7c3aed' };
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getDaysUntilDeadline = (previsto: string | null) => {
    if (!previsto) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(previsto);
    deadline.setHours(0, 0, 0, 0);
    const diff = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '700px', maxHeight: '80vh' }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
            ⚡ Atividades Ativas <span style={{ color: '#64748b', fontWeight: 500, fontSize: '0.9rem' }}>({activities.length})</span>
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
          maxHeight: 'calc(80vh - 60px)',
          padding: '0.5rem'
        }}>
          {activities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              Nenhuma atividade ativa encontrada.
            </div>
          ) : (
            activities.map((activity) => {
              const daysLeft = getDaysUntilDeadline(activity.previsto);
              const sectorColors = getSectorColor(activity.sector);

              return (
                <div
                  key={activity.seqid}
                  onClick={() => handleActivityClick(activity.seqid)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    borderBottom: '1px solid #f1f5f9'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  {/* Setor badge */}
                  {activity.sector && (
                    <span style={{
                      fontSize: '0.6rem',
                      padding: '0.2rem 0.4rem',
                      borderRadius: '4px',
                      background: sectorColors.bg,
                      color: sectorColors.color,
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}>
                      {activity.sector}
                    </span>
                  )}

                  {/* Info principal */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {activity.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {activity.workspaceName}
                      {activity.cardsCount > 0 && ` • ${activity.cardsCount} evento${activity.cardsCount > 1 ? 's' : ''}`}
                    </div>
                  </div>

                  {/* Data prevista */}
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {formatDate(activity.previsto)}
                    </div>
                    {daysLeft !== null && (
                      <div style={{
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        color: daysLeft < 0 ? '#ef4444' : daysLeft <= 3 ? '#f59e0b' : '#10b981'
                      }}>
                        {daysLeft < 0 ? `${Math.abs(daysLeft)}d atrasado` : daysLeft === 0 ? 'Hoje' : `${daysLeft}d restantes`}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
