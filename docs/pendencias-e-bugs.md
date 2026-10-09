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

### PB05 — Achar KPI rápido no modo reunião

**Hoje:** o `KpiPicker` (`pages/admin/meeting/components/kpi-picker.tsx`) lista todos os
KPIs ativos sem busca nem filtro. No mobile é uma faixa com scroll horizontal
(`overflow-x-auto`); no desktop (`lg:`) a coluna perde o scroll (`lg:overflow-visible`)
e cresce com o catálogo. Com 29 KPIs ativos, achar um no meio da reunião exige rolar a
lista inteira.

**Precisa:**
- campo de busca por nome no topo do picker, filtrando no cliente (`kpis.list` já traz o
  catálogo inteiro, sem paginação);
- filtro rápido por categoria (presença, desempenho, comportamento, iniciativa);
- lista com altura máxima e scroll próprio no desktop, para não empurrar o resto da tela.

### PB06 — Limite diário de KPIs por membro

**Hoje:** não há limite. O mesmo membro pode receber quantos KPIs o Admin quiser no mesmo
dia, somando presença em várias reuniões, KPIs ao vivo e atribuições individuais.

**Precisa:** uma regra clara de quanto um membro pode receber por dia, no total e por
categoria, contando reunião e atribuição individual juntas. A regra ainda precisa ser
validada antes de implementar. A análise, com dados, perguntas em aberto e uma proposta
inicial (10 por dia no total, com limites por categoria), está em
[`analises/limite-diario-de-kpis.md`](analises/limite-diario-de-kpis.md).

## Modo reunião

### PB07 — Uma reunião aberta por vez, sem "continuar"

**Hoje:** a API deixa criar várias reuniões abertas ao mesmo tempo. Nada impede um
segundo `POST /meetings` com outra ainda aberta. A preparação do modo reunião lista as
reuniões abertas com o botão **Continuar** (`OpenMeetings`, em
`pages/admin/meeting/components/meeting-setup.tsx`), e o Admin pode sair e voltar
depois.

**Precisa:**
- só **uma** reunião aberta por vez. Reunião é o time todo reunido, normalmente a daily
  num horário fixo, e não existem duas ao mesmo tempo. A API deve recusar a criação
  quando já houver uma aberta, com um código novo (por exemplo
  `MEETING_ALREADY_OPEN`, `409`);
- reunião iniciada não se continua depois: ela termina em **encerrar**. Tirar o
  "Continuar" da preparação;
- definir o que acontece com uma reunião que ficou aberta por acidente (aba fechada,
  queda de rede): encerrar automaticamente ou oferecer só "encerrar" ao abrir de novo;
- decidir junto com a API o que fazer com as reuniões abertas que já existem no banco.

### PB08 — Confirmar antes de sair da reunião pelo X

**Hoje:** o X do `MeetingShell` chama `onExit` direto, sem confirmação. Um clique
acidental tira o Admin da reunião ao vivo.

**Precisa:** modal de confirmação ao clicar no X durante a reunião, com as opções
**Encerrar reunião** e **Cancelar**. Combina com PB07: sair sem encerrar deixa de ser
opção.

### PB09 — Remover KPI clicando na tag, no lugar do "Desfazer"

**Hoje:** o botão **Desfazer** (`handleUndo` em `pages/admin/meeting/index.tsx`) revoga
sempre a **última** atribuição da reunião (`lastActiveAssignment`). Funciona como pilha.
Ver BG04.

**Precisa:**
- remover o botão **Desfazer**;
- cada KPI recebido aparece como tag no card do participante, e clicar na tag revoga
  **aquela** atribuição na hora (`DELETE /kpi-assignments/{id}`, que já existe);
- feedback visual da remoção e mensagem de erro se a revogação falhar.

### PB10 — Confete ao dar KPI e no encerramento

**Hoje:** não há animação de celebração no modo reunião.

**Precisa:**
- confete curto e discreto a cada KPI atribuído, saindo do card do participante;
- no encerramento, junto com o relatório da reunião, confete mais animado destacando os
  **3 participantes com mais pontos** (o pódio que o resumo já mostra);
- respeitar `prefers-reduced-motion`: sem animação para quem desativou movimento no
  sistema.

## Segurança e robustez da API

Tarefas a fazer. Hoje o `apps/server` registra só `@fastify/cors` e os handlers oRPC.

### SR01 — Rate limiting nas rotas

**Hoje:** não existe limite de requisições. Login, refresh, validação de convite e
cadastro aceitam tentativas sem limite, o que abre espaço para força bruta de senha e
de token de convite.

**Fazer:**
- registrar `@fastify/rate-limit` no `apps/server`;
- limite global por IP e limites mais rígidos em `auth.login`, `auth.refresh`,
  `auth.validateInvite` e `auth.register`;
- resposta `429` com `Retry-After`, e o front mostrando mensagem própria;
- valores em `packages/env`, não fixos no código;
- teste cobrindo o bloqueio e a liberação.

### SR02 — Cabeçalhos e endurecimento HTTP

**Fazer:**
- `@fastify/helmet` com os cabeçalhos de segurança (HSTS, `X-Content-Type-Options`,
  `frame-ancestors` etc.);
- `bodyLimit` explícito no Fastify;
- revisar o CORS (`CORS_ORIGIN`) para aceitar só a origem do web;
- decidir se `/api-reference` fica exposto fora de `development`;
- registrar a decisão em ADR.

### SR03 — Tratamento de erros padronizado

**Hoje:** erro de domínio vira `ORPCError` com `data.code`
(`packages/api/src/shared/errors/error-mapper.ts`). Erro inesperado sai como
`INTERNAL_SERVER_ERROR` com `console.error`, fora do logger do Fastify e sem id de
requisição.

**Fazer:**
- logar erro inesperado pelo logger do Fastify (pino), com id da requisição e sem dado
  sensível (senha, token, `Authorization`);
- devolver o id da requisição na resposta de erro, para cruzar com o log;
- conferir que toda rota passa por `handle()` e que nenhum erro do Prisma vaza
  mensagem interna;
- padronizar no front a mensagem para `429`, `500` e erro de rede;
- testes para os caminhos de erro inesperado.

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

### BG04 — "Desfazer" do modo reunião só desfaz o último KPI

O **Desfazer** revoga sempre a atribuição mais recente da reunião. Se o Admin deu um KPI
errado ao membro 1 e depois deu KPIs certos aos membros 2 e 3, para corrigir o membro 1
ele precisa desfazer os KPIs certos dos membros 2 e 3 antes e dar tudo de novo. A
correção está em PB09.

### BG05 — Várias reuniões abertas ao mesmo tempo

A API aceita criar uma reunião nova com outra ainda aberta, e o front lista todas para
continuar. Presença e KPIs podem acabar registrados na reunião errada. A correção está
em PB07.

## Código morto no front

Não é bug, mas confunde quem lê:

- nenhum arquivo importa `components/activity-feed.tsx`;
- `lib/activity-feed.ts`, `lib/member-stats.ts` (exceto `levelProgress`) e
  `mocks/{users,members,activity}.ts` só são usados por testes e pelo `member-detail`
  legado;
- `lib/kpi-store.ts` só é usado pelo próprio teste;
- `mocks/kpis.ts` guarda tipos e constantes que as telas reais usam (`Kpi`,
  `KpiCategoryId`, `KPI_CATEGORIES`, `CATEGORY_BY_ID`). Deveriam estar em `lib/`.
