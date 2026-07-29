import { acceptWorkspaceInviteAction, getCurrentUserAction } from '@/app/actions/workspaceActions';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function AcceptInvitePage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const token = resolvedParams?.token;

  if (!token) {
    redirect('/dashboard?error=invite-failed');
  }

  const user = await getCurrentUserAction();
  if (!user) {
    // Redirect to login, preserving the callbackUrl to return here after logging in
    redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/accept?token=${token}`)}`);
  }

  try {
    await acceptWorkspaceInviteAction(token);
  } catch (error) {
    console.error('Erro ao aceitar convite pelo link:', error);
    redirect('/dashboard?error=invite-failed');
  }

  redirect('/dashboard?success=invite-accepted');
}
