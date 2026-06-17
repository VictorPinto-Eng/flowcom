'use client';

import { ColumnType } from '@/types/kanban';
import Card from './Card';
import AddCardForm from './AddCardForm';
import { useState, useRef, useEffect } from 'react';
import styles from './Column.module.css';

interface ColumnProps {
  column: ColumnType;
  onAddCard: (columnId: string, title: string, description: string) => void;
  onMoveCard: (cardId: string, sourceColId: string, targetColId: string) => void;
  onCopy: (columnId: string) => void;
  onDelete: (columnId: string) => void;
  index: number;
}

export default function Column({ column, onAddCard, onMoveCard, onCopy, onDelete, index }: ColumnProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [columnColor, setColumnColor] = useState<string>('');
  const menuRef = useRef<HTMLDivElement>(null);

  const colors = [
    { name: 'Padrão', value: '' },
    { name: 'Roxo', value: '#7c3aed' },
    { name: 'Azul', value: '#0ea5e9' },
    { name: 'Verde', value: '#10b981' },
    { name: 'Vermelho', value: '#ef4444' },
    { name: 'Laranja', value: '#f59e0b' },
    { name: 'Rosa', value: '#ec4899' }
  ];

  // Carrega a cor salva no localStorage
  useEffect(() => {
    const savedColor = localStorage.getItem(`column-color-${column.id}`);
    if (savedColor) {
      setColumnColor(savedColor);
    }
  }, [column.id]);

  // Fecha o menu ao clicar fora dele
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleAddCard = (title: string) => {
    onAddCard(column.id, title, '');
    setIsAdding(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const cardId = e.dataTransfer.getData('cardId');
    const sourceColId = e.dataTransfer.getData('sourceColId');
    
    if (cardId && sourceColId) {
      onMoveCard(cardId, sourceColId, column.id);
    }
  };

  const handleCopyList = () => {
    onCopy(column.id);
    setIsMenuOpen(false);
  };

  const handleArchiveList = () => {
    if (confirm(`Deseja realmente arquivar a lista "${column.title}"?`)) {
      onDelete(column.id);
      setIsMenuOpen(false);
    }
  };

  const handleFollowList = () => {
    setIsFollowing(!isFollowing);
    setIsMenuOpen(false);
  };

  const handleMoveList = () => {
    alert('Recurso de movimentação sequencial de lista! Em breve.');
    setIsMenuOpen(false);
  };

  const handleAutomationRule = (ruleType: string) => {
    alert(`Automação FLOW criada: Regra para ${ruleType} adicionada com sucesso neste quadro!`);
    setIsMenuOpen(false);
  };

  const handleSelectColor = (color: string) => {
    setColumnColor(color);
    localStorage.setItem(`column-color-${column.id}`, color);
  };

  return (
    <div 
      className={`${styles.column} animate-fade-in ${isOver ? styles.dragOver : ''}`}
      style={{ 
        animationDelay: `${index * 0.1}s`,
        borderTop: columnColor ? `4px solid ${columnColor}` : '1px solid var(--glass-border)'
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3>{column.title}</h3>
          {isFollowing && <span className={styles.followBadge} title="Seguindo esta lista">👁️</span>}
          <span className={styles.count}>{column.cards.length}</span>
        </div>
        <button 
          className={styles.menuBtn} 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          title="Ações da Lista"
        >
          •••
        </button>
      </div>

      {isMenuOpen && (
        <div className={styles.menuDropdown} ref={menuRef}>
          <div className={styles.menuHeader}>
            <span>Ações da Lista</span>
            <button className={styles.closeMenuBtn} onClick={() => setIsMenuOpen(false)}>×</button>
          </div>
          
          <ul className={styles.menuList}>
            <li onClick={() => { setIsAdding(true); setIsMenuOpen(false); }}>Adicionar evento</li>
            <li onClick={handleCopyList}>Copiar lista</li>
            <li onClick={handleMoveList}>Mover lista</li>
            <li onClick={handleFollowList}>
              {isFollowing ? 'Deixar de seguir' : 'Seguir'}
            </li>
          </ul>
          
          <div className={styles.menuDivider} />
          
          <div className={styles.menuSection}>
            <span className={styles.menuSectionTitle}>Alterar a cor ▾</span>
            <div className={styles.colorPickerContainer}>
              {colors.map((color) => (
                <button
                  key={color.name}
                  className={`${styles.colorCircle} ${columnColor === color.value ? styles.colorCircleActive : ''}`}
                  style={{ backgroundColor: color.value || 'rgba(255, 255, 255, 0.15)' }}
                  onClick={() => handleSelectColor(color.value)}
                  title={color.name}
                />
              ))}
            </div>
          </div>
          
          <div className={styles.menuDivider} />
          
          <div className={styles.menuSection}>
            <span className={styles.menuSectionTitle}>Automação ▾</span>
            <ul className={styles.menuList}>
              <li onClick={() => handleAutomationRule('Quando um evento for adicionado à lista')}>Quando um evento for adicionado à lista</li>
              <li onClick={() => handleAutomationRule('Todo dia, ordenar a lista por')}>Todo dia, ordenar a lista por</li>
              <li onClick={() => handleAutomationRule('Toda segunda-feira, ordenar a lista por')}>Toda segunda-feira, ordenar a lista por</li>
              <li onClick={() => handleAutomationRule('Criar uma regra')}>Criar uma regra</li>
            </ul>
          </div>
          
          <div className={styles.menuDivider} />
          
          <ul className={styles.menuList}>
            <li className={styles.dangerItem} onClick={handleArchiveList}>Arquivar Esta Lista</li>
          </ul>
        </div>
      )}
      
      <div className={styles.cardsContainer}>
        {column.cards.map((card) => (
          <Card key={card.id} card={card} columnId={column.id} />
        ))}
      </div>

      {isAdding ? (
        <AddCardForm 
          onAdd={handleAddCard} 
          onCancel={() => setIsAdding(false)} 
        />
      ) : (
        <button className={styles.addCardBtn} onClick={() => setIsAdding(true)}>
          + Adicionar um evento
        </button>
      )}
    </div>
  );
}
