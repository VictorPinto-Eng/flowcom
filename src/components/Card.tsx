'use client';

import { useState } from 'react';
import { CardType } from '@/types/kanban';
import { updateCardPrevistoAction } from '@/app/actions/cardActions';
import styles from './Card.module.css';

interface CardProps {
  card: CardType;
  columnId: string;
}

export default function Card({ card, columnId }: CardProps) {
  const [previsto, setPrevisto] = useState<string>(
    card.previsto ? new Date(card.previsto).toISOString().split('T')[0] : ''
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('cardId', card.id);
    e.dataTransfer.setData('sourceColId', columnId);
  };

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPrevisto(val);
    setIsUpdating(true);
    try {
      await updateCardPrevistoAction(card.id, val ? val : null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const getCardAgeText = (card: any) => {
    const startDate = card.dtatv ? new Date(card.dtatv) : (card.createdAt ? new Date(card.createdAt) : null);
    if (!startDate) return '—';
    
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = card.dtcon 
      ? new Date(new Date(card.dtcon).getFullYear(), new Date(card.dtcon).getMonth(), new Date(card.dtcon).getDate())
      : new Date();
      
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const days = diffDays >= 0 ? diffDays : 0;
    
    return `${days} dias`;
  };

  let statusType = 'normal'; // 'danger', 'warning', 'success', 'normal'
  if (card.previsto) {
    const dateStr = new Date(card.previsto).toISOString().split('T')[0];
    const [year, month, day] = dateStr.split('-').map(Number);
    const expectedDate = new Date(year, month - 1, day);
    expectedDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (card.dtcon) {
      statusType = 'success';
    } else if (expectedDate < today) {
      statusType = 'danger';
    } else if (expectedDate.getTime() === today.getTime()) {
      statusType = 'warning';
    }
  }

  return (
    <div 
      className={styles.card} 
      draggable 
      onDragStart={handleDragStart}
    >
      <div className={styles.cardHeaderRow}>
        <h4>{card.title}</h4>
      </div>
      {card.description ? <p>{card.description}</p> : null}
      
      <div className={styles.cardFooter}>
        <div className={`${styles.previstoWrapper} ${styles[statusType] || ''}`}>
          <span className={styles.previstoLabel} title="Data Programada">
            {statusType === 'danger' ? '⚠️' : '📅'} Programado:
          </span>
          <input 
            type="date"
            max="9999-12-31"
            className={`${styles.previstoInput} ${styles[statusType] || ''}`}
            value={previsto}
            onChange={handleDateChange}
            disabled={isUpdating}
          />
        </div>
        <div className={styles.cardAgeWrapper}>
          <span className={`${styles.cardAgeText} ${styles[statusType] || ''}`}>
            {statusType === 'danger' ? '🔴' : statusType === 'warning' ? '🟡' : '⏱️'} {getCardAgeText(card)}
          </span>
        </div>
      </div>
    </div>
  );
}
