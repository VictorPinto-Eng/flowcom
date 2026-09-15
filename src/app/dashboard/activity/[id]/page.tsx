import { redirect, notFound } from 'next/navigation';
import { getCurrentUserAction, getUserWorkspaces } from '@/app/actions/workspaceActions';
import { getCardByIdAction } from '@/app/actions/cardActions';
import ActivityDetailClient from './ActivityDetailClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Página dedicada para visualizar e editar uma atividade individual.
 *
 * Renderiza o detalhe completo de um card (atividade) com:
 * - Informações básicas (título, descrição, datas)
 * - Histórico de ações (card_act)
 * - Responsável/atribuído
 * - Opções de edição (se permissão)
 *
 * URL: /dashboard/activity/[id]
 * Exemplo: /dashboard/activity/12345
 */
export default async function ActivityDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const cardSeqid = resolvedParams?.id;

  if (!cardSeqid) {
    notFound();
  }

  const user = await getCurrentUserAction();
  if (!user) {
    redirect('/api/auth/clear-session');
  }

  // Busca a atividade (card)
  let card: any;
  try {
    card = await getCardByIdAction(cardSeqid);
  } catch (err) {
    notFound();
  }

  if (!card) {
    notFound();
  }

  // Carrega workspaces lightweight para dropdown de movimentação (se necessário)
  const workspaces = await getUserWorkspaces(user.id, user.seqid?.toString(), { lightweight: true }) as any[];

  return (
    <ActivityDetailClient
      user={user}
      userSeqid={user.seqid?.toString() || ''}
      card={card}
      workspaces={workspaces}
    />
  );
}
