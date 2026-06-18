'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import styles from './PremiumWorkspaceGridModal.module.css';
import Swal from 'sweetalert2';

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
  sector?: {
    id: number;
    name: string;
    acronym: string;
  } | null;
}

interface WorkspaceWithDetails {
  id: string;
  seqid: string;
  name: string;
  description?: string | null;
  type: {
    name: string;
  };
  boards: BoardShort[];
  columns?: any[];
}

interface WorkspaceType {
  id: string;
  name: string;
}

interface PremiumWorkspaceGridModalProps {
  workspaces: WorkspaceWithDetails[];
  workspaceTypes: WorkspaceType[];
  onClose: () => void;
  onManageColumns: (workspace: any) => void;
  onEditWorkspace: (workspace: any) => void;
  onInviteMember?: (workspace: any) => void;
  onCreateWorkspace: () => void;
  onCreateBoard: (workspaceId: string, name: string) => Promise<void>;
  onViewActivities: (workspace: any) => void;
  onViewKanban: (workspace: any) => void;
  onAcceptInvite: (token: string) => void;
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

export default function PremiumWorkspaceGridModal({
  workspaces,
  workspaceTypes,
  onClose,
  onManageColumns,
  onEditWorkspace,
  onInviteMember,
  onCreateWorkspace,
  onCreateBoard,
  onViewActivities,
  onViewKanban,
  onAcceptInvite
}: PremiumWorkspaceGridModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');

  // Calcular estatísticas globais
  const globalStats = useMemo(() => {
    const totalWorkspaces = workspaces.length;
    const allBoards = workspaces.flatMap(w => w.boards || []);
    const totalBoards = allBoards.length;
    const activeBoards = allBoards.filter(b => !b.dtcon).length;
    const completedBoards = allBoards.filter(b => !!b.dtcon).length;
    const completionRate = totalBoards > 0 ? Math.round((completedBoards / totalBoards) * 100) : 0;

    return {
      totalWorkspaces,
      totalBoards,
      activeBoards,
      completedBoards,
      completionRate
    };
  }, [workspaces]);

  // Filtrar e Ordenar Áreas de Trabalho
  const processedWorkspaces = useMemo(() => {
    const filtered = workspaces.filter(ws =>
      ws.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ws.description && ws.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return filtered.sort((a, b) => {
      const aBoards = a.boards || [];
      const bBoards = b.boards || [];

      const aActive = aBoards.filter(board => !board.dtcon).length;
      const bActive = bBoards.filter(board => !board.dtcon).length;

      const aCompleted = aBoards.filter(board => board.dtcon).length;
      const bCompleted = bBoards.filter(board => board.dtcon).length;

      const aPct = aBoards.length > 0 ? (aCompleted / aBoards.length) : 0;
      const bPct = bBoards.length > 0 ? (bCompleted / bBoards.length) : 0;

      if (sortBy === 'name-asc') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'name-desc') {
        return b.name.localeCompare(a.name);
      } else if (sortBy === 'boards-desc') {
        return bBoards.length - aBoards.length;
      } else if (sortBy === 'active-desc') {
        return bActive - aActive;
      } else if (sortBy === 'pct-desc') {
        return bPct - aPct;
      }
      return 0;
    });
  }, [workspaces, searchTerm, sortBy]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.headerIcon}>🧩</span>
          <h2 className={styles.title}>
            Painel de Controle de <span className={styles.titleGradient}>Áreas de Trabalho</span>
            <span className={styles.badgeCount}>{workspaces.length} total</span>
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className={styles.addWorkspaceBtn}
            onClick={onCreateWorkspace}
            title="Criar Nova Área de Trabalho"
          >
            <span>+</span> Nova Área
          </button>
          <button className={styles.backBtn} onClick={onClose} title="Voltar ao início">
            ← Voltar
          </button>
        </div>
      </header>

      <div className={styles.scrollContent}>
        {/* Top KPI Cards */}
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div className={`${styles.kpiIcon} ${styles.iconPurple}`}>📂</div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiVal}>{globalStats.totalWorkspaces}</span>
              <span className={styles.kpiLabel}>Áreas de Trabalho</span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={`${styles.kpiIcon} ${styles.iconBlue}`}>⚡</div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiVal}>{globalStats.activeBoards}</span>
              <span className={styles.kpiLabel}>Atividades Ativas</span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={`${styles.kpiIcon} ${styles.iconGreen}`}>✅</div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiVal}>{globalStats.completedBoards}</span>
              <span className={styles.kpiLabel}>Fluxos Concluídos</span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={`${styles.kpiIcon} ${styles.iconAmber}`}>📈</div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiVal}>{globalStats.completionRate}%</span>
              <span className={styles.kpiLabel}>Taxa de Conclusão</span>
            </div>
          </div>
        </div>

        {/* Search and Sorting */}
        <div className={styles.controlBar}>
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Pesquise pelo nome ou descrição..."
              className={styles.searchInput}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className={styles.sortWrapper}>
            <span className={styles.sortLabel}>Ordenar por:</span>
            <select
              className={styles.sortSelect}
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="name-asc">Nome (A - Z)</option>
              <option value="name-desc">Nome (Z - A)</option>
              <option value="boards-desc">Total de Atividades</option>
              <option value="active-desc">Atividades Ativas</option>
              <option value="pct-desc">Taxa de Conclusão</option>
            </select>
          </div>
        </div>

        {/* Cards Grid */}
        <div className={styles.cardsGrid}>
          {processedWorkspaces.length === 0 ? (
            <div className={styles.emptyGrid}>
              <span className={styles.emptyGridIcon}>🔍</span>
              <p className={styles.emptyGridTitle}>Nenhuma área encontrada</p>
              <p className={styles.emptyGridText}>Nenhum resultado corresponde aos filtros atuais.</p>
            </div>
          ) : (
            processedWorkspaces.map(ws => {
              const total = ws.boards?.length || 0;
              const active = ws.boards?.filter(b => !b.dtcon).length || 0;
              const completed = ws.boards?.filter(b => !!b.dtcon).length || 0;
              const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

              // Capturar setores associados a quadros desta área de trabalho
              const sectorsSet = new Set<string>();
              ws.boards?.forEach(b => {
                if (b.sector?.acronym) {
                  sectorsSet.add(b.sector.acronym);
                }
              });
              const sectorsList = Array.from(sectorsSet);

              return (
                <div key={ws.id} className={styles.workspaceCard}>
                  <div className={styles.cardGlow} />

                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitleWrapper}>
                      <h3 className={styles.cardTitle}>{ws.name}</h3>
                      {(ws.description) && (
                        <div className={styles.descriptionTooltip}>
                          <span className={styles.infoIcon}>ℹ</span>
                          <div className={styles.tooltipPopup}>
                            {ws.description}
                          </div>
                        </div>
                      )}
                    </div>
                    <span className={styles.workspaceTypeBadge}>{ws.type.name}</span>
                  </div>

                  {/* Progress Fill */}
                  <div className={styles.progressSection}>
                    <div className={styles.progressLabelGroup}>
                      <span>Progresso Geral</span>
                      <span className={styles.progressPercent}>{progressPct}%</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressBarFill}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Card Stats */}
                  <div className={styles.cardStats}>
                    <div className={styles.statItem} title={`${active} atividades em execução`}>
                      ⚡ <strong>{active}</strong> Ativas
                    </div>
                    <div className={styles.statItem} title={`${completed} atividades concluídas`}>
                      ✅ <strong>{completed}</strong> Concluídas
                    </div>
                    <div className={styles.statItem} title={`${total} atividades criadas no total`}>
                      📦 <strong>{total}</strong> Total
                    </div>
                  </div>

                  {/* Sectors Involved */}
                  {sectorsList.length > 0 && (
                    <div className={styles.sectorsWrapper}>
                      <span className={styles.sectorsTitle}>Setores:</span>
                      {sectorsList.map(sec => (
                        <span
                          key={sec}
                          className={styles.sectorBadge}
                          style={getSectorColors(sec)}
                        >
                          {sec}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Card Actions */}
                  <div className={styles.cardActions}>
                    {((ws as any).currentUserRole === 'OWNER' || (ws as any).currentUserRole === 'ADMIN') && (
                      <button
                        className={`${styles.actionBtn} ${styles.actionBtnWarn}`}
                        onClick={() => onEditWorkspace(ws)}
                        title="Editar Área de Trabalho"
                      >
                        <span className={styles.actionBtnIcon}>✏️</span>
                        Editar
                      </button>
                    )}
                    <button
                      className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                      onClick={() => onViewActivities(ws)}
                      title="Ver todas as atividades desta área"
                    >
                      <span className={styles.actionBtnIcon}>📋</span>
                      Ver Atividades
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.actionBtnAccent}`}
                      onClick={() => onViewKanban(ws)}
                      title="Visualizar Quadro Kanban desta Área"
                    >
                      <span className={styles.actionBtnIcon}>📊</span>
                      Kanban
                    </button>
                    {((ws as any).currentUserRole === 'OWNER' || (ws as any).currentUserRole === 'ADMIN') && (
                      <>
                        <button
                          className={`${styles.actionBtn} ${styles.actionBtnInvite}`}
                          onClick={() => onInviteMember && onInviteMember(ws)}
                          title="Convidar Colaborador"
                        >
                          <span className={styles.actionBtnIcon}>✉️</span>
                          Convidar
                        </button>
                      </>
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
