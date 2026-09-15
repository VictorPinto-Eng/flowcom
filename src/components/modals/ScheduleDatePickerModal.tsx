'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import styles from './ScheduleDatePickerModal.module.css';

interface ScheduleDatePickerModalProps {
  isOpen: boolean;
  currentDate: string | null; // YYYY-MM-DD
  cardTitle: string;
  onClose: () => void;
  onSave: (dateStr: string) => void;
}

export default function ScheduleDatePickerModal({
  isOpen,
  currentDate,
  cardTitle,
  onClose,
  onSave
}: ScheduleDatePickerModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const initialDate = currentDate && currentDate >= todayStr ? currentDate : todayStr;
  const [dateVal, setDateVal] = useState<string>(initialDate);

  const handleQuickSet = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setDateVal(`${yyyy}-${mm}-${dd}`);
  };

  const handleSaveClick = () => {
    if (!dateVal) {
      Swal.fire({
        icon: 'warning',
        title: 'Data Obrigatória',
        text: 'Por favor, selecione uma data válida.',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    if (dateVal < todayStr) {
      Swal.fire({
        icon: 'warning',
        title: 'Data Inválida',
        text: 'Não é permitido selecionar datas anteriores a hoje.',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    onSave(dateVal);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h3 className={styles.modalTitle}>Definir Data Programada</h3>
            <p className={styles.subtitle}>{cardTitle}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          {/* Atalhos rápidos para celular/desktop */}
          <div className={styles.quickChips}>
            <button type="button" className={styles.chip} onClick={() => handleQuickSet(0)}>Hoje</button>
            <button type="button" className={styles.chip} onClick={() => handleQuickSet(1)}>Amanhã</button>
            <button type="button" className={styles.chip} onClick={() => handleQuickSet(7)}>7 dias</button>
            <button type="button" className={styles.chip} onClick={() => handleQuickSet(14)}>14 dias</button>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Escolher data:</label>
            <input
              type="date"
              className={styles.nativeDateInput}
              value={dateVal}
              onChange={(e) => setDateVal(e.target.value)}
              min={todayStr}
              max="9999-12-31"
            />
          </div>
        </div>

        <div className={styles.footer}>
          <div style={{ flex: 1 }} />
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className={styles.saveBtn}
              onClick={handleSaveClick}
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
