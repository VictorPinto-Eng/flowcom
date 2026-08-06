import { BoardRepository } from '../repositories/BoardRepository';
import { CardRepository } from '../repositories/CardRepository';
import { WorkspaceRepository } from '../repositories/WorkspaceRepository';
import { ActivityLogRepository } from '../repositories/ActivityLogRepository';
import prisma from '@/lib/prisma';

export class BoardService {
  private boardRepo = new BoardRepository();
  private cardRepo = new CardRepository();
  private workspaceRepo = new WorkspaceRepository();
  private logRepo = new ActivityLogRepository();

  async getSectors() {
    return await this.boardRepo.getSectors();
  }

  async createBoard(workspaceId: string, name: string, user: any, sectorId?: number, detalhes?: string, dtatv?: string, previsto?: string) {
    const workspace = await this.workspaceRepo.findById(workspaceId);
    if (!workspace) {
      throw new Error('Workspace não encontrado.');
    }

    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceSeqid: workspace.seqid,
        userSeqid: user.seqid ? BigInt(user.seqid) : undefined
      }
    });
    if (!member) {
      throw new Error('Você não é membro desta área de trabalho.');
    }

    const board = await this.boardRepo.createBoard({
      id: crypto.randomUUID(),
      name,
      workspaceId: workspace.seqid,
      user_seqid: user.seqid ? BigInt(user.seqid) : undefined,
      sectorId,
      detalhes: detalhes || undefined,
      dtatv: dtatv ? new Date(dtatv) : undefined,
      previsto: previsto ? new Date(previsto) : undefined
    });

    const now = new Date();

    if (board.columns && board.columns.length > 0) {
      const doneColumn = board.columns.find((c: any) => c.title.toLowerCase().includes('concluído')) || board.columns[board.columns.length - 1];

      // 1. Criar card "ABERTURA DE PROCESSO"
      await prisma.card.create({
        data: {
          title: 'ABERTURA DE PROCESSO',
          description: `Processo iniciado por ${user.name}`,
          board_seqid: board.seqId,
          user_seqid: user.seqid ? BigInt(user.seqid) : board.user_seqid,
          taskuser_seqid: BigInt(1), // Admin / Sistema
          columnId: doneColumn.seqid,
          dtatv: now,
          dtcon: now,
          order: 0,
          created_by: user.seqid ? BigInt(user.seqid) : BigInt(1)
        }
      });
    }

    await this.logRepo.createLog({
      boardId: board.seqId.toString(),
      userId: user.id,
      action: 'BOARD_CREATED',
      description: `criou a atividade "${name}"`
    });

    return this.serializeBoard(board);
  }

  async getBoardData(boardId: string | undefined, user: any) {
    let board = null;

    if (boardId) {
      board = await this.boardRepo.findById(boardId);
    }

    if (!board) {
      const firstWorkspace = await this.workspaceRepo.findFirstByUserId(user.id, user.seqid ? BigInt(user.seqid) : undefined);

      if (firstWorkspace && firstWorkspace.boards.length > 0) {
        const targetBoardId = firstWorkspace.boards[0].seqId.toString();
        board = await this.boardRepo.findById(targetBoardId);
      }
    }

    return this.serializeBoard(board);
  }

  async updateBoard(boardId: string, name: string, detalhes: string | null, user: any, sectorId?: number | null, dtatv?: string | null, workspaceId?: string, assignedUserSeqid?: string | null, previsto?: string | null) {
    const board = await this.boardRepo.findById(boardId);
    if (!board) {
      throw new Error('Atividade não encontrada.');
    }

    const dataToUpdate: any = { name };
    if (detalhes !== undefined) {
      dataToUpdate.detalhes = detalhes;
    }
    if (sectorId !== undefined) {
      dataToUpdate.sectorId = sectorId;
    }
    if (dtatv !== undefined) {
      dataToUpdate.dtatv = dtatv ? new Date(dtatv) : null;
    }
    if (previsto !== undefined) {
      dataToUpdate.previsto = previsto ? new Date(previsto) : null;
    }

    let logDescription = `atualizou os dados da atividade "${name}"`;

    // ============================================================
    // FASE 1: VALIDAÇÕES E LEITURAS (fora da transação)
    // ============================================================

    // 1. Resolver o workspace de destino para validação
    let targetWorkspaceSeqid = board.workspaceId;
    let targetWorkspace: any = null;
    if (workspaceId !== undefined && workspaceId !== null && workspaceId !== '') {
      if (/^\d+$/.test(workspaceId)) {
        targetWorkspace = await prisma.workspace.findUnique({
          where: { seqid: BigInt(workspaceId) }
        });
      } else {
        targetWorkspace = await prisma.workspace.findUnique({
          where: { id: workspaceId }
        });
      }
      if (targetWorkspace) {
        targetWorkspaceSeqid = targetWorkspace.seqid;
      }
    }

    // 2. Validar alteração de responsável
    let newUserName = '';
    let responsavelChanged = false;
    if (assignedUserSeqid !== undefined) {
      const currentAssignedStr = board.user_seqid ? board.user_seqid.toString() : '';
      const newAssignedStr = assignedUserSeqid ? assignedUserSeqid : '';
      if (currentAssignedStr !== newAssignedStr) {
        responsavelChanged = true;
        if (assignedUserSeqid) {
          const userSeqIdBig = BigInt(assignedUserSeqid);
          const isMember = await prisma.workspaceMember.findFirst({
            where: {
              workspaceSeqid: targetWorkspaceSeqid,
              userSeqid: userSeqIdBig
            }
          });
          if (!isMember) {
            throw new Error('O usuário selecionado não é colaborador deste Workspace.');
          }
          const newUserObj = await prisma.user.findUnique({
            where: { seqid: userSeqIdBig }
          });
          newUserName = newUserObj?.name || 'Usuário Desconhecido';
        } else {
          newUserName = 'SEM RESPONSÁVEL';
        }
        dataToUpdate.user_seqid = assignedUserSeqid ? BigInt(assignedUserSeqid) : null;
        logDescription += ` e transferiu a responsabilidade da atividade para "${newUserName}"`;
      }
    }

    // 3. Validar transferência de workspace
    let workspaceChanged = false;
    let oldWorkspaceName = '';
    let oldColumns: any[] = [];
    let newColumns: any[] = [];
    let boardCards: any[] = [];

    if (workspaceId !== undefined && workspaceId !== null && workspaceId !== '' && targetWorkspace) {
      if (!targetWorkspace) {
        throw new Error('Área de trabalho de destino não encontrada.');
      }
      if (board.workspaceId !== targetWorkspace.seqid) {
        workspaceChanged = true;
        const oldWorkspace = await prisma.workspace.findUnique({
          where: { seqid: board.workspaceId }
        });
        oldWorkspaceName = oldWorkspace?.name || 'Área Antiga';
        dataToUpdate.workspaceId = targetWorkspace.seqid;
        logDescription += ` e transferiu a atividade da área "${oldWorkspaceName}" para a área "${targetWorkspace.name}"`;

        oldColumns = await prisma.column.findMany({
          where: { workspaceSeqid: board.workspaceId }
        });
        newColumns = await prisma.column.findMany({
          where: { workspaceSeqid: targetWorkspace.seqid }
        });
        boardCards = await prisma.card.findMany({
          where: { board_seqid: board.seqId }
        });
      }
    }

    // 4. Resolver dados de setor
    let sectorChanged = false;
    let oldSectorName = '';
    let newSectorName = '';
    if (sectorId !== undefined && board.sectorId !== sectorId) {
      sectorChanged = true;
      const oldSector = board.sectorId
        ? await prisma.sector.findUnique({ where: { id: board.sectorId } })
        : null;
      oldSectorName = oldSector ? oldSector.name : 'SEM SETOR';
      const newSector = sectorId
        ? await prisma.sector.findUnique({ where: { id: sectorId } })
        : null;
      newSectorName = newSector ? newSector.name : 'SEM SETOR';
      logDescription += ` e alterou o setor de "${oldSectorName}" para "${newSectorName}"`;
    }

    // ============================================================
    // FASE 2: ESCRITAS (dentro da transação atômica)
    // ============================================================

    await prisma.$transaction(async (tx) => {
      const userSeqid = user.seqid ? BigInt(user.seqid) : board.user_seqid;

      // Helper: buscar ou criar colunas de um workspace
      const ensureColumns = async (wsSeqid: bigint) => {
        let cols = await tx.column.findMany({ where: { workspaceSeqid: wsSeqid } });
        if (cols.length === 0) {
          await tx.column.createMany({
            data: [
              { title: 'A Fazer', order: 0, workspaceSeqid: wsSeqid },
              { title: 'Em Progresso', order: 1, workspaceSeqid: wsSeqid },
              { title: 'Concluído', order: 2, workspaceSeqid: wsSeqid }
            ]
          });
          cols = await tx.column.findMany({ where: { workspaceSeqid: wsSeqid } });
        }
        return cols;
      };

      // A. Alteração de responsável → criar card de sistema
      if (responsavelChanged) {
        const cols = await ensureColumns(targetWorkspaceSeqid);
        const doneCol = cols.find(c => c.title.toLowerCase().includes('concluído')) || cols[0];
        if (doneCol) {
          await tx.card.create({
            data: {
              title: `ATIVIDADE DELEGADA PARA ${newUserName.toUpperCase()}`,
              board_seqid: board.seqId,
              user_seqid: userSeqid,
              taskuser_seqid: BigInt(1),
              columnId: doneCol.seqid,
              dtatv: new Date(),
              dtcon: new Date(),
              order: 0,
              created_by: userSeqid
            }
          });
        }
      }

      // B. Transferência de workspace → remapear cards e criar card de sistema
      if (workspaceChanged && targetWorkspace) {
        // Auto-heal colunas se necessário
        if (newColumns.length === 0) {
          newColumns = await ensureColumns(targetWorkspace.seqid);
        }
        if (oldColumns.length === 0) {
          oldColumns = await ensureColumns(board.workspaceId);
        }

        const newDoneColumn = newColumns.find(c => c.title.toLowerCase().includes('concluído')) || newColumns[0];

        // Remapear cards para colunas do novo workspace
        for (const card of boardCards) {
          const oldCol = oldColumns.find(c => c.seqid === card.columnId);
          if (oldCol) {
            const matchingNewCol = newColumns.find(c => c.title.trim().toLowerCase() === oldCol.title.trim().toLowerCase()) || newColumns[0];
            if (matchingNewCol && matchingNewCol.seqid !== card.columnId) {
              await tx.card.update({
                where: { seqid: card.seqid },
                data: { columnId: matchingNewCol.seqid }
              });
            }
          }
        }

        // Card de sistema
        if (newDoneColumn) {
          await tx.card.create({
            data: {
              title: `ALTERADO AREA DE TRABALHO DE ${oldWorkspaceName.toUpperCase()}`,
              board_seqid: board.seqId,
              user_seqid: userSeqid,
              taskuser_seqid: BigInt(1),
              columnId: newDoneColumn.seqid,
              dtatv: new Date(),
              dtcon: new Date(),
              order: 0,
              created_by: userSeqid
            }
          });
        }
      }

      // C. Alteração de setor → criar card de sistema
      if (sectorChanged) {
        const wsSeqid = dataToUpdate.workspaceId || board.workspaceId;
        const cols = await ensureColumns(wsSeqid);
        const doneCol = cols.find(c => c.title.toLowerCase().includes('concluído')) || cols[0];
        if (doneCol) {
          await tx.card.create({
            data: {
              title: `ALTERADO SETOR DE ${oldSectorName.toUpperCase()}`,
              board_seqid: board.seqId,
              user_seqid: userSeqid,
              taskuser_seqid: BigInt(1),
              columnId: doneCol.seqid,
              dtatv: new Date(),
              dtcon: new Date(),
              order: 0,
              created_by: userSeqid
            }
          });
        }
      }

      // D. Atualizar o board
      await tx.board.update({
        where: { seqId: board.seqId },
        data: dataToUpdate
      });

      // E. Construir descrição final do log
      if (board.name !== name) {
        logDescription = `renomeou a atividade de "${board.name}" para "${name}"`;
      }
      if (board.detalhes !== detalhes) {
        logDescription += ` e atualizou as informações`;
      }
      if (dtatv !== undefined) {
        const oldDate = board.dtatv ? new Date(board.dtatv).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'sem data';
        const newDate = dataToUpdate.dtatv ? new Date(dataToUpdate.dtatv).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'sem data';
        if (oldDate !== newDate) {
          logDescription += ` e alterou a data de início de ${oldDate} para ${newDate}`;
        }
      }
      if (previsto !== undefined) {
        const oldPrevDate = board.previsto ? new Date(board.previsto).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'sem data';
        const newPrevDate = dataToUpdate.previsto ? new Date(dataToUpdate.previsto).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'sem data';
        if (oldPrevDate !== newPrevDate) {
          logDescription += ` e alterou a data prevista de ${oldPrevDate} para ${newPrevDate}`;
        }
      }

      // F. Log de auditoria
      await tx.activityLog.create({
        data: {
          boardId: boardId,
          userId: user.id,
          action: 'BOARD_RENAMED',
          description: logDescription
        }
      });
    });

    // Retornar board atualizado (leitura fora da transação)
    const updated = await this.boardRepo.findById(boardId);
    return this.serializeBoard(updated);
  }

  async getBoardActivityLogs(boardId: string, currentUser?: any) {
    try {
      const logs = await this.logRepo.getLogsByBoardId(boardId, currentUser);
      return logs.map(l => ({
        ...l,
        seqid: l.seqid.toString()
      }));
    } catch (error) {
      console.error('Erro ao buscar logs do quadro:', error);
      return [];
    }
  }

  async syncBoardPredictedDate(boardSeqId: bigint) {
    // 1. Buscar a data prevista mais distante entre todos os cards do board
    const latestCard = await prisma.card.findFirst({
      where: { board_seqid: boardSeqId, previsto: { not: null } },
      orderBy: { previsto: 'desc' },
      select: { previsto: true }
    });

    // 2. Atualizar o board com essa data
    const latestDate = latestCard?.previsto || null;

    await prisma.board.update({
      where: { seqId: boardSeqId },
      data: { previsto: latestDate }
    });

    return latestDate;
  }

  async completeActivity(boardId: string, user: any, localDateStr?: string) {
    const board = await this.boardRepo.findById(boardId);
    if (!board) throw new Error('Quadro não encontrado');

    const doneCol = (board as any).columns.find((c: any) =>
      c.title.toLowerCase().includes('concluído') ||
      c.title.toLowerCase().includes('concluido')
    );
    if (!doneCol) throw new Error('Coluna "Concluído" não encontrada neste quadro');

    let dtconDate = new Date();
    if (localDateStr) {
      const [year, month, day] = localDateStr.split('-').map(Number);
      dtconDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }

    const userSeqid = user.seqid ? BigInt(user.seqid) : BigInt(1);

    // TRANSAÇÃO ATÔMICA: Todas operações devem suceder ou nenhuma
    await prisma.$transaction(async (tx) => {
      // 1. Atualizar todos os cards que NÃO estão na coluna concluído
      const otherColumns = (board as any).columns.filter((c: any) => c.seqid !== doneCol.seqid);

      for (const col of otherColumns) {
        if (col.cards.length > 0) {
          await tx.card.updateMany({
            where: { columnId: col.seqid, board_seqid: board.seqId },
            data: {
              columnId: doneCol.seqid,
              dtcon: dtconDate,
              moduser: userSeqid,
              dtmod: new Date()
            }
          });
        }
      }

      // 2. Marcar TODOS os cards do board como concluídos (inclusive os que já estão na coluna "Concluído" mas ainda não têm dtcon)
      await tx.card.updateMany({
        where: {
          board_seqid: board.seqId,
          dtcon: null
        },
        data: {
          dtcon: dtconDate,
          moduser: userSeqid,
          dtmod: new Date()
        }
      });

      // 3. Marcar o board como concluído
      await tx.board.update({
        where: { seqId: board.seqId },
        data: {
          dtcon: dtconDate,
          moduser: userSeqid,
          dtmod: new Date()
        }
      });

      // 4. Criar o card "PROCESSO CONCLUÍDO"
      await tx.card.create({
        data: {
          title: 'PROCESSO CONCLUÍDO',
          description: `Processo encerrado por ${user.name}`,
          board_seqid: board.seqId,
          columnId: doneCol.seqid,
          order: 0,
          dtatv: new Date(),
          dtcon: dtconDate,
          user_seqid: BigInt(1),
          taskuser_seqid: BigInt(1),
          created_by: BigInt(1),
          createdAt: new Date()
        }
      });

      // 5. Log de Auditoria
      await tx.activityLog.create({
        data: {
          boardId: boardId,
          userId: user.id,
          action: 'BOARD_COMPLETED',
          description: `encerrou a atividade "${board.name}"`
        }
      });
    });
  }

  private serializeBoard(board: any) {
    if (!board) return null;
    return {
      ...board,
      id: board.seqId.toString(),
      seqId: board.seqId.toString(),
      workspaceId: board.workspaceId.toString(),
      user_seqid: board.user_seqid?.toString(),
      dtatv: board.dtatv,
      previsto: board.previsto,
      dtcon: board.dtcon,
      moduser: board.moduser?.toString(),
      dtmod: board.dtmod,
      columns: board.columns?.map((col: any) => ({
        ...col,
        id: col.seqid.toString(),
        seqid: col.seqid.toString(),
        workspaceSeqid: col.workspaceSeqid.toString(),
        cards: col.cards?.map((card: any) => ({
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
            created_by: act.created_by?.toString(),
            moduser: act.moduser?.toString()
          }))
        }))
      }))
    };
  }
}
