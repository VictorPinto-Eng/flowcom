import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
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
  const token = jwt.sign({ userId, userSeqId }, JWT_SECRET, { expiresIn: '7d' });
  
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
    return jwt.verify(token, JWT_SECRET) as { userId: string, userSeqId: string };
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
