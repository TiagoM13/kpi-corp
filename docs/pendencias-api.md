# Pendências da API

Lacunas encontradas ao integrar o front. **Não são para agora**: o front integrou só o que
a API já entrega e, onde falta dado, o bloco saiu da tela em vez de ser calculado no
cliente. A regra é o backend entregar o número pronto; o front só formata.

Cada item diz o que a tela precisa, o que existe hoje e o que a tela faz enquanto isso.

## Modo reunião (`/meetings`)

| # | A tela precisa | Hoje a API entrega | Enquanto isso |
| --- | --- | --- | --- |
| MT03 | **KPI de presença usado pela reunião**, para quem chega atrasado ganhar o mesmo | A reunião não guarda qual KPI de presença foi usado | O admin escolhe de novo no "Adicionar participantes" (pré-selecionado quando só existe um) |

## Autenticação (`/auth`)

| # | A tela precisa | Hoje a API entrega | Enquanto isso |
| --- | --- | --- | --- |
| AU01 | **Recuperar senha** — o link "esqueci" do login | Não existe rota nem tela | O link aponta para `/login` |

## Como usar este arquivo

- Item resolvido na API: apague a linha e troque o "enquanto isso" do front pelo dado
  real, no mesmo PR.
- Item novo: mesma tabela, com id do módulo (`DA`, `ME`, ...).
