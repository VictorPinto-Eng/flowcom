'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBoardAction } from '@/app/actions/boardActions';
import styles from './NewActivity.module.css';

// Dynamic import for SweetAlert2 (lazy load on demand)
const getSwal = async () => {
  const module = await import('sweetalert2');
  return module.default;
};

const MAX_NAME_LENGTH = 100;

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  seqid?: string;
}

interface WorkspaceLite {
  id: string;
  seqid: string;
  name: string;
  type?: { name: string };
  currentUserRole?: string;
}

interface SectorType {
  id: number;
  name: string;
  acronym: string;
  active: boolean;
}

interface Props {
  user: User;
  workspaces: WorkspaceLite[];
  sectors: SectorType[];
  workspaceId: string | null;
}

/**
 * Formulário de criação de atividade em página cheia.
 * Substitui o CreateActivityModal. Alinha com o restante da aplicação
 * (que prefere páginas a modais para operações de criação).
 */
export default function NewActivityClient({ user, workspaces, sectors, workspaceId: initialWorkspaceId }: Props) {
  const router = useRouter();

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>(
    initialWorkspaceId || workspaces[0]?.id || ''
  );
  const [name, setName] = useState('');
  const [detalhes, setDetalhes] = useState('');
  const [sectorId, setSectorId] = useState<string>('1'); // Follow Up por padrão
  const [dtatv, setDtatv] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [previsto, setPrevisto] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [submitting, setSubmitting] = useState(false);

  // Atalho Escape para cancelar
  const handleCancel = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  }, [router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        handleCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [submitting, handleCancel]);

  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);

  // Validação de nome duplicado no mesmo workspace
  const checkDuplicateName = async (workspaceId: string, boardName: string): Promise<boolean> => {
    // Não há server action para listar boards do workspace nesta tela,
    // mas o createBoardAction já valida duplicatas no backend.
    // Mantemos a validação server-side para garantir consistência.
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspaceId || !name.trim() || submitting) return;

    setSubmitting(true);
    try {
      const Swal = await getSwal();

      const result = await createBoardAction(
        selectedWorkspaceId,
        name.trim(),
        undefined,
        sectorId ? parseInt(sectorId) : undefined,
        detalhes.trim() || undefined,
        dtatv || undefined,
        previsto || undefined
      );

      // Toast de sucesso
      await Swal.fire({
        icon: 'success',
        title: 'Atividade criada!',
        text: `"${name.trim()}" foi criada com sucesso.`,
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
        background: '#1e293b',
        color: '#e2e8f0',
        customClass: {
          popup: 'swal2-dark-toast'
        }
      });

      // Navega para a atividade criada (precisa do ID retornado)
      // Se não tiver ID, volta para o dashboard com workspace selecionado
      router.push(`/dashboard?workspaceId=${selectedWorkspaceId}&success=activity-created`);
    } catch (err: any) {
      console.error('Erro ao criar atividade:', err);
      const Swal = await getSwal();
      await Swal.fire({
        icon: 'error',
        title: 'Erro ao criar atividade',
        text: err.message || 'Não foi possível criar a atividade. Tente novamente.',
        confirmButtonColor: '#7c3aed',
        background: '#1e293b',
        color: '#e2e8f0'
      });
      setSubmitting(false);
    }
  };

  if (workspaces.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.emptyState}>
            <h1 className={styles.title}>Criar Nova Atividade</h1>
            <p className={styles.subtitle}>
              Você ainda não participa de nenhuma área de trabalho. Crie uma primeiro para poder adicionar atividades.
            </p>
            <div className={styles.buttonGroup}>
              <button className={styles.cancelBtn} onClick={handleCancel}>Voltar</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <button
            className={styles.backBtn}
            onClick={handleCancel}
            title="Voltar (Esc)"
            type="button"
          >
            ‹ Voltar
          </button>
          <h1 className={styles.title}>Criar Nova Atividade</h1>
          <p className={styles.subtitle}>
            Crie um novo painel para organizar seus serviços, cronogramas e entregas em tempo real.
          </p>
        </header>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Área de Trabalho</label>
            <select
              value={selectedWorkspaceId}
              onChange={(e) => setSelectedWorkspaceId(e.target.value)}
              required
            >
              {workspaces.map(ws => (
                <option key={ws.id} value={ws.id}>
                  {ws.name} {ws.type ? `(${ws.type.name})` : ''}
                </option>
              ))}
            </select>
            <span className={styles.hint}>
              A atividade será criada dentro da área de trabalho selecionada.
            </span>
          </div>

          <div className={styles.field}>
            <label>Nome da Atividade</label>
            <div className={styles.inputWithCounter}>
              <input
                type="text"
                placeholder="Ex: Acompanhamento Técnico, CRM de Vendas..."
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, MAX_NAME_LENGTH))}
                required
                autoFocus
                maxLength={MAX_NAME_LENGTH}
              />
              <span className={`${styles.charCounter} ${name.length > MAX_NAME_LENGTH * 0.9 ? styles.charCounterWarning : ''}`}>
                {name.length}/{MAX_NAME_LENGTH}
              </span>
            </div>
            <span className={styles.hint}>Escolha um nome descritivo para as suas listas de controle.</span>
          </div>

          <div className={styles.field}>
            <label>Informações / Detalhes</label>
            <textarea
              placeholder="Descreva o escopo, link do drive, observações..."
              value={detalhes}
              onChange={(e) => setDetalhes(e.target.value)}
              rows={3}
            />
            <span className={styles.hint}>Insira observações relevantes sobre esta atividade.</span>
          </div>

          <div className={styles.field}>
            <label>Setor da Atividade</label>
            <select
              value={sectorId}
              onChange={(e) => setSectorId(e.target.value)}
            >
              {sectors.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.acronym})
                </option>
              ))}
            </select>
            <span className={styles.hint}>Classifique esta atividade no setor correto.</span>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label>Data de Início</label>
              <input
                type="date"
                max="9999-12-31"
                value={dtatv}
                onChange={(e) => setDtatv(e.target.value)}
              />
              <span className={styles.hint}>Defina a data inicial.</span>
            </div>

            <div className={styles.field}>
              <label>Data Prevista</label>
              <input
                type="date"
                max="9999-12-31"
                value={previsto}
                onChange={(e) => setPrevisto(e.target.value)}
              />
              <span className={styles.hint}>Previsão de conclusão (D+1 por padrão).</span>
            </div>
          </div>

          <div className={styles.buttonGroup}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={handleCancel}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={!name.trim() || !selectedWorkspaceId || submitting}
            >
              {submitting ? 'Criando...' : 'Criar Atividade'}
            </button>
          </div>

          <p className={styles.shortcutHint}>
            Pressione <kbd>Esc</kbd> para cancelar
          </p>
        </form>
      </div>
    </div>
  );
}
