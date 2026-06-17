'use server';

import { CardService } from '@/domain/services/CardService';
import { UserRepository } from '@/domain/repositories/UserRepository';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

const cardService = new CardService();
const userRepo = new UserRepository();

export async function getMyEventsAction() {
  const user = await userRepo.getLoggedUser();
  return await cardService.getMyEvents(user);
}

export async function addCardAction(columnId: string, title: string, boardId: string, description?: string, dtatvStr?: string | null, previstoStr?: string | null) {
  const user = await userRepo.getLoggedUser();
  const card = await cardService.addCard(columnId, title, boardId, user, description, dtatvStr, previstoStr);
  revalidatePath('/');
  return card;
}

export async function moveCardAction(cardId: string, targetColId: string) {
  const user = await userRepo.getLoggedUser();
  await cardService.moveCard(cardId, targetColId, user);
  revalidatePath('/');
}

export async function completeCardAction(cardId: string, targetColId: string) {
  const user = await userRepo.getLoggedUser();
  await cardService.completeCard(cardId, targetColId, user);
  revalidatePath('/');
}

export async function updateCardPrevistoAction(cardId: string, previstoStr: string | null) {
  const user = await userRepo.getLoggedUser();
  const card = await cardService.updateCardPrevisto(cardId, previstoStr, user);
  revalidatePath('/');
  return card;
}

export async function updateCardAction(cardId: string, title: string, description: string | null, previstoStr: string | null, dtconStr: string | null = null, dtatvStr: string | null = null) {
  const user = await userRepo.getLoggedUser();
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
  const taskUserSeqidVal = taskuserSeqid ? BigInt(taskuserSeqid) : null;
  const card = await cardService.updateCardTaskUser(cardId, taskUserSeqidVal, user);
  revalidatePath('/');
  return card;
}

export async function addCardActionLogAction(cardSeqid: string, description: string) {
  const user = await userRepo.getLoggedUser();
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
  await cardService.deleteCardActionLog(BigInt(actionSeqid));
  revalidatePath('/');
}

export async function transferCardWorkspaceAction(cardId: string, workspaceSeqid: string, boardSeqid: string, columnSeqid: string) {
  const user = await userRepo.getLoggedUser();
  const card = await cardService.transferCardWorkspace(cardId, workspaceSeqid, boardSeqid, columnSeqid, user);
  revalidatePath('/');
  return card;
}

export async function completeCardDirectlyAction(cardId: string) {
  const user = await userRepo.getLoggedUser();
  await cardService.completeCardDirectly(cardId, user);
  revalidatePath('/');
}

export async function getAllCardsReportAction(workspaceId?: string) {
  const user = await userRepo.getLoggedUser();
  return await cardService.getAllCardsReport(workspaceId, user);
}
