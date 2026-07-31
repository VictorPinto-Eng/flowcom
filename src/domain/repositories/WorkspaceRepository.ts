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

  async findByUserId(userId: string, users_seqid?: bigint, options?: { lightweight?: boolean }) {
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

    const where = { OR: conditions };

    // Lightweight mode: skip cards/card_act, limit boards to 50
    if (options?.lightweight) {
      return await prisma.workspace.findMany({
        where,
        include: {
          type: true,
          columns: {
            orderBy: { order: 'asc' },
            select: {
              seqid: true,
              title: true,
              order: true,
              visible: true,
              workspaceSeqid: true
            }
          },
          boards: {
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
              user: { select: { seqid: true, name: true, image: true } },
              sector: true,
              _count: {
                select: {
                  card: true
                }
              }
            }
          }
        }
      });
    }

    // Full mode: includes cards with card_act (original behavior)
    return await prisma.workspace.findMany({
      where,
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
                  select: {
                    seqid: true,
                    description: true,
                    created_at: true,
                    user_seqid: true,
                    users: {
                      select: {
                        name: true,
                        image: true
                      }
                    }
                  }
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
