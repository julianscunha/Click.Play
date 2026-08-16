import type React from "react";
import { AbsoluteFill } from "remotion";
import type { ResolvedElement } from "../types";

/**
 * Fallback silencioso pra tipos de VisualElement fora do escopo MVP da Fase 9
 * (svg/shape/icon, particle_system, diagram/map — sem provider real ainda,
 * ver docs/IMPLEMENTATION-PLAN.md §0.2/§11A Bloco 4). O Creative Director já
 * não emite esses tipos (creative-director.ts strategyGuidance) — isto é só
 * a rede de segurança pra não quebrar o render se algum escapar mesmo assim;
 * texto de debug vazando no vídeo final é pior que nada aparecer.
 */
export const UnsupportedElement: React.FC<ResolvedElement> = () => <AbsoluteFill />;
