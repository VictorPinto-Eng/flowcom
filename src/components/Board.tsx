'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { ColumnType, CardType } from '@/types/kanban';
import { addCardActionLogAction, updateCardActionLogAction, deleteCardActionLogAction, updateCardPrevistoAction, updateCardAction, getWorkspaceMembersAction, transferCardAction, requestTransferAction, respondTransferRequestAction } from '@/app/actions/cardActions';
import ActivityHistorySidebar from './ActivityHistorySidebar';
import EditEventModal from './EditEventModal';
import styles from './Board.module.css';

interface BoardProps {
  boardName: string;
  boardDetalhes?: string | null;
  columns: ColumnType[];
  onAddColumn: () => void;
  onAddCard: (columnId: string, title: string, description: string, dtatvStr?: string, previstoStr?: string) => void;
  onMoveCard: (cardId: string, sourceColId: string, targetColId: string) => void;
  onCompleteCard?: (cardId: string, sourceColId: string, targetColId: string) => void;
  onCopyColumn: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => void;
  workspaceName?: string;
  workspaceId: string;
  workspaceBoards?: any[];
  onCreateBoard: (workspaceId: string, name: string) => Promise<void>;
  boardId: string;
  userId: string;
  userSeqid?: string;
  currentUserRole?: string;
  onRenameBoard?: (boardId: string, name: string) => void;
  viewMode?: string;
  boardDtatv?: string | Date | null;
  boardCreatedAt?: string | Date;
  boardPrevisto?: string | Date | null;
}

export default function Board({
  boardName,
  boardDetalhes,
  columns,
  onAddCard,
  onMoveCard,
  onCompleteCard,
  workspaceName,
  workspaceId,
  workspaceBoards,
  boardId,
  userId,
  userSeqid = '',
  currentUserRole = '',
  onRenameBoard,
  viewMode = 'ongoing',
  boardDtatv,
  boardCreatedAt,
  boardPrevisto
}: BoardProps) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventDtatv, setNewEventDtatv] = useState(() => new Date().toISOString().split('T')[0]);
  const [newEventPrevisto, setNewEventPrevisto] = useState('');
  const getCardAgeText = (card: any) => {
    // Para ações concluídas, calculamos os dias decorridos desde o início da atividade (boardDtatv ou boardCreatedAt) até a conclusão real da ação!
    let startDate: Date | null = null;
    if (card.dtcon && (boardDtatv || boardCreatedAt)) {
      startDate = boardDtatv ? new Date(boardDtatv) : (boardCreatedAt ? new Date(boardCreatedAt) : null);
    } else {
      startDate = card.dtatv ? new Date(card.dtatv) : (card.createdAt ? new Date(card.createdAt) : null);
    }

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
  const [isAdding, setIsAdding] = useState(false);
  const [editingEvent, setEditingEvent] = useState<{ id: string; title: string; description: string; previsto?: any; dtcon?: any; dtatv?: any } | null>(null);
  const [newActionText, setNewActionText] = useState<{ [cardId: string]: string }>({});
  const [activeActionInput, setActiveActionInput] = useState<string | null>(null);
  const [activeActionModal, setActiveActionModal] = useState<any | null>(null);

  // Estados de Edição de Andamentos no Drawer
  const [editingActionSeqid, setEditingActionSeqid] = useState<string | null>(null);
  const [editingActionText, setEditingActionText] = useState('');

  // Estados de Transferência de Responsabilidade
  const [transferModalData, setTransferModalData] = useState<{ cardId: string; cardTitle: string; currentTaskUserSeqid?: string | null } | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [selectedTransferUserSeqid, setSelectedTransferUserSeqid] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);

  // Find columns
  const todoCol = columns.find(c => c.title.toLowerCase().includes('fazer')) || columns[0];
  const progressCol = columns.find(c => c.title.toLowerCase().includes('progresso')) || columns[1];
  const doneCol = columns.find(c =>
    c.title.toLowerCase().includes('concluído') ||
    c.title.toLowerCase().includes('concluido')
  ) || columns[2];

  // Gather events based on viewMode
  const displayEvents: (CardType & { columnName: string; columnId: string; seqid?: string; card_act?: any[] })[] = [];
  columns.forEach(col => {
    col.cards.forEach(card => {
      // MEMBER users only see their own cards
      if (currentUserRole !== 'OWNER' && currentUserRole !== 'ADMIN' && currentUserRole !== '') {
        const isCreator = card.user?.id === userId;
        const isAssigned = card.task_user?.id === userId;
        if (!isCreator && !isAssigned) return;
      }

      const isDoneCol = col.title.toLowerCase().includes('concluído') || col.title.toLowerCase().includes('concluido');
      if (viewMode === 'completed') {
        if (isDoneCol || card.dtcon) {
          displayEvents.push({
            ...card,
            columnName: col.title,
            columnId: col.id
          });
        }
      } else {
        if (!isDoneCol && !card.dtcon) {
          displayEvents.push({
            ...card,
            columnName: col.title,
            columnId: col.id
          });
        }
      }
    });
  });

  // Sort events based on viewMode
  const sortedEvents = [...displayEvents].sort((a, b) => {
    if (viewMode === 'completed') {
      // For completed view, show most recently finished first, then by created_at
      const dateA = a.dtcon ? new Date(a.dtcon).getTime() : 0;
      const dateB = b.dtcon ? new Date(b.dtcon).getTime() : 0;
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return createdB - createdA;
    }

    // For active view, sort by Previsto ascending
    if (a.previsto && b.previsto) {
      return new Date(a.previsto).getTime() - new Date(b.previsto).getTime();
    }
    if (a.previsto) return -1;
    if (b.previsto) return 1;
    return 0;
  });

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    if (todoCol) {
      onAddCard(todoCol.id, newEventTitle.trim(), newEventDesc.trim(), newEventDtatv, newEventPrevisto || undefined);
      setNewEventTitle('');
      setNewEventDesc('');
      setNewEventDtatv(new Date().toISOString().split('T')[0]);
      setNewEventPrevisto('');
      setIsAdding(false);
    }
  };

  const handlePrevistoChange = async (cardId: string, val: string) => {
    await updateCardPrevistoAction(cardId, val ? val : null);
  };

  const handlePhaseChange = (cardId: string, sourceColId: string, targetColId: string) => {
    onMoveCard(cardId, sourceColId, targetColId);
  };

  const handleAddAction = async (cardId: string, cardSeqid?: string) => {
    const text = newActionText[cardId];
    if (!text || !text.trim() || !cardSeqid) return;

    try {
      const savedAction = await addCardActionLogAction(cardSeqid, text.trim());
      setNewActionText(prev => ({ ...prev, [cardId]: '' }));
      setActiveActionInput(null);
      // Atualizar no modal caso esteja aberto (inserindo no topo pois é desc)
      if (activeActionModal && activeActionModal.id === cardId) {
        setActiveActionModal((prev: any) => ({
          ...prev,
          card_act: [savedAction, ...(prev.card_act || [])]
        }));
      }
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

      if (activeActionModal) {
        setActiveActionModal((prev: any) => ({
          ...prev,
          card_act: prev.card_act.map((a: any) => a.seqid === actionSeqid ? { ...a, description: updatedAction.description } : a)
        }));
      }
    } catch (err) {
      console.error(err);
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
        if (activeActionModal) {
          setActiveActionModal((prev: any) => ({
            ...prev,
            card_act: prev.card_act.filter((a: any) => a.seqid !== actionSeqid)
          }));
        }
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

  const handleAdminTransferRequest = async (event: any) => {
    try {
      const users = await getWorkspaceMembersAction(workspaceId);
      
      const inputOptions: { [key: string]: string } = {};
      users.forEach((m: any) => {
        if (m.seqid.toString() !== event.taskuser_seqid?.toString()) {
          inputOptions[m.seqid.toString()] = m.name;
        }
      });

      const { value: targetUserSeqid } = await Swal.fire({
        title: 'Solicitar Transferência de Atividade',
        input: 'select',
        inputOptions,
        inputPlaceholder: 'Selecione o novo responsável',
        showCancelButton: true,
        confirmButtonColor: '#7c3aed',
        confirmButtonText: 'Solicitar',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
          if (!value) return 'Você precisa selecionar um responsável!';
        }
      });

      if (targetUserSeqid) {
        await requestTransferAction(event.id || event.seqid?.toString() || '', targetUserSeqid);
        Swal.fire({
          title: 'Solicitado!',
          text: 'Solicitação de transferência registrada no histórico do evento.',
          icon: 'success',
          confirmButtonColor: '#7c3aed'
        });
        router.refresh();
        if (activeActionModal && activeActionModal.id === event.id) {
          setActiveActionModal(null);
        }
      }
    } catch (err: any) {
      console.error('Erro ao solicitar transferência:', err);
      Swal.fire('Erro', err.message || 'Erro ao solicitar transferência', 'error');
    }
  };

  const handleRespondTransfer = async (cardId: string, actionSeqid: string, accept: boolean) => {
    try {
      await respondTransferRequestAction(cardId, actionSeqid, accept);
      Swal.fire({
        title: 'Sucesso!',
        text: accept ? 'Transferência aceita com sucesso.' : 'Transferência recusada.',
        icon: 'success',
        confirmButtonColor: '#7c3aed'
      });
      router.refresh();
      if (activeActionModal && activeActionModal.seqid?.toString() === cardId.toString()) {
        setActiveActionModal(null);
      }
    } catch (err: any) {
      console.error('Erro ao responder transferência:', err);
      Swal.fire('Erro', err.message || 'Erro ao responder transferência', 'error');
    }
  };

  return (
    <div className={styles.container}>

      {/* ── Barra de Contexto ── */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <button
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              const from = params.get('from');
              if (from === 'my-activities') {
                router.push('/dashboard?view=my-activities');
              } else if (from === 'workspace') {
                router.push(`/dashboard?workspaceId=${workspaceId}`);
              } else {
                router.back();
              }
            }}
            className={styles.actionBtn}
            title="Voltar para a tela anterior"
          >
            ‹ Voltar
          </button>
          <div className={styles.contextInfo}>
            <span className={styles.contextWorkspace}>{workspaceName || 'Área de Trabalho'}</span>
            <div className={styles.contextBoardWrapper}>
              <span className={styles.contextBoard}>{boardName}</span>
              {viewMode !== 'completed' && onRenameBoard && (
                <button
                  className={styles.editBoardBtn}
                  onClick={() => onRenameBoard?.(boardId, boardName)}
                  title="Editar dados da Atividade (Alterar prazo, responsável, setor...)"
                >
                  ✏️
                </button>
              )}
            </div>
            {boardPrevisto && (
              <span className={styles.contextPrevisto} title="Data Prevista de Conclusão da Atividade">
                📅 Previsto: {new Date(boardPrevisto).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
              </span>
            )}
            {boardDetalhes && (
              <span className={styles.contextDetails} title={boardDetalhes}>
                {boardDetalhes}
              </span>
            )}
          </div>
        </div>
        <div className={styles.topBarRight}>
          {viewMode !== 'completed' && (
            <button
              className={`${styles.actionBtn} ${isAdding ? styles.actionBtnCancel : styles.actionBtnPrimary}`}
              onClick={() => setIsAdding(!isAdding)}
            >
              {isAdding ? '✕ Cancelar' : '+ Cadastrar Evento'}
            </button>
          )}
        </div>
      </div>

      {/* ── Formulário de Cadastro ── */}
      {isAdding && viewMode !== 'completed' && (
        <div className={styles.formCard}>
          <div className={styles.formCardHeader}>
            <div className={styles.formCardIcon}>+</div>
            <div>
              <h3 className={styles.formCardTitle}>Novo Evento</h3>
              <p className={styles.formCardSubtitle}>Preencha os dados do evento para registrá-lo na atividade</p>
            </div>
          </div>
          <form onSubmit={handleCreateEvent}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Nome do Evento *</label>
                <input
                  type="text"
                  placeholder="Ex: Reunião de alinhamento, Protocolo de documentos..."
                  value={newEventTitle}
                  onChange={e => setNewEventTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      (document.querySelector('textarea[name="eventDesc"]') as HTMLElement)?.focus();
                    }
                  }}
                  autoFocus
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Descrição / Observações</label>
                <textarea
                  name="eventDesc"
                  placeholder="Detalhes adicionais ou link do documento..."
                  value={newEventDesc}
                  onChange={e => setNewEventDesc(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      (document.querySelector('input[name="eventDtatv"]') as HTMLElement)?.focus();
                    }
                  }}
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Data do Evento</label>
                <input
                  type="date"
                  max="9999-12-31"
                  name="eventDtatv"
                  value={newEventDtatv}
                  onChange={e => setNewEventDtatv(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      (document.querySelector('input[name="eventPrevisto"]') as HTMLElement)?.focus();
                    }
                  }}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Data Programada de Conclusão</label>
                <input
                  type="date"
                  max="9999-12-31"
                  name="eventPrevisto"
                  value={newEventPrevisto}
                  onChange={e => setNewEventPrevisto(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      (document.querySelector('button[name="submitEvent"]') as HTMLElement)?.focus();
                    }
                  }}
                />
              </div>
            </div>
            <div className={styles.formActions}>
              <button name="submitEvent" type="submit" className={styles.submitEventBtn}>✓ Confirmar Cadastro</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Área de Grid ── */}
      {!isAdding && (
        <div className={styles.gridSection}>
          {sortedEvents.length === 0 ? (
            <div className={styles.emptyGridState}>
              <p>{viewMode === 'completed' ? 'Nenhum evento concluído nesta atividade.' : 'Nenhum evento pendente nesta atividade.'}</p>
            </div>
          ) : (
            <div className={styles.gridWrapper}>
              <table className={styles.dataGridTable}>
                <thead>
                  <tr>
                    {viewMode === 'completed' ? (
                      <>
                        <th>Nome do Evento</th>
                        <th>Dias de Trabalho</th>
                        <th>Data de Conclusão</th>
                        <th>Status</th>
                      </>
                    ) : (
                      <>
                        <th>Nome do Evento</th>
                        <th>Atribuído</th>
                        <th>Data Programada <br /><span style={{ fontSize: '0.8em', fontWeight: 'normal', color: '#64748b' }}>(Status)</span></th>
                        <th>Ações</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sortedEvents.map(event => {
                    let statusType = 'normal'; // 'danger', 'warning', 'success', 'normal'
                    if (event.previsto) {
                      const dateStr = new Date(event.previsto).toISOString().split('T')[0];
                      const [year, month, day] = dateStr.split('-').map(Number);
                      const expectedDate = new Date(year, month - 1, day);
                      expectedDate.setHours(0, 0, 0, 0);

                      const today = new Date();
                      today.setHours(0, 0, 0, 0);

                      if (event.dtcon || viewMode === 'completed') {
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

                    if (viewMode === 'completed') {
                      const dtconStr = event.dtcon ? new Date(event.dtcon).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Sem data';
                      return (
                        <tr key={event.id}>
                          <td>
                            <div className={styles.gridEventTitle}>{event.title}</div>
                          </td>
                          <td>
                            <div className={styles.gridEventDesc}>⏱️ {getCardAgeText(event)}</div>
                          </td>
                          <td>
                            <div className={styles.gridEventDesc}>{dtconStr}</div>
                          </td>
                          <td>
                            <span className={styles.badgeSuccess}>✓ Concluído</span>
                          </td>
                        </tr>
                      );
                    }

                    const assignedUserName = event.task_user?.name || 'Não atribuído';
                    const isOwner = event.user_seqid && event.user_seqid.toString() === userSeqid;
                    const isResponsible = event.taskuser_seqid && event.taskuser_seqid.toString() === userSeqid;
                    const isUnassigned = !event.taskuser_seqid;

                    // Se o usuário logado for o dono e a tarefa estiver atribuída a ele mesmo OU ainda não tiver sido atribuída a ninguém
                    const canEditFully = isOwner && (isResponsible || isUnassigned);
                    // Se o usuário logado for o responsável atribuído mas NÃO for o criador/dono da atividade
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
                                onClick={() => setEditingEvent(event)}
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
                                  ✓ Concluir
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
                               onClick={() => handleAdminTransferRequest(event)}
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
          )}
        </div>
      )}

      <ActivityHistorySidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        boardId={boardId}
      />

      {editingEvent && (
        <EditEventModal
          card={editingEvent}
          columns={columns}
          onSave={async (id, title, desc, previsto, dtcon, dtatv, newColumnId) => {
            await updateCardAction(id, title, desc, previsto, dtcon, dtatv);
            if ((editingEvent as any).columnId !== newColumnId) {
              onMoveCard(id, (editingEvent as any).columnId, newColumnId);
            }
          }}
          onClose={() => setEditingEvent(null)}
        />
      )}

      {activeActionModal && (() => {
        const isEventAssignedToMe = !!(userSeqid && activeActionModal.taskuser_seqid && activeActionModal.taskuser_seqid.toString() === userSeqid);
        const isAdminOrOwner = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

        return (
          <div className={styles.modalOverlay} onClick={() => setActiveActionModal(null)}>
            <div className={styles.drawerContainer} onClick={e => e.stopPropagation()}>
              <div className={styles.drawerHeader}>
                <div>
                  <h3 className={styles.drawerTitle}>Andamentos do Evento</h3>
                  <p className={styles.drawerSubtitle}>{activeActionModal.title}</p>
                </div>
                <button className={styles.drawerCloseBtn} onClick={() => setActiveActionModal(null)}>✕</button>
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
                        value={newActionText[activeActionModal.id] || ''}
                        onChange={e => setNewActionText(prev => ({ ...prev, [activeActionModal.id]: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddAction(activeActionModal.id, activeActionModal.seqid);
                          }
                        }}
                      />
                      <button
                        className={styles.drawerSubmitBtn}
                        onClick={() => handleAddAction(activeActionModal.id, activeActionModal.seqid)}
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
                  <h4>Histórico de Ações ({activeActionModal.card_act ? activeActionModal.card_act.length : 0})</h4>
                </div>

                <div className={styles.drawerActionsList}>
                  {!activeActionModal.card_act || activeActionModal.card_act.length === 0 ? (
                    <p className={styles.drawerEmptyText}>Nenhum andamento registrado para este evento ainda.</p>
                  ) : (
                    activeActionModal.card_act.map((act: any) => {
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
                              {isTransferPendente && (
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                  <button
                                    onClick={() => handleRespondTransfer(activeActionModal.seqid ? activeActionModal.seqid.toString() : activeActionModal.id, act.seqid.toString(), true)}
                                    style={{
                                      background: '#10b981',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      padding: '0.35rem 0.75rem',
                                      fontSize: '0.8rem',
                                      fontWeight: 600,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Aceitar
                                  </button>
                                  <button
                                    onClick={() => handleRespondTransfer(activeActionModal.seqid ? activeActionModal.seqid.toString() : activeActionModal.id, act.seqid.toString(), false)}
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.1)',
                                      color: '#ef4444',
                                      border: '1px solid rgba(239, 68, 68, 0.2)',
                                      borderRadius: '6px',
                                      padding: '0.35rem 0.75rem',
                                      fontSize: '0.8rem',
                                      fontWeight: 600,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Recusar
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
      })()}

      {/* ── MODAL DE TRANSFERÊNCIA ── */}
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
