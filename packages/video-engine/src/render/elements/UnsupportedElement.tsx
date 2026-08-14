import type React from "react";
import { AbsoluteFill } from "remotion";
import type { ResolvedElement } from "../types";

/**
 * Placeholder pra tipos de VisualElement fora do escopo MVP da Fase 9
 * (svg/shape/icon, particle_system, diagram/map — sem provider real ainda,
 * ver docs/IMPLEMENTATION-PLAN.md §0.2). Renderiza algo visível em vez de
 * quebrar o render inteiro por causa de 1 elemento não suportado.
 */
export const UnsupportedElement: React.FC<ResolvedElement> = ({ type }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
    <div style={{ color: "#FF6B6B", fontSize: 24, fontFamily: "monospace" }}>
      [elemento não implementado: {type}]
    </div>
  </AbsoluteFill>
);
