---
name: plan-status
description: Status atual + índice de seções de docs/IMPLEMENTATION-PLAN.md, sem ler documento inteiro. Usar antes decisão rápida ("já decidido? qual fase estamos?"); ler doc completo só quando decisão de arquitetura de verdade depender do texto de uma seção específica.
---

# plan-status

CLAUDE.md manda ler `docs/IMPLEMENTATION-PLAN.md` antes toda decisão arquitetura — doc tem 300+ linhas, custa caro toda sessão. Esta skill dá visão barata primeiro.

## Uso

`/plan-status` — sem argumento, mostra linha de status + índice.
`/plan-status <termo>` — grep do termo no doc, mostra linhas de contexto (evita ler doc inteiro quando só precisa 1 seção).

## Processo

1. Rodar:
```
sed -n '1,3p' docs/IMPLEMENTATION-PLAN.md
grep -n '^##' docs/IMPLEMENTATION-PLAN.md
```
2. Se argumento passado, também rodar:
```
grep -n -i -A5 -B2 '<termo>' docs/IMPLEMENTATION-PLAN.md
```
3. Retornar resultado direto ao usuário/thread. Não ler arquivo inteiro via Read a menos que decisão de arquitetura precise do texto completo de uma seção — nesse caso, ler só a faixa de linhas daquela seção (usar offset/limit do índice acima), não o doc inteiro.
4. Pergunta genérica tipo "quais próximos passos" → responder só com status line + títulos do índice (não puxar `sed` de um bloco de seção inteiro pra isso). Só ler faixa de linhas de 1 seção quando o usuário pedir detalhe daquela seção específica.
