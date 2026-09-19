# Spec — Fase 3C: Histórico de atribuições

**Fase:** 3 · **Status:** proposta, aguardando validação · **Data:** 2026-09-08

Referência: [MVP_API_ROADMAP.md § 3.10](../MVP_API_ROADMAP.md) ·
Depende de: Fase 2B — Atribuições

---

## Escopo

A visão de Admin sobre todas as atribuições da equipe, filtrável e paginada.

Um endpoint, **nenhum módulo novo**, **nenhuma migration**. Amplia `assignments`.

**Não entra:** reunião (3A), ranking (3B), dashboards (3D), badges (3E).

### Por que é entrega própria e não parte de 3A

Ela é pequena e independente das outras quatro: não olha para reunião, não olha para
ranking, não precisa de nada que a 2B já não tenha entregado. Pode ser feita em paralelo
com 3A e 3B por outra pessoa, ou encaixada num intervalo. Colá-la em 3A só faria o commit
de reunião crescer sem motivo.

O que **depende** dela é a 3D: o bloco `recentAssignments` do dashboard do Admin (§ 3.9)
é esta consulta com `limit` pequeno e sem filtro.

---

## Decisões tomadas

### A rota completa a família que a 2B abriu

A 2B entregou `GET /members/{id}/kpi-assignments` — o histórico **de um membro**. O
§ 3.10 pede `GET /kpi-assignments` — o histórico **de todo mundo**, com `userId` como um
filtro entre outros.

As duas ficam. A primeira é a aba de um membro na tela administrativa e tem o id no
caminho, onde ele pertence. A segunda é a tela de auditoria, onde `userId` é opcional e
combinável com `kpiId`, `category` e intervalo de data. Colapsar as duas transformaria o
recurso `membro` num query param e quebraria uma rota já entregue e já no Postman.

O service compartilha a filtragem; a duplicação é de rota, não de lógica — mesma leitura
que a 2C registrou para `/me/score` e `/me/kpis/summary`.

### Paginada, no shape de `GET /members`

```
items, page, limit, total, totalPages
```

`page` padrão 1, `limit` padrão 20, teto 100 — os mesmos números e o mesmo
`z.preprocess(emptyAsUndefined, …)` de `listMembersInputSchema`. Dois shapes de paginação
na mesma API seria escolha do cliente virar adivinhação.

A tabela cresce sem teto: uma linha por reconhecimento, mais uma por membro por reunião.
Uma rota de auditoria sem paginação é uma decisão adiada, não uma decisão evitada — e o
§ 3.10 é justamente a rota que alguém vai abrir pedindo "o ano inteiro".

`GET /members/{id}/kpi-assignments` da 2B **não** ganha paginação nesta entrega. É o
histórico de uma pessoa, limitado pelo que uma pessoa recebe, e mudar o shape de uma
resposta já entregue por simetria quebraria cliente sem resolver problema.

### A entrada do histórico carrega o membro; a da 2B não

`kpiAssignmentSchema` da 2B tem `userId` e o KPI embutido, e é o que
`POST /kpi-assignments`, `/bulk` e `DELETE` devolvem. Ele fica **intacto**.

O histórico geral lista pessoas diferentes em linhas seguidas e precisa do nome:

```ts
export const assignmentHistoryItemSchema = kpiAssignmentSchema.extend({
  user: z.object({
    id: z.string(),
    name: z.string(),
    position: z.string().nullable(),
  }),
});
```

Estender em vez de alterar o schema base é o que evita que `POST /kpi-assignments/bulk`
pague um join por linha para devolver um nome que a tela que acabou de mandar a lista já
tem.

`assignedBy` continua como id cru, sem nome. RB07 pede o registro de quem atribuiu, e
hoje só existe um Admin — "Múltiplos Admins" está no § 12, fora do escopo do MVP. Embutir
o nome do único Admin em toda linha é join por nada.

### `from` e `to` são dias inclusivos nas duas pontas

`from=2026-08-01&to=2026-08-31` traz o mês inteiro, incluindo o que aconteceu às 23h59 do
dia 31.

```
assignedAt >= from 00:00:00   (America/Sao_Paulo)
assignedAt <  to+1d 00:00:00
```

O exemplo do roadmap é `from=2026-08-01&to=2026-08-30` para "agosto". Um `to` exclusivo
faria a consulta perder o último dia calado, que é o defeito clássico de filtro de data
e o mais difícil de notar em revisão.

O fuso é o mesmo `America/Sao_Paulo` de `shared/time/timezone.ts`, e a conversão de dia
para instante usa `dayStart`/`dayEnd` de lá em vez de reimplementar. Esse arquivo é criado
por quem chegar primeiro — esta entrega ou a 3B, que o consome em
`shared/ranking/periods.ts` — e é por isso que as duas podem ser feitas em qualquer ordem.

`from` sem `to` e `to` sem `from` são válidos; `to` anterior a `from` é rejeitado pelo
schema.

### `revoked` entra, apesar de o roadmap não pedir

O § 3.10 lista `userId`, `kpiId`, `category`, `from`, `to`. `revoked` entra porque a 2B
já o entregou em `GET /members/{id}/kpi-assignments` com `booleanFromQuery`, e a tela de
auditoria é onde a pergunta "o que foi revogado neste mês" nasce.

Padrão sem filtro: traz **tudo**, revogadas marcadas por `revokedAt`. Esconder revogação
por padrão numa rota de auditoria seria esconder exatamente o que ela existe para mostrar.

### `meetingId` vira filtro quando a 3A existir

O § 3.11 pede que o Admin veja "KPIs atribuídos durante a reunião", e a 3A resolve isso
dentro de `GET /meetings/{id}`, que já embute os assignments.

Um filtro `meetingId` aqui seria o mesmo dado por outra porta. Fica de fora até alguém
precisar cruzar reunião com intervalo de data — e aí é um `where` a mais, sem migration.

---

## Sem migration

Nada muda no schema. `kpi_assignment` já tem `points`, `revokedAt` e `assignedAt` desde a
2B, e `@@index([userId])`, `@@index([kpiId])` e `@@index([assignedBy])` já existem.

Índice novo em `assignedAt` **não** entra. A ordenação é por `assignedAt` decrescente e
poderia querer um, mas a tabela está vazia e a 2B já registrou a regra da casa: índice
entra com plano de query na mão, não por precaução. Fica anotado como a primeira coisa a
olhar se a rota ficar lenta.

---

## Módulo: dentro de `assignments`

```
packages/api/src/modules/assignments/
├── assignments.router.ts       # + list
├── assignments.service.ts      # + list
├── assignments.repository.ts   # + list paginado com join de user
├── assignments.schema.ts       # + assignmentHistoryItemSchema, + input
├── assignments.mapper.ts
├── assignments.errors.ts       # inalterado
└── index.ts
```

Nenhum arquivo novo, nenhum módulo novo, nenhuma linha no `group` do `biome.json`.

---

## Endpoint

```http
GET /kpi-assignments?userId=...&category=PERFORMANCE&from=2026-08-01&to=2026-08-31&page=1&limit=20
```

`adminProcedure`. § 3.10 diz "apenas Admin", e a resposta cruza membros — é o oposto do
recorte de privacidade que o § 1.5 define para MEMBER.

```json
{
  "items": [
    {
      "id": "...",
      "kpiId": "...",
      "userId": "...",
      "assignedBy": "...",
      "meetingId": null,
      "note": "Excelente apresentação",
      "points": 25,
      "assignedAt": "2026-08-30T14:12:00.000Z",
      "revokedAt": null,
      "kpi": { "id": "...", "name": "Resolveu bug crítico", "category": "PERFORMANCE" },
      "user": { "id": "...", "name": "João", "position": "Dev" }
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 142,
  "totalPages": 8
}
```

| Filtro | Tipo | Padrão |
| --- | --- | --- |
| `userId` | uuid | todos |
| `kpiId` | uuid | todos |
| `category` | `kpiCategorySchema` | todas |
| `from` | `YYYY-MM-DD` | sem limite |
| `to` | `YYYY-MM-DD` | sem limite |
| `revoked` | boolean | ambos |
| `page` | int ≥ 1 | 1 |
| `limit` | int 1–100 | 20 |

Todos combináveis. Ordenado por `assignedAt` decrescente, desempate por `id` — sem o
segundo critério, duas atribuições em massa criadas no mesmo instante podem trocar de
página entre duas requisições e uma delas some da listagem.

`userId` de membro inexistente devolve lista vazia com `total: 0`, não `404`. É filtro,
não recurso: `GET /members/{id}/kpi-assignments` tem o id no caminho e é lá que 404 faz
sentido.

---

## Erros

Nenhum erro de domínio novo. Toda validação é de schema:

| Situação | Resposta |
| --- | --- |
| `userId` ou `kpiId` que não é uuid | 400, Zod |
| `category` fora do enum | 400, Zod |
| `from` ou `to` fora de `YYYY-MM-DD` | 400, Zod |
| `to` anterior a `from` | 400, Zod (`refine`) |
| `limit` acima de 100 | 400, Zod |

---

## Tasks

| # | Task | Depende de |
| --- | --- | --- |
| 0 | `shared/time/timezone.ts` — só se a 3B ainda não o tiver criado | — |
| 1 | `assignments.schema.ts` — `assignmentHistoryItemSchema` e input de listagem | — |
| 2 | `assignments.repository.ts` — `list` paginado com join de `user` | 1 |
| 3 | `assignments.service.ts` — `list` | 2 |
| 4 | `assignments.router.ts` — `GET /kpi-assignments` | 3 |
| 5 | Testes de service (repository mockado) | 3 |
| 6 | Testes de router (contrato, filtros e autorização) | 4 |
| 7 | Requisição no Postman, na pasta de atribuições que a 2B criou | 4 |

---

## Testes

**Listagem**
- ordenada por `assignedAt` decrescente, desempate por `id`
- traz `user` com nome e cargo, e o KPI embutido
- traz revogadas e não revogadas por padrão
- lista vazia devolve `items: []`, `total: 0`, `totalPages: 0`

**Filtros**
- `userId` restringe a um membro
- `kpiId` restringe a um KPI
- `category` restringe à categoria
- `revoked=true` traz só as revogadas; `revoked=false`, só as válidas
- filtros combinados aplicam todos, não o último
- `userId` inexistente devolve lista vazia, não 404

**Datas**
- `from` inclui o dia inteiro a partir de 00:00
- `to` inclui o dia inteiro até 23:59:59 — atribuição às 23h do `to` aparece
- `from` sem `to` e `to` sem `from` funcionam
- `to` anterior a `from` é rejeitado pelo schema
- a conversão de dia para instante usa `dayStart`/`dayEnd` de `shared/time/timezone.ts`

**Paginação**
- `total` e `totalPages` corretos
- `limit` padrão 20 e teto 100
- página além do fim devolve lista vazia, não erro
- a mesma consulta em duas páginas não repete nem perde linha

**Autorização**
- anônimo → 401, MEMBER → 403, ADMIN → passa
- o service não é alcançado quando a guarda barra

---

## Critérios de aceite

- [ ] Admin lista todas as atribuições
- [ ] Filtro por membro funciona
- [ ] Filtro por KPI funciona
- [ ] Filtro por categoria funciona
- [ ] Filtro por intervalo de datas funciona, inclusivo nas duas pontas
- [ ] Filtro por revogação funciona
- [ ] Filtros combinados funcionam juntos
- [ ] Paginação funciona no mesmo shape de `GET /members`
- [ ] Cada linha traz o nome do membro
- [ ] `GET /members/{id}/kpi-assignments` da 2B continua funcionando como antes
- [ ] MEMBER recebe 403

---

## Consequências registradas

**Duas rotas de histórico convivem.** `GET /kpi-assignments` e
`GET /members/{id}/kpi-assignments`. A segunda não é paginada e a primeira é; a segunda
não traz `user` e a primeira traz. A diferença é intencional e está justificada acima,
mas quem só olhar a lista de rotas vai achar redundante.

**Sem índice em `assignedAt`.** A ordenação padrão da rota não tem índice dedicado. Com a
tabela vazia é irrelevante; é a primeira coisa a olhar se a auditoria ficar lenta em
volume real.

**Nenhuma tela do front consome isso hoje.** O mock não tem tela de auditoria de
atribuições — `apps/web/src/lib/activity-feed.ts` monta um feed sobre `mocks/activity.ts`.
Esta rota é a fonte real daquele feed, e a 3D a reusa em `recentAssignments`. A migração
do front é story de web.
