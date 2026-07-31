'use server';

import prisma from '@/lib/prisma';
import { UserRepository } from '@/domain/repositories/UserRepository';

const userRepo = new UserRepository();

export interface ServerDiagnostics {
  timestamp: string;
  database: {
    totalWorkspaces: number;
    totalBoards: number;
    totalCards: number;
    totalCardActions: number;
    totalUsers: number;
    totalWorkspaceMembers: number;
  };
  userMetrics: {
    userId: string;
    userName: string;
    userSeqid: string;
    workspacesOwned: number;
    workspacesAsMember: number;
    totalBoardsAccessible: number;
    totalCardsAccessible: number;
    totalCardActionsAccessible: number;
  };
  topWorkspaces: Array<{
    workspaceName: string;
    boardCount: number;
    cardCount: number;
  }>;
  recommendations: string[];
}

export async function getServerDiagnosticsAction(): Promise<ServerDiagnostics> {
  const user = await userRepo.getLoggedUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const now = new Date().toISOString();
  const userSeqid = BigInt(user.seqid || 0);

  // Get overall database metrics
  const [totalWorkspaces, totalBoards, totalCards, totalCardActions, totalUsers, totalMembers] = await Promise.all([
    prisma.workspace.count(),
    prisma.board.count(),
    prisma.card.count(),
    prisma.card_act.count(),
    prisma.user.count(),
    prisma.workspaceMember.count()
  ]);

  // Get user's accessible data
  const userWorkspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { users_seqid: userSeqid },
        { members: { some: { userSeqid } } }
      ]
    },
    select: { seqid: true, name: true, users_seqid: true }
  });

  const workspaceSeqids = userWorkspaces.map(w => w.seqid);
  const workspacesOwned = userWorkspaces.filter(w => w.users_seqid === userSeqid).length;
  const workspacesAsMember = userWorkspaces.length - workspacesOwned;

  // Get boards accessible to user
  const userBoards = await prisma.board.findMany({
    where: { workspaceId: { in: workspaceSeqids } }
  });
  const totalBoardsAccessible = userBoards.length;

  // Get cards accessible to user
  const userCards = await prisma.card.findMany({
    where: {
      column: { workspaceSeqid: { in: workspaceSeqids } }
    }
  });
  const totalCardsAccessible = userCards.length;
  const cardSeqids = userCards.map(c => c.seqid);

  // Get card actions for user's cards
  const userCardActions = await prisma.card_act.findMany({
    where: { card_seqid: { in: cardSeqids } }
  });
  const totalCardActionsAccessible = userCardActions.length;

  // Calculate top workspaces by card count
  const topWorkspaces: Array<{
    workspaceName: string;
    boardCount: number;
    cardCount: number;
  }> = [];

  for (const workspace of userWorkspaces) {
    const wsBoards = userBoards.filter(b => b.workspaceId === workspace.seqid);
    const wsBoardSeqids = wsBoards.map(b => b.seqId);

    const wsCards = userCards.filter(c => {
      return wsBoardSeqids.includes(c.board_seqid as bigint);
    });

    topWorkspaces.push({
      workspaceName: workspace.name,
      boardCount: wsBoards.length,
      cardCount: wsCards.length
    });
  }

  topWorkspaces.sort((a, b) => b.cardCount - a.cardCount);

  // Generate recommendations
  const recommendations = generateRecommendations({
    totalCards,
    totalCardActions,
    userCardsAccessible: totalCardsAccessible,
    userBoardsAccessible: totalBoardsAccessible,
    userWorkspacesAccessible: userWorkspaces.length
  });

  // Save snapshot: delete previous for this user, then insert new
  try {
    await prisma.serverDiagnosticSnapshot.deleteMany({
      where: { userSeqid }
    });

    await prisma.serverDiagnosticSnapshot.create({
      data: {
        userSeqid,
        totalWorkspaces,
        totalBoards,
        totalCards,
        totalCardActions,
        totalUsers,
        totalWorkspaceMembers: totalMembers,
        userWorkspacesOwned: workspacesOwned,
        userWorkspacesAsMember: workspacesAsMember,
        userBoardsAccessible: totalBoardsAccessible,
        userCardsAccessible: totalCardsAccessible,
        userCardActionsAccessible: totalCardActionsAccessible,
        topWorkspacesJson: JSON.stringify(topWorkspaces.slice(0, 5)),
        recommendationsJson: JSON.stringify(recommendations)
      }
    });
  } catch (err) {
    console.error('Failed to save diagnostic snapshot:', err);
  }

  return {
    timestamp: now,
    database: {
      totalWorkspaces,
      totalBoards,
      totalCards,
      totalCardActions,
      totalUsers,
      totalWorkspaceMembers: totalMembers
    },
    userMetrics: {
      userId: user.id,
      userName: user.name,
      userSeqid: user.seqid?.toString() || 'N/A',
      workspacesOwned,
      workspacesAsMember,
      totalBoardsAccessible,
      totalCardsAccessible,
      totalCardActionsAccessible
    },
    topWorkspaces: topWorkspaces.slice(0, 5),
    recommendations
  };
}

function generateRecommendations(metrics: {
  totalCards: number;
  totalCardActions: number;
  userCardsAccessible: number;
  userBoardsAccessible: number;
  userWorkspacesAccessible: number;
}): string[] {
  const recommendations: string[] = [];

  if (metrics.userCardsAccessible > 10000) {
    recommendations.push(
      '⚠️ HIGH: Over 10k cards accessible. Consider implementing pagination/virtualization.'
    );
  }

  if (metrics.userBoardsAccessible > 500) {
    recommendations.push(
      '⚠️ MEDIUM: Over 500 boards accessible. Consider lazy-loading or filtering boards.'
    );
  }

  if (metrics.userWorkspacesAccessible > 20) {
    recommendations.push(
      '⚠️ MEDIUM: User has access to over 20 workspaces. Consider lazy-loading workspace details.'
    );
  }

  if (metrics.totalCardActions > 100000) {
    recommendations.push(
      '✅ Note: High card action count (100k+). Archive/delete old actions periodically.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ OK: System metrics look healthy.');
  }

  return recommendations;
}
