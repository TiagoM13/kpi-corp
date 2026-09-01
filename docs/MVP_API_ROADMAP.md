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

* [ ] Admin consegue fazer login.
* [ ] Member consegue fazer login.
* [ ] Access token funciona.
* [ ] Refresh token funciona.
* [ ] Logout invalida a sessão.
* [ ] `/auth/me` retorna o usuário autenticado.
* [ ] Rotas protegidas exigem autenticação.
* [ ] Rotas administrativas exigem ADMIN.
* [ ] Admin consegue listar membros.
* [ ] Admin consegue visualizar um membro.
* [ ] Admin consegue convidar membro.
* [ ] Membro consegue completar cadastro via convite.
* [ ] Admin consegue desativar membro.
* [ ] Histórico do membro permanece após desativação.

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
    "behavior": 150
  }
}
```

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

Implementar os níveis definidos no PRD:

```text
0     → INICIANTE
500   → COMPROMETIDO
1000  → DESTAQUE
2000  → ELITE
5000  → LENDA
```

Criar uma regra centralizada para calcular:

```text
currentLevel
currentPoints
nextLevel
nextLevelPoints
progress
```

Exemplo:

```json
{
  "level": "COMPROMETIDO",
  "points": 850,
  "nextLevel": "DESTAQUE",
  "nextLevelPoints": 1000,
  "progress": 70
}
```

---

# 2.8 — Badges

Implementar os badges básicos definidos no MVP:

```text
FIRST_WEEK
FIVE_PERFORMANCE
TOP_THREE
TEN_MEETINGS
```

As regras devem ser implementadas como regras de domínio, evitando que o frontend determine se um usuário possui ou não uma conquista.

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

* [ ] Admin consegue criar KPI.
* [ ] Admin consegue editar KPI.
* [ ] Admin consegue desativar KPI.
* [ ] Admin consegue listar KPIs.
* [ ] Admin consegue atribuir KPI.
* [ ] Admin consegue atribuir KPI para múltiplos membros.
* [ ] Admin consegue revogar atribuição.
* [ ] Histórico permanece após revogação.
* [ ] Pontuação considera somente atribuições válidas.
* [ ] Member consegue visualizar seus KPIs.
* [ ] Member consegue visualizar seus pontos.
* [ ] Pontuação por categoria funciona.
* [ ] Nível é calculado corretamente.
* [ ] Badges são calculados corretamente.
* [ ] Member não consegue executar ações administrativas.

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

Criar serviço centralizado para cálculo do ranking.

```text
RankingService
```

Critérios:

```text
1. Pontuação total DESC
2. Quantidade de KPIs DESC
```

---

## Ranking

```http
GET /ranking
```

Períodos:

```text
week
month
quarter
all
```

Para Member:

```text
week
month
all
```

---

## Exemplo

```json
{
  "period": "month",
  "ranking": [
    {
      "position": 1,
      "userId": "...",
      "name": "Maria",
      "points": 1200,
      "kpiCount": 25
    },
    {
      "position": 2,
      "userId": "...",
      "name": "João",
      "points": 1100,
      "kpiCount": 22
    }
  ]
}
```

O membro autenticado deve poder ser identificado/destacado pelo frontend.

---

# 3.8 — Dashboard do Member

Criar endpoint agregador:

```http
GET /dashboard/member
```

Deve retornar os dados necessários para montar o dashboard existente.

Exemplo:

```json
{
  "user": {
    "name": "João"
  },
  "points": 850,
  "rankingPosition": 4,
  "kpiCount": 18,
  "level": {
    "name": "COMPROMETIDO",
    "progress": 70
  },
  "recentKpis": []
}
```

O endpoint deve evitar que o frontend precise executar várias requisições para obter informações que pertencem ao mesmo contexto do dashboard.

---

# 3.9 — Dashboard do Admin

```http
GET /dashboard/admin
```

Retornar:

* total de membros ativos;
* KPIs atribuídos na semana;
* KPIs atribuídos no mês;
* ranking;
* últimas atribuições;
* membros sem KPIs nos últimos 30 dias.

Exemplo:

```json
{
  "members": {
    "active": 25
  },
  "kpis": {
    "week": 32,
    "month": 142
  },
  "ranking": [],
  "recentAssignments": [],
  "membersWithoutKpis": []
}
```

---

# 3.10 — Histórico de atribuições

```http
GET /kpi-assignments
```

Apenas Admin.

Filtros:

```text
userId
kpiId
category
from
to
```

Exemplo:

```http
GET /kpi-assignments?userId=...&from=2026-08-01&to=2026-08-30
```

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

* [ ] Admin consegue criar reunião.
* [ ] Admin consegue visualizar reunião.
* [ ] Admin consegue adicionar participantes.
* [ ] Admin consegue registrar presença.
* [ ] KPI de presença é atribuído automaticamente.
* [ ] Admin consegue atribuir KPIs durante a reunião.
* [ ] Atribuições ficam vinculadas à reunião.
* [ ] Admin consegue encerrar reunião.
* [ ] Reunião encerrada não aceita novas atribuições.
* [ ] Histórico da reunião permanece disponível.
* [ ] Ranking semanal funciona.
* [ ] Ranking mensal funciona.
* [ ] Ranking total funciona.
* [ ] Critério de desempate funciona.
* [ ] Dashboard Member funciona.
* [ ] Dashboard Admin funciona.
* [ ] Histórico de atribuições funciona.

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

Quantidade de KPIs é o segundo critério.

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

* [ ] Login funcionando.
* [ ] Refresh funcionando.
* [ ] Logout funcionando.
* [ ] JWT funcionando.
* [ ] Authorization funcionando.

### Members

* [ ] Listagem.
* [ ] Detalhes.
* [ ] Convites.
* [ ] Cadastro via convite.
* [ ] Desativação.

### KPIs

* [ ] CRUD.
* [ ] Categorias.
* [ ] Ativação/desativação.

### Assignments

* [ ] Individual.
* [ ] Em massa.
* [ ] Revogação.
* [ ] Histórico.

### Gamificação

* [ ] Pontuação.
* [ ] Níveis.
* [ ] Progresso.
* [ ] Badges.

### Meetings

* [ ] Criação.
* [ ] Participantes.
* [ ] Presença.
* [ ] Atribuições.
* [ ] Encerramento.
* [ ] Histórico.

### Ranking

* [ ] Semana.
* [ ] Mês.
* [ ] Total.
* [ ] Desempate.

### Dashboards

* [ ] Dashboard Admin.
* [ ] Dashboard Member.
* [ ] Perfil Member.

### Qualidade

* [ ] Schemas de entrada/saída.
* [ ] Tratamento de erros.
* [ ] Testes das regras críticas.
* [ ] API integrada ao frontend existente.

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
