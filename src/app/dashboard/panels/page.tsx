import { getCurrentUserAction, getUserWorkspaces, getWorkspaceTypes } from '@/app/actions/workspaceActions';
import { getDashboardStatsAction, getWorkspaceCountersAction } from '@/app/actions/dashboardActions';
import { redirect } from 'next/navigation';
import PanelsClient from '@/components/views/PanelsClient';

export const dynamic = 'force-dynamic';

export default async function PanelsPage() {
  const user = await getCurrentUserAction();
  if (!user) {
    redirect('/api/auth/clear-session');
  }

  const workspaces = await getUserWorkspaces(user.id, user.seqid?.toString(), { lightweight: false }) as any;
  const workspaceTypes = await getWorkspaceTypes();
  const [dashboardStats, workspaceCounters] = await Promise.all([
    getDashboardStatsAction(),
    getWorkspaceCountersAction()
  ]);

  return (
    <PanelsClient
      user={user}
      userSeqid={user.seqid?.toString() || ''}
      workspaces={workspaces}
      dashboardStats={dashboardStats}
      workspaceCounters={workspaceCounters}
      workspaceTypes={workspaceTypes}
    />
  );
}