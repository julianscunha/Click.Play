---
name: new-provider
description: Scaffold de um novo provider em packages/providers (types.ts + implementação + teste + export), seguindo o padrão usado em llm/, tts/, video/, image/.
---

# new-provider

Todo provider criado nesta sessão (OpenRouter, EdgeTTS, GeminiVideo, FalVideo, GeminiImage) seguiu a mesma forma. Esta skill reproduz o padrão pra não reinventar a estrutura a cada novo.

## Uso

`/new-provider <categoria> <nome>` — ex: `/new-provider music lyria`.

## Padrão (ver packages/providers/src/{llm,tts,video,image}/ como referência real)

1. Se `packages/providers/src/<categoria>/types.ts` não existir, criar com a interface do provider (nome, método principal, tipo de retorno).
2. Criar `packages/providers/src/<categoria>/<nome>.ts` implementando a interface. Se for porte de código do OpenReels (`D:\Github\_research\OpenReels\src\providers\<categoria>\<nome>.ts`), ler o original primeiro e adaptar (nunca copiar sem ler — já corrigiu 2 erros nesta sessão fazendo isso: transição "zoom" inválida, e reuso indevido de web-search removido).
3. Criar teste cobrindo a lógica não-trivial (parsing, resolução de config, branch condicional) — não mockar a chamada de rede inteira só pra ter teste, testar a lógica pura isolável.
4. Exportar em `packages/providers/src/index.ts`.
5. **Antes de `pnpm install`**: se a dependência nova tem script nativo/postinstall (SDK de provider costuma ter — esbuild, msedge-tts, @google/genai, protobufjs, better-sqlite3 e afins), adicionar entrada em `allowBuilds` no `pnpm-workspace.yaml` (`true`) na mesma alteração — evita o ciclo `[ERR_PNPM_IGNORED_BUILDS]` → descobrir → editar → reinstalar que já aconteceu nas Fases 10C/10D. Se o pacote falhar por build nativo faltando (ex.: sem Visual Studio C++ Build Tools no Windows, caso do `better-sqlite3`), preferir alternativa sem binário nativo (ex.: `node:sqlite`) antes de tentar contornar o build.
6. Rodar `/verify-package providers` antes de considerar pronto.
