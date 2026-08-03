'use client';

import { useMemo } from 'react';
import { normalizeRole, WorkspacePermissions, WorkspaceRole } from '@/types/permissions';

/**
 * Hook centralizado para verificação de permissões de workspace.
 *
 * Substitui filtros duplicados do tipo:
 *   `(activeWorkspace as any)?.currentUserRole === 'OWNER' || ... === 'ADMIN'`
 *
 * por uma única fonte de verdade: helpers semânticos
 * (`isOwner`, `canEditBoard`, etc.).
 *
 * @example
 *   const perms = useWorkspacePermissions(activeWorkspace);
 *   if (perms.isAdminOrOwner) { ... }
 */
export function useWorkspacePermissions(
  workspace?: unknown,
  /** Papel explícito opcional. Tem prioridade sobre workspace.currentUserRole. */
  overrideRole?: string | null
): WorkspacePermissions {
  return useMemo(() => {
    const rawRole = overrideRole !== undefined
      ? overrideRole
      : (workspace as { currentUserRole?: string | null } | null | undefined)?.currentUserRole;
    const role: WorkspaceRole = normalizeRole(rawRole);

    const isOwner = role === 'OWNER';
    const isAdmin = role === 'ADMIN';
    const isAdminOrOwner = isOwner || isAdmin;
    const isMember = role === 'MEMBER';
    const isViewer = role === 'VIEWER';

    return {
      role,
      isOwner,
      isAdmin,
      isAdminOrOwner,
      isMember,
      isViewer,
      // Edição: apenas OWNER/ADMIN podem alterar estrutura.
      canEditBoard: isAdminOrOwner,
      // Exclusão/encerramento: apenas OWNER.
      canDeleteBoard: isOwner,
      // Gestão de membros: OWNER pode tudo; ADMIN pode gerenciar MEMBER/VIEWER.
      canManageMembers: isAdminOrOwner,
      // VIEWER tem acesso apenas para leitura. Por padrão, todos podem ver.
      canView: true
    };
  }, [(workspace as { currentUserRole?: string | null } | null | undefined)?.currentUserRole, overrideRole]);
}
