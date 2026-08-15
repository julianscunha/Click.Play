# Graph Report - Click.Play  (2026-08-14)

## Corpus Check
- 177 files · ~39,984 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 616 nodes · 876 edges · 30 communities (29 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `69b5ee42`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- scripts
- domain/package.json
- api/package.json
- dependencies
- video-engine/package.json
- repository.ts
- devDependencies
- providers/src/index.ts
- run-qc.ts
- compilerOptions
- providers.ts
- Click.Play — Implementation Plan
- compilerOptions
- compilerOptions
- edge.ts
- domain/tsconfig.json
- providers/tsconfig.json
- video-engine/tsconfig.json
- server.test.ts
- api.ts
- bundled.ts
- creative-director.ts
- Click.Play
- new-provider
- verify-package
- typecheck-on-edit.cjs

## God Nodes (most connected - your core abstractions)
1. `Click.Play — Implementation Plan` - 14 edges
2. `ClickPlayDb` - 13 edges
3. `compilerOptions` - 13 edges
4. `QcCheckResult` - 9 edges
5. `BaseLLM` - 8 edges
6. `LLMProvider` - 8 edges
7. `0.2 Correção arquitetural: estratégia de produção visual (não é slideshow)` - 7 edges
8. `scripts` - 7 edges
9. `compilerOptions` - 7 edges
10. `scripts` - 7 edges

## Surprising Connections (you probably didn't know these)
- `listJobsByProject()` --indirect_call--> `jobFromRow()`  [INFERRED]
  packages/providers/src/persistence/repository.ts → packages/providers/src/persistence/types.ts
- `staticScene()` --references--> `Scene`  [EXTRACTED]
  packages/domain/src/scene.test.ts → packages/domain/src/scene.ts
- `toScenes()` --references--> `Scene`  [EXTRACTED]
  packages/providers/src/agents/creative-director.ts → packages/domain/src/scene.ts
- `evaluate()` --calls--> `getArchetype()`  [EXTRACTED]
  packages/providers/src/agents/critic.ts → packages/providers/src/config/archetype-registry.ts
- `runQc()` --calls--> `checkBlackdetect()`  [EXTRACTED]
  packages/providers/src/qc/run-qc.ts → packages/providers/src/qc/checks/blackdetect.ts

## Import Cycles
- None detected.

## Communities (30 total, 1 thin omitted)

### Community 0 - "scripts"
Cohesion: 0.12
Nodes (15): devDependencies, typescript, engines, node, typescript, name, private, scripts (+7 more)

### Community 1 - "domain/package.json"
Cohesion: 0.06
Nodes (30): devDependencies, typescript, vitest, main, name, private, scripts, lint (+22 more)

### Community 2 - "api/package.json"
Cohesion: 0.08
Nodes (24): devDependencies, tsx, @types/node, @types/react, @types/react-dom, typescript, vitest, @types/react (+16 more)

### Community 3 - "dependencies"
Cohesion: 0.05
Nodes (45): ai, dependencies, @clickplay/domain, @clickplay/providers, @clickplay/video-engine, fastify, @fastify/cors, @fastify/static (+37 more)

### Community 4 - "video-engine/package.json"
Cohesion: 0.05
Nodes (36): dependencies, @clickplay/domain, react, react-dom, remotion, @remotion/bundler, @remotion/google-fonts, @remotion/renderer (+28 more)

### Community 5 - "repository.ts"
Cohesion: 0.09
Nodes (37): ClickPlayDb, createDb(), toRow(), CostApprovalGate, createCostApprovalGate(), JobRunnerDeps, runJobOnce(), startJob() (+29 more)

### Community 6 - "devDependencies"
Cohesion: 0.06
Nodes (33): dependencies, react, react-dom, devDependencies, tailwindcss, @tailwindcss/vite, @types/react, @types/react-dom (+25 more)

### Community 7 - "providers/src/index.ts"
Cohesion: 0.09
Nodes (20): CAPTION_STYLES, getFormConfig(), PACING_TIERS, ApproveCostBody, CreateJobBody, JobsRouteDeps, jobToResponse(), registerJobsRoutes() (+12 more)

### Community 8 - "run-qc.ts"
Cohesion: 0.09
Nodes (25): checkBlackdetect(), checkCostDeviation(), checkCriticScore(), checkDurationMatch(), checkOutputExists(), checkResolutionMatch(), ExpectedFormat, checkTtsCoverage() (+17 more)

### Community 9 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution (+6 more)

### Community 10 - "providers.ts"
Cohesion: 0.19
Nodes (12): openDb(), app, port, runsDir, buildImageProvider(), buildJobRunnerDeps(), buildStockProviders(), buildVideoProviders() (+4 more)

### Community 11 - "Click.Play — Implementation Plan"
Cohesion: 0.06
Nodes (30): 0.1 Público-alvo e decisões de produto derivadas, 0.2 Correção arquitetural: estratégia de produção visual (não é slideshow), 0. Resumo da decisão, 10. Critérios de aceite, 11. Roadmap de produto — Studio → SaaS, 1. Arquitetura proposta, 2. Matriz de reaproveitamento, 3. Componentes reutilizados (quase sem mudança) (+22 more)

### Community 12 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, jsx, lib, noEmit, types, extends, include, DOM (+5 more)

### Community 13 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, jsx, lib, module, moduleResolution, outDir, rootDir, extends (+5 more)

### Community 14 - "edge.ts"
Cohesion: 0.24
Nodes (6): EDGE_TTS_VOICES, EdgeTTS, parseWordBoundaries(), streamToBuffer(), TTSProvider, TTSResult

### Community 15 - "domain/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src, ../../tsconfig.base.json

### Community 16 - "providers/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src, ../../tsconfig.base.json

### Community 17 - "video-engine/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src, ../../tsconfig.base.json

### Community 18 - "server.test.ts"
Cohesion: 0.14
Nodes (13): costOptions, directorPayload(), fakeImageProvider(), fakeJobRunnerDeps(), fakeLLM(), fakeMusic(), fakeTTS(), fakeVideoRenderer() (+5 more)

### Community 19 - "api.ts"
Cohesion: 0.12
Nodes (22): approveCost(), CostAmount, CostBreakdown, createJob(), CreateJobInput, FormConfig, getFormConfig(), getJob() (+14 more)

### Community 25 - "bundled.ts"
Cohesion: 0.07
Nodes (30): Asset, AssetType, AudioTrack, MusicMood, MusicTrack, NarrationTrack, WordTimestamp, Caption (+22 more)

### Community 26 - "creative-director.ts"
Cohesion: 0.08
Nodes (33): buildDefaultPrompt(), buildPacingInstruction(), DirectorScore, DirectorScoreOutput, DirectorScoreRaw, generateDirectorScore(), loadDirectorSystemPrompt(), PACING_CONFIG (+25 more)

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
- **247 isolated node(s):** `execFileAsync`, `RunQcInput`, `execFileAsync`, `ExpectedFormat`, `name` (+242 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `domain/package.json`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `msedge-tts` connect `dependencies` to `edge.ts`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `api/package.json`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **What connects `execFileAsync`, `RunQcInput`, `execFileAsync` to the rest of the system?**
  _247 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `domain/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Should `api/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._