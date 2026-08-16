import { registerRoot } from "remotion";
// Import direto do arquivo (não do barrel @clickplay/video-engine) — o barrel
// também reexporta RemotionRenderer (server-only, importa @remotion/bundler/
// @remotion/renderer), o que arrastava webpack/esbuild/rspack inteiros pro
// bundle do browser via este entry point.
import { ClickPlayVideoRoot } from "@clickplay/video-engine/src/render/ClickPlayVideo.js";

registerRoot(ClickPlayVideoRoot);
