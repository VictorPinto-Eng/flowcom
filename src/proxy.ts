import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'flowcom_session';

function isValidSession(token: string): boolean {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return false;
    jwt.verify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;

  // Rotas que não precisam de autenticação
  const publicRoutes = ['/login', '/register', '/verify', '/api/auth', '/forgot-password', '/reset-password'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  const hasValidSession = token ? isValidSession(token) : false;

  // Sem sessão válida em rota protegida → redireciona para login
  if (!hasValidSession && !isPublicRoute && pathname !== '/') {
    const response = NextResponse.redirect(new URL('/login', request.url));
    // Limpar cookie inválido/expirado se existir
    if (token) {
      response.cookies.delete(COOKIE_NAME);
    }
    return response;
  }

  // Com sessão válida em rota pública → redireciona para dashboard
  if (hasValidSession && isPublicRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};
