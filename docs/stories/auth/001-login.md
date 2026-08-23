## Login de usuário

## 📋 Descrição

Como usuário, quero fazer login com e-mail e senha para acessar a plataforma com meu perfil correto.

## 🖥️ Web — `apps/web` ✅ concluído

Responsável pela tela, pela validação de formato antes de chamar a API, pelos estados
visuais e pelo redirecionamento após a resposta. **Não decide perfil e não valida
credencial** — só reage ao que a autenticação devolve.

- [x] Tela de login com layout do mockup (painel de marca + formulário)
- [x] Componentizada em `pages/login/` com rota fina em `routes/login.tsx`
- [x] Campos de e-mail e senha obrigatórios, com validação de formato no cliente
- [x] Inputs controlados por React Hook Form + Zod, com `aria-invalid` e `data-invalid` no `Field`
- [x] Estado de carregando no botão durante a chamada (desabilitado, sem duplo submit)
- [x] Mensagem de erro para credencial inválida — genérica, sem dizer se o e-mail existe
- [x] Redireciona Admin para a área `/admin`
- [x] Redireciona Membro para `/dashboard`
- [x] Guarda de rota: sessão ausente em rota protegida manda para `/login`
- [x] Sessão presente em `/login` manda para o dashboard do perfil
- [x] Perfil vem do cadastro do usuário, nunca de escolha na tela
- [x] Telas de destino navegáveis (cascas, sem dados)

### Estrutura entregue

| Caminho | Responsabilidade |
| --- | --- |
| `pages/login/` | Tela de login, componentizada |
| `pages/admin/*` | 5 cascas: painel, KPIs, membros, ranking, reunião |
| `pages/member/*` | 2 cascas: meu painel, ranking |
| `components/app-shell.tsx` | Sidebar com navegação por perfil + área principal |
| `components/user-avatar.tsx` | Avatar com gradiente `oklch` derivado do `hue` |
| `components/page-placeholder.tsx` | Casca reaproveitada pelas 7 telas |
| `lib/auth.ts` | Sessão mock: `signIn`, `signOut`, `getSession`, `homeRouteFor` |
| `mocks/users.ts` | 12 usuários — 2 ADMIN, 10 MEMBER |

### Rotas

```
/                      redireciona conforme a sessão
/login                 público; logado é mandado embora

/_authed               guarda: sem sessão → /login; renderiza o shell
├── /dashboard         MEMBER  (ADMIN é mandado para /admin)
├── /ranking           MEMBER  (ADMIN é mandado para /admin/ranking)
└── /_authed/admin     guarda: role !== ADMIN → /dashboard
    ├── /admin
    ├── /admin/kpis
    ├── /admin/members
    ├── /admin/ranking
    └── /admin/meeting
```

Admin usa a área `/admin/*`. Membro usa as rotas normais. Quem entrar na área do
outro perfil é redirecionado — o guard não depende da navegação estar escondida.

### Navegação por perfil

| Admin | Membro |
| --- | --- |
| Painel · Modo reunião · Banco de KPIs · Membros · Ranking | Meu painel · Ranking |

### Verificação

`src/test/auth.test.ts` — 8 testes cobrindo: perfil vindo do cadastro, e-mail com
espaço e caixa diferente, senha errada, mensagem idêntica para e-mail inexistente e
senha errada, sessão não criada quando falha, persistência, storage corrompido, e a
rota inicial de cada perfil.

## ⚙️ API — `apps/server` + `packages/api`

Responsável por validar credencial, decidir o perfil, emitir e revogar sessão.
É a **única** fonte de verdade sobre quem o usuário é.

- [ ] Procedure `auth.login` recebendo `{ email, password }` validados por Zod
- [ ] Verificação da senha contra `User.passwordHash` com algoritmo de hash lento (argon2 ou bcrypt)
- [ ] Rejeita usuário com `active: false`
- [ ] Erro genérico e tempo de resposta constante para e-mail inexistente e senha errada
- [ ] Emite JWT contendo `sub` e `role`, lido de `User.role` no banco
- [ ] Entrega o token em cookie `httpOnly` + `Secure` + `SameSite`
- [ ] Expiração por inatividade definida, com renovação a cada requisição válida
- [ ] Procedure `auth.me` devolvendo o usuário da sessão corrente
- [ ] `createContext` passa a resolver a sessão a partir do cookie
- [ ] Procedure protegida (`protectedProcedure`) que recusa requisição sem sessão válida
- [ ] Limite de tentativas por e-mail e por IP

### Ponto de partida

| Item | Estado |
| --- | --- |
| `User.email` `@unique`, `passwordHash`, `role`, `active` | Já no schema Prisma |
| `enum Role { ADMIN, MEMBER }` | Já no schema |
| `createContext` devolvendo `{ auth: null, session: null }` | Gancho pronto, sem implementação |
| CORS com `credentials: true` | Já configurado — necessário para cookie |

### O que o front espera da API

O contrato que o mock já assume, para a troca ser localizada:

```
signIn(email, password) -> Session { userId, name, email, position, role, hue }
                        -> lanca InvalidCredentialsError em credencial invalida
getSession()            -> Session | null
signOut()               -> void
```

Trocar `lib/auth.ts` por chamadas a `auth.login` / `auth.me` / `auth.logout` não deve
exigir mudança nas telas nem nos guards.

## ⚠️ Dívidas do mock

**A sessão mock vive em `localStorage`, e isso não vale para produção.** É sessão
falsa de protótipo: não há token, não há assinatura, não há expiração. Qualquer
pessoa edita `kpicorp.mock-session` no DevTools e vira ADMIN. Só serve porque não
existe backend nem dado real.

O token real **não** pode seguir esse caminho — vai em cookie `httpOnly`, que
JavaScript não lê, então um XSS não sequestra a sessão. O critério original dizia
"httpOnly cookie ou localStorage"; as duas opções não são equivalentes e a story
fixa cookie.

**Senha única em texto puro** (`kpicorp123`) em `mocks/users.ts`, e um aviso na tela
de login mostrando as credenciais. Ambos saem junto com o mock.

**Nenhum controle de perfil sobrou na tela.** O toggle Chefe / Membro do mockup foi
removido: deixar o usuário declarar que é Admin é escalação de privilégio. O perfil
vem de `MOCK_USERS[].role` hoje e virá de `User.role` depois.

## ⚠️ Ainda em aberto

**Falta definir o tempo de inatividade.** "Sessão expira após inatividade definida"
não diz quanto. Sem esse número não dá para implementar nem testar — e nada disso
existe no mock.

**As telas de destino são cascas.** Navegação funciona, conteúdo não existe. Cada
uma tem story própria.

## 📌 Informações

- Épico: Auth & Acesso
- Perfil: Admin / Membro
- Prioridade: Alta
- Fase: MVP
- Web: concluído com sessão mock
- API: não iniciado
- Relacionada: `004-route-protected.md`
