import prisma from '@/lib/prisma';

export class BoardRepository {
  async getSectors() {
    return await prisma.sector.findMany({
      where: { active: true },
      orderBy: { id: 'asc' }
    });
  }

  async createBoard(data: { id: string; name: string; workspaceId: bigint; user_seqid?: bigint; sectorId?: number; detalhes?: string; dtatv?: Date; previsto?: Date }) {
    const board = await prisma.board.create({
      data: {
        name: data.name,
        workspaceId: data.workspaceId,
        user_seqid: data.user_seqid,
        sectorId: data.sectorId,
        detalhes: data.detalhes,
        dtatv: data.dtatv,
        previsto: data.previsto
      }
    });

    // Fetch parent workspace columns to return them
    const columns = await prisma.column.findMany({
      where: { workspaceSeqid: data.workspaceId },
      orderBy: { order: 'asc' }
    });

    return {
      ...board,
      columns
    };
  }

  async findById(boardId: string) {
    if (!boardId || boardId === 'ALL') return null;
    try {
      const seqId = BigInt(boardId);
      const board = await prisma.board.findUnique({
        where: { seqId },
        include: {
          sector: true
        }
      });

      if (!board) return null;

      // Fetch workspace columns with cards filtered by this board
      const columns = await prisma.column.findMany({
        where: { workspaceSeqid: board.workspaceId },
        orderBy: { order: 'asc' },
        include: {
          cards: {
            where: { board_seqid: board.seqId },
            orderBy: { order: 'asc' },
            include: {
              task_user: true,
              users: true,
              card_act: {
                orderBy: { created_at: 'desc' },
                include: { users: true }
              }
            }
          }
        }
      });

      // Fetch ALL cards of this board regardless of which column they're in
      // (some legacy cards may point to columns from another workspace)
      const allCards = await prisma.card.findMany({
        where: { board_seqid: board.seqId },
        orderBy: { order: 'asc' },
        include: {
          task_user: true,
          users: true,
          column: { select: { title: true, seqid: true } },
          card_act: {
            orderBy: { created_at: 'desc' },
            include: { users: true }
          }
        }
      });

      return {
        ...board,
        columns,
        allCards
      };
    } catch (e) {
      console.error('Error finding board by seqId:', e);
      return null;
    }
  }

  async updateBoard(boardId: string, data: any) {
    try {
      const seqId = BigInt(boardId);
      return await prisma.board.update({
        where: { seqId },
        data
      });
    } catch (e) {
      console.error('Error updating board by seqId:', e);
      throw e;
    }
  }
}
