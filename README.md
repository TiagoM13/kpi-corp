# kpi-corp

Monorepo TypeScript criado com [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack): React + TanStack Router no front, Fastify + oRPC no back, Prisma + PostgreSQL no banco.

## Stack

- **TypeScript** — type safety ponta a ponta
- **TanStack Router** — roteamento file-based tipado
- **TailwindCSS v4** — utility-first CSS
- **shadcn/ui sobre Base UI** — primitives compartilhados em `packages/ui`
- **Fastify** — framework HTTP de baixo overhead
- **oRPC** — RPC tipado ponta a ponta, com página OpenAPI gerada
- **Node.js 24** — runtime
- **Prisma 7** — ORM com driver adapter `pg`
- **PostgreSQL 18** — banco, via Docker local
- **Biome** — lint e formatação (substitui ESLint + Prettier)
- **Lefthook** — git hooks
- **Vitest + Testing Library** — testes do front
- **Turborepo** — build system do monorepo

## Pré-requisitos

- **Node.js 24** (`nvm use` respeita o `.nvmrc`)
- **Docker** rodando (PostgreSQL local)
- **Git**

Extensões recomendadas no VS Code: **Biome**, **Prisma**, **Tailwind CSS IntelliSense**, **Docker**.

## Setup

```bash
# 1. dependências (`prepare` instala os git hooks, `postinstall` roda `prisma generate`)
npm install

# 2. variáveis de ambiente
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env

# 3. subir o PostgreSQL local
npm run db:start

# 4. aplicar as migrations
npm run db:migrate

# 5. rodar tudo
npm run dev
```

| Serviço | URL |
| --- | --- |
| Web (Vite + TanStack Router) | http://localhost:3001 |
| API (Fastify + oRPC) | http://localhost:3000 |
| Referência OpenAPI | http://localhost:3000/api-reference |
| Docs (Fumadocs) | http://localhost:4000 |

O endpoint RPC fica em `http://localhost:3000/rpc`. O front não faz `fetch` manual — usa o client tipado em `apps/web/src/utils/orpc.ts`.

## Variáveis de ambiente

Validadas em runtime por `packages/env` (`@t3-oss/env-core`). Variável nova só passa a existir depois de ser declarada no schema:

- `packages/env/src/server.ts` — backend
- `packages/env/src/web.ts` — frontend (prefixo `VITE_`)

`apps/server/.env`: `DATABASE_URL`, `CORS_ORIGIN`, `PORT`, `HOST`, `NODE_ENV`.
`apps/web/.env`: `VITE_SERVER_URL`.

Os arquivos `.env` são ignorados pelo git; os `.env.example` são versionados.

## Estrutura

```
kpi-corp/
├── apps/
│   ├── web/          # Frontend — Vite + React + TanStack Router (:3001)
│   ├── server/       # Backend — Fastify + oRPC (:3000)
│   └── fumadocs/     # Documentação — Next.js + Fumadocs (:4000)
└── packages/
    ├── api/          # Routers e procedures oRPC (fonte da verdade dos tipos da API)
    ├── db/           # Schema Prisma, migrations e docker-compose do PostgreSQL
    ├── env/          # Schemas de env validados com Zod
    ├── ui/           # Primitives shadcn/ui compartilhados
    └── config/       # tsconfig base
```

## Banco de dados

O `docker-compose.yml` fica em `packages/db/`, mas todos os comandos rodam da raiz:

```bash
npm run db:start     # sobe o PostgreSQL em background
npm run db:watch     # sobe em foreground (logs)
npm run db:migrate   # cria e aplica migration a partir do schema
npm run db:push      # aplica o schema sem gerar migration (protótipo)
npm run db:generate  # regenera o Prisma Client
npm run db:studio    # abre o Prisma Studio
npm run db:stop      # para os containers
npm run db:down      # para e remove os containers
```

O schema é dividido por modelo em `packages/db/prisma/schema/`. Cada arquivo novo é detectado automaticamente.

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | Sobe web, server e docs em paralelo |
| `npm run dev:web` / `npm run dev:server` | Sobe um app só |
| `npm run build` | Build de todos os apps |
| `npm run test` | Roda os testes (Vitest) |
| `npm run check-types` | Type check de todos os pacotes |
| `npm run lint` | Biome em modo leitura (usado em CI) |
| `npm run check` | Biome com `--write` (corrige e formata) |

## UI compartilhada

Os primitives shadcn/ui ficam em `packages/ui` e são compartilhados pelos apps React.

- Design tokens e estilos globais: `packages/ui/src/styles/globals.css`
- Primitives: `packages/ui/src/components/*`
- Config do shadcn: `packages/ui/components.json` e `apps/web/components.json`

Adicionar novos primitives compartilhados, a partir da raiz:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Importar:

```tsx
import { Button } from "@kpi-corp/ui/components/button";
```

Para blocos específicos de um app, rode o CLI do shadcn de dentro de `apps/web`.

## Git hooks

Lefthook é instalado pelo script `prepare` da raiz, no `npm install`. O hook de `pre-commit` roda `biome check --write` nos arquivos staged e re-adiciona o que foi corrigido.

```bash
npx lefthook install          # reinstalar os hooks
npx lefthook run pre-commit   # executar o hook manualmente
```
