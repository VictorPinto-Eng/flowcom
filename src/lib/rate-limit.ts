import prisma from '@/lib/prisma';

export const RATE_LIMIT_CONFIG = {
  LOGIN: { limit: 5, window: 15 * 60 * 1000 },
  REGISTER: { limit: 3, window: 60 * 60 * 1000 },
  FORGOT_PASSWORD: { limit: 2, window: 60 * 60 * 1000 },
  RESET_PASSWORD: { limit: 3, window: 60 * 60 * 1000 },
  VERIFY_EMAIL: { limit: 5, window: 15 * 60 * 1000 },
  RESEND_ACTIVATION: { limit: 3, window: 60 * 60 * 1000 },
  ACCEPT_INVITE: { limit: 10, window: 15 * 60 * 1000 },
  REQUEST_TRANSFER: { limit: 10, window: 15 * 60 * 1000 },
  RESPOND_TRANSFER: { limit: 10, window: 15 * 60 * 1000 },
} as const;

export type RateLimitType = keyof typeof RATE_LIMIT_CONFIG;

export async function isRateLimited(ip: string, identifier: string | undefined | null, type: RateLimitType): Promise<boolean> {
  const config = RATE_LIMIT_CONFIG[type];
  if (!config) return false;

  const authAttempt = await prisma.authAttempt.findFirst({
    where: {
      ip,
      email: identifier || undefined,
      type,
    },
  });

  if (!authAttempt) {
    await prisma.authAttempt.create({
      data: {
        ip,
        email: identifier || undefined,
        type,
        count: 1,
        lastAttempt: new Date(),
      },
    });
    return false;
  }

  if (Date.now() - authAttempt.lastAttempt.getTime() > config.window) {
    await prisma.authAttempt.update({
      where: { id: authAttempt.id },
      data: {
        count: 1,
        lastAttempt: new Date(),
      },
    });
    return false;
  }

  if (authAttempt.count >= config.limit) {
    return true;
  }

  await prisma.authAttempt.update({
    where: { id: authAttempt.id },
    data: {
      count: authAttempt.count + 1,
      lastAttempt: new Date(),
    },
  });

  return false;
}
