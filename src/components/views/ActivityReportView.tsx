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

  // Parecer Técnico Executivo — interpreta dados e fornece recomendações
  const parecer = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getDaysOverdue = (card: any) => {
      if (!card.previsto || card.dtcon) return 0;
      const dateStr = new Date(card.previsto).toISOString().split('T')[0];
      const [y, m, d] = dateStr.split('-').map(Number);
      const expected = new Date(y, m - 1, d);
      expected.setHours(0, 0, 0, 0);
      if (expected >= today) return 0;
      return Math.floor((today.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24));
    };

    const getDaysToDue = (card: any) => {
      if (!card.previsto || card.dtcon) return null;
      const dateStr = new Date(card.previsto).toISOString().split('T')[0];
      const [y, m, d] = dateStr.split('-').map(Number);
      const expected = new Date(y, m - 1, d);
      expected.setHours(0, 0, 0, 0);
      return Math.ceil((expected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    };

    const overduePercent = stats.total > 0 ? (stats.overdue / stats.total) * 100 : 0;
    const boardPrevisto = board.previsto ? new Date(board.previsto) : null;
    const boardOverdue = boardPrevisto && boardPrevisto < today && !board.dtcon;
    const boardExpiresIn = boardPrevisto ? Math.ceil((boardPrevisto.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

    // Classificação (semáforo)
    let classification: 'verde' | 'amarelo' | 'vermelho' = 'verde';
    if (boardOverdue || overduePercent > 30) classification = 'vermelho';
    else if (stats.overdue > 0 || (boardExpiresIn !== null && boardExpiresIn <= 3 && boardExpiresIn >= 0)) classification = 'amarelo';
    else if (stats.progress < 50 && stats.total > 0) classification = 'amarelo';

    const classificationLabel = classification === 'verde' ? '✅ OK' : classification === 'amarelo' ? '🟡 ATENÇÃO' : '🔴 CRÍTICO';

    // Status resumido
    let status: string;
    if (stats.total === 0) {
      status = 'Atividade sem eventos cadastrados.';
    } else if (stats.completed === stats.total) {
      status = 'Atividade 100% concluída. Todos os eventos foram finalizados dentro dos prazos.';
    } else if (classification === 'vermelho') {
      status = `A atividade apresenta sinais críticos: ${stats.overdue} ${stats.overdue === 1 ? 'evento atrasado' : 'eventos atrasados'} ${boardOverdue ? 'e o prazo da atividade já foi ultrapassado' : ''}. Risco real de não cumprir o prazo final.`;
    } else if (classification === 'amarelo') {
      status = `A atividade progride, porém apresenta pontos de atenção${stats.overdue > 0 ? ` (${stats.overdue} atrasado${stats.overdue === 1 ? '' : 's'})` : ''}${boardExpiresIn !== null && boardExpiresIn <= 3 && boardExpiresIn >= 0 ? ` e o prazo vence em ${boardExpiresIn} ${boardExpiresIn === 1 ? 'dia' : 'dias'}` : ''}.`;
    } else {
      status = `A atividade está saudável: ${stats.progress}% concluído${stats.overdue === 0 ? ', sem eventos atrasados' : ''}. O ritmo de execução está dentro do esperado.`;
    }

    // Pontos Críticos (top 3 atrasados)
    const criticalEvents = allCards
      .filter(c => !c.dtcon && getDaysOverdue(c) > 0)
      .sort((a, b) => getDaysOverdue(b) - getDaysOverdue(a))
      .slice(0, 3);

    // Oportunidades
    const opportunities: { icon: string; text: string }[] = [];
    if (stats.progress >= 50 && stats.progress < 100) {
      opportunities.push({ icon: '✓', text: `${stats.progress}% dos eventos já concluídos — ritmo consistente.` });
    }
    if (stats.progress === 100) {
      opportunities.push({ icon: '🏆', text: 'Atividade totalmente concluída.' });
    }
    const unassignedCount = allCards.filter(c => !c.dtcon && !c.task_user).length;
    if (unassignedCount > 0) {
      opportunities.push({ icon: '👤', text: `${unassignedCount} ${unassignedCount === 1 ? 'evento pendente sem responsável' : 'eventos pendentes sem responsável'} — oportunidade de designação.` });
    }
    const nearDueEvents = allCards.filter(c => !c.dtcon && getDaysToDue(c) !== null && getDaysToDue(c)! <= 2 && getDaysToDue(c)! >= 0);
    if (nearDueEvents.length > 0) {
      opportunities.push({ icon: '⏰', text: `${nearDueEvents.length} ${nearDueEvents.length === 1 ? 'evento vence' : 'eventos vencem'} em até 2 dias — atenção ao prazo.` });
    }

    // Recomendação
    let recomendacao: string;
    if (criticalEvents.length > 0) {
      const top = criticalEvents[0];
      const days = getDaysOverdue(top);
      const resp = top.task_user?.name || 'sem responsável';
      recomendacao = `Priorizar "${top.title}" (atrasado há ${days} ${days === 1 ? 'dia' : 'dias'}, responsável: ${resp}). Considerar reatribuição ou reagendamento. ${unassignedCount > 0 ? `Designar responsável para ${unassignedCount} evento${unassignedCount === 1 ? '' : 's'} pendente${unassignedCount === 1 ? '' : 's'}.` : ''}`;
    } else if (unassignedCount > 0) {
      recomendacao = `Designar responsável para ${unassignedCount} evento${unassignedCount === 1 ? '' : 's'} sem atribuição para evitar atrasos futuros.`;
    } else if (nearDueEvents.length > 0) {
      recomendacao = `Acompanhar de perto ${nearDueEvents.length} evento${nearDueEvents.length === 1 ? '' : 's'} com prazo próximo. Manter comunicação ativa com os responsáveis.`;
    } else if (classification === 'verde') {
      recomendacao = `Manter o ritmo atual de execução. Sem ações críticas necessárias no momento.`;
    } else {
      recomendacao = `Revisar o plano de execução para garantir a conclusão no prazo.`;
    }

    // Previsão (velocidade média + projeção)
    const completedCards = allCards.filter(c => c.dtcon);
    let avgDaysPerCard = 0;
    if (completedCards.length > 0) {
      const totalDays = completedCards.reduce((acc, c) => {
        const start = c.dtatv ? new Date(c.dtatv) : new Date(c.createdAt || today);
        const end = new Date(c.dtcon);
        const days = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        return acc + days;
      }, 0);
      avgDaysPerCard = totalDays / completedCards.length;
    }
    const pendingCount = stats.total - stats.completed;
    const estimatedDaysToComplete = avgDaysPerCard > 0 ? Math.ceil(avgDaysPerCard * pendingCount) : null;
    const estimatedCompletionDate = estimatedDaysToComplete !== null ? (() => {
      const d = new Date(today);
      d.setDate(d.getDate() + estimatedDaysToComplete);
      return d;
    })() : null;
    const daysDeltaBoard = (boardPrevisto && estimatedCompletionDate) ? Math.ceil((estimatedCompletionDate.getTime() - boardPrevisto.getTime()) / (1000 * 60 * 60 * 24)) : null;

    return {
      classification,
      classificationLabel,
      status,
      criticalEvents,
      opportunities,
      recomendacao,
      previsao: {
        velocidade: avgDaysPerCard,
        estimatedDaysToComplete,
        estimatedCompletionDate,
        boardPrevisto: boardPrevisto ? new Date(boardPrevisto) : null,
        daysDeltaBoard
      }
    };
  }, [allCards, stats, board.previsto, board.dtcon]);

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
        ${(() => {
          const cls = parecer.classification;
          const borderColor = cls === 'verde' ? '#10b981' : cls === 'amarelo' ? '#f59e0b' : '#ef4444';
          const bgGrad = cls === 'verde' ? 'rgba(16, 185, 129, 0.05)' : cls === 'amarelo' ? 'rgba(245, 158, 11, 0.05)' : 'rgba(239, 68, 68, 0.05)';

          const criticosHtml = parecer.criticalEvents.map((evt: any) => {
            const dateStr = new Date(evt.previsto).toISOString().split('T')[0];
            const [y, m, d] = dateStr.split('-').map(Number);
            const expected = new Date(y, m - 1, d);
            expected.setHours(0, 0, 0, 0);
            const tRef = new Date();
            tRef.setHours(0, 0, 0, 0);
            const daysOver = Math.floor((tRef.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24));
            const resp = evt.task_user?.name || 'sem responsável';
            return `<li style="font-size:9px;padding:2px 0;color:#1e293b;"><strong>${evt.title}</strong> — atrasado há ${daysOver} ${daysOver === 1 ? 'dia' : 'dias'} · ${resp}</li>`;
          }).join('');

          const oportunidadesHtml = parecer.opportunities.map(o =>
            `<li style="font-size:9px;padding:2px 0;color:#1e293b;">${o.text}</li>`
          ).join('');

          const previsaoHtml = parecer.previsao.estimatedCompletionDate ? `
            <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
              <div style="flex:1;min-width:120px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:6px 10px;">
                <div style="font-size:7px;color:#64748b;text-transform:uppercase;">Velocidade Média</div>
                <div style="font-size:11px;font-weight:700;color:#0f172a;">${parecer.previsao.velocidade.toFixed(1)} dias/evento</div>
              </div>
              <div style="flex:1;min-width:120px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:6px 10px;">
                <div style="font-size:7px;color:#64748b;text-transform:uppercase;">Conclusão Estimada</div>
                <div style="font-size:11px;font-weight:700;color:${parecer.previsao.daysDeltaBoard && parecer.previsao.daysDeltaBoard > 0 ? '#ef4444' : '#10b981'};">${parecer.previsao.estimatedCompletionDate.toLocaleDateString('pt-BR')}</div>
              </div>
            </div>
          ` : '';

          return `
            <div style="background:${bgGrad};border-left:4px solid ${borderColor};border-radius:6px;padding:12px 14px;margin-bottom:16px;page-break-inside:avoid;">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                <div style="font-size:11px;font-weight:700;color:#0f172a;">🩺 Parecer Técnico</div>
                <div style="background:${borderColor};color:white;padding:2px 8px;border-radius:10px;font-size:8px;font-weight:700;">${parecer.classificationLabel}</div>
              </div>
              <div style="font-size:10px;color:#1e293b;line-height:1.5;margin-bottom:8px;">${parecer.status}</div>
              ${criticosHtml ? `<div style="margin-bottom:6px;"><div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:3px;">⚠️ Pontos Críticos</div><ul style="margin:0;padding-left:16px;">${criticosHtml}</ul></div>` : ''}
              ${oportunidadesHtml ? `<div style="margin-bottom:6px;"><div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:3px;">💡 Oportunidades</div><ul style="margin:0;padding-left:16px;">${oportunidadesHtml}</ul></div>` : ''}
              <div style="background:rgba(124,58,237,0.06);border:1px solid rgba(124,58,237,0.2);border-radius:4px;padding:8px 10px;margin-top:6px;">
                <div style="font-size:8px;font-weight:700;color:#7c3aed;text-transform:uppercase;margin-bottom:3px;">🎯 Recomendação</div>
                <div style="font-size:9px;color:#1e293b;line-height:1.5;">${parecer.recomendacao}</div>
              </div>
              ${previsaoHtml}
            </div>
          `;
        })()}
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

      {/* Parecer Técnico Executivo */}
      <div className={`${styles.parecer} ${parecer.classification === 'verde' ? styles.parecerVerde : parecer.classification === 'amarelo' ? styles.parecerAmarelo : styles.parecerVermelho}`}>
        <div className={styles.parecerHeader}>
          <h3 className={styles.parecerTitulo}>🩺 Parecer Técnico</h3>
          <span className={`${styles.classificacao} ${parecer.classification === 'verde' ? styles.classificacaoVerde : parecer.classification === 'amarelo' ? styles.classificacaoAmarelo : styles.classificacaoVermelho}`}>
            {parecer.classificationLabel}
          </span>
        </div>

        <div className={styles.parecerStatus}>{parecer.status}</div>

        {parecer.criticalEvents.length > 0 && (
          <div className={styles.parecerSecao}>
            <div className={styles.parecerSecaoTitulo}>⚠️ Pontos Críticos</div>
            <ul className={styles.parecerLista}>
              {parecer.criticalEvents.map((evt: any) => {
                const dateStr = new Date(evt.previsto).toISOString().split('T')[0];
                const [y, m, d] = dateStr.split('-').map(Number);
                const expected = new Date(y, m - 1, d);
                expected.setHours(0, 0, 0, 0);
                const tRef = new Date();
                tRef.setHours(0, 0, 0, 0);
                const days = Math.floor((tRef.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <li key={evt.id} className={styles.parecerItem}>
                    <span className={styles.parecerItemIcon}>🔴</span>
                    <span className={styles.parecerItemTexto}>
                      <strong>{evt.title}</strong> — atrasado há {days} {days === 1 ? 'dia' : 'dias'}
                      {evt.task_user?.name && ` · responsável: ${evt.task_user.name}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {parecer.opportunities.length > 0 && (
          <div className={styles.parecerSecao}>
            <div className={styles.parecerSecaoTitulo}>💡 Oportunidades</div>
            <ul className={styles.parecerLista}>
              {parecer.opportunities.map((opp, i) => (
                <li key={i} className={styles.parecerItem}>
                  <span className={styles.parecerItemIcon}>{opp.icon}</span>
                  <span className={styles.parecerItemTexto}>{opp.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.recomendacaoBox}>
          <div className={styles.recomendacaoTitulo}>🎯 Recomendação</div>
          <p className={styles.recomendacaoTexto}>{parecer.recomendacao}</p>
        </div>

        {parecer.previsao.estimatedCompletionDate && (
          <div className={styles.previsaoBox}>
            <div className={styles.previsaoItem}>
              <div className={styles.previsaoLabel}>Velocidade Média</div>
              <div className={styles.previsaoValor}>{parecer.previsao.velocidade.toFixed(1)} dias/evento</div>
            </div>
            <div className={styles.previsaoItem}>
              <div className={styles.previsaoLabel}>Conclusão Estimada</div>
              <div className={`${styles.previsaoValor} ${parecer.previsao.daysDeltaBoard && parecer.previsao.daysDeltaBoard > 0 ? styles.previsaoValorAtrasado : styles.previsaoValorNoPrazo}`}>
                {parecer.previsao.estimatedCompletionDate.toLocaleDateString('pt-BR')}
              </div>
            </div>
            {parecer.previsao.boardPrevisto && (
              <div className={styles.previsaoItem}>
                <div className={styles.previsaoLabel}>Prazo Original</div>
                <div className={styles.previsaoValor}>
                  {parecer.previsao.boardPrevisto.toLocaleDateString('pt-BR')}
                </div>
              </div>
            )}
            {parecer.previsao.daysDeltaBoard !== null && parecer.previsao.daysDeltaBoard !== 0 && (
              <div className={styles.previsaoItem}>
                <div className={styles.previsaoLabel}>Diferença</div>
                <div className={`${styles.previsaoValor} ${parecer.previsao.daysDeltaBoard > 0 ? styles.previsaoValorAtrasado : styles.previsaoValorNoPrazo}`}>
                  {parecer.previsao.daysDeltaBoard > 0 ? `+${parecer.previsao.daysDeltaBoard}` : parecer.previsao.daysDeltaBoard} dias
                </div>
              </div>
            )}
          </div>
        )}
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
