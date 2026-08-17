import { getCurrentUserAction, getUserWorkspaces } from '@/app/actions/workspaceActions';
import { getBoardData } from '@/app/actions/boardActions';
import BoardEventsClient from '@/components/shell/BoardEventsClient';
import { redirect, notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; from?: string }>;
}

export default async function BoardEventsPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const boardId = resolvedParams?.id;
  const viewMode = resolvedSearch?.view || 'ongoing';
  const from = resolvedSearch?.from;

  const user = await getCurrentUserAction();
  if (!user) {
    redirect('/api/auth/clear-session');
  }

  const activeBoard = await getBoardData(boardId) as any;
  if (!activeBoard || activeBoard.id !== boardId) {
    notFound();
  }

  // Busca o workspace em modo leve para obter nome e papel do usuário (sem cards)
  const workspaces = await getUserWorkspaces(user.id, user.seqid?.toString(), { lightweight: true }) as any[];
  const activeWorkspace = workspaces.find((w: any) => w.seqid === activeBoard.workspaceId) || null;

  return (
    <BoardEventsClient
      user={user}
      userSeqid={user.seqid?.toString() || ''}
      activeBoard={activeBoard}
      workspaceName={activeWorkspace?.name || ''}
      workspaceId={activeWorkspace?.id || ''}
      workspaceSeqid={activeWorkspace?.seqid || activeBoard.workspaceId}
      currentUserRole={activeWorkspace?.currentUserRole || 'OWNER'}
      viewMode={viewMode}
      from={from}
    />
  );
}
