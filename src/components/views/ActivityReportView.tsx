'use client';

import React, { useState, useMemo } from 'react';
import styles from './ActivityReportView.module.css';

interface ActivityReportViewProps {
  board: {
    id: string;
    seqId: string;
    name: string;
    detalhes?: string | null;
    dtatv?: string | Date | null;
    previsto?: string | Date | null;
    dtcon?: string | Date | null;
    createdAt?: string | Date | null;
    columns?: any[];
    workspaceName?: string;
    user?: { name: string } | null;
    sector?: { name: string; acronym: string } | null;
  };
  onBack: () => void;
}

export default function ActivityReportView({ board, onBack }: ActivityReportViewProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Extrair todos os cards do board
  const allCards = useMemo(() => {
    if (!board.columns) return [];
    const cards: any[] = [];
    board.columns.forEach((col: any) => {
      (col.cards || []).forEach((card: any) => {
        cards.push({
          ...card,
          columnName: col.title,
          columnId: col.id
        });
      });
    });
    return cards;
  }, [board.columns]);

  // KPIs
  const stats = useMemo(() => {
    const total = allCards.length;
    const completed = allCards.filter(c => c.dtcon).length;
    const pending = total - completed;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let overdue = 0;
    allCards.forEach(c => {
      if (c.dtcon) return;
      if (!c.previsto) return;
      const dateStr = new Date(c.previsto).toISOString().split('T')[0];
      const [y, m, d] = dateStr.split('-').map(Number);
      const expected = new Date(y, m - 1, d);
      expected.setHours(0, 0, 0, 0);
      if (expected < today) overdue++;
    });

    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    let daysOpen = 0;
    if (board.dtatv) {
      const start = new Date(board.dtatv);
      const end = board.dtcon ? new Date(board.dtcon) : new Date();
      daysOpen = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (daysOpen < 0) daysOpen = 0;
    }

    return { total, completed, pending, overdue, progress, daysOpen };
  }, [allCards, board.dtatv, board.dtcon]);

  const sortedCards = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return [...allCards].sort((a, b) => {
      if (a.dtcon && !b.dtcon) return 1;
      if (!a.dtcon && b.dtcon) return -1;

      if (!a.dtcon && !b.dtcon) {
        if (a.previsto && b.previsto) {
          return new Date(a.previsto).getTime() - new Date(b.previsto).getTime();
        }
        if (a.previsto) return -1;
        if (b.previsto) return 1;
      }

      return 0;
    });
  }, [allCards]);

  const getCardStatus = (card: any) => {
    if (card.dtcon) return { label: 'Concluído', className: styles.statusSuccess, icon: '✅' };
    if (!card.previsto) return { label: 'Sem prazo', className: styles.statusNormal, icon: '⏱️' };

    const dateStr = new Date(card.previsto).toISOString().split('T')[0];
    const [y, m, d] = dateStr.split('-').map(Number);
    const expected = new Date(y, m - 1, d);
    expected.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expected < today) return { label: 'Atrasado', className: styles.statusDanger, icon: '🔴' };
    if (expected.getTime() === today.getTime()) return { label: 'Vence hoje', className: styles.statusWarning, icon: '🟡' };
    return { label: 'No prazo', className: styles.statusNormal, icon: '⏱️' };
  };

  const getCardAge = (card: any) => {
    const start = card.dtatv ? new Date(card.dtatv) : (card.createdAt ? new Date(card.createdAt) : null);
    if (!start) return '—';
    const end = card.dtcon ? new Date(card.dtcon) : new Date();
    const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return `${days >= 0 ? days : 0}d`;
  };

  const formatDate = (d: any) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const toggleExpand = (cardId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const handleGeneratePdf = async () => {
    const pdfWindow = window.open('', '_blank');
    if (!pdfWindow) return;

    pdfWindow.document.write('<html><head><title>Gerando PDF...</title><style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;color:#475569;background:#f8fafc}.spinner{border:4px solid #e2e8f0;border-top:4px solid #6366f1;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin-bottom:15px}@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style></head><body><div class="spinner"></div><div>Gerando relatório PDF...</div></body></html>');
    pdfWindow.document.close();

    try {
      await new Promise<void>((resolve, reject) => {
        if ((window as any).html2pdf) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load html2pdf'));
        document.head.appendChild(script);
      });

      const now = new Date();
      const anoMesDia = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const filename = `relatorio_${board.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}_${anoMesDia}.pdf`;

      const cardRows = sortedCards.map(card => {
        const status = getCardStatus(card);
        const assignedName = card.task_user?.name || 'Não atribuído';
        const previstoStr = formatDate(card.previsto);
        const dtconStr = card.dtcon ? formatDate(card.dtcon) : '';
        const age = getCardAge(card);

        let actionsHtml = '';
        if (card.card_act && card.card_act.length > 0) {
          const actLines = card.card_act.slice(0, 5).map((act: any) => {
            const actDate = act.created_at ? new Date(act.created_at).toLocaleDateString('pt-BR') : '';
            const actUser = act.users?.name || 'Sistema';
            return `<div style="font-size:8px;color:#64748b;padding:1px 0;">${actDate} - ${actUser}: ${act.description || ''}</div>`;
          }).join('');
          actionsHtml = `<div style="margin-top:4px;padding-left:8px;border-left:2px solid #e2e8f0;">${actLines}</div>`;
        }

        const statusColor = status.label === 'Atrasado' ? '#ef4444' : status.label === 'Vence hoje' ? '#f59e0b' : status.label === 'Concluído' ? '#10b981' : '#64748b';

        return `<tr style="page-break-inside:avoid;">
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:9px;vertical-align:top;">${card.title}${actionsHtml}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:9px;vertical-align:top;">${assignedName}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:9px;vertical-align:top;">${previstoStr}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:9px;vertical-align:top;">${dtconStr}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:9px;font-weight:600;color:${statusColor};vertical-align:top;">${status.label} (${age})</td>
        </tr>`;
      }).join('');

      const responsavel = board.user?.name || '—';
      const area = board.workspaceName || '—';

      const htmlContent = `<div style="width:710px;padding:15px;background:white;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;">
        <div style="border-bottom:2px solid #cbd5e1;padding-bottom:12px;margin-bottom:16px;">
          <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:4px;">📊 Relatório de Situação</div>
          <div style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:6px;">${board.name}</div>
          <div style="font-size:10px;color:#64748b;display:flex;gap:16px;">
            <span>Área: <strong>${area}</strong></span>
            <span>Responsável: <strong>${responsavel}</strong></span>
            <span>Início: <strong>${formatDate(board.dtatv)}</strong></span>
            <span>Previsto: <strong>${formatDate(board.previsto)}</strong></span>
            ${board.dtcon ? `<span>Concluído: <strong>${formatDate(board.dtcon)}</strong></span>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 14px;text-align:center;">
            <div style="font-size:18px;font-weight:700;color:#0f172a;">${stats.total}</div>
            <div style="font-size:8px;color:#64748b;text-transform:uppercase;">Eventos</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 14px;text-align:center;">
            <div style="font-size:18px;font-weight:700;color:#10b981;">${stats.completed}</div>
            <div style="font-size:8px;color:#64748b;text-transform:uppercase;">Concluídos</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 14px;text-align:center;">
            <div style="font-size:18px;font-weight:700;color:#64748b;">${stats.pending}</div>
            <div style="font-size:8px;color:#64748b;text-transform:uppercase;">Pendentes</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 14px;text-align:center;">
            <div style="font-size:18px;font-weight:700;color:#ef4444;">${stats.overdue}</div>
            <div style="font-size:8px;color:#64748b;text-transform:uppercase;">Atrasados</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 14px;text-align:center;">
            <div style="font-size:18px;font-weight:700;color:#6366f1;">${stats.progress}%</div>
            <div style="font-size:8px;color:#64748b;text-transform:uppercase;">Progresso</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 14px;text-align:center;">
            <div style="font-size:18px;font-weight:700;color:#0f172a;">${stats.daysOpen}</div>
            <div style="font-size:8px;color:#64748b;text-transform:uppercase;">Dias</div>
          </div>
        </div>
        <div style="margin-bottom:12px;background:#f1f5f9;border-radius:4px;height:8px;overflow:hidden;">
          <div style="height:100%;background:#10b981;width:${stats.progress}%;border-radius:4px;"></div>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #cbd5e1;">
          <thead><tr style="background:#f1f5f9;">
            <th style="padding:8px;text-align:left;border-bottom:1px solid #cbd5e1;font-size:9px;font-weight:700;text-transform:uppercase;">Evento</th>
            <th style="padding:8px;text-align:left;border-bottom:1px solid #cbd5e1;font-size:9px;font-weight:700;text-transform:uppercase;width:90px;">Responsável</th>
            <th style="padding:8px;text-align:left;border-bottom:1px solid #cbd5e1;font-size:9px;font-weight:700;text-transform:uppercase;width:80px;">Programado</th>
            <th style="padding:8px;text-align:left;border-bottom:1px solid #cbd5e1;font-size:9px;font-weight:700;text-transform:uppercase;width:80px;">Conclusão</th>
            <th style="padding:8px;text-align:left;border-bottom:1px solid #cbd5e1;font-size:9px;font-weight:700;text-transform:uppercase;width:80px;">Status</th>
          </tr></thead>
          <tbody>${cardRows}</tbody>
        </table>
        <div style="margin-top:16px;border-top:1px solid #cbd5e1;padding-top:10px;">
          <div style="font-size:8px;color:#64748b;">Emitido em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · #${board.seqId}</div>
        </div>
      </div>`;

      const opt = {
        margin: [6, 6, 6, 6],
        filename,
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { scale: 1.5, useCORS: true, logging: false, allowTaint: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr'] }
      };

      const html2pdf = (window as any).html2pdf;
      const pdfBlob = await html2pdf()
        .from(htmlContent)
        .set(opt)
        .toPdf()
        .get('pdf')
        .then((pdfObj: any) => {
          pdfObj.setProperties({ title: `Relatório - ${board.name}` });
          return pdfObj;
        })
        .output('blob');

      const blobUrl = URL.createObjectURL(pdfBlob);
      pdfWindow.location.replace(blobUrl);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      pdfWindow.close();
    }
  };

  if (!board || !board.columns) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>Dados da atividade não disponíveis.</p>
          <button className={styles.backBtn} onClick={onBack}>← Voltar</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2>📊 Situação da Atividade</h2>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            {board.name}
          </div>
          <div className={styles.headerMeta}>
            <span className={styles.headerMetaItem}>📂 {board.workspaceName || '—'}</span>
            <span className={styles.headerMetaItem}>👤 {board.user?.name || '—'}</span>
            <span className={styles.headerMetaItem}>📅 Início: {formatDate(board.dtatv)}</span>
            <span className={styles.headerMetaItem}>🎯 Previsto: {formatDate(board.previsto)}</span>
            {board.dtcon && <span className={styles.headerMetaItem}>✅ Concluído: {formatDate(board.dtcon)}</span>}
            <span className={styles.headerMetaItem}>#{board.seqId}</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.pdfBtn} onClick={handleGeneratePdf}>📄 PDF</button>
          <button className={styles.backBtn} onClick={onBack}>← Voltar</button>
        </div>
      </div>

      {/* KPIs */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue}>{stats.total}</div>
          <div className={styles.kpiLabel}>Total Eventos</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiValue} ${styles.kpiValueSuccess}`}>{stats.completed}</div>
          <div className={styles.kpiLabel}>Concluídos</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue}>{stats.pending}</div>
          <div className={styles.kpiLabel}>Pendentes</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiValue} ${styles.kpiValueDanger}`}>{stats.overdue}</div>
          <div className={styles.kpiLabel}>Atrasados</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiValue} ${styles.kpiValueSuccess}`}>{stats.progress}%</div>
          <div className={styles.kpiLabel}>Progresso</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue}>{stats.daysOpen}</div>
          <div className={styles.kpiLabel}>Dias em Aberto</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className={styles.progressSection}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${stats.progress}%` }} />
        </div>
        <div className={styles.progressText}>
          {stats.completed} de {stats.total} eventos concluídos
        </div>
      </div>

      {/* Tabela de Eventos */}
      {sortedCards.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Nenhum evento nesta atividade.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.eventsTable}>
            <thead>
              <tr>
                <th>Evento</th>
                <th>Responsável</th>
                <th>Programado</th>
                <th>Conclusão</th>
                <th>Status</th>
                <th>Dias</th>
              </tr>
            </thead>
            <tbody>
              {sortedCards.map(card => {
                const status = getCardStatus(card);
                const isExpanded = expandedCards.has(card.id);
                const hasActions = card.card_act && card.card_act.length > 0;
                const assignedName = card.task_user?.name || 'Não atribuído';

                return (
                  <React.Fragment key={card.id}>
                    <tr
                      className={styles.eventRow}
                      onClick={() => toggleExpand(card.id)}
                      title={hasActions ? 'Clique para ver andamentos' : undefined}
                    >
                      <td>
                        <span className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
                        <span className={styles.eventTitle}>{card.title}</span>
                        <div className={styles.eventId}>#{card.seqid || card.id}</div>
                      </td>
                      <td>{assignedName}</td>
                      <td>{formatDate(card.previsto)}</td>
                      <td>{card.dtcon ? formatDate(card.dtcon) : '—'}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${status.className}`}>
                          {status.icon} {status.label}
                        </span>
                      </td>
                      <td>{getCardAge(card)}</td>
                    </tr>
                    {isExpanded && (
                      <tr className={styles.actionsPanel}>
                        <td colSpan={6}>
                          <div className={styles.actionsList}>
                            {!hasActions ? (
                              <div className={styles.emptyActions}>Nenhum andamento registrado.</div>
                            ) : (
                              card.card_act.map((act: any) => (
                                <div key={act.seqid} className={styles.actionItem}>
                                  <span className={styles.actionDate}>
                                    {act.created_at ? new Date(act.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                                  </span>
                                  <span className={styles.actionText}>{act.description || '—'}</span>
                                  <span className={styles.actionUser}>{act.users?.name || 'Sistema'}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
