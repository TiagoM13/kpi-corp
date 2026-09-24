# Revisão da API MVP — 2026-09-24

**Escopo:** `packages/api/src` + schema Prisma, contra `docs/MVP_API_ROADMAP.md`.
**Método:** leitura estática de código. Nenhum teste executado, API não subiu.
**Branch:** `api/fase-3b-ranking`.

## Resumo

Nenhuma falha crítica de segurança. Há um risco sério: presença pode ser paga em dobro se
o registro chegar duas vezes ao mesmo tempo. Todas as rotas do MVP existem e seguem a
arquitetura.

---

## ✅ Entregue

| Área | Validado no código |
| --- | --- |
| **Arquitetura** | Camadas router → service → repository respeitadas. Todo handler passa por `handle()` e declara `.output()`. Perfil é checado no procedure (`adminProcedure`), nunca dentro do handler. Módulo não importa módulo. |
| **Auth** | Login sempre roda bcrypt, mesmo com e-mail inexistente. Refresh token com SHA-256 e rotação; reuso revoga a família toda. Consumo de convite é atômico (`updateMany` com `usedAt: null`). Desativar membro revoga os refresh tokens dele. |
| **Members** | Paginação, busca, filtro de status. Não dá para desativar a si mesmo nem o último admin. Desativação não apaga o usuário. |
| **KPIs** | CRUD, 4 categorias, ativar/desativar, nome único. |
| **Atribuições** | Os pontos são copiados para a atribuição, então editar um KPI não reescreve o passado. Revogação não apaga (`revokedAt`). `assignedBy` registra quem atribuiu (RB07). RB03 e RB09 valem na rota padrão. |
| **Reuniões** | Presença roda em transação. Só aceita KPI da categoria PRESENCE. Presença repetida é ignorada em chamadas sequenciais. Reunião encerrada bloqueia novas escritas. Histórico paginado. |
| **Níveis** | Os 21 limiares batem exatamente com o §2.7. Faixas e `progress` corretos (850 pts → nível 6, 75%). |
| **Badges** | 10 no catálogo, na ordem certa. Só contam atribuições válidas e positivas. Conquista fica gravada em `user_badge`. |
| **Ranking** | Função pura compartilhada. Desempate por pontos → quantidade de KPIs → nome (pt-BR). Posições sequenciais. `quarter` só para ADMIN. Snapshot para `change`. |
| **Dashboards** | Janelas no fuso de São Paulo. A data da reunião é tratada como dia de calendário, sem erro de fuso. |
| **Privacidade** | O perfil público nem busca e-mail e status no banco. |

---

## ⚠️ Possíveis falhas

### 🔴 Crítico

#### 1. Presença paga em dobro se duas requisições chegarem juntas

`packages/api/src/modules/meetings/meetings.service.ts:151-192`

- A lista de quem recebe pontos (`toStamp`) é calculada antes das escritas.
- A transação roda em READ COMMITTED sem lock. A segunda requisição não vê o que a
  primeira ainda não gravou.
- Resultado de um duplo clique em "registrar presença": dois registros de pontos para
  cada membro.
- Afeta ranking e badges. A badge conquistada fica gravada em `user_badge` e não some ao
  revogar a atribuição duplicada.
- O roadmap §7 diz que o front não deve ser responsável por garantir regras críticas.

**Correção:** travar a reunião no início da transação (`SELECT … FOR UPDATE` na linha de
`meeting`). Isso também fecha a corrida entre `end` e `assignKpi`.

### 🟡 Médio

#### 2. RB09 quebrada na reunião

`packages/api/src/modules/meetings/meetings.service.ts:199-240`

- `assignKpi` confere se o membro estava presente, mas não se está ativo.
- Um membro desativado depois de marcar presença ainda pode receber KPI da reunião.

#### 3. Refresh token pode virar access token, dependendo da configuração

`packages/env/src/server.ts:15-16`, `packages/api/src/shared/security/tokens.ts:26`

- Nada obriga `JWT_SECRET` e `JWT_REFRESH_SECRET` a serem diferentes (é só `min(1)`).
- O payload do token é convertido sem validação. Com os dois segredos iguais, um refresh
  token (7 dias) passa pelo `protectedProcedure`.

**Correção:** exigir segredos diferentes com no mínimo 32 caracteres, e validar
`role`/`email` no payload ou incluir um claim `typ`.

#### 4. Duplicação que vai divergir com o tempo

Custo da regra "módulo não importa módulo":

- `kpiCategorySchema` repetido em 5 arquivos (kpis, assignments, meetings, profile,
  dashboard).
- `emptyAsUndefined` em 5 arquivos; `booleanFromQuery` em 3.
- `levelSchema` em profile e dashboard; `toRankableRow` em ranking e dashboard.
- O mapper de atribuição aparece 3 vezes (assignments, meetings, dashboard).
- Erros `KpiNotFound`, `MemberNotFound` e `MemberInactive` repetidos em 3 a 5 módulos.

**Correção:** mover para `shared/schemas`, `shared/errors` e `shared/mappers`.

### 🟢 Baixo

5. **Service importa Prisma**, o que o `packages/api/CLAUDE.md` proíbe:
   `auth.service.ts:1` e `kpis.service.ts:1` usam `Prisma.PrismaClientKnownRequestError`.
   O mapeamento de P2002/P2025 deveria ficar no repository.
6. **`MEMBER_INACTIVE` com status diferente para o mesmo código:** 409 em assignments e
   meetings, 403 em dashboard. Confunde o front.
7. **Atribuição em massa** (`assignments.service.ts:106-120`):
   - A validação acontece fora da transação, ao contrário do que o §8 pede.
   - `userIds` não tem limite (meetings usa 200).
   - Faz uma consulta por usuário em vez de um `findMany`.
8. **Revogação sem trava** (`assignments.service.ts:152-163`): lê e depois atualiza. Duas
   revogações simultâneas passam, e a segunda sobrescreve `revokedAt`. Correção:
   `updateMany` com `revokedAt: null`.
9. **Membro desativado mantém o access token por até 15 minutos.** O `createContext` não
   confere `active`; só o dashboard confere.
10. **Login sensível a maiúsculas:** `auth.service.ts:82` não normaliza o e-mail, mas o
    convite grava em minúsculo.
11. **Token de convite salvo em texto puro no banco**, enquanto o refresh token é salvo
    com hash. Fica inconsistente.
12. **`levelFor` com pontos negativos** divide por zero e devolve `progress` como NaN
    (`shared/gamification/levels.ts:81`). Hoje não acontece porque KPI vale no mínimo 1.
13. **Roadmap e código em desacordo:**
    - O §1.5 pede histórico público filtrado para pontos positivos; a spec 2C
      reinterpretou como "sem revogadas", e o código segue a spec.
    - O convite recebe `emails[]`, e o roadmap mostra `email`.
    - O checklist de testes do §9 está todo desmarcado, mas os testes existem.

---

## Pendências já conhecidas

- Não há rate limiting em `login`, `register` e `refresh`.
- A tabela `refresh_token` só cresce; nada limpa os revogados e expirados.
- O front ainda consome mocks, então o marco do §13 não foi atingido.

## Ordem sugerida de correção

1 → 2 → 3, porque são poucas linhas cada. A 4 é um refactor em `shared/`, para fazer num
PR separado.
