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
  onEditBoard: (board: any) => void;
  onCompleteBoard: (boardId: string, boardName: string) => Promise<void>;
  onBack?: () => void;
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
  userSeqid,
  onEditBoard,
  onCompleteBoard,
  onBack
}: MyActivitiesViewProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewType, setViewType] = useState<'grid' | 'table'>('grid');
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

  const scrollToTop = () => {
    const element = contentRef.current;
    if (element) {
      const isScrollable = element.scrollHeight > element.clientHeight;
      if (isScrollable) {
        element.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    const element = contentRef.current;
    if (element) {
      const isScrollable = element.scrollHeight > element.clientHeight;
      if (isScrollable) {
        element.scrollTo({
          top: element.scrollHeight,
          behavior: 'smooth'
        });
        return;
      }
    }
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
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
      if (!searchTerm) return true;
      const lower = searchTerm.toLowerCase();
      return (
        b.name.toLowerCase().includes(lower) ||
        b.seqId.toString().includes(lower) ||
        b.workspaceName?.toLowerCase().includes(lower) ||
        b.sector?.name.toLowerCase().includes(lower) ||
        b.sector?.acronym.toLowerCase().includes(lower)
      );
    });

    // Sort by previsto date ascending (closest date first). Unscheduled at the end.
    return filtered.sort((a, b) => {
      // 1. Sort by previsto date
      if (a.previsto && b.previsto) {
        return new Date(a.previsto).getTime() - new Date(b.previsto).getTime();
      }
      if (a.previsto) return -1;
      if (b.previsto) return 1;

      // 2. Fallback to createdAt descending
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [workspaces, currentUser.id, userSeqid, searchTerm]);

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
            Acompanhamento de todos os seus quadros/fluxos de trabalho ordenados por data de agendamento
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
            onClick={() => {
              if (onBack) {
                onBack();
              } else {
                router.push('/dashboard');
              }
            }}
            className={styles.backBtn}
            title="Voltar para a tela anterior"
          >
            ← Voltar ao Painel
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

        {/* Quick Search */}
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
                      onClick={() => onEditBoard(board)}
                      title="Editar Atividade"
                    >
                      ✏️ Editar
                    </button>
                    <Link
                      href={`/dashboard?boardId=${board.id}&from=my-activities`}
                      className={styles.actionBtnPrimary}
                      title="Eventos"
                    >
                      ⚡ Eventos
                    </Link>
                    <Link
                      href={`/dashboard?boardId=${board.id}&view=completed&from=my-activities`}
                      className={styles.actionBtnSecondary}
                      title="Ver Histórico Concluído"
                    >
                      ✅ Histórico
                    </Link>
                    {!board.dtcon && (
                      <button
                        className={styles.actionBtnWarn}
                        onClick={() => onCompleteBoard(board.id, board.name)}
                        title="Encerrar Atividade"
                      >
                        🔒 Encerrar
                      </button>
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
                            onClick={() => onEditBoard(board)}
                            title="Editar Atividade"
                          >
                            ✏️
                          </button>
                          <Link
                            href={`/dashboard?boardId=${board.id}&from=my-activities`}
                            className={styles.tableActionBtnOpen}
                            title="Eventos"
                          >
                            ⚡
                          </Link>
                          <Link
                            href={`/dashboard?boardId=${board.id}&view=completed&from=my-activities`}
                            className={styles.tableActionBtnHistory}
                            title="Histórico Concluído"
                          >
                            ✅
                          </Link>
                          {!board.dtcon && (
                            <button
                              className={styles.tableActionBtnLock}
                              onClick={() => onCompleteBoard(board.id, board.name)}
                              title="Encerrar Atividade"
                            >
                              🔒
                            </button>
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

      {/* Floating Scroll Controls */}
      <div className={styles.scrollButtons}>
        <button 
          className={styles.scrollBtn} 
          onClick={scrollToTop} 
          title="Ir para o topo"
        >
          ▲
        </button>
        <button 
          className={styles.scrollBtn} 
          onClick={scrollToBottom} 
          title="Ir para o final"
        >
          ▼
        </button>
      </div>
    </div>
  );
}
