# packages/api

**A API do KPICorp vive aqui.** Routers, regra de negócio e acesso a dados.
`apps/server` só monta isto num servidor HTTP.

Este arquivo cobre **apenas** `packages/api`. Setup do monorepo está no `README.md` da raiz.

## Camadas — a regra central

Três camadas por módulo, cada uma conhecendo **apenas** a de baixo.

```
auth.router.ts       transporte  — oRPC, schemas, nada mais
auth.service.ts      negócio     — regras, orquestração, erros de domínio
auth.repository.ts   dados       — único lugar que fala com o Prisma
```

| Camada | Pode importar | **Não** pode |
| --- | --- | --- |
| Router | service, schema, `shared/errors` | Prisma, repository |
| Service | repository, mapper, errors, tokens, `shared/security` | Prisma, `@orpc/server` |
| Repository | `@kpi-corp/db` | service, router |
| `shared/*` | outros `shared/*` | qualquer coisa em `modules/` |

## Módulo não importa de módulo

**Regra dura, sem exceção.** Nenhum arquivo em `modules/<a>/` importa de
`modules/<b>/`. Se dois módulos precisam da mesma coisa, ela vai para `shared/`.

E `shared/` não conhece módulo nenhum — a dependência aponta só para dentro.

```
modules/auth/    →  shared/          ✅
modules/members/ →  shared/          ✅
modules/members/ →  modules/auth/    ❌
shared/          →  modules/auth/    ❌
```

Por isso `EmailAlreadyRegisteredError` vive em `shared/errors/common.errors.ts`
(auth e members usam), e a verificação do access token vive em
`shared/security/access-token.ts` (o `createContext` precisa dela sem depender do
módulo auth). Erro que só um módulo usa continua no módulo.

**Como isso é cobrado:**

| Onde | O quê |
| --- | --- |
| `biome.json` (overrides) | `noRestrictedImports` acusa no editor, com a mensagem da regra |
| `tests/architecture.test.ts` | varre os arquivos e falha com o caminho exato da violação |

O lint bloqueia irmão **por nome**, então módulo novo precisa entrar no `group` do
`biome.json`. Um teste cobra essa sincronia — esquecer faz o teste falhar, não o
lint emudecer.

## Estrutura de um módulo

```
modules/<nome>/
├── <nome>.router.ts       # oRPC — uma linha por rota
├── <nome>.service.ts      # regra, lança DomainError
├── <nome>.repository.ts   # Prisma
├── <nome>.schema.ts       # Zod de input e output
├── <nome>.mapper.ts       # User (Prisma) → DTO
├── <nome>.errors.ts       # erros do módulo
└── index.ts               # barrel
```

Service e repository são **um objeto só por camada**, não funções soltas:

```ts
export const authRepository = {
  findUserByEmail(email: string) { /* ... */ },
};
```

Motivo: o mock do teste troca o objeto inteiro, então método novo não quebra teste
existente. Helper privado — `issueSession`, por exemplo — fica **fora** do objeto,
porque não é API pública do service.

Registrar em `src/routers/index.ts` depois de criar.

## Procedures

`src/index.ts` define os três níveis. Guard de perfil vai aqui, **nunca** dentro do handler.

| Procedure | Garante | Falha com |
| --- | --- | --- |
| `publicProcedure` | nada | — |
| `protectedProcedure` | `context.auth` não nulo | 401 |
| `adminProcedure` | `role === "ADMIN"` | 403 |

O `next({ context: { ...context, auth: context.auth } })` é o que estreita o tipo —
dentro do handler `context.auth` deixa de ser nulável.

## Erros

Erro de negócio estende `DomainError` e **declara o próprio status HTTP**:

```ts
export class InvalidCredentialsError extends DomainError {
  readonly code = "INVALID_CREDENTIALS";
  readonly status = "UNAUTHORIZED" as const;

  constructor() {
    super("Invalid email or password");
  }
}
```

Todo handler passa por `handle()` de `shared/errors` — que é compartilhado, não do auth:

```ts
login: publicProcedure
  .input(loginInputSchema)
  .output(loginResponseSchema)
  .handler(({ input }) => handle(() => authService.login(input))),
```

O mapper não conhece módulo nenhum: lê `err.status` da instância. Erro fora do domínio
é logado e vira `"Unexpected error"` — mensagem de driver de banco não chega ao cliente.
Ver [ADR 0010](http://localhost:4000/docs/adr/0010-erros-de-dominio).

Construtores de erro **não aceitam mensagem custom**. É de propósito: garante que
e-mail inexistente e senha errada respondam idêntico.

## `.output()` é obrigatório

Sem ele o schema OpenAPI mostra `unknown` na resposta e o consumidor externo não vê o
shape. Todo procedure novo declara `.input()` **e** `.output()`.

## Segurança — invariantes que não podem quebrar

Estão travadas por teste. Se um teste destes falhar, é regressão de segurança, não
detalhe de implementação.

- **`verifyPassword` roda sempre no login**, contra `DUMMY_PASSWORD_HASH` quando o e-mail
  não existe. O hash dummy precisa ser um bcrypt **válido** — um malformado é rejeitado
  em 0 ms e vira oráculo de enumeração.
- **Refresh token usa SHA-256, não bcrypt.** bcrypt trunca em 72 bytes e dois tokens do
  mesmo usuário só diferem depois disso — um validaria o outro.
- **`createRefreshToken` recebe `id: tokenId`**, o mesmo que vai no payload do JWT. Sem
  isso o Prisma gera outro id e refresh e logout param de funcionar por completo.
- **Consumo de convite é `updateMany` guardado por `usedAt: null` dentro da transação.**
  Checar antes e marcar depois deixa duas requisições passarem.
- **Refresh revogado que reaparece revoga toda a família** do usuário.

Ver ADRs [0011](http://localhost:4000/docs/adr/0011-jwt-refresh-token-rotativo) e
[0012](http://localhost:4000/docs/adr/0012-hash-de-senha-e-de-token).

## Testes

```bash
npm run test          # da raiz
npx vitest            # watch, de dentro do pacote
```

509 testes em 25 arquivos, **nenhum precisa de banco**.

| Arquivo | Mocka |
| --- | --- |
| `tests/modules/auth/service.test.ts` | `authRepository` inteiro |
| `tests/modules/auth/router.test.ts` | `authService` inteiro |
| `tests/modules/auth/tokens.test.ts` | nada |
| `tests/modules/meetings/service.test.ts` | `meetingsRepository` inteiro |
| `tests/modules/meetings/router.test.ts` | `meetingsService` inteiro |
| `tests/modules/ranking/service.test.ts` | `rankingRepository` inteiro |
| `tests/modules/ranking/router.test.ts` | `rankingService` inteiro |
| `tests/modules/dashboard/service.test.ts` | `dashboardRepository` inteiro |
| `tests/modules/dashboard/router.test.ts` | `dashboardService` inteiro |
| `tests/modules/assignments/router.test.ts` | `assignmentsService` inteiro |
| `tests/shared/**` | nada — `errors`, `security`, `ranking`, `gamification` |

```ts
vi.mock("../../../modules/auth/auth.repository", () => ({
  authRepository: repositoryMock,
}));
```

`tests/setup.ts` carrega `apps/server/.env` — os testes de token precisam dos segredos JWT.

**Teste que passa com o bug presente não serve.** Ao corrigir defeito, reintroduza-o e
confirme que o teste novo quebra. Foi assim que os três bugs de segurança do auth
ganharam cobertura de verdade.

## Import e export

- `@kpi-corp/api` → `src/index.ts` (procedures)
- `@kpi-corp/api/*` → `src/*.ts` — ex.: `@kpi-corp/api/routers/index`, `@kpi-corp/api/shared/context`
- O front importa **o tipo** `AppRouterClient` daqui; mudança de contrato quebra no type check.

`packages/db` **não** pode importar deste pacote — fecharia ciclo de workspace e o Turbo
quebra. Foi por isso que o seed hasheia senha com `bcryptjs` direto.

## Pendências

- Rate limiting em `login`, `register` e `refresh` — não existe.
- Limpeza de `refresh_token` revogado/expirado — a tabela só cresce.
- A API do MVP está completa (3A a 3E entregues). O que falta do produto é a migração do
  front para fora do mock — story de web, não deste pacote.
