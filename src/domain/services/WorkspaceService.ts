import { WorkspaceRepository } from '../repositories/WorkspaceRepository';
import { UserRepository } from '../repositories/UserRepository';
import prisma from '@/lib/prisma';
import { sendWorkspaceInviteEmail } from '@/lib/resend';

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

    // Check in-memory if there are any duplicate columns in any workspace
    let hasDuplicates = false;
    for (const ws of workspaces) {
      if (ws.columns && ws.columns.length > 0) {
        const seenTitles = new Set<string>();
        for (const col of ws.columns) {
          const cleanTitle = col.title.trim().toLowerCase();
          if (seenTitles.has(cleanTitle)) {
            hasDuplicates = true;
            break;
          }
          seenTitles.add(cleanTitle);
        }
      }
      if (hasDuplicates) break;
    }

    let cleanWorkspaces = workspaces;
    if (hasDuplicates) {
      for (const ws of workspaces) {
        await this.deduplicateWorkspaceColumns(ws.seqid);
      }
      cleanWorkspaces = await this.repo.findByUserId(userId, userSeqid ? BigInt(userSeqid) : undefined);
    }
    
    const userSeqIdVal = userSeqid ? BigInt(userSeqid) : undefined;
    const memberRoles = userSeqIdVal
      ? await prisma.workspaceMember.findMany({
          where: { userSeqid: userSeqIdVal },
          select: { workspaceSeqid: true, role: true }
        })
      : [];

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
          columnId: card.columnId.toString(),
          card_act: card.card_act?.map((act: any) => ({
            seqid: act.seqid.toString(),
            description: act.description,
            created_at: act.created_at,
            user_seqid: act.user_seqid?.toString(),
            users: act.users ? {
              name: act.users.name,
              image: act.users.image
            } : null
          })) || []
        })) || []
      })) || [];

      const memberRecord = memberRoles.find(mr => mr.workspaceSeqid === ws.seqid);
      const userRole = memberRecord?.role || (ws.users_seqid === userSeqIdVal ? 'OWNER' : 'MEMBER');

      return {
        ...ws,
        seqid: ws.seqid.toString(),
        users_seqid: ws.users_seqid.toString(),
        currentUserRole: userRole,
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
                columnId: card.columnId.toString(),
                card_act: card.card_act?.map((act: any) => ({
                  seqid: act.seqid.toString(),
                  description: act.description,
                  created_at: act.created_at,
                  user_seqid: act.user_seqid?.toString(),
                  users: act.users ? {
                    name: act.users.name,
                    image: act.users.image
                  } : null
                })) || []
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
    let workspaceName = '';
    if (/^\d+$/.test(workspaceId)) {
      seqid = BigInt(workspaceId);
      const ws = await prisma.workspace.findUnique({
        where: { seqid },
        select: { name: true }
      });
      workspaceName = ws?.name || '';
    } else {
      const ws = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { seqid: true, name: true }
      });
      if (!ws) throw new Error('Workspace não encontrado');
      seqid = ws.seqid;
      workspaceName = ws.name;
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

    // Send workspace invite email asynchronously (do not block execution on failure)
    const isRegistered = !!existingUser;
    try {
      await sendWorkspaceInviteEmail(email, invitedBy.name, workspaceName, token, isRegistered);
    } catch (error) {
      console.error('Failed to send workspace invite email:', error);
    }

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

  async acceptWorkspaceInvite(token: string, user: { seqid: bigint | number | string; email: string }) {
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

    // Verify the invite belongs to the authenticated user's email
    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new Error('Este convite não foi enviado para este usuário.');
    }

    if (!['ADMIN', 'MEMBER'].includes(invite.role)) {
      throw new Error('Papel do convite inválido.');
    }

    const role = invite.role;
    const userSeqid = BigInt(user.seqid);

    const member = await prisma.$transaction(async (tx) => {
      const workspaceMember = await tx.workspaceMember.upsert({
        where: {
          workspaceSeqid_userSeqid: {
            workspaceSeqid: invite.workspaceSeqid,
            userSeqid
          }
        },
        create: {
          workspaceSeqid: invite.workspaceSeqid,
          userSeqid,
          role
        },
        update: {}
      });

      await tx.workspaceInvite.deleteMany({
        where: { token }
      });

      return workspaceMember;
    });

    return {
      ...member,
      seqid: member.seqid.toString(),
      workspaceSeqid: member.workspaceSeqid.toString(),
      userSeqid: member.userSeqid.toString()
    };
  }

  async rejectWorkspaceInvite(token: string, user: any) {
    const invite = await prisma.workspaceInvite.findUnique({
      where: { token }
    });

    if (!invite) {
      throw new Error('Convite inválido ou expirado.');
    }

    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new Error('Este convite não foi enviado para este usuário.');
    }

    await prisma.workspaceInvite.delete({
      where: { token }
    });
  }

  async getUserRoleInWorkspace(workspaceId: string, userSeqid: bigint): Promise<string | null> {
    let seqid: bigint;
    if (/^\d+$/.test(workspaceId)) {
      seqid = BigInt(workspaceId);
    } else {
      const ws = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { seqid: true }
      });
      if (!ws) return null;
      seqid = ws.seqid;
    }

    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceSeqid: seqid,
        userSeqid: userSeqid
      },
      select: {
        role: true
      }
    });

    return member?.role || null;
  }

  async getMovements(userId: string, userSeqid?: string) {
    const workspaces = await this.repo.findByUserId(userId, userSeqid ? BigInt(userSeqid) : undefined);

    const workspaceMap = new Map<bigint, { id: string; name: string }>();
    const workspaceSeqids: bigint[] = [];
    for (const ws of workspaces) {
      workspaceMap.set(ws.seqid, { id: ws.id, name: ws.name });
      workspaceSeqids.push(ws.seqid);
    }

    if (workspaceSeqids.length === 0) {
      return [];
    }

    const boards = await prisma.board.findMany({
      where: {
        workspaceId: { in: workspaceSeqids }
      }
    });

    const boardMap = new Map<bigint, { seqId: bigint; name: string; createdAt: Date; workspaceSeqid: bigint }>();
    const boardSeqids: bigint[] = [];
    const boardSeqidStrings: string[] = [];
    for (const board of boards) {
      boardMap.set(board.seqId, {
        seqId: board.seqId,
        name: board.name,
        createdAt: board.createdAt,
        workspaceSeqid: board.workspaceId
      });
      boardSeqids.push(board.seqId);
      boardSeqidStrings.push(board.seqId.toString());
    }

    if (boardSeqids.length === 0) {
      return [];
    }

    const logs = await prisma.activityLog.findMany({
      where: {
        boardId: { in: boardSeqidStrings }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const userIds = [...new Set(logs.map(log => log.userId).filter(Boolean))];
    const userSeqIds = userIds
      .map(id => {
        try {
          return BigInt(id);
        } catch {
          return null;
        }
      })
      .filter((id): id is bigint => id !== null);

    const logUsers = await prisma.user.findMany({
      where: {
        OR: [
          { email: { in: userIds } },
          { seqid: { in: userSeqIds } }
        ]
      }
    });

    const cards = await prisma.card.findMany({
      where: {
        board_seqid: { in: boardSeqids }
      },
      select: {
        seqid: true,
        title: true
      }
    });

    const cardSeqids: bigint[] = cards.map(c => c.seqid);

    const cardActs = cardSeqids.length > 0 ? await prisma.card_act.findMany({
      where: {
        card_seqid: { in: cardSeqids }
      },
      include: {
        users: {
          select: {
            name: true,
            image: true
          }
        },
        card: {
          select: {
            title: true,
            board_seqid: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    }) : [];

    const unifiedMovements: any[] = [];

    for (const log of logs) {
      const board = boardMap.get(BigInt(log.boardId));
      if (!board) continue;
      const ws = workspaceMap.get(board.workspaceSeqid);
      if (!ws) continue;

      const matchedUser = logUsers.find(u =>
        u.email === log.userId ||
        u.seqid.toString() === log.userId ||
        `user-${u.seqid}` === log.userId
      );
      const userName = matchedUser ? matchedUser.name : (log.userId || 'Usuário');
      const userImage = matchedUser ? matchedUser.image : null;

      if (log.action === 'BOARD_CREATED') {
        unifiedMovements.push({
          id: `log-${log.seqid.toString()}`,
          date: log.createdAt.toISOString(),
          type: 'BOARD_CREATED',
          actionName: 'Abertura de Atividade',
          description: log.description || `criou a atividade "${board.name}"`,
          userName,
          userImage,
          workspaceName: ws.name,
          workspaceSeqid: board.workspaceSeqid.toString(),
          boardName: board.name,
          boardSeqId: board.seqId.toString()
        });
      } else if (log.action === 'CARD_CREATED') {
        const boardCreated = new Date(board.createdAt);
        const cardCreated = new Date(log.createdAt);

        const boardYear = boardCreated.getUTCFullYear();
        const boardMonth = boardCreated.getUTCMonth();
        const cardYear = cardCreated.getUTCFullYear();
        const cardMonth = cardCreated.getUTCMonth();

        const isPrevMonthBoard = (boardYear < cardYear) || (boardYear === cardYear && boardMonth < cardMonth);

        if (isPrevMonthBoard) {
          unifiedMovements.push({
            id: `log-${log.seqid.toString()}`,
            date: log.createdAt.toISOString(),
            type: 'CARD_CREATED',
            actionName: 'Cadastro de Evento (Atividade de Mês Anterior)',
            description: log.description || `criou um card na atividade "${board.name}"`,
            userName,
            userImage,
            workspaceName: ws.name,
            workspaceSeqid: board.workspaceSeqid.toString(),
            boardName: board.name,
            boardSeqId: board.seqId.toString()
          });
        }
      }
    }

    for (const act of cardActs) {
      if (!act.card_seqid || !act.card) continue;
      const boardSeqid = act.card.board_seqid;
      if (!boardSeqid) continue;
      const board = boardMap.get(boardSeqid);
      if (!board) continue;
      const ws = workspaceMap.get(board.workspaceSeqid);
      if (!ws) continue;

      const userName = act.users ? act.users.name : 'Usuário';
      const userImage = act.users ? act.users.image : null;

      unifiedMovements.push({
        id: `act-${act.seqid.toString()}`,
        date: act.created_at.toISOString(),
        type: 'CARD_ACTIVITY',
        actionName: 'Andamento de Evento',
        description: `adicionou o andamento "${act.description}" no evento "${act.card.title}"`,
        userName,
        userImage,
        workspaceName: ws.name,
        workspaceSeqid: board.workspaceSeqid.toString(),
        boardName: board.name,
        boardSeqId: board.seqId.toString(),
        cardTitle: act.card.title
      });
    }

    unifiedMovements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return unifiedMovements;
  }
}
