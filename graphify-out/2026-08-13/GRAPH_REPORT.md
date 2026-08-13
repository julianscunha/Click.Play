# Graph Report - Click.Play  (2026-08-13)

## Corpus Check
- 34 files · ~3,187 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 282 nodes · 262 edges · 29 communities (28 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `558e06f1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- scripts
- providers/package.json
- api/package.json
- domain/package.json
- video-engine/package.json
- shared/package.json
- web/package.json
- dependencies
- logger.ts
- compilerOptions
- devDependencies
- Click.Play — Implementation Plan
- web/tsconfig.json
- compilerOptions
- shared/tsconfig.json
- domain/tsconfig.json
- providers/tsconfig.json
- video-engine/tsconfig.json
- api/src/index.ts
- App

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 13 edges
2. `Click.Play — Implementation Plan` - 12 edges
3. `scripts` - 7 edges
4. `scripts` - 7 edges
5. `scripts` - 7 edges
6. `compilerOptions` - 5 edges
7. `createConsoleLogger()` - 5 edges
8. `compilerOptions` - 4 edges
9. `lib` - 4 edges
10. `scripts` - 4 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (29 total, 1 thin omitted)

### Community 0 - "scripts"
Cohesion: 0.12
Nodes (15): devDependencies, typescript, engines, node, typescript, name, private, scripts (+7 more)

### Community 1 - "providers/package.json"
Cohesion: 0.09
Nodes (22): dependencies, @clickplay/domain, @clickplay/shared, zod, devDependencies, typescript, vitest, @clickplay/domain (+14 more)

### Community 2 - "api/package.json"
Cohesion: 0.10
Nodes (20): devDependencies, tsx, @types/node, typescript, vitest, @types/node, typescript, vitest (+12 more)

### Community 3 - "domain/package.json"
Cohesion: 0.10
Nodes (20): dependencies, @clickplay/shared, zod, devDependencies, typescript, vitest, @clickplay/shared, typescript (+12 more)

### Community 4 - "video-engine/package.json"
Cohesion: 0.10
Nodes (20): dependencies, @clickplay/domain, @clickplay/shared, devDependencies, typescript, vitest, @clickplay/domain, @clickplay/shared (+12 more)

### Community 5 - "shared/package.json"
Cohesion: 0.11
Nodes (17): devDependencies, @types/node, typescript, vitest, @types/node, typescript, vitest, main (+9 more)

### Community 6 - "web/package.json"
Cohesion: 0.12
Nodes (16): dependencies, react, react-dom, name, private, scripts, build, dev (+8 more)

### Community 7 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, @clickplay/domain, @clickplay/providers, @clickplay/shared, @clickplay/video-engine, fastify, @fastify/cors, @fastify/static (+7 more)

### Community 8 - "logger.ts"
Cohesion: 0.18
Nodes (6): createConsoleLogger(), LogFields, Logger, redact(), SENSITIVE_KEYS, Result

### Community 9 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution (+6 more)

### Community 10 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, @types/react, @types/react-dom, typescript, vite, @vitejs/plugin-react, vitest, typescript (+5 more)

### Community 11 - "Click.Play — Implementation Plan"
Cohesion: 0.15
Nodes (12): 0. Resumo da decisão, 10. Critérios de aceite, 1. Arquitetura proposta, 2. Matriz de reaproveitamento, 3. Componentes reutilizados (quase sem mudança), 4. Componentes adaptados (reescrita parcial), 5. Componentes removidos, 6. Componentes novos (não existem em nenhum dos dois) (+4 more)

### Community 12 - "web/tsconfig.json"
Cohesion: 0.17
Nodes (11): compilerOptions, jsx, lib, noEmit, extends, include, ES2022, src (+3 more)

### Community 13 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, module, moduleResolution, outDir, rootDir, extends, include, src (+1 more)

### Community 14 - "shared/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, outDir, rootDir, types, extends, include, src, ../../tsconfig.base.json (+1 more)

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

## Knowledge Gaps
- **165 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+160 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `api/package.json`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `web/package.json`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _165 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `providers/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `api/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `domain/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._