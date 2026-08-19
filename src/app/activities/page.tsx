import { getCurrentUserAction, getUserWorkspaces } from '@/app/actions/workspaceActions';
import ActivitiesPageClient from '@/components/views/ActivitiesPageClient';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Minhas Atividades | Flow',
  description: 'Gerenciamento e acompanhamento das suas atividades em andamento.',
};

export default async function ActivitiesPage() {
  const user = await getCurrentUserAction();
  if (!user) {
    redirect('/login');
  }

  const workspaces = await getUserWorkspaces(user.id, user.seqid?.toString());
  const currentUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image || undefined
  };
  const userSeqid = user.seqid?.toString() || '';

  return (
    <ActivitiesPageClient
      workspaces={workspaces}
      currentUser={currentUser}
      userSeqid={userSeqid}
    />
  );
}