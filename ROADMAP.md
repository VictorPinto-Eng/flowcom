# Roadmap — Flowcom

Este documento é o guia mestre para desenvolvimento, melhorias e correções.
Sirva-se dele antes de qualquer nova implementação para entender o que está
pendente, priorizado e por quê.

## Como Usar

1. Antes de iniciar qualquer tarefa, verifique se há items no roadmap
   relacionados ao que será feito.
2. Se a nova funcionalidade impactar segurança, arquitetura ou fluxos
   críticos, consulte a seção de segurança primeiro.
3. Ao concluir um item, mova-o para "Concluído" com a data e referência
   do commit/PR.
4. Novos items devem ser adicionados na categoria correta com
   prioridade (P0-P3) e justificativa.

---

## Prioridades

| Prioridade | Significado |
|-----------|------------|
| **P0** | Bloqueante — risco crítico de segurança ou perda de dados |
| **P1** | Alta — risco alto, quebra de funcionalidade ou regressão |
| **P2** | Média — melhoria significativa, dívida técnica relevante |
| **P3** | Baixa — nice-to-have, refatoração cosmética, débito técnico leve |

---

## Segurança

### P0 — Crítico

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| S-023 | **`getAllUsersAction` expõe todos os usuários sem autenticação** | Server action sem `getLoggedUser()` — qualquer chamada retorna todos os usuários do sistema. Enumeração massiva de dados. | ✅ Concluído — action e método removidos (2026-06-20) |
| S-024 | **Workspace actions sem verificação de autorização (IDOR)** | Server action sem `getLoggedUser()` — qualquer chamada retorna todos os usuários do sistema. Enumeração massiva de dados. | ✅ Concluído — todas as actions verificam role; `sendWorkspaceInviteAction` corrigida (2026-06-20) |

### P1 — Alta

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| S-005 | **Adicionar Content-Security-Policy (CSP)** | Sem CSP, qualquer XSS no front-end tem impacto total. Next.js recomenda CSP para segurança em profundidade. | ✅ Concluído |
| S-006 | **Adicionar HSTS e outros security headers** | Sem `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options` a aplicação é vulnerável a downgrade attacks e clickjacking. | ✅ Concluído |
| S-007 | **Validar e sanitizar todos os inputs em server actions** | Nome, descrição e detalhes de boards e cards não têm validação de tamanho ou conteúdo no servidor. | ✅ Concluído — criado `src/lib/validation.ts` com sanitização XSS, limites de tamanho e validação de email; aplicado em 10 actions (2026-06-20) |
| S-008 | **Proteger `invite/accept/[token]` contra token injection** | Token é passado via URL param sem validação adicional. Possível vetor de IDOR se token for adivinhado. | ✅ Concluído — validação de formato UUID, verificação de email do destinatário no accept, rate limiting no reject (2026-06-20) |
| S-025 | **Rate limiting com IP hardcoded `127.0.0.1`** | `cardActions.ts` usava IP fixo em vez de `getClientIp()`. Rate limiting completamente ineficaz nessas actions. | ✅ Concluído — substituído por `getClientIp()` em `requestTransferAction` e `respondTransferRequestAction` (2026-06-20) |
| S-026 | **Column actions sem verificação de permissão** | `addColumnAction`, `copyColumnAction`, `deleteColumnAction`, `updateColumnOrderAction`, `toggleColumnVisibilityAction` não verificam role (OWNER/ADMIN) no workspace. Qualquer autenticado pode manipular colunas. | ✅ Concluído — todas as actions agora verificam role OWNER/ADMIN via `assertColumnPermission` (2026-06-20) |
| S-027 | **`createWorkspaceAction` aceita `userId` do cliente** | Action aceita `userId` como parâmetro sem verificar se corresponde ao usuário logado. Um atacante pode criar workspace em nome de outro usuário. | ✅ Concluído — action já usa `user.id` do `getLoggedUser()`, não aceita userId externo (2026-06-20) |
| S-028 | **`updateBoardAction` confia no `userId` do cliente para autorização** | Usa `userId` vindo do cliente para buscar o usuário e checar permissão. Atacante pode passar ID de um OWNER para bypassar a verificação. | ✅ Concluído — `updateBoardAction` e `createBoardAction` agora usam `getLoggedUser()` para auth (2026-06-20) |
| S-029 | **Sem validação de enum no campo `role` de convites/updates** | `sendWorkspaceInviteAction` e `updateWorkspaceMemberRoleAction` aceitam role como string livre. Possível injetar valores arbitrários. | ✅ Concluído — ambas validam role com allowlist (ADMIN/MEMBER e OWNER/ADMIN/MEMBER) (2026-06-20) |

### P2 — Média

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| S-009 | **Implementar refresh token / sliding session** | JWT com expiração fixa de 7 dias sem refresh — sessão expirada abruptamente sem chance de renovação. | Pendente |
| S-010 | **Auditar permissões do papel VIEWER** | Papel VIEWER definido no schema mas nunca checado — membros com VIEWER podem ter acesso indevido a ações de escrita. | Pendente |
| S-011 | **Remover campo `user.role` do schema se não utilizado** | `User.role` (USER) está no schema mas nunca é checado — confunde com `WorkspaceMember.role`. | ✅ Concluído — campo removido do schema Prisma + migration para drop da coluna (2026-06-25) |
| S-012 | **Hardening do cookie de sessão** | `sameSite: 'lax'` permite envio em navegações top-level. Avaliar `strict`. | ✅ Concluído — cookie alterado para `sameSite: 'strict'` (2026-06-25) |
| S-013 | **Adicionar limite de tentativas de login por IP** | Mesmo com rate limiting, um ataque distribuído pode contornar. | Pendente |
| S-036 | **Sessão única por usuário (revogar sessões anteriores no login)** | Múltiplas sessões simultâneas permitem que credenciais comprometidas mantenham acesso mesmo após novo login legítimo. | ✅ Concluído — `createSession` executa `deleteMany` por userSeqid antes de criar nova sessão (2026-06-25) |
| S-030 | **`resendActivationAction` sem rate limiting** | Permite chamadas ilimitadas para reenviar emails de ativação. Pode ser abusado para spam. | ✅ Concluído — rate limiting adicionado (3 tentativas/hora por IP+email) (2026-06-20) |
| S-031 | **Criar middleware.ts para proteção centralizada de rotas** | Não existe middleware Next.js. Proteção depende de cada action chamar `getLoggedUser()`. Se um dev esquecer, a rota fica exposta. | ✅ Concluído — `src/proxy.ts` fortalecido com verificação JWT (rejeita tokens expirados/adulterados, limpa cookie inválido) (2026-06-20) |
| S-032 | **JWT sem mecanismo de revogação** | Não há blacklist/session store. Se conta é comprometida, não é possível invalidar sessões ativas. Reset de senha não invalida JWTs existentes. | ✅ Concluído — tabela `session` (whitelist), `getSession` verifica DB, `resetPassword` revoga todas as sessões do usuário (2026-06-20) |
| S-033 | **Tokens de convite expostos via `getWorkspaceInvitesAction`** | A action retorna o `token` na resposta. Combinado com falta de auth (S-024), qualquer pessoa pode obter tokens válidos e entrar em workspaces. | ✅ Concluído — campo `token` removido da resposta de `getWorkspaceInvites`; admins usam `seqid` para cancelar convites (2026-06-20) |

### P3 — Baixa

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| S-014 | **Logging estruturado para ações de segurança** | `console.error` não é auditável (67 ocorrências). Usar logger que registre timestamp, userId, ação e IP. | Pendente |
| S-015 | **Adicionar nonce nos tokens de recuperação** | Token criptográfico aleatório é suficiente, mas nonce adiciona camada extra contra replay. | Pendente |
| S-016 | **Revogar tokens de ativação antigos no reenvio** | Já implementado em `resendActivationEmail`, mas confirmar que `register` também limpa tokens anteriores. | Pendente |
| S-034 | **Enumeração de email via registro** | Endpoint retorna "Este e-mail já está em uso" — permite descobrir emails cadastrados. | Pendente |
| S-035 | **API routes podem vazar detalhes internos em erros** | `login/route.ts` retorna `error.message` direto ao cliente. Exceções inesperadas expõem stack traces. | ✅ Concluído — todas as 4 API routes agora usam allowlist de mensagens conhecidas; erros inesperados retornam mensagem genérica (2026-06-25) |

---

## Arquitetura & Qualidade de Código

### P1 — Alta

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| A-001 | **Unificar sistema de IDs (string vs BigInt)** | `seqid` (BigInt) e `id` (cuid string) coexistem com conversões manuais espalhadas — fonte de bugs de tipo. | Pendente |
| A-002 | **Extrair lógica de filtragem de permissões para um service** | Filtros de role (OWNER/ADMIN/MEMBER) estão duplicados em DashboardClient e Board.tsx. Centralizar em um hook ou service. | ✅ Parcial — DashboardClient.tsx refatorado (10 ocorrências) usando `useWorkspacePermissions`; restantes (Board.tsx, BoardTopBar,PremiumWorkspaceGridModal, etc.) ficam para ciclos futuros (this commit) |
| A-010 | **Quebrar `DashboardClient.tsx` (2500+ linhas)** | God component com 14 useEffects, 25+ states, sem memoização. Cada mudança de state re-renderiza a árvore inteira. Extrair sub-componentes e hooks. | Pendente |

### P2 — Média

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| A-003 | **Substituir `(activeWorkspace as any).currentUserRole` por tipo definido** | 27 instâncias de `as any` em 8 componentes — perde type safety. | Pendente |
| A-004 | **Criar hook `useWorkspacePermissions`** | Centralizar lógica de verificação de role e filtragem de boards/cards por permissão. | ✅ Concluído — hook + tipo `WorkspaceRole` em `src/hooks/useWorkspacePermissions.ts` e `src/types/permissions.ts` (2026-08-03) |
| A-005 | **Mover server actions para camada de domínio consistente** | Algumas actions chamam services diretamente, outras têm lógica inline. Padronizar. | Pendente |
| A-006 | **Adicionar testes automatizados para regras de permissão** | Sem testes, mudanças em permissões podem regredir sem detecção. Sem framework de testes configurado. | Pendente |
| A-011 | **Extrair utilitários duplicados (`getSectorColors`, `getCardAgeText`, deadline status)** | Mesma lógica copiada em 3-4 componentes. Criar utils compartilhados. | Pendente |
| A-012 | **Adicionar `useCallback`/`useMemo` em componentes pesados** | DashboardClient e Board.tsx recriam todos os handlers a cada render. Causa re-renders desnecessários nos filhos. | Pendente |
| A-013 | **Tipar states que usam `any[]`** | `events: any[]`, `members: any[]`, `usersList: any[]` em múltiplos componentes perdem type safety. | Pendente |

### P3 — Baixa

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| A-007 | **Remover code duplicado da serialização BigInt (mapUser, mapWorkspace, etc)** | Padrão de `.toString()` repetido em dezenas de lugares. Criar helpers. | Pendente |
| A-008 | **Adicionar error boundaries no front-end** | Sem error boundaries, um erro não tratado quebra toda a árvore de componentes. | Pendente |
| A-009 | **Padronizar nomenclatura de arquivos (PascalCase componentes, camelCase utils)** | Mistura de convenções entre arquivos. | Pendente |
| A-014 | **Remover código morto (`MyEventsModal.tsx`)** | Componente não importado em nenhum lugar — substituído por `MyEventsView.tsx`. | ✅ Concluído — `MyEventsModal.tsx` e `MyEventsModal.module.css` removidos (2026-06-25) |
| A-015 | **Remover funcionalidades stub em `Column.tsx`** | `handleFollowList`, `handleMoveList`, `handleAutomationRule` são botões fake que só chamam `alert()`. | Pendente |
| A-016 | **Remover botões sem handler no `UserMenu.tsx`** | "Alternar Contas", "Gerenciar conta", "Configurações", etc. — 8 itens sem `onClick`. | Pendente |
| A-017 | **Remover modelo `Department` do Prisma** | Nenhum código referencia este modelo. Legacy/dead code. | ✅ Concluído — modelo removido do schema + migration para drop da tabela (2026-06-25) |
| A-018 | **Adicionar `forceConsistentCasingInFileNames` no tsconfig** | No Windows funciona, mas deploy em Linux pode quebrar por case sensitivity. | ✅ Concluído — flag adicionada ao tsconfig.json (2026-06-25) |

---

## UX & Interface

### P1 — Alta

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| U-001 | **Feedback visual otimista com rollback em caso de erro** | Operações críticas (criar board, mover card) não têm rollback visual se a server action falhar. | Pendente |
| U-002 | **Loading states para server actions lentas** | Ações que dependem de e-mail (convite, recuperação) não têm feedback de carregamento. | Pendente |
| U-013 | **Acessibilidade em modais (ARIA, focus trap, Escape)** | Nenhum dos 10+ modais tem `aria-modal`, `role="dialog"`, focus trapping ou dismiss via Escape. Inacessível para screen readers. | Pendente |
| U-014 | **Substituir `prompt()` nativo por modal estilizado** | `prompt()` usado em 3 locais para criar board/list. Bloqueia thread, sem estilo, UX inconsistente. | ✅ Concluído — todos os 3 `prompt()` substituídos por Swal com input estilizado (2026-06-25) |

### P2 — Média

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| U-003 | **Adicionar confirmação para exclusão de card** | Excluir action log não tem confirmação. | Pendente |
| U-004 | **Indicar visualmente quando um card foi transferido para o usuário** | Cards repassados (task_user) não têm badge visual destacando que são responsabilidade do usuário. | Pendente |
| U-005 | **Melhorar empty states em todas as views** | Várias telas mostram "Nenhuma atividade" sem orientação de próximo passo. | Pendente |
| U-015 | **Padronizar dialogs: substituir `confirm()`/`alert()` por Swal** | Mix de `Swal.fire`, `confirm()` nativo e `alert()` nativo (12 instâncias em 5 arquivos). Experiência inconsistente. | ✅ Concluído — todas as 17 instâncias (alert/confirm/prompt) substituídas por SweetAlert2 com visual premium dark em 6 arquivos (2026-06-25) |
| U-016 | **Feedback de erro para ações fire-and-forget** | Múltiplas server actions que falham silenciosamente (apenas `console.error`). Usuário não vê feedback. Board.tsx, DashboardClient.tsx, useKanban.ts. | Pendente |
| U-017 | **Drag-and-drop sem alternativa de teclado** | Cards arrastáveis não têm mecanismo de reordenação via teclado. Inacessível para usuários sem mouse. | Pendente |
| U-018 | **UserMenu sem ARIA (`aria-expanded`, `aria-haspopup`)** | Dropdown do menu do usuário não anuncia estado para screen readers. | Pendente |

### P3 — Baixa

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| U-006 | **Animação de transição entre telas** | Navegação entre Kanban, tabela e painel é abrupta. | Pendente |
| U-007 | **Modo escuro consistente (verificar contraste em todos os componentes)** | Alguns componentes podem ter problemas de contraste no tema escuro. | Pendente |
| U-019 | **Relatório: código de autenticidade usa `Math.random()`** | `ActivityReportModal.tsx` gera ID com random — valor muda a cada reload. Não serve para auditoria. | ✅ Concluído — substituído por hash determinístico baseado em workspace+data+boards (2026-06-25) |
| U-020 | **Hardcoded "Victor Pinto" como fallback de criador** | `ActivityReportModal.tsx` L169 — artefato de desenvolvimento. | ✅ Concluído — substituído por "Não informado" (2026-06-25) |

---

## Performance

### P2 — Média

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| P-001 | **Otimizar consultas do workspace com boards** | `getUserWorkspaces` carrega todos os boards e cards de uma vez — pode ficar lento com muitos dados. | Pendente |
| P-002 | **Implementar paginação na listagem de boards** | `activeWorkspaceBoards` não tem limite — com centenas de boards, a renderização será lenta. | Pendente |
| P-005 | **html2pdf.js carregado sem estratégia de preload** | Biblioteca de ~500KB carregada via script inject no momento do clique. Se CDN estiver lento, PDF falha silenciosamente. | Pendente |

### P3 — Baixa

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| P-003 | **Adicionar indexes no banco para consultas frequentes** | `card.columnId`, `card.taskuser_seqid`, `card_act.card_seqid`, `WorkspaceInvite.email`, `WorkspaceInvite.workspaceSeqid` — queries frequentes sem índice. | Pendente |
| P-004 | **Lazy loading de componentes pesados (Board, KanbanClient)** | Board e KanbanClient são importados diretamente — poderiam ser dynamic imports com fallback. | Pendente |

---

## Manutenção & Débito Técnico

### P2 — Média

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| M-001 | **Remover dependências não utilizadas** | `cookie` está instalado mas nunca importado. (`lucide-react` agora em uso) | Pendente |
| M-002 | **Auditar e atualizar dependências com CVEs** | Rodar `npm audit` e corrigir vulnerabilidades conhecidas. | ✅ Parcial — hono (high) corrigido; 5 moderate restantes em deps transitivas do Prisma CLI e Next.js (sem fix disponível sem breaking change) (2026-06-20) |
| M-005 | **Configurar ESLint e scripts de lint** | Nenhuma ferramenta de linting configurada. Sem `.eslintrc`, sem script `lint` no package.json. | Pendente |
| M-006 | **`ActivityLog` sem integridade referencial** | `boardId` e `userId` são strings sem `@relation`. Não há FK no banco — dados podem ficar órfãos. | Pendente |

### P3 — Baixa

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| M-003 | **Padronizar tratamento de erros nas server actions** | Algumas actions retornam `{ success, error }`, outras lançam exceção. | Pendente |
| M-004 | **Adicionar comentários de arquitetura nos módulos principais** | Domain services e repositories não têm documentação interna. | Pendente |
| M-007 | **Naming inconsistente no Prisma schema** | `Department` usa português (`nmdep`, `dtinc`), outros modelos usam inglês. `card_act` usa snake_case vs PascalCase dos demais. | Pendente |
| M-008 | **Remover modelo `Department` se não utilizado** | Nenhum código referencia este modelo. Duplica item A-017. | Pendente |
| M-009 | **Documentar `NODE_ENV` e pool size no `.env.example`** | Variáveis que afetam comportamento em runtime não estão documentadas. | Pendente |

---

## Performance e Arquitetura

### P2 — Separação de Rotas (Reduzir DashboardClient monolítico)

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| P-001 | **Separar Board/Kanban em rota própria `/dashboard/board/[id]`** | Board é o componente mais pesado (~500 linhas). Rota própria permite fetch isolado, bundle splitting natural e carregamento independente. | Pendente |
| P-002 | **Separar MyActivities em rota própria `/dashboard/my-activities`** | Já tem lazy load via dynamic(). Rota própria elimina dependência do DashboardClient e permite Server Component com query otimizada. | Pendente |
| P-003 | **Separar MyEvents em rota própria `/dashboard/my-events`** | Mesmo padrão de P-002. Fetch isolado, bundle independente. | Pendente |
| P-004 | **Separar Workspace Grid em rota própria `/dashboard/workspace/[id]`** | Grid de atividades carrega full mode. Rota própria permite streaming com Suspense. | Pendente |
| P-005 | **Eliminar query pesada `findByUserId` com includes aninhados** | Query atual carrega workspaces→columns→cards→card_act de uma vez. Separar em queries específicas por contexto. | Pendente |

### P2 — Otimizações de Dados

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| P-006 | **Paginação cursor-based nos boards** | MAPLE CONSTRUTORA tem 568 boards. Sem paginação, todos carregam de uma vez. | Pendente |
| P-007 | **Lazy load de card_act (histórico)** | Histórico de ações carrega junto com cards. Deveria carregar só ao abrir drawer. | Pendente |
| P-008 | **Índice parcial `idx_board_workspace_active`** | `CREATE INDEX ON board(workspace_id) WHERE dtcon IS NULL` — acelera query de boards ativos. | Pendente |
| P-009 | **Virtualização para listas >100 items** | Boards e cards renderizam todos no DOM. Com >200 items, usar @tanstack/react-virtual. | Pendente |

### P3 — Admin e Observabilidade

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| P-010 | **Proteger `/admin/diagnostics` com role OWNER** | Atualmente qualquer user logado acessa. Restringir a admin da plataforma. | Pendente |
| P-011 | **Dashboard de diagnóstico com histórico visual** | Comparar snapshots ao longo do tempo (gráficos de crescimento). | Pendente |

### Concluído (Performance)

| ID | Item | Data | Referência |
|----|------|------|------------|
| P-100 | Lazy load SweetAlert2 (dynamic import) | 31/07/2026 | `a2f9a5a` |
| P-101 | Lazy load MyActivitiesView (dynamic import) | 31/07/2026 | `a2f9a5a` |
| P-102 | Lightweight mode na query de workspaces | 31/07/2026 | `bb22b47` |
| P-103 | Contadores reais por workspace via COUNT | 01/08/2026 | `27cf65f` |
| P-104 | Página de diagnóstico admin `/admin/diagnostics` | 01/08/2026 | `3ce189d` |
| P-105 | Build com Webpack (Alpine não suporta Turbopack) | 01/08/2026 | `b6a8e3b` |

---

## Incrementos Futuros Sugeridos (2026-08-03)

Funcionalidades que **fazem sentido** para um kanban colaborativo multi-tenant como o Flowcom,
organizadas por área. **Não há datas nem prioridades firmes** — são ideias para ciclos futuros.

### Funcionalidades Centrais

| ID | Item | Justificativa |
|----|------|---------------|
| F-001 | **Templates de board** (clonar board, importar template) | Usuários perdem muito tempo recriando estruturas parecidas (ex: "Acompanhamento Mensal" → 12 instâncias). Template = economia de tempo real. |
| F-002 | **Tags/labels livres em cards** | Hoje só há `sector` (setor fixo da atividade). Tags livres permitiriam categorizar por tema, urgência, cliente. Modelo: `card_tag` (card_id, tag_name) — sem tabela nova, array de strings. |
| F-003 | **Subtasks/checklists dentro de cards** | Um card "Entregar relatório" pode ter 5 sub-itens. Hoje vira 5 cards separados, poluindo o board. Checklist interno com progresso (X de Y). |
| F-004 | **Anexos/arquivos em cards** | Upload para storage (S3/MinIO) com preview inline de imagens e PDFs. Fundamental para boards de engenharia/jurídico. |
| F-005 | **Dependências entre cards** (bloqueado por / bloqueia) | "Não posso iniciar card B até fechar card A". Visualização de cadeia no board. |
| F-006 | **Campos customizados por board** | Cada tipo de board tem dados próprios (data de vencimento, valor, cliente). Hoje o schema é fixo. Campos custom = flexibilidade sem migração. |

### Colaboração & Tempo Real

| ID | Item | Justificativa |
|----|------|---------------|
| F-010 | **Notificações in-app** (sino com badge) | Transferências solicitadas, convites, menções, deadlines se perdendo hoje. Falta um canal centralizado. |
| F-011 | **Menções @usuario em comentários** | Hoje só há `card_act` (andamento livre). Adicionar `@nome` com autocomplete → notifica o usuário. |
| F-012 | **Real-time updates** (websocket / SSE) | Usuário A move um card, usuário B vê em <1s sem F5. Polling funciona mas gasta banda. WebSocket nativo com fallback SSE. |
| F-013 | **Comentários em cards** (separado de card_act) | `card_act` é histórico/auditoria. Comentários são conversação — UI diferente (avatar, threaded). |
| F-014 | **Visto por último / presença online** | Saber se o colega está online ou "visto há 2h" reduz ambiguidade em transferências. |

### Produtividade & UX

| ID | Item | Justificativa |
|----|------|---------------|
| U-030 | **Atalhos de teclado globais** | `c` = nova atividade, `/` = buscar, `?` = ajuda. Kanban sérios (Trello, Linear, Jira) todos têm. |
| U-031 | **Busca global** (cmd+k) | Hoje só há busca por nome no overview do workspace. Busca global por cards, pessoas, workspaces. |
| U-032 | **Filtros salvos / views** | "Meus atrasados", "Atividades do setor JUR" salvos como filtros nomeados. Usuário clica 1 vez. |
| U-033 | **Bulk actions** (selecionar N cards e mover/copiar/excluir) | Útil em migrações e limpezas periódicas. |
| U-034 | **Undo para ações destrutivas** | Excluir card / board → notificação toast com "Desfazer" por 5s. Reduz medo de clicar errado. |
| U-035 | **Tema claro** (light mode) | App é dark-only. Light mode é requisito de muitos usuários e melhora WCAG em ambientes claros. |

### Integrações

| ID | Item | Justificativa |
|----|------|---------------|
| I-001 | **Google Calendar / Outlook** (sync de datas previstas) | Hoje há `previsto` no card mas não vai pra calendário. Two-way sync = reminder no celular. |
| I-002 | **Slack / Teams** (notificações em canal) | Para times que vivem lá. Webhook configurável por workspace. |
| I-003 | **Webhooks de saída** (board.updated, card.completed) | Permite integrações custom sem alterar o app. |
| I-004 | **Importador de Trello/Asana** | Migração de times que já usam outra ferramenta. |
| I-005 | **API pública REST/GraphQL** | Power users e scripts. Auth via API key por workspace. |
| I-006 | **Email digest semanal** | "Suas 12 atividades pendentes esta semana" — melhora engajamento. |

### Análise & Relatórios

| ID | Item | Justificativa |
|----|------|---------------|
| R-001 | **Dashboard de métricas do workspace** | Tempo médio de conclusão, taxa de atrasos, distribuição por responsável. Cards hoje não mostram nada disso. |
| R-002 | **Burndown / velocity chart** | Para times ágeis. Mostra trabalho concluído vs planejado ao longo do tempo. |
| R-003 | **Heatmap de carga** | Quem tem mais cards atrasados? Quem está ocioso? Visualização por usuário. |
| R-004 | **Export CSV/Excel** (não só PDF) | Para usuários que querem cruzar com planilhas. |

### Mobile & Offline

| ID | Item | Justificativa |
|----|------|---------------|
| M-010 | **PWA + offline mode** | Service Worker + cache de boards recentes. Usuário no campo (sem internet) ainda vê seus cards. |
| M-011 | **App nativo** (React Native ou Capacitor) | Push notifications funcionam offline. Investimento maior, ROI maior. |
| M-012 | **Mobile-first redesign** | Hoje funciona mas UI foi pensada pra desktop. Bottom sheets, swipe gestures, etc. |

### Segurança & Compliance (continuação)

| ID | Item | Justificativa |
|----|------|---------------|
| S-040 | **2FA / TOTP** | Senha só não basta hoje. Google Authenticator / Authy. |
| S-041 | **SSO (SAML / OIDC)** | Para clientes enterprise (ex: MAPLE CONSTRUTORA já tem SSO?). Login com Google/Microsoft. |
| S-042 | **Audit log persistente** (não só card_act) | Quem entrou, quem tentou entrar, quem editou workspace. Compliance (LGPD/SOC2). |
| S-043 | **Soft delete + restore** | Excluir board/card deve ser reversível por 30 dias. Lixeira. |
| S-044 | **Export de dados do usuário** (LGPD art. 18) | Usuário pede e recebe JSON com tudo que é sobre ele. |

---

## Concluído

| ID | Item | Data | Referência |
|----|------|------|------------|
| S-017 | `.env` adicionado ao `.gitignore` | Anterior | `.gitignore` linha 34 |
| S-001 | Rate limiting implementado em AuthService + getClientIp() em authActions.ts | 19/06/2026 | `AuthService.ts` + `schema.prisma` + `authActions.ts` |
| S-002 | Rate limiting por IP antes do DB lookup em resetPassword (anti-enumeration) | 19/06/2026 | `AuthService.ts` |
| S-003 | escapeHtml() aplicado a name, inviterName, workspaceName em templates de e-mail | 19/06/2026 | `resend.ts` |
| S-004 | MOCK_USER_ENABLED bypass removido de UserRepository.getLoggedUser() + proxy.ts + .env.example | 19/06/2026 | `UserRepository.ts`, `proxy.ts`, `.env.example` |
| S-021 | Rate limiting adicionado em verifyEmail, acceptInvite, requestTransfer, respondTransfer via `rate-limit.ts` | 19/06/2026 | `rate-limit.ts`, `authActions.ts`, `workspaceActions.ts`, `cardActions.ts` |
| S-022 | Validação de membro do workspace adicionada em BoardService.createBoard | 19/06/2026 | `BoardService.ts` |
| S-020 | error.message substituído por mensagens hardcoded em 16 catch blocks (3 arquivos) | 19/06/2026 | `Board.tsx`, `DashboardClient.tsx`, `EditWorkspaceModal.tsx` |
| U-008 | Scrollbar fina padronizada em MyActivities e MyEvents | 18/06/2026 | `393d88f` |
| A-002 | Refatoração parcial: 10 filtros inline de `currentUserRole` em DashboardClient.tsx substituídos por `useWorkspacePermissions` | 03/08/2026 | this commit |
| A-004 | Hook `useWorkspacePermissions` + tipo `WorkspaceRole` criados em `src/hooks/` e `src/types/` | 03/08/2026 | this commit |
| U-009 | Ordenação por data mais recente em MyActivities e MyEvents | 18/06/2026 | `393d88f` |
| U-010 | Botão Voltar padronizado à direita no painel de controle | 18/06/2026 | `393d88f` |
| U-011 | Filtro de permissões MEMBER em Acompanhamento e Board | 18/06/2026 | `393d88f` |
| S-018 | Exclusão de atividades restrita ao OWNER | 18/06/2026 | `393d88f` |
| U-012 | Novo Fluxo e Colunas visíveis apenas para Owner/Admin no Kanban | 18/06/2026 | `393d88f` |
| S-005 | CSP implementado via `headers()` em `next.config.ts` | 20/06/2026 | `next.config.ts` |
| S-006 | HSTS, X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy | 20/06/2026 | `next.config.ts` |
