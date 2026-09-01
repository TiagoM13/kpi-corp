# Spec — Fase 2A: Catálogo de KPIs

**Fase:** 2 · **Status:** proposta, aguardando validação · **Data:** 2026-09-01

Referência: [MVP_API_ROADMAP.md § 2.1](../MVP_API_ROADMAP.md) ·
Depende de: [Fase 1.5 Autorização](../MVP_API_ROADMAP.md) (`adminProcedure`, já entregue)

---

## Escopo

O CRUD do catálogo de KPIs. Cinco endpoints, um módulo novo, uma migration.

**Não entra:** atribuir KPI a membro (2B), pontuação, níveis, badges e perfil (2C).

### A Fase 2 é três entregas, não uma

| Entrega | Cobre | Depende de |
| --- | --- | --- |
| **2A — Catálogo de KPIs** (esta spec) | 2.1 | nada além da Fase 1 |
| **2B — Atribuições** | 2.2, 2.3 | 2A |
| **2C — Pontuação e gamificação** | 2.4 a 2.9 | 2B |

A dependência é estrita: não se atribui KPI que não existe, nem se calcula pontuação
sem atribuição.

### Níveis não são necessários agora

Os níveis (Iniciante → Lenda) derivam do total de pontos de um **membro**, que vem das
atribuições. O catálogo só guarda `points` por KPI e não sabe nada de nível. A definição
das faixas fica para 2C — onde há um conflito a resolver, registrado no fim desta spec.

---

## Decisões tomadas

### Categoria continua enum, agora com quatro valores

Três fontes discordavam:

| Fonte | Categorias |
| --- | --- |
| Banco (`enum KpiCategory`) | `ATTENDANCE`, `PERFORMANCE`, `BEHAVIOR` |
| Roadmap § 2.1 | `PRESENCE`, `PERFORMANCE`, `BEHAVIOR` |
| Web (`apps/web/src/mocks/kpis.ts`) | presença, desempenho, comportamento, **iniciativa** |

O enum passa a ser:

```prisma
enum KpiCategory {
  PRESENCE
  PERFORMANCE
  BEHAVIOR
  INITIATIVE

  @@map("kpi_category")
}
```

`ATTENDANCE` vira `PRESENCE` (alinha com roadmap e PRD) e `INITIATIVE` entra porque a
tela já a usa em dois KPIs do mock.

**Consequência aceita:** o PRD diz que *"Admin pode criar novas categorias"*. Com enum,
categoria nova exige migration e deploy — não é operação de admin. Se isso virar
requisito real, categoria precisa virar tabela, e migrar enum com linhas já gravadas
custa mais do que teria custado agora. Decisão consciente de escopo.

### Editar `points` é permitido, porque a atribuição vai congelar o valor

`KpiAssignment` hoje não guarda pontuação — só aponta para `kpiId`. Sem mudar isso,
editar um KPI de 5 para 50 pontos **reescreveria a pontuação passada de todo mundo** que
já o recebeu, sem que nenhum evento tivesse acontecido.

A decisão é congelar: `KpiAssignment` ganha uma coluna `points`, copiada do KPI no
instante da atribuição. Mesmo motivo pelo qual nota fiscal guarda o preço em vez de um
link para a tabela de preços.

**A coluna é criada em 2B**, que é onde atribuição passa a existir. 2A só depende da
decisão, não da coluna — mas ela é o que torna `PUT /kpis/:id` seguro para `points`.

---

## Módulo novo: `kpis`

Mesmo template de `auth` e `members`
([ADR 0009](http://localhost:4000/docs/adr/0009-camadas-router-service-repository)).

```
packages/api/src/modules/kpis/
├── kpis.router.ts       # adminProcedure, uma linha por rota
├── kpis.service.ts      # regras
├── kpis.repository.ts   # único lugar com Prisma
├── kpis.schema.ts       # Zod de input e output
├── kpis.mapper.ts       # Kpi (Prisma) → dto
├── kpis.errors.ts       # erros do módulo
└── index.ts
```

Não importa nada de `auth` nem de `members` — regra cobrada por lint e por
`tests/architecture.test.ts`. O módulo novo precisa entrar no `group` do `biome.json`;
há teste cobrando essa sincronia.

---

## Endpoints

Todos `adminProcedure`. O catálogo é ferramenta de administração; o membro vê KPI pelo
que recebeu, em `/me/kpis` (2C).

### 1. Criar KPI

```http
POST /kpis
```

```json
{
  "name": "Excelente apresentação",
  "description": "Reconhecimento por uma excelente apresentação",
  "points": 50,
  "category": "PERFORMANCE"
}
```

| Campo | Regra |
| --- | --- |
| `name` | obrigatório, 1–120 chars, **único** (índice já existe) |
| `description` | opcional, até 500 chars |
| `points` | inteiro, **1 a 100** |
| `category` | um dos quatro valores do enum |

`409 KPI_NAME_TAKEN` quando o nome já existe. A checagem é a constraint única do banco,
traduzida no service — não um `findFirst` antes do insert, que deixaria duas requisições
simultâneas passarem.

**`points` mínimo 1.** O domínio modelado é inteiramente de reconhecimento; KPI com zero
ou negativo é uma decisão de produto que ninguém tomou, e ela vaza para ranking, nível e
para o perfil público que a Fase 1 abriu entre colegas. Se punição virar requisito, entra
como decisão própria, não pela porta dos fundos de um campo sem validação.

**Teto de 100.** Os KPIs desenhados no mockup vão de 3 a 25 pontos e o exemplo do
roadmap usa 50, então 100 acomoda com folga todo valor previsto. Acima disso, um único
reconhecimento passa a valer um quinto da primeira faixa de nível do PRD (Comprometido,
500) — deixa de ser reconhecimento e vira atalho. O limite também pega o erro de
digitação na hora, com 400, em vez de virar correção de histórico depois.

### 2. Listar KPIs

```http
GET /kpis?category=PERFORMANCE&active=true&search=apresenta
```

| Parâmetro | Tipo | Default |
| --- | --- | --- |
| `category` | enum | todas |
| `active` | boolean | todos |
| `search` | string, casa em nome e descrição | — |

Query vazia (`?category=`) é tratada como ausente, como em `/members`.

**Sem paginação**, ao contrário de `/members`. O catálogo é operado por uma pessoa e
cresce em dezenas, não em milhares — e a tela de KPIs renderiza tudo em grade, sem
controle de página. Divergência deliberada de `/members`, onde a lista cresce com a
empresa. Se o catálogo passar de algumas centenas, paginar vira ajuste próprio.

Ordenação: `category` e depois `name`, ambos ascendentes — a tela agrupa por categoria.

```json
{
  "items": [
    {
      "id": "3f2a...",
      "name": "Presença na reunião",
      "description": null,
      "points": 5,
      "category": "PRESENCE",
      "active": true,
      "createdAt": "2026-09-01T12:00:00.000Z"
    }
  ],
  "total": 1
}
```

### 3. Buscar KPI

```http
GET /kpis/:id
```

`404 KPI_NOT_FOUND`.

### 4. Editar KPI

```http
PUT /kpis/:id
```

```json
{
  "name": "Excelente apresentação",
  "description": null,
  "points": 60,
  "category": "PERFORMANCE"
}
```

**`PUT` é substituição completa**, como o roadmap escreve. `description` omitida é
gravada como `null` — é a semântica de PUT, e a alternativa (omitir = manter) seria
`PATCH`. A tela envia o formulário inteiro, então isso casa com o uso real.

`points` pode mudar; atribuições já feitas não são afetadas, por causa do congelamento
descrito acima.

`409 KPI_NAME_TAKEN` se o nome colidir com outro KPI. `404` se o id não existir.

KPI desativado **pode** ser editado — corrigir o texto de algo fora de uso é legítimo.

### 5. Ativar e desativar

```http
PATCH /kpis/:id/status
```

```json
{ "active": false }
```

Mesmo endpoint reativa. Nada é apagado: KPI desativado sai das novas atribuições
(regra aplicada em 2B) e continua no histórico de quem já o recebeu.

Não há `DELETE`. Apagar um KPI arrancaria linhas do histórico de pontuação.

---

## Erros

| Erro | `code` | HTTP |
| --- | --- | --- |
| `KpiNotFoundError` | `KPI_NOT_FOUND` | 404 |
| `KpiNameTakenError` | `KPI_NAME_TAKEN` | 409 |

Ambos estendem `DomainError` e declaram `code` e `status`
([ADR 0010](http://localhost:4000/docs/adr/0010-erros-de-dominio)). Nenhum vai para
`shared/` — só este módulo os usa.

---

## Migration

Uma, e só de enum:

```sql
ALTER TYPE "kpi_category" RENAME VALUE 'ATTENDANCE' TO 'PRESENCE';
ALTER TYPE "kpi_category" ADD VALUE 'INITIATIVE';
```

Não há KPI cadastrado no banco hoje, então não há backfill. O modelo `Kpi` não muda:
`name`, `description`, `points`, `category`, `active`, `createdAt` já existem, e `name`
já é `@unique`.

---

## Tasks

Ordem por dependência. Cada uma é um commit.

| # | Task | Depende de |
| --- | --- | --- |
| 1 | Migration do enum (`PRESENCE`, `INITIATIVE`) | — |
| 2 | `kpis.errors.ts`, `kpis.mapper.ts`, `kpis.schema.ts` | 1 |
| 3 | `kpis.repository.ts` | 2 |
| 4 | `kpis.service.ts` | 3 |
| 5 | `kpis.router.ts` + registro em `routers/index.ts` + `group` do `biome.json` | 4 |
| 6 | Testes de service (repository mockado) | 4 |
| 7 | Testes de router (contrato, validação e autorização) | 5 |
| 8 | Seed com os KPIs padrão | 5 |
| 9 | Pasta KPIs na collection do Postman | 5 |

As tasks 6 e 7 podem ir junto das 4 e 5 se preferir commit por camada completa.

**Fora do escopo desta entrega, mas consequência dela:** `apps/web/src/mocks/kpis.ts`
usa ids em português minúsculo (`presenca`, `desempenho`, `comportamento`, `iniciativa`).
Quando o front consumir a API, esses ids precisam virar os quatro valores do enum. É
trabalho de web, não de 2A.

---

## Testes

Service com repository mockado, router com service mockado. Nenhum precisa de banco.

**Criar**
- cria com os quatro campos e devolve o KPI
- nome duplicado → `KPI_NAME_TAKEN`, vindo da constraint, não de checagem prévia
- `points` 0, negativo ou acima de 100 é rejeitado pelo schema
- `points` exatamente 1 e exatamente 100 são aceitos
- categoria fora do enum é rejeitada
- `description` ausente grava `null`

**Listar**
- sem filtro devolve tudo
- `category` filtra
- `active=false` devolve só inativos
- `search` casa em nome e em descrição, parcial e case-insensitive
- filtro vazio na query é tratado como ausente
- ordena por categoria e depois nome

**Buscar**
- id inexistente → `KPI_NOT_FOUND`

**Editar**
- substitui todos os campos
- `description` omitida vira `null`
- nome colidindo com outro KPI → `KPI_NAME_TAKEN`
- editar o próprio nome para o mesmo valor **não** colide
- KPI inativo pode ser editado

**Status**
- desativa e reativa
- id inexistente → `KPI_NOT_FOUND`

**Autorização**
- as cinco rotas: anônimo → 401, MEMBER → 403, ADMIN → passa
- o service não é alcançado quando a guarda barra

---

## Critérios de aceite

- [ ] Admin cria KPI com nome, descrição, pontos e categoria
- [ ] Nome duplicado é recusado com 409
- [ ] `points` fora de 1–100 é recusado
- [ ] Admin lista KPIs com filtro por categoria, status e busca
- [ ] Admin busca KPI por id
- [ ] Admin edita KPI, inclusive `points`
- [ ] Admin desativa e reativa KPI
- [ ] Não existe rota que apague KPI
- [ ] MEMBER recebe 403 nas cinco rotas
- [ ] Enum migrado para `PRESENCE` e `INITIATIVE`
- [ ] Módulo `kpis` não importa de `auth` nem de `members`

---

## Aberto para 2C, registrado aqui

**Os níveis do web e os do PRD são sistemas diferentes.**
`apps/web/src/lib/member-stats.ts` implementa níveis numéricos infinitos (0, 1, 2…, com
passo crescente de 100, 150, 200…), enquanto o PRD e o roadmap definem cinco faixas
nomeadas: Iniciante 0, Comprometido 500, Destaque 1.000, Elite 2.000, Lenda 5.000.

Hoje `levelOf(1840)` devolve `7`; pelo PRD, 1840 pontos é *Destaque*. Não são variações
do mesmo modelo — um tem teto nomeado, o outro não tem teto. Precisa ser resolvido antes
de 2C, e a escolha decide se `member-stats.ts` é reescrito ou se o PRD é atualizado.

**Dois badges dependem da Fase 3.** `TEN_MEETINGS` precisa de reuniões e `TOP_THREE`
precisa de ranking. Também não há tabela de badge no schema. Ambos são assunto de 2C.
