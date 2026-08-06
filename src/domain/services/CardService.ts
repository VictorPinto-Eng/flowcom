import { CardRepository } from '../repositories/CardRepository';
import { ColumnRepository } from '../repositories/ColumnRepository';
import { ActivityLogRepository } from '../repositories/ActivityLogRepository';
import prisma from '@/lib/prisma';

export class CardService {
  private cardRepo = new CardRepository();
  private colRepo = new ColumnRepository();
  private logRepo = new ActivityLogRepository();

  async getMyEvents(user: any) {
    if (!user || !user.seqid) return [];
    const cards = await this.cardRepo.findCardsByUserSeqid(BigInt(user.seqid));
    // Serializar BigInts
    return cards.map(c => ({
      ...c,
      id: c.seqid.toString(),
      seqid: c.seqid.toString(),
      board_seqid: c.board_seqid?.toString(),
      user_seqid: c.user_seqid?.toString(),
      taskuser_seqid: c.taskuser_seqid?.toString(),
      board: c.board ? {
        ...c.board,
        id: c.board.seqId.toString(),
        seqId: c.board.seqId.toString(),
        workspaceId: c.board.workspaceId?.toString(),
        user_seqid: c.board.user_seqid?.toString(),
        created_by: c.board.created_by?.toString(),
        workspace: c.board.workspace ? {
          ...c.board.workspace,
          id: c.board.workspace.seqid.toString(),
          seqid: c.board.workspace.seqid.toString(),
        } : undefined
      } : undefined,
      column: c.column ? {
        ...c.column,
        seqid: c.column.seqid.toString(),
        workspace: c.column.workspace ? {
          ...c.column.workspace,
          id: c.column.workspace.seqid.toString(),
          seqid: c.column.workspace.seqid.toString(),
        } : undefined
      } : undefined
    }));
  }

  async addCard(columnId: string, title: string, boardId: string, user: any, description?: string, dtatvStr?: string | null, previstoStr?: string | null) {
    const lastCard = await this.cardRepo.findLastByColumnId(columnId);
    const nextOrder = lastCard ? lastCard.order + 1 : 0;
    const now = new Date();
    const dtatvVal = dtatvStr ? new Date(dtatvStr) : now;
    const previstoVal = previstoStr ? new Date(previstoStr) : null;

    const boardSeqId = BigInt(boardId);
    const userSeqId = user?.seqid ? BigInt(user.seqid) : undefined;

    const card = await this.cardRepo.createCard({
      title,
      description,
      columnId,
      order: nextOrder,
      dtatv: dtatvVal,
      previsto: previstoVal,
      created_by: user?.seqid ? BigInt(user.seqid) : BigInt(1),
      board_seqid: boardSeqId,
      user_seqid: userSeqId,
      taskuser_seqid: userSeqId,
      createdAt: now
    });

    await this.logRepo.createLog({
      boardId: boardId,
      userId: user.id,
      action: 'CARD_CREATED',
      description: `criou o card "${title}" na lista "${card.column.title}"`
    });

    // Sincroniza data prevista da atividade
    if (boardSeqId) {
      await this.syncBoardPredictedDate(boardSeqId);
    }

    return this.serializeCard(card);
  }

  async moveCard(cardId: string, targetColId: string, user: any) {
    const card = await this.cardRepo.findById(cardId);
    if (!card) return;

    const targetCol = await this.colRepo.findById(targetColId);
    if (!targetCol) return;

    const lastCardInTarget = await this.cardRepo.findLastByColumnId(targetColId);
    const nextOrder = lastCardInTarget ? lastCardInTarget.order + 1 : 0;
    const isDone = targetCol.title.toLowerCase().includes('concluído');

    // Validação: se está sendo movido PARA coluna concluído, setar dtcon
    // Se está sendo movido DE coluna concluído, limpar dtcon
    let dtconUpdate: { dtcon?: Date | null } = {};
    if (isDone && !card.dtcon) {
      dtconUpdate = { dtcon: new Date() };
    } else if (!isDone && card.dtcon) {
      dtconUpdate = { dtcon: null };
    }

    await this.cardRepo.updateCard(cardId, {
      columnId: targetColId,
      order: nextOrder,
      moduser: user.seqid ? BigInt(user.seqid) : BigInt(1),
      dtmod: new Date(),
      ...dtconUpdate
    });

    if (card.columnId.toString() !== targetColId) {
      await this.logRepo.createLog({
        boardId: card.board_seqid ? card.board_seqid.toString() : '0',
        userId: user.id,
        action: 'CARD_MOVED',
        description: `moveu o card "${card.title}" de "${card.column.title}" para "${targetCol.title}"`
      });
    }

    if (isDone) {
      await this.addCardActionLog(card.seqid, 'Evento concluído', user);
    }
  }

  async completeCard(cardId: string, targetColId: string, user: any, localDateStr?: string) {
    const card = await this.cardRepo.findById(cardId);
    if (!card) return;

    const targetCol = await this.colRepo.findById(targetColId);
    if (!targetCol) return;

    const lastCardInTarget = await this.cardRepo.findLastByColumnId(targetColId);
    const nextOrder = lastCardInTarget ? lastCardInTarget.order + 1 : 0;

    let dtconDate = new Date();
    if (localDateStr) {
      const [year, month, day] = localDateStr.split('-').map(Number);
      dtconDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }

    await this.cardRepo.updateCard(cardId, {
      columnId: targetColId,
      order: nextOrder,
      dtcon: dtconDate,
      moduser: user.seqid ? BigInt(user.seqid) : BigInt(1),
      dtmod: new Date()
    });

    await this.logRepo.createLog({
      boardId: card.board_seqid ? card.board_seqid.toString() : '0',
      userId: user.id,
      action: 'CARD_COMPLETED',
      description: `concluiu o evento "${card.title}"`
    });

    await this.addCardActionLog(card.seqid, 'Evento concluído', user);
  }

  async updateCardPrevisto(cardId: string, previstoStr: string | null, user: any) {
    const dateVal = previstoStr ? new Date(previstoStr) : null;

    // Busca o card antes da alteração para saber a data antiga
    const oldCard = await this.cardRepo.findById(cardId);
    const oldDateFormatted = oldCard?.previsto ? new Date(oldCard.previsto).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Sem data';

    const card = await this.cardRepo.updateCard(cardId, {
      previsto: dateVal,
      dtatv: new Date(),
      moduser: user.seqid ? BigInt(user.seqid) : BigInt(1),
      dtmod: new Date()
    });

    const newDateFormatted = dateVal ? dateVal.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Sem data';

    // 1. Log de Auditoria Interno (Geral)
    await this.logRepo.createLog({
      boardId: card.board_seqid ? card.board_seqid.toString() : '0',
      userId: user.id,
      action: 'UPDATE_CARD_DATE',
      description: `alterou a data prevista de "${card.title}" de ${oldDateFormatted} para ${newDateFormatted}`
    });

    // Sincroniza data prevista da atividade
    if (card.board_seqid) {
      await this.syncBoardPredictedDate(card.board_seqid);
    }

    // 2. Lançamento no Histórico de Andamentos (card_act)
    await this.addCardActionLog(
      card.seqid,
      `ALTERADO AGENDAMENTO DA DATA PREVISTA DE ${oldDateFormatted} PARA ${newDateFormatted}`,
      user
    );

    // 3. NOVO: Lançamento na tabela CARD como um evento de histórico
    // Buscar a coluna de "Concluído" deste quadro
    if (card.board_seqid) {
      const board = await prisma.board.findUnique({ where: { seqId: card.board_seqid } });
      const boardColumns = board ? await this.colRepo.findAllByWorkspaceId(board.workspaceId) : [];
      const doneColumn = boardColumns.find(c => c.title.toLowerCase().includes('concluído')) || card.column;

      await this.cardRepo.createCard({
        title: `ALTERADO AGENDAMENTO DA DATA PREVISTA DE ${oldDateFormatted} PARA ${newDateFormatted}`,
        board_seqid: card.board_seqid,
        user_seqid: user.seqid ? BigInt(user.seqid) : card.user_seqid,
        taskuser_seqid: BigInt(1), // Sistema (Admin)
        columnId: (doneColumn as any).seqid, // Usar seqid (BigInt) para a relação
        dtatv: new Date(),
        dtcon: new Date(),
        order: 0,
        created_by: user.seqid ? BigInt(user.seqid) : null, // Preencher created_by
        moduser: null, // Deixar null conforme solicitado
        dtmod: null    // Deixar null conforme solicitado
      });
    }

    return this.serializeCard(card);
  }

  async updateCard(cardId: string, title: string, description: string | null, previstoStr: string | null, dtconStr: string | null, dtatvStr: string | null, user: any) {
    const dateVal = previstoStr ? new Date(previstoStr) : null;
    const dtconVal = dtconStr ? new Date(dtconStr) : null;
    const dtatvVal = dtatvStr ? new Date(dtatvStr) : null;

    // Se dtcon está sendo alterado, garantir consistência com a coluna
    const existingCard = await this.cardRepo.findById(cardId);
    let columnUpdate: { columnId?: string | bigint } = {};

    if (existingCard && existingCard.board_seqid) {
      const board = await prisma.board.findUnique({ where: { seqId: existingCard.board_seqid } });
      if (board) {
        const columns = await this.colRepo.findAllByWorkspaceId(board.workspaceId);
        const hadDtcon = !!existingCard.dtcon;
        const willHaveDtcon = !!dtconVal;

        if (!hadDtcon && willHaveDtcon) {
          // Concluindo: mover para coluna "Concluído"
          const doneCol = columns.find(c => c.title.toLowerCase().includes('concluído'));
          if (doneCol) {
            columnUpdate = { columnId: doneCol.seqid };
          }
        } else if (hadDtcon && !willHaveDtcon) {
          // Reabrindo: mover para coluna "A Fazer"
          const todoCol = columns.find(c => c.title.toLowerCase().includes('fazer')) || columns[0];
          if (todoCol) {
            columnUpdate = { columnId: todoCol.seqid };
          }
        }
      }
    }

    const card = await this.cardRepo.updateCard(cardId, {
      title,
      description,
      previsto: dateVal,
      dtcon: dtconVal,
      dtatv: dtatvVal,
      moduser: user.seqid ? BigInt(user.seqid) : BigInt(1),
      dtmod: new Date(),
      ...columnUpdate
    });

    await this.logRepo.createLog({
      boardId: (card.column as any).board.seqId.toString(),
      userId: user.id,
      action: 'CARD_UPDATED',
      description: `atualizou os dados do evento "${title}"`
    });

    // Sincroniza data prevista da atividade
    if (card.board_seqid) {
      await this.syncBoardPredictedDate(card.board_seqid);
    }

    return this.serializeCard(card);
  }

  async updateCardTaskUser(cardId: string, taskuserSeqid: bigint | null, user: any) {
    const cardBefore = await this.cardRepo.findById(cardId);
    if (!cardBefore) throw new Error('Evento não encontrado');

    const workspaceSeqid = cardBefore.column?.workspaceSeqid || cardBefore.board?.workspaceId;

    let taskUserName = 'Sem responsável';
    if (taskuserSeqid) {
      // 1. Validar se o novo responsável pertence ao workspace
      if (workspaceSeqid) {
        const isMember = await prisma.workspaceMember.findFirst({
          where: {
            workspaceSeqid,
            userSeqid: taskuserSeqid
          }
        });
        if (!isMember) {
          throw new Error('O usuário selecionado não é colaborador deste Workspace.');
        }
      }
      
      const taskUserObj = await prisma.user.findUnique({
        where: { seqid: taskuserSeqid }
      });
      taskUserName = taskUserObj?.name || 'Usuário Desconhecido';
    }

    const card = await this.cardRepo.updateCard(cardId, {
      taskuser_seqid: taskuserSeqid,
      moduser: user.seqid ? BigInt(user.seqid) : BigInt(1),
      dtmod: new Date()
    });

    await this.logRepo.createLog({
      boardId: card.board_seqid ? card.board_seqid.toString() : '0',
      userId: user.id,
      action: 'CARD_TRANSFERRED',
      description: `transferiu a responsabilidade do evento "${card.title}" para "${taskUserName}"`
    });

    // Registrar andamento histórico (card_act)
    await this.addCardActionLog(
      card.seqid,
      `RESPONSABILIDADE DO EVENTO DELEGADA PARA ${taskUserName.toUpperCase()}`,
      user
    );

    return this.serializeCard(card);
  }

  async transferCardWorkspace(cardId: string, workspaceSeqid: string, boardSeqid: string, columnSeqid: string, user: any) {
    const card = await this.cardRepo.findById(cardId);
    if (!card) throw new Error('Atividade não encontrada');

    const oldWorkspaceName = card.column?.workspace?.name || 'Área Antiga';
    const oldBoardSeqId = card.board_seqid;

    const updatedCard = await this.cardRepo.updateCard(cardId, {
      board_seqid: BigInt(boardSeqid),
      columnId: BigInt(columnSeqid),
      moduser: user.seqid ? BigInt(user.seqid) : BigInt(1),
      dtmod: new Date()
    });

    // 1. Log de Auditoria
    await this.logRepo.createLog({
      boardId: boardSeqid,
      userId: user.id,
      action: 'CARD_TRANSFERRED_WORKSPACE',
      description: `transferiu o evento "${card.title}" da Área "${oldWorkspaceName}" para a nova Área`
    });

    // 2. Sincroniza datas previstas nos quadros de origem e destino
    if (oldBoardSeqId) {
      await this.syncBoardPredictedDate(oldBoardSeqId);
    }
    await this.syncBoardPredictedDate(BigInt(boardSeqid));

    return this.serializeCard(updatedCard);
  }

  async completeCardDirectly(cardId: string, user: any, localDateStr?: string) {
    const card = await this.cardRepo.findById(cardId);
    if (!card) throw new Error('Atividade não encontrada');

    const workspaceSeqid = card.column.workspaceSeqid;
    const columns = await prisma.column.findMany({
      where: { workspaceSeqid }
    });

    const doneCol = columns.find(c => c.title.toLowerCase().includes('concluído'));
    if (!doneCol) throw new Error('Coluna "Concluído" não encontrada na Área correspondente');

    await this.completeCard(cardId, doneCol.seqid.toString(), user, localDateStr);
  }

  async addCardActionLog(cardSeqid: bigint, description: string, user: any) {
    const now = new Date();
    const userSeqId = user?.seqid ? BigInt(user.seqid) : undefined;

    const action = await (this.cardRepo as any).createCardAction({
      card_seqid: cardSeqid,
      description,
      user_seqid: userSeqId,
      created_by: userSeqId,
      created_at: now,
      dtatv: now
    });

    return action;
  }

  async updateCardActionLog(actionSeqid: bigint, description: string, user: any) {
    const userSeqId = user?.seqid ? BigInt(user.seqid) : undefined;
    const action = await (this.cardRepo as any).updateCardAction(actionSeqid, {
      description,
      moduser: userSeqId,
      dtmod: new Date()
    });
    return action;
  }

  async deleteCardActionLog(actionSeqid: bigint) {
    await (this.cardRepo as any).deleteCardAction(actionSeqid);
  }

  async getAllCardsReport(workspaceId?: string, currentUser?: any) {
    if (!currentUser) return [];

    const userSeqId = BigInt(currentUser.seqid || currentUser.id);

    // Get all workspaces owned by the user or where they are a member
    const userWorkspaces = await prisma.workspace.findMany({
      where: {
        OR: [
          { users_seqid: userSeqId },
          {
            members: {
              some: {
                userSeqid: userSeqId
              }
            }
          }
        ]
      },
      select: {
        seqid: true,
        id: true
      }
    });

    const allowedWorkspaceSeqids = userWorkspaces.map(w => w.seqid);
    const allowedWorkspaceIds = userWorkspaces.map(w => w.id);

    // If a specific workspace is requested, verify access
    if (workspaceId && !allowedWorkspaceIds.includes(workspaceId)) {
      return [];
    }

    const cards = await this.cardRepo.findAllWithFullRelations();

    // Filter cards: by specific workspace if provided, otherwise only those in allowed workspaces
    const filteredCards = workspaceId
      ? cards.filter(c => c.board?.workspace?.id === workspaceId || c.column?.workspace?.id === workspaceId)
      : cards.filter(c => {
          const wsSeqid = c.column?.workspaceSeqid || c.board?.workspaceId;
          return wsSeqid ? allowedWorkspaceSeqids.includes(wsSeqid) : false;
        });

    return filteredCards.map(c => {
      let durationStr = 'Pendente';
      if (c.dtatv && c.dtcon) {
        const start = new Date(c.dtatv);
        const end = new Date(c.dtcon);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        durationStr = `${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
      }

      // Extrai os membros e proprietário do workspace
      const wsObj = c.board?.workspace || c.column?.workspace;
      const workspaceMembersList: string[] = [];
      if (wsObj) {
        if (wsObj.user?.name) {
          workspaceMembersList.push(wsObj.user.name);
        }
        if (wsObj.members && Array.isArray(wsObj.members)) {
          wsObj.members.forEach((m: any) => {
            if (m.user?.name) {
              workspaceMembersList.push(m.user.name);
            }
          });
        }
      }

      return {
        ...c,
        id: c.seqid.toString(),
        seqid: c.seqid.toString(),
        board_seqid: c.board_seqid?.toString(),
        user_seqid: c.user_seqid?.toString(),
        taskuser_seqid: c.taskuser_seqid?.toString(),
        duration: durationStr,
        creatorName: c.user_seqid === BigInt(1) ? 'Admin' : ((c as any).users?.name || 'Sistema'),
        assignedName: c.taskuser_seqid === BigInt(1) ? 'Admin' : ((c as any).task_user?.name || 'Não atribuído'),
        // Usamos o board_seqid direto da tabela card para bater com o SQL do usuário
        boardSeqId: c.board_seqid?.toString() || c.board?.seqId?.toString() || '—',
        boardId: c.board?.seqId?.toString() || `fallback-${c.board_seqid}`,
        boardName: c.board?.name || '—',
        workspaceName: c.column?.workspace?.name || '—',
        boardDtatv: c.board?.dtatv,
        boardDtcon: c.board?.dtcon,
        boardPrevisto: c.board?.previsto,
        boardOwnerName: c.board?.user?.name || 'Não atribuído',
        boardCreatedAt: c.board?.createdAt,
        workspaceMembers: workspaceMembersList,
        card_act: c.card_act?.map((act: any) => ({
          ...act,
          seqid: act.seqid.toString(),
          card_seqid: act.card_seqid?.toString(),
          user_seqid: act.user_seqid?.toString(),
          created_by: act.created_by?.toString()
        })) || []
      };
    });
  }
  private serializeCard(card: any) {
    if (!card) return null;
    return {
      ...card,
      id: card.seqid.toString(),
      seqid: card.seqid.toString(),
      board_seqid: card.board_seqid?.toString(),
      user_seqid: card.user_seqid?.toString(),
      taskuser_seqid: card.taskuser_seqid?.toString(),
      columnId: card.columnId.toString(),
      moduser: card.moduser?.toString(),
      created_by: card.created_by?.toString(),
      card_act: card.card_act?.map((act: any) => ({
        ...act,
        seqid: act.seqid.toString(),
        card_seqid: act.card_seqid?.toString(),
        user_seqid: act.user_seqid?.toString(),
        created_by: act.created_by?.toString()
      }))
    };
  }

  private async syncBoardPredictedDate(boardSeqId: bigint) {
    const latestCard = await prisma.card.findFirst({
      where: { board_seqid: boardSeqId, previsto: { not: null } },
      orderBy: { previsto: 'desc' },
      select: { previsto: true }
    });
    const latestDate = latestCard?.previsto || null;

    const latestCardDtatv = await prisma.card.findFirst({
      where: { board_seqid: boardSeqId, dtatv: { not: null } },
      orderBy: { dtatv: 'desc' },
      select: { dtatv: true }
    });
    const latestDtatvDate = latestCardDtatv?.dtatv || null;

    await prisma.board.update({
      where: { seqId: boardSeqId },
      data: {
        previsto: latestDate,
        dtatv: latestDtatvDate
      }
    });
  }
}
