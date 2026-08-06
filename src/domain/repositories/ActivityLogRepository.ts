import prisma from '@/lib/prisma';

export class ActivityLogRepository {
  async createLog(data: { boardId: string; userId: string; action: string; description: string }) {
    // Validação: boardId deve ser um número válido (referência ao board.seqId)
    if (!data.boardId || data.boardId === '0' || !/^\d+$/.test(data.boardId)) {
      console.warn(`[ActivityLog] boardId inválido: "${data.boardId}" — ação: ${data.action}`);
    }
    if (!data.userId) {
      console.warn(`[ActivityLog] userId vazio — ação: ${data.action}`);
    }
    return await prisma.activityLog.create({ data });
  }

  async getLogsByBoardId(boardId: string, currentUser?: any) {
    let whereClause: any = {};

    if (boardId !== 'ALL') {
      whereClause = { boardId };
    } else if (currentUser) {
      const userSeqId = BigInt(currentUser.seqid || currentUser.id);
      
      // Get all workspaces owned by the user
      const ownedWorkspaces = await prisma.workspace.findMany({
        where: {
          users_seqid: userSeqId
        },
        select: {
          seqid: true
        }
      });
      const ownedWorkspaceSeqids = ownedWorkspaces.map(w => w.seqid);

      // Get all board IDs belonging to these workspaces
      const boardsInOwnedWorkspaces = await prisma.board.findMany({
        where: {
          workspaceId: {
            in: ownedWorkspaceSeqids
          }
        },
        select: {
          seqId: true
        }
      });
      const ownedBoardIds = boardsInOwnedWorkspaces.map(b => b.seqId.toString());

      // User identifiers
      const userIdStr = userSeqId.toString();
      const userEmailStr = currentUser.email;

      whereClause = {
        OR: [
          {
            boardId: {
              in: ownedBoardIds
            }
          },
          {
            userId: userIdStr
          },
          {
            userId: userEmailStr
          }
        ]
      };
    }

    const logs = await prisma.activityLog.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    // Resolve user associations in memory to avoid Prisma schema constraints on dynamic/missing id column
    const userIds = [...new Set(logs.map(log => log.userId).filter(Boolean))];
    
    // Convert string IDs to bigints where possible to search by seqid
    const userSeqIds = userIds
      .map(id => {
        try {
          return BigInt(id);
        } catch {
          return null;
        }
      })
      .filter((id): id is bigint => id !== null);

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { in: userIds } },
          { seqid: { in: userSeqIds } }
        ]
      }
    });

    return logs.map(log => {
      const matchedUser = users.find(u => 
        u.email === log.userId || 
        u.seqid.toString() === log.userId ||
        `user-${u.seqid}` === log.userId
      );
      
      return {
        ...log,
        seqid: log.seqid.toString(),
        user: matchedUser ? {
          name: matchedUser.name,
          image: matchedUser.image
        } : {
          name: log.userId || 'Usuário',
          image: null
        }
      };
    });
  }
}
