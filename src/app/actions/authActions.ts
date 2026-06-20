'use server';

import { AuthService } from '@/domain/services/AuthService';
import { isRateLimited } from '@/lib/rate-limit';
import { deleteSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

const authService = new AuthService();

async function getClientIp() {
  try {
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }
  } catch (e) {
    // Fallback se chamado fora de contexto de request
  }
  return '127.0.0.1';
}

export async function registerAction(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    const ip = await getClientIp();
    await authService.register({ name, email, password }, ip);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    const ip = await getClientIp();
    await authService.login({ email, password }, ip);
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function logoutAction() {
  await deleteSession();
  redirect('/login');
}

export async function verifyEmailAction(token: string) {
  try {
    const ip = await getClientIp();
    if (await isRateLimited(ip, null, 'VERIFY_EMAIL')) {
      return { success: false, error: 'Muitas tentativas. Por favor, tente novamente mais tarde.' };
    }
    await authService.verifyEmail(token);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function forgotPasswordAction(formData: FormData) {
  const email = formData.get('email') as string;
  try {
    const ip = await getClientIp();
    await authService.forgotPassword(email, ip);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function resetPasswordAction(token: string, formData: FormData) {
  const password = formData.get('password') as string;
  try {
    const ip = await getClientIp();
    await authService.resetPassword(token, password, ip);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function resendActivationAction(email: string) {
  try {
    const ip = await getClientIp();
    if (await isRateLimited(ip, email, 'RESEND_ACTIVATION')) {
      return { success: false, error: 'Muitas tentativas. Por favor, tente novamente mais tarde.' };
    }
    await authService.resendActivationEmail(email);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
