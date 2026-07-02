'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { ColumnType, CardType } from '@/types/kanban';
import { updateCardAction, getWorkspaceMembersAction, requestTransferAction, respondTransferRequestAction } from '@/app/actions/cardActions';
import { completeBoardAction, requestBoardCompletionAction } from '@/app/actions/boardActions';
import { ActiveEventsGrid, CompletedEventsGrid, BoardTopBar, CreateEventForm } from '../grids';
import ActivityHistorySidebar from '../shell/ActivityHistorySidebar';
import EditEventModal from '../modals/EditEventModal';
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
  boardDtcon?: string | Date | null;
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
  boardId,
  userId,
  userSeqid = '',
  currentUserRole = '',
  onRenameBoard,
  viewMode = 'ongoing',
  boardDtcon,
  boardPrevisto
}: BoardProps) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingEvent, setEditingEvent] = useState<{ id: string; title: string; description: string; previsto?: any; dtcon?: any; dtatv?: any } | null>(null);

  // Find columns
  const todoCol = columns.find(c => c.title.toLowerCase().includes('fazer')) || columns[0];
  const doneCol = columns.find(c =>
    c.title.toLowerCase().includes('concluído') ||
    c.title.toLowerCase().includes('concluido')
  ) || columns[2];

  // Gather events based on viewMode
  const displayEvents: (CardType & { columnName: string; columnId: string; seqid?: string; card_act?: any[] })[] = [];
  columns.forEach(col => {
    col.cards.forEach(card => {
      if (currentUserRole !== 'OWNER' && currentUserRole !== 'ADMIN' && currentUserRole !== '') {
        const isCreator = card.user?.id === userId;
        const isAssigned = card.task_user?.id === userId;
        if (!isCreator && !isAssigned) return;
      }

      const isDoneCol = col.title.toLowerCase().includes('concluído') || col.title.toLowerCase().includes('concluido');
      if (viewMode === 'completed') {
        if (isDoneCol || card.dtcon) {
          displayEvents.push({ ...card, columnName: col.title, columnId: col.id });
        }
      } else {
        if (!isDoneCol && !card.dtcon) {
          displayEvents.push({ ...card, columnName: col.title, columnId: col.id });
        }
      }
    });
  });

  // Handlers
  const handleCreateEvent = (title: string, description: string, dtatv: string, previsto?: string) => {
    if (todoCol) {
      onAddCard(todoCol.id, title, description, dtatv, previsto);
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
      }
    } catch (err: any) {
      console.error('Erro ao solicitar transferência:', err);
      Swal.fire('Erro', 'Erro ao solicitar transferência', 'error');
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
    } catch (err: any) {
      console.error('Erro ao responder transferência:', err);
      Swal.fire('Erro', 'Erro ao responder transferência', 'error');
    }
  };

  const handleEncerrarAtividade = async () => {
    const pendingEvents = displayEvents.filter(ev => !ev.dtcon);
    const isOwner = currentUserRole === 'OWNER';

    const eventListHtml = pendingEvents.length > 0
      ? `<div style="text-align:left;margin:0.75rem 0;padding:0.75rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;font-size:0.85rem;">
          ${pendingEvents.map(ev => `<div style="padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:0.5rem;"><span style="color:#f59e0b;">⚡</span> <strong style="color:#fff;">${ev.title}</strong> <span style="color:#94a3b8;font-size:0.8rem;">${ev.task_user?.name || 'Sem responsável'}</span></div>`).join('')}
        </div>`
      : '<p style="color:#94a3b8;font-size:0.85rem;margin:0.75rem 0;">Nenhum evento pendente.</p>';

    const result = await Swal.fire({
      title: isOwner ? 'Encerrar Atividade' : 'Solicitar Encerramento',
      html: `
        <p style="font-size:0.9rem;color:#94a3b8;margin-bottom:0;">
          ${isOwner
            ? `Todos os <strong style="color:#fff;">${pendingEvents.length}</strong> evento(s) pendente(s) serão marcados como concluídos.`
            : 'Uma solicitação será enviada ao proprietário para aprovação.'
          }
        </p>
        ${eventListHtml}
        <textarea id="swal-descricao" placeholder="Descrição / Observação (opcional)" style="display:block;width:100%;box-sizing:border-box;min-height:70px;padding:0.75rem;margin-top:0.5rem;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;font-size:0.85rem;font-family:inherit;resize:vertical;"></textarea>
      `,
      icon: undefined,
      iconHtml: '🔒',
      showCancelButton: true,
      confirmButtonColor: isOwner ? '#ef4444' : '#7c3aed',
      cancelButtonColor: 'transparent',
      confirmButtonText: isOwner ? 'Confirmar Encerramento' : '📨 Enviar Solicitação',
      cancelButtonText: 'Cancelar',
      background: '#1e1e2e',
      color: '#fff',
      width: '520px',
      padding: '2rem',
      preConfirm: () => {
        return (document.getElementById('swal-descricao') as HTMLTextAreaElement)?.value || '';
      }
    });

    if (!result.isConfirmed) return;

    try {
      if (isOwner) {
        const localDate = new Date();
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        const localDateStr = `${year}-${month}-${day}`;

        await completeBoardAction(boardId, localDateStr);
        Swal.fire({
          title: 'Atividade Encerrada!',
          text: 'Todos os eventos foram concluídos e a atividade foi finalizada.',
          icon: 'success',
          confirmButtonColor: '#10b981',
          background: '#1e1e2e',
          color: '#fff'
        });
      } else {
        await requestBoardCompletionAction(boardId);
        Swal.fire({
          title: 'Solicitação Enviada!',
          text: 'O proprietário será notificado para aprovar o encerramento.',
          icon: 'success',
          confirmButtonColor: '#7c3aed',
          background: '#1e1e2e',
          color: '#fff'
        });
      }
      router.refresh();
    } catch (err: any) {
      console.error('Erro ao encerrar atividade:', err);
      Swal.fire({
        title: 'Erro',
        text: err?.message || 'Erro ao processar encerramento.',
        icon: 'error',
        confirmButtonColor: '#7c3aed',
        background: '#1e1e2e',
        color: '#fff'
      });
    }
  };

  return (
    <div className={styles.container}>
      <BoardTopBar
        boardName={boardName}
        boardDetalhes={boardDetalhes}
        workspaceName={workspaceName}
        workspaceId={workspaceId}
        boardId={boardId}
        viewMode={viewMode}
        currentUserRole={currentUserRole}
        boardDtcon={boardDtcon}
        boardPrevisto={boardPrevisto}
        isAdding={isAdding}
        onToggleAdding={() => setIsAdding(!isAdding)}
        onRenameBoard={onRenameBoard}
        onEncerrar={handleEncerrarAtividade}
      />

      {isAdding && viewMode !== 'completed' && (
        <CreateEventForm
          onSubmit={handleCreateEvent}
          onCancel={() => setIsAdding(false)}
        />
      )}

      {!isAdding && viewMode === 'completed' && (
        <CompletedEventsGrid
          events={displayEvents}
          userSeqid={userSeqid}
          currentUserRole={currentUserRole}
          onRespondTransfer={handleRespondTransfer}
        />
      )}

      {!isAdding && viewMode !== 'completed' && (
        <ActiveEventsGrid
          events={displayEvents}
          columns={columns}
          userId={userId}
          userSeqid={userSeqid}
          currentUserRole={currentUserRole}
          workspaceId={workspaceId}
          doneCol={doneCol}
          onMoveCard={onMoveCard}
          onCompleteCard={onCompleteCard}
          onEditEvent={(event) => setEditingEvent(event)}
          onRespondTransfer={handleRespondTransfer}
          onAdminTransferRequest={handleAdminTransferRequest}
        />
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
    </div>
  );
}
