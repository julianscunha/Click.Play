# Graph Report - Click.Play  (2026-08-16)

## Corpus Check
- 207 files · ~60,367 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 860 nodes · 1351 edges · 51 communities (49 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `31f7f873`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- scripts
- providers/package.json
- pipeline/types.ts
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
- providers.ts
- domain/tsconfig.json
- providers/tsconfig.json
- video-engine/tsconfig.json
- dependencies
- api.ts
- server.test.ts
- bundled.ts
- providers/src/index.ts
- llm/types.ts
- Click.Play
- withRetry
- video-project.ts
- orchestrator.test.ts
- ClickPlayVideo.tsx
- dependencies
- @clickplay/video-engine
- new-provider
- verify-package
- typecheck-on-edit.cjs
- pricing.ts
- creative-director.ts
- Click.Play — Implementation Plan
- research.ts
- PipelineCallbacks
- edge.test.ts
- §11A. Roadmap de produção e qualidade de output — gaps pós-primeiro-vídeo-real
- 0.2 Correção arquitetural: estratégia de produção visual (não é slideshow)
- 11. Roadmap de produto — Studio → SaaS
- 0.1 Público-alvo e decisões de produto derivadas
- Instalação

## God Nodes (most connected - your core abstractions)
1. `Click.Play — Implementation Plan` - 15 edges
2. `LLMProvider` - 14 edges
3. `PipelineCallbacks` - 13 edges
4. `compilerOptions` - 13 edges
5. `runJobOnce()` - 12 edges
6. `runPipeline()` - 11 edges
7. `withRetry()` - 11 edges
8. `ImageProvider` - 11 edges
9. `VideoGenerationProvider` - 10 edges
10. `TTSProvider` - 10 edges

## Surprising Connections (you probably didn't know these)
- `runJobOnce()` --calls--> `runPipeline()`  [EXTRACTED]
  packages/providers/src/persistence/job-runner.ts → packages/providers/src/pipeline/orchestrator.ts
- `Job` --references--> `PipelineCheckpoint`  [EXTRACTED]
  packages/providers/src/persistence/types.ts → packages/providers/src/pipeline/types.ts
- `runJobOnce()` --calls--> `getProject()`  [EXTRACTED]
  packages/providers/src/persistence/job-runner.ts → packages/providers/src/persistence/repository.ts
- `retryJob()` --calls--> `getJob()`  [EXTRACTED]
  packages/providers/src/persistence/job-runner.ts → packages/providers/src/persistence/repository.ts
- `runJobOnce()` --calls--> `getJob()`  [EXTRACTED]
  packages/providers/src/persistence/job-runner.ts → packages/providers/src/persistence/repository.ts

## Import Cycles
- None detected.

## Communities (51 total, 2 thin omitted)

### Community 0 - "scripts"
Cohesion: 0.12
Nodes (15): devDependencies, typescript, engines, node, typescript, name, private, scripts (+7 more)

### Community 1 - "providers/package.json"
Cohesion: 0.04
Nodes (45): devDependencies, ffmpeg-static, tsx, @types/node, @types/react, @types/react-dom, typescript, vitest (+37 more)

### Community 2 - "pipeline/types.ts"
Cohesion: 0.15
Nodes (10): Asset, AssetType, LLMUsage, PipelineCheckpoint, PipelineOptions, PipelineResult, PipelineStage, RevisionLogEntry (+2 more)

### Community 3 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, @clickplay/providers, fastify, @fastify/cors, @fastify/helmet, @fastify/rate-limit, @fastify/static, react (+11 more)

### Community 4 - "video-engine/package.json"
Cohesion: 0.05
Nodes (36): dependencies, @clickplay/domain, react, react-dom, remotion, @remotion/bundler, @remotion/google-fonts, @remotion/renderer (+28 more)

### Community 5 - "repository.ts"
Cohesion: 0.06
Nodes (55): addCheckpointColumnIfMissing(), ClickPlayDb, createDb(), toRow(), CostApprovalGate, createCostApprovalGate(), JobRunnerDeps, retryJob() (+47 more)

### Community 6 - "devDependencies"
Cohesion: 0.06
Nodes (33): dependencies, react, react-dom, devDependencies, tailwindcss, @tailwindcss/vite, @types/react, @types/react-dom (+25 more)

### Community 7 - "resolve-element.ts"
Cohesion: 0.09
Nodes (16): FallbackImage, GeminiImage, ImageProvider, FalVideo, GeminiVideo, resolveVideoGenerationProvider(), VideoGenerationProvider, VideoGenerationProviderKey (+8 more)

### Community 8 - "run-qc.ts"
Cohesion: 0.08
Nodes (26): checkBlackdetect(), checkCostDeviation(), checkCriticScore(), checkDurationMatch(), checkOutputExists(), checkResolutionMatch(), ExpectedFormat, checkTtsCoverage() (+18 more)

### Community 9 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution (+6 more)

### Community 10 - "domain/package.json"
Cohesion: 0.18
Nodes (10): main, name, private, scripts, lint, test, typecheck, type (+2 more)

### Community 11 - "Click.Play"
Cohesion: 0.17
Nodes (10): Click.Play, Comandos, Docker, Estrutura do plano, Licença, Local (Node/pnpm), Para que serve, Requisitos (+2 more)

### Community 12 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, jsx, lib, noEmit, types, extends, include, DOM (+5 more)

### Community 13 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, jsx, lib, module, moduleResolution, outDir, rootDir, extends (+5 more)

### Community 14 - "providers.ts"
Cohesion: 0.12
Nodes (16): openDb(), app, db, envFilePath, port, runsDir, buildCostOptions(), buildImageProvider() (+8 more)

### Community 15 - "domain/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src, ../../tsconfig.base.json

### Community 16 - "providers/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src, ../../tsconfig.base.json

### Community 17 - "video-engine/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src, ../../tsconfig.base.json

### Community 18 - "dependencies"
Cohesion: 0.11
Nodes (18): ai, @clickplay/domain, @clickplay/domain, drizzle-orm, @fal-ai/client, ffprobe-static, @google/genai, msedge-tts (+10 more)

### Community 19 - "api.ts"
Cohesion: 0.06
Nodes (42): approveCost(), CostAmount, CostBreakdown, createJob(), CreateJobInput, FormConfig, getFormConfig(), getJob() (+34 more)

### Community 22 - "server.test.ts"
Cohesion: 0.06
Nodes (38): CAPTION_STYLES, getFormConfig(), getRecommendedModels(), PACING_TIERS, RECOMMENDED_IMAGE_MODELS, RECOMMENDED_TTS_FALLBACK_MODELS, RECOMMENDED_VIDEO_MODELS, readEnvFile() (+30 more)

### Community 24 - "bundled.ts"
Cohesion: 0.21
Nodes (10): listTracks(), loadManifest(), MANIFEST_PATH, ManifestTrack, MUSIC_DIR, MusicManifest, MusicSelection, PACKAGE_ROOT (+2 more)

### Community 25 - "providers/src/index.ts"
Cohesion: 0.19
Nodes (7): EDGE_TTS_VOICES, FallbackTTS, estimateWordTimestamps(), GeminiTTS, pcmToMp3(), TTSProvider, TTSResult

### Community 26 - "llm/types.ts"
Cohesion: 0.14
Nodes (10): BaseLLM, FakeLLM, generateTextMock, FallbackLLM, opts, schema, OpenRouterLLM, LLMProvider (+2 more)

### Community 27 - "Click.Play"
Cohesion: 0.40
Nodes (4): Click.Play, Comandos, pnpm gotcha (Windows), Workflow

### Community 28 - "withRetry"
Cohesion: 0.10
Nodes (7): sleep(), withRetry(), OpenRouterImage, OpenRouterMusic, OpenRouterTTS, OpenRouterVideo, VideoJobStatus

### Community 29 - "video-project.ts"
Cohesion: 0.11
Nodes (18): AudioTrack, MusicMood, MusicTrack, NarrationTrack, WordTimestamp, Caption, CaptionStyleKey, CameraMotion (+10 more)

### Community 30 - "orchestrator.test.ts"
Cohesion: 0.22
Nodes (8): baseOptions(), fakeImageProvider(), fakeLLM(), fakeMusic(), fakeTTS(), fakeVideoRenderer(), RESEARCH_RESULT, usage()

### Community 31 - "ClickPlayVideo.tsx"
Cohesion: 0.18
Nodes (8): ClickPlayVideoRoot(), DEFAULT_PROPS, Main(), resolveAsset(), preparePublicAssets(), RemotionRenderer, RemotionRendererOptions, VideoRenderer

### Community 32 - "dependencies"
Cohesion: 0.33
Nodes (6): zod, dependencies, @clickplay/shared, zod, zod, zod

### Community 33 - "@clickplay/video-engine"
Cohesion: 0.67
Nodes (3): @clickplay/video-engine, @clickplay/video-engine, @clickplay/video-engine

### Community 34 - "new-provider"
Cohesion: 0.50
Nodes (3): new-provider, Padrão (ver packages/providers/src/{llm,tts,video,image}/ como referência real), Uso

### Community 35 - "verify-package"
Cohesion: 0.50
Nodes (3): Passos, Uso, verify-package

### Community 38 - "pricing.ts"
Cohesion: 0.29
Nodes (6): IMAGE_PRICING_PER_IMAGE, LLM_CALL_TOKEN_ESTIMATES, LLM_PRICING_PER_MODEL, MUSIC_PRICING_PER_TRACK, TTS_PRICING_PER_CHAR, VIDEO_PRICING_PER_SECOND

### Community 41 - "creative-director.ts"
Cohesion: 0.15
Nodes (22): buildDefaultPrompt(), buildPacingInstruction(), DirectorScore, DirectorScoreOutput, DirectorScoreRaw, generateDirectorScore(), loadDirectorSystemPrompt(), PACING_CONFIG (+14 more)

### Community 42 - "Click.Play — Implementation Plan"
Cohesion: 0.17
Nodes (12): 0. Resumo da decisão, 10. Critérios de aceite, 1. Arquitetura proposta, 2. Matriz de reaproveitamento, 3. Componentes reutilizados (quase sem mudança), 4. Componentes adaptados (reescrita parcial), 5. Componentes removidos, 6. Componentes novos (não existem em nenhum dos dois) (+4 more)

### Community 43 - "research.ts"
Cohesion: 0.20
Nodes (6): research, research(), ResearchOutput, ResearchResult, SYSTEM_PROMPT_PATH, RESULT

### Community 45 - "edge.test.ts"
Cohesion: 0.22
Nodes (4): EdgeTTS, parseWordBoundaries(), sleep(), streamToBuffer()

### Community 46 - "§11A. Roadmap de produção e qualidade de output — gaps pós-primeiro-vídeo-real"
Cohesion: 0.25
Nodes (8): §11A. Roadmap de produção e qualidade de output — gaps pós-primeiro-vídeo-real, Bloco 1 — Vídeo vs slideshow (item 1), Bloco 2 — Controles de produção: resolução, qualidade, duração (itens 2, 3, 4), Bloco 3 — Idioma (item 5), Bloco 4 — Legendas e overlay (itens 6, 7, 8), Bloco 5 — Abertura/encerramento (item 10), Bloco 6 — Observabilidade e output final (itens 9, 11), Ordem sugerida de implementação

### Community 47 - "0.2 Correção arquitetural: estratégia de produção visual (não é slideshow)"
Cohesion: 0.29
Nodes (7): 0.2 Correção arquitetural: estratégia de produção visual (não é slideshow), As duas abstrações (substituindo "AssetProvider" como abstração principal), Creative Director: decide *como* produzir, não só *o que* mostrar, Modelo de Scene: de "1 visual" para composição, Regra explícita contra slideshow, Storyboard, Terminologia (não confundir)

### Community 48 - "11. Roadmap de produto — Studio → SaaS"
Cohesion: 0.33
Nodes (6): 11. Roadmap de produto — Studio → SaaS, Decisões a tomar agora (evitar refatoração futura), Dependências entre fases, Fases propostas (15+), O que não muda / não é reimplementado, Separação MVP / Evolução Studio / SaaS

### Community 49 - "0.1 Público-alvo e decisões de produto derivadas"
Cohesion: 0.40
Nodes (5): 0.1 Público-alvo e decisões de produto derivadas, Arquétipos novos (Click.Play), Legendas: 7 estilos disponíveis, default por arquétipo, Música: bundled default, IA só se confirmado grátis, TTS: múltiplos providers, default remoto grátis

### Community 50 - "Instalação"
Cohesion: 0.67
Nodes (3): Configuração, Instalação, Onde conseguir cada chave

## Knowledge Gaps
- **289 isolated node(s):** `Arquétipos novos (Click.Play)`, `TTS: múltiplos providers, default remoto grátis`, `Terminologia (não confundir)`, `As duas abstrações (substituindo "AssetProvider" como abstração principal)`, `Modelo de Scene: de "1 visual" para composição` (+284 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LLMProvider` connect `llm/types.ts` to `pipeline/types.ts`, `repository.ts`, `creative-director.ts`, `research.ts`, `orchestrator.test.ts`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `ImageProvider` connect `resolve-element.ts` to `withRetry`, `repository.ts`, `orchestrator.test.ts`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `TTSProvider` connect `providers/src/index.ts` to `pipeline/types.ts`, `repository.ts`, `orchestrator.test.ts`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `Arquétipos novos (Click.Play)`, `TTS: múltiplos providers, default remoto grátis`, `Terminologia (não confundir)` to the rest of the system?**
  _289 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `providers/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.04440333024976873 - nodes in this community are weakly interconnected._
- **Should `pipeline/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14736842105263157 - nodes in this community are weakly interconnected._