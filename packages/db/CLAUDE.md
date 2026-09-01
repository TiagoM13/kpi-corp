# packages/db

Prisma 7 + PostgreSQL 18. Schema, migrations, client singleton, seed e o
`docker-compose.yml` do banco.

Este arquivo cobre **apenas** `packages/db`. Setup geral está no `README.md` da raiz.

## Comandos

Sempre da **raiz**, via Turborepo — não `cd packages/db && npx prisma ...`:

```bash
npm run db:start     # sobe o Postgres em background
npm run db:watch     # foreground, com logs
npm run db:migrate   # cria e aplica migration a partir do schema
npm run db:seed      # admin + 3 membros de desenvolvimento
npm run db:push      # aplica schema sem migration (protótipo)
npm run db:generate  # regenera o Prisma Client
npm run db:studio
npm run db:stop / db:down
```

**O `DATABASE_URL` vem de `apps/server/.env`**, não de um `.env` deste pacote.
`prisma.config.ts` aponta para lá — vale para todo comando Prisma, mesmo rodando da raiz.

## Prisma 7 — exemplo da web provavelmente está errado

Três coisas mudaram em relação ao Prisma 6, e a maioria dos exemplos ainda é v6.

```prisma
generator client {
  provider     = "prisma-client"   // não "prisma-client-js"
  output       = "../generated"
  moduleFormat = "esm"
  runtime      = "nodejs"
}

datasource db {
  provider = "postgresql"          // sem url aqui
}
```

A URL vive em `prisma.config.ts`. Colocar `url = env("DATABASE_URL")` no schema **falha**.

O client é importado por caminho relativo do gerado, não de `@prisma/client`. Use o
singleton:

```ts
import prisma from "@kpi-corp/db";
```

`prisma/generated/` é gerado — fora do Biome e fora de revisão.

## Schema

Um arquivo por modelo em `prisma/schema/`. Arquivo novo é detectado sozinho.

```
schema.prisma        generator + datasource
user.prisma          User, enum Role
kpi.prisma           Kpi, enum KpiCategory
kpi-assignment.prisma
meeting.prisma
meeting-attendee.prisma
refresh-token.prisma
invitation.prisma
```

### Convenções obrigatórias

- **Id é `uuid`**, com `@db.Uuid`. Sem o `@db.Uuid` o Postgres guarda em `text` — perde
  validação e dobra o armazenamento. FK também leva `@db.Uuid`; tipo divergente faz o
  join descartar o índice. Ver [ADR 0013](http://localhost:4000/docs/adr/0013-ids-em-uuid).
- **`@@map` em snake_case** na tabela e no enum; colunas em camelCase.
- **FK precisa de `@@index` à mão.** O Postgres não indexa foreign key automaticamente e o
  Prisma não gera. Sem isso, todo join vira seq scan.
- **`user` é palavra reservada no Postgres.** O Prisma sempre gera com aspas, então a
  aplicação funciona — mas query manual precisa de `select * from "user"`.

## Seed

`src/seed.ts`, rodado por `npm run db:seed`. Idempotente (`upsert` por e-mail).

| E-mail | Senha | Perfil |
| --- | --- | --- |
| `admin@kpicorp.com` | `admin123` | `ADMIN` |
| `ana@`, `bruno@`, `carla@kpicorp.com` | `member123` | `MEMBER` |

**O seed hasheia com `bcryptjs` direto, não importando de `@kpi-corp/api`.**
`packages/api` já depende deste pacote; importar de volta fecharia um ciclo de workspace
e o Turbo quebra ao montar o grafo de tarefas. O custo (`PASSWORD_COST = 12`) está
duplicado de propósito, com comentário apontando para a origem — se mudar lá, mude aqui.

## Migrations

`prisma/migrations/`, aplicadas por `npm run db:migrate`.

| Migration | O que fez |
| --- | --- |
| `20260823203117_init` | schema inicial |
| `20260831110614_add_refresh_token` | tabela `refresh_token` |
| `20260831110915_add_invitation` | tabela `invitation` |
| `20260831112449_remove_todo` | removeu o resíduo do scaffold |
| `20260831113234_change_ids_to_uuid` | int sequencial → uuid em todas as tabelas |

Migration não se edita depois de aplicada. Mudou o schema? Gere a próxima.

## `npm audit`

Acusa vulnerabilidades high vindas de `deepmerge-ts`, transitiva de `@prisma/config`.
É dependência do CLI, não vai para runtime. **Não rodar `audit fix --force`** — faria
downgrade para Prisma 6 e quebraria generator, adapter e schema dividido.
