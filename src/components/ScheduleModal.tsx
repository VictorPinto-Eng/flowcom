'use client';

import { ColumnType } from '@/types/kanban';
import styles from './ScheduleModal.module.css';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardName: string;
  columns: ColumnType[];
}

export default function ScheduleModal({ isOpen, onClose, boardName, columns }: ScheduleModalProps) {
  if (!isOpen) return null;

  // Gather all cards and attach their column title
  const allEvents: { id: string; title: string; description: string; previsto?: any; columnName: string }[] = [];
  columns.forEach(col => {
    col.cards.forEach(card => {
      allEvents.push({
        ...card,
        columnName: col.title
      });
    });
  });

  // Sort events: those with previsto first (ascending), then those without
  const sortedEvents = [...allEvents].sort((a, b) => {
    if (a.previsto && b.previsto) {
      return new Date(a.previsto).getTime() - new Date(b.previsto).getTime();
    }
    if (a.previsto) return -1;
    if (b.previsto) return 1;
    return 0;
  });

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleStack}>
            <h3>📅 Programação de Eventos</h3>
            <span className={styles.subtitle}>Atividade: {boardName}</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.content}>
          {sortedEvents.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Nenhum evento cadastrado nesta atividade.</p>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Fase / Lista</th>
                    <th>Evento</th>
                    <th>Data Programada</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEvents.map(event => {
                    let dateFormatted = 'Sem data programada';
                    let statusBadge = <span className={styles.badgeNone}>Pendente</span>;

                    if (event.previsto) {
                      const dateObj = new Date(event.previsto);
                      dateFormatted = dateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                      
                      const dateStr = dateObj.toISOString().split('T')[0];
                      const [year, month, day] = dateStr.split('-').map(Number);
                      const expectedDate = new Date(year, month - 1, day);
                      expectedDate.setHours(0,0,0,0);

                      const today = new Date();
                      today.setHours(0,0,0,0);

                      if (event.columnName.toLowerCase().includes('concluído')) {
                        statusBadge = <span className={styles.badgeSuccess}>✅ Concluído</span>;
                      } else if (expectedDate < today) {
                        statusBadge = <span className={styles.badgeDanger}>⚠️ Atrasado</span>;
                      } else if (expectedDate.getTime() === today.getTime()) {
                        statusBadge = <span className={styles.badgeWarning}>⚡ Hoje</span>;
                      } else {
                        statusBadge = <span className={styles.badgeInfo}>⏳ No prazo</span>;
                      }
                    } else {
                      if (event.columnName.toLowerCase().includes('concluído')) {
                        statusBadge = <span className={styles.badgeSuccess}>✅ Concluído</span>;
                      }
                    }

                    return (
                      <tr key={event.id}>
                        <td>
                          <span className={styles.columnTag}>{event.columnName}</span>
                        </td>
                        <td>
                          <div className={styles.eventName}>{event.title}</div>
                          {event.description ? <div className={styles.eventDesc}>{event.description}</div> : null}
                        </td>
                        <td className={styles.dateCell}>{dateFormatted}</td>
                        <td>{statusBadge}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
