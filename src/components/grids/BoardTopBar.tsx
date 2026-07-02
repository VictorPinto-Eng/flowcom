'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CircleCheckBig } from 'lucide-react';
import styles from '../kanban/Board.module.css';

interface BoardTopBarProps {
  boardName: string;
  boardDetalhes?: string | null;
  workspaceName?: string;
  workspaceId: string;
  boardId: string;
  viewMode: string;
  currentUserRole: string;
  boardDtcon?: string | Date | null;
  boardPrevisto?: string | Date | null;
  isAdding: boolean;
  onToggleAdding: () => void;
  onRenameBoard?: (boardId: string, name: string) => void;
  onEncerrar: () => void;
}

export default function BoardTopBar({
  boardName,
  boardDetalhes,
  workspaceName,
  workspaceId,
  boardId,
  viewMode,
  currentUserRole,
  boardDtcon,
  boardPrevisto,
  isAdding,
  onToggleAdding,
  onRenameBoard,
  onEncerrar
}: BoardTopBarProps) {
  const router = useRouter();

  return (
    <div className={styles.topBar}>
      <div className={styles.topBarLeft}>
        <div className={styles.contextInfo}>
          <span className={styles.contextWorkspace}>{workspaceName || 'Área de Trabalho'}</span>
          <div className={styles.contextBoardWrapper}>
            <span className={styles.contextBoard}>{boardName}</span>
            {viewMode !== 'completed' && !boardDtcon && onRenameBoard && (
              <button
                className={styles.editBoardBtn}
                onClick={() => onRenameBoard(boardId, boardName)}
                title="Editar dados da Atividade (Alterar prazo, responsável, setor...)"
              >
                ✏️
              </button>
            )}
          </div>
          {boardDtcon ? (
            <span className={styles.contextPrevisto} style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }} title="Atividade Concluída">
              <CircleCheckBig size={16} color="#10b981" strokeWidth={2.5} /> Concluído em: {new Date(boardDtcon).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
            </span>
          ) : boardPrevisto ? (
            <span className={styles.contextPrevisto} title="Data Prevista de Conclusão da Atividade">
              📅 Previsto: {new Date(boardPrevisto).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
            </span>
          ) : null}
          {boardDetalhes && (
            <span className={styles.contextDetails} title={boardDetalhes}>
              {boardDetalhes}
            </span>
          )}
        </div>
      </div>
      <div className={styles.topBarRight}>
        {viewMode !== 'completed' && !boardDtcon && (
          <button
            className={`${styles.actionBtn} ${isAdding ? styles.actionBtnCancel : styles.actionBtnPrimary}`}
            onClick={onToggleAdding}
          >
            {isAdding ? '✕ Cancelar' : '+ Evento'}
          </button>
        )}
        {viewMode !== 'completed' && !boardDtcon && (currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && (
          <button
            className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
            onClick={onEncerrar}
            title={currentUserRole === 'OWNER' ? 'Encerrar Atividade — todos os eventos pendentes serão concluídos' : 'Solicitar Encerramento ao proprietário'}
          >
            🔒 {currentUserRole === 'OWNER' ? 'Encerrar' : 'Solicitar Encerramento'}
          </button>
        )}
        {viewMode === 'completed' ? (
          <button
            className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              const from = params.get('from');
              router.push(`/dashboard?boardId=${boardId}&from=${from || 'workspace'}`);
            }}
            title="Ver eventos em andamento"
          >
            ⚡ Em Andamento
          </button>
        ) : (
          <button
            className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              const from = params.get('from');
              router.push(`/dashboard?boardId=${boardId}&view=completed&from=${from || 'workspace'}`);
            }}
            title="Ver eventos concluídos"
          >
            ✅ Concluídos
          </button>
        )}
        <button
          onClick={() => {
            const params = new URLSearchParams(window.location.search);
            const from = params.get('from');
            if (viewMode === 'completed') {
              // Na view de concluídos, voltar para a view ativa do board
              router.push(`/dashboard?boardId=${boardId}&from=${from || 'workspace'}`);
            } else if (from === 'my-activities') {
              router.push('/dashboard?view=my-activities');
            } else if (from === 'workspace') {
              router.push(`/dashboard?workspaceId=${workspaceId}`);
            } else {
              if (typeof window !== 'undefined' && (window as any).__hasInternalNavigation) {
                router.back();
              } else if (workspaceId) {
                router.push(`/dashboard?workspaceId=${workspaceId}`);
              } else {
                router.push('/dashboard');
              }
            }
          }}
          className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
          title="Voltar para a tela anterior"
        >
          ← Voltar
        </button>
      </div>
    </div>
  );
}
