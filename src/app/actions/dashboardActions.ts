'use server';

import prisma from '@/lib/prisma';
import { UserRepository } from '@/domain/repositories/UserRepository';

const userRepo = new UserRepository();

export interface DashboardStats {
  currentMonth: {
    label: string;
    boardsCreated: number;
    boardsCompleted: number;
    cardsCreated: number;
    cardsCompleted: number;
  };
  previousMonth: {
    label: string;
    boardsCreated: number;
    boardsCompleted: number;
    cardsCreated: number;
    cardsCompleted: number;
  };
  operational: {
    inProgressBoards: number;
    inProgressCards: number;
    overdueBoards: number;
    overdueCards: number;
    avgCompletionDays: number | null;
  };
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    type: 'board' | 'card';
    previsto: string;
    workspaceName: string;
    boardName?: string;
  }>;
  overdueItems: Array<{
    id: string;
    title: string;
    type: 'board' | 'card';
    previsto: string;
    daysOverdue: number;
    workspaceName: string;
    boardName?: string;
  }>;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export async function getDashboardStatsAction(): Promise<DashboardStats> {
  const user = await userRepo.getLoggedUser();
  if (!user) {
    return getEmptyStats();
  }

  const userSeqId = user.seqid;

  // Get all workspace IDs the user has access to (owner + member)
  const userWorkspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { users_seqid: userSeqId },
        { members: { some: { userSeqid: userSeqId } } }
      ]
    },
    select: { seqid: true }
  });

  const workspaceSeqids = userWorkspaces.map(w => w.seqid);

  if (workspaceSeqids.length === 0) {
    return getEmptyStats();
  }

  // Date boundaries
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const currentMonthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthLabel = `${MONTH_NAMES[prevMonthDate.getMonth()]} ${prevMonthDate.getFullYear()}`;

  // Run all count queries in parallel
  const [
    boardsCreatedThisMonth,
    boardsCompletedThisMonth,
    cardsCreatedThisMonth,
    cardsCompletedThisMonth,
    boardsCreatedLastMonth,
    boardsCompletedLastMonth,
    cardsCreatedLastMonth,
    cardsCompletedLastMonth,
    inProgressBoards,
    inProgressCards,
    overdueBoards,
    overdueCards,
    completedCardsWithDuration,
    upcomingBoardDeadlines,
    upcomingCardDeadlines,
    overdueBoardsList,
    overdueCardsList
  ] = await Promise.all([
    // Current month
    prisma.board.count({
      where: {
        createdAt: { gte: currentMonthStart },
        workspaceId: { in: workspaceSeqids }
      }
    }),
    prisma.board.count({
      where: {
        dtcon: { gte: currentMonthStart },
        workspaceId: { in: workspaceSeqids }
      }
    }),
    prisma.card.count({
      where: {
        createdAt: { gte: currentMonthStart },
        column: { workspaceSeqid: { in: workspaceSeqids } }
      }
    }),
    prisma.card.count({
      where: {
        dtcon: { gte: currentMonthStart },
        column: { workspaceSeqid: { in: workspaceSeqids } }
      }
    }),
    // Previous month
    prisma.board.count({
      where: {
        createdAt: { gte: previousMonthStart, lte: previousMonthEnd },
        workspaceId: { in: workspaceSeqids }
      }
    }),
    prisma.board.count({
      where: {
        dtcon: { gte: previousMonthStart, lte: previousMonthEnd },
        workspaceId: { in: workspaceSeqids }
      }
    }),
    prisma.card.count({
      where: {
        createdAt: { gte: previousMonthStart, lte: previousMonthEnd },
        column: { workspaceSeqid: { in: workspaceSeqids } }
      }
    }),
    prisma.card.count({
      where: {
        dtcon: { gte: previousMonthStart, lte: previousMonthEnd },
        column: { workspaceSeqid: { in: workspaceSeqids } }
      }
    }),
    // Operational - in progress
    prisma.board.count({
      where: {
        dtcon: null,
        workspaceId: { in: workspaceSeqids }
      }
    }),
    prisma.card.count({
      where: {
        dtcon: null,
        board: { dtcon: null },
        column: { workspaceSeqid: { in: workspaceSeqids } }
      }
    }),
    // Operational - overdue
    prisma.board.count({
      where: {
        previsto: { lt: today },
        dtcon: null,
        workspaceId: { in: workspaceSeqids }
      }
    }),
    prisma.card.count({
      where: {
        previsto: { lt: today },
        dtcon: null,
        board: { dtcon: null },
        column: { workspaceSeqid: { in: workspaceSeqids } }
      }
    }),
    // Avg completion time - cards completed this month that have dtatv
    prisma.card.findMany({
      where: {
        dtcon: { gte: currentMonthStart },
        dtatv: { not: null },
        column: { workspaceSeqid: { in: workspaceSeqids } }
      },
      select: { dtatv: true, dtcon: true }
    }),
    // Upcoming deadlines - boards
    prisma.board.findMany({
      where: {
        previsto: { gte: today, lte: nextWeek },
        dtcon: null,
        workspaceId: { in: workspaceSeqids }
      },
      include: { workspace: { select: { name: true } } },
      orderBy: { previsto: 'asc' },
      take: 5
    }),
    // Upcoming deadlines - cards (only from active boards)
    prisma.card.findMany({
      where: {
        previsto: { gte: today, lte: nextWeek },
        dtcon: null,
        board: { dtcon: null },
        column: { workspaceSeqid: { in: workspaceSeqids } }
      },
      include: {
        board: { select: { name: true } },
        column: { include: { workspace: { select: { name: true } } } }
      },
      orderBy: { previsto: 'asc' },
      take: 5
    }),
    // Overdue items - boards (most recent overdue first)
    prisma.board.findMany({
      where: {
        previsto: { lt: today },
        dtcon: null,
        workspaceId: { in: workspaceSeqids }
      },
      include: { workspace: { select: { name: true } } },
      orderBy: { previsto: 'desc' },
      take: 5
    }),
    // Overdue items - cards (only from active boards)
    prisma.card.findMany({
      where: {
        previsto: { lt: today },
        dtcon: null,
        board: { dtcon: null },
        column: { workspaceSeqid: { in: workspaceSeqids } }
      },
      include: {
        board: { select: { name: true } },
        column: { include: { workspace: { select: { name: true } } } }
      },
      orderBy: { previsto: 'desc' },
      take: 5
    })
  ]);

  // Calculate avg completion days
  let avgCompletionDays: number | null = null;
  if (completedCardsWithDuration.length > 0) {
    const totalDays = completedCardsWithDuration.reduce((sum, card) => {
      if (!card.dtatv || !card.dtcon) return sum;
      const start = new Date(card.dtatv);
      const end = new Date(card.dtcon);
      const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return sum + diffDays;
    }, 0);
    avgCompletionDays = Math.round((totalDays / completedCardsWithDuration.length) * 10) / 10;
  }

  // Build upcoming deadlines list (merge boards + cards, sort by date, take 5)
  const upcomingDeadlines = [
    ...upcomingBoardDeadlines.map(b => ({
      id: b.seqId.toString(),
      title: b.name,
      type: 'board' as const,
      previsto: b.previsto ? formatDateBR(b.previsto) : '',
      workspaceName: b.workspace?.name || ''
    })),
    ...upcomingCardDeadlines.map(c => ({
      id: c.seqid.toString(),
      title: c.title,
      type: 'card' as const,
      previsto: c.previsto ? formatDateBR(c.previsto) : '',
      workspaceName: c.column?.workspace?.name || '',
      boardName: c.board?.name || ''
    }))
  ]
    .sort((a, b) => {
      const dateA = parseDateBR(a.previsto);
      const dateB = parseDateBR(b.previsto);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 5);

  // Build overdue items list (merge boards + cards, sort by most recent first - most relevant to action)
  const overdueItems = [
    ...overdueBoardsList.map(b => ({
      id: b.seqId.toString(),
      title: b.name,
      type: 'board' as const,
      previsto: b.previsto ? formatDateBR(b.previsto) : '',
      daysOverdue: b.previsto ? calcDaysOverdue(b.previsto, today) : 0,
      workspaceName: b.workspace?.name || ''
    })),
    ...overdueCardsList.map(c => ({
      id: c.seqid.toString(),
      title: c.title,
      type: 'card' as const,
      previsto: c.previsto ? formatDateBR(c.previsto) : '',
      daysOverdue: c.previsto ? calcDaysOverdue(c.previsto, today) : 0,
      workspaceName: c.column?.workspace?.name || '',
      boardName: c.board?.name || ''
    }))
  ]
    // Prioritize recent overdue (less days = more urgent to resolve)
    .sort((a, b) => a.daysOverdue - b.daysOverdue)
    .slice(0, 5);

  return {
    currentMonth: {
      label: currentMonthLabel,
      boardsCreated: boardsCreatedThisMonth,
      boardsCompleted: boardsCompletedThisMonth,
      cardsCreated: cardsCreatedThisMonth,
      cardsCompleted: cardsCompletedThisMonth
    },
    previousMonth: {
      label: previousMonthLabel,
      boardsCreated: boardsCreatedLastMonth,
      boardsCompleted: boardsCompletedLastMonth,
      cardsCreated: cardsCreatedLastMonth,
      cardsCompleted: cardsCompletedLastMonth
    },
    operational: {
      inProgressBoards,
      inProgressCards,
      overdueBoards,
      overdueCards,
      avgCompletionDays
    },
    upcomingDeadlines,
    overdueItems
  };
}

function getEmptyStats(): DashboardStats {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return {
    currentMonth: {
      label: `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`,
      boardsCreated: 0,
      boardsCompleted: 0,
      cardsCreated: 0,
      cardsCompleted: 0
    },
    previousMonth: {
      label: `${MONTH_NAMES[prevMonth.getMonth()]} ${prevMonth.getFullYear()}`,
      boardsCreated: 0,
      boardsCompleted: 0,
      cardsCreated: 0,
      cardsCompleted: 0
    },
    operational: {
      inProgressBoards: 0,
      inProgressCards: 0,
      overdueBoards: 0,
      overdueCards: 0,
      avgCompletionDays: null
    },
    upcomingDeadlines: [],
    overdueItems: []
  };
}

function formatDateBR(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function parseDateBR(dateStr: string): Date {
  const [day, month] = dateStr.split('/');
  const now = new Date();
  return new Date(now.getFullYear(), parseInt(month) - 1, parseInt(day));
}

/**
 * Retorna análise mensal completa: atividades concluídas, por setor, por responsável e timeline semanal.
 */
export async function getMonthlyAnalysisAction() {
  const user = await userRepo.getLoggedUser();
  if (!user) return null;

  const userWorkspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { users_seqid: user.seqid },
        { members: { some: { userSeqid: user.seqid } } }
      ]
    },
    select: { seqid: true }
  });

  const workspaceSeqids = userWorkspaces.map(w => w.seqid);
  if (workspaceSeqids.length === 0) return null;

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const monthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

  // Buscar boards concluídos no mês
  const completedBoards = await prisma.board.findMany({
    where: {
      dtcon: { gte: currentMonthStart, lte: currentMonthEnd },
      workspaceId: { in: workspaceSeqids }
    },
    include: { sector: true, user: true }
  });

  // Buscar boards em andamento
  const inProgressBoards = await prisma.board.count({
    where: {
      dtcon: null,
      workspaceId: { in: workspaceSeqids }
    }
  });

  // Buscar boards atrasados
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const overdueBoards = await prisma.board.count({
    where: {
      dtcon: null,
      previsto: { lt: today },
      workspaceId: { in: workspaceSeqids }
    }
  });

  // Agrupar por setor
  const bySectorMap = new Map<string, { count: number; name: string; acronym: string }>();
  completedBoards.forEach(board => {
    const sectorKey = board.sector?.acronym || 'Sem Setor';
    const existing = bySectorMap.get(sectorKey);
    if (existing) {
      existing.count++;
    } else {
      bySectorMap.set(sectorKey, {
        count: 1,
        name: board.sector?.name || 'Sem Setor',
        acronym: sectorKey
      });
    }
  });
  const bySector = Array.from(bySectorMap.values())
    .sort((a, b) => b.count - a.count);

  // Agrupar por responsável
  const byUserMap = new Map<string, { count: number; name: string }>();
  completedBoards.forEach(board => {
    const userName = board.user?.name || 'Desconhecido';
    const existing = byUserMap.get(userName);
    if (existing) {
      existing.count++;
    } else {
      byUserMap.set(userName, { count: 1, name: userName });
    }
  });
  const byUser = Array.from(byUserMap.values())
    .sort((a, b) => b.count - a.count);

  // Timeline semanal (4 semanas do mês)
  const weeklyTimeline = [1, 2, 3, 4].map(week => {
    const weekStart = new Date(now.getFullYear(), now.getMonth(), (week - 1) * 7 + 1);
    const weekEnd = new Date(now.getFullYear(), now.getMonth(), week * 7, 23, 59, 59, 999);
    const count = completedBoards.filter(b => {
      const dtcon = new Date(b.dtcon!);
      return dtcon >= weekStart && dtcon <= weekEnd;
    }).length;
    return { week, label: `Sem ${week}`, count };
  });

  // Taxa de conclusão
  const totalBoards = completedBoards.length + inProgressBoards;
  const completionRate = totalBoards > 0 ? Math.round((completedBoards.length / totalBoards) * 100) : 0;

  // Tempo médio de conclusão
  const boardsWithDuration = completedBoards.filter(b => b.dtatv && b.dtcon);
  const avgDays = boardsWithDuration.length > 0
    ? Math.round(boardsWithDuration.reduce((acc, b) => {
        const start = new Date(b.dtatv!).getTime();
        const end = new Date(b.dtcon!).getTime();
        return acc + (end - start) / (1000 * 60 * 60 * 24);
      }, 0) / boardsWithDuration.length)
    : null;

  return {
    monthLabel,
    totalCompleted: completedBoards.length,
    inProgress: inProgressBoards,
    overdue: overdueBoards,
    completionRate,
    avgCompletionDays: avgDays,
    bySector,
    byUser,
    weeklyTimeline
  };
}

function calcDaysOverdue(previsto: Date | string, today: Date): number {
  const d = new Date(previsto);
  d.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - d.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export interface WorkspaceCounters {
  workspaceSeqid: string;
  activeBoards: number;
  overdueBoards: number;
  totalEvents: number;
  overdueEvents: number;
  completedEvents: number;
}

export async function getWorkspaceCountersAction(): Promise<WorkspaceCounters[]> {
  const user = await userRepo.getLoggedUser();
  if (!user) return [];

  const userSeqId = user.seqid;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all workspace IDs the user has access to
  const userWorkspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { users_seqid: userSeqId },
        { members: { some: { userSeqid: userSeqId } } }
      ]
    },
    select: { seqid: true }
  });

  const results: WorkspaceCounters[] = [];

  for (const ws of userWorkspaces) {
    // Get active board IDs for this workspace
    const activeBoardIds = await prisma.board.findMany({
      where: { workspaceId: ws.seqid, dtcon: null },
      select: { seqId: true }
    });
    const boardSeqIds = activeBoardIds.map(b => b.seqId);

    const [activeBoards, overdueBoards, totalEvents, overdueEvents, completedEvents] = await Promise.all([
      // Atividades ativas
      Promise.resolve(activeBoardIds.length),
      // Atividades atrasadas (boards com previsto < hoje)
      prisma.board.count({
        where: { workspaceId: ws.seqid, dtcon: null, previsto: { lt: today } }
      }),
      // Total de eventos das atividades ativas
      prisma.card.count({
        where: { board_seqid: { in: boardSeqIds } }
      }),
      // Eventos atrasados (das atividades ativas)
      prisma.card.count({
        where: { board_seqid: { in: boardSeqIds }, previsto: { lt: today }, dtcon: null }
      }),
      // Eventos concluídos (das atividades ativas)
      prisma.card.count({
        where: { board_seqid: { in: boardSeqIds }, dtcon: { not: null } }
      })
    ]);

    results.push({
      workspaceSeqid: ws.seqid.toString(),
      activeBoards,
      overdueBoards,
      totalEvents,
      overdueEvents,
      completedEvents
    });
  }

  return results;
}
