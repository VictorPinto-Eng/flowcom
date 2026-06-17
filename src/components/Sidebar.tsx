'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Sidebar.module.css';

interface BoardShort {
  id: string;
  name: string;
  createdAt?: string | Date | null;
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  } | null;
  columns?: any[];
}

interface WorkspaceShort {
  id: string;
  name: string;
  type: {
    name: string;
  };
  boards: BoardShort[];
}

interface SidebarProps {
  workspaces: WorkspaceShort[];
  activeBoardId?: string;
  isCollapsed: boolean;
  onToggle: () => void;
  onCreateWorkspace: () => void;
  onCreateBoard: (workspaceId: string, name: string) => Promise<void>;
  onViewWorkspaceColumns?: (workspace: WorkspaceShort) => void;
  onEditWorkspace?: (workspace: WorkspaceShort) => void;
}

export default function Sidebar({
  workspaces,
  activeBoardId,
  isCollapsed,
  onToggle,
  onCreateWorkspace,
  onCreateBoard,
  onViewWorkspaceColumns,
  onEditWorkspace,
}: SidebarProps) {
  const router = useRouter();

  const handleCreateBoardClick = async (e: React.MouseEvent, workspaceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const name = prompt('Digite o nome do novo painel de atividades:');
    if (name && name.trim()) {
      await onCreateBoard(workspaceId, name.trim());
    }
  };

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''} glass`}>
      <div className={styles.headerSection}>
        <span className={styles.sectionTitle}>Áreas</span>
        <div className={styles.headerActions}>
          <button className={styles.addWorkspaceBtn} onClick={onCreateWorkspace} title="Criar Área de Trabalho">
            <span>+</span>
          </button>
          <button className={styles.collapseBtn} onClick={onToggle} title="Recolher Menu">
            <span>‹</span>
          </button>
        </div>
      </div>

      <nav className={styles.nav}>
        {workspaces.map((ws) => {
          const isWorkspaceActive = ws.boards.some(board => board.id === activeBoardId);
          return (
            <div key={ws.id} className={styles.workspaceItem}>
              <a 
                href={`/dashboard?workspaceId=${ws.id}`}
                className={`${styles.workspaceHeader} ${isWorkspaceActive ? styles.activeWorkspace : ''}`}
              >
                <span className={styles.workspaceIcon}>💼</span>
                <div className={styles.workspaceInfo}>
                  <span className={styles.workspaceName}>{ws.name}</span>
                  <span className={styles.workspaceType}>{ws.type.name}</span>
                </div>
                <button 
                  className={styles.editWorkspaceBtn} 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEditWorkspace?.(ws);
                  }}
                  title="Editar Área de Trabalho"
                >
                  ✏️
                </button>
                <button 
                  className={styles.addBoardBtn} 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onViewWorkspaceColumns?.(ws);
                  }}
                  title="Consultar listas criadas nesta área de trabalho"
                >
                  📋
                </button>
                <button 
                  className={styles.kanbanBtn} 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(`/dashboard?workspaceId=${ws.id}&view=kanban`);
                  }}
                  title="Visualizar Kanban Geral da Área"
                >
                  📊
                </button>
                {isWorkspaceActive && <div className={styles.activeGlow} />}
              </a>
            </div>
          );
        })}

        {workspaces.length === 0 && (
          <div className={styles.emptyState}>
            <p>Nenhuma Área de Trabalho ativa.</p>
            <button className={styles.createBtn} onClick={onCreateWorkspace}>
              Criar Primeira
            </button>
          </div>
        )}
      </nav>
    </aside>
  );
}
