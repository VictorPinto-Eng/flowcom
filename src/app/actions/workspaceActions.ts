'use server';

import { WorkspaceService } from '@/domain/services/WorkspaceService';
import { UserRepository } from '@/domain/repositories/UserRepository';
import { isRateLimited } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/get-client-ip';
import { validateName, validateDescription, validateEmail } from '@/lib/validation';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

const workspaceService = new WorkspaceService();
const userRepo = new UserRepository();

export async function getWorkspaceTypes() {
  await userRepo.getLoggedUser();
  return await workspaceService.getTypes();
}

export async function createWorkspaceAction(data: { name: string; typeId: string; description?: string }) {
  const user = await userRepo.getLoggedUser();
  const name = validateName(data.name, 'Nome');
  const description = validateDescription(data.description, 'Descrição');
  const workspace = await workspaceService.createWorkspace({ name, typeId: data.typeId, description: description ?? undefined, userId: user.id });
  revalidatePath('/dashboard');
  revalidatePath('/');
  return workspace;
}

export async function getUserWorkspaces(userId: string, userSeqid?: string) {
  await userRepo.getLoggedUser();
  return await workspaceService.getUserWorkspaces(userId, userSeqid);
}

export async function getCurrentUserAction() {
  try {
    const user = await userRepo.getLoggedUser();
    if (!user) return null;

    return {
      ...user,
      seqid: user.seqid.toString()
    };
  } catch {
    return null;
  }
}

export async function updateWorkspaceAction(workspaceId: string, data: { name: string; typeId: string; description?: string }) {
  const user = await userRepo.getLoggedUser();
  const role = await workspaceService.getUserRoleInWorkspace(workspaceId, BigInt(user.seqid));
  if (role !== 'OWNER' && role !== 'ADMIN') throw new Error('Permissão negada.');
  const name = validateName(data.name, 'Nome');
  const description = validateDescription(data.description, 'Descrição');
  const workspace = await workspaceService.updateWorkspace(workspaceId, { name, typeId: data.typeId, description: description ?? undefined });
  revalidatePath('/dashboard');
  revalidatePath('/');
  return workspace;
}

export async function getWorkspaceMembersWithRolesAction(workspaceId: string) {
  const user = await userRepo.getLoggedUser();
  const role = await workspaceService.getUserRoleInWorkspace(workspaceId, BigInt(user.seqid));
  if (!role) throw new Error('Acesso negado.');
  return await workspaceService.getWorkspaceMembersWithRoles(workspaceId);
}

export async function sendWorkspaceInviteAction(workspaceId: string, email: string, role: string) {
  if (!['ADMIN', 'MEMBER'].includes(role)) throw new Error('Papel inválido para convite.');
  const user = await userRepo.getLoggedUser();
  const userRole = await workspaceService.getUserRoleInWorkspace(workspaceId, BigInt(user.seqid));
  if (userRole !== 'OWNER' && userRole !== 'ADMIN') throw new Error('Permissão negada.');
  const validEmail = validateEmail(email);
  const invite = await workspaceService.sendWorkspaceInvite(workspaceId, validEmail, role, user);
  revalidatePath('/dashboard');
  return invite;
}

export async function getWorkspaceInvitesAction(workspaceId: string) {
  const user = await userRepo.getLoggedUser();
  const role = await workspaceService.getUserRoleInWorkspace(workspaceId, BigInt(user.seqid));
  if (role !== 'OWNER' && role !== 'ADMIN') throw new Error('Permissão negada.');
  return await workspaceService.getWorkspaceInvites(workspaceId);
}

export async function cancelWorkspaceInviteAction(inviteSeqid: string) {
  const user = await userRepo.getLoggedUser();
  const invite = await prisma.workspaceInvite.findUnique({ where: { seqid: BigInt(inviteSeqid) }, include: { workspace: true } });
  if (!invite) throw new Error('Convite não encontrado.');
  const role = await workspaceService.getUserRoleInWorkspace(invite.workspace.id, BigInt(user.seqid));
  if (role !== 'OWNER' && role !== 'ADMIN') throw new Error('Permissão negada.');
  const result = await workspaceService.cancelWorkspaceInvite(inviteSeqid);
  revalidatePath('/dashboard');
  return result;
}

export async function removeWorkspaceMemberAction(workspaceId: string, userSeqid: string) {
  const user = await userRepo.getLoggedUser();
  const role = await workspaceService.getUserRoleInWorkspace(workspaceId, BigInt(user.seqid));
  if (role !== 'OWNER' && role !== 'ADMIN') throw new Error('Permissão negada.');
  const result = await workspaceService.removeWorkspaceMember(workspaceId, userSeqid);
  revalidatePath('/dashboard');
  return result;
}

export async function updateWorkspaceMemberRoleAction(workspaceId: string, userSeqid: string, role: string) {
  const user = await userRepo.getLoggedUser();
  const currentRole = await workspaceService.getUserRoleInWorkspace(workspaceId, BigInt(user.seqid));
  if (currentRole !== 'OWNER') throw new Error('Apenas o proprietário pode alterar papéis.');
  if (!['OWNER', 'ADMIN', 'MEMBER'].includes(role)) throw new Error('Papel inválido.');
  const result = await workspaceService.updateWorkspaceMemberRole(workspaceId, userSeqid, role);
  revalidatePath('/dashboard');
  return result;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateToken(token: string): string {
  const trimmed = token?.trim();
  if (!trimmed || !UUID_REGEX.test(trimmed)) {
    throw new Error('Token de convite inválido.');
  }
  return trimmed;
}

export async function acceptWorkspaceInviteAction(token: string) {
  const user = await userRepo.getLoggedUser();
  if (!user) throw new Error('Usuário não autenticado');
  const validToken = validateToken(token);
  const ip = await getClientIp();
  if (await isRateLimited(ip, user.seqid.toString(), 'ACCEPT_INVITE')) {
    throw new Error('Muitas tentativas. Por favor, tente novamente mais tarde.');
  }
  const member = await workspaceService.acceptWorkspaceInvite(validToken, user);
  revalidatePath('/dashboard');
  revalidatePath('/');
  return member;
}

export async function getPendingInvitesAction() {
  const user = await userRepo.getLoggedUser();
  if (!user) return [];
  const invites = await prisma.workspaceInvite.findMany({
    where: {
      email: {
        equals: user.email,
        mode: 'insensitive'
      },
      expiresAt: {
        gt: new Date()
      }
    },
    include: {
      workspace: true,
      invitedBy: true
    }
  });

  return invites.map(i => ({
    seqid: i.seqid.toString(),
    workspaceName: i.workspace.name,
    workspaceId: i.workspace.id,
    invitedByName: i.invitedBy.name,
    token: i.token
  }));
}

export async function rejectWorkspaceInviteAction(token: string) {
  const user = await userRepo.getLoggedUser();
  const validToken = validateToken(token);
  const ip = await getClientIp();
  if (await isRateLimited(ip, user.seqid.toString(), 'ACCEPT_INVITE')) {
    throw new Error('Muitas tentativas. Por favor, tente novamente mais tarde.');
  }
  await workspaceService.rejectWorkspaceInvite(validToken, user);
  revalidatePath('/dashboard');
  revalidatePath('/');
}

export async function getUserRoleInWorkspaceAction(workspaceId: string) {
  const user = await userRepo.getLoggedUser();
  if (!user) return null;
  return await workspaceService.getUserRoleInWorkspace(workspaceId, BigInt(user.seqid));
}

export async function getMovementsAction() {
  const user = await userRepo.getLoggedUser();
  if (!user) throw new Error('Usuário não autenticado');
  return await workspaceService.getMovements(user.id, user.seqid.toString());
}
