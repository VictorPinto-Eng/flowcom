'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import styles from './ReportsView.module.css';

interface CardAction {
  seqid?: string;
  description: string;
  created_at: string;
  users?: { name: string };
}

interface ReportCard {
  id: string;
  seqid?: string;
  title: string;
  description: string | null;
  dtatv: Date | string | null;
  dtcon: Date | string | null;
  createdAt: Date | string;
  previsto?: Date | string | null;
  duration: string;
  creatorName: string;
  assignedName: string;
  boardName: string;
  boardSeqId?: string;
  boardDtatv?: Date | string | null;
  boardDtcon?: Date | string | null;
  boardPrevisto?: Date | string | null;
  boardOwnerName?: string;
  boardCreatedAt?: Date | string;
  workspaceName: string;
  workspaceMembers?: string[];
  card_act?: CardAction[];
}

interface GroupedCard {
  name: string;
  workspaceName?: string;
  dtatv?: Date | string | null;
  dtcon?: Date | string | null;
  previsto?: Date | string | null;
  boardOwnerName?: string;
  boardCreatedAt?: Date | string;
  cards: ReportCard[];
}

interface ReportsViewProps {
  initialCards: ReportCard[];
  isGlobal?: boolean;
  workspaceName?: string;
  workspaceId?: string;
}

interface StatsData {
  totalEvents: number;
  totalActivities: number;
  totalCompleted: number;
  pending: number;
  completionRate: number;
  totalActions: number;
  avgLeadTime: number;
}

const getLocalDateString = (dateInput: any) => {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isValidDate = (dateInput: any): boolean => {
  if (!dateInput) return false;
  const d = new Date(dateInput);
  return !isNaN(d.getTime());
};

const safeFormatDate = (dateInput: any): string => {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

const validateDateFilter = (dateStr: string): boolean => {
  if (!dateStr) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && isValidDate(dateStr);
};

const validateCardData = (card: any): boolean => {
  return card && typeof card === 'object' && 'id' in card && 'title' in card && 'workspaceName' in card;
};

const sanitizeCardData = (card: any): ReportCard => {
  return {
    id: card.id || '',
    seqid: card.seqid,
    title: card.title || 'Sem título',
    description: card.description || null,
    dtatv: card.dtatv,
    dtcon: card.dtcon,
    createdAt: card.createdAt || new Date().toISOString(),
    previsto: card.previsto,
    duration: card.duration || '—',
    creatorName: card.creatorName || '—',
    assignedName: card.assignedName || '—',
    boardName: card.boardName || '—',
    boardSeqId: card.boardSeqId,
    boardDtatv: card.boardDtatv,
    boardDtcon: card.boardDtcon,
    boardPrevisto: card.boardPrevisto,
    boardOwnerName: card.boardOwnerName,
    boardCreatedAt: card.boardCreatedAt,
    workspaceName: card.workspaceName || '—',
    workspaceMembers: Array.isArray(card.workspaceMembers) ? card.workspaceMembers : [],
    card_act: Array.isArray(card.card_act) ? card.card_act : []
  };
};

export default function ReportsView({ initialCards, isGlobal, workspaceName, workspaceId }: ReportsViewProps) {
  const [filterUser, setFilterUser] = useState('');
  const [filterWorkspace, setFilterWorkspace] = useState('');
  const [filterWorkspaceSelect, setFilterWorkspaceSelect] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, completed
  const [filterDtconStart, setFilterDtconStart] = useState('');
  const [filterDtconEnd, setFilterDtconEnd] = useState('');
  const [showEvents, setShowEvents] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    // Preload html2pdf library to improve performance when user clicks generate
    if (!(window as any).html2pdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // Estados de Rascunho (Drafts) para aguardar o clique em "Carregar Relatório"
  const [draftUser, setDraftUser] = useState('');
  const [draftWorkspace, setDraftWorkspace] = useState('');
  const [draftWorkspaceSelect, setDraftWorkspaceSelect] = useState('');
  const [draftStatus, setDraftStatus] = useState('all');
  const [draftDtconStart, setDraftDtconStart] = useState('');
  const [draftDtconEnd, setDraftDtconEnd] = useState('');
  const [draftShowEvents, setDraftShowEvents] = useState(false);

  const formatDate = (dateInput: any): string => {
    return safeFormatDate(dateInput);
  };

  // Lista de Áreas de Trabalho para o select dropdown
  const workspacesList = useMemo(() => {
    const list = new Set<string>();
    initialCards.forEach(card => {
      if (card.workspaceName && card.workspaceName !== '—') {
        list.add(card.workspaceName);
      }
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [initialCards]);

  // Lista de Usuários (Criadores e Responsáveis) para o select dropdown
  // Usamos as variáveis draft aqui para que a listagem de usuários se atualize dinamicamente
  // à medida que o usuário ajusta a Área de Trabalho no dropdown (sem precisar carregar o relatório antes)
  const usersList = useMemo(() => {
    const list = new Set<string>();

    const activeWorkspace = isGlobal ? draftWorkspaceSelect : workspaceName;

    const relevantCards = initialCards.filter((card: any) => {
      if (!validateCardData(card)) return false;
      const safeCard = sanitizeCardData(card);

      const matchesWorkspaceSelect = !activeWorkspace ||
        (safeCard.workspaceName && safeCard.workspaceName.trim().toLowerCase() === activeWorkspace.trim().toLowerCase());

      const matchesWorkspace = !draftWorkspace ||
        (safeCard.workspaceName && safeCard.workspaceName.toLowerCase().includes(draftWorkspace.toLowerCase())) ||
        (safeCard.boardName && safeCard.boardName.toLowerCase().includes(draftWorkspace.toLowerCase()));

      const isCompleted = !!safeCard.boardDtcon;
      const matchesStatus = draftStatus === 'all' ||
        (draftStatus === 'completed' && isCompleted) ||
        (draftStatus === 'pending' && !isCompleted);

      const boardDtconStr = getLocalDateString(safeCard.boardDtcon);
      const matchesDtconStart = !draftDtconStart || (boardDtconStr && boardDtconStr >= draftDtconStart);
      const matchesDtconEnd = !draftDtconEnd || (boardDtconStr && boardDtconStr <= draftDtconEnd);

      return matchesWorkspaceSelect && matchesWorkspace && matchesStatus && matchesDtconStart && matchesDtconEnd;
    }).map(sanitizeCardData);

    relevantCards.forEach((card: ReportCard) => {
      if (card.creatorName && card.creatorName !== '—' && card.creatorName !== 'Sistema') {
        list.add(card.creatorName);
      }
      if (card.assignedName && card.assignedName !== '—' && card.assignedName !== 'Não atribuído') {
        list.add(card.assignedName);
      }
      if (card.boardOwnerName && card.boardOwnerName !== '—' && card.boardOwnerName !== 'Não atribuído') {
        list.add(card.boardOwnerName);
      }
      if (card.workspaceMembers && Array.isArray(card.workspaceMembers)) {
        card.workspaceMembers.forEach((m: string) => {
          if (m && m !== '—' && m !== 'Sistema' && m !== 'Não atribuído') {
            list.add(m);
          }
        });
      }
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [initialCards, isGlobal, workspaceName, draftWorkspaceSelect, draftWorkspace, draftStatus, draftDtconStart, draftDtconEnd]);

  // Agrupamento por Atividade (Quadro)
  // Usamos os filtros de fato aplicados (committed) após o clique no botão
  const groupedCards = useMemo(() => {
    const filtered = initialCards
      .filter(validateCardData)
      .map(sanitizeCardData)
      .filter((card: ReportCard) => {
        const matchesUser = !filterUser ||
          card.creatorName.toLowerCase().includes(filterUser.toLowerCase()) ||
          card.assignedName.toLowerCase().includes(filterUser.toLowerCase()) ||
          (card.boardOwnerName && card.boardOwnerName.toLowerCase().includes(filterUser.toLowerCase())) ||
          (card.workspaceMembers && card.workspaceMembers.some((m: string) => m.toLowerCase().includes(filterUser.toLowerCase())));

        const matchesWorkspace = !filterWorkspace ||
          card.workspaceName.toLowerCase().includes(filterWorkspace.toLowerCase()) ||
          card.boardName.toLowerCase().includes(filterWorkspace.toLowerCase());

        const activeWorkspace = isGlobal ? filterWorkspaceSelect : workspaceName;
        const matchesWorkspaceSelect = !activeWorkspace ||
          (card.workspaceName && card.workspaceName.trim().toLowerCase() === activeWorkspace.trim().toLowerCase());

        const isCompleted = !!card.boardDtcon;
        const matchesStatus = filterStatus === 'all' ||
          (filterStatus === 'completed' && isCompleted) ||
          (filterStatus === 'pending' && !isCompleted);

        const boardDtconStr = getLocalDateString(card.boardDtcon);
        const matchesDtconStart = !filterDtconStart || (boardDtconStr && boardDtconStr >= filterDtconStart);
        const matchesDtconEnd = !filterDtconEnd || (boardDtconStr && boardDtconStr <= filterDtconEnd);

        return matchesUser && matchesWorkspace && matchesWorkspaceSelect && matchesStatus && matchesDtconStart && matchesDtconEnd;
      });

    const groups: { [key: string]: GroupedCard } = {};
    filtered.forEach((card: ReportCard) => {
      // Agrupamos pelo boardSeqId para bater 100% com o banco de dados
      const boardKey = card.boardSeqId || 'default';
      const boardLabel = `${card.boardSeqId} - ${card.boardName}`;

      if (!groups[boardKey]) {
        groups[boardKey] = {
          name: boardLabel,
          workspaceName: card.workspaceName || '—',
          dtatv: card.boardDtatv,
          dtcon: card.boardDtcon,
          previsto: card.boardPrevisto,
          boardOwnerName: card.boardOwnerName,
          boardCreatedAt: card.boardCreatedAt,
          cards: []
        };
      }
      groups[boardKey].cards.push(card);
    });
    return groups;
  }, [initialCards, filterUser, filterWorkspace, filterWorkspaceSelect, filterStatus, filterDtconStart, filterDtconEnd, isGlobal, workspaceName]);

  // Ordena as atividades por data de criação decrescente (mais recentes primeiro)
  const sortedGroupedCards = useMemo(() => {
    if (!isLoaded) return [];
    return Object.entries(groupedCards).sort(([, groupA], [, groupB]) => {
      const timeA = groupA.boardCreatedAt ? new Date(groupA.boardCreatedAt).getTime() : 0;
      const timeB = groupB.boardCreatedAt ? new Date(groupB.boardCreatedAt).getTime() : 0;
      if (timeA !== timeB) {
        return timeB - timeA;
      }
      const numA = parseInt(groupA.name.split(' - ')[0]) || 0;
      const numB = parseInt(groupB.name.split(' - ')[0]) || 0;
      return numB - numA;
    });
  }, [groupedCards, isLoaded]) as Array<[string, GroupedCard]>;

  // Statistics baseada no filtrado
  const stats = useMemo((): StatsData => {
    if (!isLoaded) {
      return { totalEvents: 0, totalActivities: 0, totalCompleted: 0, pending: 0, completionRate: 0, totalActions: 0, avgLeadTime: 0 };
    }
    const allFiltered = Object.values(groupedCards).flatMap(g => g.cards);
    const totalEvents = allFiltered.length;
    const totalActivities = Object.keys(groupedCards).length;

    const completedCards = allFiltered.filter(c => c.dtcon && c.dtatv && isValidDate(c.dtcon) && isValidDate(c.dtatv));
    const totalCompleted = allFiltered.filter(c => c.dtcon && isValidDate(c.dtcon)).length;
    const pending = totalEvents - totalCompleted;
    const completionRate = totalEvents > 0 ? Math.round((totalCompleted / totalEvents) * 100) : 0;

    const totalActions = allFiltered.reduce((acc, card) => acc + (card.card_act?.length || 0), 0);

    let avgLeadTime = 0;
    if (completedCards.length > 0) {
      const totalDays = completedCards.reduce((acc, card) => {
        if (!card.dtatv || !card.dtcon) return acc;
        const start = new Date(card.dtatv);
        const end = new Date(card.dtcon);
        const timeDiff = end.getTime() - start.getTime();
        return acc + Math.ceil(Math.abs(timeDiff) / (1000 * 60 * 60 * 24));
      }, 0);
      avgLeadTime = totalDays > 0 ? Math.round(totalDays / completedCards.length) : 0;
    }

    return { totalEvents, totalActivities, totalCompleted, pending, completionRate, totalActions, avgLeadTime };
  }, [groupedCards, isLoaded]);

  const handlePrint = async () => {
    if (!isLoaded) {
      alert('Por favor, primeiro carregue os dados clicando no botão "Carregar Relatório".');
      return;
    }

    // Open window immediately to prevent popup blocker
    const pdfWindow = window.open('', '_blank');
    if (!pdfWindow) {
      alert('Por favor, ative a exibição de pop-ups para gerar o relatório.');
      return;
    }

    // Write a loader state to the new window so the user knows it's working
    pdfWindow.document.write(`
      <html>
      <head>
        <title>Gerando PDF...</title>
        <style>
          body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            font-family: sans-serif;
            color: #475569;
            background: #f8fafc;
          }
          .spinner {
            border: 4px solid #e2e8f0;
            border-top: 4px solid #6366f1;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin-bottom: 15px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="spinner"></div>
        <div>Gerando documento PDF...</div>
      </body>
      </html>
    `);
    pdfWindow.document.close();

    setIsGeneratingPdf(true);

    try {
      const now = new Date();
      const ano = now.getFullYear();
      const mes = String(now.getMonth() + 1).padStart(2, '0');
      const dia = String(now.getDate()).padStart(2, '0');
      const anoMesDia = `${ano}${mes}${dia}`;

      const nrControle = String(Math.floor(1000 + Math.random() * 9000));
      const filename = `${anoMesDia}_${nrControle}.pdf`;

      // Load html2pdf library if not already loaded
      await new Promise<void>((resolve, reject) => {
        if ((window as any).html2pdf) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load html2pdf'));
        document.head.appendChild(script);
      });

      const title = isGlobal ? 'Dashboard Geral de Atividades' : `Dashboard da Área de Trabalho: ${workspaceName || 'Área de Trabalho'}`;
      const subtitle = isGlobal ? 'Visão estratégica de todo o sistema' : 'Acompanhamento detalhado desta área de trabalho';

      // ─── Inline page-header block (injected at every page break) ─────────
      const pageHeaderHtml = `
        <div style="position: relative; border-bottom: 2px solid #cbd5e1; padding-bottom: 12px; margin-bottom: 0;">
          <div style="position: absolute; right: 0; top: 0;">
            <span style="font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #000000; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Controle: ${nrControle}</span>
          </div>
          
          <!-- Título empurrado para a direita via padding-left -->
          <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; padding-left: 150px; font-family: Arial, Helvetica, sans-serif;">
            ${title}
          </div>
          
          <!-- Subtítulo empurrado para a direita via padding-left -->
          <div style="font-size: 12px; color: #64748b; padding-left: 150px; font-family: Arial, Helvetica, sans-serif;">
            ${subtitle}
          </div>
        </div>
      `;



      // ─── Column header row (reused at every page break) ──────────────────
      const colHeaderHtml = `
         <table style="width:100%; border-collapse:collapse; table-layout:fixed; border:1px solid #cbd5e1; margin-top:12px;">
           <colgroup>
             <col style="width:80px">
             <col style="width:280px">
             <col style="width:90px">
             <col style="width:80px">
             <col style="width:80px">
             <col style="width:50px">
           </colgroup>
          <thead>
            <tr>
              <th style="text-align:left; vertical-align:top; padding:8px 10px; background:#f1f5f9; border-bottom:1px solid #cbd5e1; font-size:11px; font-weight:700; color:#000; text-transform:uppercase; font-family:Arial,Helvetica,sans-serif;">
                <div>STATUS</div><div style="margin-top:1px;">A.TRAB.</div>
              </th>
              <th style="vertical-align:top; padding:8px 10px; background:#f1f5f9; border-bottom:1px solid #cbd5e1; font-size:11px; font-weight:700; color:#000; text-transform:uppercase; font-family:Arial,Helvetica,sans-serif;">ATIVIDADE</th>
              <th style="vertical-align:top; padding:8px 10px; background:#f1f5f9; border-bottom:1px solid #cbd5e1; font-size:11px; font-weight:700; color:#000; text-transform:uppercase; font-family:Arial,Helvetica,sans-serif;">RESPONSÁVEL</th>
              <th style="vertical-align:top; padding:8px 10px; background:#f1f5f9; border-bottom:1px solid #cbd5e1; font-size:11px; font-weight:700; color:#000; text-transform:uppercase; font-family:Arial,Helvetica,sans-serif;">PREVISTO</th>
              <th style="vertical-align:top; padding:8px 10px; background:#f1f5f9; border-bottom:1px solid #cbd5e1; font-size:11px; font-weight:700; color:#000; text-transform:uppercase; font-family:Arial,Helvetica,sans-serif;">
                <div>INÍCIO /</div><div style="margin-top:1px;">CONCLUSÃO</div>
              </th>
              <th style="text-align:right; vertical-align:top; padding:8px 10px; background:#f1f5f9; border-bottom:1px solid #cbd5e1; font-size:11px; font-weight:700; color:#000; text-transform:uppercase; font-family:Arial,Helvetica,sans-serif;">TE</th>
            </tr>
          </thead>
        </table>
      `;

      // ─── Page-break separator with repeated header ────────────────────────
      const pageBreakWithHeader = `
        <div style="page-break-before: always; padding-top: 10px;">
          ${pageHeaderHtml}
          ${colHeaderHtml}
        </div>
      `;

      const buildRowHtml = (group: GroupedCard) => {
        const statusBadge = group.dtcon
          ? '<span style="font-size:10px;font-weight:400;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;color:#000;">CONCLU&#205;DA</span>'
          : '<span style="font-size:10px;font-weight:400;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;color:#000;">EM ABERTO</span>';



        const previstoStr = group.previsto ? formatDate(group.previsto) : 'Sem data';
        const ownerStr = group.boardOwnerName || '—';

        let nestedHtml = '';
        if (showEvents && group.cards && group.cards.length > 0) {
          const sortedCards = [...group.cards].sort((a: ReportCard, b: ReportCard) => {
            const timeA = a.previsto ? new Date(a.previsto).getTime() : Infinity;
            const timeB = b.previsto ? new Date(b.previsto).getTime() : Infinity;
            if (timeA !== timeB) return timeA - timeB;
            return (parseInt(a.seqid || '0') || 0) - (parseInt(b.seqid || '0') || 0);
          });
          const cardRows = sortedCards.map((card: ReportCard) => {
            const cPrevisto = card.previsto ? formatDate(card.previsto) : '—';
            const cInicio = formatDate(card.dtatv || card.createdAt);
            const cFim = formatDate(card.dtcon);
            const andamentos = card.card_act && card.card_act.length > 0
              ? `<div style="margin-top:4px;padding-left:10px;border-left:2px dashed #cbd5e1;">${card.card_act.map((act: CardAction) =>
                `<div style="font-size:10px;color:#475569;font-family:Arial,Helvetica,sans-serif;">• ${act.description} <span style="color:#94a3b8;font-size:9px;">(${act.users?.name || 'Sistema'} - ${new Date(act.created_at).toLocaleString('pt-BR')})</span></div>`
              ).join('')
              }</div>` : '';
            return `
              <tr>
                <td style="padding:5px 6px;border-bottom:1px solid #e2e8f0;font-size:11px;font-family:Arial,Helvetica,sans-serif;color:#000;">
                  <div style="font-weight:500;">${card.title}</div>${andamentos}
                </td>
                <td style="width:90px;padding:5px 6px;border-bottom:1px solid #e2e8f0;font-size:11px;font-family:Arial,Helvetica,sans-serif;color:#000;">${card.creatorName}</td>
                <td style="width:90px;padding:5px 6px;border-bottom:1px solid #e2e8f0;font-size:11px;font-family:Arial,Helvetica,sans-serif;color:#000;">${card.assignedName}</td>
                <td style="width:70px;padding:5px 6px;border-bottom:1px solid #e2e8f0;font-size:11px;font-family:Arial,Helvetica,sans-serif;color:#000;">${cPrevisto}</td>
                <td style="width:60px;padding:5px 6px;border-bottom:1px solid #e2e8f0;font-size:11px;font-family:Arial,Helvetica,sans-serif;color:#000;">${cInicio}</td>
                <td style="width:60px;padding:5px 6px;border-bottom:1px solid #e2e8f0;font-size:11px;font-family:Arial,Helvetica,sans-serif;color:#000;">${cFim}</td>
                <td style="width:55px;padding:5px 6px;border-bottom:1px solid #e2e8f0;font-size:11px;font-family:Arial,Helvetica,sans-serif;color:#000;">${card.duration}</td>
              </tr>`;
          }).join('');

          nestedHtml = `
            <div style="padding:10px 12px 12px 12px;background:#f8fafc;border-top:1px solid #e2e8f0;border-left:1px solid #cbd5e1;border-right:1px solid #cbd5e1;border-bottom:1px solid #cbd5e1;">
              <table style="width:100%;border-collapse:collapse;">
                <thead>
                  <tr>
                    <th style="border-bottom:1.5px solid #cbd5e1;font-size:10px;font-weight:700;text-transform:uppercase;padding:5px 6px;text-align:left;background:transparent;font-family:Arial,Helvetica,sans-serif;color:#475569;">Evento</th>
                    <th style="width:90px;border-bottom:1.5px solid #cbd5e1;font-size:10px;font-weight:700;text-transform:uppercase;padding:5px 6px;text-align:left;font-family:Arial,Helvetica,sans-serif;color:#475569;">Criador</th>
                    <th style="width:90px;border-bottom:1.5px solid #cbd5e1;font-size:10px;font-weight:700;text-transform:uppercase;padding:5px 6px;text-align:left;font-family:Arial,Helvetica,sans-serif;color:#475569;">Atribuído</th>
                    <th style="width:70px;border-bottom:1.5px solid #cbd5e1;font-size:10px;font-weight:700;text-transform:uppercase;padding:5px 6px;text-align:left;font-family:Arial,Helvetica,sans-serif;color:#475569;">Previsto</th>
                    <th style="width:70px;border-bottom:1.5px solid #cbd5e1;font-size:10px;font-weight:700;text-transform:uppercase;padding:5px 6px;text-align:left;font-family:Arial,Helvetica,sans-serif;color:#475569;">Início</th>
                    <th style="width:70px;border-bottom:1.5px solid #cbd5e1;font-size:10px;font-weight:700;text-transform:uppercase;padding:5px 6px;text-align:left;font-family:Arial,Helvetica,sans-serif;color:#475569;">Fim</th>
                    <th style="width:55px;border-bottom:1.5px solid #cbd5e1;font-size:10px;font-weight:700;text-transform:uppercase;padding:5px 6px;text-align:left;font-family:Arial,Helvetica,sans-serif;color:#475569;">Duração</th>
                  </tr>
                </thead>
                <tbody>${cardRows}</tbody>
              </table>
            </div>`;
        }

        return {
          statusBadge,
          previstoStr,
          ownerStr,
          nestedHtml
        };
      };

      const rowsHtml: string[] = [];

      sortedGroupedCards.forEach(([boardKey, group]: [string, GroupedCard]) => {
        const { statusBadge, previstoStr, ownerStr, nestedHtml } = buildRowHtml(group);

        rowsHtml.push(`
           <tr>
             <td style="width:80px; vertical-align:top; padding:9px 10px; border-bottom:1px solid #e2e8f0;">
               <div style="font-size:11px; line-height:1.3; font-family:Arial,Helvetica,sans-serif;">
                 <div>${statusBadge}</div>
                 <div style="font-size:8px; color:#000; margin-top:3px; font-weight:normal;">${group.workspaceName || '—'}</div>
               </div>
             </td>
             <td style="width:280px; vertical-align:top; padding:9px 10px; border-bottom:1px solid #e2e8f0;">
               <div style="font-weight:normal; font-size:11px; line-height:1.4; overflow-wrap:break-word; word-break:break-word; white-space:normal; font-family:Arial,Helvetica,sans-serif;">${group.name}</div>
             </td>
             <td style="width:90px; vertical-align:top; padding:9px 10px; border-bottom:1px solid #e2e8f0;">
               <div style="font-size:11px; line-height:1.4; font-family:Arial,Helvetica,sans-serif;">${ownerStr}</div>
             </td>
             <td style="width:80px; vertical-align:top; padding:9px 10px; border-bottom:1px solid #e2e8f0;">
               <div style="font-size:11px; font-family:Arial,Helvetica,sans-serif;">${previstoStr}</div>
             </td>
             <td style="width:80px; margin-left:auto; text-align:right; vertical-align:top; padding:8px 10px; border-bottom:1px solid #e2e8f0;">
               <div style="font-size:11px; line-height:1.6; font-family:Arial,Helvetica,sans-serif;">
                 <div>${group.dtatv ? formatDate(group.dtatv) : '—'}</div>
                 <div>${group.dtcon ? formatDate(group.dtcon) : '—'}</div>
               </div>
             </td>
             <td style="width:50px; text-align:right; vertical-align:top; padding:9px 10px; border-bottom:1px solid #e2e8f0;">
               <div style="font-size:11px; font-family:Arial,Helvetica,sans-serif; text-align:right; color:#000;">${group.cards.length}</div>
             </td>
           </tr>
           ${nestedHtml ? `</tbody></table><div style="margin:0;">${nestedHtml}</div><table style="width:100%;border-collapse:collapse;border-left:1px solid #cbd5e1;border-right:1px solid #cbd5e1;"><tbody>` : ''}
         `);

      });

      // ─── Medição Real das Alturas via DOM Temporário ──────────────────────────
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '740px';
      tempDiv.style.visibility = 'hidden';
      document.body.appendChild(tempDiv);

      // Medir cabeçalho
      const headerContainer = document.createElement('div');
      headerContainer.style.width = '740px';
      headerContainer.innerHTML = `
        ${pageHeaderHtml}
        ${colHeaderHtml}
      `;
      tempDiv.appendChild(headerContainer);
      const measuredHeaderHeight = headerContainer.getBoundingClientRect().height;
      tempDiv.removeChild(headerContainer);

      // Medir cada linha
      const measuredRowHeights = rowsHtml.map((rowHtml) => {
        const rowContainer = document.createElement('div');
        rowContainer.style.width = '740px';
        rowContainer.innerHTML = `
          <table style="width:100%; border-collapse:collapse; table-layout:fixed;">
            <colgroup>
              <col style="width:80px">
              <col style="width:280px">
              <col style="width:90px">
              <col style="width:80px">
              <col style="width:80px">
              <col style="width:50px">
            </colgroup>
            <tbody>
              ${rowHtml}
            </tbody>
          </table>
        `;
        tempDiv.appendChild(rowContainer);
        const height = rowContainer.getBoundingClientRect().height;
        tempDiv.removeChild(rowContainer);
        return height;
      });

      // Medir bloco de estatísticas
      const statsContainer = document.createElement('div');
      statsContainer.style.width = '740px';
      statsContainer.innerHTML = `
        <div style="margin-top: 28px; border-top: 2px solid #cbd5e1; padding-top: 20px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 12px; font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.05em;">Resumo do Relatório</div>
          <table style="width:100%; border-collapse:separate; border-spacing:8px 0; margin-left:-8px;">
            <tr>
              <td style="border:1px solid #cbd5e1; border-radius:6px; padding:10px; background:#f8fafc; width:20%; vertical-align:top;">
                <span style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:700; display:block; margin-bottom:3px; font-family:Arial,Helvetica,sans-serif;">Atividades</span>
                <span style="font-size:18px; font-weight:700; color:#1e293b; display:block; font-family:Arial,Helvetica,sans-serif;">${stats.totalActivities}</span>
                <span style="font-size:10px; color:#94a3b8; font-family:Arial,Helvetica,sans-serif;">Quadros</span>
              </td>
              <td style="border:1px solid #cbd5e1; border-radius:6px; padding:10px; background:#f8fafc; width:20%; vertical-align:top;">
                <span style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:700; display:block; margin-bottom:3px; font-family:Arial,Helvetica,sans-serif;">Eventos</span>
                <span style="font-size:18px; font-weight:700; color:#1e293b; display:block; font-family:Arial,Helvetica,sans-serif;">${stats.totalEvents}</span>
                <span style="font-size:10px; color:#94a3b8; font-family:Arial,Helvetica,sans-serif;">Tarefas</span>
              </td>
              <td style="border:1px solid #cbd5e1; border-radius:6px; padding:10px; background:#f8fafc; width:20%; vertical-align:top;">
                <span style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:700; display:block; margin-bottom:3px; font-family:Arial,Helvetica,sans-serif;">Ações</span>
                <span style="font-size:18px; font-weight:700; color:#1e293b; display:block; font-family:Arial,Helvetica,sans-serif;">${stats.totalActions}</span>
                <span style="font-size:10px; color:#94a3b8; font-family:Arial,Helvetica,sans-serif;">Logs</span>
              </td>
              <td style="border:1px solid #cbd5e1; border-radius:6px; padding:10px; background:#f8fafc; width:20%; vertical-align:top;">
                <span style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:700; display:block; margin-bottom:3px; font-family:Arial,Helvetica,sans-serif;">Lead Time</span>
                <span style="font-size:18px; font-weight:700; color:#1e293b; display:block; font-family:Arial,Helvetica,sans-serif;">${stats.avgLeadTime}d</span>
                <span style="font-size:10px; color:#94a3b8; font-family:Arial,Helvetica,sans-serif;">Média</span>
              </td>
              <td style="border:1px solid #cbd5e1; border-radius:6px; padding:10px; background:#f8fafc; width:20%; vertical-align:top;">
                <span style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:700; display:block; margin-bottom:3px; font-family:Arial,Helvetica,sans-serif;">Entrega</span>
                <span style="font-size:18px; font-weight:700; color:#1e293b; display:block; font-family:Arial,Helvetica,sans-serif;">${stats.completionRate}%</span>
                <span style="font-size:10px; color:#94a3b8; font-family:Arial,Helvetica,sans-serif;">${stats.totalCompleted} OK</span>
              </td>
            </tr>
          </table>
          <div style="font-size:9px; color:#64748b; margin-top:20px; font-family:Arial,Helvetica,sans-serif;">
            * Legenda: <strong>TE</strong> — Total de eventos
          </div>
        </div>
      `;
      tempDiv.appendChild(statsContainer);
      const statsHeight = statsContainer.getBoundingClientRect().height;
      tempDiv.removeChild(statsContainer);

      // Limpar o container temporário do body
      document.body.removeChild(tempDiv);

      const MAX_TOTAL_HEIGHT_PER_PAGE = 1020 // Limite vertical total da página (980px)
      const MAX_ROW_HEIGHT_PER_PAGE = MAX_TOTAL_HEIGHT_PER_PAGE - measuredHeaderHeight; // Altura disponível apenas para as linhas

      let bodyHtml = '';

      // First page header (no page-break-before)
      bodyHtml += `
        ${pageHeaderHtml}
        ${colHeaderHtml}
         <table style="width:100%;border-collapse:collapse;table-layout:fixed;border-left:1px solid #cbd5e1;border-right:1px solid #cbd5e1;">
           <colgroup>
             <col style="width:80px">
             <col style="width:280px">
             <col style="width:90px">
             <col style="width:80px">
             <col style="width:80px">
             <col style="width:50px">
           </colgroup>
         <tbody>
      `;

      let currentPageHeight = 0;

      rowsHtml.forEach((row, idx) => {
        const rowHeight = measuredRowHeights[idx];

        // Se esta linha estourar a página atual (e não for a primeira linha da página)
        if (currentPageHeight + rowHeight > MAX_ROW_HEIGHT_PER_PAGE && currentPageHeight > 0) {
          bodyHtml += `
             </tbody></table>
             ${pageBreakWithHeader}
              <table style="width:100%;border-collapse:collapse;table-layout:fixed;border-left:1px solid #cbd5e1;border-right:1px solid #cbd5e1;">
                <colgroup>
                  <col style="width:80px">
                  <col style="width:280px">
                  <col style="width:90px">
                  <col style="width:80px">
                  <col style="width:80px">
                  <col style="width:50px">
                </colgroup>
              <tbody>
          `;
          currentPageHeight = rowHeight;
        } else {
          currentPageHeight += rowHeight;
        }
        bodyHtml += row;
      });

      bodyHtml += `</tbody></table>`;

      // Se o resumo couber na página atual, coloca sem page break. Senão, quebra de página antes do resumo.
      const shouldBreakForStats = (currentPageHeight + statsHeight > MAX_ROW_HEIGHT_PER_PAGE);

      const statsPageBreak = shouldBreakForStats
        ? `page-break-before: always; padding-top: 10px;`
        : `margin-top: 28px; border-top: 2px solid #cbd5e1; padding-top: 0;`;

      const statsTitleHeader = shouldBreakForStats
        ? `${pageHeaderHtml} <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-top: 20px; margin-bottom: 12px; font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.05em;">Resumo do Relatório</div>`
        : `<div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 12px; font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.05em;">Resumo do Relatório</div>`;

      bodyHtml += `
        <div style="${statsPageBreak}">
          <div style="padding-top: 20px;">
            ${statsTitleHeader}
            <table style="width:100%; border-collapse:separate; border-spacing:8px 0; margin-left:-8px;">
              <tr>
                <td style="border:1px solid #cbd5e1; border-radius:6px; padding:10px; background:#f8fafc; width:20%; vertical-align:top;">
                  <span style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:700; display:block; margin-bottom:3px; font-family:Arial,Helvetica,sans-serif;">Atividades</span>
                  <span style="font-size:18px; font-weight:700; color:#1e293b; display:block; font-family:Arial,Helvetica,sans-serif;">${stats.totalActivities}</span>
                  <span style="font-size:10px; color:#94a3b8; font-family:Arial,Helvetica,sans-serif;">Quadros</span>
                </td>
                <td style="border:1px solid #cbd5e1; border-radius:6px; padding:10px; background:#f8fafc; width:20%; vertical-align:top;">
                  <span style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:700; display:block; margin-bottom:3px; font-family:Arial,Helvetica,sans-serif;">Eventos</span>
                  <span style="font-size:18px; font-weight:700; color:#1e293b; display:block; font-family:Arial,Helvetica,sans-serif;">${stats.totalEvents}</span>
                  <span style="font-size:10px; color:#94a3b8; font-family:Arial,Helvetica,sans-serif;">Tarefas</span>
                </td>
                <td style="border:1px solid #cbd5e1; border-radius:6px; padding:10px; background:#f8fafc; width:20%; vertical-align:top;">
                  <span style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:700; display:block; margin-bottom:3px; font-family:Arial,Helvetica,sans-serif;">Ações</span>
                  <span style="font-size:18px; font-weight:700; color:#1e293b; display:block; font-family:Arial,Helvetica,sans-serif;">${stats.totalActions}</span>
                  <span style="font-size:10px; color:#94a3b8; font-family:Arial,Helvetica,sans-serif;">Logs</span>
                </td>
                <td style="border:1px solid #cbd5e1; border-radius:6px; padding:10px; background:#f8fafc; width:20%; vertical-align:top;">
                  <span style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:700; display:block; margin-bottom:3px; font-family:Arial,Helvetica,sans-serif;">Lead Time</span>
                  <span style="font-size:18px; font-weight:700; color:#1e293b; display:block; font-family:Arial,Helvetica,sans-serif;">${stats.avgLeadTime}d</span>
                  <span style="font-size:10px; color:#94a3b8; font-family:Arial,Helvetica,sans-serif;">Média</span>
                </td>
                <td style="border:1px solid #cbd5e1; border-radius:6px; padding:10px; background:#f8fafc; width:20%; vertical-align:top;">
                  <span style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:700; display:block; margin-bottom:3px; font-family:Arial,Helvetica,sans-serif;">Entrega</span>
                  <span style="font-size:18px; font-weight:700; color:#1e293b; display:block; font-family:Arial,Helvetica,sans-serif;">${stats.completionRate}%</span>
                  <span style="font-size:10px; color:#94a3b8; font-family:Arial,Helvetica,sans-serif;">${stats.totalCompleted} OK</span>
                </td>
              </tr>
            </table>
          </div>
          <div style="font-size:9px; color:#64748b; margin-top:20px; font-family:Arial,Helvetica,sans-serif;">
            * Legenda: <strong>TE</strong> — Total de eventos
          </div>
        </div>
      `;

      // ─── Full HTML document with styles ───────────────────────────────────
      const htmlString = `
        <div style="width: 740px; padding: 10px 15px; background: white; box-sizing: border-box;">
          <style>
            * { box-sizing: border-box; }
            body, table, th, td, div, p, span {
              font-family: Arial, Helvetica, sans-serif !important;
              letter-spacing: normal !important;
              word-spacing: normal !important;
              line-height: 1.4 !important;
            }
          </style>
          ${bodyHtml}
        </div>
      `;

      const opt = {
        margin: [6, 6, 6, 6],
        filename: filename,
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { scale: 1.5, useCORS: true, logging: false, allowTaint: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      const html2pdf = (window as any).html2pdf;
      const pdfBlob = await html2pdf()
        .from(htmlString)
        .set(opt)
        .toPdf()
        .get('pdf')
        .then((pdfObj: any) => {
          pdfObj.setProperties({ title: 'Relatório de Atividades - Flow' });
          return pdfObj;
        })
        .output('blob');


      const blobUrl = URL.createObjectURL(pdfBlob);

      // Redirect the already opened tab to the PDF blob
      pdfWindow.location.replace(blobUrl);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Ocorreu um erro ao gerar o PDF. Tentando imprimir normalmente...');
      pdfWindow.close();
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleWrapper}>
          <h1>{isGlobal ? 'Dashboard Geral de Atividades' : `Dashboard da Área de Trabalho: ${workspaceName || 'Área de Trabalho'}`}</h1>
          <p>{isGlobal ? 'Visão estratégica de todo o sistema' : 'Acompanhamento detalhado desta área de trabalho'}</p>
        </div>
        <div className={styles.actions}>
          <Link
            href={workspaceId ? `/dashboard?workspaceId=${workspaceId}` : '/dashboard'}
            className={styles.backBtn}
          >
            ← Voltar ao Início
          </Link>
          <button
            className={`${styles.printBtn} ${!isLoaded ? styles.printBtnDisabled : ''}`}
            onClick={handlePrint}
          >
            🖨️ Gerar Relatório PDF
          </button>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Atividades</span>
            <span className={styles.statValue}>{stats.totalActivities}</span>
            <span className={styles.statSub}>Quadros</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Eventos</span>
            <span className={styles.statValue}>{stats.totalEvents}</span>
            <span className={styles.statSub}>Tarefas</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Ações</span>
            <span className={styles.statValue}>{stats.totalActions}</span>
            <span className={styles.statSub}>Logs</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Lead Time</span>
            <span className={styles.statValue}>{stats.avgLeadTime}d</span>
            <span className={styles.statSub}>Média</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Entrega</span>
            <span className={styles.statValue}>{stats.completionRate}%</span>
            <span className={styles.statSub}>{stats.totalCompleted} OK</span>
          </div>
        </div>
      </div>

      <section className={styles.filtersSection}>
        <div className={styles.filterGroup}>
          <label htmlFor="user-select">Pesquisar Usuário</label>
          <select
            id="user-select"
            aria-label="Filtro de usuário"
            className={styles.selectInput}
            value={draftUser}
            onChange={(e) => setDraftUser(e.target.value)}
          >
            <option value="">Todos os Usuários</option>
            {usersList.map(usr => (
              <option key={usr} value={usr}>{usr}</option>
            ))}
          </select>
        </div>
        {isGlobal && (
          <div className={styles.filterGroup}>
            <label htmlFor="workspace-select">Área de Trabalho</label>
            <select
              id="workspace-select"
              aria-label="Filtro de área de trabalho"
              className={styles.selectInput}
              value={draftWorkspaceSelect}
              onChange={(e) => setDraftWorkspaceSelect(e.target.value)}
            >
              <option value="">Todas as Áreas</option>
              {workspacesList.map(ws => (
                <option key={ws} value={ws}>{ws}</option>
              ))}
            </select>
          </div>
        )}
        <div className={styles.filterGroup}>
          <label htmlFor="activity-filter">Atividade (Quadro / Área)</label>
          <input
            id="activity-filter"
            type="text"
            className={styles.selectInput}
            placeholder="Filtrar por nome..."
            aria-label="Filtro de atividade"
            value={draftWorkspace}
            onChange={(e) => setDraftWorkspace(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="status-filter">Status</label>
          <select
            id="status-filter"
            aria-label="Filtro de status"
            className={styles.selectInput}
            value={draftStatus}
            onChange={(e) => setDraftStatus(e.target.value)}
          >
            <option value="all">Todos os Status</option>
            <option value="pending">Em Andamento</option>
            <option value="completed">Concluídos</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="dtcon-start">Conclusão (De)</label>
          <input
            id="dtcon-start"
            type="date"
            max="9999-12-31"
            className={styles.dateInput}
            aria-label="Data de conclusão inicial"
            value={draftDtconStart}
            onChange={(e) => setDraftDtconStart(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="dtcon-end">Conclusão (Até)</label>
          <input
            id="dtcon-end"
            type="date"
            max="9999-12-31"
            className={styles.dateInput}
            aria-label="Data de conclusão final"
            value={draftDtconEnd}
            onChange={(e) => setDraftDtconEnd(e.target.value)}
          />
        </div>
        <div className={styles.checkboxGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={draftShowEvents}
              onChange={(e) => setDraftShowEvents(e.target.checked)}
            />
            <span>Mostrar Eventos</span>
          </label>
        </div>
        <button
          className={styles.loadReportBtn}
          onClick={() => {
            if (!validateDateFilter(draftDtconStart) || !validateDateFilter(draftDtconEnd)) {
              alert('Datas inválidas. Por favor, selecione datas válidas.');
              return;
            }
            setFilterUser(draftUser);
            setFilterWorkspace(draftWorkspace);
            setFilterWorkspaceSelect(draftWorkspaceSelect);
            setFilterStatus(draftStatus);
            setFilterDtconStart(draftDtconStart);
            setFilterDtconEnd(draftDtconEnd);
            setShowEvents(draftShowEvents);
            setIsLoaded(true);
          }}
        >
          🔍 Carregar Relatório
        </button>
      </section>

      <div className={styles.reportContent}>
        {!isLoaded ? (
          <div className={styles.emptyState}>
            Clique no botão <strong>"Carregar Relatório"</strong> para visualizar os dados e estatísticas do sistema.
          </div>
        ) : sortedGroupedCards.length === 0 ? (
          <div className={styles.emptyState}>
            Nenhum registro encontrado para os filtros selecionados.
          </div>
        ) : (
          <>
            <div className={styles.reportGrid}>
              <div className={styles.reportListHeader}>
                <div className={`${styles.listHeaderCol} ${styles.listHeaderStatus}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1px' }}>
                  <span>STATUS</span>
                  <span>A.TRAB.</span>
                </div>
                <div className={`${styles.listHeaderCol} ${styles.listHeaderTitle}`}>ATIVIDADE</div>
                <div className={`${styles.listHeaderCol} ${styles.listHeaderOwner}`}>Responsável</div>
                <div className={`${styles.listHeaderCol} ${styles.listHeaderPrevisto}`}>Previsto</div>
                <div className={`${styles.listHeaderCol} ${styles.listHeaderDates}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1px' }}>
                  <span>INÍCIO /</span>
                  <span>CONCLUSÃO</span>
                </div>
                <div className={`${styles.listHeaderCol} ${styles.listHeaderCount}`}>TE</div>
              </div>

              {sortedGroupedCards.map(([boardKey, group]: [string, GroupedCard]) => (
                <div key={boardKey} className={`${styles.activityGroup} ${showEvents ? styles.activityGroupActive : ''}`}>
                  <div className={`${styles.groupHeader} ${showEvents ? styles.groupHeaderActive : ''}`}>
                    <div className={styles.groupStatusCol} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '3px' }}>
                      {group.dtcon ? (
                        <span className={styles.badgeCompleted}>Concluída</span>
                      ) : (
                        <span className={styles.badgePending}>Em aberto</span>
                      )}
                      <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 'normal' }}>{group.workspaceName || '—'}</span>
                    </div>
                    <div className={styles.groupTitleCol}>
                      <span>{group.name}</span>
                    </div>
                    <div className={styles.groupOwnerCol}>
                      {group.boardOwnerName || '—'}
                    </div>
                    <div className={styles.groupPrevistoCol}>
                      {group.previsto ? formatDate(group.previsto) : 'Sem data'}
                    </div>
                    <div className={styles.groupDatesCol} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', fontSize: '0.7rem', lineHeight: '1.2' }}>
                      <div>{group.dtatv ? formatDate(group.dtatv) : '—'}</div>
                      <div>{group.dtcon ? formatDate(group.dtcon) : '—'}</div>
                    </div>
                    <div className={styles.groupCountCol}>
                      <span style={{ color: '#000000', fontWeight: 'normal', fontSize: '0.75rem' }}>{group.cards.length}</span>
                    </div>
                  </div>

                  {showEvents && (
                    <div className={styles.tableWrapper}>
                      <table className={styles.reportTable}>
                        <thead>
                          <tr>
                            <th>Evento</th>
                            <th>Criador</th>
                            <th>Atribuído</th>
                            <th>Previsto</th>
                            <th>Início</th>
                            <th>Fim</th>
                            <th>Duração</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...group.cards]
                            .sort((a: ReportCard, b: ReportCard) => {
                              const timeA = a.previsto ? new Date(a.previsto).getTime() : Infinity;
                              const timeB = b.previsto ? new Date(b.previsto).getTime() : Infinity;
                              if (timeA !== timeB) return timeA - timeB;
                              const seqA = parseInt(a.seqid || '0') || 0;
                              const seqB = parseInt(b.seqid || '0') || 0;
                              return seqA - seqB;
                            })
                            .map((card: ReportCard) => (
                              <React.Fragment key={card.seqid || card.id}>
                                <tr className={styles.mainRow}>
                                  <td>
                                    <div className={styles.eventInfo}>
                                      <span className={styles.eventName}>{card.title}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <div className={styles.userCell}>
                                      <span>{card.creatorName}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <div className={styles.userCell}>
                                      <span>{card.assignedName}</span>
                                    </div>
                                  </td>
                                  <td className={styles.dateCell}>{card.previsto ? formatDate(card.previsto) : '—'}</td>
                                  <td className={styles.dateCell}>{formatDate(card.dtatv || card.createdAt)}</td>
                                  <td className={styles.dateCell}>{formatDate(card.dtcon)}</td>
                                  <td>
                                    <span className={`${styles.durationText} ${!card.dtcon ? styles.durationPendingText : ''}`}>
                                      {card.duration}
                                    </span>
                                  </td>
                                </tr>

                                {card.card_act && card.card_act.length > 0 && (
                                  <tr className={styles.subRow}>
                                    <td colSpan={7} className={styles.subCell}>
                                      <div className={styles.andamentosWrapper}>
                                        {card.card_act.map((act: CardAction, idx: number) => (
                                          <div key={act.seqid || idx} className={styles.andamentoItem}>
                                            <div className={styles.andamentoContent}>
                                              <p className={styles.andamentoText}>{act.description}</p>
                                              <div className={styles.andamentoMeta}>
                                                <strong>{act.users?.name || 'Sistema'}</strong> • {new Date(act.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '10px', textAlign: 'left', textTransform: 'uppercase', fontWeight: 600 }}>
              * Legenda: <strong>TE</strong> — Total de eventos
            </div>
          </>
        )}
      </div>

      {isGeneratingPdf && (
        <div className={styles.pdfOverlay}>
          <div className={styles.pdfSpinner}></div>
          <div style={{ fontSize: '14px', color: '#475569', fontWeight: 600 }}>
            Gerando documento PDF...
          </div>
        </div>
      )}
    </div>
  );
}
