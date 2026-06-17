import prisma from '@/lib/prisma';

export class CardRepository {
  async findById(cardId: string) {
    return await prisma.card.findUnique({
      where: { seqid: BigInt(cardId) },
      include: { 
        column: { 
          include: { workspace: true } 
        },
        board: true
      }
    });
  }

  async findLastByColumnId(columnId: string) {
    return await prisma.card.findFirst({
      where: { columnId: BigInt(columnId) },
      orderBy: { order: 'desc' }
    });
  }

  async findCardsByUserSeqid(userSeqid: bigint) {
    return await prisma.card.findMany({
      where: { 
        taskuser_seqid: userSeqid,
        dtcon: null
      },
      include: {
        task_user: true,
        board: {
          include: {
            workspace: true
          }
        },
        column: {
          include: {
            workspace: true
          }
        },
        card_act: {
          orderBy: { created_at: 'desc' },
          include: { users: true }
        }
      },
      orderBy: [
        { previsto: 'asc' },
        { createdAt: 'asc' }
      ]
    });
  }

  async createCard(data: any) {
    return await prisma.card.create({
      data,
      include: { column: true }
    });
  }

  async updateCard(cardId: string, data: any) {
    return await prisma.card.update({
      where: { seqid: BigInt(cardId) },
      data,
      include: { 
        column: { 
          include: { workspace: true } 
        },
        board: true
      }
    });
  }

  async createCardAction(data: any) {
    return await prisma.card_act.create({
      data,
      include: { users: true }
    });
  }

  async updateCardAction(actionSeqid: bigint, data: any) {
    return await prisma.card_act.update({
      where: { seqid: actionSeqid },
      data,
      include: { users: true }
    });
  }

  async deleteCardAction(actionSeqid: bigint) {
    await prisma.card_act.delete({
      where: { seqid: actionSeqid }
    });
  }

  async findAllWithFullRelations() {
    return await prisma.card.findMany({
      include: {
        users: true,
        task_user: true,
        board: {
          include: {
            workspace: true
          }
        },
        card_act: {
          include: {
            users: true
          },
          orderBy: { created_at: 'desc' }
        },
        column: {
          include: {
            workspace: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
