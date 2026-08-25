# apps/web

Frontend do KPICorp. Vite + React 19 + TanStack Router (file-based). Roda em `http://localhost:3001`.

Este arquivo cobre **apenas** `apps/web`. Setup geral do monorepo, banco e scripts de raiz estão no `README.md` da raiz.

## Comandos

Da raiz (preferir, por causa do Turborepo):

```bash
npm run dev:web          # sobe só o web
npm run check-types      # type check de todos os pacotes
npm run test             # testes de todos os pacotes
```

De dentro de `apps/web`:

```bash
npm run dev              # vite dev (:3001)
npm run build            # vite build
npm run serve            # preview do build
npm run test             # vitest run
npm run test:watch       # vitest em watch
npm run check-types      # vite build && tsc --noEmit
```

Lint/format é Biome, sempre da raiz: `npm run lint` (leitura) / `npm run check` (com `--write`).

## Estrutura

```
apps/web/src/
├── routes/          # SÓ rotas — TanStack Router file-based, gera routeTree.gen.ts
├── pages/           # As telas de verdade (componentes de página)
├── components/      # Componentes compartilhados deste app
├── lib/             # Lógica de domínio do cliente (auth mock)
├── mocks/           # Dados fake enquanto a API não existe
├── utils/orpc.ts    # Client oRPC tipado + QueryClient
├── test/            # setup do Vitest + testes
├── index.css        # só importa @kpi-corp/ui/globals.css
└── main.tsx         # createRouter + RouterProvider
```

### Regra principal: `routes/` ≠ `pages/`

Arquivo em `routes/` só declara `createFileRoute` (guards, loaders, `component`). O JSX da tela mora em `pages/`.

```tsx
// routes/_authed/admin/kpis.tsx — só o roteamento
export const Route = createFileRoute("/_authed/admin/kpis")({
  component: AdminKpisPage,
});
```

Motivo: a tela fica testável e reaproveitável sem depender do router, e o `routes/` continua legível como mapa da aplicação.

`src/routeTree.gen.ts` é **gerado** pelo plugin `@tanstack/router-plugin` (rodando dentro do `vite.config.ts`). Nunca editar à mão — está no ignore do Biome.

## Roteamento e proteção

Árvore atual:

| Rota | Quem acessa | Redireciona |
| --- | --- | --- |
| `/` | qualquer um | `homeRouteFor(role)` ou `/login` |
| `/login` | anônimo | já logado → home do perfil |
| `/_authed/*` | logado | sem sessão → `/login` |
| `/_authed/admin/*` | `ADMIN` | membro → `/dashboard` |
| `/_authed/dashboard`, `/_authed/ranking` | `MEMBER` | admin → rota admin equivalente |

- `_authed.tsx` é o layout autenticado: lê a sessão no `beforeLoad`, redireciona se não houver, e devolve `{ session }` no contexto. As rotas filhas leem via `Route.useRouteContext()` / `context.session` — **não** chamam `getSession()` de novo.
- `_authed.tsx` também envolve tudo no `AppShell` (sidebar + nav por perfil + botão sair).
- Guard de perfil fica no `beforeLoad` da rota, nunca no componente. Perfil vem sempre da sessão, nunca de escolha do usuário na tela.

## Autenticação (mock — temporário)

`src/lib/auth.ts` + `src/mocks/users.ts`. Sessão fake em `localStorage` (chave `kpicorp.mock-session`), senha única em texto puro (`kpicorp123`), sem token, sem expiração, sem API.

Existe só para o protótipo navegar. Sai quando `auth.login` existir em `packages/api` — a substituição prevista é cookie httpOnly.

Invariantes que os testes (`src/test/auth.test.ts`) travam e que devem continuar valendo:

- e-mail inexistente e senha errada retornam **a mesma** mensagem (não revela quais e-mails existem);
- login que falha não deixa sessão para trás;
- `getSession()` é síncrono (os guards rodam antes de qualquer render) e devolve `null` em vez de explodir quando o `localStorage` está indisponível ou corrompido.

Ao trocar pelo backend real: mexer em `lib/auth.ts` e nas rotas, e apagar `mocks/users.ts`.

## Dados / API

Nada de `fetch` manual. O client tipado é `src/utils/orpc.ts`:

```tsx
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

const { data } = useQuery(orpc.todo.getAll.queryOptions());
```

- Tipos vêm de `@kpi-corp/api` (`AppRouterClient`) — o front importa o **tipo** do router do servidor, então mudança de contrato quebra no type check.
- URL base vem de `env.VITE_SERVER_URL` (`@kpi-corp/env/web`), sufixada com `/rpc`.
- Erros de query já caem num `toast.error` global com botão de retry, configurado no `QueryCache`. Não duplicar tratamento de erro por query sem motivo.
- Procedure nova: criar em `packages/api/src/routers/`, não aqui.

## UI e estilo

- Primitives compartilhados vêm de `@kpi-corp/ui/components/*` (shadcn sobre Base UI). Não copiar primitive para dentro de `apps/web`.
- Tokens e CSS global: `packages/ui/src/styles/globals.css`, importado por `src/index.css`.
- Tailwind v4 via `@tailwindcss/vite` — sem `tailwind.config`; a config é o CSS.
- Ícones: `lucide-react`. Tema: `next-themes` (`ThemeProvider` no `__root.tsx`, default `dark`, storageKey `vite-ui-theme`).
- Toasts: `sonner`, com o `<Toaster richColors />` já montado no root.

Adicionar primitive compartilhado (da raiz):

```bash
npx shadcn@latest add dialog table -c packages/ui
```

Bloco específico do web: rodar o CLI de dentro de `apps/web` (usa `apps/web/components.json`, alias `@/components`).

Classes Tailwind são ordenadas automaticamente pelo Biome (`useSortedClasses`, funções `clsx`/`cva`/`cn`).

## Testes

Vitest + Testing Library + jsdom. Config **standalone** em `vitest.config.ts` — não faz `mergeConfig` com `vite.config.ts` de propósito (o motivo está comentado no arquivo: evita o warning do config loader do Vite e o TS5097 do tsc).

- Arquivos: `src/**/*.{test,spec}.{ts,tsx}`.
- Setup: `src/test/setup.ts` (jest-dom + `cleanup()` após cada teste).
- `globals: true` — `describe`/`it`/`expect` sem import é permitido, mas o código atual importa explicitamente. Seguir o que já existe.
- Prioridade de cobertura: lógica de `lib/` e guards. Placeholder de tela não precisa de teste.

## Imports

- `@/*` → `apps/web/src/*`
- `@kpi-corp/ui/components/*`, `@kpi-corp/ui/lib/utils`
- `@kpi-corp/api/*`, `@kpi-corp/env/web`

Ordem de import é organizada pelo Biome (`organizeImports: on`) — não brigar com ela manualmente.

## Env

`apps/web/.env` (ignorado pelo git), a partir de `.env.example`. Só `VITE_SERVER_URL` hoje.

Variável nova **precisa** ser declarada em `packages/env/src/web.ts` (prefixo `VITE_`, validada com Zod) antes de existir — ler `import.meta.env` direto não é o padrão do projeto.

## Estado atual do app

A maior parte das telas ainda é `PagePlaceholder` (`src/components/page-placeholder.tsx`). Navegação, layout e guards funcionam; o conteúdo entra story a story.

Implementado de verdade: login (`src/pages/login/`), `AppShell`, sessão mock.
Placeholder: dashboards, KPIs, membros, ranking, modo reunião.

Referência visual dos mockups: `docs/Mockup-KPICorp/` (screenshots + JSX de protótipo). Stories: `docs/stories/`.
