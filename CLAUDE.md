# Click.Play

Web app (não instalável), produção automatizada de vídeo. Base técnica: OpenReels (MIT, reaproveitado direto). Base UX/produto: MoneyPrinterTurbo (MIT, referência só, código Python não portável).

**Sempre ler `docs/IMPLEMENTATION-PLAN.md` antes de decisão de arquitetura** — plano vivo, contradizer sem checar gera retrabalho.

Repos de referência auditáveis em `D:\Github\_research\{MoneyPrinterTurbo,OpenReels}` — ler código-fonte real antes de reaproveitar/assumir, não confiar em resumo de doc antigo (achados já corrigidos: `TransitionType` não tem "zoom"; `VideoProvider`/Veo/Kling já existia no OpenReels antes de eu supor "componente novo").

## Comandos
- `pnpm --filter @clickplay/<pkg> typecheck|test` — por pacote
- `pnpm -r typecheck|test` — workspace inteiro
- Novo pacote sem teste real: `"test": "vitest run --passWithNoTests"` no package.json; trocar pra `"vitest run"` assim que houver teste de verdade.

## pnpm gotcha (Windows)
Toda dependência nova com script nativo (esbuild, msedge-tts, @google/genai, protobufjs...) trava `pnpm install` com `[ERR_PNPM_IGNORED_BUILDS]`. Editar `allowBuilds` em `pnpm-workspace.yaml` (`true`/`false` por pacote) e rodar `pnpm install` de novo — não usar `pnpm approve-builds` (interativo, quebra em non-tty).

## Workflow
Commit + push ao final de cada fase de implementação, sem esperar pedido. Trabalhar sempre na `main` — sem branch/worktree nova por fase (worktrees de sessão em background são exceção técnica, mas o trabalho é sempre fundido/pushado direto pra `main` ao fim da fase, não deixado numa branch separada).

Antes de começar a implementação de uma fase nova, perguntar ao usuário como ele quer que seja feito (escopo, o que entra agora vs depois, dependências novas) antes do primeiro código escrito.
