# Spec — Fase 2D: Badges

**Fase:** 2 · **Status:** entregue e validada · **Data:** 2026-09-08

Referência: [MVP_API_ROADMAP.md § 2.8 e § 2.9](../MVP_API_ROADMAP.md) ·
Depende de: Fase 2C — Pontuação, Níveis e Perfil

---

## Escopo

As conquistas do membro: um catálogo de dez badges, a regra de domínio que decide quais
foram ganhas, e a persistência que impede que uma conquista suma.

**Zero rota nova.** Badges entram nas duas respostas de perfil que a 2C já entrega
(`/me/profile` e `/members/{id}/profile`). Uma migration, um arquivo de regra, nenhum
módulo novo.

É a última entrega da Fase 2 — com ela, o § 2.10 fecha.

**Não entra:** endpoints granulares `/me/badges` e `/members/{id}/badges`. O único
consumidor de badge no front é `member-detail`, que já carrega o perfil inteiro. Endpoint
sem consumidor é contrato para manter de graça.

---

## Decisões tomadas

### Badge é fato gravado, calculado do histórico

A pergunta que o roadmap § 2.8 deixou explicitamente em aberto — badge é fato gravado ou
consequência calculada — se resolve com as duas coisas:

```
regra pura sobre o histórico  →  decide se ganhou
tabela user_badge             →  carimba a data, e nunca apaga
```

A regra continua derivável e testável sem banco. A conquista continua existindo depois
que o KPI que a gerou é revogado. E o carimbo acontece na **leitura**, não num gatilho no
fluxo de atribuição — o que mantém a regra de que `modules/<a>` não importa
`modules/<b>` sem precisar de um avaliador em `shared/`.

A alternativa puramente calculada foi descartada por um motivo de produto, não técnico:
uma conquista que some é pior do que uma conquista que não existe. A alternativa com
gatilho na atribuição foi descartada porque exigiria backfill para membro antigo e nunca
reavaliaria regra alterada.

### Nível mede volume; badge mede o que o nível não vê

O nível já comunica pontuação acumulada com 21 limiares e cinco faixas. Badge que premia
"1.000 pontos" é o nível 8 com outro ícone. As badges desta spec medem eixos que o nível
não mede: **categoria**, **volume em contagem**, **consistência no tempo** e, na Fase 3,
**posição** e **presença**.

### Streak conta semana, não dia

O mock do front pede "7 dias consecutivos com KPI". KPI nasce de reunião e de entrega —
ninguém pontua sábado, e uma semana de férias mata qualquer sequência diária. Streak
conta **semanas ISO consecutivas com pelo menos uma atribuição**, que é a mesma intenção
sem exigir o impossível.

### O catálogo é código, não dado

Sem tabela `badge`, sem CRUD, sem seed. Cada badge é uma entrada num array em
`profile.badges.ts`, com a função que a avalia ao lado. Badge nova é commit, revisão e
teste — que é o tratamento que uma regra de negócio merece, e não o que uma linha de
banco recebe.

A tabela `user_badge` guarda `code` como `String`, não enum: badge nova não pede
migration, e linha de badge que saiu do catálogo é ignorada na leitura em vez de quebrar.

### Badges de Fase 3 entram declaradas

Quatro das dez dependem de ranking (§ 3.7) e de reunião (§ 3.4), que não existem. Elas
entram no catálogo com `available: false` e avaliador stub que sempre devolve
`earned: false`. A tela mostra o slot com a descrição — conquista invisível não motiva
ninguém. A Fase 3 troca o stub pelo avaliador real sem tocar em catálogo nem em contrato.

`available` é campo do contrato, não detalhe interno: mostrar `0/10 reuniões` para um
recurso que ainda não foi construído é mentir para o membro.

---

## O catálogo

| Code | Badge | Regra | Alvo | Raridade | Fase |
| --- | --- | --- | --- | --- | --- |
| `FIRST_POINT` | 🌱 Primeira pontuação | primeira atribuição válida | 1 | COMUM | 2 |
| `FIVE_PERFORMANCE` | ⚡ Alta performance | atribuições de `PERFORMANCE` | 5 | RARA | 2 |
| `ALL_CATEGORIES` | 🧭 Completista | categorias distintas com ≥1 KPI | todas | RARA | 2 |
| `TWENTY_FIVE_KPIS` | 📚 Colecionador | atribuições válidas | 25 | RARA | 2 |
| `FOUR_WEEK_STREAK` | 🔥 Constante | semanas ISO consecutivas com ≥1 KPI | 4 | EPICA | 2 |
| `TWELVE_WEEK_STREAK` | 💎 Inabalável | semanas ISO consecutivas com ≥1 KPI | 12 | EPICA | 2 |
| `TEN_MEETINGS` | 🤝 Presente | reuniões com presença · § 3.4 | 10 | RARA | 3 |
| `TOP_THREE` | 🏅 Pódio | top 3 do ranking geral · § 3.7 | — | EPICA | 3 |
| `PERFECT_MONTH` | ⏱️ Pontual | todas as reuniões do mês · § 3.4 | — | COMUM | 3 |
| `PODIUM_STREAK` | 👑 Lendário | meses consecutivos no top 3 · § 3.7 | 3 | LENDARIA | 3 |

Dez badges cabem exatos no grid do front: `achievement-grid.tsx` já renderiza
`grid-cols-5` com `VISIBLE = 10`.

Os ícones de `FIVE_PERFORMANCE`, `FOUR_WEEK_STREAK`, `TOP_THREE` e `TEN_MEETINGS` vêm do
PRD § 7, que já os tinha atribuído. Os demais vêm do mock do front.

### Calibração

Contra o catálogo real semeado — oito KPIs, dois por categoria, média de 10,6 pontos:

| Categoria | KPIs | Pontos |
| --- | --- | --- |
| `PRESENCE` | Presença na reunião · Chegou no horário | 5 · 3 |
| `PERFORMANCE` | Entregou no prazo · Resolveu bug crítico | 12 · 25 |
| `BEHAVIOR` | Ajudou um colega · Feedback construtivo | 10 · 7 |
| `INITIATIVE` | Boa ideia em reunião · Documentou processo | 15 · 8 |

O alvo de `ALL_CATEGORIES` é **derivado do enum `KpiCategory`**, não a constante `4`.
Categoria nova no enum sobe o alvo sozinha; com `4` cravado, todo membro completista
continuaria completista sem nunca ter tocado na categoria nova.

`TWENTY_FIVE_KPIS` cai por volta de quatro a seis semanas de ritmo semanal — nível 2 ou
3, badge de meio de caminho e não de chegada. `TWELVE_WEEK_STREAK` é um trimestre inteiro
sem furo, o mais difícil da Fase 2, e por isso deixa a única `LENDARIA` para a Fase 3,
como no mock.

**Um eixo foi cortado na calibração.** "Dez KPIs distintos" era inalcançável: o catálogo
tem oito. E qualquer alvo em KPIs distintos fica refém do tamanho do catálogo, que o
Admin edita — eixo instável, fora. Amplitude já é medida por `ALL_CATEGORIES`.

### Badges do mock que não sobreviveram

| Mock | Motivo |
| --- | --- |
| ⚡ Sequência de 14 | absorvida pela escada 4 / 12 semanas; 14 dias seguidos é impossível no ritmo de trabalho |
| 🏔️ Mil pontos | é o nível 8 com outro ícone |
| 🦉 Mentor | regra amarraria em KPI por **nome**; o Admin renomeia e a badge morre calada. Não existe KPI de mentoria no catálogo |
| 🐛 Caçador de bugs | mesmo defeito, ainda que o KPI exista hoje |
| 💡 Voz da reunião | KPI por nome, e depende de reunião |

Nenhuma badge desta spec referencia KPI por nome ou por id. Todas se apoiam em
**categoria**, **contagem** ou **data** — três coisas que o Admin não consegue quebrar
editando o catálogo.

---

## As regras, uma a uma

Todo avaliador recebe a mesma lista: atribuições do membro com `revokedAt IS NULL`
**e `points > 0`**, ordenadas por `assignedAt` crescente.

O filtro de `points > 0` não é detalhe. O modelo permite KPI de pontuação negativa — é
por isso que a 2C filtra o histórico público para positivos — e punição avançando
"Colecionador" seria defeito, não conquista.

| Code | `current` | `earned` | `earnedAt` |
| --- | --- | --- | --- |
| `FIRST_POINT` | `min(total, 1)` | `total >= 1` | `assignedAt` da 1ª |
| `FIVE_PERFORMANCE` | nº de `PERFORMANCE` | `>= 5` | `assignedAt` da 5ª de `PERFORMANCE` |
| `ALL_CATEGORIES` | categorias distintas | `>= target` | `assignedAt` da que introduziu a última categoria |
| `TWENTY_FIVE_KPIS` | total | `>= 25` | `assignedAt` da 25ª |
| `FOUR_WEEK_STREAK` | sequência **atual** | melhor sequência `>= 4` | 1ª atribuição da 4ª semana da melhor sequência |
| `TWELVE_WEEK_STREAK` | sequência **atual** | melhor sequência `>= 12` | 1ª atribuição da 12ª semana da melhor sequência |
| Fase 3 | `0` | `false` | `null` |

`earnedAt` é **data derivada, nunca `now()`**. Sem isso, todo membro que já existe hoje
ganharia suas badges carimbadas com a data do primeiro deploy, e o histórico nasceria
mentindo. Derivar custa pouco: as atribuições já estão carregadas e ordenadas.

### O algoritmo do streak

Duas sequências saem da mesma varredura, e elas respondem perguntas diferentes:

```
melhor sequência   →  decide earned e earnedAt.  Nunca regride.
sequência atual    →  é o current que a tela mostra. Regride quando fura.
```

`earned` precisa da melhor histórica: um streak de doze semanas que aconteceu no ano
passado foi conquistado, e um avaliador que só olhasse o presente nunca o carimbaria.
`current` precisa da atual, porque `0/4` diz ao membro o que ele precisa fazer a partir de
hoje, e `3/4` de um streak que já quebrou não diz.

A aritmética **não** usa a string `YYYY-Www`. Cada atribuição vira a **segunda-feira da
sua semana ISO** em `America/Sao_Paulo`; duas semanas são consecutivas quando as
segundas-feiras distam exatamente sete dias. Isso elimina de uma vez o bug de virada de
ano, onde a semana 52 é seguida pela semana 1 e qualquer comparação textual quebra.

Sequência atual é a que termina na semana corrente **ou na anterior** — a semana corrente
ainda está em curso, e zerar o streak de alguém na segunda-feira de manhã seria punir o
calendário.

O fuso é constante em `profile.badges.ts`, não variável de ambiente: mudar de fuso
reescreveria o histórico de conquistas de todo mundo, o que não é configuração.

---

## Módulo: badges dentro de `profile`

Não há módulo novo. A regra mora onde o `profile.levels.ts` já mora, pelo mesmo motivo:

```
packages/api/src/modules/profile/
├── profile.badges.ts       # catálogo + avaliadores, função pura   ← novo
├── profile.levels.ts
├── profile.repository.ts   # + listEarnedBadges, stampBadges
├── profile.service.ts      # + montagem da seção de badges
├── profile.schema.ts       # + badgeSchema
├── profile.mapper.ts
├── profile.router.ts       # inalterado
└── index.ts
```

§ 2.9 define perfil como o agregado de pessoais + pontuação + categorias + KPIs + nível +
badges. Badge pertence a `profile` pela definição do próprio roadmap.

Um módulo `badges` separado exigiria que `profile` o importasse — proibido por
`biome.json` e por `src/tests/architecture.test.ts` — ou que a regra fosse para `shared/`,
que hoje não tem uma linha de Prisma nem de domínio de módulo. Nenhum dos dois custos se
paga por um nome de pasta.

### O carimbo

```
1. repository carrega atribuições válidas + linhas de user_badge
2. profile.badges avalia o catálogo  →  [{ code, earned, current, target, earnedAt }]
3. earned && sem linha  →  createMany({ skipDuplicates })
4. resposta = catálogo + earnedAt persistido + progresso
```

A gravação é `createMany` com `skipDuplicates` sob a `@@unique([userId, code])`: duas
leituras simultâneas do mesmo perfil não podem gerar linha duplicada nem estourar.

Linha já existente **não** é atualizada. `earnedAt` é imutável depois de gravado — é o que
faz a badge sobreviver à revogação do KPI que a gerou.

---

## Contrato

```ts
export const badgeCodeSchema = z.enum([
	"FIRST_POINT",
	"FIVE_PERFORMANCE",
	"ALL_CATEGORIES",
	"TWENTY_FIVE_KPIS",
	"FOUR_WEEK_STREAK",
	"TWELVE_WEEK_STREAK",
	"TEN_MEETINGS",
	"TOP_THREE",
	"PERFECT_MONTH",
	"PODIUM_STREAK",
]);

export const badgeRaritySchema = z.enum(["COMUM", "RARA", "EPICA", "LENDARIA"]);

export const badgeSchema = z.object({
	code: badgeCodeSchema,
	name: z.string(),
	description: z.string(),
	icon: z.string(),
	rarity: badgeRaritySchema,
	available: z.boolean(),
	earned: z.boolean(),
	earnedAt: z.date().nullable(),
	current: z.number(),
	target: z.number().nullable(),
	progress: z.number(),
});
```

Raridade em português maiúsculo sem acento segue `levelTierSchema`, que a 2C já entrega
assim (`INICIANTE`, `COMPROMETIDO`, …). `code` é enum e não string livre: o front ganha
exaustividade no `switch` e uma badge renomeada quebra no type check, não em produção.

`badges` entra em `myProfileResponseSchema` e em `publicProfileResponseSchema` — mesmo
array, mesmo shape, sem campo escondido. Perfil público de outro membro mostra progresso
igual ao próprio; nada em uma badge é dado sensível, ao contrário de e-mail e de status
de ativação, que a 2C esconde.

O array vem sempre com as **dez** entradas, na ordem do catálogo. Badge bloqueada não é
omitida — omitir obrigaria a tela a reconstruir o catálogo do lado dela, que é exatamente
o que o roadmap § 2.8 proíbe ao dizer que a regra é de domínio.

### `earned` é grudento, `progress` é vivo

| Campo | Regride? |
| --- | --- |
| `earned` | não |
| `earnedAt` | não |
| `progress` | não — vale `100` sempre que `earned` |
| `current` | sim |

Uma badge conquistada e depois esvaziada por revogação responde
`earned: true`, `earnedAt: <data>`, `progress: 100`, `current: 4`, `target: 5`.

O front **não pode** derivar `earned` de `current >= target`. É essa combinação que a
decisão híbrida existe para sustentar, e é o caso que ganha teste próprio.

`progress` com `target: null` é `0` ou `100`, sem meio-termo: `TOP_THREE` e
`PERFECT_MONTH` são posição e cobertura, não contagem, e barra de progresso ali não
significaria nada.

---

## Erros

Nenhum erro novo. `MemberNotFoundError`, que a 2C já declara em `profile.errors.ts`,
continua cobrindo `/members/{id}/profile`.

---

## Migration

Um modelo novo, um arquivo — `packages/db/prisma/schema/user-badge.prisma`:

```prisma
model UserBadge {
  id       String   @id @default(uuid()) @db.Uuid
  userId   String   @db.Uuid
  code     String
  earnedAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@unique([userId, code])
  @@index([userId])
  @@map("user_badge")
}
```

`User` ganha `badges UserBadge[]`.

`earnedAt` tem `@default(now())` por segurança do schema, mas o service **sempre** passa a
data derivada — o default existe para o caso de uma escrita futura fora deste caminho, não
para ser usado aqui.

O `@@unique([userId, code])` é o que sustenta o `skipDuplicates` e torna o carimbo
idempotente sob concorrência. O índice de `userId` serve à leitura do perfil.

Sem seed. Badge não é dado semeado: o primeiro perfil lido depois da migration carimba o
que o histórico já tiver merecido, inclusive para os membros que a 2B semeou.

---

## Tasks

| # | Task | Depende de |
| --- | --- | --- |
| 1 | `user-badge.prisma` + relação em `User` + migration | — |
| 2 | `profile.badges.ts` — catálogo e avaliadores puros | — |
| 3 | Testes de `profile.badges.ts` | 2 |
| 4 | `profile.schema.ts` — `badgeSchema` nos dois perfis | — |
| 5 | `profile.repository.ts` — `listEarnedBadges`, `stampBadges` | 1 |
| 6 | `profile.service.ts` — avaliar, carimbar, montar a resposta | 2, 4, 5 |
| 7 | Testes de service, com repository mockado | 6 |
| 8 | Testes de router — badges nos dois perfis | 6 |
| 9 | Exemplos de resposta na collection do Postman | 6 |
| 10 | `docs/modules/profile.md` — regras de nível e de badge | 6 |
| 11 | Reescrever PRD § 7 e roadmap § 2.8; marcar § 2.10 | 6 |

As tasks 2 e 3 vêm antes do banco de propósito: a regra é pura, concentra todo o caso de
borda, e fechá-la primeiro torna o resto mecânico. Foi a ordem que funcionou na 2C.

---

## Testes

`src/tests/modules/profile/badges.test.ts`, puro, sem banco:

| Caso | Por quê |
| --- | --- |
| streak com furo de uma semana zera a atual | é o bug óbvio do acumulador ingênuo |
| streak atravessando a virada de ano ISO | semana 52 → 1 é onde comparação textual quebra |
| melhor sequência sobrevive ao furo, atual não | as duas sequências respondem perguntas diferentes |
| streak ativo com a semana corrente sem KPI | a tolerância de uma semana não pode zerar cedo |
| atribuição revogada não conta em nenhuma badge | invariante herdada da 2B |
| atribuição com `points <= 0` não conta | punição não é conquista |
| `ALL_CATEGORIES` com três categorias repetidas | contagem distinta, não total |
| `ALL_CATEGORIES` deriva o alvo do enum, não da constante `4` | categoria nova não pode nascer com a badge já ganha |
| badge de Fase 3 nunca vem `earned` | stub não pode desbloquear sozinho |
| `earnedAt` é o da atribuição que fechou a regra | não pode ser `now()` |
| `target: null` dá `progress` 0 ou 100 | sem meio-termo em badge não quantificável |

No service, com repository mockado:

| Caso | Por quê |
| --- | --- |
| **badge conquistada sobrevive à revogação do KPI que a gerou** | é a regressão que mata a decisão híbrida |
| badge já carimbada não é regravada nem tem `earnedAt` alterado | `earnedAt` é imutável |
| só as badges recém-ganhas entram no `createMany` | escrita à toa em todo GET de perfil |
| linha de `user_badge` com `code` fora do catálogo é ignorada | badge removida não pode quebrar leitura |
| perfil público traz as dez badges | contrato igual ao do perfil próprio |

Como manda o `CLAUDE.md` do pacote: teste que passa com o bug presente não serve.
Reintroduza o defeito e confirme que o teste quebra — vale em especial para o caso do
streak na virada de ano e para o da badge que sobrevive à revogação.

---

## Critérios de aceite

- [x] As dez badges vêm em `/me/profile` e em `/members/{id}/profile`
- [x] Badge bloqueada vem no array, com `earned: false` e progresso
- [x] Badge de Fase 3 vem com `available: false` e nunca `earned`
- [x] `FIRST_POINT`, `FIVE_PERFORMANCE`, `ALL_CATEGORIES` e `TWENTY_FIVE_KPIS` conferem com o histórico
- [x] Streak conta semana ISO e sobrevive à virada de ano
- [x] Atribuição revogada e KPI de pontuação não positiva não avançam badge
- [x] Badge conquistada permanece depois de revogar o KPI que a gerou
- [x] `earnedAt` é a data da atribuição que fechou a regra, não a do primeiro carimbo
- [x] Segunda leitura do perfil não grava nada em `user_badge`
- [x] Módulo `profile` continua sem importar `members`, `kpis` ou `assignments`

Com estes, os critérios da 2D e o item de badges do § 2.10 ficam atendidos.

---

## Consequências registradas

**PRD § 7 e roadmap § 2.8 foram sincronizados.** Ambos agora descrevem o catálogo de dez
badges, o streak semanal e as quatro entradas bloqueadas de Fase 3. Mudança futura na
regra precisa manter os três documentos alinhados: roadmap, PRD e esta spec.

**`apps/web/src/mocks/badges.ts` fica em conflito.** O mock tem dez conquistas com ids
`b1`–`b10`, nomes próprios, raridade em minúscula acentuada e `earnedBy: string[]`. O
contrato desta spec usa `code`, raridade maiúscula sem acento e progresso por membro.
Cinco das dez mudam de regra, cinco somem. `lib/member-stats.ts` (`achievementsOf`),
`components/member-detail/achievement-grid.tsx` e os testes de
`src/test/member-stats.test.ts` dependem do formato antigo. A migração do front é story de
web e não entra aqui — o front continua no mock até ela acontecer, como já acontece com
nível e ranking.

**O carimbo mora no caminho de leitura.** `GET /me/profile` pode escrever. É a
consequência aceita de não ter gatilho no fluxo de atribuição, e ela tem limite: só grava
quando há badge nova, e o `skipDuplicates` torna a gravação idempotente. Se um dia a
escrita no GET incomodar — cache de resposta, réplica de leitura —, a saída é mover o
carimbo para um job que varre membros, e não voltar ao gatilho.

**Os quatro stubs de Fase 3 são dívida datada.** `TEN_MEETINGS`, `TOP_THREE`,
`PERFECT_MONTH` e `PODIUM_STREAK` devolvem `false` até § 3.4 e § 3.7 existirem. O contrato
já está no lugar; a Fase 3 troca quatro funções e nada mais. Se a Fase 3 escorregar, o
membro convive com quatro slots que nunca acendem — o `available: false` existe para que
a tela possa dizer isso em vez de fingir progresso.

**O ritmo usado na calibração é estimativa, não medição.** Os alvos de 25 atribuições e de
4 / 12 semanas saíram do catálogo semeado mais a expectativa de ritmo semanal; a tabela
`kpi_assignment` tem só dado de seed. Vale recalibrar com seis meses de atribuição real —
os eixos sobrevivem à recalibração, só os números mudam.

---

## Nota posterior — Fase 3E

Os quatro stubs desta seção — `TEN_MEETINGS`, `TOP_THREE`, `PERFECT_MONTH` e
`PODIUM_STREAK` — foram **destravados pela 3E** em 2026-09-23: avaliadores reais e
`available: true`, sem mudança de catálogo nem de `badgeSchema`. O critério "Badge de Fase 3
vem com `available: false`" descreve o estado entregue pela 2D e deixou de valer com a 3E.
Ver [`fase-3e-badges-de-fase-3.md`](fase-3e-badges-de-fase-3.md).
