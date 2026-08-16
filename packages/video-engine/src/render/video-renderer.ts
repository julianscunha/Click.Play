import * as fs from "node:fs";
import * as path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { CLICKPLAY_COMPOSITION_ID } from "./ClickPlayVideo";
import { getTotalDurationInFrames, mapRenderInputToProps } from "./project-to-props";
import type { RenderInput } from "./types";

/**
 * Contrato de export final: recebe um VideoProject com assets já resolvidos
 * (Fase 10 resolve prompt → arquivo) e produz o MP4. `RemotionRenderer` é a
 * implementação inicial (docs/IMPLEMENTATION-PLAN.md §0.2/§1).
 */
export interface VideoRenderer {
  readonly id: string;
  render(input: RenderInput, outputPath: string): Promise<{ outputPath: string; durationInFrames: number }>;
}

export interface RemotionRendererOptions {
  /** Entry point do bundle Remotion. Default: este módulo registra ClickPlayVideo via entry.tsx do app que o instancia. */
  entryPoint: string;
}

export class RemotionRenderer implements VideoRenderer {
  readonly id = "remotion";

  constructor(private readonly options: RemotionRendererOptions) {}

  async render(
    input: RenderInput,
    outputPath: string,
  ): Promise<{ outputPath: string; durationInFrames: number }> {
    // runDir = pai de "output/" (contrato do orchestrator.ts: outputPath = runDir/output/output.mp4).
    const runDir = path.dirname(path.dirname(outputPath));
    const publicDir = path.join(runDir, "_remotion_public");
    const publicInput = preparePublicAssets(input, runDir, publicDir);

    const props = mapRenderInputToProps(publicInput);
    const durationInFrames = getTotalDurationInFrames(props, input.fps);

    const bundleLocation = await bundle({
      entryPoint: this.options.entryPoint,
      publicDir,
      // Monorepo usa imports ESM estilo Node16 (".js" apontando pra ".ts") —
      // webpack não resolve isso por padrão, só tsc/tsx. Sem isso, bundle
      // quebra em qualquer import cross-arquivo dentro de video-engine/providers.
      webpackOverride: (config) => {
        const alias = { ...config.resolve?.alias } as Record<string, string | false>;
        // Alias sem sufixo "$" faz prefix-match — "@remotion/studio" (default
        // do Remotion) também batia "@remotion/studio/renderEntry" e resolvia
        // errado ("dist/index.js/renderEntry", tratando o arquivo como pasta).
        if (alias["@remotion/studio"]) {
          alias["@remotion/studio$"] = alias["@remotion/studio"];
          delete alias["@remotion/studio"];
        }
        // @rspack/core (dependência transitiva nunca usada — não passamos
        // opts.rspack pro bundle()) acaba entrando no grafo do webpack e
        // arrasta um binário nativo + módulos core do Node (url/path/process...)
        // que não fazem sentido pro bundle alvo do browser. Corta na raiz.
        alias["@rspack/core$"] = false;
        return {
          ...config,
          resolve: {
            ...config.resolve,
            alias,
            extensionAlias: { ".js": [".js", ".ts", ".tsx"] },
            // css-loader interno do @remotion/bundler importa os módulos core
            // 'url'/'path' do Node — webpack 5 não polyfilla mais por padrão.
            // Não usamos CSS na composição (só TSX/TS puro), stub vazio é seguro.
            fallback: { ...config.resolve?.fallback, url: false, path: false },
          },
          module: {
            ...config.module,
            rules: [
              ...(config.module?.rules ?? []),
              // @rspack/binding-*.node acaba resolvido no grafo do webpack (dependência
              // transitiva de alguma engrenagem do @remotion/bundler, nunca de fato usada
              // na composição) — sem "type: asset/resource", webpack tenta parsear o
              // binário nativo como JS e quebra o bundle inteiro.
              { test: /\.node$/, type: "asset/resource" },
            ],
          },
        };
      },
    });

    // inputProps do Remotion exige Record<string,unknown> — mesmo cast do OpenReelsVideo.tsx.
    const inputProps = props as unknown as Record<string, unknown>;

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: CLICKPLAY_COMPOSITION_ID,
      inputProps,
    });

    await renderMedia({
      composition: {
        ...composition,
        durationInFrames,
        fps: input.fps,
        width: input.width,
        height: input.height,
      },
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outputPath,
      inputProps,
    });

    return { outputPath, durationInFrames };
  }
}

/**
 * Remotion só serve arquivos estáticos de dentro de um `publicDir` via
 * `staticFile()` (path.join(assetsDir) do runDir não é servido) — sem isso o
 * `<Audio>`/`<Img>`/`<OffthreadVideo>` do headless Chrome falham ao carregar
 * (mesmo padrão do OpenReels, src/pipeline/orchestrator.ts, symlink + bundle
 * publicDir). Symlinka a pasta assets/ inteira (evita copiar N arquivos) e
 * copia voiceover/música (arquivos avulsos fora de assets/), reescrevendo os
 * paths absolutos de `input` pra relativos ao publicDir.
 */
function preparePublicAssets(input: RenderInput, runDir: string, publicDir: string): RenderInput {
  fs.mkdirSync(publicDir, { recursive: true });

  const assetsDir = path.join(runDir, "assets");
  const assetsLink = path.join(publicDir, "assets");
  if (fs.existsSync(assetsDir)) {
    if (fs.existsSync(assetsLink)) fs.rmSync(assetsLink, { recursive: true, force: true });
    fs.symlinkSync(path.resolve(assetsDir), assetsLink);
  }

  const toPublicPath = (absPath: string): string => {
    if (path.dirname(absPath) === assetsDir) return path.posix.join("assets", path.basename(absPath));
    const dest = path.join(publicDir, path.basename(absPath));
    fs.copyFileSync(absPath, dest);
    return path.basename(absPath);
  };

  return {
    ...input,
    voiceoverPath: input.voiceoverPath ? toPublicPath(input.voiceoverPath) : input.voiceoverPath,
    musicPath: input.musicPath ? toPublicPath(input.musicPath) : input.musicPath,
    scenes: input.scenes.map((scene) => ({
      ...scene,
      elements: scene.elements.map((element) =>
        element.assetPath ? { ...element, assetPath: toPublicPath(element.assetPath) } : element,
      ),
    })),
  };
}
