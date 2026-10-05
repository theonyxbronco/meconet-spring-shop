/**
 * Catalogue types for the Meconet Spring Shop prototype.
 *
 * Every number here is consumed three times over: it renders the spec table,
 * it generates the 3D geometry, and it generates the dimensioned 2D drawing.
 * Keeping one source means the model a participant inspects can never disagree
 * with the numbers they are reading next to it.
 */

export type SpringType = "compression" | "extension" | "torsion" | "die" | "disc";

/** The three functional axes the guided search narrows a user down to. */
export type SpringAction = "pull" | "push" | "rotate";
export type SizeBand = "small" | "medium" | "large";
export type Environment = "indoor" | "outdoor";

export interface SpringComponent {
  id: string;
  code: string;
  name: string;
  type: SpringType;
  /** Wire diameter in mm. For disc springs this is the material thickness. */
  wireDiameter: number;
  outerDiameter: number;
  /** For disc springs this is the free overall height. */
  freeLength: number;
  /** Total coils. Disc springs are a single element. */
  coils: number;
  endType: string;
  /** Rectangular section for die springs, in mm. */
  rectSection?: { width: number; height: number };
  /** Bore for disc springs, in mm. */
  innerDiameter?: number;
  loadRange: [number, number];
  loadUnit: "N" | "N·mm";
  springRate: number;
  rateUnit: "N/mm" | "N·mm/°";
  material: string;
  finish: string;
  /** How many of this spring the kit contains. */
  quantity: number;
  sizeBand: SizeBand;
  action: SpringAction;
  /** Set on the single component a test participant is asked to find. */
  isTestTarget?: boolean;
  /** Drop in a .glb path here and the viewer loads it instead of generating geometry. */
  modelUrl?: string;
  /** Studio photograph of the real part, shown in place of the generated illustration. */
  photoUrl?: string;
  /**
   * Orthographic drawing sheets for this part, most representative first. When a
   * component has these, the Drawing view shows them instead of the generated SVG.
   */
  drawings?: string[];
}

export interface KitProfile {
  actions: SpringAction[];
  sizes: SizeBand[];
  environments: Environment[];
  /** Free-text terms a participant might open the conversation with. */
  keywords: string[];
}

/**
 * Every kit is sold in two builds. Basic is the box on the lid art; Pro is the same
 * box with the range extended at both ends, so the fields that differ between them —
 * part number, price, compartment count and the springs inside — are the ones a Pro
 * upgrade carries. Everything else (artwork, delivery, search profile) is shared.
 */
export type KitTier = "basic" | "pro";

export interface KitUpgrade {
  partNumber: string;
  priceEUR: number;
  compartments: number;
  /** One line on what the extra money buys, shown beside the tier buttons. */
  summary: string;
  description: string;
  /** The springs Pro adds on top of the Basic set, not the whole Pro contents. */
  components: SpringComponent[];
}

export interface KitPhoto {
  src: string;
  label: string;
  tier?: KitTier;
}

export interface Kit {
  slug: string;
  name: string;
  /** The kit without "Kit" on the end, so a build can be named "<family> Pro Kit". */
  family: string;
  /** Lid artwork at full size, served from `public/kit-covers`. */
  coverImage: string;
  /** The same lid, cropped tighter for the small art on cards and cart lines. */
  thumbnailImage: string;
  partNumber: string;
  shortText: string;
  description: string;
  inStock: boolean;
  deliveryDays: string;
  priceEUR: number;
  compartments: number;
  profile: KitProfile;
  components: SpringComponent[];
  /** Photographs shown after the lid in the gallery; `tier` pins one to a build. */
  galleryImages?: KitPhoto[];
  pro: KitUpgrade;
}

export const TIER_LABEL: Record<KitTier, string> = { basic: "Basic", pro: "Pro" };

export const SPRING_TYPE_LABEL: Record<SpringType, string> = {
  compression: "Compression spring",
  extension: "Extension spring",
  torsion: "Torsion spring",
  die: "Die spring",
  disc: "Disc spring",
};

export const ACTION_LABEL: Record<SpringAction, string> = {
  pull: "Pulls things together",
  push: "Pushes things apart",
  rotate: "Returns a lever or hinge",
};

export const SIZE_LABEL: Record<SizeBand, string> = {
  small: "Small — under 30 mm",
  medium: "Medium — 30 to 80 mm",
  large: "Large — over 80 mm",
};

export const ENVIRONMENT_LABEL: Record<Environment, string> = {
  indoor: "Indoors / dry",
  outdoor: "Outdoors / damp",
};
