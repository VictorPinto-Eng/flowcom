/**
 * Tipos compartilhados para o sistema de permissões de workspace.
 * Substitui o uso de string livre 'currentUserRole' e 'as any',
 * fornecendo uma única fonte de verdade para o papel do usuário
 * em um workspace.
 *
 * Veja: ROADMAP.md A-002 e A-004.
 */

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export const WorkspaceRole = {
  OWNER: 'OWNER' as const,
  ADMIN: 'ADMIN' as const,
  MEMBER: 'MEMBER' as const,
  VIEWER: 'VIEWER' as const
} as const;

/**
 * Coerce qualquer valor (string do backend, prop, undefined) para
 * um WorkspaceRole válido. Usado na borda do hook para tolerar
 * payloads inconsistentes sem quebrar a UI.
 */
export function normalizeRole(value: unknown): WorkspaceRole {
  const v = String(value ?? '').toUpperCase();
  if (v === 'OWNER') return 'OWNER';
  if (v === 'ADMIN') return 'ADMIN';
  if (v === 'VIEWER') return 'VIEWER';
  return 'MEMBER';
}

export interface WorkspacePermissions {
  /** Papel normalizado. */
  role: WorkspaceRole;

  /** True quando o usuário é OWNER do workspace. */
  isOwner: boolean;

  /** True quando o usuário é ADMIN do workspace. */
  isAdmin: boolean;

  /** True para OWNER ou ADMIN. Atalho para os casos mais comuns. */
  isAdminOrOwner: boolean;

  /** True para MEMBER (papel padrão de quem entrou via convite). */
  isMember: boolean;

  /** True para VIEWER (somente leitura). */
  isViewer: boolean;

  /** True se o papel permite criar boards, colunas e cards. */
  canEditBoard: boolean;

  /** True se o papel permite excluir/encerrar boards. */
  canDeleteBoard: boolean;

  /** True se o papel permite gerenciar membros e convites. */
  canManageMembers: boolean;

  /** True se pode ver o conteúdo do workspace. */
  canView: boolean;
}
