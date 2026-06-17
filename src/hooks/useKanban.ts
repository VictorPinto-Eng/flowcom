import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { ColumnType, CardType } from '@/types/kanban';
import { addCardAction, moveCardAction, completeCardAction } from '@/app/actions/cardActions';
import { addColumnAction, copyColumnAction, deleteColumnAction } from '@/app/actions/columnActions';

export function useKanban(initialColumns: ColumnType[], boardId: string) {
  const router = useRouter();
  const [columns, setColumns] = useState<ColumnType[]>(initialColumns);

  // Sincroniza o estado local quando os dados do servidor mudarem (ex: após revalidatePath)
  useEffect(() => {
    setColumns(initialColumns);
  }, [initialColumns]);

  const addCard = async (columnId: string, title: string, description: string, dtatvStr?: string, previstoStr?: string) => {
    const tempId = `temp-${Date.now()}`;
    const newCard: CardType = { id: tempId, title, description };
    
    setColumns(prev => prev.map(col => {
      if (col.id === columnId) {
        return { ...col, cards: [...col.cards, newCard] };
      }
      return col;
    }));

    try {
      await addCardAction(columnId, title, boardId, description, dtatvStr || null, previstoStr || null);
      router.refresh();
    } catch (error) {
      console.error('Falha ao adicionar card:', error);
      setColumns(initialColumns);
    }
  };

  const addColumn = async () => {
    const { value: title } = await Swal.fire({
      title: 'Nova Coluna',
      input: 'text',
      inputLabel: 'Nome da nova coluna:',
      inputPlaceholder: 'Ex: Revisão, Aguardando...',
      showCancelButton: true,
      confirmButtonColor: '#7c3aed',
      cancelButtonText: 'Cancelar',
      background: '#1a1a1a',
      color: '#fff'
    });

    if (title && boardId) {
      try {
        await addColumnAction(boardId, title);
        router.refresh();
      } catch (error) {
        console.error('Falha ao adicionar coluna:', error);
      }
    }
  };

  const copyColumn = async (columnId: string) => {
    try {
      await copyColumnAction(columnId);
    } catch (error) {
      console.error('Falha ao copiar coluna:', error);
    }
  };

  const deleteColumn = async (columnId: string) => {
    // Atualização Otimista
    setColumns(prev => prev.filter(col => col.id !== columnId));
    try {
      await deleteColumnAction(columnId);
    } catch (error) {
      console.error('Falha ao arquivar coluna:', error);
      setColumns(initialColumns);
    }
  };

  const moveCard = async (cardId: string, sourceColId: string, targetColId: string) => {
    if (sourceColId === targetColId) return;

    // Atualização Otimista
    setColumns(prev => {
      const sourceCol = prev.find(c => c.id === sourceColId);
      const targetCol = prev.find(c => c.id === targetColId);
      const card = sourceCol?.cards.find(c => c.id === cardId);

      if (!sourceCol || !targetCol || !card) return prev;

      return prev.map(col => {
        if (col.id === sourceColId) {
          return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
        }
        if (col.id === targetColId) {
          return { ...col, cards: [...col.cards, card] };
        }
        return col;
      });
    });

    try {
      await moveCardAction(cardId, targetColId);
    } catch (error) {
      console.error('Falha ao mover card:', error);
      setColumns(initialColumns);
    }
  };

  const completeCard = async (cardId: string, sourceColId: string, targetColId: string) => {
    if (sourceColId === targetColId) return;

    // Atualização Otimista
    setColumns(prev => {
      const sourceCol = prev.find(c => c.id === sourceColId);
      const targetCol = prev.find(c => c.id === targetColId);
      const card = sourceCol?.cards.find(c => c.id === cardId);

      if (!sourceCol || !targetCol || !card) return prev;

      return prev.map(col => {
        if (col.id === sourceColId) {
          return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
        }
        if (col.id === targetColId) {
          // Na atualização otimista simulamos também o preenchimento de dtcon
          return { ...col, cards: [...col.cards, { ...card, dtcon: new Date() }] };
        }
        return col;
      });
    });

    try {
      await completeCardAction(cardId, targetColId);
    } catch (error) {
      console.error('Falha ao concluir card:', error);
      setColumns(initialColumns);
    }
  };

  return {
    columns,
    addCard,
    addColumn,
    copyColumn,
    deleteColumn,
    moveCard,
    completeCard
  };
}
