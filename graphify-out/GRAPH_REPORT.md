# Graph Report - Click.Play  (2026-08-15)

## Corpus Check
- 184 files · ~44,187 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 699 nodes · 1061 edges · 33 communities (29 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0168a4f6`
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
- video/types.ts
- run-qc.ts
- compilerOptions
- PipelineCallbacks
- Click.Play — Implementation Plan
- compilerOptions
- compilerOptions
- server.test.ts
- domain/tsconfig.json
- providers/tsconfig.json
- video-engine/tsconfig.json
- api/package.json
- api.ts
- jobs.ts
- domain/src/index.ts
- creative-director.ts
- Click.Play
- ImageProvider
- cost-approval-gate.ts
- new-provider
- verify-package
- typecheck-on-edit.cjs

## God Nodes (most connected - your core abstractions)
1. `Click.Play — Implementation Plan` - 14 edges
2. `ClickPlayDb` - 14 edges
3. `compilerOptions` - 13 edges
4. `PipelineCallbacks` - 11 edges
5. `LLMProvider` - 10 edges
6. `runPipeline()` - 9 edges
7. `QcCheckResult` - 9 edges
8. `Click.Play` - 8 edges
9. `request()` - 8 edges
10. `generateDirectorScore()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `runJobOnce()` --calls--> `runPipeline()`  [EXTRACTED]
  packages/providers/src/persistence/job-runner.ts → packages/providers/src/pipeline/orchestrator.ts
- `listJobsByProject()` --indirect_call--> `jobFromRow()`  [INFERRED]
  packages/providers/src/persistence/repository.ts → packages/providers/src/persistence/types.ts
- `staticScene()` --references--> `Scene`  [EXTRACTED]
  packages/domain/src/scene.test.ts → packages/domain/src/scene.ts
- `toScenes()` --references--> `Scene`  [EXTRACTED]
  packages/providers/src/agents/creative-director.ts → packages/domain/src/scene.ts
- `appWithToken()` --calls--> `buildServer()`  [EXTRACTED]
  apps/api/src/server.test.ts → apps/api/src/server.ts

## Import Cycles
- None detected.

## Communities (33 total, 4 thin omitted)

### Community 0 - "scripts"
Cohesion: 0.12
Nodes (15): devDependencies, typescript, engines, node, typescript, name, private, scripts (+7 more)

### Community 1 - "domain/package.json"
Cohesion: 0.05
Nodes (44): devDependencies, ffmpeg-static, tsx, @types/node, @types/react, @types/react-dom, typescript, vitest (+36 more)

### Community 2 - "bundled.ts"
Cohesion: 0.21
Nodes (10): listTracks(), loadManifest(), MANIFEST_PATH, ManifestTrack, MUSIC_DIR, MusicManifest, MusicSelection, PACKAGE_ROOT (+2 more)

### Community 3 - "dependencies"
Cohesion: 0.05
Nodes (46): ai, dependencies, @clickplay/domain, @clickplay/providers, @clickplay/video-engine, fastify, @fastify/cors, @fastify/helmet (+38 more)

### Community 4 - "video-engine/package.json"
Cohesion: 0.05
Nodes (36): dependencies, @clickplay/domain, react, react-dom, remotion, @remotion/bundler, @remotion/google-fonts, @remotion/renderer (+28 more)

### Community 5 - "job-runner.ts"
Cohesion: 0.08
Nodes (47): ClickPlayDb, createDb(), toRow(), JobRunnerDeps, runJobOnce(), startJob(), StartJobOptions, config (+39 more)

### Community 6 - "devDependencies"
Cohesion: 0.06
Nodes (33): dependencies, react, react-dom, devDependencies, tailwindcss, @tailwindcss/vite, @types/react, @types/react-dom (+25 more)

### Community 7 - "video/types.ts"
Cohesion: 0.21
Nodes (6): FalVideo, GeminiVideo, resolveVideoGenerationProvider(), VideoGenerationProvider, VideoGenerationProviderKey, VideoResult

### Community 8 - "run-qc.ts"
Cohesion: 0.09
Nodes (25): checkBlackdetect(), checkCostDeviation(), checkCriticScore(), checkDurationMatch(), checkOutputExists(), checkResolutionMatch(), ExpectedFormat, checkTtsCoverage() (+17 more)

### Community 9 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution (+6 more)

### Community 11 - "Click.Play — Implementation Plan"
Cohesion: 0.04
Nodes (43): 0.1 Público-alvo e decisões de produto derivadas, 0.2 Correção arquitetural: estratégia de produção visual (não é slideshow), 0. Resumo da decisão, 10. Critérios de aceite, 11. Roadmap de produto — Studio → SaaS, 1. Arquitetura proposta, 2. Matriz de reaproveitamento, 3. Componentes reutilizados (quase sem mudança) (+35 more)

### Community 12 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, jsx, lib, noEmit, types, extends, include, DOM (+5 more)

### Community 13 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, jsx, lib, module, moduleResolution, outDir, rootDir, extends (+5 more)

### Community 14 - "server.test.ts"
Cohesion: 0.09
Nodes (26): openDb(), app, envFilePath, port, runsDir, buildCostOptions(), buildImageProvider(), buildJobRunnerDeps() (+18 more)

### Community 15 - "domain/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src, ../../tsconfig.base.json

### Community 16 - "providers/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src, ../../tsconfig.base.json

### Community 17 - "video-engine/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src, ../../tsconfig.base.json

### Community 18 - "api/package.json"
Cohesion: 0.17
Nodes (11): name, private, scripts, build, dev, lint, start, test (+3 more)

### Community 19 - "api.ts"
Cohesion: 0.07
Nodes (35): approveCost(), CostAmount, CostBreakdown, createJob(), CreateJobInput, FormConfig, getFormConfig(), getJob() (+27 more)

### Community 22 - "jobs.ts"
Cohesion: 0.13
Nodes (19): CAPTION_STYLES, getFormConfig(), PACING_TIERS, readEnvFile(), writeEnvFile(), ApproveCostBody, CreateJobBody, JobsRouteDeps (+11 more)

### Community 25 - "domain/src/index.ts"
Cohesion: 0.07
Nodes (26): Asset, AssetType, AudioTrack, MusicMood, MusicTrack, NarrationTrack, WordTimestamp, Caption (+18 more)

### Community 26 - "creative-director.ts"
Cohesion: 0.07
Nodes (40): buildDefaultPrompt(), buildPacingInstruction(), DirectorScore, DirectorScoreOutput, DirectorScoreRaw, generateDirectorScore(), loadDirectorSystemPrompt(), PACING_CONFIG (+32 more)

### Community 27 - "Click.Play"
Cohesion: 0.40
Nodes (4): Click.Play, Comandos, pnpm gotcha (Windows), Workflow

### Community 34 - "new-provider"
Cohesion: 0.50
Nodes (3): new-provider, Padrão (ver packages/providers/src/{llm,tts,video,image}/ como referência real), Uso

### Community 35 - "verify-package"
Cohesion: 0.50
Nodes (3): Passos, Uso, verify-package

## Knowledge Gaps
- **259 isolated node(s):** `Para que serve`, `Stack`, `Requisitos`, `Configuração`, `Onde conseguir cada chave` (+254 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `domain/package.json`?**
  _High betweenness centrality (0.145) - this node is a cross-community bridge._
- **Why does `msedge-tts` connect `dependencies` to `domain/src/index.ts`?**
  _High betweenness centrality (0.140) - this node is a cross-community bridge._
- **What connects `Para que serve`, `Stack`, `Requisitos` to the rest of the system?**
  _259 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `domain/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.04541062801932367 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04541062801932367 - nodes in this community are weakly interconnected._
- **Should `video-engine/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._