# Click.Play

Web app (não instalável), produção automatizada vídeo. Base técnica: OpenReels (MIT, reaproveitado direto). Base UX/produto: MoneyPrinterTurbo (MIT, só referência, código Python não portável).

**Sempre checar `docs/IMPLEMENTATION-PLAN.md` antes decisão arquitetura** — plano vivo, contradizer sem checar gera retrabalho. Usar skill `/plan-status` pra visão barata (status + índice + grep termo); ler doc inteiro só quando decisão real depender texto de seção específica.

Repos referência auditáveis em `D:\Github\_research\{MoneyPrinterTurbo,OpenReels}` — ler código-fonte real antes reaproveitar/assumir, não confiar resumo doc antigo (achados já corrigidos: `TransitionType` não tem "zoom"; `VideoProvider`/Veo/Kling já existia OpenReels antes eu supor "componente novo").

## Comandos
- `pnpm --filter @clickplay/<pkg> typecheck|test` — por pacote
- `pnpm -r typecheck|test` — workspace inteiro
- Novo pacote sem teste real: `"test": "vitest run --passWithNoTests"` no package.json; trocar pra `"vitest run"` assim que houver teste de verdade.

## pnpm gotcha (Windows)
Toda dependência nova com script nativo (esbuild, msedge-tts, @google/genai, protobufjs...) trava `pnpm install` com `[ERR_PNPM_IGNORED_BUILDS]`. Editar `allowBuilds` em `pnpm-workspace.yaml` (`true`/`false` por pacote), rodar `pnpm install` de novo — não usar `pnpm approve-builds` (interativo, quebra non-tty).

## Workflow
Commit + push fim cada fase implementação, sem esperar pedido. Trabalhar sempre `main` — sem branch/worktree nova por fase (worktrees sessão background exceção técnica, mas trabalho sempre fundido/pushado direto pra `main` fim da fase, não deixado branch separada).

Antes começar implementação fase nova, perguntar usuário como ele quer feito (escopo, o que entra agora vs depois, dependências novas) antes primeiro código escrito.
