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
npm run db:seed      # recria usuários, reuniões e atribuições (KPIs intactos)
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
schema.prisma            generator + datasource
user.prisma              User, enum Role
kpi.prisma               Kpi, enum KpiCategory
kpi-assignment.prisma    KpiAssignment — points congelado, revokedAt
meeting.prisma           Meeting — closedAt
meeting-attendee.prisma  MeetingAttendee — presentAt
user-badge.prisma        UserBadge — carimbo de conquista, code em String
ranking-snapshot.prisma  RankingSnapshot, enum RankingPeriod
refresh-token.prisma     RefreshToken — tokenHash
invitation.prisma        Invitation — tokenHash
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

`src/seed.ts`, rodado por `npm run db:seed`.

**Destrutivo, exceto para KPI.** Cada execução apaga usuários, atribuições, reuniões,
presenças, badges, snapshots de ranking, refresh tokens e convites, e recria tudo do zero.
A tabela `kpi` nunca é alterada: o seed só a lê e sorteia as atribuições entre os KPIs
ativos que já existem, com peso por perfil (QA recebe "Encontrou Bug Crítico", PO recebe
"Visão de Produto" e assim por diante). Só se o catálogo estiver vazio ele cria os 8 KPIs
base. Tudo é montado e conferido em memória antes de abrir a transação — se a conferência
falhar, nada é apagado.

Doze usuários, um único `ADMIN`, todos com a senha `admin123`:

| Ordem | Nome | Cargo | Pontos |
| --- | --- | --- | --- |
| 1 | Marina Duarte | Product Owner Sênior | 7850 (nível 20) |
| 2 | Pedro Henrique Alves | Desenvolvedor Full-stack Sênior | 6350 |
| 3 | André Martins | Tech Lead | 5450 |
| 4 | João Pedro Lima | Desenvolvedor Back-end Sênior | 4700 |
| 5 | Juliana Mendes | Product Designer Sênior | 3900 |
| 6 | Matheus Rocha | Desenvolvedor Full-stack Pleno | 3300 |
| 7 | Lucas Ferreira | Desenvolvedor Front-end Pleno | 2350 |
| 8 | Gabriel Santos | Desenvolvedor Back-end Pleno | 1950 |
| 9 | Fernanda Lopes | Analista de QA Pleno | 1600 |
| 10 | Eduardo Santos | Chefe (`ADMIN`, `admin@kpicorp.com`) | 1400 |
| 11 | Mariana Costa | Product Designer Pleno | 1150 |
| 12 | Vinícius Barros | Desenvolvedor Mobile Pleno | 750 |

Os demais usam `nome.sobrenome@kapicorp.com`. A Marina fecha as 10 badges: o histórico
tem 24 semanas de atribuições, uma reunião semanal (mais uma de planejamento a cada duas
semanas) em que ela sempre marca presença, e ela lidera o ranking geral, de todos os
meses e da semana corrente. Existe ainda uma reunião aberta ("Daily da squad") e
três atribuições revogadas de exemplo.

Os pontos são fixos em `MEMBERS`; o seed lança erro se a soma de alguém divergir, se a
Marina deixar de ser a primeira ou se houver mais de um `ADMIN`.

**O seed hasheia com `bcryptjs` direto, não importando de `@kpi-corp/api`.**
`packages/api` já depende deste pacote; importar de volta fecharia um ciclo de workspace
e o Turbo quebra ao montar o grafo de tarefas. O custo (`PASSWORD_COST = 12`) e o teto de
nível (`MAX_LEVEL_POINTS = 7500`) estão duplicados de propósito, com comentário apontando
para a origem — se mudar lá, mude aqui.

## Migrations

`prisma/migrations/`, aplicadas por `npm run db:migrate`.

| Migration | O que fez |
| --- | --- |
| `20260823203117_init` | schema inicial |
| `20260831110614_add_refresh_token` | tabela `refresh_token` |
| `20260831110915_add_invitation` | tabela `invitation` |
| `20260831112449_remove_todo` | removeu o resíduo do scaffold |
| `20260831113234_change_ids_to_uuid` | int sequencial → uuid em todas as tabelas |
| `20260901120000_kpi_category_presence_initiative` | `ATTENDANCE` → `PRESENCE` e novo valor `INITIATIVE` no enum de categoria |
| `20260907120000_assignment_points_and_revoked_at` | `points` congelado na atribuição e `revoked_at` no lugar de `active` ([ADR 0015](http://localhost:4000/docs/adr/0015-atribuicao-imutavel-e-revogacao-logica)) |
| `20260907130000_rename_assignment_revoked_at_camel_case` | `revoked_at` → `revokedAt`, no padrão camelCase das colunas |
| `20260908195732_add_user_badge` | tabela `user_badge` ([ADR 0016](http://localhost:4000/docs/adr/0016-badges-carimbadas-na-leitura)) |
| `20260919143727_meeting_closed_at_and_attendee_present_at` | `closed` → `closedAt` na reunião e `presentAt` no participante |
| `20260919200339_ranking_snapshot` | tabela `ranking_snapshot` e enum `ranking_period` ([ADR 0019](http://localhost:4000/docs/adr/0019-snapshot-de-ranking-na-leitura)) |
| `20260924120000_hash_invitation_token` | `token` → `tokenHash` no convite, com os existentes convertidos para SHA-256 ([ADR 0020](http://localhost:4000/docs/adr/0020-token-de-convite-em-sha-256)) |

Migration não se edita depois de aplicada. Mudou o schema? Gere a próxima.

## `npm audit`

Acusa vulnerabilidades high vindas de `deepmerge-ts`, transitiva de `@prisma/config`.
É dependência do CLI, não vai para runtime. **Não rodar `audit fix --force`** — faria
downgrade para Prisma 6 e quebraria generator, adapter e schema dividido.
