# packages/env

Schemas de variável de ambiente validados em runtime com `@t3-oss/env-core` + Zod.

Pacote minúsculo e a regra é uma só: **variável não declarada aqui não existe.**

## A regra

Ler `process.env.X` ou `import.meta.env.X` direto não é o padrão do projeto. Declare no
schema e importe o `env` tipado:

```ts
import { env } from "@kpi-corp/env/server";

env.JWT_SECRET; // string, garantido em runtime
```

O ganho: falta de variável quebra **no boot**, com mensagem dizendo qual, em vez de virar
`undefined` no meio de uma request.

## Arquivos

| Arquivo | Export | Consumido por |
| --- | --- | --- |
| `src/server.ts` | `@kpi-corp/env/server` | `apps/server`, `packages/api`, `packages/db` |
| `src/web.ts` | `@kpi-corp/env/web` | `apps/web` |

## Variáveis de servidor

| Variável | Obrigatória | Default |
| --- | --- | --- |
| `DATABASE_URL` | sim | — |
| `CORS_ORIGIN` | sim | — (validada como URL) |
| `WEB_APP_URL` | sim | — (validada como URL) |
| `JWT_SECRET` | sim | — (mínimo 32 caracteres) |
| `JWT_REFRESH_SECRET` | sim | — (mínimo 32, diferente de `JWT_SECRET`) |
| `JWT_ACCESS_EXPIRES_IN` | não | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | não | `7d` |
| `HOST` | não | `localhost` |
| `PORT` | não | `3000` |
| `NODE_ENV` | não | `development` |

Os dois segredos de JWT são **distintos de propósito**: access token roubado não pode ser
forjado em refresh. O `createFinalSchema` de `src/server.ts` recusa o boot se forem iguais.

`CORS_ORIGIN` e `WEB_APP_URL` também são separadas de propósito, apesar de apontarem
para o mesmo lugar em desenvolvimento:

| Variável | Responde | Pode virar lista? |
| --- | --- | --- |
| `CORS_ORIGIN` | de onde aceito requisição | sim |
| `WEB_APP_URL` | para onde mando o usuário (link de convite) | não — precisa ser canônica |

Derivar link de convite da configuração de CORS acopla segurança a roteamento: no dia em
que o CORS virar lista, o convite passaria a apontar para uma origem arbitrária.

`HOST` e `NODE_ENV` existem no schema mas não estão no `.env.example` — funcionam pelo
default.

## Web

Prefixo `VITE_` obrigatório (é o que o Vite expõe ao bundle). Hoje só `VITE_SERVER_URL`.

Nunca coloque segredo em `src/web.ts` — tudo ali vai para o bundle do navegador.

## Ao adicionar variável

1. Declarar no schema com o tipo Zod certo.
2. Adicionar ao `.env.example` do app correspondente, com comentário.
3. Documentar na tabela do `README.md` da raiz.
4. Se o build precisar dela, declarar em `turbo.json` (`tasks.build.env`).

Pular o passo 4 faz o Turbo cachear build com valor errado.

`SKIP_ENV_VALIDATION=1` pula a validação — usado em build e CI, onde nem toda variável
de runtime está presente.
