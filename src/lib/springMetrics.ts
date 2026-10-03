import type { SpringComponent, SpringType } from "@/data/types";

/**
 * Shared derivation of a spring's drawn proportions.
 *
 * Both the 2D profile and the 3D model import this, so the overall length a
 * participant measures on screen always equals the length printed in the spec
 * table. Without it the hooks or legs would silently add to the stated size.
 */

/** How far one hook projects beyond the coil body, in mm. */
export const hookProjection = (outerDiameter: number, wireDiameter: number) =>
  wireDiameter * 1.2 + 0.85 * (outerDiameter - wireDiameter);

export interface SpringMetrics {
  /** Length of the coiled body alone, in mm. */
  bodyLength: number;
  /** Axial rise per turn within the body, in mm. */
  pitch: number;
  /** Projection of a single hook, for extension springs. */
  hook: number;
  /** Leg length, for torsion springs. */
  leg: number;
  /** End-to-end length of the drawn part, in mm — matches the stated dimension. */
  overallLength: number;
}

export function springMetrics(spring: SpringComponent): SpringMetrics {
  const { wireDiameter: wire, outerDiameter: outer, freeLength, coils, type } = spring;

  if (type === "extension") {
    const hook = hookProjection(outer, wire);
    const bodyLength = Math.max(freeLength - 2 * hook, coils * wire);
    return {
      bodyLength,
      pitch: Math.max(bodyLength / coils, wire),
      hook,
      leg: 0,
      overallLength: bodyLength + 2 * hook,
    };
  }

  if (type === "torsion") {
    // Torsion springs are specified by leg length, not by an overall free length.
    const bodyLength = coils * wire * 1.06;
    return { bodyLength, pitch: wire * 1.06, hook: 0, leg: freeLength, overallLength: bodyLength };
  }

  if (type === "disc") {
    return { bodyLength: freeLength, pitch: 0, hook: 0, leg: 0, overallLength: freeLength };
  }

  // Compression and die springs: closed end coils, the rest carry the pitch.
  const activeTurns = Math.max(coils - 2, 1);
  return {
    bodyLength: freeLength,
    pitch: Math.max((freeLength - 2 * wire) / activeTurns, wire),
    hook: 0,
    leg: 0,
    overallLength: freeLength,
  };
}

/** What the headline length dimension is actually called, per spring type. */
export const LENGTH_LABEL: Record<SpringType, string> = {
  compression: "Free length",
  extension: "Free length, overall",
  torsion: "Leg length",
  die: "Free length",
  disc: "Free height",
};
