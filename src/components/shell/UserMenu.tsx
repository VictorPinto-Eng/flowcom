'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './UserMenu.module.css';
import { logoutAction } from '@/app/actions/authActions';

interface UserMenuProps {
  user: {
    name: string;
    email: string;
    image?: string;
  };
  onCreateWorkspace: () => void;
  onOpenActivityLog?: () => void;
  onOpenWorkspaceColumns?: () => void;
}

export default function UserMenu({ user, onCreateWorkspace, onOpenActivityLog, onOpenWorkspaceColumns }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logoutAction();
  };

  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div className={styles.container} ref={menuRef}>
      <button className={styles.trigger} onClick={() => setIsOpen(!isOpen)}>
        {user.image ? (
          <img src={user.image} alt={user.name} className={styles.avatar} />
        ) : (
          <div className={styles.avatarPlaceholder}>{initials}</div>
        )}
      </button>

      {isOpen && (
        <div className={styles.menu}>
          <div className={styles.header}>
            <span className={styles.label}>CONTA</span>
            <div className={styles.userInfo}>
              <div className={styles.avatarSmall}>
                {user.image ? <img src={user.image} alt="" /> : initials}
              </div>
              <div className={styles.userText}>
                <span className={styles.userName}>{user.name}</span>
                <span className={styles.userEmail}>{user.email}</span>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <button className={styles.item}>Alternar Contas</button>
            <button className={styles.item}>Gerenciar conta <span>↗</span></button>
          </div>

          <div className={styles.section}>
            <span className={styles.label}>FLOW</span>
            <button className={styles.item}>Perfil e visibilidade</button>
            <button className={styles.item} onClick={() => {
              onOpenActivityLog?.();
              setIsOpen(false);
            }}>
              LOG
            </button>
            <button className={styles.item} onClick={() => {
              onOpenWorkspaceColumns?.();
              setIsOpen(false);
            }}>
              Lista de área de trabalho
            </button>
            <button className={styles.item}>Cartões</button>
            <button className={styles.item}>Configurações</button>
            <button className={styles.item}>Tema <span>›</span></button>
          </div>

          <div className={styles.section}>
            <button className={styles.item} onClick={() => {
              onCreateWorkspace();
              setIsOpen(false);
            }}>
              <span className={styles.icon}>👥</span> Criar Área de trabalho
            </button>
          </div>

          <div className={styles.section}>
            <button className={styles.item}>Ajuda</button>
            <button className={styles.item}>Atalhos</button>
          </div>

          <div className={styles.section}>
            <button className={styles.item} onClick={() => {
              window.location.href = '/admin/diagnostics';
              setIsOpen(false);
            }}>
              <span className={styles.icon}>🔍</span> Diagnóstico do Servidor
            </button>
          </div>

          <div className={styles.footer}>
            <button className={styles.logoutBtn} onClick={handleLogout}>Fazer Logout</button>
          </div>
        </div>
      )}
    </div>
  );
}
