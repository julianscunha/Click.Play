# Graph Report - Click.Play  (2026-08-16)

## Corpus Check
- 208 files · ~59,533 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 878 nodes · 1400 edges · 48 communities (45 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cec78076`
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
- resolve-element.ts
- run-qc.ts
- compilerOptions
- domain/package.json
- Click.Play
- compilerOptions
- compilerOptions
- server.test.ts
- domain/tsconfig.json
- providers/tsconfig.json
- video-engine/tsconfig.json
- providers/package.json
- api.ts
- providers.ts
- bundled.ts
- tts/openrouter.ts
- providers/src/index.ts
- Click.Play
- devDependencies
- scene.ts
- orchestrator.test.ts
- ClickPlayVideo.tsx
- new-provider
- verify-package
- typecheck-on-edit.cjs
- pricing.ts
- Click.Play — Implementation Plan
- cost-approval-gate.ts
- §11A. Roadmap de produção e qualidade de output — gaps pós-primeiro-vídeo-real
- 0.2 Correção arquitetural: estratégia de produção visual (não é slideshow)
- 11. Roadmap de produto — Studio → SaaS
- 0.1 Público-alvo e decisões de produto derivadas
- Uso
- FallbackMusic

## God Nodes (most connected - your core abstractions)
1. `ClickPlayDb` - 18 edges
2. `Click.Play — Implementation Plan` - 15 edges
3. `LLMProvider` - 14 edges
4. `PipelineCallbacks` - 13 edges
5. `compilerOptions` - 13 edges
6. `runJobOnce()` - 11 edges
7. `withRetry()` - 11 edges
8. `ImageProvider` - 11 edges
9. `generateDirectorScore()` - 10 edges
10. `VideoGenerationProvider` - 10 edges

## Surprising Connections (you probably didn't know these)
- `buildVideoProviders()` --calls--> `withProviderTimeout()`  [EXTRACTED]
  apps/api/src/providers.ts → packages/providers/src/http/timeout.ts
- `buildImageProvider()` --calls--> `withProviderTimeout()`  [EXTRACTED]
  apps/api/src/providers.ts → packages/providers/src/http/timeout.ts
- `buildLLM()` --calls--> `withProviderTimeout()`  [EXTRACTED]
  apps/api/src/providers.ts → packages/providers/src/http/timeout.ts
- `buildTTS()` --calls--> `withProviderTimeout()`  [EXTRACTED]
  apps/api/src/providers.ts → packages/providers/src/http/timeout.ts
- `buildMusicProvider()` --calls--> `withProviderTimeout()`  [EXTRACTED]
  apps/api/src/providers.ts → packages/providers/src/http/timeout.ts

## Import Cycles
- None detected.

## Communities (48 total, 3 thin omitted)

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
Cohesion: 0.04
Nodes (49): ai, dependencies, @clickplay/domain, @clickplay/providers, @clickplay/video-engine, fastify, @fastify/cors, @fastify/helmet (+41 more)

### Community 4 - "video-engine/package.json"
Cohesion: 0.05
Nodes (36): dependencies, @clickplay/domain, react, react-dom, remotion, @remotion/bundler, @remotion/google-fonts, @remotion/renderer (+28 more)

### Community 5 - "repository.ts"
Cohesion: 0.07
Nodes (58): addCheckpointColumnIfMissing(), addStageDetailColumnIfMissing(), ClickPlayDb, createDb(), toRow(), JobRunnerDeps, retryJob(), runJobOnce() (+50 more)

### Community 6 - "devDependencies"
Cohesion: 0.06
Nodes (33): dependencies, react, react-dom, devDependencies, tailwindcss, @tailwindcss/vite, @types/react, @types/react-dom (+25 more)

### Community 7 - "resolve-element.ts"
Cohesion: 0.05
Nodes (22): sleep(), withRetry(), FallbackImage, GeminiImage, OpenRouterImage, ImageProvider, OpenRouterMusic, FalVideo (+14 more)

### Community 8 - "run-qc.ts"
Cohesion: 0.09
Nodes (25): checkBlackdetect(), checkCostDeviation(), checkCriticScore(), checkDurationMatch(), checkOutputExists(), checkResolutionMatch(), ExpectedFormat, checkTtsCoverage() (+17 more)

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

### Community 14 - "server.test.ts"
Cohesion: 0.22
Nodes (13): appWithToken(), costOptions, directorPayload(), execFileAsync, fakeImageProvider(), fakeJobRunnerDeps(), fakeLLM(), fakeMusic() (+5 more)

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

### Community 19 - "api.ts"
Cohesion: 0.06
Nodes (42): approveCost(), CostAmount, CostBreakdown, createJob(), CreateJobInput, FormConfig, getFormConfig(), getJob() (+34 more)

### Community 22 - "providers.ts"
Cohesion: 0.06
Nodes (44): CAPTION_STYLES, getFormConfig(), getRecommendedModels(), PACING_TIERS, RECOMMENDED_IMAGE_MODELS, RECOMMENDED_TTS_FALLBACK_MODELS, RECOMMENDED_VIDEO_MODELS, openDb() (+36 more)

### Community 24 - "bundled.ts"
Cohesion: 0.21
Nodes (10): listTracks(), loadManifest(), MANIFEST_PATH, ManifestTrack, MUSIC_DIR, MusicManifest, MusicSelection, PACKAGE_ROOT (+2 more)

### Community 25 - "tts/openrouter.ts"
Cohesion: 0.10
Nodes (12): EDGE_TTS_VOICES, EdgeTTS, parseWordBoundaries(), sleep(), streamToBuffer(), FallbackTTS, estimateWordTimestamps(), GeminiTTS (+4 more)

### Community 26 - "providers/src/index.ts"
Cohesion: 0.05
Nodes (50): Asset, AssetType, assertVideoMode(), assertVideoModeWithDowngradeContext(), buildDefaultPrompt(), buildPacingInstruction(), buildVideoModeGuidance(), DirectorScore (+42 more)

### Community 27 - "Click.Play"
Cohesion: 0.40
Nodes (4): Click.Play, Comandos, pnpm gotcha (Windows), Workflow

### Community 28 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, tsx, @types/node, @types/react, @types/react-dom, tsx, @types/node, @types/react (+1 more)

### Community 29 - "scene.ts"
Cohesion: 0.11
Nodes (22): AudioTrack, MusicMood, MusicTrack, NarrationTrack, WordTimestamp, Caption, CaptionStyleKey, CameraMotion (+14 more)

### Community 30 - "orchestrator.test.ts"
Cohesion: 0.11
Nodes (9): baseOptions(), fakeImageProvider(), fakeLLM(), fakeMusic(), fakeTTS(), fakeVideoRenderer(), RESEARCH_RESULT, usage() (+1 more)

### Community 31 - "ClickPlayVideo.tsx"
Cohesion: 0.18
Nodes (8): ClickPlayVideoRoot(), DEFAULT_PROPS, Main(), resolveAsset(), preparePublicAssets(), RemotionRenderer, RemotionRendererOptions, VideoRenderer

### Community 34 - "new-provider"
Cohesion: 0.50
Nodes (3): new-provider, Padrão (ver packages/providers/src/{llm,tts,video,image}/ como referência real), Uso

### Community 35 - "verify-package"
Cohesion: 0.50
Nodes (3): Passos, Uso, verify-package

### Community 38 - "pricing.ts"
Cohesion: 0.29
Nodes (6): IMAGE_PRICING_PER_IMAGE, LLM_CALL_TOKEN_ESTIMATES, LLM_PRICING_PER_MODEL, MUSIC_PRICING_PER_TRACK, TTS_PRICING_PER_CHAR, VIDEO_PRICING_PER_SECOND

### Community 42 - "Click.Play — Implementation Plan"
Cohesion: 0.17
Nodes (12): 0. Resumo da decisão, 10. Critérios de aceite, 1. Arquitetura proposta, 2. Matriz de reaproveitamento, 3. Componentes reutilizados (quase sem mudança), 4. Componentes adaptados (reescrita parcial), 5. Componentes removidos, 6. Componentes novos (não existem em nenhum dos dois) (+4 more)

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

## Knowledge Gaps
- **293 isolated node(s):** `research`, `SYSTEM_PROMPT_PATH`, `SceneRaw`, `DirectorScoreRaw`, `DirectorScoreOutput` (+288 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PipelineCallbacks` connect `orchestrator.test.ts` to `providers/src/index.ts`, `repository.ts`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `LLMProvider` connect `providers/src/index.ts` to `repository.ts`, `orchestrator.test.ts`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `ImageProvider` connect `resolve-element.ts` to `repository.ts`, `orchestrator.test.ts`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `research`, `SYSTEM_PROMPT_PATH`, `SceneRaw` to the rest of the system?**
  _293 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04251700680272109 - nodes in this community are weakly interconnected._
- **Should `video-engine/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._