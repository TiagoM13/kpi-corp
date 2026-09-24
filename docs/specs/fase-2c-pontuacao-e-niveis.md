# Spec — Fase 2C: Pontuação, Níveis e Perfil

**Fase:** 2 · **Status:** entregue · **Data:** 2026-09-03

Referência: [MVP_API_ROADMAP.md § 2.4 a § 2.7 e § 2.9](../MVP_API_ROADMAP.md) ·
Depende de: Fase 2B — Atribuições

---

## Escopo

O que o membro vê do próprio desempenho: pontuação, pontuação por categoria, lista de
KPIs recebidos, nível, e o perfil que junta tudo. Mais o perfil público de outro membro.

Cinco endpoints, um módulo novo, **nenhuma migration**.

**Não entra:** badges (§ 2.8). Viram spec própria — 2D. Ranking, dashboards e reunião
são Fase 3.

### Por que badges saíram

Dos quatro badges do MVP (`FIRST_WEEK`, `FIVE_PERFORMANCE`, `TOP_THREE`,
`TEN_MEETINGS`), **dois não são calculáveis nesta fase**: `TOP_THREE` precisa de ranking
(§ 3.7) e `TEN_MEETINGS` precisa de reunião (Fase 3). Entregar metade de um sistema de
conquista, e a metade que sobra sem a decisão de persistência tomada, é pior do que
entregar depois inteiro.

A decisão que 2D vai precisar tomar e esta spec não toma: badge é **fato gravado** (tem
data, não some quando o KPI que o gerou é revogado) ou **consequência calculada** (some
junto)? Ela muda se existe tabela ou não.

---

## Decisões tomadas

### Nível é função pura dos pontos válidos

```
level = f(soma dos points das atribuições com revokedAt IS NULL)
```

Sem coluna, sem tabela, sem estado a sincronizar. Revogou um KPI, os pontos caem e o
nível cai junto — é o que o PRD § 6 já manda: *"KPIs removidos de um membro perdem os
pontos retroativamente"*.

A alternativa (nível como marca histórica que não volta) exigiria guardar o topo
alcançado, e o nível deixaria de ser derivável. Descartada.

### Vinte níveis, cinco faixas, teto 7.500

Os níveis são a progressão fina; as faixas são o nome que aparece na tela. Trocas de
faixa caem nos níveis 5, 10, 15 e 20.

O passo **dobra a cada bloco de cinco níveis**: 100, 200, 400, 800. Uma regra só,
enunciável numa frase, e o nível 20 custa oito vezes o nível 1.

| Nível | Pontos | Passo | Faixa |
| --- | --- | --- | --- |
| 0 | 0 | — | **Iniciante** |
| 1 | 100 | +100 | Iniciante |
| 2 | 200 | +100 | Iniciante |
| 3 | 300 | +100 | Iniciante |
| 4 | 400 | +100 | Iniciante |
| 5 | 500 | +100 | **Comprometido** |
| 6 | 700 | +200 | Comprometido |
| 7 | 900 | +200 | Comprometido |
| 8 | 1.100 | +200 | Comprometido |
| 9 | 1.300 | +200 | Comprometido |
| 10 | 1.500 | +200 | **Destaque** |
| 11 | 1.900 | +400 | Destaque |
| 12 | 2.300 | +400 | Destaque |
| 13 | 2.700 | +400 | Destaque |
| 14 | 3.100 | +400 | Destaque |
| 15 | 3.500 | +400 | **Elite** |
| 16 | 4.300 | +800 | Elite |
| 17 | 5.100 | +800 | Elite |
| 18 | 5.900 | +800 | Elite |
| 19 | 6.700 | +800 | Elite |
| 20 | 7.500 | +800 | **Lenda** |

Calibrada contra o catálogo real, não contra intuição. Com KPIs de presença em reunião,
câmera ligada, tarefa documentada no Jira e entrega, um membro engajado faz **~500
pontos por mês**:

```
nivel  5  ->  1 mes
nivel 10  ->  3 meses
nivel 15  ->  7 meses
nivel 20  -> 15 meses
```

Nível 20 alcançável em pouco mais de um ano por quem é consistente — longe o bastante
para valer, perto o bastante para existir.

Nível 20 é o teto. Pontos continuam somando acima de 7.500, o nível não sobe mais.

### A regra dos níveis mora num lugar só

Roadmap § 2.7: *"criar uma regra centralizada"*. É `profile.levels.ts` — uma tabela de
21 limiares e uma função pura sobre ela. Nenhuma outra camada calcula nível, e o front
**nunca** recebe pontos crus para decidir faixa sozinho.

```
levelFor(points) -> {
  level, tier,
  currentPoints, levelFloor, nextLevel, nextLevelPoints,
  progress,          // 0-100 dentro do nível atual
  nextTier           // null quando ja e LENDA
}
```

`progress` no nível 20 é sempre 100 e `nextLevel` é `null` — é o caso que quebra
implementação ingênua e por isso tem teste próprio.

### Quatro categorias, não três

O exemplo do roadmap § 2.4 mostra `presence`, `performance`, `behavior`. O enum tem
**quatro** desde a 2A: `INITIATIVE` entrou junto. A resposta traz as quatro, e categoria
sem nenhum ponto vem com `0` — não é omitida. Chave ausente obrigaria a tela a tratar
`undefined`; zero explícito é o mesmo dado sem a armadilha.

### Perfil público esconde, não filtra depois

`GET /members/:id/profile` monta uma resposta **diferente** de `/me/profile`, no
service. Não é a resposta completa com campos removidos na borda — o e-mail e o status
de ativação nunca são lidos do banco nessa consulta.

Diferença prática: um bug de serialização não vaza o que nunca foi carregado.

O roadmap pede o histórico "filtrado para pontuação positiva". Hoje todo KPI vale de 1 a
100 (schema da 2A), então não existe pontuação negativa e o filtro seria inócuo. A
leitura que faz sentido, e que fica valendo: **o perfil público mostra só atribuições
válidas**, sem as revogadas. Quem revogou o quê é assunto de Admin.

### Membro inativo não tem perfil público

`GET /members/:id/profile` devolve `404 MEMBER_NOT_FOUND` quando o membro está
desativado, para ADMIN e para MEMBER. Admin que precisa ver conta desativada já tem
`GET /members/:id` (`adminProcedure`, entregue na Fase 1.6).

---

## Módulo novo: `profile`

```
packages/api/src/modules/profile/
├── profile.router.ts       # /me/* e /members/:id/profile
├── profile.service.ts      # regras
├── profile.repository.ts   # agregações Prisma
├── profile.levels.ts       # tabela de limiares + funcao pura
├── profile.schema.ts       # Zod de output
├── profile.mapper.ts
├── profile.errors.ts
└── index.ts
```

O módulo atende rotas sob `/members/` **sem** pertencer ao módulo `members` — caminho de
rota e nome de módulo são coisas diferentes, e importar `members` daqui é proibido por
lint e por `tests/architecture.test.ts`. Os dados de usuário vêm do próprio repository,
via Prisma.

Entra no `group` do `biome.json`; há teste cobrando essa sincronia.

---

## Endpoints

`/me/*` é `protectedProcedure` — todo usuário autenticado lê o próprio dado, inclusive
Admin, que também acumula KPI (PRD § 6). `/members/:id/profile` também é
`protectedProcedure`, e não `adminProcedure`: é o endpoint que sustenta a regra de perfil
público definida em § 1.5.

### 1. Minha pontuação

```http
GET /me/score
```

```json
{
  "total": 2450,
  "categories": { "presence": 620, "performance": 980, "behavior": 450, "initiative": 400 },
  "level": { "level": 11, "tier": "DESTAQUE", "nextLevel": 12, "nextLevelPoints": 3600, "progress": 56 }
}
```

O bloco `level` entra aqui, além de em `/me/profile`. O roadmap não mostra, mas o
dashboard do membro precisa de pontos **e** nível juntos, e recalcular é uma função pura
sobre um número que já está na mão.

Soma só atribuições com `revokedAt IS NULL`.

### 2. Meus KPIs

```http
GET /me/kpis
```

Uma linha por atribuição recebida: nome do KPI, categoria, pontos **congelados na
atribuição**, data, nota e se está revogada. Ordenado por data decrescente.

Traz as revogadas, marcadas. É o histórico do próprio usuário — esconder dele o que foi
tirado seria mentir por omissão. Filtro `revoked` disponível para a tela escolher.

Os pontos exibidos vêm de `kpi_assignment.points`, não de `kpi.points`: se o KPI foi
reprecificado depois, a linha mostra o que valeu no dia.

### 3. Resumo

```http
GET /me/kpis/summary
```

Quantidade total de KPIs recebidos, quantidade por categoria, pontuação por categoria e
a última atribuição.

**Sobreposição registrada:** "pontuação por categoria" também está em `/me/score`. Os
dois existem porque o roadmap pede os dois, e servem telas diferentes — `score` é o
cabeçalho do dashboard, `summary` é o bloco do perfil. A regra de agregação é uma só, no
service; a duplicação é de rota, não de lógica.

### 4. Meu perfil

```http
GET /me/profile
```

Dados pessoais (com e-mail e status), pontuação, pontuação por categoria, KPIs, nível.
Sem badges — 2D.

### 5. Perfil público de outro membro

```http
GET /members/:id/profile
```

O mesmo conteúdo, **sem e-mail**, **sem status de ativação** e com o histórico só das
atribuições válidas.

Quando `:id` é o do próprio usuário autenticado, o comportamento é idêntico ao de outro
membro — para os próprios dados completos existe `/me/profile`. O roadmap § 2.9 fixa
isso, e é o que evita dois caminhos diferentes para o mesmo recurso.

`404 MEMBER_NOT_FOUND` para id inexistente ou membro desativado.

---

## Erros

| Erro | `code` | HTTP |
| --- | --- | --- |
| `MemberNotFoundError` | `MEMBER_NOT_FOUND` | 404 |

Redeclarado em `profile.errors.ts` com o mesmo `code` de `members` e `assignments` — a
proibição de import entre módulos vale para erro também. O contrato que o cliente vê
(`data.code`) continua idêntico.

---

## Sem migration

Nada muda no schema. Tudo é agregação sobre `kpi_assignment`, que a 2B deixou com
`points` e `revokedAt`.

Query central, uma só, com `groupBy` do Prisma:

```
WHERE userId = ? AND revokedAt IS NULL
GROUP BY kpi.category
SUM(points), COUNT(*)
```

O índice de `userId` já existe. Se o plano de query mostrar varredura em volume real,
entra índice parcial em `(userId) WHERE revoked_at IS NULL` — mas com dado na mão, não
por precaução agora.

---

## Tasks

| # | Task | Depende de |
| --- | --- | --- |
| 1 | `profile.levels.ts` — tabela de limiares e função pura | — |
| 2 | Testes de `profile.levels.ts` | 1 |
| 3 | `profile.errors.ts`, `profile.schema.ts`, `profile.mapper.ts` | — |
| 4 | `profile.repository.ts` — agregações | 3 |
| 5 | `profile.service.ts` | 1, 4 |
| 6 | `profile.router.ts` + registro em `routers/index.ts` + `group` do `biome.json` | 5 |
| 7 | Testes de service (repository mockado) | 5 |
| 8 | Testes de router (contrato e autorização) | 6 |
| 9 | Pasta de perfil na collection do Postman | 6 |

As tasks 1 e 2 vêm primeiro de propósito: a regra de nível é pura, não depende de banco
nem de service, e é a parte com mais caso de borda. Fechá-la antes torna o resto
mecânico.

---

## Testes

**Níveis** (`profile.levels.ts`, função pura, sem mock)
- 0 pontos → nível 0, `INICIANTE`
- limiar exato de cada um dos 20 níveis sobe o nível (tabela inteira, `it.each`)
- um ponto abaixo do limiar **não** sobe
- as quatro trocas de faixa caem nos níveis 5, 10, 15 e 20
- `progress` é 0 no piso do nível e ~100 um ponto antes do próximo
- nível 20: `nextLevel` e `nextTier` são `null`, `progress` é 100
- pontos acima de 7.500 continuam no nível 20
- pontuação negativa não é possível, mas 0 e valores entre limiares têm caso

**Pontuação**
- soma só atribuições com `revokedAt IS NULL`
- revogar derruba o total e pode derrubar o nível
- as quatro categorias aparecem, categoria sem ponto vem `0`
- usa `assignment.points`, não `kpi.points` — KPI reprecificado não muda o passado
- membro sem nenhuma atribuição: total 0, nível 0, listas vazias, não 404

**Meus KPIs**
- ordenado por data decrescente
- traz revogadas marcadas
- filtro `revoked` funciona nos dois sentidos

**Resumo**
- contagem total e por categoria
- última atribuição é a mais recente por `assignedAt`
- sem atribuição, `lastAssignment` é `null`

**Perfil público**
- não traz e-mail
- não traz status de ativação
- histórico não traz atribuições revogadas
- membro desativado → `MEMBER_NOT_FOUND`
- id inexistente → `MEMBER_NOT_FOUND`
- pedir o próprio id devolve a versão pública, não a completa

**Autorização**
- `/me/*`: anônimo → 401; MEMBER → passa; ADMIN → passa
- `/members/:id/profile`: anônimo → 401; MEMBER → passa; ADMIN → passa

---

## Critérios de aceite

- [x] Member vê seus pontos
- [x] Member vê seus KPIs
- [x] Pontuação por categoria funciona, com as quatro categorias
- [x] Pontuação considera somente atribuições válidas
- [x] Nível é calculado corretamente, incluindo os limiares exatos e o teto
- [x] Faixa (Iniciante a Lenda) acompanha o nível
- [x] Revogar KPI derruba pontos e nível
- [x] Perfil próprio traz e-mail e status
- [x] Perfil público não traz e-mail nem status
- [x] Perfil público de membro desativado devolve 404
- [x] MEMBER acessa perfil público de outro membro
- [x] Módulo `profile` não importa de `members`, `kpis` nem `assignments`

Com estes, os critérios de aceite da Fase 2 (§ 2.10) ficam todos atendidos **menos
badges**, que é 2D.

---

## Consequências registradas

**PRD e roadmap § 2.7 precisam ser reescritos.** Eles definem cinco faixas por pontuação
(0 / 500 / 1.000 / 2.000 / 5.000). Esta spec define vinte níveis, faixas por banda de
nível e teto 7.500. Só o 500 sobrevive no mesmo lugar. Sem a atualização, ficam três
documentos discordando — o mesmo problema que a 2A teve com as categorias.

**`apps/web/src/lib/member-stats.ts` fica em conflito.** Ele implementa níveis numéricos
infinitos com passo 100 → 150 → 200, e `levelOf(1840)` devolve `7`. Por esta spec, 1.840
pontos é nível 10, Destaque. O lib tem 15 testes que travam o modelo antigo. A reescrita
é story de web, não entra aqui, e o front continua no mock até ela acontecer.

**O ritmo de ~500 pontos/mês é estimativa, não medição.** Saiu do catálogo semeado mais
a expectativa de KPIs de presença, câmera, tarefa documentada e entrega. A tabela
`kpi_assignment` está vazia; ninguém pontuou ainda. Vale recalibrar quando houver seis
meses de atribuição real no banco — o formato da curva (passo dobrando a cada bloco)
sobrevive a uma recalibração, só os números mudam.

**Ranking ainda não existe.** `GET /members/:id/profile` não traz posição no ranking; o
ranking é § 3.7. O front tem `lib/ranking.ts` sobre mock e continua assim.

---

## Nota posterior — Fase 3D

`profile.levels.ts` mudou de casa na 3D: a regra dos níveis continua morando num lugar só,
agora em `packages/api/src/shared/gamification/levels.ts`, porque o dashboard do membro
também devolve `level` e módulo não importa módulo. Conteúdo e casos de teste não mudaram.
