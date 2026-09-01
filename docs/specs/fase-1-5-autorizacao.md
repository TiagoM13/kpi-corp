# Spec — 1.5 Autorização

**Fase:** 1 · **Status:** proposta, aguardando validação · **Data:** 2026-09-01

Referência: [MVP_API_ROADMAP.md § 1.5](../MVP_API_ROADMAP.md)

---

## Objetivo

Fazer a autorização por papel deixar de ser código não exercitado e virar
comportamento provado.

Hoje `adminProcedure` existe em `packages/api/src/index.ts` e **nunca foi aplicada a
nenhuma rota**. Nenhum teste cobre 401 por falta de token nem 403 por papel errado.
1.5 não é escrever a autorização — é aplicá-la e travá-la com teste.

## O que já existe

| Peça | Situação |
| --- | --- |
| `Role` (`ADMIN`, `MEMBER`) no schema | pronto |
| `createContext` lê o Bearer e monta `context.auth` | pronto |
| `publicProcedure` | em uso |
| `protectedProcedure` | em uso só em `auth.me` |
| `adminProcedure` | **definida, nunca aplicada** |
| Teste de autorização | **não existe** |

## Decisão de arquitetura

**Autorização no nível da rota, via procedure.** Sem camada de policy, sem checagem
de posse por recurso.

```ts
listMembers: adminProcedure  // 401 sem token, 403 se MEMBER
  .route({ method: "GET" })
  .output(listMembersResponseSchema)
  .handler(({ input }) => handle(() => membersService.list(input)))
```

Descartadas:

- **Helper de posse (`assertSelfOrAdmin`)** — permitiria `GET /members/:id` responder
  também ao próprio membro. Nenhuma tela pede isso: o membro lê os próprios dados por
  `/auth/me` e, na Fase 2, por `/me/*`. Código sem consumidor.
- **Camada de policy (`can(user, action, resource)`)** — abstração para papéis que não
  existem. Com dois papéis e regras que cabem numa procedure, custo sem retorno.

O ponto que dispensa checagem de posse: nas rotas de dados próprios o id vem **do
token**, nunca da URL. `context.auth.userId` não é falsificável sem forjar a
assinatura do JWT.

## Matriz de acesso — Fase 1

| Rota | Procedure | Anônimo | MEMBER | ADMIN |
| --- | --- | --- | --- | --- |
| `POST /auth/login` | `publicProcedure` | ✅ | ✅ | ✅ |
| `POST /auth/register` | `publicProcedure` | ✅ | ✅ | ✅ |
| `POST /auth/refresh` | `publicProcedure` | ✅ | ✅ | ✅ |
| `POST /auth/logout` | `publicProcedure` | ✅ | ✅ | ✅ |
| `GET /auth/me` | `protectedProcedure` | 401 | ✅ | ✅ |
| `GET /members` | `adminProcedure` | 401 | **403** | ✅ |
| `GET /members/:id` | `adminProcedure` | 401 | **403** | ✅ |
| `POST /members/invitations` | `adminProcedure` | 401 | **403** | ✅ |
| `PATCH /members/:id/status` | `adminProcedure` | 401 | **403** | ✅ |

`refresh` e `logout` são públicas de propósito: recebem o refresh token no corpo, não
um access token no header. Exigir sessão válida para renovar sessão é circular.

## Contrato de erro

| Situação | Código oRPC | HTTP |
| --- | --- | --- |
| Sem header `Authorization` | `UNAUTHORIZED` | 401 |
| Token expirado, malformado ou com assinatura inválida | `UNAUTHORIZED` | 401 |
| Token válido, papel insuficiente | `FORBIDDEN` | 403 |

401 e 403 dizem coisas diferentes e não devem ser confundidos: 401 é "não sei quem
você é", 403 é "sei quem você é e não pode". Token inválido nunca vira 403 — o
contexto devolve `auth: null` sem lançar, e a procedure trata como anônimo.

A resposta de 403 **não revela** se o recurso existe. `GET /members/:id` com id
inexistente e com id existente respondem igual para um MEMBER: 403, sempre, antes de
qualquer consulta ao banco. A procedure roda antes do handler, então isso é
consequência da arquitetura, não de cuidado manual.

## Perfil público de membro — regra registrada, implementação na Fase 2

A regra de 1.5 que dizia *"membro não pode acessar dados privados de outro membro"*
foi **revogada** por ser ampla demais: contradizia o ranking, que já expõe nome,
cargo, nível e pontos de todos para todo mundo.

No lugar dela: **um membro pode ver o perfil de outro membro, somente leitura**, com
recorte por campo.

| Campo | Admin | Membro vendo outro |
| --- | --- | --- |
| id, nome, cargo, avatar | sim | sim |
| pontos, nível, badges | sim | sim |
| pontuação por categoria | sim | sim |
| histórico de KPI | sim | sim, **somente pontuação positiva** |
| e-mail | sim | **não** |
| status de ativação | sim | **não** |

Duas justificativas para o recorte:

**E-mail fora.** É PII sem valor motivacional e é vetor de phishing. O admin precisa
para convidar e administrar; um colega não precisa.

**Histórico filtrado por pontuação positiva.** Todo KPI modelado hoje é
reconhecimento — *"Ajudou um colega"*, *"Mentoria"*, *"Chegou no horário"*. Mas
`Kpi.points` é `Int` e aceita negativo. Sem o filtro, um KPI punitivo cadastrado
depois viraria registro disciplinar visível entre pares. O filtro protege uma decisão
que ainda não foi tomada.

**Não entra na Fase 1.** Tudo que dá conteúdo ao perfil — pontos, nível, categorias,
badges, histórico — é Fase 2. Um perfil de colega hoje mostraria nome, cargo e data de
entrada. O endpoint `GET /members/:id/profile` está registrado em
[§ 2.9 do roadmap](../MVP_API_ROADMAP.md).

O front já é coerente com isso: `onOpenMember` só é passado em
`apps/web/src/pages/admin/ranking/index.tsx`, e há teste travando que sem ele nenhum
nome do ranking vira botão. Abrir na Fase 2 é passar o handler na tela do membro.

## Testes

Autorização sem teste é a situação atual. O que precisa existir:

**Nas procedures** (`tests/procedures.test.ts`, arquivo novo):

- `protectedProcedure` sem token → `UNAUTHORIZED`
- `protectedProcedure` com token inválido → `UNAUTHORIZED`
- `protectedProcedure` com token válido → passa, `context.auth` preenchido
- `adminProcedure` sem token → `UNAUTHORIZED`
- `adminProcedure` com token de MEMBER → `FORBIDDEN`
- `adminProcedure` com token de ADMIN → passa

**Em cada rota de members** (junto do router do módulo): uma asserção de que a rota
usa `adminProcedure`, verificada por chamada com contexto de MEMBER resultando em
`FORBIDDEN`. Barato e impede que uma rota nasça pública por descuido.

## Critérios de aceite

- [ ] `adminProcedure` aplicada nas quatro rotas de `/members`
- [ ] MEMBER recebe 403 em toda rota administrativa
- [ ] Requisição sem token recebe 401, não 403
- [ ] Token inválido recebe 401 e nunca 500
- [ ] 403 não distingue recurso existente de inexistente
- [ ] Testes das três procedures cobrindo anônimo, MEMBER e ADMIN
- [ ] Regra de perfil público registrada no roadmap (feito) e ausente da Fase 1
