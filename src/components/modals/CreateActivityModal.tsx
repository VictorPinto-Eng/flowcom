'use client';

import { useState, useEffect } from 'react';
import { getSectorsAction } from '@/app/actions/boardActions';
import styles from './CreateActivityModal.module.css';

export interface SectorType {
  id: number;
  name: string;
  acronym: string;
  active: boolean;
}

interface CreateActivityModalProps {
  workspaceName: string;
  sectors: SectorType[];
  onSubmit: (name: string, sectorId?: number, detalhes?: string, dtatv?: string, previsto?: string) => void;
  onClose: () => void;
}

export default function CreateActivityModal({ workspaceName, sectors, onSubmit, onClose }: CreateActivityModalProps) {
  const [name, setName] = useState('');
  const [detalhes, setDetalhes] = useState('');
  const [sectorId, setSectorId] = useState<string>('');
  const [dtatv, setDtatv] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [previsto, setPrevisto] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [sectorsList, setSectorsList] = useState<SectorType[]>(sectors || []);

  useEffect(() => {
    getSectorsAction()
      .then(data => {
        if (data) {
          setSectorsList(data as SectorType[]);
        }
      })
      .catch(err => console.error('Erro ao buscar setores online:', err));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(
        name.trim(),
        sectorId ? parseInt(sectorId) : undefined,
        detalhes.trim() || undefined,
        dtatv || undefined,
        previsto || undefined
      );
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        
        <div className={styles.formSection}>
          <h2>Criar Nova Atividade</h2>
          <p className={styles.subtitle}>
            Crie um novo painel em <strong>{workspaceName}</strong> para organizar seus serviços, cronogramas e entregas em tempo real.
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label>Nome da Atividade</label>
              <input 
                type="text" 
                placeholder="Ex: Acompanhamento Técnico, CRM de Vendas..." 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
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
              <label>Setor da Atividade <span>Opcional</span></label>
              <select 
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
              <span className={styles.hint}>Classifique esta atividade no setor correto.</span>
            </div>

            <div className={styles.field}>
              <label>Data de Início</label>
              <input 
                type="date" 
                max="9999-12-31"
                value={dtatv}
                onChange={(e) => setDtatv(e.target.value)}
              />
              <span className={styles.hint}>Defina a data inicial para a atividade.</span>
            </div>

            <div className={styles.field}>
              <label>Data Prevista</label>
              <input 
                type="date" 
                max="9999-12-31"
                value={previsto}
                onChange={(e) => setPrevisto(e.target.value)}
              />
              <span className={styles.hint}>Defina a data prevista de conclusão (D+1 por padrão).</span>
            </div>

            <div className={styles.buttonGroup}>
              <button 
                type="button" 
                className={styles.cancelBtn} 
                onClick={onClose}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className={styles.submitBtn}
                disabled={!name.trim()}
              >
                Criar Atividade
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
