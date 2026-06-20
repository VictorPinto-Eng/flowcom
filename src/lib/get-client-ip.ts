import { headers } from 'next/headers';

export async function getClientIp(): Promise<string> {
  try {
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    if (forwardedFor) return forwardedFor.split(',')[0].trim();
  } catch {
    // Fallback se chamado fora de contexto de request
  }
  return '127.0.0.1';
}
