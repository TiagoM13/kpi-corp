# Pendências da API

Lacunas encontradas ao integrar o front. **Não são para agora**: o front integrou só o que
a API já entrega e, onde falta dado, o bloco saiu da tela em vez de ser calculado no
cliente. A regra é o backend entregar o número pronto; o front só formata.

Cada item diz o que a tela precisa, o que existe hoje e o que a tela faz enquanto isso.

## Painel do Admin (`GET /dashboard/admin`)

| # | A tela precisa | Hoje a API entrega | Enquanto isso |
| --- | --- | --- | --- |
| DA01 | **Série de pontos do time por semana**, com período escolhido (7, 30 e 90 dias), para o gráfico "Pontos por semana" | Nada — só os totais `points.week` e `points.month` | `PointsChartCard` com a chamada comentada no painel |
| DA02 | **Variação de membros ativos** contra o período anterior (`delta` em %) — a de pontos do mês e a de KPIs da semana já saem da API | O banco não guarda histórico de ativação e desativação: só o estado atual (`active`) | Card "Membros ativos" sem o indicador de ▲▼. Precisa de uma tabela de eventos de status, ou de decidir que a variação sai do produto |
| DA03 | **Mini-série (sparkline)** de pontos e de KPIs para os cards de indicador | Nada | Cards sem sparkline |
| DA05 | **Top movers da semana**: quem mais subiu, com `change` de posição e a série de 7 dias de cada um | `ranking` = top 5 do mês, sem `change` e sem série (RN10) | `TopMoversCard` comentado; no lugar, "Top 5 do mês" com pontos e KPIs |

Sugestão de forma, sem compromisso: um `GET /dashboard/admin/points-series?period=` para
DA01 e DA03, e `movers: [...]` como campo novo na resposta atual para DA05.

## Modo reunião (`/meetings`)

| # | A tela precisa | Hoje a API entrega | Enquanto isso |
| --- | --- | --- | --- |
| MT03 | **KPI de presença usado pela reunião**, para quem chega atrasado ganhar o mesmo | A reunião não guarda qual KPI de presença foi usado | O admin escolhe de novo no "Adicionar participantes" (pré-selecionado quando só existe um) |

## Painel do membro (`GET /dashboard/member`, `GET /me/profile`)

| # | A tela precisa | Hoje a API entrega | Enquanto isso |
| --- | --- | --- | --- |
| MB01 | **Série dos últimos 7 dias** de pontos do membro (sparkline), para o card "Pontos nesta semana" — o total da semana já vem em `weekPoints` | Só o total da semana | Card sem sparkline (comentário em `pages/member/dashboard.tsx`) |
| MB02 | **Variação de posição no ranking** do membro, para mostrar se subiu ou desceu | `rankingPosition` e `teamSize`, sem `change` (a 3B tem `change` em `/ranking`, o dashboard não) | Mostra só a posição atual |

## Autenticação (`/auth`)

| # | A tela precisa | Hoje a API entrega | Enquanto isso |
| --- | --- | --- | --- |
| AU01 | **Recuperar senha** — o link "esqueci" do login | Não existe rota nem tela | O link aponta para `/login` |

## Como usar este arquivo

- Item resolvido na API: apague a linha e troque o "enquanto isso" do front pelo dado
  real, no mesmo PR.
- Item novo: mesma tabela, com id do módulo (`DA`, `ME`, ...).
