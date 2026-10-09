## Cadastro via link de convite

## 📋 Descrição

Como membro convidado, quero me cadastrar através de um link enviado pelo Admin para criar minha conta e acessar a plataforma.

## 🖥️ Web — `apps/web` ✅ concluído

Responsável pela tela que o convidado abre ao clicar no link: validar o token contra a
camada de dados, mostrar o formulário com o e-mail já preenchido, tratar link expirado ou
usado e levar para o dashboard depois do cadastro. **Não decide se o link é válido e não
define o perfil** — só apresenta o que a validação responde.

- [x] Rota pública `/invite/$token`, fora de `_authed`
- [x] Validação do token no `loader`, antes de renderizar o formulário
- [x] Estado de carregando enquanto o token é verificado
- [x] Formulário com nome, cargo, senha e confirmação (React Hook Form + Zod)
- [x] E-mail vindo do convite, exibido e não editável
- [x] Regra de senha visível antes do submit — mínimo 8 caracteres
- [x] Erro de confirmação apontado no campo da confirmação, não no da senha
- [x] Estado de carregando no botão, sem duplo submit
- [x] Tela de erro distinta para link **expirado**, **já usado** e **inválido**
- [x] Caminho de saída na tela de erro (voltar para o login)
- [x] Após o cadastro, redireciona para `/dashboard`
- [x] Nenhum seletor de perfil na tela — `MEMBER` é fixado fora do formulário
- [x] Recusa não revela e-mail: só o token válido devolve para quem o link foi emitido

### Decisões tomadas nesta story

| Ponto | Decisão |
| --- | --- |
| Prazo de expiração (story dizia 48h, mockup dizia 7 dias) | **48h** — é o critério de aceite escrito, e janela curta é mais segura para convite |
| Quem define o cargo | **O convidado**, no cadastro. Admin corrige depois na tela de Membros |
| Regra de senha | **Mínimo 8 caracteres + confirmação**, regra exibida antes do submit |
| Como simular sem API | `lib/invite.ts` + `mocks/invites.ts`, espelhando `lib/auth.ts` + `mocks/users.ts` |

O texto "Convite expira em 7 dias" no modal do Admin
(`docs/Mockup-KPICorp/src/members.jsx:94`) contradiz as 48h e precisa ser corrigido
quando a story de Membros for implementada.

### Estrutura entregue

| Caminho | Responsabilidade |
| --- | --- |
| `routes/invite.$token.tsx` | Rota fina: `loader` chama `validateInvite`, componente repassa |
| `pages/invite/index.tsx` | Escolhe entre formulário e tela de erro conforme o status |
| `pages/invite/components/invite-form.tsx` | Formulário + `inviteSchema` exportado |
| `pages/invite/components/invite-error.tsx` | `Empty` com título, motivo e volta ao login |
| `lib/invite.ts` | `validateInvite`, `acceptInvite`, `INVITE_ERROR`, `InvalidInviteError` |
| `mocks/invites.ts` | 3 tokens fixos, um por estado; `INVITE_TTL_HOURS = 48` |

Reaproveita `BrandPanel` no painel esquerdo e o padrão de `Field` + `aria-invalid`
do `login-form.tsx` — o cadastro é a mesma casa que o login.

### Alteração em código existente

`lib/auth.ts` gravava a sessão dentro de `signIn`, junto da checagem de credencial.
Extraído `startSession(session)`, agora usado pelos dois caminhos. Sem isso o aceite de
convite teria que escrever a chave `kpicorp.mock-session` por fora, duplicando o segredo
em dois arquivos.

### Contrato de `lib/invite.ts`

Mesmo formato que a API vai devolver, para a troca ser um arquivo só:

```ts
validateInvite(token) -> { status: "VALID", email }
                      -> { status: "EXPIRED" | "USED" | "INVALID" }

acceptInvite({ token, name, position, password }) -> Session
                      -> lanca InvalidInviteError, com `status` do motivo
```

Só o convite válido carrega e-mail. Quem tenta um token qualquer não descobre e-mails do
time.

### Como testar na mão

```
http://localhost:3001/invite/convite-valido      formulario de cadastro
http://localhost:3001/invite/convite-expirado    link expirado
http://localhost:3001/invite/convite-usado       link ja usado
http://localhost:3001/invite/qualquer-coisa      link invalido
```

Aceitar `convite-valido` queima o token: recarregar a mesma URL mostra "já foi usado".
Limpar o `localStorage` devolve o convite ao estado inicial.

### Verificação

`src/test/invite.test.ts` — 11 testes: os 4 estados de `validateInvite`, recusa sem
vazar e-mail, sessão `MEMBER` criada com o e-mail do convite, sessão recuperável por
`getSession()`, convite queimado no aceite, recusa de token expirado/usado/inexistente,
nenhuma sessão deixada para trás quando recusa, e o motivo da recusa exposto para a tela.

`src/test/invite-ui.test.tsx` — 8 testes: título e motivo de cada estado de erro, volta
ao login, e o `inviteSchema` (cadastro completo, senha curta, confirmação divergente
apontada no próprio campo, nome e cargo obrigatórios).

Suíte do web: **28 testes passando**. `tsc --noEmit` e `biome check` limpos.

## ⚙️ API — `apps/server` + `packages/api` ⚠️ parcial

Responsável por gerar o convite, dizer se um token vale, criar o usuário e queimar o
convite. É a **única** fonte de verdade sobre validade, expiração e perfil.

- [x] Modelo `Invitation` no Prisma — `email`, `token`, `expiresAt`, `usedAt`
- [x] Migration nova — `20260831110915_add_invitation`
- [x] Procedure de criação (só Admin) gerando token de alta entropia — `members.invite`
- [x] Guardar **hash** do token, nunca o token em texto puro — `invitation.tokenHash`
- [x] Procedure pública que valide o token devolvendo o e-mail e o estado do convite — `auth.validateInvite`
- [x] Procedure pública que cria o `User` e queima o convite na mesma transação — `auth.register`
- [x] `role: MEMBER` fixado no servidor, ignorando qualquer coisa que venha do cliente
- [x] Uso único garantido contra corrida — `updateMany` guardado por `usedAt IS NULL` dentro da transação
- [x] Hash da senha com algoritmo lento (bcrypt)
- [x] Expiração de 48h aplicada no servidor — `INVITE_TTL_HOURS = 48`
- [ ] Envio do e-mail de convite
- [x] Tratamento de e-mail já cadastrado — `EMAIL_ALREADY_REGISTERED`
- [ ] Rate limit
- [x] Sessão emitida direto após o cadastro, para o convidado não passar pelo login

Duas diferenças de nomenclatura em relação ao critério original: o modelo é `Invitation`,
não `Invite`, e a emissão vive em `members.invite` (`POST /members/invitations`), não num
módulo `invite` próprio — convidar é operação de gestão de membros.

### ⚠️ O token do convite está em texto puro no banco

`invitation.token` guarda o valor que vai no link, sem hash:

```prisma
token String @unique
```

Refresh token é guardado como SHA-256
([ADR 0012](http://localhost:4000/docs/adr/0012-hash-de-senha-e-de-token)); o token de
convite não seguiu a mesma regra. Consequência: quem tiver leitura do banco — um dump, um
backup, um log de query — consegue usar qualquer convite pendente e criar uma conta com o
e-mail daquele convite.

A correção é a mesma da tabela `refresh_token`: guardar o hash, comparar por hash na
validação, e o token em texto puro existir só na resposta que monta o `inviteUrl`. Como
a coluna é `@unique` e a busca é por igualdade exata, a troca não muda a query — só o
que entra nela.

### Falta o endpoint que valida o token

`auth.register` **consome** o convite, mas nada responde "esse token vale?" antes do
formulário. A tela `/invite/$token` precisa dessa resposta para decidir entre mostrar o
cadastro ou a mensagem de erro, e é por isso que `validateInvite` continua no mock mesmo
com o resto da API pronta. Ver `005-session-api-integration.md`.

### Ponto de partida

| Item | Estado |
| --- | --- |
| `User.email` `@unique`, `passwordHash`, `role`, `position`, `active` | Já no schema Prisma |
| `Role` com default `MEMBER` | Já no schema — mas o default não substitui fixar no servidor |
| Modelo `Invitation` | Implementado |
| Serviço de e-mail | **Não instalado.** `docs/stories/setup.md` cita Resend, mas não há dependência de e-mail em nenhum `package.json` |
| Emissão de sessão | Implementada — `auth.register` já devolve o par de tokens |

> `docs/stories/setup.md` está desatualizado em relação ao repositório: descreve NestJS,
> Redis, Prisma 6 e ESLint/Prettier. O monorepo usa Fastify + oRPC, Prisma 7 e Biome, sem
> Redis. Usar o `README.md` da raiz como referência de stack.

## ⚠️ Dívidas do mock

**Nada é verificado de verdade.** O token não é assinado, a expiração é comparada com o
relógio do navegador e a lista de convites é um array no bundle. Qualquer pessoa lê
`mocks/invites.ts` no DevTools e conhece os três tokens.

**A conta criada não existe depois.** `acceptInvite` cria a sessão, mas não entra em
`MOCK_USERS`. Sair e tentar entrar pelo login com esse e-mail falha — não há onde
persistir usuário sem servidor. Só some quando `invite.accept` gravar no banco.

**A senha não vai a lugar nenhum.** O formulário valida e descarta: sem servidor, não há
onde guardar hash.

**Convite queimado só nesta máquina.** O aceite grava o token em
`kpicorp.mock-invites-used` no `localStorage`. Outro navegador vê o mesmo convite como
novo.

**A tela não veio do mockup.** O `docs/Mockup-KPICorp/` só desenhou o modal de convite do
Admin (`14-invite-modal.png`) — o lado de quem envia. O layout desta tela foi montado a
partir do login, para manter a mesma linguagem visual.

## ⚠️ Ainda em aberto

**Reenvio de convite.** O mockup promete "Você pode reenviar a qualquer momento". Falta
definir se o reenvio invalida o token anterior ou se os dois passam a valer.

**E-mail já cadastrado.** O que acontece quando alguém que já tem conta abre um convite
novo — erro, ou redireciona para o login? O mock não trata; a API precisa decidir.

**Abrir o convite já logado.** Hoje a tela aparece normalmente e aceitar substitui a
sessão corrente. É o comportamento certo para máquina compartilhada, mas convém confirmar
quando houver sessão real em cookie.

## 📌 Informações

- Épico: Auth & Acesso
- Perfil: Membro
- Prioridade: Alta
- Fase: MVP
- Web: concluído — `auth.validateInvite` + `auth.register` reais (story 005)
- API: implementada — `auth.register` e `members.invite`; falta validar token antes do cadastro
- Relacionada: `001-login.md`, `004-route-protected.md`
