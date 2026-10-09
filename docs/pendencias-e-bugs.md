# Pendências e possíveis bugs

Levantamento de 2026-10-09. Junta o que falta no produto, o que está errado na
documentação e os bugs conhecidos. As lacunas entre API e front continuam também em
[`pendencias-api.md`](pendencias-api.md).

## Pendências de produto

### PB01 — Admin não consegue reconhecer membro fora da reunião

**Hoje:** um KPI só chega a um membro pelo modo reunião. Nenhuma tela do front chama
`assignments.assign` (`POST /kpi-assignments`) nem `assignments.bulkAssign`
(`POST /kpi-assignments/bulk`). A única chamada de `assignments` no front é
`assignments.revoke`, em `pages/admin/meeting/use-meeting.ts`.

**A API já entrega:** a atribuição individual e em massa existe desde a Fase 2B, com
`meetingId = null` (ver [`modules/assignments.md`](modules/assignments.md)).

**Precisa:** uma ação no front, por exemplo na lista de membros ou no perfil do membro,
para o Admin atribuir um KPI a qualquer membro ativo fora de uma reunião.

### PB02 — Presença deve ser automática ao entrar na reunião

**Hoje:** na preparação (`pages/admin/meeting/index.tsx`), o Admin precisa escolher o KPI
de presença. Ele só vem pré-selecionado quando existe **um** KPI ativo de categoria
`PRESENCE`. O catálogo tem dois ("Presença na reunião" e "Chegou no horário"), então a
escolha aparece. O mesmo vale para quem é adicionado depois, em
`add-attendees-dialog.tsx`.

**Precisa:**
- quem entra na reunião recebe a presença automaticamente;
- o KPI de presença fica definido internamente, sem seleção na tela;
- a reunião guarda qual KPI de presença foi usado, para quem entra atrasado ganhar o
  mesmo. Isso é o **MT03** de [`pendencias-api.md`](pendencias-api.md), e hoje a API
  recebe `kpiId` no corpo de `POST /meetings/{id}/attendance`.

Definir antes como o KPI de presença é escolhido internamente. A spec 3A descartou "a
API escolhe o KPI ativo de categoria `PRESENCE`" porque existem dois desse tipo.

### PB03 — Tirar "Chegou no horário" das opções do modo reunião

**Hoje:** "Chegou no horário" é um KPI de categoria `PRESENCE` e aparece como opção de
presença no modo reunião.

**Precisa:** ele não deve aparecer como opção no modo reunião. Resolver junto com PB02.

### PB04 — Recuperar senha

Sem rota nem tela. O link "esqueci" do login aponta para `/login`. É o **AU01** de
[`pendencias-api.md`](pendencias-api.md).

## Documentação errada

### DE01 — README diz que o Admin atribui KPI individualmente e em massa

A tabela de funcionalidades do `README.md` lista "Atribuição individual e em massa, com
revogação que preserva o histórico" como funcionalidade do Admin. Isso vale para a API,
mas **não existe no front** (PB01). O README precisa separar o que a API entrega do que a
tela oferece, até PB01 ser entregue.

### DE02 — Mermaid no Fumadocs

`apps/fumadocs/CLAUDE.md` diz que Mermaid "renderiza nativamente". Não há componente nem
dependência de Mermaid em `apps/fumadocs/src/components/mdx.tsx`, então os blocos
provavelmente aparecem como código puro. Falta confirmar abrindo o site.

## Possíveis bugs

### BG01 — Dois admins podem desativar um ao outro ao mesmo tempo

A guarda de "último admin ativo" (`LAST_ADMIN_CANNOT_BE_DEACTIVATED`) não trava a linha
(`FOR UPDATE`). Duas desativações simultâneas dos dois últimos admins podem passar as
duas, e o sistema fica sem nenhum admin ativo. Registrado em
[`modules/members.md`](modules/members.md).

### BG02 — Nome de KPI único só com a mesma caixa

A unicidade do nome (`KPI_NAME_TAKEN`) diferencia maiúsculas de minúsculas:
`Pontualidade` e `pontualidade` podem existir juntos. Registrado em
[`modules/kpis.md`](modules/kpis.md).

### BG03 — Presença registrada pela metade ao abrir a reunião

Abrir a reunião e registrar a presença são duas chamadas. Se a segunda falhar, a reunião
fica criada sem presença, e o front só mostra um toast pedindo para marcar de novo em
"Adicionar participantes" (`pages/admin/meeting/index.tsx`). Deixa de existir se PB02
fizer a presença acontecer junto com a entrada na reunião.

## Código morto no front

Não é bug, mas confunde quem lê:

- nenhum arquivo importa `components/activity-feed.tsx`;
- `lib/activity-feed.ts`, `lib/member-stats.ts` (exceto `levelProgress`) e
  `mocks/{users,members,activity}.ts` só são usados por testes e pelo `member-detail`
  legado;
- `lib/kpi-store.ts` só é usado pelo próprio teste;
- `mocks/kpis.ts` guarda tipos e constantes que as telas reais usam (`Kpi`,
  `KpiCategoryId`, `KPI_CATEGORIES`, `CATEGORY_BY_ID`). Deveriam estar em `lib/`.
