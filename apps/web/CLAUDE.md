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
├── lib/             # Lógica de domínio do cliente (sessão, auth, convite, adaptadores da API)
├── mocks/           # Protótipo antigo: hoje só tipos e categorias da tela + dados de testes legados
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
| `/invite/$token` | qualquer um | nenhum — o `loader` decide entre formulário e erro |
| `/_authed/*` | logado | sem sessão → `/login` |
| `/_authed/admin/*` | `ADMIN` | membro → `/dashboard` |
| `/_focus/admin/meeting` | `ADMIN` | sem sessão → `/login`; membro → `/dashboard` |
| `/_authed/dashboard`, `/_authed/ranking` | `MEMBER` | admin → rota admin equivalente |

- `_authed.tsx` é o layout autenticado: lê a sessão no `beforeLoad`, redireciona se não houver, e devolve `{ session }` no contexto. As rotas filhas leem via `Route.useRouteContext()` / `context.session` — **não** chamam `getSession()` de novo.
- `_authed.tsx` também envolve tudo no `AppShell` (sidebar + nav por perfil + botão sair).
- `_focus.tsx` é o layout de tela cheia (sem `AppShell`), usado só pelo modo reunião. Mesmo guard de sessão; o de perfil fica na rota.
- Guard de perfil fica no `beforeLoad` da rota, nunca no componente. Perfil vem sempre da sessão, nunca de escolha do usuário na tela.

## Autenticação

Sessão real contra `packages/api`. Decisão e trade-offs na
[ADR 0014](http://localhost:4000/docs/adr/0014-sessao-no-cliente).

| Arquivo | Papel |
| --- | --- |
| `lib/session-store.ts` | **Único** dono da chave `kpicorp.session` (`accessToken`, `refreshToken`, snapshot do user) |
| `lib/refresh.ts` | `createRefresher` (rotação com promise compartilhada) e `createSessionInterceptor` (retry 1×) |
| `lib/auth.ts` | `signIn`, `signOut`, `getSession`, `startSession`, `syncSessionUser`, `homeRouteFor` |
| `lib/use-revalidated-session.ts` | `auth.me` em segundo plano nos layouts `_authed` e `_focus` |
| `utils/orpc.ts` | `headers` põe o Bearer; `interceptors` registra o interceptor de sessão |

Regras que os testes (`test/auth.test.ts`, `test/refresh.test.ts`) travam:

- `getSession()` é **síncrono** e devolve `null` com storage ausente, corrompido ou no
  formato da sessão mock antiga — os guards rodam antes de qualquer render;
- e-mail inexistente e senha errada dão **a mesma** mensagem; `ACCOUNT_DEACTIVATED` tem
  mensagem própria;
- login que falha não deixa sessão para trás;
- `UNAUTHORIZED` **sem** `data.code` é token vencido: renova e repete **uma** vez. Com
  `data.code` é erro de domínio e sobe direto. Ramifique por `data.code`
  (`domainCodeOf`), nunca pela mensagem;
- refreshes simultâneos viram **um** só — o servidor revoga tudo quando um refresh
  reaparece (RN09);
- refresh recusado (4xx) limpa a sessão; erro de rede não.

**Fim de sessão tem um caminho só.** `clearStoredSession()` avisa os ouvintes; `main.tsx`
roda `queryClient.clear()` e `router.invalidate()`, e os guards redirecionam. Não navegue
para `/login` na mão depois de `signOut()`.

`startSession(response)` é o único gravador do snapshot a partir de resposta da API.
`signIn` e `acceptInvite` passam por ele.

Credenciais do seed (`npm run db:seed`): 12 usuários, todos com a senha `admin123` — um só
`ADMIN` (`admin@kpicorp.com`), o resto `MEMBER`. Lista em `packages/db/CLAUDE.md`.

Esqueci a senha: **não existe** — nem tela nem endpoint (AU01 em `docs/pendencias-api.md`). O link "esqueci" no login ainda
aponta para `/login`.

## Convite

`lib/invite.ts` consome `auth.validateInvite` (no `loader` de `/invite/$token`) e
`auth.register` (no submit). Gere um link real com `members.invite` como admin — a
resposta traz `inviteUrl`.

- só `VALID` devolve e-mail — recusa não diz para quem o link foi emitido;
- perfil e e-mail nunca vão no corpo do cadastro; o servidor fixa `MEMBER` e usa o
  e-mail do convite;
- erro do `register` vira `InvalidInviteError(status)` pelo `data.code`
  (`EMAIL_ALREADY_REGISTERED` cai em `USED`).

`mocks/users.ts` continua vivo só como elenco de `mocks/members.ts`, que nenhuma tela lê
(ver "Estado atual do app"). Não participa do login.

## Dados / API

Nada de `fetch` manual. O client tipado é `src/utils/orpc.ts`:

```tsx
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

const { data } = useQuery(orpc.auth.me.queryOptions());
```

- Tipos vêm de `@kpi-corp/api` (`AppRouterClient`) — o front importa o **tipo** do router do servidor, então mudança de contrato quebra no type check.
- URL base vem de `env.VITE_SERVER_URL` (`@kpi-corp/env/web`), sufixada com `/rpc`.
- Erros de query já caem num `toast.error` global com botão de retry, configurado no `QueryCache`. Não duplicar tratamento de erro por query sem motivo.
- Procedure nova: criar em `packages/api/src/modules/<módulo>/`, não aqui.

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
- Prioridade de cobertura: lógica de `lib/` e guards, e cada tela contra a API simulada (`vi.mock("@/utils/orpc")` com `createTanstackQueryUtils` sobre um client fake).

## Imports

- `@/*` → `apps/web/src/*`
- `@kpi-corp/ui/components/*`, `@kpi-corp/ui/lib/utils`
- `@kpi-corp/api/*`, `@kpi-corp/env/web`

Ordem de import é organizada pelo Biome (`organizeImports: on`) — não brigar com ela manualmente.

## Env

`apps/web/.env` (ignorado pelo git), a partir de `.env.example`. Só `VITE_SERVER_URL` hoje.

Variável nova **precisa** ser declarada em `packages/env/src/web.ts` (prefixo `VITE_`, validada com Zod) antes de existir — ler `import.meta.env` direto não é o padrão do projeto.

## Estado atual do app

Todas as telas falam com a API real. **Nenhuma lê mais do mock** — o que a API ainda
não entrega está em `docs/pendencias-api.md`.

| Tela | Onde | Procedures |
| --- | --- | --- |
| Login, logout, sessão | `pages/login/`, `lib/auth.ts` | `auth.login`, `logout`, `refresh`, `me` |
| Cadastro por convite | `pages/invite/` | `auth.validateInvite`, `register` |
| Painel do Admin | `pages/admin/dashboard/` | `dashboard.getAdmin`, `dashboard.getPointsSeries` |
| Membros | `pages/admin/members/` | `members.list`, `invite`, `setStatus`, `profile.getPublicProfile` |
| Banco de KPIs | `pages/admin/kpis/` | `kpis.list`, `create`, `update`, `setStatus` |
| Ranking (admin e membro) | `components/ranking/` | `ranking.get`, `profile.getPublicProfile` |
| Modo reunião | `pages/admin/meeting/` | `meetings.*`, `assignments.revoke`, `members.list`, `kpis.list` |
| Meu painel (membro) | `pages/member/dashboard.tsx` | `dashboard.getMember`, `profile.getMyProfile` |

Modo reunião: o id vai na URL (`/admin/meeting?reuniao=<id>`); sem id é a preparação.
Dados em `pages/admin/meeting/use-meeting.ts`, tipos e helpers em `lib/meetings.ts`.
`lib/meeting.ts` (singular) é o reducer do mock antigo: a tela só usa dele
`DEFAULT_MEETING_TITLE` e `formatElapsed`; o resto sobrevive pelos testes.

**Não derive dado no front.** Se a tela precisa de um número que a API não entrega, o
bloco sai da tela — com a chamada **comentada**, nunca apagando o componente — e a falta
vai para `docs/pendencias-api.md`. O front só formata
(datas, plurais, "há 2 horas").

Perfil real de membro mora em `components/member-profile/`: `ProfileSheet` (casca),
`PublicMemberProfile` (só com o id — usado no ranking) e as peças que a tela de membros
compõe com o item da lista. `components/member-detail/` é o perfil mock antigo:
nenhuma tela usa o `MemberDetail` — fica pelos testes e como referência visual —, mas
`AchievementGrid` e `CategoryBreakdown` dali são reaproveitados por `profile-activity.tsx`.

Ativar/desativar membro fica na lista (switch **Acesso**) e sempre passa pelo
`MemberStatusDialog`. A rota passa `currentUserId` da sessão para travar a própria conta.

`lib/ranking.ts` tem as duas coisas: tipos e períodos da API (`TeamRanking`,
`RANKING_PERIODS` com `quarter`, `MEMBER_RANKING_PERIODS` sem) e o mock antigo
(`rankingFor`, `overallPositionOf`, `TEAM_SIZE`), que só o `member-detail` legado e os
testes ainda leem — os painéis consomem `dashboard.getAdmin`/`getMember`. Tipos e
adaptadores da API de membros ficam em `lib/members.ts`.

A tela de KPIs busca o banco inteiro uma vez (`kpis.list` não pagina) e filtra no
cliente. `lib/kpis.ts` converte o KPI da API para o tipo `Kpi` que `KpiTile` e a tabela
já usam. Categoria da API (`PRESENCE`...) ↔ id da tela (`presenca`...) passa sempre por
`lib/categories.ts`. `lib/kpi-store.ts` (Zustand sobre `MOCK_KPIS`) não é usado por
nenhuma tela — só pelo `test/kpi-store.test.ts`; o modo reunião lê `kpis.list`.

`mocks/` não alimenta mais tela nenhuma com dado. O que as telas ainda importam de lá é
**tipo e constante**: `Kpi`, `KpiCategoryId`, `KPI_CATEGORIES`, `CATEGORY_BY_ID` (de
`mocks/kpis.ts`) e `AchievementRarity` (de `mocks/badges.ts`). Os `MOCK_*` só chegam aos
módulos legados (`kpi-store`, `activity-feed`, `member-stats`, mock de `ranking`) e aos
testes deles.

Referência visual dos mockups: `docs/Mockup-KPICorp/` (screenshots + JSX de protótipo). Stories: `docs/stories/`.
