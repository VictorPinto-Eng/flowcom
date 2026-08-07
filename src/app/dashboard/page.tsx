import { getCurrentUserAction, getUserWorkspaces, getWorkspaceTypes } from '@/app/actions/workspaceActions';
import { getBoardData, getSectorsAction } from '@/app/actions/boardActions';
import { getMyEventsAction } from '@/app/actions/cardActions';
import { getDashboardStatsAction, getWorkspaceCountersAction } from '@/app/actions/dashboardActions';
import DashboardClient from '@/components/shell/DashboardClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ boardId?: string; workspaceId?: string; view?: string; success?: string; error?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const boardId = resolvedParams?.boardId;
  const workspaceId = resolvedParams?.workspaceId;
  const viewMode = resolvedParams?.view || 'ongoing';
  const successParam = resolvedParams?.success;
  const errorParam = resolvedParams?.error;

  const user = await getCurrentUserAction();
  if (!user) {
    redirect('/api/auth/clear-session');
  }

  // Full data when: board open, workspace open, or views that need cards (my-activities, kanban)
  const needsFullData = !!boardId || !!workspaceId || viewMode === 'my-activities' || viewMode === 'kanban' || viewMode === 'activity-report';
  const workspaces = await getUserWorkspaces(user.id, user.seqid?.toString(), { lightweight: !needsFullData }) as any;
  const workspaceTypes = await getWorkspaceTypes();
  const sectors = await getSectorsAction();
  const [dashboardStats, workspaceCounters] = await Promise.all([
    getDashboardStatsAction(),
    getWorkspaceCountersAction()
  ]);

  let activeBoard: any = null;
  let activeWorkspace: any = null;
  let myAssignedEvents: any[] = [];

  if (viewMode === 'my-events') {
    myAssignedEvents = await getMyEventsAction();
  } else if (boardId) {
    activeBoard = await getBoardData(boardId) as any;
    if (activeBoard) {
      activeWorkspace = workspaces.find((w: any) => w.seqid === activeBoard.workspaceId);
    }
  } else if (workspaceId) {
    const ws = workspaces.find((w: any) => w.id === workspaceId);
    if (ws) {
      activeWorkspace = ws;
      activeBoard = null;
    }
  } else {
    activeWorkspace = null;
    activeBoard = null;
  }

  return (
    <DashboardClient
      user={user}
      userSeqid={user.seqid?.toString() || ''}
      initialWorkspaces={workspaces}
      workspaceTypes={workspaceTypes}
      activeBoard={activeBoard}
      activeWorkspace={activeWorkspace}
      sectors={sectors}
      viewMode={viewMode}
      initialMyEvents={myAssignedEvents}
      successParam={successParam}
      errorParam={errorParam}
      dashboardStats={dashboardStats}
      workspaceCounters={workspaceCounters}
    />
  );
}
