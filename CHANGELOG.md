# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

O projeto ainda **não tem release**. Não há tag de versão nem deploy — só ambiente de
desenvolvimento. Enquanto isso, as entradas ficam sob `Não lançado`, agrupadas por data
de entrega.

## [Não lançado]

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
