# KPICorp — Roadmap da API MVP

**Versão:** 1.0
**Status:** Em desenvolvimento
**Escopo:** Backend / API
**Objetivo:** Implementar toda a camada de negócio necessária para conectar o frontend existente ao backend do KPICorp.

---

# 1. Contexto

O projeto KPICorp já possui sua estrutura de monorepo configurada utilizando **Turborepo**, com os packages e aplicações necessários para o funcionamento do projeto.

A implementação descrita neste documento **não contempla setup de projeto, configuração de banco, configuração de ambiente ou infraestrutura**.

A estrutura existente é considerada como pré-requisito:

```text
KPICorp/
├── apps/
│   └── server/
│       └── src/
│           └── index.ts
│
├── packages/
│   ├── api/
│   ├── db/
│   ├── env/
│   ├── config/
│   └── ui/
```

## Responsabilidades

### `apps/server`

Responsável somente pela inicialização da aplicação HTTP.

```text
apps/server/src/index.ts
```

O servidor deve consumir a API disponibilizada pelo package `api`.

---

### `packages/api`

Responsável pela aplicação da API:

* rotas;
* controllers;
* services;
* schemas;
* autenticação;
* autorização;
* regras de negócio;
* respostas HTTP;
* integração com `db`.

---

### `packages/db`

Responsável pelo acesso ao banco de dados.

A API deve utilizar o package `db` para:

* queries;
* mutations;
* transações;
* relacionamentos;
* persistência.

---

### `packages/env`

Responsável pelas variáveis de ambiente já existentes.

---

### `packages/config`

Responsável pelas configurações compartilhadas.

---

### `packages/ui`

**Fora do escopo desta implementação.**

---

# 2. Objetivo do MVP

O objetivo é fazer com que o frontend existente consiga executar o fluxo completo do KPICorp através da API.

O MVP deve suportar:

```text
Autenticação
     ↓
Membros
     ↓
KPIs
     ↓
Atribuições
     ↓
Pontuação
     ↓
Gamificação
     ↓
Reuniões
     ↓
Ranking
     ↓
Dashboards
```

O fluxo principal do produto é:

```text
ADMIN
  ↓
Gerencia membros
  ↓
Cria KPIs
  ↓
Abre reunião
  ↓
Registra presença
  ↓
Atribui KPIs
  ↓
MEMBRO recebe pontos
  ↓
Pontuação é atualizada
  ↓
Ranking é atualizado
  ↓
Nível / badges são atualizados
```

---

# FASE 1 — Autenticação e Gestão de Membros

## Objetivo

Implementar a base funcional da API para que Admins e Members possam autenticar-se e o Admin possa gerenciar os membros da equipe.

Ao final desta fase:

```text
Admin
  ↓
Login
  ↓
Dashboard protegido
  ↓
Gerenciar membros
  ↓
Convidar membro
  ↓
Membro realiza cadastro
  ↓
Membro faz login
```

---

## 1.1 — Autenticação

### Login

```http
POST /auth/login
```

### Responsabilidades

* validar credenciais;
* localizar usuário;
* validar senha;
* gerar access token;
* gerar refresh token;
* retornar dados básicos do usuário.

### Resposta esperada

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": "...",
    "name": "João",
    "email": "joao@email.com",
    "role": "MEMBER"
  }
}
```

---

## 1.2 — Usuário autenticado

```http
GET /auth/me
```

Retornar:

* id;
* nome;
* e-mail;
* role;
* avatar, caso exista.

---

## 1.3 — Refresh Token

```http
POST /auth/refresh
```

Responsabilidades:

* validar refresh token;
* verificar expiração;
* gerar novo access token;
* manter a sessão válida.

---

## 1.4 — Logout

```http
POST /auth/logout
```

Responsabilidade:

* invalidar/revogar a sessão atual.

---

# 1.5 — Autorização

Implementar controle baseado nos papéis existentes:

```text
ADMIN
MEMBER
```

### ADMIN

Pode:

* visualizar membros;
* visualizar dados individuais;
* criar KPIs;
* atribuir KPIs;
* remover atribuições;
* criar reuniões;
* registrar presença;
* visualizar dashboard administrativo;
* visualizar ranking.

### MEMBER

Pode:

* visualizar seus próprios dados;
* visualizar seus próprios KPIs;
* visualizar seus pontos;
* visualizar seu nível;
* visualizar seus badges;
* visualizar ranking geral;
* visualizar o perfil público de outro membro (somente leitura).

Não pode:

* criar KPI;
* editar KPI;
* atribuir KPI;
* gerenciar membros;
* criar reuniões;
* acessar dados administrativos ou de contato de outro membro
  (e-mail, status de ativação).

### Perfil público de membro

Um membro **pode** consultar o perfil de outro membro, apenas para leitura. A
regra anterior — *"não pode acessar dados privados de outro membro"* — era ampla
demais e contradizia o ranking, que já expõe nome, cargo, nível e pontos de todos
para todo mundo.

O recorte é por campo, não por rota:

| Campo | Admin | Membro vendo outro |
| --- | --- | --- |
| id, nome, cargo, avatar | sim | sim |
| pontos, nível, badges | sim | sim |
| pontuação por categoria | sim | sim |
| histórico de KPI | sim | sim, **somente KPIs de pontuação positiva** |
| e-mail | sim | **não** |
| status de ativação | sim | **não** |

O histórico é filtrado por pontuação positiva de propósito. Hoje todo KPI modelado
é de reconhecimento, mas `Kpi.points` aceita valor negativo — sem o filtro, um KPI
punitivo criado depois viraria registro disciplinar visível entre colegas.

Vale a partir da **Fase 2**: os dados que dão sentido ao perfil (pontos, nível,
categorias, badges, histórico) só existem lá. Na Fase 1 `GET /members/:id`
permanece exclusivo do Admin.

---

# 1.6 — Gestão de membros

## Listagem

```http
GET /members
```

Apenas Admin.

Suportar:

* paginação;
* busca por nome/e-mail;
* filtro por status.

Exemplo:

```http
GET /members?page=1&limit=20&search=joao&status=ACTIVE
```

---

## Detalhes do membro

```http
GET /members/:id
```

Apenas Admin.

Retornar informações do membro necessárias para a tela administrativa.

---

## Convite

```http
POST /members/invitations
```

Entrada:

```json
{
  "email": "joao@email.com"
}
```

Fluxo:

```text
Admin
 ↓
Informa email
 ↓
API valida email
 ↓
Cria convite
 ↓
Gera token
 ↓
Convite fica disponível para cadastro
```

O envio efetivo do e-mail deve utilizar a infraestrutura já existente no projeto, caso esteja disponível.

---

## Cadastro via convite

```http
POST /auth/register
```

Entrada:

```json
{
  "token": "...",
  "name": "João",
  "password": "..."
}
```

Fluxo:

```text
Invitation
     ↓
Validação
     ↓
Criação do User
     ↓
Convite marcado como utilizado
```

---

## Desativação

```http
PATCH /members/:id/status
```

Entrada:

```json
{
  "active": false
}
```

O usuário não deve ser removido.

Seu histórico permanece no banco.

---

# 1.7 — Critérios de aceite da Fase 1

* [x] Admin consegue fazer login.
* [x] Member consegue fazer login.
* [x] Access token funciona.
* [x] Refresh token funciona.
* [x] Logout invalida a sessão.
* [x] `/auth/me` retorna o usuário autenticado.
* [x] Rotas protegidas exigem autenticação.
* [x] Rotas administrativas exigem ADMIN.
* [x] Admin consegue listar membros.
* [x] Admin consegue visualizar um membro.
* [x] Admin consegue convidar membro.
* [x] Membro consegue completar cadastro via convite.
* [x] Admin consegue desativar membro.
* [x] Histórico do membro permanece após desativação.

---

# FASE 2 — KPIs, Atribuições e Gamificação

## Objetivo

Implementar o núcleo do produto.

O fluxo desta fase será:

```text
Admin
  ↓
Cria KPI
  ↓
Seleciona membro
  ↓
Atribui KPI
  ↓
KpiAssignment
  ↓
Pontuação
  ↓
Nível
  ↓
Badges
```

---

# 2.1 — Gestão de KPIs

## Criar KPI

```http
POST /kpis
```

Entrada:

```json
{
  "name": "Excelente apresentação",
  "description": "Reconhecimento por uma excelente apresentação",
  "points": 50,
  "category": "PERFORMANCE"
}
```

Categorias do MVP:

```text
PRESENCE
PERFORMANCE
BEHAVIOR
```

---

## Listar KPIs

```http
GET /kpis
```

Filtros:

```http
GET /kpis?category=PERFORMANCE&active=true
```

---

## Buscar KPI

```http
GET /kpis/:id
```

---

## Editar KPI

```http
PUT /kpis/:id
```

---

## Desativar KPI

```http
PATCH /kpis/:id/status
```

KPI desativado:

* não pode ser utilizado em novas atribuições;
* continua disponível no histórico.

---

# 2.2 — Atribuição de KPI

A atribuição representa o reconhecimento recebido pelo membro.

```text
KPI
 ↓
Assignment
 ↓
User
```

Cada atribuição deve registrar:

* KPI;
* usuário;
* Admin responsável;
* data;
* hora;
* nota opcional.

---

## Atribuir KPI

```http
POST /kpi-assignments
```

Entrada:

```json
{
  "kpiId": "...",
  "userId": "...",
  "note": "Excelente apresentação na reunião"
}
```

---

## Atribuição em massa

```http
POST /kpi-assignments/bulk
```

Entrada:

```json
{
  "kpiId": "...",
  "userIds": [
    "...",
    "...",
    "..."
  ],
  "note": "Presença na reunião semanal"
}
```

Esse endpoint será reutilizado pelo Modo Reunião na Fase 3.

---

# 2.3 — Remover atribuição

```http
DELETE /kpi-assignments/:id
```

A atribuição não deve ser removida fisicamente.

Ela deve permanecer no histórico e deixar de contar para a pontuação.

Exemplo:

```text
Assignment
├── assigned_at
└── revoked_at
```

Quando `revoked_at` estiver preenchido:

```text
Não contabiliza pontos
```

mas:

```text
Continua no histórico
```

---

# 2.4 — Minha pontuação

Criar endpoint para retornar o resumo da pontuação do membro autenticado.

```http
GET /me/score
```

Exemplo:

```json
{
  "total": 850,
  "categories": {
    "presence": 300,
    "performance": 400,
    "behavior": 100,
    "initiative": 50
  },
  "level": {
    "level": 6,
    "tier": "COMPROMETIDO",
    "nextLevel": 7,
    "nextLevelPoints": 900,
    "progress": 75
  }
}
```

São **quatro** categorias desde a Fase 2A, quando `INITIATIVE` entrou no enum. Categoria
sem nenhum ponto vem como `0`, nunca omitida.

O bloco `level` entra aqui além de em `/me/profile`: o dashboard do membro precisa de
pontos e nível juntos, e o nível é função pura de um número que já está na resposta.

A pontuação deve ser derivada das atribuições válidas.

---

# 2.5 — Meus KPIs

```http
GET /me/kpis
```

Retornar:

* nome;
* categoria;
* pontos;
* data;
* nota;
* status.

---

# 2.6 — Resumo de KPI

```http
GET /me/kpis/summary
```

Permitir que o frontend obtenha:

* quantidade total de KPIs;
* quantidade por categoria;
* pontuação por categoria;
* última atribuição.

---

# 2.7 — Níveis

Implementar os vinte níveis e as cinco faixas definidos no PRD § 7.

```text
nivel    0    1    2    3    4    5    6    7    8    9   10
pts      0  100  200  300  400  500  700  900 1100 1300 1500

nivel   11   12   13   14   15   16   17   18   19   20
pts   1900 2300 2700 3100 3500 4300 5100 5900 6700 7500
```

Faixa por banda de nível — troca em 5, 10, 15 e 20:

```text
0-4    INICIANTE
5-9    COMPROMETIDO
10-14  DESTAQUE
15-19  ELITE
20     LENDA
```

A regra é centralizada em `packages/api/src/shared/gamification/levels.ts` — saiu de
`modules/profile/` na 3D para que o dashboard a use sem importar módulo. Calcula:

```text
level          nivel atual, 0 a 20
tier           faixa do nivel atual
currentPoints
levelFloor     limiar do nivel atual
nextLevel      null no nivel 20
nextLevelPoints
nextTier       null quando ja e LENDA
progress       0-100 dentro do nivel atual
```

Exemplo, para 850 pontos:

```json
{
  "level": 6,
  "tier": "COMPROMETIDO",
  "currentPoints": 850,
  "levelFloor": 700,
  "nextLevel": 7,
  "nextLevelPoints": 900,
  "nextTier": "DESTAQUE",
  "progress": 75
}
```

O nível é função pura da pontuação válida — não há estado guardado, e revogar
atribuição pode derrubar o nível. Nível 20 é o teto: `nextLevel` e `nextTier` vêm
`null` e `progress` vem 100.

---

# 2.8 — Badges

**Entregue na Fase 2D.** O perfil expõe sempre dez badges, em ordem de catálogo, nas
respostas de `GET /me/profile` e `GET /members/:id/profile`; não há endpoint granular de
badges.

| Código | Regra | Fase |
| --- | --- | --- |
| `FIRST_POINT` | primeira atribuição válida | 2 |
| `FIVE_PERFORMANCE` | 5 atribuições de `PERFORMANCE` | 2 |
| `ALL_CATEGORIES` | todas as categorias de KPI | 2 |
| `TWENTY_FIVE_KPIS` | 25 atribuições válidas | 2 |
| `FOUR_WEEK_STREAK` | 4 semanas ISO consecutivas | 2 |
| `TWELVE_WEEK_STREAK` | 12 semanas ISO consecutivas | 2 |
| `TEN_MEETINGS` | 10 presenças confirmadas (`presentAt` preenchido) | 3 |
| `TOP_THREE` | top 3 do ranking `all`, com pontuação positiva | 3 |
| `PERFECT_MONTH` | presente em todas as reuniões encerradas de um mês já fechado | 3 |
| `PODIUM_STREAK` | 3 meses de calendário consecutivos no top 3 | 3 |

Toda regra recebe apenas atribuições não revogadas e de pontuação positiva. O streak usa
semanas ISO em `America/Sao_Paulo`, com a melhor sequência histórica para decidir a
conquista e a sequência atual para informar o progresso.

Badge é **fato gravado e consequência calculada**: a regra pura deriva a conquista do
histórico, e `user_badge` persiste o `earnedAt` derivado da atribuição que a fechou. O
carimbo ocorre na leitura, com `createMany({ skipDuplicates })` sob
`@@unique([userId, code])`; assim, uma conquista permanece depois de revogar o KPI que a
gerou.

**As quatro de Fase 3 foram destravadas na 3E** — as dez vêm com `available: true`, sem
mudança no `badgeSchema` nem na ordem do catálogo. Calculam ao vivo, sem depender de
`ranking_snapshot`:

| Código | `target` | `current` | `earnedAt` |
| --- | --- | --- | --- |
| `TEN_MEETINGS` | 10 | presenças confirmadas | `presentAt` da 10ª presença |
| `TOP_THREE` | `null` | 0 ou 1 | `assignedAt` da atribuição válida mais recente do membro |
| `PERFECT_MONTH` | `null` | 0 ou 1 | `closedAt` da última reunião daquele mês |
| `PODIUM_STREAK` | 3 | melhor sequência histórica | última atribuição do membro no 3º mês |

`PERFECT_MONTH` exige mês fechado (o corrente nunca concede), ao menos uma reunião
encerrada, ignora reunião aberta e reunião anterior ao `createdAt` do membro.
`PODIUM_STREAK` varre os últimos 12 meses fechados; mês sem nenhuma atribuição da equipe
quebra a sequência. `TOP_THREE` e `PODIUM_STREAK` usam o `rank()` da 3B, mas com o filtro
`points > 0` das badges — divergência intencional com o ranking, que soma negativos.

Detalhes nas specs da [Fase 2D](specs/fase-2d-badges.md) e da
[Fase 3E](specs/fase-3e-badges-de-fase-3.md).

---

# 2.9 — Perfil do membro

```http
GET /me/profile
```

Retornar:

```text
Informações pessoais
        +
Pontuação
        +
Pontuação por categoria
        +
KPIs
        +
Nível
        +
Badges
```

## Perfil público de outro membro

```http
GET /members/:id/profile
```

Disponível para **ADMIN e MEMBER** — é o endpoint que sustenta a regra de perfil
público definida em [1.5](#15--autorização).

Retorna o mesmo conteúdo de `/me/profile`, exceto:

* **sem e-mail**;
* **sem status de ativação**;
* histórico de KPI **filtrado para pontuação positiva**.

Quando o `:id` é o do próprio usuário autenticado, o comportamento é idêntico ao de
outro membro — para ver os próprios dados completos existe `/me/profile`.

---

# 2.10 — Critérios de aceite da Fase 2

A fase é **quatro entregas**, não uma. A dependência é estrita: não se atribui KPI que
não existe, nem se calcula pontuação sem atribuição.

| Entrega | Cobre | Estado |
| --- | --- | --- |
| **2A — Catálogo de KPIs** | 2.1 | entregue |
| **2B — Atribuições** | 2.2, 2.3 | entregue — `docs/specs/fase-2b-atribuicoes.md` |
| **2C — Pontuação, níveis e perfil** | 2.4 a 2.7, 2.9 | entregue — `docs/specs/fase-2c-pontuacao-e-niveis.md` |
| **2D — Badges** | 2.8 | entregue — `docs/specs/fase-2d-badges.md`; as quatro de Fase 3 destravadas na 3E (`docs/specs/fase-3e-badges-de-fase-3.md`) |

* [x] Admin consegue criar KPI. · 2A
* [x] Admin consegue editar KPI. · 2A
* [x] Admin consegue desativar KPI. · 2A
* [x] Admin consegue listar KPIs. · 2A
* [x] Admin consegue atribuir KPI. · 2B
* [x] Admin consegue atribuir KPI para múltiplos membros. · 2B
* [x] Admin consegue revogar atribuição. · 2B
* [x] Histórico permanece após revogação. · 2B
* [x] Pontuação considera somente atribuições válidas. · 2C
* [x] Member consegue visualizar seus KPIs. · 2C
* [x] Member consegue visualizar seus pontos. · 2C
* [x] Pontuação por categoria funciona. · 2C
* [x] Nível é calculado corretamente. · 2C
* [x] Badges são calculados corretamente. · 2D e 3E
* [x] Member não consegue executar ações administrativas. · 2A

---

# FASE 3 — Reuniões, Ranking e Dashboards

## Objetivo

Finalizar o fluxo principal do KPICorp.

Esta fase integra todos os módulos anteriores e implementa o **Modo Reunião**, principal fluxo operacional do produto.

---

# 3.1 — Criar reunião

```http
POST /meetings
```

Entrada:

```json
{
  "title": "Reunião semanal",
  "date": "2026-08-30"
}
```

A reunião deverá possuir estado suficiente para diferenciar uma reunião ativa de uma encerrada.

---

# 3.2 — Detalhes da reunião

```http
GET /meetings/:id
```

Retornar:

* título;
* data;
* responsável;
* status;
* participantes;
* informações relevantes da reunião.

---

# 3.3 — Participantes

Adicionar participantes:

```http
POST /meetings/:id/attendees
```

Entrada:

```json
{
  "userIds": [
    "...",
    "...",
    "..."
  ]
}
```

---

# 3.4 — Registro de presença

```http
POST /meetings/:id/attendance
```

Entrada:

```json
{
  "userIds": [
    "...",
    "...",
    "..."
  ]
}
```

Fluxo:

```text
Meeting
  ↓
Selecionar presentes
  ↓
MeetingAttendee
  ↓
Presence KPI
  ↓
KpiAssignment
  ↓
Pontos
```

A atribuição de presença deve ocorrer em massa.

---

# 3.5 — KPI durante reunião

Durante uma reunião, o Admin poderá reconhecer individualmente um membro.

```http
POST /meetings/:id/kpi-assignments
```

Entrada:

```json
{
  "kpiId": "...",
  "userId": "...",
  "note": "Excelente participação"
}
```

A atribuição deverá ficar vinculada à reunião.

---

# 3.6 — Encerrar reunião

```http
POST /meetings/:id/end
```

Após o encerramento:

```text
Meeting = CLOSED
```

A API deve impedir novas atribuições relacionadas à reunião.

O histórico deve permanecer disponível.

---

# 3.7 — Ranking

**Entregue na Fase 3B.** Detalhes em [`specs/fase-3b-ranking.md`](specs/fase-3b-ranking.md)
e [`modules/ranking.md`](modules/ranking.md).

A ordenação é função pura em `shared/ranking/rank.ts`, reusada por dashboard (3D) e
badges (3E). Desempate em três níveis, com posições sempre sequenciais (1, 2, 3 — nunca
compartilhadas):

```text
1. Pontuação total DESC
2. Quantidade de KPIs DESC
3. Nome ASC (pt-BR, Intl.Collator)
```

---

## Ranking

```http
GET /ranking?period=month
```

`protectedProcedure`. `period` aceita `week`, `month`, `quarter`, `all`; padrão `all`.

| Período | Janela | Quem pode |
| --- | --- | --- |
| `week` | semana ISO, segunda 00:00 a domingo | ADMIN e MEMBER |
| `month` | mês de calendário | ADMIN e MEMBER |
| `quarter` | trimestre de calendário | só ADMIN — MEMBER recebe `403 PERIOD_NOT_ALLOWED` |
| `all` | sem janela | ADMIN e MEMBER |

As janelas são de calendário no fuso `America/Sao_Paulo`. Todo usuário ativo entra,
ADMIN incluído, mesmo com 0 pontos; usuário desativado sai inclusive dos períodos
passados. Pontuação soma atribuições com `revokedAt IS NULL` — negativa subtrai.

---

## Exemplo

```json
{
  "period": "month",
  "periodStart": "2026-08-01",
  "periodEnd": "2026-08-31",
  "items": [
    {
      "position": 1,
      "member": { "id": "...", "name": "Maria", "position": "Designer", "role": "MEMBER" },
      "points": 1200,
      "kpiCount": 25,
      "change": 2,
      "isMe": false
    },
    {
      "position": 2,
      "member": { "id": "...", "name": "João", "position": null, "role": "MEMBER" },
      "points": 1100,
      "kpiCount": 22,
      "change": null,
      "isMe": true
    }
  ],
  "me": { "position": 2, "points": 1100, "kpiCount": 22, "change": null }
}
```

`position` é a colocação; o cargo fica em `member.position`. `periodStart` e `periodEnd`
vêm `null` em `all`. `isMe` e o bloco `me` identificam o membro autenticado — `me` é
`null` se ele não está no ranking. Sem paginação: a equipe inteira vem numa resposta.

`change` é a variação de posição contra o período anterior (positivo = subiu). Vem de
`ranking_snapshot`, materializada **na leitura**: a primeira leitura depois da virada
congela a janela anterior já fechada (nunca a corrente), andando para trás até achar
snapshot, com teto de 12 janelas. Janela sem nenhuma atribuição não vira snapshot.
Usuário ausente do snapshot anterior recebe `change: null`; `all` sempre `null`.

---

# 3.8 — Dashboard do Member

**Entregue na Fase 3D.** Detalhes em [`specs/fase-3d-dashboards.md`](specs/fase-3d-dashboards.md).

```http
GET /dashboard/member
```

`protectedProcedure` — ADMIN também tem o próprio dashboard de membro.

```json
{
  "user": { "id": "...", "name": "João", "position": "Dev", "role": "MEMBER" },
  "points": 850,
  "kpiCount": 18,
  "rankingPosition": 4,
  "teamSize": 12,
  "level": {
    "level": 6, "tier": "COMPROMETIDO", "currentPoints": 850, "levelFloor": 700,
    "nextLevel": 7, "nextLevelPoints": 900, "progress": 75, "nextTier": "DESTAQUE"
  },
  "recentKpis": [
    { "id": "...", "kpiId": "...", "name": "Resolveu bug crítico", "category": "PERFORMANCE",
      "points": 25, "note": null, "assignedAt": "2026-09-05T14:12:00.000Z" }
  ]
}
```

* `level` é o objeto completo de § 2.7, idêntico ao de `/me/score`.
* `rankingPosition` é a posição no ranking `all`; `teamSize` é o total de ativos.
* `recentKpis` traz as cinco últimas atribuições **válidas**, decrescente.
* Usuário desativado com token ainda válido recebe `403 MEMBER_INACTIVE`.

Uma requisição, uma resposta, sem cache nem agregado gravado.

---

# 3.9 — Dashboard do Admin

```http
GET /dashboard/admin
```

`adminProcedure`.

```json
{
  "members": { "active": 25, "total": 27 },
  "kpis": { "week": 32, "month": 142 },
  "meetings": { "week": 2, "month": 8, "open": 1 },
  "points": { "week": 410, "month": 1820 },
  "ranking": [
    { "position": 1, "member": { "id": "...", "name": "Maria", "position": "Designer", "role": "MEMBER" },
      "points": 1200, "kpiCount": 25 }
  ],
  "recentAssignments": [],
  "membersWithoutKpis": [
    { "id": "...", "name": "Bia", "position": null, "lastAssignmentAt": "2026-07-20T...", "daysWithout": 50 }
  ]
}
```

| Bloco | O que é | Janela |
| --- | --- | --- |
| `members.active` / `.total` | usuários ativos / todos | — |
| `kpis.week` / `.month` | atribuições válidas criadas | semana ISO / mês corrente |
| `points.week` / `.month` | soma de `points` das válidas | semana ISO / mês corrente |
| `meetings.week` / `.month` | reuniões pela `date` | semana ISO / mês corrente |
| `meetings.open` | reuniões com `closedAt IS NULL` | — |
| `ranking` | top 5, sem `change` e sem `isMe` — não grava snapshot | mês corrente |
| `recentAssignments` | últimas 10, válidas e revogadas, com `user` | — |
| `membersWithoutKpis` | ativos sem atribuição válida; quem nunca recebeu conta desde o `createdAt` | 30 dias corridos |

As janelas de semana e mês são de calendário (`America/Sao_Paulo`), as mesmas do
ranking. `membersWithoutKpis` é a exceção deliberada: janela deslizante, ordenada do
maior `daysWithout` para o menor.

---

# 3.10 — Histórico de atribuições

**Entregue na Fase 3C.** Detalhes em
[`specs/fase-3c-historico-de-atribuicoes.md`](specs/fase-3c-historico-de-atribuicoes.md).

```http
GET /kpi-assignments
```

Apenas Admin — MEMBER recebe 403.

| Filtro | Tipo | Padrão |
| --- | --- | --- |
| `userId` | uuid | todos |
| `kpiId` | uuid | todos |
| `category` | categoria de KPI | todas |
| `from` | `YYYY-MM-DD` | sem limite |
| `to` | `YYYY-MM-DD` | sem limite |
| `revoked` | boolean | ambos |
| `page` | int ≥ 1 | 1 |
| `limit` | int 1–100 | 20 |

Exemplo:

```http
GET /kpi-assignments?userId=...&from=2026-08-01&to=2026-08-31
```

Paginado no mesmo shape de `GET /members`: `items`, `page`, `limit`, `total`,
`totalPages`. `from` e `to` são dias **inclusivos** nas duas pontas, em
`America/Sao_Paulo` — `to=2026-08-31` inclui o que aconteceu às 23h59 do dia 31; `to`
anterior a `from` é 400. Cada linha traz o KPI e o `user` (`id`, `name`, `position`).
Ordenado por `assignedAt` decrescente, desempate por `id`. `userId` inexistente devolve
lista vazia, não 404. `GET /members/:id/kpi-assignments` da 2B continua como estava.

---

# 3.11 — Histórico de reuniões

O histórico deve permitir recuperar reuniões já encerradas.

```http
GET /meetings
```

Filtros sugeridos:

```text
status
from
to
```

O histórico deverá permitir ao Admin visualizar:

* reunião;
* participantes;
* presença;
* KPIs atribuídos durante a reunião.

---

# 3.12 — Critérios de aceite da Fase 3

* [x] Admin consegue criar reunião.
* [x] Admin consegue visualizar reunião.
* [x] Admin consegue adicionar participantes.
* [x] Admin consegue registrar presença.
* [x] KPI de presença é atribuído automaticamente.
* [x] Admin consegue atribuir KPIs durante a reunião.
* [x] Atribuições ficam vinculadas à reunião.
* [x] Admin consegue encerrar reunião.
* [x] Reunião encerrada não aceita novas atribuições.
* [x] Histórico da reunião permanece disponível.
* [x] Ranking semanal funciona. · 3B
* [x] Ranking mensal funciona. · 3B
* [x] Ranking total funciona. · 3B
* [x] Critério de desempate funciona. · 3B
* [x] Dashboard Member funciona. · 3D
* [x] Dashboard Admin funciona. · 3D
* [x] Histórico de atribuições funciona. · 3C

---

# 4. Fluxo completo da API

Depois das três fases, o fluxo esperado será:

```text
                         ┌───────────────┐
                         │     ADMIN     │
                         └───────┬───────┘
                                 │
                               LOGIN
                                 │
                                 ▼
                         ┌───────────────┐
                         │   DASHBOARD   │
                         └───────┬───────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
                ▼                ▼                ▼
             MEMBROS            KPIs           REUNIÕES
                │                │                │
                │                │                ▼
                │                │          PARTICIPANTES
                │                │                │
                │                │                ▼
                │                │            PRESENÇA
                │                │                │
                │                │                ▼
                │                │          KPI PRESENÇA
                │                │                │
                │                └───────┐        │
                │                        │        │
                │                        ▼        ▼
                │                  ATRIBUIÇÕES ◄──┘
                │                        │
                └────────────────────────┤
                                         ▼
                                    PONTUAÇÃO
                                         │
                          ┌──────────────┼──────────────┐
                          │              │              │
                          ▼              ▼              ▼
                       RANKING         NÍVEL         BADGES
                          │              │              │
                          └──────────────┼──────────────┘
                                         ▼
                                  MEMBER DASHBOARD
```

---

# 5. Ordem de implementação dentro das fases

## Fase 1

```text
1. Auth
2. Authorization
3. Members
4. Invitations
```

## Fase 2

```text
5. KPIs
6. KPI Assignments
7. Score
8. Levels
9. Badges
10. Member Profile
```

## Fase 3

```text
11. Meetings
12. Meeting Attendees
13. Attendance
14. Meeting KPI Assignments
15. Ranking
16. Member Dashboard
17. Admin Dashboard
18. Assignment History
19. Meeting History
```

---

# 6. Organização sugerida dentro do `packages/api`

A organização pode seguir os domínios do produto:

```text
packages/api/
└── src/
    ├── modules/
    │   ├── auth/
    │   │   ├── routes.ts
    │   │   ├── controller.ts
    │   │   ├── service.ts
    │   │   └── schemas.ts
    │   │
    │   ├── members/
    │   │   ├── routes.ts
    │   │   ├── controller.ts
    │   │   ├── service.ts
    │   │   └── schemas.ts
    │   │
    │   ├── kpis/
    │   │   ├── routes.ts
    │   │   ├── controller.ts
    │   │   ├── service.ts
    │   │   └── schemas.ts
    │   │
    │   ├── assignments/
    │   │   ├── routes.ts
    │   │   ├── controller.ts
    │   │   ├── service.ts
    │   │   └── schemas.ts
    │   │
    │   ├── meetings/
    │   │   ├── routes.ts
    │   │   ├── controller.ts
    │   │   ├── service.ts
    │   │   └── schemas.ts
    │   │
    │   ├── ranking/
    │   │   ├── routes.ts
    │   │   └── service.ts
    │   │
    │   ├── dashboard/
    │   │   ├── routes.ts
    │   │   └── service.ts
    │   │
    │   └── gamification/
    │       ├── level.service.ts
    │       └── badge.service.ts
    │
    └── shared/
        ├── errors/
        ├── middleware/
        └── utils/
```

A estrutura acima é uma **sugestão de organização**, não uma alteração obrigatória da estrutura já existente.

---

# 7. Regras de negócio que devem ficar no Backend

O frontend não deve ser responsável por garantir regras críticas.

### RB01 — Autorização

Member não acessa recursos administrativos.

### RB02 — Privacidade

Member só acessa seus próprios dados individuais.

### RB03 — KPI

KPI inativo não pode receber novas atribuições.

### RB04 — Repetição

O mesmo KPI pode ser atribuído várias vezes ao mesmo membro.

### RB05 — Revogação

Revogar uma atribuição não remove o histórico.

### RB06 — Pontuação

A pontuação considera apenas atribuições válidas.

### RB07 — Auditoria

Toda atribuição registra quem realizou a ação.

### RB08 — Reunião

Reunião encerrada não aceita novas atribuições.

### RB09 — Membro

Membro desativado não recebe novas atribuições.

### RB10 — Ranking

Ranking utiliza pontuação como critério principal.

### RB11 — Desempate

Quantidade de KPIs é o segundo critério; nome em ordem alfabética pt-BR é o terceiro.
Posições são sequenciais, nunca compartilhadas.

---

# 8. Transações

Operações que alteram múltiplos registros devem ser executadas dentro de transações.

## Atribuição em massa

```text
BEGIN
 ↓
Validar KPI
 ↓
Validar usuários
 ↓
Criar assignments
 ↓
COMMIT
```

Em caso de erro:

```text
ROLLBACK
```

---

## Registro de presença

```text
BEGIN
 ↓
Registrar participantes
 ↓
Criar atribuições de presença
 ↓
COMMIT
```

Isso garante que o processamento da reunião não fique parcialmente concluído.

---

# 9. Testes da API

Os testes devem priorizar regras de negócio e fluxos críticos.

## Autenticação

* [ ] Login válido.
* [ ] Login inválido.
* [ ] Token expirado.
* [ ] Refresh token.
* [ ] Logout.

## Autorização

* [ ] Admin acessa recursos administrativos.
* [ ] Member recebe 403 ao tentar acessar recursos administrativos.
* [ ] Member não consegue acessar dados de outro Member.

## KPIs

* [ ] Criar KPI.
* [ ] Editar KPI.
* [ ] Desativar KPI.
* [ ] Impedir atribuição de KPI inativo.

## Atribuições

* [ ] Atribuir KPI.
* [ ] Atribuir em massa.
* [ ] Revogar atribuição.
* [ ] Preservar histórico.
* [ ] Recalcular pontuação.

## Gamificação

* [ ] Calcular nível.
* [ ] Calcular progresso.
* [ ] Identificar badges.
* [ ] Calcular ranking.

## Reuniões

* [ ] Criar reunião.
* [ ] Adicionar participantes.
* [ ] Registrar presença.
* [ ] Atribuir KPI durante reunião.
* [ ] Encerrar reunião.
* [ ] Impedir alteração após encerramento.

---

# 10. Definition of Done — API MVP

A API será considerada concluída quando:

### Auth

* [x] Login funcionando.
* [x] Refresh funcionando.
* [x] Logout funcionando.
* [x] JWT funcionando.
* [x] Authorization funcionando.

### Members

* [x] Listagem.
* [x] Detalhes.
* [x] Convites.
* [x] Cadastro via convite.
* [x] Desativação.

### KPIs

* [x] CRUD.
* [x] Categorias.
* [x] Ativação/desativação.

### Assignments

* [x] Individual.
* [x] Em massa.
* [x] Revogação.
* [x] Histórico.

### Gamificação

* [x] Pontuação.
* [x] Níveis.
* [x] Progresso.
* [x] Badges.

### Meetings

* [x] Criação.
* [x] Participantes.
* [x] Presença.
* [x] Atribuições.
* [x] Encerramento.
* [x] Histórico.

### Ranking

* [x] Semana.
* [x] Mês.
* [x] Total.
* [x] Desempate.

### Dashboards

* [x] Dashboard Admin.
* [x] Dashboard Member.
* [x] Perfil Member.

### Qualidade

* [x] Schemas de entrada/saída.
* [x] Tratamento de erros.
* [x] Testes das regras críticas.
* [ ] API integrada ao frontend existente. — telas ainda consomem `apps/web/src/mocks/`; migração é story de web.

---

# 11. Fluxo final de validação

Antes de considerar o MVP encerrado, executar o seguinte cenário ponta a ponta:

```text
1. Admin faz login
        ↓
2. Admin visualiza dashboard
        ↓
3. Admin convida membro
        ↓
4. Membro realiza cadastro
        ↓
5. Membro faz login
        ↓
6. Admin cria KPI de Presença
        ↓
7. Admin cria KPI de Desempenho
        ↓
8. Admin abre reunião
        ↓
9. Admin seleciona membros presentes
        ↓
10. API registra presença
        ↓
11. API atribui KPI de Presença
        ↓
12. Admin atribui KPI de Desempenho
        ↓
13. Pontuação é atualizada
        ↓
14. Nível é recalculado
        ↓
15. Badges são avaliados
        ↓
16. Ranking é atualizado
        ↓
17. Admin encerra reunião
        ↓
18. Membro acessa dashboard
        ↓
19. Membro visualiza pontos
        ↓
20. Membro visualiza ranking
        ↓
21. Membro visualiza KPIs
        ↓
22. Histórico permanece disponível
```

---

# 12. Fora do escopo do MVP

Não implementar neste ciclo:

* Metas e desafios;
* Notificações;
* Recuperação de senha;
* Upload de avatar;
* Múltiplos Admins;
* Exportação CSV/PDF;
* Categorias customizadas;
* App mobile;
* Slack;
* Teams;
* Analytics avançado;
* Multiempresa;
* API pública;
* Chat entre membros.

Esses recursos permanecem como evolução posterior conforme o PRD.

---

# 13. Marco de conclusão

O MVP da API estará funcional quando o frontend existente conseguir executar, sem mocks:

```text
AUTH
  ↓
MEMBERS
  ↓
KPIs
  ↓
ASSIGNMENTS
  ↓
SCORE
  ↓
LEVELS / BADGES
  ↓
MEETINGS
  ↓
ATTENDANCE
  ↓
RANKING
  ↓
DASHBOARDS
```

O objetivo final não é apenas disponibilizar endpoints isolados, mas garantir que **todo o fluxo de reconhecimento do KPICorp funcione de ponta a ponta através da API**.

## Estado

**Lado da API: completo**, em desenvolvimento local — as entregas 2A a 3E estão
implementadas e cobertas por teste, e § 1.7, § 2.10 e § 3.12 estão atendidos. Não há
deploy, CI nem release.

O marco acima **ainda não foi atingido**: ele exige o frontend rodando sem mocks, e as
telas de `apps/web/` continuam consumindo `apps/web/src/mocks/`. O que falta é trabalho de
web, registrado nas **Consequências registradas** de cada spec em `docs/specs/`. Rate
limiting em `login`, `register` e `refresh` segue inexistente.
