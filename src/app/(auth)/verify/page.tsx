'use client';

import { useEffect, useState, use } from 'react';
import { verifyEmailAction } from '@/app/actions/authActions';
import styles from '../auth.module.css';
import Link from 'next/link';

export default function VerifyPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ token?: string }> 
}) {
  const { token } = use(searchParams);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando seu token...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token de verificação ausente.');
      return;
    }

    async function verify() {
      const result = await verifyEmailAction(token!);
      if (result.success) {
        setStatus('success');
        setMessage('Sua conta foi ativada com sucesso!');
      } else {
        setStatus('error');
        setMessage(result.error || 'Erro ao verificar token.');
      }
    }

    verify();
  }, [token]);

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h1 className={styles.logo}>FLOW</h1>
        <h2 className={styles.title}>Verificação de E-mail</h2>
        
        <div className={status === 'loading' ? styles.subtitle : (status === 'success' ? styles.success : styles.error)}>
          {message}
        </div>

        <div className={styles.footer}>
          <Link href="/login" className={styles.link}>
            {status === 'success' ? 'Ir para o Login' : 'Voltar para o Login'}
          </Link>
        </div>
      </div>
    </div>
  );
}
