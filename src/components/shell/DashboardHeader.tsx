'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import UserMenu from './UserMenu';
import styles from './DashboardClient.module.css';

interface DashboardHeaderProps {
  user: { name: string; email: string; image?: string };
  onCreateWorkspace?: () => void;
  onOpenActivityLog?: () => void;
  onOpenWorkspaceColumns?: () => void;
  onPanelClick?: () => void;
  onMyActivitiesClick?: () => void;
  onMyEventsClick?: () => void;
  onMovementsClick?: () => void;
  onReportClick?: () => void;
}

export default function DashboardHeader({
  user,
  onCreateWorkspace,
  onOpenActivityLog,
  onOpenWorkspaceColumns,
  onPanelClick,
  onMyActivitiesClick,
  onMyEventsClick,
  onMovementsClick,
  onReportClick
}: DashboardHeaderProps) {
  const router = useRouter();
  const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);
  const reportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (reportMenuRef.current && !reportMenuRef.current.contains(event.target as Node)) {
        setIsReportMenuOpen(false);
      }
    }
    if (isReportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isReportMenuOpen]);

  return (
    <header className={`${styles.header} glass`}>
      <Link
        href="/dashboard"
        className={styles.logo}
        onClick={(e) => {
          e.preventDefault();
          window.location.href = '/dashboard';
        }}
      >
        <span>FLOW</span>
      </Link>
      <div className={styles.userSection}>
        <button
          className={styles.panelTrigger}
          onClick={() => {
            if (onPanelClick) {
              onPanelClick();
            } else {
              router.push('/dashboard');
            }
          }}
          title="Visualizar Painel de Atividades por Área de Trabalho"
        >
          🧩 Painel
        </button>
        <button
          className={styles.myActivitiesTrigger}
          onClick={() => {
            window.location.href = '/activities';
          }}
          title="Listagem de todas as atividades sob sua responsabilidade ordenada por agendamento"
        >
          📅 Minhas Atividades
        </button>
        <button
          className={styles.myEventsTrigger}
          onClick={() => {
            if (onMyEventsClick) {
              onMyEventsClick();
            } else {
              router.push('/dashboard?view=my-events');
            }
          }}
          title="Listagem de todos eventos em andamento sob responsabilidade direta do seu usuário"
        >
          📋 Meus Eventos
        </button>
        <div className={styles.reportDropdown} ref={reportMenuRef}>
          <button
            className={styles.reportDropdownTrigger}
            onClick={() => setIsReportMenuOpen(!isReportMenuOpen)}
            title="Relatórios"
          >
            📊 Relatório
          </button>
          {isReportMenuOpen && (
            <div className={styles.reportDropdownMenu}>
              <button
                className={styles.reportDropdownItem}
                onClick={() => {
                  if (onMovementsClick) {
                    onMovementsClick();
                  } else {
                    router.push('/dashboard?view=movements');
                  }
                  setIsReportMenuOpen(false);
                }}
              >
                <span>📊 Movimentações</span>
                <span className={styles.reportDropdownHint}>Auditoria e Histórico</span>
              </button>
              <button
                className={styles.reportDropdownItem}
                onClick={() => {
                  if (onReportClick) {
                    onReportClick();
                  } else {
                    router.push('/reports');
                  }
                  setIsReportMenuOpen(false);
                }}
              >
                <span>📋 Relatório Geral</span>
                <span className={styles.reportDropdownHint}>Consolidado por área</span>
              </button>
            </div>
          )}
        </div>
        <UserMenu
          user={user}
          onCreateWorkspace={onCreateWorkspace || (() => {})}
          onOpenActivityLog={onOpenActivityLog}
          onOpenWorkspaceColumns={onOpenWorkspaceColumns}
        />
      </div>
    </header>
  );
}