/**
 * Spring rate and working limits, derived from geometry alone.
 *
 * This is the one place a force figure is allowed to come from. `data/build.ts`
 * calls it to fill in `springRate` and `loadRange`; `lib/springSpecs.ts` calls it
 * again with the already-rounded rate to fill in the specification table. Because
 * both go through the same functions, the spec table, the drawing caption and the
 * carousel can never print two different numbers for the same spring.
 *
 * Everything here takes plain numbers rather than a `SpringComponent`, so it can
 * run during catalogue construction, before a component exists.
 */

const G = 81500; // shear modulus, N/mm²
const E = 206000; // Young's modulus, N/mm²

export type LimitType = "compression" | "extension" | "torsion" | "die" | "disc";

/** ISO 10243 load classes, as a fraction of free length. */
const DIE_TRAVEL = { light: 0.37, medium: 0.32, heavy: 0.256 } as const;

export type DieClass = keyof typeof DIE_TRAVEL;

export interface LimitInput {
  type: LimitType;
  /** Wire diameter, or material thickness for a disc spring. */
  wire: number;
  outer: number;
  /** Free length, free height, or leg length for a torsion spring. */
  len: number;
  coils: number;
  /** Axial height of a rectangular die-spring section, if it differs from `wire`. */
  rectHeight?: number;
  /** ISO 10243 load class, for die springs. */
  dieClass?: DieClass;
}

/** Reads the load class out of a die spring's end description. */
export const dieLoadClass = (endType: string): DieClass =>
  /heavy/i.test(endType) ? "heavy" : /medium/i.test(endType) ? "medium" : "light";

export const meanDiameter = (outer: number, wire: number) => outer - wire;
export const innerDiameter = (outer: number, wire: number) => outer - 2 * wire;

/** Coils that actually carry deflection. Closed end coils on a compression spring do not. */
export const activeCoils = (type: LimitType, coils: number) =>
  type === "extension"
    ? Math.max(coils - 1, 1)
    : type === "torsion"
      ? coils
      : type === "disc"
        ? 1
        : Math.max(coils - 2, 1);

/** Unrounded spring rate, in N/mm or N·mm per degree. Disc springs are handled separately. */
export function springRateOf(input: LimitInput): number {
  const mean = meanDiameter(input.outer, input.wire);
  if (input.type === "torsion") {
    return (E * input.wire ** 4) / (3667 * mean * input.coils);
  }
  return (G * input.wire ** 4) / (8 * mean ** 3 * activeCoils(input.type, input.coils));
}

const discTravel = (free: number, thickness: number) => 0.75 * Math.max(free - thickness, 0.01);

export interface SpringLimits {
  /** Maximum working travel: Sn or fn in mm, or the deflection angle in degrees. */
  travel: number;
  /** Force in N at `travel`, or moment in N·mm for a torsion spring. */
  maxForce: number;
  /** Solid length Lc — compression and die springs. */
  solidLength?: number;
  /** Sum of the minimum coil gaps Sa — compression springs. */
  sumGaps?: number;
  /** Length under maximum load: Ln for compression, L1 for extension. */
  loadedLength?: number;
  /** Initial tension F₀ — extension springs. */
  initialTension?: number;
  /** Cone height h₀ — disc springs. */
  coneHeight?: number;
}

/**
 * Working limits for one spring.
 *
 * Pass `rate` to derive forces from an already-rounded spring rate, so the
 * displayed force equals rate × travel to the digit.
 */
export function springLimits(input: LimitInput, rate: number = springRateOf(input)): SpringLimits {
  const { type, wire, outer, len, coils } = input;
  const mean = meanDiameter(outer, wire);

  if (type === "torsion") {
    // Torsion springs are rated over a deflection angle, not a length.
    const travel = 90;
    return { travel, maxForce: rate * travel };
  }

  if (type === "disc") {
    const coneHeight = Math.max(len - wire, 0.01);
    const travel = discTravel(len, wire);
    return { travel, maxForce: rate * travel, coneHeight };
  }

  if (type === "extension") {
    // Coil-to-coil extension is limited to about 1.4 × the wire diameter per turn.
    const travel = 1.4 * wire * activeCoils(type, coils);
    // Cold-coiled extension springs come off the machine with roughly 15 % of
    // their working load already locked in as initial tension.
    const initialTension = 0.15 * rate * travel;
    return {
      travel,
      maxForce: initialTension + rate * travel,
      initialTension,
      loadedLength: len + travel,
    };
  }

  // Compression and die springs.
  const solidLength = coils * (input.rectHeight ?? wire);

  if (type === "die") {
    // Die springs are catalogued by load class, well short of their solid length,
    // because they are rated for a cycle life rather than for a single stroke.
    const travel = len * DIE_TRAVEL[input.dieClass ?? "light"];
    return {
      travel,
      maxForce: rate * travel,
      solidLength,
      loadedLength: len - travel,
    };
  }

  // DIN 2095: the coils of a cold-coiled compression spring may not be closed up
  // completely, so Sa of travel is unavailable at the bottom of the stroke.
  const sumGaps = coils * ((0.0015 * mean ** 2) / wire + 0.1 * wire);
  const travel = Math.max(len - solidLength - sumGaps, len * 0.05);
  return {
    travel,
    maxForce: rate * travel,
    solidLength,
    sumGaps,
    loadedLength: len - travel,
  };
}

/**
 * Rate implied by a catalogued maximum force.
 *
 * Used where the round-wire formula does not apply: a rectangular-section die
 * spring, or a conical disc washer, where it would be out by an order of
 * magnitude or more. The published load is authoritative and the rate follows
 * from it, rather than the other way round.
 */
export function rateForMaxForce(input: LimitInput, force: number): number {
  const { travel } = springLimits(input, 1);
  // An extension spring carries its initial tension on top of rate × travel.
  const factor = input.type === "extension" ? 1.15 : 1;
  return force / (travel * factor);
}

/** Length of wire in one spring, in mm — the basis for its mass. */
export function wireLength(input: LimitInput & { leg?: number }): number {
  const mean = meanDiameter(input.outer, input.wire);
  const body = Math.PI * mean * input.coils;
  if (input.type === "extension") return body + Math.PI * mean * 2; // two end loops
  if (input.type === "torsion") return body + 2 * (input.leg ?? input.len);
  return body;
}
