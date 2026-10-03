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

export interface Kit {
  slug: string;
  name: string;
  /** Lid label artwork, served from `public/kit-covers`. */
  coverImage: string;
  partNumber: string;
  shortText: string;
  description: string;
  inStock: boolean;
  deliveryDays: string;
  priceEUR: number;
  compartments: number;
  profile: KitProfile;
  components: SpringComponent[];
}

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
