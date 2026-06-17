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
          created_by: user.seqid ? BigInt(user.seqid) : null
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

    // 1. Resolver o workspace de destino para validação
    let targetWorkspaceSeqid = board.workspaceId;
    if (workspaceId !== undefined && workspaceId !== null && workspaceId !== '') {
      let targetWorkspace: any = null;
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

    // 2. Verificar e processar alteração de responsável da Atividade (Quadro)
    if (assignedUserSeqid !== undefined) {
      const currentAssignedStr = board.user_seqid ? board.user_seqid.toString() : '';
      const newAssignedStr = assignedUserSeqid ? assignedUserSeqid : '';
      if (currentAssignedStr !== newAssignedStr) {
        let newUserObj = null;
        if (assignedUserSeqid) {
          const userSeqIdBig = BigInt(assignedUserSeqid);
          // Validar se o novo responsável pertence ao workspace
          const isMember = await prisma.workspaceMember.findFirst({
            where: {
              workspaceSeqid: targetWorkspaceSeqid,
              userSeqid: userSeqIdBig
            }
          });
          if (!isMember) {
            throw new Error('O usuário selecionado não é colaborador deste Workspace.');
          }
          newUserObj = await prisma.user.findUnique({
            where: { seqid: userSeqIdBig }
          });
        }
        dataToUpdate.user_seqid = assignedUserSeqid ? BigInt(assignedUserSeqid) : null;

        const newUserName = newUserObj ? newUserObj.name : 'SEM RESPONSÁVEL';
        logDescription += ` e transferiu a responsabilidade da atividade para "${newUserName}"`;

        // Registrar o evento card no quadro na coluna Concluído correspondente
        let workspaceColumns = await prisma.column.findMany({
          where: { workspaceSeqid: targetWorkspaceSeqid }
        });
        if (workspaceColumns.length === 0) {
          await prisma.column.createMany({
            data: [
              { title: 'A Fazer', order: 0, workspaceSeqid: targetWorkspaceSeqid },
              { title: 'Em Progresso', order: 1, workspaceSeqid: targetWorkspaceSeqid },
              { title: 'Concluído', order: 2, workspaceSeqid: targetWorkspaceSeqid }
            ]
          });
          workspaceColumns = await prisma.column.findMany({
            where: { workspaceSeqid: targetWorkspaceSeqid }
          });
        }
        const doneColumn = workspaceColumns.find(c => c.title.toLowerCase().includes('concluído')) || workspaceColumns[0];
        if (doneColumn) {
          await prisma.card.create({
            data: {
              title: `ATIVIDADE DELEGADA PARA ${newUserName.toUpperCase()}`,
              board_seqid: board.seqId,
              user_seqid: user.seqid ? BigInt(user.seqid) : board.user_seqid,
              taskuser_seqid: BigInt(1), // Admin / Sistema
              columnId: doneColumn.seqid,
              dtatv: new Date(),
              dtcon: new Date(),
              order: 0,
              created_by: user.seqid ? BigInt(user.seqid) : null
            }
          });
        }
      }
    }

    if (workspaceId !== undefined && workspaceId !== null && workspaceId !== '') {
      let targetWorkspace: any = null;
      if (/^\d+$/.test(workspaceId)) {
        targetWorkspace = await prisma.workspace.findUnique({
          where: { seqid: BigInt(workspaceId) }
        });
      } else {
        targetWorkspace = await prisma.workspace.findUnique({
          where: { id: workspaceId }
        });
      }
      
      if (!targetWorkspace) {
        throw new Error('Área de trabalho de destino não encontrada.');
      }
      
      if (board.workspaceId !== targetWorkspace.seqid) {
        const oldWorkspace = await prisma.workspace.findUnique({
          where: { seqid: board.workspaceId }
        });
        const oldWorkspaceName = oldWorkspace?.name || 'Área Antiga';
        
        dataToUpdate.workspaceId = targetWorkspace.seqid;
        
        logDescription += ` e transferiu a atividade da área "${oldWorkspaceName}" para a área "${targetWorkspace.name}"`;
        
        // 1. Buscar colunas das duas áreas de trabalho para fazer o mapeamento
        let oldColumns = await prisma.column.findMany({
          where: { workspaceSeqid: board.workspaceId }
        });
        let newColumns = await prisma.column.findMany({
          where: { workspaceSeqid: targetWorkspace.seqid }
        });
        
        // Auto-heal new workspace columns if they are empty
        if (newColumns.length === 0) {
          const defaultColumns = [
            { title: 'A Fazer', order: 0, workspaceSeqid: targetWorkspace.seqid },
            { title: 'Em Progresso', order: 1, workspaceSeqid: targetWorkspace.seqid },
            { title: 'Concluído', order: 2, workspaceSeqid: targetWorkspace.seqid }
          ];
          await prisma.column.createMany({
            data: defaultColumns
          });
          newColumns = await prisma.column.findMany({
            where: { workspaceSeqid: targetWorkspace.seqid }
          });
        }

        // Auto-heal old workspace columns if they are empty
        if (oldColumns.length === 0) {
          const defaultColumns = [
            { title: 'A Fazer', order: 0, workspaceSeqid: board.workspaceId },
            { title: 'Em Progresso', order: 1, workspaceSeqid: board.workspaceId },
            { title: 'Concluído', order: 2, workspaceSeqid: board.workspaceId }
          ];
          await prisma.column.createMany({
            data: defaultColumns
          });
          oldColumns = await prisma.column.findMany({
            where: { workspaceSeqid: board.workspaceId }
          });
        }
        
        // Achar a coluna de conclusão no novo workspace
        const newDoneColumn = newColumns.find(c => c.title.toLowerCase().includes('concluído')) || newColumns[0];
        
        // 2. Mapear todos os cards existentes deste quadro para as novas colunas
        const boardCards = await prisma.card.findMany({
          where: { board_seqid: board.seqId }
        });
        
        for (const card of boardCards) {
          const oldCol = oldColumns.find(c => c.seqid === card.columnId);
          if (oldCol) {
            const matchingNewCol = newColumns.find(c => c.title.trim().toLowerCase() === oldCol.title.trim().toLowerCase()) || newColumns[0];
            if (matchingNewCol && matchingNewCol.seqid !== card.columnId) {
              await prisma.card.update({
                where: { seqid: card.seqid },
                data: { columnId: matchingNewCol.seqid }
              });
            }
          }
        }
        
        // 3. Registrar o evento card no quadro na nova coluna Concluído
        if (newDoneColumn) {
          await prisma.card.create({
            data: {
              title: `ALTERADO AREA DE TRABALHO DE ${oldWorkspaceName.toUpperCase()}`,
              board_seqid: board.seqId,
              user_seqid: user.seqid ? BigInt(user.seqid) : board.user_seqid,
              taskuser_seqid: BigInt(1), // Admin / Sistema
              columnId: newDoneColumn.seqid,
              dtatv: new Date(),
              dtcon: new Date(),
              order: 0,
              created_by: user.seqid ? BigInt(user.seqid) : null
            }
          });
        }
      }
    }    if (sectorId !== undefined && board.sectorId !== sectorId) {
      const oldSector = board.sectorId 
        ? await prisma.sector.findUnique({ where: { id: board.sectorId } }) 
        : null;
      const oldSectorName = oldSector ? oldSector.name : 'SEM SETOR';

      const newSector = sectorId 
        ? await prisma.sector.findUnique({ where: { id: sectorId } }) 
        : null;
      const newSectorName = newSector ? newSector.name : 'SEM SETOR';

      logDescription += ` e alterou o setor de "${oldSectorName}" para "${newSectorName}"`;

      // Registrar o evento card no quadro na coluna Concluído correspondente
      const targetWorkspaceSeqid = dataToUpdate.workspaceId || board.workspaceId;
      let workspaceColumns = await prisma.column.findMany({
        where: { workspaceSeqid: targetWorkspaceSeqid }
      });

      // Auto-heal se as colunas estiverem vazias
      if (workspaceColumns.length === 0) {
        await prisma.column.createMany({
          data: [
            { title: 'A Fazer', order: 0, workspaceSeqid: targetWorkspaceSeqid },
            { title: 'Em Progresso', order: 1, workspaceSeqid: targetWorkspaceSeqid },
            { title: 'Concluído', order: 2, workspaceSeqid: targetWorkspaceSeqid }
          ]
        });
        workspaceColumns = await prisma.column.findMany({
          where: { workspaceSeqid: targetWorkspaceSeqid }
        });
      }

      const doneColumn = workspaceColumns.find(c => c.title.toLowerCase().includes('concluído')) || workspaceColumns[0];
      
      if (doneColumn) {
        await prisma.card.create({
          data: {
            title: `ALTERADO SETOR DE ${oldSectorName.toUpperCase()}`,
            board_seqid: board.seqId,
            user_seqid: user.seqid ? BigInt(user.seqid) : board.user_seqid,
            taskuser_seqid: BigInt(1), // Admin / Sistema
            columnId: doneColumn.seqid,
            dtatv: new Date(),
            dtcon: new Date(),
            order: 0,
            created_by: user.seqid ? BigInt(user.seqid) : null
          }
        });
      }
    }

    const updated = await this.boardRepo.updateBoard(boardId, dataToUpdate);
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

    await this.logRepo.createLog({
      boardId,
      userId: user.id,
      action: 'BOARD_RENAMED',
      description: logDescription
    });

    return this.serializeBoard(updated);
  }

  async getBoardActivityLogs(boardId: string) {
    try {
      const logs = await this.logRepo.getLogsByBoardId(boardId);
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

  async completeActivity(boardId: string, user: any) {
    const board = await this.boardRepo.findById(boardId);
    if (!board) throw new Error('Quadro não encontrado');

    const doneCol = (board as any).columns.find((c: any) => 
      c.title.toLowerCase().includes('concluído') || 
      c.title.toLowerCase().includes('concluido')
    );
    if (!doneCol) throw new Error('Coluna "Concluído" não encontrada neste quadro');

    const now = new Date();
    const userSeqid = user.seqid ? BigInt(user.seqid) : BigInt(1);

    // 1. Atualizar todos os cards que NÃO estão na coluna concluído
    const otherColumns = (board as any).columns.filter((c: any) => c.seqid !== doneCol.seqid);

    for (const col of otherColumns) {
      if (col.cards.length > 0) {
        await prisma.card.updateMany({
          where: { columnId: col.seqid },
          data: {
            columnId: doneCol.seqid,
            dtcon: now,
            moduser: userSeqid,
            dtmod: now
          }
        });
      }
    }

    // 2. Marcar o board como concluído
    await this.boardRepo.updateBoard(boardId, {
      dtcon: now,
      moduser: userSeqid,
      dtmod: now
    });

    // 3. Criar o card "PROCESSO CONCLUÍDO"
    await this.cardRepo.createCard({
      title: 'PROCESSO CONCLUÍDO',
      description: `Processo encerrado por ${user.name}`,
      board_seqid: board.seqId,
      columnId: doneCol.seqid,
      order: 0,
      dtatv: now,
      dtcon: now,
      user_seqid: BigInt(1),
      taskuser_seqid: BigInt(1),
      created_by: BigInt(1),
      createdAt: now
    });

    // 4. Log de Auditoria
    await this.logRepo.createLog({
      boardId,
      userId: user.id,
      action: 'BOARD_COMPLETED',
      description: `encerrou a atividade "${board.name}"`
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
