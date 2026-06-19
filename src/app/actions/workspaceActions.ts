'use server';

import { WorkspaceService } from '@/domain/services/WorkspaceService';
import { UserRepository } from '@/domain/repositories/UserRepository';
import { isRateLimited } from '@/lib/rate-limit';
import { revalidatePath } from 'next/cache';

const workspaceService = new WorkspaceService();
const userRepo = new UserRepository();

export async function getWorkspaceTypes() {
  return await workspaceService.getTypes();
}

export async function createWorkspaceAction(data: { name: string; typeId: string; description?: string; userId: string }) {
  const workspace = await workspaceService.createWorkspace(data);
  revalidatePath('/dashboard');
  revalidatePath('/');
  return workspace;
}

export async function getUserWorkspaces(userId: string, userSeqid?: string) {
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
  const workspace = await workspaceService.updateWorkspace(workspaceId, data);
  revalidatePath('/dashboard');
  revalidatePath('/');
  return workspace;
}

export async function getWorkspaceMembersWithRolesAction(workspaceId: string) {
  return await workspaceService.getWorkspaceMembersWithRoles(workspaceId);
}

export async function sendWorkspaceInviteAction(workspaceId: string, email: string, role: string) {
  const user = await userRepo.getLoggedUser();
  const invite = await workspaceService.sendWorkspaceInvite(workspaceId, email, role, user);
  revalidatePath('/dashboard');
  return invite;
}

export async function getWorkspaceInvitesAction(workspaceId: string) {
  return await workspaceService.getWorkspaceInvites(workspaceId);
}

export async function cancelWorkspaceInviteAction(inviteSeqid: string) {
  const result = await workspaceService.cancelWorkspaceInvite(inviteSeqid);
  revalidatePath('/dashboard');
  return result;
}

export async function removeWorkspaceMemberAction(workspaceId: string, userSeqid: string) {
  const result = await workspaceService.removeWorkspaceMember(workspaceId, userSeqid);
  revalidatePath('/dashboard');
  return result;
}

export async function updateWorkspaceMemberRoleAction(workspaceId: string, userSeqid: string, role: string) {
  const result = await workspaceService.updateWorkspaceMemberRole(workspaceId, userSeqid, role);
  revalidatePath('/dashboard');
  return result;
}

export async function acceptWorkspaceInviteAction(token: string) {
  const user = await userRepo.getLoggedUser();
  if (!user) throw new Error('Usuário não autenticado');
  if (await isRateLimited('127.0.0.1', user.seqid.toString(), 'ACCEPT_INVITE')) {
    throw new Error('Muitas tentativas. Por favor, tente novamente mais tarde.');
  }
  const member = await workspaceService.acceptWorkspaceInvite(token, user);
  revalidatePath('/dashboard');
  revalidatePath('/');
  return member;
}

import prisma from '@/lib/prisma';

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
  await workspaceService.rejectWorkspaceInvite(token, user);
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
