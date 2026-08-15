# Click.Play — Implementation Plan

Status: Fases 0–12 concluídas (auditoria, bootstrap, domain, LLM provider, Creative Director, TTS, produção visual, música, captions, VideoRenderer/RemotionRenderer, Job pipeline, WebUI MVP, QC determinístico). Próxima: Fase 13 (Docker).

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
| `musical-singalong` | fast | flip | karaoke_sweep | Alegre, saltitante, festivo, contagiante | rosa-chiclete, amarelo-sol, azul-céu, verde-grama, laranja-vivo | animação de recorte/fantoche (cutout), formas bouncy, movimento no ritmo da música |

`musical-singalong` usa `karaoke_sweep` (destaque palavra-por-palavra já existente no motor de legendas) — encaixe natural pra conteúdo cantado.

### TTS: múltiplos providers, default remoto grátis

Sem Tavily/web search no research (item confirmado — LLM usa conhecimento próprio, sem dependência/custo extra).

TTS: múltiplos providers selecionáveis na UI (dropdown provider+voz, como MoneyPrinterTurbo). Via `TTSProvider` (interface já reaproveitada do OpenReels): `openai.ts`, `elevenlabs.ts`, `kokoro.ts`, `gemini.ts`, `inworld.ts` — trocar é config, não código novo.

**Componente novo (não existe no OpenReels):** provider `edge-tts` — confirmado por auditoria do `app/services/voice.py` do MoneyPrinterTurbo que o "Azure TTS V1" da UI é na verdade edge-tts (vozes Microsoft Edge), **sem conta Azure, sem API key, grátis**. Cobertura confirmada em `azure_voices.json`: pt-BR (Antonio-M, Francisca-F, Thalita-F) + en-US (~21 vozes, M/F balanceado). **Este é o TTS default do Click.Play** (grátis, cobre pt-BR/en, sem risco de build nativo). Implementar em `packages/providers/src/tts/edge.ts` usando client Node de edge-tts, seguindo a mesma interface `TTSProvider`.

OpenAI TTS e ElevenLabs disponíveis como upgrade pago de qualidade. Kokoro (local) disponível mas não é default — evita depender de build nativo (`onnxruntime-node`/`sharp`) logo de cara.

### 0.2 Correção arquitetural: estratégia de produção visual (não é slideshow)

**Erro identificado nesta revisão**: a seção anterior ("Assets visuais: default por arquétipo") tratava a cena como "1 imagem ou 1 vídeo de banco, escolhido por um `AssetProvider`". Isso reproduz a filosofia do MoneyPrinterTurbo (`script → stock media → slideshow`), que o usuário usa **somente como referência de UX/config**, nunca como arquitetura visual. Corrigido abaixo.

**Regra de produto**: Click.Play gera vídeo — composição com movimento, não uma sequência de imagens/clipes estáticos narrados por cima. Uma imagem parada pode aparecer *dentro* de uma composição quando fizer sentido, mas nunca é o mecanismo padrão.

#### Terminologia (não confundir)

| Termo | O que é | O que NÃO é |
|---|---|---|
| **Asset** | Recurso bruto: imagem, vídeo, SVG, ícone, fonte, áudio, personagem — matéria-prima | Não é uma cena. Não é o vídeo final. |
| **Scene** | Composição: combinação de elementos (assets + texto animado + formas + partículas + narração + legenda) organizados no tempo | Não é "1 imagem com Ken Burns" |
| **Motion graphics** | Mecanismo de produção visual por **código/composição** (Remotion): texto cinético, formas, ícones, diagramas, personagens 2D/SVG, partículas, zoom/pan/parallax de câmera, morphing, transições | Não gera vídeo por IA |
| **AI video generation** | Mecanismo de produção visual por **modelo de IA** (Veo/Kling/Runway/Luma): prompt → clipe de vídeo gerado | Não é renderização/composição por código |
| **Renderer** | Motor que executa a composição final e produz o MP4 (Remotion hoje; HyperFrames é alternativa futura avaliável — ambos fazem motion graphics, nenhum gera vídeo por IA) | Não decide *o que* aparece na cena, só *como* compor/exportar |

Dois mecanismos de produção visual, ambos de primeira classe, combináveis na mesma cena (`visualStrategy: "motion_graphics" | "ai_video" | "hybrid"`):

**1. Motion graphics** — composição procedural: texto animado, títulos, legendas, formas, gráficos/diagramas, ícones, personagens 2D/SVG, máscaras, partículas, zoom/pan/parallax de câmera, kinetic typography, elementos entrando/saindo, morphing, transições, efeitos temporais. Renderer inicial: **Remotion** (já é a base técnica do OpenReels). HyperFrames avaliado como renderer alternativo futuro (auditado nesta sessão: motor de motion graphics HTML+headless Chrome+FFmpeg, Apache 2.0, maduro — mesma categoria do Remotion, **não gera vídeo por IA**, ver `docs/` histórico de auditoria).

**2. AI video generation** — clipe gerado por modelo text-to-video/image-to-video. **Achado da auditoria: já existe no OpenReels, reaproveitável direto** — `src/providers/video/gemini.ts` (Veo, `veo-3.1-lite-generate-preview`, via `GOOGLE_API_KEY`) e `src/providers/video/fal.ts` (Kling, `fal-ai/kling-video/v2.6/pro/image-to-video`, via `FAL_API_KEY`), ambos implementando a interface `VideoProvider` já definida em `src/schema/providers.ts`:
```ts
interface VideoProvider {
  readonly supportedDurations: number[];
  generate(opts: { sourceImage: Buffer; prompt: string; durationSeconds?: number; aspectRatio?: string; negativePrompt?: string }): Promise<VideoResult>;
}
```
Isso **é** o `VideoGenerationProvider` pedido — só precisa renomear/formalizar (`VideoProvider` → `VideoGenerationProvider`, manter shape) e adicionar Runway/Luma como providers futuros na mesma interface. Não é componente novo do zero como avaliado antes desta correção.

#### As duas abstrações (substituindo "AssetProvider" como abstração principal)

- **`VisualCompositionProvider`** — novo. Contrato entre o domínio (`packages/domain`) e o renderer de motion graphics: recebe a lista de elementos de uma cena (`VisualElement[]`) e produz a composição renderizável. `RemotionRenderer` é a implementação inicial (envolve `score-to-props.ts`+`OpenReelsVideo.tsx`, adaptado para múltiplos elementos por cena em vez de 1). `HyperFramesRenderer` fica documentado como implementação futura possível.
- **`VideoGenerationProvider`** — renomeação formalizada do `VideoProvider` já existente no OpenReels (`gemini.ts`/`fal.ts`), reaproveitado quase sem mudança. Providers: `gemini` (Veo), `fal` (Kling), futuro `runway`/`luma`.

Um `VisualElement` de tipo `ai_video` chama `VideoGenerationProvider.generate()` e o clipe resultante entra como camada na composição do `VisualCompositionProvider` — os dois trabalham juntos numa cena híbrida, nunca um substitui o outro.

#### Modelo de Scene: de "1 visual" para composição

Achado da auditoria: `src/schema/director-score.ts` hoje modela `Scene` como **um** `visual_type` (`ai_image|ai_video|stock_image|stock_video|text_card`) + **um** `motion` de câmera (zoom/pan) + 1 `visual_prompt`. É a peça que precisa mudar — não é "quase pronta", é o núcleo do erro conceitual identificado pelo usuário. Nova forma (Fase 2, estende em vez de reusar 1:1):

```ts
Scene {
  duration: number
  visualStrategy: "motion_graphics" | "ai_video" | "hybrid"
  elements: VisualElement[]   // 1+ elementos compostos na mesma cena
  scriptLine: string
  transition: TransitionType | null
}

VisualElement =
  | { type: "ai_image" | "stock_image" | "stock_video"; prompt or query, motion?: Motion }
  | { type: "ai_video_clip"; provider: "gemini" | "fal" | "auto"; prompt: string; sourceImage?: Asset }
  | { type: "animated_text"; text: string; style?: string }
  | { type: "svg" | "shape" | "icon"; asset: string }
  | { type: "particle_system"; preset: string }
  | { type: "diagram" | "map"; spec: unknown }
```

Exemplo (dos 3 casos que o Creative Director pode emitir por cena):
```json
{ "scene": 4, "duration": 12, "visualStrategy": "motion_graphics",
  "elements": [{ "type": "animated_text", "text": "1969" }, { "type": "svg", "asset": "rocket" }, { "type": "particle_system", "preset": "stars" }] }
```
```json
{ "scene": 5, "duration": 8, "visualStrategy": "ai_video",
  "videoGeneration": { "provider": "auto", "prompt": "Cinematic shot of a rocket launch, golden hour" } }
```
```json
{ "scene": 6, "duration": 10, "visualStrategy": "hybrid",
  "elements": [{ "type": "ai_video_clip", "provider": "gemini", "prompt": "..." }, { "type": "animated_text", "text": "Fase 1: Ignição" }, { "type": "diagram", "spec": "..." }] }
```
Narração (TTS), música e legenda continuam desacopladas da estratégia visual — se aplicam a toda `Scene`, não a um `VisualElement` específico.

#### Creative Director: decide *como* produzir, não só *o que* mostrar

`src/agents/creative-director.ts` (reaproveitado) precisa emitir `visualStrategy`+`elements` por cena, não `visual_type`+`visual_prompt` único. A lógica de escolha por arquétipo (§0.1) migra de "provider de imagem default" para "estratégia visual default": arquétipos infantil/educativo (`kids-cartoon`, `storybook-picturebook`, `edu-explainer`, `claymation-playful`, `musical-singalong`) tendem a `motion_graphics` (personagem/estilo consistente via composição, custo previsível) com `ai_video`/`hybrid` como opção manual; arquétipos realistas/documentário podem defaultar a `hybrid` (`ai_video` de fundo + texto/diagrama sobreposto) em vez de puro stock. Detalhamento fino de default por arquétipo fica para a Fase 4 (quando o agente for adaptado), não decidido aqui.

#### Storyboard

Precisa descrever produção, não só duração: `visualStrategy`, elementos, movimento de câmera, texto na tela, sincronismo com narração, transição — não mais "imagem X por 8s".

#### Regra explícita contra slideshow

Proibido tratar `imagem → imagem → imagem → imagem` (ou `stock_video → stock_video → ...`) como implementação padrão. Imagem estática é permitida como 1 elemento dentro de uma composição, nunca como a cena inteira por padrão.

### Música: bundled default, IA só se confirmado grátis

Regra do usuário: se existir opção de geração por IA realmente grátis, usar como default; senão, default = biblioteca bundled. Manter ambas sempre disponíveis como opção.

`lyria.ts` (OpenReels) usa `GOOGLE_API_KEY` no modelo `lyria-3-pro-preview` (Gemini API). **Pricing confirmado na Fase 7 (ago/2026): $0.08/música completa (30s = $0.04/clip) — não é grátis.** Decisão confirmada: `BundledMusic` é e continua sendo o `MusicProvider` default; `LyriaMusic` fica disponível só como upgrade pago manual, nunca promovido a default.

Gap encontrado na biblioteca bundled (25 faixas Pixabay, grátis, ver `packages/providers/assets/music-manifest.json`): cobre 8 moods (`chill_lofi, dark_cinematic, dreamy_ethereal, epic_cinematic, mysterious_ambient, tense_electronic, uplifting_pop, warm_acoustic`) — **nenhum é infantil/brincalhão**. `playful_kids` já existe no enum `MusicMood` do domínio, mas **ainda sem faixas próprias** — `selectTrack()` cai no fallback genérico (qualquer mood, `fallback: true`) pra esse caso.

**Decisão do usuário (Fase 7, revisão pós-conclusão):** em vez de curadoria fixa por mood, a WebUI (Fase 11) expõe a lista de faixas do manifest com **player de preview** na etapa de configuração do vídeo — usuário ouve e escolhe manualmente, `selectTrack()`/mood vira só o default sugerido, não obrigatório. Isso cobre o gap `playful_kids` sem precisar curar faixa "certa" agora (e vale pra qualquer mood, não só esse). Curadoria de faixas novas por mood fica opcional/futura, não bloqueia nenhuma fase.

### Legendas: 7 estilos disponíveis, default por arquétipo

Motor de captions do OpenReels tem 7 estilos (`BoldOutline`, `Clean`, `GradientRise`, `KaraokeSweep`, `ColorHighlight`, `BlockImpact`, `BoxHighlight`). Cada `ArchetypeConfig` já mapeia um `captionStyle` default (ex: `kids-cartoon`→bold_outline, `musical-singalong`→karaoke_sweep). UI: campo de legenda vem pré-selecionado com o default do arquétipo escolhido, mas o usuário pode trocar pra qualquer um dos 7 manualmente (dropdown, igual seleção de fonte/cor/posição do MoneyPrinterTurbo). Também expõe os campos de estilo herdados do MPT (fonte, cor, tamanho, contorno, fundo) por cima do preset do arquétipo.

**Decisão do usuário (Fase 8):** dropdown de estilo ganha um **preview visual pequeno** na tela de configuração — sem custo (render local via Remotion/Player, sem API/IA), mesma lógica do preview de áudio decidido pra música (§0.1 Música). Mecanismo exato (still renderizado por estilo vs `@remotion/player` ao vivo com frase de exemplo) fica pra decidir na Fase 11 quando a WebUI for implementada; motor de captions da Fase 8 já expõe os 7 estilos como componentes isolados (`packages/video-engine/src/captions/styles/*`), o que viabiliza qualquer uma das duas abordagens sem mudança no motor.

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
  /domain         VideoProject, Scene (composição, ver §0.2), VisualElement, Asset, AudioTrack, Caption — zero dependência de Remotion/FFmpeg/OpenRouter
  /video-engine   VideoRenderer + VisualCompositionProvider (interfaces) + RemotionRenderer (adaptado de score-to-props.ts + OpenReelsVideo.tsx, estendido p/ múltiplos elementos por cena)
  /providers      LLMProvider/TTSProvider/ImageProvider/StockProvider/VideoGenerationProvider (ex-VideoProvider)/MusicProvider/StorageProvider — interfaces + implementações (portadas do OpenReels + OpenRouter como default LLM)
```
`packages/shared` (Result/Logger) foi removido — nunca teve chamador real (achado do ponytail-audit, Fase 8→9).

Pipeline (ver §0.2 pra detalhe de Visual Plan):
```
Brief → Research → Script → Creative Director → Storyboard → Visual Plan
                                                                  │
                                            ┌─────────────────────┼─────────────────────┐
                                            │ motion_graphics      │ ai_video      │ hybrid │
                                            └─────────────────────┼─────────────────────┘
                                                                  ↓
                                                              Timeline
                                                                  ↓
                                                     TTS + Music + Captions
                                                                  ↓
                                                        VisualCompositionProvider
                                                          (RemotionRenderer)
                                                                  ↓
                                                                MP4
```

Monólito modular, sem microservices, sem Redis/BullMQ no MVP (diferença deliberada do modo servidor do OpenReels, que usa fila — ver §5 Riscos).

Persistência: SQLite + Drizzle no MVP, Postgres-ready (schema código, migração trocando driver). OpenReels hoje persiste em arquivos JSON (`score.json`/`log.json`) — passamos a usar essas mesmas estruturas como *shape* de dados, mas persistidas via Drizzle em vez de arquivo solto, para atender spec §31 (projects/jobs/scenes/assets/audio_tracks/captions/render_jobs/settings).

## 2. Matriz de reaproveitamento

| Capacidade | MoneyPrinterTurbo | OpenReels | Ação |
|---|---|---|---|
| Frontend | Streamlit, referência de UX só | SPA React própria, não auditada a fundo | **Criar** WebUI nova em `apps/web`, campos/fluxo copiados do MPT |
| Backend/API | FastAPI (Python, não portável) | Fastify + BullMQ+Redis (fila) | **Adaptar**: Fastify sim, fila não (MVP sem Redis) |
| Project model | `VideoParams` (Pydantic, referência de campos) | `DirectorScore` (Zod, TS) | **Adaptar**: `DirectorScore` vira base do `VideoProject`, estendido com campos de `VideoParams` que faltam (title, targetDuration, aspectRatio, resolution, fps, status, timestamps) **e** com `Scene`/`VisualElement` compostos (§0.2, substitui `visual_type` único) |
| Script/Research | `app/services/script.py` (referência) | `src/agents/research.ts` + `creative-director.ts` | **Reutilizar** agentes do OpenReels quase como estão |
| Creative Director/Storyboard | não existe equivalente | `src/agents/creative-director.ts`, `DirectorScore` | **Adaptar**: passa a emitir `visualStrategy`+`elements` por cena em vez de `visual_type`+`visual_prompt` único (§0.2) |
| Script QA/Critic | não existe equivalente | `src/agents/critic.ts` | **Reutilizar** |
| TTS | Edge TTS, Azure, ElevenLabs etc (lista de providers, referência) | `src/providers/tts/*` (kokoro local, elevenlabs, gemini, openai, inworld) + `aligned-tts-provider.ts` (decorator Whisper) | **Reutilizar** interfaces+implementações; Kokoro como default local (spec §15 prefere solução local/gratuita) |
| Assets (stock) | Pexels/Pixabay/Coverr (referência de providers) | `src/providers/stock/*` (Pexels/Pixabay + adaptive-resolver + stock-verifier) | **Reutilizar** como fonte de asset dentro de um `VisualElement`, nunca como "a cena" (§0.2) |
| Motion graphics (composição) | não tem | `OpenReelsVideo.tsx`/`score-to-props.ts` (hoje: 1 visual+motion de câmera por cena) | **Adaptar**: estender pra `VisualCompositionProvider` com múltiplos `VisualElement` por cena (texto/SVG/partículas/diagrama), não só Ken Burns em 1 imagem/vídeo (§0.2) |
| AI video generation | não tem | `src/providers/video/gemini.ts` (Veo), `src/providers/video/fal.ts` (Kling) — interface `VideoProvider` já existe em `src/schema/providers.ts` | **Reutilizar quase 1:1**, renomear conceito p/ `VideoGenerationProvider` (§0.2). Já é reaproveitável direto, não é componente novo do zero |
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
- `src/providers/stock/*`, `src/providers/image/*`, `src/providers/video/*` (`gemini.ts`=Veo, `fal.ts`=Kling — base do `VideoGenerationProvider`, ver §0.2), `src/providers/music/bundled*.ts`
- `src/agents/research.ts`, `creative-director.ts`, `critic.ts`, `image-prompter.ts`, `music-prompter.ts`
- `src/remotion/captions/*`, `caption-utils.ts`, `src/remotion/beats/*`
- `src/cli/cost-estimator.ts`
- `src/config/archetype-registry.ts` + JSONs de arquétipo (vira base do campo "estilo visual" do spec §7/§40)
- `src/pipeline/utils.ts` (`PipelineCallbacks`/`PipelineOptions` — contrato de observabilidade de pipeline)

Atribuição MIT (copyright OpenReels/Talha Jubair Siam) mantida em `NOTICE`/cabeçalho dos arquivos portados.

## 4. Componentes adaptados (reescrita parcial)

- `src/pipeline/orchestrator.ts` → extrair lógica de negócio, **remover dependência do Mastra** (`@mastra/core`). Motivo: MVP não precisa de motor de workflow declarativo; spec pede monólito simples, evitar abstração sem necessidade real (spec §3/§52). Vira uma sequência de funções assíncronas chamadas pelo Job pipeline.
- `src/schema/director-score.ts` (`DirectorScore`/`Scene`) → base do `VideoProject`/`Scene` do domínio, estendido com: `id, title, description, language, targetDuration, aspectRatio, resolution, fps, status, createdAt, updatedAt, opening, narration, music, captions` (campos do spec §6 que faltam no DirectorScore) **e** `Scene.visual_type` único substituído por `visualStrategy`+`elements: VisualElement[]` (§0.2 — mudança estrutural, não só extensão aditiva).
- `src/providers/video/gemini.ts`/`fal.ts` (interface `VideoProvider`) → renomear conceitualmente para `VideoGenerationProvider`, mantendo o shape (`generate({sourceImage, prompt, durationSeconds, aspectRatio, negativePrompt}) → VideoResult`). Reaproveitamento quase 1:1.
- `src/remotion/lib/score-to-props.ts` + `OpenReelsVideo.tsx` → viram a implementação interna de `RemotionRenderer` atrás de duas interfaces: `VideoRenderer` (export final) e `VisualCompositionProvider` (composição por cena). Precisa ser estendido pra renderizar N `VisualElement` por cena (texto animado, SVG, partículas, diagrama) em vez de 1 visual+Ken Burns. Domínio (`packages/domain`) nunca importa nada de `remotion`.
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
- `Scene`/`VisualElement` compostos (§0.2) — substitui o `visual_type` único do OpenReels; nenhum dos dois repos modela cena como composição multi-elemento
- `VisualCompositionProvider` interface (§0.2) — contrato entre domínio e renderer de motion graphics; OpenReels renderiza direto via `score-to-props.ts`, sem essa camada
- `VideoRenderer` interface (spec §1/§21) — OpenReels não tem essa abstração, é 1:1 com Remotion
- `StorageProvider`/`LocalStorageProvider` (spec §30) — OpenReels usa paths ad-hoc por job dir, sem interface
- Templates de abertura (spec §19) — não existe em nenhum dos dois
- `PublishingProvider` (stub, spec §37)
- `ThumbnailProvider` (spec §39)
- Camada de persistência Drizzle/SQLite (spec §31) — ambos usam arquivo/Pydantic sem DB relacional
- Job state machine com os estados exatos do spec §23 (QUEUED→...→COMPLETED/FAILED/CANCELLED) — Task Manager do MPT e worker do OpenReels têm noções parecidas mas não esse enum exato
- Quality Control determinístico pós-render (spec §27) — nenhum dos dois valida o MP4 final de forma estruturada
- WebUI React própria (`apps/web`) — campos vêm do MPT, componentes são novos
- `packages/providers/src/tts/edge.ts` — provider edge-tts grátis (pt-BR+en, M/F), não existe no OpenReels, é o TTS default do Click.Play
- 5 arquétipos novos infantil/educativo/divertido (`kids-cartoon`, `storybook-picturebook`, `edu-explainer`, `claymation-playful`, `musical-singalong`) — ver §0.1

## 7. Dependências

Manter (via OpenReels): `fastify`, `@fastify/cors`, `@fastify/static`, `remotion` + `@remotion/*` (bundler/cli/player/renderer/transitions/google-fonts), `ai` (Vercel AI SDK) + `@ai-sdk/openai-compatible` + `@openrouter/ai-sdk-provider`, `zod`, `kokoro-js`, `wavefile`, `commander` (só CLI, se mantivermos), `p-limit`.

Adicionar: `drizzle-orm` + `drizzle-kit` + `better-sqlite3` (dev) / `pg` (prod-ready), `vite`, `react`/`react-dom` (frontend, versão já usada pelo OpenReels — 19.x), `vitest` (já usado), client Node de edge-tts (ex: `@andresaya/edge-tts` ou `msedge-tts` — validar qual mantém `WordBoundary` para timestamps, na Fase 5).

Remover: `@mastra/core`, `bullmq`, `ioredis`, `@tavily/ai-sdk` (confirmado — sem web search no research). Avaliar remoção: `@fal-ai/client`, `@huggingface/transformers` (peso — `@huggingface/transformers` é usado só por Kokoro local; Kokoro não é mais o TTS default, avaliar se mantém como opção ou remove).

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
Fase 2 — `packages/domain`: `VideoProject`/`Scene` (composição, §0.2)/`VisualElement`/`Asset`/`AudioTrack`/`Caption`, estendendo `DirectorScore` com o novo modelo de cena (não é extensão aditiva simples — `visual_type` único é substituído).
Fase 3 — OpenRouter como `LLMProvider` default (já existe no OpenReels, validar/ajustar).
Fase 4 — Script + Creative Director + Script QA (adaptar `research.ts`/`creative-director.ts`/`critic.ts` pra emitir `visualStrategy`+`elements`, §0.2).
Fase 5 — TTS (edge-tts default grátis, §0.1 + decorator de alinhamento Whisper para providers sem timestamp nativo).
Fase 6 — Produção visual: `VisualCompositionProvider` (motion graphics, elementos compostos por cena) + `VideoGenerationProvider` (Veo/Kling, renomeado do `VideoProvider` existente) + stock/imagem como fonte de `VisualElement`, não como cena inteira (§0.2).
Fase 7 — Música (bundled default). **Concluída.** `packages/providers/src/music/{types,bundled,bundled-adapter,lyria}.ts` portados do OpenReels; 25 faixas + manifest copiados para `packages/providers/assets/`; resolução de path trocada de `process.cwd()` pra `import.meta.url` (robusto em monorepo, `process.cwd()` do OpenReels assumia app único). Pricing do Lyria confirmado pago — bundled segue default. Gap `playful_kids` sem faixas documentado acima, pendente de curadoria de conteúdo.
Fase 8 — Captions. **Concluída.** Motor portado de OpenReels/MIT pra `packages/video-engine/src/captions/`: `caption-utils.ts` (lógica pura de chunking/timing, 29 testes) + `CaptionWrapper.tsx` (timing/spring via Remotion) + 7 estilos (`styles/BoldOutline.tsx` etc) + `CAPTION_STYLE_COMPONENTS` (registry `CaptionStyleKey`→componente) + `fonts.ts` (Google Fonts via `@remotion/google-fonts`). Decisão do usuário: motor completo agora (não só a lógica pura), o que antecipou `remotion`/`react`/`react-dom`/`@remotion/google-fonts` como dependência do `video-engine` (originalmente previsto só na Fase 9). `NOTICE` criado na raiz (atribuição MIT, cobre todo código portado até aqui). Decisão adicional: dropdown de estilo na WebUI ganha preview visual pequeno (sem custo, render local) — mecanismo exato fica pra Fase 11, motor já suporta via componentes isolados.
Fase 9 — `VideoRenderer`/`RemotionRenderer`. **Concluída.** `packages/video-engine/src/render/`: `types.ts` (`ResolvedElement`/`ResolvedScene`/`RenderInput` — Scene com assets já resolvidos, não prompt), `project-to-props.ts` (mapeamento + cálculo de duração total com overlap de transição, testado), `elements/` (`ImageElement`/`VideoElement`/`TextElement`/`UnsupportedElement` + registry `ELEMENT_COMPONENTS`), `SceneLayer.tsx` (empilha `elements[]` por z-order — decisão do usuário: camadas simultâneas, não sub-timeline sequencial), `ClickPlayVideo.tsx` (composição raiz: `TransitionSeries` + `CaptionWrapper` no nível absoluto + áudio), `video-renderer.ts` (`VideoRenderer` interface + `RemotionRenderer` via `@remotion/bundler`+`@remotion/renderer`). Decisões do usuário: (1) Fase 9 só renderiza assets já resolvidos — resolver `prompt`→arquivo via `ImageProvider`/`VideoGenerationProvider` fica pra Fase 10; (2) escopo MVP cobre `ai_image/stock_image/stock_video/ai_video_clip/animated_text` — `svg/shape/icon/particle_system/diagram/map` renderizam como placeholder visível (`UnsupportedElement`), sem crashar o render.
Fase 10 — Job pipeline (state machine própria, sem BullMQ/Redis). **Concluída**, dividida em sub-entregas (decisão do usuário: escopo pequeno, testada, commitada separadamente, app sempre executável, sem Mastra):

- **10A — Cost Estimator.** **Concluída.** Adaptação (não port 1:1) de `cost-estimator.ts` do OpenReels: `packages/providers/src/cost/`. Diferenças forçadas pela nossa stack: (1) pricing de LLM por **modelo** (`Record<string, {perInputToken, perOutputToken}>`), não por bucket largo `anthropic|openai|gemini` — OpenRouter proxya modelos variados, bucket largo não serve; (2) conta assets por `Scene.elements[].type` (nosso domínio), não por `Scene.visual_type` único (schema antigo). Contrato: `CostAmount = {status:"known", usd:number} | {status:"unknown", reason?:string}` — nunca assume custo zero pra provider/modelo sem preço listado. `CostBreakdown = {llm, tts, image, video, music, total}` (cada campo um `CostAmount`; `total` vira `unknown` se qualquer componente for `unknown`). `estimateCost(scenes, opts)` pra pré-run e `computeActualCost(usages, counts, opts)` pra pós-run, mesmo shape, permite comparar estimado vs realizado. Desacoplado de providers/renderer — recebe só chaves de provider/modelo (string), não instâncias.
- **10B — Resolução de asset.** **Concluída.** `packages/providers/src/visual/resolve-element.ts`: `resolveElement(element: VisualElement, ctx) → ResolvedElement` fecha o contrato que a Fase 9 deixou em aberto (`ResolvedElement` com mesmo shape do `video-engine`, mantido em sync manualmente — sem dependência de pacote entre `providers`/`video-engine`). Cobre os 5 tipos MVP: `ai_image` (via `ImageProvider`), `ai_video_clip` (gera imagem-fonte + chama `VideoGenerationProvider`, resolve `"auto"` via `resolveVideoGenerationProvider` já existente), `animated_text` (passthrough), `stock_image`/`stock_video` (via `StockProvider`, novo). Tipos fora do MVP (`svg/shape/icon/particle_system/diagram/map`) passam adiante sem asset — o renderer (Fase 9) já sabe desenhar placeholder. Achado da investigação: `StockProvider` (Pexels/Pixabay) nunca tinha sido portado em nenhuma fase anterior apesar de listado na matriz do plano — decisão do usuário: portar agora como camada isolada (`packages/providers/src/stock/{types,pexels,pixabay}.ts`), sem fallback automático pra AI (mudaria a estratégia visual decidida pelo Creative Director e reintroduziria risco de slideshow); tenta os providers em ordem (retry pro próximo se um falhar/vier vazio), erro estruturado (`StockResolutionError` com tentativas por provider) se todos falharem. 11 testes.
- **10C — Orquestração de estágios.** **Concluída.** `packages/providers/src/pipeline/{types,scene-timing,orchestrator}.ts`: `runPipeline(options, callbacks)` roda Research→Creative Director (com loop de revisão via Critic, `MAX_REVISION_ROUNDS=2`, score<7 dispara `reviseDirectorScore`)→gate de custo (10A)→TTS→Visuais (10B `resolveElement`)→Render (Fase 9 `RemotionRenderer`), como sequência de funções assíncronas — sem `@mastra/core`. `PipelineCallbacks` (`onStageStart/Complete/Error`, `onCostEstimate: (estimate) => Promise<boolean>`, `onRevision`, `onLog`, `onProgress`, `isCancelled`) segue o padrão do OpenReels adaptado aos nossos tipos; o orchestrator não decide política de aprovação de custo, quem chama decide. `PipelineOptions.runDir` é fornecido pelo caller (`runDir/assets`, `runDir/audio`, `runDir/output`) — sem hardcode de storage, sem depender de Drizzle/apps-api/`JobStateMachine` (isso é 10D). `scene-timing.ts` (`splitWordsIntoScenes`) divide os `WordTimestamp[]` do TTS entre cenas proporcional à contagem de palavras do `scriptLine`, com fallback proporcional se a fatia de palavras se esgotar antes (mesmo problema descrito em OpenReels `pipeline/utils.ts`). `PipelineResult` é uma união discriminada (`completed | cancelled_cost | cancelled | failed`), preservando histórico de revisão (`round`, score, crítica) e custo estimado vs realizado (`compareCost`, 10A). `providers` passou a depender de `video-engine` (`VideoRenderer`/`RenderInput`) — só o pipeline usa esse import, sem ciclo (`video-engine` não depende de `providers`). 5 testes cobrindo: happy path sem revisão, loop de revisão até score>=7, parada em `MAX_REVISION_ROUNDS` seguindo com o melhor score disponível, `cancelled_cost` quando `onCostEstimate` rejeita (sem chamar TTS/render), `failed` com stage correto quando um estágio lança erro.
- **10D — Persistência + state machine.** **Concluída.** `packages/providers/src/persistence/`: `schema.ts` (Drizzle, só `projects`+`jobs` — decisão do usuário: escopo mínimo, `scenes/assets/audio_tracks/captions/render_jobs/settings` do spec §31 ficam deferred até existir consumidor real), `client.ts` (`createDb(sqliteFilePath)`, DDL direto no boot em vez de migrations — schema pequeno demais pra justificar drizzle-kit agora). Driver: `node:sqlite` (nativo do Node 22.5+, zero compilação) via adapter genérico `drizzle-orm/sqlite-proxy`, não `better-sqlite3` — `better-sqlite3` exige Visual Studio C++ Build Tools, indisponível neste ambiente Windows, e `drizzle-orm/node-sqlite` só existe em pre-release `1.0.0-beta`. `job-state-machine.ts` (`assertTransition`, spec §23: QUEUED→RESEARCHING→PLANNING→REVIEWING→GENERATING→RENDERING→COMPLETED linear, FAILED/CANCELLED alcançáveis de qualquer estado não-terminal; `PROGRESS_BY_STATUS` deriva progresso do status). `repository.ts` (CRUD project/job). `job-runner.ts`: `startJob(db, jobId, deps, opts)` fecha o ciclo completo — busca job+project persistidos, roda `runPipeline` (10C) com `PipelineCallbacks` que avançam a state machine e persistem progresso/custo estimado/custo realizado/erro a cada estágio, roda em background (fire-and-forget in-process, sem bloquear quem chama, sem BullMQ/Redis — decisão do usuário). `approveCost` é injetável (default: auto-aprova, sem UI ainda) — mesmo padrão "quem chama decide" do 10C. `PipelineCallbacks` (10C) passou a aceitar retorno `Promise<void>` em `onStageStart/Complete/Error/onRevision` (mudança pequena e necessária no `orchestrator.ts` — agora `await`ados — pra persistência não correr risco de gravar fora de ordem). `runJobOnce` exportado separado do `startJob` fire-and-forget, pra testes aguardarem o ciclo determinístico. 15 testes novos: 7 de transição de estado, 5 de repository (CRUD + progresso preservado em FAILED), 3 de `runJobOnce` (ciclo completo COMPLETED, CANCELLED por custo rejeitado, FAILED com estágio+erro persistidos).
Fase 11 — WebUI (React+Vite+Tailwind v4). **Concluída (escopo MVP)**, decisão do usuário: provar o fluxo end-to-end completo (form→job→progresso→player) antes de preview de música/legenda (adiados, ver abaixo).
- `packages/providers/src/persistence/`: novo estado `AWAITING_COST_APPROVAL` entre `REVIEWING` e `GENERATING` (schema/job-state-machine/job-runner) — `job-runner.ts` transita pra esse estado e só então chama `approveCost`, permitindo que a decisão chegue depois, fora do ciclo síncrono do pipeline. `cost-approval-gate.ts` (novo): ponte em memória (`Map<jobId, resolver>`) entre esse `await` e um `POST` HTTP que chega minutos depois — por processo, mesmo modelo fire-and-forget in-process do 10D, sem fila externa. `music/bundled.ts` ganhou `listTracks()` (export do manifest já carregado internamente) pra servir `GET /music`.
- `apps/api`: primeiro consumidor real de `JobRunnerDeps` — `src/providers.ts` monta os providers a partir de env vars (`OPENROUTER_API_KEY`, `GOOGLE_API_KEY`, `FAL_API_KEY`, `PEXELS_API_KEY`, `PIXABAY_API_KEY`); vídeo IA (gemini/fal) e stock (pexels/pixabay) só entram em `resolveElementCtx` se a respectiva chave existir, mas `ImageProvider` (Gemini) é obrigatório pro MVP — sem chave, `buildImageProvider()` adia o erro do construtor pro primeiro uso real (não derruba o boot do servidor pra todo mundo por falta de 1 chave). `src/remotion/entry.tsx` (novo, `registerRoot(ClickPlayVideoRoot)`) — a Fase 9 previa que "o app que instancia `RemotionRenderer`" criaria esse entry point; `apps/api` é o primeiro a fazer isso. Achado: `@remotion/google-fonts`/`@remotion/transitions` do `video-engine` estavam pinados exatos em `4.0.441` enquanto `remotion`/`@remotion/bundler`/`@remotion/renderer` (caret) resolviam pra `4.0.509` — Remotion recusa bundlar com versões divergentes (`Multiple versions of Remotion detected`); corrigido pinando todo o grupo Remotion em `4.0.441` exato (`packages/video-engine/package.json` + `apps/api/package.json`), erro só apareceu agora porque Fase 11 é o primeiro caller real do bundler. Rotas: `POST /jobs`, `GET /jobs/:id`, `POST /jobs/:id/approve-cost` (idempotente — no-op se o job não está em `AWAITING_COST_APPROVAL`), `GET /music`, `GET /config` (arquétipos/pacing/estilos de legenda pra dropdown — providers não entra no bundle do browser, por isso é endpoint e não import direto). `buildServer(opts)` recebe deps injetáveis (db/providers/gate) pra teste; `/files/*` serve o `runsDir` estático (output final). Verificado rodando de verdade (`pnpm dev`, sem chaves configuradas): server sobe, `/config`/`/music` respondem, `POST /jobs` cria e falha graciosamente em `research` com erro persistido (`Missing Authentication header`) sem derrubar o processo.
- `apps/web`: sem lib de UI pesada (decisão do usuário) — Tailwind v4 (`@tailwindcss/vite`) + componentes próprios (`CreateForm`/`ProgressView`/`ResultPlayer`). Campos do form limitados ao que o domínio já suporta de verdade: `topic`, `direction` (briefing livre), `archetype`, `pacing`, `videoEnabled`, `captionStyle` — decisão do usuário, investigação mostrou que público-alvo/idioma/narração(voz)/música(escolha manual) não têm nenhum suporte no domínio hoje; ficaram fora em vez de virar campo decorativo sem efeito real, ver §0.1 (adiado pra quando houver suporte real). Polling a cada 2s em `GET /jobs/:id` (decisão do usuário: não acoplar o domínio a polling — a API já expõe status/progresso como recurso simples, trocar por SSE/WebSocket depois não muda `Pipeline`/`JobStateMachine`). Build de produção verificado (`vite build`); verificação visual em navegador real não foi possível neste ambiente (sem ferramenta de browser disponível) — front-end validado via build limpo + contrato de API confirmado ponta a ponta com o backend real rodando.
- Adiado pra depois (fora do MVP): seletor de música com preview de áudio, dropdown de legenda com preview visual por estilo, campos público-alvo/idioma/narração/música manual (nenhum tem suporte de domínio ainda).
Fase 12 — Quality Control determinístico. **Concluída.** `packages/providers/src/qc/`: 7 checks (3 block: output_exists, duration_match, resolution_match; 4 warning: tts_coverage, critic_score, cost_deviation, blackdetect) + `media-tools/` (ffprobe-static, ffmpeg blackdetect), agregados em `runQc()`. `qcReport` persistido em `jobs.qc_report` (JSON), contrato: PASS/WARNING→Job COMPLETED, BLOCK→Job FAILED (output preservado pra diagnóstico). Slideshow check descartado — já coberto por `DirectorScore.refine()` no Creative Director (redundante). Workspace inteiro verde (`pnpm -r typecheck && pnpm -r test`).
Fase 13 — Docker.
Fase 14 — Hardening (segurança, logging, docs, testes críticos).
Fase 15+ — evolução Studio → SaaS, ver §11 (Roadmap de produto).

(Task list já criada no tracker de tarefas da sessão, tasks #2–#15, mapeando 1:1 com as fases acima.)

## 10. Critérios de aceite

Os do spec §49 (fluxo completo: título → briefing → duração → idioma → voz → música → estilo → legendas → 16:9 → OpenRouter configurado → gerar → roteiro → storyboard → narração → assets → legendas → montagem → render Remotion → QA → preview → download) mais:

- Nenhum pacote em `packages/domain` importa `remotion`, `ffmpeg`, ou qualquer SDK de provider diretamente (verificável por lint de import/dependency-cruiser).
- `VideoRenderer` tem pelo menos 1 implementação (`RemotionRenderer`) passando por interface, sem código do domínio ciente de Remotion.
- Pipeline roda sem Redis/BullMQ instalado.
- Testes críticos do spec §43 passando (domain, providers, job state machine, script validation).
- `NOTICE` de atribuição MIT presente para código herdado de OpenReels.

## 11. Roadmap de produto — Studio → SaaS

Visão de longo prazo (pós-MVP, não é Fase 12-14): evoluir o Click.Play de "AI Video Generator" (produção 1:1, wizard→job→vídeo, sem memória entre execuções) pra "Mini Video Studio + Content Factory", com potencial de virar SaaS. Este roadmap **não é implementado agora** — só projeta a arquitetura pra que estas fases não exijam reconstruir o núcleo (`runPipeline`, `job-state-machine`, `RemotionRenderer`, providers).

Cadeia de evolução: **Studio → Projeto → Template → Variáveis → Scheduler → AI Content Factory → QC → Publication → SaaS.**

### Separação MVP / Evolução Studio / SaaS

- **MVP** (Fases 0-14, concluídas até 11 + 12/13/14 em andamento): geração 1:1, sem persistir "identidade de produção" reutilizável. Não muda.
- **Evolução Studio** (Fases 15-21 abaixo): Projeto como contêiner, Template, Variáveis, Scheduler, Content Factory, Publication real.
- **SaaS** (Fase 22, não detalhada em profundidade — fora de escopo próximo): multi-tenant, auth, billing. Depende de todas as fases acima estarem estáveis.

### Fases propostas (15+)

- **Fase 15 — Studio UX.** Wizard visual robusto (10-20min), telas: Briefing → Roteiro → Visual → Música/Som → Narração → Legendas → Efeitos/Transições → Abertura/Fechamento → Providers/Configuração → Revisão/Custo → Geração → QC → Publicação. Não é editor tipo Premiere/DaVinci, não é "prompt→gerar" puro. Depende só da Fase 11 (WebUI MVP) já existente; fazer depois de Projeto/Template (16-17) estarem no schema, pra já desenhar a tela "salvar como template" sabendo que a entidade existe.
- **Fase 16 — Projeto (entidade contêiner).** Nova tabela topo `content_projects` (nome novo — a tabela `projects` atual representa uma *config de produção* 1:1, não um contêiner; ver decisão #1 abaixo). Contém produções, templates, agendamentos, metadados de publicação de um mesmo "canal"/série (ex.: "Histórias do Joãozinho"). WebUI ganha navegação Projeto → Produções/Templates/Agendamentos.
- **Fase 17 — Template.** Nova tabela `templates`: `id, contentProjectId, name, version, config (json), sourceProductionId, createdAt, updatedAt`. `config` é o mesmo shape json já persistido em `projects.config`/`PipelineOptions` (Fase 10D) — decisão da Fase 10 de manter esse objeto serializável e livre de instância de provider paga dividendo aqui sem mudança nenhuma. "Salvar como template" na WebUI só copia esse `config` de uma produção concluída. Template preserva as decisões de produção listadas pelo usuário (briefing, arquétipo, estilo visual, música, narração/voz, legendas, transições, providers/modelos, regras de QC etc) porque todas já vivem dentro de `PipelineOptions`/`ProjectConfig` hoje — não precisa de campo novo por decisão, só o container.
- **Fase 18 — Variáveis de template.** `templates.variableSchema` (json: lista de `{key, label, kind: "literal" | "generative"}`). Resolução acontece **antes** de chamar `runPipeline`, numa função pura `resolveTemplate(template, bindings) → PipelineOptions`: interpolação de string (`{{PERSONAGEM_PRINCIPAL}}` etc) em `topic`/`direction` para `kind: "literal"`; para `kind: "generative"`, um passo de LLM expande a instrução numa `topic`/`direction` concreta antes do pipeline rodar. Ver decisão #2.
- **Fase 19 — Scheduler.** Nova tabela `schedules`: `id, templateId, cron, variableBindings (json), enabled, nextRunAt, lastRunAt`. Runner (cron in-process — biblioteca a avaliar na hora, sem decidir dependência agora) dispara, resolve o template (18) → cria `production`+`job` novos → chama `startJob` (10D) sem nenhuma mudança no job-runner. Depende de 17+18.
- **Fase 20 — AI Content Factory.** Sem tabela nova — é Scheduler (19) + variáveis `generative` (18) rodando sem intervenção humana, em lote. "Ligar o automático": decisão de produto sobre rate limit/custo de geração automática entra aqui, não antes.
- **Fase 12 (já em andamento, sem mudança de escopo) — QC determinístico.** Seu `qcReport` é o sinal que Content Factory (20) e Publication (21) vão consumir pra auto-aprovar/descartar. Ver decisão #4.
- **Fase 21 — Publication.** `PublishingProvider` já é interface prevista desde a Fase 0 (§6, stub não implementado). Fase 21 implementa de verdade (YouTube primeiro), com `qcReport.decision === "PASS"` como gate de auto-publicação. Nova tabela `publications`: `id, jobId, platform, status, externalUrl, publishedAt, error`.
- **Fase 22 — SaaS.** Multi-tenant (auth, billing, orgs). Ver decisão #3 — nenhuma tabela ganha `ownerId` antes desta fase.

### Dependências entre fases

`16 (Projeto)` → `17 (Template)` → `18 (Variáveis)` → `19 (Scheduler)` → `20 (Content Factory)`. `12 (QC)` é independente, mas seu shape de saída é consumido por `20` e `21`. `21 (Publication)` depende de `12` (gate de qualidade) e da interface `PublishingProvider` já existente. `15 (Studio UX)` só depende da Fase 11, pode ser feita em paralelo, mas ganha mais sentido depois de `16-17` existirem. `22 (SaaS)` depende de tudo acima.

### Decisões a tomar agora (evitar refatoração futura)

1. **Renomear tabela `projects` → `productions`** antes de introduzir `content_projects` (Fase 16) — colisão de nome com o novo conceito de "Projeto" do roadmap. Só o nome muda; shape e `jobs.projectId`→`jobs.productionId` seguem iguais.
2. **Resolução de template/variável fica fora do `runPipeline`/`orchestrator.ts`** — função pura pré-pipeline, mesmo padrão "quem chama decide" já usado pra aprovação de custo (10C/10D). Não tocar o orchestrator quando as Fases 17-18 chegarem.
3. **Todo schema novo (`content_projects`, `templates`, `schedules`, `publications`) usa PK `text` (uuid), nunca autoincrement** — mesmo padrão de `jobs`/`projects` hoje. Torna a futura migração multi-tenant (Fase 22, adicionar `ownerId`+índice) aditiva, não destrutiva.
4. **`qcReport` (Fase 12) deve ter campo topo `decision: "PASS" | "WARNING" | "BLOCK"`** — contrato consumido por Content Factory (20) e Publication (21). Decidir isso já na implementação da Fase 12 evita retrabalho depois.
5. **`PublishingProvider` continua interface-only até a Fase 21** — não implementar YouTube real antes da hora, só manter a interface (já prevista desde a Fase 0) estável.
6. **Scheduler reaproveita `startJob`/`job-runner.ts` sem mudança** — cria `production`+`job` novos e delega; não construir um segundo pipeline paralelo pra execução agendada.

### O que não muda / não é reimplementado

`runPipeline`, `job-state-machine.ts`, `RemotionRenderer`, providers existentes (LLM/TTS/Image/Video/Stock/Music) — núcleo intocado por este roadmap. Fases 0-11 concluídas permanecem como estão; Fases 12-14 seguem o plano já aprovado, sem interferência deste roadmap.
