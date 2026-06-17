'use client';

import { useState } from 'react';
import { forgotPasswordAction } from '@/app/actions/authActions';
import styles from '../auth.module.css';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await forgotPasswordAction(formData);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'Erro ao processar solicitação.');
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <h1 className={styles.logo}>FLOW<span>COM</span></h1>
          <h2 className={styles.title}>E-mail enviado!</h2>
          <div className={styles.success}>
            Se o e-mail informado estiver cadastrado, você receberá instruções para redefinir sua senha em instantes.
          </div>
          <div className={styles.footer}>
            <Link href="/login" className={styles.link}>Voltar para o Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h1 className={styles.logo}>FLOW<span>COM</span></h1>
        <h2 className={styles.title}>Recuperar Senha</h2>
        <p className={styles.subtitle}>Informe seu e-mail para receber o link de recuperação</p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Seu E-mail</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              className={styles.input} 
              placeholder="seu@email.com" 
              required 
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Processando...' : 'Enviar Link de Recuperação'}
          </button>
        </form>

        <div className={styles.footer}>
          Lembrou a senha? <Link href="/login" className={styles.link}>Voltar para o Login</Link>
        </div>
      </div>
    </div>
  );
}
