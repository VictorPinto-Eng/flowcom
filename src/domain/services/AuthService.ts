import prisma from '@/lib/prisma';
import { hashPassword, comparePassword, createSession, validatePassword } from '@/lib/auth';
import { sendActivationEmail, sendPasswordResetEmail } from '@/lib/resend';
import { isRateLimited } from '@/lib/rate-limit';
import crypto from 'crypto';

export class AuthService {
async register(data: { name: string, email: string, password: string }, ip: string = '127.0.0.1') {
  // Verifica rate limiting
  if (await isRateLimited(ip, data.email, 'REGISTER')) {
    throw new Error('Muitas tentativas. Por favor, tente novamente mais tarde.');
  }
  
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email }
  });

  if (existingUser) {
    throw new Error('Este e-mail já está em uso.');
  }

  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.isValid) {
    throw new Error(`A senha não atende aos requisitos: ${passwordValidation.errors.join(', ')}`);
  }

  const hashedPassword = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      active: false, // Requer ativação
    }
  });

  // Gerar token de ativação
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  await prisma.verificationToken.create({
    data: {
      email: data.email,
      token,
      expires,
      type: 'ACTIVATION'
    }
  });

  // Enviar e-mail (Não bloqueia o registro se falhar, mas logamos)
  try {
    await sendActivationEmail(data.email, data.name, token);
  } catch (err) {
    console.error('Falha ao enviar e-mail de ativação:', err);
  }

  return { id: user.seqid.toString(), email: user.email };
}

  async resendActivationEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || user.active) {
      // Por segurança, se o usuário já estiver ativo ou não existir, retornamos sucesso genérico
      return { success: true };
    }

    // Deletar tokens antigos de ativação para este e-mail
    await prisma.verificationToken.deleteMany({
      where: { email, type: 'ACTIVATION' }
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await prisma.verificationToken.create({
      data: {
        email,
        token,
        expires,
        type: 'ACTIVATION'
      }
    });

    await sendActivationEmail(email, user.name, token);
    return { success: true };
  }

async login(data: { email: string, password: string }, ip: string = '127.0.0.1') {
  // Verifica rate limiting
  if (await isRateLimited(ip, data.email, 'LOGIN')) {
    throw new Error('Muitas tentativas. Por favor, tente novamente mais tarde.');
  }
  
  const user = await prisma.user.findUnique({
    where: { email: data.email }
  });

  if (!user || !user.password) {
    throw new Error('E-mail ou senha inválidos.');
  }

  if (!user.active) {
    throw new Error('Sua conta ainda não foi ativada. Verifique seu e-mail.');
  }

  const isPasswordValid = await comparePassword(data.password, user.password);
  if (!isPasswordValid) {
    throw new Error('E-mail ou senha inválidos.');
  }

  await createSession(user.seqid.toString(), user.seqid.toString());

  return { id: user.seqid.toString(), name: user.name, email: user.email };
}

  async verifyEmail(token: string) {
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token, type: 'ACTIVATION' }
    });

    if (!verificationToken || verificationToken.expires < new Date()) {
      throw new Error('Token inválido ou expirado.');
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { email: verificationToken.email },
        data: { active: true }
      }),
      prisma.verificationToken.delete({
        where: { token }
      })
    ]);

    return { success: true };
  }

async forgotPassword(email: string, ip: string = '127.0.0.1') {
  // Verifica rate limiting
  if (await isRateLimited(ip, email, 'FORGOT_PASSWORD')) {
    throw new Error('Muitas tentativas. Por favor, tente novamente mais tarde.');
  }
  
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) return { success: true };

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h

  await prisma.verificationToken.create({
    data: { email, token, expires, type: 'PASSWORD_RESET' }
  });

  await sendPasswordResetEmail(email, user.name, token);
  return { success: true };
}

async resetPassword(token: string, password: string, ip: string = '127.0.0.1') {
  // Rate limiting por IP antes de qualquer consulta ao DB (anti-enumeration)
  if (await isRateLimited(ip, null, 'RESET_PASSWORD')) {
    throw new Error('Muitas tentativas. Por favor, tente novamente mais tarde.');
  }
  
  const verificationToken = await prisma.verificationToken.findFirst({
    where: { token, type: 'PASSWORD_RESET' }
  });
  
  if (!verificationToken || verificationToken.expires < new Date()) {
    throw new Error('Token inválido ou expirado.');
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    throw new Error(`A senha não atende aos requisitos: ${passwordValidation.errors.join(', ')}`);
  }

  const hashedPassword = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { email: verificationToken.email },
      data: { password: hashedPassword }
    }),
    prisma.verificationToken.delete({
      where: { id: verificationToken.id }
    })
  ]);

  return { success: true };
}
}
