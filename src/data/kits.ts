import { buildComponent, type SpecInput } from "./build";
import type { Kit } from "./types";

/**
 * THE TEST TARGET
 *
 * Exactly one component in the catalogue is flagged `target: true` — the spring a
 * participant is handed physically and asked to locate. Two deliberate near-misses
 * sit in other kits so the task cannot be passed by glancing at a thumbnail:
 *
 *   target      Garage Kit            extension, Ø10.0 × 70 mm, wire 1.20
 *   near-miss   Workshop Maintenance  extension, Ø10.0 × 65 mm, wire 1.20  (5 mm shorter)
 *   near-miss   Trampoline & Outdoor  extension, Ø12.0 × 70 mm, wire 1.40  (same length, heavier)
 *
 * When the real physical spring is measured, change the target's numbers here and
 * everything downstream — code, specs, drawing, 3D model — follows automatically.
 */

const kit = (kit: Omit<Kit, "components"> & { components: SpecInput[] }): Kit => ({
  ...kit,
  components: kit.components.map(buildComponent),
});

export const kits: Kit[] = [
  kit({
    slug: "garage-kit",
    name: "Garage Kit",
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
      keywords: ["garage", "door", "gate", "hinge", "latch", "workshop", "repair", "mixed", "general", "home", "diy", "tool", "lock", "handle"],
    },
    components: [
      { type: "compression", wire: 0.8, outer: 6.0, len: 20, coils: 8, end: "Closed and ground", quantity: 10 },
      { type: "compression", wire: 1.0, outer: 8.0, len: 25, coils: 9, end: "Closed and ground", quantity: 10 },
      { type: "compression", wire: 1.4, outer: 12.0, len: 38, coils: 8, end: "Closed and ground", quantity: 8 },
      { type: "compression", wire: 2.0, outer: 16.0, len: 50, coils: 7, end: "Closed and ground", quantity: 6 },
      { type: "extension", wire: 0.7, outer: 5.5, len: 32, coils: 30, end: "Full loop both ends", quantity: 10 },
      { type: "extension", wire: 0.9, outer: 7.0, len: 45, coils: 36, end: "Full loop both ends", quantity: 10 },
      { type: "extension", wire: 1.2, outer: 10.0, len: 70, coils: 40, end: "Machine hooks both ends", quantity: 8, target: true },
      { type: "extension", wire: 1.6, outer: 14.0, len: 95, coils: 42, end: "Machine hooks both ends", quantity: 6 },
      { type: "torsion", wire: 1.0, outer: 9.0, len: 22, coils: 6, end: "90° straight legs", quantity: 8 },
      { type: "torsion", wire: 1.4, outer: 12.0, len: 28, coils: 7, end: "180° straight legs", quantity: 8 },
    ],
  }),

  kit({
    slug: "bicycle-mobility-kit",
    name: "Bicycle & Mobility Kit",
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
      keywords: ["bicycle", "bike", "brake", "lever", "cable", "derailleur", "kickstand", "scooter", "folding", "wheelchair", "pram", "stroller", "mobility", "clip"],
    },
    components: [
      { type: "extension", wire: 0.6, outer: 4.5, len: 24, coils: 26, end: "Full loop both ends", material: "stainless", quantity: 10 },
      { type: "extension", wire: 0.8, outer: 6.0, len: 38, coils: 32, end: "Machine hooks both ends", material: "stainless", quantity: 10 },
      { type: "extension", wire: 1.0, outer: 8.0, len: 48, coils: 34, end: "Machine hooks both ends", material: "stainless", quantity: 8 },
      { type: "torsion", wire: 0.8, outer: 7.0, len: 16, coils: 5, end: "90° straight legs", material: "stainless", quantity: 10 },
      { type: "torsion", wire: 1.0, outer: 8.0, len: 18, coils: 6, end: "Straight legs, tangential", material: "stainless", quantity: 10 },
      { type: "torsion", wire: 1.2, outer: 10.0, len: 20, coils: 6, end: "180° straight legs", material: "stainless", quantity: 8 },
      { type: "compression", wire: 0.6, outer: 5.0, len: 16, coils: 7, end: "Closed and ground", material: "stainless", quantity: 12 },
      { type: "compression", wire: 0.9, outer: 7.0, len: 22, coils: 8, end: "Closed and ground", material: "stainless", quantity: 10 },
    ],
  }),

  kit({
    slug: "trampoline-outdoor-kit",
    name: "Trampoline & Outdoor Kit",
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
      { type: "compression", wire: 2.5, outer: 20.0, len: 60, coils: 8, end: "Closed and ground", material: "stainless", quantity: 6 },
    ],
  }),

  kit({
    slug: "furniture-fittings-kit",
    name: "Furniture & Fittings Kit",
    partNumber: "2734672",
    shortText: "Light indoor springs for drawers, catches, hinges and small fittings.",
    description:
      "Light-duty springs for furniture hardware — drawer runners, ball catches, flap stays, cabinet hinges and small push-to-open fittings. Sized for low loads and short travel indoors.",
    inStock: true,
    deliveryDays: "1-2 days",
    priceEUR: 58,
    compartments: 15,
    profile: {
      actions: ["push", "rotate", "pull"],
      sizes: ["small"],
      environments: ["indoor"],
      keywords: ["furniture", "drawer", "cabinet", "hinge", "catch", "fitting", "flap", "indoor", "light", "small", "kitchen", "wardrobe", "desk", "chair"],
    },
    components: [
      { type: "compression", wire: 0.5, outer: 4.0, len: 12, coils: 6, end: "Closed ends", quantity: 12 },
      { type: "compression", wire: 0.7, outer: 5.0, len: 18, coils: 7, end: "Closed and ground", quantity: 12 },
      { type: "compression", wire: 0.9, outer: 7.0, len: 24, coils: 8, end: "Closed and ground", quantity: 10 },
      { type: "compression", wire: 1.1, outer: 9.0, len: 28, coils: 8, end: "Closed and ground", quantity: 10 },
      { type: "extension", wire: 0.5, outer: 4.0, len: 20, coils: 24, end: "Full loop both ends", quantity: 12 },
      { type: "extension", wire: 0.7, outer: 5.5, len: 30, coils: 28, end: "Full loop both ends", quantity: 10 },
      { type: "torsion", wire: 0.7, outer: 6.0, len: 14, coils: 5, end: "90° straight legs", quantity: 10 },
      { type: "torsion", wire: 0.9, outer: 7.5, len: 17, coils: 6, end: "180° straight legs", quantity: 10 },
    ],
  }),

  kit({
    slug: "appliance-electronics-kit",
    name: "Appliance & Electronics Kit",
    partNumber: "2734689",
    shortText: "Miniature stainless springs and disc washers for contacts and small assemblies.",
    description:
      "Miniature springs for electrical contacts, battery terminals, switches and small moving assemblies. Includes disc springs for maintaining preload on bolted and bonded joints.",
    inStock: true,
    deliveryDays: "1-2 days",
    priceEUR: 72,
    compartments: 20,
    profile: {
      actions: ["push", "pull"],
      sizes: ["small"],
      environments: ["indoor"],
      keywords: ["appliance", "electronics", "contact", "battery", "switch", "terminal", "miniature", "tiny", "micro", "circuit", "washer", "preload", "connector", "device"],
    },
    components: [
      { type: "compression", wire: 0.3, outer: 2.5, len: 8, coils: 6, end: "Closed ends", material: "stainless", quantity: 20 },
      { type: "compression", wire: 0.4, outer: 3.0, len: 10, coils: 6, end: "Closed ends", material: "stainless", quantity: 20 },
      { type: "compression", wire: 0.5, outer: 3.5, len: 14, coils: 7, end: "Closed and ground", material: "stainless", quantity: 16 },
      { type: "compression", wire: 0.6, outer: 4.5, len: 16, coils: 7, end: "Closed and ground", material: "stainless", quantity: 16 },
      { type: "extension", wire: 0.35, outer: 3.0, len: 14, coils: 22, end: "Full loop both ends", material: "stainless", quantity: 16 },
      { type: "extension", wire: 0.45, outer: 3.5, len: 18, coils: 24, end: "Full loop both ends", material: "stainless", quantity: 16 },
      { type: "torsion", wire: 0.5, outer: 4.0, len: 10, coils: 5, end: "90° straight legs", material: "stainless", quantity: 14 },
      { type: "disc", wire: 0.5, outer: 12.0, len: 0.95, coils: 1, end: "Series DIN 2093 A", inner: 6.2, material: "stainless", quantity: 20, load: [120, 480] },
      { type: "disc", wire: 0.7, outer: 16.0, len: 1.3, coils: 1, end: "Series DIN 2093 A", inner: 8.2, material: "stainless", quantity: 20, load: [210, 840] },
    ],
  }),

  kit({
    slug: "workshop-maintenance-kit",
    name: "Workshop Maintenance Kit",
    partNumber: "2734695",
    shortText: "Heavy compression and die springs for machinery, jigs and tooling.",
    description:
      "Heavy-section compression and rectangular-wire die springs for machine guards, clamping jigs, press tooling and industrial maintenance. Colour-coded die springs follow ISO 10243 load classes.",
    inStock: true,
    deliveryDays: "1-2 days",
    priceEUR: 146,
    compartments: 10,
    profile: {
      actions: ["push", "pull"],
      sizes: ["medium", "large"],
      environments: ["indoor"],
      keywords: ["workshop", "machine", "industrial", "die", "press", "tooling", "jig", "clamp", "heavy", "maintenance", "factory", "mould", "guard", "strong"],
    },
    components: [
      { type: "extension", wire: 1.2, outer: 10.0, len: 65, coils: 36, end: "Machine hooks both ends", quantity: 6 },
      { type: "compression", wire: 2.2, outer: 18.0, len: 55, coils: 8, end: "Closed and ground", quantity: 8 },
      { type: "compression", wire: 3.0, outer: 24.0, len: 70, coils: 8, end: "Closed and ground", quantity: 6 },
      { type: "compression", wire: 3.5, outer: 28.0, len: 80, coils: 8, end: "Closed and ground", quantity: 6 },
      { type: "torsion", wire: 2.0, outer: 16.0, len: 35, coils: 7, end: "180° straight legs", quantity: 6 },
      { type: "die", wire: 3.0, outer: 20.0, len: 45, coils: 6, end: "Closed and ground, light load", rect: [5.0, 3.0], quantity: 6, load: [180, 900] },
      { type: "die", wire: 3.5, outer: 25.0, len: 51, coils: 6, end: "Closed and ground, medium load", rect: [6.0, 3.5], quantity: 6, load: [320, 1600] },
      { type: "die", wire: 4.0, outer: 32.0, len: 64, coils: 6, end: "Closed and ground, heavy load", rect: [7.5, 4.0], quantity: 4, load: [540, 2700] },
    ],
  }),
];

export const kitBySlug = (slug: string) => kits.find((k) => k.slug === slug);

export const allComponents = kits.flatMap((k) =>
  k.components.map((component) => ({ component, kit: k })),
);

export const testTarget = allComponents.find(({ component }) => component.isTestTarget);
