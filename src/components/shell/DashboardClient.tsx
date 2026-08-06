'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { CircleCheckBig } from 'lucide-react';
import UserMenu from './UserMenu';
import { KanbanClient } from '../kanban';
import { CreateWorkspaceModal, ActivityReportModal, RenameActivityModal, PremiumWorkspaceGridModal, WorkspaceColumnsModal, EditWorkspaceModal } from '../modals';
import ActivityHistorySidebar from './ActivityHistorySidebar';
import WelcomeDashboard from './WelcomeDashboard';
import { MyEventsView, MovementsView } from '../views';

// Dynamic import for MyActivitiesView (lazy load on route)
const MyActivitiesView = dynamic(() => import('../views/MyActivitiesView'), {
  loading: () => (
    <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      <p>Carregando suas atividades...</p>
    </div>
  ),
  ssr: false
});
import { createWorkspaceAction, updateWorkspaceAction, acceptWorkspaceInviteAction, getPendingInvitesAction, rejectWorkspaceInviteAction } from '@/app/actions/workspaceActions';
import { createBoardAction, updateBoardAction, completeBoardAction, getBoardActivityLogs, requestBoardCompletionAction, respondBoardCompletionAction, getPendingBoardCompletionRequestsAction } from '@/app/actions/boardActions';
import {
  getMyEventsAction,
  updateCardPrevistoAction,
  addCardActionLogAction,
  updateCardActionLogAction,
  deleteCardActionLogAction,
  getWorkspaceMembersAction,
  transferCardAction,
  transferCardWorkspaceAction,
  completeCardDirectlyAction,
  moveCardAction,
  requestTransferAction,
  respondTransferRequestAction,
  getPendingTransferRequestsAction
} from '@/app/actions/cardActions';
import styles from './DashboardClient.module.css';
import { useWorkspacePermissions } from '@/hooks/useWorkspacePermissions';
import { normalizeRole } from '@/types/permissions';

// Dynamic import for SweetAlert2 (lazy load on demand)
const getSwal = async () => {
  const module = await import('sweetalert2');
  return module.default;
};

// Sector pastel coloring map for next-gen premium aesthetic
const getSectorColors = (acronym?: string | null) => {
  if (!acronym) return {};
  const upper = acronym.toUpperCase();
  if (upper === 'JUR') {
    return {
      background: 'rgba(59, 130, 246, 0.07)',
      color: '#60a5fa',
      border: '1px solid rgba(59, 130, 246, 0.18)'
    };
  }
  if (upper === 'FNC') {
    return {
      background: 'rgba(239, 68, 68, 0.07)',
      color: '#f87171',
      border: '1px solid rgba(239, 68, 68, 0.18)'
    };
  }
  if (upper === 'ENG') {
    return {
      background: 'rgba(245, 158, 11, 0.07)',
      color: '#fbbf24',
      border: '1px solid rgba(245, 158, 11, 0.18)'
    };
  }
  return {
    background: 'rgba(139, 92, 246, 0.07)',
    color: '#a78bfa',
    border: '1px solid rgba(139, 92, 246, 0.18)'
  };
};

const getBoardDeadlineStatus = (previsto: string | Date | null | undefined) => {
  if (!previsto) return { label: 'Sem data', className: styles.statusNone };
  
  const dateStr = new Date(previsto).toISOString().split('T')[0];
  const [year, month, day] = dateStr.split('-').map(Number);
  const expectedDate = new Date(year, month - 1, day);
  expectedDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (expectedDate < today) {
    return { label: 'Atrasado', className: styles.statusDanger };
  } else if (expectedDate.getTime() === today.getTime()) {
    return { label: 'Hoje', className: styles.statusWarning };
  } else {
    return { label: 'No prazo', className: styles.statusSuccess };
  }
};

// Type definitions to keep TypeScript happy and clean
interface UserType {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface WorkspaceType {
  id: string;
  name: string;
}

interface SectorType {
  id: number;
  name: string;
  acronym: string;
  active: boolean;
}

interface BoardShort {
  id: string;
  seqId: string;
  name: string;
  detalhes?: string | null;
  dtcon?: string | Date | null;
  dtatv?: string | Date | null;
  createdAt?: string | Date | null;
  columns?: any[];
  workspaceId?: string | number | null;
  user_seqid?: string | null;
  previsto?: string | Date | null;
  user?: {
    id: string;
    seqid?: string;
    name: string;
    email: string;
    image?: string | null;
  } | null;
  sector?: {
    id: number;
    name: string;
    acronym: string;
  } | null;
}

interface WorkspaceWithDetails {
  id: string;
  seqid: string;
  name: string;
  description?: string | null;
  type: {
    name: string;
  };
  boards: BoardShort[];
  columns?: {
    id: string | bigint;
    title: string;
    order: number;
    cards: any[];
  }[];
}

interface ColumnType {
  id: string;
  title: string;
  cards: {
    id: string;
    title: string;
    description: string;
  }[];
}

interface BoardType {
  id: string;
  seqId?: string;
  name: string;
  columns: ColumnType[];
}

interface DashboardClientProps {
  user: UserType;
  userSeqid?: string;
  initialWorkspaces: WorkspaceWithDetails[];
  workspaceTypes: WorkspaceType[];
  activeBoard: any | null;
  activeWorkspace: WorkspaceWithDetails | null;
  sectors: SectorType[];
  viewMode?: string;
  initialMyEvents?: any[];
  successParam?: string;
  errorParam?: string;
  dashboardStats?: any;
  workspaceCounters?: Array<{ workspaceSeqid: string; activeBoards: number; overdueBoards: number; totalEvents: number; overdueEvents: number; completedEvents: number }>;
}

export default function DashboardClient({
  user,
  userSeqid = '',
  initialWorkspaces = [],
  workspaceTypes,
  activeBoard,
  activeWorkspace: serverActiveWorkspace,
  sectors,
  viewMode = 'ongoing',
  initialMyEvents = [],
  successParam,
  errorParam,
  dashboardStats,
  workspaceCounters
}: DashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [workspaces, setWorkspaces] = useState<WorkspaceWithDetails[]>(initialWorkspaces);

  useEffect(() => {
    setWorkspaces(initialWorkspaces);
  }, [initialWorkspaces]);

  const [currentBoard, setCurrentBoard] = useState<any | null>(activeBoard);
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceWithDetails | null>(serverActiveWorkspace);

  useEffect(() => {
    setCurrentBoard(activeBoard);
  }, [activeBoard]);

  useEffect(() => {
    setCurrentWorkspace(serverActiveWorkspace);
  }, [serverActiveWorkspace]);

  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [reportSource, setReportSource] = useState<'FILTERED' | 'COMPLETE' | null>(null);

  // State para controle de visualização no lado do cliente, para uma transição mais suave
  const [clientView, setClientView] = useState(viewMode);
  const [prevViewMode, setPrevViewMode] = useState(viewMode);

  if (viewMode !== prevViewMode) {
    setPrevViewMode(viewMode);
    setClientView(viewMode);
  }

  const [myEvents, setMyEvents] = useState(initialMyEvents);

  useEffect(() => {
    setMyEvents(initialMyEvents);
  }, [initialMyEvents]);

  const [isLoadingMyEvents, setIsLoadingMyEvents] = useState(false);
  const [eventsSort, setEventsSort] = useState<'default' | 'schedule'>('default');

  const [optimisticWorkspaceId, setOptimisticWorkspaceId] = useState<string | null>(null);
  const [renameBoardData, setRenameBoardData] = useState<{ id: string; name: string; detalhes?: string | null; sectorId?: number | null; dtatv?: string | Date | null; workspaceId?: string | number | null; user_seqid?: string | null; previsto?: string | Date | null } | null>(null);
  const [historySidebarBoardId, setHistorySidebarBoardId] = useState<string | null>(null);
  const [editWorkspaceData, setEditWorkspaceData] = useState<any | null>(null);
  const [editWorkspaceTab, setEditWorkspaceTab] = useState<'general' | 'collaborators'>('general');

  const [isWorkspaceColumnsModalOpen, setIsWorkspaceColumnsModalOpen] = useState(false);
  const [isPremiumGridOpen, setIsPremiumGridOpen] = useState(false);
  const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);
  const reportMenuRef = useRef<HTMLDivElement>(null);
  const [selectedWorkspaceColumns, setSelectedWorkspaceColumns] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSectorId, setSelectedSectorId] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);

  useEffect(() => {
    getPendingInvitesAction()
      .then(setPendingInvites)
      .catch(err => console.error('Erro ao buscar convites pendentes:', err));

    getPendingTransferRequestsAction()
      .then(setPendingTransfers)
      .catch(err => console.error('Erro ao buscar transferências pendentes:', err));

    getPendingBoardCompletionRequestsAction()
      .then(setPendingCompletionRequests)
      .catch(err => console.error('Erro ao buscar solicitações de finalização pendentes:', err));
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (reportMenuRef.current && !reportMenuRef.current.contains(event.target as Node)) {
        setIsReportMenuOpen(false);
      }
    }
    if (isReportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isReportMenuOpen]);

  // Controla se o usuário navegou internamente no app (para evitar voltar para outro site)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const viewParam = searchParams.get('view');
      if (!viewParam || (viewParam !== 'my-activities' && viewParam !== 'my-events')) {
        (window as any).__hasInternalNavigation = true;
      }
    }
  }, [searchParams]);

  const handleBack = () => {
    const viewParam = searchParams.get('view');
    // Views acessadas pelo header sempre voltam para o dashboard principal
    if (viewParam === 'my-events' || viewParam === 'my-activities' || viewParam === 'movements') {
      router.push('/dashboard');
    } else if (typeof window !== 'undefined' && (window as any).__hasInternalNavigation) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  };

  // Sincroniza o estado do cliente com a URL (fundamental para lidar com voltar/avançar no Next.js)
  useEffect(() => {
    const viewParam = searchParams.get('view');
    const boardIdParam = searchParams.get('boardId');
    const workspaceIdParam = searchParams.get('workspaceId');
    const sortParam = searchParams.get('sort');

    setClientView(viewParam || viewMode);
    setEventsSort(sortParam === 'schedule' ? 'schedule' : 'default');

    if (boardIdParam) {
      let foundBoard: any = null;
      let foundWorkspace: any = null;
      for (const ws of workspaces) {
        const b = ws.boards?.find((x: any) => x.id === boardIdParam);
        if (b) {
          foundBoard = b;
          foundWorkspace = ws;
          break;
        }
      }
      if (foundBoard) {
        setCurrentBoard(foundBoard);
        setCurrentWorkspace(foundWorkspace);
      }
    } else if (workspaceIdParam) {
      const foundWorkspace = workspaces.find((w: any) => w.id === workspaceIdParam || w.seqid?.toString() === workspaceIdParam);
      if (foundWorkspace) {
        setCurrentWorkspace(foundWorkspace);
      }
      setCurrentBoard(null);
    } else {
      setCurrentWorkspace(null);
      setCurrentBoard(null);
    }
  }, [searchParams, viewMode, workspaces]);

  // Limpa o estado otimista assim que o servidor responder com a navegação finalizada
  useEffect(() => {
    if (serverActiveWorkspace?.id === optimisticWorkspaceId) {
      setOptimisticWorkspaceId(null);
    }
  }, [serverActiveWorkspace?.id, optimisticWorkspaceId]);

  useEffect(() => {
    if (successParam === 'invite-accepted') {
      getSwal().then(Swal => {
        Swal.fire({
          title: 'Convite Aceito!',
          text: 'Você agora faz parte desta área de trabalho.',
          icon: 'success',
          confirmButtonColor: '#7c3aed'
        }).then(() => {
          router.replace('/dashboard');
        });
      });
    } else if (errorParam === 'invite-failed') {
      getSwal().then(Swal => {
        Swal.fire({
          title: 'Erro!',
          text: 'Não foi possível aceitar o convite. O convite pode ter expirado ou já ter sido utilizado.',
          icon: 'error',
          confirmButtonColor: '#ef4444'
        }).then(() => {
          router.replace('/dashboard');
        });
      });
    }
  }, [successParam, errorParam, router]);

  // Workspace ativo final (Otimista para transição instantânea ou o real do servidor)
  const activeWorkspace = optimisticWorkspaceId
    ? (workspaces.find(w => w.id === optimisticWorkspaceId) || currentWorkspace)
    : currentWorkspace;

  // Permissões do workspace ativo (OWNER/ADMIN/MEMBER/VIEWER).
  // Fonte única de verdade para filtros de UI — substitui checagens inline
  // de currentUserRole espalhadas pelo componente. Veja ROADMAP A-002/A-004.
  const activeWorkspacePerms = useWorkspacePermissions(activeWorkspace);

  // Busca os eventos do usuário quando a visualização é alterada no cliente
  useEffect(() => {
    if (clientView === 'my-events' && myEvents.length === 0) {
      setIsLoadingMyEvents(true);
      getMyEventsAction()
        .then(setMyEvents)
        .catch(err => console.error('Erro ao buscar meus eventos:', err))
        .finally(() => setIsLoadingMyEvents(false));
    }
  }, [clientView, myEvents.length, userSeqid]);

  useEffect(() => {
    if (!currentBoard && !activeWorkspace && clientView !== 'my-events') {
      getBoardActivityLogs('ALL')
        .then(logs => {
          setRecentLogs(logs.slice(0, 5));
        })
        .catch(err => console.error('Erro ao buscar logs:', err));
    }
  }, [currentBoard, activeWorkspace, clientView]);

  // Estados para o Kanban da Área (Workspace)
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [newActionText, setNewActionText] = useState('');
  const [isSavingAction, setIsSavingAction] = useState(false);
  const [editingActionSeqid, setEditingActionSeqid] = useState<bigint | null>(null);
  const [editingActionText, setEditingActionText] = useState('');
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);
  const [pendingCompletionRequests, setPendingCompletionRequests] = useState<any[]>([]);

  const [transferModalData, setTransferModalData] = useState<{
    cardId: string;
    cardTitle: string;
    currentTaskUserSeqid: any;
  } | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [selectedTransferUserSeqid, setSelectedTransferUserSeqid] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);

  const [transferWorkspaceModalData, setTransferWorkspaceModalData] = useState<{
    cardId: string;
    cardTitle: string;
    currentWorkspaceSeqid: string;
    currentBoardSeqid: string;
    currentColumnId: string;
  } | null>(null);
  const [selectedWorkspaceSeqid, setSelectedWorkspaceSeqid] = useState<string>('');
  const [selectedBoardSeqid, setSelectedBoardSeqid] = useState<string>('');
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');
  const [isTransferringWorkspace, setIsTransferringWorkspace] = useState(false);
  const [isCompletingEvent, setIsCompletingEvent] = useState<string | null>(null);
  const [isDraggingCard, setIsDraggingCard] = useState<{ id: string; sourceColId: string } | null>(null);

  const handlePrevistoChange = async (cardId: string, val: string) => {
    try {
      await updateCardPrevistoAction(cardId, val ? val : null);
      router.refresh();
    } catch (err) {
      console.error('Erro ao atualizar data prevista:', err);
    }
  };

  // Drag and Drop handlers for Workspace Kanban
  const handleCardDragStart = (cardId: string, sourceColId: string, e: React.DragEvent) => {
    setIsDraggingCard({ id: cardId, sourceColId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDrop = async (targetColId: string, e: React.DragEvent) => {
    e.preventDefault();
    if (isDraggingCard && isDraggingCard.id) {
      try {
        await moveCardAction(isDraggingCard.id, targetColId);
        router.refresh();
      } catch (err) {
        console.error('Erro ao mover card:', err);
      } finally {
        setIsDraggingCard(null);
      }
    }
  };

  const handleColumnDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleAddAction = async () => {
    if (!newActionText.trim() || !selectedEvent) return;
    setIsSavingAction(true);
    try {
      const savedAction = await addCardActionLogAction(selectedEvent.seqid, newActionText.trim());
      setSelectedEvent({
        ...selectedEvent,
        card_act: [savedAction, ...(selectedEvent.card_act || [])]
      });
      setNewActionText('');
      router.refresh();
    } catch (err) {
      console.error('Erro ao salvar andamento:', err);
    } finally {
      setIsSavingAction(false);
    }
  };

  const handleEditActionSubmit = async (actionSeqid: bigint) => {
    if (!editingActionText.trim()) return;
    try {
      const updatedAction = await updateCardActionLogAction(actionSeqid.toString(), editingActionText.trim());
      setEditingActionSeqid(null);
      setEditingActionText('');

      if (selectedEvent) {
        setSelectedEvent({
          ...selectedEvent,
          card_act: selectedEvent.card_act.map((a: any) =>
            a.seqid.toString() === actionSeqid.toString() ? { ...a, description: updatedAction.description } : a
          )
        });
      }
      router.refresh();
    } catch (err) {
      console.error('Erro ao editar andamento:', err);
    }
  };

  const handleDeleteAction = async (actionSeqid: bigint) => {
    const Swal = await getSwal();
    const result = await Swal.fire({
      title: 'Excluir Andamento',
      html: '<p style="font-size: 0.9rem; color: #94a3b8; margin: 0;">Esta ação não poderá ser desfeita.</p>',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: 'transparent',
      confirmButtonText: '✓ Excluir',
      cancelButtonText: 'Cancelar',
      background: '#1e1e2e',
      color: '#fff',
      width: '360px',
      padding: '1.5rem',
      backdrop: 'rgba(0,0,0,0.6)'
    });
    if (!result.isConfirmed) return;
    try {
      await deleteCardActionLogAction(actionSeqid.toString());
      if (selectedEvent) {
        setSelectedEvent({
          ...selectedEvent,
          card_act: selectedEvent.card_act.filter((a: any) => a.seqid.toString() !== actionSeqid.toString())
        });
      }
      router.refresh();
    } catch (err) {
      console.error('Erro ao excluir andamento:', err);
    }
  };

  const handleOpenTransferModal = async (event: any) => {
    try {
      const workspaceSeqid = event.column?.workspaceSeqid?.toString() || event.column?.workspace?.seqid?.toString() || event.board?.workspaceId?.toString() || event.board?.workspace?.seqid?.toString() || '';
      const users = await getWorkspaceMembersAction(workspaceSeqid);
      setUsersList(users);
      setSelectedTransferUserSeqid(event.taskuser_seqid ? event.taskuser_seqid.toString() : '');
      setTransferModalData({
        cardId: event.id,
        cardTitle: event.title,
        currentTaskUserSeqid: event.taskuser_seqid
      });
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferModalData) return;

    setIsTransferring(true);
    try {
      await transferCardAction(transferModalData.cardId, selectedTransferUserSeqid || null);
      setTransferModalData(null);
      router.refresh();
    } catch (err) {
      console.error('Erro ao transferir atividade:', err);
    } finally {
      setIsTransferring(false);
    }
  };

  const handleOpenTransferWorkspaceModal = (event: any) => {
    const workspaceSeqid = event.column?.workspaceSeqid?.toString() || event.column?.workspace?.seqid?.toString() || event.board?.workspaceId?.toString() || event.board?.workspace?.seqid?.toString() || '';
    const boardSeqid = event.board_seqid?.toString() || event.board?.seqId?.toString() || '';
    const columnId = event.columnId?.toString() || event.column?.seqid?.toString() || '';

    setSelectedWorkspaceSeqid(workspaceSeqid);
    setSelectedBoardSeqid(boardSeqid);
    setSelectedColumnId(columnId);

    setTransferWorkspaceModalData({
      cardId: event.id,
      cardTitle: event.title,
      currentWorkspaceSeqid: workspaceSeqid,
      currentBoardSeqid: boardSeqid,
      currentColumnId: columnId,
    });
  };

  const handleTransferWorkspaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferWorkspaceModalData) return;

    setIsTransferringWorkspace(true);
    try {
      await transferCardWorkspaceAction(
        transferWorkspaceModalData.cardId,
        selectedWorkspaceSeqid,
        selectedBoardSeqid,
        selectedColumnId
      );
      setTransferWorkspaceModalData(null);
      router.refresh();
    } catch (err) {
      console.error('Erro ao transferir atividade:', err);
    } finally {
      setIsTransferringWorkspace(false);
    }
  };

  const handleRespondTransfer = async (cardId: string, actionSeqid: string, accept: boolean) => {
    const Swal = await getSwal();
    try {
      await respondTransferRequestAction(cardId, actionSeqid, accept);
      await Swal.fire({
        title: 'Sucesso!',
        text: accept ? 'Transferência aceita com sucesso.' : 'Transferência recusada.',
        icon: 'success',
        confirmButtonColor: '#7c3aed'
      });
      setPendingTransfers(prev => prev.filter(x => x.seqid !== actionSeqid));
      router.refresh();
      if (selectedEvent && selectedEvent.seqid.toString() === cardId.toString()) {
        setSelectedEvent(null);
      }
    } catch (err: any) {
      console.error('Erro ao responder transferência:', err);
      await Swal.fire('Erro', 'Erro ao responder transferência', 'error');
    }
  };

  const handleRespondBoardCompletion = async (boardId: string, logSeqid: string, accept: boolean) => {
    const Swal = await getSwal();
    try {
      await respondBoardCompletionAction(boardId, logSeqid, accept);
      await Swal.fire({
        title: 'Sucesso!',
        text: accept ? 'Atividade finalizada e encerrada.' : 'Solicitação recusada.',
        icon: 'success',
        confirmButtonColor: '#7c3aed'
      });
      setPendingCompletionRequests(prev => prev.filter(x => x.seqid !== logSeqid));
      router.refresh();
    } catch (err: any) {
      console.error('Erro ao responder finalização:', err);
      await Swal.fire('Erro', 'Erro ao processar solicitação', 'error');
    }
  };

  const handleAdminTransferRequest = async (event: any) => {
    const Swal = await getSwal();
    try {
      const workspaceSeqid = activeWorkspace?.seqid?.toString() || '';
      const members = await getWorkspaceMembersAction(workspaceSeqid);

      const inputOptions: { [key: string]: string } = {};
      members.forEach((m: any) => {
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
        await requestTransferAction(event.id || event.seqid.toString(), targetUserSeqid);
        await Swal.fire({
          title: 'Solicitado!',
          text: 'Solicitação de transferência registrada no histórico do evento.',
          icon: 'success',
          confirmButtonColor: '#7c3aed'
        });
        router.refresh();
        if (selectedEvent && selectedEvent.id === event.id) {
          setSelectedEvent(null);
        }
      }
    } catch (err: any) {
      console.error('Erro ao solicitar transferência:', err);
      await Swal.fire('Erro', 'Erro ao solicitar transferência', 'error');
    }
  };

  const handleCompleteEvent = async (card: any) => {
    if (isCompletingEvent) return;
    const Swal = await getSwal();

    // Confirmação antes de executar
    const result = await Swal.fire({
      title: 'Concluir Evento?',
      html: `<p style="font-size: 0.9rem; color: #94a3b8; margin: 0;">Deseja marcar "${card.title}" como concluído?</p>`,
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: 'transparent',
      confirmButtonText: '✓ Concluir',
      cancelButtonText: 'Cancelar',
      background: '#1e1e2e',
      color: '#fff',
      width: '360px',
      padding: '1.5rem',
      backdrop: 'rgba(0,0,0,0.6)'
    });

    if (!result.isConfirmed) return;

    setIsCompletingEvent(card.id);

    const localDate = new Date();
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const localDateStr = `${year}-${month}-${day}`;

    try {
      await completeCardDirectlyAction(card.id, localDateStr);
      await Swal.fire({
        title: 'Sucesso!',
        text: 'Evento finalizado com sucesso.',
        icon: 'success',
        confirmButtonColor: '#7c3aed'
      });
      router.refresh();
    } catch (err) {
      console.error('Erro ao finalizar evento:', err);
      await Swal.fire({
        title: 'Erro!',
        text: 'Não foi possível finalizar o evento.',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setIsCompletingEvent(null);
    }
  };


  // Restore search term and sector filter from sessionStorage keyed by workspace ID to ensure smooth back-button transitions
  useEffect(() => {
    if (typeof window !== 'undefined' && activeWorkspace?.id) {
      const savedSearch = sessionStorage.getItem(`flowcom_quicksearch_${activeWorkspace.id}`) || '';
      setSearchTerm(savedSearch);
      const savedSector = sessionStorage.getItem(`flowcom_sectorfilter_${activeWorkspace.id}`) || '';
      setSelectedSectorId(savedSector);
    }
  }, [activeWorkspace?.id]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (typeof window !== 'undefined' && activeWorkspace?.id) {
      sessionStorage.setItem(`flowcom_quicksearch_${activeWorkspace.id}`, value);
    }
  };

  const handleSectorFilterChange = (value: string) => {
    setSelectedSectorId(value);
    if (typeof window !== 'undefined' && activeWorkspace?.id) {
      sessionStorage.setItem(`flowcom_sectorfilter_${activeWorkspace.id}`, value);
    }
  };

  const handleCreateWorkspace = async (data: { name: string; typeId: string; description: string }) => {
    const Swal = await getSwal();
    try {
      const workspace = await createWorkspaceAction({
        name: data.name,
        typeId: data.typeId,
        description: data.description,
      });
      setIsWorkspaceModalOpen(false);
      await Swal.fire({
        title: 'Sucesso!',
        text: 'Área de trabalho criada com sucesso.',
        icon: 'success',
        confirmButtonColor: '#7c3aed'
      });
      window.location.href = `/dashboard?workspaceId=${workspace.id}`;
    } catch (error) {
      console.error('Falha ao criar área de trabalho:', error);
      await Swal.fire({
        title: 'Erro!',
        text: 'Não foi possível criar a área de trabalho.',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  const handleUpdateWorkspace = async (data: { name: string, typeId: string, description: string }) => {
    if (!editWorkspaceData) return;
    const Swal = await getSwal();
    try {
      await updateWorkspaceAction(editWorkspaceData.id, data);

      setWorkspaces(prevWorkspaces => {
        return prevWorkspaces.map(ws => {
          if (ws.id === editWorkspaceData.id) {
            return {
              ...ws,
              name: data.name,
              description: data.description
            };
          }
          return ws;
        });
      });

      setEditWorkspaceData(null);
      await Swal.fire({
        title: 'Atualizada!',
        text: 'A Área de Trabalho foi atualizada com sucesso.',
        icon: 'success',
        confirmButtonColor: '#7c3aed'
      });
      router.refresh();
    } catch (error: any) {
      console.error('Falha ao atualizar área de trabalho:', error);
      await Swal.fire({
        title: 'Erro!',
        text: 'Erro ao atualizar área de trabalho.',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  const handleAcceptInvite = async (token: string) => {
    const Swal = await getSwal();
    try {
      await acceptWorkspaceInviteAction(token);
      await Swal.fire({
        title: 'Sucesso!',
        text: 'Você agora faz parte desta área de trabalho.',
        icon: 'success',
        confirmButtonColor: '#7c3aed'
      });
      window.location.reload();
    } catch (err: any) {
      console.error('Erro ao aceitar convite:', err);
      await Swal.fire({
        title: 'Erro!',
        text: 'Não foi possível aceitar o convite.',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  const handleCreateBoard = async (workspaceId: string, name: string, sectorId?: number, detalhes?: string, dtatv?: string, previsto?: string) => {
    const Swal = await getSwal();
    try {
      const newBoard = await createBoardAction(workspaceId, name, user.id, sectorId, detalhes, dtatv, previsto);
      await Swal.fire({
        title: 'Atividade Criada!',
        text: `A atividade "${name}" foi criada com sucesso.`,
        icon: 'success',
        confirmButtonColor: '#7c3aed'
      });
      window.location.href = `/dashboard?boardId=${newBoard.id}`;
    } catch (error) {
      console.error('Falha ao criar quadro:', error);
      await Swal.fire({
        title: 'Erro!',
        text: 'Não foi possível criar a atividade.',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  const handleRenameBoard = async (boardId: string, name: string, detalhes?: string | null, sectorId?: number | null, dtatv?: string | null, workspaceId?: string, assignedUserSeqid?: string | null, previsto?: string | null) => {
    const Swal = await getSwal();
    try {
      await updateBoardAction(boardId, name, detalhes !== undefined ? detalhes : null, user.id, sectorId, dtatv, workspaceId, assignedUserSeqid, previsto);
      
      setWorkspaces(prevWorkspaces => {
        const selectedSector = sectorId ? sectors.find(s => s.id === sectorId) : null;
        let boardToMove: any = null;

        const updatedWorkspaces = prevWorkspaces.map(workspace => {
          const board = workspace.boards?.find(b => b.id === boardId);
          if (board) {
            boardToMove = {
              ...board,
              name,
              detalhes: detalhes !== undefined ? detalhes : null,
              dtatv: dtatv ? new Date(dtatv) : null,
              previsto: previsto ? new Date(previsto) : null,
              sector: selectedSector ? {
                id: selectedSector.id,
                name: selectedSector.name,
                acronym: selectedSector.acronym
              } : null,
              workspaceId: workspaceId || board.workspaceId,
              user_seqid: assignedUserSeqid !== undefined ? assignedUserSeqid : board.user_seqid
            };
            return {
              ...workspace,
              boards: workspace.boards.filter(b => b.id !== boardId)
            };
          }
          return workspace;
        });

        if (boardToMove) {
          return updatedWorkspaces.map(workspace => {
            const isTargetWorkspace = workspaceId 
              ? workspace.seqid.toString() === workspaceId.toString()
              : prevWorkspaces.find(w => w.boards?.some(b => b.id === boardId))?.id === workspace.id;

            if (isTargetWorkspace) {
              const filteredBoards = workspace.boards?.filter(b => b.id !== boardId) || [];
              return {
                ...workspace,
                boards: [...filteredBoards, boardToMove]
              };
            }
            return workspace;
          });
        }

        return prevWorkspaces;
      });

      setRenameBoardData(null);
      Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
        background: '#ffffff',
        color: '#0f172a',
        iconColor: '#7c3aed',
        customClass: {
          popup: 'glass',
        },
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', Swal.stopTimer);
          toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
      }).fire({
        icon: 'success',
        title: 'Atividade atualizada com sucesso!'
      }).then(() => {
        router.refresh();
      });
    } catch (error: any) {
      console.error('Falha ao renomear quadro:', error);
      Swal.fire({
        title: 'Erro!',
        text: 'Não foi possível atualizar a atividade.',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  const handleCompleteBoard = async (boardId: string, boardName: string) => {
    const Swal = await getSwal();
    const boardWorkspace = workspaces.find(ws => ws.boards?.some(b => b.id === boardId));
    // Reaproveita a permissão calculada para o workspace dono do board.
    // Quando o board está no workspace ativo, equivale a activeWorkspacePerms.
    const boardRole = (boardWorkspace as { currentUserRole?: string } | undefined)?.currentUserRole
      ?? (activeWorkspace as { currentUserRole?: string } | undefined)?.currentUserRole;
    const isOwner = normalizeRole(boardRole) === 'OWNER';

    // Contar cards pendentes para melhorar a confirmação
    let pendingCardsCount = 0;
    try {
      const { getBoardPendingCardsCountAction } = await import('@/app/actions/boardActions');
      pendingCardsCount = await getBoardPendingCardsCountAction(boardId);
    } catch (err) {
      console.error('Erro ao contar cards pendentes:', err);
    }

    if (!isOwner) {
      const result = await Swal.fire({
        title: 'Solicitar Encerramento?',
        text: `Deseja enviar uma solicitação de finalização para o Proprietário encerrar a atividade "${boardName}"?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#7c3aed',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sim, solicitar!',
        cancelButtonText: 'Cancelar'
      });

      if (result.isConfirmed) {
        try {
          await requestBoardCompletionAction(boardId);
          await Swal.fire({
            title: 'Solicitado!',
            text: 'A solicitação de finalização foi enviada ao proprietário da atividade.',
            icon: 'success',
            confirmButtonColor: '#7c3aed'
          });
          router.refresh();
        } catch (error: any) {
          await Swal.fire('Erro', 'Erro ao solicitar finalização', 'error');
        }
      }
      return;
    }

    const cardMsg = pendingCardsCount > 0
      ? `Esta ação irá marcar <strong>${pendingCardsCount} evento${pendingCardsCount !== 1 ? 's' : ''} pendente${pendingCardsCount !== 1 ? 's' : ''}</strong> como concluído${pendingCardsCount !== 1 ? 's' : ''}.`
      : 'Nenhum evento pendente será afetado.';

    const result = await Swal.fire({
      title: 'Encerrar Atividade?',
      html: `<p style="margin-bottom:0.75rem;">Deseja realmente encerrar a atividade <strong>"${boardName}"</strong>?</p><p style="font-size:0.9rem;color:#f87171;">${cardMsg}</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: pendingCardsCount > 0 ? `Sim, encerrar (${pendingCardsCount} eventos)` : 'Sim, encerrar!',
      cancelButtonText: 'Cancelar',
      background: '#1a1a1a',
      color: '#fff'
    });

    if (result.isConfirmed) {
      const localDate = new Date();
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, '0');
      const day = String(localDate.getDate()).padStart(2, '0');
      const localDateStr = `${year}-${month}-${day}`;

      try {
        await completeBoardAction(boardId, localDateStr);
        
        setWorkspaces(prevWorkspaces => {
          return prevWorkspaces.map(workspace => {
            const hasBoard = workspace.boards?.some(b => b.id === boardId);
            if (!hasBoard) return workspace;
            
            return {
              ...workspace,
              boards: workspace.boards.map(b => {
                if (b.id === boardId) {
                  return { ...b, dtcon: new Date() };
                }
                return b;
              })
            };
          });
        });

        await Swal.fire({
          title: 'Encerrada!',
          text: 'A atividade foi concluída com sucesso.',
          icon: 'success',
          confirmButtonColor: '#7c3aed'
        });
        router.refresh();
      } catch (error: any) {
        console.error('Falha ao encerrar quadro:', error);
        await Swal.fire({
          title: 'Erro!',
          text: 'Erro ao encerrar atividade.',
          icon: 'error',
          confirmButtonColor: '#ef4444'
        });
      }
    }
  };

  const activeWorkspaceBoards = activeWorkspace?.boards || [];
  const ongoingBoards = activeWorkspaceBoards.filter(b => !b.dtcon);

  const filteredBoards = ongoingBoards.filter(board => {
    // 1. Sector filter
    if (selectedSectorId && board.sector?.id?.toString() !== selectedSectorId) {
      return false;
    }

    // 2. Role-based filter: MEMBER users only see their own boards
    if (!activeWorkspacePerms.isAdminOrOwner) {
      const isCreator = board.user?.id === user.id;
      const isAssigned = board.columns?.some((col: any) =>
        col.cards?.some((card: any) =>
          card.task_user?.id === user.id || card.user?.id === user.id
        )
      );
      if (!isCreator && !isAssigned) return false;
    }

    // 3. Date range filter
    if (filterDateStart || filterDateEnd) {
      const d = board.previsto ? new Date(board.previsto).getTime() : 0;
      if (!d) return false;
      if (filterDateStart && d < new Date(filterDateStart).getTime()) return false;
      if (filterDateEnd && d > new Date(filterDateEnd).getTime()) return false;
    }

    // 4. Search query filter
    if (!searchTerm) return true;
    const lowerSearch = searchTerm.toLowerCase();

    const matchesSeqId = board.seqId?.toString().toLowerCase().includes(lowerSearch);
    const matchesName = board.name?.toLowerCase().includes(lowerSearch);
    const matchesCreator = board.user?.name?.toLowerCase().includes(lowerSearch) ||
      (!board.user?.name && "victor pinto".includes(lowerSearch));
    const matchesSector = board.sector?.name?.toLowerCase().includes(lowerSearch) ||
      board.sector?.acronym?.toLowerCase().includes(lowerSearch);

    return matchesSeqId || matchesName || matchesCreator || matchesSector;
  });

  const sortedBoards = [...filteredBoards].sort((a, b) => {
    const timeA = a.previsto ? new Date(a.previsto).getTime() : Infinity;
    const timeB = b.previsto ? new Date(b.previsto).getTime() : Infinity;
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    const seqA = a.seqId ? parseInt(a.seqId) || 0 : 0;
    const seqB = b.seqId ? parseInt(b.seqId) || 0 : 0;
    return seqA - seqB;
  });

  return (
    <div className={styles.dashboardContainer}>
      <header className={`${styles.header} glass`}>
        <Link
          href="/dashboard"
          className={styles.logo}
          onClick={(e) => {
            e.preventDefault();
            window.location.href = '/dashboard';
          }}
        >
          <span>FLOW</span>
        </Link>
        <div className={styles.userSection}>
          <button
            className={styles.panelTrigger}
            onClick={() => {
              router.push('/dashboard');
              setClientView('ongoing');
              setOptimisticWorkspaceId(null);
              setSearchTerm('');
              setSelectedSectorId('');
              setCurrentBoard(null);
              setCurrentWorkspace(null);
              setIsPremiumGridOpen(true);
            }}
            title="Visualizar Painel de Atividades por Área de Trabalho"
          >
            🧩 Painel
          </button>
          <button
            className={styles.myActivitiesTrigger}
            onClick={() => {
              router.push('/dashboard?view=my-activities');
            }}
            title="Listagem de todas as atividades sob sua responsabilidade ordenada por agendamento"
          >
            📅 Minhas Atividades
          </button>
          <button
            className={styles.myEventsTrigger}
            onClick={() => {
              router.push('/dashboard?view=my-events');
            }}
            title="Listagem de todos eventos em andamento sob responsabilidade direta do seu usuário"
          >
            📋 Meus Eventos
          </button>
          <div className={styles.reportDropdown} ref={reportMenuRef}>
            <button
              className={styles.reportDropdownTrigger}
              onClick={() => setIsReportMenuOpen(!isReportMenuOpen)}
              title="Relatórios"
            >
              📊 Relatório
            </button>
            {isReportMenuOpen && (
              <div className={styles.reportDropdownMenu}>
                <button
                  className={styles.reportDropdownItem}
                  onClick={() => {
                    router.push('/dashboard?view=movements');
                    setClientView('movements');
                    setIsReportMenuOpen(false);
                  }}
                >
                  <span>📊 Movimentações</span>
                  <span className={styles.reportDropdownHint}>Auditoria e Histórico</span>
                </button>
                <button
                  className={styles.reportDropdownItem}
                  onClick={() => {
                    router.push('/reports');
                    setIsReportMenuOpen(false);
                  }}
                >
                  <span>📋 Relatório Geral</span>
                  <span className={styles.reportDropdownHint}>Consolidado por área</span>
                </button>
              </div>
            )}
          </div>
          <UserMenu
            user={{
              name: user.name,
              email: user.email,
              image: user.image || undefined,
            }}
            onCreateWorkspace={() => setIsWorkspaceModalOpen(true)}
            onOpenActivityLog={() => setHistorySidebarBoardId('ALL')}
            onOpenWorkspaceColumns={() => setIsWorkspaceColumnsModalOpen(true)}
          />
        </div>
      </header>

      <div className={styles.workspaceLayout}>
        <main className={styles.boardArea}>
          <div className={styles.boardContent}>
            {pendingTransfers.length > 0 && pendingTransfers.map((req) => (
              <div key={req.seqid} className={styles.inviteBanner} style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.05))',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '1.8rem' }}>🔄</span>
                  <div>
                    <h4 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 600 }}>
                      Solicitação de Transferência de Evento
                    </h4>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.88rem' }}>
                      Foi solicitada a transferência do evento <strong>{req.cardTitle}</strong> (Área: <strong>{req.workspaceName}</strong>) para você.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => handleRespondTransfer(req.cardSeqid, req.seqid, true)}
                    style={{
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    Aceitar
                  </button>
                  <button
                    onClick={() => handleRespondTransfer(req.cardSeqid, req.seqid, false)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    Recusar
                  </button>
                </div>
              </div>
            ))}

            {pendingCompletionRequests.length > 0 && pendingCompletionRequests.map((req) => (
              <div key={req.seqid} className={styles.inviteBanner} style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05))',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '1.8rem' }}>🔒</span>
                  <div>
                    <h4 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 600 }}>
                      Solicitação de Encerramento de Atividade
                    </h4>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.88rem' }}>
                      Solicitado o encerramento da atividade <strong>{req.boardName}</strong> (Área: <strong>{req.workspaceName}</strong>).
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => handleRespondBoardCompletion(req.boardId, req.seqid, true)}
                    style={{
                      background: '#d97706',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    Autorizar
                  </button>
                  <button
                    onClick={() => handleRespondBoardCompletion(req.boardId, req.seqid, false)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    Recusar
                  </button>
                </div>
              </div>
            ))}

            {pendingInvites.length > 0 && pendingInvites.map((invite) => (
              <div key={invite.token} className={styles.inviteBanner} style={{
                background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(139, 92, 246, 0.05))',
                border: '1px solid rgba(124, 58, 237, 0.3)',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '1.8rem' }}>✉️</span>
                  <div>
                    <h4 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 600 }}>
                      Convite para Área de Trabalho
                    </h4>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.88rem' }}>
                      <strong>{invite.invitedByName}</strong> convidou você para participar da área de trabalho <strong>{invite.workspaceName}</strong>.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={async () => {
                      const Swal = await getSwal();
                      try {
                        await acceptWorkspaceInviteAction(invite.token);
                        await Swal.fire({
                          title: 'Sucesso!',
                          text: `Você agora faz parte da área de trabalho ${invite.workspaceName}.`,
                          icon: 'success',
                          confirmButtonColor: '#7c3aed'
                        });
                        window.location.reload();
                      } catch (err: any) {
                        await Swal.fire('Erro', 'Erro ao aceitar convite', 'error');
                      }
                    }}
                    style={{
                      background: '#7c3aed',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      transition: 'background 0.2s'
                    }}
                  >
                    Aceitar
                  </button>
                  <button
                    onClick={async () => {
                      const Swal = await getSwal();
                      const result = await Swal.fire({
                        title: 'Recusar Convite',
                        text: `Tem certeza que deseja recusar o convite para a área ${invite.workspaceName}?`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Sim, recusar',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#ef4444',
                        cancelButtonColor: '#6b7280'
                      });
                      if (result.isConfirmed) {
                        try {
                          await rejectWorkspaceInviteAction(invite.token);
                          setPendingInvites(prev => prev.filter(x => x.token !== invite.token));
                          await Swal.fire('Recusado', 'O convite foi recusado com sucesso.', 'success');
                        } catch (err: any) {
                          await Swal.fire('Erro', 'Erro ao recusar convite', 'error');
                        }
                      }
                    }}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      transition: 'background 0.2s'
                    }}
                  >
                    Recusar
                  </button>
                </div>
              </div>
            ))}
            {currentBoard && clientView !== 'my-events' && clientView !== 'my-activities' ? (
              <KanbanClient
                initialColumns={currentBoard.columns}
                boardId={currentBoard.id}
                boardName={currentBoard.name}
                boardDetalhes={currentBoard.detalhes}
                workspaceName={activeWorkspace?.name || undefined}
                workspaceId={activeWorkspace?.id || ''}
                workspaceBoards={activeWorkspace?.boards || []}
                onCreateBoard={handleCreateBoard}
                userId={user.id}
                userSeqid={userSeqid}
                currentUserRole={activeWorkspacePerms.role}
                onRenameBoard={() => setRenameBoardData({
                  id: currentBoard.id,
                  name: currentBoard.name,
                  detalhes: currentBoard.detalhes,
                  sectorId: currentBoard.sector?.id || currentBoard.sectorId,
                  dtatv: currentBoard.dtatv,
                  workspaceId: activeWorkspace?.seqid || currentBoard.workspaceId,
                  user_seqid: currentBoard.user_seqid,
                  previsto: currentBoard.previsto
                })}
                viewMode={viewMode}
                boardDtatv={currentBoard.dtatv}
                boardCreatedAt={currentBoard.createdAt}
                boardPrevisto={currentBoard.previsto}
                boardDtcon={currentBoard.dtcon}
              />
            ) : activeWorkspace && clientView === 'kanban' ? (
              <div className={styles.workspaceOverview}>
                <div className={styles.workspaceOverviewHeader}>
                  <div className={styles.workspaceOverviewMeta} style={{ justifyContent: 'space-between', width: '100%' }}>
                    <span className={styles.workspaceBadge}>{activeWorkspace.type.name}</span>
                    <button
                      onClick={() => {
                        setOptimisticWorkspaceId(null);
                        router.back();
                      }}
                      className={styles.backToTableBtn}
                      title="Voltar para a tela anterior"
                    >
                      ‹ Voltar
                    </button>
                  </div>
                  <h2 className={styles.workspaceOverviewTitle}>{activeWorkspace.name}</h2>
                  {activeWorkspace.description && (
                    <p className={styles.workspaceOverviewDescription}>{activeWorkspace.description}</p>
                  )}
                  {activeWorkspacePerms.isAdminOrOwner && (
                    <div className={styles.workspaceKanbanActions}>
                      <button
                        className={styles.kanbanActionBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Navega para a página dedicada em _self.
                          // Alinhado com o restante da aplicação (páginas > modais/Swal).
                          window.location.href = `/dashboard/activity/new?workspaceId=${activeWorkspace.id}`;
                        }}
                        title="Criar Novo Kanban/Quadro nesta Área"
                      >
                        ➕ Novo Fluxo
                      </button>
                      <button
                        className={styles.kanbanActionBtn}
                        onClick={() => {
                          setSelectedWorkspaceColumns(activeWorkspace);
                          setIsWorkspaceColumnsModalOpen(true);
                        }}
                        title="Configurar Colunas Kanban"
                      >
                        ⚙️ Colunas
                      </button>
                    </div>
                  )}
                </div>

                <div className={styles.kanbanBoard}>
                  {activeWorkspace.columns?.map((col: any) => {
                    const colCards = col.cards || [];
                    return (
                      <div key={col.id} className={`${styles.kanbanColumn} ${isDraggingCard ? styles.kanbanColumnDropTarget : ''}`}
                        onDrop={(e) => handleColumnDrop(col.id.toString(), e)}
                        onDragOver={handleColumnDragOver}
                      >
                        <div className={styles.kanbanColumnHeader}>
                          <h4 className={styles.kanbanColumnTitle}>{col.title}</h4>
                          <span className={styles.kanbanColumnBadge}>{colCards.length}</span>
                        </div>
                        <div className={styles.kanbanCardsList}>
                          {colCards.length === 0 ? (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', padding: '1rem 0', textAlign: 'center' }}>
                              Nenhum card
                            </div>
                          ) : (
                            colCards
                              .filter((card: any) => {
                                if (activeWorkspacePerms.isAdminOrOwner) return true;
                                return card.user?.id === user.id || card.task_user?.id === user.id;
                              })
                              .map((card: any) => {
                              let statusType = 'normal'; // 'danger', 'warning', 'success', 'normal'
                              if (card.previsto) {
                                const dateStr = new Date(card.previsto).toISOString().split('T')[0];
                                const [year, month, day] = dateStr.split('-').map(Number);
                                const expectedDate = new Date(year, month - 1, day);
                                expectedDate.setHours(0, 0, 0, 0);

                                const today = new Date();
                                today.setHours(0, 0, 0, 0);

                                if (card.dtcon) {
                                  statusType = 'success';
                                } else if (expectedDate < today) {
                                  statusType = 'danger';
                                } else if (expectedDate.getTime() === today.getTime()) {
                                  statusType = 'warning';
                                }
                              }

                              const isAssignedToMe = userSeqid && card.taskuser_seqid && card.taskuser_seqid.toString() === userSeqid;
                              const assignedUserName = card.task_user?.name || 'Não atribuído';

                              // Find the board name for this card
                              const cardBoard = activeWorkspace.boards?.find((b: any) => b.id === card.board_seqid);
                              const boardName = cardBoard ? cardBoard.name : 'Atividade';

                              return (
                                <div
                                  key={card.id}
                                  className={`${styles.kanbanCard} ${styles[statusType] || ''}`}
                                  draggable
                                  onDragStart={(e) => handleCardDragStart(card.id.toString(), col.id.toString(), e)}
                                  onDragEnd={() => setIsDraggingCard(null)}
                                >
                                  <div className={styles.kanbanCardTop}>
                                    <span
                                      className={styles.kanbanCardBoardTag}
                                      onClick={() => handleOpenTransferWorkspaceModal(card)}
                                      title="Transferir de Área / Atividade"
                                    >
                                      📂 {boardName}
                                    </span>
                                    {card.dtcon && <span className={styles.kanbanCardDoneTag}>✓ Concluído</span>}
                                  </div>
                                  <h5 className={styles.kanbanCardTitle}>{card.title}</h5>
                                  {card.description && (
                                    <p className={styles.kanbanCardDesc}>{card.description}</p>
                                  )}
                                  <div className={styles.kanbanCardMeta}>
                                    <div className={styles.kanbanCardUser}>
                                      <div
                                        className={styles.kanbanCardAvatar}
                                        style={{
                                          background: (() => {
                                            const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#0ea5e9', '#14b8a6', '#84cc16'];
                                            const name = assignedUserName || '';
                                            let hash = 0;
                                            for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
                                            return colors[Math.abs(hash) % colors.length];
                                          })()
                                        }}
                                      >
                                        {(assignedUserName || '?').split(' ').map((p: string) => p[0]).join('').slice(0, 2)}
                                      </div>
                                      <span className={styles.kanbanCardUserName}>{assignedUserName}</span>
                                    </div>
                                    <div className={styles.kanbanCardActions}>
                                      {card.previsto && (
                                        <span className={`${styles.kanbanCardDateBadge} ${styles[statusType] || ''}`}>
                                          📅 {new Date(card.previsto).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                        </span>
                                      )}
                                      <button
                                        className={styles.kanbanActionBtn}
                                        onClick={() => setSelectedEvent(card)}
                                        title="Anotações"
                                      >
                                        💬 {card.card_act ? card.card_act.length : 0}
                                      </button>
                                      {isAssignedToMe && !card.dtcon && (
                                        <button
                                          className={styles.kanbanCompleteBtn}
                                          onClick={() => handleCompleteEvent(card)}
                                          disabled={isCompletingEvent === card.id}
                                          title="Finalizar Evento"
                                        >
                                          {isCompletingEvent === card.id ? '⏱️' : <CircleCheckBig size={18} color="#10b981" strokeWidth={2.5} />}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : activeWorkspace ? (
              <div className={styles.workspaceOverview}>
                <div className={styles.workspaceOverviewHeader}>
                  <div className={styles.workspaceOverviewMeta} style={{ justifyContent: 'space-between', width: '100%' }}>
                    <span className={styles.workspaceBadge}>{activeWorkspace.type.name}</span>
                    <button
                      onClick={() => {
                        setOptimisticWorkspaceId(null);
                        router.back();
                      }}
                      className={styles.backToTableBtn}
                      title="Voltar para a tela anterior"
                    >
                      ‹ Voltar
                    </button>
                  </div>
                  <h2 className={styles.workspaceOverviewTitle}>{activeWorkspace.name}</h2>
                  {activeWorkspace.description && (
                    <p className={styles.workspaceOverviewDescription}>{activeWorkspace.description}</p>
                  )}
                </div>

                <div className={styles.boardsSection}>
                  <div className={styles.boardsSectionHeader}>
                    <div className={styles.sectionHeaderLeft}>
                      <h3 className={styles.sectionHeading}>Acompanhamento de Atividades</h3>
                      <p className={styles.sectionSubheading}>
                        Gerencie e monitore o andamento de todos os fluxos e serviços em execução nesta área de trabalho.
                      </p>
                    </div>
                    <div className={styles.sectionHeaderRight}>
                      <button
                        className={styles.reportLinkBtn}
                        onClick={() => setReportSource('FILTERED')}
                        title="Gerar relatório com o conteúdo atual da tela (aplicando filtros e pesquisas ativas)"
                      >
                        📊 Relatório da Tela
                      </button>
                      <button
                        className={styles.reportActivityBtn}
                        onClick={() => setReportSource('COMPLETE')}
                        title="Gerar relatório completo de todas as atividades desta área de trabalho"
                      >
                        📊 Relatório Completo
                      </button>
                      <button
                        className={styles.createWorkspaceBtn}
                        onClick={() => setIsWorkspaceModalOpen(true)}
                        title="Criar uma nova área de trabalho"
                      >
                        <span className={styles.plusIcon}>+</span> Nova Área
                      </button>
                      <button
                        className={styles.createActivityBtn}
                        onClick={() => {
                          // Navega para a página dedicada em _self.
                          // Alinhado com o restante da aplicação (páginas > modais).
                          const wsId = activeWorkspace?.id || '';
                          window.location.href = wsId
                            ? `/dashboard/activity/new?workspaceId=${wsId}`
                            : '/dashboard/activity/new';
                        }}
                      >
                        <span className={styles.plusIcon}>+</span> Criar Atividade
                      </button>
                    </div>
                  </div>

                  {/* Quick Search Bar */}
                  {ongoingBoards.length > 0 && (
                    <div className={styles.searchBarContainer}>
                      <div style={{ display: 'flex', gap: '0.8rem', flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div className={styles.searchInputWrapper} style={{ flex: 1, minWidth: '240px' }}>
                          <span className={styles.searchIcon}>🔍</span>
                          <input
                            type="text"
                            placeholder="Pesquise por código, nome da atividade ou criador..."
                            className={styles.searchInput}
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                          />
                          {searchTerm && (
                            <button
                              className={styles.clearSearchBtn}
                              onClick={() => handleSearchChange('')}
                              title="Limpar pesquisa"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {sectors && sectors.length > 0 && (
                          <div className={styles.sectorFilterWrapper}>
                            <select
                              value={selectedSectorId}
                              onChange={(e) => handleSectorFilterChange(e.target.value)}
                              className={styles.sectorFilterSelect}
                            >
                              <option value="">Todos os Setores</option>
                              {sectors
                                .filter((s: any) => ongoingBoards.some((b: any) => b.sector?.id === s.id))
                                .map((s: any) => (
                                  <option key={s.id} value={s.id.toString()}>
                                    {s.name} ({s.acronym})
                                  </option>
                                ))}
                            </select>
                          </div>
                        )}
                        <div className={styles.dateFilterInline}>
                          <input
                            type="date"
                            value={filterDateStart}
                            onChange={e => setFilterDateStart(e.target.value)}
                            className={styles.dateFilterInput}
                            title="Data prevista inicial"
                          />
                          <span className={styles.dateFilterSep}>até</span>
                          <input
                            type="date"
                            value={filterDateEnd}
                            onChange={e => setFilterDateEnd(e.target.value)}
                            className={styles.dateFilterInput}
                            title="Data prevista final"
                          />
                          {(filterDateStart || filterDateEnd) && (
                            <button
                              className={styles.dateFilterClear}
                              onClick={() => { setFilterDateStart(''); setFilterDateEnd(''); }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                      <span className={styles.searchCount}>
                        {(searchTerm || selectedSectorId || filterDateStart || filterDateEnd)
                          ? `${filteredBoards.length} resultado(s)`
                          : `${ongoingBoards.length} atividade(s)`
                        }
                      </span>
                    </div>
                  )}

                  {ongoingBoards.length === 0 ? (
                    <div className={styles.emptyTableState}>
                      <p>Nenhuma atividade em andamento neste espaço de trabalho. Clique no botão acima para criar uma nova!</p>
                    </div>
                  ) : filteredBoards.length === 0 ? (
                    <div className={styles.emptySearchState}>
                      <p>Nenhuma atividade corresponde à pesquisa "<strong>{searchTerm}</strong>".</p>
                      <button className={styles.clearSearchLink} onClick={() => handleSearchChange('')}>
                        Limpar pesquisa
                      </button>
                    </div>
                  ) : (
                    <div className={styles.tableWrapper}>
                      <table className={styles.activitiesTable}>
                        <thead>
                          <tr>
                            <th style={{ width: '45px', textAlign: 'left', paddingRight: '0.25rem' }}>Cód.</th>
                            <th style={{ paddingLeft: '0.25rem' }}>Setor / Nome da Atividade</th>
                            <th style={{ width: '140px', textAlign: 'center' }}>Previsto</th>
                            <th style={{ width: '100px', textAlign: 'center' }}>Criado por</th>
                            <th style={{ textAlign: 'center' }}>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedBoards.map((board) => {
                            let formattedDate = '';
                            if (board.dtatv) {
                              const d = new Date(board.dtatv);
                              formattedDate = d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                            }

                            const deadlineStatus = getBoardDeadlineStatus(board.previsto);
                            const formattedPrevisto = board.previsto
                              ? new Date(board.previsto).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                              : '—';

                            // Count active vs completed events for this board
                            let activeCardsCount = 0;
                            let completedCardsCount = 0;
                            board.columns?.forEach((col: any) => {
                              col.cards?.forEach((card: any) => {
                                if (card.dtcon) {
                                  completedCardsCount++;
                                } else {
                                  activeCardsCount++;
                                }
                              });
                            });

                            // Dynamically generate initials
                            const creatorName = board.user?.name || "Victor Pinto";
                            const creatorInitials = creatorName
                              .split(' ')
                              .map((n: string) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase();

                            return (
                              <tr key={board.id}>
                                <td style={{ textAlign: 'left', paddingRight: '0.25rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                  {board.seqId}
                                </td>
                                <td style={{ paddingLeft: '0.25rem' }}>
                                  <div className={styles.tableNameCellInner}>
                                    <div className={styles.tableNameGroup}>
                                      {board.sector ? (
                                        <span
                                          className={styles.sectorBadge}
                                          title={board.sector.name}
                                          style={getSectorColors(board.sector.acronym)}
                                        >
                                          {board.sector.acronym}
                                        </span>
                                      ) : (
                                        <span className={styles.sectorBadgePlaceholder} title="Sem setor associado">
                                          --
                                        </span>
                                      )}
                                      <span className={styles.tableName}>{board.name}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className={styles.tablePrevistoCell}>
                                  <div className={styles.previstoWrapper}>
                                    {board.previsto ? (
                                      <>
                                        <span className={`${styles.previstoBadge} ${deadlineStatus.className}`}>
                                          {deadlineStatus.label}
                                        </span>
                                        <span className={styles.previstoDate}>{formattedPrevisto}</span>
                                      </>
                                    ) : (
                                      <span className={`${styles.previstoBadge} ${styles.statusNone}`}>
                                        Sem data
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className={styles.tableCreatorCell}>
                                  <div className={styles.creatorWrapper}>
                                    <div
                                      className={styles.creatorAvatar}
                                      title={`Criado por ${creatorName}`}
                                    >
                                      {creatorInitials}
                                    </div>
                                    <span className={styles.creatorDate}>
                                      {board.dtatv ? formattedDate : 'Sem data'}
                                    </span>
                                  </div>
                                </td>
                                <td className={styles.tableActionsCell}>
                                  <div className={styles.tableActionsGroup}>
                                    <button
                                      className={styles.tableEditBtn}
                                      onClick={() => setRenameBoardData({
                                        id: board.id,
                                        name: board.name,
                                        detalhes: board.detalhes,
                                        sectorId: board.sector?.id,
                                        dtatv: board.dtatv,
                                        workspaceId: board.workspaceId,
                                        user_seqid: board.user_seqid,
                                        previsto: board.previsto
                                      })}
                                      title="Editar Atividade"
                                    >
                                      ✏️
                                    </button>
                                    <Link
                                      href={`/dashboard?boardId=${board.id}&from=workspace`}
                                      className={styles.tableOpenBtn}
                                      title={`Visualizar eventos em andamento (${activeCardsCount})`}
                                    >
                                      ⚡
                                    </Link>
                                    <Link
                                      href={`/dashboard?boardId=${board.id}&view=completed&from=workspace`}
                                      className={styles.tableHistoryBtn}
                                      title={`Histórico de eventos concluídos (${completedCardsCount})`}
                                    >
                                      <CircleCheckBig size={16} color="#10b981" strokeWidth={2.5} />
                                    </Link>
                                    {activeWorkspacePerms.isAdminOrOwner && (
                                      <button
                                        className={styles.tableCompleteBoardBtn}
                                        onClick={() => handleCompleteBoard(board.id, board.name)}
                                        title={activeWorkspacePerms.isOwner ? "Finalizar e Encerrar Atividade" : "Solicitar Finalização da Atividade"}
                                      >
                                        🔒
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : clientView === 'my-activities' ? (
              <MyActivitiesView
                workspaces={workspaces}
                currentUser={user}
                userSeqid={userSeqid}
                onEditBoard={(board: any) => setRenameBoardData({
                  id: board.id,
                  name: board.name,
                  detalhes: board.detalhes,
                  sectorId: board.sector?.id,
                  dtatv: board.dtatv,
                  workspaceId: board.workspaceId || workspaces.find(w => w.boards?.some((b: any) => b.id === board.id))?.seqid,
                  user_seqid: board.user_seqid,
                  previsto: board.previsto
                })}
                onCompleteBoard={handleCompleteBoard}
                onBack={handleBack}
              />
            ) : clientView === 'my-events' ? (
              isLoadingMyEvents && myEvents.length === 0 ? (
                <div className={styles.emptyTableState} style={{ padding: '4rem' }}>
                  <p>Carregando suas atividades...</p>
                </div>
              ) : (
                <MyEventsView
                  events={myEvents}
                  currentUser={user}
                  userSeqid={userSeqid}
                  workspaces={workspaces}
                  onEventsChange={setMyEvents}
                  onBack={handleBack}
                />
              )
            ) : clientView === 'movements' ? (
              <MovementsView
                currentUser={user}
                workspaces={workspaces}
                onBack={handleBack}
              />
            ) : isPremiumGridOpen ? (
              <PremiumWorkspaceGridModal
                workspaces={workspaces}
                workspaceTypes={workspaceTypes}
                onClose={() => setIsPremiumGridOpen(false)}
                onManageColumns={(workspace) => {
                  setSelectedWorkspaceColumns(workspace);
                  setIsWorkspaceColumnsModalOpen(true);
                }}
                onEditWorkspace={(workspace) => {
                  setEditWorkspaceTab('general');
                  setEditWorkspaceData(workspace);
                }}
                onInviteMember={(workspace) => {
                  setEditWorkspaceTab('collaborators');
                  setEditWorkspaceData(workspace);
                }}
                onCreateWorkspace={() => setIsWorkspaceModalOpen(true)}
                onCreateBoard={handleCreateBoard}
                onViewActivities={(workspace) => {
                  setOptimisticWorkspaceId(workspace.id);
                  setClientView('ongoing');
                  router.push(`/dashboard?workspaceId=${workspace.id}`);
                }}
                onViewKanban={(workspace) => {
                  setOptimisticWorkspaceId(workspace.id);
                  setClientView('kanban');
                  router.push(`/dashboard?workspaceId=${workspace.id}&view=kanban`);
                }}
                onAcceptInvite={handleAcceptInvite}
                globalCounts={dashboardStats?.operational ? {
                  inProgressBoards: dashboardStats.operational.inProgressBoards,
                  inProgressCards: dashboardStats.operational.inProgressCards,
                  overdueCards: dashboardStats.operational.overdueCards,
                  cardsCompletedThisMonth: dashboardStats.currentMonth?.cardsCompleted || 0
                } : undefined}
                workspaceCounters={workspaceCounters}
              />
            ) : (
              <WelcomeDashboard
                user={user}
                workspaces={workspaces}
                recentLogs={recentLogs}
                dashboardStats={dashboardStats}
                onOpenPremiumGrid={() => setIsPremiumGridOpen(true)}
              />
            )}
          </div>
        </main>
      </div>

      {isWorkspaceModalOpen && (
        <CreateWorkspaceModal
          types={workspaceTypes}
          onSubmit={handleCreateWorkspace}
          onClose={() => setIsWorkspaceModalOpen(false)}
        />
      )}

      {editWorkspaceData && (
        <EditWorkspaceModal
          workspace={editWorkspaceData}
          types={workspaceTypes}
          currentUserSeqid={userSeqid}
          onSubmit={handleUpdateWorkspace}
          onClose={() => {
            setEditWorkspaceData(null);
            setEditWorkspaceTab('general');
          }}
          initialTab={editWorkspaceTab}
        />
      )}



      {reportSource && activeWorkspace && (
        <ActivityReportModal
          workspaceName={activeWorkspace.name}
          workspaceType={activeWorkspace.type.name}
          boards={reportSource === 'FILTERED' ? sortedBoards : activeWorkspace.boards}
          onClose={() => setReportSource(null)}
        />
      )}

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
          sectors={sectors}
          workspaces={workspaces}
          onSubmit={handleRenameBoard}
          onClose={() => setRenameBoardData(null)}
        />
      )}

      {historySidebarBoardId && (
        <ActivityHistorySidebar
          isOpen={!!historySidebarBoardId}
          boardId={historySidebarBoardId}
          onClose={() => setHistorySidebarBoardId(null)}
        />
      )}

      {(selectedWorkspaceColumns || (isWorkspaceColumnsModalOpen && activeWorkspace)) && (
        <WorkspaceColumnsModal
          workspace={(selectedWorkspaceColumns || activeWorkspace)!}
          onClose={() => {
            setSelectedWorkspaceColumns(null);
            setSelectedWorkspaceColumns(null);
            setIsWorkspaceColumnsModalOpen(false);
          }}
        />
      )}

      {selectedEvent && (() => {
        const isEventAssignedToMe = !!(userSeqid && selectedEvent.taskuser_seqid && selectedEvent.taskuser_seqid.toString() === userSeqid);
        const isAdminOrOwner = activeWorkspacePerms.isAdminOrOwner;

        return (
          <div className={styles.drawerOverlay} onClick={() => setSelectedEvent(null)}>
            <div className={styles.drawerContainer} onClick={e => e.stopPropagation()}>
              <div className={styles.drawerHeader}>
                <div>
                  <h3 className={styles.drawerTitle}>Andamentos do Evento</h3>
                  <p className={styles.drawerSubtitle}>{selectedEvent.title}</p>
                </div>
                <button className={styles.drawerCloseBtn} onClick={() => setSelectedEvent(null)}>✕</button>
              </div>
              <div className={styles.drawerContent}>
                {isEventAssignedToMe ? (
                  <div className={styles.drawerAddAction}>
                    <textarea
                      className={styles.drawerTextarea}
                      placeholder="Escreva um novo andamento aqui..."
                      value={newActionText}
                      onChange={(e) => setNewActionText(e.target.value)}
                    />
                    <button
                      className={styles.drawerSaveBtn}
                      onClick={handleAddAction}
                      disabled={!newActionText.trim() || isSavingAction}
                    >
                      {isSavingAction ? 'Salvando...' : 'Salvar Andamento'}
                    </button>
                  </div>
                ) : (
                  <div style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                    textAlign: 'center',
                    marginBottom: '1.5rem',
                    fontStyle: 'italic'
                  }}>
                    Apenas visualização. Você não é o responsável por este evento.
                  </div>
                )}

                <div className={styles.drawerListHeader}>
                  <h4>Histórico de Ações ({selectedEvent.card_act ? selectedEvent.card_act.length : 0})</h4>
                </div>
                <div className={styles.drawerActionsList}>
                  {!selectedEvent.card_act || selectedEvent.card_act.length === 0 ? (
                    <p className={styles.drawerEmptyText}>Nenhum andamento registrado para este evento.</p>
                  ) : (
                    selectedEvent.card_act.map((act: any) => {
                      const isTransferPendente = act.description?.startsWith(`[SOLICITACAO_PENDENTE:${userSeqid}:`);
                      return (
                        <div key={act.seqid.toString()} className={styles.drawerActionCard}>
                          {editingActionSeqid?.toString() === act.seqid.toString() ? (
                            <div className={styles.editActionForm}>
                              <textarea
                                className={styles.drawerTextarea}
                                value={editingActionText}
                                onChange={(e) => setEditingActionText(e.target.value)}
                                autoFocus
                              />
                              <div className={styles.editActionBtns}>
                                <button className={styles.cancelEditBtn} onClick={() => setEditingActionSeqid(null)}>Cancelar</button>
                                <button
                                  className={styles.confirmEditBtn}
                                  onClick={() => handleEditActionSubmit(BigInt(act.seqid))}
                                >
                                  Salvar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className={styles.actionCardTop}>
                                <p className={styles.drawerActionText}>
                                  {act.description?.startsWith('[SOLICITACAO_PENDENTE:') ? (
                                    act.description.replace(/^\[SOLICITACAO_[A-Z]+:[^\]]+\]\s*/, '')
                                  ) : act.description?.startsWith('[SOLICITACAO_ACEITA:') ? (
                                    act.description.replace(/^\[SOLICITACAO_[A-Z]+:[^\]]+\]\s*/, '') + ' (Aceita)'
                                  ) : act.description?.startsWith('[SOLICITACAO_RECUSADA:') ? (
                                    act.description.replace(/^\[SOLICITACAO_[A-Z]+:[^\]]+\]\s*/, '') + ' (Recusada)'
                                  ) : (
                                    act.description
                                  )}
                                </p>
                                {isEventAssignedToMe && (
                                  <div className={styles.actionQuickBtns}>
                                    <button
                                      title="Editar andamento"
                                      onClick={() => {
                                        setEditingActionSeqid(BigInt(act.seqid));
                                        setEditingActionText(act.description);
                                      }}
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      title="Excluir andamento"
                                      onClick={() => handleDeleteAction(BigInt(act.seqid))}
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                )}
                              </div>
                              {isTransferPendente && (
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                  <button
                                    onClick={() => handleRespondTransfer(selectedEvent.seqid.toString(), act.seqid.toString(), true)}
                                    style={{
                                      background: '#10b981',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      padding: '0.35rem 0.75rem',
                                      fontSize: '0.8rem',
                                      fontWeight: 600,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Aceitar
                                  </button>
                                  <button
                                    onClick={() => handleRespondTransfer(selectedEvent.seqid.toString(), act.seqid.toString(), false)}
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.1)',
                                      color: '#ef4444',
                                      border: '1px solid rgba(239, 68, 68, 0.2)',
                                      borderRadius: '6px',
                                      padding: '0.35rem 0.75rem',
                                      fontSize: '0.8rem',
                                      fontWeight: 600,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Recusar
                                  </button>
                                </div>
                              )}
                              <span className={styles.drawerActionMeta}>
                                {act.users?.name || 'Sistema'} • {new Date(act.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {transferModalData && (
        <div className={styles.modalOverlay} onClick={() => setTransferModalData(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Transferir Responsabilidade</h3>
              <button className={styles.closeBtn} onClick={() => setTransferModalData(null)}>✕</button>
            </div>
            <form onSubmit={handleTransferSubmit}>
              <div className={styles.modalBody}>
                <p className={styles.modalSub}>
                  Selecione o novo responsável para o evento: <br />
                  <strong>{transferModalData.cardTitle}</strong>
                </p>
                <div className={styles.formGroup}>
                  <label htmlFor="userSelect">Novo Responsável:</label>
                  <select
                    id="userSelect"
                    className={styles.selectInput}
                    value={selectedTransferUserSeqid}
                    onChange={(e) => setSelectedTransferUserSeqid(e.target.value)}
                    required
                  >
                    <option value="">Selecione um usuário...</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.seqid.toString()}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setTransferModalData(null)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.confirmBtn} disabled={isTransferring}>
                  {isTransferring ? 'Transferindo...' : 'Confirmar Transferência'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {transferWorkspaceModalData && (
        <div className={styles.modalOverlay} onClick={() => setTransferWorkspaceModalData(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Alterar Quadro / Área</h3>
              <button className={styles.closeBtn} onClick={() => setTransferWorkspaceModalData(null)}>✕</button>
            </div>
            <form onSubmit={handleTransferWorkspaceSubmit}>
              <div className={styles.modalBody}>
                <p className={styles.modalSub}>
                  Selecione o novo espaço de trabalho, quadro e fase para o evento: <br />
                  <strong>{transferWorkspaceModalData.cardTitle}</strong>
                </p>

                <div className={styles.formGroup} style={{ marginBottom: '1rem' }}>
                  <label htmlFor="workspaceSelect">Nova Área:</label>
                  <select
                    id="workspaceSelect"
                    className={styles.selectInput}
                    value={selectedWorkspaceSeqid}
                    onChange={(e) => {
                      const wsSeqid = e.target.value;
                      setSelectedWorkspaceSeqid(wsSeqid);
                      const targetWs = workspaces?.find(w => w.seqid?.toString() === wsSeqid);
                      if (targetWs) {
                        const firstBoard = targetWs.boards?.[0];
                        setSelectedBoardSeqid(firstBoard ? firstBoard.id : '');
                        const firstCol = targetWs.columns?.[0];
                        setSelectedColumnId(firstCol ? firstCol.id.toString() : '');
                      }
                    }}
                    required
                  >
                    <option value="">Selecione uma área...</option>
                    {workspaces?.map(ws => (
                      <option key={ws.id} value={ws.seqid?.toString()}>
                        {ws.name}
                      </option>
                    ))}
                  </select>
                </div>

                {(() => {
                  const selectedWorkspace = workspaces?.find(w => w.seqid?.toString() === selectedWorkspaceSeqid);
                  const workspaceBoards = selectedWorkspace?.boards || [];
                  const workspaceColumns = selectedWorkspace?.columns || [];

                  return (
                    <>
                      <div className={styles.formGroup} style={{ marginBottom: '1rem' }}>
                        <label htmlFor="boardSelect">Novo Quadro:</label>
                        <select
                          id="boardSelect"
                          className={styles.selectInput}
                          value={selectedBoardSeqid}
                          onChange={(e) => setSelectedBoardSeqid(e.target.value)}
                          required
                        >
                          <option value="">Selecione um quadro...</option>
                          {workspaceBoards.map((b: any) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor="columnSelect">Nova Fase:</label>
                        <select
                          id="columnSelect"
                          className={styles.selectInput}
                          value={selectedColumnId}
                          onChange={(e) => setSelectedColumnId(e.target.value)}
                          required
                        >
                          <option value="">Selecione uma fase...</option>
                          {workspaceColumns.map((c: any) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setTransferWorkspaceModalData(null)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.confirmBtn} disabled={isTransferringWorkspace}>
                  {isTransferringWorkspace ? 'Transferindo...' : 'Confirmar Transferência'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
