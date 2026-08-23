# Graph Report - Click.Play  (2026-08-23)

## Corpus Check
- 213 files · ~66,887 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 942 nodes · 1544 edges · 61 communities (58 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a6e2d3e1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- scripts
- api/package.json
- devDependencies
- dependencies
- video-engine/package.json
- repository.ts
- devDependencies
- providers/src/index.ts
- run-qc.ts
- compilerOptions
- domain/package.json
- Click.Play
- compilerOptions
- compilerOptions
- orchestrator.ts
- domain/tsconfig.json
- providers/tsconfig.json
- video-engine/tsconfig.json
- providers/package.json
- SettingsView.tsx
- creative-director.ts
- bundled.ts
- edge.ts
- base.ts
- Click.Play
- devDependencies
- scene.ts
- orchestrator.test.ts
- ClickPlayVideo.tsx
- llm/fallback.test.ts
- cost-approval-gate.ts
- new-provider
- verify-package
- typecheck-on-edit.cjs
- FallbackMusic
- render/types.ts
- Click.Play — Implementation Plan
- dependencies
- timeout.ts
- §11A. Roadmap de produção e qualidade de output — gaps pós-primeiro-vídeo-real
- 0.2 Correção arquitetural: estratégia de produção visual (não é slideshow)
- 11. Roadmap de produto — Studio → SaaS
- 0.1 Público-alvo e decisões de produto derivadas
- Uso
- domain/src/index.ts
- llm/types.ts
- providers.ts
- api.ts
- server.test.ts
- dependencies
- plan-status
- Wizard.tsx
- ProgressView.tsx
- TokenGate.tsx

## God Nodes (most connected - your core abstractions)
1. `ClickPlayDb` - 22 edges
2. `LLMProvider` - 16 edges
3. `Click.Play — Implementation Plan` - 15 edges
4. `runPipeline()` - 14 edges
5. `PipelineCallbacks` - 13 edges
6. `compilerOptions` - 13 edges
7. `runJobOnce()` - 12 edges
8. `generateDirectorScore()` - 12 edges
9. `request()` - 11 edges
10. `withRetry()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `staticScene()` --references--> `Scene`  [EXTRACTED]
  packages/domain/src/scene.test.ts → packages/domain/src/scene.ts
- `videoScene()` --references--> `Scene`  [EXTRACTED]
  packages/domain/src/scene.test.ts → packages/domain/src/scene.ts
- `runPipeline()` --calls--> `resolveIntroOutroScene()`  [EXTRACTED]
  packages/providers/src/pipeline/orchestrator.ts → packages/providers/src/pipeline/intro-outro.ts
- `runJobOnce()` --calls--> `runPipeline()`  [EXTRACTED]
  packages/providers/src/persistence/job-runner.ts → packages/providers/src/pipeline/orchestrator.ts
- `BaseLLM` --implements--> `LLMProvider`  [EXTRACTED]
  packages/providers/src/llm/base.ts → packages/providers/src/llm/types.ts

## Import Cycles
- None detected.

## Communities (61 total, 3 thin omitted)

### Community 0 - "scripts"
Cohesion: 0.12
Nodes (15): devDependencies, typescript, engines, node, typescript, name, private, scripts (+7 more)

### Community 1 - "api/package.json"
Cohesion: 0.17
Nodes (11): name, private, scripts, build, dev, lint, start, test (+3 more)

### Community 2 - "devDependencies"
Cohesion: 0.18
Nodes (12): typescript, vitest, devDependencies, typescript, vitest, devDependencies, @types/ffprobe-static, typescript (+4 more)

### Community 3 - "dependencies"
Cohesion: 0.10
Nodes (21): ai, @clickplay/domain, @clickplay/video-engine, @clickplay/domain, @clickplay/video-engine, drizzle-orm, @fal-ai/client, ffprobe-static (+13 more)

### Community 4 - "video-engine/package.json"
Cohesion: 0.05
Nodes (36): dependencies, @clickplay/domain, react, react-dom, remotion, @remotion/bundler, @remotion/google-fonts, @remotion/renderer (+28 more)

### Community 5 - "repository.ts"
Cohesion: 0.07
Nodes (65): addCheckpointColumnIfMissing(), addResultSummaryColumnIfMissing(), addStageDetailColumnIfMissing(), ClickPlayDb, createDb(), ensureWalletRow(), toRow(), JobRunnerDeps (+57 more)

### Community 6 - "devDependencies"
Cohesion: 0.06
Nodes (33): dependencies, react, react-dom, devDependencies, tailwindcss, @tailwindcss/vite, @types/react, @types/react-dom (+25 more)

### Community 7 - "providers/src/index.ts"
Cohesion: 0.05
Nodes (24): sleep(), withRetry(), FallbackImage, GeminiImage, OpenRouterImage, ImageProvider, OpenRouterMusic, FalVideo (+16 more)

### Community 8 - "run-qc.ts"
Cohesion: 0.08
Nodes (28): RevisionLogEntry, checkBlackdetect(), checkCostDeviation(), checkCriticScore(), checkDurationMatch(), checkOutputExists(), checkResolutionMatch(), ExpectedFormat (+20 more)

### Community 9 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution (+6 more)

### Community 10 - "domain/package.json"
Cohesion: 0.18
Nodes (10): main, name, private, scripts, lint, test, typecheck, type (+2 more)

### Community 11 - "Click.Play"
Cohesion: 0.18
Nodes (9): Click.Play, Configuração, Estrutura do plano, Instalação, Licença, Onde conseguir cada chave, Para que serve, Requisitos (+1 more)

### Community 12 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, jsx, lib, noEmit, types, extends, include, DOM (+5 more)

### Community 13 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, jsx, lib, module, moduleResolution, outDir, rootDir, extends (+5 more)

### Community 14 - "orchestrator.ts"
Cohesion: 0.20
Nodes (14): DirectorScore, CritiqueOutput, CritiqueResult, evaluate(), SYSTEM_PROMPT_PATH, ArchetypeConfig, ARCHETYPES, getArchetype() (+6 more)

### Community 15 - "domain/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src, ../../tsconfig.base.json

### Community 16 - "providers/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src, ../../tsconfig.base.json

### Community 17 - "video-engine/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src, ../../tsconfig.base.json

### Community 18 - "providers/package.json"
Cohesion: 0.18
Nodes (10): main, name, private, scripts, lint, test, typecheck, type (+2 more)

### Community 19 - "SettingsView.tsx"
Cohesion: 0.14
Nodes (10): putSettings(), Settings, BADGE_STYLES, BadgeKind, MODEL_FIELDS, ModelSelect(), ModelSelectProps, SECRET_FIELDS (+2 more)

### Community 22 - "creative-director.ts"
Cohesion: 0.23
Nodes (17): assertSceneCountCap(), assertVideoMode(), buildDefaultPrompt(), buildPacingInstruction(), buildVideoModeGuidance(), DirectorScoreOutput, DirectorScoreRaw, extractVisualPrompt() (+9 more)

### Community 24 - "bundled.ts"
Cohesion: 0.21
Nodes (10): listTracks(), loadManifest(), MANIFEST_PATH, ManifestTrack, MUSIC_DIR, MusicManifest, MusicSelection, PACKAGE_ROOT (+2 more)

### Community 25 - "edge.ts"
Cohesion: 0.10
Nodes (13): EDGE_TTS_VOICES, EdgeTTS, parseWordBoundaries(), resolveEdgeVoice(), sleep(), streamToBuffer(), FallbackTTS, estimateWordTimestamps() (+5 more)

### Community 26 - "base.ts"
Cohesion: 0.23
Nodes (6): BaseLLM, FakeLLM, generateTextMock, OpenRouterLLM, LLMProviderKey, LLMResult

### Community 27 - "Click.Play"
Cohesion: 0.40
Nodes (4): Click.Play, Comandos, pnpm gotcha (Windows), Workflow

### Community 28 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, ffmpeg-static, tsx, @types/node, @types/react, @types/react-dom, ffmpeg-static, ffmpeg-static (+4 more)

### Community 29 - "scene.ts"
Cohesion: 0.09
Nodes (25): AudioTrack, MusicMood, MusicTrack, NarrationTrack, WordTimestamp, Caption, CaptionStyleKey, CameraMotion (+17 more)

### Community 30 - "orchestrator.test.ts"
Cohesion: 0.10
Nodes (17): IMAGE_PRICING_PER_IMAGE, LLM_CALL_TOKEN_ESTIMATES, LLM_PRICING_PER_MODEL, MODEL_BY_TIER, MUSIC_PRICING_PER_TRACK, TTS_PRICING_PER_CHAR, VIDEO_PRICING_PER_SECOND, runPipeline() (+9 more)

### Community 31 - "ClickPlayVideo.tsx"
Cohesion: 0.18
Nodes (8): ClickPlayVideoRoot(), DEFAULT_PROPS, Main(), resolveAsset(), preparePublicAssets(), RemotionRenderer, RemotionRendererOptions, VideoRenderer

### Community 32 - "llm/fallback.test.ts"
Cohesion: 0.29
Nodes (3): FallbackLLM, opts, schema

### Community 34 - "new-provider"
Cohesion: 0.50
Nodes (3): new-provider, Padrão (ver packages/providers/src/{llm,tts,video,image}/ como referência real), Uso

### Community 35 - "verify-package"
Cohesion: 0.50
Nodes (3): Passos, Uso, verify-package

### Community 41 - "render/types.ts"
Cohesion: 0.29
Nodes (5): JUSTIFY_BY_POSITION, CompositionProps, RenderInput, ResolvedElement, ResolvedScene

### Community 42 - "Click.Play — Implementation Plan"
Cohesion: 0.17
Nodes (12): 0. Resumo da decisão, 10. Critérios de aceite, 1. Arquitetura proposta, 2. Matriz de reaproveitamento, 3. Componentes reutilizados (quase sem mudança), 4. Componentes adaptados (reescrita parcial), 5. Componentes removidos, 6. Componentes novos (não existem em nenhum dos dois) (+4 more)

### Community 43 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, @clickplay/providers, fastify, @fastify/cors, @fastify/helmet, @fastify/rate-limit, @fastify/static, react (+11 more)

### Community 45 - "timeout.ts"
Cohesion: 0.70
Nodes (3): GenerateProvider, withProviderTimeout(), withTimeout()

### Community 46 - "§11A. Roadmap de produção e qualidade de output — gaps pós-primeiro-vídeo-real"
Cohesion: 0.22
Nodes (9): §11A. Roadmap de produção e qualidade de output — gaps pós-primeiro-vídeo-real, Bloco 1 — Vídeo vs slideshow (item 1). **Resolvido.**, Bloco 2 — Controles de produção: resolução, qualidade, duração (itens 2, 3, 4), Bloco 3 — Idioma (item 5), Bloco 4 — Legendas e overlay (itens 6, 7, 8), Bloco 5 — Abertura/encerramento (item 10), Bloco 6 — Observabilidade e output final (itens 9, 11), Bloco 7 — Briefing auto-completável a partir do título (ideia do MoneyPrinterTurbo) (+1 more)

### Community 47 - "0.2 Correção arquitetural: estratégia de produção visual (não é slideshow)"
Cohesion: 0.29
Nodes (7): 0.2 Correção arquitetural: estratégia de produção visual (não é slideshow), As duas abstrações (substituindo "AssetProvider" como abstração principal), Creative Director: decide *como* produzir, não só *o que* mostrar, Modelo de Scene: de "1 visual" para composição, Regra explícita contra slideshow, Storyboard, Terminologia (não confundir)

### Community 48 - "11. Roadmap de produto — Studio → SaaS"
Cohesion: 0.33
Nodes (6): 11. Roadmap de produto — Studio → SaaS, Decisões a tomar agora (evitar refatoração futura), Dependências entre fases, Fases propostas (15+), O que não muda / não é reimplementado, Separação MVP / Evolução Studio / SaaS

### Community 49 - "0.1 Público-alvo e decisões de produto derivadas"
Cohesion: 0.40
Nodes (5): 0.1 Público-alvo e decisões de produto derivadas, Arquétipos novos (Click.Play), Legendas: 7 estilos disponíveis, default por arquétipo, Música: bundled default, IA só se confirmado grátis, TTS: múltiplos providers, default remoto grátis

### Community 50 - "Uso"
Cohesion: 0.50
Nodes (4): Comandos, Docker, Local (Node/pnpm), Uso

### Community 54 - "domain/src/index.ts"
Cohesion: 0.17
Nodes (4): Asset, AssetType, ComposedScene, VisualCompositionProvider

### Community 55 - "llm/types.ts"
Cohesion: 0.14
Nodes (11): research, research(), ResearchOutput, ResearchResult, SYSTEM_PROMPT_PATH, RESULT, LLMProvider, GeneratedCopy (+3 more)

### Community 56 - "providers.ts"
Cohesion: 0.18
Nodes (17): openDb(), app, db, envFilePath, port, runsDir, buildCostOptions(), buildImageProvider() (+9 more)

### Community 57 - "api.ts"
Cohesion: 0.18
Nodes (19): approveCost(), CostAmount, createJob(), Credits, getCredits(), getFormConfig(), getJob(), getSettings() (+11 more)

### Community 58 - "server.test.ts"
Cohesion: 0.06
Nodes (43): CAPTION_STYLES, getFormConfig(), getRecommendedModels(), PACING_TIERS, RECOMMENDED_IMAGE_MODELS, RECOMMENDED_TTS_FALLBACK_MODELS, RECOMMENDED_VIDEO_MODELS, readEnvFile() (+35 more)

### Community 60 - "dependencies"
Cohesion: 0.33
Nodes (6): zod, dependencies, @clickplay/shared, zod, zod, zod

### Community 61 - "plan-status"
Cohesion: 0.50
Nodes (3): plan-status, Processo, Uso

### Community 66 - "Wizard.tsx"
Cohesion: 0.17
Nodes (12): CreateJobInput, FormConfig, TransitionType, CHUNK_SIZE_LEVELS, formatLabel(), FormState, INITIAL_STATE, STEPS (+4 more)

### Community 69 - "ProgressView.tsx"
Cohesion: 0.21
Nodes (10): CostBreakdown, JobView, outputUrl(), costLine(), friendlyError(), ProgressView(), ProgressViewProps, STAGE_LABELS (+2 more)

### Community 71 - "TokenGate.tsx"
Cohesion: 0.60
Nodes (3): setStoredToken(), TokenGate(), TokenGateProps

## Knowledge Gaps
- **308 isolated node(s):** `REMOTION_ENTRY`, `TIMEOUT_MS`, `ASPECT_RATIOS`, `RESOLUTION_BY_ASPECT_RATIO`, `STAGE_BY_STATUS` (+303 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LLMProvider` connect `llm/types.ts` to `llm/fallback.test.ts`, `repository.ts`, `orchestrator.ts`, `creative-director.ts`, `base.ts`, `orchestrator.test.ts`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `ImageProvider` connect `providers/src/index.ts` to `repository.ts`, `orchestrator.test.ts`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `TTSProvider` connect `edge.ts` to `repository.ts`, `orchestrator.test.ts`, `orchestrator.ts`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `REMOTION_ENTRY`, `TIMEOUT_MS`, `ASPECT_RATIOS` to the rest of the system?**
  _308 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `video-engine/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._