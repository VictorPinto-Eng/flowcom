'use server';

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/domain/services/AuthService';

const authService = new AuthService();

const KNOWN_ERRORS = [
  'Muitas tentativas',
  'Este e-mail já está em uso',
  'A senha não atende aos requisitos',
];

function getSafeErrorMessage(error: any): string {
  const msg = error?.message || '';
  if (KNOWN_ERRORS.some(known => msg.startsWith(known))) {
    return msg;
  }
  console.error('Register unexpected error:', error);
  return 'Erro interno. Tente novamente mais tarde.';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nome, e-mail e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    await authService.register({ name, email, password }, ip);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 400 }
    );
  }
}