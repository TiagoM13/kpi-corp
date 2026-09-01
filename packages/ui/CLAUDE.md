# packages/ui

Primitives shadcn/ui sobre **Base UI** (não Radix), compartilhados pelos apps React.
Design tokens e CSS global do projeto.

Este arquivo cobre **apenas** `packages/ui`.

## Não é biblioteca de componentes de tela

Aqui moram **primitives** — `button`, `input`, `dialog`, `table`. Componente que conhece
o domínio do KPICorp (card de KPI, board de ranking, app shell) pertence a
`apps/web/src/components/`.

Regra prática: se o componente importa mock, lib de domínio ou rota, não é primitive.

## Adicionar primitive

Da **raiz** do monorepo:

```bash
npx shadcn@latest add accordion popover -c packages/ui
```

O `-c packages/ui` é o que faz o CLI usar `packages/ui/components.json` e escrever no
lugar certo. Sem isso vai para `apps/web`.

Bloco específico de um app: rodar o CLI de dentro de `apps/web`.

## Importar

```tsx
import { Button } from "@kpi-corp/ui/components/button";
import { cn } from "@kpi-corp/ui/lib/utils";
```

| Export | Aponta para |
| --- | --- |
| `@kpi-corp/ui/components/*` | `src/components/*.tsx` |
| `@kpi-corp/ui/lib/*` | `src/lib/*.ts` |
| `@kpi-corp/ui/hooks/*` | `src/hooks/*.ts` |
| `@kpi-corp/ui/globals.css` | `src/styles/globals.css` |

**Nunca copiar primitive para dentro de `apps/web`.** Divergiu do upstream? A decisão de
divergir vira ADR — ver
[ADR 0007](http://localhost:4000/docs/adr/0007-primitives-divergentes).

## Estilo e tokens

- **TailwindCSS v4, sem `tailwind.config`** — a configuração é o próprio CSS, em
  `src/styles/globals.css`. Procurar arquivo de config é perda de tempo.
- `apps/web/src/index.css` só faz importar esse globals.
- Tema **dark-only** derivado do mockup —
  [ADR 0005](http://localhost:4000/docs/adr/0005-tema-dark-only).
- Valor arbitrário de Tailwind (`w-[327px]`) é exceção, não padrão. Use token do tema; se
  o token não existe, crie no globals.
- Classes são ordenadas automaticamente pelo Biome (`useSortedClasses`, com `clsx`,
  `cva` e `cn`).

## Base UI, não Radix

`@base-ui/react`. A API é parecida com a do Radix mas **não é igual** — exemplo de shadcn
copiado da web costuma assumir Radix e quebra. Confira a assinatura contra um primitive
que já existe aqui antes de colar.

## Sem testes

Não há teste neste pacote e não há script `test`. Cobertura de UI mora em `apps/web`,
onde o componente é usado com contexto de verdade.
