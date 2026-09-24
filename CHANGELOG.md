# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

O projeto ainda **não tem release**. Não há tag de versão nem deploy — só ambiente de
desenvolvimento. Enquanto isso, as entradas ficam sob `Não lançado`, agrupadas por data
de entrega.

## [Não lançado]

### 2026-09-24 — Revisão da API MVP, itens 5 a 13

#### Corrigido
- Usuário desativado perde a sessão na requisição seguinte: `createContext` confere
  `active` no banco e usa o `role` atual, não o do token.
- Revogação concorrente da mesma atribuição: a segunda recebe 409
  `ASSIGNMENT_ALREADY_REVOKED` em vez de sobrescrever `revokedAt`.
- Atribuição em massa valida KPI e membros dentro da mesma transação da escrita, com uma
  consulta só para os membros.
- Login encontra a conta mesmo com o e-mail digitado em maiúsculas.
- `levelFor` com pontuação negativa devolve nível 0 e `progress` 0, não `NaN`.

#### Alterado
- `/dashboard/member` responde 403 `ACCOUNT_DEACTIVATED` (antes `MEMBER_INACTIVE`) para
  conta desativada — o mesmo erro do login. `MEMBER_INACTIVE` fica só com o 409 de
  atribuição.
- `POST /kpi-assignments/bulk` aceita no máximo 200 `userIds` (400 acima disso).
- Token de convite passa a ser guardado como SHA-256 (`invitation.tokenHash`). A
  migration converte os convites existentes; links já enviados continuam válidos.
- Perfil público mostra só atribuições de pontuação positiva, como pede o roadmap § 1.5.
- Erros de constraint do Prisma são traduzidos no repository; nenhum service importa
  `@kpi-corp/db`.

### 2026-09-24 — Correções da revisão da API MVP

#### Corrigido
- Registro de presença simultâneo (duplo clique) não paga mais o mesmo membro duas
  vezes: toda escrita em reunião trava a linha de `meeting` com `SELECT … FOR UPDATE`
  antes de ler presentes e `closedAt`. Também fecha a corrida entre `end` e KPI ao vivo.
- `POST /meetings/{id}/kpi-assignments` recusa membro desativado depois de marcar
  presença com 409 `MEMBER_INACTIVE` (RB09).
- Access token passa a carregar `typ: "access"` e tem o payload validado; um refresh
  token não é mais aceito como access token mesmo com segredos iguais.

#### Alterado
- `JWT_SECRET` e `JWT_REFRESH_SECRET` exigem 32+ caracteres e precisam ser diferentes —
  o servidor não sobe com config fraca. `.env.example` atualizado.
- Schemas, mapper de atribuição e erros repetidos entre módulos foram para `shared/`
  (`schemas/`, `mappers/`, `errors/common.errors.ts`). Contrato HTTP inalterado.

### 2026-09-23 — API Fase 3E: Badges de Fase 3

#### Adicionado
- `TEN_MEETINGS`, `TOP_THREE`, `PERFECT_MONTH` e `PODIUM_STREAK` passam a ser avaliadas
  de verdade e vêm com `available: true` em `/me/profile` e `/members/{id}/profile`. O
  contrato das badges não mudou: mesmos dez códigos, mesma ordem, mesmo `badgeSchema`.
- `TEN_MEETINGS` conta presenças confirmadas (`presentAt`); `TOP_THREE` usa o ranking
  geral com o desempate da 3B; `PERFECT_MONTH` exige presença em todas as reuniões
  encerradas de um mês já fechado; `PODIUM_STREAK` procura três meses consecutivos no top
  3 dentro dos últimos 12 meses fechados. Nenhum `earnedAt` é `now()`.

#### Alterado
- O fuso das badges passa a vir de `shared/time/` — a constante duplicada em
  `profile.badges.ts` saiu, sem mudar o streak semanal.
- Exemplos de resposta de perfil na collection do Postman mostram as dez badges com
  `available: true`.

### 2026-09-23 — API Fase 3D: Dashboards

#### Adicionado
- Módulo `dashboard` com `GET /dashboard/member` (qualquer autenticado) e
  `GET /dashboard/admin` (só Admin), cada um uma resposta só, sem cache.
- Dashboard do membro: pontos, contagem, posição no ranking geral com `teamSize`, nível
  completo (o mesmo de `/me/score`) e as cinco últimas atribuições válidas. Membro
  desativado recebe 403 `MEMBER_INACTIVE`.
- Dashboard do Admin: contadores de KPIs, pontos e reuniões na semana ISO e no mês
  correntes, reuniões abertas, top 5 do mês, as 10 últimas atribuições e os membros ativos
  há 30 dias ou mais sem KPI válido.
- Pasta "Dashboards (3D)" na collection do Postman.

#### Alterado
- A regra de níveis saiu de `modules/profile/profile.levels.ts` para
  `shared/gamification/levels.ts`, sem alteração de comportamento — o teste mudou de
  pasta com os mesmos casos.

### 2026-09-23 — API Fase 3C: Histórico de atribuições

#### Adicionado
- `GET /kpi-assignments` (só Admin): todas as atribuições da equipe, paginadas no shape
  de `GET /members`, com o membro embutido em cada linha.
- Filtros combináveis `userId`, `kpiId`, `category`, `revoked` e `from`/`to` — dias
  inclusivos nas duas pontas em `America/Sao_Paulo`. Ordenação por `assignedAt`
  decrescente com desempate por `id`.
- Request "Histórico de atribuições (3C)" na pasta de atribuições do Postman.

### 2026-09-23 — API Fase 3B: Ranking

#### Adicionado
- Módulo `ranking` com `GET /ranking?period=week|month|quarter|all`: todo usuário ativo
  entra, desempate por pontos, quantidade de KPIs e nome em pt-BR, posições sequenciais.
  `quarter` é só do Admin — MEMBER recebe 403 `PERIOD_NOT_ALLOWED`.
- `change` contra o período anterior, `isMe` e o bloco `me` na resposta.
- Modelo `RankingSnapshot` e migration `20260919200339_ranking_snapshot`: a janela
  anterior é congelada na leitura, só se já fechou e teve atribuição, com teto de 12
  janelas.
- Regras puras em `shared/`: `time/timezone.ts`, `ranking/rank.ts` e
  `ranking/periods.ts`.
- Pasta "Ranking (3B)" na collection do Postman.
- Suíte da API sobe para 509 testes em 25 arquivos (3B a 3E) e os módulos ficam
  documentados em `docs/modules/` (`ranking`, `dashboard`, `assignments`, `profile`).

### 2026-09-19 — API Fase 3A: Reuniões

#### Adicionado
- Módulo `meetings` com as sete rotas do Modo Reunião: criar, detalhes, escalar
  participantes, registrar presença, KPI ao vivo, encerrar e histórico — todas exclusivas
  do Admin.
- Presença em transação única: valida reunião aberta, KPI de categoria `PRESENCE` e
  membros, carimba `presentAt` e cria um `kpi_assignment` por presente, todos com
  `meetingId` e `points` congelado. Falha no meio da lista não deixa nada criado, e
  presença dupla não dobra a pontuação.
- Reconhecimento ao vivo (`POST /meetings/{id}/kpi-assignments`) só para quem está
  presente; ausente recebe 409 `ATTENDEE_NOT_PRESENT` e continua reconhecível pela rota
  de atribuição avulsa, com `meetingId` nulo.
- `closedAt` substitui o booleano `closed`: reunião encerrada é imutável para
  participante, presença e atribuição, com 409 `MEETING_CLOSED`; segundo encerramento é
  409 `MEETING_ALREADY_CLOSED`. Revogar atribuição feita na reunião segue permitido pela
  rota da 2B. Histórico paginado com filtros `status`, `from`/`to` e contadores.
- Erros de domínio redeclarados no módulo (`KPI_NOT_FOUND`, `KPI_INACTIVE`,
  `MEMBER_NOT_FOUND`, `MEMBER_INACTIVE`), preservando o contrato `data.code` sem importar
  o módulo `assignments`. `KPI_NOT_PRESENCE` responde 422.
- Migration `20260919143727`: `meeting.closedAt`, `meeting_attendee.presentAt` e índices
  em `date` e `closedAt`.
- Seed com duas reuniões — uma aberta escalada e uma encerrada com presença mista e
  atribuições vinculadas.
- Pasta "Reuniões (3A)" na collection do Postman.
- Suíte da API sobe para 378 testes em 18 arquivos (service com repository mockado,
  router com service mockado) e módulo documentado em `docs/modules/meetings.md`.

### 2026-09-08 — API Fase 2D: Badges

#### Adicionado
- Catálogo de dez badges no módulo `profile`, com progresso, raridade, disponibilidade e
  `earnedAt` nas respostas de perfil próprio e público.
- Modelo Prisma `UserBadge` e migration para carimbar conquistas de forma idempotente.
- Avaliadores puros para categoria, volume e streak ISO em `America/Sao_Paulo`; quatro
  badges de Fase 3 permanecem declaradas e bloqueadas.

#### Corrigido
- Badge bloqueada não pode ser desbloqueada por uma linha legada em `user_badge`.

### 2026-08-31 — API de autenticação

#### Adicionado
- Módulo `auth` em `packages/api`: `login`, `register`, `refresh`, `logout` e `me`, com
  camadas Router → Service → Repository.
- Camada `shared/` na API: erros de domínio (`DomainError`, `error-mapper`, `handle`) e
  segurança (`password`, `tokens`). Reutilizável por qualquer módulo futuro.
- `protectedProcedure` e `adminProcedure` em `packages/api/src/index.ts`.
- Modelos `RefreshToken` e `Invitation` no schema Prisma.
- Script de seed (`npm run db:seed`): um admin e três membros para desenvolvimento.
- Variáveis `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN` e
  `JWT_REFRESH_EXPIRES_IN`.
- 52 testes de API com Vitest, nenhum exigindo banco.
- ADRs 0009 a 0013: camadas, erros de domínio, estratégia de JWT, hashing e UUID.
- Documentação de arquitetura (`docs/architecture/`), do módulo auth
  (`docs/modules/auth.md`), `CONTRIBUTING.md` e este changelog.
- `CLAUDE.md` na raiz e em cada app e pacote.

#### Alterado
- Ids de todas as tabelas passaram de inteiro sequencial para `uuid` — migration
  `20260831113234_change_ids_to_uuid`.
- `createContext` saiu de `packages/api/src/context.ts` para
  `packages/api/src/shared/context.ts`.

#### Removido
- Modelo `Todo`, `todoRouter` e a rota correspondente — resíduo do scaffold do
  Better-T-Stack.

#### Corrigido
- **Refresh e logout não funcionavam.** O `tokenId` dentro do JWT não era gravado como id
  da linha em `refresh_token`, então a busca nunca encontrava o registro. Todo refresh
  retornava 401 e todo logout era no-op silencioso.
- **Seed quebrado** por importar um caminho que deixou de existir após a reorganização.

#### Segurança
- **Timing attack no login.** O hash dummy usado para manter o tempo de resposta
  constante era malformado e bcrypt o rejeitava em 0 ms, contra ~200 ms de um hash real —
  a defesa era um oráculo maior que o problema. Substituído por um hash bcrypt válido.
- **Colisão de refresh token.** bcrypt trunca em 72 bytes, e dois refresh tokens do mesmo
  usuário só diferem depois desse ponto: o hash de um validava o outro. Trocado por
  SHA-256 com comparação em tempo constante.
- **Race condition no consumo de convite.** A checagem de `usedAt` acontecia fora da
  transação; duas requisições simultâneas com o mesmo token criavam duas contas. O
  consumo passou a ser um `updateMany` atômico guardado por `usedAt: null`.
- **TOCTOU no e-mail de cadastro.** Violação da constraint única passou a ser traduzida
  para `EMAIL_ALREADY_REGISTERED` em vez de 500.
- Rotação de refresh token a cada uso, com detecção de replay: token revogado que
  reaparece derruba todos os tokens do usuário.
- Erro sem tratamento deixou de vazar para o cliente — o mapper loga o original e devolve
  `"Unexpected error"`.
- `protectedProcedure` e `adminProcedure` passaram a responder 401/403 em vez de 500.

### 2026-08-30 — Dashboard do membro

#### Adicionado
- Tela de dashboard do membro, com tratamento de estado vazio e roteamento.

### 2026-08-25 — Telas administrativas e modo reunião

#### Adicionado
- Dashboard do admin com gráfico de área, feed de atividade e delta por período.
- Telas de KPIs (listagem, criação, edição e ativação) e de membros, com convite por
  diálogo e perfil em drawer.
- Ranking para admin e membro, com board compartilhado.
- Modo reunião: máquina de estado e tela, rodando fora do app shell.
- Primitives `table`, `sheet` e `dialog` em `packages/ui`; tokens de tipografia,
  esquema dark e animação de pódio.
- Ícones do app e manifest web.

#### Alterado
- App shell responsivo.
- Valores arbitrários de Tailwind substituídos por tokens do tema.

#### Corrigido
- Conformidade com as web interface guidelines em layout e overlays.
- Navegação passou a usar links do router em vez de âncoras.

### 2026-08-24 — Cadastro por convite (mock)

#### Adicionado
- Fluxo de cadastro por convite no front, com convites mock e cobertura de teste.
- Guias `CLAUDE.md` de `apps/web` e `apps/server`.

#### Alterado
- Painel de marca e logo extraídos para componentes compartilhados.

### 2026-08-23 — Setup inicial

#### Adicionado
- Monorepo Turborepo: `apps/web`, `apps/server`, `apps/fumadocs` e os pacotes `api`,
  `db`, `env`, `ui`, `config`.
- Tela de login, design tokens e sessão mock no cliente.
- App shell com navegação por perfil e guards de rota por sessão e papel.
- ADRs 0001 a 0008.
