# Módulo: Dashboard

## Objetivo

Os dois agregadores que a tela inicial de cada papel consome: o dashboard do membro e o
dashboard do Admin. Uma requisição, uma resposta — o front não precisa juntar quatro
rotas para desenhar a home. Cobre a entrega 3D da Fase 3.

Código em `packages/api/src/modules/dashboard/`.

## Regras de negócio

| # | Regra |
| --- | --- |
| RN01 | Nada é guardado: sem cache, sem tabela de agregado, sem coluna desnormalizada. Dashboard com número velho é pior do que dashboard lento |
| RN02 | O módulo tem repository próprio e **não** chama `rankingService`, `profileService` nem `assignmentsService`. Usa as regras puras `shared/ranking` (`rank`, `windowOf`) e `shared/gamification` (`levelFor`) sobre linhas que ele mesmo carrega |
| RN03 | `/dashboard/member` é `protectedProcedure`: todo autenticado tem dashboard de membro, ADMIN incluído (PRD § 6) |
| RN04 | `points` e `kpiCount` somam atribuições com `revokedAt IS NULL`, sem filtro de sinal — a mesma pontuação de `/me/score`. `level` é o objeto inteiro de `levelFor`, idêntico ao de `/me/score` |
| RN05 | `rankingPosition` é do período `all` — a posição que o membro carrega como identidade — e `teamSize` é a quantidade de ativos: "4º" sem denominador não diz nada |
| RN06 | `recentKpis` deixou de existir: nenhuma tela lia o campo, porque o painel do membro mostra o histórico completo de `GET /me/profile` (`kpis`) |
| RN07 | Usuário desativado com token válido recebe **403 `ACCOUNT_DEACTIVATED`** — o mesmo erro do login, não o `MEMBER_INACTIVE` (409) de atribuição. Na prática o contexto já derruba a sessão antes (401); este é o segundo muro. Usuário inexistente recebe **404 `MEMBER_NOT_FOUND`** |
| RN08 | `/dashboard/admin` é `adminProcedure`. Contadores de `kpis`, `points` e `meetings` usam a **semana ISO e o mês de calendário correntes** de `shared/ranking/periods.ts` — na segunda de manhã a semana zera. O "mês" do dashboard é o mesmo "mês" do ranking |
| RN09 | `meetings.week` e `meetings.month` contam pela `date` da reunião **por dia de calendário**: `meeting.date` é gravado como meia-noite UTC do dia (3A), então a janela compara com `startDay`/`endDay`, não com os instantes de São Paulo — senão a reunião de segunda cairia na semana anterior. `meetings.open` conta `closedAt IS NULL` |
| RN10 | `ranking` é o top 5 do **mês corrente**, com a entrada da 3B **sem** `change` e **sem** `isMe`. Nenhuma das duas rotas grava `ranking_snapshot` |
| RN11 | `recentAssignments` são as 10 últimas atribuições, válidas **e** revogadas, com `user`, `assigner` (`{ id, name }`, quem atribuiu) e `meeting` (`{ id, title }` ou `null` para avulsa) embutidos — o feed de auditoria do Admin, no shape do histórico da 3C |
| RN12 | `membersWithoutKpis` usa janela **deslizante** de 30 dias corridos — a exceção deliberada: é pergunta sobre tempo passado, e um mês de calendário zeraria o alerta na virada. Entra o ativo cuja última atribuição válida tem 30 dias ou mais; revogada não conta como reconhecimento |
| RN13 | Quem nunca recebeu nada conta desde o `createdAt` da conta: criado ontem não entra, criado há dois meses e nunca reconhecido é o caso mais grave. A lista sai ordenada por `daysWithout` decrescente, com `lastAssignmentAt` (`null` para quem nunca recebeu) |
| RN14 | Equipe vazia responde todos os blocos com zeros e listas vazias, sem erro |
| RN15 | `points.total` soma **todo o histórico** de atribuições válidas, sem janela — o mesmo critério de `points.week` e `points.month` (todo usuário, ativo ou não). Equivale a `assignmentTotals(null)` |
| RN16 | `points.monthDelta` e `kpis.weekDelta` são a variação **em %, inteira**, contra o **mesmo trecho** do período anterior (`previousElapsedWindow`): quarta às 12h compara com a quarta às 12h da semana passada, não com a semana passada inteira — senão a semana corrente perderia toda segunda a sexta. Anterior sem pontos (≤ 0) devolve `null`, nunca infinito. A variação de membros ativos **não existe**: o banco não guarda histórico de ativação |
| RN17 | `withoutKpisDays` expõe o limite de RN12 (`shared/members/stagnation.ts`, hoje 30), para o texto do card não repetir a regra. A mesma constante e a mesma conta de dias alimentam `GET /members` (`daysWithoutKpi`, `stagnant`) |
| RN18 | `weekPoints` do dashboard do membro é a soma das atribuições válidas dele na semana ISO corrente (fuso de São Paulo). `weekSeries` são os pontos por dia dessa semana, da segunda até hoje — dias que ainda não chegaram não entram, então a soma da série é sempre `weekPoints` |
| RN19 | `rankingChange` é quantas posições o membro subiu (positivo) ou desceu (negativo) no ranking **geral** desde o início da semana ISO corrente: a posição de então sai de `rank()` sobre as atribuições anteriores à segunda-feira, calculada na leitura, sem snapshot. `null` quando o membro não tinha nenhuma atribuição antes da semana — "não sei" não é "não mudou" |
| RN20 | `trends` do Admin alimenta os sparklines dos cards sem uma segunda requisição: `points` são as últimas 8 semanas ISO (pontos por semana, a corrente em curso) e `kpis` os últimos 7 dias (KPIs por dia). Vem de **uma** consulta agrupada por dia |
| RN21 | `movers` é o top 5 da **semana ISO corrente** por pontos, só de quem pontuou, com `points`, `kpiCount`, `series` (pontos por dia da semana até hoje) e `change`: posição na semana anterior menos a de agora, calculada na leitura com `rank()` sobre a janela anterior inteira, sem snapshot (RN10 continua valendo). `null` quando a semana anterior não teve nenhuma atribuição |
| RN22 | `GET /dashboard/admin/points-series?period=` devolve `buckets: [{ start, points, kpiCount }]` do time, com zero nos vazios, só atribuições válidas e dias de São Paulo. `7d` e `30d`: um bucket por dia; `90d` (padrão): 12 semanas ISO, cada uma rotulada pela segunda-feira; `all`: um bucket por mês, do primeiro mês com dado até o corrente. A consulta agrupa por dia no banco (`to_char` no fuso de São Paulo) e o agrupamento em semana e mês é em memória, em `dashboard.series.ts` |

## Fluxos

### Dashboard do Admin

```mermaid
sequenceDiagram
    participant C as Cliente (Admin)
    participant S as dashboardService
    participant R as dashboardRepository
    participant P as shared/ranking

    C->>S: getAdminDashboard(now)
    S->>P: windowOf("week", now), windowOf("month", now)
    par consultas independentes
        S->>R: countMembers
        S->>R: assignmentTotals(semana), assignmentTotals(mês)
        S->>R: countMeetingsInWindow(semana/mês), countOpenMeetings
        S->>R: aggregateTeam(mês)
        S->>R: listRecentAssignments(10)
        S->>R: listActiveMembersWithLastValidAssignment
    end
    S->>R: listPointsByUserInWindow(top da semana)
    S->>P: rank(time do mês) → top 5 do mês; rank(semana) → movers
    S->>S: filtra ≥ 30 dias sem KPI, ordena por daysWithout
    S-->>C: members, kpis, meetings, points, withoutKpisDays, ranking, recentAssignments, membersWithoutKpis
```

## Endpoints

| Método | Rota | Descrição | Auth | Erros |
| --- | --- | --- | --- | --- |
| GET | `/dashboard/member` | Pontos, pontos e série da semana, contagem, posição geral e sua variação, nível do autenticado | `Bearer` (ADMIN e MEMBER) | 401, 403 `ACCOUNT_DEACTIVATED`, 404 `MEMBER_NOT_FOUND` |
| GET | `/dashboard/admin` | Contadores, sparklines, top movers da semana, top 5 do mês, feed e membros sem KPI | `Bearer` (ADMIN) | 401, 403 |
| GET | `/dashboard/admin/points-series` | Série de pontos e KPIs do time por período (`7d`, `30d`, `90d`, `all`) | `Bearer` (ADMIN) | 400, 401, 403 |

| Bloco do Admin | O que é | Janela |
| --- | --- | --- |
| `members.active` / `.total` | contagem de usuários | — |
| `kpis.week` / `.month` | atribuições válidas criadas | semana ISO / mês corrente |
| `kpis.weekDelta` | variação % contra o mesmo trecho da semana anterior (`null` sem base) | semana ISO |
| `meetings.week` / `.month` | reuniões pela `date` | semana ISO / mês corrente, por dia |
| `meetings.open` | `closedAt IS NULL` | — |
| `points.week` / `.month` | soma de `points` das válidas | semana ISO / mês corrente |
| `points.total` | soma de `points` das válidas, todo o histórico | — |
| `points.monthDelta` | variação % contra o mesmo trecho do mês anterior (`null` sem base) | mês corrente |
| `withoutKpisDays` | limite que define "esquecido" | — |
| `trends.points` / `.kpis` | 8 semanas de pontos, 7 dias de KPIs (sparklines) | 8 semanas / 7 dias |
| `movers` | top 5 da semana com série e `change` | semana ISO corrente |
| `ranking` | top 5 | mês corrente |
| `recentAssignments` | últimas 10, válidas e revogadas, com quem atribuiu e a reunião | — |
| `membersWithoutKpis` | ativos sem atribuição válida | últimos 30 dias corridos |

Collection Postman: pasta `Dashboards (3D)`.

## Pendências

Nenhuma do painel: o que sobrou de `docs/pendencias-api.md` é o KPI de presença da reunião
(MT03) e a recuperação de senha (AU01). A variação de membros ativos foi descartada — o
banco não guarda histórico de ativação, só o estado atual.

## Decisões relacionadas

| Documento | Assunto |
| --- | --- |
| [Spec 3D](../specs/fase-3d-dashboards.md) | Blocos, janelas e o refactor de níveis |
| [Módulo ranking](ranking.md) | `rank()` e `windowOf()` |

## Consequências registradas

- A regra de níveis saiu de `modules/profile/profile.levels.ts` para
  `shared/gamification/levels.ts`, sem mudar conteúdo nem casos de teste.
- O shape `{ id, name, position, role }` existe em `members`, `profile`, `ranking` e
  `dashboard` — preço de módulo não importar módulo.
- `apps/web/src/lib/dashboard.ts` considera estagnado quem está 7 dias sem KPI; a API
  segue os 30 dias do roadmap. Alinhar é story de web.
- Nenhum dashboard mostra badge nem série temporal; o gráfico de `team-history` segue no
  mock.
