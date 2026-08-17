'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useKanban } from '@/hooks/useKanban';
import Board from '@/components/kanban/Board';
import RenameActivityModal from '@/components/modals/RenameActivityModal';
import { updateBoardAction } from '@/app/actions/boardActions';
import DashboardHeader from './DashboardHeader';
import styles from './DashboardClient.module.css';

interface BoardEventsClientProps {
  user: any;
  userSeqid: string;
  activeBoard: any;
  workspaceName: string;
  workspaceId: string;
  workspaceSeqid: string;
  currentUserRole: string;
  viewMode: string;
  from?: string;
}

export default function BoardEventsClient({
  user,
  userSeqid,
  activeBoard,
  workspaceName,
  workspaceId,
  workspaceSeqid,
  currentUserRole,
  viewMode,
  from
}: BoardEventsClientProps) {
  const router = useRouter();
  const { columns, addColumn, addCard, moveCard, copyColumn, deleteColumn, completeCard } = useKanban(
    activeBoard.columns || [],
    activeBoard.id
  );

  const [renameBoardData, setRenameBoardData] = useState<any | null>(null);

  const handleRenameBoard = async (
    boardId: string,
    name: string,
    detalhes?: string | null,
    sectorId?: number | null,
    dtatv?: string | null,
    targetWorkspaceId?: string,
    assignedUserSeqid?: string | null,
    previsto?: string | null
  ) => {
    await updateBoardAction(
      boardId,
      name,
      detalhes !== undefined ? detalhes : null,
      user.id,
      sectorId,
      dtatv,
      targetWorkspaceId,
      assignedUserSeqid,
      previsto
    );
    setRenameBoardData(null);
    router.refresh();
  };

  return (
    <div className={styles.dashboardContainer}>
      <DashboardHeader
        user={{
          name: user.name,
          email: user.email,
          image: user.image || undefined,
        }}
      />
      <div className={styles.workspaceLayout}>
        <main className={styles.boardArea}>
          <div className={styles.boardContent}>
            <Board
        boardName={activeBoard.name}
        boardDetalhes={activeBoard.detalhes}
        workspaceName={workspaceName}
        workspaceId={workspaceId || workspaceSeqid}
        workspaceBoards={[]}
        onCreateBoard={async () => {}}
        boardId={activeBoard.id}
        columns={columns}
        allCards={activeBoard.allCards}
        onAddColumn={addColumn}
        onAddCard={addCard}
        onMoveCard={moveCard}
        onCompleteCard={completeCard}
        onCopyColumn={copyColumn}
        onDeleteColumn={deleteColumn}
        userId={user.id}
        userSeqid={userSeqid}
        currentUserRole={currentUserRole}
        onRenameBoard={() => setRenameBoardData({
          id: activeBoard.id,
          name: activeBoard.name,
          detalhes: activeBoard.detalhes,
          sectorId: activeBoard.sector?.id || activeBoard.sectorId,
          dtatv: activeBoard.dtatv,
          workspaceId: activeBoard.workspaceId,
          user_seqid: activeBoard.user_seqid,
          previsto: activeBoard.previsto
        })}
        viewMode={viewMode}
        boardDtatv={activeBoard.dtatv}
        boardCreatedAt={activeBoard.createdAt}
        boardPrevisto={activeBoard.previsto}
        boardDtcon={activeBoard.dtcon}
        onViewReport={() => {
          router.push(`/dashboard?view=activity-report&boardId=${activeBoard.id}`);
        }}
      />

      {renameBoardData && (
        <RenameActivityModal
          boardId={renameBoardData.id}
          initialName={renameBoardData.name}
          initialDetalhes={renameBoardData.detalhes}
          initialSectorId={renameBoardData.sectorId}
          initialDtatv={renameBoardData.dtatv}
          initialWorkspaceId={renameBoardData.workspaceId}
          initialUserSeqid={renameBoardData.user_seqid}
          initialPrevisto={renameBoardData.previsto}
          sectors={[]}
          workspaces={[]}
          onSubmit={handleRenameBoard}
          onClose={() => setRenameBoardData(null)}
        />
      )}
          </div>
        </main>
      </div>
    </div>
  );
}
