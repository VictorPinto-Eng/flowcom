'use server';

import { AuthService } from '@/domain/services/AuthService';
import { deleteSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const authService = new AuthService();

export async function registerAction(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    await authService.register({ name, email, password });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    await authService.login({ email, password });
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
    await authService.verifyEmail(token);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function forgotPasswordAction(formData: FormData) {
  const email = formData.get('email') as string;
  try {
    await authService.forgotPassword(email);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function resetPasswordAction(token: string, formData: FormData) {
  const password = formData.get('password') as string;
  try {
    await authService.resetPassword(token, password);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function resendActivationAction(email: string) {
  try {
    await authService.resendActivationEmail(email);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
