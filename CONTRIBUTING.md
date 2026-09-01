# Como contribuir

## Antes de começar

Ambiente rodando conforme o [Quick Start](README.md#quick-start). Se `npm run dev` não
sobe os três apps, resolva isso antes de escrever código.

## Fluxo

1. Branch a partir de `main`: `feat/<escopo>`, `fix/<escopo>`, `docs/<escopo>`.
2. Código + teste + documentação no mesmo PR.
3. `npm run check-types` e `npm run test` verdes.
4. `npm run check` para formatar (o pre-commit já roda nos arquivos staged).

## Commits

Conventional Commits, **em inglês**, assunto de uma linha, sem corpo.

```
feat(api): add the auth module with login, register, refresh and logout
fix(web): reject stored sessions with an invalid shape
docs: add the kpi system prd and the mvp api roadmap
```

**Um commit por escopo.** Nunca um commit único com tudo. Agrupe os arquivos por
preocupação e ordene por dependência — base primeiro:

```
chore(deps) → db → env → api → server → web → test → docs
```

Escopos em uso: `api`, `db`, `env`, `server`, `web`, `ui`, `deps`, e nenhum para `docs`.

## Onde cada coisa mora

Errar isso é o engano mais comum do repositório.

| O que você quer fazer | Onde |
| --- | --- |
| Endpoint novo | `packages/api/src/modules/<módulo>/` |
| Query nova | repository do módulo, nunca no service ou router |
| Variável de ambiente | `packages/env/src/server.ts` ou `web.ts` — declarar antes de usar |
| Modelo novo | `packages/db/prisma/schema/<nome>.prisma`, um arquivo por modelo |
| Primitive de UI compartilhada | `packages/ui/src/components/` |
| Tela | `apps/web/src/pages/` — `routes/` só declara roteamento |
| Decisão técnica | ADR em `apps/fumadocs/content/docs/adr/` |

`apps/server/src/index.ts` é só o host HTTP. Se uma mudança está criando arquivo dentro
de `apps/server/src/`, quase sempre ela pertence a `packages/api`.

## Padrão de módulo da API

Sete arquivos, camadas que só conhecem a de baixo. Use `auth` como referência —
detalhes na [ADR 0009](http://localhost:4000/docs/adr/0009-camadas-router-service-repository).

```
modules/<nome>/
├── <nome>.router.ts       # oRPC, chama o service, nada mais
├── <nome>.service.ts      # regra de negócio, lança DomainError
├── <nome>.repository.ts   # único lugar com Prisma
├── <nome>.schema.ts       # Zod de input e output
├── <nome>.mapper.ts       # shaping de DTO
├── <nome>.errors.ts       # erros do módulo, com code e status
└── index.ts               # barrel
```

Regras que o review cobra:

- Router não importa Prisma nem repository.
- Service não importa `@orpc/server`.
- Erro de negócio estende `DomainError` e declara `code` e `status`.
- Todo handler passa por `handle()` de `shared/errors`.
- `shared/` não importa de `modules/`.

## Testes

Vitest. Service com o repository mockado, router com o service mockado — nenhum teste da
API deve precisar de banco.

```ts
vi.mock("../../../modules/auth/auth.repository", () => ({
  authRepository: repositoryMock,
}));
```

Teste que passa com o bug presente não serve. Ao corrigir um defeito, reintroduza-o e
confirme que o teste novo quebra antes de considerar o trabalho pronto.

## Documentação

Sem doc atualizada, a feature não está pronta.

| Mudança | Atualize |
| --- | --- |
| Decisão técnica relevante | ADR novo no Fumadocs + `index.mdx` + `meta.json` |
| Módulo novo ou regra de negócio | `docs/modules/<nome>.md` |
| Container, integração ou ator | `docs/architecture/OVERVIEW.md` |
| Estrutura interna da API | `docs/architecture/COMPONENTS.md` |
| Qualquer coisa que o consumidor perceba | `CHANGELOG.md` |
| Variável de ambiente | `README.md`, o `.env.example` e o schema em `packages/env` |
| Convenção que um agente precise saber | `CLAUDE.md` do pacote em questão |

ADR aceita é imutável. Mudou a decisão? Escreva a próxima e marque a antiga como
`Substituída`.

## Estilo

Biome cuida de format e ordem de import — não brigue com ele. Tabs, aspas duplas.

- ESM puro, TypeScript `strict` com `verbatimModuleSyntax`: `import type` para tipos.
- `noUncheckedIndexedAccess` ligado — indexar array devolve `T | undefined`.
- Sem ternário aninhado. Três ramos ou mais no JSX viram componente com early return.
- Filho de grid ou flex que possa transbordar precisa de `min-w-0`.
