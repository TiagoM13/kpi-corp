# Spec — Fase 3D: Dashboards

**Fase:** 3 · **Status:** entregue · **Data:** 2026-09-08 · **Entregue em:** 2026-09-23

Referência: [MVP_API_ROADMAP.md § 3.8 e § 3.9](../MVP_API_ROADMAP.md) ·
Depende de: Fase 3A — Reuniões · Fase 3B — Ranking · Fase 3C — Histórico de atribuições

---

## Escopo

Os dois endpoints agregadores que a tela inicial de cada papel consome: o dashboard do
membro e o dashboard do Admin.

Duas rotas, um módulo novo, um refactor em código já entregue, **nenhuma migration**.

**Não entra:** badges (3E). O dashboard do membro não mostra badge — o § 3.8 não pede e o
perfil da 2C/2D já é o lugar delas.

### Por que 3D vem por último entre as rotas

Ela não produz dado nenhum: lê o que 3A, 3B e 3C produziram e junta. O dashboard do Admin
conta reuniões da semana (3A), embute o ranking (3B) e lista as últimas atribuições (3C).
Feito antes, seria três blocos vazios.

---

## Decisões tomadas

### `profile.levels.ts` muda de casa

```
modules/profile/profile.levels.ts  →  shared/gamification/levels.ts
```

`GET /dashboard/member` devolve `level`, e a regra dos níveis mora hoje dentro do módulo
`profile`. Módulo não importa módulo — `biome.json` e `src/tests/architecture.test.ts`
cobram —, então ou a regra sai de lá, ou os 21 limiares passam a existir em dois arquivos.

É a mesma solução que a 3B deu à ordenação do ranking, pelo mesmo motivo e com o mesmo
custo: função pura, zero Prisma, `shared/` continua sem conhecer módulo nenhum.

O refactor é mecânico. `LEVEL_THRESHOLDS`, `tierFor`, `levelFor` e os tipos `LevelTier` e
`LevelInfo` mudam de arquivo sem mudar de conteúdo. `profile.service.ts` passa a importar
de `shared/gamification`. `src/tests/modules/profile/levels.test.ts` vira
`src/tests/shared/gamification/levels.test.ts` — **os casos não mudam**, e é isso que
prova que o refactor não alterou comportamento.

`levelTierSchema` do Zod fica onde está, em `profile.schema.ts`, e é redeclarado em
`dashboard.schema.ts`. Schema de output é contrato de rota, e cada módulo declara o seu —
o mesmo tratamento que `kpiCategorySchema` já recebe hoje em `assignments` e em `profile`.

### O dashboard tem repository próprio

`modules/dashboard/dashboard.repository.ts` fala com Prisma direto: conta membros ativos,
soma atribuições por janela, conta reuniões, carrega as linhas do ranking, lista as
últimas atribuições.

Não chama `rankingService`, `profileService` nem `assignmentsService`. Chama
`shared/ranking/rank.ts`, `shared/ranking/periods.ts` e `shared/gamification/levels.ts` —
as três regras puras — sobre as linhas que carregou.

É a terceira aplicação da mesma regra nesta fase, e a razão de as três terem ido para
`shared/`: quando o quarto consumidor aparece, ele também só precisa carregar linha.

### Uma requisição, uma resposta — mas não um cache

O § 3.8 é explícito: *"evitar que o frontend precise executar várias requisições para
obter informações que pertencem ao mesmo contexto"*. As duas rotas fazem várias consultas
ao banco e devolvem um objeto só.

O que elas **não** fazem é guardar resultado. Sem cache, sem tabela de agregado, sem
coluna desnormalizada. Toda a Fase 2 foi construída sobre "pontuação é derivada, nunca
guardada" — a 2C rejeitou coluna de nível pelo mesmo argumento — e um dashboard com
número velho é pior do que um dashboard lento.

Se o custo doer com volume real, a conversa é sobre cache com TTL curto na borda, não
sobre desnormalizar o modelo.

### As janelas do Admin são de calendário, não "últimos N dias"

O § 3.9 pede "KPIs atribuídos na semana" e "no mês". São a semana ISO corrente e o mês
corrente de `shared/ranking/periods.ts` — não os últimos 7 e 30 dias corridos.

"Na semana" numa tela de gestão significa a semana em curso: na segunda de manhã o
contador zera, e é isso que responde "como estamos indo esta semana". Uma janela deslizante
de sete dias nunca zera e não responde pergunta nenhuma.

Reusar `periods.ts` da 3B garante que o "mês" do dashboard e o "mês" do ranking sejam o
mesmo mês. Duas definições de mês na mesma tela seria defeito de confiança.

### `membersWithoutKpis` são 30 dias corridos, e aqui a janela é deslizante

A exceção da regra anterior, e de propósito. O § 3.9 pede "membros sem KPIs nos últimos
30 dias" — é uma pergunta sobre **quanto tempo se passou**, não sobre um período de
calendário. Alguém sem reconhecimento desde 2 de agosto continua abandonado no dia 1º de
setembro, e uma janela de calendário zeraria o alerta na virada do mês exatamente quando
ele fica mais grave.

Critério: usuário `active = true` sem nenhuma atribuição com `revokedAt IS NULL` nos
últimos 30 dias. Cada linha traz `lastAssignmentAt` — `null` para quem nunca recebeu
nada — e `daysWithout`, para a tela ordenar pelo caso mais grave sem recalcular data.

Quem nunca recebeu nada entra na lista com `daysWithout` contado a partir do `createdAt`
da conta. Um membro criado ontem não aparece; um criado há dois meses e nunca reconhecido
é o caso mais importante da lista inteira.

### `rankingPosition` do membro é do período `all`; o ranking do Admin é do mês

Duas perguntas diferentes na mesma fase.

O § 3.8 mostra `"rankingPosition": 4` sem período, e a posição que o membro carrega como
identidade é a geral — é o que `overallPositionOf` do front usa hoje. Período `all`.

O § 3.9 embute `ranking` no dashboard do Admin, ao lado de contadores de semana e de mês.
Ali a pergunta é "quem está indo bem **agora**", e um ranking `all` colocaria sempre os
mesmos nomes no topo, independentemente do que aconteceu. Período `month`, top 5.

Top 5 e não a lista inteira: é um bloco de dashboard com link para a tela de ranking, e a
3B entrega o ranking completo em `GET /ranking`. Devolver a equipe inteira para renderizar
cinco linhas é desperdício.

### Nenhum dos dois grava snapshot de ranking

A materialização preguiçosa da 3B mora em `rankingService`. O dashboard usa `rank()`
direto, sem passar por lá, e por isso **não** congela janela nenhuma e **não** devolve
`change`.

Deliberado. Gravar snapshot a partir de duas rotas diferentes duplicaria a lógica de
"qual janela já fechou" — a parte com mais caso de borda da 3B — e o dashboard não mostra
seta de variação em lugar nenhum.

---

## Sem migration

Nada muda no schema. Tudo é agregação sobre `user`, `kpi_assignment`, `meeting` e
`meeting_attendee`, que 3A e 2B já deixaram prontos.

---

## Refactor: `shared/gamification/`

```
packages/api/src/shared/gamification/
├── levels.ts     # movido de modules/profile/profile.levels.ts, sem alteração
└── index.ts
```

E, do lado que perde o arquivo:

```
modules/profile/
├── profile.levels.ts   ← removido
├── profile.service.ts  ← importa de shared/gamification
└── profile.badges.ts   ← a 2D já entregou; inalterado
```

O teste de arquitetura continua verde: `shared/gamification/` não importa nada de
`modules/`, e `profile` importando de `shared/` sempre foi permitido.

---

## Módulo novo: `dashboard`

```
packages/api/src/modules/dashboard/
├── dashboard.router.ts
├── dashboard.service.ts      # monta os dois agregados
├── dashboard.repository.ts   # contagens, somas e listagens
├── dashboard.schema.ts
├── dashboard.mapper.ts
├── dashboard.errors.ts
└── index.ts
```

Entra no `group` do `biome.json`; o teste de arquitetura cobra a sincronia.

---

## Endpoints

### 1. Dashboard do membro

```http
GET /dashboard/member
```

`protectedProcedure`. Todo usuário autenticado tem dashboard de membro, ADMIN incluído —
ele também acumula KPI, PRD § 6, e a 2C tomou a mesma decisão para `/me/*`.

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

`level` é o objeto inteiro de `shared/gamification`, não o recorte de três campos do
exemplo do § 3.8. A tela desenha a barra de progresso, e `progress` sem `levelFloor` e
`nextLevelPoints` obriga a tela a adivinhar a escala. Contrato único para o mesmo dado —
é o mesmo `levelSchema` que `/me/score` devolve.

`teamSize` acompanha `rankingPosition` porque "4º" sem denominador não diz nada: 4 de 5 e
4 de 40 são situações opostas.

`recentKpis` traz as **cinco** últimas atribuições válidas, decrescente. Só válidas — é
uma vitrine, não um histórico; o histórico completo do membro é `/me/kpis`, entregue na
2C, e é lá que a revogação aparece.

Usuário desativado que ainda tem token válido recebe `403 MEMBER_INACTIVE`. Ele saiu do
ranking pela 3B, e um dashboard com `rankingPosition: null` seria a tela quebrando em vez
de a API respondendo.

### 2. Dashboard do Admin

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
| `members.active` / `.total` | contagem de usuários | — |
| `kpis.week` / `.month` | atribuições válidas criadas | semana ISO / mês corrente |
| `meetings.week` / `.month` | reuniões pela `date` | semana ISO / mês corrente |
| `meetings.open` | reuniões com `closedAt IS NULL` | — |
| `points.week` / `.month` | soma de `points` das atribuições válidas | semana ISO / mês corrente |
| `ranking` | top 5 | mês corrente |
| `recentAssignments` | últimas 10, válidas e revogadas | — |
| `membersWithoutKpis` | ativos sem atribuição válida | últimos 30 dias corridos |

`members.total` e os blocos `meetings` e `points` não estão no § 3.9. `total` entra porque
`active: 25` sozinho não diz se alguém foi desativado. `meetings` entra porque
`apps/web/src/lib/dashboard.ts` já tem `weekMeetings` no `TeamTotals` e a 3A tornou o dado
disponível. `points` entra porque `dashboard-stats.tsx` mostra pontos da equipe, e contar
atribuições sem somar pontos descreve volume sem descrever valor.

`recentAssignments` usa a mesma forma de `assignmentHistoryItemSchema` da 3C — com `user`
embutido —, redeclarada em `dashboard.schema.ts` pela regra de módulo não importar módulo.
Traz revogadas marcadas: é o feed de auditoria do Admin, e revogação é evento.

`ranking` reusa a entrada da 3B **sem** `change` e sem `isMe`. Ambos são específicos da
tela de ranking, e `change` obrigaria o dashboard a mexer em snapshot.

---

## Erros

| Erro | `code` | HTTP |
| --- | --- | --- |
| `MemberInactiveError` | `MEMBER_INACTIVE` | 403 |
| `MemberNotFoundError` | `MEMBER_NOT_FOUND` | 404 |

Redeclarado em `dashboard.errors.ts` com o mesmo `code` de `assignments` e `meetings`. O
status muda: em `assignments` é `409` — "não pode receber atribuição" —, aqui é `403` —
"você não pode entrar". Mesmo código, situações diferentes, e o cliente distingue pelo
HTTP.

---

## Tasks

| # | Task | Depende de |
| --- | --- | --- |
| 1 | Mover `profile.levels.ts` → `shared/gamification/levels.ts`, ajustar imports | — |
| 2 | Mover o teste de níveis para `tests/shared/gamification/`, sem alterar casos | 1 |
| 3 | `dashboard.errors.ts`, `dashboard.schema.ts`, `dashboard.mapper.ts` | 1 |
| 4 | `dashboard.repository.ts` — contagens, somas e listagens | 3 |
| 5 | `dashboard.service.ts` — dashboard do membro | 4 |
| 6 | `dashboard.service.ts` — dashboard do Admin | 4 |
| 7 | `dashboard.router.ts` + registro em `routers/index.ts` + `group` do `biome.json` | 5, 6 |
| 8 | Testes de service (repository mockado) | 5, 6 |
| 9 | Testes de router (contrato e autorização) | 7 |
| 10 | Pasta de dashboard na collection do Postman | 7 |

As tasks 1 e 2 são um commit próprio, antes de qualquer coisa nova. Refactor puro
misturado com feature nova esconde qual dos dois quebrou o teste.

---

## Testes

**Refactor de níveis**
- a suíte de `levels` continua verde no caminho novo, com os mesmos casos
- `/me/score`, `/me/profile` e `/members/{id}/profile` devolvem o mesmo `level` de antes
- `src/tests/architecture.test.ts` continua verde

**Dashboard do membro**
- `points` soma só atribuições com `revokedAt IS NULL`
- `level` bate com o que `/me/score` devolve para a mesma pontuação
- `rankingPosition` é a posição no período `all`, e `teamSize` é a contagem de ativos
- `recentKpis` traz cinco, decrescente, sem revogadas
- membro sem nenhuma atribuição: `points: 0`, nível 0, `recentKpis: []`, última posição
- ADMIN autenticado recebe o próprio dashboard de membro
- membro desativado → `MEMBER_INACTIVE`, 403

**Dashboard do Admin**
- `members.active` conta só ativos; `total` conta todos
- `kpis.week` usa a semana ISO corrente, não os últimos 7 dias
- atribuição da semana passada não entra em `kpis.week`
- atribuição revogada não entra em `kpis` nem em `points`
- `meetings.week` conta pela `date` da reunião; `meetings.open` conta `closedAt IS NULL`
- `ranking` traz no máximo 5, do mês corrente, sem `change` e sem `isMe`
- `recentAssignments` traz 10, decrescente, com `user` embutido, revogadas incluídas
- `membersWithoutKpis` traz ativo sem atribuição válida há mais de 30 dias
- membro com atribuição há 29 dias **não** entra; há 31 dias, entra
- membro com atribuição revogada há 5 dias entra — revogada não conta como reconhecimento
- membro que nunca recebeu nada entra, com `lastAssignmentAt: null` e `daysWithout` desde `createdAt`
- membro criado ontem e sem KPI **não** entra
- membro desativado nunca entra
- equipe vazia: todos os blocos respondem, com zeros e listas vazias, sem erro

**Autorização**
- `/dashboard/member`: anônimo → 401, MEMBER → passa, ADMIN → passa
- `/dashboard/admin`: anônimo → 401, MEMBER → 403, ADMIN → passa

---

## Critérios de aceite

- [x] Dashboard Member funciona
- [x] Dashboard Admin funciona
- [x] Dashboard do membro traz pontos, contagem, posição, nível e KPIs recentes
- [x] `level` do dashboard é idêntico ao de `/me/score`
- [x] Contadores de semana e de mês usam janela de calendário
- [x] `membersWithoutKpis` usa 30 dias corridos e inclui quem nunca recebeu nada
- [x] Ranking embutido no dashboard do Admin é do mês corrente, top 5
- [x] Nenhuma das duas rotas grava snapshot de ranking
- [x] Regra de níveis existe em um lugar só, em `shared/gamification/`
- [x] MEMBER recebe 403 em `/dashboard/admin`
- [x] Módulo `dashboard` não importa de `profile`, `ranking`, `assignments`, `meetings` nem `members`

Com estes, o § 3.12 fica todo atendido. Falta só a 3E, que fecha o § 2.10 da Fase 2.

---

## Consequências registradas

**`profile.levels.ts` sai de onde a 2C o colocou.** A spec 2C escreveu "a regra dos níveis
mora num lugar só — é `profile.levels.ts`". Continua morando num lugar só; o lugar mudou
para `shared/gamification/levels.ts`. A 2C precisa da nota, ou fica descrevendo um arquivo
que não existe.

**Schema de membro agora existe em quatro módulos.** `members`, `profile`, `ranking` e
`dashboard` cada um declara sua versão de `{ id, name, position, role }`. É o preço da
regra de módulo não importar módulo, aplicado a contrato de saída. Um `shared/schemas/`
resolveria, mas transformaria `shared/` num lugar onde mudar um campo mexe em quatro
rotas de uma vez — que é exatamente o acoplamento que a regra existe para impedir.

**`STAGNANT_THRESHOLD_DAYS = 7` do front conflita com os 30 dias do roadmap.**
`apps/web/src/lib/dashboard.ts` considera estagnado quem está 7 dias sem KPI; o § 3.9 pede
30. A API segue o roadmap. O front precisa escolher entre alinhar o número ou tratar os
dois alertas como coisas diferentes — story de web.

**Nenhum dashboard mostra badge.** O § 3.8 não pede e a 2D deliberadamente não criou rota
de badge. Se a tela inicial quiser exibir conquistas recentes, a fonte é `/me/profile`.

**Sem série temporal.** `apps/web/src/mocks/team-history.ts` alimenta um gráfico de pontos
por período com 7d / 30d / 90d / all. Nenhuma rota desta spec devolve série. O § 3.9 não
pede, é `groupBy` por dia sobre `assignedAt` quando virar requisito, e o gráfico continua
no mock até lá.

---

## Notas da entrega

- Rotas `dashboard.getMember` (`GET /dashboard/member`) e `dashboard.getAdmin`
  (`GET /dashboard/admin`).
- Erro extra `MemberNotFoundError` — 404 `MEMBER_NOT_FOUND` — quando o usuário do token
  não existe mais. Mesmo tratamento de `/me/profile`.
- **`meetings.week` e `.month` recortam por dia de calendário, não por instante.**
  `meeting.date` é dia gravado como meia-noite UTC pelo `calendarDateSchema` da 3A;
  recortá-lo com os instantes de São Paulo jogaria a reunião de segunda-feira para a
  semana anterior. `kpis` e `points` seguem com os instantes de `periods.ts`.
- `membersWithoutKpis` inclui quem tem a referência — última atribuição válida, ou
  `createdAt` para quem nunca recebeu — há **30 dias ou mais**, ordenado por
  `daysWithout` decrescente.
- `level` vem de `shared/gamification`; o teste de níveis mudou para
  `src/tests/shared/gamification/levels.test.ts` sem alteração de casos.
