'use client';

import { useState, useEffect } from 'react';
import { getSectorsAction } from '@/app/actions/boardActions';
import { getWorkspaceMembersAction } from '@/app/actions/cardActions';
import styles from './RenameActivityModal.module.css';

interface RenameActivityModalProps {
  boardId: string;
  initialName: string;
  initialDetalhes?: string | null;
  initialSectorId?: number | null;
  initialDtatv?: string | Date | null;
  initialWorkspaceId?: string | number | null;
  initialUserSeqid?: string | null;
  initialPrevisto?: string | Date | null;
  sectors?: { id: number; name: string; acronym: string }[];
  workspaces?: { id: string; seqid: any; name: string }[];
  onSubmit: (boardId: string, name: string, detalhes: string | null, sectorId?: number | null, dtatv?: string | null, workspaceId?: string, assignedUserSeqid?: string | null, previsto?: string | null) => Promise<void>;
  onClose: () => void;
}

export default function RenameActivityModal({ 
  boardId, 
  initialName, 
  initialDetalhes = '', 
  initialSectorId, 
  initialDtatv, 
  initialWorkspaceId,
  initialUserSeqid = '',
  initialPrevisto,
  sectors = [], 
  workspaces = [],
  onSubmit, 
  onClose 
}: RenameActivityModalProps) {
  const formatDateForInput = (d: any) => {
    if (!d) return '';
    try {
      return new Date(d).toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const [name, setName] = useState(initialName);
  const [detalhes, setDetalhes] = useState(initialDetalhes || '');
  const [sectorId, setSectorId] = useState<string>(initialSectorId ? initialSectorId.toString() : '');
  const [dtatv, setDtatv] = useState<string>(formatDateForInput(initialDtatv));
  const [previsto, setPrevisto] = useState<string>(formatDateForInput(initialPrevisto));
  const [workspaceId, setWorkspaceId] = useState<string>(initialWorkspaceId ? initialWorkspaceId.toString() : '');
  const [assignedUserSeqid, setAssignedUserSeqid] = useState<string>(initialUserSeqid ? initialUserSeqid.toString() : '');
  const [sectorsList, setSectorsList] = useState<{ id: number; name: string; acronym: string }[]>(sectors || []);
  const [membersList, setMembersList] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getSectorsAction()
      .then(data => {
        if (data) {
          setSectorsList(data as { id: number; name: string; acronym: string }[]);
        }
      })
      .catch(err => console.error('Erro ao buscar setores online:', err));
  }, []);

  // Carregar os colaboradores (membros) conforme o workspace selecionado
  useEffect(() => {
    if (workspaceId) {
      getWorkspaceMembersAction(workspaceId)
        .then(data => {
          if (data) {
            setMembersList(data);
          }
        })
        .catch(err => console.error('Erro ao carregar colaboradores do workspace:', err));
    }
  }, [workspaceId]);

  useEffect(() => {
    setName(initialName);
    setDetalhes(initialDetalhes || '');
    setSectorId(initialSectorId ? initialSectorId.toString() : '');
    setDtatv(formatDateForInput(initialDtatv));
    setPrevisto(formatDateForInput(initialPrevisto));
    setWorkspaceId(initialWorkspaceId ? initialWorkspaceId.toString() : '');
    setAssignedUserSeqid(initialUserSeqid ? initialUserSeqid.toString() : '');
  }, [initialName, initialDetalhes, initialSectorId, initialDtatv, initialWorkspaceId, initialUserSeqid, initialPrevisto]);

  const isChanged = name.trim() !== initialName || 
                    detalhes !== (initialDetalhes || '') ||
                    sectorId !== (initialSectorId ? initialSectorId.toString() : '') ||
                    dtatv !== formatDateForInput(initialDtatv) ||
                    previsto !== formatDateForInput(initialPrevisto) ||
                    workspaceId !== (initialWorkspaceId ? initialWorkspaceId.toString() : '') ||
                    assignedUserSeqid !== (initialUserSeqid ? initialUserSeqid.toString() : '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && isChanged && !isSubmitting) {
      setIsSubmitting(true);
      try {
        const parsedSectorId = sectorId ? parseInt(sectorId) : null;
        await onSubmit(
          boardId, 
          name.trim(), 
          detalhes.trim() || null, 
          parsedSectorId, 
          dtatv || null, 
          workspaceId || undefined,
          assignedUserSeqid || null,
          previsto || null
        );
        onClose();
      } catch (err) {
        console.error('Erro ao renomear/atualizar setor:', err);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose} title="Fechar">&times;</button>
        
        <div className={styles.content}>
          <div className={styles.formSection}>
            <h2>Atualização da Atividade</h2>
            <p className={styles.subtitle}>
              Atualize as definições deste painel de atividades para manter seu fluxo sempre alinhado.
            </p>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label>Nome da Atividade</label>
                <textarea 
                  name="boardName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      (document.querySelector('textarea[name="boardDetalhes"]') as HTMLElement)?.focus();
                    }
                  }}
                  placeholder="Ex: Acompanhamento de Obras, CRM de Clientes..."
                  required
                  rows={2}
                  style={{ resize: 'vertical' }}
                  autoFocus
                />
                <span className={styles.hint}>O nome será atualizado em todas as visualizações instantaneamente.</span>
              </div>

              <div className={styles.field}>
                <label>Informações</label>
                <textarea 
                  name="boardDetalhes"
                  value={detalhes}
                  onChange={(e) => setDetalhes(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      (document.querySelector('select[name="boardSector"]') as HTMLElement)?.focus();
                    }
                  }}
                  placeholder="Adicione informações, links, detalhes ou observações gerais desta atividade..."
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
                <span className={styles.hint}>Descreva observações gerais ou links de referência para esta atividade.</span>
              </div>

              <div className={styles.field}>
                <label>Setor Responsável</label>
                <select 
                  name="boardSector"
                  value={sectorId}
                  onChange={(e) => setSectorId(e.target.value)}
                >
                  <option value="">Nenhum Setor / Geral</option>
                  {sectorsList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.acronym})
                    </option>
                  ))}
                </select>
                <span className={styles.hint}>Reclassifique esta atividade no setor institucional correto.</span>
              </div>

              <div className={styles.field}>
                <label>Colaborador Responsável</label>
                <select 
                  name="boardAssignee"
                  value={assignedUserSeqid}
                  onChange={(e) => setAssignedUserSeqid(e.target.value)}
                >
                  <option value="">Nenhum / Sem responsável</option>
                  {membersList.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
                <span className={styles.hint}>Delegue esta atividade para um colaborador da Área de Trabalho.</span>
              </div>

              <div className={styles.field}>
                <label>Área de Trabalho (Workspace)</label>
                <select 
                  name="boardWorkspace"
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                  required
                >
                  {workspaces.map(w => (
                    <option key={w.id} value={w.seqid?.toString() || w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                <span className={styles.hint}>Mova esta atividade para outra Área de Trabalho.</span>
              </div>

              <div className={styles.field}>
                <label>Data de Início</label>
                <input 
                  type="date" 
                  max="9999-12-31"
                  value={dtatv}
                  onChange={(e) => setDtatv(e.target.value)}
                />
                <span className={styles.hint}>Defina ou altere a data em que esta atividade foi iniciada.</span>
              </div>

              <div className={styles.field}>
                <label>Data Prevista</label>
                <input 
                  type="date" 
                  max="9999-12-31"
                  value={previsto}
                  onChange={(e) => setPrevisto(e.target.value)}
                />
                <span className={styles.hint}>Defina ou altere a data prevista de conclusão.</span>
              </div>

              <div className={styles.buttonGroup}>
                <button 
                  type="button" 
                  className={styles.cancelBtn} 
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className={styles.submitBtn}
                  disabled={!name.trim() || !isChanged || isSubmitting}
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Alteração'}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
