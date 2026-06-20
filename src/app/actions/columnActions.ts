'use server';

import { ColumnService } from '@/domain/services/ColumnService';
import { WorkspaceService } from '@/domain/services/WorkspaceService';
import { UserRepository } from '@/domain/repositories/UserRepository';
import { ColumnRepository } from '@/domain/repositories/ColumnRepository';
import { BoardRepository } from '@/domain/repositories/BoardRepository';
import { validateName } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

const columnService = new ColumnService();
const workspaceService = new WorkspaceService();
const userRepo = new UserRepository();
const colRepo = new ColumnRepository();
const boardRepo = new BoardRepository();

async function assertColumnPermission(user: { seqid: bigint | string }, workspaceId: string) {
  const role = await workspaceService.getUserRoleInWorkspace(workspaceId, BigInt(user.seqid));
  if (role !== 'OWNER' && role !== 'ADMIN') {
    throw new Error('Permissão negada.');
  }
}

export async function addColumnAction(boardId: string, title: string) {
  const user = await userRepo.getLoggedUser();

  const board = await boardRepo.findById(boardId);
  const workspaceId = board
    ? board.workspaceId.toString()
    : boardId;
  await assertColumnPermission(user, workspaceId);

  const validTitle = validateName(title, 'Nome da lista');
  const column = await columnService.addColumn(boardId, validTitle, user);
  revalidatePath('/');
  return column;
}

export async function copyColumnAction(columnId: string) {
  const user = await userRepo.getLoggedUser();

  const column = await colRepo.findById(columnId);
  if (!column) throw new Error('Coluna não encontrada.');
  await assertColumnPermission(user, column.workspaceSeqid.toString());

  const newCol = await columnService.copyColumn(columnId, user);
  revalidatePath('/');
  return newCol;
}

export async function deleteColumnAction(columnId: string) {
  const user = await userRepo.getLoggedUser();

  const column = await colRepo.findById(columnId);
  if (!column) throw new Error('Coluna não encontrada.');
  await assertColumnPermission(user, column.workspaceSeqid.toString());

  await columnService.deleteColumn(columnId, user);
  revalidatePath('/');
}

export async function updateColumnOrderAction(columnOrders: { id: string; order: number }[]) {
  const user = await userRepo.getLoggedUser();

  if (columnOrders.length > 0) {
    const firstCol = await colRepo.findById(columnOrders[0].id);
    if (!firstCol) throw new Error('Coluna não encontrada.');
    await assertColumnPermission(user, firstCol.workspaceSeqid.toString());
  }

  await columnService.updateColumnOrder(columnOrders, user);
  revalidatePath('/');
}

export async function toggleColumnVisibilityAction(columnId: string, visible: boolean) {
  const user = await userRepo.getLoggedUser();

  const column = await colRepo.findById(columnId);
  if (!column) throw new Error('Coluna não encontrada.');
  await assertColumnPermission(user, column.workspaceSeqid.toString());

  await columnService.toggleColumnVisibility(columnId, visible, user);
  revalidatePath('/');
}
