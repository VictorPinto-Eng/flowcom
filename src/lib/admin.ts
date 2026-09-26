import { UserRepository } from '@/domain/repositories/UserRepository';

const userRepo = new UserRepository();

function parseAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS || '';
  return new Set(
    raw
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function isPlatformAdmin(): Promise<{ admin: boolean; email: string | null; name: string | null }> {
  try {
    const user = await userRepo.getLoggedUser();
    if (!user?.email) return { admin: false, email: null, name: null };

    const email = user.email.toLowerCase();
    const admins = parseAdminEmails();
    const admin = admins.size > 0 && admins.has(email);

    return { admin, email, name: user.name || null };
  } catch {
    return { admin: false, email: null, name: null };
  }
}

export async function requirePlatformAdmin(): Promise<string> {
  const { admin, email } = await isPlatformAdmin();
  if (!admin || !email) {
    throw new Error('Acesso restrito: apenas administradores podem ver este recurso.');
  }
  return email;
}
