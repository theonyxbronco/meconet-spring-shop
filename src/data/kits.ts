import { buildComponent, type SpecInput } from "./build";
import { TIER_LABEL, type Kit, type KitTier, type KitUpgrade, type SpringComponent, type SpringType } from "./types";

/**
 * THE TEST SPRINGS
 *
 * Components flagged `target: true` are the physical springs participants are handed
 * and asked to locate. The scenario is a robotics workshop, so both live in the
 * Mechatro Kit:
 *
 *   spring 1   Mechatro Kit   compression, Ø5.5 × 40 mm, wire 0.50
 *   spring 2   Mechatro Kit   extension,   Ø8.0 × 46 mm, wire 1.20, full loops
 *
 * Near-misses the participant has to rule out by comparing, not by glancing:
 *
 *   Bike Kit       extension,   Ø8.0 × 50 mm, wire 1.00  (4 mm longer, hooks)
 *   Garage Kit     extension,   Ø7.0 × 47 mm, wire 0.90  (1 mm narrower, 1 mm longer)
 *   Mechatro Kit   compression, Ø5.0 × 44 mm, wire 0.90  (same box, nearly the same size)
 *
 * The spring finder's dialogue (`src/lib/search.ts`, `src/lib/dialogue.ts`) reads
 * these flags to decide what to steer towards, so it never names the kit itself.
 * Wire diameters are estimates fitted to the photographs; when the real springs are
 * measured, change the numbers here and everything downstream — code, specs,
 * drawing, 3D model, dialogue — follows. Then run `npm run check:dialogue`.
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

type KitInput = Omit<Kit, "components" | "pro"> & {
  components: SpecInput[];
  pro: Omit<KitUpgrade, "components" | "priceEUR"> & { components: SpecInput[] };
};

/** Pro is priced off Basic, to the whole euro every price in the shop is shown in. */
const PRO_PRICE_FACTOR = 1.6;

const kit = (kit: KitInput): Kit => ({
  ...kit,
  components: kit.components.map(buildComponent),
  pro: {
    ...kit.pro,
    priceEUR: Math.round(kit.priceEUR * PRO_PRICE_FACTOR),
    components: kit.pro.components.map(buildComponent),
  },
});

export const kits: Kit[] = [
  kit({
    slug: "garage-kit",
    name: "Garage Kit",
    family: "Garage",
    coverImage: "/kit-covers/Garage_Kit.png",
    thumbnailImage: "/kit-covers/Garage_Thumbnail.png",
    partNumber: "2734645",
    shortText: "Mixed box of compression, extension and torsion springs for everyday repairs.",
    description:
      "Practical box with spiral springs and other types of springs in different models and dimensions. Covers the sizes most often needed for door hardware, latches, hinges and general maintenance work.",
    inStock: true,
    deliveryDays: "1-2 days",
    priceEUR: 18,
    compartments: 18,
    profile: {
      actions: ["pull", "push", "rotate"],
      sizes: ["small", "medium"],
      environments: ["indoor", "outdoor"],
      keywords: ["garage", "door", "gate", "hinge", "latch", "repair", "mixed", "general", "home", "diy", "tool", "lock", "handle", "car", "bonnet", "boot"],
    },
    pro: {
      partNumber: "2734646",
      compartments: 26,
      summary: "Adds the heavy end — long extension springs, thick compression sizes and disc washers for bolted joints.",
      description:
        "The Garage range extended upwards: the same everyday sizes plus the heavier springs a job turns out to need once the panel is off — longer extension springs for bonnets and tailgates, thicker compression sizes for pedal and linkage returns, and disc springs for keeping preload on a bolted joint.",
      components: [
        { type: "compression", wire: 2.6, outer: 20.0, len: 65, coils: 14, end: "Closed and ground", quantity: 6 },
        { type: "compression", wire: 3.2, outer: 25.0, len: 80, coils: 13, end: "Closed and ground", quantity: 4 },
        { type: "extension", wire: 2.0, outer: 16.0, len: 120, coils: 44, end: "Machine hooks both ends", quantity: 4 },
        { type: "extension", wire: 2.4, outer: 18.0, len: 150, coils: 46, end: "Machine hooks both ends", quantity: 4 },
        { type: "torsion", wire: 1.8, outer: 15.0, len: 34, coils: 7, end: "270° crossed legs", quantity: 6 },
        { type: "disc", wire: 1.0, outer: 20.0, len: 1.75, coils: 1, end: "Series DIN 2093 A", inner: 10.2, quantity: 12, load: [340, 1360] },
      ],
    },
    components: [
      { type: "compression", wire: 0.8, outer: 6.0, len: 20, coils: 15, end: "Closed and ground", quantity: 10 },
      { type: "compression", wire: 1.0, outer: 8.0, len: 25, coils: 15, end: "Closed and ground", quantity: 10 },
      { type: "compression", wire: 1.4, outer: 12.0, len: 38, coils: 16, end: "Closed and ground", quantity: 8 },
      { type: "compression", wire: 2.0, outer: 16.0, len: 50, coils: 15, end: "Closed and ground", quantity: 6 },
      { type: "extension", wire: 0.7, outer: 5.5, len: 32, coils: 30, end: "Full loop both ends", quantity: 10 },
      { type: "extension", wire: 0.9, outer: 7.0, len: 47, coils: 38, end: "Full loop both ends", quantity: 10 },
      { type: "extension", wire: 1.2, outer: 10.0, len: 70, coils: 40, end: "Machine hooks both ends", quantity: 8 },
      { type: "extension", wire: 1.6, outer: 14.0, len: 95, coils: 42, end: "Machine hooks both ends", quantity: 6 },
      { type: "torsion", wire: 1.0, outer: 9.0, len: 22, coils: 6, end: "90° straight legs", quantity: 8 },
      { type: "torsion", wire: 1.4, outer: 12.0, len: 28, coils: 7, end: "180° straight legs", quantity: 8 },
    ],
  }),

  kit({
    slug: "mechatro-kit",
    name: "Mechatro Kit",
    family: "Mechatro",
    coverImage: "/kit-covers/Mechatro_Kit.png",
    thumbnailImage: "/kit-covers/Mechatro_Thumbnail.png",
    partNumber: "2734689",
    shortText: "Precision springs for actuators, grippers, limit switches and servo linkages.",
    description:
      "Springs for robot grippers, actuators, limit switches and other moving machine parts. Compression springs push back, extension springs pull back, and torsion springs twist back. Precisely sized and mostly stainless steel.",
    inStock: true,
    deliveryDays: "1-2 days",
    priceEUR: 20,
    compartments: 12,
    profile: {
      actions: ["push", "pull", "rotate"],
      sizes: ["small", "medium"],
      environments: ["indoor"],
      keywords: ["mechatro", "mechatronic", "mechatronics", "robot", "robots", "robotic", "robotics", "arduino", "raspberry pi", "makerspace", "maker", "stem", "lego", "automation", "actuator", "gripper", "servo", "linkage", "sensor", "limit switch", "end stop", "precision", "electronics", "machine", "cnc", "3d printer", "prototype"],
    },
    pro: {
      partNumber: "2734690",
      compartments: 22,
      summary: "Adds the fine end and the strong end — sub-5 mm springs for small mechanisms, plus heavier sizes for load-bearing joints.",
      description:
        "Everything in the Basic box, with the range opened out at both ends: sub-5 mm springs fine enough for micro switches, pick-and-place fingers and printed prototypes, and heavier compression and extension sizes for joints that carry a load. Stainless throughout, with disc springs for preloading bolted actuator mounts.",
      components: [
        { type: "compression", wire: 0.6, outer: 4.0, len: 16, coils: 14, end: "Closed and ground", material: "stainless", quantity: 14 },
        { type: "compression", wire: 0.8, outer: 4.5, len: 25, coils: 18, end: "Closed and ground", material: "stainless", quantity: 12 },
        { type: "compression", wire: 1.6, outer: 7.5, len: 55, coils: 24, end: "Closed and ground", material: "stainless", quantity: 8 },
        { type: "compression", wire: 2.6, outer: 14.0, len: 60, coils: 14, end: "Closed and ground", material: "stainless", quantity: 6 },
        { type: "extension", wire: 0.6, outer: 5.0, len: 30, coils: 34, end: "Full loop both ends", material: "stainless", quantity: 12 },
        { type: "extension", wire: 0.9, outer: 7.0, len: 36, coils: 28, end: "Full loop both ends", material: "stainless", quantity: 10 },
        { type: "extension", wire: 1.6, outer: 12.0, len: 80, coils: 42, end: "Machine hooks both ends", material: "stainless", quantity: 6 },
        { type: "torsion", wire: 0.7, outer: 5.5, len: 14, coils: 6, end: "90° straight legs", material: "stainless", quantity: 14 },
        { type: "torsion", wire: 2.0, outer: 16.0, len: 38, coils: 4, end: "180° straight legs", material: "stainless", quantity: 6 },
        { type: "disc", wire: 0.5, outer: 12.0, len: 0.95, coils: 1, end: "Series DIN 2093 A", inner: 6.2, material: "stainless", quantity: 20, load: [120, 480] },
      ],
    },
    components: [
      // The Basic box is the one in the opened-kit photograph, so its twelve springs are
      // the twelve on that lid label — same sizes, same counts. Wire gauges and coil
      // counts are estimated from the photo: compression pitch near 1.8–2.2 × wire,
      // extension coils touching.

      // Compression. The first is test spring 1, Ø5.5 × 40: its long, thin photograph
      // is the one in the kit with those proportions.
      { type: "compression", wire: 0.5, outer: 5.5, len: 40, coils: 22, end: "Closed and ground", material: "stainless", quantity: 10, target: true, photo: S("minimalist-steel-compression-spring"), drawings: COMPRESSION_SHEETS },
      { type: "compression", wire: 1.0, outer: 7.0, len: 13, coils: 7, end: "Closed and ground", material: "stainless", quantity: 10, photo: S("polished-silver-compression-spring"), drawings: COMPRESSION_SHEETS },
      { type: "compression", wire: 1.2, outer: 9.0, len: 15, coils: 6, end: "Closed and ground", material: "stainless", quantity: 12, photo: S("polished-chrome-compression-spring"), drawings: COMPRESSION_SHEETS },
      { type: "compression", wire: 1.4, outer: 9.0, len: 19, coils: 7, end: "Closed and ground", material: "stainless", quantity: 12, photo: S("polished-stainless-steel-compression-spring-1"), drawings: COMPRESSION_SHEETS },
      { type: "compression", wire: 0.9, outer: 5.0, len: 44, coils: 22, end: "Closed and ground", material: "stainless", quantity: 8, photo: S("polished-stainless-steel-compression-spring"), drawings: COMPRESSION_SHEETS },

      // Extension, all closing into a full loop at each end. The first is test spring
      // 2, Ø8 × 46: 26 coils of 1.2 wire sit touching, as in its photograph, over the
      // body length that 46 mm leaves after the two loops. The Ø6 × 12 is shorter than
      // its own coils and loops can be drawn, so its model runs a little over 12 mm.
      { type: "extension", wire: 1.2, outer: 8.0, len: 46, coils: 26, end: "Full loop both ends", material: "stainless", quantity: 10, target: true, photo: S("polished-diagonal-extension-spring"), drawings: EXTENSION_LOOP_SHEETS },
      { type: "extension", wire: 0.6, outer: 5.0, len: 20, coils: 18, end: "Full loop both ends", material: "stainless", quantity: 10, photo: S("polished-stainless-steel-extension-spring"), drawings: EXTENSION_LOOP_SHEETS },
      { type: "extension", wire: 0.9, outer: 8.0, len: 28, coils: 15, end: "Full loop both ends", material: "stainless", quantity: 8, photo: S("polished-diagonal-extension-spring-2"), drawings: EXTENSION_LOOP_SHEETS },
      { type: "extension", wire: 0.5, outer: 6.0, len: 12, coils: 10, end: "Full loop both ends", material: "stainless", quantity: 10, photo: S("polished-metal-extension-spring"), drawings: EXTENSION_LOOP_SHEETS },

      // Torsion — hinge, flap and lever returns. Their second number is leg length.
      { type: "torsion", wire: 0.8, outer: 6.0, len: 28, coils: 5, end: "90° straight legs", material: "stainless", quantity: 15, photo: S("polished-l-shaped-torsion-spring"), drawings: TORSION_SHEETS },
      { type: "torsion", wire: 0.7, outer: 6.0, len: 13, coils: 4, end: "Straight legs, tangential", material: "stainless", quantity: 12, photo: S("polished-stainless-steel-torsion-spring"), drawings: TORSION_SHEETS },
      { type: "torsion", wire: 1.2, outer: 11.0, len: 29, coils: 3, end: "270° crossed legs", material: "stainless", quantity: 12, photo: S("polished-crossed-arm-torsion-spring"), drawings: TORSION_SHEETS },
    ],
    // The opened box, shown straight after the lid. It is the Basic layout that is
    // photographed, so Pro — which fills more compartments — does not claim it.
    galleryImages: [
      { src: "/kit-covers/Open_Kit.png", label: "Mechatro Kit, opened", tier: "basic" },
    ],
  }),

  kit({
    slug: "bike-kit",
    name: "Bike Kit",
    family: "Bike",
    coverImage: "/kit-covers/Bike_Kit.png",
    thumbnailImage: "/kit-covers/Bike_Thumbnail.png",
    partNumber: "2734651",
    shortText: "Small corrosion-resistant springs for brake, lever and folding mechanisms.",
    description:
      "A compact selection of small-diameter springs for cable-operated brakes, shifters, kickstands, folding joints and quick-release levers. Predominantly stainless, for parts that live outdoors.",
    inStock: true,
    deliveryDays: "1-2 days",
    priceEUR: 16,
    compartments: 12,
    profile: {
      actions: ["pull", "rotate"],
      sizes: ["small", "medium"],
      environments: ["outdoor"],
      keywords: ["bike", "bicycle", "brake", "lever", "cable", "derailleur", "kickstand", "scooter", "folding", "wheelchair", "pram", "stroller", "mobility", "clip"],
    },
    pro: {
      partNumber: "2734652",
      compartments: 20,
      summary: "Adds cargo and e-bike sizes — longer cable springs, stiffer returns and a finer set for shifter detents.",
      description:
        "The Bike range widened for cargo bikes, e-bikes and workshop use: longer cable springs for racks and double stands, stiffer returns for heavier calipers, and a fine set for shifter and detent work. Stainless throughout, as the Basic box is.",
      components: [
        { type: "extension", wire: 0.5, outer: 4.0, len: 26, coils: 28, end: "Full loop both ends", material: "stainless", quantity: 12 },
        { type: "extension", wire: 1.2, outer: 9.0, len: 60, coils: 38, end: "Machine hooks both ends", material: "stainless", quantity: 8 },
        { type: "extension", wire: 1.4, outer: 11.0, len: 80, coils: 40, end: "Machine hooks both ends", material: "stainless", quantity: 6 },
        { type: "compression", wire: 1.2, outer: 9.0, len: 30, coils: 16, end: "Closed and ground", material: "stainless", quantity: 10 },
        { type: "compression", wire: 1.6, outer: 12.0, len: 40, coils: 15, end: "Closed and ground", material: "stainless", quantity: 8 },
        { type: "torsion", wire: 1.4, outer: 12.0, len: 24, coils: 6, end: "270° crossed legs", material: "stainless", quantity: 8 },
      ],
    },
    components: [
      { type: "extension", wire: 0.6, outer: 4.5, len: 24, coils: 26, end: "Full loop both ends", material: "stainless", quantity: 10 },
      { type: "extension", wire: 0.8, outer: 6.0, len: 38, coils: 32, end: "Machine hooks both ends", material: "stainless", quantity: 10 },
      { type: "extension", wire: 1.0, outer: 8.0, len: 50, coils: 36, end: "Machine hooks both ends", quantity: 8 },
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
    family: "Trampoline",
    coverImage: "/kit-covers/Trampoline_Kit.png",
    thumbnailImage: "/kit-covers/Trampoline_Thumbnail.png",
    partNumber: "2734668",
    shortText: "Long heavy-duty extension springs for outdoor equipment under repeated load.",
    description:
      "Long-travel extension springs sized for garden and outdoor equipment that cycles under load all season. Stainless and heavily zinc-plated finishes resist weather and standing moisture.",
    inStock: true,
    deliveryDays: "1-2 days",
    priceEUR: 22,
    compartments: 8,
    profile: {
      actions: ["pull"],
      sizes: ["large", "medium"],
      environments: ["outdoor"],
      keywords: ["trampoline", "garden", "outdoor", "gate", "weather", "rust", "heavy", "long", "jump", "canopy", "awning", "tension", "exercise", "frame"],
    },
    pro: {
      partNumber: "2734669",
      compartments: 16,
      summary: "Adds the long sizes for full-size frames, plus heavy compression springs for gate closers and awning arms.",
      description:
        "The Trampoline range taken out to the lengths full-size frames and awning arms actually need, with heavy compression springs for gate closers and tailboards. Stainless or heavily plated, for parts left out over winter.",
      components: [
        { type: "extension", wire: 3.8, outer: 32.0, len: 210, coils: 36, end: "Machine hooks both ends", material: "stainless", quantity: 4 },
        { type: "extension", wire: 4.2, outer: 35.0, len: 240, coils: 36, end: "Machine hooks both ends", material: "stainless", quantity: 4 },
        { type: "extension", wire: 1.8, outer: 15.0, len: 95, coils: 36, end: "Machine hooks both ends", quantity: 6 },
        { type: "compression", wire: 3.2, outer: 26.0, len: 85, coils: 13, end: "Closed and ground", material: "stainless", quantity: 4 },
        { type: "compression", wire: 4.0, outer: 32.0, len: 110, coils: 12, end: "Closed and ground", material: "stainless", quantity: 4 },
      ],
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
    family: "Home",
    coverImage: "/kit-covers/Home_Kit.png",
    thumbnailImage: "/kit-covers/Home_Thumbnail.png",
    partNumber: "2734672",
    shortText: "Light indoor springs for drawers, catches, hinges and small fittings.",
    description:
      "Light-duty springs for furniture and fittings around the house — drawer runners, ball catches, flap stays, cabinet hinges and small push-to-open fittings. Sized for low loads and short travel indoors.",
    inStock: true,
    deliveryDays: "1-2 days",
    priceEUR: 15,
    compartments: 15,
    profile: {
      actions: ["push", "rotate", "pull"],
      sizes: ["small"],
      environments: ["indoor"],
      keywords: ["home", "house", "furniture", "drawer", "cabinet", "hinge", "catch", "fitting", "flap", "indoor", "light", "small", "kitchen", "wardrobe", "desk", "chair", "blind", "curtain"],
    },
    pro: {
      partNumber: "2734673",
      compartments: 24,
      summary: "Adds the very small sizes and a set of torsion springs for flaps, blinds and push-to-open fittings.",
      description:
        "The Home range extended downwards into the sizes that fail in small fittings — pen-barrel and ball-catch springs, fine extension springs for blind mechanisms — plus a wider spread of torsion springs for flaps, lids and push-to-open hardware.",
      components: [
        { type: "compression", wire: 0.3, outer: 2.5, len: 8, coils: 12, end: "Closed ends", quantity: 16 },
        { type: "compression", wire: 0.4, outer: 3.2, len: 10, coils: 13, end: "Closed ends", quantity: 16 },
        { type: "compression", wire: 1.4, outer: 11.0, len: 34, coils: 15, end: "Closed and ground", quantity: 8 },
        { type: "extension", wire: 0.4, outer: 3.2, len: 16, coils: 22, end: "Full loop both ends", quantity: 14 },
        { type: "extension", wire: 0.9, outer: 7.0, len: 38, coils: 30, end: "Machine hooks both ends", quantity: 10 },
        { type: "torsion", wire: 0.5, outer: 4.5, len: 11, coils: 5, end: "90° straight legs", quantity: 14 },
        { type: "torsion", wire: 1.1, outer: 9.0, len: 20, coils: 6, end: "270° crossed legs", quantity: 10 },
      ],
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
    family: "Boat",
    coverImage: "/kit-covers/Boat_Kit.png",
    thumbnailImage: "/kit-covers/Boat_Thumbnail.png",
    partNumber: "2734695",
    shortText: "All-stainless springs and preload washers for deck hardware and rigging.",
    description:
      "Marine assortment in stainless throughout, for hatches, lockers, cleats, shackles and rigging hardware that sits in salt spray. Includes disc springs for keeping preload on chainplate and deck-fitting bolts, and heavy die springs for winch and windlass pawls.",
    inStock: true,
    deliveryDays: "1-2 days",
    priceEUR: 25,
    compartments: 10,
    profile: {
      actions: ["pull", "push", "rotate"],
      sizes: ["medium", "large"],
      environments: ["outdoor"],
      keywords: ["boat", "marine", "sailing", "yacht", "deck", "hatch", "locker", "rigging", "shackle", "cleat", "winch", "windlass", "salt", "saltwater", "corrosion", "stainless", "water", "dinghy"],
    },
    pro: {
      partNumber: "2734696",
      compartments: 18,
      summary: "Adds larger stainless sizes and a wider spread of disc and die springs for rigging and winch work.",
      description:
        "The marine range extended for bigger boats: larger stainless compression and extension sizes for hatches, boarding ladders and tensioners, a wider spread of disc springs for chainplate and deck-fitting preload, and a heavier die spring for winch pawls.",
      components: [
        { type: "compression", wire: 3.0, outer: 24.0, len: 70, coils: 14, end: "Closed and ground", material: "stainless", quantity: 6 },
        { type: "extension", wire: 3.0, outer: 24.0, len: 160, coils: 38, end: "Machine hooks both ends", material: "stainless", quantity: 4 },
        { type: "extension", wire: 1.0, outer: 8.0, len: 52, coils: 34, end: "Full loop both ends", material: "stainless", quantity: 8 },
        { type: "torsion", wire: 2.2, outer: 18.0, len: 40, coils: 6, end: "270° crossed legs", material: "stainless", quantity: 6 },
        { type: "disc", wire: 1.25, outer: 25.0, len: 2.15, coils: 1, end: "Series DIN 2093 A", inner: 12.2, material: "stainless", quantity: 12, load: [520, 2080] },
        { type: "disc", wire: 1.5, outer: 31.5, len: 2.6, coils: 1, end: "Series DIN 2093 A", inner: 16.3, material: "stainless", quantity: 10, load: [690, 2760] },
        { type: "die", wire: 4.0, outer: 32.0, len: 64, coils: 8, end: "Closed and ground, heavy load", rect: [7.5, 4.0], material: "stainless", quantity: 4, load: [500, 2500] },
      ],
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

/**
 * A kit as one of its two builds: Pro is the Basic contents plus whatever the
 * upgrade adds, so a spring never has to be listed twice to appear in both boxes.
 */
export interface KitVariant {
  tier: KitTier;
  /** "Mechatro Basic Kit" / "Mechatro Pro Kit". */
  name: string;
  partNumber: string;
  priceEUR: number;
  compartments: number;
  description: string;
  components: SpringComponent[];
}

export const variantName = (kit: Kit, tier: KitTier) => `${kit.family} ${TIER_LABEL[tier]} Kit`;

export function kitVariant(kit: Kit, tier: KitTier): KitVariant {
  const name = variantName(kit, tier);
  if (tier === "basic") {
    return {
      tier,
      name,
      partNumber: kit.partNumber,
      priceEUR: kit.priceEUR,
      compartments: kit.compartments,
      description: kit.description,
      components: kit.components,
    };
  }
  return {
    tier,
    name,
    partNumber: kit.pro.partNumber,
    priceEUR: kit.pro.priceEUR,
    compartments: kit.pro.compartments,
    description: kit.pro.description,
    components: [...kit.components, ...kit.pro.components],
  };
}

/** The build a part number belongs to, for a cart or order line. */
export const variantByPartNumber = (kit: Kit, partNumber: string): KitVariant =>
  kitVariant(kit, partNumber === kit.pro.partNumber ? "pro" : "basic");

export const pieceCount = (components: SpringComponent[]) =>
  components.reduce((total, component) => total + component.quantity, 0);


export const allComponents = kits.flatMap((k) =>
  k.components.map((component) => ({ component, kit: k })),
);

/** One spring as the shop sells it: inside one build of one kit. */
export interface SpringListing {
  component: SpringComponent;
  kit: Kit;
  /** The cheapest build that contains it — Basic, unless only Pro adds it. */
  tier: KitTier;
}

/**
 * Every spring of one type across the whole range, Pro-only sizes included — what
 * the spring-type tabs list. Each spring is in exactly one kit, so nothing repeats.
 */
export const springsOfType = (type: SpringType): SpringListing[] =>
  kits.flatMap((kit) => [
    ...kit.components.filter((c) => c.type === type).map((component) => ({ component, kit, tier: "basic" as const })),
    ...kit.pro.components.filter((c) => c.type === type).map((component) => ({ component, kit, tier: "pro" as const })),
  ]);

/** The springs participants are handed, in catalogue order. */
export const testTargets = allComponents.filter(({ component }) => component.isTestTarget);
