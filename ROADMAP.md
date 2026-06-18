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
| S-001 | **Rate limiting em endpoints de auth** (login, register, forgot-password, reset-password) | Sem proteção contra brute-force, enumeration e DoS. Atacante pode testar senhas indefinidamente ou disparar milhares de e-mails. | Pendente |
| S-002 | **Proteger rota de reset-password contra token enumeration** | `resetPasswordAction` expõe "Token inválido ou expirado" — permite atacante enumerar tokens válidos. | Pendente |
| S-003 | **Sanitizar HTML em e-mails transacionais** | `name` e `inviterName` são interpolados diretamente no HTML sem escape. Permite XSS no cliente de e-mail. | Pendente |
| S-004 | **Remover dependência de MOCK_USER_ENABLED em produção** | Se `MOCK_USER_ENABLED=true` for definido em produção, toda autenticação é ignorada. Adicionar validação que impede isso ou remover o fallback. | Pendente |

### P1 — Alta

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| S-005 | **Adicionar Content-Security-Policy (CSP)** | Sem CSP, qualquer XSS no front-end tem impacto total. Next.js recomenda CSP para segurança em profundidade. | Pendente |
| S-006 | **Adicionar HSTS e outros security headers** | Sem `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options` a aplicação é vulnerável a downgrade attacks e clickjacking. | Pendente |
| S-007 | **Validar e sanitizar todos os inputs em server actions** | Nome, descrição e detalhes de boards e cards não têm validação de tamanho ou conteúdo no servidor. | Pendente |
| S-008 | **Proteger `invite/accept/[token]` contra token injection** | Token é passado via URL param sem validação adicional. Possível vetor de IDOR se token for adivinhado. | Pendente |

### P2 — Média

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| S-009 | **Implementar refresh token / sliding session** | JWT com expiração fixa de 7 dias sem refresh — sessão expirada abruptamente sem chance de renovação. | Pendente |
| S-010 | **Auditar permissões do papel VIEWER** | Papel VIEWER definido no schema mas nunca checado — membros com VIEWER podem ter acesso indevido a ações de escrita. | Pendente |
| S-011 | **Remover campo `user.role` do schema se não utilizado** | `User.role` (USER) está no schema mas nunca é checado — confunde com `WorkspaceMember.role`. | Pendente |
| S-012 | **Hardening do cookie de sessão** | `sameSite: 'lax'` permite envio em navegações top-level. Avaliar `strict`. | Pendente |
| S-013 | **Adicionar limite de tentativas de login por IP** | Mesmo com rate limiting, um ataque distribuído pode contornar. | Pendente |

### P3 — Baixa

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| S-014 | **Logging estruturado para ações de segurança** | `console.error` não é auditável. Usar logger que registre timestamp, userId, ação e IP. | Pendente |
| S-015 | **Adicionar nonce nos tokens de recuperação** | Token criptográfico aleatório é suficiente, mas nonce adiciona camada extra contra replay. | Pendente |
| S-016 | **Revogar tokens de ativação antigos no reenvio** | Já implementado em `resendActivationEmail`, mas confirmar que `register` também limpa tokens anteriores. | Pendente |

---

## Arquitetura & Qualidade de Código

### P1 — Alta

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| A-001 | **Unificar sistema de IDs (string vs BigInt)** | `seqid` (BigInt) e `id` (cuid string) coexistem com conversões manuais espalhadas — fonte de bugs de tipo. | Pendente |
| A-002 | **Extrair lógica de filtragem de permissões para um service** | Filtros de role (OWNER/ADMIN/MEMBER) estão duplicados em DashboardClient e Board.tsx. Centralizar em um hook ou service. | Pendente |

### P2 — Média

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| A-003 | **Substituir `(activeWorkspace as any).currentUserRole` por tipo definido** | Uso de `as any` espalhado — perde type safety. | Pendente |
| A-004 | **Criar hook `useWorkspacePermissions`** | Centralizar lógica de verificação de role e filtragem de boards/cards por permissão. | Pendente |
| A-005 | **Mover server actions para camada de domínio consistente** | Algumas actions chamam services diretamente, outras têm lógica inline. Padronizar. | Pendente |
| A-006 | **Adicionar testes automatizados para regras de permissão** | Sem testes, mudanças em permissões podem regredir sem detecção. | Pendente |

### P3 — Baixa

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| A-007 | **Remover code duplicado da serialização BigInt (mapUser, mapWorkspace, etc)** | Padrão de `.toString()` repetido em dezenas de lugares. Criar helpers. | Pendente |
| A-008 | **Adicionar error boundaries no front-end** | Sem error boundaries, um erro não tratado quebra toda a árvore de componentes. | Pendente |
| A-009 | **Padronizar nomenclatura de arquivos (PascalCase componentes, camelCase utils)** | Mistura de convenções entre arquivos. | Pendente |

---

## UX & Interface

### P1 — Alta

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| U-001 | **Feedback visual otimista com rollback em caso de erro** | Operações críticas (criar board, mover card) não têm rollback visual se a server action falhar. | Pendente |
| U-002 | **Loading states para server actions lentas** | Ações que dependem de e-mail (convite, recuperação) não têm feedback de carregamento. | Pendente |

### P2 — Média

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| U-003 | **Adicionar confirmação para exclusão de card** | Excluir action log não tem confirmação. | Pendente |
| U-004 | **Indicar visualmente quando um card foi transferido para o usuário** | Cards repassados (task_user) não têm badge visual destacando que são responsabilidade do usuário. | Pendente |
| U-005 | **Melhorar empty states em todas as views** | Várias telas mostram "Nenhuma atividade" sem orientação de próximo passo. | Pendente |

### P3 — Baixa

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| U-006 | **Animação de transição entre telas** | Navegação entre Kanban, tabela e painel é abrupta. | Pendente |
| U-007 | **Modo escuro consistente (verificar contraste em todos os componentes)** | Alguns componentes podem ter problemas de contraste no tema escuro. | Pendente |

---

## Performance

### P2 — Média

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| P-001 | **Otimizar consultas do workspace com boards** | `getUserWorkspaces` carrega todos os boards e cards de uma vez — pode ficar lento com muitos dados. | Pendente |
| P-002 | **Implementar paginação na listagem de boards** | `activeWorkspaceBoards` não tem limite — com centenas de boards, a renderização será lenta. | Pendente |

### P3 — Baixa

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| P-003 | **Adicionar indexes no banco para consultas frequentes** | `card.board_seqid`, `card.columnId`, `workspace_member.userSeqid` são consultados sem índice explícito. | Pendente |
| P-004 | **Lazy loading de componentes pesados (Board, KanbanClient)** | Board e KanbanClient são importados diretamente — poderiam ser dynamic imports com fallback. | Pendente |

---

## Manutenção & Débito Técnico

### P2 — Média

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| M-001 | **Remover dependências não utilizadas** | Verificar `package.json` por pacotes não referenciados. | Pendente |
| M-002 | **Auditar e atualizar dependências com CVEs** | Rodar `npm audit` e corrigir vulnerabilcias conhecidas. | Pendente |

### P3 — Baixa

| ID | Item | Justificativa | Status |
|----|------|---------------|--------|
| M-003 | **Padronizar tratamento de erros nas server actions** | Algumas actions retornam `{ success, error }`, outras lançam exceção. | Pendente |
| M-004 | **Adicionar comentários de arquitetura nos módulos principais** | Domain services e repositories não têm documentação interna. | Pendente |

---

## Concluído

| ID | Item | Data | Referência |
|----|------|------|------------|
| S-017 | `.env` adicionado ao `.gitignore` | Anterior | `.gitignore` linha 34 |
| U-008 | Scrollbar fina padronizada em MyActivities e MyEvents | 18/06/2026 | `393d88f` |
| U-009 | Ordenação por data mais recente em MyActivities e MyEvents | 18/06/2026 | `393d88f` |
| U-010 | Botão Voltar padronizado à direita no painel de controle | 18/06/2026 | `393d88f` |
| U-011 | Filtro de permissões MEMBER em Acompanhamento e Board | 18/06/2026 | `393d88f` |
| S-018 | Exclusão de atividades restrita ao OWNER | 18/06/2026 | `393d88f` |
| U-012 | Novo Fluxo e Colunas visíveis apenas para Owner/Admin no Kanban | 18/06/2026 | `393d88f` |
