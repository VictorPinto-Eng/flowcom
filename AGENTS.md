<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Roadmap

Before starting any implementation, read `ROADMAP.md` to understand pending security items, priorities, and architectural decisions. All work must reference the appropriate roadmap item ID (e.g., S-001, A-002, U-003, P-001).

# Infraestrutura e Deploy

## Ambiente de Produção
- **Servidor:** Docker Swarm em `hv5srvd` (Linux)
- **Container:** Node 22 Alpine
- **Registry:** `127.0.0.1:5000/flow:<commit-sha>`
- **Deploy:** `./deploy.sh` (git pull → docker build → push → service update → rollback automático)
- **Banco:** PostgreSQL via `pgvector` container (DATABASE_URL injetada como env var no serviço)
- **Build:** `next build --webpack` (Alpine não suporta Turbopack native bindings)

## Regras de Operação

### Migrations
- **NÃO usar `prisma migrate dev`** — gera conflitos no servidor
- **Gerar SQL puro** e entregar ao usuário para executar manualmente no banco
- Sempre atualizar `prisma/schema.prisma` para o Prisma Client gerar corretamente
- Rodar `npx prisma generate` localmente após mudanças no schema

### Build
- Sempre usar `next build --webpack` (Turbopack falha em Alpine/musl)
- CSS Modules: `:global()` deve SEMPRE estar wrappado em classe local (webpack é estrito)
- Testar build localmente antes de commitar

### Performance
- Query `WorkspaceRepository.findByUserId` é o maior gargalo — tem modo `lightweight` (boards limitados, sem cards)
- `getDashboardStatsAction` e `getWorkspaceCountersAction` usam COUNT para contadores reais
- SweetAlert2 é lazy loaded via `getSwal()` — nunca importar direto
- Componentes pesados devem usar `dynamic()` do Next.js

### Padrões de Código
- Server actions em `src/app/actions/`
- Services em `src/domain/services/`
- Repositories em `src/domain/repositories/`
- Componentes visuais em `src/components/` (grids, kanban, modals, shell, views)
- CSS modules colocalizados com componente

### Diagnóstico
- `/admin/diagnostics` — página de métricas do sistema
- Acessível pelo menu de conta do usuário (🔍 Diagnóstico do Servidor)
- JSON copiável para análise e tomada de decisão
- Salva snapshot no banco (1 por user, deleta anterior automaticamente)
