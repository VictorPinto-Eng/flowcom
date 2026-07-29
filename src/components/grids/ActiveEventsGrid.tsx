'use client';

import React, { useState } from 'react';
import { CircleCheckBig } from 'lucide-react';
import Swal from 'sweetalert2';
import { CardType, ColumnType } from '@/types/kanban';
import { updateCardPrevistoAction, getWorkspaceMembersAction, transferCardAction } from '@/app/actions/cardActions';
import ActionsDrawer from './ActionsDrawer';
import styles from '../kanban/Board.module.css';

interface ActiveEvent extends CardType {
  columnName: string;
  columnId: string;
  seqid?: string;
  card_act?: any[];
}

interface ActiveEventsGridProps {
  events: ActiveEvent[];
  columns: ColumnType[];
  userId: string;
  userSeqid: string;
  currentUserRole: string;
  workspaceId: string;
  doneCol: ColumnType | undefined;
  onMoveCard: (cardId: string, sourceColId: string, targetColId: string) => void;
  onCompleteCard?: (cardId: string, sourceColId: string, targetColId: string) => void;
  onEditEvent: (event: any) => void;
  onRespondTransfer: (cardId: string, actionSeqid: string, accept: boolean) => Promise<void> | void;
  onAdminTransferRequest: (event: any) => void;
}

export default function ActiveEventsGrid({
  events,
  columns,
  userId,
  userSeqid,
  currentUserRole,
  workspaceId,
  doneCol,
  onMoveCard,
  onCompleteCard,
  onEditEvent,
  onRespondTransfer,
  onAdminTransferRequest
}: ActiveEventsGridProps) {
  const [activeActionModal, setActiveActionModal] = useState<any | null>(null);
  const [transferModalData, setTransferModalData] = useState<{ cardId: string; cardTitle: string; currentTaskUserSeqid?: string | null } | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [selectedTransferUserSeqid, setSelectedTransferUserSeqid] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);

  const getCardAgeText = (card: any) => {
    const startDate = card.dtatv ? new Date(card.dtatv) : (card.createdAt ? new Date(card.createdAt) : null);
    if (!startDate) return '—';

    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = card.dtcon
      ? new Date(new Date(card.dtcon).getFullYear(), new Date(card.dtcon).getMonth(), new Date(card.dtcon).getDate())
      : new Date();

    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const days = diffDays >= 0 ? diffDays : 0;

    return `${days} dias`;
  };

  const handlePrevistoChange = async (cardId: string, val: string) => {
    await updateCardPrevistoAction(cardId, val ? val : null);
  };

  const handleOpenTransferModal = async (event: any) => {
    try {
      const users = await getWorkspaceMembersAction(workspaceId);
      setUsersList(users);
      setSelectedTransferUserSeqid(event.taskuser_seqid ? event.taskuser_seqid.toString() : '');
      setTransferModalData({
        cardId: event.id,
        cardTitle: event.title,
        currentTaskUserSeqid: event.taskuser_seqid
      });
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferModalData) return;

    setIsTransferring(true);
    try {
      const taskUserSeqidVal = selectedTransferUserSeqid ? selectedTransferUserSeqid : null;
      await transferCardAction(transferModalData.cardId, taskUserSeqidVal as any);
      setTransferModalData(null);
    } catch (err) {
      console.error('Erro ao transferir atividade:', err);
    } finally {
      setIsTransferring(false);
    }
  };

  // Sort by Previsto ascending
  const sortedEvents = [...events].sort((a, b) => {
    if (a.previsto && b.previsto) {
      return new Date(a.previsto).getTime() - new Date(b.previsto).getTime();
    }
    if (a.previsto) return -1;
    if (b.previsto) return 1;
    return 0;
  });

  if (sortedEvents.length === 0) {
    return (
      <div className={styles.gridSection}>
        <div className={styles.emptyGridState}>
          <p>Nenhum evento pendente nesta atividade.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.gridSection}>
      <div className={styles.gridWrapper}>
        <table className={styles.dataGridTable}>
          <thead>
            <tr>
              <th>Nome do Evento</th>
              <th>Atribuído</th>
              <th>Data Programada <br /><span style={{ fontSize: '0.8em', fontWeight: 'normal', color: '#64748b' }}>(Status)</span></th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {sortedEvents.map(event => {
              let statusType = 'normal';
              if (event.previsto) {
                const dateStr = new Date(event.previsto).toISOString().split('T')[0];
                const [year, month, day] = dateStr.split('-').map(Number);
                const expectedDate = new Date(year, month - 1, day);
                expectedDate.setHours(0, 0, 0, 0);

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (event.dtcon) {
                  statusType = 'success';
                } else if (expectedDate < today) {
                  statusType = 'danger';
                } else if (expectedDate.getTime() === today.getTime()) {
                  statusType = 'warning';
                }
              }

              const dateInputVal = event.previsto
                ? new Date(event.previsto).toISOString().split('T')[0]
                : '';

              const assignedUserName = event.task_user?.name || 'Não atribuído';
              const isOwner = event.user_seqid && event.user_seqid.toString() === userSeqid;
              const isResponsible = event.taskuser_seqid && event.taskuser_seqid.toString() === userSeqid;
              const isUnassigned = !event.taskuser_seqid;

              const canEditFully = isOwner && (isResponsible || isUnassigned);
              const canEditActionsOnly = !isOwner && isResponsible;
              const isVisualizingOnly = !canEditFully && !canEditActionsOnly;

              return (
                <tr key={event.id}>
                  <td>
                    <div className={styles.gridEventTitle}>{event.title}</div>
                    <button
                      className={styles.actionsPillBtn}
                      onClick={() => setActiveActionModal(event as any)}
                    >
                      💬 Andamentos ({event.card_act ? event.card_act.length : 0})
                    </button>
                  </td>
                  <td>
                    <div className={styles.assignedUserWrapper}>
                      <span className={styles.userAvatarIcon}>👤</span>
                      <span className={styles.assignedUserNameText}>{assignedUserName}</span>
                      {isVisualizingOnly && (
                        <span className={styles.readonlyPill} title="Apenas visualização. Você não é o responsável atribuído.">👁️ Visualização</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className={styles.deadlineWrapper}>
                      <div className={styles.dateInputContainer}>
                        <span className={styles.calendarIcon}>
                          {statusType === 'danger' ? '⚠️' : '📅'}
                        </span>
                        <input
                          type="date"
                          max="9999-12-31"
                          className={`${styles.gridDateInput} ${styles[statusType] || ''}`}
                          value={dateInputVal}
                          onChange={(e) => handlePrevistoChange(event.id, e.target.value)}
                          onClick={(e) => (e.target as any).showPicker?.()}
                          disabled={!canEditFully}
                          title={!canEditFully ? "Apenas o proprietário e responsável pode alterar a data programada." : undefined}
                        />
                      </div>
                      <div className={`${styles.gridEventAgeText} ${styles[statusType] || ''}`}>
                        {statusType === 'danger' ? '🔴' : statusType === 'warning' ? '🟡' : '⏱️'} {getCardAgeText(event)}
                      </div>
                    </div>
                  </td>
                  <td className={styles.actionsCell}>
                    {canEditFully && (
                      <>
                        <button
                          className={styles.editEventBtn}
                          onClick={() => onEditEvent(event)}
                          title="Editar dados do evento"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          className={styles.transferEventBtn}
                          onClick={() => handleOpenTransferModal(event)}
                          title="Transferir responsabilidade deste evento"
                        >
                          🔄 Transferir
                        </button>
                        {doneCol && (
                          <button
                            className={styles.completeEventBtn}
                            onClick={async () => {
                              const result = await Swal.fire({
                                title: 'Concluir Evento?',
                                text: `Deseja marcar "${event.title}" como concluído?`,
                                icon: 'question',
                                showCancelButton: true,
                                confirmButtonColor: '#10b981',
                                cancelButtonColor: '#6b7280',
                                confirmButtonText: 'Sim, concluir!',
                                cancelButtonText: 'Não',
                                background: '#1a1a1a',
                                color: '#fff'
                              });
                              if (result.isConfirmed) {
                                if (onCompleteCard) {
                                  onCompleteCard(event.id, event.columnId, doneCol.id);
                                } else {
                                  onMoveCard(event.id, event.columnId, doneCol.id);
                                }
                              }
                            }}
                            title="Mover para Concluído"
                          >
                            <CircleCheckBig size={15} color="#10b981" strokeWidth={2.5} /> Concluir
                          </button>
                        )}
                      </>
                    )}
                    {canEditActionsOnly && (
                      <button
                        className={styles.transferEventBtn}
                        onClick={() => handleOpenTransferModal(event)}
                        title="Transferir responsabilidade deste evento"
                      >
                        🔄 Transferir
                      </button>
                    )}
                    {isVisualizingOnly && (currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && (
                      <button
                        className={styles.transferEventBtn}
                        onClick={() => onAdminTransferRequest(event)}
                        title="Solicitar transferência de responsabilidade deste evento"
                      >
                        🔄 Solicitar Transferência
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeActionModal && (
        <ActionsDrawer
          event={activeActionModal}
          userSeqid={userSeqid}
          currentUserRole={currentUserRole}
          onClose={() => setActiveActionModal(null)}
          onUpdate={(updatedEvent) => setActiveActionModal(updatedEvent)}
          onRespondTransfer={onRespondTransfer}
        />
      )}

      {/* Modal de Transferência */}
      {transferModalData && (
        <div className={styles.modalOverlay} onClick={() => setTransferModalData(null)}>
          <div className={styles.transferModalContainer} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <h3 className={styles.drawerTitle}>Transferir Evento</h3>
                <p className={styles.drawerSubtitle}>{transferModalData.cardTitle}</p>
              </div>
              <button className={styles.drawerCloseBtn} onClick={() => setTransferModalData(null)}>✕</button>
            </div>

            <form onSubmit={handleTransferSubmit} className={styles.transferForm}>
              <div className={styles.formGroup}>
                <label>Selecione o Novo Responsável *</label>
                <select
                  className={styles.transferSelect}
                  value={selectedTransferUserSeqid}
                  onChange={e => setSelectedTransferUserSeqid(e.target.value)}
                  required
                >
                  <option value="">Selecione um usuário...</option>
                  {usersList.map(u => (
                    <option key={u.id} value={u.seqid ? u.seqid.toString() : ''}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.transferFormActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setTransferModalData(null)}>Cancelar</button>
                <button type="submit" className={styles.confirmTransferBtn} disabled={isTransferring}>
                  {isTransferring ? 'Transferindo...' : 'Confirmar Transferência'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
