import prisma from '@/lib/prisma';

export class ColumnRepository {
  async findById(columnId: string) {
    return await prisma.column.findUnique({
      where: { seqid: BigInt(columnId) },
      include: { 
        cards: { 
          orderBy: { order: 'asc' },
          include: { 
            card_act: { orderBy: { created_at: 'desc' }, include: { users: true } } 
          }
        },
        workspace: true 
      }
    });
  }

  async findAllByWorkspaceId(workspaceSeqId: bigint) {
    return await prisma.column.findMany({
      where: { workspaceSeqid: workspaceSeqId },
      orderBy: { order: 'asc' }
    });
  }

  async findLastByWorkspaceId(workspaceSeqId: bigint) {
    return await prisma.column.findFirst({
      where: { workspaceSeqid: workspaceSeqId },
      orderBy: { order: 'desc' }
    });
  }

  async createColumn(data: { title: string; workspaceSeqid: bigint; order: number; cards?: any }) {
    return await prisma.column.create({ data });
  }

  async updateColumn(columnSeqId: string, data: any) {
    return await prisma.column.update({
      where: { seqid: BigInt(columnSeqId) },
      data
    });
  }

  async deleteColumn(columnSeqId: string) {
    return await prisma.column.delete({
      where: { seqid: BigInt(columnSeqId) }
    });
  }
}
