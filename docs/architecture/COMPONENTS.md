# Componentes internos

Nível 3 do modelo C4. Detalha a organização interna de `packages/api`, que é onde a
lógica do backend vive. `apps/server` não aparece aqui porque não tem componentes —
é só o host HTTP.

## packages/api

```
packages/api/src/
├── index.ts                 # procedures base: public, protected, admin
├── routers/index.ts         # appRouter — junta os routers de cada módulo
├── modules/
│   └── auth/
│       ├── auth.router.ts       # transporte  — oRPC
│       ├── auth.service.ts      # negócio     — regras
│       ├── auth.repository.ts   # dados       — Prisma
│       ├── auth.schema.ts       # Zod de input/output
│       ├── auth.mapper.ts       # User (Prisma) → AuthUser / PublicUser
│       ├── auth.errors.ts       # erros de domínio do módulo
│       ├── auth.tokens.ts       # JWT de access e refresh
│       └── index.ts             # barrel
│   └── meetings/                # Modo Reunião — adminProcedure nas sete rotas
│       ├── meetings.router.ts
│       ├── meetings.service.ts      # presença em transação única, reunião imutável
│       ├── meetings.repository.ts   # Prisma, inclusive escrita em kpi_assignment
│       ├── meetings.schema.ts
│       ├── meetings.mapper.ts       # closedAt → status OPEN/CLOSED
│       ├── meetings.errors.ts
│       └── index.ts
├── shared/
│   ├── context.ts           # createContext — Bearer → context.auth
│   ├── errors/
│   │   ├── domain-error.ts  # classe base, carrega code e status
│   │   ├── error-mapper.ts  # DomainError → ORPCError
│   │   ├── handle.ts        # wrapper usado por qualquer router
│   │   └── index.ts
│   └── security/
│       ├── password.ts      # bcrypt + DUMMY_PASSWORD_HASH
│       └── tokens.ts        # JWT genérico, sha256, timingSafeEqual, durações
└── tests/
    ├── modules/auth/        # router, service e tokens
    ├── modules/meetings/    # router e service
    └── shared/              # error-mapper, password
```

Os demais módulos (`members`, `kpis`, `assignments`, `profile`) seguem o mesmo formato de
sete arquivos — ver `docs/modules/<nome>.md` para as regras de cada um.

## Camadas

```mermaid
graph TD
    R["Router<br/>auth.router.ts"]
    S["Service<br/>auth.service.ts"]
    Rep["Repository<br/>auth.repository.ts"]
    P[("Prisma / PostgreSQL")]

    Sh["shared/errors<br/>handle, error-mapper"]
    Sec["shared/security<br/>password, tokens"]

    R -->|"authService.login(input)"| S
    S -->|"authRepository.findUserByEmail"| Rep
    Rep --> P

    R -.->|"traduz DomainError"| Sh
    S -.-> Sec

    style R fill:#2563eb,color:#fff
    style S fill:#7c3aed,color:#fff
    style Rep fill:#0891b2,color:#fff
```

Cada camada conhece **apenas** a de baixo. Razão e alternativas em
[ADR 0009](http://localhost:4000/docs/adr/0009-camadas-router-service-repository).

| Camada | Pode importar | Não pode |
| --- | --- | --- |
| Router | service, schema, `shared/errors` | Prisma, repository |
| Service | repository, mapper, errors, tokens, `shared/security` | Prisma, oRPC |
| Repository | `@kpi-corp/db` | service, router |
| `shared/*` | outros `shared/*` | qualquer coisa em `modules/` |

A última linha é a que mais escorrega. `shared/` importando de `modules/` inverte a
dependência e foi um defeito real corrigido na ADR 0010 — `shared/context.ts` é a única
exceção tolerada hoje, porque precisa de `verifyAccessToken` do auth.

## Procedures base

`packages/api/src/index.ts` define três níveis de acesso, cada um construído sobre o
anterior:

| Procedure | Garante | Erro se falhar |
| --- | --- | --- |
| `publicProcedure` | nada | — |
| `protectedProcedure` | `context.auth` não é nulo | `ORPCError("UNAUTHORIZED")` → 401 |
| `adminProcedure` | `context.auth.role === "ADMIN"` | `ORPCError("FORBIDDEN")` → 403 |

```ts
export const protectedProcedure = o.use(({ context, next }) => {
  if (!context.auth) {
    throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
  }

  return next({ context: { ...context, auth: context.auth } });
});
```

O `next({ context: { ...context, auth: context.auth } })` é o que estreita o tipo: dentro
do handler, `context.auth` deixa de ser `T | null`. Guard de perfil vai aqui, nunca dentro
do handler.

## Tratamento de erro

```mermaid
graph LR
    S["service lança<br/>InvalidCredentialsError"] --> H["handle()"]
    H --> M["mapDomainErrorToORPCError"]
    M --> D{"instanceof<br/>DomainError?"}
    D -->|sim| O["ORPCError(err.status)<br/>data: { code }"]
    D -->|não| L["console.error(original)<br/>ORPCError INTERNAL_SERVER_ERROR<br/>'Unexpected error'"]
```

O erro carrega o próprio status (`readonly status = "UNAUTHORIZED"`), então o mapper não
precisa conhecer módulo nenhum. Detalhes em
[ADR 0010](http://localhost:4000/docs/adr/0010-erros-de-dominio).

`handle` mora em `shared/errors/handle.ts` e vale para qualquer router futuro:

```ts
login: publicProcedure
  .input(loginInputSchema)
  .output(loginResponseSchema)
  .handler(({ input }) => handle(() => authService.login(input))),
```

## Contexto da request

`shared/context.ts` roda antes de todo handler:

```ts
const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
// verifica assinatura; token inválido vira auth: null, não exceção
```

Token ausente, expirado ou com assinatura errada resultam todos em `auth: null`. Quem
decide se isso é erro é a procedure, não o contexto.

## Como adicionar um módulo

1. `packages/api/src/modules/<nome>/` com os sete arquivos do padrão do auth.
2. Erros do módulo estendendo `DomainError`, com `code` e `status`.
3. Router usando `handle()` de `shared/errors`.
4. Registrar em `packages/api/src/routers/index.ts`.
5. Testes em `src/tests/modules/<nome>/` — service com repository mockado, router com service mockado.

Nada em `shared/` precisa mudar para acomodar um módulo novo. Se precisar, provavelmente
a dependência está invertida.

## Testes

| Arquivo | O que cobre | Mocka |
| --- | --- | --- |
| `tests/modules/auth/service.test.ts` | regra de negócio | `authRepository` inteiro |
| `tests/modules/auth/router.test.ts` | contrato HTTP e tradução de erro | `authService` inteiro |
| `tests/modules/auth/tokens.test.ts` | JWT, sha256, comparação | nada |
| `tests/modules/meetings/service.test.ts` | regras e transações do Modo Reunião | `meetingsRepository` inteiro |
| `tests/modules/meetings/router.test.ts` | contrato e autorização das sete rotas | `meetingsService` inteiro |
| `tests/shared/errors/error-mapper.test.ts` | status por erro, vazamento | nada |
| `tests/shared/security/password.test.ts` | bcrypt e o hash dummy | nada |

378 testes, nenhum precisa de banco. `npm run test` da raiz.
