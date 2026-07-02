'use client';

import React, { useState } from 'react';
import styles from '../kanban/Board.module.css';

interface CreateEventFormProps {
  onSubmit: (title: string, description: string, dtatv: string, previsto?: string) => void;
  onCancel: () => void;
}

export default function CreateEventForm({ onSubmit, onCancel }: CreateEventFormProps) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [dtatv, setDtatv] = useState(() => new Date().toISOString().split('T')[0]);
  const [previsto, setPrevisto] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(title.trim(), desc.trim(), dtatv, previsto || undefined);
    setTitle('');
    setDesc('');
    setDtatv(new Date().toISOString().split('T')[0]);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setPrevisto(tomorrow.toISOString().split('T')[0]);
    onCancel();
  };

  return (
    <div className={styles.formCard}>
      <div className={styles.formCardHeader}>
        <div className={styles.formCardIcon}>+</div>
        <div>
          <h3 className={styles.formCardTitle}>Novo Evento</h3>
          <p className={styles.formCardSubtitle}>Preencha os dados do evento para registrá-lo na atividade</p>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Nome do Evento *</label>
            <input
              type="text"
              placeholder="Ex: Reunião de alinhamento, Protocolo de documentos..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  (document.querySelector('textarea[name="eventDesc"]') as HTMLElement)?.focus();
                }
              }}
              autoFocus
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Descrição / Observações</label>
            <textarea
              name="eventDesc"
              placeholder="Detalhes adicionais ou link do documento..."
              value={desc}
              onChange={e => setDesc(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  (document.querySelector('input[name="eventDtatv"]') as HTMLElement)?.focus();
                }
              }}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Data Prevista</label>
            <input
              type="date"
              max="9999-12-31"
              name="eventDtatv"
              value={dtatv}
              onChange={e => {
                const val = e.target.value;
                setDtatv(val);
                if (val) {
                  const nextDay = new Date(val + 'T00:00:00');
                  nextDay.setDate(nextDay.getDate() + 1);
                  const yyyy = nextDay.getFullYear();
                  const mm = String(nextDay.getMonth() + 1).padStart(2, '0');
                  const dd = String(nextDay.getDate()).padStart(2, '0');
                  setPrevisto(`${yyyy}-${mm}-${dd}`);
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  (document.querySelector('input[name="eventPrevisto"]') as HTMLElement)?.focus();
                }
              }}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Previsão de Conclusão</label>
            <input
              type="date"
              max="9999-12-31"
              name="eventPrevisto"
              value={previsto}
              onChange={e => setPrevisto(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  (document.querySelector('button[name="submitEvent"]') as HTMLElement)?.focus();
                }
              }}
            />
          </div>
        </div>
        <div className={styles.formActions}>
          <button name="submitEvent" type="submit" className={styles.submitEventBtn}>✓ Confirmar Cadastro</button>
        </div>
      </form>
    </div>
  );
}
