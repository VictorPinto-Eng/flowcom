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
    // Upcoming deadlines - cards
    prisma.card.findMany({
      where: {
        previsto: { gte: today, lte: nextWeek },
        dtcon: null,
        column: { workspaceSeqid: { in: workspaceSeqids } }
      },
      include: {
        board: { select: { name: true } },
        column: { include: { workspace: { select: { name: true } } } }
      },
      orderBy: { previsto: 'asc' },
      take: 5
    }),
    // Overdue items - boards
    prisma.board.findMany({
      where: {
        previsto: { lt: today },
        dtcon: null,
        workspaceId: { in: workspaceSeqids }
      },
      include: { workspace: { select: { name: true } } },
      orderBy: { previsto: 'asc' },
      take: 5
    }),
    // Overdue items - cards
    prisma.card.findMany({
      where: {
        previsto: { lt: today },
        dtcon: null,
        column: { workspaceSeqid: { in: workspaceSeqids } }
      },
      include: {
        board: { select: { name: true } },
        column: { include: { workspace: { select: { name: true } } } }
      },
      orderBy: { previsto: 'asc' },
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

  // Build overdue items list (merge boards + cards, sort by most overdue, take 5)
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
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
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

function calcDaysOverdue(previsto: Date | string, today: Date): number {
  const d = new Date(previsto);
  d.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - d.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}
