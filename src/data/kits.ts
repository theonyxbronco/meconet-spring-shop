import { buildComponent, type SpecInput } from "./build";
import type { Kit } from "./types";

/**
 * THE TEST TARGET
 *
 * Exactly one component in the catalogue is flagged `target: true` — the spring a
 * participant is handed physically and asked to locate. Two deliberate near-misses
 * sit in other kits so the task cannot be passed by glancing at a thumbnail:
 *
 *   target      Garage Kit      extension, Ø10.0 × 70 mm, wire 1.20
 *   near-miss   Mechatro Kit    extension, Ø10.0 × 65 mm, wire 1.20  (5 mm shorter)
 *   near-miss   Trampoline Kit  extension, Ø12.0 × 70 mm, wire 1.40  (same length, heavier)
 *
 * The Mechatro near-miss is deliberately plated steel like the target, not stainless
 * like the rest of that kit — if the material differed, the spec table would give the
 * answer away before the dimensions were ever compared.
 *
 * When the real physical spring is measured, change the target's numbers here and
 * everything downstream — code, specs, drawing, 3D model — follows automatically.
 */

/**
 * ─── PHOTOGRAPHY ─────────────────────────────────────────────────────────────
 * The Mechatro Kit is the kit shown in moderated sessions, so it is the one
 * dressed with real studio photography and real drawing sheets. Every other kit
 * falls back to the generated artwork in `assets/brand.tsx`, which is derived
 * from the same dimensions and so is never wrong, only plainer.
 *
 * Drawing sheets are grouped by what the spring's ends actually look like, so a
 * participant comparing the sheet to the part is comparing like with like.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const S = (name: string) => `/springs/${name}.png`;

const COMPRESSION_SHEETS = [
  S("compression-spring-engineering-blueprint"),
  S("helical-spring-technical-drawing"),
  S("technical-helical-spring-drawing"),
];

/** Loop ends: the wire closes into a full ring at each end. */
const EXTENSION_LOOP_SHEETS = [
  S("extension-spring-orthographic-drawing"),
  S("extension-spring-orthographic-drawing-1"),
  S("spring-engineering-drawing-views"),
];

/** Machine hooks: the ring is left open so the spring can be hooked on. */
const EXTENSION_HOOK_SHEETS = [
  S("helical-extension-spring-engineering-blueprint"),
  S("technical-drawing-of-a-compact-tension-spring"),
  S("technical-spring-engineering-drawing"),
];

const TORSION_SHEETS = [
  S("torsion-spring-engineering-blueprint"),
  S("torsion-spring-technical-drawing"),
];

const kit = (kit: Omit<Kit, "components"> & { components: SpecInput[] }): Kit => ({
  ...kit,
  components: kit.components.map(buildComponent),
});

export const kits: Kit[] = [
  kit({
    slug: "garage-kit",
    name: "Garage Kit",
    coverImage: "/kit-covers/garage-kit.png",
    partNumber: "2734645",
    shortText: "Mixed box of compression, extension and torsion springs for everyday repairs.",
    description:
      "Practical box with spiral springs and other types of springs in different models and dimensions. Covers the sizes most often needed for door hardware, latches, hinges and general maintenance work.",
    inStock: true,
    deliveryDays: "1-2 days",
    priceEUR: 89,
    compartments: 18,
    profile: {
      actions: ["pull", "push", "rotate"],
      sizes: ["small", "medium"],
      environments: ["indoor", "outdoor"],
      keywords: ["garage", "door", "gate", "hinge", "latch", "workshop", "repair", "mixed", "general", "home", "diy", "tool", "lock", "handle", "car", "bonnet", "boot"],
    },
    components: [
      { type: "compression", wire: 0.8, outer: 6.0, len: 20, coils: 15, end: "Closed and ground", quantity: 10 },
      { type: "compression", wire: 1.0, outer: 8.0, len: 25, coils: 15, end: "Closed and ground", quantity: 10 },
      { type: "compression", wire: 1.4, outer: 12.0, len: 38, coils: 16, end: "Closed and ground", quantity: 8 },
      { type: "compression", wire: 2.0, outer: 16.0, len: 50, coils: 15, end: "Closed and ground", quantity: 6 },
      { type: "extension", wire: 0.7, outer: 5.5, len: 32, coils: 30, end: "Full loop both ends", quantity: 10 },
      { type: "extension", wire: 0.9, outer: 7.0, len: 45, coils: 36, end: "Full loop both ends", quantity: 10 },
      { type: "extension", wire: 1.2, outer: 10.0, len: 70, coils: 40, end: "Machine hooks both ends", quantity: 8, target: true },
      { type: "extension", wire: 1.6, outer: 14.0, len: 95, coils: 42, end: "Machine hooks both ends", quantity: 6 },
      { type: "torsion", wire: 1.0, outer: 9.0, len: 22, coils: 6, end: "90° straight legs", quantity: 8 },
      { type: "torsion", wire: 1.4, outer: 12.0, len: 28, coils: 7, end: "180° straight legs", quantity: 8 },
    ],
  }),

  kit({
    slug: "mechatro-kit",
    name: "Mechatro Kit",
    coverImage: "/kit-covers/mechatro-kit.png",
    partNumber: "2734689",
    shortText: "Precision springs for actuators, grippers, limit switches and servo linkages.",
    description:
      "Built for mechatronic assemblies — robot grippers, linear actuators, end stops, limit switches and servo linkages. Close-tolerance springs in matched compression, extension and torsion sizes, mostly stainless so they can sit next to sensors and run clean.",
    inStock: true,
    deliveryDays: "1-2 days",
    priceEUR: 112,
    compartments: 16,
    profile: {
      actions: ["push", "pull", "rotate"],
      sizes: ["small", "medium"],
      environments: ["indoor"],
      keywords: ["mechatro", "mechatronic", "robot", "robotics", "automation", "actuator", "gripper", "servo", "linkage", "sensor", "limit switch", "end stop", "precision", "electronics", "machine", "cnc", "3d printer", "prototype"],
    },
    components: [
      // Compression — plunger returns and preload, smallest to largest.
      { type: "compression", wire: 1.0, outer: 5.0, len: 33, coils: 22, end: "Closed and ground", material: "stainless", quantity: 12, photo: S("minimalist-steel-compression-spring"), drawings: COMPRESSION_SHEETS },
      { type: "compression", wire: 1.3, outer: 6.0, len: 18, coils: 9, end: "Closed and ground", material: "stainless", quantity: 12, photo: S("polished-chrome-compression-spring"), drawings: COMPRESSION_SHEETS },
      { type: "compression", wire: 2.2, outer: 9.0, len: 43, coils: 16, end: "Closed and ground", material: "stainless", quantity: 8, photo: S("polished-steel-compression-spring"), drawings: COMPRESSION_SHEETS },
      { type: "compression", wire: 1.8, outer: 12.0, len: 28, coils: 8, end: "Closed and ground", material: "stainless", quantity: 8, photo: S("polished-silver-compression-spring"), drawings: COMPRESSION_SHEETS },

      // Extension — gripper and linkage returns. All but the near-miss close into a
      // full loop, which is what their photographs show.
      { type: "extension", wire: 0.45, outer: 6.0, len: 22, coils: 26, end: "Full loop both ends", material: "stainless", quantity: 12, photo: S("polished-diagonal-extension-spring-2"), drawings: EXTENSION_LOOP_SHEETS },
      { type: "extension", wire: 0.75, outer: 8.0, len: 37, coils: 30, end: "Full loop both ends", material: "stainless", quantity: 10, photo: S("polished-diagonal-extension-spring"), drawings: EXTENSION_LOOP_SHEETS },
      { type: "extension", wire: 1.2, outer: 10.0, len: 65, coils: 39, end: "Machine hooks both ends", quantity: 8, photo: S("metal-extension-spring-on-white"), drawings: EXTENSION_HOOK_SHEETS },
      { type: "extension", wire: 1.0, outer: 14.0, len: 57, coils: 32, end: "Full loop both ends", material: "stainless", quantity: 6, photo: S("polished-stainless-steel-extension-spring"), drawings: EXTENSION_LOOP_SHEETS },

      // Torsion — hinge, flap and lever returns, by leg arrangement.
      { type: "torsion", wire: 0.9, outer: 7.0, len: 18, coils: 5, end: "90° straight legs", material: "stainless", quantity: 12, photo: S("polished-l-shaped-torsion-spring"), drawings: TORSION_SHEETS },
      { type: "torsion", wire: 1.3, outer: 11.0, len: 26, coils: 5, end: "Straight legs, tangential", material: "stainless", quantity: 10, photo: S("polished-stainless-steel-torsion-spring"), drawings: TORSION_SHEETS },
      { type: "torsion", wire: 1.6, outer: 13.0, len: 32, coils: 3, end: "270° crossed legs", material: "stainless", quantity: 8, photo: S("polished-crossed-arm-torsion-spring"), drawings: TORSION_SHEETS },
    ],
  }),

  kit({
    slug: "bike-kit",
    name: "Bike Kit",
    coverImage: "/kit-covers/bike-kit.png",
    partNumber: "2734651",
    shortText: "Small corrosion-resistant springs for brake, lever and folding mechanisms.",
    description:
      "A compact selection of small-diameter springs for cable-operated brakes, shifters, kickstands, folding joints and quick-release levers. Predominantly stainless, for parts that live outdoors.",
    inStock: true,
    deliveryDays: "1-2 days",
    priceEUR: 64,
    compartments: 12,
    profile: {
      actions: ["pull", "rotate"],
      sizes: ["small", "medium"],
      environments: ["outdoor"],
      keywords: ["bike", "bicycle", "brake", "lever", "cable", "derailleur", "kickstand", "scooter", "folding", "wheelchair", "pram", "stroller", "mobility", "clip"],
    },
    components: [
      { type: "extension", wire: 0.6, outer: 4.5, len: 24, coils: 26, end: "Full loop both ends", material: "stainless", quantity: 10 },
      { type: "extension", wire: 0.8, outer: 6.0, len: 38, coils: 32, end: "Machine hooks both ends", material: "stainless", quantity: 10 },
      { type: "extension", wire: 1.0, outer: 8.0, len: 48, coils: 34, end: "Machine hooks both ends", quantity: 8 },
      { type: "torsion", wire: 0.8, outer: 7.0, len: 16, coils: 5, end: "90° straight legs", material: "stainless", quantity: 10 },
      { type: "torsion", wire: 1.0, outer: 8.0, len: 18, coils: 6, end: "Straight legs, tangential", material: "stainless", quantity: 10 },
      { type: "torsion", wire: 1.2, outer: 10.0, len: 20, coils: 6, end: "180° straight legs", material: "stainless", quantity: 8 },
      { type: "compression", wire: 0.6, outer: 5.0, len: 16, coils: 16, end: "Closed and ground", material: "stainless", quantity: 12 },
      { type: "compression", wire: 0.9, outer: 7.0, len: 22, coils: 14, end: "Closed and ground", material: "stainless", quantity: 10 },
    ],
  }),

  kit({
    slug: "trampoline-kit",
    name: "Trampoline Kit",
    coverImage: "/kit-covers/trampoline-kit.png",
    partNumber: "2734668",
    shortText: "Long heavy-duty extension springs for outdoor equipment under repeated load.",
    description:
      "Long-travel extension springs sized for garden and outdoor equipment that cycles under load all season. Stainless and heavily zinc-plated finishes resist weather and standing moisture.",
    inStock: true,
    deliveryDays: "1-2 days",
    priceEUR: 118,
    compartments: 8,
    profile: {
      actions: ["pull"],
      sizes: ["large", "medium"],
      environments: ["outdoor"],
      keywords: ["trampoline", "garden", "outdoor", "gate", "weather", "rust", "heavy", "long", "jump", "canopy", "awning", "tension", "exercise", "frame"],
    },
    components: [
      { type: "extension", wire: 1.4, outer: 12.0, len: 70, coils: 32, end: "Machine hooks both ends", quantity: 6 },
      { type: "extension", wire: 2.2, outer: 20.0, len: 120, coils: 36, end: "Full loop both ends", material: "stainless", quantity: 6 },
      { type: "extension", wire: 2.6, outer: 22.0, len: 140, coils: 36, end: "Machine hooks both ends", material: "stainless", quantity: 6 },
      { type: "extension", wire: 3.0, outer: 25.0, len: 165, coils: 38, end: "Machine hooks both ends", material: "stainless", quantity: 4 },
      { type: "extension", wire: 3.4, outer: 28.0, len: 180, coils: 36, end: "Machine hooks both ends", material: "stainless", quantity: 4 },
      { type: "compression", wire: 2.5, outer: 20.0, len: 60, coils: 14, end: "Closed and ground", material: "stainless", quantity: 6 },
    ],
  }),

  kit({
    slug: "home-kit",
    name: "Home Kit",
    coverImage: "/kit-covers/home-kit.png",
    partNumber: "2734672",
    shortText: "Light indoor springs for drawers, catches, hinges and small fittings.",
    description:
      "Light-duty springs for furniture and fittings around the house — drawer runners, ball catches, flap stays, cabinet hinges and small push-to-open fittings. Sized for low loads and short travel indoors.",
    inStock: true,
    deliveryDays: "1-2 days",
    priceEUR: 58,
    compartments: 15,
    profile: {
      actions: ["push", "rotate", "pull"],
      sizes: ["small"],
      environments: ["indoor"],
      keywords: ["home", "house", "furniture", "drawer", "cabinet", "hinge", "catch", "fitting", "flap", "indoor", "light", "small", "kitchen", "wardrobe", "desk", "chair", "blind", "curtain"],
    },
    components: [
      { type: "compression", wire: 0.5, outer: 4.0, len: 12, coils: 14, end: "Closed ends", quantity: 12 },
      { type: "compression", wire: 0.7, outer: 5.0, len: 18, coils: 15, end: "Closed and ground", quantity: 12 },
      { type: "compression", wire: 0.9, outer: 7.0, len: 24, coils: 16, end: "Closed and ground", quantity: 10 },
      { type: "compression", wire: 1.1, outer: 9.0, len: 28, coils: 15, end: "Closed and ground", quantity: 10 },
      { type: "extension", wire: 0.5, outer: 4.0, len: 20, coils: 24, end: "Full loop both ends", quantity: 12 },
      { type: "extension", wire: 0.7, outer: 5.5, len: 30, coils: 28, end: "Full loop both ends", quantity: 10 },
      { type: "torsion", wire: 0.7, outer: 6.0, len: 14, coils: 5, end: "90° straight legs", quantity: 10 },
      { type: "torsion", wire: 0.9, outer: 7.5, len: 17, coils: 6, end: "180° straight legs", quantity: 10 },
    ],
  }),

  kit({
    slug: "boat-kit",
    name: "Boat Kit",
    coverImage: "/kit-covers/boat-kit.png",
    partNumber: "2734695",
    shortText: "All-stainless springs and preload washers for deck hardware and rigging.",
    description:
      "Marine assortment in stainless throughout, for hatches, lockers, cleats, shackles and rigging hardware that sits in salt spray. Includes disc springs for keeping preload on chainplate and deck-fitting bolts, and heavy die springs for winch and windlass pawls.",
    inStock: true,
    deliveryDays: "1-2 days",
    priceEUR: 146,
    compartments: 10,
    profile: {
      actions: ["pull", "push", "rotate"],
      sizes: ["medium", "large"],
      environments: ["outdoor"],
      keywords: ["boat", "marine", "sailing", "yacht", "deck", "hatch", "locker", "rigging", "shackle", "cleat", "winch", "windlass", "salt", "saltwater", "corrosion", "stainless", "water", "dinghy"],
    },
    components: [
      { type: "compression", wire: 0.9, outer: 7.0, len: 24, coils: 16, end: "Closed and ground", material: "stainless", quantity: 10 },
      { type: "compression", wire: 1.4, outer: 11.0, len: 35, coils: 15, end: "Closed and ground", material: "stainless", quantity: 8 },
      { type: "compression", wire: 2.2, outer: 18.0, len: 55, coils: 15, end: "Closed and ground", material: "stainless", quantity: 6 },
      { type: "extension", wire: 0.8, outer: 6.5, len: 40, coils: 32, end: "Full loop both ends", material: "stainless", quantity: 10 },
      { type: "extension", wire: 1.3, outer: 11.0, len: 75, coils: 38, end: "Machine hooks both ends", material: "stainless", quantity: 8 },
      { type: "extension", wire: 1.8, outer: 15.0, len: 100, coils: 40, end: "Machine hooks both ends", material: "stainless", quantity: 6 },
      { type: "extension", wire: 2.4, outer: 20.0, len: 130, coils: 38, end: "Machine hooks both ends", material: "stainless", quantity: 4 },
      { type: "torsion", wire: 1.2, outer: 10.0, len: 24, coils: 6, end: "180° straight legs", material: "stainless", quantity: 8 },
      { type: "torsion", wire: 1.8, outer: 15.0, len: 32, coils: 7, end: "90° straight legs", material: "stainless", quantity: 6 },
      { type: "disc", wire: 0.7, outer: 16.0, len: 1.3, coils: 1, end: "Series DIN 2093 A", inner: 8.2, material: "stainless", quantity: 20, load: [210, 840] },
      { type: "disc", wire: 1.0, outer: 20.0, len: 1.75, coils: 1, end: "Series DIN 2093 A", inner: 10.2, material: "stainless", quantity: 16, load: [340, 1360] },
      { type: "die", wire: 3.0, outer: 20.0, len: 45, coils: 8, end: "Closed and ground, medium load", rect: [5.0, 3.0], material: "stainless", quantity: 6, load: [180, 900] },
      { type: "die", wire: 3.5, outer: 25.0, len: 51, coils: 8, end: "Closed and ground, heavy load", rect: [6.0, 3.5], material: "stainless", quantity: 4, load: [320, 1600] },
    ],
  }),
];

export const kitBySlug = (slug: string) => kits.find((k) => k.slug === slug);

export const allComponents = kits.flatMap((k) =>
  k.components.map((component) => ({ component, kit: k })),
);

export const testTarget = allComponents.find(({ component }) => component.isTestTarget);
