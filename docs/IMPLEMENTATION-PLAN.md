# Click.Play — Implementation Plan

Status: Fase 0+1 concluídas. Decisões de produto (arquétipos) alinhadas com o usuário. Código de domínio ainda não escrito.

## 0.1 Público-alvo e decisões de produto derivadas

Foco de conteúdo: vídeos educativos, vídeos infantis, animações, conteúdo divertido/brincadeiras — além dos casos genéricos (documentário, storytelling, tech, editorial) já cobertos pelos arquétipos do OpenReels. Isso não muda a arquitetura, mas define:

- Arquétipos visuais (§6, `archetype-registry`): usar os **14 do OpenReels + 5 novos** voltados a infantil/educativo/divertido, definidos abaixo. Nenhum corte nos 14 originais — cobrem os casos genéricos que também usaremos.
- Fase 4 deve criar os 5 JSONs novos em `src/config/archetypes/` (mesmo schema do `ArchetypeConfig`: scenePacing, defaultTransition, transitionDurationFrames, captionStyle, captionChunkSize, captionLingerS, colorPalette, textCardFont, motionIntensity, artStyle, lighting, compositionRules, culturalMarkers, mood, antiArtifactGuidance, visualColorPalette).

### Arquétipos novos (Click.Play)

| id | pacing | transição | legenda | mood | paleta | estilo visual |
|---|---|---|---|---|---|---|
| `kids-cartoon` | fast | slide_left | bold_outline | Alegre, brincalhão, energético, engraçado | amarelo-sol, vermelho-cereja, azul-céu, verde-limão, rosa-chiclete | cartoon 2D flat, formas arredondadas, olhos grandes, traço grosso, sem sombra realista |
| `storybook-picturebook` | moderate | crossfade | gradient_rise | Aconchegante, mágico, gentil, encantador | pastel-lavanda, pêssego suave, verde-sálvia, creme, dourado-suave | ilustração de livro infantil, aquarela+nanquim, texturado à mão, luz suave |
| `edu-explainer` | fast | slide_left | box_highlight | Curioso, claro, amigável, animado | branco, azul-turquesa, laranja-vívido, roxo-suave, amarelo-canário | vetor flat estilo explicativo (tipo Kurzgesagt), ícones simples, formas geométricas, sem textura |
| `claymation-playful` | moderate | wipe | color_highlight | Divertido, tátil, peculiar, caloroso | terracota, mostarda, verde-oliva, creme, marrom-chocolate | stop-motion massinha/feltro, textura tátil visível, luz de estúdio suave, imperfeições propositais |
| `musical-singalong` | fast | zoom | karaoke_sweep | Alegre, saltitante, festivo, contagiante | rosa-chiclete, amarelo-sol, azul-céu, verde-grama, laranja-vivo | animação de recorte/fantoche (cutout), formas bouncy, movimento no ritmo da música |

`musical-singalong` usa `karaoke_sweep` (destaque palavra-por-palavra já existente no motor de legendas) — encaixe natural pra conteúdo cantado.

### TTS: default remoto

Sem Tavily/web search no research (item confirmado — LLM usa conhecimento próprio, sem dependência/custo extra).

TTS: múltiplos providers disponíveis via `TTSProvider` (interface já reaproveitada do OpenReels: `openai.ts`, `elevenlabs.ts`, `kokoro.ts`, `gemini.ts`, `inworld.ts` — trocar é config, não código novo). **Default = OpenAI TTS** (remoto, custo baixo por vídeo, sem risco de build nativo quebrar no Windows). ElevenLabs disponível como upgrade de qualidade para quem quiser pagar mais. Kokoro (local) fica disponível mas não é o default — evita depender de build nativo (`onnxruntime-node`/`sharp`) logo de cara.

## 0. Resumo da decisão

Base técnica: **OpenReels** (`github.com/tsensei/OpenReels`, MIT). Já é Node/TS/pnpm/Remotion — stack quase idêntica à pedida. Pipeline de IA (research→director→TTS→visuals→music→captions→assembly→critic) existe de fato no código, não só no README.

Base de produto/UX: **MoneyPrinterTurbo** (`github.com/harry0703/MoneyPrinterTurbo`, MIT). É Python (FastAPI+Streamlit) — código não é portável para um backend TS. Serve só como referência de fluxo de tela, campos de configuração e organização da UX.

`HyperFrames` não avaliado em profundidade nesta fase (fora do MVP, spec §55). Fica para revisão futura quando `HyperFramesRenderer` entrar em pauta.

Resultado: não é greenfield, não é fork 1:1 de nenhum dos dois. É consolidação — código do OpenReels como esqueleto técnico, com nossa camada de domínio (`VideoProject`) por cima para desacoplar de Remotion, mais os campos/fluxo de UX do MoneyPrinterTurbo portados para uma WebUI React própria.

## 1. Arquitetura proposta

```
/apps
  /web        React + TS + Vite — WebUI própria (não Streamlit, não a SPA do OpenReels)
  /api        Fastify — REST, sem fila obrigatória no MVP (spec §23/§47)

/packages
  /domain         VideoProject, Scene, Asset, AudioTrack, Caption — zero dependência de Remotion/FFmpeg/OpenRouter
  /video-engine   VideoRenderer interface + RemotionRenderer (adaptado de score-to-props.ts + OpenReelsVideo.tsx)
  /providers      LLMProvider/TTSProvider/ImageProvider/StockProvider/VideoProvider/MusicProvider/StorageProvider — interfaces + implementações (portadas do OpenReels + OpenRouter como default LLM)
  /shared         Result, Logger, tipos comuns
```

Monólito modular, sem microservices, sem Redis/BullMQ no MVP (diferença deliberada do modo servidor do OpenReels, que usa fila — ver §5 Riscos).

Persistência: SQLite + Drizzle no MVP, Postgres-ready (schema código, migração trocando driver). OpenReels hoje persiste em arquivos JSON (`score.json`/`log.json`) — passamos a usar essas mesmas estruturas como *shape* de dados, mas persistidas via Drizzle em vez de arquivo solto, para atender spec §31 (projects/jobs/scenes/assets/audio_tracks/captions/render_jobs/settings).

## 2. Matriz de reaproveitamento

| Capacidade | MoneyPrinterTurbo | OpenReels | Ação |
|---|---|---|---|
| Frontend | Streamlit, referência de UX só | SPA React própria, não auditada a fundo | **Criar** WebUI nova em `apps/web`, campos/fluxo copiados do MPT |
| Backend/API | FastAPI (Python, não portável) | Fastify + BullMQ+Redis (fila) | **Adaptar**: Fastify sim, fila não (MVP sem Redis) |
| Project model | `VideoParams` (Pydantic, referência de campos) | `DirectorScore` (Zod, TS) | **Adaptar**: `DirectorScore` vira base do `VideoProject`, estendido com campos de `VideoParams` que faltam (title, targetDuration, aspectRatio, resolution, fps, status, timestamps) |
| Script/Research | `app/services/script.py` (referência) | `src/agents/research.ts` + `creative-director.ts` | **Reutilizar** agentes do OpenReels quase como estão |
| Creative Director/Storyboard | não existe equivalente | `src/agents/creative-director.ts`, `DirectorScore` | **Reutilizar** |
| Script QA/Critic | não existe equivalente | `src/agents/critic.ts` | **Reutilizar** |
| TTS | Edge TTS, Azure, ElevenLabs etc (lista de providers, referência) | `src/providers/tts/*` (kokoro local, elevenlabs, gemini, openai, inworld) + `aligned-tts-provider.ts` (decorator Whisper) | **Reutilizar** interfaces+implementações; Kokoro como default local (spec §15 prefere solução local/gratuita) |
| Assets/Stock | Pexels/Pixabay/Coverr (referência de providers) | `src/providers/stock/*` (Pexels/Pixabay + adaptive-resolver + stock-verifier) | **Reutilizar** |
| Imagem/Vídeo por IA | não tem | `src/providers/image/*`, `src/providers/video/*` (Gemini/Veo, Fal/Kling) | **Reutilizar** (opcional, não obrigatório no MVP conforme spec §16) |
| Música | biblioteca local + Sonilo/ElevenLabs AI (referência) | `src/providers/music/bundled.ts` (25 faixas) + `lyria.ts` | **Reutilizar** bundled como default MVP (spec §17: não depender de IA musical) |
| Legendas | config de estilo (fonte/cor/posição/contorno, referência) | `src/remotion/captions/*` (7 estilos + motor spring physics seek-safe) | **Reutilizar** motor; expor os campos de estilo do MPT na UI |
| Transições | none/Shuffle/FadeIn/FadeOut/SlideIn/SlideOut/ZoomIn/ZoomOut (referência) | `@remotion/transitions` já integrado (crossfade/slide/wipe/flip) | **Adaptar**: unificar nomenclatura das duas listas |
| Abertura | não existe | não existe | **Criar** (spec §19, 5 templates) |
| Assembly/Render | FFmpeg direto (Python) | `OpenReelsVideo.tsx` + `score-to-props.ts` (acoplado a Remotion) | **Adaptar**: envolver em `VideoRenderer`/`RemotionRenderer` (domínio não conhece Remotion) |
| FFmpeg | uso disperso (Python) | uso pontual (ffprobe, transcode TTS) | **Criar** módulo central `packages/video-engine/ffmpeg.ts`, sem chamadas espalhadas (spec §22) |
| Provider LLM | 18 providers via config.toml (referência) | `openrouter.ts`, `anthropic.ts`, `openai.ts`, `gemini.ts`, `openai-compatible.ts`, `base.ts` (AI SDK, fallback tools) | **Reutilizar**, OpenRouter como default/obrigatório (spec §9) |
| Cost estimation | não tem | `src/cli/cost-estimator.ts` (estimativa pré + custo real pós) | **Reutilizar** quase inteiro |
| Job system | Task Manager (Streamlit, polling 2s, referência de UX) | server+worker+BullMQ (fila real) | **Adaptar**: manter state machine e UX de progresso, trocar fila por execução direta in-process controlada pelo backend (spec §23) |
| Storage | filesystem local (Python) | filesystem por job dir | **Criar** `StorageProvider` interface + `LocalStorageProvider`, formato de diretório do spec §30 |
| Publicação/cross-post | Upload-Post (tiktok/instagram/youtube) | não tem | **Criar stub** `PublishingProvider` (spec §37, não implementar publicação real no MVP) |
| Logging | básico | `log.json` por run | **Adaptar**: `Logger` estruturado (spec §34) + persistir via DB, não só arquivo |

## 3. Componentes reutilizados (quase sem mudança)

- `src/schema/providers.ts` — interfaces `LLMProvider/TTSProvider/ImageProvider/StockProvider/VideoProvider/MusicProvider`
- `src/providers/factory.ts` — factory de providers
- `src/providers/llm/base.ts` + `openrouter.ts` (+ demais LLM providers como alternativas)
- `src/providers/tts/*` (kokoro, aligned-tts-provider, whisper-aligner)
- `src/providers/stock/*`, `src/providers/image/*`, `src/providers/video/*`, `src/providers/music/bundled*.ts`
- `src/agents/research.ts`, `creative-director.ts`, `critic.ts`, `image-prompter.ts`, `music-prompter.ts`
- `src/remotion/captions/*`, `caption-utils.ts`, `src/remotion/beats/*`
- `src/cli/cost-estimator.ts`
- `src/config/archetype-registry.ts` + JSONs de arquétipo (vira base do campo "estilo visual" do spec §7/§40)
- `src/pipeline/utils.ts` (`PipelineCallbacks`/`PipelineOptions` — contrato de observabilidade de pipeline)

Atribuição MIT (copyright OpenReels/Talha Jubair Siam) mantida em `NOTICE`/cabeçalho dos arquivos portados.

## 4. Componentes adaptados (reescrita parcial)

- `src/pipeline/orchestrator.ts` → extrair lógica de negócio, **remover dependência do Mastra** (`@mastra/core`). Motivo: MVP não precisa de motor de workflow declarativo; spec pede monólito simples, evitar abstração sem necessidade real (spec §3/§52). Vira uma sequência de funções assíncronas chamadas pelo Job pipeline.
- `src/schema/director-score.ts` (`DirectorScore`/`Scene`) → base do `VideoProject`/`Scene` do domínio, estendido com: `id, title, description, language, targetDuration, aspectRatio, resolution, fps, status, createdAt, updatedAt, opening, narration, music, captions` (campos do spec §6 que faltam no DirectorScore).
- `src/remotion/lib/score-to-props.ts` + `OpenReelsVideo.tsx` → viram a implementação interna de `RemotionRenderer.render()`, atrás da interface `VideoRenderer`. Domínio (`packages/domain`) nunca importa nada de `remotion`.
- Server/worker (Fastify+BullMQ) → mantém Fastify, remove BullMQ/Redis; progresso via polling REST (spec §47), não SSE.
- `prompts/*.md` → adaptar tom/conteúdo (produto próprio, não citar "OpenReels"), manter estrutura de prompt.

## 5. Componentes removidos

- `@mastra/core` (workflow engine) — dependência sem necessidade real no MVP
- `bullmq` + `ioredis` — fila não é MVP (spec §23)
- `web/` SPA do OpenReels — não reaproveitada como código, só como referência de UX pontual
- Streamlit inteiro do MoneyPrinterTurbo (é Python, incompatível com o backend TS escolhido)
- Cross-post automático (Upload-Post) do MoneyPrinterTurbo — vira stub `PublishingProvider`, não implementação real (spec §37/§48)
- `@tavily/ai-sdk` — mantido **somente se** decidirmos oferecer research com web search; caso contrário remover (usa API paga externa, avaliar em Fase 4)

## 6. Componentes novos (não existem em nenhum dos dois)

- `packages/domain` (`VideoProject` completo, ver spec §6) — nenhum dos dois tem esse contrato desacoplado
- `VideoRenderer` interface (spec §1/§21) — OpenReels não tem essa abstração, é 1:1 com Remotion
- `StorageProvider`/`LocalStorageProvider` (spec §30) — OpenReels usa paths ad-hoc por job dir, sem interface
- Templates de abertura (spec §19) — não existe em nenhum dos dois
- `PublishingProvider` (stub, spec §37)
- `ThumbnailProvider` (spec §39)
- Camada de persistência Drizzle/SQLite (spec §31) — ambos usam arquivo/Pydantic sem DB relacional
- Job state machine com os estados exatos do spec §23 (QUEUED→...→COMPLETED/FAILED/CANCELLED) — Task Manager do MPT e worker do OpenReels têm noções parecidas mas não esse enum exato
- Quality Control determinístico pós-render (spec §27) — nenhum dos dois valida o MP4 final de forma estruturada
- WebUI React própria (`apps/web`) — campos vêm do MPT, componentes são novos

## 7. Dependências

Manter (via OpenReels): `fastify`, `@fastify/cors`, `@fastify/static`, `remotion` + `@remotion/*` (bundler/cli/player/renderer/transitions/google-fonts), `ai` (Vercel AI SDK) + `@ai-sdk/openai-compatible` + `@openrouter/ai-sdk-provider`, `zod`, `kokoro-js`, `wavefile`, `commander` (só CLI, se mantivermos), `p-limit`.

Adicionar: `drizzle-orm` + `drizzle-kit` + `better-sqlite3` (dev) / `pg` (prod-ready), `vite`, `react`/`react-dom` (frontend, versão já usada pelo OpenReels — 19.x), `vitest` (já usado).

Remover: `@mastra/core`, `bullmq`, `ioredis`. Avaliar remoção: `@tavily/ai-sdk`, `@fal-ai/client`, `@huggingface/transformers` (peso — `@huggingface/transformers` é usado só por Kokoro local; manter se Kokoro for o TTS default).

Risco de build nativo (Windows): `esbuild`, `onnxruntime-node`, `sharp` estão em `pnpm.onlyBuiltDependencies` do OpenReels — exigem build nativo. Kokoro/Whisper local também. Ver riscos.

## 8. Riscos

1. **Build nativo no Windows** — `onnxruntime-node`/`sharp` (usados por Kokoro/Whisper local) podem exigir Visual Studio Build Tools. Mitigação: documentar em `DEVELOPMENT.md`, oferecer TTS 100% remoto (OpenAI/ElevenLabs) como alternativa se o build nativo falhar.
2. **Divergência de schema** — se `VideoProject` estender `DirectorScore` demais, `score-to-props.ts` precisa reescrita quase total (achado da auditoria). Mitigação: manter `VideoProject.scenes[]` o mais próximo possível do shape de `Scene` original nos primeiros commits, estender só o nível raiz.
3. **FFmpeg externo** — obrigatório em PATH, falha silenciosa se ausente. Mitigação: `validate-env`-like check na inicialização do backend (já existe padrão em `src/cli/validate-env.ts` do OpenReels, reaproveitar).
4. **Pricing hardcoded no cost-estimator** (datado, achado da auditoria) — não é "reaproveitar e esquecer", precisa revisão periódica.
5. **Remoção do Mastra** — se no futuro o pipeline crescer (paralelismo real entre etapas, retry declarativo complexo), pode fazer sentido reintroduzir orquestração declarativa. Decisão reversível, documentar em ADR quando acontecer.
6. **Licenciamento** — ambos MIT, seguro reutilizar/adaptar; manter atribuição.
7. **HyperFrames não auditado** — ao entrar em pauta (pós-MVP), repetir processo de auditoria antes de desenhar `HyperFramesRenderer`.

## 9. Fases de implementação

Fase 0 — Auditoria comparativa. **Concluída** (este documento).
Fase 1 — Bootstrap do monorepo (`apps/web`, `apps/api`, `packages/*`), import dos providers/agents/captions reaproveitados do OpenReels como ponto de partida de `packages/providers` e `packages/video-engine`.
Fase 2 — `packages/domain`: `VideoProject`/`Scene`/`Asset`/`AudioTrack`/`Caption`, estendendo `DirectorScore`.
Fase 3 — OpenRouter como `LLMProvider` default (já existe no OpenReels, validar/ajustar).
Fase 4 — Script + Creative Director + Script QA (adaptar `research.ts`/`creative-director.ts`/`critic.ts`).
Fase 5 — TTS (Kokoro default + decorator de alinhamento).
Fase 6 — Assets (stock providers + resolver).
Fase 7 — Música (bundled default).
Fase 8 — Captions (motor + estilos reaproveitados, expor config do MPT).
Fase 9 — `VideoRenderer`/`RemotionRenderer` (envolver `score-to-props.ts`+composição).
Fase 10 — Job pipeline (state machine própria, sem BullMQ/Redis).
Fase 11 — WebUI (campos do MPT, fluxo próprio, React+Vite).
Fase 12 — Quality Control determinístico.
Fase 13 — Docker.
Fase 14 — Hardening (segurança, logging, docs, testes críticos).

(Task list já criada no tracker de tarefas da sessão, tasks #2–#15, mapeando 1:1 com as fases acima.)

## 10. Critérios de aceite

Os do spec §49 (fluxo completo: título → briefing → duração → idioma → voz → música → estilo → legendas → 16:9 → OpenRouter configurado → gerar → roteiro → storyboard → narração → assets → legendas → montagem → render Remotion → QA → preview → download) mais:

- Nenhum pacote em `packages/domain` importa `remotion`, `ffmpeg`, ou qualquer SDK de provider diretamente (verificável por lint de import/dependency-cruiser).
- `VideoRenderer` tem pelo menos 1 implementação (`RemotionRenderer`) passando por interface, sem código do domínio ciente de Remotion.
- Pipeline roda sem Redis/BullMQ instalado.
- Testes críticos do spec §43 passando (domain, providers, job state machine, script validation).
- `NOTICE` de atribuição MIT presente para código herdado de OpenReels.
