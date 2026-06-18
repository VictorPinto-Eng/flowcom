# Flow — Gestão Visual & Kanban Inteligente

Plataforma SaaS de gestão de projetos estilo Kanban, desenvolvida com Next.js.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript 5 (strict) |
| Banco de Dados | PostgreSQL + Prisma ORM |
| Autenticação | JWT (bcryptjs + jsonwebtoken) + cookies HTTP-only |
| UI | CSS Modules + Lucide React + SweetAlert2 |
| Fontes | Geist (Vercel) |
| Email | Resend |

## Arquitetura

O projeto segue uma arquitetura em camadas com Server Actions do Next.js:

```
Browser (React Client)
  → Server Action ('use server')
    → Service (regras de negócio)
      → Repository (Prisma queries)
        → PostgreSQL
  → Response (dados serializados)
  → revalidatePath() / router.refresh()
```

### Camadas

- **`src/app/`** — Páginas Next.js (App Router), Server Components
- **`src/components/`** — Componentes cliente (`'use client'`) com interatividade
- **`src/app/actions/`** — Server Actions (orquestradores: validam permissões, chamam services, revalidam cache)
- **`src/domain/services/`** — Regras de negócio
- **`src/domain/repositories/`** — Acesso a dados (Prisma)
- **`src/lib/`** — Infraestrutura (Prisma client, JWT, email)
- **`src/proxy.ts`** — Middleware de autenticação

## Funcionalidades

### Autenticação
- Cadastro com validação de senha (mín. 8 caracteres, maiúscula, minúscula, número, caractere especial)
- Verificação de email via Resend (token com 24h de validade)
- Login com sessão JWT (7 dias, cookie HTTP-only)
- Recuperação de senha (token com 1h de validade)
- Middleware de proteção de rotas

### Workspaces
- Criação com tipos predefinidos (Engenharia/IT, Operações, CRM, Educação, Marketing, RH, etc.)
- Criação automática de 3 colunas padrão: "A Fazer", "Em Progresso", "Concluído"
- Membros com papéis: OWNER, ADMIN, MEMBER, VIEWER
- Convite por email com aceite/rejeição
- Gerenciamento de membros (com restrição para remover último OWNER)
- Colunas customizáveis por workspace (criar, renomear, reordenar, ocultar)

### Quadros (Activities/Boards)
- Boards dentro de workspaces
- Atribuição de setor (Legal, Engenharia, Financeiro, etc.)
- Responsável, data de início, data prevista e data de conclusão
- Busca/filtro por nome, ID, criador ou setor
- Finalização de board (move todos os cards pendentes para "Concluído")

### Cards (Eventos)
- Título, descrição, responsável, datas
- Drag-and-drop entre colunas (Kanban)
- Transferência de responsável entre membros do workspace
- Transferência para outro workspace/board
- Logs de ação por card (card_act)
- Indicadores de status de prazo (atrasado, hoje, no prazo, concluído)
- Atualizações otimistas no frontend

### Histórico de Atividades
- Auditoria global de ações (criação, movimentação, conclusão de boards/cards)
- Visualizável na sidebar do dashboard

### Relatórios
- Consolidado de todos os cards em todos os workspaces
- Filtro por workspace
- Cálculo de duração (dias) entre início e conclusão

## Modelo de Dados

| Modelo | Tabela | Propósito |
|--------|--------|-----------|
| User | `users` | Usuários (nome, email, senha, role, ativo) |
| Sector | `sector` | Setores empresariais |
| Workspace | `workspace` | Áreas de trabalho (workspaces) |
| WorkspaceType | `workspace_type` | Categorias de workspace |
| Board | `board` | Quadros Kanban dentro de workspaces |
| Column | `workspace_column` | Colunas Kanban (por workspace, compartilhadas entre boards) |
| Card | `card` | Eventos/tarefas individuais |
| card_act | `card_act` | Logs de ação por card |
| WorkspaceMember | `workspace_member` | Membros do workspace (N:N) |
| WorkspaceInvite | `workspace_invite` | Convites pendentes |
| ActivityLog | `activity_log` | Trilha de auditoria global |
| VerificationToken | `verification_tokens` | Tokens de verificação de email e reset de senha |

### Particularidades do Schema
- **IDs BigInt**: Chaves primárias auto-increment, serializadas com `.toString()` no frontend
- **Workspace dual-ID**: `id` (cuid string) + `seqid` (BigInt auto-increment)
- **Colunas compartilhadas**: Colunas são definidas por workspace, não por board. Cards são associados a board + column
- **Card order**: Campos `sort_order` para ordenação manual dentro das colunas

## Estrutura do Projeto

```
flowcom/
├── .env                          # Variáveis de ambiente
├── prisma/
│   ├── schema.prisma             # Schema completo do banco
│   ├── seed.ts                   # Seed (tipos de workspace, setores, usuário mock)
│   └── migrations/               # Migrações Prisma
├── src/
│   ├── proxy.ts                  # Middleware de autenticação
│   ├── app/
│   │   ├── layout.tsx            # Layout raiz (fontes, metadata)
│   │   ├── page.tsx              # Landing page
│   │   ├── globals.css           # Design system (tokens CSS)
│   │   ├── (auth)/               # Login, registro, verificação, senha
│   │   ├── dashboard/            # Dashboard principal
│   │   ├── reports/              # Relatórios globais
│   │   ├── invite/accept/        # Aceitar convite de workspace
│   │   └── actions/              # Server Actions
│   ├── components/               # Componentes React (Client Components)
│   ├── hooks/                    # Hooks customizados (ex: useKanban)
│   ├── types/                    # Interfaces TypeScript
│   ├── domain/
│   │   ├── services/             # Regras de negócio
│   │   └── repositories/         # Acesso a dados
│   └── lib/                      # Utilitários (auth, prisma, resend)
└── public/                       # Assets estáticos
```

## Setup

### Pré-requisitos
- Node.js 20+
- PostgreSQL 14+
- Conta no [Resend](https://resend.com) (para emails)

### Instalação

```bash
# Clonar o repositório
git clone <url>
cd flowcom

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais:
#   DATABASE_URL=postgresql://user:pass@localhost:5432/flow
#   RESEND_API_KEY=re_xxx
#   JWT_SECRET=seu-segredo-aqui
#   BASE_URL=http://localhost:3000

# Executar migrations
npx prisma migrate dev

# Popular banco com dados iniciais
npm run seed

# Iniciar dev server
npm run dev
```

### Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | URL de conexão PostgreSQL |
| `RESEND_API_KEY` | Chave da API Resend |
| `JWT_SECRET` | Segredo para assinar tokens JWT |
| `BASE_URL` | URL base da aplicação |

## Permissões

| Papel | Ações |
|-------|-------|
| OWNER | Controle total do workspace |
| ADMIN | Criar boards, adicionar cards, configurar workspace |
| MEMBER | Interagir com cards atribuídos a si |
| VIEWER | Apenas leitura |

## Scripts

```bash
npm run dev      # Iniciar servidor de desenvolvimento
npm run build    # Build de produção
npm run start    # Iniciar servidor de produção
npm run seed     # Popular banco com dados iniciais
```

## Observações Técnicas

- **IDs**: Todos os IDs usam `BigInt` no banco e são convertidos para string no frontend via `.toString()`
- **Fallback dev**: Em ambiente não-produção, se não houver sessão JWT, o sistema usa um usuário mock (Victor Pinto)
- **Design System**: Tema "Ice" com efeitos glassmorphism, paleta indigo/sky blue
- **Sincronização de datas**: Quando um card tem `previsto` alterado, o board pai é atualizado automaticamente
- **CSS Print**: Estilos específicos para impressão de relatórios
