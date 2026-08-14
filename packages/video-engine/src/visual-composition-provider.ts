import type { Scene } from "@clickplay/domain";

/**
 * Contrato entre o domínio e o renderer de motion graphics
 * (docs/IMPLEMENTATION-PLAN.md §0.2). Recebe uma `Scene` (composição de 1+
 * `VisualElement`) e produz o artefato renderizável — não decide o que
 * aparece na cena (isso é do Creative Director), só como compor/exportar.
 *
 * `RemotionRenderer` (Fase 9) é a implementação inicial, envolvendo
 * `score-to-props.ts`/`OpenReelsVideo.tsx` do OpenReels estendidos para
 * múltiplos elementos por cena. `HyperFramesRenderer` fica documentado como
 * implementação alternativa futura possível (auditado nesta sessão: motor de
 * motion graphics HTML+headless Chrome+FFmpeg, Apache 2.0).
 */
export interface VisualCompositionProvider {
  readonly id: string;
  compose(scene: Scene): Promise<ComposedScene>;
}

export interface ComposedScene {
  sceneId: string;
  durationInFrames: number;
}
