# Spec — Fase 3E: Badges de Fase 3

**Fase:** 3 · **Status:** entregue · **Data:** 2026-09-08 · **Entregue em:** 2026-09-23

Referência: [MVP_API_ROADMAP.md § 2.8](../MVP_API_ROADMAP.md) ·
Depende de: Fase 2D — Badges · Fase 3A — Reuniões · Fase 3B — Ranking

---

## Escopo

Trocar os quatro avaliadores stub que a 2D deixou declarados por regras reais, agora que
reunião e ranking existem.

**Zero rota nova, zero migration, zero módulo novo.** Quatro funções em
`profile.badges.ts`, quatro `available: false` que viram `true`, e as consultas que
alimentam elas em `profile.repository.ts`.

É a última entrega da API do MVP. Com ela, § 2.10 e § 3.12 fecham juntos.

### A dívida que esta entrega paga

A 2D registrou, com todas as letras: *"os quatro stubs de Fase 3 são dívida datada.
`TEN_MEETINGS`, `TOP_THREE`, `PERFECT_MONTH` e `PODIUM_STREAK` devolvem `false` até § 3.4
e § 3.7 existirem. O contrato já está no lugar; a Fase 3 troca quatro funções e nada
mais."*

Esta spec é aquele "nada mais". O `badgeSchema`, o array de dez, a ordem do catálogo, o
carimbo em `user_badge` e as regras de imutabilidade de `earnedAt` **não mudam**.

---

## Decisões tomadas

### As quatro regras calculam ao vivo; `ranking_snapshot` não é usado

A 3B criou `ranking_snapshot` e ela seria a fonte óbvia para `PODIUM_STREAK`. Não é.

O snapshot é materializado **na leitura de `GET /ranking`**. Se ninguém abriu a tela de
ranking em março, março não tem snapshot. Uma conquista que depende de alguém ter aberto
uma tela não é regra de domínio, é sorte — e o § 2.8 é explícito ao dizer que a regra de
badge é de domínio, para que o frontend não determine quem conquistou o quê.

As quatro regras carregam o histórico e calculam. `TOP_THREE` e `PODIUM_STREAK` usam
`shared/ranking/rank.ts` — a mesma função pura que o módulo `ranking` usa, com o mesmo
desempate — sobre linhas que `profile.repository.ts` carrega por conta própria. É
exatamente o cenário que motivou a 3B a colocar `rank()` em `shared/`.

`ranking_snapshot` continua servindo só o `change` da 3B. Cache de dado cosmético.

### `TEN_MEETINGS` conta presença confirmada, não escala

```
COUNT(meeting_attendee WHERE userId = ? AND presentAt IS NOT NULL)
```

Escalado e ausente não conta — é a distinção que a 3A criou `presentAt` para sustentar.
Reunião aberta conta: a presença já foi registrada, e o KPI de presença já foi atribuído.
Esperar o encerramento para creditar a badge criaria um estado em que o membro tem os
pontos e não tem o progresso.

`earnedAt` é o `presentAt` da **décima** presença, ordenadas crescente. Data derivada,
como manda a 2D.

`current` é a contagem total, `target` é 10.

### `TOP_THREE` é posição, e por isso carimba a data da última atribuição do membro

A regra é `position <= 3` no ranking de período `all`, com o desempate de três níveis da
3B. `target: null`, `progress` 0 ou 100 — é posição, não contagem, exatamente como a 2D
previu ao definir o comportamento de `target: null`.

O problema é `earnedAt`. As badges da 2D derivam a data do evento que fechou a regra: a
quinta atribuição de `PERFORMANCE`, a vigésima quinta atribuição. Posição no ranking não
tem esse evento — ninguém "entra no top 3" por uma linha identificável, e a subida pode
ter vindo da queda de outra pessoa.

`now()` está fora de questão: a 2D o proibiu com o argumento certo — no primeiro deploy
desta entrega, todo mundo que já está no pódio seria carimbado com a data do deploy, e o
histórico nasceria mentindo.

A regra que fica: **`earnedAt` é o `assignedAt` da atribuição válida mais recente do
membro.** É um evento real, está sempre no passado, e é o ato mais recente sob controle
dele que sustenta a posição atual.

A imprecisão é conhecida e aceita: se a subida ao pódio veio da revogação de um KPI
alheio, o carimbo fica **antes** do momento real. Errar para trás, para uma data que de
fato existe no histórico do membro, é melhor do que carimbar a equipe inteira no dia do
deploy.

Membro sem nenhuma atribuição válida não pode estar no top 3 com pontuação positiva na
prática, mas se estiver — equipe inteira em zero, ordenada por nome — a badge **não** é
concedida. Pódio de uma equipe que não pontuou não é pódio.

### `PERFECT_MONTH` avalia mês fechado, e só reuniões encerradas

```
mês fechado                     → o corrente ainda pode furar
reuniões com closedAt != null   → reunião esquecida aberta não trava a badge
meeting.date > user.createdAt   → quem entrou no dia 20 não devia as do dia 5
mínimo uma reunião no mês       → mês sem reunião não é mês perfeito
```

Conquistado quando, em algum mês já fechado, o membro esteve presente em **todas** as
reuniões encerradas daquele mês.

Cada uma das quatro condições existe por um caso concreto:

O mês corrente fica de fora porque a reunião de amanhã ainda pode ser perdida — conceder
no dia 3 e a badge ser imutável faria de "mês perfeito" uma promessa quebrada por
construção.

Reunião aberta é ignorada porque uma reunião que o Admin esqueceu de encerrar em março
ficaria para sempre no denominador, e ninguém no time teria mês perfeito outra vez.

O recorte por `createdAt` do membro é o que impede que quem entrou no meio do mês nasça
com uma pendência impossível.

O mínimo de uma reunião é o que impede que um mês em que a equipe não se reuniu conte
como perfeito por vacuidade — `0 de 0` é verdadeiro em lógica e falso em produto.

`earnedAt` é o `closedAt` da última reunião encerrada daquele mês. `target: null`,
`progress` 0 ou 100.

`current` é `0` ou `1`, e não a cobertura do mês corrente. A 2D define `current` como o
que a tela mostra em progresso; aqui não há progresso parcial que signifique algo —
"3 de 4 reuniões deste mês" descreve um mês já perdido.

### `PODIUM_STREAK` são três meses de calendário consecutivos no top 3

Ranking mensal — as janelas de `shared/ranking/periods.ts`, as mesmas que a 3B e a 3D
usam — recalculado para cada mês fechado, e a busca por três meses seguidos com
`position <= 3`.

**Mês sem nenhuma atribuição na equipe quebra a sequência.** Não é pulado. Um mês em que
ninguém pontuou não tem pódio, e um pódio que não existe não pode ser ocupado. É a mesma
leitura que a 3B fez ao decidir que janela sem atribuição não vira snapshot.

**A varredura cobre os últimos 12 meses fechados.** Teto, pelo mesmo motivo do teto de
materialização da 3B: uma consulta ilimitada sobre um banco antigo transformaria a leitura
do perfil numa requisição longa. A consequência — um streak de pódio de mais de um ano
atrás que nunca foi carimbado fica perdido — é aceitável num produto que existe há menos
que isso, e some assim que o membro abrir o perfil dentro do prazo.

É **uma** consulta, não doze: `groupBy` por `(userId, mês)` sobre as atribuições válidas
dos 12 meses, e `rank()` roda em memória sobre cada balde.

`earnedAt` é o `assignedAt` da última atribuição válida do membro dentro do terceiro mês
da sequência. Evento real, no mês certo.

`current` é a **melhor** sequência histórica, não a atual, e `target` é 3. É o inverso do
que a 2D fez com os streaks de semana, onde `current` é a sequência atual — e a diferença
é deliberada: streak de semana é um comportamento que o membro mantém e a tela mostra
`3/4` para dizer "não quebre agora"; pódio mensal não se mantém por esforço contínuo
visível, e `0/3` no dia 1º de cada mês não diria nada a ninguém.

### As quatro viram `available: true` e nada mais muda no catálogo

Códigos, nomes, ícones, descrições, raridades e a ordem do array continuam idênticos ao
que a 2D escreveu. O `badgeSchema` não ganha nem perde campo.

O front que já renderiza dez slots com `available: false` passa a ver quatro deles
acenderem sem uma linha de mudança no contrato. Era esse o ponto de a 2D tê-las declarado
em vez de omitido.

---

## O catálogo, depois desta entrega

| Code | Regra | `target` | `current` | `earnedAt` derivado de |
| --- | --- | --- | --- | --- |
| `TEN_MEETINGS` | presenças confirmadas | 10 | contagem total | `presentAt` da 10ª presença |
| `TOP_THREE` | `position <= 3` no ranking `all` | `null` | 0 ou 1 | `assignedAt` da atribuição válida mais recente |
| `PERFECT_MONTH` | todas as reuniões encerradas de um mês fechado | `null` | 0 ou 1 | `closedAt` da última reunião daquele mês |
| `PODIUM_STREAK` | 3 meses consecutivos no top 3 | 3 | melhor sequência | `assignedAt` da última atribuição no 3º mês |

As seis badges da 2D continuam exatamente como estão.

Todas as quatro herdam as invariantes da 2D sem exceção:

- só atribuições com `revokedAt IS NULL` e `points > 0` alimentam contagem e ranking;
- `earned` e `earnedAt` não regridem — a linha em `user_badge` é imutável depois de
  gravada;
- `progress` vale 100 sempre que `earned`, mesmo com `current` abaixo do `target`;
- badge conquistada sobrevive à revogação do KPI que a gerou.

O filtro de `points > 0` vale inclusive para `TOP_THREE` e `PODIUM_STREAK`, e aqui ele
diverge do ranking da 3B de propósito. A 3B não filtra: ranking é pontuação, e pontuação
negativa subtrai. Badge é conquista, e a 2D já fixou que punição não avança conquista. As
duas leituras convivem porque respondem a perguntas diferentes; a divergência está
registrada aqui para que ninguém a "corrija" depois.

---

## Sem migration, sem rota

`user_badge` já existe desde a 2D, com `code` como `String` justamente para que badge nova
ou badge destravada não peça migration. Nenhuma coluna nova.

Nenhuma rota nova: as badges continuam viajando dentro de `/me/profile` e
`/members/{id}/profile`, como a 2D decidiu.

---

## Arquivos tocados

```
packages/api/src/modules/profile/
├── profile.badges.ts       # 4 stubs → 4 avaliadores; available: true
├── profile.repository.ts   # + 4 consultas
├── profile.service.ts      # + carga do dado extra
├── profile.schema.ts       # inalterado
├── profile.router.ts       # inalterado
└── profile.errors.ts       # inalterado
```

`profile.badges.ts` passa a importar `shared/ranking/rank.ts`,
`shared/ranking/periods.ts` e `shared/time/timezone.ts`. Permitido: módulo importa
`shared/`, e `shared/` não conhece módulo nenhum. O teste de arquitetura continua verde.

O último import resolve uma duplicação que a 2D criou: ela fixou `America/Sao_Paulo` como
constante dentro de `profile.badges.ts`, e a 3B fixou a mesma coisa em `shared/time/`.
Passam a ser uma só. O streak de semana da 2D não muda de comportamento — mesmo valor,
mesma semana ISO —, e os testes dele provam isso ao continuarem verdes sem alteração.

Consultas novas em `profile.repository.ts`:

| Método | Para |
| --- | --- |
| `countPresences(userId)` | `TEN_MEETINGS` — `presentAt` das presenças, ordenado |
| `listTeamScores()` | `TOP_THREE` — pontuação de todo ativo, sem janela |
| `listTeamScoresByMonth(months)` | `PODIUM_STREAK` — `groupBy` por usuário e mês |
| `listMonthlyMeetingCoverage(userId)` | `PERFECT_MONTH` — encerradas por mês e presenças do membro por mês |

Nenhuma delas passa por `modules/ranking` ou `modules/meetings`. Repository fala com
Prisma; a tabela não pertence a módulo nenhum.

---

## Tasks

| # | Task | Depende de |
| --- | --- | --- |
| 1 | `profile.badges.ts` — avaliador de `TEN_MEETINGS` | — |
| 2 | `profile.badges.ts` — avaliador de `TOP_THREE` | — |
| 3 | `profile.badges.ts` — avaliador de `PERFECT_MONTH` | — |
| 4 | `profile.badges.ts` — avaliador de `PODIUM_STREAK` | — |
| 5 | Testes puros dos quatro avaliadores | 1, 2, 3, 4 |
| 6 | `available: true` nas quatro entradas do catálogo | 5 |
| 7 | `profile.repository.ts` — as quatro consultas | — |
| 8 | `profile.service.ts` — carregar e passar o dado novo | 6, 7 |
| 9 | Testes de service (repository mockado) | 8 |
| 10 | Testes de router — as dez badges nos dois perfis | 8 |
| 11 | `docs/modules/profile.md` — regras das quatro badges | 8 |
| 12 | Roadmap § 2.8 e § 2.10, PRD § 7 — marcar badges como entregue | 8 |

As tasks 1 a 5 vêm antes de qualquer banco, e a 6 depois dos testes: enquanto
`available` for `false`, o catálogo continua respondendo o que a 2D prometeu, mesmo com
avaliador pela metade. Destravar é o último passo, não o primeiro.

---

## Testes

Avaliadores puros, sem banco, em `src/tests/modules/profile/badges.test.ts` — o arquivo
que a 2D criou.

**`TEN_MEETINGS`**
- conta só presença com `presentAt` preenchido; escalado e ausente não conta
- presença em reunião ainda aberta conta
- `earnedAt` é o `presentAt` da décima, não da última
- nove presenças → `earned: false`, `current: 9`

**`TOP_THREE`**
- 1º, 2º e 3º ganham; 4º não
- o desempate usado é o mesmo da 3B, incluindo o critério de nome
- equipe inteira em zero não concede a badge a ninguém
- `earnedAt` é o `assignedAt` da atribuição válida mais recente do membro
- `earnedAt` nunca é `now()` — o caso ganha teste explícito, pela regra da 2D
- membro cai para 5º depois de conquistar: `earned` continua `true`, `progress` 100

**`PERFECT_MONTH`**
- presente em todas as reuniões encerradas de um mês fechado → conquistada
- uma reunião perdida no mês → não conquistada
- reunião aberta no mês é ignorada e não impede a conquista
- reunião anterior ao `createdAt` do membro é ignorada
- mês sem nenhuma reunião encerrada não concede
- o mês corrente nunca concede, mesmo com 100% de presença até aqui
- `earnedAt` é o `closedAt` da última reunião do mês conquistado

**`PODIUM_STREAK`**
- três meses seguidos no top 3 → conquistada
- furo no meio quebra: 3º, 5º, 3º, 3º não concede na primeira janela
- mês sem nenhuma atribuição da equipe quebra a sequência
- `current` é a **melhor** sequência histórica, não a atual
- sequência atravessando a virada de ano (nov, dez, jan) conta
- a varredura para nos 12 meses fechados
- `earnedAt` cai dentro do terceiro mês da sequência

**Invariantes herdadas, cobradas de novo nas quatro**
- atribuição revogada não alimenta nenhuma das quatro
- atribuição com `points <= 0` não alimenta nenhuma das quatro
- badge conquistada sobrevive à revogação do KPI que a gerou
- linha já em `user_badge` não é regravada e `earnedAt` não muda

Service, com repository mockado:
- as dez badges vêm nos dois perfis, todas com `available: true`
- membro novo, sem histórico: as dez vêm com `earned: false`, nenhuma escrita
- só as recém-ganhas entram no `createMany`

Como manda o `CLAUDE.md` do pacote: teste que passa com o bug presente não serve.
Reintroduza o defeito e confirme a quebra — vale em especial para o mês corrente de
`PERFECT_MONTH` e para o `earnedAt` de `TOP_THREE`.

---

## Critérios de aceite

- [x] `TEN_MEETINGS` conta presenças confirmadas e concede na décima
- [x] `TOP_THREE` concede ao top 3 do ranking geral, com o desempate da 3B
- [x] `PERFECT_MONTH` concede só em mês fechado, com pelo menos uma reunião encerrada
- [x] `PODIUM_STREAK` concede em três meses de calendário consecutivos no top 3
- [x] As quatro vêm com `available: true`
- [x] Nenhum `earnedAt` é `now()`
- [x] Badge conquistada sobrevive à revogação e à queda de posição
- [x] Atribuição revogada e KPI de pontuação não positiva não alimentam as quatro
- [x] As dez badges continuam vindo nos dois perfis, na ordem do catálogo
- [x] `badgeSchema` não mudou
- [x] Módulo `profile` continua sem importar `ranking`, `meetings`, `members`, `kpis` nem `assignments`
- [x] Badges são calculados corretamente · § 2.10

Com estes, **todos** os critérios da Fase 2 (§ 2.10) e da Fase 3 (§ 3.12) ficam atendidos.
A API do MVP fecha aqui.

---

## Consequências registradas

**A leitura de perfil ficou mais cara.** `GET /me/profile` já fazia agregação sobre
`kpi_assignment`; agora faz mais quatro consultas, uma delas sobre 12 meses da equipe
inteira. Com um squad é irrelevante. Se doer, a saída é a que a 2D já apontou: mover o
carimbo para um job que varre membros — e aí `ranking_snapshot` vira fonte legítima,
porque a materialização deixa de depender de tráfego de leitura.

**`TOP_THREE` tem `earnedAt` aproximado.** Está justificado acima, e é o único `earnedAt`
das dez que não aponta para o evento que de fato fechou a regra. Quem for reler a 2D vai
encontrar "`earnedAt` é o da atribuição que fechou a regra" e precisa desta nota para não
tratar como bug.

**Badge e ranking discordam sobre pontuação negativa, de propósito.** A 3B soma tudo; a
2D e esta spec filtram `points > 0`. Um membro com KPI negativo pode aparecer numa posição
no `GET /ranking` e não ter `TOP_THREE`. É intencional e está nos dois documentos.

**O teto de 12 meses de `PODIUM_STREAK` é uma perda silenciosa.** Um streak de pódio
anterior a isso nunca é carimbado, e nada avisa. O produto não tem um ano de dados, então
o custo hoje é zero; quando tiver, a conversa é sobre o job do parágrafo anterior.

**PRD § 7 e roadmap § 2.8 precisam da última passada.** A 2D já pediu a reescrita das dez
badges; esta entrega muda `available` de quatro delas e fecha o checkbox de badges do
§ 2.10. Sem isso, os documentos ficam descrevendo quatro conquistas apagadas que já
acendem em produção.

**O front continua no mock.** `apps/web/src/mocks/badges.ts`, `lib/member-stats.ts` e
`components/member-detail/achievement-grid.tsx` seguem no formato antigo, como a 2D
registrou. Nenhuma das quatro badges desta spec aparece na tela até a story de web
acontecer.

---

## Notas da entrega

- As consultas do repository ficaram `listPresences`, `listTeamScores`,
  `listTeamScoresByMonth(window)` e `listMonthlyMeetingCoverage` (a spec dizia
  `countPresences` — a regra precisa das datas, não da contagem).
- `evaluateBadges(assignments, now, context: BadgeContext)` ganhou o terceiro parâmetro,
  com default vazio: as chamadas e testes da 2D continuam valendo sem mudança.
- `podiumMonths(now)` é exportado de `profile.badges.ts` e usado pelo service para montar o
  intervalo da consulta única de `PODIUM_STREAK` — a janela varrida e a janela consultada
  saem da mesma função.
- `BADGE_TIMEZONE` foi removido; `profile.badges.ts` usa `TIMEZONE` de `shared/time`.
- Em `PODIUM_STREAK` o membro só ocupa o pódio de um mês se pontuou (`> 0`) naquele mês —
  a mesma leitura de `TOP_THREE`: pódio de quem não pontuou não é pódio.
- **Consequência registrada:** `TEN_MEETINGS` conta `presentAt` mesmo que o assignment de
  presença tenha sido revogado depois. Revogar o KPI tira os pontos, não desmarca a
  presença — a 3A não tem rota de desmarcar, e a badge lê a presença, não o KPI.
