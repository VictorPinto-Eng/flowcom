'use client';

import { useState, use, useMemo } from 'react';
import { resetPasswordAction } from '@/app/actions/authActions';
import styles from '../auth.module.css';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ token?: string }> 
}) {
  const { token } = use(searchParams);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const router = useRouter();

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

    const isAllMet = requirements.every(r => r.met);
    if (!isAllMet) {
      setError('A senha não atende a todos os requisitos.');
      setLoading(false);
      return;
    }

    if (password !== confirm) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const result = await resetPasswordAction(token!, formData);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'Erro ao redefinir senha.');
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

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="password">Nova Senha</label>
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

            <div className={styles.requirements}>
              {requirements.map((req, i) => (
                <div key={i} className={`${styles.requirementItem} ${req.met ? styles.met : ''}`}>
                  <div className={styles.requirementDot} />
                  {req.label}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="confirm">Confirmar Nova Senha</label>
            <input 
              type="password" 
              id="confirm" 
              name="confirm" 
              className={styles.input} 
              placeholder="••••••••" 
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required 
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Alterando...' : 'Redefinir Senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
