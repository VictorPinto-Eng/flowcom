'use client';

import { useState, useEffect } from 'react';
import styles from './WhatsNewModal.module.css';

interface WhatsNewModalProps {
  onClose: () => void;
}

export default function WhatsNewModal({ onClose }: WhatsNewModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Aguarda animação de saída
  };

  return (
    <div className={`${styles.overlay} ${isVisible ? styles.fadeIn : styles.fadeOut}`}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>🚀 Novidades no Flow</h2>
          <button className={styles.closeBtn} onClick={handleClose}>&times;</button>
        </div>

        <div className={styles.content}>
          <div className={styles.updateSection}>
            <span className={styles.tag}>Novo</span>
            <h3>Painel de Controle Aprimorado</h3>
            <p>Gerencie suas áreas de trabalho com mais agilidade e um design mais limpo e premium.</p>
          </div>

          <div className={styles.updateSection}>
            <span className={styles.tag}>Melhoria</span>
            <h3>Kanban e Atividades</h3>
            <p>Os fluxos de trabalho foram otimizados para garantir que você tenha acesso rápido ao seu Kanban e às suas atividades pendentes.</p>
          </div>

          <div className={styles.updateSection}>
            <span className={styles.tag}>Correção</span>
            <h3>Navegação fluida</h3>
            <p>Corrigimos problemas na navegação entre as áreas de trabalho, garantindo que tudo carregue corretamente conforme esperado.</p>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.btnPrimary} onClick={handleClose}>Entendi, vamos lá!</button>
        </div>
      </div>
    </div>
  );
}
