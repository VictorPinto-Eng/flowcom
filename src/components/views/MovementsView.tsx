'use client';

import { useState, useMemo } from 'react';
import Swal from 'sweetalert2';
import styles from './MovementsView.module.css';
import { getMovementsAction } from '@/app/actions/workspaceActions';

interface Movement {
  id: string;
  date: string;
  type: 'BOARD_CREATED' | 'CARD_CREATED' | 'CARD_ACTIVITY';
  actionName: string;
  description: string;
  userName: string;
  userImage: string | null;
  workspaceName: string;
  workspaceSeqid: string;
  boardName: string;
  boardSeqId: string;
  cardTitle?: string;
}

interface WorkspaceWithDetails {
  id: string;
  seqid: string;
  name: string;
}

interface MovementsViewProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  workspaces: WorkspaceWithDetails[];
  onBack: () => void;
}

const getLocalISOString = (d: Date) => {
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function MovementsView({ currentUser, workspaces, onBack }: MovementsViewProps) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasConsulted, setHasConsulted] = useState(false);

  // Draft Filters State (bound to inputs)
  const [draftWorkspace, setDraftWorkspace] = useState<string>('ALL');
  const [draftType, setDraftType] = useState<string>('ALL');
  const [draftSearchTerm, setDraftSearchTerm] = useState<string>('');
  const [draftStartDate, setDraftStartDate] = useState<string>(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return getLocalISOString(firstDay);
  });
  const [draftEndDate, setDraftEndDate] = useState<string>(() => {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return getLocalISOString(lastDay);
  });

  // Active Filters State (used for querying/rendering)
  const [activeWorkspace, setActiveWorkspace] = useState<string>('ALL');
  const [activeType, setActiveType] = useState<string>('ALL');
  const [activeSearchTerm, setActiveSearchTerm] = useState<string>('');
  const [activeStartDate, setActiveStartDate] = useState<string>('');
  const [activeEndDate, setActiveEndDate] = useState<string>('');

  const handleConsultar = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMovementsAction();
      setMovements(data as any[]);
      
      // Lock in the active filters
      setActiveWorkspace(draftWorkspace);
      setActiveType(draftType);
      setActiveStartDate(draftStartDate);
      setActiveEndDate(draftEndDate);
      setActiveSearchTerm(draftSearchTerm);
      
      setHasConsulted(true);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao carregar as movimentações do banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered movements calculation based on active/submitted filter values
  const filteredMovements = useMemo(() => {
    if (!hasConsulted) return [];

    return movements.filter(m => {
      // Workspace filter
      if (activeWorkspace !== 'ALL' && m.workspaceSeqid !== activeWorkspace) {
        return false;
      }

      // Type filter
      if (activeType !== 'ALL' && m.type !== activeType) {
        return false;
      }

      // Date Range filter
      if (activeStartDate) {
        const startLimit = new Date(activeStartDate + 'T00:00:00');
        if (new Date(m.date) < startLimit) return false;
      }
      if (activeEndDate) {
        const endLimit = new Date(activeEndDate + 'T23:59:59');
        if (new Date(m.date) > endLimit) return false;
      }

      // Text search filter
      if (activeSearchTerm.trim()) {
        const lowerSearch = activeSearchTerm.toLowerCase();
        const matchesUser = m.userName.toLowerCase().includes(lowerSearch);
        const matchesWorkspace = m.workspaceName.toLowerCase().includes(lowerSearch);
        const matchesBoard = m.boardName.toLowerCase().includes(lowerSearch);
        const matchesCard = m.cardTitle?.toLowerCase().includes(lowerSearch) || false;
        const matchesDescription = m.description.toLowerCase().includes(lowerSearch);

        if (!matchesUser && !matchesWorkspace && !matchesBoard && !matchesCard && !matchesDescription) {
          return false;
        }
      }

      return true;
    });
  }, [movements, activeWorkspace, activeType, activeStartDate, activeEndDate, activeSearchTerm, hasConsulted]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = filteredMovements.length;
    const boardCreated = filteredMovements.filter(m => m.type === 'BOARD_CREATED').length;
    const cardCreated = filteredMovements.filter(m => m.type === 'CARD_CREATED').length;
    const cardActivity = filteredMovements.filter(m => m.type === 'CARD_ACTIVITY').length;

    return { total, boardCreated, cardCreated, cardActivity };
  }, [filteredMovements]);

  const handlePrint = async () => {
    if (filteredMovements.length === 0) return;

    const pdfWindow = window.open('', '_blank');
    if (!pdfWindow) {
      Swal.fire({
        title: 'Pop-up bloqueado',
        html: '<p style="font-size: 0.9rem; color: #94a3b8; margin: 0;">Ative a exibição de pop-ups para gerar o PDF.</p>',
        confirmButtonColor: '#7c3aed',
        background: '#1e1e2e',
        color: '#fff',
        width: '360px',
        padding: '1.5rem',
        backdrop: 'rgba(0,0,0,0.6)'
      });
      return;
    }
    pdfWindow.document.write('<html><head><title>Gerando PDF...</title><style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;color:#475569;background:#f8fafc}.spinner{border:4px solid #e2e8f0;border-top:4px solid #6366f1;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin-bottom:15px}@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style></head><body><div class="spinner"></div><div>Gerando documento PDF...</div></body></html>');
    pdfWindow.document.close();

    try {
      // Load html2pdf
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
      const nrControle = String(Math.floor(1000 + Math.random() * 9000));
      const filename = `movimentacoes_${anoMesDia}_${nrControle}.pdf`;

      const formatDt = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleString('pt-BR');
      };

      const typeLabel = (type: string) => {
        if (type === 'BOARD_CREATED') return 'Atividade Criada';
        if (type === 'CARD_CREATED') return 'Evento Criado';
        return 'Andamento';
      };

      const tableRows = filteredMovements.map(m =>
        `<tr style="page-break-inside:avoid;">
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:10px;">${formatDt(m.date)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:10px;">${typeLabel(m.type)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:10px;">${m.workspaceName}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:10px;">${m.boardName}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:10px;">${m.description}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:10px;">${m.userName}</td>
        </tr>`
      ).join('');

      const htmlContent = `<div style="width:710px;padding:15px;background:white;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;">
        <div style="border-bottom:2px solid #cbd5e1;padding-bottom:12px;margin-bottom:16px;position:relative;">
          <div style="position:absolute;right:0;top:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Controle: ${nrControle}</div>
          <div style="font-size:18px;font-weight:800;color:#0f172a;margin-bottom:4px;">Movimentações do Período</div>
          <div style="font-size:11px;color:#64748b;">Registro cronológico de operações e andamentos</div>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #cbd5e1;">
          <thead><tr style="background:#f1f5f9;">
            <th style="padding:8px;text-align:left;border-bottom:1px solid #cbd5e1;font-size:10px;font-weight:700;text-transform:uppercase;width:110px;">DATA</th>
            <th style="padding:8px;text-align:left;border-bottom:1px solid #cbd5e1;font-size:10px;font-weight:700;text-transform:uppercase;width:100px;">TIPO</th>
            <th style="padding:8px;text-align:left;border-bottom:1px solid #cbd5e1;font-size:10px;font-weight:700;text-transform:uppercase;width:90px;">ÁREA</th>
            <th style="padding:8px;text-align:left;border-bottom:1px solid #cbd5e1;font-size:10px;font-weight:700;text-transform:uppercase;width:100px;">ATIVIDADE</th>
            <th style="padding:8px;text-align:left;border-bottom:1px solid #cbd5e1;font-size:10px;font-weight:700;text-transform:uppercase;">DESCRIÇÃO</th>
            <th style="padding:8px;text-align:left;border-bottom:1px solid #cbd5e1;font-size:10px;font-weight:700;text-transform:uppercase;width:80px;">USUÁRIO</th>
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <div style="margin-top:20px;border-top:1px solid #cbd5e1;padding-top:12px;">
          <div style="font-size:9px;color:#64748b;">Total de registros: <strong>${filteredMovements.length}</strong> | Atividades criadas: ${stats.boardCreated} | Eventos criados: ${stats.cardCreated} | Andamentos: ${stats.cardActivity}</div>
        </div>
      </div>`;

      const opt = {
        margin: [6, 6, 6, 6],
        filename: filename,
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
          pdfObj.setProperties({ title: 'Movimentações - Flow' });
          return pdfObj;
        })
        .output('blob');

      const blobUrl = URL.createObjectURL(pdfBlob);
      pdfWindow.location.replace(blobUrl);
    } catch (err) {
      console.error('Error generating PDF:', err);
      Swal.fire({
        title: 'Erro',
        html: '<p style="font-size: 0.9rem; color: #94a3b8; margin: 0;">Ocorreu um erro ao gerar o PDF.</p>',
        confirmButtonColor: '#7c3aed',
        background: '#1e1e2e',
        color: '#fff',
        width: '320px',
        padding: '1.5rem',
        backdrop: 'rgba(0,0,0,0.6)'
      });
      pdfWindow.close();
    }
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('pt-BR');
  };

  const getAvatarLetter = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  return (
    <div className={`${styles.container} animate-fade-in`}>
      <header className={styles.header}>
        <div className={styles.titleWrapper}>
          <h1>Movimentações do Período</h1>
          <p className={styles.noPrintHeader}>Acompanhe o registro cronológico detalhado de todas as operações e andamentos nas áreas de trabalho.</p>
        </div>
        <div className={`${styles.actions} ${styles.noPrintHeader}`}>
          <button
            className={styles.printBtn}
            onClick={handlePrint}
            title="Gerar PDF"
            disabled={filteredMovements.length === 0}
          >
            🖨️ PDF
          </button>
          <button className={styles.backBtn} onClick={onBack} title="Voltar">
            ← Voltar
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statIcon} style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>📊</span>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.total}</span>
            <span className={styles.statLabel}>Movimentações Totais</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>🔑</span>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.boardCreated}</span>
            <span className={styles.statLabel}>Abertura de Atividades</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>⚡</span>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.cardCreated}</span>
            <span className={styles.statLabel}>Eventos (Mês Anterior)</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon} style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9' }}>💬</span>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.cardActivity}</span>
            <span className={styles.statLabel}>Andamentos de Evento</span>
          </div>
        </div>
      </section>

      {/* Filters Form */}
      <section className={`${styles.filtersSection} ${styles.noPrintHeader} glass`}>
        <div className={styles.filterGroup}>
          <label htmlFor="workspaceFilter">Projeto / Área</label>
          <select
            id="workspaceFilter"
            value={draftWorkspace}
            onChange={e => setDraftWorkspace(e.target.value)}
            className={styles.selectInput}
          >
            <option value="ALL">Todos os Projetos</option>
            {workspaces.map(ws => (
              <option key={ws.seqid} value={ws.seqid}>{ws.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="typeFilter">Tipo</label>
          <select
            id="typeFilter"
            value={draftType}
            onChange={e => setDraftType(e.target.value)}
            className={styles.selectInput}
          >
            <option value="ALL">Todos os Tipos</option>
            <option value="BOARD_CREATED">Abertura de Atividades</option>
            <option value="CARD_CREATED">Eventos (Mês Anterior)</option>
            <option value="CARD_ACTIVITY">Andamentos de Evento</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="startDate">Data Inicial</label>
          <input
            type="date"
            id="startDate"
            value={draftStartDate}
            onChange={e => setDraftStartDate(e.target.value)}
            className={styles.dateInput}
          />
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="endDate">Data Final</label>
          <input
            type="date"
            id="endDate"
            value={draftEndDate}
            onChange={e => setDraftEndDate(e.target.value)}
            className={styles.dateInput}
          />
        </div>

        <div className={styles.filterGroup} style={{ flex: 1.5 }}>
          <label htmlFor="searchFilter">Pesquisa</label>
          <input
            type="text"
            id="searchFilter"
            placeholder="Buscar por descrição, usuário, fluxo..."
            value={draftSearchTerm}
            onChange={e => setDraftSearchTerm(e.target.value)}
            className={styles.textInput}
          />
        </div>

        <div className={styles.filterGroup} style={{ justifyContent: 'flex-end' }}>
          <button 
            className={styles.consultBtn} 
            onClick={handleConsultar}
            disabled={loading}
          >
            {loading ? '⏳ Buscando...' : '🔍 Consultar'}
          </button>
        </div>
      </section>

      {/* Movements Table */}
      <div className={styles.reportContent}>
        {loading ? (
          <div className={styles.emptyState}>
            <p>Carregando movimentações do sistema...</p>
          </div>
        ) : error ? (
          <div className={styles.errorState}>
            <p>{error}</p>
          </div>
        ) : !hasConsulted ? (
          <div className={styles.emptyState}>
            <p>Selecione os filtros acima e clique em <strong>Consultar</strong> para carregar o histórico de movimentações.</p>
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Nenhuma movimentação registrada no período correspondente aos filtros selecionados.</p>
          </div>
        ) : (
          <div className={`${styles.tableWrapper} glass`}>
            <table className={styles.movementsTable}>
              <thead>
                <tr>
                  <th>Data / Hora</th>
                  <th>Usuário</th>
                  <th>Tipo</th>
                  <th>Área / Projeto</th>
                  <th>Atividade / Evento</th>
                  <th>Descrição da Ação</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map(m => {
                  let badgeClass = styles.badgeBoard;
                  if (m.type === 'CARD_CREATED') badgeClass = styles.badgeCard;
                  if (m.type === 'CARD_ACTIVITY') badgeClass = styles.badgeActivity;

                  return (
                    <tr key={m.id}>
                      <td className={styles.dateCell}>{formatDateTime(m.date)}</td>
                      <td className={styles.userCell}>
                        <div className={styles.userAvatarWrapper}>
                          {m.userImage ? (
                            <img src={m.userImage} alt={m.userName} className={styles.userAvatarImg} />
                          ) : (
                            <div className={styles.userAvatarPlaceholder}>{getAvatarLetter(m.userName)}</div>
                          )}
                          <span className={styles.userName}>{m.userName}</span>
                        </div>
                      </td>
                      <td className={styles.typeCell}>
                        <span className={`${styles.typeBadge} ${badgeClass}`}>
                          {m.actionName}
                        </span>
                      </td>
                      <td className={styles.workspaceCell}>{m.workspaceName}</td>
                      <td className={styles.boardCell}>
                        <strong>{m.boardName}</strong>
                        {m.cardTitle && <div className={styles.subCardTitle}>↳ {m.cardTitle}</div>}
                      </td>
                      <td className={styles.descCell}>{m.description}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
