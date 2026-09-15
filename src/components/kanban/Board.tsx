'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { swalConfirm, swalError, swalInput, swalSuccess, swalToast } from '@/lib/swal';
import { ColumnType, CardType } from '@/types/kanban';
import { updateCardAction, getWorkspaceMembersAction, requestTransferAction, respondTransferRequestAction } from '@/app/actions/cardActions';
import { completeBoardAction, requestBoardCompletionAction } from '@/app/actions/boardActions';
import { ActiveEventsGrid, CompletedEventsGrid, BoardTopBar, CreateEventForm } from '../grids';
import ActivityHistorySidebar from '../shell/ActivityHistorySidebar';
import EditEventModal from '../modals/EditEventModal';
import styles from './Board.module.css';

type CompletionFormValue = {
  descricao: string;
  dtcon: string;
};

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

interface BoardProps {
  boardName: string;
  boardDetalhes?: string | null;
  columns: ColumnType[];
  allCards?: (CardType & { columnId?: string; columnName?: string | null; card_act?: any[] })[];
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
  onViewReport?: () => void;
}

export default function Board({
  boardName,
  boardDetalhes,
  columns,
  allCards,
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
  boardPrevisto,
  onViewReport
}: BoardProps) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingEvent, setEditingEvent] = useState<{ id: string; title: string; description: string; columnId: string; previsto?: any; dtcon?: any; dtatv?: any } | null>(null);

  // Find columns
  const todoCol = columns.find(c => c.title.toLowerCase().includes('fazer')) || columns[0];
  const doneCol = columns.find(c =>
    c.title.toLowerCase().includes('concluído') ||
    c.title.toLowerCase().includes('concluido')
  ) || columns[2];

  // Gather events based on viewMode
  const displayEvents: (CardType & { columnName: string; columnId: string; seqid?: string; card_act?: any[] })[] = [];

  const addEventIfVisible = (card: any, columnTitle: string, columnId: string) => {
    if (currentUserRole !== 'OWNER' && currentUserRole !== 'ADMIN' && currentUserRole !== '') {
      const isCreator = card.user?.id === userId;
      const isAssigned = card.task_user?.id === userId;
      if (!isCreator && !isAssigned) return;
    }

    // dtcon define o status: se tem data está concluído, se null está pendente
    if (viewMode === 'completed') {
      if (card.dtcon) {
        displayEvents.push({ ...card, seqid: card.seqid?.toString() || card.id, columnName: columnTitle, columnId });
      }
    } else {
      if (!card.dtcon) {
        displayEvents.push({ ...card, seqid: card.seqid?.toString() || card.id, columnName: columnTitle, columnId });
      }
    }
  };

  // Preferred source: all cards of the board (independente da coluna onde estão)
  if (allCards && allCards.length > 0) {
    allCards.forEach(card => {
      addEventIfVisible(card, card.columnName || 'Sem coluna', card.columnId || '');
    });
  } else {
    columns.forEach(col => {
      col.cards.forEach(card => {
        addEventIfVisible(card, col.title, col.id);
      });
    });
  }

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

      const { isConfirmed, value: targetUserSeqid } = await swalInput({
        title: 'Solicitar Transferência de Atividade',
        input: 'select',
        inputOptions,
        inputPlaceholder: 'Selecione o novo responsável',
        confirmText: 'Solicitar',
        cancelText: 'Cancelar',
        inputValidator: (value: string) => {
          if (!value) return 'Você precisa selecionar um responsável!';
          return null;
        }
      });

      if (targetUserSeqid && isConfirmed) {
        await requestTransferAction(event.id || event.seqid?.toString() || '', targetUserSeqid);
        await swalSuccess('Solicitado!', 'Solicitação de transferência registrada no histórico do evento.');
        router.refresh();
      }
    } catch (err: any) {
      console.error('Erro ao solicitar transferência:', err);
      await swalError('Erro', 'Erro ao solicitar transferência');
    }
  };

  const handleRespondTransfer = async (cardId: string, actionSeqid: string, accept: boolean) => {
    try {
      await respondTransferRequestAction(cardId, actionSeqid, accept);
      await swalSuccess('Sucesso!', accept ? 'Transferência aceita com sucesso.' : 'Transferência recusada.');
      router.refresh();
    } catch (err: any) {
      console.error('Erro ao responder transferência:', err);
      await swalError('Erro', 'Erro ao responder transferência');
    }
  };

  const handleEncerrarAtividade = async () => {
    const isOwner = currentUserRole === 'OWNER';

    if (!isOwner) {
      await requestBoardCompletionAction(boardId);
      await swalSuccess('Solicitação Enviada!', 'O proprietário será notificado para aprovar o encerramento.');
      router.refresh();
      return;
    }

    const confirmed = await swalConfirm(
      'Encerrar Atividade',
      'Tem certeza que deseja encerrar esta atividade? Todos os eventos pendentes serão marcados como concluídos.',
      {
        icon: 'warning',
        confirmColor: '#ef4444',
        confirmText: 'Encerrar',
        cancelText: 'Cancelar'
      }
    );

    if (confirmed) {
      try {
        await completeBoardAction(boardId);
        await swalToast('Atividade Encerrada!', { icon: 'success', timer: 3500 });
        router.refresh();
      } catch (err: any) {
        console.error('Erro ao encerrar atividade:', err);
        await swalError('Erro', err?.message || 'Erro ao encerrar atividade.');
      }
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
        onViewReport={onViewReport}
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
            if (editingEvent.columnId !== newColumnId) {
              onMoveCard(id, editingEvent.columnId, newColumnId);
            }
            router.refresh();
          }}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </div>
  );
}
