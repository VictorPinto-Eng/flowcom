'use client';

import { useState, useRef } from 'react';
import { loginAction, resendActivationAction } from '@/app/actions/authActions';
import styles from '../auth.module.css';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  
  const passwordRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResendSuccess(false);

    const formData = new FormData(e.currentTarget);
    const result = await loginAction(formData);

    if (result.success) {
      const searchParams = new URLSearchParams(window.location.search);
      const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
      router.push(callbackUrl);
      router.refresh();
    } else {
      setError(result.error || 'Erro ao fazer login.');
      setLoading(false);
    }
  }

  async function handleResendActivation() {
    if (!email) return;
    setResendLoading(true);
    const result = await resendActivationAction(email);
    if (result.success) {
      setResendSuccess(true);
      setError(null);
    } else {
      setError(result.error || 'Erro ao reenviar e-mail.');
    }
    setResendLoading(false);
  }

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      passwordRef.current?.focus();
    }
  };

  const isInactiveError = error?.toLowerCase().includes('ativada');

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h1 className={styles.logo}>FLOW</h1>
        <h2 className={styles.title}>Bem-vindo de volta</h2>
        <p className={styles.subtitle}>Acesse sua conta para gerenciar suas atividades</p>

        {error && (
          <div className={styles.error}>
            {error}
            {isInactiveError && !resendSuccess && (
              <button 
                onClick={handleResendActivation} 
                className={styles.link}
                style={{ display: 'block', margin: '0.5rem auto 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                disabled={resendLoading}
              >
                {resendLoading ? 'Enviando...' : 'Reenviar e-mail de ativação'}
              </button>
            )}
          </div>
        )}

        {resendSuccess && (
          <div className={styles.success}>
            E-mail de ativação reenviado com sucesso! Verifique sua caixa de entrada.
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
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
              onKeyDown={handleEmailKeyDown}
              autoFocus
              required 
            />
          </div>

          <div className={styles.inputGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="password">Senha</label>
              <Link href="/forgot-password" className={styles.link} style={{ fontSize: '0.8rem' }}>
                Esqueceu a senha?
              </Link>
            </div>
            <div className={styles.passwordInputWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                ref={passwordRef}
                className={`${styles.input} ${styles.passwordInput}`}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Acessando...' : 'Entrar'}
          </button>
        </form>

        <div className={styles.footer}>
          Ainda não tem uma conta? <Link href="/register" className={styles.link}>Cadastre-se</Link>
        </div>
      </div>
    </div>
  );
}
