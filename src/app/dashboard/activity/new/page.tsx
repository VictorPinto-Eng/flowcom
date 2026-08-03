import { redirect } from 'next/navigation';
import { getCurrentUserAction, getUserWorkspaces } from '@/app/actions/workspaceActions';
import { getSectorsAction } from '@/app/actions/boardActions';
import NewActivityClient from './NewActivityClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ workspaceId?: string }>;
}

/**
 * Página dedicada para criar uma nova atividade (board).
 *
 * Renderiza o formulário em tela cheia — alinhado com o restante da
 * aplicação, que prefere páginas a modais para operações de criação.
 * Substitui o CreateActivityModal (mantido como legacy por compat).
 */
export default async function NewActivityPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const workspaceId = resolvedParams?.workspaceId;

  const user = await getCurrentUserAction();
  if (!user) {
    redirect('/api/auth/clear-session');
  }

  // Carrega workspaces lightweight (sem cards) para escolher o destino.
  const workspaces = await getUserWorkspaces(user.id, user.seqid?.toString(), { lightweight: true }) as any[];
  const sectors = (await getSectorsAction()) as any[];

  // Se nenhum workspaceId vier, exige que o usuário escolha via dropdown.
  return (
    <NewActivityClient
      user={user}
      workspaces={workspaces}
      sectors={sectors || []}
      workspaceId={workspaceId || null}
    />
  );
}