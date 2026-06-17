'use server';

import { BoardService } from '@/domain/services/BoardService';
import { WorkspaceService } from '@/domain/services/WorkspaceService';
import { UserRepository } from '@/domain/repositories/UserRepository';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

const boardService = new BoardService();
const workspaceService = new WorkspaceService();
const userRepo = new UserRepository();

export async function getSectorsAction() {
  return await boardService.getSectors();
}

export async function createBoardAction(workspaceId: string, name: string, userId?: string, sectorId?: number, detalhes?: string, dtatv?: string, previsto?: string) {
  let userObj = userId ? await userRepo.findById(userId) : null;
  if (!userObj) {
    userObj = await userRepo.getLoggedUser();
  }

  const role = await workspaceService.getUserRoleInWorkspace(workspaceId, BigInt(userObj.seqid));
  if (role !== 'OWNER' && role !== 'ADMIN') {
    throw new Error('Permissão negada. Apenas Proprietários e Administradores podem criar novos fluxos nesta Área de Trabalho.');
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

  const board = await prisma.board.findUnique({
    where: { seqId: BigInt(boardId) },
    select: { workspaceId: true }
  });
  if (!board) throw new Error('Quadro não encontrado');

  const role = await workspaceService.getUserRoleInWorkspace(board.workspaceId.toString(), BigInt(user.seqid));
  if (role !== 'OWNER' && role !== 'ADMIN') {
    throw new Error('Permissão negada. Apenas Proprietários e Administradores podem atualizar as configurações deste fluxo.');
  }

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

  const board = await prisma.board.findUnique({
    where: { seqId: BigInt(boardId) },
    select: { workspaceId: true }
  });
  if (!board) throw new Error('Quadro não encontrado');

  const role = await workspaceService.getUserRoleInWorkspace(board.workspaceId.toString(), BigInt(user.seqid));
  if (role !== 'OWNER' && role !== 'ADMIN') {
    throw new Error('Permissão negada. Apenas Proprietários e Administradores podem concluir este fluxo.');
  }

  await boardService.completeActivity(boardId, user);
  revalidatePath('/dashboard');
  revalidatePath('/');
}
