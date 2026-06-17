'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './WorkspaceColumnsModal.module.css';
import { addColumnAction, deleteColumnAction, updateColumnOrderAction } from '@/app/actions/columnActions';

interface ColumnType {
  id: string;
  title: string;
  order: number;
  cards?: any[];
}

interface WorkspaceColumnsModalProps {
  workspace: {
    id: string;
    seqid: string;
    name: string;
    columns?: ColumnType[];
  };
  onClose: () => void;
}

export default function WorkspaceColumnsModal({ workspace, onClose }: WorkspaceColumnsModalProps) {
  const router = useRouter();
  const [localColumns, setLocalColumns] = useState<ColumnType[]>([]);
  const [draggedColId, setDraggedColId] = useState<string | null>(null);

  useEffect(() => {
    if (workspace.columns) {
      setLocalColumns(workspace.columns);
    }
  }, [workspace]);

  const handleAddColumn = async () => {
    const title = prompt('Digite o nome da nova lista:');
    if (!title || !title.trim()) return;

    try {
      await addColumnAction(workspace.seqid, title.trim());
      router.refresh();
    } catch (err) {
      console.error('Erro ao criar lista:', err);
      alert('Erro ao criar lista.');
    }
  };

  const handleDeleteColumn = async (colId: string) => {
    if (confirm('Tem certeza que deseja excluir esta lista?')) {
      try {
        await deleteColumnAction(colId);
        router.refresh();
      } catch (err) {
        console.error('Erro ao excluir lista:', err);
        alert('Erro ao excluir lista.');
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, colId: string) => {
    setDraggedColId(colId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    if (!draggedColId || draggedColId === targetColId) return;

    const cols = [...localColumns];
    const fromIndex = cols.findIndex(c => c.id === draggedColId);
    const toIndex = cols.findIndex(c => c.id === targetColId);

    if (fromIndex === -1 || toIndex === -1) return;

    const [movedCol] = cols.splice(fromIndex, 1);
    cols.splice(toIndex, 0, movedCol);

    const updatedCols = cols.map((col, index) => ({
      ...col,
      order: index
    }));

    setLocalColumns(updatedCols);

    try {
      await updateColumnOrderAction(updatedCols.map(c => ({ id: c.id, order: c.order })));
    } catch (err) {
      console.error("Erro ao reordenar:", err);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <div className={styles.headerIcon}>📋</div>
            <h2 className={styles.title}>
              Listas do Workspace <span className={styles.workspaceName}>({workspace.name})</span>
              <span className={styles.badge}>{localColumns.length} listas</span>
            </h2>
          </div>
          <button className={styles.closeButton} onClick={onClose} title="Fechar">✕</button>
        </header>

        <section className={styles.content}>
          <div className={styles.actionHeader}>
            <p className={styles.description}>
              Gerencie as colunas Kanban compartilhadas por todas as atividades deste Workspace. 
              Arraste para reordenar a exibição.
            </p>
            <button 
              className={styles.addColBtn}
              onClick={handleAddColumn}
            >
              + Nova Lista
            </button>
          </div>

          {localColumns.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📭</span>
              <p>Nenhuma lista cadastrada neste workspace ainda.</p>
            </div>
          ) : (
            <div className={styles.columnsGrid}>
              {localColumns.map(col => {
                const cardsCount = col.cards ? col.cards.length : 0;

                return (
                  <div 
                    key={col.id} 
                    className={styles.columnCard}
                    draggable
                    onDragStart={e => handleDragStart(e, col.id)}
                    onDragOver={handleDragOver}
                    onDrop={e => handleDrop(e, col.id)}
                    title="Arraste para reordenar a lista"
                  >
                    <div className={styles.columnTitle}>
                      <span>{col.title}</span>
                      <span className={styles.orderBadge}>Pos: {col.order}</span>
                    </div>
                    <div className={styles.columnFooter}>
                      <div className={styles.cardsCount}>
                        <span>📄</span> {cardsCount} {cardsCount === 1 ? 'evento' : 'eventos'} total
                      </div>
                      {cardsCount === 0 && (
                        <button 
                          className={styles.deleteColBtn}
                          onClick={() => handleDeleteColumn(col.id)}
                          title="Excluir lista vazia"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
