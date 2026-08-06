'use server';

import { CardService } from '@/domain/services/CardService';
import { WorkspaceService } from '@/domain/services/WorkspaceService';
import { UserRepository } from '@/domain/repositories/UserRepository';
import { isRateLimited } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/get-client-ip';
import { validateTitle, validateDescription } from '@/lib/validation';
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

export async function getCardActionsAction(cardSeqid: string) {
  const user = await userRepo.getLoggedUser();
  if (!user) throw new Error('Não autenticado');

  const actions = await prisma.card_act.findMany({
    where: { card_seqid: BigInt(cardSeqid) },
    orderBy: { created_at: 'desc' },
    include: { users: true }
  });

  return actions.map(act => ({
    ...act,
    seqid: act.seqid.toString(),
    card_seqid: act.card_seqid?.toString(),
    user_seqid: act.user_seqid?.toString(),
    created_by: act.created_by?.toString()
  }));
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

  const validTitle = validateTitle(title, 'Título');
  const validDescription = validateDescription(description, 'Descrição');

  const card = await cardService.addCard(columnId, validTitle, boardId, user, validDescription ?? undefined, dtatvStr, previstoStr);
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
  const validTitle = validateTitle(title, 'Título');
  const validDescription = validateDescription(description, 'Descrição');
  const card = await cardService.updateCard(cardId, validTitle, validDescription, previstoStr, dtconStr, dtatvStr, user);
  revalidatePath('/');
  return card;
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
  const validDescription = validateDescription(description, 'Descrição', true);
  const action = await cardService.addCardActionLog(BigInt(cardSeqid), validDescription!, user);
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

  const validDescription = validateDescription(description, 'Descrição', true);
  const action = await cardService.updateCardActionLog(BigInt(actionSeqid), validDescription!, user);
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

export async function requestTransferAction(cardId: string, targetUserSeqid: string) {
  const user = await userRepo.getLoggedUser();
  if (!user) throw new Error('Usuário não autenticado');
  if (await isRateLimited(await getClientIp(), user.seqid.toString(), 'REQUEST_TRANSFER')) {
    throw new Error('Muitas tentativas. Por favor, tente novamente mais tarde.');
  }
  const { userRole } = await checkCardPermission(cardId, user, true);

  const targetUser = await prisma.user.findUnique({
    where: { seqid: BigInt(targetUserSeqid) }
  });
  if (!targetUser) throw new Error('Destinatário não encontrado');

  const description = `[SOLICITACAO_PENDENTE:${targetUser.seqid.toString()}:${targetUser.name}] O administrador ${user.name} solicitou a transferência deste evento para ${targetUser.name}.`;

  const action = await cardService.addCardActionLog(BigInt(cardId), description, user);

  revalidatePath('/dashboard');
  revalidatePath('/');
  return {
    ...action,
    seqid: action.seqid.toString(),
    card_seqid: action.card_seqid?.toString(),
    user_seqid: action.user_seqid?.toString(),
    created_by: action.created_by?.toString()
  };
}

export async function respondTransferRequestAction(cardId: string, actionSeqid: string, accept: boolean) {
  const user = await userRepo.getLoggedUser();
  if (!user) throw new Error('Usuário não autenticado');
  if (await isRateLimited(await getClientIp(), user.seqid.toString(), 'RESPOND_TRANSFER')) {
    throw new Error('Muitas tentativas. Por favor, tente novamente mais tarde.');
  }

  const log = await prisma.card_act.findUnique({
    where: { seqid: BigInt(actionSeqid) }
  });
  if (!log || !log.description) throw new Error('Solicitação não encontrada');

  const prefix = `[SOLICITACAO_PENDENTE:${user.seqid.toString()}:`;
  if (!log.description.startsWith(prefix)) {
    throw new Error('Você não tem permissão para responder a esta solicitação.');
  }

  const card = await prisma.card.findUnique({
    where: { seqid: BigInt(cardId) }
  });
  if (!card) throw new Error('Card não encontrado');

  const newStatus = accept ? 'ACEITA' : 'RECUSADA';
  const cleanDesc = log.description.replace('[SOLICITACAO_PENDENTE:', `[SOLICITACAO_${newStatus}:`);

  await prisma.card_act.update({
    where: { seqid: BigInt(actionSeqid) },
    data: { description: cleanDesc }
  });

  if (accept) {
    await prisma.card.update({
      where: { seqid: BigInt(cardId) },
      data: {
        taskuser_seqid: user.seqid,
        moduser: user.seqid,
        dtmod: new Date()
      }
    });

    await cardService.addCardActionLog(BigInt(cardId), `Transferência aceita. Responsável atual: ${user.name}`, user);
  } else {
    await cardService.addCardActionLog(BigInt(cardId), `Transferência recusada por ${user.name}`, user);
  }

  revalidatePath('/dashboard');
  revalidatePath('/');
}

export async function getPendingTransferRequestsAction() {
  const user = await userRepo.getLoggedUser();

  const pendingRequests = await prisma.card_act.findMany({
    where: {
      description: {
        startsWith: `[SOLICITACAO_PENDENTE:${user.seqid.toString()}:`
      },
      card: {
        dtcon: null
      }
    },
    include: {
      card: {
        include: {
          column: {
            include: {
              workspace: true
            }
          }
        }
      }
    }
  });

  return pendingRequests.map(req => ({
    seqid: req.seqid.toString(),
    cardSeqid: req.card_seqid?.toString(),
    cardTitle: req.card?.title || 'Sem título',
    workspaceName: req.card?.column.workspace.name || 'Sem workspace',
    description: req.description || ''
  }));
}
