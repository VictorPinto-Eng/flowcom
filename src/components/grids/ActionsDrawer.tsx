'use client';

import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { addCardActionLogAction, updateCardActionLogAction, deleteCardActionLogAction } from '@/app/actions/cardActions';
import styles from '../kanban/Board.module.css';

interface ActionsDrawerProps {
  event: any;
  userSeqid: string;
  currentUserRole: string;
  onClose: () => void;
  onUpdate: (updatedEvent: any) => void;
  onRespondTransfer?: (cardId: string, actionSeqid: string, accept: boolean) => Promise<void> | void;
}

export default function ActionsDrawer({
  event,
  userSeqid,
  currentUserRole,
  onClose,
  onUpdate,
  onRespondTransfer
}: ActionsDrawerProps) {
  const [newActionText, setNewActionText] = useState('');
  const [editingActionSeqid, setEditingActionSeqid] = useState<string | null>(null);
  const [editingActionText, setEditingActionText] = useState('');
  const [respondingTransferSeqid, setRespondingTransferSeqid] = useState<string | null>(null);

  const isEventAssignedToMe = !!(userSeqid && event.taskuser_seqid && event.taskuser_seqid.toString() === userSeqid);

  const handleAddAction = async () => {
    if (!newActionText.trim() || !event.seqid) return;

    try {
      const savedAction = await addCardActionLogAction(event.seqid, newActionText.trim());
      setNewActionText('');
      onUpdate({
        ...event,
        card_act: [savedAction, ...(event.card_act || [])]
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditActionSubmit = async (actionSeqid: string) => {
    if (!editingActionText.trim()) return;

    try {
      const updatedAction = await updateCardActionLogAction(actionSeqid, editingActionText.trim());
      setEditingActionSeqid(null);
      setEditingActionText('');
      onUpdate({
        ...event,
        card_act: event.card_act.map((a: any) => a.seqid === actionSeqid ? { ...a, description: updatedAction.description } : a)
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRespondTransfer = async (actionSeqid: string, accept: boolean) => {
    if (!onRespondTransfer) return;

    const cardId = event.seqid ? event.seqid.toString() : event.id;
    setRespondingTransferSeqid(actionSeqid);
    try {
      await onRespondTransfer(cardId, actionSeqid, accept);
      onClose();
    } catch (err) {
      console.error('Erro ao responder transferência:', err);
      setRespondingTransferSeqid(null);
    }
  };

  const handleDeleteAction = async (actionSeqid: string) => {
    const result = await Swal.fire({
      title: 'Excluir andamento?',
      text: 'Esta ação não poderá ser desfeita.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar',
      background: '#1a1a1a',
      color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        await deleteCardActionLogAction(actionSeqid);
        onUpdate({
          ...event,
          card_act: event.card_act.filter((a: any) => a.seqid !== actionSeqid)
        });
        Swal.fire({
          title: 'Excluído!',
          text: 'O andamento foi removido.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: '#1a1a1a',
          color: '#fff'
        });
      } catch (err) {
        console.error(err);
        Swal.fire({
          title: 'Erro!',
          text: 'Não foi possível excluir o andamento.',
          icon: 'error',
          confirmButtonColor: '#ef4444'
        });
      }
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.drawerContainer} onClick={e => e.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <div>
            <h3 className={styles.drawerTitle}>Andamentos do Evento</h3>
            <p className={styles.drawerSubtitle}>{event.title}</p>
          </div>
          <button className={styles.drawerCloseBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.drawerContent}>
          {isEventAssignedToMe ? (
            <div className={styles.drawerInputBox}>
              <label className={styles.drawerInputLabel}>Novo Andamento / Ação Realizada</label>
              <div className={styles.drawerInputWrapper}>
                <textarea
                  autoFocus
                  rows={2}
                  className={styles.drawerActionInput}
                  placeholder="Descreva o que foi feito..."
                  value={newActionText}
                  onChange={e => setNewActionText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddAction();
                    }
                  }}
                />
                <button
                  className={styles.drawerSubmitBtn}
                  onClick={handleAddAction}
                >
                  Registrar
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              padding: '0.75rem 1rem',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              color: '#64748b',
              fontSize: '0.85rem',
              textAlign: 'center',
              marginBottom: '1.5rem',
              fontStyle: 'italic'
            }}>
              Apenas visualização. Você não é o responsável por este evento.
            </div>
          )}

          <div className={styles.drawerListHeader}>
            <h4>Histórico de Ações ({event.card_act ? event.card_act.length : 0})</h4>
          </div>

          <div className={styles.drawerActionsList}>
            {!event.card_act || event.card_act.length === 0 ? (
              <p className={styles.drawerEmptyText}>Nenhum andamento registrado para este evento ainda.</p>
            ) : (
              event.card_act.map((act: any) => {
                const isTransferPendente = act.description?.startsWith(`[SOLICITACAO_PENDENTE:${userSeqid}:`);
                return (
                  <div key={Number(act.seqid)} className={styles.drawerActionCard}>
                    {editingActionSeqid === act.seqid ? (
                      <div className={styles.editActionRow}>
                        <textarea
                          autoFocus
                          rows={2}
                          className={styles.drawerActionInput}
                          value={editingActionText}
                          onChange={e => setEditingActionText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleEditActionSubmit(act.seqid);
                            } else if (e.key === 'Escape') {
                              setEditingActionSeqid(null);
                            }
                          }}
                        />
                        <div className={styles.editActionBtns}>
                          <button className={styles.saveActionBtn} onClick={() => handleEditActionSubmit(act.seqid)}>✓</button>
                          <button className={styles.cancelActionBtn} onClick={() => setEditingActionSeqid(null)}>✕</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className={styles.actionCardTop}>
                          <p className={styles.drawerActionText}>
                            {act.description?.startsWith('[SOLICITACAO_PENDENTE:') ? (
                              act.description.replace(/^\[SOLICITACAO_[A-Z]+:[^\]]+\]\s*/, '')
                            ) : act.description?.startsWith('[SOLICITACAO_ACEITA:') ? (
                              act.description.replace(/^\[SOLICITACAO_[A-Z]+:[^\]]+\]\s*/, '') + ' (Aceita)'
                            ) : act.description?.startsWith('[SOLICITACAO_RECUSADA:') ? (
                              act.description.replace(/^\[SOLICITACAO_[A-Z]+:[^\]]+\]\s*/, '') + ' (Recusada)'
                            ) : (
                              act.description
                            )}
                          </p>
                          {isEventAssignedToMe && (
                            <div className={styles.actionQuickBtns}>
                              <button
                                title="Editar andamento"
                                onClick={() => {
                                  setEditingActionSeqid(act.seqid);
                                  setEditingActionText(act.description);
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                title="Excluir andamento"
                                onClick={() => handleDeleteAction(act.seqid)}
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                        </div>
                        {isTransferPendente && onRespondTransfer && (
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button
                              onClick={() => handleRespondTransfer(act.seqid.toString(), true)}
                              disabled={respondingTransferSeqid === act.seqid.toString()}
                              aria-busy={respondingTransferSeqid === act.seqid.toString()}
                              style={{
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.35rem 0.75rem',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: respondingTransferSeqid === act.seqid.toString() ? 'not-allowed' : 'pointer'
                              }}
                            >
                              {respondingTransferSeqid === act.seqid.toString() ? 'Aceitando...' : 'Aceitar'}
                            </button>
                            <button
                              onClick={() => handleRespondTransfer(act.seqid.toString(), false)}
                              disabled={respondingTransferSeqid === act.seqid.toString()}
                              aria-busy={respondingTransferSeqid === act.seqid.toString()}
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '6px',
                                padding: '0.35rem 0.75rem',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: respondingTransferSeqid === act.seqid.toString() ? 'not-allowed' : 'pointer'
                              }}
                            >
                              {respondingTransferSeqid === act.seqid.toString() ? 'Recusando...' : 'Recusar'}
                            </button>
                          </div>
                        )}
                        <span className={styles.drawerActionMeta}>
                          {act.users?.name || 'Sistema'} • {new Date(act.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
