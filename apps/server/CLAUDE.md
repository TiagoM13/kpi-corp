# apps/server

Backend do KPICorp. Fastify 5 + oRPC, Node 24, ESM. Roda em `http://localhost:3000`.

Este arquivo cobre **apenas** `apps/server`. Setup geral do monorepo e comandos de banco estão no `README.md` da raiz.

## O ponto mais importante

**Este app é só o host HTTP.** Ele não tem lógica de negócio, nem procedures, nem acesso a banco.

- `apps/server/src/index.ts` é o único arquivo do app: CORS, handlers oRPC e `listen`.
- Endpoint novo → `packages/api/src/modules/<módulo>/`.
- Query nova → `packages/db` (Prisma).
- Variável de ambiente nova → `packages/env/src/server.ts`.

Se uma mudança está criando arquivo dentro de `apps/server/src/`, quase sempre ela pertence a `packages/api`.

## Comandos

Da raiz:

```bash
npm run dev:server       # sobe só a API
npm run check-types
```

De dentro de `apps/server`:

```bash
npm run dev              # tsx watch src/index.ts
npm run build            # tsdown → dist/index.mjs
npm run start            # node dist/index.mjs
npm run check-types      # tsc --noEmit
```

Banco (sempre da raiz, mas o `.env` lido é o **deste app**):

```bash
npm run db:start         # sobe o PostgreSQL (docker compose de packages/db)
npm run db:migrate       # cria e aplica migration
npm run db:push          # aplica schema sem migration (protótipo)
npm run db:generate      # regenera o Prisma Client
npm run db:studio
```

## Rotas HTTP expostas

| Caminho | O que é |
| --- | --- |
| `GET /` | health check trivial, responde `"OK"` |
| `ALL /rpc/*` | `RPCHandler` — consumido pelo client tipado do web |
| `ALL /api-reference/*` | `OpenAPIHandler` + página de referência OpenAPI gerada |

Os dois handlers servem **o mesmo** `appRouter` de `@kpi-corp/api`: um em protocolo RPC, outro em REST/OpenAPI. Procedure nova aparece automaticamente nos dois — não há registro manual.

O schema OpenAPI vem do Zod das procedures via `ZodToJsonSchemaConverter` (`@orpc/zod/zod4`). Input sem Zod = documentação vazia.

## Detalhes do `src/index.ts` que não são óbvios

- **Content-type parser coringa** no plugin de RPC:

  ```ts
  rpcApp.addContentTypeParser("*", (_, _payload, done) => done(null, undefined));
  ```

  Desliga o parser do Fastify de propósito para o oRPC parsear o body ele mesmo. Sem isso, upload/serialização do oRPC quebra. Não remover.

- **`matched === false` → 404 manual.** O handler oRPC não responde quando não bate rota; o `reply.status(404).send()` é obrigatório em cada bloco.

- **`onError` interceptor** só faz `console.error` nos dois handlers. É o lugar de plugar observabilidade se for preciso.

- **CORS** (`baseCorsConfig`) tem `credentials: true` e origem única vinda de `env.CORS_ORIGIN`. O auth hoje usa `Authorization: Bearer`, não cookie — mas essa config já sustenta a troca para cookie `httpOnly` quando ela acontecer.

- **Logger do Fastify ligado** (`Fastify({ logger: true })`) — usar `fastify.log`, não `console.log`, em código novo dentro do app.

## Contexto das procedures

`createContext` mora em **`packages/api/src/shared/context.ts`** (mudou de lugar quando a camada `shared/` nasceu) e recebe os headers da request.

Ele lê `Authorization: Bearer`, valida a assinatura do access token e devolve
`{ headers, auth }`. Token ausente, expirado ou com assinatura inválida resultam todos em
`auth: null` — **o contexto nunca lança**. Quem decide se isso é erro é a procedure.

As três procedures vivem em `packages/api/src/index.ts`:

| Procedure | Garante | Falha com |
| --- | --- | --- |
| `publicProcedure` | nada | — |
| `protectedProcedure` | `context.auth` não nulo | `ORPCError("UNAUTHORIZED")` → 401 |
| `adminProcedure` | `role === "ADMIN"` | `ORPCError("FORBIDDEN")` → 403 |

Nenhuma validação de token acontece dentro deste app.

## Banco

Prisma 7 com driver adapter `pg`. O client é singleton exportado por `@kpi-corp/db`:

```ts
import prisma from "@kpi-corp/db";
```

- Schema dividido por modelo em `packages/db/prisma/schema/*.prisma` — arquivo novo é detectado sozinho.
- Modelos: `User`, `RefreshToken`, `Invitation`, `Kpi`, `KpiAssignment`, `Meeting`, `MeetingAttendee`. Ids são `uuid` com `@db.Uuid`.
- `packages/db/prisma/generated/` é gerado — fora do Biome e do git de revisão.
- `prisma.config.ts` lê `../../apps/server/.env`: **o `.env` da API é a fonte do `DATABASE_URL` para todos os comandos Prisma**, mesmo rodando da raiz.

## Env

`apps/server/.env` (ignorado pelo git), a partir de `.env.example`.

| Variável | Default | Uso |
| --- | --- | --- |
| `DATABASE_URL` | — | Postgres (obrigatória) |
| `CORS_ORIGIN` | — | URL do web, obrigatória e validada como URL |
| `HOST` | `localhost` | bind do Fastify |
| `PORT` | `3000` | porta do Fastify |
| `JWT_SECRET` | — | assinatura do access token (obrigatória) |
| `JWT_REFRESH_SECRET` | — | assinatura do refresh token, distinta da anterior (obrigatória) |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | vida do access token |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | vida do refresh token |
| `NODE_ENV` | `development` | `development` \| `production` \| `test` |

Validação em runtime com `@t3-oss/env-core` + Zod em `packages/env/src/server.ts`. Ler `process.env` direto não é o padrão — declarar no schema e importar `env` de `@kpi-corp/env/server`. `SKIP_ENV_VALIDATION=1` pula a validação (uso em build/CI).

Note que `HOST` e `NODE_ENV` existem no schema mas **não** estão no `.env.example` — funcionam pelo default.

## Build

`tsdown` (`tsdown.config.ts`): entry `src/index.ts`, formato ESM, saída `dist/index.mjs`, `clean: true`.

`deps.alwaysBundle: [/@kpi-corp\/.*/]` — os pacotes internos são bundlados no artefato, porque são publicados como TypeScript-fonte (`exports` apontando para `./src/*.ts`), sem build próprio. Pacote interno novo entra nesse regex automaticamente.

Turborepo cacheia `build` com `dependsOn: ["^build"]` e passa `DATABASE_URL`, `CORS_ORIGIN`, `PORT`, `VITE_SERVER_URL` como env declarada.

## Testes

**Não há testes aqui hoje**, e é assim de propósito. O app não tem script `test` e o Turbo simplesmente pula.

Teste de lógica de API pertence a `packages/api`, junto da procedure — são 52 lá, nenhum precisando de banco. Este app não tem lógica para testar.

## Estilo

- ESM puro (`"type": "module"`), Node 24, TS 6 com `verbatimModuleSyntax` e `strict` — `import type` para tipos é obrigatório.
- `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters` ligados no `tsconfig.base.json` (parâmetro não usado precisa de `void x` ou `_` no nome, como em `createContext`).
- Alias `@/*` → `apps/server/src/*`.
- Biome cuida de format e ordem de imports (tabs, aspas duplas). Rodar `npm run check` da raiz; o pre-commit do Lefthook já aplica nos arquivos staged.
