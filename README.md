# kpi-corp

Sistema de acompanhamento de KPIs de equipe: o administrador cadastra indicadores e
atribui pontuação durante reuniões, o time acompanha dashboard e ranking.

Monorepo TypeScript criado com [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack).

## Stack

| Camada | Tecnologia |
| --- | --- |
| Runtime | Node.js 24 (ESM puro) |
| Frontend | React 19 + TanStack Router (file-based) + Vite |
| Estilo | TailwindCSS v4 + shadcn/ui sobre Base UI |
| Backend | Fastify 5 + oRPC |
| Banco | PostgreSQL 18 (Docker local) |
| ORM | Prisma 7 com driver adapter `pg` |
| Validação | Zod 4 (input, output e schema OpenAPI) |
| Testes | Vitest (+ Testing Library no front) |
| Lint e format | Biome |
| Git hooks | Lefthook |
| Monorepo | Turborepo |
| Documentação | Fumadocs (Next.js) |

## Pré-requisitos

- **Node.js 24** — `nvm use` respeita o `.nvmrc`
- **Docker** rodando (PostgreSQL local)
- **Git**

Extensões recomendadas no VS Code: **Biome**, **Prisma**, **Tailwind CSS IntelliSense**, **Docker**.

## Quick Start

```bash
# 1. dependências (prepare instala os git hooks, postinstall roda prisma generate)
npm install

# 2. variáveis de ambiente
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env

# 3. subir o PostgreSQL local
npm run db:start

# 4. aplicar as migrations
npm run db:migrate

# 5. popular com dados de desenvolvimento
npm run db:seed

# 6. rodar tudo
npm run dev
```

| Serviço | URL |
| --- | --- |
| Web (Vite + TanStack Router) | http://localhost:3001 |
| API (Fastify + oRPC) | http://localhost:3000 |
| Referência OpenAPI | http://localhost:3000/api-reference |
| Docs (Fumadocs) | http://localhost:4000 |

O endpoint RPC fica em `http://localhost:3000/rpc`. O front não faz `fetch` manual — usa
o client tipado em `apps/web/src/utils/orpc.ts`.

### Credenciais do seed

| E-mail | Senha | Perfil |
| --- | --- | --- |
| `admin@kpicorp.com` | `admin123` | `ADMIN` |
| `ana@kpicorp.com`, `bruno@kpicorp.com`, `carla@kpicorp.com` | `member123` | `MEMBER` |

Só para desenvolvimento local.

```bash
curl -s -X POST http://localhost:3000/rpc/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"json":{"email":"admin@kpicorp.com","password":"admin123"}}'
```

## Variáveis de ambiente

Validadas em runtime por `packages/env` (`@t3-oss/env-core` + Zod). Variável nova só
passa a existir depois de declarada no schema — ler `process.env` direto não é o padrão.

### `apps/server/.env`

| Variável | Obrigatória | Default | Descrição |
| --- | --- | --- | --- |
| `DATABASE_URL` | Sim | — | Connection string do Postgres |
| `CORS_ORIGIN` | Sim | — | Origem aceita pelo CORS, validada como URL |
| `WEB_APP_URL` | Sim | — | Base dos links abertos no navegador (convite). Separada do CORS: uma é de onde se aceita requisição, a outra é para onde se manda o usuário |
| `JWT_SECRET` | Sim | — | Assinatura do access token, mínimo 32 caracteres |
| `JWT_REFRESH_SECRET` | Sim | — | Assinatura do refresh token, mínimo 32 caracteres e distinta da anterior (validado no boot) |
| `JWT_ACCESS_EXPIRES_IN` | Não | `15m` | Vida do access token |
| `JWT_REFRESH_EXPIRES_IN` | Não | `7d` | Vida do refresh token |
| `HOST` | Não | `localhost` | Bind do Fastify |
| `PORT` | Não | `3000` | Porta do Fastify |
| `NODE_ENV` | Não | `development` | `development` \| `production` \| `test` |

Os dois segredos de JWT são separados de propósito: access token roubado não pode ser
forjado em refresh. Em produção, gere com `openssl rand -base64 48`.

### `apps/web/.env`

| Variável | Obrigatória | Default | Descrição |
| --- | --- | --- | --- |
| `VITE_SERVER_URL` | Sim | — | URL base da API |

Schemas em `packages/env/src/server.ts` e `packages/env/src/web.ts`. Os `.env` são
ignorados pelo git; os `.env.example` são versionados. `SKIP_ENV_VALIDATION=1` pula a
validação (uso em build e CI).

## Estrutura

```
kpi-corp/
├── apps/
│   ├── web/          # Frontend — Vite + React + TanStack Router (:3001)
│   ├── server/       # Backend — Fastify, só host HTTP (:3000)
│   └── fumadocs/     # Documentação e ADRs — Next.js (:4000)
├── packages/
│   ├── api/          # Routers, services e repositories oRPC — a API vive aqui
│   ├── db/           # Schema Prisma, migrations, seed, docker-compose
│   ├── env/          # Schemas de env validados com Zod
│   ├── ui/           # Primitives shadcn/ui compartilhados
│   └── config/       # tsconfig base
└── docs/             # Arquitetura, módulos, PRD e stories
```

**`apps/server` não tem lógica de negócio.** Ele monta o router de `packages/api` em dois
transportes e escuta. Endpoint novo vai em `packages/api/src/modules/`.

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | Sobe web, server e docs em paralelo |
| `npm run dev:web` / `npm run dev:server` | Sobe um app só |
| `npm run build` | Build de todos os apps |
| `npm run test` | Testes (Vitest) |
| `npm run check-types` | Type check de todos os pacotes |
| `npm run lint` | Biome em modo leitura (CI) |
| `npm run check` | Biome com `--write` |

### Banco

O `docker-compose.yml` fica em `packages/db/`, mas os comandos rodam da raiz:

```bash
npm run db:start     # sobe o PostgreSQL em background
npm run db:watch     # sobe em foreground (logs)
npm run db:migrate   # cria e aplica migration a partir do schema
npm run db:seed      # popula com admin e membros de desenvolvimento
npm run db:push      # aplica o schema sem gerar migration (protótipo)
npm run db:generate  # regenera o Prisma Client
npm run db:studio    # abre o Prisma Studio
npm run db:stop      # para os containers
npm run db:down      # para e remove os containers
```

O schema é dividido por modelo em `packages/db/prisma/schema/`. Arquivo novo é detectado
automaticamente. O `DATABASE_URL` de todos os comandos Prisma vem do `.env` **da API**.

## UI compartilhada

Primitives shadcn/ui em `packages/ui`, compartilhados pelos apps React.

```bash
# adicionar primitive compartilhada, da raiz
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

```tsx
import { Button } from "@kpi-corp/ui/components/button";
```

Design tokens e CSS global em `packages/ui/src/styles/globals.css`. Para blocos
específicos de um app, rode o CLI do shadcn de dentro de `apps/web`.

## Git hooks

Lefthook é instalado pelo `prepare` no `npm install`. O `pre-commit` roda
`biome check --write` nos arquivos staged e re-adiciona o que foi corrigido.

```bash
npx lefthook install          # reinstalar os hooks
npx lefthook run pre-commit   # executar manualmente
```

## Projetos relacionados

Nenhum. O KPICorp não depende de serviço externo e nenhum outro projeto o consome hoje —
não há gateway de pagamento, provedor de e-mail, SSO ou API de terceiros. Ao adicionar
qualquer integração, atualize esta seção e o
[diagrama de contexto](docs/architecture/OVERVIEW.md).

## Arquitetura

Visão geral em [docs/architecture/OVERVIEW.md](docs/architecture/OVERVIEW.md).

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [Visão geral da arquitetura](docs/architecture/OVERVIEW.md) | C4 níveis 1 e 2, containers, fluxo de request |
| [Componentes internos](docs/architecture/COMPONENTS.md) | C4 nível 3, camadas de `packages/api` |
| [Decisões (ADR)](docs/architecture/decisions/README.md) | 13 decisões, hospedadas no Fumadocs |
| [Módulo auth](docs/modules/auth.md) | Regras, fluxos, endpoints e pendências |
| [Como contribuir](CONTRIBUTING.md) | Fluxo, commits, padrão de módulo, testes |
| [Changelog](CHANGELOG.md) | Histórico de mudanças relevantes |
| [PRD](docs/prd/kpi-system-prd.md) | Requisitos do produto |
| [Roadmap da API](docs/MVP_API_ROADMAP.md) | Escopo do MVP de backend |

Documentação de engenharia navegável em `http://localhost:4000` (`npm run dev`).

## Estado atual

Projeto em desenvolvimento, **sem deploy e sem release**. A API do MVP está completa —
auth, membros, KPIs, atribuições, perfil e badges, reuniões, ranking e dashboards —
e testada. No front, login, logout, refresh de sessão e cadastro por convite já consomem
a API; as demais telas ainda consomem mock em `apps/web/src/mocks/`.
