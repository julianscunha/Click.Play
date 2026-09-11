# Graph Report - Click.Play  (2026-09-11)

## Corpus Check
- 228 files · ~93,935 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1314 nodes · 1901 edges · 83 communities (78 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `243e2e89`
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
- Image Prompt Engineer Agent
- domain/tsconfig.json
- providers/tsconfig.json
- video-engine/tsconfig.json
- providers/package.json
- SettingsView.tsx
- AgentsOrchestrator Agent Personality
- bundled.ts
- edge.ts
- ResultPlayer.tsx
- Click.Play
- devDependencies
- scene.ts
- orchestrator.test.ts
- ClickPlayVideo.tsx
- 🎙️ Voice AI Integration Engineer Agent
- Core Mission
- new-provider
- verify-package
- typecheck-on-edit.cjs
- FallbackMusic
- Marketing SEO Specialist
- Click.Play — Implementation Plan
- dependencies
- critic.ts
- ArchitectUX Agent Personality
- §11A. Roadmap de produção e qualidade de output — gaps pós-primeiro-vídeo-real
- 0.2 Correção arquitetural: estratégia de produção visual (não é slideshow)
- 11. Roadmap de produto — Studio → SaaS
- 0.1 Público-alvo e decisões de produto derivadas
- Uso
- Social Media Strategist Agent
- Marketing Video Optimization Specialist Agent
- creative-director.ts
- llm/types.ts
- providers.ts
- api.ts
- providers/src/index.ts
- Brand Guardian Agent Personality
- dependencies
- plan-status
- UI Designer Agent Personality
- base.ts
- orchestrator.ts
- Marketing Content Creator Agent
- Wizard.tsx
- Video Streaming Engineer
- Visual Storyteller Agent
- ProgressView.tsx
- Marketing Douyin Strategist
- TokenGate.tsx
- ImageProvider
- withRetry
- VideoGenerationProvider
- music/openrouter.ts
- OpenRouterVideo
- timeout.ts
- server.test.ts
- settings.ts
- jobs.ts
- api/src/index.ts
- asset.ts

## God Nodes (most connected - your core abstractions)
1. `ClickPlayDb` - 22 edges
2. `LLMProvider` - 16 edges
3. `Click.Play — Implementation Plan` - 15 edges
4. `PipelineCallbacks` - 13 edges
5. `AgentsOrchestrator Agent Personality` - 13 edges
6. `Social Media Strategist Agent` - 13 edges
7. `compilerOptions` - 13 edges
8. `generateDirectorScore()` - 12 edges
9. `request()` - 11 edges
10. `runJobOnce()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `buildServer()` --calls--> `registerJobsRoutes()`  [EXTRACTED]
  apps/api/src/server.ts → apps/api/src/routes/jobs.ts
- `listJobsByProduction()` --indirect_call--> `jobFromRow()`  [INFERRED]
  packages/providers/src/persistence/repository.ts → packages/providers/src/persistence/types.ts
- `staticScene()` --references--> `Scene`  [EXTRACTED]
  packages/domain/src/scene.test.ts → packages/domain/src/scene.ts
- `videoScene()` --references--> `Scene`  [EXTRACTED]
  packages/domain/src/scene.test.ts → packages/domain/src/scene.ts
- `BaseLLM` --implements--> `LLMProvider`  [EXTRACTED]
  packages/providers/src/llm/base.ts → packages/providers/src/llm/types.ts

## Import Cycles
- None detected.

## Communities (83 total, 5 thin omitted)

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
Cohesion: 0.06
Nodes (67): addCheckpointColumnIfMissing(), addResultSummaryColumnIfMissing(), addStageDetailColumnIfMissing(), ClickPlayDb, createDb(), ensureWalletRow(), renameProjectsToProductionsIfNeeded(), toRow() (+59 more)

### Community 6 - "devDependencies"
Cohesion: 0.06
Nodes (33): dependencies, react, react-dom, devDependencies, tailwindcss, @tailwindcss/vite, @types/react, @types/react-dom (+25 more)

### Community 7 - "resolve-element.ts"
Cohesion: 0.17
Nodes (11): resolveVideoGenerationProvider(), VideoGenerationProviderKey, resolveAiVideoClip(), resolveElement(), ResolveElementContext, resolveStock(), ASSET, CANDIDATE (+3 more)

### Community 8 - "run-qc.ts"
Cohesion: 0.08
Nodes (26): checkBlackdetect(), checkCostDeviation(), checkCriticScore(), checkDurationMatch(), checkOutputExists(), checkResolutionMatch(), ExpectedFormat, checkTargetDurationMatch() (+18 more)

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

### Community 14 - "Image Prompt Engineer Agent"
Cohesion: 0.05
Nodes (36): Advanced Capabilities, Advanced Prompt Patterns, Cinematic Portrait, Critical Rules You Must Follow, Environment & Setting Layer, Environmental Portrait, Example Prompt Templates, Fashion Photography (+28 more)

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
Cohesion: 0.15
Nodes (9): Settings, BADGE_STYLES, BadgeKind, MODEL_FIELDS, ModelSelect(), ModelSelectProps, SECRET_FIELDS, SecretFieldConfig (+1 more)

### Community 22 - "AgentsOrchestrator Agent Personality"
Cohesion: 0.05
Nodes (37): 🚀 Advanced Pipeline Capabilities, AgentsOrchestrator Agent Personality, Autonomous Operation, 🤖 Available Specialist Agents, Completion Summary Template, Context-Aware Agent Spawning, 🚨 Critical Rules You Must Follow, 🎨 Design & UX Agents (+29 more)

### Community 24 - "bundled.ts"
Cohesion: 0.21
Nodes (10): listTracks(), loadManifest(), MANIFEST_PATH, ManifestTrack, MUSIC_DIR, MusicManifest, MusicSelection, PACKAGE_ROOT (+2 more)

### Community 25 - "edge.ts"
Cohesion: 0.10
Nodes (13): EDGE_TTS_VOICES, EdgeTTS, parseWordBoundaries(), resolveEdgeVoice(), sleep(), streamToBuffer(), FallbackTTS, estimateWordTimestamps() (+5 more)

### Community 26 - "ResultPlayer.tsx"
Cohesion: 0.29
Nodes (4): outputUrl(), QcDecision, DECISION_STYLES, ResultPlayerProps

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
Cohesion: 0.08
Nodes (17): IMAGE_PRICING_PER_IMAGE, LLM_CALL_TOKEN_ESTIMATES, LLM_PRICING_PER_MODEL, MODEL_BY_TIER, MUSIC_PRICING_PER_TRACK, TTS_PRICING_PER_CHAR, VIDEO_PRICING_PER_SECOND, runPipeline() (+9 more)

### Community 31 - "ClickPlayVideo.tsx"
Cohesion: 0.10
Nodes (17): ClickPlayVideoRoot(), DEFAULT_PROPS, Main(), resolveAsset(), JUSTIFY_BY_POSITION, MusicTrack(), getTotalDurationInFrames(), mapRenderInputToProps() (+9 more)

### Community 32 - "🎙️ Voice AI Integration Engineer Agent"
Cohesion: 0.06
Nodes (30): 🚀 Advanced Capabilities, Advanced Diarization and Speaker Intelligence, Audio Quality Awareness, 🚨 Critical Rules You Must Follow, End-to-End Transcription Pipeline Engineering, Input Handling and Validation, Integration Targets, 🔄 Learning & Memory (+22 more)

### Community 33 - "Core Mission"
Cohesion: 0.07
Nodes (26): AI-Assisted Editing, Audio Engineering, Audio Matters as Much as Video, Color Grading & Correction, Communication Style, Composition & Camera Language, Core Mission, Critical Rules (+18 more)

### Community 34 - "new-provider"
Cohesion: 0.50
Nodes (3): new-provider, Padrão (ver packages/providers/src/{llm,tts,video,image}/ como referência real), Uso

### Community 35 - "verify-package"
Cohesion: 0.50
Nodes (3): Passos, Uso, verify-package

### Community 41 - "Marketing SEO Specialist"
Cohesion: 0.06
Nodes (30): Advanced Capabilities, AI Search & SGE Adaptation, Algorithm Recovery, Cannibalization Audit Template, Cannibalization Audit Without GSC (Pre-Access Fallback), Cannibalization Prevention (MANDATORY before any optimization), Communication Style, Core Mission (+22 more)

### Community 42 - "Click.Play — Implementation Plan"
Cohesion: 0.17
Nodes (12): 0. Resumo da decisão, 10. Critérios de aceite, 1. Arquitetura proposta, 2. Matriz de reaproveitamento, 3. Componentes reutilizados (quase sem mudança), 4. Componentes adaptados (reescrita parcial), 5. Componentes removidos, 6. Componentes novos (não existem em nenhum dos dois) (+4 more)

### Community 43 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, @clickplay/providers, fastify, @fastify/cors, @fastify/helmet, @fastify/rate-limit, @fastify/static, react (+11 more)

### Community 44 - "critic.ts"
Cohesion: 0.22
Nodes (10): PACING_CONFIG, CritiqueOutput, CritiqueResult, evaluate(), SYSTEM_PROMPT_PATH, ArchetypeConfig, ARCHETYPES, getArchetype() (+2 more)

### Community 45 - "ArchitectUX Agent Personality"
Cohesion: 0.07
Nodes (29): 🚀 Advanced Capabilities, ArchitectUX Agent Personality, Bridge PM and Development, Create Developer-Ready Foundations, 🚨 Critical Rules You Must Follow, CSS Architecture Mastery, CSS Design System Foundation, Developer Experience (+21 more)

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

### Community 51 - "Social Media Strategist Agent"
Cohesion: 0.11
Nodes (18): Campaign Management, Campaign Planning, Communication Style, Core Capabilities, Cross-Platform Integration, Decision Framework, Example Use Cases, Learning & Memory (+10 more)

### Community 53 - "Marketing Video Optimization Specialist Agent"
Cohesion: 0.11
Nodes (18): Algorithmic Optimization, Analytics & Monetization, Clickability Without Clickbait, Content & Visual Strategy, 🚨 Critical Rules You Must Follow, Marketing Video Optimization Specialist Agent, Retention First, Step 1: Research & Discovery (+10 more)

### Community 54 - "creative-director.ts"
Cohesion: 0.25
Nodes (16): assertSceneCountCap(), assertVideoMode(), buildDefaultPrompt(), buildPacingInstruction(), buildVideoModeGuidance(), DirectorScoreOutput, DirectorScoreRaw, extractVisualPrompt() (+8 more)

### Community 55 - "llm/types.ts"
Cohesion: 0.10
Nodes (15): research, research(), ResearchOutput, ResearchResult, SYSTEM_PROMPT_PATH, RESULT, FallbackLLM, opts (+7 more)

### Community 56 - "providers.ts"
Cohesion: 0.40
Nodes (10): buildImageProvider(), buildJobRunnerDeps(), buildLLM(), buildMusicProvider(), buildStockProviders(), buildTTS(), buildVideoProviders(), REMOTION_ENTRY (+2 more)

### Community 57 - "api.ts"
Cohesion: 0.15
Nodes (22): approveCost(), CostAmount, createJob(), Credits, getCredits(), getFormConfig(), getJob(), getSettings() (+14 more)

### Community 58 - "providers/src/index.ts"
Cohesion: 0.16
Nodes (12): CAPTION_STYLES, getFormConfig(), getRecommendedModels(), PACING_TIERS, RECOMMENDED_IMAGE_MODELS, RECOMMENDED_TTS_FALLBACK_MODELS, RECOMMENDED_VIDEO_MODELS, CreditsRouteDeps (+4 more)

### Community 59 - "Brand Guardian Agent Personality"
Cohesion: 0.07
Nodes (27): 🚀 Advanced Capabilities, Brand-First Approach, Brand Foundation Framework, Brand Guardian Agent Personality, Brand Protection Expertise, Brand Strategy Mastery, Brand Voice and Messaging, Create Comprehensive Brand Foundations (+19 more)

### Community 60 - "dependencies"
Cohesion: 0.33
Nodes (6): zod, dependencies, @clickplay/shared, zod, zod, zod

### Community 61 - "plan-status"
Cohesion: 0.50
Nodes (3): plan-status, Processo, Uso

### Community 62 - "UI Designer Agent Personality"
Cohesion: 0.07
Nodes (26): 🚀 Advanced Capabilities, Component Library Architecture, Craft Pixel-Perfect Interfaces, Create Comprehensive Design Systems, 🚨 Critical Rules You Must Follow, Design System First Approach, Design System Mastery, Developer Collaboration (+18 more)

### Community 63 - "base.ts"
Cohesion: 0.23
Nodes (6): BaseLLM, FakeLLM, generateTextMock, OpenRouterLLM, LLMProviderKey, LLMResult

### Community 64 - "orchestrator.ts"
Cohesion: 0.17
Nodes (9): DirectorScore, PipelineCheckpoint, PipelineOptions, PipelineResult, PipelineStage, RevisionLogEntry, RunQcInput, ComposedScene (+1 more)

### Community 65 - "Marketing Content Creator Agent"
Cohesion: 0.29
Nodes (6): Core Capabilities, Decision Framework, Identity & Role Definition, Marketing Content Creator Agent, Specialized Skills, Success Metrics

### Community 66 - "Wizard.tsx"
Cohesion: 0.16
Nodes (13): CreateJobInput, FormConfig, TransitionType, CHUNK_SIZE_LEVELS, formatLabel(), FormState, INITIAL_STATE, MUSIC_VOLUME_LEVELS (+5 more)

### Community 67 - "Video Streaming Engineer"
Cohesion: 0.11
Nodes (17): 🚀 Advanced Capabilities, Bitrate Ladder Design (per-title beats one-size), 🚨 Critical Rules You Must Follow, Delivery & Scale, Encoding Science, ffmpeg Transcode Ladder → CMAF (package once), Latency Tier Decision Table, 🔄 Learning & Memory (+9 more)

### Community 68 - "Visual Storyteller Agent"
Cohesion: 0.08
Nodes (24): 🚀 Advanced Capabilities, 🚨 Critical Rules You Must Follow, Cross-Platform Adaptation, Cross-Platform Visual Strategy, Information Design & Data Visualization, Multimedia Content Creation, Multimedia Design Excellence, Step 1: Story Strategy Development (+16 more)

### Community 69 - "ProgressView.tsx"
Cohesion: 0.29
Nodes (7): CostBreakdown, JobView, costLine(), friendlyError(), ProgressView(), ProgressViewProps, STAGE_LABELS

### Community 70 - "Marketing Douyin Strategist"
Cohesion: 0.10
Nodes (19): Algorithm-First Thinking, Communication Style, Compliance Guardrails, Core Mission, Critical Rules, Livestream Commerce, Livestream Product Lineup, Marketing Douyin Strategist (+11 more)

### Community 71 - "TokenGate.tsx"
Cohesion: 0.60
Nodes (3): setStoredToken(), TokenGate(), TokenGateProps

### Community 72 - "ImageProvider"
Cohesion: 0.23
Nodes (3): FallbackImage, GeminiImage, ImageProvider

### Community 73 - "withRetry"
Cohesion: 0.27
Nodes (4): sleep(), withRetry(), OpenRouterImage, VideoJobStatus

### Community 74 - "VideoGenerationProvider"
Cohesion: 0.27
Nodes (4): FalVideo, GeminiVideo, VideoGenerationProvider, VideoResult

### Community 77 - "timeout.ts"
Cohesion: 0.70
Nodes (3): GenerateProvider, withProviderTimeout(), withTimeout()

### Community 78 - "server.test.ts"
Cohesion: 0.21
Nodes (14): buildServer(), appWithToken(), costOptions, directorPayload(), execFileAsync, fakeImageProvider(), fakeJobRunnerDeps(), fakeLLM() (+6 more)

### Community 79 - "settings.ts"
Cohesion: 0.26
Nodes (9): readEnvFile(), writeEnvFile(), mask(), noNewlines, PLAIN_FIELDS, registerSettingsRoutes(), SECRET_FIELDS, SettingsBody (+1 more)

### Community 80 - "jobs.ts"
Cohesion: 0.27
Nodes (8): ApproveCostBody, ASPECT_RATIOS, CreateJobBody, JobsRouteDeps, jobToResponse(), registerJobsRoutes(), RESOLUTION_BY_ASPECT_RATIO, STAGE_BY_STATUS

### Community 81 - "api/src/index.ts"
Cohesion: 0.25
Nodes (7): openDb(), app, db, envFilePath, port, runsDir, buildCostOptions()

## Knowledge Gaps
- **575 isolated node(s):** `ASPECT_RATIOS`, `RESOLUTION_BY_ASPECT_RATIO`, `STAGE_BY_STATUS`, `CostAmount`, `JobStatus` (+570 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LLMProvider` connect `llm/types.ts` to `orchestrator.ts`, `repository.ts`, `critic.ts`, `creative-director.ts`, `orchestrator.test.ts`, `base.ts`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `PipelineCallbacks` connect `orchestrator.test.ts` to `orchestrator.ts`, `repository.ts`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `ASPECT_RATIOS`, `RESOLUTION_BY_ASPECT_RATIO`, `STAGE_BY_STATUS` to the rest of the system?**
  _575 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `video-engine/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
- **Should `repository.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05966386554621849 - nodes in this community are weakly interconnected._