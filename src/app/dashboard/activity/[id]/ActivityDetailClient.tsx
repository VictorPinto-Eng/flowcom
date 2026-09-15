'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit2, Save, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { updateCardAction, moveCardAction, completeCardDirectlyAction } from '@/app/actions/cardActions';
import { toLocalDateInputString } from '@/lib/dateUtils';
import styles from './ActivityDetail.module.css';

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  seqid?: string;
}

interface Card {
  seqid: string;
  id: string;
  title: string;
  description: string;
  previsto: string | null;
  dtatv: string | null;
  dtcon: string | null;
  columnTitle: string;
  boardTitle: string;
  workspaceName: string;
  workspaceSeqid: string;
  taskUserName?: string;
  userName?: string;
  card_act: Array<{
    seqid: string;
    description: string;
    created_at: string;
    userName?: string;
  }>;
}

interface Workspace {
  id: string;
  seqid: string;
  name: string;
}

interface Props {
  user: User;
  userSeqid: string;
  card: Card;
  workspaces: Workspace[];
}

export default function ActivityDetailClient({ user, userSeqid, card, workspaces }: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Editable fields
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [previsto, setPrevisto] = useState(
    card.previsto ? toLocalDateInputString(card.previsto) : ''
  );
  const [dtatv, setDtatv] = useState(
    card.dtatv ? toLocalDateInputString(card.dtatv) : ''
  );

  const handleSaveChanges = async () => {
    if (!title.trim()) {
      Swal.fire('Erro', 'Título é obrigatório', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await updateCardAction(
        card.seqid,
        title.trim(),
        description.trim() || null,
        previsto || null,
        null, // dtcon não muda aqui
        dtatv || null
      );

      Swal.fire('Sucesso', 'Atividade atualizada', 'success');
      setIsEditing(false);
      router.refresh();
    } catch (err: any) {
      Swal.fire('Erro', err.message || 'Falha ao atualizar', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteActivity = async () => {
    const { isConfirmed } = await Swal.fire({
      title: 'Concluir Atividade?',
      text: `"${card.title}" será movida para concluída`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Concluir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#7c3aed'
    });

    if (!isConfirmed) return;

    try {
      await completeCardDirectlyAction(card.seqid);
      Swal.fire('Sucesso', 'Atividade concluída', 'success');
      router.refresh();
    } catch (err: any) {
      Swal.fire('Erro', err.message || 'Falha ao concluir', 'error');
    }
  };

  const isCompleted = !!card.dtcon;

  return (
    <div className={styles.container}>
      {/* Header com botão de voltar */}
      <div className={styles.header}>
        <Link href="/dashboard" className={styles.backButton}>
          <ArrowLeft size={20} />
          Voltar
        </Link>
        <h1 className={styles.title}>Detalhes da Atividade</h1>
        <div className={styles.headerSpace} />
      </div>

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <span>{card.workspaceName}</span>
        <span className={styles.separator}>/</span>
        <span>{card.boardTitle}</span>
        <span className={styles.separator}>/</span>
        <span className={styles.current}>{card.title}</span>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Main card info */}
        <div className={styles.mainCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>{isCompleted ? '✓ ' : ''}{card.title}</h2>
              <p className={styles.meta}>
                #{card.seqid} • {card.columnTitle}
              </p>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className={styles.editButton}
                disabled={isCompleted}
              >
                <Edit2 size={18} />
                Editar
              </button>
            )}
          </div>

          {isEditing ? (
            <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleSaveChanges(); }}>
              <div className={styles.formGroup}>
                <label>Título *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={isSaving}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Descrição</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSaving}
                  className={styles.textarea}
                  rows={4}
                />
              </div>

              <div className={styles.dateGrid}>
                <div className={styles.formGroup}>
                  <label>Data de Ativação</label>
                  <input
                    type="date"
                    value={dtatv}
                    onChange={(e) => setDtatv(e.target.value)}
                    disabled={isSaving}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Data Prevista</label>
                  <input
                    type="date"
                    value={previsto}
                    onChange={(e) => setPrevisto(e.target.value)}
                    disabled={isSaving}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setTitle(card.title);
                    setDescription(card.description || '');
                    setPrevisto(card.previsto ? toLocalDateInputString(card.previsto) : '');
                    setDtatv(card.dtatv ? toLocalDateInputString(card.dtatv) : '');
                  }}
                  disabled={isSaving}
                  className={styles.cancelButton}
                >
                  <X size={18} />
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={styles.saveButton}
                >
                  <Save size={18} />
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          ) : (
            <div className={styles.viewMode}>
              <div className={styles.field}>
                <label>Descrição</label>
                <p className={styles.value}>{card.description || '(sem descrição)'}</p>
              </div>

              <div className={styles.dateGrid}>
                <div className={styles.field}>
                  <label>Data de Ativação</label>
                  <p className={styles.value}>
                    {card.dtatv ? new Date(card.dtatv).toLocaleDateString('pt-BR') : '(sem data)'}
                  </p>
                </div>
                <div className={styles.field}>
                  <label>Data Prevista</label>
                  <p className={styles.value}>
                    {card.previsto ? new Date(card.previsto).toLocaleDateString('pt-BR') : '(sem data)'}
                  </p>
                </div>
                {isCompleted && (
                  <div className={styles.field}>
                    <label>Data de Conclusão</label>
                    <p className={styles.value}>
                      {new Date(card.dtcon!).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}
              </div>

              <div className={styles.field}>
                <label>Responsável</label>
                <p className={styles.value}>{card.taskUserName || card.userName || '(sem atribuição)'}</p>
              </div>

              {!isCompleted && (
                <button
                  onClick={handleCompleteActivity}
                  className={styles.completeButton}
                >
                  ✓ Concluir Atividade
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sidebar com histórico */}
        <div className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>Histórico ({card.card_act.length})</h3>
          <div className={styles.timeline}>
            {card.card_act.length === 0 ? (
              <p className={styles.noHistory}>Nenhuma ação registrada</p>
            ) : (
              card.card_act.map((act) => (
                <div key={act.seqid} className={styles.timelineItem}>
                  <div className={styles.timelineDot} />
                  <div className={styles.timelineContent}>
                    <p className={styles.timelineText}>{act.description}</p>
                    <p className={styles.timelineAuthor}>{act.userName || 'Sistema'}</p>
                    <p className={styles.timelineDate}>
                      {new Date(act.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
