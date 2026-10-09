# Spec — Fase 2B: Atribuições de KPI

**Fase:** 2 · **Status:** entregue · **Data:** 2026-09-03

Referência: [MVP_API_ROADMAP.md § 2.2 e § 2.3](../MVP_API_ROADMAP.md) ·
Depende de: Fase 2A — Catálogo de KPIs (entregue)

---

## Escopo

Atribuir KPI a membro, atribuir em massa e revogar. Três endpoints, um módulo novo,
uma migration.

**Não entra:** pontuação, níveis e perfil (2C); badges (2D); reunião, que é quem vai
preencher `meetingId` (Fase 3).

### Por que 2B vem antes de 2C

Pontuação é soma de atribuições. Sem atribuição não há o que somar — a tabela
`kpi_assignment` está vazia hoje. 2C consome o que esta entrega cria.

---

## Decisões tomadas

### A atribuição congela a pontuação do KPI

Decisão herdada da spec 2A, que a registrou e deixou a coluna para cá.

`KpiAssignment` hoje só aponta para `kpiId`. Sem coluna própria, editar um KPI de 5 para
50 pontos **reescreveria a pontuação passada de todo mundo** que já o recebeu, sem que
nenhum evento tivesse acontecido.

`points` passa a ser copiado do KPI no instante da atribuição. Mesma razão pela qual
nota fiscal guarda o preço em vez de um link para a tabela de preços. É esta coluna que
torna `PUT /kpis/:id` seguro para `points`, como a 2A assumiu.

A cópia também vale para `category`? **Não.** Categoria de KPI não muda de sentido ao
ser corrigida — se "Presença na reunião" foi cadastrada como `BEHAVIOR` por engano e
vira `PRESENCE`, o certo é que o histórico acompanhe. Pontuação é valor negociado no
momento; categoria é classificação. Só `points` congela.

### Revogar é preencher `revokedAt`, não apagar linha

O modelo tem hoje `active Boolean @default(true)`. Ele sai e entra `revokedAt DateTime?`.

| | `active: false` | `revokedAt: <data>` |
| --- | --- | --- |
| Diz que não conta | sim | sim |
| Diz **quando** deixou de contar | não | sim |
| Derivável do outro | sim (`revokedAt == null`) | não |

O roadmap § 2.3 desenha `assigned_at` / `revoked_at`, e a data é o que permite responder
"quanto o membro tinha em março" na Fase 3. `active` é o campo mais pobre dos dois e não
carrega nada que `revokedAt` não carregue.

**Não entra `revokedBy`.** O roadmap não pede, e só Admin revoga — a informação existiria
sem uso. Se auditoria virar requisito, é coluna nova sem migração de dados.

### `DELETE` que não apaga

A rota é `DELETE /kpi-assignments/:id` porque é assim que o roadmap escreve e é o verbo
que o cliente espera para "tirar isso daqui". O efeito é revogação: a linha permanece,
sai da pontuação e continua no histórico. Está registrado aqui porque o verbo mente
sobre o efeito, e quem ler a rota depois vai precisar disso.

Revogar duas vezes é erro, não no-op: `ASSIGNMENT_ALREADY_REVOKED`. Silenciar a segunda
chamada esconderia clique duplo e corrida entre dois admins.

### Atribuição em massa é tudo ou nada

`POST /kpi-assignments/bulk` roda dentro de uma transação. Um `userId` inválido na lista
derruba a requisição inteira, e nenhuma linha é criada.

A alternativa — criar o que der e devolver a lista de falhas — deixa o Admin sem saber o
que aconteceu na tela de reunião, que é o consumidor real deste endpoint na Fase 3.
Parcialmente aplicado é o pior estado possível para uma reunião ao vivo.

### O mesmo KPI pode ser atribuído várias vezes

Regra do PRD § 6: *"Um KPI pode ser atribuído múltiplas vezes ao mesmo membro (ex:
presença em reunião toda semana)"*. Não há constraint de unicidade, não há verificação de
duplicata, e a pontuação soma cada ocorrência.

### KPI inativo e membro inativo não recebem atribuição nova

A 2A escreveu que "KPI desativado sai das novas atribuições (regra aplicada em 2B)". É
aqui. Vale também para membro com `active = false`: conta desativada não acumula ponto.

Atribuição **já existente** de um KPI que foi desativado depois continua valendo e
continua contando. Desativar catálogo é decisão sobre o futuro, não sobre o passado.

---

## Módulo novo: `assignments`

Mesmo template de `auth`, `members` e `kpis`
([ADR 0009](http://localhost:4000/docs/adr/0009-camadas-router-service-repository)).

```
packages/api/src/modules/assignments/
├── assignments.router.ts       # adminProcedure, uma linha por rota
├── assignments.service.ts      # regras
├── assignments.repository.ts   # único lugar com Prisma
├── assignments.schema.ts       # Zod de input e output
├── assignments.mapper.ts       # KpiAssignment (Prisma) → dto
├── assignments.errors.ts       # erros do módulo
└── index.ts
```

**Não importa de `kpis` nem de `members`**, mesmo precisando dos dados dos dois. A regra
é cobrada por lint e por `tests/architecture.test.ts`. O módulo lê `kpi` e `user` pelo
próprio repository, via Prisma — é acesso à tabela, não dependência de módulo.

O módulo precisa entrar no `group` do `biome.json`; há teste cobrando essa sincronia.

---

## Endpoints

Todos `adminProcedure`. Atribuir reconhecimento é ato de administração; o membro lê o
que recebeu em `/me/kpis` (2C).

### 1. Atribuir

```http
POST /kpi-assignments
```

```json
{
  "kpiId": "...",
  "userId": "...",
  "note": "Excelente apresentação na reunião"
}
```

`note` é opcional e vai como `null` quando ausente. `assignedBy` vem de
`context.auth.userId` — **nunca** do corpo, senão um Admin credita em nome de outro.
`points` é copiado do KPI. `meetingId` fica `null` nesta fase.

Resposta: a atribuição criada, com o KPI embutido (nome, categoria) para a tela não
precisar de segunda chamada.

`404 KPI_NOT_FOUND`, `404 MEMBER_NOT_FOUND`, `409 KPI_INACTIVE`, `409 MEMBER_INACTIVE`.

### 2. Atribuir em massa

```http
POST /kpi-assignments/bulk
```

```json
{
  "kpiId": "...",
  "userIds": ["...", "...", "..."],
  "note": "Presença na reunião semanal"
}
```

Um KPI, vários membros, a mesma nota para todos. `userIds` exige no mínimo 1, e o schema
rejeita ids repetidos na lista — repetir o mesmo membro na mesma chamada é erro de
cliente, não intenção de dobrar ponto.

Transação única. Qualquer id inválido, membro inativo ou KPI inativo aborta tudo.

Resposta: a lista das atribuições criadas.

### 3. Listar atribuições de um membro

```http
GET /members/:id/kpi-assignments
```

Não está no roadmap, e entra porque a tela de perfil do Admin (`members-ui`, já
construída no front) precisa do histórico de quem ela abriu — e o `/me/kpis` de 2C
serve o próprio usuário, não o Admin olhando outro.

Filtros: `category`, `revoked` (`true` só revogadas, `false` só válidas, ausente traz
tudo). Ordena por `assignedAt` decrescente.

### 4. Revogar

```http
DELETE /kpi-assignments/:id
```

Preenche `revokedAt` com o instante da chamada. Não apaga.

`404 ASSIGNMENT_NOT_FOUND`, `409 ASSIGNMENT_ALREADY_REVOKED`.

Não há rota que desfaça a revogação. Se foi engano, o Admin atribui de novo — o
histórico fica com as duas linhas, que é o registro honesto do que aconteceu.

---

## Erros

| Erro | `code` | HTTP |
| --- | --- | --- |
| `KpiNotFoundError` | `KPI_NOT_FOUND` | 404 |
| `KpiInactiveError` | `KPI_INACTIVE` | 409 |
| `MemberNotFoundError` | `MEMBER_NOT_FOUND` | 404 |
| `MemberInactiveError` | `MEMBER_INACTIVE` | 409 |
| `AssignmentNotFoundError` | `ASSIGNMENT_NOT_FOUND` | 404 |
| `AssignmentAlreadyRevokedError` | `ASSIGNMENT_ALREADY_REVOKED` | 409 |

Todos estendem `DomainError` com `code` e `status`
([ADR 0010](http://localhost:4000/docs/adr/0010-erros-de-dominio)).

`KpiNotFoundError` e `MemberNotFoundError` já existem em `kpis.errors.ts` e
`members.errors.ts`, e **não podem ser importados de lá** — a proibição de import entre
módulos vale também para erro. São redeclarados em `assignments.errors.ts` com o mesmo
`code`. Duplicação consciente: o preço da independência dos módulos, e o contrato que o
cliente vê (`data.code`) continua idêntico.

---

## Migration

```sql
ALTER TABLE "kpi_assignment" ADD COLUMN "points" INTEGER NOT NULL;
ALTER TABLE "kpi_assignment" ADD COLUMN "revoked_at" TIMESTAMP(3);
ALTER TABLE "kpi_assignment" DROP COLUMN "active";
```

A tabela está vazia — nenhuma atribuição foi criada até hoje. Sem backfill, e `points`
pode ser `NOT NULL` direto, sem default. Se a tabela tivesse linhas, `points` exigiria
duas migrations e uma cópia a partir de `kpi.points`.

Índice novo em `revokedAt` não entra: a pontuação de 2C filtra por `userId` +
`revokedAt IS NULL`, e o índice de `userId` já existe. Índice parcial, se precisar,
entra em 2C com o plano de query na mão.

---

## Tasks

Ordem por dependência. Cada uma é um commit.

| # | Task | Depende de |
| --- | --- | --- |
| 1 | Migration: `points`, `revokedAt`, remover `active` | — |
| 2 | `assignments.errors.ts`, `assignments.mapper.ts`, `assignments.schema.ts` | 1 |
| 3 | `assignments.repository.ts` | 2 |
| 4 | `assignments.service.ts` | 3 |
| 5 | `assignments.router.ts` + registro em `routers/index.ts` + `group` do `biome.json` | 4 |
| 6 | Testes de service (repository mockado) | 4 |
| 7 | Testes de router (contrato, validação e autorização) | 5 |
| 8 | Seed com atribuições de exemplo | 5 |
| 9 | Pasta de atribuições na collection do Postman | 5 |

A task 8 não é enfeite: sem atribuição no banco, 2C não tem como ser validada a mão, e
as telas de pontuação do front ficam sem dado para conferir.

---

## Testes

Service com repository mockado, router com service mockado. Nenhum precisa de banco.

**Atribuir**
- cria e devolve a atribuição com o KPI embutido
- `points` gravado é o do KPI no momento, não uma referência
- editar o KPI depois **não** muda o `points` da atribuição já criada
- `assignedBy` vem do contexto, e um `assignedBy` mandado no corpo é ignorado
- `note` ausente grava `null`
- `kpiId` inexistente → `KPI_NOT_FOUND`
- KPI inativo → `KPI_INACTIVE`
- `userId` inexistente → `MEMBER_NOT_FOUND`
- membro inativo → `MEMBER_INACTIVE`
- o mesmo KPI atribuído duas vezes ao mesmo membro cria duas linhas

**Em massa**
- cria uma linha por membro, todas com o mesmo `kpiId` e a mesma `note`
- um `userId` inválido no meio da lista não cria **nenhuma** linha
- membro inativo no meio da lista não cria nenhuma linha
- `userIds` vazio é rejeitado pelo schema
- `userIds` com id repetido é rejeitado pelo schema

**Listar por membro**
- devolve o histórico ordenado por `assignedAt` decrescente
- `revoked=false` esconde as revogadas
- `revoked=true` traz só as revogadas
- filtro por categoria
- membro sem atribuição devolve lista vazia, não 404

**Revogar**
- preenche `revokedAt` e mantém a linha
- id inexistente → `ASSIGNMENT_NOT_FOUND`
- revogar de novo → `ASSIGNMENT_ALREADY_REVOKED`
- atribuição de KPI que foi desativado depois continua revogável

**Autorização**
- as quatro rotas: anônimo → 401, MEMBER → 403, ADMIN → passa
- o service não é alcançado quando a guarda barra

---

## Critérios de aceite

- [x] Admin atribui KPI a um membro, com nota opcional
- [x] Admin atribui um KPI a vários membros numa chamada
- [x] Falha parcial na atribuição em massa não deixa nada criado
- [x] Admin revoga atribuição
- [x] Atribuição revogada permanece no histórico
- [x] `points` da atribuição não muda quando o KPI é editado
- [x] KPI inativo não recebe atribuição nova
- [x] Membro inativo não recebe atribuição nova
- [x] O mesmo KPI pode ser atribuído várias vezes ao mesmo membro
- [x] MEMBER recebe 403 nas quatro rotas
- [x] Módulo `assignments` não importa de `kpis` nem de `members`

---

## Consequências registradas

**`meetingId` nasce sempre `null`.** A coluna já existe no modelo e continua sem
escritor até a Fase 3. Quando o Modo Reunião chegar, ele reusa `POST
/kpi-assignments/bulk` passando o `meetingId` — é por isso que o endpoint em massa
existe com essa forma agora.

**O front tem um store de atribuição em memória.** `apps/web/src/lib/kpi-store.ts` e as
telas de reunião trabalham sobre mock. Nada disso é tocado aqui; a migração do front é
story de web, depois de 2C.
