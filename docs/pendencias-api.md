# Pendências da API

Lacunas encontradas ao integrar o front. **Não são para agora**: o front integrou só o que
a API já entrega e, onde falta dado, o bloco saiu da tela em vez de ser calculado no
cliente. A regra é o backend entregar o número pronto; o front só formata.

Cada item diz o que a tela precisa, o que existe hoje e o que a tela faz enquanto isso.

## Painel do Admin (`GET /dashboard/admin`)

| # | A tela precisa | Hoje a API entrega | Enquanto isso |
| --- | --- | --- | --- |
| DA01 | **Série de pontos do time por semana**, com período escolhido (7, 30 e 90 dias), para o gráfico "Pontos por semana" | Nada — só os totais `points.week` e `points.month` | `PointsChartCard` com a chamada comentada no painel |
| DA02 | **Variação contra o período anterior** (`delta` em %) de pontos do mês, KPIs da semana e membros ativos | Só o valor do período corrente | Cards sem o indicador de ▲▼ |
| DA03 | **Mini-série (sparkline)** de pontos e de KPIs para os cards de indicador | Nada | Cards sem sparkline |
| DA04 | **Pontos totais do time** (todo o histórico). O mockup mostra "Pontos totais" | Só `points.week` e `points.month` | Card mostra "Pontos no mês" |
| DA05 | **Top movers da semana**: quem mais subiu, com `change` de posição e a série de 7 dias de cada um | `ranking` = top 5 do mês, sem `change` e sem série (RN10) | `TopMoversCard` comentado; no lugar, "Top 5 do mês" com pontos e KPIs |
| DA06 | **Quem atribuiu** cada KPI no feed ("por Fulano") | `recentAssignments[].assignedBy` é só o id | Feed sem o autor |
| DA07 | **Nome da reunião** no feed, para o contexto ("Daily de terça") | `meetingId` só | Feed diz "em reunião" ou "avulso" |
| DA08 | **Limite de dias** que define "esquecido", para o texto do card não repetir a regra | O limite (30 dias, RN12) vive só no service | Texto "há 30 dias ou mais" fixo no front — se a regra mudar na API, o texto fica errado |

Sugestão de forma, sem compromisso: um `GET /dashboard/admin/points-series?period=` para
DA01 e DA03, e os demais como campos novos na resposta atual (`points.previousMonth` ou
`delta`, `points.total`, `withoutKpisDays`, `assignedBy: { id, name }`,
`meeting: { id, title } | null`, `movers: [...]`).

## Membros (`GET /members`)

| # | A tela precisa | Hoje a API entrega | Enquanto isso |
| --- | --- | --- | --- |
| ME01 | **Status "parado"** de cada membro (dias sem KPI e se passou do limite) | `lastAssignmentAt` e `createdAt` | O front calcula `daysWithoutKpi` e aplica o limite de 30 dias em `lib/members.ts` (`memberStatusOf`). **É derivação no cliente** e duplica a regra RN12 do dashboard — deve sair quando a API entregar `daysWithoutKpi` (ou `status`) |

## Como usar este arquivo

- Item resolvido na API: apague a linha e troque o "enquanto isso" do front pelo dado
  real, no mesmo PR.
- Item novo: mesma tabela, com id do módulo (`DA`, `ME`, ...).
