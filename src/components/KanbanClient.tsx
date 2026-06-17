'use client';

import { useKanban } from '@/hooks/useKanban';
import Board from '@/components/Board';
import { ColumnType } from '@/types/kanban';

interface KanbanClientProps {
  initialColumns: ColumnType[];
  boardId: string;
  boardName: string;
  boardDetalhes?: string | null;
  workspaceName?: string;
  workspaceId: string;
  workspaceBoards?: any[];
  onCreateBoard: (workspaceId: string, name: string) => Promise<void>;
  userId: string;
  userSeqid?: string;
  onRenameBoard?: (boardId: string, name: string) => void;
  viewMode?: string;
  boardDtatv?: string | Date | null;
  boardCreatedAt?: string | Date;
  boardPrevisto?: string | Date | null;
}

export default function KanbanClient({ 
  initialColumns, 
  boardId, 
  boardName, 
  boardDetalhes,
  workspaceName,
  workspaceId,
  workspaceBoards,
  onCreateBoard,
  userId,
  userSeqid = '',
  onRenameBoard,
  viewMode = 'ongoing',
  boardDtatv,
  boardCreatedAt,
  boardPrevisto
}: KanbanClientProps) {
  const { columns, addColumn, addCard, moveCard, copyColumn, deleteColumn, completeCard } = useKanban(initialColumns, boardId);

  return (
    <Board 
      boardName={boardName}
      boardDetalhes={boardDetalhes}
      workspaceName={workspaceName}
      workspaceId={workspaceId}
      workspaceBoards={workspaceBoards}
      onCreateBoard={onCreateBoard}
      boardId={boardId}
      columns={columns} 
      onAddColumn={addColumn} 
      onAddCard={addCard} 
      onMoveCard={moveCard} 
      onCompleteCard={completeCard}
      onCopyColumn={copyColumn}
      onDeleteColumn={deleteColumn}
      userId={userId}
      userSeqid={userSeqid}
      onRenameBoard={onRenameBoard}
      viewMode={viewMode}
      boardDtatv={boardDtatv}
      boardCreatedAt={boardCreatedAt}
      boardPrevisto={boardPrevisto}
    />
  );
}
