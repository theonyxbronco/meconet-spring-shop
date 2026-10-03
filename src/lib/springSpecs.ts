import type { SpringComponent } from "@/data/types";
import { springMetrics } from "./springMetrics";
import {
  activeCoils,
  dieLoadClass,
  innerDiameter,
  meanDiameter,
  springLimits,
  wireLength,
  type LimitInput,
} from "./springLimits";

/**
 * The full specification sheet for one spring, generated from its geometry.
 *
 * Catalogue practice is a four-column table — attribute, reference symbol, value,
 * unit — because the symbols are what the drawing is annotated with. A participant
 * reading `Sn` on the drawing can find the same `Sn` in the table.
 *
 * Nothing here is stored in `kits.ts`. Every derived figure comes back through
 * `springLimits`, so the table, the drawing and the carousel always agree.
 */

export interface SpecAttribute {
  label: string;
  /** Reference symbol as it appears on the drawing, where there is one. */
  ref?: string;
  value: string;
  unit?: string;
}

const STEEL_DENSITY = 7.85e-3; // g/mm³
const STAINLESS_DENSITY = 7.9e-3;

const isStainless = (spring: SpringComponent) => spring.material.includes("10270-3");

/** "Machine hooks both ends" reads badly mid-sentence when the sentence already says so. */
const endsPhrase = (endType: string) => endType.toLowerCase().replace(/,? both ends$/, "");

/** Decimal places that suit the magnitude, so 0.35 mm wire and 180 mm length both read well. */
const fmt = (value: number, places = 1) => value.toFixed(places);

const STANDARD: Record<SpringComponent["type"], string> = {
  compression: "DIN 2095, class 2",
  extension: "DIN 2097, class 2",
  torsion: "DIN 2088",
  die: "ISO 10243",
  disc: "DIN 2093, group 1",
};

/** ISO 10243 marks each load class with a colour on the spring itself. */
const DIE_COLOUR = { light: "green", medium: "blue", heavy: "red" } as const;

const limitInputFor = (spring: SpringComponent): LimitInput => ({
  type: spring.type,
  wire: spring.wireDiameter,
  outer: spring.outerDiameter,
  len: spring.freeLength,
  coils: spring.coils,
  rectHeight: spring.rectSection?.height,
  dieClass: spring.type === "die" ? dieLoadClass(spring.endType) : undefined,
});

/** Mass of one spring in grams, from the volume of wire it is coiled from. */
export function springMass(spring: SpringComponent): number {
  const density = isStainless(spring) ? STAINLESS_DENSITY : STEEL_DENSITY;

  if (spring.type === "disc") {
    const outer = spring.outerDiameter;
    const inner = spring.innerDiameter ?? outer * 0.5;
    const volume = (Math.PI / 4) * (outer ** 2 - inner ** 2) * spring.wireDiameter;
    return volume * density;
  }

  const metrics = springMetrics(spring);
  const length = wireLength({ ...limitInputFor(spring), leg: metrics.leg });
  const section = spring.rectSection
    ? spring.rectSection.width * spring.rectSection.height
    : (Math.PI * spring.wireDiameter ** 2) / 4;

  return length * section * density;
}

/**
 * The closing block every spring shares: mass, material, how the ends are formed,
 * and the standard it is made to. `endLabel` differs by type — a compression spring
 * has ends, an extension spring has hooks, a torsion spring has legs.
 */
const tailRows = (spring: SpringComponent, endLabel: string): SpecAttribute[] => {
  const grade = isStainless(spring)
    ? "Stainless steel EN 10270-3, 1.4310"
    : "Spring steel EN 10270-1 SH (patented drawn)";
  const temperature = isStainless(spring) ? "−60 … +250" : "−30 … +120";
  const mass = springMass(spring);

  return [
    { label: "Mass", ref: "m", value: fmt(mass, mass < 1 ? 2 : 1), unit: "g" },
    { label: "Material", value: grade },
    { label: "Surface", value: spring.finish },
    ...(spring.type === "disc"
      ? []
      : [{ label: "Winding direction", value: "Right-hand" } satisfies SpecAttribute]),
    { label: endLabel, value: spring.endType },
    { label: "Operating temperature", value: temperature, unit: "°C" },
    { label: "Standard", value: STANDARD[spring.type] },
  ];
};

/**
 * The hole down the middle of the spring.
 *
 * A disc spring states its bore outright. A die spring is wound from rectangular
 * wire laid width-radial, so its bore is set by that width rather than by the
 * nominal wire diameter — which is why this cannot be left to `innerDiameter`.
 */
export const boreDiameter = (spring: SpringComponent): number => {
  if (spring.type === "disc") return spring.innerDiameter ?? spring.outerDiameter * 0.5;
  return spring.outerDiameter - 2 * (spring.rectSection?.width ?? spring.wireDiameter);
};

const diameterRows = (spring: SpringComponent): SpecAttribute[] => {
  const outer = spring.outerDiameter;
  const radial = spring.rectSection?.width ?? spring.wireDiameter;

  return [
    { label: "Outside diameter", ref: "Do", value: fmt(outer, 2), unit: "mm" },
    { label: "Inside diameter", ref: "Di", value: fmt(boreDiameter(spring), 2), unit: "mm" },
    { label: "Mean diameter", ref: "Dm", value: fmt(outer - radial, 2), unit: "mm" },
  ];
};

const coilRows = (spring: SpringComponent): SpecAttribute[] => [
  {
    label: "Active coils",
    ref: "if",
    value: String(activeCoils(spring.type, spring.coils)),
    unit: "pcs",
  },
  { label: "Total coils", ref: "ig", value: String(spring.coils), unit: "pcs" },
];

/** Every attribute of a spring, in catalogue order. */
export function specAttributes(spring: SpringComponent): SpecAttribute[] {
  const limits = springLimits(limitInputFor(spring), spring.springRate);
  const metrics = springMetrics(spring);
  const rate = { label: "Spring rate", ref: "c", value: String(spring.springRate), unit: spring.rateUnit };
  const maxForce = spring.loadRange[1];

  if (spring.type === "extension") {
    return [
      { label: "Wire diameter", ref: "d", value: fmt(spring.wireDiameter, 2), unit: "mm" },
      { label: "Free length over hooks", ref: "L0", value: fmt(spring.freeLength), unit: "mm" },
      { label: "Body length", ref: "Lk", value: fmt(metrics.bodyLength), unit: "mm" },
      rate,
      ...diameterRows(spring),
      ...coilRows(spring),
      { label: "Initial tension", ref: "F0", value: fmt(limits.initialTension ?? 0), unit: "N" },
      { label: "Maximum extension", ref: "fn", value: fmt(limits.travel), unit: "mm" },
      { label: "Maximum length", ref: "L1", value: fmt(limits.loadedLength ?? 0), unit: "mm" },
      { label: "Force at maximum extension", ref: "Fn", value: fmt(maxForce), unit: "N" },
      ...tailRows(spring, "Hooks"),
    ];
  }

  if (spring.type === "torsion") {
    const mandrel = innerDiameter(spring.outerDiameter, spring.wireDiameter) * 0.9;
    return [
      { label: "Wire diameter", ref: "d", value: fmt(spring.wireDiameter, 2), unit: "mm" },
      { label: "Leg length", ref: "a", value: fmt(spring.freeLength), unit: "mm" },
      { label: "Body length", ref: "Lk", value: fmt(metrics.bodyLength), unit: "mm" },
      rate,
      ...diameterRows(spring),
      { label: "Coils", ref: "n", value: String(spring.coils), unit: "pcs" },
      { label: "Maximum deflection angle", ref: "φn", value: fmt(limits.travel, 0), unit: "°" },
      { label: "Moment at maximum deflection", ref: "Mn", value: fmt(maxForce), unit: "N·mm" },
      { label: "Largest usable mandrel", value: fmt(mandrel), unit: "mm" },
      ...tailRows(spring, "Legs"),
    ];
  }

  if (spring.type === "disc") {
    const outer = spring.outerDiameter;
    const inner = spring.innerDiameter ?? outer * 0.5;
    return [
      { label: "Thickness", ref: "t", value: fmt(spring.wireDiameter, 2), unit: "mm" },
      { label: "Outside diameter", ref: "De", value: fmt(outer, 2), unit: "mm" },
      { label: "Bore diameter", ref: "Di", value: fmt(inner, 2), unit: "mm" },
      { label: "Free height", ref: "l0", value: fmt(spring.freeLength, 2), unit: "mm" },
      { label: "Cone height", ref: "h0", value: fmt(limits.coneHeight ?? 0, 2), unit: "mm" },
      rate,
      { label: "Deflection at 0.75 h0", ref: "s", value: fmt(limits.travel, 2), unit: "mm" },
      { label: "Force at 0.75 h0", ref: "F", value: fmt(maxForce, 0), unit: "N" },
      {
        label: "Height under load",
        ref: "l",
        value: fmt(spring.freeLength - limits.travel, 2),
        unit: "mm",
      },
      ...tailRows(spring, "Series"),
    ];
  }

  // Compression and die springs.
  const isDie = spring.type === "die";
  const section = spring.rectSection;
  const travelLabel = isDie ? "Maximum deflection" : "Maximum compression";

  return [
    section
      ? {
          label: "Wire section, width × height",
          ref: "b × h",
          value: `${fmt(section.width, 2)} × ${fmt(section.height, 2)}`,
          unit: "mm",
        }
      : { label: "Wire diameter", ref: "d", value: fmt(spring.wireDiameter, 2), unit: "mm" },
    { label: "Free length", ref: "L0", value: fmt(spring.freeLength), unit: "mm" },
    rate,
    ...diameterRows(spring),
    ...coilRows(spring),
    ...(isDie
      ? [
          {
            label: "Load class",
            value: `${dieLoadClass(spring.endType)} — marked ${DIE_COLOUR[dieLoadClass(spring.endType)]}`,
          } satisfies SpecAttribute,
        ]
      : []),
    { label: travelLabel, ref: "Sn", value: fmt(limits.travel), unit: "mm" },
    { label: "Loaded length at Sn", ref: "Ln", value: fmt(limits.loadedLength ?? 0), unit: "mm" },
    { label: `Force at ${travelLabel.toLowerCase()}`, ref: "Fn", value: fmt(maxForce), unit: "N" },
    { label: "Solid length", ref: "Lc", value: fmt(limits.solidLength ?? 0), unit: "mm" },
    ...tailRows(spring, "Ends"),
  ];
}

/** Mean-diameter tolerance to EN 15800, rounded to the nearest 0.05 mm. */
const diameterTolerance = (spring: SpringComponent) => {
  const mean = meanDiameter(spring.outerDiameter, spring.wireDiameter);
  return Math.max(0.05, Math.round(Math.max(0.2, 0.04 * mean) / 0.05) * 0.05);
};

/**
 * How to read the numbers above, written as sentences with this spring's own
 * figures substituted in — so a customer who has never specified a spring can
 * still work out what it will do.
 */
export function springNotes(spring: SpringComponent): string[] {
  const limits = springLimits(limitInputFor(spring), spring.springRate);
  const rate = spring.springRate;
  const tolerance = fmt(diameterTolerance(spring), 2);
  const maxForce = spring.loadRange[1];

  if (spring.type === "extension") {
    const F0 = limits.initialTension ?? 0;
    // Pick a round example extension, comfortably inside the working range.
    const example = Math.max(1, Math.round(limits.travel / 2));
    return [
      `Force = initial tension + extension × spring rate. Example: ${example} mm of extension gives ${fmt(F0)} + ${example} × ${rate} = ${fmt(F0 + example * rate)} N.`,
      `The coils touch at rest. The spring does not begin to stretch until the initial tension of ${fmt(F0)} N is exceeded.`,
      `Do not extend beyond L1 (${fmt(limits.loadedLength ?? 0)} mm). Past that the hooks and the wire deform permanently.`,
      `Tolerance on mean diameter ±${tolerance} mm; on free length ±${fmt(Math.max(0.5, spring.freeLength * 0.02))} mm.`,
      `Hook the spring over a pin of about ${fmt(innerDiameter(spring.outerDiameter, spring.wireDiameter) * 0.75)} mm diameter or smaller.`,
    ];
  }

  if (spring.type === "torsion") {
    const example = 45;
    return [
      `Moment = angle × spring rate. Example: ${example}° of deflection gives ${example} × ${rate} = ${fmt(example * rate)} N·mm.`,
      `Load the spring in the direction that winds the coils tighter. Deflecting it the other way opens the body out and the rate falls away.`,
      `The body contracts in diameter as it winds, so fit it over a mandrel no larger than ${fmt(innerDiameter(spring.outerDiameter, spring.wireDiameter) * 0.9)} mm.`,
      `Rated to ${fmt(limits.travel, 0)}° of deflection, at ${fmt(maxForce)} N·mm. Beyond that the legs take a permanent set.`,
      `Tolerance on mean diameter ±${tolerance} mm; on leg position ±3°.`,
    ];
  }

  if (spring.type === "disc") {
    const stack = Math.round(maxForce * 2);
    return [
      `Rated at ${fmt(maxForce, 0)} N when compressed to 0.75 h0, which is ${fmt(limits.travel, 2)} mm of travel.`,
      `Stack two washers the same way up (in parallel) for about ${stack} N at the same travel. Stack them facing each other (in series) for the same force over ${fmt(limits.travel * 2, 2)} mm.`,
      `Guide the stack on a bolt or in a bore. An unguided disc spring tips and loads its edge.`,
      `Deflecting past 0.75 h0 flattens the washer and loses its preload permanently.`,
      `Tolerance on thickness ±${fmt(Math.max(0.02, spring.wireDiameter * 0.04), 2)} mm.`,
    ];
  }

  const isDie = spring.type === "die";
  const example = Math.max(1, Math.round(limits.travel / 3));
  const recommended = limits.travel * 0.75;

  return [
    `Force = compression × spring rate. Example: ${example} mm of compression gives ${example} × ${rate} = ${fmt(example * rate)} N.`,
    isDie
      ? `This is a ${dieLoadClass(spring.endType)}-load die spring to ISO 10243. For a long cycle life keep the working stroke at or under ${fmt(recommended)} mm.`
      : `Recommended working stroke is at most 75 % of Sn, which is ${fmt(recommended)} mm.`,
    spring.endType.toLowerCase().includes("ground")
      ? `The end coils are closed and ground flat, so the spring seats square without a cup.`
      : `The end coils are closed but not ground, which is normal below 0.75 mm wire. Expect a small amount of lean under load.`,
    `Tolerance on mean diameter ±${tolerance} mm. L0 is a guide value and may vary slightly.`,
    `Compressing the spring all the way to its solid length of ${fmt(limits.solidLength ?? 0)} mm sets it, and it will not come back to full free length.`,
  ];
}

/**
 * A checklist for telling this spring apart from a similar one, using nothing but a
 * caliper or a ruler. This is the content a participant falls back on when the 3D
 * view and the drawing have not settled it.
 */
export function identificationSteps(spring: SpringComponent): string[] {
  const outer = spring.outerDiameter;
  const metrics = springMetrics(spring);

  if (spring.type === "extension") {
    return [
      `Check the type first: a hook or loop at each end, with the coils wound tight against each other, means an extension spring.`,
      `Measure the outside diameter of the coil body across the widest point: about ${fmt(outer, 1)} mm.`,
      `Measure the overall length including the hooks, with nothing pulling on it: about ${fmt(spring.freeLength)} mm. The coil body on its own is ${fmt(metrics.bodyLength)} mm.`,
      `The ends are ${endsPhrase(spring.endType)}, projecting about ${fmt(metrics.hook)} mm beyond the body at each end.`,
      `The wire is ${fmt(spring.wireDiameter, 2)} mm. Count ${spring.coils} coils in the body if you need to be certain.`,
    ];
  }

  if (spring.type === "torsion") {
    return [
      `Check the type first: two straight legs coming off a short coiled body means a torsion spring. It works by twisting, not by stretching.`,
      `Measure the outside diameter of the body: about ${fmt(outer, 1)} mm.`,
      `Measure one leg from the body to its tip: about ${fmt(spring.freeLength)} mm. The coiled body itself is only ${fmt(metrics.bodyLength)} mm long.`,
      `Check the angle between the legs unloaded — these are ${endsPhrase(spring.endType)}.`,
      `The wire is ${fmt(spring.wireDiameter, 2)} mm, over ${spring.coils} coils.`,
    ];
  }

  if (spring.type === "disc") {
    return [
      `Check the type first: a single cone-shaped steel washer, not a coil, is a disc spring.`,
      `Measure the outside diameter: about ${fmt(outer, 1)} mm.`,
      `Measure the bore: about ${fmt(spring.innerDiameter ?? outer * 0.5, 1)} mm.`,
      `Measure the thickness of the material at the rim: ${fmt(spring.wireDiameter, 2)} mm. Stood on a flat surface the washer is ${fmt(spring.freeLength, 2)} mm tall.`,
      `Sight along it from the side — the dish should be clearly visible and the washer should rock when pressed at one edge.`,
    ];
  }

  const isDie = spring.type === "die";
  const section = spring.rectSection;

  return [
    isDie
      ? `Check the type first: open coils of flat, rectangular wire — not round — and usually a colour mark, means a die spring.`
      : `Check the type first: open coils with a visible gap between them and no hooks means a compression spring. Both ends look alike.`,
    `Measure the outside diameter: about ${fmt(outer, 1)} mm.`,
    `Measure the free length with nothing pressing on it: about ${fmt(spring.freeLength)} mm.`,
    `Count the coils: ${spring.coils} in total, including the flat end coil at each end.`,
    section
      ? `The wire is rectangular, ${fmt(section.width, 1)} mm radially by ${fmt(section.height, 1)} mm along the axis. The colour mark is ${DIE_COLOUR[dieLoadClass(spring.endType)]}.`
      : `The wire is ${fmt(spring.wireDiameter, 2)} mm. The ends are ${endsPhrase(spring.endType)}.`,
  ];
}
