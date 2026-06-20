import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

const COOKIE_NAME = 'flowcom_session';

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

export function validatePassword(password: string) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasNonalphas = /\W/.test(password);

  const errors = [];
  if (password.length < minLength) errors.push('Mínimo 8 caracteres');
  if (!hasUpperCase) errors.push('Uma letra maiúscula');
  if (!hasLowerCase) errors.push('Uma letra minúscula');
  if (!hasNumbers) errors.push('Um número');
  if (!hasNonalphas) errors.push('Um caractere especial');

  return {
    isValid: errors.length === 0,
    errors
  };
}

export async function comparePassword(password: string, hash: string) {
  return await bcrypt.compare(password, hash);
}

export async function createSession(userId: string, userSeqId: string) {
  const token = jwt.sign({ userId, userSeqId }, getJwtSecret(), { expiresIn: '7d' });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.session.create({
    data: {
      userSeqid: BigInt(userSeqId),
      token,
      expiresAt
    }
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 1 week
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const payload = jwt.verify(token, getJwtSecret()) as { userId: string, userSeqId: string };

    // Verify session exists in DB (supports revocation)
    const session = await prisma.session.findUnique({ where: { token } });
    if (!session) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
  }

  cookieStore.delete(COOKIE_NAME);
}

/**
 * Revoke all sessions for a user (e.g., after password reset).
 */
export async function revokeAllSessions(userSeqid: bigint) {
  await prisma.session.deleteMany({ where: { userSeqid } });
}

/**
 * Cleanup expired sessions (can be called periodically).
 */
export async function cleanupExpiredSessions() {
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
