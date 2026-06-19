'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { registerAction, resendActivationAction } from '@/app/actions/authActions';
import styles from '../auth.module.css';
import Link from 'next/link';

function RegisterPage() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const requirements = useMemo(() => [
    { label: 'Mínimo 8 caracteres', met: password.length >= 8 },
    { label: 'Uma letra maiúscula', met: /[A-Z]/.test(password) },
    { label: 'Uma letra minúscula', met: /[a-z]/.test(password) },
    { label: 'Um número', met: /\d/.test(password) },
    { label: 'Um caractere especial', met: /\W/.test(password) },
  ], [password]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResendSuccess(false);

    if (email !== confirmEmail) {
      setError('Os e-mails informados não coincidem.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas informadas não coincidem.');
      setLoading(false);
      return;
    }

    const isAllMet = requirements.every(r => r.met);
    if (!isAllMet) {
      setError('A senha não atende a todos os requisitos.');
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const result = await registerAction(formData);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'Erro ao criar conta.');
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <h1 className={styles.logo}>FLOW</h1>
          <h2 className={styles.title}>Conta criada!</h2>
          <div className={styles.success}>
            Enviamos um e-mail de ativação para você ({email}). Por favor, verifique sua caixa de entrada para confirmar seu acesso.
          </div>

          {resendSuccess ? (
            <div className={styles.success} style={{ marginTop: '1rem', border: '1px solid #10b981', color: '#10b981', background: 'rgba(16,185,129,0.05)' }}>
              E-mail de ativação reenviado com sucesso!
            </div>
          ) : (
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>Não recebeu o e-mail?</p>
              <button 
                onClick={async () => {
                  setResendLoading(true);
                  setError(null);
                  const res = await resendActivationAction(email);
                  if (res.success) {
                    setResendSuccess(true);
                  } else {
                    setError(res.error || 'Erro ao reenviar e-mail.');
                  }
                  setResendLoading(false);
                }} 
                className={styles.link}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}
                disabled={resendLoading}
              >
                {resendLoading ? 'Reenviando...' : 'Reenviar e-mail de ativação'}
              </button>
            </div>
          )}

          {error && <div className={styles.error} style={{ marginTop: '1rem' }}>{error}</div>}

          <div className={styles.footer} style={{ marginTop: '2rem' }}>
            <Link href="/login" className={styles.link}>Voltar para o Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h1 className={styles.logo}>FLOW</h1>
        <h2 className={styles.title}>Crie sua conta</h2>
        <p className={styles.subtitle}>Junte-se ao Flow e organize sua produtividade</p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="name">Nome Completo</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              className={styles.input} 
              placeholder="Seu Nome" 
              required 
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="email">E-mail</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              className={styles.input} 
              placeholder="seu@email.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="confirmEmail">Confirmar E-mail</label>
            <input 
              type="email" 
              id="confirmEmail" 
              name="confirmEmail" 
              className={styles.input} 
              placeholder="seu@email.com" 
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              required 
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Senha</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              className={styles.input} 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="confirmPassword">Confirmar Senha</label>
            <input 
              type="password" 
              id="confirmPassword" 
              name="confirmPassword" 
              className={styles.input} 
              placeholder="••••••••" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required 
            />
            
            <div className={styles.requirements}>
              {requirements.map((req, i) => (
                <div key={i} className={`${styles.requirementItem} ${req.met ? styles.met : ''}`}>
                  <div className={styles.requirementDot} />
                  {req.label}
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Criando conta...' : 'Cadastrar'}
          </button>
        </form>

        <div className={styles.footer}>
          Já tem uma conta? <Link href="/login" className={styles.link}>Faça Login</Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPageWrapper() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: '#a78bfa' }}>
        Carregando formulário...
      </div>
    }>
      <RegisterPage />
    </Suspense>
  );
}
