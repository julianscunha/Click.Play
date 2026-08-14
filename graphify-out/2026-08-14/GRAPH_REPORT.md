# Graph Report - Click.Play  (2026-08-14)

## Corpus Check
- 150 files · ~41,274 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 501 nodes · 571 edges · 38 communities (35 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9636bf2d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- scripts
- domain/package.json
- api/package.json
- dependencies
- video-engine/package.json
- dependencies
- web/package.json
- video/types.ts
- base.ts
- compilerOptions
- edge.ts
- Click.Play — Implementation Plan
- web/tsconfig.json
- compilerOptions
- image/gemini.ts
- domain/tsconfig.json
- providers/tsconfig.json
- video-engine/tsconfig.json
- api/src/index.ts
- App
- video-project.ts
- creative-director.ts
- Click.Play
- AgentsOrchestrator Agent Personality
- Core Mission
- Social Media Strategist Agent
- Marketing Video Optimization Specialist Agent
- Marketing Content Creator Agent
- new-provider
- verify-package
- typecheck-on-edit.cjs

## God Nodes (most connected - your core abstractions)
1. `Click.Play — Implementation Plan` - 13 edges
2. `AgentsOrchestrator Agent Personality` - 13 edges
3. `Social Media Strategist Agent` - 13 edges
4. `compilerOptions` - 13 edges
5. `Core Mission` - 10 edges
6. `BaseLLM` - 8 edges
7. `LLMProvider` - 8 edges
8. `🤖 Available Specialist Agents` - 8 edges
9. `Marketing Video Optimization Specialist Agent` - 8 edges
10. `0.2 Correção arquitetural: estratégia de produção visual (não é slideshow)` - 7 edges

## Surprising Connections (you probably didn't know these)
- `staticScene()` --references--> `Scene`  [EXTRACTED]
  packages/domain/src/scene.test.ts → packages/domain/src/scene.ts
- `toScenes()` --references--> `Scene`  [EXTRACTED]
  packages/providers/src/agents/creative-director.ts → packages/domain/src/scene.ts
- `evaluate()` --calls--> `getArchetype()`  [EXTRACTED]
  packages/providers/src/agents/critic.ts → packages/providers/src/config/archetype-registry.ts
- `BaseLLM` --implements--> `LLMProvider`  [EXTRACTED]
  packages/providers/src/llm/base.ts → packages/providers/src/llm/types.ts
- `GeminiImage` --implements--> `ImageProvider`  [EXTRACTED]
  packages/providers/src/image/gemini.ts → packages/providers/src/image/types.ts

## Import Cycles
- None detected.

## Communities (38 total, 3 thin omitted)

### Community 0 - "scripts"
Cohesion: 0.12
Nodes (15): devDependencies, typescript, engines, node, typescript, name, private, scripts (+7 more)

### Community 1 - "domain/package.json"
Cohesion: 0.07
Nodes (28): devDependencies, typescript, vitest, main, name, private, scripts, lint (+20 more)

### Community 2 - "api/package.json"
Cohesion: 0.10
Nodes (20): devDependencies, tsx, @types/node, typescript, vitest, @types/node, typescript, vitest (+12 more)

### Community 3 - "dependencies"
Cohesion: 0.11
Nodes (20): ai, @clickplay/domain, @clickplay/shared, @fal-ai/client, @google/genai, msedge-tts, @openrouter/ai-sdk-provider, dependencies (+12 more)

### Community 4 - "video-engine/package.json"
Cohesion: 0.10
Nodes (20): dependencies, @clickplay/domain, @clickplay/shared, devDependencies, typescript, vitest, @clickplay/domain, @clickplay/shared (+12 more)

### Community 5 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, @clickplay/domain, @clickplay/providers, @clickplay/shared, @clickplay/video-engine, fastify, @fastify/cors, @fastify/static (+7 more)

### Community 6 - "web/package.json"
Cohesion: 0.07
Nodes (29): dependencies, react, react-dom, devDependencies, @types/react, @types/react-dom, typescript, vite (+21 more)

### Community 7 - "video/types.ts"
Cohesion: 0.21
Nodes (6): FalVideo, GeminiVideo, resolveVideoGenerationProvider(), VideoGenerationProvider, VideoGenerationProviderKey, VideoResult

### Community 8 - "base.ts"
Cohesion: 0.23
Nodes (6): BaseLLM, FakeLLM, generateTextMock, OpenRouterLLM, LLMProviderKey, LLMResult

### Community 9 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution (+6 more)

### Community 10 - "edge.ts"
Cohesion: 0.24
Nodes (6): EDGE_TTS_VOICES, EdgeTTS, parseWordBoundaries(), streamToBuffer(), TTSProvider, TTSResult

### Community 11 - "Click.Play — Implementation Plan"
Cohesion: 0.08
Nodes (24): 0.1 Público-alvo e decisões de produto derivadas, 0.2 Correção arquitetural: estratégia de produção visual (não é slideshow), 0. Resumo da decisão, 10. Critérios de aceite, 1. Arquitetura proposta, 2. Matriz de reaproveitamento, 3. Componentes reutilizados (quase sem mudança), 4. Componentes adaptados (reescrita parcial) (+16 more)

### Community 12 - "web/tsconfig.json"
Cohesion: 0.17
Nodes (11): compilerOptions, jsx, lib, noEmit, extends, include, ES2022, src (+3 more)

### Community 13 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, module, moduleResolution, outDir, rootDir, extends, include, src (+1 more)

### Community 15 - "domain/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src, ../../tsconfig.base.json

### Community 16 - "providers/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src, ../../tsconfig.base.json

### Community 17 - "video-engine/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src, ../../tsconfig.base.json

### Community 18 - "api/src/index.ts"
Cohesion: 0.47
Nodes (3): app, port, buildServer()

### Community 25 - "video-project.ts"
Cohesion: 0.08
Nodes (22): Asset, AssetType, AudioTrack, MusicMood, MusicTrack, NarrationTrack, WordTimestamp, Caption (+14 more)

### Community 26 - "creative-director.ts"
Cohesion: 0.11
Nodes (27): buildDefaultPrompt(), buildPacingInstruction(), DirectorScore, DirectorScoreOutput, DirectorScoreRaw, generateDirectorScore(), loadDirectorSystemPrompt(), PACING_CONFIG (+19 more)

### Community 27 - "Click.Play"
Cohesion: 0.40
Nodes (4): Click.Play, Comandos, pnpm gotcha (Windows), Workflow

### Community 29 - "AgentsOrchestrator Agent Personality"
Cohesion: 0.05
Nodes (37): 🚀 Advanced Pipeline Capabilities, AgentsOrchestrator Agent Personality, Autonomous Operation, 🤖 Available Specialist Agents, Completion Summary Template, Context-Aware Agent Spawning, 🚨 Critical Rules You Must Follow, 🎨 Design & UX Agents (+29 more)

### Community 30 - "Core Mission"
Cohesion: 0.07
Nodes (26): AI-Assisted Editing, Audio Engineering, Audio Matters as Much as Video, Color Grading & Correction, Communication Style, Composition & Camera Language, Core Mission, Critical Rules (+18 more)

### Community 31 - "Social Media Strategist Agent"
Cohesion: 0.11
Nodes (18): Campaign Management, Campaign Planning, Communication Style, Core Capabilities, Cross-Platform Integration, Decision Framework, Example Use Cases, Learning & Memory (+10 more)

### Community 32 - "Marketing Video Optimization Specialist Agent"
Cohesion: 0.11
Nodes (18): Algorithmic Optimization, Analytics & Monetization, Clickability Without Clickbait, Content & Visual Strategy, 🚨 Critical Rules You Must Follow, Marketing Video Optimization Specialist Agent, Retention First, Step 1: Research & Discovery (+10 more)

### Community 33 - "Marketing Content Creator Agent"
Cohesion: 0.29
Nodes (6): Core Capabilities, Decision Framework, Identity & Role Definition, Marketing Content Creator Agent, Specialized Skills, Success Metrics

### Community 34 - "new-provider"
Cohesion: 0.50
Nodes (3): new-provider, Padrão (ver packages/providers/src/{llm,tts,video,image}/ como referência real), Uso

### Community 35 - "verify-package"
Cohesion: 0.50
Nodes (3): Passos, Uso, verify-package

## Knowledge Gaps
- **271 isolated node(s):** `Comandos`, `pnpm gotcha (Windows)`, `Workflow`, `{ execFileSync }`, `Uso` (+266 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `domain/package.json`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `msedge-tts` connect `dependencies` to `edge.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **What connects `Comandos`, `pnpm gotcha (Windows)`, `Workflow` to the rest of the system?**
  _271 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `domain/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `api/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._