'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import Swal from 'sweetalert2';
import {
  updateCardPrevistoAction,
  addCardActionLogAction,
  updateCardActionLogAction,
  deleteCardActionLogAction,
  getCardActionsAction,
  getWorkspaceMembersAction,
  transferCardAction,
  transferCardWorkspaceAction
} from '@/app/actions/cardActions';
import styles from './MyEventsView.module.css';

interface MyEventsViewProps {
  events: any[];
  currentUser?: { id: string; name: string };
  userSeqid?: string;
  workspaces?: any[];
  onEventsChange?: (value: any) => void;
  onBack?: () => void;
}

export default function MyEventsView({ events, currentUser, userSeqid, workspaces, onEventsChange, onBack }: MyEventsViewProps) {
  const router = useRouter();
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [newActionText, setNewActionText] = useState('');
  const [isSavingAction, setIsSavingAction] = useState(false);
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

// Sort events by previsto ascending (oldest first)
const sortedEvents = useMemo(() => {
  if (!events) return [];
  return [...events].sort((a, b) => {
    if (a.previsto && b.previsto) {
      return new Date(a.previsto).getTime() - new Date(b.previsto).getTime(); // Oldest first
    }
    if (a.previsto) return -1;
    if (b.previsto) return 1;
    return 0;
  });
}, [events]);

// Summary counters for the events status bar
const eventsSummary = useMemo(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let overdue = 0;
  let dueToday = 0;
  let onTime = 0;
  let noPrevisto = 0;

  for (const ev of sortedEvents) {
    if (!ev.previsto) { noPrevisto++; continue; }
    const dateStr = new Date(ev.previsto).toISOString().split('T')[0];
    const [y, m, d] = dateStr.split('-').map(Number);
    const expected = new Date(y, m - 1, d);
    expected.setHours(0, 0, 0, 0);

    if (expected < today) overdue++;
    else if (expected.getTime() === today.getTime()) dueToday++;
    else onTime++;
  }

  return { total: sortedEvents.length, overdue, dueToday, onTime, noPrevisto };
}, [sortedEvents]);

  // Estados de Edição de Andamentos
  const [editingActionSeqid, setEditingActionSeqid] = useState<bigint | null>(null);
  const [editingActionText, setEditingActionText] = useState('');

  // Estados de Transferência de Responsabilidade
  const [transferModalData, setTransferModalData] = useState<{ cardId: string; cardTitle: string; currentTaskUserSeqid?: bigint | null } | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [selectedTransferUserSeqid, setSelectedTransferUserSeqid] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);

  // Estados de Transferência de Área (Workspace)
  const [transferWorkspaceModalData, setTransferWorkspaceModalData] = useState<{
    cardId: string;
    cardTitle: string;
    currentWorkspaceSeqid: string;
    currentBoardSeqid: string;
    currentColumnId: string;
  } | null>(null);

  const [selectedWorkspaceSeqid, setSelectedWorkspaceSeqid] = useState<string>('');
  const [selectedBoardSeqid, setSelectedBoardSeqid] = useState<string>('');
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');
  const [isTransferringWorkspace, setIsTransferringWorkspace] = useState(false);

  const handlePrevistoChange = async (cardId: string, val: string) => {
    try {
      await updateCardPrevistoAction(cardId, val ? val : null);
      if (onEventsChange) {
        onEventsChange((prev: any[]) => prev.map(ev => {
          if (ev.id === cardId) {
            return { ...ev, previsto: val ? new Date(val).toISOString() : null };
          }
          return ev;
        }));
      }
      router.refresh();
    } catch (err) {
      console.error('Erro ao atualizar data prevista:', err);
    }
  };

  const handleAddAction = async () => {
    if (!newActionText.trim() || !selectedEvent) return;
    setIsSavingAction(true);
    try {
      const savedAction = await addCardActionLogAction(selectedEvent.seqid, newActionText.trim());
      const updatedActs = [savedAction, ...(selectedEvent.card_act || [])];
      // Atualizar o estado local do evento selecionado para mostrar o novo andamento na lista
      setSelectedEvent({
        ...selectedEvent,
        card_act: updatedActs
      });
      if (onEventsChange) {
        onEventsChange((prev: any[]) => prev.map(ev => {
          if (ev.id === selectedEvent.id) {
            return { ...ev, card_act: updatedActs };
          }
          return ev;
        }));
      }
      setNewActionText('');
      router.refresh();
    } catch (err) {
      console.error('Erro ao salvar andamento:', err);
    } finally {
      setIsSavingAction(false);
    }
  };

  const handleEditActionSubmit = async (actionSeqid: bigint) => {
    if (!editingActionText.trim()) return;
    try {
      const updatedAction = await updateCardActionLogAction(actionSeqid.toString(), editingActionText.trim());
      setEditingActionSeqid(null);
      setEditingActionText('');

      if (selectedEvent) {
        const updatedActs = selectedEvent.card_act.map((a: any) =>
          a.seqid.toString() === actionSeqid.toString() ? { ...a, description: updatedAction.description } : a
        );
        setSelectedEvent({
          ...selectedEvent,
          card_act: updatedActs
        });
        if (onEventsChange) {
          onEventsChange((prev: any[]) => prev.map(ev => {
            if (ev.id === selectedEvent.id) {
              return { ...ev, card_act: updatedActs };
            }
            return ev;
          }));
        }
      }
      router.refresh();
    } catch (err) {
      console.error('Erro ao editar andamento:', err);
    }
  };

  const handleDeleteAction = async (actionSeqid: bigint) => {
    const result = await Swal.fire({
      title: 'Excluir Andamento',
      html: '<p style="font-size: 0.9rem; color: #94a3b8; margin: 0;">Esta ação não poderá ser desfeita.</p>',
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
    if (!result.isConfirmed) return;
    try {
      await deleteCardActionLogAction(actionSeqid.toString());
      if (selectedEvent) {
        const updatedActs = selectedEvent.card_act.filter((a: any) => a.seqid.toString() !== actionSeqid.toString());
        setSelectedEvent({
          ...selectedEvent,
          card_act: updatedActs
        });
        if (onEventsChange) {
          onEventsChange((prev: any[]) => prev.map(ev => {
            if (ev.id === selectedEvent.id) {
              return { ...ev, card_act: updatedActs };
            }
            return ev;
          }));
        }
      }
      router.refresh();
    } catch (err) {
      console.error('Erro ao excluir andamento:', err);
    }
  };

  const handleOpenTransferModal = async (event: any) => {
    try {
      const workspaceSeqid = event.column?.workspaceSeqid?.toString() || event.column?.workspace?.seqid?.toString() || event.board?.workspaceId?.toString() || event.board?.workspace?.seqid?.toString() || '';
      const users = await getWorkspaceMembersAction(workspaceSeqid);
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
      await transferCardAction(transferModalData.cardId, selectedTransferUserSeqid || null);
      const cardId = transferModalData.cardId;
      setTransferModalData(null);
      if (onEventsChange && selectedTransferUserSeqid !== userSeqid) {
        onEventsChange((prev: any[]) => prev.filter(ev => ev.id !== cardId));
      }
      router.refresh();
    } catch (err) {
      console.error('Erro ao transferir atividade:', err);
    } finally {
      setIsTransferring(false);
    }
  };

  const handleOpenTransferWorkspaceModal = (event: any) => {
    const workspaceSeqid = event.column?.workspaceSeqid?.toString() || event.column?.workspace?.seqid?.toString() || event.board?.workspaceId?.toString() || event.board?.workspace?.seqid?.toString() || '';
    const boardSeqid = event.board_seqid?.toString() || event.board?.seqId?.toString() || '';
    const columnId = event.columnId?.toString() || event.column?.seqid?.toString() || '';

    setSelectedWorkspaceSeqid(workspaceSeqid);
    setSelectedBoardSeqid(boardSeqid);
    setSelectedColumnId(columnId);

    setTransferWorkspaceModalData({
      cardId: event.id,
      cardTitle: event.title,
      currentWorkspaceSeqid: workspaceSeqid,
      currentBoardSeqid: boardSeqid,
      currentColumnId: columnId,
    });
  };

  const handleTransferWorkspaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferWorkspaceModalData) return;

    setIsTransferringWorkspace(true);
    try {
      await transferCardWorkspaceAction(
        transferWorkspaceModalData.cardId,
        selectedWorkspaceSeqid,
        selectedBoardSeqid,
        selectedColumnId
      );
      setTransferWorkspaceModalData(null);
      router.refresh();
    } catch (err) {
      console.error('Erro ao transferir área da atividade:', err);
    } finally {
      setIsTransferringWorkspace(false);
    }
  };


  const handleGeneratePdf = async () => {
    if (sortedEvents.length === 0) {
      Swal.fire({
        title: 'Sem dados',
        html: '<p style="font-size: 0.9rem; color: #94a3b8; margin: 0;">Nenhum evento para gerar o PDF.</p>',
        confirmButtonColor: '#7c3aed',
        background: '#1e1e2e',
        color: '#fff',
        width: '320px',
        padding: '1.5rem',
        backdrop: 'rgba(0,0,0,0.6)'
      });
      return;
    }

    const pdfWindow = window.open('', '_blank');
    if (!pdfWindow) {
      Swal.fire({
        title: 'Pop-up bloqueado',
        html: '<p style="font-size: 0.9rem; color: #94a3b8; margin: 0;">Ative a exibição de pop-ups para gerar o PDF.</p>',
        confirmButtonColor: '#7c3aed',
        background: '#1e1e2e',
        color: '#fff',
        width: '360px',
        padding: '1.5rem',
        backdrop: 'rgba(0,0,0,0.6)'
      });
      return;
    }
    pdfWindow.document.write('<html><head><title>Gerando PDF...</title><style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;color:#475569;background:#f8fafc}.spinner{border:4px solid #e2e8f0;border-top:4px solid #6366f1;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin-bottom:15px}@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style></head><body><div class="spinner"></div><div>Gerando documento PDF...</div></body></html>');
    pdfWindow.document.close();

    try {
      await new Promise<void>((resolve, reject) => {
        if ((window as any).html2pdf) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load html2pdf'));
        document.head.appendChild(script);
      });

      const now = new Date();
      const anoMesDia = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const filename = `meus_eventos_${anoMesDia}.pdf`;

      const formatDate = (d: any) => d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—';

      const tableRows = sortedEvents.map(ev => {
        const boardName = ev.board?.name || ev.column?.board?.name || 'Atividade';
        const previstoStr = formatDate(ev.previsto);
        const assignedName = ev.task_user?.name || 'Não atribuído';
        let status = 'Pendente';
        if (ev.previsto) {
          const dateStr = new Date(ev.previsto).toISOString().split('T')[0];
          const [y, m, d] = dateStr.split('-').map(Number);
          const expected = new Date(y, m - 1, d);
          expected.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (expected < today) status = 'Atrasado';
          else if (expected.getTime() === today.getTime()) status = 'Hoje';
        }
        return `<tr style="page-break-inside:avoid;">
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:10px;">${boardName}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:10px;">${ev.title}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:10px;">${assignedName}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:10px;">${previstoStr}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:10px;font-weight:600;color:${status === 'Atrasado' ? '#ef4444' : status === 'Hoje' ? '#f59e0b' : '#10b981'}">${status}</td>
        </tr>`;
      }).join('');

      const userName = currentUser?.name || 'Usuário';
      const htmlContent = `<div style="width:710px;padding:15px;background:white;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;">
        <div style="border-bottom:2px solid #cbd5e1;padding-bottom:12px;margin-bottom:16px;">
          <div style="font-size:18px;font-weight:800;color:#0f172a;margin-bottom:4px;">Meus Eventos</div>
          <div style="font-size:11px;color:#64748b;">Responsável: ${userName} | Emitido em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #cbd5e1;">
          <thead><tr style="background:#f1f5f9;">
            <th style="padding:8px;text-align:left;border-bottom:1px solid #cbd5e1;font-size:10px;font-weight:700;text-transform:uppercase;width:140px;">ATIVIDADE</th>
            <th style="padding:8px;text-align:left;border-bottom:1px solid #cbd5e1;font-size:10px;font-weight:700;text-transform:uppercase;">EVENTO</th>
            <th style="padding:8px;text-align:left;border-bottom:1px solid #cbd5e1;font-size:10px;font-weight:700;text-transform:uppercase;width:100px;">ATRIBUÍDO</th>
            <th style="padding:8px;text-align:left;border-bottom:1px solid #cbd5e1;font-size:10px;font-weight:700;text-transform:uppercase;width:90px;">PROGRAMADO</th>
            <th style="padding:8px;text-align:left;border-bottom:1px solid #cbd5e1;font-size:10px;font-weight:700;text-transform:uppercase;width:70px;">STATUS</th>
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <div style="margin-top:20px;border-top:1px solid #cbd5e1;padding-top:12px;">
          <div style="font-size:9px;color:#64748b;">Total de eventos: <strong>${sortedEvents.length}</strong></div>
        </div>
      </div>`;

      const opt = {
        margin: [6, 6, 6, 6],
        filename,
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { scale: 1.5, useCORS: true, logging: false, allowTaint: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr'] }
      };

      const html2pdf = (window as any).html2pdf;
      const pdfBlob = await html2pdf()
        .from(htmlContent)
        .set(opt)
        .toPdf()
        .get('pdf')
        .then((pdfObj: any) => {
          pdfObj.setProperties({ title: 'Meus Eventos - Flow' });
          return pdfObj;
        })
        .output('blob');

      const blobUrl = URL.createObjectURL(pdfBlob);
      pdfWindow.location.replace(blobUrl);
    } catch (err) {
      console.error('Error generating PDF:', err);
      Swal.fire({
        title: 'Erro',
        html: '<p style="font-size: 0.9rem; color: #94a3b8; margin: 0;">Ocorreu um erro ao gerar o PDF.</p>',
        confirmButtonColor: '#7c3aed',
        background: '#1e1e2e',
        color: '#fff',
        width: '320px',
        padding: '1.5rem',
        backdrop: 'rgba(0,0,0,0.6)'
      });
      pdfWindow.close();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Meus Eventos</h2>
          <p className={styles.subtitle}>Listagem de todos eventos em andamento sob responsabilidade direta do seu usuário</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={handleGeneratePdf}
            className={styles.cancelBtn}
            title="Gerar PDF dos eventos"
            style={{ background: '#7c3aed', color: '#fff', border: '1px solid #6d28d9' }}
          >
            📄 PDF
          </button>
          <button
            onClick={() => {
              if (onBack) {
                onBack();
              } else {
                router.push('/dashboard');
              }
            }}
            className={styles.cancelBtn}
            title="Voltar para a tela anterior"
          >
            ← Voltar
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {events.length === 0 ? (
          <div className={styles.emptyState}>
            <p>🎉 Nenhum evento pendente direcionado para você no momento!</p>
          </div>
        ) : (
          <>
          <div className={styles.summaryBar}>
            <span className={styles.summaryTotal}>{eventsSummary.total} evento{eventsSummary.total !== 1 ? 's' : ''}</span>
            {eventsSummary.overdue > 0 && (
              <span className={styles.summaryChip + ' ' + styles.summaryDanger}>
                {eventsSummary.overdue} atrasado{eventsSummary.overdue !== 1 ? 's' : ''}
              </span>
            )}
            {eventsSummary.dueToday > 0 && (
              <span className={styles.summaryChip + ' ' + styles.summaryWarning}>
                {eventsSummary.dueToday} para hoje
              </span>
            )}
            {eventsSummary.onTime > 0 && (
              <span className={styles.summaryChip + ' ' + styles.summarySuccess}>
                {eventsSummary.onTime} no prazo
              </span>
            )}
            {eventsSummary.noPrevisto > 0 && (
              <span className={styles.summaryChip + ' ' + styles.summaryNeutral}>
                {eventsSummary.noPrevisto} sem data
              </span>
            )}
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.eventsTable}>
              <thead>
                <tr>
                  <th>Atividade</th>
                  <th>Nome do Evento</th>
                  <th>Atribuído</th>
                  <th>Programado</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedEvents.map(ev => {
                  let statusType = 'normal'; // 'danger', 'warning', 'success', 'normal'
                  if (ev.previsto) {
                    const dateStr = new Date(ev.previsto).toISOString().split('T')[0];
                    const [year, month, day] = dateStr.split('-').map(Number);
                    const expectedDate = new Date(year, month - 1, day);
                    expectedDate.setHours(0, 0, 0, 0);

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    if (ev.dtcon) {
                      statusType = 'success';
                    } else if (expectedDate < today) {
                      statusType = 'danger';
                    } else if (expectedDate.getTime() === today.getTime()) {
                      statusType = 'warning';
                    }
                  }

                  const previstoStr = ev.previsto ? new Date(ev.previsto).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—';
                  const boardName = ev.board?.name || ev.column?.board?.name || 'Atividade';
                  const boardSeqId = ev.board?.seqId || ev.board?.seqid || ev.column?.board?.seqId || ev.column?.board?.seqid || '';
                  const workspaceName = ev.board?.workspace?.name || ev.column?.workspace?.name || ev.column?.board?.workspace?.name || 'Área';

                  const assignedUserName = ev.task_user?.name || 'Não atribuído';
                  const isAssignedToMe = userSeqid && ev.taskuser_seqid && ev.taskuser_seqid.toString() === userSeqid;

                  return (
                    <tr key={ev.seqid}>
                      <td>
                        <div className={styles.workspaceStatic}>
                          <div className={styles.metaTitle}>{boardName}</div>
                          <div className={styles.metaSubtitle}>{boardSeqId ? `#${boardSeqId} · ${workspaceName}` : workspaceName}</div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.eventTitle}>{ev.title}</div>
                        {ev.description && <div className={styles.eventDesc}>{ev.description}</div>}
                      </td>
                      <td>
                        <div
                          className={styles.assignedUserClickable}
                          onClick={() => handleOpenTransferModal(ev)}
                          title="Clique para transferir esta atividade"
                        >
                          <span className={styles.userIcon}>👤</span>
                          <span>{assignedUserName}</span>
                          <span className={styles.transferIcon}>🔄</span>
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
                              value={ev.previsto ? new Date(ev.previsto).toISOString().split('T')[0] : ''}
                              onChange={(e) => handlePrevistoChange(ev.id, e.target.value)}
                              onClick={(e) => (e.target as any).showPicker?.()}
                              disabled={!isAssignedToMe}
                              title={!isAssignedToMe ? "Apenas o responsável pode alterar a data programada." : undefined}
                            />
                          </div>
                          <div className={`${styles.cardAgeText} ${styles[statusType] || ''}`}>
                            {statusType === 'danger' ? '🔴' : statusType === 'warning' ? '🟡' : '⏱️'} {getCardAgeText(ev)}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.actionsGroup}>
                          <button
                            className={styles.actionBtn}
                            onClick={async () => {
                              const actions = await getCardActionsAction(ev.seqid);
                              setSelectedEvent({ ...ev, card_act: actions });
                            }}
                            title="Anotações"
                          >
                            💬
                          </button>
                          {ev.board?.id && (
                            <button
                              className={styles.openBoardBtn}
                              onClick={() => router.push(`/dashboard?boardId=${ev.board.id}`)}
                              title="Abrir todos os eventos desta atividade"
                            >
                              <ExternalLink size={16} strokeWidth={2} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* Drawer de Andamentos Interno */}
      {selectedEvent && (
        <div className={styles.drawerOverlay} onClick={() => setSelectedEvent(null)}>
          <div className={styles.drawerContainer} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <h3 className={styles.drawerTitle}>Andamentos do Evento</h3>
                <p className={styles.drawerSubtitle}>{selectedEvent.title}</p>
              </div>
              <button className={styles.drawerCloseBtn} onClick={() => setSelectedEvent(null)}>✕</button>
            </div>
            <div className={styles.drawerContent}>
              <div className={styles.drawerAddAction}>
                <textarea
                  className={styles.drawerTextarea}
                  placeholder="Escreva um novo andamento aqui..."
                  value={newActionText}
                  onChange={(e) => setNewActionText(e.target.value)}
                />
                <button
                  className={styles.drawerSaveBtn}
                  onClick={handleAddAction}
                  disabled={!newActionText.trim() || isSavingAction}
                >
                  {isSavingAction ? 'Salvando...' : 'Salvar Andamento'}
                </button>
              </div>

              <div className={styles.drawerListHeader}>
                <h4>Histórico de Ações ({selectedEvent.card_act ? selectedEvent.card_act.length : 0})</h4>
              </div>
              <div className={styles.drawerActionsList}>
                {!selectedEvent.card_act || selectedEvent.card_act.length === 0 ? (
                  <p className={styles.drawerEmptyText}>Nenhum andamento registrado para este evento.</p>
                ) : (
                  selectedEvent.card_act.map((act: any) => (
                    <div key={act.seqid.toString()} className={styles.drawerActionCard}>
                      {editingActionSeqid?.toString() === act.seqid.toString() ? (
                        <div className={styles.editActionForm}>
                          <textarea
                            className={styles.drawerTextarea}
                            value={editingActionText}
                            onChange={(e) => setEditingActionText(e.target.value)}
                            autoFocus
                          />
                          <div className={styles.editActionBtns}>
                            <button className={styles.cancelEditBtn} onClick={() => setEditingActionSeqid(null)}>Cancelar</button>
                            <button
                              className={styles.confirmEditBtn}
                              onClick={() => handleEditActionSubmit(BigInt(act.seqid))}
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={styles.actionCardTop}>
                            <p className={styles.drawerActionText}>{act.description}</p>
                            <div className={styles.actionQuickBtns}>
                              <button
                                title="Editar andamento"
                                onClick={() => {
                                  setEditingActionSeqid(BigInt(act.seqid));
                                  setEditingActionText(act.description);
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                title="Excluir andamento"
                                onClick={() => handleDeleteAction(BigInt(act.seqid))}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                          <span className={styles.drawerActionMeta}>
                            {act.users?.name || 'Sistema'} • {new Date(act.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Transferência */}
      {transferModalData && (
        <div className={styles.modalOverlay} onClick={() => setTransferModalData(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Transferir Responsabilidade</h3>
              <button className={styles.closeBtn} onClick={() => setTransferModalData(null)}>✕</button>
            </div>
            <form onSubmit={handleTransferSubmit}>
              <div className={styles.modalBody}>
                <p className={styles.modalSub}>
                  Selecione o novo responsável para o evento: <br />
                  <strong>{transferModalData.cardTitle}</strong>
                </p>
                <div className={styles.formGroup}>
                  <label htmlFor="userSelect">Novo Responsável:</label>
                  <select
                    id="userSelect"
                    className={styles.selectInput}
                    value={selectedTransferUserSeqid}
                    onChange={(e) => setSelectedTransferUserSeqid(e.target.value)}
                    required
                  >
                    <option value="">Selecione um usuário...</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.seqid.toString()}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setTransferModalData(null)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.confirmBtn} disabled={isTransferring}>
                  {isTransferring ? 'Transferindo...' : 'Confirmar Transferência'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Transferência de Área (Workspace) */}
      {transferWorkspaceModalData && (
        <div className={styles.modalOverlay} onClick={() => setTransferWorkspaceModalData(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Alterar Atividade / Área</h3>
              <button className={styles.closeBtn} onClick={() => setTransferWorkspaceModalData(null)}>✕</button>
            </div>
            <form onSubmit={handleTransferWorkspaceSubmit}>
              <div className={styles.modalBody}>
                <p className={styles.modalSub}>
                  Selecione o novo espaço de trabalho, quadro e fase para o evento: <br />
                  <strong>{transferWorkspaceModalData.cardTitle}</strong>
                </p>

                <div className={styles.formGroup} style={{ marginBottom: '1rem' }}>
                  <label htmlFor="workspaceSelect">Nova Área:</label>
                  <select
                    id="workspaceSelect"
                    className={styles.selectInput}
                    value={selectedWorkspaceSeqid}
                    onChange={(e) => {
                      const wsSeqid = e.target.value;
                      setSelectedWorkspaceSeqid(wsSeqid);
                      const targetWs = workspaces?.find(w => w.seqid?.toString() === wsSeqid);
                      if (targetWs) {
                        const firstBoard = targetWs.boards?.[0];
                        setSelectedBoardSeqid(firstBoard ? firstBoard.id : '');
                        const firstCol = targetWs.columns?.[0];
                        setSelectedColumnId(firstCol ? firstCol.id : '');
                      }
                    }}
                    required
                  >
                    <option value="">Selecione uma área...</option>
                    {workspaces?.map(ws => (
                      <option key={ws.id} value={ws.seqid?.toString()}>
                        {ws.name}
                      </option>
                    ))}
                  </select>
                </div>

                {(() => {
                  const selectedWorkspace = workspaces?.find(w => w.seqid?.toString() === selectedWorkspaceSeqid);
                  const workspaceBoards = selectedWorkspace?.boards || [];
                  const workspaceColumns = selectedWorkspace?.columns || [];

                  return (
                    <>
                      <div className={styles.formGroup} style={{ marginBottom: '1rem' }}>
                        <label htmlFor="boardSelect">Nova Atividade:</label>
                        <select
                          id="boardSelect"
                          className={styles.selectInput}
                          value={selectedBoardSeqid}
                          onChange={(e) => setSelectedBoardSeqid(e.target.value)}
                          required
                        >
                          <option value="">Selecione um quadro...</option>
                          {workspaceBoards.map((b: any) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor="columnSelect">Nova Fase:</label>
                        <select
                          id="columnSelect"
                          className={styles.selectInput}
                          value={selectedColumnId}
                          onChange={(e) => setSelectedColumnId(e.target.value)}
                          required
                        >
                          <option value="">Selecione uma fase...</option>
                          {workspaceColumns.map((c: any) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setTransferWorkspaceModalData(null)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.confirmBtn} disabled={isTransferringWorkspace}>
                  {isTransferringWorkspace ? 'Transferindo...' : 'Confirmar Transferência'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
