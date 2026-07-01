'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './Column.module.css';

interface AddCardFormProps {
  onAdd: (title: string) => void;
  onCancel: () => void;
}

export default function AddCardForm({ onAdd, onCancel }: AddCardFormProps) {
  const [title, setTitle] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (title.trim()) {
      onAdd(title.trim());
      setTitle('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.addCardContainer}>
      <textarea 
        ref={textareaRef}
        placeholder="Insira um título ou cole um link" 
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        className={styles.addCardTextarea}
        rows={2}
      />
      <div className={styles.addCardActions}>
        <button type="submit" className={styles.addCardConfirmBtn}>
          Adicionar Evento
        </button>
        <button type="button" onClick={onCancel} className={styles.addCardCancelBtn} title="Cancelar">
          ✕
        </button>
      </div>
    </form>
  );
}
