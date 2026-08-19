'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardHeader from '@/components/shell/DashboardHeader';
import MyActivitiesView from './MyActivitiesView';
import UserMenu from '@/components/shell/UserMenu';
import styles from '@/components/shell/DashboardClient.module.css';

interface ActivitiesPageClientProps {
  workspaces: any[];
  currentUser: { id: string; name: string; email: string; image?: string };
  userSeqid: string;
}

export default function ActivitiesPageClient({
  workspaces,
  currentUser,
  userSeqid
}: ActivitiesPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clientView, setClientView] = useState<'activities' | 'my-events' | 'movements'>('activities');
  const [optimisticWorkspaceId, setOptimisticWorkspaceId] = useState<string | null>(null);
  const [currentBoard, setCurrentBoard] = useState<any>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<any>(null);
  const [isPremiumGridOpen, setIsPremiumGridOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSectorId, setSelectedSectorId] = useState('');
  const [activeWorkspace, setActiveWorkspace] = useState<any>(null);
  const [activeWorkspacePerms, setActiveWorkspacePerms] = useState<any>({ role: 'MEMBER', isAdminOrOwner: false });
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);
  const [pendingCompletionRequests, setPendingCompletionRequests] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [historySidebarBoardId, setHistorySidebarBoardId] = useState<string | null>(null);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isWorkspaceColumnsModalOpen, setIsWorkspaceColumnsModalOpen] = useState(false);
  const [editWorkspaceData, setEditWorkspaceData] = useState<any>(null);
  const [renameBoardData, setRenameBoardData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // Mock para satisfazer o DashboardHeader (não usado nesta página dedicada)
  const handleOpenActivityLog = () => {};
  const handleOpenWorkspaceColumns = () => {};
  const handleCreateWorkspace = () => setIsWorkspaceModalOpen(true);
  const handlePanelClick = () => window.location.href = '/dashboard';

  return (
    <div className={styles.dashboardContainer}>
      <DashboardHeader
        user={{ name: currentUser.name, email: currentUser.email, image: currentUser.image }}
        onCreateWorkspace={handleCreateWorkspace}
        onOpenActivityLog={handleOpenActivityLog}
        onOpenWorkspaceColumns={handleOpenWorkspaceColumns}
        onPanelClick={handlePanelClick}
        onMyActivitiesClick={() => router.push('/activities')}
        onMyEventsClick={() => window.location.href = '/dashboard?view=my-events'}
        onMovementsClick={() => {
          router.push('/dashboard?view=movements');
          setClientView('movements');
        }}
      />

      <div className={styles.workspaceLayout}>
        <main className={styles.boardArea}>
          <div className={styles.boardContent}>
            <MyActivitiesView
              workspaces={workspaces}
              currentUser={currentUser}
              userSeqid={userSeqid}
            />
          </div>
        </main>
      </div>
    </div>
  );
}