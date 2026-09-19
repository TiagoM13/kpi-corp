# Spec — Fase 3A: Reuniões

**Fase:** 3 · **Status:** proposta, aguardando validação · **Data:** 2026-09-08

Referência: [MVP_API_ROADMAP.md § 3.1 a § 3.6 e § 3.11](../MVP_API_ROADMAP.md) ·
Depende de: Fase 2B — Atribuições

---

## Escopo

O Modo Reunião: criar reunião, escalar participantes, registrar presença — que dispara o
KPI de presença em massa —, reconhecer membro ao vivo, encerrar e consultar o histórico.

Sete endpoints, um módulo novo, uma migration.

**Não entra:** ranking (3B), histórico de atribuições fora de reunião (3C), dashboards
(3D), badges de reunião (3E). Esta entrega **produz** o dado que as quatro consomem.

### Por que 3A abre a Fase 3

`meeting`, `meeting_attendee` e `kpi_assignment.meetingId` já existem no schema desde o
setup e nunca tiveram um escritor — a 2B registrou isso como consequência: *"`meetingId`
nasce sempre `null`"*. É aqui que a coluna ganha dono.

O dashboard do Admin conta reuniões da semana, e duas das quatro badges pendentes da 2D
(`TEN_MEETINGS`, `PERFECT_MONTH`) medem presença. Nada disso é calculável antes desta
entrega.

---

## Decisões tomadas

### `closed Boolean` sai, `closedAt DateTime?` entra

Mesma troca que a 2B fez em `KpiAssignment.active` → `revokedAt`, pelo mesmo argumento.

| | `closed: true` | `closedAt: <data>` |
| --- | --- | --- |
| Diz que encerrou | sim | sim |
| Diz **quando** encerrou | não | sim |
| Derivável do outro | sim (`closedAt != null`) | não |

A hora do encerramento é o que responde "quanto durou a reunião" e o que ancora a
ordenação do histórico (§ 3.11). O booleano é o campo mais pobre dos dois e não carrega
nada que a data não carregue.

O contrato **não** expõe o booleano nem o `closedAt` cru como estado: expõe
`status: "OPEN" | "CLOSED"`, derivado no mapper, mais `closedAt` como dado. O roadmap
§ 3.11 filtra por `status`, e um filtro sobre um campo que não existe na resposta é
armadilha de cliente.

`createdBy` continua como está e vem do contexto, nunca do corpo — RB07, a mesma regra
que a 2B aplicou a `assignedBy`.

### Escalado e presente são coisas diferentes

O roadmap tem duas rotas, § 3.3 (participantes) e § 3.4 (presença), e hoje
`MeetingAttendee` não tem como distinguir uma da outra. Entra `presentAt DateTime?`.

```
POST /meetings/{id}/attendees    → cria a linha, presentAt = null   (escalado)
POST /meetings/{id}/attendance   → carimba presentAt + KPI          (presente)
```

Colapsar as duas numa só — que é o que `apps/web/src/lib/meeting.ts` faz hoje, com um
`present: string[]` e nada mais — apagaria quem faltou. E quem faltou é justamente o
denominador de `PERFECT_MONTH` na 3E: sem a lista de escalados, "esteve em todas as
reuniões do mês" não tem como ser respondido.

`presentAt` é data e não booleano pelo mesmo motivo do parágrafo anterior. Custa o mesmo
e responde mais.

### Marcar presença de quem não foi escalado cria a linha

`POST /meetings/{id}/attendance` aceita um `userId` que não tem linha em
`meeting_attendee`. Ele é criado já com `presentAt` preenchido.

Reunião real tem quem aparece sem estar na lista. Exigir duas chamadas — escalar, depois
marcar — para o caso mais comum de correção ao vivo transformaria um clique da tela em
dois round-trips, e a tela do Admin (`meeting-setup.tsx`) não tem esse passo.

O caminho inverso não existe: **não há rota para desmarcar presença**. O roadmap não
pede, e desfazer presença significaria revogar o assignment de presença já criado — que é
`DELETE /kpi-assignments/{id}`, entregue na 2B, e continua sendo o caminho.

### O KPI de presença vem no corpo, não de convenção

```http
POST /meetings/{id}/attendance
{ "userIds": [...], "kpiId": "..." }
```

Validado em três eixos: existe, `active = true`, e `category = PRESENCE`.

A alternativa "a API escolhe o KPI ativo de categoria `PRESENCE`" quebra hoje: o catálogo
semeado tem **dois** — *Presença na reunião* (5 pts) e *Chegou no horário* (3 pts). Uma
regra que precisa de exatamente um KPI numa categoria que o Admin edita à vontade é uma
regra que quebra na primeira semana.

A alternativa "fixar `presenceKpiId` na reunião" foi descartada por custo sem retorno:
mais uma coluna, mais uma migration, e o Admin perde a chance de corrigir a escolha
depois de já ter aberto a reunião.

`kpiId` sem `category = PRESENCE` é erro explícito (`KPI_NOT_PRESENCE`), não uma
atribuição qualquer disfarçada de presença. O nome da rota promete presença.

### Presença é transação única

```
BEGIN
  valida reunião aberta
  valida KPI: existe, ativo, PRESENCE
  valida membros: existem, ativos
  upsert das linhas de meeting_attendee com presentAt
  createMany de kpi_assignment com meetingId
COMMIT
```

Roadmap § 8 pede isso literalmente. Um `userId` inválido no meio da lista derruba a
requisição inteira e não deixa nada criado — mesma decisão da 2B para
`POST /kpi-assignments/bulk`, e pelo mesmo motivo: parcialmente aplicado é o pior estado
possível numa reunião ao vivo.

Chamar presença duas vezes com o mesmo `userId` **não** cria dois assignments.
`presentAt` já preenchido é no-op para aquele membro, e ele sai da lista antes do
`createMany`. Clique duplo na tela não pode dobrar a pontuação de ninguém.

### Reconhecimento ao vivo é só para quem está presente

`POST /meetings/{id}/kpi-assignments` exige `presentAt IS NOT NULL` para o `userId`.
Quem não estava na reunião não recebe KPI *da* reunião — `ATTENDEE_NOT_PRESENT`.

Reconhecer alguém ausente continua possível pela rota da 2B,
`POST /kpi-assignments`, que grava `meetingId = null`. A diferença entre as duas rotas é
exatamente essa: uma vincula à reunião, a outra não.

### Reunião encerrada é imutável

`closedAt` preenchido rejeita `POST /attendees`, `POST /attendance`,
`POST /kpi-assignments` e um segundo `POST /end`. RB08.

O que **continua permitido** é revogar um assignment feito na reunião, via
`DELETE /kpi-assignments/{id}`. Encerrar a reunião congela o que entra nela, não o
direito do Admin de corrigir um erro depois. A alternativa — travar a revogação junto —
transformaria um clique errado ao vivo em ponto permanente.

`GET` de reunião encerrada continua funcionando para sempre. O histórico permanece.

### `meetings` escreve em `kpi_assignment` pelo próprio repository

Módulo não importa módulo — a regra é dura e vale aqui. `modules/meetings/` não pode
chamar `assignmentsService`, então `meetings.repository.ts` fala com `kpi_assignment` no
Prisma direto.

Isso duplica **uma** regra da 2B: `points` é copiado do KPI no instante da atribuição, e
não referenciado. É uma linha (`points: kpi.points`), e há teste cobrando os dois
caminhos de escrita — o da 2B e o desta spec — para que uma reprecificação de KPI não
reescreva o passado por nenhum dos dois.

Mover a criação de assignment para `shared/` foi descartado: `shared/` hoje não tem uma
linha de Prisma, e abrir essa porta por uma linha de código custaria mais do que a
duplicação.

---

## Migration

Tabela vazia em desenvolvimento local. Sem migração de dado, sem backfill.

```prisma
model Meeting {
  id        String    @id @default(uuid()) @db.Uuid
  title     String
  date      DateTime
  closedAt  DateTime?          // substitui closed Boolean
  createdBy String    @db.Uuid
  createdAt DateTime  @default(now())

  attendees   MeetingAttendee[]
  assignments KpiAssignment[]

  @@index([date])
  @@index([closedAt])
  @@map("meeting")
}

model MeetingAttendee {
  id        String    @id @default(uuid()) @db.Uuid
  meetingId String    @db.Uuid
  userId    String    @db.Uuid
  presentAt DateTime?          // novo

  meeting Meeting @relation(fields: [meetingId], references: [id])
  user    User    @relation(fields: [userId], references: [id])

  @@unique([meetingId, userId])
  @@index([userId])
  @@map("meeting_attendee")
}
```

`@@unique([meetingId, userId])` já existia e agora tem uso: é ele que torna o upsert de
presença seguro contra duplo clique.

O índice em `date` serve o filtro `from`/`to` de § 3.11; o índice em `closedAt` serve o
filtro `status` e a contagem de reuniões da semana no dashboard do Admin (3D).
`@@index([userId])` em `meeting_attendee` já existe e é o que a 3E usa para contar
reuniões de um membro.

---

## Módulo novo: `meetings`

```
packages/api/src/modules/meetings/
├── meetings.router.ts       # /meetings e /meetings/{id}/*
├── meetings.service.ts      # regras, transações
├── meetings.repository.ts   # Prisma, inclusive kpi_assignment
├── meetings.schema.ts       # Zod de input e output
├── meetings.mapper.ts       # closedAt → status
├── meetings.errors.ts
└── index.ts
```

Entra no `group` do `biome.json`; `src/tests/architecture.test.ts` cobra essa sincronia e
falha se esquecer.

---

## Endpoints

Todos `adminProcedure`. Nenhuma rota de reunião é de membro — o roadmap § 1.5 lista
"criar reuniões" e "registrar presença" como exclusivas do Admin, e não dá ao Member
nenhuma visão de reunião.

### 1. Criar reunião

```http
POST /meetings
```

```json
{ "title": "Reunião semanal", "date": "2026-08-30" }
```

Devolve a reunião com `status: "OPEN"`, `closedAt: null`, `attendees: []`.

`createdBy` vem de `context.auth.userId`. Um `createdBy` mandado no corpo é ignorado pelo
schema, não rejeitado — mesmo tratamento que a 2B deu a `assignedBy`.

`title` obrigatório, `trim`, 1 a 120 caracteres. `date` é data do calendário, não
instante: aceita `YYYY-MM-DD`.

### 2. Detalhes

```http
GET /meetings/{id}
```

```json
{
  "id": "...",
  "title": "Reunião semanal",
  "date": "2026-08-30T00:00:00.000Z",
  "status": "CLOSED",
  "closedAt": "2026-08-30T15:42:00.000Z",
  "createdAt": "2026-08-30T14:00:00.000Z",
  "createdBy": { "id": "...", "name": "Ana" },
  "attendees": [
    { "userId": "...", "name": "João", "position": "Dev", "presentAt": "..." },
    { "userId": "...", "name": "Bia", "position": null, "presentAt": null }
  ],
  "assignments": [
    { "id": "...", "userId": "...", "kpiId": "...", "kpi": { "name": "...", "category": "PRESENCE" },
      "points": 5, "note": null, "assignedAt": "...", "revokedAt": null }
  ]
}
```

O § 3.2 pede "responsável" — é `createdBy` embutido com nome, não só o id. A tela mostra
nome, e obrigá-la a uma segunda chamada em `/members/{id}` para descobrir quem abriu a
reunião seria contrato mal desenhado.

`attendees` traz escalados **e** presentes na mesma lista, separados por `presentAt`.
Duas listas separadas obrigariam a tela a reconciliar.

`assignments` traz as revogadas marcadas, como `/me/kpis` da 2C faz. É a visão de Admin
sobre uma reunião; esconder o que foi tirado seria mentir por omissão.

### 3. Escalar participantes

```http
POST /meetings/{id}/attendees
```

```json
{ "userIds": ["...", "..."] }
```

Cria linhas com `presentAt = null`. Transação. Membro já escalado é ignorado
(`skipDuplicates`), não é erro — escalar é operação de lista, e reenviar a lista inteira
com um nome novo é o uso natural da tela.

Valida: reunião existe e está aberta, todo `userId` existe e está ativo.
`userIds` de 1 a 200, sem repetição — mesmo `refine` de unicidade da 2B.

Devolve a reunião completa, igual ao § 3.2. A tela acabou de mudar a lista e precisa do
estado novo; devolver `204` forçaria um `GET` imediato.

### 4. Registrar presença

```http
POST /meetings/{id}/attendance
```

```json
{ "userIds": ["...", "..."], "kpiId": "..." }
```

Transação, na ordem descrita em **Presença é transação única**. Devolve a reunião
completa.

Um membro que já tinha `presentAt` não recebe assignment novo e não vira erro: a resposta
mostra o estado final, e a diferença entre "marquei agora" e "já estava marcado" não
interessa a nenhuma tela.

### 5. KPI durante a reunião

```http
POST /meetings/{id}/kpi-assignments
```

```json
{ "kpiId": "...", "userId": "...", "note": "Excelente participação" }
```

Cria um `kpi_assignment` com `meetingId` preenchido e `points` congelado. Devolve a
atribuição, no mesmo shape que a 2B devolve — o mesmo dado não pode ter duas formas por
ter entrado por outra porta.

Valida: reunião aberta, membro presente, KPI existe e ativo. `note` opcional, `trim`,
até 500 caracteres, igual à 2B.

Qualquer categoria vale aqui, inclusive `PRESENCE`: o Admin pode reconhecer pontualidade
de alguém já presente. A restrição de categoria existe só na rota de presença, onde o
nome promete.

### 6. Encerrar

```http
POST /meetings/{id}/end
```

Preenche `closedAt` com o instante atual e devolve a reunião. Segunda chamada →
`MEETING_ALREADY_CLOSED`, não no-op, pela mesma razão que a 2B recusa revogar duas vezes:
silenciar esconde clique duplo e corrida entre dois admins.

Encerrar reunião sem nenhum presente é permitido. Reunião que não aconteceu é fato, não
erro.

### 7. Histórico

```http
GET /meetings?status=CLOSED&from=2026-08-01&to=2026-08-31&page=1&limit=20
```

Paginado no mesmo shape de `GET /members` — `items`, `page`, `limit`, `total`,
`totalPages`. A lista cresce sem teto, uma por semana no mínimo, e uma rota sem paginação
é uma decisão adiada, não uma decisão evitada.

`status` aceita `OPEN`, `CLOSED`, `ALL`, com `ALL` como padrão — mesmo trio de
`GET /members`. `from` e `to` filtram por `date`, inclusive nas duas pontas. Ordenado por
`date` decrescente, desempate por `createdAt` decrescente.

Cada item traz `id`, `title`, `date`, `status`, `closedAt`, `attendeeCount`,
`presentCount` e `assignmentCount`. Sem as listas — a tela de histórico mostra linhas, e
carregar participantes de trinta reuniões para renderizar três números é desperdício que
o § 3.2 já resolve por reunião.

---

## Erros

| Erro | `code` | HTTP |
| --- | --- | --- |
| `MeetingNotFoundError` | `MEETING_NOT_FOUND` | 404 |
| `MeetingClosedError` | `MEETING_CLOSED` | 409 |
| `MeetingAlreadyClosedError` | `MEETING_ALREADY_CLOSED` | 409 |
| `KpiNotFoundError` | `KPI_NOT_FOUND` | 404 |
| `KpiInactiveError` | `KPI_INACTIVE` | 409 |
| `KpiNotPresenceError` | `KPI_NOT_PRESENCE` | 422 |
| `MemberNotFoundError` | `MEMBER_NOT_FOUND` | 404 |
| `MemberInactiveError` | `MEMBER_INACTIVE` | 409 |
| `AttendeeNotPresentError` | `ATTENDEE_NOT_PRESENT` | 409 |

Os quatro herdados de `assignments` são **redeclarados** em `meetings.errors.ts` com o
mesmo `code`. A proibição de import entre módulos vale para erro, como a 2C já registrou
ao redeclarar `MemberNotFoundError`. O contrato que o cliente vê (`data.code`) continua
idêntico.

`MEETING_CLOSED` e `MEETING_ALREADY_CLOSED` são erros separados de propósito: o primeiro
é "você tentou mexer numa reunião encerrada", o segundo é "você tentou encerrar de novo".
A tela reage diferente aos dois.

`KPI_NOT_PRESENCE` é `422` e não `409`: não há conflito de estado, há valor errado num
campo. É a única validação desta spec que depende do conteúdo do recurso apontado e por
isso não cabe no Zod.

---

## Tasks

Ordem por dependência. Cada uma é um commit.

| # | Task | Depende de |
| --- | --- | --- |
| 1 | Migration: `closedAt`, `presentAt`, índices | — |
| 2 | `meetings.errors.ts`, `meetings.schema.ts`, `meetings.mapper.ts` | 1 |
| 3 | `meetings.repository.ts` — inclusive escrita em `kpi_assignment` | 2 |
| 4 | `meetings.service.ts` — regras e transações | 3 |
| 5 | `meetings.router.ts` + registro em `routers/index.ts` + `group` do `biome.json` | 4 |
| 6 | Testes de service (repository mockado) | 4 |
| 7 | Testes de router (contrato, validação e autorização) | 5 |
| 8 | Seed com duas reuniões — uma aberta, uma encerrada com presença | 5 |
| 9 | Pasta de reuniões na collection do Postman | 5 |

A task 8 tem a mesma justificativa que a 2B deu para a dela: sem reunião no banco, a 3E
não tem como ser validada a mão e o dashboard do Admin da 3D fica com `meetings.week`
sempre zero.

---

## Testes

Service com repository mockado, router com service mockado. Nenhum precisa de banco.

**Criar**
- devolve `status: "OPEN"` e `closedAt: null`
- `createdBy` vem do contexto; um `createdBy` no corpo é ignorado
- `title` vazio ou só espaço é rejeitado pelo schema
- `date` em formato inválido é rejeitado pelo schema

**Detalhes**
- traz `createdBy` com nome, não só id
- `attendees` traz escalado (`presentAt: null`) e presente na mesma lista
- `assignments` traz as revogadas marcadas
- reunião encerrada continua legível
- id inexistente → `MEETING_NOT_FOUND`

**Escalar**
- cria uma linha por membro com `presentAt: null`
- membro já escalado é ignorado, não vira erro
- membro inexistente na lista → `MEMBER_NOT_FOUND`, e **nenhuma** linha criada
- membro inativo na lista → `MEMBER_INACTIVE`, e nenhuma linha criada
- reunião encerrada → `MEETING_CLOSED`
- `userIds` vazio e `userIds` com repetição são rejeitados pelo schema

**Presença**
- carimba `presentAt` e cria um assignment por membro, todos com `meetingId`
- `points` do assignment é o do KPI no momento, não uma referência
- membro não escalado é criado como attendee já presente
- membro já presente não recebe segundo assignment
- KPI de categoria diferente de `PRESENCE` → `KPI_NOT_PRESENCE`
- KPI inativo → `KPI_INACTIVE`; KPI inexistente → `KPI_NOT_FOUND`
- membro inativo no meio da lista não deixa **nada** criado
- reunião encerrada → `MEETING_CLOSED`

**KPI ao vivo**
- cria assignment com `meetingId` preenchido
- membro escalado mas ausente → `ATTENDEE_NOT_PRESENT`
- membro sem linha de attendee → `ATTENDEE_NOT_PRESENT`
- KPI de categoria `PRESENCE` é aceito
- reunião encerrada → `MEETING_CLOSED`

**Encerrar**
- preenche `closedAt` e devolve `status: "CLOSED"`
- segunda chamada → `MEETING_ALREADY_CLOSED`
- reunião sem nenhum presente pode ser encerrada
- assignment de reunião encerrada continua revogável pela rota da 2B

**Histórico**
- ordenado por `date` decrescente
- `status=OPEN` e `status=CLOSED` filtram; `ALL` é o padrão
- `from`/`to` são inclusivos nas duas pontas
- contadores batem com o que o § 3.2 lista
- paginação: `total` e `totalPages` corretos, página além do fim devolve lista vazia

**Autorização**
- as sete rotas: anônimo → 401, MEMBER → 403, ADMIN → passa
- o service não é alcançado quando a guarda barra

---

## Critérios de aceite

- [ ] Admin cria reunião
- [ ] Admin visualiza reunião, com responsável, participantes e atribuições
- [ ] Admin escala participantes
- [ ] Admin registra presença
- [ ] KPI de presença é atribuído automaticamente no registro de presença
- [ ] KPI de presença só aceita KPI de categoria `PRESENCE`, ativo
- [ ] Falha parcial no registro de presença não deixa nada criado
- [ ] Presença registrada duas vezes não dobra a pontuação
- [ ] Admin atribui KPI durante a reunião
- [ ] Atribuições da reunião ficam vinculadas a ela por `meetingId`
- [ ] Membro ausente não recebe KPI vinculado à reunião
- [ ] Admin encerra reunião
- [ ] Reunião encerrada não aceita participante, presença nem atribuição
- [ ] Reunião encerrada continua legível, com histórico completo
- [ ] Histórico filtra por status e por intervalo de datas
- [ ] MEMBER recebe 403 nas sete rotas
- [ ] Módulo `meetings` não importa de `assignments`, `kpis`, `members` nem `profile`

Com estes, o § 3.12 fica atendido menos ranking, dashboards e histórico de atribuições.

---

## Consequências registradas

**A regra de congelar `points` passa a existir em dois repositories.** `assignments` e
`meetings` escrevem em `kpi_assignment` e ambos copiam `kpi.points`. É o preço da regra
de módulo não importar módulo, está coberto por teste nos dois caminhos, e quem alterar a
regra num lugar precisa alterar no outro. Se um terceiro escritor aparecer, a conversa
vira mover a escrita para `shared/`.

**`apps/web/src/lib/meeting.ts` fica em conflito.** O reducer do front modela a reunião
inteira em memória com `phase: "setup" | "live" | "done"`, `present: string[]` e
atribuições que só existem no navegador. Esta spec substitui os três por
`status`/`presentAt`/`kpi_assignment`. A migração do front é story de web e o Modo Reunião
continua no mock até ela acontecer.

**Não há rota de reunião para MEMBER.** O membro não vê nem a reunião de que participou.
O roadmap não pede, e nenhuma tela de membro no mock mostra reunião. Se virar requisito,
é `GET /me/meetings` com o mesmo repository — rota nova, sem migration.

**Não existe reabrir reunião.** `closedAt` só é preenchido, nunca limpo. Encerrar por
engano hoje se resolve criando outra reunião. Se o Admin errar com frequência, a
conversa é sobre confirmação na tela antes de ser sobre rota nova.

**Não há trava de reunião aberta simultânea.** Duas reuniões podem estar `OPEN` ao mesmo
tempo. O roadmap não proíbe, e squads que rodam daily e retro no mesmo dia são o caso
normal, não a exceção.
