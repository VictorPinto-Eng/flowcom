import prisma from '@/lib/prisma';

export class WorkspaceRepository {
  async getTypes() {
    return await prisma.workspaceType.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async getFirstType() {
    return await prisma.workspaceType.findFirst();
  }

  async createType(data: { id: string; name: string }) {
    return await prisma.workspaceType.create({ data });
  }

  async createWorkspace(data: { id: string; name: string; typeId: string; description?: string; userId: string; users_seqid: bigint }) {
    return await prisma.workspace.create({
      data,
      include: { boards: true }
    });
  }

  async findById(id: string) {
    return await prisma.workspace.findFirst({
      where: { id },
      include: { type: true }
    });
  }

  async findBySeqId(seqid: bigint) {
    return await prisma.workspace.findUnique({
      where: { seqid },
      include: { type: true }
    });
  }

  async findByUserId(userId: string, users_seqid?: bigint) {
    const conditions: any[] = [{ userId }];
    if (users_seqid) {
      conditions.push({ users_seqid });
      conditions.push({
        members: {
          some: {
            userSeqid: users_seqid
          }
        }
      });
    }

    return await prisma.workspace.findMany({
      where: {
        OR: conditions
      },
      include: {
        type: true,
        columns: {
          orderBy: { order: 'asc' },
          include: {
            cards: {
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
        },
        boards: {
          include: {
            user: true,
            sector: true
          }
        }
      }
    });
  }

  async findFirstByUserId(userId: string, users_seqid?: bigint) {
    const conditions: any[] = [{ userId }];
    if (users_seqid) {
      conditions.push({ users_seqid });
      conditions.push({
        members: {
          some: {
            userSeqid: users_seqid
          }
        }
      });
    }

    return await prisma.workspace.findFirst({
      where: {
        OR: conditions
      },
      include: {
        boards: {
          orderBy: { createdAt: 'asc' },
          include: { sector: true }
        }
      }
    });
  }

  async updateWorkspace(id: string, data: { name: string; typeId: string; description?: string }) {
    return await prisma.workspace.update({
      where: { id },
      data
    });
  }
}
