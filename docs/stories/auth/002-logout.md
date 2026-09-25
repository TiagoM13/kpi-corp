## Logout

## 📋 Descrição

Como usuário, quero fazer logout para encerrar minha sessão com segurança.

## 🖥️ Web — `apps/web` ✅ concluído

Responsável por oferecer a saída em qualquer tela autenticada, limpar o estado local e
tirar o usuário da área protegida. **Não invalida token** — hoje não existe token para
invalidar, e quando existir quem revoga é a API.

- [x] Botão de logout acessível em qualquer tela autenticada
- [x] Rótulo acessível (`aria-label="Sair"` + `title`) em botão só de ícone
- [x] Redireciona para `/login` após sair
- [x] Limpa a sessão do `localStorage`
- [x] `/login` não devolve o usuário para dentro depois do logout
- [x] Rota protegida acessada após o logout manda para `/login`
- [x] `signOut()` não quebra com `localStorage` indisponível
- [x] Limpar o cache do TanStack Query no logout — fechado pela story 005

### Estrutura entregue

| Caminho | Responsabilidade |
| --- | --- |
| `components/app-shell.tsx` | Botão "Sair" no rodapé da sidebar — `signOut()` + `navigate({ to: "/login" })` |
| `lib/auth.ts` | `signOut()` remove a chave `kpicorp.mock-session` do `localStorage` |
| `routes/_authed.tsx` | Monta o `AppShell`, então o botão existe em **toda** rota autenticada |
| `routes/login.tsx` | Sem sessão, renderiza o login normalmente |

### Fluxo atual

```
clique em "Sair"
  └─ signOut()                    remove kpicorp.mock-session
  └─ navigate({ to: "/login" })
       └─ /login beforeLoad → getSession() === null → renderiza o login

voltar no navegador para /dashboard
  └─ /_authed beforeLoad → getSession() === null → redirect /login
```

O botão fica junto do bloco de identidade do usuário na sidebar — mesma posição do
mockup. Como é ícone puro, tem `aria-label` e `title`.

### Verificação

`src/test/auth.test.ts` cobre o lado de estado: `signOut()` apaga a sessão
(`getSession()` volta `null`) e `getSession()` devolve `null` em vez de lançar quando o
storage está corrompido. Suíte do web: **9 testes passando**.

Não há teste de interação do botão (renderizar o `AppShell`, clicar em "Sair", conferir
a navegação). O guard de `_authed` já garante o efeito, então a lacuna é de regressão de
UI, não de comportamento.

### Resolvido: cache do TanStack Query

Fechado pela story `005-session-api-integration.md`: `clearStoredSession()` avisa
`main.tsx`, que roda `queryClient.clear()` e `router.invalidate()`. O texto abaixo é o
registro da pendência original.

`signOut()` limpa o `localStorage`, mas o `queryClient` é um singleton criado em
`utils/orpc.ts` e **nunca** recebe `.clear()`. Hoje é inofensivo — todas as telas são
cascas e nenhuma query carrega dado de usuário. Vira vazamento no primeiro dashboard
real: sai um usuário, entra outro na mesma aba, e o cache antigo aparece antes do
refetch.

Correção prevista quando a primeira tela com dados existir:

```ts
// no handler do botão, depois de signOut()
queryClient.clear();
```

## ⚙️ API — `apps/server` + `packages/api` ⚠️ parcial

Responsável por revogar a sessão do lado do servidor e derrubar o cookie. É o único
lado que consegue tornar um token inutilizável.

- [x] Procedure `auth.logout` que encerra a sessão corrente
- [ ] Limpa o cookie `httpOnly` (`Set-Cookie` com `Max-Age=0` e os mesmos atributos da emissão)
- [x] Revogação real do token — sessão persistida em banco (`refresh_token.revokedAt`)
- [ ] Requisição posterior com o token antigo é recusada
- [x] Idempotente: logout sem sessão válida responde sucesso, não erro
- [ ] Decidir e implementar "sair de todos os dispositivos"

**O access token sobrevive ao logout.** `auth.logout` revoga o refresh token; o access
token continua válido até expirar, no máximo 15 minutos. É o custo do JWT stateless sem
denylist — e é por isso que "requisição posterior com o token antigo é recusada" segue
desmarcado. Revogação instantânea exigiria checar o banco a cada request, que é
exatamente o que a
[ADR 0011](http://localhost:4000/docs/adr/0011-jwt-refresh-token-rotativo) decidiu não
fazer.

Revogar **todos** os tokens do usuário já acontece, mas só como reação a replay de
refresh token — não como ação que o usuário possa pedir.

### Ponto de partida

| Item | Estado |
| --- | --- |
| `createContext` resolvendo `context.auth` a partir do `Bearer` | Implementado |
| CORS com `credentials: true` | Já configurado — necessário para apagar o cookie |
| Emissão de token | Implementada — no corpo da resposta, não em cookie |
| Modelo de sessão no Prisma | `refresh_token`, com `tokenHash` e `revokedAt` |

### O que o front espera da API

Contrato que o mock já assume:

```
signOut() -> void, sincrono, nunca lanca
```

Trocar por `await auth.logout()` muda a natureza da chamada: passa a ser assíncrona e
pode falhar. **Decisão fixada aqui:** o estado local é limpo e a navegação acontece
mesmo se a chamada falhar. Deixar o usuário preso numa sessão que ele mandou encerrar é
pior que uma revogação que não confirmou.

## ⚠️ Dívidas do mock

**Não há nada para invalidar.** A sessão é um JSON no `localStorage`. `signOut()` apaga
esse JSON e acabou — nenhum servidor sabe que alguém saiu. O critério "token invalidado
no backend" fica integralmente para a API.

**Outras abas continuam logadas.** Não há listener de `storage`. Sair na aba A não
derruba a aba B: ela só percebe no próximo `beforeLoad`, ou seja, na próxima navegação
ou recarga. Com cookie `httpOnly` isso melhora sozinho (a próxima requisição falha),
mas a navegação client-side ainda vai precisar reagir ao 401.

## ⚠️ Ainda em aberto

**Escopo do logout.** Encerra só a sessão do dispositivo atual ou todas? O critério não
diz, e a escolha define o modelo de persistência da sessão na API.

**Confirmação antes de sair.** Hoje o clique sai direto, sem diálogo. Não está no
critério; se for desejado, é mudança de UI nesta story.

## 📌 Informações

- Épico: Auth & Acesso
- Perfil: Admin / Membro
- Prioridade: Alta
- Fase: MVP
- Web: concluído — `auth.logout` real e cache limpo (story 005)
- API: implementada — `auth.logout` revoga o refresh token
- Relacionada: `001-login.md`, `004-route-protected.md`
