'use client';

import React, { useEffect, useState } from 'react';
import styles from './ActivityHistorySidebar.module.css';
import { getBoardActivityLogs } from '@/app/actions/boardActions';

interface ActivityLogItem {
  seqid: string;
  action: string;
  description: string;
  createdAt: Date;
  user: {
    name: string;
    image: string | null;
  };
}

interface ActivityHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
}

function getActionIcon(action: string) {
  switch (action) {
    case 'BOARD_CREATED': return '🚀';
    case 'CARD_CREATED': return '➕';
    case 'CARD_MOVED': return '🚚';
    case 'COLUMN_CREATED': return '📋';
    case 'COLUMN_DELETED': return '❌';
    case 'BOARD_RENAMED': return '✏️';
    default: return 'ℹ️';
  }
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function formatRelativeTime(dateInput: Date | string) {
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'agora mesmo';
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffHour < 24) return `há ${diffHour} ${diffHour === 1 ? 'hora' : 'horas'}`;
  if (diffDay === 1) return 'ontem';
  return `há ${diffDay} dias`;
}

export default function ActivityHistorySidebar({ isOpen, onClose, boardId }: ActivityHistorySidebarProps) {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && boardId) {
      setIsLoading(true);
      getBoardActivityLogs(boardId)
        .then(data => {
          setLogs(data as ActivityLogItem[]);
          setIsLoading(false);
        })
        .catch(err => {
          console.error("Erro ao buscar logs:", err);
          setIsLoading(false);
        });
    }
  }, [isOpen, boardId]);

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`} 
        onClick={onClose} 
      />

      {/* Sidebar Panel */}
      <div className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <header className={styles.header}>
          <div className={styles.titleWrapper}>
            <span className={styles.titleIcon}>📜</span>
            <h2 className={styles.title}>{boardId === 'ALL' ? 'Log do Sistema (Geral)' : 'Histórico Informativo'}</h2>
          </div>
          <button className={styles.closeButton} onClick={onClose} title="Fechar painel">
            ✕ Fechar
          </button>
        </header>

        <section className={styles.content}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <div className={styles.loadingSpinner} />
              <span>Carregando acompanhamento...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📭</span>
              <span>Nenhum acompanhamento registrado para esta atividade ainda.</span>
            </div>
          ) : (
            logs.map((log, index) => {
              const icon = getActionIcon(log.action);
              const initials = getInitials(log.user.name);
              const accentClass = styles[`logItem_${log.action}`] || '';

              return (
                <div 
                  key={log.seqid} 
                  className={`${styles.logItem} ${accentClass}`}
                  style={{ animationDelay: `${index * 0.04}s` }}
                >
                  <div className={styles.avatarWrapper}>
                    <div className={styles.avatar} title={log.user.name}>
                      {initials}
                    </div>
                    <div className={styles.actionBadge} title={log.action}>
                      {icon}
                    </div>
                  </div>

                  <div className={styles.details}>
                    <p className={styles.text}>
                      <span className={styles.userName}>{log.user.name}</span> {log.description}
                    </p>
                    <span className={styles.time}>{formatRelativeTime(log.createdAt)}</span>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
    </>
  );
}
