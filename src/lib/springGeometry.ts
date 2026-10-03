import * as THREE from "three";
import type { SpringComponent } from "@/data/types";
import { legAngle, springMetrics } from "./springMetrics";

/**
 * Builds true-to-dimension spring geometry from catalogue specs.
 *
 * Everything is modelled in millimetres with the coil axis along +X, then the caller
 * normalises it for the camera. Because the same numbers feed the spec table, a
 * participant comparing a physical spring to this model is comparing like with like.
 */

const SAMPLES_PER_TURN = 56;
const TUBE_RADIAL_SEGMENTS = 14;

/** Local 2D hook outline (u along the axis outward from the body, v vertical). */
function hookOutline(radius: number, wire: number, sweepTurns: number) {
  const hookRadius = radius * 0.85;
  const points: THREE.Vector2[] = [new THREE.Vector2(0, 0), new THREE.Vector2(wire * 1.2, 0)];
  const centre = wire * 1.2 + hookRadius;
  const steps = 48;
  const sweep = Math.PI * 2 * sweepTurns;
  for (let i = 0; i <= steps; i += 1) {
    const angle = Math.PI - (i / steps) * sweep;
    points.push(
      new THREE.Vector2(centre + Math.cos(angle) * hookRadius, Math.sin(angle) * hookRadius),
    );
  }
  return points;
}

/**
 * How far round the body is wound, in turns.
 *
 * A torsion spring's legs leave the wire at its two ends, so the angle between
 * them is whatever the body happens to sweep. Winding whole coils puts both legs
 * on top of each other; adding the part turn the end description calls for lands
 * them at the stated angle instead — 0.25 of a turn for 90° legs, 0.75 for 270°.
 *
 * The body is scaled back to `bodyLength` afterwards, so this changes where the
 * legs point without changing any dimension the spec table prints.
 */
function sweepTurns(spring: SpringComponent) {
  if (spring.type !== "torsion") return spring.coils;
  const angle = legAngle(spring.endType);
  if (angle === undefined) return spring.coils;
  return Math.floor(spring.coils) + (((angle % 360) + 360) % 360) / 360;
}

function helixPoints(spring: SpringComponent) {
  const wire = spring.wireDiameter;
  const radius = (spring.outerDiameter - wire) / 2;
  const metrics = springMetrics(spring);
  const points: THREE.Vector3[] = [];

  const openWound = spring.type === "compression" || spring.type === "die";
  const turns = sweepTurns(spring);
  const steps = Math.round(turns * SAMPLES_PER_TURN);

  // Compression and die springs close their end coils, so only the active turns
  // carry the pitch. Extension and torsion springs are wound evenly throughout.
  const pitchAt = (turn: number) =>
    openWound && (turn < 1 || turn > turns - 1) ? wire : metrics.pitch;

  let x = 0;
  for (let i = 0; i <= steps; i += 1) {
    const turn = (i / steps) * turns;
    const angle = turn * Math.PI * 2;
    points.push(new THREE.Vector3(x, Math.cos(angle) * radius, Math.sin(angle) * radius));
    x += pitchAt(turn) / SAMPLES_PER_TURN;
  }

  // Normalise the body to the length the metrics promise, so hooks and legs land
  // exactly where the stated overall dimension says they should.
  const drawn = points[points.length - 1].x;
  if (drawn > 0) {
    const correction = metrics.bodyLength / drawn;
    for (const point of points) point.x *= correction;
  }

  return { points, radius, wire, metrics };
}

function wirePath(spring: SpringComponent): THREE.Vector3[] {
  const { points, radius, wire, metrics } = helixPoints(spring);
  const first = points[0];
  const last = points[points.length - 1];

  if (spring.type === "extension") {
    const sweep = spring.endType.toLowerCase().includes("machine hook") ? 0.78 : 0.92;
    const outline = hookOutline(radius, wire, sweep);
    // Mirror one hook back off the start, run the other off the end.
    const start = outline.map((p) => new THREE.Vector3(first.x - p.x, p.y, 0)).reverse();
    const end = outline.map((p) => new THREE.Vector3(last.x + p.x, p.y, 0));
    return [...start, ...points, ...end];
  }

  if (spring.type === "torsion") {
    const legLength = metrics.leg;
    const radialStart = new THREE.Vector3(0, first.y, first.z).normalize().multiplyScalar(legLength);
    const radialEnd = new THREE.Vector3(0, last.y, last.z).normalize().multiplyScalar(legLength);
    const startLeg = new THREE.Vector3(first.x - wire * 0.4, first.y + radialStart.y, first.z + radialStart.z);
    const endLeg = new THREE.Vector3(last.x + wire * 0.4, last.y + radialEnd.y, last.z + radialEnd.z);
    return [startLeg, first.clone(), ...points, last.clone(), endLeg];
  }

  return points;
}

export interface BuiltGeometry {
  geometry: THREE.BufferGeometry;
  /** Model extents in mm, before any display scaling. */
  size: THREE.Vector3;
  centre: THREE.Vector3;
}

export function buildSpringGeometry(spring: SpringComponent): BuiltGeometry {
  let geometry: THREE.BufferGeometry;

  if (spring.type === "disc") {
    const outer = spring.outerDiameter / 2;
    const inner = (spring.innerDiameter ?? spring.outerDiameter * 0.5) / 2;
    const thickness = spring.wireDiameter;
    const height = spring.freeLength - thickness;
    // Belleville cross-section, revolved around the axis.
    const section = [
      new THREE.Vector2(inner, height),
      new THREE.Vector2(outer, 0),
      new THREE.Vector2(outer, thickness),
      new THREE.Vector2(inner, height + thickness),
      new THREE.Vector2(inner, height),
    ];
    geometry = new THREE.LatheGeometry(section, 96);
    geometry.rotateZ(Math.PI / 2); // put the axis on +X like every other type
  } else if (spring.type === "die" && spring.rectSection) {
    const curve = new THREE.CatmullRomCurve3(wirePath(spring), false, "catmullrom", 0.4);
    const { width, height } = spring.rectSection;
    const shape = new THREE.Shape();
    const w = height / 2;
    const h = width / 2;
    const r = Math.min(w, h) * 0.3;
    shape.moveTo(-w + r, -h);
    shape.lineTo(w - r, -h);
    shape.quadraticCurveTo(w, -h, w, -h + r);
    shape.lineTo(w, h - r);
    shape.quadraticCurveTo(w, h, w - r, h);
    shape.lineTo(-w + r, h);
    shape.quadraticCurveTo(-w, h, -w, h - r);
    shape.lineTo(-w, -h + r);
    shape.quadraticCurveTo(-w, -h, -w + r, -h);
    geometry = new THREE.ExtrudeGeometry(shape, {
      extrudePath: curve,
      steps: Math.round(spring.coils * SAMPLES_PER_TURN),
      bevelEnabled: false,
    });
  } else {
    const path = wirePath(spring);
    const curve = new THREE.CatmullRomCurve3(path, false, "catmullrom", 0.35);
    geometry = new THREE.TubeGeometry(
      curve,
      Math.max(path.length, 64),
      spring.wireDiameter / 2,
      TUBE_RADIAL_SEGMENTS,
      false,
    );
  }

  geometry.computeBoundingBox();
  const box = geometry.boundingBox ?? new THREE.Box3();
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  geometry.translate(-centre.x, -centre.y, -centre.z);
  geometry.computeVertexNormals();

  return { geometry, size, centre };
}

/**
 * Surface finish, matched to the catalogue photography.
 *
 * Both grades are shot as bright polished metal, so neither is allowed to go
 * muddy: the difference is that stainless is near-white and almost mirror-like,
 * while zinc-plated steel keeps a slightly darker, cooler cast and a touch more
 * roughness. Low roughness is what makes the wire pick up the studio reflections
 * and read as metal rather than as grey plastic.
 */
export function springAppearance(spring: SpringComponent) {
  const stainless = spring.material.includes("10270-3");
  return {
    color: stainless ? "#e3e8ec" : "#aab3bd",
    metalness: 1,
    roughness: stainless ? 0.13 : 0.2,
    envMapIntensity: stainless ? 1.45 : 1.3,
  };
}
