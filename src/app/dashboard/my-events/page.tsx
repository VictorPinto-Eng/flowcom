import { getCurrentUserAction, getUserWorkspaces } from '@/app/actions/workspaceActions';
import { getMyEventsAction } from '@/app/actions/cardActions';
import MyEventsPageClient from '@/components/views/MyEventsPageClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function MyEventsPage() {
  const user = await getCurrentUserAction();
  if (!user) {
    redirect('/api/auth/clear-session');
  }

  const [events, workspaces] = await Promise.all([
    getMyEventsAction(),
    getUserWorkspaces(user.id, user.seqid?.toString(), { lightweight: true })
  ]);

  return (
    <MyEventsPageClient
      events={events}
      currentUser={user}
      userSeqid={user.seqid?.toString() || ''}
      workspaces={workspaces}
    />
  );
}
