---
name: verify-package
description: Roda typecheck + test de um pacote do monorepo Click.Play (ou de todos), no padrão usado antes de todo commit de fase.
---

# verify-package

Reproduz o check que rodei manualmente antes de cada commit de fase nesta sessão.

## Uso

`/verify-package <nome>` (ex: `domain`, `providers`, `api`) ou sem argumento para o workspace inteiro.

## Passos

1. Se um nome de pacote foi passado, rodar:
   ```
   pnpm --filter @clickplay/<nome> typecheck
   pnpm --filter @clickplay/<nome> test
   ```
2. Sem argumento, rodar `pnpm -r typecheck` e `pnpm -r test` (workspace inteiro).
3. Reportar pass/fail direto — sem resumo longo se tudo passar.
4. Se falhar, mostrar só a mensagem de erro relevante (não o log inteiro), e não prosseguir pro commit até corrigir.
