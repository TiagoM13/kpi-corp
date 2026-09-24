# Specs da API

Uma spec por entrega. Cada uma nasce de uma seção do
[`MVP_API_ROADMAP.md`](../MVP_API_ROADMAP.md), toma as decisões que o roadmap deixou em
aberto e sai com tasks, testes e critérios de aceite prontos para virar commits.

O roadmap diz **o quê**. A spec diz **como**, e registra o porquê de cada escolha para
que ninguém precise refazer o raciocínio seis meses depois.

---

## Ordem de execução

A dependência é estrita: cada entrega consome o que a anterior produziu. Fora da ordem,
a entrega fica sem dado para operar sobre.

```
FASE 2                          FASE 3

2A Catálogo de KPIs             3A Reuniões
        │                              │
        ▼                              │
2B Atribuições ─────────────────┐      │
        │                       │      │
        ▼                       │      │
2C Pontuação, níveis e perfil   │      │
        │                       │      │
        ▼                       ▼      │
2D Badges                3B Ranking    │
        │                       │      │
        │                3C Histórico  │
        │                       │      │
        │                       ▼      ▼
        │                    3D Dashboards
        │                          │
        └──────────────────────────┴──► 3E Badges de Fase 3
```

| # | Entrega | Spec | Cobre | Estado |
| --- | --- | --- | --- | --- |
| 1 | **2A** — Catálogo de KPIs | — | § 2.1 | entregue |
| 2 | **2B** — Atribuições | [`fase-2b-atribuicoes.md`](fase-2b-atribuicoes.md) | § 2.2, § 2.3 | entregue |
| 3 | **2C** — Pontuação, níveis e perfil | [`fase-2c-pontuacao-e-niveis.md`](fase-2c-pontuacao-e-niveis.md) | § 2.4 a § 2.7, § 2.9 | entregue |
| 4 | **2D** — Badges | [`fase-2d-badges.md`](fase-2d-badges.md) | § 2.8 | entregue |
| 5 | **3A** — Reuniões | [`fase-3a-reunioes.md`](fase-3a-reunioes.md) | § 3.1 a § 3.6, § 3.11 | entregue |
| 6 | **3B** — Ranking | [`fase-3b-ranking.md`](fase-3b-ranking.md) | § 3.7 | entregue |
| 7 | **3C** — Histórico de atribuições | [`fase-3c-historico-de-atribuicoes.md`](fase-3c-historico-de-atribuicoes.md) | § 3.10 | entregue |
| 8 | **3D** — Dashboards | [`fase-3d-dashboards.md`](fase-3d-dashboards.md) | § 3.8, § 3.9 | entregue |
| 9 | **3E** — Badges de Fase 3 | [`fase-3e-badges-de-fase-3.md`](fase-3e-badges-de-fase-3.md) | § 2.8 pendente | entregue |

A 2A não tem spec: ela foi implementada antes de o formato existir. As decisões dela
sobrevivem citadas na 2B — o congelamento de `points` e a regra de KPI inativo.

### O que pode sair da ordem

**3C não depende de 3A nem de 3B.** Ela só amplia `assignments`, que a 2B entregou. Pode
ser feita em paralelo, por outra pessoa, ou encaixada num intervalo. Está na posição 7 por
ser pré-requisito da 3D, não das anteriores.

**3A e 3B são independentes entre si.** Reunião não olha para ranking, ranking não olha
para reunião. A ordem entre as duas segue o § 5 do roadmap e nada mais.

O que **não** pode sair da ordem: 3D depende das três anteriores (conta reunião, embute
ranking, lista atribuições) e 3E depende de 2D, 3A e 3B ao mesmo tempo.

---

## O que cada entrega destrava

| Entrega | Deixa pronto para a próxima |
| --- | --- |
| 2D | as seis badges calculáveis, `user_badge`, e quatro stubs declarados |
| 3A | `meeting.closedAt`, `meeting_attendee.presentAt`, `kpi_assignment.meetingId` com escritor |
| 3B | `shared/ranking/rank.ts` e `shared/ranking/periods.ts` — usados por 3D e 3E |
| 3C | a consulta que a 3D reusa em `recentAssignments` |
| 3D | `shared/gamification/levels.ts`, saído de `modules/profile/` |
| 3E | § 2.10 e § 3.12 fechados — a API do MVP |

`shared/time/timezone.ts` é a exceção da tabela: ele não pertence a uma entrega. É criado
por 3B ou 3C, o que vier primeiro, e é justamente o que torna as duas independentes.

Quatro regras puras acabam em `shared/` ao fim da Fase 3 — fuso, níveis, ordenação de
ranking e janelas de calendário. Todas pelo mesmo motivo: dois módulos precisam da mesma
regra e módulo não importa módulo. É a regra do
[`CLAUDE.md` de `packages/api`](../../packages/api/CLAUDE.md) sendo aplicada, não uma
exceção a ela.

---

## Migrations, por entrega

| Entrega | Migration |
| --- | --- |
| 2B | `kpi_assignment`: `+ points`, `+ revokedAt`, `− active` |
| 2C | nenhuma |
| 2D | `+ user_badge` |
| 3A | `meeting`: `closed` → `closedAt` · `meeting_attendee`: `+ presentAt` · índices |
| 3B | `+ ranking_snapshot`, `+ enum RankingPeriod` |
| 3C | nenhuma |
| 3D | nenhuma |
| 3E | nenhuma |

Todas em banco de desenvolvimento local, sem migração de dado e sem backfill — o
[`CLAUDE.md` da raiz](../../CLAUDE.md) registra que não há deploy nem release.

---

## Formato

Toda spec segue a mesma sequência, e cada seção tem uma função:

| Seção | Para quê |
| --- | --- |
| **Escopo** | o que entra, o que não entra, e por que a entrega existe separada |
| **Decisões tomadas** | cada escolha com a alternativa descartada e o motivo |
| **Migration** | schema novo, ou a declaração explícita de que não há |
| **Módulo** | arquivos, e o que a regra de fronteira exige |
| **Endpoints** | rota, procedure, contrato, e o que cada campo resolve |
| **Erros** | `code`, HTTP e quando cada um acontece |
| **Tasks** | ordem por dependência; cada linha é um commit |
| **Testes** | o caso e o defeito que ele pega |
| **Critérios de aceite** | checklist verificável, ligado ao roadmap |
| **Consequências registradas** | o que fica quebrado, adiado ou em conflito depois da entrega |

**Consequências registradas** é a seção que mais paga.
É onde ficam os conflitos com o front que ainda está no mock, as duplicações aceitas por
causa da regra de módulo, os documentos que precisam ser reescritos e as decisões adiadas
com o gatilho que as reabre. Ler só essa seção das entregas anteriores é a forma mais
rápida de saber o que está torto de propósito.

---

## Spec, ADR e story

| Documento | Onde | O que é |
| --- | --- | --- |
| **Spec** | `docs/specs/` | uma entrega da API: escopo, contrato, tasks, testes |
| **ADR** | `apps/fumadocs/content/docs/adr/` | uma decisão técnica transversal, imutável depois de aceita |
| **Story** | `docs/stories/` | uma unidade de trabalho no front |

Spec **não** é ADR: ela é revisada, ajustada e envelhece junto com a entrega. Uma decisão
que sobrevive à entrega e vale para o repositório inteiro vira ADR.

Spec **não** é story: story é do front, e a Fase 3 inteira não toca em `apps/web/`. A
migração das telas para a API é trabalho separado, listado nas **Consequências
registradas** de cada spec — hoje o front consome mock para nível, ranking, badges,
reunião e dashboard.

---

## Ao terminar uma entrega

O `CLAUDE.md` da raiz é curto no ponto: *"sem doc atualizada, a feature não está pronta"*.

- [ ] marcar os critérios de aceite da spec
- [ ] marcar o checkbox correspondente no `MVP_API_ROADMAP.md` (§ 2.10 ou § 3.12)
- [ ] atualizar `docs/modules/<módulo>.md` com as regras de negócio da entrega
- [ ] atualizar `docs/architecture/COMPONENTS.md` se um módulo novo entrou
- [ ] atualizar `CHANGELOG.md`
- [ ] atualizar esta tabela: `spec escrita` → `entregue`
- [ ] reescrever o que a seção **Consequências registradas** apontou como desatualizado

O último item é o mais esquecido e o que mais custa: a 2C e a 2D já pediram a reescrita do
PRD § 7 e do roadmap § 2.7 e § 2.8, e a 3B e a 3D pedem a do § 3.7 e do § 3.9. Documento
que descreve um comportamento que a API não tem é pior do que documento que não existe.
