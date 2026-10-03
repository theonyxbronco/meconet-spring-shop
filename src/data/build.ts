import {
  dieLoadClass,
  rateForMaxForce,
  springLimits,
  springRateOf,
  type LimitInput,
} from "@/lib/springLimits";
import type { SizeBand, SpringAction, SpringComponent, SpringType } from "./types";

const TYPE_LETTER: Record<SpringType, string> = {
  compression: "C",
  extension: "E",
  torsion: "T",
  die: "D",
  disc: "S",
};

const ACTION_BY_TYPE: Record<SpringType, SpringAction> = {
  compression: "push",
  extension: "pull",
  torsion: "rotate",
  die: "push",
  disc: "push",
};

const MATERIALS = {
  steel: { name: "Spring steel (EN 10270-1)", letter: "M", finish: "Zinc plated" },
  stainless: { name: "Stainless steel (EN 10270-3)", letter: "S", finish: "Passivated" },
} as const;

export type MaterialKey = keyof typeof MATERIALS;

const round = (value: number, places = 1) => {
  const f = 10 ** places;
  return Math.round(value * f) / f;
};

/** Stiff springs are quoted whole, soft ones to two places — as a catalogue would. */
const ratePlaces = (type: SpringType, rate: number) =>
  type === "torsion" ? 3 : rate >= 100 ? 0 : rate >= 10 ? 1 : 2;

const pad = (value: number, length: number) => String(Math.round(value)).padStart(length, "0");

/**
 * Product code scheme, mirroring the format in the Figma mockups:
 * V + type letter + wire(×100, 4) + outer Ø(×10, 3) + free length(×10, 4) + material letter.
 */
const buildCode = (type: SpringType, wire: number, outer: number, length: number, material: MaterialKey) =>
  `V${TYPE_LETTER[type]}${pad(wire * 100, 4)}${pad(outer * 10, 3)}${pad(length * 10, 4)}${MATERIALS[material].letter}`;

const sizeBandFor = (length: number): SizeBand =>
  length < 30 ? "small" : length <= 80 ? "medium" : "large";

export interface SpecInput {
  type: SpringType;
  /** Wire diameter, or material thickness for a disc spring. */
  wire: number;
  outer: number;
  /** Free length, or free overall height for a disc spring. */
  len: number;
  coils: number;
  end: string;
  material?: MaterialKey;
  quantity: number;
  /** Rectangular wire section for die springs: [width, height] in mm. */
  rect?: [number, number];
  /** Bore diameter for disc springs. */
  inner?: number;
  /** Overrides the calculated working load, for sections the formulas don't cover. */
  load?: [number, number];
  target?: boolean;
}

/** Derives code, spring rate and working load from the geometry, so specs stay self-consistent. */
export function buildComponent(spec: SpecInput): SpringComponent {
  const material = spec.material ?? "steel";
  const code = buildCode(spec.type, spec.wire, spec.outer, spec.len, material);

  const limitInput: LimitInput = {
    type: spec.type,
    wire: spec.wire,
    outer: spec.outer,
    len: spec.len,
    coils: spec.coils,
    rectHeight: spec.rect?.[1],
    dieClass: spec.type === "die" ? dieLoadClass(spec.end) : undefined,
  };

  // The rate is rounded before the forces are derived from it, so that every force
  // printed anywhere in the UI is exactly rate × travel for the rate shown.
  const rateUnit: SpringComponent["rateUnit"] = spec.type === "torsion" ? "N·mm/°" : "N/mm";
  const loadUnit: SpringComponent["loadUnit"] = spec.type === "torsion" ? "N·mm" : "N";

  // A published load wins over the wire formula: it is the only thing that gives a
  // sensible rate for a rectangular die section or a conical disc washer.
  const rawRate = spec.load
    ? rateForMaxForce(limitInput, spec.load[1])
    : springRateOf(limitInput);
  const springRate = round(rawRate, ratePlaces(spec.type, rawRate));

  const limits = springLimits(limitInput, springRate);
  const minimumFraction = spec.type === "torsion" ? 0.25 : 0.2;

  let loadRange: [number, number] = [
    round(limits.maxForce * minimumFraction),
    round(limits.maxForce),
  ];

  if (spec.load) {
    loadRange = spec.load;
  }

  const typeName =
    spec.type === "disc"
      ? `Disc spring Ø${spec.outer} × ${spec.wire} mm`
      : `${TYPE_NAME[spec.type]} Ø${spec.outer} × ${spec.len} mm`;

  return {
    id: code.toLowerCase(),
    code,
    name: typeName,
    type: spec.type,
    wireDiameter: spec.wire,
    outerDiameter: spec.outer,
    freeLength: spec.len,
    coils: spec.coils,
    endType: spec.end,
    rectSection: spec.rect ? { width: spec.rect[0], height: spec.rect[1] } : undefined,
    innerDiameter: spec.inner,
    loadRange,
    loadUnit,
    springRate,
    rateUnit,
    material: MATERIALS[material].name,
    finish: MATERIALS[material].finish,
    quantity: spec.quantity,
    sizeBand: sizeBandFor(spec.len),
    action: ACTION_BY_TYPE[spec.type],
    isTestTarget: spec.target,
  };
}

const TYPE_NAME: Record<SpringType, string> = {
  compression: "Compression spring",
  extension: "Extension spring",
  torsion: "Torsion spring",
  die: "Die spring",
  disc: "Disc spring",
};
