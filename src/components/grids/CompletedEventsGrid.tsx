'use client';

import React, { useState } from 'react';
import { CardType } from '@/types/kanban';
import ActionsDrawer from './ActionsDrawer';
import styles from '../kanban/Board.module.css';

interface CompletedEvent extends CardType {
  columnName: string;
  columnId: string;
  seqid?: string;
  card_act?: any[];
}

interface CompletedEventsGridProps {
  events: CompletedEvent[];
  userSeqid: string;
  currentUserRole: string;
  onRespondTransfer?: (cardId: string, actionSeqid: string, accept: boolean) => void;
}

export default function CompletedEventsGrid({
  events,
  userSeqid,
  currentUserRole,
  onRespondTransfer
}: CompletedEventsGridProps) {
  const [activeActionModal, setActiveActionModal] = useState<any | null>(null);

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

  // Sort: most recently finished first
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = a.dtcon ? new Date(a.dtcon).getTime() : 0;
    const dateB = b.dtcon ? new Date(b.dtcon).getTime() : 0;
    if (dateB !== dateA) return dateB - dateA;
    const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return createdB - createdA;
  });

  if (sortedEvents.length === 0) {
    return (
      <div className={styles.gridSection}>
        <div className={styles.emptyGridState}>
          <p>Nenhum evento concluído nesta atividade.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.gridSection}>
      <div className={styles.gridWrapper}>
        <table className={styles.dataGridTable}>
          <thead>
            <tr>
              <th>Nome do Evento</th>
              <th>Dt. Inicial</th>
              <th>Dias de Trabalho</th>
              <th>Data de Conclusão</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedEvents.map(event => {
              const dtconStr = event.dtcon ? new Date(event.dtcon).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Sem data';
              const dtatvStr = event.dtatv ? new Date(event.dtatv).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Sem data';
              return (
                <tr key={event.id}>
                  <td>
                    <div className={styles.gridEventTitle}>{event.title}</div>
                    <button
                      className={styles.actionsPillBtn}
                      onClick={() => setActiveActionModal(event as any)}
                    >
                      💬 Andamentos ({event.card_act ? event.card_act.length : 0})
                    </button>
                  </td>
                  <td>
                    <div className={styles.gridEventDesc}>{dtatvStr}</div>
                  </td>
                  <td>
                    <div className={styles.gridEventDesc}>⏱️ {getCardAgeText(event)}</div>
                  </td>
                  <td>
                    <div className={styles.gridEventDesc}>{dtconStr}</div>
                  </td>
                  <td>
                    <span className={styles.badgeSuccess}>✓ Concluído</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeActionModal && (
        <ActionsDrawer
          event={activeActionModal}
          userSeqid={userSeqid}
          currentUserRole={currentUserRole}
          onClose={() => setActiveActionModal(null)}
          onUpdate={(updatedEvent) => setActiveActionModal(updatedEvent)}
          onRespondTransfer={onRespondTransfer}
        />
      )}
    </div>
  );
}
