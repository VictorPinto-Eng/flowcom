# Regras de Negócio — Flowcom

Este documento é a **fonte de verdade** para todas as regras de negócio, validações e constraints do sistema.
Consulte este arquivo antes de implementar qualquer funcionalidade envolvendo datas, eventos ou workflows.

---

## 📋 Estrutura de Documentação

Cada regra segue o formato:

```
### [NOME DA REGRA]
- **Tipo**: Validação | Negócio | Segurança
- **Prioridade**: P0 (crítica) | P1 (alta) | P2 (média) | P3 (baixa)
- **Aplica-se a**: Qual entidade/fluxo
- **Descrição**: O que é?
- **Constraint**: Como validar?
- **Mensagem de Erro**: O que mostrar ao usuário?
- **Implementado em**: Arquivo + função
- **Testado**: Sim/Não + referência de teste
```

---

## 🗓️ Regras de Datas

### DT-001: Data Programada (previsto) ≥ Data da Atividade (dtatv)
- **Tipo**: Validação de negócio
- **Prioridade**: P1 (bloqueante para workflows corretos)
- **Aplica-se a**: Cards/Eventos — ao criar, editar ou alterar datas
- **Descrição**: A data programada (prazo) nunca pode ser anterior à data de início da atividade.
- **Constraint**: `previsto >= dtatv` (comparação em date objects, ignorando hora)
- **Mensagem de Erro**: "Data Programada não pode ser anterior à Data da Atividade."
- **Onde validar**:
  - ✅ Server-side (obrigatório): `src/app/actions/cardActions.ts` antes de chamar `CardService`
  - ✅ Client-side (UX): `src/components/modals/EditEventModal.tsx` com feedback em tempo real
- **Implementado em**: 
  - ❌ **NÃO IMPLEMENTADO** — adicionar em `src/lib/validation.ts` função `validateDateRange(dtatv, previsto)`
  - ❌ **NÃO IMPLEMENTADO** — adicionar em `updateCardAction()` antes de chamar `cardService.updateCard()`
  - ❌ **NÃO IMPLEMENTADO** — adicionar em `EditEventModal.tsx` validação client-side com feedback
- **Testado**: Não

### DT-002: Data de Conclusão (dtcon) ≥ Data da Atividade (dtatv)
- **Tipo**: Validação de negócio
- **Prioridade**: P1 (integridade de dados)
- **Aplica-se a**: Cards/Eventos — ao concluir ou editar dtcon
- **Descrição**: Um evento não pode ser concluído antes de sua data de início.
- **Constraint**: `dtcon >= dtatv`
- **Mensagem de Erro**: "Data de Conclusão não pode ser anterior à Data da Atividade."
- **Implementado em**: ❌ **NÃO IMPLEMENTADO**
- **Testado**: Não

### DT-003: Data de Conclusão (dtcon) é setada automaticamente ao mover para coluna "Concluído"
- **Tipo**: Negócio (automação)
- **Prioridade**: P1 (funcionalidade crítica)
- **Aplica-se a**: Cards/Eventos — ao clicar botão "Concluir"
- **Descrição**: Quando um card é movido para a coluna "Concluído" (detectada por `title.includes('concluído')`), o campo `dtcon` deve ser automaticamente preenchido com a data atual.
- **Constraint**: 
  - Se `columnId` aponta para coluna com "concluído" no título E card não tem `dtcon`, então `dtcon = today`
  - Se card é movido PARA fora da coluna concluído, `dtcon` é limpo (setado para null)
- **Mensagem de Erro**: N/A (automático)
- **Implementado em**: 
  - ✅ `src/domain/services/CardService.ts` - `moveCard()` linha 95-104
  - ✅ `src/domain/services/CardService.ts` - `completeCard()` linha 171
- **Testado**: Parcialmente (funciona, mas sem testes unitários)

### DT-004: Formato de data padrão
- **Tipo**: Técnico
- **Prioridade**: P2
- **Aplica-se a**: Todas as datas do sistema
- **Descrição**: Datas são armazenadas no PostgreSQL como `TIMESTAMP`, serializadas como ISO 8601 para API, e convertidas para `YYYY-MM-DD` (apenas data, sem hora) nos inputs de formulário.
- **Constraint**: 
  - Servidor → BD: PostgreSQL TIMESTAMP
  - BD → Cliente: ISO 8601 string (ex: `2026-08-06T12:00:00Z`)
  - Cliente → Servidor: `YYYY-MM-DD` string (parse com `new Date(dateStr + 'T00:00:00Z')`)
- **Implementado em**: Distribuído em CardService e componentes
- **Testado**: Sim (implícito em testes de E2E)

---

## 👤 Regras de Permissão

### PERM-001: Apenas responsável ou criador pode editar evento
- **Tipo**: Segurança
- **Prioridade**: P0
- **Aplica-se a**: Cards/Eventos — edição via modal
- **Descrição**: Um usuário só pode editar um card se:
  - É o **criador** (user_seqid) do card, OU
  - É **responsável** (taskuser_seqid) pelo card, OU
  - É **OWNER/ADMIN** do workspace
- **Constraint**: Validação em `checkCardPermission()` em server actions
- **Implementado em**: ✅ `src/app/actions/cardActions.ts` linha 16-43
- **Testado**: Sim

### PERM-002: Apenas OWNER/ADMIN podem manipular colunas
- **Tipo**: Segurança
- **Prioridade**: P1
- **Aplica-se a**: Colunas
- **Descrição**: Adicionar, copiar, deletar ou reordenar colunas é operação estrutural. Apenas workspace OWNER/ADMIN podem fazer isso.
- **Constraint**: Verificação de role em todas as column actions
- **Implementado em**: ✅ `src/app/actions/columnActions.ts`
- **Testado**: Sim

---

## 🔄 Regras de Workflow

### WF-001: Estados de um card
- **Tipo**: Negócio
- **Prioridade**: P1
- **Aplica-se a**: Cards/Eventos
- **Descrição**: Um card tem 2 estados:
  1. **Pendente**: `dtcon IS NULL` — card está sem data de conclusão
  2. **Concluído**: `dtcon IS NOT NULL` — card tem data de conclusão preenchida
- **Implementado em**: Lógica distribuída em CardService + Board.tsx
- **Testado**: Sim (implícito)

### WF-002: Ao concluir um evento, deve preencher dtcon com a data atual
- **Tipo**: Negócio
- **Prioridade**: P1
- **Aplica-se a**: Cards/Eventos — Botão "Concluir"
- **Descrição**: Quando o usuário clica "Concluir Evento" na tela de kanban, o sistema deve:
  1. Mostrar confirmação com SweetAlert2
  2. Mover o card para a coluna "Concluído"
  3. Preencher `dtcon` com a data atual (localDate, apenas YYYY-MM-DD)
  4. Registrar no `activityLog` e `card_act` (histórico de andamentos)
  5. Atualizar a tela com `router.refresh()`
- **Constraint**: 
  - Se card já está na coluna "Concluído" mas sem `dtcon`, ainda assim deve preencher `dtcon`
  - Se `sourceCol === targetCol`, não retornar imediatamente — ainda executar update de `dtcon`
- **Implementado em**: 
  - ✅ `src/hooks/useKanban.ts` - `completeCard()` (corrigido em commit b265966)
  - ✅ `src/app/actions/cardActions.ts` - `completeCardAction()`
  - ✅ `src/domain/services/CardService.ts` - `completeCard()`
- **Testado**: Sim (em produção)

---

## 📝 Regras de Edição

### EDIT-001: Ao salvar alterações no modal EditEventModal, atualizar tela
- **Tipo**: UX
- **Prioridade**: P2
- **Aplica-se a**: Modal de edição de eventos
- **Descrição**: Quando o usuário clica "Salvar Alterações":
  1. Validar inputs (title obrigatório, datas válidas)
  2. Chamar `updateCardAction()` para salvar no servidor
  3. Se a fase mudou, chamar `onMoveCard()` para mover para nova coluna
  4. Chamar `router.refresh()` para buscar dados atualizados do servidor
  5. Fechar o modal
- **Implementado em**: 
  - ✅ `src/components/kanban/Board.tsx` linha 338-344 (adicionado router.refresh em fc7eaba)
  - ✅ `src/components/modals/EditEventModal.tsx` linha 35-55
- **Testado**: Sim

---

## 🚨 Regras de Validação de Input

### VAL-001: Títulos de eventos
- **Tipo**: Validação
- **Prioridade**: P2
- **Constraint**: Obrigatório, max 200 caracteres, sem HTML tags
- **Implementado em**: ✅ `src/lib/validation.ts` - `validateTitle()`
- **Testado**: Sim

### VAL-002: Descrições de eventos
- **Tipo**: Validação
- **Prioridade**: P2
- **Constraint**: Opcional, max 5000 caracteres, preserva newlines, sem HTML tags
- **Implementado em**: ✅ `src/lib/validation.ts` - `validateDescription()`
- **Testado**: Sim

---

## 📌 Checklist para Novo Desenvolvimento

Antes de implementar qualquer funcionalidade envolvendo datas, eventos ou workflows:

- [ ] Li o documento BUSINESS_RULES.md integralmente
- [ ] Identifiquei todas as regras aplicáveis (DT-*, PERM-*, WF-*, EDIT-*, VAL-*)
- [ ] Adicionei validações server-side em `src/app/actions/` e `src/domain/services/`
- [ ] Adicionei feedback client-side em componentes (mensagens de erro claras)
- [ ] Escrevi testes para cenários happy path + edge cases
- [ ] Atualizei este documento com novas regras ou mudanças
- [ ] Verifiquei que `router.refresh()` é chamado após operações de escrita
- [ ] Testei em `dashboard?boardId=412` (board de teste padrão)

---

## 📚 Referências

- `ROADMAP.md` — Roadmap de features e correções
- `AGENTS.md` — Documentação de arquitetura e padrões
- `src/lib/validation.ts` — Funções de validação reutilizáveis
- `src/domain/services/CardService.ts` — Lógica de negócio principal
- `src/app/actions/cardActions.ts` — Server actions (API)
- `src/components/kanban/Board.tsx` — Componente principal da tela
