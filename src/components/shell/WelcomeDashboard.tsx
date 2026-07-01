'use client';

import Link from 'next/link';
import { CircleCheckBig, TrendingUp, TrendingDown, Minus, Clock, AlertTriangle, Calendar } from 'lucide-react';
import styles from './DashboardClient.module.css';
import type { DashboardStats } from '@/app/actions/dashboardActions';

interface WelcomeDashboardProps {
  user: { name: string };
  workspaces: any[];
  recentLogs: any[];
  dashboardStats?: DashboardStats;
  onOpenPremiumGrid: () => void;
}

export default function WelcomeDashboard({ user, workspaces, recentLogs, dashboardStats, onOpenPremiumGrid }: WelcomeDashboardProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Fallback to legacy all-time stats if dashboardStats not available
  const allBoards = workspaces.flatMap(w => w.boards || []);
  const activeBoardsCount = allBoards.filter(b => !b.dtcon).length;
  const completedBoardsCount = allBoards.filter(b => !!b.dtcon).length;

  const stats = dashboardStats;
  const totalOverdue = stats ? (stats.operational.overdueBoards + stats.operational.overdueCards) : 0;

  // Delta calculation helper
  const getDelta = (current: number, previous: number) => {
    const diff = current - previous;
    if (diff > 0) return { value: `+${diff}`, icon: 'up', className: styles.deltaPositive };
    if (diff < 0) return { value: `${diff}`, icon: 'down', className: styles.deltaNegative };
    return { value: '=', icon: 'neutral', className: styles.deltaNeutral };
  };

  const renderDeltaIcon = (icon: string) => {
    if (icon === 'up') return <TrendingUp size={12} />;
    if (icon === 'down') return <TrendingDown size={12} />;
    return <Minus size={12} />;
  };

  return (
    <div className={styles.welcomeContainer}>
      {/* Header Banner */}
      <div className={styles.welcomeHeader}>
        <div className={styles.welcomeGreeting}>
          <h2>{getGreeting()}, {user.name.split(' ')[0]}! 👋</h2>
          <p className={styles.welcomeSubtitle}>
            {stats
              ? `Resumo operacional · ${stats.currentMonth.label}`
              : 'Visualize o andamento das suas atividades e gerencie seus fluxos de trabalho.'
            }
          </p>
        </div>
      </div>

      {/* KPIs Grid - Monthly Stats */}
      {stats ? (
        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.statCardPurple}`}>
            <div className={`${styles.statIcon} ${styles.statIconPurple}`}>📋</div>
            <div className={styles.statContent}>
              <span className={styles.statVal}>{stats.currentMonth.boardsCreated}</span>
              <span className={styles.statLabel}>Atividades Criadas</span>
              <div className={`${styles.statDelta} ${getDelta(stats.currentMonth.boardsCreated, stats.previousMonth.boardsCreated).className}`}>
                {renderDeltaIcon(getDelta(stats.currentMonth.boardsCreated, stats.previousMonth.boardsCreated).icon)}
                <span>{getDelta(stats.currentMonth.boardsCreated, stats.previousMonth.boardsCreated).value} vs {stats.previousMonth.label}</span>
              </div>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.statCardGreen}`}>
            <div className={`${styles.statIcon} ${styles.statIconGreen}`}><CircleCheckBig size={20} color="#10b981" strokeWidth={2.5} /></div>
            <div className={styles.statContent}>
              <span className={styles.statVal}>{stats.currentMonth.boardsCompleted}</span>
              <span className={styles.statLabel}>Atividades Concluídas</span>
              <div className={`${styles.statDelta} ${getDelta(stats.currentMonth.boardsCompleted, stats.previousMonth.boardsCompleted).className}`}>
                {renderDeltaIcon(getDelta(stats.currentMonth.boardsCompleted, stats.previousMonth.boardsCompleted).icon)}
                <span>{getDelta(stats.currentMonth.boardsCompleted, stats.previousMonth.boardsCompleted).value} vs {stats.previousMonth.label}</span>
              </div>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.statCardBlue}`}>
            <div className={`${styles.statIcon} ${styles.statIconBlue}`}>⚡</div>
            <div className={styles.statContent}>
              <span className={styles.statVal}>{stats.currentMonth.cardsCompleted}</span>
              <span className={styles.statLabel}>Eventos Concluídos</span>
              <div className={`${styles.statDelta} ${getDelta(stats.currentMonth.cardsCompleted, stats.previousMonth.cardsCompleted).className}`}>
                {renderDeltaIcon(getDelta(stats.currentMonth.cardsCompleted, stats.previousMonth.cardsCompleted).icon)}
                <span>{getDelta(stats.currentMonth.cardsCompleted, stats.previousMonth.cardsCompleted).value} vs {stats.previousMonth.label}</span>
              </div>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.statCardAmber}`}>
            <div className={`${styles.statIcon} ${styles.statIconAmber}`}>⏱️</div>
            <div className={styles.statContent}>
              <span className={styles.statVal}>
                {stats.operational.avgCompletionDays !== null ? `${stats.operational.avgCompletionDays}d` : '—'}
              </span>
              <span className={styles.statLabel}>Tempo Médio de Conclusão</span>
              <div className={`${styles.statDelta} ${styles.deltaNeutral}`}>
                <Clock size={12} />
                <span>{stats.operational.inProgressCards} eventos em andamento</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Fallback: Legacy KPIs */
        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.statCardPurple}`}>
            <div className={`${styles.statIcon} ${styles.statIconPurple}`}>📂</div>
            <div className={styles.statContent}>
              <span className={styles.statVal}>{workspaces.length}</span>
              <span className={styles.statLabel}>Áreas de Trabalho</span>
            </div>
          </div>
          <div className={`${styles.statCard} ${styles.statCardBlue}`}>
            <div className={`${styles.statIcon} ${styles.statIconBlue}`}>⚡</div>
            <div className={styles.statContent}>
              <span className={styles.statVal}>{activeBoardsCount}</span>
              <span className={styles.statLabel}>Atividades em Execução</span>
            </div>
          </div>
          <div className={`${styles.statCard} ${styles.statCardGreen}`}>
            <div className={`${styles.statIcon} ${styles.statIconGreen}`}><CircleCheckBig size={20} color="#10b981" strokeWidth={2.5} /></div>
            <div className={styles.statContent}>
              <span className={styles.statVal}>{completedBoardsCount}</span>
              <span className={styles.statLabel}>Fluxos Concluídos</span>
            </div>
          </div>
          <div className={`${styles.statCard} ${styles.statCardAmber}`}>
            <div className={`${styles.statIcon} ${styles.statIconAmber}`}>📈</div>
            <div className={styles.statContent}>
              <span className={styles.statVal}>{allBoards.length > 0 ? Math.round((completedBoardsCount / allBoards.length) * 100) : 0}%</span>
              <span className={styles.statLabel}>Taxa de Conclusão</span>
            </div>
          </div>
        </div>
      )}

      {/* Attention Banner - Overdue Items */}
      {stats && totalOverdue > 0 && (
        <div className={styles.attentionBanner}>
          <div className={styles.attentionText}>
            <AlertTriangle size={18} />
            <span>
              <span className={styles.attentionCount}>{totalOverdue}</span>
              {' '}{totalOverdue === 1 ? 'item atrasado precisa' : 'itens atrasados precisam'} da sua atenção
            </span>
          </div>
          <span className={styles.attentionLink}>↓ Ver abaixo</span>
        </div>
      )}

      {/* Deadlines Grid: Upcoming + Overdue */}
      {stats && (stats.upcomingDeadlines.length > 0 || stats.overdueItems.length > 0) && (
        <div className={styles.deadlinesGrid}>
          {/* Upcoming Deadlines */}
          <div className={styles.deadlineCard}>
            <div className={styles.deadlineCardHeader}>
              <Calendar size={16} /> Prazos Próximos (7 dias)
            </div>
            {stats.upcomingDeadlines.length === 0 ? (
              <div className={styles.emptyDeadlines}>Nenhum prazo nos próximos 7 dias ✅</div>
            ) : (
              <div className={styles.deadlineList}>
                {stats.upcomingDeadlines.map(item => (
                  <div key={`${item.type}-${item.id}`} className={styles.deadlineItem}>
                    <div className={styles.deadlineItemLeft}>
                      <div className={styles.deadlineItemTitle}>
                        {item.title}
                        <span className={styles.typeBadge}>{item.type === 'board' ? 'Atividade' : 'Evento'}</span>
                      </div>
                      <div className={styles.deadlineItemMeta}>
                        {item.workspaceName}{item.boardName ? ` · ${item.boardName}` : ''}
                      </div>
                    </div>
                    <span className={`${styles.daysBadge} ${styles.daysBadgeUpcoming}`}>
                      {item.previsto}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Overdue Items */}
          <div className={styles.deadlineCard}>
            <div className={styles.deadlineCardHeader}>
              <AlertTriangle size={16} color="#f87171" /> Itens Atrasados
            </div>
            {stats.overdueItems.length === 0 ? (
              <div className={styles.emptyDeadlines}>Nenhum item atrasado 🎉</div>
            ) : (
              <div className={styles.deadlineList}>
                {stats.overdueItems.map(item => (
                  <div key={`${item.type}-${item.id}`} className={styles.deadlineItem}>
                    <div className={styles.deadlineItemLeft}>
                      <div className={styles.deadlineItemTitle}>
                        {item.title}
                        <span className={styles.typeBadge}>{item.type === 'board' ? 'Atividade' : 'Evento'}</span>
                      </div>
                      <div className={styles.deadlineItemMeta}>
                        {item.workspaceName}{item.boardName ? ` · ${item.boardName}` : ''}
                      </div>
                    </div>
                    <span className={`${styles.daysBadge} ${item.daysOverdue >= 5 ? styles.daysBadgeOverdue : styles.daysBadgeWarning}`}>
                      {item.daysOverdue} {item.daysOverdue === 1 ? 'dia' : 'dias'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Charts and Activity Feed */}
      <div className={styles.dashboardVisuals}>
        {/* Left Column: Workspaces Progress Bar Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h4 className={styles.chartTitle}>📊 Atividades por Área de Trabalho</h4>
            <button
              className={styles.premiumPanelBtn}
              onClick={onOpenPremiumGrid}
              title="Visualização Premium"
            >
              🧩 Painel
            </button>
          </div>
          {workspaces.length === 0 ? (
            <div className={styles.emptyStateChart}>
              Nenhuma área de trabalho cadastrada ainda.
            </div>
          ) : (
            <div className={styles.barChartContainer}>
              {workspaces.map(ws => {
                const wsBoards = ws.boards || [];
                const wsActive = wsBoards.filter((b: any) => !b.dtcon).length;
                const wsCompleted = wsBoards.filter((b: any) => !!b.dtcon).length;
                const total = wsBoards.length;
                const pct = total > 0 ? Math.round((wsCompleted / total) * 100) : 0;

                return (
                  <div key={ws.id} className={styles.barChartItem}>
                    <div className={styles.barMeta}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className={styles.barName}>{ws.name}</span>
                        <Link
                          href={`/dashboard?workspaceId=${ws.id}&view=kanban`}
                          className={styles.miniKanbanLink}
                        >
                          📊
                        </Link>
                      </div>
                      <span className={styles.barValText}>
                        {wsActive} ativas • {wsCompleted} concluídas ({pct}%)
                      </span>
                    </div>
                    <div className={styles.progressBarTrack}>
                      <div
                        className={styles.progressBarFill}
                        style={{ width: `${total > 0 ? (wsActive / total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Live Audit Feed */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h4 className={styles.chartTitle}>🔔 Feed de Atividades Recentes</h4>
          </div>
          {recentLogs.length === 0 ? (
            <div className={styles.emptyStateChart}>
              Nenhuma atividade recente registrada.
            </div>
          ) : (
            <div className={styles.feedContainer}>
              {recentLogs.map((log: any) => {
                let dotClass = styles.feedDot;
                if (log.action.includes('CREATED')) dotClass = `${styles.feedDot} ${styles.feedDotBlue}`;
                if (log.action.includes('COMPLETED') || log.action.includes('CONCLUIR') || log.action.includes('BOARD_COMPLETED')) dotClass = `${styles.feedDot} ${styles.feedDotGreen}`;
                if (log.action.includes('RENAMED')) dotClass = `${styles.feedDot} ${styles.feedDotAmber}`;

                const timeStr = log.createdAt ? new Date(log.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
                const dateStr = log.createdAt ? new Date(log.createdAt).toLocaleDateString('pt-BR') : '';

                return (
                  <div key={log.seqid} className={styles.feedItem}>
                    <div className={dotClass} />
                    <div className={styles.feedContent}>
                      <div className={styles.feedText}>
                        <strong>{log.user?.name || 'Sistema'}</strong> {log.description}
                      </div>
                      <div className={styles.feedTime}>
                        {dateStr} às {timeStr}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
