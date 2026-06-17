import prisma from '@/lib/prisma';

export class ActivityLogRepository {
  async createLog(data: { boardId: string; userId: string; action: string; description: string }) {
    return await prisma.activityLog.create({ data });
  }

  async getLogsByBoardId(boardId: string) {
    const whereClause = boardId === 'ALL' ? {} : { boardId };
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
