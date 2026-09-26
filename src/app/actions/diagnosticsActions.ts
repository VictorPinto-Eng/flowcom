'use server';

import prisma from '@/lib/prisma';
import { UserRepository } from '@/domain/repositories/UserRepository';
import { sendTestEmail } from '@/lib/resend';
import { isRateLimited } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/get-client-ip';
import { requirePlatformAdmin } from '@/lib/admin';

const userRepo = new UserRepository();

export interface ServerDiagnostics {
  timestamp: string;
  database: {
    totalWorkspaces: number;
    totalBoards: number;
    totalCards: number;
    totalCardActions: number;
    totalUsers: number;
    totalWorkspaceMembers: number;
  };
  userMetrics: {
    userId: string;
    userName: string;
    userEmail: string;
    userSeqid: string;
    workspacesOwned: number;
    workspacesAsMember: number;
    totalBoardsAccessible: number;
    totalCardsAccessible: number;
    totalCardActionsAccessible: number;
  };
  topWorkspaces: Array<{
    workspaceName: string;
    boardCount: number;
    cardCount: number;
  }>;
  recommendations: string[];
}

export async function getServerDiagnosticsAction(): Promise<ServerDiagnostics> {
  await requirePlatformAdmin();

  const user = await userRepo.getLoggedUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const now = new Date().toISOString();
  const userSeqid = BigInt(user.seqid || 0);

  // Get overall database metrics
  const [totalWorkspaces, totalBoards, totalCards, totalCardActions, totalUsers, totalMembers] = await Promise.all([
    prisma.workspace.count(),
    prisma.board.count(),
    prisma.card.count(),
    prisma.card_act.count(),
    prisma.user.count(),
    prisma.workspaceMember.count()
  ]);

  // Get user's accessible data
  const userWorkspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { users_seqid: userSeqid },
        { members: { some: { userSeqid } } }
      ]
    },
    select: { seqid: true, name: true, users_seqid: true }
  });

  const workspaceSeqids = userWorkspaces.map(w => w.seqid);
  const workspacesOwned = userWorkspaces.filter(w => w.users_seqid === userSeqid).length;
  const workspacesAsMember = userWorkspaces.length - workspacesOwned;

  // Get boards accessible to user
  const userBoards = await prisma.board.findMany({
    where: { workspaceId: { in: workspaceSeqids } }
  });
  const totalBoardsAccessible = userBoards.length;

  // Get cards accessible to user
  const userCards = await prisma.card.findMany({
    where: {
      column: { workspaceSeqid: { in: workspaceSeqids } }
    }
  });
  const totalCardsAccessible = userCards.length;
  const cardSeqids = userCards.map(c => c.seqid);

  // Get card actions for user's cards
  const userCardActions = await prisma.card_act.findMany({
    where: { card_seqid: { in: cardSeqids } }
  });
  const totalCardActionsAccessible = userCardActions.length;

  // Calculate top workspaces by card count
  const topWorkspaces: Array<{
    workspaceName: string;
    boardCount: number;
    cardCount: number;
  }> = [];

  for (const workspace of userWorkspaces) {
    const wsBoards = userBoards.filter(b => b.workspaceId === workspace.seqid);
    const wsBoardSeqids = wsBoards.map(b => b.seqId);

    const wsCards = userCards.filter(c => {
      return wsBoardSeqids.includes(c.board_seqid as bigint);
    });

    topWorkspaces.push({
      workspaceName: workspace.name,
      boardCount: wsBoards.length,
      cardCount: wsCards.length
    });
  }

  topWorkspaces.sort((a, b) => b.cardCount - a.cardCount);

  // Generate recommendations
  const recommendations = generateRecommendations({
    totalCards,
    totalCardActions,
    userCardsAccessible: totalCardsAccessible,
    userBoardsAccessible: totalBoardsAccessible,
    userWorkspacesAccessible: userWorkspaces.length
  });

  // Save snapshot: delete previous for this user, then insert new
  try {
    await prisma.serverDiagnosticSnapshot.deleteMany({
      where: { userSeqid }
    });

    await prisma.serverDiagnosticSnapshot.create({
      data: {
        userSeqid,
        totalWorkspaces,
        totalBoards,
        totalCards,
        totalCardActions,
        totalUsers,
        totalWorkspaceMembers: totalMembers,
        userWorkspacesOwned: workspacesOwned,
        userWorkspacesAsMember: workspacesAsMember,
        userBoardsAccessible: totalBoardsAccessible,
        userCardsAccessible: totalCardsAccessible,
        userCardActionsAccessible: totalCardActionsAccessible,
        topWorkspacesJson: JSON.stringify(topWorkspaces.slice(0, 5)),
        recommendationsJson: JSON.stringify(recommendations)
      }
    });
  } catch (err) {
    console.error('Failed to save diagnostic snapshot:', err);
  }

  return {
    timestamp: now,
    database: {
      totalWorkspaces,
      totalBoards,
      totalCards,
      totalCardActions,
      totalUsers,
      totalWorkspaceMembers: totalMembers
    },
    userMetrics: {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userSeqid: user.seqid?.toString() || 'N/A',
      workspacesOwned,
      workspacesAsMember,
      totalBoardsAccessible,
      totalCardsAccessible,
      totalCardActionsAccessible
    },
    topWorkspaces: topWorkspaces.slice(0, 5),
    recommendations
  };
}

export async function sendTestEmailAction(email: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const user = await userRepo.getLoggedUser();
    if (!user) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    await requirePlatformAdmin();

    const trimmed = (email || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return { success: false, error: 'Informe um e-mail válido' };
    }

    const ip = await getClientIp();
    if (await isRateLimited(ip, user.email, 'TEST_EMAIL')) {
      return { success: false, error: 'Limite de testes atingido. Tente novamente em alguns minutos.' };
    }

    return await sendTestEmail(trimmed);
  } catch (err) {
    console.error('Error in sendTestEmailAction:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao enviar e-mail de teste' };
  }
}

function generateRecommendations(metrics: {
  totalCards: number;
  totalCardActions: number;
  userCardsAccessible: number;
  userBoardsAccessible: number;
  userWorkspacesAccessible: number;
}): string[] {
  const recommendations: string[] = [];

  if (metrics.userCardsAccessible > 10000) {
    recommendations.push(
      '⚠️ HIGH: Over 10k cards accessible. Consider implementing pagination/virtualization.'
    );
  }

  if (metrics.userBoardsAccessible > 500) {
    recommendations.push(
      '⚠️ MEDIUM: Over 500 boards accessible. Consider lazy-loading or filtering boards.'
    );
  }

  if (metrics.userWorkspacesAccessible > 20) {
    recommendations.push(
      '⚠️ MEDIUM: User has access to over 20 workspaces. Consider lazy-loading workspace details.'
    );
  }

  if (metrics.totalCardActions > 100000) {
    recommendations.push(
      '✅ Note: High card action count (100k+). Archive/delete old actions periodically.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ OK: System metrics look healthy.');
  }

  return recommendations;
}

export interface StructuralAlert {
  id: string;
  severity: 'CRITICO' | 'ATENCAO' | 'INFO';
  title: string;
  detail: string;
  fix?: string;
}

export interface EvolutionReport {
  generatedAt: string;
  structuralAlerts: StructuralAlert[];
  kpis: {
    totalUsers: number;
    activeFlagUsers: number;
    new7d: number;
    new30d: number;
    newPrev30d: number;
    signupDeltaPct: number | null;
    wau: number;
    mau: number;
    retentionWauMau: number | null;
    activationRatePct: number;
    actions30d: number;
    actionsPrev30d: number;
    actionsDeltaPct: number | null;
    actionsPerActiveUser: number;
    logins7d: number;
    sessionsActiveNow: number;
    churned30d: number;
    neverActivated: number;
    churnRatePct: number | null;
    cards30d: number;
    workspaces30d: number;
  };
  signupsByMonth: Array<{ month: string; count: number }>;
  activityByWeek: Array<{ week: string; actions: number; users: number }>;
  recentSessions: Array<{ name: string; email: string; createdAt: string; expiresAt: string }>;
  loginAttempts: Array<{ ip: string; email: string | null; count: number; lastAttempt: string }>;
  verdict: {
    status: 'SAUDAVEL' | 'ATENCAO' | 'CRITICO';
    score: number;
    insights: string[];
  };
}

export async function getEvolutionAction(): Promise<EvolutionReport> {
  await requirePlatformAdmin();

  // Bloco principal: se falhar, a tela mostra erro com botão de retry
  const [kpiRows, signupRows, activityRows] = await Promise.all([
    prisma.$queryRaw<Array<Record<string, number | bigint>>>`
      SELECT
        (SELECT count(*) FROM users)::int AS total_users,
        (SELECT count(*) FROM users WHERE active)::int AS active_flag_users,
        (SELECT count(*) FROM users WHERE created_at > now() - interval '7 days')::int AS new_7d,
        (SELECT count(*) FROM users WHERE created_at > now() - interval '30 days')::int AS new_30d,
        (SELECT count(*) FROM users WHERE created_at > now() - interval '60 days' AND created_at <= now() - interval '30 days')::int AS new_prev_30d,
        (SELECT count(DISTINCT user_seqid) FROM card_act WHERE created_at > now() - interval '7 days')::int AS wau,
        (SELECT count(DISTINCT user_seqid) FROM card_act WHERE created_at > now() - interval '30 days')::int AS mau,
        (SELECT count(*) FROM card_act WHERE created_at > now() - interval '30 days')::int AS actions_30d,
        (SELECT count(*) FROM card_act WHERE created_at > now() - interval '60 days' AND created_at <= now() - interval '30 days')::int AS actions_prev_30d,
        (SELECT count(*) FROM session WHERE created_at > now() - interval '7 days')::int AS logins_7d,
        (SELECT count(*) FROM session)::int AS sessions_active_now,
        (SELECT count(*) FROM users u
           WHERE u.created_at <= now() - interval '30 days'
             AND EXISTS (SELECT 1 FROM card_act ca WHERE ca.user_seqid = u.seqid)
             AND NOT EXISTS (SELECT 1 FROM card_act ca2 WHERE ca2.user_seqid = u.seqid AND ca2.created_at > now() - interval '30 days')
        )::int AS churned_30d,
        (SELECT count(*) FROM users u
           WHERE u.created_at <= now() - interval '30 days'
             AND NOT EXISTS (SELECT 1 FROM card_act ca WHERE ca.user_seqid = u.seqid)
        )::int AS never_activated,
        (SELECT count(*) FROM users WHERE created_at <= now() - interval '30 days')::int AS users_older_30d,
        (SELECT count(*) FROM card WHERE created_at > now() - interval '30 days')::int AS cards_30d,
        (SELECT count(*) FROM workspace WHERE created_at > now() - interval '30 days')::int AS workspaces_30d
    `,
    prisma.$queryRaw<Array<{ month: string; count: number }>>`
      SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, count(*)::int AS count
      FROM users
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 12
    `,
    prisma.$queryRaw<Array<{ week: string; actions: number; users: number }>>`
      SELECT to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS week,
             count(*)::int AS actions,
             count(DISTINCT user_seqid)::int AS users
      FROM card_act
      WHERE created_at > now() - interval '70 days'
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 8
    `
  ]);

  // Blocos secundários: falham em isolamento, sem derrubar o relatório
  const sessionRows = await runTolerant('recentSessions', () =>
    prisma.$queryRaw<Array<{ name: string; email: string; createdAt: Date; expiresAt: Date }>>`
      SELECT u.name, u.email, s.created_at AS "createdAt", s.expires_at AS "expiresAt"
      FROM session s
      JOIN users u ON u.seqid = s.user_seqid
      ORDER BY s.created_at DESC
      LIMIT 15
    `
  );

  const attemptRows = await runTolerant('loginAttempts', () =>
    prisma.$queryRaw<Array<{ ip: string; email: string | null; count: number; lastAttempt: Date }>>`
      SELECT ip, email, count, "lastAttempt"
      FROM auth_attempts
      WHERE type = 'LOGIN'
      ORDER BY "lastAttempt" DESC
      LIMIT 15
    `
  );

  const integrity = await runIntegrityChecks();

  const k0 = kpiRows[0] || {};
  const num = (v: unknown): number => Number(v ?? 0);
  const pct = (cur: number, prev: number): number | null =>
    prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null;

  const totalUsers = num(k0.total_users);
  const wau = num(k0.wau);
  const mau = num(k0.mau);
  const actions30d = num(k0.actions_30d);
  const actionsPrev30d = num(k0.actions_prev_30d);
  const new30d = num(k0.new_30d);
  const newPrev30d = num(k0.new_prev_30d);
  const churned30d = num(k0.churned_30d);
  const neverActivated = num(k0.never_activated);
  const usersOlder30d = num(k0.users_older_30d);
  const retention = mau > 0 ? Math.round((wau / mau) * 1000) / 10 : null;

  const kpis: EvolutionReport['kpis'] = {
    totalUsers,
    activeFlagUsers: num(k0.active_flag_users),
    new7d: num(k0.new_7d),
    new30d,
    newPrev30d,
    signupDeltaPct: pct(new30d, newPrev30d),
    wau,
    mau,
    retentionWauMau: retention,
    activationRatePct: totalUsers > 0 ? Math.round((mau / totalUsers) * 1000) / 10 : 0,
    actions30d,
    actionsPrev30d,
    actionsDeltaPct: pct(actions30d, actionsPrev30d),
    actionsPerActiveUser: mau > 0 ? Math.round((actions30d / mau) * 10) / 10 : 0,
    logins7d: num(k0.logins_7d),
    sessionsActiveNow: num(k0.sessions_active_now),
    churned30d,
    neverActivated,
    churnRatePct: usersOlder30d > 0 ? Math.round(((churned30d + neverActivated) / usersOlder30d) * 1000) / 10 : null,
    cards30d: num(k0.cards_30d),
    workspaces30d: num(k0.workspaces_30d)
  };

  const structuralAlerts = buildStructuralAlerts(integrity);

  if (sessionRows === null) {
    structuralAlerts.push({
      id: 'recent_sessions_unavailable',
      severity: 'INFO',
      title: 'Últimos acessos indisponíveis',
      detail: 'A consulta de sessões falhou — a seção "quem está acessando" exibiu lista vazia.',
      fix: 'Conferir logs do container (tabela session).'
    });
  }
  if (attemptRows === null) {
    structuralAlerts.push({
      id: 'login_attempts_unavailable',
      severity: 'INFO',
      title: 'Tentativas de login indisponíveis',
      detail: 'A consulta de auth_attempts falhou — a lista de IPs exibiu vazio.',
      fix: 'Conferir logs do container (tabela auth_attempts).'
    });
  }

  const verdict = applyStructuralAlerts(buildVerdict(kpis), structuralAlerts);

  return {
    generatedAt: new Date().toISOString(),
    structuralAlerts,
    kpis,
    signupsByMonth: signupRows.reverse(),
    activityByWeek: activityRows.reverse(),
    recentSessions: (sessionRows || []).map(s => ({
      name: s.name,
      email: s.email,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString()
    })),
    loginAttempts: (attemptRows || []).map(a => ({
      ip: a.ip,
      email: a.email,
      count: a.count,
      lastAttempt: a.lastAttempt.toISOString()
    })),
    verdict
  };
}

function buildVerdict(k: EvolutionReport['kpis']): EvolutionReport['verdict'] {
  const insights: string[] = [];
  let score = 100;

  const fmtPct = (v: number | null): string => (v === null ? '—' : `${v > 0 ? '+' : ''}${v}%`);

  // 1. Aquisição
  if (k.signupDeltaPct === null) {
    insights.push(`📊 Cadastros (30d): ${k.new30d} — sem base anterior para comparar tendência.`);
  } else if (k.signupDeltaPct >= 10) {
    insights.push(`📈 Cadastros em alta: ${k.new30d} nos últimos 30 dias (${fmtPct(k.signupDeltaPct)} vs período anterior).`);
  } else if (k.signupDeltaPct <= -10) {
    insights.push(`📉 Cadastro em queda: ${k.new30d} nos últimos 30 dias (${fmtPct(k.signupDeltaPct)} vs período anterior). Revise o funil de ativação.`);
    score -= 15;
  } else {
    insights.push(`➖ Cadastros estáveis: ${k.new30d} nos últimos 30 dias (${fmtPct(k.signupDeltaPct)}).`);
  }

  // 2. Ativação
  if (k.totalUsers > 0 && k.activationRatePct < 50) {
    insights.push(`⚠️ Ativação baixa: apenas ${k.activationRatePct}% dos usuários tiveram atividade nos últimos 30 dias (${k.neverActivated} nunca ativaram). Foque no onboarding/primeiro uso.`);
    score -= 25;
  } else {
    insights.push(`✅ Ativação: ${k.activationRatePct}% dos usuários ativos nos últimos 30 dias.`);
  }

  // 3. Retenção (WAU/MAU)
  if (k.retentionWauMau !== null && k.retentionWauMau < 30) {
    insights.push(`⚠️ Retenção fraca: só ${k.retentionWauMau}% dos ativos mensais voltaram na última semana. Risco de churn.`);
    score -= 20;
  } else if (k.retentionWauMau !== null) {
    insights.push(`✅ Retenção semanal: ${k.retentionWauMau}% dos ativos mensais (${k.wau} de ${k.mau}).`);
  }

  // 4. Engajamento
  if (k.actionsDeltaPct !== null && k.actionsDeltaPct <= -20) {
    insights.push(`📉 Ações caíram ${Math.abs(k.actionsDeltaPct)}% vs período anterior (${k.actions30d} em 30d). Verifique se houve bug ou perda de interesse.`);
    score -= 15;
  } else if (k.actionsDeltaPct !== null) {
    insights.push(`📊 Atividade: ${k.actions30d} ações em 30 dias (${fmtPct(k.actionsDeltaPct)}), ${k.actionsPerActiveUser} por usuário ativo.`);
  }

  // 5. Churn
  if (k.churnRatePct !== null && k.churnRatePct > 50) {
    insights.push(`🚨 Churn alto: ${k.churnRatePct}% dos usuários com mais de 30 dias estão sem atividade recente (${k.churned30d} churned + ${k.neverActivated} nunca ativaram).`);
    score -= 20;
  } else if (k.churnRatePct !== null) {
    insights.push(`✅ Churn controlado: ${k.churnRatePct}% de usuários sem atividade recente.`);
  }

  // 6. Ritmo atual
  insights.push(
    `🔎 Ritmo agora: ${k.logins7d} logins (7d), ${k.sessionsActiveNow} sessões ativas, ${k.cards30d} cards e ${k.workspaces30d} workspaces criados em 30d.`
  );

  score = Math.max(0, Math.min(100, score));
  const status: EvolutionReport['verdict']['status'] =
    score >= 70 ? 'SAUDAVEL' : score >= 40 ? 'ATENCAO' : 'CRITICO';

  return { status, score, insights };
}

function buildStructuralAlerts(row: Record<string, number | null>): StructuralAlert[] {
  const n = (key: string): number => Number(row[key] ?? 0);
  const alerts: StructuralAlert[] = [];

  const add = (id: string, severity: StructuralAlert['severity'], title: string, detail: string, fix?: string) => {
    alerts.push({ id, severity, title, detail, fix });
  };

  const orphanActivityUser = n('orphan_activity_user');
  const orphanActivityBoard = n('orphan_activity_board');
  if (orphanActivityUser > 0 || orphanActivityBoard > 0) {
    add(
      'activitylog_orphans',
      'CRITICO',
      'ActivityLog com refer�ncias �rf�s',
      `${orphanActivityUser} registros apontam para usu�rio inexistente e ${orphanActivityBoard} para board inexistente. A tabela n�o tem FK (ver ROADMAP M-006), ent�o exclus�es deixam lixo para tr�s.`,
      'Limpar com DELETE WHERE NOT EXISTS e avaliar adicionar FKs.'
    );
  }

  const cardsOrphanColumn = n('cards_orphan_column');
  if (cardsOrphanColumn > 0) {
    add(
      'cards_orphan_column',
      'CRITICO',
      'Cards apontando para coluna inexistente',
      `${cardsOrphanColumn} card(s) com column_id sem coluna correspondente. O board desses cards n�o renderiza.`,
      'Verificar exclus�es em cascata de workspace_column.'
    );
  }

  const cardsCrossWorkspace = n('cards_cross_workspace');
  if (cardsCrossWorkspace > 0) {
    add(
      'cards_cross_workspace',
      'CRITICO',
      'Cards em coluna de outro workspace',
      `${cardsCrossWorkspace} card(s) cuja coluna pertence a um workspace diferente do board � risco de vazamento de dados entre workspaces.`,
      'Mover os cards para a coluna correta do pr�prio board.'
    );
  }

  const boardsOrphanWorkspace = n('boards_orphan_workspace');
  if (boardsOrphanWorkspace > 0) {
    add(
      'boards_orphan_workspace',
      'CRITICO',
      'Boards sem workspace',
      `${boardsOrphanWorkspace} board(s) com workspace_id inexistente � inacess�veis e invis�veis.`,
      'Confirmar FK ausente e remover/reassociar os boards.'
    );
  }

  const workspacesOrphanType = n('workspaces_orphan_type');
  if (workspacesOrphanType > 0) {
    add(
      'workspaces_orphan_type',
      'CRITICO',
      'Workspaces sem tipo',
      `${workspacesOrphanType} workspace(s) com type_id inexistente � podem quebrar listagens que fazem include de type.`,
      'Inserir o tipo faltante ou corrigir type_id.'
    );
  }

  const sessionsUnactivated = n('sessions_unactivated_users');
  if (sessionsUnactivated > 0) {
    add(
      'sessions_unactivated',
      'ATENCAO',
      'Sess�es de usu�rios n�o ativados',
      `${sessionsUnactivated} sess�o(�es) ativa(s) para usu�rio com active=false � quem n�o ativou o e-mail est� usando o sistema.`,
      'Revisar a checagem de active no login.'
    );
  }

  const expiredSessions = n('expired_sessions');
  if (expiredSessions > 0) {
    add(
      'expired_sessions',
      'ATENCAO',
      'Sess�es expiradas acumuladas',
      `${expiredSessions} registro(s) em session com expires_at no passado. A fun��o cleanupExpiredSessions() existe mas nunca � chamada.`,
      'Agendar cleanupExpiredSessions() (cron/lifespan) ou cham�-la no login.'
    );
  }

  const bruteForceIps = n('brute_force_ips');
  if (bruteForceIps > 0) {
    add(
      'brute_force',
      'ATENCAO',
      'Poss�vel for�a bruta em andamento',
      `${bruteForceIps} IP(s) com 10+ tentativas de login registradas em auth_attempts.`,
      'Conferir a tabela no banco e bloquear IPs suspeitos no proxy.'
    );
  }

  const boardsWithoutColumns = n('boards_without_columns');
  if (boardsWithoutColumns > 0) {
    add(
      'boards_without_columns',
      'ATENCAO',
      'Boards sem colunas',
      `${boardsWithoutColumns} board(s) sem nenhuma coluna � parecem vazios/inacess�veis para o usu�rio.`,
      'Criar as colunas padr�o ou remover os boards abandonados.'
    );
  }

  const expiredInvites = n('expired_invites');
  if (expiredInvites > 50) {
    add(
      'expired_invites',
      'INFO',
      'Convites expirados acumulados',
      `${expiredInvites} convite(s) com expires_at no passado ocupando espa�o.`,
      'Rotina de expurgo de workspace_invite antigos.'
    );
  }

  const expiredTokens = n('expired_tokens');
  if (expiredTokens > 50) {
    add(
      'expired_tokens',
      'INFO',
      'Tokens de verifica��o expirados',
      `${expiredTokens} verification_token(s) vencidos sem limpeza.`,
      'Rotina de expurgo de verification_tokens vencidos.'
    );
  }

  const authAttemptsTotal = n('auth_attempts_total');
  if (authAttemptsTotal > 5000) {
    add(
      'auth_attempts_growth',
      'INFO',
      'auth_attempts crescendo sem expurgo',
      `${authAttemptsTotal} registro(s) na tabela de rate limit � n�o h� rotina de limpeza.`,
      'Apagar linhas com lastAttempt anterior a 30 dias.'
    );
  }

  const failedChecks = Object.keys(row).filter(key => row[key] === null);
  for (const id of failedChecks) {
    add(
      `${id}_failed`,
      'INFO',
      'Verificação indisponível',
      `O check "${id}" não pôde ser executado (tabela/coluna ausente ou erro de query) — os demais seguiram normalmente.`,
      'Conferir logs do container e o schema real no banco.'
    );
  }

  const order = { CRITICO: 0, ATENCAO: 1, INFO: 2 } as const;
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}

type IntegrityCounts = Record<string, number | null>;

async function runTolerant<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[diagnostics] query "${label}" failed:`, err);
    return null;
  }
}

const INTEGRITY_CHECKS: Array<{ id: string; sql: string }> = [
  { id: 'expired_sessions', sql: 'SELECT (SELECT count(*) FROM session WHERE expires_at < now())::int AS c' },
  { id: 'expired_tokens', sql: 'SELECT (SELECT count(*) FROM verification_tokens WHERE expires < now())::int AS c' },
  { id: 'expired_invites', sql: 'SELECT (SELECT count(*) FROM workspace_invite WHERE expires_at < now())::int AS c' },
  { id: 'orphan_activity_user', sql: "SELECT (SELECT count(*) FROM activity_log al WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.seqid::text = al.user_id))::int AS c" },
  { id: 'orphan_activity_board', sql: "SELECT (SELECT count(*) FROM activity_log al WHERE NOT EXISTS (SELECT 1 FROM board b WHERE b.seqid::text = al.board_id))::int AS c" },
  { id: 'brute_force_ips', sql: "SELECT (SELECT count(*) FROM auth_attempts WHERE type = 'LOGIN' AND count >= 10)::int AS c" },
  { id: 'auth_attempts_total', sql: 'SELECT (SELECT count(*) FROM auth_attempts)::int AS c' },
  { id: 'boards_without_columns', sql: 'SELECT (SELECT count(*) FROM board b WHERE NOT EXISTS (SELECT 1 FROM workspace_column c WHERE c.workspace_seqid = b.workspace_id))::int AS c' },
  { id: 'cards_orphan_column', sql: 'SELECT (SELECT count(*) FROM card c WHERE c.column_id NOT IN (SELECT seqid FROM workspace_column))::int AS c' },
  { id: 'cards_cross_workspace', sql: 'SELECT (SELECT count(*) FROM card c JOIN workspace_column col ON col.seqid = c.column_id JOIN board b ON b.seqid = c.board_seqid WHERE col.workspace_seqid <> b.workspace_id)::int AS c' },
  { id: 'sessions_unactivated_users', sql: 'SELECT (SELECT count(*) FROM session s JOIN users u ON u.seqid = s.user_seqid WHERE NOT u.active)::int AS c' },
  { id: 'boards_orphan_workspace', sql: 'SELECT (SELECT count(*) FROM board b WHERE b.workspace_id NOT IN (SELECT seqid FROM workspace))::int AS c' },
  { id: 'workspaces_orphan_type', sql: 'SELECT (SELECT count(*) FROM workspace w WHERE w.type_id NOT IN (SELECT id FROM workspace_type))::int AS c' }
];

async function runIntegrityChecks(): Promise<IntegrityCounts> {
  const results = await Promise.allSettled(
    INTEGRITY_CHECKS.map(check => prisma.$queryRawUnsafe<Array<{ c: number }>>(check.sql))
  );

  const counts: IntegrityCounts = {};
  INTEGRITY_CHECKS.forEach((check, i) => {
    const result = results[i];
    if (result.status === 'fulfilled') {
      counts[check.id] = Number(result.value?.[0]?.c ?? 0);
    } else {
      console.error(`[diagnostics] integrity check "${check.id}" failed:`, result.reason);
      counts[check.id] = null;
    }
  });
  return counts;
}

function applyStructuralAlerts(
  verdict: EvolutionReport['verdict'],
  alerts: StructuralAlert[]
): EvolutionReport['verdict'] {
  if (alerts.length === 0) return verdict;

  const criticals = alerts.filter(a => a.severity === 'CRITICO').length;
  const warnings = alerts.filter(a => a.severity === 'ATENCAO').length;
  const infos = alerts.filter(a => a.severity === 'INFO').length;

  const penalty = criticals * 15 + warnings * 5;
  const score = Math.max(0, verdict.score - penalty);
  const status: EvolutionReport['verdict']['status'] =
    score >= 70 ? 'SAUDAVEL' : score >= 40 ? 'ATENCAO' : 'CRITICO';

  return {
    status,
    score,
    insights: [
      `🚨 ${criticals} problema(s) crítico(s), ${warnings} aviso(s) e ${infos} informativo(s) de integridade — ${penalty > 0 ? `-${penalty} pontos no score` : 'sem impacto no score'}.`,
      ...verdict.insights
    ]
  };
}
