'use server';

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/domain/services/AuthService';

const authService = new AuthService();

const KNOWN_ERRORS = [
  'Muitas tentativas',
  'Token inválido ou expirado',
  'A senha não atende aos requisitos',
];

function getSafeErrorMessage(error: any): string {
  const msg = error?.message || '';
  if (KNOWN_ERRORS.some(known => msg.startsWith(known))) {
    return msg;
  }
  console.error('Reset-password unexpected error:', error);
  return 'Erro interno. Tente novamente mais tarde.';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    await authService.resetPassword(token, password, ip);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 400 }
    );
  }
}