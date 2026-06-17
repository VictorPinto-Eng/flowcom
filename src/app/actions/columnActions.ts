'use server';

import { ColumnService } from '@/domain/services/ColumnService';
import { UserRepository } from '@/domain/repositories/UserRepository';
import { revalidatePath } from 'next/cache';

const columnService = new ColumnService();
const userRepo = new UserRepository();

export async function addColumnAction(boardId: string, title: string) {
  const user = await userRepo.getLoggedUser();
  const column = await columnService.addColumn(boardId, title, user);
  revalidatePath('/');
  return column;
}

export async function copyColumnAction(columnId: string) {
  const user = await userRepo.getLoggedUser();
  const newCol = await columnService.copyColumn(columnId, user);
  revalidatePath('/');
  return newCol;
}

export async function deleteColumnAction(columnId: string) {
  const user = await userRepo.getLoggedUser();
  await columnService.deleteColumn(columnId, user);
  revalidatePath('/');
}

export async function updateColumnOrderAction(columnOrders: { id: string; order: number }[]) {
  const user = await userRepo.getLoggedUser();
  await columnService.updateColumnOrder(columnOrders, user);
  revalidatePath('/');
}

export async function toggleColumnVisibilityAction(columnId: string, visible: boolean) {
  const user = await userRepo.getLoggedUser();
  await columnService.toggleColumnVisibility(columnId, visible, user);
  revalidatePath('/');
}
