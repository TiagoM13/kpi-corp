# kpi-corp

Monorepo Turborepo do KPICorp — sistema de KPIs de equipe. Node 24, ESM puro, TypeScript
`strict`.

Este arquivo vale para o **repositório inteiro**. Cada app e pacote tem o próprio
`CLAUDE.md` com o que é específico dele — leia o do diretório em que for mexer.

## A regra que mais se erra

**`apps/server` não é o backend.** Ele é só o host HTTP: CORS, montagem dos handlers
oRPC e `listen`. A API vive em `packages/api`.

| Você quer | Vá para |
| --- | --- |
| Endpoint novo | `packages/api/src/modules/<módulo>/` |
| Query nova | repository do módulo — nunca service, nunca router |
| Variável de ambiente | `packages/env/src/server.ts` ou `web.ts`, **antes** de usar |
| Modelo novo | `packages/db/prisma/schema/<nome>.prisma`, um arquivo por modelo |
| Primitive de UI | `packages/ui/src/components/` |
| Tela | `apps/web/src/pages/` — `routes/` só declara roteamento |
| Decisão técnica | ADR em `apps/fumadocs/content/docs/adr/` |

Se uma mudança está criando arquivo dentro de `apps/server/src/`, quase sempre ela
pertence a `packages/api`.

## Layout

```
apps/
  web/        React 19 + TanStack Router + Vite      :3001
  server/     Fastify 5 — host HTTP                  :3000
  fumadocs/   Next.js — documentação e ADRs          :4000
packages/
  api/        routers, services, repositories oRPC
  db/         Prisma: schema, migrations, seed, docker-compose
  env/        schemas de env validados com Zod
  ui/         primitives shadcn/ui sobre Base UI
  config/     tsconfig.base.json
```

## Comandos

Sempre da raiz — o Turborepo cuida do grafo:

```bash
npm run dev              # web + server + docs
npm run dev:web
npm run dev:server
npm run test             # Vitest em todos os pacotes
npm run check-types      # tsc --noEmit em todos
npm run check            # biome check --write
npm run lint             # biome, modo leitura (CI)
```

Banco (o `docker-compose.yml` está em `packages/db/`, mas os comandos rodam da raiz):

```bash
npm run db:start db:migrate db:seed db:studio db:generate db:push db:stop db:down
```

`db:seed` cria `admin@kpicorp.com` / `admin123` e três membros com `member123`.

## Convenções que valem em todo lugar

- **ESM puro**, `verbatimModuleSyntax`: `import type` para tipo é obrigatório.
- **`noUncheckedIndexedAccess`** ligado — indexar array devolve `T | undefined`.
- **Biome** cuida de format e ordem de import. Tabs, aspas duplas. Não brigue com ele.
- **Sem ternário aninhado.** Três ramos ou mais no JSX viram componente com early return.
- **`min-w-0`** em filho de grid ou flex que possa transbordar — sem isso estoura no mobile.
- **Nada de `process.env` direto.** Declare em `packages/env` e importe `env`.
- **Nada de `fetch` manual no front.** Use o client tipado `apps/web/src/utils/orpc.ts`.

## Commits

Conventional Commits, **inglês**, assunto de uma linha, sem corpo, sem trailer.

```
feat(api): add the auth module with login, register, refresh and logout
```

**Um commit por escopo, nunca tudo de uma vez.** Ordene por dependência:
`deps → db → env → api → server → web → test → docs`.

Identidade fica no `--local` do repo (`TiagoM13`), não no global da máquina.

## Documentação

Sem doc atualizada, a feature não está pronta.

| Onde | O quê |
| --- | --- |
| `README.md` | setup, env, scripts |
| `docs/architecture/OVERVIEW.md` | C4 níveis 1 e 2 |
| `docs/architecture/COMPONENTS.md` | C4 nível 3, camadas da API |
| `docs/modules/<nome>.md` | regras de negócio por módulo |
| `apps/fumadocs/content/docs/adr/` | **os ADRs moram aqui**, não em `docs/` |
| `CHANGELOG.md` | mudanças que o consumidor percebe |
| `CONTRIBUTING.md` | fluxo, commits, padrão de módulo |

ADR aceita é imutável. Mudou a decisão? Escreva a próxima e marque a antiga como
`Substituída`.

## Estado atual

Desenvolvimento local apenas — **sem deploy, sem CI, sem release**.

| Área | Situação |
| --- | --- |
| API de auth | Implementada, validada ponta a ponta |
| Demais módulos da API | `members`, `kpis`, `assignments`, `profile`, `meetings`, `ranking` e `dashboard` implementados — roadmap do MVP fechado (specs 2B a 3E entregues) |
| Front | Auth real (login, logout, refresh, convite — ADR 0014) e tela de membros do admin; demais telas ainda consomem mock em `apps/web/src/mocks/` |
| Rate limiting | Não existe |
