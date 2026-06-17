'use client';

import { useState } from 'react';
import styles from './EditEventModal.module.css';

interface EditEventModalProps {
  card: {
    id: string;
    title: string;
    description: string;
    previsto?: any;
    dtcon?: any;
    dtatv?: any;
  };
  columns: { id: string; title: string }[];
  onSave: (id: string, title: string, description: string, previstoStr: string | null, dtconStr: string | null, dtatvStr: string | null, newColumnId: string) => Promise<void>;
  onClose: () => void;
}

export default function EditEventModal({ card, columns, onSave, onClose }: EditEventModalProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [columnId, setColumnId] = useState((card as any).columnId || '');
  const [previsto, setPrevisto] = useState(
    card.previsto ? new Date(card.previsto).toISOString().split('T')[0] : ''
  );
  const [dtcon, setDtcon] = useState(
    card.dtcon ? new Date(card.dtcon).toISOString().split('T')[0] : ''
  );
  const [dtatv, setDtatv] = useState(
    card.dtatv ? new Date(card.dtatv).toISOString().split('T')[0] : ''
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      await onSave(
        card.id, 
        title.trim(), 
        description.trim() || '', 
        previsto ? previsto : null, 
        dtcon ? dtcon : null,
        dtatv ? dtatv : null,
        columnId
      );
      onClose();
    } catch (err) {
      console.error(err);
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>✏️ Editar Evento</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>


          <div className={styles.formGroup}>
            <label>Nome do Evento *</label>
            <input 
              type="text"
              name="editTitle"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  (document.querySelector('textarea[name="editDesc"]') as HTMLElement)?.focus();
                }
              }}
              autoFocus
              required 
            />
          </div>

          <div className={styles.formGroup}>
            <label>Descrição / Detalhes</label>
            <textarea 
              name="editDesc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  (document.querySelector('input[name="editDtatv"]') as HTMLElement)?.focus();
                }
              }}
              placeholder="Adicione observações, links ou detalhes do serviço..."
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Data da Atividade</label>
            <input 
              type="date"
              max="9999-12-31"
              name="editDtatv"
              value={dtatv}
              onChange={e => setDtatv(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  (document.querySelector('input[name="editPrevisto"]') as HTMLElement)?.focus();
                }
              }}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Data Programada (Prazo)</label>
            <input 
              type="date"
              max="9999-12-31"
              name="editPrevisto"
              value={previsto}
              onChange={e => setPrevisto(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  (document.querySelector('input[name="editDtcon"]') as HTMLElement)?.focus();
                }
              }}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Data de Conclusão</label>
            <input 
              type="date"
              max="9999-12-31"
              name="editDtcon"
              value={dtcon}
              onChange={e => setDtcon(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  (document.querySelector('select[name="editColumnId"]') as HTMLElement)?.focus();
                }
              }}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Fase do Evento *</label>
            <select
              name="editColumnId"
              value={columnId}
              onChange={e => setColumnId(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  (document.querySelector('button[name="saveEditBtn"]') as HTMLElement)?.focus();
                }
              }}
              className={styles.phaseSelect}
              required
            >
              {columns.map(col => (
                <option key={col.id} value={col.id}>{col.title}</option>
              ))}
            </select>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSaving}>
              Cancelar
            </button>
            <button name="saveEditBtn" type="submit" className={styles.saveBtn} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
