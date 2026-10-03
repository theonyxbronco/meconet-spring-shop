import type { SpringComponent } from "@/data/types";
import { springMetrics } from "./springMetrics";

/**
 * Orthographic side view of a spring, generated from its specs.
 *
 * A helix seen from the side projects to a sine wave: the axis runs along x and the
 * wire traces y = R·sin(t). Drawn as a stroked path whose width equals the wire
 * diameter, that is a true-to-dimension 2D view in millimetres — shared by the
 * thumbnails, the carousel, the technical drawing and the actual-size overlay.
 */

export interface SpringProfile {
  /** Main coil body, in mm coordinates. */
  body: string;
  /** End features: hooks, legs or the second half of a disc section. */
  features: string[];
  strokeWidth: number;
  /** End-to-end drawn length in mm — equals the stated dimension. */
  width: number;
  /** Drawn height in mm, including legs. */
  height: number;
  viewBox: string;
  /** Axis height within the viewBox, for dimension lines. */
  axisY: number;
}

const SAMPLES_PER_COIL = 40;

export function springProfile(spring: SpringComponent): SpringProfile {
  const wire = spring.wireDiameter;

  if (spring.type === "disc") {
    const outer = spring.outerDiameter;
    const inner = spring.innerDiameter ?? outer * 0.5;
    const height = spring.freeLength;
    const half = outer / 2;
    const innerHalf = inner / 2;
    const top = wire / 2;
    const bottom = height - wire / 2;
    return {
      body: `M ${half - innerHalf} ${top} L 0 ${bottom}`,
      features: [`M ${half + innerHalf} ${top} L ${outer} ${bottom}`],
      strokeWidth: wire,
      width: outer,
      height,
      axisY: height / 2,
      viewBox: `${-wire} ${-wire} ${outer + wire * 2} ${height + wire * 2}`,
    };
  }

  const metrics = springMetrics(spring);
  const radius = (spring.outerDiameter - wire) / 2;
  const isExtension = spring.type === "extension";
  const isTorsion = spring.type === "torsion";
  const bodyStart = isExtension ? metrics.hook : 0;

  const points: string[] = [];
  const total = Math.round(spring.coils * SAMPLES_PER_COIL);
  for (let i = 0; i <= total; i += 1) {
    const angle = (i / SAMPLES_PER_COIL) * Math.PI * 2;
    const x = bodyStart + (i / total) * metrics.bodyLength;
    const y = radius + Math.sin(angle) * radius;
    points.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }

  const features: string[] = [];
  const bodyEnd = bodyStart + metrics.bodyLength;
  const axisY = radius;
  let width = bodyEnd;
  let height = radius * 2;

  if (isExtension) {
    const hookRadius = radius * 0.85;
    const sweep = spring.endType.toLowerCase().includes("machine hook") ? 1 : 0;
    // Each hook: a short straight, then a near-complete loop turning back on itself.
    const hook = (originX: number, direction: 1 | -1) => {
      const straight = wire * 1.2;
      const centre = originX + direction * (straight + hookRadius);
      const tipY = axisY + (sweep ? hookRadius * 0.55 : hookRadius * 0.1);
      const tipX = centre - direction * hookRadius * (sweep ? 0.72 : 0.98);
      return (
        `M ${originX} ${axisY} L ${originX + direction * straight} ${axisY} ` +
        `A ${hookRadius} ${hookRadius} 0 1 ${direction === 1 ? 1 : 0} ${tipX} ${tipY}`
      );
    };
    features.push(hook(bodyStart, -1));
    features.push(hook(bodyEnd, 1));
    width = metrics.overallLength;
  }

  if (isTorsion) {
    features.push(`M ${bodyStart} ${axisY * 2} L ${bodyStart - metrics.leg} ${axisY * 2}`);
    features.push(`M ${bodyEnd} ${axisY * 2} L ${bodyEnd} ${axisY * 2 + metrics.leg}`);
    height = radius * 2 + metrics.leg;
    width = bodyEnd;
  }

  const padding = wire * 1.5;
  const minX = isExtension ? -padding : isTorsion ? -metrics.leg - padding : -padding;
  const drawnWidth = (isExtension ? width : isTorsion ? bodyEnd + padding : width) - minX + padding;

  return {
    body: points.join(" "),
    features,
    strokeWidth: wire,
    width,
    height,
    axisY,
    viewBox: `${minX} ${-padding} ${drawnWidth} ${height + padding * 2}`,
  };
}
