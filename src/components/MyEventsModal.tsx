'use client';

import { useState } from 'react';
import styles from './MyEventsModal.module.css';

interface MyEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: any[];
}

export default function MyEventsModal({ isOpen, onClose, events }: MyEventsModalProps) {
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [newActionText, setNewActionText] = useState('');

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Meus Eventos Direcionados</h2>
            <p className={styles.subtitle}>Listagem de todas as atividades atribuídas sob a responsabilidade do seu usuário</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.content}>
          {events.length === 0 ? (
            <div className={styles.emptyState}>
              <p>🎉 Nenhum evento pendente direcionado para você no momento!</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.eventsTable}>
                <thead>
                  <tr>
                    <th>Quadro / Área</th>
                    <th>Fase</th>
                    <th>Nome do Evento</th>
                    <th>Programado</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(ev => {
                    let statusBadge = <span className={styles.badgeNone}>Pendente</span>;
                    if (ev.previsto) {
                      const dateStr = new Date(ev.previsto).toISOString().split('T')[0];
                      const [year, month, day] = dateStr.split('-').map(Number);
                      const expectedDate = new Date(year, month - 1, day);
                      expectedDate.setHours(0,0,0,0);

                      const today = new Date();
                      today.setHours(0,0,0,0);

                      if (expectedDate < today) {
                        statusBadge = <span className={styles.badgeDanger}>⚠️ Atrasado</span>;
                      } else if (expectedDate.getTime() === today.getTime()) {
                        statusBadge = <span className={styles.badgeWarning}>⚡ Hoje</span>;
                      } else {
                        statusBadge = <span className={styles.badgeInfo}>⏳ No prazo</span>;
                      }
                    }

                    const previstoStr = ev.previsto ? new Date(ev.previsto).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—';
                    const boardName = ev.column?.board?.name || 'Quadro';
                    const workspaceName = ev.column?.board?.workspace?.name || 'Área';

                    return (
                      <tr key={ev.id}>
                        <td>
                          <div className={styles.metaTitle}>{boardName}</div>
                          <div className={styles.metaSubtitle}>{workspaceName}</div>
                        </td>
                        <td>
                          <span className={styles.columnBadge}>{ev.column?.title || 'Fase'}</span>
                        </td>
                        <td>
                          <div className={styles.eventTitle}>{ev.title}</div>
                          {ev.description && <div className={styles.eventDesc}>{ev.description}</div>}
                        </td>
                        <td>
                          <div className={styles.dateText}>{previstoStr}</div>
                          <div className={styles.badgeWrapper}>{statusBadge}</div>
                        </td>
                        <td>
                          <button 
                            className={styles.actionBtn}
                            onClick={() => setSelectedEvent(ev)}
                          >
                            💬 Andamentos ({ev.card_act ? ev.card_act.length : 0})
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Drawer de Andamentos Interno */}
      {selectedEvent && (
        <div className={styles.drawerOverlay} onClick={() => setSelectedEvent(null)}>
          <div className={styles.drawerContainer} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <h3 className={styles.drawerTitle}>Andamentos do Evento</h3>
                <p className={styles.drawerSubtitle}>{selectedEvent.title}</p>
              </div>
              <button className={styles.drawerCloseBtn} onClick={() => setSelectedEvent(null)}>✕</button>
            </div>
            <div className={styles.drawerContent}>
              <div className={styles.drawerListHeader}>
                <h4>Histórico de Ações ({selectedEvent.card_act ? selectedEvent.card_act.length : 0})</h4>
              </div>
              <div className={styles.drawerActionsList}>
                {!selectedEvent.card_act || selectedEvent.card_act.length === 0 ? (
                  <p className={styles.drawerEmptyText}>Nenhum andamento registrado para este evento.</p>
                ) : (
                  selectedEvent.card_act.map((act: any) => (
                    <div key={act.seqid} className={styles.drawerActionCard}>
                      <p className={styles.drawerActionText}>{act.description}</p>
                      <span className={styles.drawerActionMeta}>
                        {act.users?.name || 'Sistema'} • {new Date(act.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
