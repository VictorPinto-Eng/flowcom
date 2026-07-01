'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
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
    const { value: title } = await Swal.fire({
      title: 'Nova Lista',
      input: 'text',
      inputPlaceholder: 'Nome da lista...',
      showCancelButton: true,
      confirmButtonColor: '#7c3aed',
      cancelButtonColor: 'transparent',
      confirmButtonText: '✓ Criar',
      cancelButtonText: 'Cancelar',
      background: '#1e1e2e',
      color: '#fff',
      width: '360px',
      padding: '1.5rem',
      backdrop: 'rgba(0,0,0,0.6)',
      inputValidator: (value) => {
        if (!value || !value.trim()) return 'Digite um nome para a lista';
      }
    });
    if (!title || !title.trim()) return;

    try {
      await addColumnAction(workspace.seqid, title.trim());
      router.refresh();
    } catch (err) {
      console.error('Erro ao criar lista:', err);
      Swal.fire({
        title: 'Erro',
        html: '<p style="font-size: 0.9rem; color: #94a3b8; margin: 0;">Erro ao criar lista.</p>',
        confirmButtonColor: '#7c3aed',
        background: '#1e1e2e',
        color: '#fff',
        width: '320px',
        padding: '1.5rem',
        backdrop: 'rgba(0,0,0,0.6)'
      });
    }
  };

  const handleDeleteColumn = async (colId: string) => {
    const result = await Swal.fire({
      title: 'Excluir Lista',
      html: '<p style="font-size: 0.9rem; color: #94a3b8; margin: 0;">Tem certeza que deseja excluir esta lista?</p>',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: 'transparent',
      confirmButtonText: '✓ Excluir',
      cancelButtonText: 'Cancelar',
      background: '#1e1e2e',
      color: '#fff',
      width: '360px',
      padding: '1.5rem',
      backdrop: 'rgba(0,0,0,0.6)'
    });
    if (result.isConfirmed) {
      try {
        await deleteColumnAction(colId);
        router.refresh();
      } catch (err) {
        console.error('Erro ao excluir lista:', err);
        Swal.fire({
          title: 'Erro',
          html: '<p style="font-size: 0.9rem; color: #94a3b8; margin: 0;">Erro ao excluir lista.</p>',
          confirmButtonColor: '#7c3aed',
          background: '#1e1e2e',
          color: '#fff',
          width: '320px',
          padding: '1.5rem',
          backdrop: 'rgba(0,0,0,0.6)'
        });
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
