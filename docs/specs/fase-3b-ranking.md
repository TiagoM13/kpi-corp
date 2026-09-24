# Spec — Fase 3B: Ranking

**Fase:** 3 · **Status:** entregue · **Data:** 2026-09-08 · **Entregue em:** 2026-09-23

Referência: [MVP_API_ROADMAP.md § 3.7](../MVP_API_ROADMAP.md) ·
Depende de: Fase 2B — Atribuições

---

## Escopo

O ranking da equipe por período, com desempate determinístico, destaque do usuário
autenticado e variação de posição em relação ao período anterior.

Um endpoint, um módulo novo, uma regra pura em `shared/`, uma migration.

**Não entra:** reunião (3A), histórico de atribuições (3C), dashboards (3D), badges de
pódio (3E). A 3D e a 3E consomem a regra pura que esta entrega cria.

### Por que 3B não depende de 3A

Ranking é soma de atribuição por janela de tempo. `kpi_assignment` já tem `points`,
`revokedAt` e `assignedAt` desde a 2B — nada no ranking olha para reunião. As duas
entregas podem ser feitas na ordem que for; a numeração segue o § 5 do roadmap, que lista
`Ranking` depois de `Meetings`.

---

## Decisões tomadas

### A ordenação é função pura em `shared/`, o dado é de quem pergunta

```
shared/ranking/rank.ts        ordena e numera — sem Prisma, sem módulo
modules/ranking/*.repository  carrega as linhas do período e chama rank()
modules/profile/*.repository  carrega as linhas dele e chama a mesma rank()
```

A 3E precisa saber se um membro está no top 3 para avaliar `TOP_THREE` e
`PODIUM_STREAK`, e badge mora em `profile` — decisão da 2D. Módulo não importa módulo,
então ou a regra vai para `shared/`, ou a ordenação e o desempate passam a existir em
dois lugares e divergem na primeira mudança.

`shared/` hoje não tem Prisma e continua sem: `rank()` recebe um array já carregado e
devolve um array ordenado e numerado. É testável sem banco, como `levels.ts` da 2C.

```ts
type RankableRow = {
  userId: string;
  name: string;
  points: number;
  kpiCount: number;
};

type RankedRow = RankableRow & { position: number };

rank(rows: RankableRow[]): RankedRow[]
```

### Desempate em três níveis, posição sequencial

```
1. points     DESC
2. kpiCount   DESC
3. name       ASC  (pt-BR, Intl.Collator)
```

O roadmap § 3.7 dá os dois primeiros e para. Dois critérios não bastam: dois membros com
a mesma pontuação e a mesma contagem sairiam em ordem indefinida, e a posição de cada um
mudaria entre duas requisições idênticas. Ranking que troca de ordem sozinho não é
ranking.

O terceiro critério é **nome**, e não `createdAt`, porque é o único visível na tela. O
usuário que empatou consegue explicar por que ficou atrás; antiguidade de conta não
explica nada para quem olha.

`Intl.Collator("pt-BR")` e não `<` de string: `Ávila` precisa cair antes de `Bueno`, e a
comparação por code point coloca todo acento no fim. É o mesmo `localeCompare("pt-BR")`
que `apps/web/src/lib/ranking.ts` já usa, então a ordem que a tela mostra hoje não muda
de comportamento ao sair do mock.

Empate absoluto recebe **posições sequenciais** (1, 2, 3), não compartilhadas (1, 2, 2,
4). Posição compartilhada tornaria `TOP_THREE` ambíguo — quatro pessoas empatadas em
terceiro são quatro pessoas no pódio de três lugares — e a 3E precisa de uma resposta
única para "está no top 3".

### Todo usuário ativo entra, ADMIN incluído

Filtro de participação: `user.active = true`. Nada além disso.

Admin entra porque o PRD § 6 diz que Admin também acumula KPI. Excluí-lo criaria um
ranking que não bate com a soma das atribuições e um Admin que pontua sem aparecer.

Membro sem nenhuma atribuição no período aparece com `points: 0` e `kpiCount: 0`. O
ranking é da equipe, não dos premiados — e a última posição com zero é a informação que
o § 3.9 usa para o bloco *membros sem KPIs*.

Membro desativado sai do ranking inteiro, inclusive dos períodos passados em que pontuou.
É a mesma regra que a 2C aplicou ao perfil público, e a alternativa — manter no ranking
quem não está mais na equipe — descreveria um time que não existe.

### Pontuação é a mesma da 2C, recortada por janela

```
WHERE revokedAt IS NULL
  AND assignedAt >= janela.inicio
  AND assignedAt <  janela.fim
SUM(points), COUNT(*)
```

Sem filtro de `points > 0`. A 2D filtra positivos para **badge**, porque punição não deve
avançar conquista; ranking é pontuação, e pontuação negativa subtrai. RB10.

`kpiCount` conta toda atribuição válida da janela, inclusive as de pontuação negativa se
existirem. É contagem de eventos, não de elogios.

### As janelas são de calendário, no fuso de São Paulo

| Período | Janela |
| --- | --- |
| `week` | semana ISO — segunda 00:00 até a segunda seguinte |
| `month` | mês do calendário |
| `quarter` | trimestre do calendário |
| `all` | sem janela |

Fuso `America/Sao_Paulo`, constante em `shared/time/`, não variável de ambiente — pelo
mesmo motivo que a 2D fixou o fuso do streak: mudar de fuso reescreveria o passado, o que
não é configuração.

O fuso mora em `shared/time/` e não em `shared/ranking/` porque a 3C precisa dele sem
precisar de ranking: converter `from=2026-08-01` no instante certo é a mesma operação, e é
o que permite que as duas entregas sejam feitas em qualquer ordem. Quem chegar primeiro
cria o arquivo.

A 2D fixou o mesmo fuso dentro de `profile.badges.ts`. A 3E o faz importar daqui — duas
constantes com o mesmo valor são duas constantes que podem divergir.

Semana ISO começa na segunda, igual à 2D. Duas definições de semana no mesmo produto —
uma para streak, outra para ranking — seria defeito esperando acontecer.

### `quarter` é do Admin, e a recusa é regra de negócio

O roadmap § 3.7 dá quatro períodos ao Admin e três ao Member. `quarter` pedido por MEMBER
responde `403 PERIOD_NOT_ALLOWED`.

A guarda **não** vai na procedure. `packages/api/CLAUDE.md` manda o guard de perfil ficar
na procedure, e é disso que se trata: guard de **perfil**. Aqui a rota é permitida para
os dois papéis e o que muda é o valor aceito num campo — isso é regra de negócio, mora no
service, e sai como `DomainError` com status `FORBIDDEN`, igual a qualquer outra.

A rota é `protectedProcedure`: o ranking é público dentro da equipe desde o § 1.5, que já
expõe nome, cargo, nível e pontos de todo mundo para todo mundo.

### `change` sai de snapshot, materializado na leitura

`change` é a variação de posição contra o mesmo período anterior — a seta que
`apps/web/src/lib/ranking.ts` já mostra como `rankChange`.

Não dá para derivar: a posição de alguém na semana passada depende de quem estava ativo
naquela semana, e reconstruir isso a cada leitura significaria recalcular o ranking
inteiro de um período que não muda mais. Vira tabela.

```prisma
ranking_snapshot(period, periodStart, userId, position, points, kpiCount)
```

**A tabela é preenchida na leitura, não por job.** O projeto não tem scheduler — sem CI,
sem deploy, desenvolvimento local — e a 2D já resolveu exatamente este problema com
exatamente esta forma: *"o carimbo acontece na leitura, não num gatilho no fluxo de
atribuição"*.

```
GET /ranking?period=week
  ↓
janela atual = semana corrente        → nunca vira snapshot
janela anterior = semana passada      → já fechou, pode congelar
  ↓
existe snapshot dela?  não  → calcula, grava com skipDuplicates
  ↓
change = posiçãoNoSnapshot - posiçãoAgora
```

**Só janela fechada é congelada.** A corrente ainda muda; congelá-la produziria um
snapshot mentiroso e um `change` sempre zero.

**Janela sem nenhuma atribuição não vira snapshot.** Uma semana em que a equipe inteira
ficou em zero ordenaria todo mundo por nome, e a semana seguinte mostraria uma variação
que descreve o alfabeto, não desempenho. Sem snapshot, `change` vem `null`.

**A materialização anda para trás até encontrar snapshot, com teto de 12 janelas.** Se
ninguém abriu o ranking por três semanas, a leitura seguinte congela as três de uma vez.
Sem isso, uma janela que ninguém leu some para sempre e o `change` da seguinte fica
`null` sem motivo aparente. O teto existe para que a primeira leitura de um banco antigo
não vire uma requisição de trinta segundos.

`change` positivo é subida — quem saiu do 5º para o 2º tem `change: 3`. Usuário que não
aparece no snapshot anterior — entrou na equipe depois, ou a janela não tem snapshot —
recebe `change: null`, não `0`. Zero é "não mudou de posição" e é uma afirmação
diferente de "não sei".

`period=all` tem `change: null` sempre: não existe "o all anterior".

### `position` é colocação; o cargo fica aninhado

`User.position` é o **cargo** em todo o resto da API — `memberSchema` da Fase 1,
`memberBaseSchema` da 2C. O roadmap § 3.7 usa `position` para **colocação**. Os dois
nomes colidem numa entrada de ranking, que precisa dos dois dados.

O aninhamento resolve sem renomear nada:

```
entry.position         colocação
entry.member.position  cargo
```

É a mesma forma que `RankingEntry` do front já tem (`{ member, place, points, change }`)
e reusa `memberBaseSchema` da 2C — `{ id, name, position, role }` — em vez de inventar um
terceiro shape de membro.

---

## Migration

```prisma
model RankingSnapshot {
  id          String        @id @default(uuid()) @db.Uuid
  period      RankingPeriod
  periodStart DateTime      @db.Date
  userId      String        @db.Uuid
  position    Int
  points      Int
  kpiCount    Int
  createdAt   DateTime      @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([period, periodStart, userId])
  @@index([period, periodStart])
  @@map("ranking_snapshot")
}

enum RankingPeriod {
  WEEK
  MONTH
  QUARTER

  @@map("ranking_period")
}
```

`ALL` **não** está no enum. Não existe janela anterior a "tudo", então não existe
snapshot de `all` — deixá-lo no enum seria abrir um estado que nenhum código pode
preencher.

`@@unique([period, periodStart, userId])` é o que torna a gravação segura sob
`createMany({ skipDuplicates: true })`: duas leituras simultâneas depois da virada da
semana não podem duplicar linha nem estourar. Mesma mecânica que a 2D usa para
`user_badge`.

`periodStart` é `@db.Date` e não `DateTime`: a chave é o dia de início da janela no fuso
de São Paulo. Guardar instante convidaria dois snapshots da mesma semana com milissegundos
diferentes.

`onDelete: Cascade` acompanha `refresh_token`, que já é assim. O produto não apaga
usuário — desativa —, mas se um dia apagar, snapshot órfão não é histórico, é lixo.

---

## Regra pura nova: `shared/ranking/`

```
packages/api/src/shared/time/
├── timezone.ts    # TIMEZONE, dayStart(dia), dayEnd(dia)
└── index.ts

packages/api/src/shared/ranking/
├── rank.ts        # ordenação, desempate e numeração — função pura
├── periods.ts     # janelas de calendário, sobre shared/time
└── index.ts
```

`shared/` não conhece módulo nenhum e continua sem Prisma. `src/tests/architecture.test.ts`
já cobra as duas coisas.

`periods.ts` expõe `windowOf(period, at)` → `{ start, end }` e `previousWindow(period,
window)`. A 3D usa `windowOf("week", now)` e `windowOf("month", now)` para os contadores
do dashboard do Admin, e a 3E usa `windowOf("month", …)` para `PERFECT_MONTH` e
`PODIUM_STREAK` — é por isso que a janela sai do módulo junto com a ordenação.

---

## Módulo novo: `ranking`

```
packages/api/src/modules/ranking/
├── ranking.router.ts
├── ranking.service.ts      # janelas, snapshot, change
├── ranking.repository.ts   # agregação + leitura e gravação de ranking_snapshot
├── ranking.schema.ts
├── ranking.mapper.ts
├── ranking.errors.ts
└── index.ts
```

Entra no `group` do `biome.json`; o teste de arquitetura cobra.

---

## Endpoint

```http
GET /ranking?period=month
```

`protectedProcedure`. `period` aceita `week`, `month`, `quarter`, `all`, padrão `all`.

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

`periodStart` e `periodEnd` vêm `null` quando `period=all`.

`isMe` resolve o "membro autenticado deve poder ser identificado/destacado" do § 3.7 sem
que a tela precise comparar ids. O bloco `me` existe além dele porque a tela de membro
mostra "você está em 4º" num cabeçalho, longe da lista, e varrer o array para achar a
própria linha é trabalho que o servidor já fez.

`me` é `null` quando o usuário autenticado não está no ranking — Admin desativado lendo o
próprio ranking é o único caminho, e é melhor `null` do que uma posição inventada.

**Sem paginação.** O ranking é da equipe inteira e o produto é de squad; o mock tem menos
de dez membros e o § 3.8 precisa da posição de qualquer um. Paginar obrigaria a tela a
percorrer páginas para achar o próprio nome. Se a equipe crescer a ponto de doer, a
conversa é sobre `limit` com `me` sempre presente — que a resposta já sustenta.

---

## Erros

| Erro | `code` | HTTP |
| --- | --- | --- |
| `PeriodNotAllowedError` | `PERIOD_NOT_ALLOWED` | 403 |

Único erro de domínio do módulo. `period` fora do enum é rejeitado pelo Zod, antes do
service.

---

## Tasks

| # | Task | Depende de |
| --- | --- | --- |
| 1 | `shared/ranking/periods.ts` — janelas e janela anterior | — |
| 2 | Testes de `periods.ts` | 1 |
| 3 | `shared/ranking/rank.ts` — ordenação, desempate, numeração | — |
| 4 | Testes de `rank.ts` | 3 |
| 5 | Migration: `ranking_snapshot` + enum `RankingPeriod` | — |
| 6 | `ranking.errors.ts`, `ranking.schema.ts`, `ranking.mapper.ts` | 5 |
| 7 | `ranking.repository.ts` — agregação e snapshot | 5, 6 |
| 8 | `ranking.service.ts` — materialização e `change` | 1, 3, 7 |
| 9 | `ranking.router.ts` + registro em `routers/index.ts` + `group` do `biome.json` | 8 |
| 10 | Testes de service (repository mockado) | 8 |
| 11 | Testes de router (contrato e autorização) | 9 |
| 12 | Pasta de ranking na collection do Postman | 9 |

As tasks 1 a 4 vêm primeiro pelo mesmo motivo que `profile.levels.ts` veio primeiro na
2C: são funções puras, sem banco e sem service, e concentram os casos de borda — virada
de ano na semana ISO, empate triplo, colação com acento. Fechá-las antes torna o resto
mecânico.

---

## Testes

**Janelas** (`periods.ts`, função pura)
- semana ISO começa na segunda e termina no domingo, fuso de São Paulo
- 1º de janeiro que cai no domingo pertence à semana ISO do ano anterior
- `previousWindow` da primeira semana do ano é a última do ano anterior
- mês e trimestre são de calendário
- `all` não tem janela nem janela anterior
- horário de verão não desloca o início da semana (o fuso não tem DST hoje; o teste trava o comportamento)

**Ordenação** (`rank.ts`, função pura)
- ordena por pontos decrescente
- empate de pontos desempata por `kpiCount` decrescente
- empate de pontos e contagem desempata por nome, com acento na posição certa em pt-BR
- empate absoluto recebe posições sequenciais, nunca compartilhadas
- lista vazia devolve lista vazia
- a mesma entrada em ordem embaralhada produz o mesmo resultado

**Pontuação por janela**
- soma só atribuições com `revokedAt IS NULL`
- atribuição fora da janela não conta
- `assignedAt` no instante exato do início da janela conta; no fim, não
- atribuição de pontuação negativa subtrai e ainda assim conta em `kpiCount`
- `period=all` ignora janela

**Participação**
- todo usuário ativo aparece, inclusive ADMIN
- usuário sem atribuição aparece com 0 e 0
- usuário desativado não aparece, mesmo tendo pontuado na janela

**Snapshot e `change`**
- leitura congela a janela anterior e **não** a corrente
- segunda leitura na mesma janela não regrava — `skipDuplicates` segura
- janela anterior sem nenhuma atribuição não vira snapshot, e `change` vem `null`
- `change` positivo quando a posição melhorou, negativo quando piorou, `0` quando igual
- usuário ausente do snapshot anterior recebe `change: null`, não `0`
- `period=all` nunca grava snapshot e sempre devolve `change: null`
- três janelas sem leitura são materializadas de uma vez na leitura seguinte
- a materialização para no teto de 12 janelas

**Autorização e período**
- anônimo → 401
- MEMBER: `week`, `month` e `all` passam
- MEMBER: `quarter` → `PERIOD_NOT_ALLOWED`, 403
- ADMIN: os quatro passam
- `period` fora do enum é rejeitado pelo schema, antes do service

**Contrato**
- `isMe` marca exatamente uma entrada, a do usuário autenticado
- `me` bate com a entrada marcada por `isMe`
- `entry.position` é colocação e `entry.member.position` é cargo, na mesma resposta

---

## Critérios de aceite

- [x] Ranking semanal funciona
- [x] Ranking mensal funciona
- [x] Ranking trimestral funciona, só para ADMIN
- [x] Ranking total funciona
- [x] Critério de desempate funciona, nos três níveis
- [x] Ordem é estável entre duas requisições idênticas
- [x] Membro autenticado é identificável na resposta
- [x] Variação de posição contra o período anterior funciona
- [x] Snapshot só é gravado para período já fechado
- [x] Duas leituras simultâneas não duplicam snapshot
- [x] MEMBER recebe 403 ao pedir `quarter`
- [x] Usuário desativado não aparece no ranking
- [x] `shared/ranking/` não importa nada de `modules/`

---

## Consequências registradas

**`ranking_snapshot` serve `change` e nada mais.** A 3E não a usa: `TOP_THREE` e
`PODIUM_STREAK` calculam ao vivo com `rank()`, porque a existência de um snapshot depende
de alguém ter aberto a tela de ranking, e conquista não pode depender de tráfego de
leitura. A tabela é cache de uma informação cosmética; a badge é regra de domínio.

**A materialização preguiçosa tem um teto e, com ele, um limite.** Um banco parado por
mais de 12 janelas perde as mais antigas para sempre. Não importa: `change` só olha a
janela imediatamente anterior, e nada mais lê a tabela. Se um dia um relatório histórico
precisar da série completa, aí sim entra job — e o projeto vai precisar de scheduler para
outras coisas antes disso.

**Roadmap § 3.7 fica desatualizado em dois pontos.** O exemplo mostra a entrada plana com
`userId` e `name`; esta spec aninha o membro para resolver a colisão de `position`. E o
roadmap não menciona `change`, `isMe` nem o bloco `me`. Sem atualização, ficam dois
documentos discordando — o mesmo problema que a 2A teve com as categorias e a 2C com as
faixas.

**`apps/web/src/lib/ranking.ts` fica em conflito.** Ele calcula ranking sobre
`MOCK_MEMBERS` com três períodos, `place` em vez de `position` e um `change` que vem do
mock. A reescrita é story de web e o front continua no mock até ela acontecer.

**Não há ranking por categoria.** O roadmap não pede e nenhuma tela mostra. É `groupBy`
com mais uma coluna quando virar requisito, sem migration.

---

## Notas da entrega

**Sem desvio de contrato.** Endpoint, shape, erros, migration e regras saíram como escritos.

- `windowOf` teve o ternário aninhado trocado pela função `startDayOf`, pela regra do
  repositório de não aninhar ternário. Comportamento idêntico, testes inalterados.
- Testes puros em `src/tests/shared/ranking/` (`periods`, `rank`); service e router em
  `src/tests/modules/ranking/`. "Usuário desativado não aparece" é garantido pelo `where
  active: true` do repository — a suíte não tem banco, e o caso foi validado contra o
  Postgres local.
