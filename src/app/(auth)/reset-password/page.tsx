'use client';

import { useState, use, useMemo } from 'react';
import { resetPasswordAction } from '@/app/actions/authActions';
import styles from '../auth.module.css';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ token?: string }> 
}) {
  const { token } = use(searchParams);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<'password' | 'confirm' | 'form' | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const requirements = useMemo(() => [
    { label: 'Mínimo 8 caracteres', met: password.length >= 8 },
    { label: 'Uma letra maiúscula', met: /[A-Z]/.test(password) },
    { label: 'Uma letra minúscula', met: /[a-z]/.test(password) },
    { label: 'Um número', met: /\d/.test(password) },
    { label: 'Um caractere especial', met: /\W/.test(password) },
  ], [password]);

  if (!token) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <h1 className={styles.logo}>FLOW<span>COM</span></h1>
          <h2 className={styles.title}>Erro</h2>
          <div className={styles.error}>Token de recuperação inválido ou ausente.</div>
          <div className={styles.footer}>
            <Link href="/forgot-password" className={styles.link}>Solicitar Novo Link</Link>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrorField(null);

    const isAllMet = requirements.every(r => r.met);
    if (!isAllMet) {
      setError('A senha não atende a todos os requisitos.');
      setErrorField('password');
      setLoading(false);
      return;
    }

    if (password !== confirm) {
      setError('As senhas não coincidem.');
      setErrorField('confirm');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData(e.currentTarget);
      const result = await resetPasswordAction(token!, formData);

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || 'Erro ao redefinir senha.');
        setErrorField(result.error === 'As senhas não coincidem.' ? 'confirm' : 'form');
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <h1 className={styles.logo}>FLOW<span>COM</span></h1>
          <h2 className={styles.title}>Senha alterada!</h2>
          <div className={styles.success}>Sua senha foi redefinida com sucesso. Agora você pode fazer login.</div>
          <div className={styles.footer}>
            <Link href="/login" className={styles.link}>Ir para o Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h1 className={styles.logo}>FLOW<span>COM</span></h1>
        <h2 className={styles.title}>Nova Senha</h2>
        <p className={styles.subtitle}>Crie uma nova senha segura para sua conta</p>

        {error && <div id="reset-error" className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="password">Nova Senha</label>
            <div className={styles.passwordInputWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                className={`${styles.input} ${styles.passwordInput}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={errorField === 'password'}
                aria-describedby={error && (errorField === 'password' || errorField === 'form') ? 'reset-error' : undefined}
                required
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                aria-controls="password"
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={18} aria-hidden="true" focusable="false" /> : <Eye size={18} aria-hidden="true" focusable="false" />}
              </button>
            </div>

            <div className={styles.requirements} role="list" aria-live="polite">
              {requirements.map((req, i) => (
                <div key={i} role="listitem" className={`${styles.requirementItem} ${req.met ? styles.met : ''}`} aria-label={`${req.label}: ${req.met ? 'atendido' : 'pendente'}`}>
                  <div className={styles.requirementDot} />
                  {req.label}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="confirm">Confirmar Nova Senha</label>
            <div className={styles.passwordInputWrapper}>
              <input
                type={showConfirm ? 'text' : 'password'}
                id="confirm"
                name="confirm"
                className={`${styles.input} ${styles.passwordInput}`}
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                aria-invalid={errorField === 'confirm'}
                aria-describedby={error && (errorField === 'confirm' || errorField === 'form') ? 'reset-error' : undefined}
                required
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowConfirm((current) => !current)}
                aria-label={showConfirm ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                aria-controls="confirm"
                aria-pressed={showConfirm}
              >
                {showConfirm ? <EyeOff size={18} aria-hidden="true" focusable="false" /> : <Eye size={18} aria-hidden="true" focusable="false" />}
              </button>
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Alterando...' : 'Redefinir Senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
