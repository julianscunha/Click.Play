# Graph Report - Click.Play  (2026-08-16)

## Corpus Check
- 207 files · ~54,917 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 810 nodes · 1266 edges · 37 communities (34 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `210f8fcf`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- scripts
- domain/package.json
- bundled.ts
- dependencies
- video-engine/package.json
- job-runner.ts
- devDependencies
- resolve-element.ts
- run-qc.ts
- compilerOptions
- dependencies
- Click.Play — Implementation Plan
- compilerOptions
- compilerOptions
- providers.ts
- domain/tsconfig.json
- providers/tsconfig.json
- video-engine/tsconfig.json
- providers/package.json
- api.ts
- server.test.ts
- dependencies
- tts/openrouter.ts
- providers/src/index.ts
- Click.Play
- cost-approval-gate.ts
- domain/src/index.ts
- PipelineCallbacks
- new-provider
- verify-package
- typecheck-on-edit.cjs
- pricing.ts
- @clickplay/video-engine

## God Nodes (most connected - your core abstractions)
1. `Click.Play — Implementation Plan` - 14 edges
2. `ClickPlayDb` - 14 edges
3. `LLMProvider` - 13 edges
4. `compilerOptions` - 13 edges
5. `withRetry()` - 11 edges
6. `PipelineCallbacks` - 11 edges
7. `VideoGenerationProvider` - 10 edges
8. `ImageProvider` - 10 edges
9. `runPipeline()` - 9 edges
10. `QcCheckResult` - 9 edges

## Surprising Connections (you probably didn't know these)
- `runJobOnce()` --calls--> `runPipeline()`  [EXTRACTED]
  packages/providers/src/persistence/job-runner.ts → packages/providers/src/pipeline/orchestrator.ts
- `listJobsByProject()` --indirect_call--> `jobFromRow()`  [INFERRED]
  packages/providers/src/persistence/repository.ts → packages/providers/src/persistence/types.ts
- `registerMetaRoutes()` --calls--> `getFormConfig()`  [EXTRACTED]
  apps/api/src/routes/meta.ts → apps/api/src/config.ts
- `buildServer()` --calls--> `registerSettingsRoutes()`  [EXTRACTED]
  apps/api/src/server.ts → apps/api/src/routes/settings.ts
- `TokenGate()` --calls--> `setStoredToken()`  [EXTRACTED]
  apps/web/src/components/TokenGate.tsx → apps/web/src/api.ts

## Import Cycles
- None detected.

## Communities (37 total, 3 thin omitted)

### Community 0 - "scripts"
Cohesion: 0.12
Nodes (15): devDependencies, typescript, engines, node, typescript, name, private, scripts (+7 more)

### Community 1 - "domain/package.json"
Cohesion: 0.04
Nodes (45): devDependencies, ffmpeg-static, tsx, @types/node, @types/react, @types/react-dom, typescript, vitest (+37 more)

### Community 2 - "bundled.ts"
Cohesion: 0.21
Nodes (10): listTracks(), loadManifest(), MANIFEST_PATH, ManifestTrack, MUSIC_DIR, MusicManifest, MusicSelection, PACKAGE_ROOT (+2 more)

### Community 3 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, @clickplay/providers, fastify, @fastify/cors, @fastify/helmet, @fastify/rate-limit, @fastify/static, react (+11 more)

### Community 4 - "video-engine/package.json"
Cohesion: 0.05
Nodes (36): dependencies, @clickplay/domain, react, react-dom, remotion, @remotion/bundler, @remotion/google-fonts, @remotion/renderer (+28 more)

### Community 5 - "job-runner.ts"
Cohesion: 0.08
Nodes (47): ClickPlayDb, createDb(), toRow(), JobRunnerDeps, runJobOnce(), startJob(), StartJobOptions, config (+39 more)

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

### Community 10 - "dependencies"
Cohesion: 0.11
Nodes (18): ai, @clickplay/domain, @clickplay/domain, drizzle-orm, @fal-ai/client, ffprobe-static, @google/genai, msedge-tts (+10 more)

### Community 11 - "Click.Play — Implementation Plan"
Cohesion: 0.04
Nodes (43): 0.1 Público-alvo e decisões de produto derivadas, 0.2 Correção arquitetural: estratégia de produção visual (não é slideshow), 0. Resumo da decisão, 10. Critérios de aceite, 11. Roadmap de produto — Studio → SaaS, 1. Arquitetura proposta, 2. Matriz de reaproveitamento, 3. Componentes reutilizados (quase sem mudança) (+35 more)

### Community 12 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, jsx, lib, noEmit, types, extends, include, DOM (+5 more)

### Community 13 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, jsx, lib, module, moduleResolution, outDir, rootDir, extends (+5 more)

### Community 14 - "providers.ts"
Cohesion: 0.11
Nodes (16): openDb(), app, envFilePath, port, runsDir, buildCostOptions(), buildImageProvider(), buildJobRunnerDeps() (+8 more)

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
Nodes (41): approveCost(), CostAmount, CostBreakdown, createJob(), CreateJobInput, FormConfig, getFormConfig(), getJob() (+33 more)

### Community 22 - "server.test.ts"
Cohesion: 0.07
Nodes (37): CAPTION_STYLES, getFormConfig(), getRecommendedModels(), PACING_TIERS, RECOMMENDED_IMAGE_MODELS, RECOMMENDED_TTS_FALLBACK_MODELS, RECOMMENDED_VIDEO_MODELS, readEnvFile() (+29 more)

### Community 24 - "dependencies"
Cohesion: 0.33
Nodes (6): zod, dependencies, @clickplay/shared, zod, zod, zod

### Community 25 - "tts/openrouter.ts"
Cohesion: 0.10
Nodes (12): EDGE_TTS_VOICES, EdgeTTS, parseWordBoundaries(), sleep(), streamToBuffer(), FallbackTTS, estimateWordTimestamps(), GeminiTTS (+4 more)

### Community 26 - "providers/src/index.ts"
Cohesion: 0.06
Nodes (43): buildDefaultPrompt(), buildPacingInstruction(), DirectorScore, DirectorScoreOutput, DirectorScoreRaw, generateDirectorScore(), loadDirectorSystemPrompt(), PACING_CONFIG (+35 more)

### Community 27 - "Click.Play"
Cohesion: 0.40
Nodes (4): Click.Play, Comandos, pnpm gotcha (Windows), Workflow

### Community 29 - "domain/src/index.ts"
Cohesion: 0.08
Nodes (22): Asset, AssetType, AudioTrack, MusicMood, MusicTrack, NarrationTrack, WordTimestamp, Caption (+14 more)

### Community 34 - "new-provider"
Cohesion: 0.50
Nodes (3): new-provider, Padrão (ver packages/providers/src/{llm,tts,video,image}/ como referência real), Uso

### Community 35 - "verify-package"
Cohesion: 0.50
Nodes (3): Passos, Uso, verify-package

### Community 38 - "pricing.ts"
Cohesion: 0.29
Nodes (6): IMAGE_PRICING_PER_IMAGE, LLM_CALL_TOKEN_ESTIMATES, LLM_PRICING_PER_MODEL, MUSIC_PRICING_PER_TRACK, TTS_PRICING_PER_CHAR, VIDEO_PRICING_PER_SECOND

### Community 39 - "@clickplay/video-engine"
Cohesion: 0.67
Nodes (3): @clickplay/video-engine, @clickplay/video-engine, @clickplay/video-engine

## Knowledge Gaps
- **278 isolated node(s):** `VideoJobStatus`, `RECOMMENDED_IMAGE_MODELS`, `RECOMMENDED_VIDEO_MODELS`, `RECOMMENDED_TTS_FALLBACK_MODELS`, `REMOTION_ENTRY` (+273 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LLMProvider` connect `providers/src/index.ts` to `job-runner.ts`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `ImageProvider` connect `resolve-element.ts` to `job-runner.ts`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `PipelineCallbacks` connect `PipelineCallbacks` to `providers/src/index.ts`, `job-runner.ts`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `VideoJobStatus`, `RECOMMENDED_IMAGE_MODELS`, `RECOMMENDED_VIDEO_MODELS` to the rest of the system?**
  _278 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `domain/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.04440333024976873 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._