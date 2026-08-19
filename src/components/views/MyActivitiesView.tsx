'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './MyActivitiesView.module.css';

interface BoardShort {
  id: string;
  seqId: string;
  name: string;
  detalhes?: string | null;
  dtcon?: string | Date | null;
  dtatv?: string | Date | null;
  previsto?: string | Date | null;
  createdAt?: string | Date | null;
  columns?: any[];
  workspaceId?: string | number | null;
  workspaceName?: string;
  user?: {
    id: string;
    seqid?: string;
    name: string;
    email: string;
    image?: string | null;
  } | null;
  sector?: {
    id: number;
    name: string;
    acronym: string;
  } | null;
}

interface MyActivitiesViewProps {
  workspaces: any[];
  currentUser: { id: string; name: string; email: string };
  userSeqid: string;
}

const getSectorColors = (acronym?: string | null) => {
  if (!acronym) return {};
  const upper = acronym.toUpperCase();
  if (upper === 'JUR') {
    return {
      background: 'rgba(59, 130, 246, 0.07)',
      color: '#60a5fa',
      border: '1px solid rgba(59, 130, 246, 0.18)'
    };
  }
  if (upper === 'FNC') {
    return {
      background: 'rgba(239, 68, 68, 0.07)',
      color: '#f87171',
      border: '1px solid rgba(239, 68, 68, 0.18)'
    };
  }
  if (upper === 'ENG') {
    return {
      background: 'rgba(245, 158, 11, 0.07)',
      color: '#fbbf24',
      border: '1px solid rgba(245, 158, 11, 0.18)'
    };
  }
  return {
    background: 'rgba(139, 92, 246, 0.07)',
    color: '#a78bfa',
    border: '1px solid rgba(139, 92, 246, 0.18)'
  };
};

export default function MyActivitiesView({
  workspaces,
  currentUser,
  userSeqid
}: MyActivitiesViewProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewType, setViewType] = useState<'grid' | 'table'>('grid');
  const [eventFilter, setEventFilter] = useState<'all' | 'with-events' | 'without-events'>('all');
  const contentRef = useRef<HTMLDivElement>(null);

  // Restore layout preference on mount
  useEffect(() => {
    const savedLayout = localStorage.getItem('my-activities-layout');
    if (savedLayout === 'grid' || savedLayout === 'table') {
      setViewType(savedLayout);
    }
  }, []);

  const handleSetViewType = (type: 'grid' | 'table') => {
    setViewType(type);
    localStorage.setItem('my-activities-layout', type);
  };

  // Gather all activities (boards) across all workspaces belonging to this user
  const userActivities = useMemo(() => {
    if (!workspaces) return [];

    const allBoards: BoardShort[] = [];

    workspaces.forEach(ws => {
      if (ws.boards) {
        ws.boards.forEach((b: any) => {
          // Check if user is the owner/assigned user of the board
          const isOwner = b.user?.id === currentUser.id || b.user_seqid?.toString() === userSeqid;
          
          // Exclude completed/closed activities (where dtcon is set)
          if (isOwner && !b.dtcon) {
            allBoards.push({
              ...b,
              workspaceName: ws.name
            });
          }
        });
      }
    });

    // Filter by search term
    const filtered = allBoards.filter(b => {
      const matchesSearch = !searchTerm || (
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.seqId.toString().includes(searchTerm.toLowerCase()) ||
        b.workspaceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.sector?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.sector?.acronym.toLowerCase().includes(searchTerm.toLowerCase())
      );

      const hasEvents = b.columns?.some((col: any) =>
          col.cards && col.cards.some((card: any) => !card.dtcon)
        );
      const matchesEvents = eventFilter === 'all'
        ? true
        : eventFilter === 'with-events'
          ? hasEvents
          : !hasEvents;

      return matchesSearch && matchesEvents;
    });

    // Sort by previsto date ascending (oldest first). Unscheduled at the end.
    return filtered.sort((a, b) => {
      if (a.previsto && b.previsto) {
        const dA = new Date(a.previsto);
        const dB = new Date(b.previsto);
        return dA.getTime() - dB.getTime();
      }
      if (a.previsto) return -1;
      if (b.previsto) return 1;

      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [workspaces, currentUser.id, userSeqid, searchTerm, eventFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = userActivities.length;
    const active = userActivities.length; // all are active now
    const withDeadline = userActivities.filter(a => !!a.previsto).length;

    // Sum of events/cards across columns of all active boards
    let totalEvents = 0;
    userActivities.forEach(b => {
      b.columns?.forEach((col: any) => {
        totalEvents += (col.cards?.length || 0);
      });
    });

    // Overdue active activities
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = userActivities.filter(a => {
      if (!a.previsto) return false;
      const dateStr = new Date(a.previsto).toISOString().split('T')[0];
      const [year, month, day] = dateStr.split('-').map(Number);
      const expectedDate = new Date(year, month - 1, day);
      expectedDate.setHours(0, 0, 0, 0);
      return expectedDate < today;
    }).length;

    return { total, active, totalEvents, withDeadline, overdue };
  }, [userActivities]);

  const getBoardStats = (board: BoardShort) => {
    let activeCardsCount = 0;
    let completedCardsCount = 0;

    board.columns?.forEach((col: any) => {
      col.cards?.forEach((card: any) => {
        if (card.dtcon) {
          completedCardsCount++;
        } else {
          activeCardsCount++;
        }
      });
    });

    const total = activeCardsCount + completedCardsCount;
    const pct = total > 0 ? Math.round((completedCardsCount / total) * 100) : 0;

    return { active: activeCardsCount, completed: completedCardsCount, total, pct };
  };

  const getDeadlineStatus = (previsto: string | Date | null | undefined) => {
    if (!previsto) return { label: 'Sem data', className: styles.statusNone };
    
    const dateStr = new Date(previsto).toISOString().split('T')[0];
    const [year, month, day] = dateStr.split('-').map(Number);
    const expectedDate = new Date(year, month - 1, day);
    expectedDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expectedDate < today) {
      return { label: 'Atrasado', className: styles.statusDanger };
    } else if (expectedDate.getTime() === today.getTime()) {
      return { label: 'Hoje', className: styles.statusWarning };
    } else {
      return { label: 'No prazo', className: styles.statusSuccess };
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitleArea}>
          <h2 className={styles.title}>Minhas Atividades Agendadas</h2>
          <p className={styles.subtitle}>
            Acompanhamento das suas atividades ativas e respectivos prazos de entrega.
          </p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.viewToggleGroup}>
            <button
              className={`${styles.viewToggleBtn} ${viewType === 'grid' ? styles.activeView : ''}`}
              onClick={() => handleSetViewType('grid')}
              title="Visualização em Grid"
            >
              Grid
            </button>
            <button
              className={`${styles.viewToggleBtn} ${viewType === 'table' ? styles.activeView : ''}`}
              onClick={() => handleSetViewType('table')}
              title="Visualização em Lista"
            >
              Lista
            </button>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className={styles.backBtn}
            title="Voltar para o dashboard"
          >
            ← Voltar
          </button>
        </div>
      </div>

      <div ref={contentRef} className={styles.content}>
        {/* KPI Panel */}
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon}>⚡</div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiVal}>{stats.active}</span>
              <span className={styles.kpiLabel}>Atividades Ativas</span>
            </div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon}>📝</div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiVal}>{stats.totalEvents}</span>
              <span className={styles.kpiLabel}>Total de Eventos</span>
            </div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon}>📅</div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiVal}>{stats.withDeadline}</span>
              <span className={styles.kpiLabel}>Agendadas</span>
            </div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon}>⚠️</div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiVal}>{stats.overdue}</span>
              <span className={styles.kpiLabel}>Atrasadas</span>
            </div>
          </div>
        </div>

        {/* Quick Search & Filters */}
        <div className={styles.searchBar}>
          <div className={styles.searchInputWrapper}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Pesquise por código, nome, setor ou área de trabalho..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            {searchTerm && (
              <button className={styles.clearSearchBtn} onClick={() => setSearchTerm('')}>
                ✕
              </button>
            )}
          </div>

          <div className={styles.filterGroup}>
            <button
              className={`${styles.filterBtn} ${eventFilter === 'all' ? styles.activeFilter : ''}`}
              onClick={() => setEventFilter('all')}
            >
              Todas
            </button>
            <button
              className={`${styles.filterBtn} ${eventFilter === 'with-events' ? styles.activeFilter : ''}`}
              onClick={() => setEventFilter('with-events')}
            >
              Com Eventos
            </button>
            <button
              className={`${styles.filterBtn} ${eventFilter === 'without-events' ? styles.activeFilter : ''}`}
              onClick={() => setEventFilter('without-events')}
            >
              Sem Eventos
            </button>
          </div>

          <span className={styles.resultsCount}>
            {userActivities.length} atividade(s) encontrada(s)
          </span>
        </div>

        {/* Activities List/Grid */}
        {userActivities.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Nenhuma atividade sob sua responsabilidade encontrada.</p>
          </div>
        ) : viewType === 'grid' ? (
          <div className={styles.grid}>
            {userActivities.map(board => {
              const { active, completed, pct } = getBoardStats(board);
              const deadline = getDeadlineStatus(board.previsto);
              const formattedPrevisto = board.previsto
                ? new Date(board.previsto).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                : 'Não agendado';

              return (
                <div key={board.id} className={`${styles.card} ${board.dtcon ? styles.cardCompleted : ''}`}>
                  <div className={styles.cardHeader}>
                    <span className={styles.workspaceLabel}>{board.workspaceName}</span>
                    {board.sector ? (
                      <span
                        className={styles.sectorBadge}
                        style={getSectorColors(board.sector.acronym)}
                      >
                        {board.sector.acronym}
                      </span>
                    ) : (
                      <span className={styles.sectorBadgePlaceholder}>--</span>
                    )}
                  </div>
                  
                  <div className={styles.cardBody}>
                    <div className={styles.boardId}>CÓD. {board.seqId}</div>
                    <h3 className={styles.boardName}>{board.name}</h3>
                    {board.detalhes && (
                      <p className={styles.boardDetails}>{board.detalhes}</p>
                    )}

                    <div className={styles.progressSection}>
                      <div className={styles.progressLabel}>
                        <span>Fases Concluídas</span>
                        <span>{pct}%</span>
                      </div>
                      <div className={styles.progressBarTrack}>
                        <div className={styles.progressBarFill} style={{ width: `${pct}%` }} />
                      </div>
                      <div className={styles.progressDetail}>
                        {active} ativas • {completed} concluídas
                      </div>
                    </div>

                    <div className={styles.deadlineSection}>
                      <span className={styles.deadlineTitle}>Agendamento:</span>
                      <div className={styles.deadlineInfo}>
                        <span className={`${styles.statusBadge} ${deadline.className}`}>
                          {deadline.label}
                        </span>
                        <span className={styles.deadlineDate}>{formattedPrevisto}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.cardActions}>
                    <button
                      className={styles.actionBtnGhost}
                      onClick={() => console.log('Editar não implementado')}
                      title="Editar Atividade"
                    >
                      ✏️ Editar
                    </button>
                    <Link
                      href={`/dashboard/board/${board.id}?from=my-activities`}
                      className={styles.actionBtnPrimary}
                      title="Eventos"
                    >
                      ⚡ Eventos
                    </Link>
                    <Link
                      href={`/dashboard/board/${board.id}?view=completed&from=my-activities`}
                      className={styles.actionBtnSecondary}
                      title="Ver Histórico Concluído"
                    >
                      ✅ Histórico
                    </Link>
                    <Link
                      href={`/dashboard?view=activity-report&boardId=${board.id}&from=my-activities`}
                      className={styles.actionBtnSecondary}
                      title="Relatório completo da atividade"
                    >
                      📊 Relatório
                    </Link>
                    {!board.dtcon && (
                      <Link
                        href={`/dashboard/board/${board.id}?view=complete-board&from=my-activities`}
                        className={styles.actionBtnWarn}
                        title="Encerrar Atividade"
                      >
                        🔒 Encerrar
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Cód.</th>
                  <th>Área / Setor</th>
                  <th>Nome da Atividade</th>
                  <th>Progresso</th>
                  <th>Agendado</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {userActivities.map(board => {
                  const { active, completed, pct } = getBoardStats(board);
                  const deadline = getDeadlineStatus(board.previsto);
                  const formattedPrevisto = board.previsto
                    ? new Date(board.previsto).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                    : '—';

                  return (
                    <tr key={board.id} className={board.dtcon ? styles.rowCompleted : ''}>
                      <td className={styles.colId}>{board.seqId}</td>
                      <td>
                        <div className={styles.workspaceNameText}>{board.workspaceName}</div>
                        {board.sector ? (
                          <span
                            className={styles.sectorBadge}
                            style={getSectorColors(board.sector.acronym)}
                          >
                            {board.sector.acronym}
                          </span>
                        ) : (
                          <span className={styles.sectorBadgePlaceholder}>--</span>
                        )}
                      </td>
                      <td className={styles.colName}>
                        <div className={styles.boardNameText}>{board.name}</div>
                        {board.detalhes && (
                          <div className={styles.boardDetailsText}>{board.detalhes}</div>
                        )}
                      </td>
                      <td>
                        <div className={styles.tableProgressWrapper}>
                          <div className={styles.tableProgressBarTrack}>
                            <div className={styles.tableProgressBarFill} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={styles.tableProgressPct}>{pct}%</span>
                        </div>
                        <div className={styles.tableProgressDetail}>
                          {active} ativas • {completed} concluídas
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${deadline.className}`}>
                          {deadline.label}
                        </span>
                        <div className={styles.tablePrevistoText}>{formattedPrevisto}</div>
                      </td>
                      <td>
                        <div className={styles.tableActionsGroup}>
                          <button
                            className={styles.tableActionBtnEdit}
                            onClick={() => console.log('Editar não implementado nesta rota')}
                            title="Editar Atividade"
                          >
                            ✏️
                          </button>
                          <Link
                            href={`/dashboard/board/${board.id}?from=my-activities`}
                            className={styles.tableActionBtnOpen}
                            title="Eventos"
                          >
                            ⚡
                          </Link>
                          <Link
                            href={`/dashboard/board/${board.id}?view=completed&from=my-activities`}
                            className={styles.tableActionBtnHistory}
                            title="Histórico Concluído"
                          >
                            ✅
                          </Link>
                          <Link
                            href={`/dashboard?view=activity-report&boardId=${board.id}&from=my-activities`}
                            className={styles.tableActionBtnHistory}
                            title="Relatório completo da atividade"
                          >
                            📊
                          </Link>
                          {!board.dtcon && (
                            <Link
                              href={`/dashboard/board/${board.id}?view=complete-board&from=my-activities`}
                              className={styles.tableActionBtnLock}
                              title="Encerrar Atividade"
                            >
                              🔒
                            </Link>
                          )}
                                                  </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
