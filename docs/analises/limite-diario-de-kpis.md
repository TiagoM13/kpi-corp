# Análise — limite diário de KPIs por membro

**Status:** em análise, aguardando validação da regra
**Data:** 2026-10-09
**Pendência:** [PB06](../pendencias-e-bugs.md#pb06--limite-diário-de-kpis-por-membro)

## Problema

Hoje não existe limite. O Admin pode atribuir quantos KPIs quiser ao mesmo membro no
mesmo dia, somando três caminhos:

| Caminho | Rota | Grava `meetingId` |
| --- | --- | --- |
| Presença na reunião | `POST /meetings/{id}/attendance` | sim |
| KPI ao vivo na reunião | `POST /meetings/{id}/kpi-assignments` | sim |
| Atribuição individual ou em massa | `POST /kpi-assignments`, `POST /kpi-assignments/bulk` | não |

O PRD § 6 permite atribuir o mesmo KPI várias vezes ao mesmo membro, e a spec 2B decidiu
que não há unicidade nem verificação de duplicata. Sem teto, um dia com três reuniões e
reconhecimentos individuais pode gerar uma pontuação que distorce ranking, nível e
badges. Também não há proteção contra clique repetido em KPIs diferentes.

Exemplo do problema: o membro participa de 3 reuniões e recebe presença nas 3. Ganha
outros KPIs nas reuniões e mais alguns individualmente depois. O total do dia chega a 10
ou mais, sem nenhuma regra dizendo se isso é aceitável.

## Estado atual

- **API:** nenhuma verificação de quantidade por dia em `assignments` nem em `meetings`.
  A única proteção é a presença: chamar `attendance` duas vezes para o mesmo membro na
  mesma reunião não cria duas atribuições.
- **Front:** só atribui pelo modo reunião (ver PB01). Não mostra quantos KPIs o membro já
  recebeu no dia.
- **Catálogo ativo:**

| Categoria | KPIs ativos | Pontos |
| --- | --- | --- |
| `PRESENCE` | 2 | 3 a 5 |
| `PERFORMANCE` | 17 | 10 a 50 |
| `BEHAVIOR` | 5 | 7 a 25 |
| `INITIATIVE` | 5 | 8 a 25 |

## O que os dados mostram

Banco local em 2026-10-09: 3.030 atribuições válidas, 1.241 combinações
membro-dia. **São dados do seed, sintéticos.** Servem para calibrar a ordem de grandeza,
não para fechar os números: a regra precisa ser validada com o uso real.

Por membro e por dia, considerando só atribuições válidas:

| Recorte | Média | p95 | Máximo | Máx. de pontos |
| --- | --- | --- | --- | --- |
| Total do dia | 2,44 | 5 | 10 | 169 |
| `PRESENCE` | 1,16 | 2 | 3 | 11 |
| `PERFORMANCE` | 1,66 | 3,5 | 7 | 135 |
| `BEHAVIOR` | 1,25 | 2 | 4 | 80 |
| `INITIATIVE` | 1,24 | 2 | 3 | 60 |

- O **mesmo KPI** aparece duas vezes no mesmo dia para o mesmo membro em 201 casos, e
  três vezes em 14.
- Houve no máximo **2 reuniões no mesmo dia**.
- 85% das atribuições (2.574 de 3.030) foram feitas fora de reunião. No seed, o caminho
  individual é o principal, embora o front ainda não o ofereça.

Leitura: um teto de **10 KPIs por dia** não bloqueia nem o pior dia do seed, e um teto
por categoria em torno do p95 corta só os excessos. `PERFORMANCE` é onde mora o volume
de pontos. Um único dia chegou a 135 pontos só nessa categoria.

## Perguntas a validar

1. **O teto é por quantidade, por pontos ou pelos dois?** Quantidade é simples de
   explicar ("até 10 KPIs por dia"). Pontos protege melhor o ranking, porque
   `PERFORMANCE` vai até 50 pontos por KPI.
2. **Presença entra no teto geral?** No exemplo das 3 reuniões, sim. Mas uma presença
   bloqueada porque o membro já recebeu muitos KPIs ruins é estranho: presença é fato.
3. **Quantos KPIs de presença por dia?** Um por reunião, até quantas reuniões?
4. **O mesmo KPI pode se repetir no mesmo dia?** Hoje pode. "Entregou no prazo" duas
   vezes no dia é plausível; "Destaque da Semana" duas vezes não é.
5. **O teto vale para o `ADMIN`?** O Admin também pontua e entra no ranking.
6. **O Admin pode furar o teto com justificativa?** Ou o teto é absoluto?
7. **O dia é o civil de São Paulo?** Pela [ADR 0017](../../apps/fumadocs/content/docs/adr/0017-janelas-de-calendario-em-sao-paulo.mdx),
   sim. Não usar "últimas 24 horas".

## Regra proposta

Ponto de partida para a validação, não decisão tomada.

**Janela:** dia civil em `America/Sao_Paulo` (`shared/time/`), de 00:00 a 00:00.

**O que conta:** toda atribuição **válida** (`revokedAt IS NULL`) do membro no dia,
de qualquer caminho (reunião ou individual). Revogar libera a vaga.

| Limite | Valor proposto | Observação |
| --- | --- | --- |
| Total de KPIs por dia | **10** | inclui presença |
| `PRESENCE` | **1 por reunião, até 3 por dia** | presença fora de reunião não existe |
| `PERFORMANCE` | **4 por dia** | concentra os pontos altos |
| `BEHAVIOR` | **3 por dia** | |
| `INITIATIVE` | **3 por dia** | |
| Mesmo KPI no mesmo dia | **1 vez**, exceto presença (uma por reunião) | |

Os limites por categoria somam 13, acima do total de 10. Isso é proposital: o membro
pode se destacar mais numa categoria em um dia, sem passar do total.

Não há teto de pontos nesta proposta. Se a validação mostrar que `PERFORMANCE` ainda
distorce o ranking, o próximo passo é um teto diário de pontos (algo em torno de 150).

## Como aplicar

- **Onde mora:** função pura em `packages/api/src/shared/` que recebe o que o membro já
  tem no dia e o que se quer atribuir, e devolve o que excede. É chamada pelos
  repositories de `assignments` e de `meetings`, que carregam os dados
  ([ADR 0018](../../apps/fumadocs/content/docs/adr/0018-regras-puras-em-shared.mdx)).
- **Valores:** constantes em código, como o limite de estagnação de
  `shared/members/stagnation.ts`. É regra de negócio, não configuração de ambiente.
- **Lote:** `bulkAssign` e `attendance` continuam tudo ou nada (decisão da 2B). Se um
  membro passar do limite, a requisição inteira falha e a resposta lista quem passou.
- **Concorrência:** contar e inserir dentro da mesma transação, com trava na linha do
  membro (`SELECT ... FOR UPDATE`). Sem trava, dois Admins atribuindo ao mesmo tempo
  passam juntos do teto (mesmo problema do BG01).
- **Erros novos**, `409` com `data.code`:
  - `DAILY_KPI_LIMIT_REACHED`: total do dia;
  - `DAILY_CATEGORY_LIMIT_REACHED`: limite da categoria;
  - `KPI_ALREADY_ASSIGNED_TODAY`: mesmo KPI repetido no dia.
- **Contrato:** expor o uso do dia (por exemplo `todayUsage: { total, byCategory }` na
  lista de presentes da reunião e no perfil) para o front mostrar "7/10 hoje" sem calcular
  no cliente ([ADR 0021](../../apps/fumadocs/content/docs/adr/0021-backend-entrega-o-numero-pronto.mdx)).
- **Passado:** a regra vale só para atribuições novas. Dias antigos acima do teto não são
  alterados.
- **Seed:** precisa respeitar o limite, senão o próprio seed falha. Hoje há dias com 7
  KPIs de `PERFORMANCE` e o mesmo KPI repetido até 3 vezes.

## Impacto no front

- Modo reunião: mostrar no card do participante quanto ele já recebeu no dia e
  desabilitar no picker os KPIs que ele não pode mais receber.
- Atribuição individual (PB01): mesma informação antes de confirmar.
- Mensagem própria para cada código de erro novo.

## Testes esperados

- Total: a 11ª atribuição do dia é recusada; depois de revogar uma, é aceita.
- Categoria: o 5º `PERFORMANCE` do dia é recusado mesmo com o total abaixo de 10.
- Presença: uma por reunião; a 4ª reunião do dia não gera presença.
- Mesmo KPI repetido no dia é recusado.
- Virada do dia em São Paulo: 23:59 e 00:00 caem em dias diferentes.
- Lote com um membro acima do limite não cria nada.
- Duas requisições simultâneas não passam juntas do teto.

## Próximos passos

1. Responder as perguntas a validar e fechar os números.
2. Registrar a decisão em ADR, porque a regra muda o que a 2B decidiu sobre repetição.
3. Escrever a spec da entrega (API e front).
4. Ajustar o seed.
