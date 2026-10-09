# apps/fumadocs

Site de documentação de engenharia do KPICorp. Next.js 16 + Fumadocs, roda em
`http://localhost:4000`.

Este arquivo cobre **apenas** `apps/fumadocs`.

## O ponto mais importante

**Os ADRs do projeto moram aqui**, em `content/docs/adr/`. Não em `docs/architecture/decisions/`
— aquele diretório só tem um `README.md` apontando para cá.

Uma fonte de verdade. Se você for escrever ou editar decisão de arquitetura, é neste app.

## Estrutura

```
apps/fumadocs/
├── content/docs/          # o conteúdo — MDX
│   ├── index.mdx          # porta de entrada
│   ├── meta.json          # ordem da sidebar raiz
│   └── adr/
│       ├── index.mdx      # índice das decisões (tabela)
│       ├── meta.json      # ordem da sidebar de ADR
│       └── NNNN-slug.mdx  # uma decisão por arquivo
└── src/
    ├── app/               # rotas Next.js (App Router)
    └── lib/source.ts      # loader do Fumadocs
```

Mexer em conteúdo é quase sempre só `content/docs/`. `src/` é o scaffold do Fumadocs e
raramente precisa de mudança.

## Adicionar um ADR

Três arquivos, sempre os três — esquecer um deixa a página órfã:

1. **Criar** `content/docs/adr/NNNN-slug-legivel.mdx`, numerando na sequência.
2. **Registrar** o slug em `content/docs/adr/meta.json` — a ordem da sidebar vem daí,
   não do nome do arquivo.
3. **Adicionar a linha** na tabela de `content/docs/adr/index.mdx`.

E, fora deste app, atualizar a tabela em `docs/architecture/decisions/README.md`.

### Formato

```mdx
---
title: 0014 — Título curto e descritivo
description: Uma linha sobre o que a decisão muda na prática.
---

**Status:** Aceita
**Data:** 2026-08-31

## Contexto
## Decisão
## Consequências
## Alternativas consideradas
```

Seções em português, na ordem acima. Link entre ADRs por caminho absoluto do site:
`[0011](/docs/adr/0011-jwt-refresh-token-rotativo)`.

### Regras

- **Uma decisão por arquivo.** Não agrupe.
- **ADR aceita é imutável.** Mudou de ideia? Escreva a próxima e marque a antiga como
  `Substituída`, com link para a nova. Perder o histórico é perder metade do valor.
- **Mostre, não apenas diga.** Tabela, Mermaid, trecho de config e número medido valem
  mais que texto corrido. As ADRs 0011 e 0012 usam saída real de comando como evidência.
- **Alternativas consideradas é obrigatória**, mesmo que seja uma só.

Status possíveis: `Proposta`, `Aceita`, `Substituída`, `Revogada`.

## Comandos

```bash
npm run dev          # da raiz sobe tudo; aqui sobe só o docs em :4000
npm run build
npm run check-types  # next typegen && tsc --noEmit
```

`next typegen` roda antes do `tsc` de propósito — sem ele o type check falha em tipo
gerado de rota.

## Mermaid

Renderiza nativamente em bloco ```mermaid. Não instale biblioteca de diagrama.

## O que **não** documentar aqui

| Assunto | Onde fica de verdade | Por quê |
| --- | --- | --- |
| Referência de endpoint | `http://localhost:3000/api-reference` | Gerada do Zod pelo oRPC; escrever à mão cria segunda fonte |
| Setup do ambiente | `README.md` da raiz | Primeiro lugar onde se olha |
| Arquitetura C4 | `docs/architecture/` | Segue o guideline de documentação |
| Regra de negócio por módulo | `docs/modules/` | Idem |
| Stories / backlog | `docs/stories/` | Nascem, viram código, morrem na entrega |
| Mockup | `docs/Mockup-KPICorp/` | Referência visual congelada |

Este app é para **decisões** — o "por quê" que sobrevive ao código.

## Biome

Tem `biome.json` próprio, herdado do scaffold do Fumadocs. Formatação daqui não segue
necessariamente a da raiz.
