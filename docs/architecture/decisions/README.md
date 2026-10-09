# Decisões de arquitetura (ADR)

Os ADRs deste projeto **não** ficam neste diretório. Eles vivem no app de documentação:

```
apps/fumadocs/content/docs/adr/
```

E são lidos em `http://localhost:4000/docs/adr` (`npm run dev`).

## Por quê

O repositório já tinha ADRs no Fumadocs antes deste guideline ser aplicado. Manter
uma cópia em Markdown aqui criaria duas fontes de verdade para a mesma decisão — que é
exatamente o que o guideline chama de pior do que não documentar.

Uma fonte só. Este arquivo existe para que quem procurar pelo caminho do guideline
encontre o caminho real.

## Índice

| # | Decisão |
| --- | --- |
| 0001 | Backend em Fastify + oRPC, sem NestJS |
| 0002 | Biome no lugar de ESLint + Prettier |
| 0003 | Lefthook como único gerenciador de git hooks |
| 0004 | shadcn/ui sobre Base UI, não Radix |
| 0005 | Tema dark-only derivado do mockup |
| 0006 | `pages/` separado de `routes/` |
| 0007 | Divergir do preset lyra nas primitives |
| 0008 | Prisma 7 com driver adapter |
| 0009 | Camadas Router, Service e Repository |
| 0010 | Erros de domínio desacoplados do oRPC |
| 0011 | JWT com refresh token rotativo |
| 0012 | bcrypt para senha, SHA-256 para refresh token |
| 0013 | Identificadores em UUID |
| 0014 | Sessão no cliente com snapshot em `localStorage` |
| 0015 | Atribuição congela a pontuação e revogar não apaga |
| 0016 | Badge é regra pura em código, carimbada na leitura |
| 0017 | Janelas de calendário no fuso de São Paulo |
| 0018 | Regras compartilhadas são funções puras em `shared/` |
| 0019 | Snapshot de ranking materializado na leitura |
| 0020 | Token de convite guardado como SHA-256 |
| 0021 | A API entrega o número pronto; o front só formata |

## Como escrever um novo

Copie a estrutura de um arquivo existente: frontmatter com `title` e `description`,
depois `Status`, `Data`, `Contexto`, `Decisão`, `Consequências` e
`Alternativas consideradas`. Numere na sequência e registre em `meta.json` — a ordem
da sidebar vem de lá, não do nome do arquivo. Atualize também a tabela em `index.mdx`
e a deste arquivo.

ADR aceita não se edita para mudar de ideia. Escreva a próxima e marque a antiga como
`Substituída`.
