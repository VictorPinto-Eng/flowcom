import { ColumnRepository } from '../repositories/ColumnRepository';
import { ActivityLogRepository } from '../repositories/ActivityLogRepository';
import { BoardRepository } from '../repositories/BoardRepository';

export class ColumnService {
  private colRepo = new ColumnRepository();
  private logRepo = new ActivityLogRepository();
  private boardRepo = new BoardRepository();

  async addColumn(boardOrWorkspaceId: string, title: string, user: any) {
    let workspaceId: bigint;
    let logBoardId = '0';

    const board = await this.boardRepo.findById(boardOrWorkspaceId);
    if (board) {
      workspaceId = board.workspaceId;
      logBoardId = board.seqId.toString();
    } else {
      workspaceId = BigInt(boardOrWorkspaceId);
      logBoardId = '0';
    }

    const lastColumn = await this.colRepo.findLastByWorkspaceId(workspaceId);
    const nextOrder = lastColumn ? lastColumn.order + 1 : 0;

    const column = await this.colRepo.createColumn({
      title,
      workspaceSeqid: workspaceId,
      order: nextOrder
    });

    await this.logRepo.createLog({
      boardId: logBoardId,
      userId: user.id,
      action: 'COLUMN_CREATED',
      description: `criou a lista "${title}"`
    });

    return this.serializeColumn(column);
  }

  async copyColumn(columnId: string, user: any) {
    const originalColumn = await this.colRepo.findById(columnId);
    if (!originalColumn) throw new Error('Coluna não encontrada');

    const lastCol = await this.colRepo.findLastByWorkspaceId(originalColumn.workspaceSeqid);
    const nextOrder = lastCol ? lastCol.order + 1 : 0;

    const newCol = await this.colRepo.createColumn({
      title: `${originalColumn.title} (Cópia)`,
      workspaceSeqid: originalColumn.workspaceSeqid,
      order: nextOrder,
      cards: {
        create: originalColumn.cards.map(card => ({
          title: card.title,
          description: card.description,
          order: card.order,
          board_seqid: card.board_seqid,
          user_seqid: card.user_seqid,
          taskuser_seqid: card.taskuser_seqid,
          dtatv: card.dtatv,
          previsto: card.previsto,
          dtcon: card.dtcon,
          created_by: card.created_by
        }))
      }
    });

    const mockBoardId = originalColumn.cards.length > 0 && originalColumn.cards[0].board_seqid 
      ? originalColumn.cards[0].board_seqid.toString() 
      : '0';

    await this.logRepo.createLog({
      boardId: mockBoardId,
      userId: user.id,
      action: 'COLUMN_COPIED',
      description: `copiou a lista "${originalColumn.title}"`
    });

    return this.serializeColumn(newCol);
  }

  async deleteColumn(columnId: string, user: any) {
    const column = await this.colRepo.findById(columnId);

    if (column) {
      const boardSeqId = column.cards.length > 0 && column.cards[0].board_seqid
        ? column.cards[0].board_seqid.toString()
        : '0';

      await this.logRepo.createLog({
        boardId: boardSeqId,
        userId: user.id,
        action: 'COLUMN_DELETED',
        description: `excluiu a lista "${column.title}"`
      });

      await this.colRepo.deleteColumn(columnId);
    }
  }

  async updateColumnOrder(columnOrders: { id: string; order: number }[], user: any) {
    if (columnOrders.length > 0) {
      const firstCol = await this.colRepo.findById(columnOrders[0].id);
      if (firstCol) {
        const boardSeqId = firstCol.cards.length > 0 && firstCol.cards[0].board_seqid
          ? firstCol.cards[0].board_seqid.toString()
          : '0';

        await this.logRepo.createLog({
          boardId: boardSeqId,
          userId: user.id,
          action: 'COLUMN_REORDERED',
          description: `reorganizou a ordem das listas`
        });
      }
    }

    for (const item of columnOrders) {
      await this.colRepo.updateColumn(item.id, { order: item.order });
    }
  }

  async toggleColumnVisibility(columnId: string, visible: boolean, user: any) {
    const column = await this.colRepo.findById(columnId);
    if (!column) throw new Error('Coluna não encontrada');

    await this.colRepo.updateColumn(columnId, { visible });

    await this.logRepo.createLog({
      boardId: '0',
      userId: user.id,
      action: 'COLUMN_VISIBILITY_TOGGLED',
      description: `alterou a visibilidade da lista "${column.title}" para ${visible ? 'visível' : 'oculta'}`
    });
  }

  private serializeColumn(col: any) {
    if (!col) return null;
    return {
      ...col,
      id: col.seqid.toString(),
      seqid: col.seqid.toString(),
      workspaceSeqid: col.workspaceSeqid.toString(),
      cards: col.cards?.map((card: any) => ({
        ...card,
        seqid: card.seqid.toString(),
        board_seqid: card.board_seqid?.toString(),
        user_seqid: card.user_seqid?.toString(),
        taskuser_seqid: card.taskuser_seqid?.toString(),
        moduser: card.moduser?.toString(),
        created_by: card.created_by?.toString()
      }))
    };
  }
}
