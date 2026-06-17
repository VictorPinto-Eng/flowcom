'use server';

import { BoardService } from '@/domain/services/BoardService';
import { UserRepository } from '@/domain/repositories/UserRepository';
import { revalidatePath } from 'next/cache';

const boardService = new BoardService();
const userRepo = new UserRepository();

export async function getSectorsAction() {
  return await boardService.getSectors();
}

export async function createBoardAction(workspaceId: string, name: string, userId?: string, sectorId?: number, detalhes?: string, dtatv?: string, previsto?: string) {
  let userObj = userId ? await userRepo.findById(userId) : null;
  if (!userObj) {
    userObj = await userRepo.getLoggedUser();
  }

  const board = await boardService.createBoard(workspaceId, name, userObj, sectorId, detalhes, dtatv, previsto);
  revalidatePath('/dashboard');
  revalidatePath('/');
  return board;
}

export async function getBoardData(boardId?: string) {
  const user = await userRepo.getLoggedUser();
  return await boardService.getBoardData(boardId, user);
}

export async function updateBoardAction(boardId: string, name: string, detalhes: string | null, userId: string, sectorId?: number | null, dtatv?: string | null, workspaceId?: string, assignedUserSeqid?: string | null, previsto?: string | null) {
  const user = await userRepo.findById(userId);
  if (!user) throw new Error('Usuário não encontrado');

  const updated = await boardService.updateBoard(boardId, name, detalhes, user, sectorId, dtatv, workspaceId, assignedUserSeqid, previsto);
  revalidatePath('/dashboard');
  revalidatePath('/');
  return updated;
}

export async function getBoardActivityLogs(boardId: string) {
  const user = await userRepo.getLoggedUser();
  return await boardService.getBoardActivityLogs(boardId, user);
}

export async function completeBoardAction(boardId: string) {
  const user = await userRepo.getLoggedUser();
  await boardService.completeActivity(boardId, user);
  revalidatePath('/dashboard');
  revalidatePath('/');
}
