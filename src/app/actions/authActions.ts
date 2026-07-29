'use server';

import { AuthRateLimitError, AuthService } from '@/domain/services/AuthService';
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
  redirect('/');
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
  const ip = await getClientIp();

  try {
    await authService.forgotPassword(email, ip);
    return { success: true };
  } catch (error: any) {
    if (error instanceof AuthRateLimitError) {
      return { success: false, error: error.message };
    }

    console.error('Forgot password action failed:', {
      operation: 'forgot_password_action',
      ip,
      error,
    });
    return { success: true };
  }
}

export async function resetPasswordAction(token: string, formData: FormData) {
  const passwordValue = formData.get('password');
  const confirmValue = formData.get('confirm');
  const password = typeof passwordValue === 'string' ? passwordValue : '';
  const confirm = typeof confirmValue === 'string' ? confirmValue : '';
  const ip = await getClientIp();

  try {
    if (confirm && password !== confirm) {
      return { success: false, error: 'As senhas não coincidem.' };
    }

    await authService.resetPassword(token, password, ip);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro ao redefinir senha.';
    console.error('Reset password action failed:', {
      operation: 'reset_password_action',
      ip,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage,
    });
    return { success: false, error: errorMessage };
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
