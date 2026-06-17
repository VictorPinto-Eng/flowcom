import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_dev_mode');

export async function sendActivationEmail(email: string, name: string, token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const activationLink = `${appUrl}/verify?token=${token}`;

  try {
    const data = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Flowcom <onboarding@resend.dev>',
      to: email,
      subject: 'Ative sua conta no Flowcom',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #0a0a0c; color: #fff;">
          <h1 style="color: #7c3aed; text-align: center;">Bem-vindo ao Flowcom!</h1>
          <p style="color: #ccc; font-size: 16px;">Olá, <strong>${name}</strong>!</p>
          <p style="color: #ccc; font-size: 16px;">Sua conta foi criada com sucesso. Para começar a organizar suas atividades, clique no botão abaixo para ativar seu acesso:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${activationLink}" style="background-color: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Ativar Minha Conta</a>
          </div>
          <p style="color: #888; font-size: 14px;">Se o botão não funcionar, copie o link abaixo:</p>
          <p style="color: #7c3aed; font-size: 13px; word-break: break-all;">${activationLink}</p>
          <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666; text-align: center;">Este é um e-mail automático do sistema Flowcom. Por favor, não responda.</p>
        </div>
      `,
    });

    return { success: true, data };
  } catch (error) {
    console.error('Error sending activation email:', error);
    return { success: false, error };
  }
}

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetLink = `${appUrl}/reset-password?token=${token}`;

  try {
    const data = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Flowcom <security@resend.dev>',
      to: email,
      subject: 'Recuperação de Senha - Flowcom',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #0a0a0c; color: #fff;">
          <h1 style="color: #7c3aed; text-align: center;">Recuperação de Senha</h1>
          <p style="color: #ccc; font-size: 16px;">Olá, <strong>${name}</strong>!</p>
          <p style="color: #ccc; font-size: 16px;">Recebemos uma solicitação para redefinir a senha da sua conta Flowcom.</p>
          <p style="color: #ccc; font-size: 16px;">Clique no botão abaixo para criar uma nova senha. Este link expira em 1 hora.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Redefinir Minha Senha</a>
          </div>
          <p style="color: #888; font-size: 14px;">Se você não solicitou isso, pode ignorar este e-mail com segurança.</p>
          <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666; text-align: center;">Flowcom Security</p>
        </div>
      `,
    });

    return { success: true, data };
  } catch (error) {
    console.error('Error sending reset email:', error);
    return { success: false, error };
  }
}
