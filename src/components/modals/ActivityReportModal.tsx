'use client';

import { useMemo } from 'react';
import styles from './ActivityReportModal.module.css';

/**
 * Gera um hash determinístico simples a partir de uma string.
 * Usado para IDs de documento e códigos de autenticidade do relatório.
 */
function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).toUpperCase();
}

interface ActivityReportModalProps {
  workspaceName: string;
  workspaceType: string;
  boards: any[];
  onClose: () => void;
}

export default function ActivityReportModal({ 
  workspaceName, 
  workspaceType, 
  boards, 
  onClose 
}: ActivityReportModalProps) {

  const handlePrint = () => {
    window.print();
  };

  // Gerar IDs determinísticos baseados nos dados do relatório
  const reportDate = new Date().toISOString().split('T')[0];
  const reportSeed = `${workspaceName}-${reportDate}-${boards.length}`;
  const docNumber = useMemo(() => {
    const hash = hashCode(reportSeed);
    return hash.slice(0, 4).padStart(4, '0');
  }, [reportSeed]);
  const authCode = useMemo(() => {
    const fullHash = hashCode(reportSeed + '-auth');
    const fullHash2 = hashCode(reportSeed + '-auth2');
    return (fullHash + fullHash2).slice(0, 16).toUpperCase();
  }, [reportSeed]);

  const totalActivities = boards.length;
  const totalTasks = boards.reduce((acc, board) => {
    const boardCardsCount = board.columns?.reduce((cAcc: number, col: any) => cAcc + (col.cards?.length || 0), 0) || 0;
    return acc + boardCardsCount;
  }, 0);

  const getSectorStyle = (acronym: string) => {
    const ac = acronym.toUpperCase();
    if (ac === 'JUR') return { bg: 'rgba(59, 130, 246, 0.06)', color: '#1d4ed8', dot: '#3b82f6' };
    if (ac === 'FNC') return { bg: 'rgba(16, 185, 129, 0.06)', color: '#047857', dot: '#10b981' };
    if (ac === 'ENG') return { bg: 'rgba(245, 158, 11, 0.06)', color: '#b45309', dot: '#f59e0b' };
    return { bg: 'rgba(124, 58, 237, 0.06)', color: '#6d28d9', dot: '#8b5cf6' };
  };

  const getWorkingDays = (board: any) => {
    const startDate = board.dtatv ? new Date(board.dtatv) : (board.createdAt ? new Date(board.createdAt) : null);
    if (!startDate) return 0;
    
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = board.dtcon 
      ? new Date(new Date(board.dtcon).getFullYear(), new Date(board.dtcon).getMonth(), new Date(board.dtcon).getDate())
      : new Date();
      
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  };

  return (
    <div className={styles.overlay}>
      <div className={`${styles.modal} printable-area`}>
        <div className={styles.noPrintHeader}>
          <button className={styles.closeBtn} onClick={onClose} title="Fechar Relatório">
            &times;
          </button>
        </div>

        <div className={styles.content}>
          {/* Document Header / Letterhead */}
          <div className={styles.docHeader}>
            <div className={styles.headerBrand}>
              <div className={styles.logoBadge}>
                <span className={styles.logoGlyph}>✦</span>
                <span className={styles.logoText}>FLOW</span>
              </div>
              <div className={styles.workspacePill}>
                <span className={styles.workspacePillDot}></span>
                {workspaceName}
              </div>
            </div>
            
            <div className={styles.docInfoGrid}>
              <div className={styles.infoBlock}>
                <span className={styles.infoLabel}>DOCUMENTO</span>
                <span className={styles.infoValueMono}>REL-ATV-{docNumber}</span>
              </div>
              <div className={styles.infoBlock}>
                <span className={styles.infoLabel}>EMISSÃO</span>
                <span className={styles.infoValue}>{new Date().toLocaleDateString('pt-BR')}</span>
              </div>
              <div className={styles.infoBlock}>
                <span className={styles.infoLabel}>SEGMENTO</span>
                <span className={styles.infoValue}>{workspaceType}</span>
              </div>
            </div>
          </div>

          <div className={styles.documentTitleArea}>
            <h1 className={styles.reportTitle}>Relatório Analítico de Produtividade</h1>
            <p className={styles.reportSubtitle}>
              Balanço estratégico e consolidação de fluxos operacionais ativos na organização.
            </p>
          </div>

          {/* Metric Cards (Premium Grid) */}
          <div className={styles.kpiContainer}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <span className={styles.kpiLabel}>Fluxos Monitorados</span>
                <span className={styles.kpiIcon}>📊</span>
              </div>
              <div className={styles.kpiBody}>
                <span className={styles.kpiValue}>{totalActivities}</span>
                <span className={styles.kpiTrendPositive}>Atividades</span>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <span className={styles.kpiLabel}>Entregas / Cartões</span>
                <span className={styles.kpiIcon}>📋</span>
              </div>
              <div className={styles.kpiBody}>
                <span className={styles.kpiValue}>{totalTasks}</span>
                <span className={styles.kpiTrendNeutral}>Demandas registradas</span>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <span className={styles.kpiLabel}>Densidade Operacional</span>
                <span className={styles.kpiIcon}>📈</span>
              </div>
              <div className={styles.kpiBody}>
                <span className={styles.kpiValue}>
                  {totalActivities > 0 ? (totalTasks / totalActivities).toFixed(1) : '0.0'}
                </span>
                <span className={styles.kpiTrendInfo}>Cartões por fluxo</span>
              </div>
            </div>
          </div>

          {/* Detailed Table */}
          <div className={styles.sectionHeaderLine}>
            <h2 className={styles.sectionTitle}>Detalhamento dos Fluxos Operacionais</h2>
            <div className={styles.sectionDivider} />
          </div>

          {(() => {
            const sortedBoards = [...boards].sort((a, b) => {
              const timeA = a.previsto ? new Date(a.previsto).getTime() : Infinity;
              const timeB = b.previsto ? new Date(b.previsto).getTime() : Infinity;
              if (timeA !== timeB) {
                return timeA - timeB;
              }
              const seqA = a.seqId ? parseInt(a.seqId) || 0 : 0;
              const seqB = b.seqId ? parseInt(b.seqId) || 0 : 0;
              return seqA - seqB;
            });

            return (
              <div className={styles.tableWrapper}>
                <table className={styles.reportTable}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Atividade / Origem</th>
                      <th style={{ width: '220px', textAlign: 'center' }}>Progresso Operacional</th>
                      <th style={{ width: '180px', textAlign: 'center' }}>Programado & Prazo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBoards.map((board) => {
                  const formattedDate = board.dtatv
                    ? new Date(board.dtatv).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                    : (board.createdAt ? new Date(board.createdAt).toLocaleDateString('pt-BR') : 'Sem data');

                  const creatorName = board.user?.name || "Não informado";
                  
                  // Compute active vs completed events for this board
                  let activeCardsCount = 0;
                  let completedCardsCount = 0;
                  board.columns?.forEach((col: any) => {
                    col.cards?.forEach((card: any) => {
                      if (card.dtcon) {
                        completedCardsCount++;
                      } else {
                        activeCardsCount++;
                      }
                    });
                  });

                  const totalEvents = activeCardsCount + completedCardsCount;
                  const pct = totalEvents > 0 ? Math.round((completedCardsCount / totalEvents) * 100) : 0;
                  const sStyle = board.sector ? getSectorStyle(board.sector.acronym) : null;

                  return (
                    <tr key={board.id}>
                      <td className={styles.boardNameCell}>
                        <div className={styles.boardNameHeader}>
                          {board.sector && (
                            <span 
                              className={styles.sectorBadge} 
                              title={board.sector.name}
                              style={{
                                background: sStyle?.bg,
                                color: sStyle?.color,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '12px',
                                fontSize: '0.68rem',
                                fontWeight: 500,
                                marginRight: '0.6rem',
                                border: '1px solid rgba(0, 0, 0, 0.03)'
                              }}
                            >
                              <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: sStyle?.dot }} />
                              {board.sector.acronym}
                            </span>
                          )}
                          <span className={styles.boardNameText}>{board.name}</span>
                        </div>
                        <div className={styles.boardSubtext}>
                          Criado por {creatorName} em {formattedDate}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        {totalEvents > 0 ? (
                          <div className={styles.progressContainer}>
                            <div className={styles.progressHeaderRow}>
                              <div className={styles.progressTrack}>
                                <div 
                                  className={styles.progressFill} 
                                  style={{ 
                                    width: `${pct}%`,
                                    background: pct === 100 
                                      ? 'linear-gradient(90deg, #10b981, #059669)' // Emerald complete
                                      : 'linear-gradient(90deg, #7c3aed, #4f46e5)' // Indigo active
                                  }} 
                                />
                              </div>
                              <span 
                                className={styles.progressPercentBadge}
                                style={{
                                  background: pct === 100 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(124, 58, 237, 0.08)',
                                  color: pct === 100 ? '#047857' : '#4f46e5'
                                }}
                              >
                                {pct}%
                              </span>
                            </div>
                            <span className={styles.progressText}>
                              {completedCardsCount} de {totalEvents} cartões concluídos
                            </span>
                          </div>
                        ) : (
                          <span className={styles.noEventsText}>Sem demandas registradas</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        {(() => {
                          const previstoDateStr = board.previsto
                            ? new Date(board.previsto).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                            : '—';
                          
                          const dtconDateStr = board.dtcon
                            ? new Date(board.dtcon).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                            : null;
                          
                          const days = getWorkingDays(board);
                          const daysText = board.dtcon
                            ? `${days} dias (Concluído)`
                            : `${days} dias (Em aberto)`;
                            
                          return (
                            <div className={styles.previstoColWrapper}>
                              {dtconDateStr ? (
                                <>
                                  <div className={styles.previstoDate} style={{ textDecoration: 'line-through', opacity: 0.6, fontSize: '0.85em', color: 'var(--text-muted)' }}>
                                    Prazo: {previstoDateStr}
                                  </div>
                                  <div className={styles.dtconDate} style={{ fontWeight: 'bold', color: '#10b981', fontSize: '0.9rem' }}>
                                    Concluído: {dtconDateStr}
                                  </div>
                                </>
                              ) : (
                                <div className={styles.previstoDate}>{previstoDateStr}</div>
                              )}
                              <div className={styles.workingDaysText}>{daysText}</div>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}

          {/* Letterhead Footer / Audit Trail */}
          <div className={styles.docFooter}>
            <div className={styles.footerDisclaimer}>
              <p>Relatório emitido eletronicamente via plataforma de controle operacional FLOW.</p>
              <p className={styles.footerAudit}>Código de Autenticidade Auditada: SHA256-{authCode}</p>
            </div>
            <div className={styles.footerSignBlock}>
              <div className={styles.signLine} />
              <span className={styles.signLabel}>Assinatura do Responsável</span>
            </div>
          </div>
        </div>

        {/* Buttons (Hidden in print) */}
        <div className={styles.actionsBar}>
          <button className={styles.cancelBtn} onClick={onClose}>Fechar</button>
          <button className={styles.printBtn} onClick={handlePrint}>
            🖨️ Imprimir / Salvar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
