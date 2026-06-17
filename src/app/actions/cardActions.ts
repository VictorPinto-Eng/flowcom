'use server';

import { CardService } from '@/domain/services/CardService';
import { WorkspaceService } from '@/domain/services/WorkspaceService';
import { UserRepository } from '@/domain/repositories/UserRepository';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

const cardService = new CardService();
const workspaceService = new WorkspaceService();
const userRepo = new UserRepository();

async function checkCardPermission(cardId: string, user: any, requireAdmin: boolean = false) {
  const card = await prisma.card.findUnique({
    where: { seqid: BigInt(cardId) },
    include: {
      column: {
        include: { workspace: true }
      }
    }
  });

  if (!card) throw new Error('Evento não encontrado');

  const workspaceId = card.column.workspace.id;
  const userRole = await workspaceService.getUserRoleInWorkspace(workspaceId, BigInt(user.seqid));

  if (requireAdmin) {
    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      throw new Error('Permissão negada. Apenas Proprietários e Administradores podem realizar esta alteração estrutural.');
    }
  } else {
    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      if (card.taskuser_seqid?.toString() !== user.seqid.toString()) {
        throw new Error('Permissão negada. Você só pode interagir com eventos atribuídos a você.');
      }
    }
  }
  return { card, userRole, workspaceId };
}

export async function getMyEventsAction() {
  const user = await userRepo.getLoggedUser();
  return await cardService.getMyEvents(user);
}

export async function addCardAction(columnId: string, title: string, boardId: string, description?: string, dtatvStr?: string | null, previstoStr?: string | null) {
  const user = await userRepo.getLoggedUser();
  
  const column = await prisma.column.findUnique({
    where: { seqid: BigInt(columnId) },
    include: { workspace: true }
  });
  if (!column) throw new Error('Coluna não encontrada');

  const role = await workspaceService.getUserRoleInWorkspace(column.workspace.id, BigInt(user.seqid));
  if (role !== 'OWNER' && role !== 'ADMIN') {
    throw new Error('Permissão negada. Apenas Proprietários e Administradores podem criar novos eventos neste painel.');
  }

  const card = await cardService.addCard(columnId, title, boardId, user, description, dtatvStr, previstoStr);
  revalidatePath('/');
  return card;
}

export async function moveCardAction(cardId: string, targetColId: string) {
  const user = await userRepo.getLoggedUser();
  await checkCardPermission(cardId, user, false);
  await cardService.moveCard(cardId, targetColId, user);
  revalidatePath('/');
}

export async function completeCardAction(cardId: string, targetColId: string, localDateStr?: string) {
  const user = await userRepo.getLoggedUser();
  await checkCardPermission(cardId, user, false);
  await cardService.completeCard(cardId, targetColId, user, localDateStr);
  revalidatePath('/');
}

export async function updateCardPrevistoAction(cardId: string, previstoStr: string | null) {
  const user = await userRepo.getLoggedUser();
  await checkCardPermission(cardId, user, false);
  const card = await cardService.updateCardPrevisto(cardId, previstoStr, user);
  revalidatePath('/');
  return card;
}

export async function updateCardAction(cardId: string, title: string, description: string | null, previstoStr: string | null, dtconStr: string | null = null, dtatvStr: string | null = null) {
  const user = await userRepo.getLoggedUser();
  await checkCardPermission(cardId, user, false);
  const card = await cardService.updateCard(cardId, title, description, previstoStr, dtconStr, dtatvStr, user);
  revalidatePath('/');
  return card;
}

export async function getAllUsersAction() {
  return await userRepo.getAllUsers();
}

export async function getWorkspaceMembersAction(workspaceSeqid: string) {
  if (!workspaceSeqid) return [];
  try {
    let seqid: bigint;
    if (/^\d+$/.test(workspaceSeqid)) {
      seqid = BigInt(workspaceSeqid);
    } else {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceSeqid },
        select: { seqid: true }
      });
      if (!workspace) return [];
      seqid = workspace.seqid;
    }
    const users = await userRepo.getWorkspaceMembers(seqid);
    if (users.length === 0) {
      const loggedUser = await userRepo.getLoggedUser();
      return [loggedUser];
    }
    return users;
  } catch (error) {
    console.error('Error fetching workspace members:', error);
    return [];
  }
}

export async function transferCardAction(cardId: string, taskuserSeqid: string | null) {
  const user = await userRepo.getLoggedUser();
  const { userRole, workspaceId } = await checkCardPermission(cardId, user, false);

  if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
    if (!taskuserSeqid) {
      throw new Error('Membros devem delegar a atividade a um responsável.');
    }
    const targetRole = await workspaceService.getUserRoleInWorkspace(workspaceId, BigInt(taskuserSeqid));
    if (targetRole !== 'OWNER' && targetRole !== 'ADMIN') {
      throw new Error('Permissão negada. Membros comuns só podem devolver a responsabilidade do evento para o Proprietário ou Administradores.');
    }
  }

  const taskUserSeqidVal = taskuserSeqid ? BigInt(taskuserSeqid) : null;
  const card = await cardService.updateCardTaskUser(cardId, taskUserSeqidVal, user);
  revalidatePath('/');
  return card;
}

export async function addCardActionLogAction(cardSeqid: string, description: string) {
  const user = await userRepo.getLoggedUser();
  await checkCardPermission(cardSeqid, user, false);
  const action = await cardService.addCardActionLog(BigInt(cardSeqid), description, user);
  revalidatePath('/');
  return {
    ...action,
    seqid: action.seqid.toString(),
    card_seqid: action.card_seqid?.toString(),
    user_seqid: action.user_seqid?.toString(),
    created_by: action.created_by?.toString()
  };
}

export async function updateCardActionLogAction(actionSeqid: string, description: string) {
  const user = await userRepo.getLoggedUser();
  
  const log = await prisma.card_act.findUnique({
    where: { seqid: BigInt(actionSeqid) }
  });
  if (!log || !log.card_seqid) throw new Error('Andamento não encontrado');
  await checkCardPermission(log.card_seqid.toString(), user, false);

  const action = await cardService.updateCardActionLog(BigInt(actionSeqid), description, user);
  revalidatePath('/');
  return {
    ...action,
    seqid: action.seqid.toString(),
    card_seqid: action.card_seqid?.toString(),
    user_seqid: action.user_seqid?.toString(),
    created_by: action.created_by?.toString()
  };
}

export async function deleteCardActionLogAction(actionSeqid: string) {
  const user = await userRepo.getLoggedUser();
  const log = await prisma.card_act.findUnique({
    where: { seqid: BigInt(actionSeqid) }
  });
  if (!log || !log.card_seqid) throw new Error('Andamento não encontrado');
  await checkCardPermission(log.card_seqid.toString(), user, false);

  await cardService.deleteCardActionLog(BigInt(actionSeqid));
  revalidatePath('/');
}

export async function transferCardWorkspaceAction(cardId: string, workspaceSeqid: string, boardSeqid: string, columnSeqid: string) {
  const user = await userRepo.getLoggedUser();
  await checkCardPermission(cardId, user, true); // Requer admin/proprietário para mover entre áreas
  const card = await cardService.transferCardWorkspace(cardId, workspaceSeqid, boardSeqid, columnSeqid, user);
  revalidatePath('/');
  return card;
}

export async function completeCardDirectlyAction(cardId: string, localDateStr?: string) {
  const user = await userRepo.getLoggedUser();
  await checkCardPermission(cardId, user, false);
  await cardService.completeCardDirectly(cardId, user, localDateStr);
  revalidatePath('/');
}

export async function getAllCardsReportAction(workspaceId?: string) {
  const user = await userRepo.getLoggedUser();
  return await cardService.getAllCardsReport(workspaceId, user);
}
