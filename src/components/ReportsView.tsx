'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import styles from './ReportsView.module.css';

interface ReportCard {
  id: string;
  title: string;
  description: string | null;
  dtatv: Date | string | null;
  dtcon: Date | string | null;
  createdAt: Date | string;
  duration: string;
  creatorName: string;
  assignedName: string;
  boardName: string;
  workspaceName: string;
}

interface ReportsViewProps {
  initialCards: any[];
  isGlobal?: boolean;
  workspaceName?: string;
  workspaceId?: string;
}

const getLocalDateString = (dateInput: any) => {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ReportsView({ initialCards, isGlobal, workspaceName, workspaceId }: ReportsViewProps) {
  const [filterUser, setFilterUser] = useState('');
  const [filterWorkspace, setFilterWorkspace] = useState('');
  const [filterWorkspaceSelect, setFilterWorkspaceSelect] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, completed
  const [filterDtconStart, setFilterDtconStart] = useState('');
  const [filterDtconEnd, setFilterDtconEnd] = useState('');
  const [showEvents, setShowEvents] = useState(false);

  const formatDate = (dateInput: any) => {
    if (!dateInput) return '—';
    const date = new Date(dateInput);
    return date.toLocaleDateString('pt-BR');
  };

  // Lista de Áreas de Trabalho para o select dropdown
  const workspacesList = useMemo(() => {
    const list = new Set<string>();
    initialCards.forEach(card => {
      if (card.workspaceName && card.workspaceName !== '—') {
        list.add(card.workspaceName);
      }
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [initialCards]);

  // Lista de Usuários (Criadores e Responsáveis) para o select dropdown
  const usersList = useMemo(() => {
    const list = new Set<string>();
    initialCards.forEach(card => {
      if (card.creatorName && card.creatorName !== '—' && card.creatorName !== 'Sistema') {
        list.add(card.creatorName);
      }
      if (card.assignedName && card.assignedName !== '—' && card.assignedName !== 'Não atribuído') {
        list.add(card.assignedName);
      }
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [initialCards]);

  // Agrupamento por Atividade (Quadro)
  const groupedCards = useMemo(() => {
    const filtered = initialCards.filter(card => {
      const matchesUser = !filterUser || 
        card.creatorName.toLowerCase().includes(filterUser.toLowerCase()) ||
        card.assignedName.toLowerCase().includes(filterUser.toLowerCase());
      
      const matchesWorkspace = !filterWorkspace ||
        card.workspaceName.toLowerCase().includes(filterWorkspace.toLowerCase()) ||
        card.boardName.toLowerCase().includes(filterWorkspace.toLowerCase());

      const matchesWorkspaceSelect = !filterWorkspaceSelect ||
        card.workspaceName === filterWorkspaceSelect;

      const isCompleted = !!card.dtcon;
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'completed' && isCompleted) ||
        (filterStatus === 'pending' && !isCompleted);

      const boardDtconStr = getLocalDateString(card.boardDtcon);
      const matchesDtconStart = !filterDtconStart || (boardDtconStr && boardDtconStr >= filterDtconStart);
      const matchesDtconEnd = !filterDtconEnd || (boardDtconStr && boardDtconStr <= filterDtconEnd);

      return matchesUser && matchesWorkspace && matchesWorkspaceSelect && matchesStatus && matchesDtconStart && matchesDtconEnd;
    });

    const groups: { [key: string]: { name: string, dtatv?: any, dtcon?: any, previsto?: any, boardOwnerName?: string, cards: any[] } } = {};
    filtered.forEach(card => {
      // Agrupamos pelo boardSeqId para bater 100% com o banco de dados
      const boardKey = card.boardSeqId || 'default';
      const boardLabel = `${card.boardSeqId} - ${card.boardName}`;
      const groupDisplayName = isGlobal ? `${boardLabel} / ${card.workspaceName}` : boardLabel;
      
      if (!groups[boardKey]) {
        groups[boardKey] = {
          name: groupDisplayName,
          dtatv: card.boardDtatv,
          dtcon: card.boardDtcon,
          previsto: card.boardPrevisto,
          boardOwnerName: card.boardOwnerName,
          cards: []
        };
      }
      groups[boardKey].cards.push(card);
    });
    return groups;
  }, [initialCards, filterUser, filterWorkspace, filterWorkspaceSelect, filterStatus, filterDtconStart, filterDtconEnd, isGlobal]);

  // Ordena as atividades por previsto crescente, jogando as sem previsto para o fim
  const sortedGroupedCards = useMemo(() => {
    return Object.entries(groupedCards).sort(([, groupA], [, groupB]) => {
      const timeA = groupA.previsto ? new Date(groupA.previsto).getTime() : Infinity;
      const timeB = groupB.previsto ? new Date(groupB.previsto).getTime() : Infinity;
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      const numA = parseInt(groupA.name.split(' - ')[0]) || 0;
      const numB = parseInt(groupB.name.split(' - ')[0]) || 0;
      return numA - numB;
    });
  }, [groupedCards]);

  // Statistics baseada no filtrado
  const stats = useMemo(() => {
    const allFiltered = Object.values(groupedCards).flatMap(g => g.cards);
    const totalEvents = allFiltered.length;
    const totalActivities = Object.keys(groupedCards).length;
    
    const completedCards = allFiltered.filter(c => c.dtcon && c.dtatv);
    const totalCompleted = allFiltered.filter(c => c.dtcon).length;
    const pending = totalEvents - totalCompleted;
    const completionRate = totalEvents > 0 ? Math.round((totalCompleted / totalEvents) * 100) : 0;
    
    // Total de Ações (Andamentos)
    const totalActions = allFiltered.reduce((acc, card) => acc + (card.card_act?.length || 0), 0);

    // Tempo Médio de Conclusão (Lead Time)
    let avgLeadTime = 0;
    if (completedCards.length > 0) {
      const totalDays = completedCards.reduce((acc, card) => {
        const start = new Date(card.dtatv);
        const end = new Date(card.dtcon);
        return acc + Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      }, 0);
      avgLeadTime = Math.round(totalDays / completedCards.length);
    }
    
    return { totalEvents, totalActivities, totalCompleted, pending, completionRate, totalActions, avgLeadTime };
  }, [groupedCards]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleWrapper}>
          <h1>{isGlobal ? 'Dashboard Geral de Atividades' : `Dashboard da Área de Trabalho: ${workspaceName || 'Área de Trabalho'}`}</h1>
          <p>{isGlobal ? 'Visão estratégica de todo o sistema' : 'Acompanhamento detalhado desta área de trabalho'}</p>
        </div>
        <div className={styles.actions}>
          <Link 
            href={workspaceId ? `/dashboard?workspaceId=${workspaceId}` : '/dashboard'} 
            className={styles.backBtn}
          >
            ← Voltar ao Início
          </Link>
          <button className={styles.printBtn} onClick={handlePrint}>
            🖨️ Gerar Relatório PDF
          </button>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Atividades</span>
            <span className={styles.statValue}>{stats.totalActivities}</span>
            <span className={styles.statSub}>Quadros</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Eventos</span>
            <span className={styles.statValue}>{stats.totalEvents}</span>
            <span className={styles.statSub}>Tarefas</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Ações</span>
            <span className={styles.statValue}>{stats.totalActions}</span>
            <span className={styles.statSub}>Logs</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Lead Time</span>
            <span className={styles.statValue}>{stats.avgLeadTime}d</span>
            <span className={styles.statSub}>Média</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Entrega</span>
            <span className={styles.statValue}>{stats.completionRate}%</span>
            <span className={styles.statSub}>{stats.totalCompleted} OK</span>
          </div>
        </div>
      </div>

      <section className={styles.filtersSection}>
        <div className={styles.filterGroup}>
          <label>Pesquisar Usuário</label>
          <select 
            className={styles.selectInput} 
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
          >
            <option value="">Todos os Usuários</option>
            {usersList.map(usr => (
              <option key={usr} value={usr}>{usr}</option>
            ))}
          </select>
        </div>
        {isGlobal && (
          <div className={styles.filterGroup}>
            <label>Área de Trabalho</label>
            <select 
              className={styles.selectInput}
              value={filterWorkspaceSelect}
              onChange={(e) => setFilterWorkspaceSelect(e.target.value)}
            >
              <option value="">Todas as Áreas</option>
              {workspacesList.map(ws => (
                <option key={ws} value={ws}>{ws}</option>
              ))}
            </select>
          </div>
        )}
        <div className={styles.filterGroup}>
          <label>Atividade (Quadro / Área)</label>
          <input 
            type="text" 
            className={styles.selectInput} 
            placeholder="Filtrar por nome..." 
            value={filterWorkspace}
            onChange={(e) => setFilterWorkspace(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <label>Status</label>
          <select 
            className={styles.selectInput}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Todos os Status</option>
            <option value="pending">Em Andamento</option>
            <option value="completed">Concluídos</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Conclusão (De)</label>
          <input 
            type="date" 
            max="9999-12-31"
            className={styles.dateInput} 
            value={filterDtconStart}
            onChange={(e) => setFilterDtconStart(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <label>Conclusão (Até)</label>
          <input 
            type="date" 
            max="9999-12-31"
            className={styles.dateInput} 
            value={filterDtconEnd}
            onChange={(e) => setFilterDtconEnd(e.target.value)}
          />
        </div>
        <div className={styles.checkboxGroup}>
          <label className={styles.checkboxLabel}>
            <input 
              type="checkbox" 
              checked={showEvents}
              onChange={(e) => setShowEvents(e.target.checked)}
            />
            <span>Mostrar Eventos</span>
          </label>
        </div>
      </section>

      <div className={styles.reportContent}>
        {sortedGroupedCards.length === 0 ? (
          <div className={styles.emptyState}>
            Nenhum registro encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className={styles.reportGrid}>
            <div className={styles.reportListHeader}>
              <div className={`${styles.listHeaderCol} ${styles.listHeaderTitle}`}>Atividade / Área de Trabalho</div>
              <div className={`${styles.listHeaderCol} ${styles.listHeaderOwner}`}>Responsável</div>
              <div className={`${styles.listHeaderCol} ${styles.listHeaderPrevisto}`}>Previsto</div>
              <div className={`${styles.listHeaderCol} ${styles.listHeaderDates}`}>Período (Início — Conclusão)</div>
              <div className={`${styles.listHeaderCol} ${styles.listHeaderCount}`}>Total Eventos</div>
            </div>

            {sortedGroupedCards.map(([boardKey, group]) => (
              <div key={boardKey} className={`${styles.activityGroup} ${showEvents ? styles.activityGroupActive : ''}`}>
                <div className={`${styles.groupHeader} ${showEvents ? styles.groupHeaderActive : ''}`}>
                  <div className={styles.groupTitleCol}>
                    {group.name}
                  </div>
                  <div className={styles.groupOwnerCol}>
                    {group.boardOwnerName || '—'}
                  </div>
                  <div className={styles.groupPrevistoCol}>
                    {group.previsto ? formatDate(group.previsto) : 'Sem data'}
                  </div>
                  <div className={styles.groupDatesCol}>
                    {group.dtatv || group.dtcon ? `${formatDate(group.dtatv)} — ${formatDate(group.dtcon)}` : '—'}
                  </div>
                  <div className={styles.groupCountCol}>
                    <span className={styles.groupCount}>{group.cards.length} {group.cards.length === 1 ? 'evento' : 'eventos'}</span>
                  </div>
                </div>

                {showEvents && (
                  <div className={styles.tableWrapper}>
                    <table className={styles.reportTable}>
                      <thead>
                        <tr>
                          <th>Evento</th>
                          <th>Criador</th>
                          <th>Atribuído</th>
                          <th>Previsto</th>
                          <th>Início</th>
                          <th>Fim</th>
                          <th>Duração</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...group.cards]
                          .sort((a: any, b: any) => {
                            const timeA = a.previsto ? new Date(a.previsto).getTime() : Infinity;
                            const timeB = b.previsto ? new Date(b.previsto).getTime() : Infinity;
                            if (timeA !== timeB) return timeA - timeB;
                            const seqA = parseInt(a.seqid) || 0;
                            const seqB = parseInt(b.seqid) || 0;
                            return seqA - seqB;
                          })
                          .map((card) => (
                            <React.Fragment key={card.seqid}>
                              <tr className={styles.mainRow}>
                                <td>
                                  <div className={styles.eventInfo}>
                                    <span className={styles.eventName}>{card.title}</span>
                                  </div>
                                </td>
                                <td>
                                  <div className={styles.userCell}>
                                    <span>{card.creatorName}</span>
                                  </div>
                                </td>
                                <td>
                                  <div className={styles.userCell}>
                                    <span>{card.assignedName}</span>
                                  </div>
                                </td>
                                <td className={styles.dateCell}>{card.previsto ? formatDate(card.previsto) : '—'}</td>
                                <td className={styles.dateCell}>{formatDate(card.dtatv || card.createdAt)}</td>
                                <td className={styles.dateCell}>{formatDate(card.dtcon)}</td>
                                <td>
                                  <span className={`${styles.durationText} ${!card.dtcon ? styles.durationPendingText : ''}`}>
                                    {card.duration}
                                  </span>
                                </td>
                              </tr>
                              
                              {card.card_act && card.card_act.length > 0 && (
                                <tr className={styles.subRow}>
                                  <td colSpan={7} className={styles.subCell}>
                                    <div className={styles.andamentosWrapper}>
                                      {card.card_act.map((act: any, idx: number) => (
                                        <div key={act.seqid || idx} className={styles.andamentoItem}>
                                          <div className={styles.andamentoContent}>
                                            <p className={styles.andamentoText}>{act.description}</p>
                                            <div className={styles.andamentoMeta}>
                                              <strong>{act.users?.name || 'Sistema'}</strong> • {new Date(act.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
