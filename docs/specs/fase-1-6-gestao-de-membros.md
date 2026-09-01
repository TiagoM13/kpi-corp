# Spec — 1.6 Gestão de membros

**Fase:** 1 · **Status:** proposta, aguardando validação · **Data:** 2026-09-01

Referência: [MVP_API_ROADMAP.md § 1.6](../MVP_API_ROADMAP.md) ·
Depende de [1.5 Autorização](fase-1-5-autorizacao.md)

---

## Objetivo

Permitir que o Admin gerencie a equipe: listar membros, ver um membro, convidar
alguém novo e desativar quem saiu — sem apagar histórico.

Fecha a Fase 1 junto com 1.5.

## Módulo novo: `members`

Segue o template do `auth` — camadas Router → Service → Repository, cada uma
conhecendo apenas a de baixo
([ADR 0009](http://localhost:4000/docs/adr/0009-camadas-router-service-repository)).

```
packages/api/src/modules/members/
├── members.router.ts       # adminProcedure, uma linha por rota
├── members.service.ts      # regras, lança DomainError
├── members.repository.ts   # único lugar com Prisma
├── members.schema.ts       # Zod de input e output
├── members.mapper.ts       # User (Prisma) → MemberListItem / MemberDetail
├── members.errors.ts       # erros do módulo
└── index.ts
```

### Acoplamento aceito: a tabela `invitation` tem dois donos

`members` **cria** convite; `auth` **consome** no register (já implementado, via
`findInvitationByToken` e `executeRegisterTransaction`). Dois repositories tocando a
mesma tabela.

Optamos por isso em vez de um terceiro módulo `invitations`, que existiria para um
endpoint só — a rota é `/members/invitations`, ou seja, convite é assunto de membros
do ponto de vista da API. Registrado aqui para não parecer descuido. Se a gestão de
convite crescer (reenvio, revogação, listagem de pendentes), vira módulo próprio.

Compartilhar a **tabela** é aceito; compartilhar **código entre os módulos** não é.
`members` não importa nada de `auth`: o `EmailAlreadyRegisteredError`, de que os dois
precisam, mora em `shared/errors/common.errors.ts`. A regra é cobrada por lint e por
`tests/architecture.test.ts`.

---

## Endpoints

### 1. Listar membros

```http
GET /members?page=1&limit=20&search=ana&status=ACTIVE
```

`adminProcedure`.

| Parâmetro | Tipo | Default | Observação |
| --- | --- | --- | --- |
| `page` | int ≥ 1 | 1 | |
| `limit` | int 1–100 | 20 | teto de 100 impede varredura da base numa chamada |
| `search` | string | — | casa em nome **ou** e-mail, case-insensitive, parcial |
| `status` | `ACTIVE` \| `INACTIVE` \| `ALL` | `ALL` | |

```json
{
  "items": [
    {
      "id": "b29f5637-...",
      "name": "Ana Souza",
      "email": "ana@kpicorp.com",
      "role": "MEMBER",
      "position": "Designer",
      "active": true,
      "createdAt": "2026-08-31T12:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 4,
  "totalPages": 1
}
```

**Sem dado de gamificação.** `points`, `monthPoints`, `streak`, `trend` e `rankChange`
são Fase 2 e não aparecem aqui — nem zerados. Campo que mente é pior que campo
ausente: a tela não tem como distinguir "ainda não existe" de "esse membro tem zero".
A tela de membros integra a faixa de identidade agora e segue com mock na faixa de
gamificação até a Fase 2.

Ordenação: `name` ascendente. Ranking por pontos é Fase 2.

### 2. Detalhe do membro

```http
GET /members/:id
```

`adminProcedure`. Mesmos campos do item da listagem.

Hoje o detalhe não acrescenta nada à listagem — é assim porque tudo que enriqueceria
o perfil é Fase 2. A rota existe para a tela administrativa não depender de encontrar
o membro dentro de uma página da listagem.

`404 MEMBER_NOT_FOUND` quando o id não existe.

### 3. Convidar membros

```http
POST /members/invitations
```

`adminProcedure`.

```json
{ "emails": ["joao@email.com", "ana@email.com"] }
```

```json
{
  "created": [
    {
      "id": "a1b2c3d4-...",
      "email": "joao@email.com",
      "token": "...",
      "inviteUrl": "http://localhost:3001/invite/<token>",
      "expiresAt": "2026-09-03T12:00:00.000Z"
    }
  ],
  "failed": [
    { "email": "ana@email.com", "code": "EMAIL_ALREADY_REGISTERED" }
  ]
}
```

**Lote, não um por vez.** O diálogo já implementado
(`apps/web/src/pages/admin/members/components/invite-dialog.tsx`) aceita vários
e-mails num campo só e o botão diz "Enviar convites". Uma chamada por e-mail
resolveria, mas jogaria a agregação de falha parcial para a tela.

**Falha parcial não derruba o lote.** Um e-mail já cadastrado no meio da lista não
impede os outros — vai para `failed` com o motivo, e os demais são criados. Responder
409 para o lote inteiro faria o admin perder o trabalho por causa de um endereço.

Sempre `201`, mesmo com `created` vazio: a requisição foi processada; o que falhou
está descrito no corpo. `400` fica para lista vazia ou e-mail malformado, que são erro
de forma e o schema Zod rejeita antes do handler.

Limite de **50 e-mails** por chamada.

| Regra | Comportamento |
| --- | --- |
| Validade | **48h** — bate com `INVITE_TTL_HOURS` do web e com a story `003-invite-link.md` |
| E-mail já pertence a um usuário | entra em `failed` com `EMAIL_ALREADY_REGISTERED` |
| Já existe convite pendente para o e-mail | invalida o anterior e emite um novo |
| E-mail repetido dentro da mesma lista | deduplicado antes de processar |
| Token | 32 bytes de `randomBytes`, base64url — não é uuid |

O reenvio invalidar o convite anterior é intencional: o caso real é o admin clicando
"convidar" de novo porque o primeiro link se perdeu. Deixar dois links válidos para o
mesmo e-mail multiplica a superfície sem ganho.

O token não é uuid porque uuid v4 carrega bits de versão e variante fixos e é
frequentemente logado como identificador comum. Um segredo que circula em URL deve ser
opaco e ter entropia própria.

**A API devolve o link pronto.** Não existe infraestrutura de e-mail no projeto; o
roadmap previa usá-la "caso esteja disponível", e não está. O admin copia `inviteUrl`
e envia por fora.

**`inviteUrl` vem de `WEB_APP_URL`**, variável própria, não de `CORS_ORIGIN`.

As duas apontam para o mesmo lugar hoje, mas respondem perguntas diferentes:
`CORS_ORIGIN` é *"de onde aceito requisição"* e pode legitimamente virar uma lista;
`WEB_APP_URL` é *"para onde mando quem foi convidado"* e precisa ser uma URL única e
canônica. Derivar link de convite de uma configuração de segurança acoplaria as duas
coisas — e o dia em que o CORS virasse lista, o convite passaria a apontar para um
lugar arbitrário.

Obrigatória e validada como URL em `packages/env/src/server.ts`.

Definição: Usar env unica WEB_APP_URL, não usar CORS_ORIGIN vai crescer como lista futurramente.

#### Trabalho de front decorrente

O diálogo hoje só dispara `toast.success("Convite enviado")` e fecha. Não há onde
mostrar link nenhum. Integrar 1.6 exige:

- exibir os links de `created`, cada um com botão de copiar;
- listar os `failed` com o motivo;
- **remover o campo de mensagem personalizada** — são até 500 caracteres que não têm
  para onde ir sem envio de e-mail. Volta junto com o provedor, se ele vier.

Fica registrado como consequência desta spec, não como algo já pronto.

### 4. Ativar e desativar membro

```http
PATCH /members/:id/status
```

`adminProcedure`.

```json
{ "active": false }
```

Devolve o membro atualizado. O mesmo endpoint reativa com `{ "active": true }`.

Ao desativar:

1. `active = false`
2. **revoga todos os refresh tokens do usuário** (`revokeAllRefreshTokensForUser`)

O passo 2 é o que faz a desativação valer. Sem ele o usuário segue navegando: o
refresh token vive 7 dias e continuaria rotacionando. Com ele, o refresh falha na
hora e o access token morre em no máximo 15 minutos.

Travas, ambas `409`:

| Trava | Código | Motivo |
| --- | --- | --- |
| Admin desativando a si mesmo | `CANNOT_DEACTIVATE_SELF` | evita trancar-se para fora numa ação |
| Desativar o último ADMIN ativo | `LAST_ADMIN_CANNOT_BE_DEACTIVATED` | sem admin ativo, ninguém reativa ninguém — o sistema fica sem saída |

A contagem do último admin é feita **dentro da transação** que atualiza o registro. Ler
antes e escrever depois deixa duas desativações simultâneas passarem pela checagem e
zerar os admins — mesma classe de erro do consumo de convite, que já foi corrigida em
`auth`.

Nada é apagado. `KpiAssignment`, `MeetingAttendee` e o histórico permanecem — a
desativação é um estado do usuário, não uma remoção.

---

## Ajustes em `auth` que fecham a Fase 1

Três divergências entre a API implementada e a story do web, corrigidas aqui porque
"Cadastro via convite" pertence a 1.6.

### Senha mínima: 6 → 8

`registerInputSchema` exige `.min(6)`. A story
`docs/stories/auth/003-invite-link.md` define **8 caracteres**, e a tela mostra essa
regra antes do submit. A API hoje aceita senha mais fraca do que a interface promete.

### `register` passa a aceitar `position`

O web coleta o cargo no cadastro e envia. A API não declara o campo, então ele é
descartado em silêncio e `User.position` fica sempre nulo — apesar de a coluna existir.

```ts
export const registerInputSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1),
  position: z.string().min(1).optional(),
  password: z.string().min(8),
});
```

### Remover `avatar` de `GET /auth/me`

O campo é devolvido como `null` fixo (`auth.service.ts:117`) e **não existe coluna
`avatar`** no schema. Contrato sem nada por trás.

Não é para criar a coluna: o web nunca usa imagem. `UserAvatar` gera iniciais e um
gradiente a partir de um `hue` numérico. O que a interface precisa é uma cor estável
por pessoa, e isso é derivável do `id` no cliente, sem tráfego nem coluna.

Decisão: **remover `avatar` do contrato**. Se um dia houver upload de foto, entra como
feature própria, com coluna e storage.

---

## Erros do módulo

Todos estendem `DomainError` e declaram `code` e `status`
([ADR 0010](http://localhost:4000/docs/adr/0010-erros-de-dominio)).

| Erro | `code` | HTTP |
| --- | --- | --- |
| `MemberNotFoundError` | `MEMBER_NOT_FOUND` | 404 |
| `CannotDeactivateSelfError` | `CANNOT_DEACTIVATE_SELF` | 409 |
| `LastAdminCannotBeDeactivatedError` | `LAST_ADMIN_CANNOT_BE_DEACTIVATED` | 409 |

`EMAIL_ALREADY_REGISTERED` é caso à parte. Em `POST /auth/register` ele continua sendo
um erro de domínio que vira **409**, porque ali a requisição inteira falhou. No convite
em lote ele **não vira status HTTP**: aparece como `code` dentro de `failed`, e a
resposta segue 201. O mesmo `code`, dois transportes — reflete que no lote a falha é de
um item, não da requisição.

---

## Migration

Nenhuma. `User`, `Invitation` e `RefreshToken` já têm todas as colunas necessárias.
`position` existe e está sem uso; passa a ser preenchida pelo register.

---

## Testes

Service com o repository mockado, router com o service mockado — nenhum teste da API
precisa de banco.

**Listagem**
- paginação devolve `total` e `totalPages` corretos
- `search` casa em nome e em e-mail, parcial e case-insensitive
- `status` filtra ativo, inativo e todos
- `limit` acima de 100 é rejeitado pelo schema

**Convite**
- gera token e `inviteUrl` com a base de `WEB_APP_URL`
- `expiresAt` 48h à frente
- lote com e-mail existente devolve os outros em `created` e esse em `failed`
- lote inteiro inválido responde 201 com `created` vazio
- e-mail repetido na mesma lista gera um único convite
- convite pendente anterior é invalidado ao emitir um novo
- dois convites para o mesmo e-mail não deixam dois tokens válidos
- lista vazia ou acima de 50 e-mails é rejeitada pelo schema

**Status**
- desativar revoga os refresh tokens do usuário
- admin desativando a si mesmo → `CANNOT_DEACTIVATE_SELF`
- desativar o último admin ativo → `LAST_ADMIN_CANNOT_BE_DEACTIVATED`
- desativar o penúltimo admin passa
- reativar volta `active` para `true`
- desativação não apaga `KpiAssignment` nem `MeetingAttendee`

**Register ajustado**
- senha de 7 caracteres é rejeitada, de 8 é aceita
- `position` enviado é gravado; omitido deixa a coluna nula

**Autorização** — coberta na [spec de 1.5](fase-1-5-autorizacao.md).

---

## Critérios de aceite

- [ ] Admin lista membros com paginação, busca e filtro de status
- [ ] Admin visualiza um membro
- [ ] Admin convida um ou vários e-mails de uma vez e recebe os links prontos
- [ ] E-mail inválido no lote não impede os demais
- [ ] Convite expira em 48h
- [ ] Convite para e-mail já cadastrado é recusado
- [ ] Novo convite para o mesmo e-mail invalida o anterior
- [ ] Membro completa cadastro pelo link, com cargo e senha de 8+
- [ ] Admin desativa membro e as sessões dele caem na hora
- [ ] Admin não desativa a si mesmo nem o último admin
- [ ] Histórico do membro permanece após desativação
- [ ] `avatar` removido do contrato de `/auth/me`
