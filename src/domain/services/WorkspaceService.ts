import { WorkspaceRepository } from '../repositories/WorkspaceRepository';
import { UserRepository } from '../repositories/UserRepository';
import prisma from '@/lib/prisma';

export class WorkspaceService {
  private repo = new WorkspaceRepository();
  private userRepo = new UserRepository();

  async getTypes() {
    return await this.repo.getTypes();
  }

  async createWorkspace(data: { name: string; typeId: string; description?: string; userId: string }) {
    // Busca o usuário para obter o seqid
    const user = await this.userRepo.findById(data.userId);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const workspace = await this.repo.createWorkspace({
      id: crypto.randomUUID(),
      users_seqid: user.seqid,
      ...data
    });

    // Registrar o criador como membro OWNER
    await prisma.workspaceMember.create({
      data: {
        workspaceSeqid: workspace.seqid,
        userSeqid: user.seqid,
        role: 'OWNER'
      }
    });

    // Create default columns for the new workspace
    const defaultColumns = [
      { title: 'A Fazer', order: 0, workspaceSeqid: workspace.seqid },
      { title: 'Em Progresso', order: 1, workspaceSeqid: workspace.seqid },
      { title: 'Concluído', order: 2, workspaceSeqid: workspace.seqid }
    ];

    await prisma.column.createMany({
      data: defaultColumns
    });

    return {
      ...workspace,
      seqid: workspace.seqid.toString(),
      users_seqid: workspace.users_seqid.toString()
    };
  }

  private async deduplicateWorkspaceColumns(workspaceSeqid: bigint) {
    const columns = await prisma.column.findMany({
      where: { workspaceSeqid },
      orderBy: { order: 'asc' }
    });

    const groups: { [title: string]: any[] } = {};
    for (const col of columns) {
      const cleanTitle = col.title.trim().toLowerCase();
      if (!groups[cleanTitle]) {
        groups[cleanTitle] = [];
      }
      groups[cleanTitle].push(col);
    }

    for (const title of Object.keys(groups)) {
      const colGroup = groups[title];
      if (colGroup.length > 1) {
        const canonical = colGroup[0];
        const duplicates = colGroup.slice(1);

        for (const duplicate of duplicates) {
          await prisma.card.updateMany({
            where: { columnId: duplicate.seqid },
            data: { columnId: canonical.seqid }
          });

          await prisma.column.delete({
            where: { seqid: duplicate.seqid }
          });
        }
      }
    }
  }

  async getUserWorkspaces(userId: string, userSeqid?: string) {
    const workspaces = await this.repo.findByUserId(userId, userSeqid ? BigInt(userSeqid) : undefined);

    for (const ws of workspaces) {
      await this.deduplicateWorkspaceColumns(ws.seqid);
    }

    const cleanWorkspaces = await this.repo.findByUserId(userId, userSeqid ? BigInt(userSeqid) : undefined);

    return cleanWorkspaces.map(ws => {
      const wsColumns = (ws as any).columns?.map((c: any) => ({
        ...c,
        seqid: c.seqid.toString(),
        workspaceSeqid: c.workspaceSeqid?.toString(),
        id: c.seqid.toString(),
        cards: c.cards?.map((card: any) => ({
          ...card,
          id: card.seqid.toString(),
          seqid: card.seqid.toString(),
          board_seqid: card.board_seqid?.toString(),
          user_seqid: card.user_seqid?.toString(),
          taskuser_seqid: card.taskuser_seqid?.toString(),
          columnId: card.columnId.toString()
        })) || []
      })) || [];

      return {
        ...ws,
        seqid: ws.seqid.toString(),
        users_seqid: ws.users_seqid.toString(),
        columns: wsColumns,
        boards: (ws as any).boards?.map((b: any) => {
          const boardSeqIdStr = b.seqId.toString();
          
          // Map workspace columns, filtering cards to only those belonging to this board!
          const boardColumns = wsColumns.map((c: any) => {
            const rawCol = (ws as any).columns?.find((x: any) => x.seqid.toString() === c.id);
            const filteredCards = rawCol?.cards?.filter((card: any) => card.board_seqid?.toString() === boardSeqIdStr) || [];
            
            return {
              ...c,
              cards: filteredCards.map((card: any) => ({
                ...card,
                id: card.seqid.toString(),
                seqid: card.seqid.toString(),
                board_seqid: card.board_seqid?.toString(),
                user_seqid: card.user_seqid?.toString(),
                taskuser_seqid: card.taskuser_seqid?.toString(),
                columnId: card.columnId.toString()
              }))
            };
          });

          return {
            ...b,
            id: boardSeqIdStr,
            seqId: boardSeqIdStr,
            workspaceId: b.workspaceId.toString(),
            user_seqid: b.user_seqid?.toString(),
            columns: boardColumns
          };
        }) || []
      };
    });
  }

  async updateWorkspace(workspaceId: string, data: { name: string; typeId: string; description?: string }) {
    const updated = await this.repo.updateWorkspace(workspaceId, data);
    return {
      ...updated,
      seqid: updated.seqid.toString(),
      users_seqid: updated.users_seqid.toString()
    };
  }

  async getWorkspaceMembersWithRoles(workspaceId: string) {
    let seqid: bigint;
    if (/^\d+$/.test(workspaceId)) {
      seqid = BigInt(workspaceId);
    } else {
      const ws = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { seqid: true }
      });
      if (!ws) throw new Error('Workspace não encontrado');
      seqid = ws.seqid;
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceSeqid: seqid },
      include: { user: true },
      orderBy: { user: { name: 'asc' } }
    });

    return members.map(m => ({
      seqid: m.seqid.toString(),
      workspaceSeqid: m.workspaceSeqid.toString(),
      userSeqid: m.userSeqid.toString(),
      role: m.role,
      createdAt: m.createdAt,
      user: {
        seqid: m.user.seqid.toString(),
        name: m.user.name,
        email: m.user.email,
        image: m.user.image
      }
    }));
  }

  async sendWorkspaceInvite(workspaceId: string, email: string, role: string, invitedBy: any) {
    let seqid: bigint;
    if (/^\d+$/.test(workspaceId)) {
      seqid = BigInt(workspaceId);
    } else {
      const ws = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { seqid: true }
      });
      if (!ws) throw new Error('Workspace não encontrado');
      seqid = ws.seqid;
    }

    // Check if the user is already a member
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMember = await prisma.workspaceMember.findFirst({
        where: {
          workspaceSeqid: seqid,
          userSeqid: existingUser.seqid
        }
      });
      if (existingMember) {
        throw new Error('Este usuário já é colaborador desta área de trabalho.');
      }
    }

    // Check if there is already a pending invite
    const existingInvite = await prisma.workspaceInvite.findFirst({
      where: {
        workspaceSeqid: seqid,
        email
      }
    });
    if (existingInvite) {
      throw new Error('Já existe um convite pendente para este e-mail.');
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    const invite = await prisma.workspaceInvite.create({
      data: {
        workspaceSeqid: seqid,
        email,
        role,
        token,
        invitedBySeqid: BigInt(invitedBy.seqid),
        expiresAt
      }
    });

    return {
      ...invite,
      seqid: invite.seqid.toString(),
      workspaceSeqid: invite.workspaceSeqid.toString(),
      invitedBySeqid: invite.invitedBySeqid.toString()
    };
  }

  async getWorkspaceInvites(workspaceId: string) {
    let seqid: bigint;
    if (/^\d+$/.test(workspaceId)) {
      seqid = BigInt(workspaceId);
    } else {
      const ws = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { seqid: true }
      });
      if (!ws) throw new Error('Workspace não encontrado');
      seqid = ws.seqid;
    }

    const invites = await prisma.workspaceInvite.findMany({
      where: { workspaceSeqid: seqid },
      include: { invitedBy: true },
      orderBy: { createdAt: 'desc' }
    });

    return invites.map(i => ({
      seqid: i.seqid.toString(),
      workspaceSeqid: i.workspaceSeqid.toString(),
      email: i.email,
      role: i.role,
      token: i.token,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
      invitedBy: {
        seqid: i.invitedBy.seqid.toString(),
        name: i.invitedBy.name,
        email: i.invitedBy.email
      }
    }));
  }

  async cancelWorkspaceInvite(inviteSeqid: string) {
    const invite = await prisma.workspaceInvite.delete({
      where: { seqid: BigInt(inviteSeqid) }
    });
    return {
      ...invite,
      seqid: invite.seqid.toString()
    };
  }

  async removeWorkspaceMember(workspaceId: string, userSeqid: string) {
    let seqid: bigint;
    if (/^\d+$/.test(workspaceId)) {
      seqid = BigInt(workspaceId);
    } else {
      const ws = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { seqid: true }
      });
      if (!ws) throw new Error('Workspace não encontrado');
      seqid = ws.seqid;
    }

    const memberUserSeqid = BigInt(userSeqid);

    // Prevent removing the last OWNER of the workspace
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceSeqid: seqid, userSeqid: memberUserSeqid }
    });

    if (member?.role === 'OWNER') {
      const otherOwnersCount = await prisma.workspaceMember.count({
        where: {
          workspaceSeqid: seqid,
          role: 'OWNER',
          userSeqid: { not: memberUserSeqid }
        }
      });
      if (otherOwnersCount === 0) {
        throw new Error('Não é possível remover o único proprietário desta área de trabalho.');
      }
    }

    const deleted = await prisma.workspaceMember.delete({
      where: {
        workspaceSeqid_userSeqid: {
          workspaceSeqid: seqid,
          userSeqid: memberUserSeqid
        }
      }
    });

    return {
      ...deleted,
      seqid: deleted.seqid.toString(),
      workspaceSeqid: deleted.workspaceSeqid.toString(),
      userSeqid: deleted.userSeqid.toString()
    };
  }

  async updateWorkspaceMemberRole(workspaceId: string, userSeqid: string, role: string) {
    let seqid: bigint;
    if (/^\d+$/.test(workspaceId)) {
      seqid = BigInt(workspaceId);
    } else {
      const ws = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { seqid: true }
      });
      if (!ws) throw new Error('Workspace não encontrado');
      seqid = ws.seqid;
    }

    const memberUserSeqid = BigInt(userSeqid);

    const updated = await prisma.workspaceMember.update({
      where: {
        workspaceSeqid_userSeqid: {
          workspaceSeqid: seqid,
          userSeqid: memberUserSeqid
        }
      },
      data: { role }
    });

    return {
      ...updated,
      seqid: updated.seqid.toString(),
      workspaceSeqid: updated.workspaceSeqid.toString(),
      userSeqid: updated.userSeqid.toString()
    };
  }

  async acceptWorkspaceInvite(token: string, user: any) {
    const invite = await prisma.workspaceInvite.findUnique({
      where: { token }
    });

    if (!invite) {
      throw new Error('Convite inválido ou expirado.');
    }

    if (invite.expiresAt < new Date()) {
      await prisma.workspaceInvite.delete({ where: { token } });
      throw new Error('Este convite expirou.');
    }

    // Add user as a member
    const newMember = await prisma.workspaceMember.create({
      data: {
        workspaceSeqid: invite.workspaceSeqid,
        userSeqid: BigInt(user.seqid),
        role: invite.role
      }
    });

    // Delete the invite
    await prisma.workspaceInvite.delete({
      where: { token }
    });

    return {
      ...newMember,
      seqid: newMember.seqid.toString(),
      workspaceSeqid: newMember.workspaceSeqid.toString(),
      userSeqid: newMember.userSeqid.toString()
    };
  }
}
