'use client';

import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/shell/DashboardHeader';
import MyEventsView from './MyEventsView';
import styles from '@/components/shell/DashboardClient.module.css';

interface MyEventsPageClientProps {
  events: any[];
  currentUser: { id: string; name: string; email: string; image?: string; seqid?: string };
  userSeqid: string;
  workspaces: any[];
}

export default function MyEventsPageClient({ events, currentUser, userSeqid, workspaces }: MyEventsPageClientProps) {
  const router = useRouter();

  const handleCreateWorkspace = () => {};
  const handleOpenActivityLog = () => {};
  const handleOpenWorkspaceColumns = () => {};
  const handlePanelClick = () => {
    router.push('/dashboard');
  };

  return (
    <div className={styles.dashboardContainer}>
      <DashboardHeader
        user={{ name: currentUser.name, email: currentUser.email, image: currentUser.image }}
        onCreateWorkspace={handleCreateWorkspace}
        onOpenActivityLog={handleOpenActivityLog}
        onOpenWorkspaceColumns={handleOpenWorkspaceColumns}
        onPanelClick={handlePanelClick}
        onMyActivitiesClick={() => router.push('/activities')}
        onMyEventsClick={() => router.push('/dashboard/my-events')}
        onMovementsClick={() => router.push('/dashboard?view=movements')}
        onReportClick={() => router.push('/reports')}
      />
      <div className={styles.workspaceLayout}>
        <main className={styles.boardArea}>
          <div className={styles.boardContent}>
            <MyEventsView
              events={events}
              currentUser={currentUser}
              userSeqid={userSeqid}
              workspaces={workspaces}
              onBack={() => router.push('/dashboard')}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
