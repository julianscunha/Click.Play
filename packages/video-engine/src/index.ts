// VisualCompositionProvider — contrato do domínio (Fase 6).
export * from "./visual-composition-provider.js";

// Motor de captions (Fase 8): 7 estilos + wrapper de timing, portado de OpenReels/MIT.
export * from "./captions/index.js";

// VideoRenderer + RemotionRenderer (Fase 9): composição multi-elemento por cena
// (elements[] em camadas), inspirado em score-to-props.ts/OpenReelsVideo.tsx (OpenReels, MIT).
export * from "./render/index.js";
