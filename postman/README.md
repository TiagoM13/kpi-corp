# Collection Postman — KPICorp API

Coleção completa da API para teste manual. O login guarda os tokens sozinho; nenhuma
rota exige copiar token à mão.

## Importar

No Postman, **Import** → arraste os dois arquivos:

| Arquivo | O que é |
| --- | --- |
| `KPICorp.postman_collection.json` | os requests |
| `KPICorp.local.postman_environment.json` | as variáveis do ambiente local |

Depois selecione o environment **KPICorp — local** no canto superior direito. Sem isso
`{{baseUrl}}` fica vazio e todo request falha.

## Antes de rodar

```bash
npm run db:start     # Postgres
npm run db:seed      # admin + 3 membros
npm run dev:server   # API em :3000
```

Credenciais do seed já vêm preenchidas: `admin@kpicorp.com` / `admin123` e
`ana@kpicorp.com` / `member123`.

## Como o token se propaga

1. Rode **Auth → Login — Admin**.
2. O script de teste grava `accessToken`, `refreshToken`, `userId` e `userRole` no
   environment.
3. A collection tem autenticação **Bearer `{{accessToken}}`** no nível raiz, então todo
   request herda o header. Não há o que colar.

Requests que não podem herdar o Bearer — `login`, `register`, `refresh`, `logout` e os
casos de erro — têm `noauth` explícito.

**Refresh rotaciona.** O request de refresh sobrescreve os dois tokens. Isso é
obrigatório: o token antigo é revogado na mesma chamada, e reapresentá-lo faz o servidor
revogar a família inteira por suspeita de replay. O teste do request confirma que o
token voltou diferente.

**Logout limpa** `accessToken` e `refreshToken` do environment.

## Base URL

```
http://localhost:3000/api-reference
```

É o prefixo REST/OpenAPI: JSON puro, um caminho por rota. O outro prefixo, `/rpc`, é do
client tipado do front e usa envelope `{"json": ...}` — não serve para teste manual.

A referência navegável fica em `http://localhost:3000/api-reference`.

## Estrutura

| Pasta | Conteúdo |
| --- | --- |
| **Auth** | login (admin e member), me, refresh, register, logout |
| **Members (1.6)** | listar, detalhe, convidar em lote, desativar, reativar |
| **KPIs (2A)** | listar, criar, buscar, editar, desativar, reativar |
| **Autorizacao (1.5)** | os casos de 401 e 403 |

**Cada pasta se autentica sozinha.** Members e os casos de 403 têm pre-request que faz
login com a identidade certa (admin ou member) se o token atual não servir. Assim
qualquer request funciona clicado isoladamente, e a collection inteira roda de ponta a
ponta sem depender da ordem.

**Logout fica por último** na pasta Auth de propósito: ele limpa os tokens.

**Register (convite)** consome `{{inviteToken}}`, que o request *Convidar membros*
grava automaticamente. Rode o convite antes. Sem token, o register entra em skip em vez
de falhar.

## Rodar tudo na linha de comando

```bash
npx newman run postman/KPICorp.postman_collection.json \
  -e postman/KPICorp.local.postman_environment.json
```

Estado atual: **43 asserções, todas verdes**.

Numa execução única da collection o *Register* entra em skip: ele roda antes de
*Members → Convidar membros*, que é quem grava `{{inviteToken}}`. Rodando o convite
primeiro (ou reaproveitando o environment de uma execução anterior) ele executa
normalmente.

Cada request tem **exemplos de resposta** salvos — sucesso e os erros mais comuns —
visíveis no painel de Examples do Postman, sem precisar rodar nada.

## Variáveis

| Variável | Origem |
| --- | --- |
| `baseUrl` | fixa no environment |
| `adminEmail`, `adminPassword`, `memberEmail`, `memberPassword` | seed, preenchidas |
| `accessToken`, `refreshToken` | gravadas pelo login e pelo refresh |
| `userId`, `userRole` | gravadas pelo login |
| `inviteToken` | gravada por *Members → Convidar membros* |
| `kpiId` | gravada por *KPIs → Listar KPIs* ou *Criar KPI* |
| `memberId` | gravada por *Members → Listar membros* (escolhe alguém que não seja você, já que desativar a si mesmo é 409) |

Senhas e tokens estão marcados como `secret` no environment — o Postman não os exporta
em texto puro ao compartilhar.
