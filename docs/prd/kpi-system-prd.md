# KPICorp — Product Requirements Document (PRD)
**Versão:** 1.0  
**Data:** Março 2026  
**Status:** Em planejamento  

---

## 1. Visão Geral do Produto

### Problema
Empresas com times que se reúnem regularmente não têm uma forma simples e visual de reconhecer e registrar o engajamento dos membros. A presença em reuniões, entregas no prazo, iniciativas e comportamentos positivos ficam invisíveis — sem recompensa e sem histórico.

### Solução
O **KPICorp** é uma plataforma web corporativa onde o Admin cadastra KPIs (indicadores de reconhecimento com pontuação) e os distribui aos membros da equipe. Cada membro acumula pontos, sobe no ranking e acompanha sua evolução. O fluxo principal acontece durante reuniões, onde o Admin registra presenças e distribui KPIs em tempo real com poucos cliques.

### Objetivo Central
> O Admin cadastra KPIs, atribui a membros individualmente ou em reuniões, e os membros acompanham seus pontos, ranking e conquistas numa interface limpa e motivadora.

### Público-Alvo
- **Empresas de pequeno e médio porte** com times de 5 a 100 pessoas
- **Gestores / Líderes** que querem visibilidade sobre engajamento e desempenho
- **Colaboradores** que querem reconhecimento e acompanhar seu progresso

---

## 2. Personas

### 👑 Admin (Chefe / Gestor)
- Lidera reuniões e quer registrar presenças rapidamente
- Precisa de controle total: criar, atribuir e remover KPIs
- Quer visualizar o desempenho geral e individual da equipe
- Não tem tempo — ações devem ser rápidas e diretas

### 👤 Membro (Colaborador)
- Quer saber quantos pontos tem e onde está no ranking
- Quer ver quais KPIs conquistou e quando
- Quer se sentir reconhecido e motivado a participar mais
- Acessa esporadicamente, principalmente após reuniões

---

## 3. Stack Tecnológica

### Frontend
- **Framework:** React (Vite)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS
- **Roteamento:** React Router v6
- **Estado global:** Zustand
- **Componentes UI:** Radix UI + shadcn/ui
- **Ícones:** Lucide React
- **Fontes:** Google Fonts (Syne + JetBrains Mono)

### Backend
- **Runtime:** Node.js
- **Framework:** Fastify (ou Express — mais simples para MVP)
- **Linguagem:** TypeScript
- **ORM:** Prisma
- **Autenticação:** JWT (access token + refresh token)
- **Validação:** Zod

### Banco de Dados
- **Principal:** PostgreSQL (via Supabase para MVP — facilita auth e realtime)
- **Alternativa autogerenciada:** PostgreSQL + Docker

### Infraestrutura / Deploy
- **Frontend:** Vercel
- **Backend:** Railway ou Render (para MVP)
- **Banco:** Supabase (PostgreSQL gerenciado)
- **Storage (avatares futuros):** Supabase Storage

### Ferramentas de Desenvolvimento
- **Monorepo:** Turborepo (opcional, mas recomendado para escalar)
- **Lint:** ESLint + Prettier
- **Testes:** Vitest (unitários) + Playwright (E2E — pós MVP)
- **CI/CD:** GitHub Actions

---

## 4. Arquitetura Resumida

```
[Browser] 
    ↓ HTTPS
[React App — Vercel]
    ↓ REST API (JSON)
[Fastify API — Railway]
    ↓ Prisma ORM
[PostgreSQL — Supabase]
```

### Entidades Principais do Banco

- **User** — id, name, email, password_hash, role (ADMIN | MEMBER), avatar, created_at
- **KPI** — id, name, description, points, category, is_active, created_by, created_at
- **KpiAssignment** — id, kpi_id, user_id, assigned_by, assigned_at, note
- **Meeting** — id, title, date, created_by, created_at
- **MeetingAttendee** — id, meeting_id, user_id
- **Challenge** — id, title, description, points_reward, deadline, created_by (Fase 2)
- **UserChallenge** — id, challenge_id, user_id, completed_at (Fase 2)

---

## 5. Funcionalidades por Perfil

---

### 5.1 — ADMIN (Chefe / Gestor)

#### F01 — Autenticação
- Login com e-mail e senha
- Logout
- Recuperação de senha por e-mail (Fase 2)
- JWT com expiração e refresh automático

#### F02 — Gestão de Membros
- Listar todos os membros da empresa
- Convidar novo membro por e-mail (gera link de cadastro)
- Ver perfil completo de qualquer membro (pontos, KPIs, histórico)
- Desativar membro (sem deletar histórico)

#### F03 — Banco de KPIs
- Criar KPI: nome, descrição, pontuação, categoria
- Editar KPI existente
- Desativar KPI (não aparece mais para atribuição, mas mantém histórico)
- Listar todos os KPIs com filtro por categoria e status
- Categorias padrão: **Presença**, **Desempenho**, **Comportamento**
- Admin pode criar novas categorias

#### F04 — Atribuição de KPIs
- Atribuir um KPI a um membro específico
- Atribuir um KPI a múltiplos membros ao mesmo tempo
- Remover uma atribuição (com confirmação)
- Adicionar nota opcional ao atribuir ("Excelente apresentação na reunião de terça")
- Log de todas as atribuições com data, hora e quem atribuiu

#### F05 — Modo Reunião ⭐ (funcionalidade principal)
- Admin abre uma sessão de reunião (nome + data)
- Seleciona os membros presentes com um clique por membro
- Atribui o KPI de "Presença em Reunião" para todos os selecionados de uma vez
- Atribui KPIs extras individualmente durante a reunião
- Encerra a sessão — histórico da reunião fica salvo
- Confirmação visual imediata a cada atribuição

#### F06 — Dashboard Admin
- Total de membros ativos
- Total de KPIs atribuídos na semana e no mês
- Ranking geral da equipe
- Últimas atribuições realizadas
- Membros sem KPIs nos últimos 30 dias (alerta)

#### F07 — Ranking (visão Admin)
- Ranking completo por pontuação total
- Filtro por período: semana, mês, trimestre, total
- Filtro por categoria de KPI
- Exportar ranking em CSV (Fase 2)

---

### 5.2 — MEMBRO (Colaborador)

#### F08 — Autenticação
- Cadastro via link de convite enviado pelo Admin
- Login com e-mail e senha
- Logout
- Recuperação de senha (Fase 2)

#### F09 — Dashboard do Membro
- Saudação personalizada com nome
- Total de pontos acumulados
- Posição no ranking geral
- Quantidade de KPIs conquistados
- Barra de progresso para próximo nível (gamificação básica)
- Últimos 4 KPIs recebidos com data e categoria

#### F10 — Meu Perfil
- Nome, cargo, avatar (inicial por padrão, upload Fase 2)
- Total de pontos por categoria (Presença / Desempenho / Comportamento)
- Lista completa de KPIs conquistados com: nome, categoria, pontuação, quantas vezes recebeu, data do último
- Badges conquistados (ícones visuais por conquistas)

#### F11 — Ranking (visão Membro)
- Ranking geral da equipe com pódio visual (top 3)
- Posição do próprio membro sempre destacada
- Pontuação e quantidade de KPIs de cada pessoa
- Filtro por período: semana, mês, total

#### F12 — Metas & Desafios (Fase 2)
- Ver desafios ativos criados pelo Admin
- Acompanhar progresso em cada desafio
- Receber notificação quando completar um desafio
- Histórico de desafios concluídos

---

## 6. Regras de Negócio

- Um membro **só visualiza** seus próprios dados e o ranking geral — não vê dados de outros membros individualmente
- Admin **vê tudo**, incluindo dados individuais de qualquer membro
- KPIs **removidos** de um membro perdem os pontos retroativamente (o histórico é mantido como log, mas não conta na pontuação)
- Um KPI pode ser atribuído **múltiplas vezes** ao mesmo membro (ex: presença em reunião toda semana)
- A pontuação de um membro é a **soma de todos os KPIs ativos** atribuídos a ele
- O ranking usa **pontuação total** como critério principal; em caso de empate, desempata por **quantidade de KPIs** e, persistindo o empate, por **nome** em ordem alfabética (pt-BR) — a ordem nunca muda entre duas consultas iguais
- Categorias são **fixas no MVP** (Presença, Desempenho, Comportamento); Admin pode criar novas na Fase 2
- Todo Admin é também um User — pode ter KPIs atribuídos a ele por outro Admin (futuro: multi-admin)

---

## 7. Níveis e Gamificação

A progressão tem **vinte níveis** agrupados em **cinco faixas**. O nível é a régua fina,
que se move quase toda semana; a faixa é o nome que aparece na tela. As trocas de faixa
caem nos níveis 5, 10, 15 e 20.

O passo dobra a cada bloco de cinco níveis — 100, 200, 400, 800 — então subir do 19 para
o 20 custa oito vezes o que custou chegar ao nível 1.

| Faixa | Níveis | Pontuação |
|--------------|---------|-------------------|
| Iniciante | 0 – 4 | 0 a 400 pts |
| Comprometido | 5 – 9 | 500 a 1.300 pts |
| Destaque | 10 – 14 | 1.500 a 3.100 pts |
| Elite | 15 – 19 | 3.500 a 6.700 pts |
| Lenda | 20 | 7.500 pts |

Limiar de cada nível:

```text
nivel    0    1    2    3    4    5    6    7    8    9   10
pts      0  100  200  300  400  500  700  900 1100 1300 1500

nivel   11   12   13   14   15   16   17   18   19   20
pts   1900 2300 2700 3100 3500 4300 5100 5900 6700 7500
```

O nível é **função pura da pontuação válida**: KPI revogado tira os pontos e pode
derrubar o nível — coerente com a regra de que KPI removido perde os pontos
retroativamente. Nível 20 é o teto; acima de 7.500 os pontos continuam somando, o nível
não sobe mais.

Calibrado para um membro engajado (~500 pts/mês, com KPIs de presença, câmera ligada,
tarefa documentada e entrega): nível 5 em ~1 mês, nível 10 em ~3 meses, nível 15 em ~7
meses e nível 20 em pouco mais de um ano.

### Badges

Badges medem eixos que o nível não vê: **categoria**, **volume em contagem** e
**consistência no tempo** — e, na Fase 3, **posição** e **presença**. O catálogo
tem **dez badges**, seis da Fase 2 e quatro de Fase 3, todas disponíveis:

| Badge | Regra | Alvo | Raridade | Fase |
| --- | --- | --- | --- | --- |
| 🌱 Primeira pontuação (`FIRST_POINT`) | primeira atribuição válida | 1 | Comum | 2 |
| ⚡ Alta performance (`FIVE_PERFORMANCE`) | atribuições de `PERFORMANCE` | 5 | Rara | 2 |
| 🧭 Completista (`ALL_CATEGORIES`) | categorias distintas com ≥ 1 KPI | todas | Rara | 2 |
| 📚 Colecionador (`TWENTY_FIVE_KPIS`) | atribuições válidas | 25 | Rara | 2 |
| 🔥 Constante (`FOUR_WEEK_STREAK`) | semanas ISO consecutivas com ≥ 1 KPI | 4 | Épica | 2 |
| 💎 Inabalável (`TWELVE_WEEK_STREAK`) | semanas ISO consecutivas com ≥ 1 KPI | 12 | Épica | 2 |
| 🤝 Presente (`TEN_MEETINGS`) | reuniões com presença confirmada | 10 | Rara | 3 |
| 🏅 Pódio (`TOP_THREE`) | top 3 do ranking geral, com pontuação positiva | — | Épica | 3 |
| ⏱️ Pontual (`PERFECT_MONTH`) | todas as reuniões encerradas de um mês já fechado | — | Comum | 3 |
| 👑 Lendário (`PODIUM_STREAK`) | meses de calendário consecutivos no top 3 | 3 | Lendária | 3 |

Badge é **fato gravado e consequência calculada ao mesmo tempo**: a regra pura
decide, a partir do histórico, se o membro ganhou; a tabela `user_badge`
carimba a data da atribuição que fechou a regra — nunca a data da leitura. Uma
conquista carimbada **não some** quando o KPI que a gerou é revogado: `earned`
e `progress: 100` são grudentos, só o `current` regride.

O streak conta **semana ISO consecutiva**, não dia: KPI nasce de reunião e de
entrega, e uma semana de férias não pode matar o que um sábado sem ponto não
matava. Quem decide a conquista é a **melhor sequência histórica**, não a
sequência atual.

O catálogo é **código, não dado**: sem tabela de badges, sem CRUD, sem seed.
Cada badge é uma entrada em `profile.badges.ts` com o avaliador ao lado — badge
nova é commit, revisão e teste. As quatro de Fase 3 nasceram declaradas com
`available: false` na Fase 2 e foram destravadas quando reunião e ranking passaram a
existir — o contrato não mudou.

As quatro de Fase 3 seguem as mesmas invariantes e têm regras próprias:

- **Presente** conta presença confirmada, não escala; presença em reunião ainda aberta
  já conta. A data é a da décima presença.
- **Pódio** usa o mesmo desempate do ranking (pontos, quantidade de KPIs, nome). Equipe
  inteira em zero não tem pódio. Como posição não tem um evento que a fecha, a data é a
  da atribuição válida mais recente do membro.
- **Pontual** só avalia mês já fechado, com ao menos uma reunião encerrada; reunião
  aberta e reunião anterior à entrada do membro na equipe não contam. A data é o
  encerramento da última reunião daquele mês.
- **Lendário** varre os últimos 12 meses fechados; mês sem nenhuma atribuição na equipe
  quebra a sequência. O progresso mostra a melhor sequência histórica.

Pódio e Lendário descartam KPI de pontuação negativa, como toda badge — o ranking não
descarta. Um membro pode estar em 3º no ranking e não ter o Pódio; é intencional.

As badges entram nas duas respostas de perfil (`/me/profile` e
`/members/:id/profile`), sempre as dez, na ordem do catálogo — o front nunca
reconstrói o catálogo do lado dele. Detalhes e calibração nas specs da
[Fase 2D](../specs/fase-2d-badges.md) e da [Fase 3E](../specs/fase-3e-badges-de-fase-3.md).

---

## 8. Roadmap de Desenvolvimento

### Fase 1 — MVP (lançamento interno)

| # | Entrega                        | Descrição                                                     |
|---|--------------------------------|---------------------------------------------------------------|
| 1 | Setup do projeto               | Repo, CI/CD, banco, variáveis de ambiente, deploy base        |
| 2 | Auth                           | Login, JWT, dois perfis, middleware de proteção de rotas      |
| 3 | Gestão de membros              | Convidar, listar, desativar membros                           |
| 4 | Banco de KPIs                  | CRUD de KPIs com categorias                                   |
| 5 | Atribuição de KPIs             | Atribuir, remover, log de atribuições                         |
| 6 | Dashboard do Membro            | Pontos, ranking, últimos KPIs, barra de progresso             |
| 7 | Perfil do Membro               | KPIs por categoria, histórico completo, badges básicos        |
| 8 | Ranking                        | Pódio visual, lista completa, filtro por período              |
| 9 | Modo Reunião                   | Sessão de reunião, seleção de presentes, atribuição em massa  |
| 10| Dashboard Admin                | Visão geral da equipe, últimas ações, alertas                 |

### Fase 2 — Evolução

- Sistema de Metas & Desafios com prazo e recompensa
- Notificações in-app e por e-mail
- Recuperação de senha
- Upload de avatar
- Múltiplos Admins
- Exportação de relatórios (CSV / PDF)
- Filtros avançados no ranking
- Novas categorias de KPI criadas pelo Admin
- Histórico de reuniões com detalhes completos

### Fase 3 — Escala (futuro)

- App mobile (React Native)
- Integrações (Slack, Teams — notificação automática)
- Dashboard de analytics com gráficos de evolução
- Multi-empresa (SaaS)
- API pública para integrações externas

---

## 9. Fora do Escopo (MVP)

- App mobile
- Notificações push
- Integração com ferramentas externas
- Relatórios exportáveis
- KPIs automáticos (baseados em dados de outros sistemas)
- Chat ou mensagens entre membros
- Avaliação de desempenho formal (360°)

---

## 10. Critérios de Aceite — Fluxo Principal

> O sistema está pronto para uso quando:

1. Admin consegue fazer login e ver o painel geral da equipe
2. Admin consegue criar um KPI com nome, descrição, pontuação e categoria
3. Admin consegue atribuir um KPI a um membro e o membro vê imediatamente no seu painel
4. Admin consegue abrir uma reunião, selecionar membros presentes e atribuir o KPI de presença para todos com 1 ação
5. Membro consegue fazer login, ver seus pontos, seu ranking e seus KPIs conquistados
6. Ranking geral está disponível para todos os membros

---

*Documento vivo — atualizar a cada ciclo de desenvolvimento.*
