'use client';

import React, { useState, useEffect } from 'react';
import styles from './EditEventModal.module.css';
import { updateCardAction } from '@/app/actions/cardActions';

interface ManageActivityModalProps {
  card: {
    seqid: string;
    title: string;
    description?: string | null;
    taskuser_seqid?: string | null;
    dtatv?: string | null;
    previsto?: string | null;
    dtcon?: string | null;
    board_seqid: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ManageActivityModal({ card, isOpen, onClose, onSuccess }: ManageActivityModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dtatv, setDtatv] = useState('');
  const [previsto, setPrevisto] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (card) {
      setTitle(card.title || '');
      setDescription(card.description || '');
      setDtatv(card.dtatv ? card.dtatv.split('T')[0] : '');
      setPrevisto(card.previsto ? card.previsto.split('T')[0] : '');
    }
  }, [card, isOpen]);

  if (!isOpen || !card) return null;

  const currentCard = card;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await updateCardAction(
        currentCard.seqid,
        title,
        description || null,
        previsto || null,
        currentCard.dtcon || null,
        dtatv || null
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar atividade.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Gerenciar Atividade</h2>
            <p className={styles.modalSubtitle}>Atualize informações e prazos</p>
          </div>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.errorBanner}>{error}</div>}

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Título da Atividade</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={styles.input}
              placeholder="Digite o título..."
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Descrição / Detalhes</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={styles.textarea}
              placeholder="Adicione notas ou detalhes..."
              rows={3}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Data da Atividade</label>
              <input
                type="date"
                value={dtatv}
                onChange={(e) => setDtatv(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Data Prevista (Prazo)</label>
              <input
                type="date"
                value={previsto}
                onChange={(e) => setPrevisto(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" onClick={onClose} className={styles.cancelButton} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
