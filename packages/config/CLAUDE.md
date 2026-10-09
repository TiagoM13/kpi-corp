# packages/config

`tsconfig.base.json` compartilhado. É só isso — nem código, nem script, nem dependência.

## Uso

Cada pacote estende:

```json
{ "extends": "@kpi-corp/config/tsconfig.base.json" }
```

## Flags que mudam como se escreve código

Ligadas na base e valem para o monorepo inteiro:

| Flag | Efeito prático |
| --- | --- |
| `strict` | o de sempre |
| `verbatimModuleSyntax` | `import type` para tipo é **obrigatório**, não estilo |
| `noUncheckedIndexedAccess` | `arr[0]` é `T \| undefined` — precisa de guarda |
| `noUnusedLocals` / `noUnusedParameters` | parâmetro não usado precisa de `_` no nome |

`noUncheckedIndexedAccess` é a que mais surpreende. Foi ela que exigiu a guarda explícita
no parser de duração em `packages/api/src/shared/security/tokens.ts`:

```ts
const amount = match?.[1];
const unit = match?.[2];

if (!amount || !unit) {
  throw new Error(`Invalid duration: ${duration}`);
}
```

## Alterar a base

Mexer aqui afeta todos os pacotes de uma vez. Rode `npm run check-types` da raiz antes de
commitar — o efeito raramente é local.
