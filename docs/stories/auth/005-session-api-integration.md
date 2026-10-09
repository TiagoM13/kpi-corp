## Integração da sessão com a API de auth

## 📋 Descrição

Como usuário, quero que o login use a autenticação real do servidor, para que minha
sessão tenha token, expiração e perfil vindos do banco — e não do mock do protótipo.

A API está pronta desde a fase de backend: `auth.login`, `auth.register`,
`auth.refresh`, `auth.logout` e `auth.me` implementados, 52 testes, validados ponta a
ponta. **Esta story é só do lado web.** Nenhuma linha de `packages/api` muda.

## 🎯 Decisões travadas

| Decisão | Escolha | Porquê |
| --- | --- | --- |
| Escopo | Sessão real completa do login; convite continua mock | `auth.register` existe, mas `validateInvite` (que decide entre formulário e erro **antes** do submit) não tem endpoint. Exigiria procedure nova em `packages/api` |
| Onde ficam os tokens | `accessToken` + `refreshToken` + snapshot do user em `localStorage`, chave `kpicorp.session` | Mantém `getSession()` síncrono — os 8 guards em `beforeLoad` não mudam de assinatura |
| Bearer | `headers` do `RPCLink`, lido do store a cada request | Um lugar só; `client`, `orpc` (tanstack-query) e chamadas diretas herdam |
| Refresh | `interceptors` do `RPCLink`, retry 1× | É onde o erro do oRPC ainda está parseado |
| `hue` do avatar | Sai da `Session`; `hueFor(seed)` em `lib/avatar.ts`, derivado no render | A API não devolve `hue`. Nada derivado é persistido, e a mesma função serve quando ranking e membros virarem API |
| `position` | `string \| null`; fallback `—` na tela | `publicUserSchema` devolve `position` anulável |

## 🖥️ Web — `apps/web` ✅ concluído

Responsável por guardar a sessão, anexar o token, renovar quando expira e tirar o
usuário quando a renovação falha. **Não valida credencial e não decide perfil** — quem
decide é o servidor, a cada request, via `protectedProcedure`.

- [x] `signIn` chama `client.auth.login` e grava a sessão devolvida
- [x] `signOut` chama `client.auth.logout` com o refresh token antes de limpar o local
- [x] `signOut` limpa o cache do TanStack Query (**resolve a pendência aberta em `002-logout.md`**)
- [x] `getSession()` continua **síncrono** e continua devolvendo `null` em storage ausente ou corrompido
- [x] Toda request autenticada leva `Authorization: Bearer <accessToken>`
- [x] `UNAUTHORIZED` sem `data.code` dispara refresh e repete a request **uma** vez
- [x] Refresh concorrente é deduplicado numa promise única
- [x] Refresh que falha limpa a sessão e manda para `/login`
- [x] Erro ramifica por `error.data.code`, nunca por mensagem
- [x] `ACCOUNT_DEACTIVATED` tem mensagem própria, distinta de credencial inválida
- [x] E-mail inexistente e senha errada continuam com a **mesma** mensagem
- [x] Boot de rota autenticada revalida o snapshot com `auth.me` sem bloquear o render
- [x] `mocks/users.ts` apagado; aviso de credenciais some da tela de login
- [x] `UserAvatar` deriva o `hue` quando não recebe um explícito
- [x] Cargo ausente renderiza `—`

### Arquivos

| Caminho | Ação | Responsabilidade |
| --- | --- | --- |
| `lib/session-store.ts` | novo | Único dono do `localStorage`. Lê, valida shape, grava, limpa |
| `lib/refresh.ts` | novo | `refreshOnce()` — rotação com promise compartilhada |
| `lib/avatar.ts` | novo | `hueFor(seed)`, extraído do `hueFromEmail` que hoje vive em `lib/invite.ts` |
| `lib/auth.ts` | reescrito | `signIn`, `signOut`, `getSession`, `startSession`, `homeRouteFor` — sem mock |
| `utils/orpc.ts` | editado | `headers` + `interceptors` no `RPCLink` |
| `components/user-avatar.tsx` | editado | `hue` vira opcional, com derivação por fallback |
| `components/app-shell.tsx` | editado | Avatar sem `hue` da sessão; cargo com fallback |
| `pages/login/components/login-form.tsx` | editado | `signIn` assíncrono; bloco de credencial mock removido |
| `lib/invite.ts` | editado | Passa a importar `hueFor`; a sessão que monta perde `hue` |
| `mocks/users.ts` | **apagado** | — |
| `test/auth.test.ts` | reescrito | Contra o client mockado |

Guards (`routes/_authed.tsx`, `routes/index.tsx`, `routes/login.tsx`,
`routes/_focus.tsx`, `routes/_authed/admin.tsx`, `_authed/dashboard.tsx`,
`_authed/ranking.tsx`, `_authed/admin/*`) **não mudam**. Esse é o ponto da decisão de
manter o snapshot: o guard segue lendo `getSession()` de forma síncrona.

### Contratos

```
Session = { userId, name, email, position: string | null, role }
StoredSession = { accessToken, refreshToken, user: Session }

getSession(): Session | null              // sincrono
signIn(email, password): Promise<Session> // lanca InvalidCredentialsError | AccountDeactivatedError
signOut(): Promise<void>                  // sempre limpa local, mesmo se a API falhar
refreshOnce(): Promise<string | null>     // token novo, ou null quando a sessao morreu
hueFor(seed: string): number
```

### Como o erro chega

| Situação | `error.code` | `error.data.code` | Reação do front |
| --- | --- | --- | --- |
| Access token expirado ou ausente | `UNAUTHORIZED` | **ausente** | Refresh + retry 1× |
| Senha errada ou e-mail inexistente | `UNAUTHORIZED` | `INVALID_CREDENTIALS` | Mensagem genérica |
| Refresh queimado ou replay | `UNAUTHORIZED` | `INVALID_REFRESH_TOKEN` | Limpa sessão, vai para `/login` |
| Conta desativada | `FORBIDDEN` | `ACCOUNT_DEACTIVATED` | Mensagem própria |

`protectedProcedure` joga `ORPCError("UNAUTHORIZED")` cru; os erros de domínio passam
por `mapDomainErrorToORPCError`, que preenche `data.code`. A ausência de `data.code` é
o sinal de "token expirado" — é ela que separa renovar de recusar.

### Fluxos

```
login
  signIn -> client.auth.login -> writeSession(access, refresh, user)
                              -> navigate(homeRouteFor(role))

request autenticada
  headers() -> Bearer <access>
    +-- ok
    +-- UNAUTHORIZED sem data.code -> refreshOnce()
                                        +-- token novo -> repete 1x
                                        +-- null       -> clearSession + /login

boot de rota autenticada
  beforeLoad -> getSession() sincrono -> renderiza JA
             -> auth.me em background -> atualiza snapshot (role/nome frescos)

logout
  client.auth.logout(refreshToken) -> clearSession -> queryClient.clear() -> /login
```

### Verificação

`src/test/auth.test.ts` reescrito contra o client mockado. Invariantes que já valiam e
**continuam** valendo:

- e-mail inexistente e senha errada com a mesma mensagem;
- login que falha não deixa sessão para trás;
- `getSession()` síncrono, `null` em storage indisponível ou corrompido.

Casos novos:

- token expirado renova e repete a request, transparente para a tela;
- dois erros `UNAUTHORIZED` simultâneos disparam **um** refresh só;
- refresh que falha limpa a sessão;
- `ACCOUNT_DEACTIVATED` não cai na mensagem de credencial inválida;
- snapshot da sessão mock antiga (`kpicorp.mock-session`) não é aceito.

### Documentação

- [ ] ADR novo — sessão no cliente: snapshot em `localStorage`, guard síncrono, refresh deduplicado
- [ ] `apps/web/CLAUDE.md` — seções "A API de auth já existe" e "Autenticação (mock)"
- [ ] `docs/modules/auth.md` — pendências
- [ ] `docs/architecture/COMPONENTS.md` — camada de sessão do front
- [ ] `CHANGELOG.md`
- [ ] `001-login.md` e `002-logout.md` — marcar o que esta story fecha

## ⚠️ Pontos de atenção

**Segurança — token em `localStorage`.** Qualquer script que rode na página lê o
`localStorage`: uma dependência comprometida consegue ler e exfiltrar os dois tokens.
Cookie `httpOnly` seria imune a isso, porque o JavaScript não alcança o valor. A
mitigação parcial aqui é a rotação: o refresh token muda a cada uso e um token reusado
revoga a sessão inteira (RN09), o que encurta a janela — mas não fecha o buraco. A
decisão é consciente e temporária, e precisa estar escrita no ADR, não só nesta story.

**Conflito com decisões já registradas.** `001-login.md` diz, com todas as letras, que
"as duas opções não são equivalentes e a story fixa cookie". A ADR 0011 registra Bearer
no corpo como "escolha do estado atual, não recomendação final". Esta story segue o
estado atual da API, então contradiz o critério escrito em `001-login.md`. Isso não se
resolve no código: ou o ADR novo assume a contradição e explica o prazo, ou a migração
para cookie entra antes. **Decidir antes de implementar.**

**Replay do refresh não é hipótese.** RN08 rotaciona a cada uso e RN09 revoga *todos* os
tokens do usuário quando um refresh já usado reaparece. Cinco queries expirando juntas
no boot, sem dedupe, mandam cinco refreshes com o mesmo token — a segunda derruba a
sessão. O `refreshOnce()` com promise compartilhada é correção, não otimização.

**Snapshot pode ficar velho.** Entre dois requests, `role` e `name` no `localStorage`
podem não refletir o banco — um usuário rebaixado a MEMBER continua vendo a navegação de
ADMIN até a próxima chamada. Não é falha de segurança: `adminProcedure` recusa no
servidor. É tela feia, e é por isso que o `auth.me` em background existe.

**Sem rate limiting.** `login`, `register` e `refresh` aceitam tentativas ilimitadas
(pendência conhecida em `docs/modules/auth.md`). O front não resolve isso e não deve
fingir que resolve.

**O convite continua mock depois desta story.** `mocks/invites.ts` e o `validateInvite`
seguem vivos. A conta criada pelo convite mock continua não existindo no banco: dá para
navegar depois do cadastro, não dá para sair e entrar de novo.

## ✅ Entregue diferente do planejado

**Convite entrou no escopo.** A decisão original deixava o convite no mock por falta de
endpoint de validação. Foi criado `auth.validateInvite` (público, não consome o token,
devolve e-mail só quando `VALID`) e o front passou a usar `auth.register`.
`mocks/invites.ts` foi apagado; `INVITE_TTL_HOURS` foi para `lib/invite.ts`.
`EMAIL_ALREADY_REGISTERED` no cadastro cai na mensagem de convite já usado.

**`mocks/users.ts` não foi apagado.** `mocks/members.ts` monta o elenco das telas mock
(ranking, membros, dashboards) a partir dele. Perdeu `MOCK_PASSWORD` e `findMockUser`;
o login não o usa mais. Sai quando essas telas consumirem a API.

**Interceptor extraído.** `createSessionInterceptor` vive em `lib/refresh.ts`, e
`utils/orpc.ts` só o registra — testável sem mockar `fetch`.

**Fim de sessão via ouvinte.** Em vez de o botão navegar, `clearStoredSession()` avisa
`main.tsx`, que limpa o cache e roda `router.invalidate()`. Logout, refresh recusado e
conta desativada passam pelo mesmo caminho.

**Dashboard do membro fica vazio com usuário real.** O `userId` agora é UUID e o mock
de membros usa `u1`…`u12`; a tela cai no estado vazio até consumir a API.

## 🚫 Fora de escopo

- Migração para cookie `httpOnly` — muda `packages/api` e `apps/server`, story própria
- Rate limiting
- Troca e recuperação de senha
- Telas que ainda consomem mock (ranking, membros, dashboards)

## 📌 Informações

- Épico: Auth & Acesso
- Perfil: Admin / Membro
- Prioridade: Alta
- Fase: MVP
- Web: concluído — escopo ampliado com o convite real (ver "Entregue diferente do planejado")
- API: `auth.validateInvite` adicionado para o convite real
- Relacionadas: `001-login.md`, `002-logout.md`, `004-route-protected.md`
