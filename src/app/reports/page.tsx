import { getAllCardsReportAction } from '../actions/cardActions';
import ReportsView from '@/components/ReportsView';
import { Metadata } from 'next';
import { getCurrentUserAction } from '../actions/workspaceActions';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Dashboard Geral de Atividades | Flowcom',
  description: 'Relatório estratégico de produtividade e acompanhamento de tarefas.',
};

export default async function ReportsPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ workspaceId?: string }> 
}) {
  const user = await getCurrentUserAction();
  if (!user) {
    redirect('/login');
  }

  const { workspaceId } = await searchParams;
  const cards = await getAllCardsReportAction(workspaceId);
  
  let workspaceName = '';
  if (workspaceId && cards.length > 0) {
    workspaceName = cards[0].workspaceName;
  }

  return (
    <main>
      <ReportsView 
        initialCards={cards} 
        isGlobal={!workspaceId} 
        workspaceName={workspaceName}
        workspaceId={workspaceId}
      />
    </main>
  );
}
