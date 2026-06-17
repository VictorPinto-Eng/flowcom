'use client';

import { useState, useMemo } from 'react';
import { registerAction } from '@/app/actions/authActions';
import styles from '../auth.module.css';
import Link from 'next/link';

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');

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
          <h1 className={styles.logo}>FLOW<span>COM</span></h1>
          <h2 className={styles.title}>Conta criada!</h2>
          <div className={styles.success}>
            Enviamos um e-mail de ativação para você. Por favor, verifique sua caixa de entrada para confirmar seu acesso.
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
        <h2 className={styles.title}>Crie sua conta</h2>
        <p className={styles.subtitle}>Junte-se ao Flowcom e organize sua produtividade</p>

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
