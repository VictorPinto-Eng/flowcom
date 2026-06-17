'use server';

import { WorkspaceService } from '@/domain/services/WorkspaceService';
import { UserRepository } from '@/domain/repositories/UserRepository';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';

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
  const session = await getSession();
  if (!session) return null;
  
  const user = await userRepo.findBySeqId(BigInt(session.userSeqId));
  if (!user) return null;
  
  return {
    ...user,
    seqid: user.seqid.toString()
  };
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
  const member = await workspaceService.acceptWorkspaceInvite(token, user);
  revalidatePath('/dashboard');
  revalidatePath('/');
  return member;
}
