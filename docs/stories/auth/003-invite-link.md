## Cadastro via link de convite

## 📋 Descrição

Como membro convidado, quero me cadastrar através de um link enviado pelo Admin para criar minha conta e acessar a plataforma.

## 🖥️ Web — `apps/web` ⬜ não iniciado

Responsável pela tela que o convidado abre ao clicar no link: validar o token contra a
API, mostrar o formulário com o e-mail já preenchido, tratar link expirado ou usado e
levar para o dashboard depois do cadastro. **Não decide se o link é válido e não define
o perfil** — só apresenta o que a API responde.

- [ ] Rota pública `/invite/$token`, fora de `/_authed`
- [ ] Validação do token no `beforeLoad`/loader, antes de renderizar o formulário
- [ ] Estado de carregando enquanto o token é verificado
- [ ] Formulário com nome, cargo e senha (React Hook Form + Zod, mesmo padrão do login)
- [ ] E-mail vindo do link, exibido e **não editável**
- [ ] Confirmação de senha e regra de senha visível antes do submit
- [ ] Estado de carregando no botão, sem duplo submit
- [ ] Tela de erro clara e distinta para link **expirado**, **já usado** e **inválido**
- [ ] Caminho de saída na tela de erro (voltar ao login / pedir novo convite)
- [ ] Após o cadastro, redireciona para `/dashboard`
- [ ] Nenhum seletor de perfil na tela — MEMBER é decidido pelo servidor

### O que existe hoje

| Caminho | Estado |
| --- | --- |
| `routes/` | Nenhuma rota de convite ou cadastro |
| `pages/` | Nenhuma tela de cadastro |
| `pages/login/components/login-form.tsx:167` | Só o texto "Primeira vez aqui? Use o link de convite que o chefe enviou." — sem link, sem destino |
| `mocks/users.ts` | Lista fixa de 12 usuários; não há criação de usuário |

Nada desta story foi implementado. O texto no login é a única referência a convite no
app, e ele aponta para um lugar que não existe.

### A tela nem está no mockup

`docs/Mockup-KPICorp/` tem o **modal de convite do Admin** (`14-invite-modal.png`,
`src/members.jsx`) — o lado de quem *envia*, que pertence à story de Membros. A tela de
quem *recebe* o link não foi desenhada. Ou ela é desenhada antes, ou esta story define o
layout reaproveitando o que o `001` já entregou.

### Reaproveitável do `001`

| Peça | Uso aqui |
| --- | --- |
| `pages/login/components/login-brand-panel.tsx` | Mesmo painel de marca, para o cadastro parecer a mesma casa |
| Padrão de `Field` + `aria-invalid` / `data-invalid` do `login-form.tsx` | Validação e erro de campo |
| `Empty` de `@kpi-corp/ui` | Base das telas de link expirado / inválido |
| `homeRouteFor(role)` de `lib/auth.ts` | Destino após o cadastro |

## ⚙️ API — `apps/server` + `packages/api`

Responsável por gerar o convite, dizer se um token vale, criar o usuário e queimar o
convite. É a **única** fonte de verdade sobre validade, expiração e perfil.

- [ ] Modelo `Invite` no Prisma — `email`, hash do token, `expiresAt`, `usedAt`, `invitedBy`
- [ ] Migration nova (o modelo não existe no schema atual)
- [ ] Procedure `invite.create` (só Admin) gerando token de alta entropia
- [ ] Guardar **hash** do token, nunca o token em texto puro
- [ ] Procedure pública `invite.validate` devolvendo o e-mail e o estado do convite
- [ ] Procedure pública `invite.accept` — cria o `User` e queima o convite na mesma transação
- [ ] `role: MEMBER` fixado no servidor, ignorando qualquer coisa que venha do cliente
- [ ] Uso único garantido contra corrida (update condicional em `usedAt`, não read-then-write)
- [ ] Hash da senha com algoritmo lento (argon2 ou bcrypt)
- [ ] Envio do e-mail de convite
- [ ] Tratamento de e-mail já cadastrado
- [ ] Rate limit em `invite.validate` e `invite.accept`
- [ ] Sessão emitida direto após o cadastro, para o convidado não passar pelo login

### Ponto de partida

| Item | Estado |
| --- | --- |
| `User.email` `@unique`, `passwordHash`, `role`, `position`, `active` | Já no schema Prisma |
| `Role` com default `MEMBER` | Já no schema — mas o default não substitui fixar no servidor |
| Modelo `Invite` | **Não existe** — precisa de migration |
| Serviço de e-mail | **Não instalado.** `docs/stories/setup.md` cita Resend, mas não há dependência de e-mail em nenhum `package.json` |
| Emissão de sessão | Depende de `001-login.md` |

> `docs/stories/setup.md` está desatualizado em relação ao repositório: descreve NestJS,
> Redis, Prisma 6 e ESLint/Prettier. O monorepo usa Fastify + oRPC, Prisma 7 e Biome, sem
> Redis. Usar o `README.md` da raiz como referência de stack.

### Contrato esperado pelo front

Para a tela ser escrita antes da API existir:

```
invite.validate({ token })
  -> { email, status: "VALID" }
  -> erro tipado: "EXPIRED" | "USED" | "INVALID"

invite.accept({ token, name, position, password })
  -> Session (mesmo formato do login) + cookie httpOnly
  -> erro tipado: "EXPIRED" | "USED" | "INVALID" | "EMAIL_TAKEN"
```

O front precisa **distinguir** expirado de já usado (o critério pede mensagem clara),
mas token inexistente não pode vazar e-mail nenhum na resposta.

## ⚠️ Ainda em aberto

**Conflito no prazo de expiração.** O critério diz **48h**. O mockup do modal de convite
(`docs/Mockup-KPICorp/src/members.jsx:94`) diz **"Convite expira em 7 dias"**. São
números diferentes para a mesma regra e nenhum dos dois é implementação — precisa de
decisão antes de codar.

**Quem define o cargo.** O critério manda o formulário pedir cargo, mas o modal do Admin
só coleta e-mails. Se o convidado escreve o próprio cargo, o Admin perde controle sobre
o dado que aparece no ranking e na lista de membros. Alternativas: cargo no convite
(Admin define), cargo no cadastro (convidado define), ou cargo no cadastro e editável
pelo Admin depois.

**Regra de senha não definida.** Tamanho mínimo, exigência de caracteres, bloqueio de
senha vazada — nada disso está no critério, e a tela precisa mostrar a regra antes do
submit.

**Reenvio de convite.** O mockup promete "Você pode reenviar a qualquer momento". Falta
definir se o reenvio invalida o token anterior ou se os dois passam a valer.

**E-mail já cadastrado.** O que acontece quando alguém que já tem conta abre um convite
novo — erro, ou redireciona para o login?

## 📌 Informações

- Épico: Auth & Acesso
- Perfil: Membro
- Prioridade: Alta
- Fase: MVP
- Web: não iniciado — nem a tela existe no mockup
- API: não iniciado, bloqueado por `001-login.md`
- Relacionada: `001-login.md`, `004-route-protected.md`
