'use server';

import { BoardService } from '@/domain/services/BoardService';
import { WorkspaceService } from '@/domain/services/WorkspaceService';
import { UserRepository } from '@/domain/repositories/UserRepository';
import { validateName, validateDescription } from '@/lib/validation';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

const boardService = new BoardService();
const workspaceService = new WorkspaceService();
const userRepo = new UserRepository();

function getTodayLocalDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function validateCompletionDate(value?: string) {
  const date = value || getTodayLocalDateString();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Data de conclusão inválida.');
  }

  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  const normalized = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;

  if (normalized !== date) {
    throw new Error('Data de conclusão inválida.');
  }

  if (date > getTodayLocalDateString()) {
    throw new Error('A data de conclusão não pode ser no futuro.');
  }

  return date;
}

export async function getSectorsAction() {
  return await boardService.getSectors();
}

export async function createBoardAction(workspaceId: string, name: string, userId?: string, sectorId?: number, detalhes?: string, dtatv?: string, previsto?: string) {
  const userObj = await userRepo.getLoggedUser();

  const role = await workspaceService.getUserRoleInWorkspace(workspaceId, BigInt(userObj.seqid));
  if (role !== 'OWNER' && role !== 'ADMIN') {
    throw new Error('Permissão negada. Apenas Proprietários e Administradores podem criar novos fluxos nesta Área de Trabalho.');
  }

  const validName = validateName(name, 'Nome do fluxo');
  const validDetalhes = validateDescription(detalhes, 'Detalhes');

  const board = await boardService.createBoard(workspaceId, validName, userObj, sectorId, validDetalhes ?? undefined, dtatv, previsto);
  revalidatePath('/dashboard');
  revalidatePath('/');
  return board;
}

export async function getBoardData(boardId?: string) {
  const user = await userRepo.getLoggedUser();
  return await boardService.getBoardData(boardId, user);
}

export async function updateBoardAction(boardId: string, name: string, detalhes: string | null, userId: string, sectorId?: number | null, dtatv?: string | null, workspaceId?: string, assignedUserSeqid?: string | null, previsto?: string | null) {
  const user = await userRepo.getLoggedUser();

  const board = await prisma.board.findUnique({
    where: { seqId: BigInt(boardId) },
    select: { workspaceId: true }
  });
  if (!board) throw new Error('Quadro não encontrado');

  const role = await workspaceService.getUserRoleInWorkspace(board.workspaceId.toString(), BigInt(user.seqid));
  if (role !== 'OWNER' && role !== 'ADMIN') {
    throw new Error('Permissão negada. Apenas Proprietários e Administradores podem atualizar as configurações deste fluxo.');
  }

  const validName = validateName(name, 'Nome do fluxo');
  const validDetalhes = validateDescription(detalhes, 'Detalhes');

  const updated = await boardService.updateBoard(boardId, validName, validDetalhes, user, sectorId, dtatv, workspaceId, assignedUserSeqid, previsto);
  revalidatePath('/dashboard');
  revalidatePath('/');
  return updated;
}

export async function getBoardActivityLogs(boardId: string) {
  const user = await userRepo.getLoggedUser();
  return await boardService.getBoardActivityLogs(boardId, user);
}

export async function completeBoardAction(boardId: string, localDateStr?: string) {
  const user = await userRepo.getLoggedUser();

  const board = await prisma.board.findUnique({
    where: { seqId: BigInt(boardId) },
    select: { workspaceId: true }
  });
  if (!board) throw new Error('Quadro não encontrado');

  const role = await workspaceService.getUserRoleInWorkspace(board.workspaceId.toString(), BigInt(user.seqid));
  if (role !== 'OWNER') {
    throw new Error('Permissão negada. Apenas o Proprietário pode encerrar esta atividade.');
  }

  const validCompletionDate = validateCompletionDate(localDateStr);

  await boardService.completeActivity(boardId, user, validCompletionDate);
  revalidatePath('/dashboard');
  revalidatePath('/');
}

export async function getBoardPendingCardsCountAction(boardId: string) {
  const board = await prisma.board.findUnique({
    where: { seqId: BigInt(boardId) },
    include: {
      card: {
        where: { dtcon: null },
        select: { seqid: true }
      }
    }
  });
  if (!board) return 0;
  return board.card.length;
}

export async function requestBoardCompletionAction(boardId: string) {
  const user = await userRepo.getLoggedUser();

  const board = await prisma.board.findUnique({
    where: { seqId: BigInt(boardId) },
    include: { workspace: true }
  });
  if (!board) throw new Error('Atividade não encontrada');

  const role = await workspaceService.getUserRoleInWorkspace(board.workspaceId.toString(), BigInt(user.seqid));
  if (role !== 'OWNER' && role !== 'ADMIN') {
    throw new Error('Permissão negada. Apenas Administradores podem solicitar a finalização.');
  }

  const log = await prisma.activityLog.create({
    data: {
      boardId: boardId,
      userId: user.id,
      action: 'REQUEST_COMPLETION',
      description: `[SOLICITACAO_CONCLUSAO_BOARD:${boardId}] O administrador ${user.name} solicitou a finalização e encerramento da atividade ${board.name}.`
    }
  });

  revalidatePath('/dashboard');
  revalidatePath('/');
  return {
    ...log,
    seqid: log.seqid.toString()
  };
}

export async function respondBoardCompletionAction(boardId: string, logSeqid: string, accept: boolean) {
  const user = await userRepo.getLoggedUser();

  const board = await prisma.board.findUnique({
    where: { seqId: BigInt(boardId) },
    include: { workspace: true }
  });
  if (!board) throw new Error('Atividade não encontrada');

  const role = await workspaceService.getUserRoleInWorkspace(board.workspaceId.toString(), BigInt(user.seqid));
  if (role !== 'OWNER') {
    throw new Error('Permissão negada. Apenas o Proprietário da área de trabalho pode responder a esta solicitação.');
  }

  const log = await prisma.activityLog.findUnique({
    where: { seqid: BigInt(logSeqid) }
  });
  if (!log) throw new Error('Solicitação não encontrada');

  const newAction = accept ? 'REQUEST_COMPLETION_APPROVED' : 'REQUEST_COMPLETION_REJECTED';
  const cleanDesc = log.description.replace('[SOLICITACAO_CONCLUSAO_BOARD:', accept ? '[SOLICITACAO_CONCLUSAO_ACEITA:' : '[SOLICITACAO_CONCLUSAO_RECUSADA:');

  await prisma.activityLog.update({
    where: { seqid: BigInt(logSeqid) },
    data: {
      action: newAction,
      description: cleanDesc
    }
  });

  if (accept) {
    const localDate = new Date();
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const localDateStr = `${year}-${month}-${day}`;

    await boardService.completeActivity(boardId, user, localDateStr);
  }

  revalidatePath('/dashboard');
  revalidatePath('/');
}

export async function getPendingBoardCompletionRequestsAction() {
  const user = await userRepo.getLoggedUser();

  const ownedWorkspaces = await prisma.workspace.findMany({
    where: { users_seqid: user.seqid },
    select: { seqid: true }
  });
  const ownedWorkspaceSeqids = ownedWorkspaces.map(w => w.seqid);

  const activeBoards = await prisma.board.findMany({
    where: {
      workspaceId: { in: ownedWorkspaceSeqids },
      dtcon: null
    },
    select: { seqId: true, name: true, workspace: { select: { name: true } } }
  });

  const activeBoardIdsStr = activeBoards.map(b => b.seqId.toString());

  const logs = await prisma.activityLog.findMany({
    where: {
      action: 'REQUEST_COMPLETION',
      boardId: { in: activeBoardIdsStr },
      description: {
        startsWith: '[SOLICITACAO_CONCLUSAO_BOARD:'
      }
    }
  });

  return logs.map(log => {
    const matchedBoard = activeBoards.find(b => b.seqId.toString() === log.boardId);
    return {
      seqid: log.seqid.toString(),
      boardId: log.boardId,
      boardName: matchedBoard?.name || 'Atividade',
      workspaceName: matchedBoard?.workspace?.name || 'Workspace',
      description: log.description
    };
  });
}
