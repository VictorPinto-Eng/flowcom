'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '../shell/DashboardHeader';
import { EditWorkspaceModal, WhatsNewModal } from '../modals';
import styles from '../shell/DashboardClient.module.css';

interface PanelsClientProps {
  user: any;
  userSeqid: string;
  workspaces: any[];
  dashboardStats: any;
  workspaceCounters: any[];
  workspaceTypes: any[];
}

export default function PanelsClient({
  user,
  userSeqid,
  workspaces,
  dashboardStats,
  workspaceCounters,
  workspaceTypes
}: PanelsClientProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingWorkspace, setEditingWorkspace] = useState<any>(null);
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  useEffect(() => {
    const lastVersionSeen = localStorage.getItem('whats-new-version');
    if (lastVersionSeen !== '1.0.0') {
      setShowWhatsNew(true);
    }
  }, []);

  const handleCloseWhatsNew = () => {
    localStorage.setItem('whats-new-version', '1.0.0');
    setShowWhatsNew(false);
  };

  const filteredWorkspaces = workspaces.filter(ws =>
    ws.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ws.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculando stats globais baseados nos dados reais passados
  const totalWorkspaces = workspaces.length;
  const activeActivities = dashboardStats?.activeActivities || 0;
  const ongoingEvents = dashboardStats?.ongoingEvents || 0;
  const overdueEvents = dashboardStats?.overdueEvents || 0;

  return (
    <div className={styles.dashboardContainer}>
      <DashboardHeader
        user={{
          name: user.name,
          email: user.email,
          image: user.image || undefined,
        }}
        onPanelClick={() => router.push('/dashboard/panels')}
        onMyActivitiesClick={() => router.push('/activities')}
        onMyEventsClick={() => router.push('/dashboard/my-events')}
      />

      <div className={styles.workspaceLayout}>
        <main className={styles.boardArea} style={{ padding: '0.75rem', overflow: 'hidden' }}>
          {/* Header da Página */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.6rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
              <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0, whiteSpace: 'nowrap' }}>
                Painel de Controle de <span style={{ color: '#6366f1' }}>Áreas de Trabalho</span>
              </h1>
              <span style={{
                color: '#64748b',
                fontSize: '0.85rem',
                fontWeight: 600,
                whiteSpace: 'nowrap'
              }}>
                — {totalWorkspaces} {totalWorkspaces === 1 ? 'área' : 'áreas'}
              </span>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
              <button
                onClick={() => router.push('/dashboard/workspace/new')}
                style={{
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                + Nova Área
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                style={{
                  background: 'white',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ← Voltar
              </button>
            </div>
          </div>

          {/* Cards de Estatísticas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))',
            gap: '0.5rem',
            marginBottom: '0.6rem'
          }}>
            <StatCard icon="📁" value={totalWorkspaces} label="Áreas de Trabalho" />
            <StatCard icon="⚡" value={activeActivities} label="Atividades Ativas" />
            <StatCard icon="📋" value={ongoingEvents} label="Eventos em Andamento" />
            <StatCard icon="⚠️" value={overdueEvents} label="Eventos Atrasados" color="#ef4444" />
          </div>

          {/* Filtro e Ordenação */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.6rem',
            gap: '0.75rem'
          }}>
            <div style={{
              position: 'relative',
              flex: 1,
              maxWidth: '400px'
            }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
              <input
                type="text"
                placeholder="Pesquise pelo nome ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem 0.45rem 2.25rem',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  outline: 'none',
                  fontSize: '0.85rem'
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Ordenar por:</span>
              <select style={{
                padding: '0.5rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                color: '#475569',
                fontSize: '0.9rem'
              }}>
                <option>Nome (A - Z)</option>
                <option>Nome (Z - A)</option>
                <option>Mais Recentes</option>
              </select>
            </div>
          </div>

          {/* Grid de Workspaces (Cards Premium) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
            gap: '0.75rem'
          }}>
            {filteredWorkspaces.map((ws) => (
              <WorkspaceCard
                key={ws.id}
                ws={ws}
                router={router}
                onEdit={() => setEditingWorkspace(ws)}
              />
            ))}
          </div>

          {editingWorkspace && (
            <EditWorkspaceModal
              workspace={editingWorkspace}
              types={workspaceTypes}
              currentUserSeqid={userSeqid}
              onSubmit={async (data) => {
                try {
                  const { updateWorkspaceAction } = await import('@/app/actions/workspaceActions');
                  await updateWorkspaceAction(editingWorkspace.id, data);
                  setEditingWorkspace(null);
                  router.refresh();
                } catch (err) {
                  console.error('Erro ao atualizar workspace:', err);
                }
              }}
              onClose={() => setEditingWorkspace(null)}
            />
          )}

          {filteredWorkspaces.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              Nenhuma área de trabalho encontrada para a pesquisa.
            </div>
          )}

          {showWhatsNew && (
            <WhatsNewModal onClose={handleCloseWhatsNew} />
          )}
        </main>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color = '#0f172a' }: any) {
  return (
    <div style={{
      background: 'white',
      padding: '0.6rem',
      borderRadius: '10px',
      border: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
    }}>
      <div style={{
        fontSize: '1.1rem',
        background: '#f8fafc',
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        border: '1px solid #f1f5f9'
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: color }}>{value}</div>
        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{label}</div>
      </div>
    </div>
  );
}

function WorkspaceCard({ ws, router, onEdit }: any) {
  // Simulando dados de progresso baseados nos boards da workspace para o visual do card
  const totalBoards = ws.boards?.length || 0;
  const completedBoards = ws.boards?.filter((b: any) => b.dtcon).length || 0;
  const progress = totalBoards > 0 ? Math.round((completedBoards / totalBoards) * 100) : 0;


  const activeBoards = ws.boards?.filter((b: any) => !b.dtcon) || [];
  const overdueBoards = activeBoards.filter((b: any) => {
    if (!b.previsto) return false;
    return new Date(b.previsto) < new Date();
  }).length || 0;

  const totalEvents = ws.boards?.reduce((acc: number, b: any) =>
    acc + (b.columns?.reduce((sum: number, col: any) => sum + (col.cards?.length || 0), 0) || 0), 0
  ) || 0;

  const completedEvents = ws.boards?.reduce((acc: number, b: any) =>
    acc + (b.columns?.reduce((sum: number, col: any) =>
      sum + (col.cards?.filter((c: any) => c.dtcon).length || 0), 0) || 0), 0
  ) || 0;

  const ongoingEvents = totalEvents - completedEvents;

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      padding: '1rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
          {ws.name} <span style={{ cursor: 'help', fontSize: '0.75rem', color: '#94a3b8' }}>ⓘ</span>
        </h3>
        <span style={{
          fontSize: '0.65rem',
          fontWeight: 800,
          padding: '0.2rem 0.5rem',
          borderRadius: '4px',
          background: '#e0f2fe',
          color: '#0369a1',
          textTransform: 'uppercase'
        }}>
          {ws.type?.name || 'OUTRO'}
        </span>
      </div>

      <div style={{ marginBottom: '0.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.25rem', color: '#64748b' }}>
          <span>Progresso de Eventos</span>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>{progress}%</span>
        </div>
        <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: '#6366f1' }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ color: '#f59e0b' }}>⚡</span>
          <span style={{ fontWeight: 600 }}>Atividades</span>
          <span style={{ color: '#64748b' }}>{activeBoards.length} ativas • <span style={{ color: '#ef4444' }}>{overdueBoards} atrasadas</span></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ color: '#94a3b8' }}>📋</span>
          <span style={{ fontWeight: 600 }}>Eventos</span>
          <span style={{ color: '#64748b' }}>{ongoingEvents} ativos • {completedEvents} concluídos</span>
        </div>
      </div>

      <div style={{ marginTop: '0.25rem' }}>
        <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.35rem', textTransform: 'uppercase' }}>Setores:</div>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          {ws.boards?.map((b: any) => b.sector?.acronym).filter((a: any, i: number, arr: any[]) => a && arr.indexOf(a) === i).map((acronym: string, idx: number) => (
                <span key={`${acronym}-${idx}`} style={{
                  fontSize: '0.6rem',
                  padding: '0.15rem 0.35rem',
                  borderRadius: '4px',
                  background: '#f1f5f9',
                  color: '#64748b',
                  border: '1px solid #e2e8f0',
                  fontWeight: 600
                }}>
                  {acronym}
                </span>
              ))}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.4rem',
        marginTop: 'auto',
        paddingTop: '0.75rem',
        borderTop: '1px solid #f1f5f9'
      }}>
        <button
          onClick={onEdit}
          style={{
            padding: '0.4rem',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            background: 'white',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            color: '#475569'
          }}
        >
          ✏️ Editar
        </button>
        <button
          onClick={() => router.push(`/dashboard?workspaceId=${ws.id}`)}
          style={{
            padding: '0.4rem',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            background: 'white',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            color: '#475569'
          }}
        >
          📋 Ver Atividades
        </button>
        <button
          onClick={() => router.push(`/dashboard?workspaceId=${ws.id}&view=kanban`)}
          style={{
            gridColumn: 'span 2',
            padding: '0.45rem',
            borderRadius: '6px',
            border: 'none',
            background: '#6366f1',
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem'
          }}
        >
          🖼️ Kanban
        </button>
      </div>
    </div>
  );
}
