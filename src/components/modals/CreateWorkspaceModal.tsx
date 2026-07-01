'use client';

import { useState } from 'react';
import styles from './CreateWorkspaceModal.module.css';
import { WorkspaceType } from '@prisma/client';

interface CreateWorkspaceModalProps {
  types: WorkspaceType[];
  onSubmit: (data: { name: string, typeId: string, description: string }) => void;
  onClose: () => void;
}

export default function CreateWorkspaceModal({ types, onSubmit, onClose }: CreateWorkspaceModalProps) {
  const [name, setName] = useState('');
  const [typeId, setTypeId] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && typeId) {
      onSubmit({ name, typeId, description });
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        
        <div className={styles.content}>
          <div className={styles.formSection}>
            <h2>Vamos criar uma Área de trabalho</h2>
            <p className={styles.subtitle}>
              Aumente sua produtividade facilitando o acesso de todos aos quadros em um só local.
            </p>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label>Nome da Área de trabalho</label>
                <input 
                  type="text" 
                  placeholder="Taco e Cia" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <span className={styles.hint}>O nome de sua empresa, equipe ou organização.</span>
              </div>

              <div className={styles.field}>
                <label>Tipo de área de trabalho</label>
                <select 
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value)}
                  required
                >
                  <option value="" disabled>Escolher...</option>
                  {types.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label>Descrição da Área de trabalho <span>Opcional</span></label>
                <textarea 
                  placeholder="Nossa equipe organiza tudo aqui."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <span className={styles.hint}>Motive seus membros com algumas palavras sobre sua Área de trabalho.</span>
              </div>

              <button 
                type="submit" 
                className={styles.submitBtn}
                disabled={!name || !typeId}
              >
                Continuar
              </button>
            </form>
          </div>

          <div className={styles.visualSection}>
            <div className={styles.previewContainer}>
              <div className={styles.previewCard}>
                <div className={styles.previewHeader}>
                  <div className={styles.previewDots}>
                    <span className={styles.dotRed} />
                    <span className={styles.dotYellow} />
                    <span className={styles.dotGreen} />
                  </div>
                  <span className={styles.previewBoardName}>{name || 'Nova Área de Trabalho'}</span>
                </div>
                <div className={styles.previewColumns}>
                  <div className={styles.previewColumn}>
                    <div className={styles.columnHeader}>A Fazer</div>
                    <div className={`${styles.previewTaskCard} ${styles.float1}`}>
                      <span className={styles.badge} style={{ background: 'rgba(124, 58, 237, 0.2)', color: '#a78bfa' }}>Design</span>
                      <p className={styles.taskTitle}>Criar Protótipos UI</p>
                      <div className={styles.taskFooter}>
                        <div className={styles.miniAvatar}>VP</div>
                      </div>
                    </div>
                    <div className={`${styles.previewTaskCard} ${styles.float2}`}>
                      <span className={styles.badge} style={{ background: 'rgba(14, 165, 233, 0.2)', color: '#38bdf8' }}>Dev</span>
                      <p className={styles.taskTitle}>Configurar Banco Postgres</p>
                      <div className={styles.taskFooter}>
                        <div className={styles.miniAvatar}>JS</div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.previewColumn}>
                    <div className={styles.columnHeader}>Em Progresso</div>
                    <div className={`${styles.previewTaskCard} ${styles.float3}`}>
                      <span className={styles.badge} style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6' }}>Marketing</span>
                      <p className={styles.taskTitle}>Lançamento do FLOW</p>
                      <div className={styles.taskFooter}>
                        <div className={styles.miniAvatar}>AL</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={styles.glowOrb1} />
              <div className={styles.glowOrb2} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
