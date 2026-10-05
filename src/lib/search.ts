import { kits, testTargets } from "@/data/kits";
import { SPRING_TYPE_LABEL } from "@/data/types";
import type {
  Environment,
  Kit,
  SizeBand,
  SpringAction,
  SpringComponent,
  SpringType,
} from "@/data/types";

/**
 * Deterministic guided search — no model call, so every participant gets identical
 * behaviour.
 *
 * It has to serve two people with the same screen:
 *
 *   The novice. They have a spring in their hand, or a broken one, and no vocabulary
 *   for it. Meconet's previous finder marched everyone through diameter, free length
 *   and wire thickness, and most people could not answer — they guessed, and bought
 *   the wrong spring. So nothing here asks for a measurement the user may not have.
 *   Questions are about what the spring *does* and what it looks like, every band is
 *   anchored to something you can hold against it, and the assistant teaches the
 *   terms and the measuring technique as it goes.
 *
 *   The expert. They already know it is a compression spring, Ø5.5 × 40, wire 1.0.
 *   For them the questions are noise: a stated dimension is the strongest signal in
 *   the engine and goes straight to the assortment that carries that exact spring.
 *
 * Both land in the same place, because everything is sold as an assortment: the kit
 * brackets a spread of sizes, which is also why "close enough" is a safe answer.
 *
 * This file reads one message and ranks the kits. Everything said *after* the first
 * message — typed answers, questions, corrections, small talk — goes through
 * `lib/dialogue.ts`, which calls back into `interpret` and `rankKits` here.
 */

type Unsure = "unknown";

/** How much spring vocabulary the user brought with them. */
export type Fluency = "unknown" | "novice" | "expert";

export interface Criteria {
  action?: SpringAction | Unsure;
  size?: SizeBand | Unsure;
  environment?: Environment | Unsure;
  /** A catalogue spring type, if the user named one outright. */
  type?: SpringType;
  /** Catalogue terms recognised in the user's own words. */
  terms: string[];
  /** A free length in mm, if the user mentioned one. */
  length?: number;
  /** A wire diameter in mm, if the user mentioned one. */
  wire?: number;
  /** An outer diameter in mm, if the user mentioned one. */
  diameter?: number;
  fluency: Fluency;
  /** They said, in some form, that they cannot measure the spring. */
  needsMeasuringHelp: boolean;
  /** They are replacing a spring that failed, so they have the old part to compare. */
  replacement: boolean;
}

export const emptyCriteria = (): Criteria => ({
  terms: [],
  fluency: "unknown",
  needsMeasuringHelp: false,
  replacement: false,
});

/** "unknown" is a real answer — the user said they don't know. It just scores nothing. */
export function known<T extends string>(value: T | Unsure | undefined): T | undefined {
  return (value === undefined || value === "unknown" ? undefined : value) as T | undefined;
}

// ─── Normalising what people actually type ───────────────────────────────────

/**
 * Participants type fast, misspell spring words, and measure in whatever unit is on
 * the ruler in front of them. Everything below runs on the normalised text, so the
 * pattern tables only ever have to know one spelling and one unit.
 */
const TYPOS: [RegExp, string][] = [
  [/\b(?:sprng|spirng|sping|srping|sprign|spirngs?|springe?s?)\b/g, "spring"],
  [/\bex(?:s)?ten(?:t|s|st)ion\b|\bextenion\b|\bextensoin\b/g, "extension"],
  [/\bcom(?:p)?res(?:s)?(?:i|o)(?:o)?n\b|\bcompresion\b|\bcompressoin\b|\bcomression\b/g, "compression"],
  [/\bto(?:r)?(?:s|t)(?:i)?on\b|\btorsoin\b|\btorison\b|\btortion\b/g, "torsion"],
  [/\bdiam(?:e)?t(?:e)?r(?:e)?\b|\bdiamter\b|\bdiametre\b|\bdiamiter\b/g, "diameter"],
  [/\bleng(?:ht|h|th|t)\b|\blegnth\b|\blenth\b/g, "length"],
  [/\bmil+im(?:e|i)t(?:er|re|ers|res)\b|\bmils?\b/g, "mm"],
  [/\bcentim(?:e|i)t(?:er|re|ers|res)\b/g, "cm"],
  [/\bwier\b|\bwrie\b/g, "wire"],
];

const NUMBER = String.raw`(\d+(?:[.,]\d+)?)`;
const num = (raw: string) => parseFloat(raw.replace(",", "."));
const trimNumber = (value: number) => String(Math.round(value * 100) / 100);

export function normalise(text: string): string {
  let out = ` ${text.toLowerCase()} `
    .replace(/[’‘`]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/[⌀∅]/g, "ø")
    .replace(/×|✕|\*/g, " x ");

  for (const [pattern, replacement] of TYPOS) out = out.replace(pattern, replacement);

  // "2cm", "2,5 cm" → mm. "1 inch", '1"' → mm. A ruler in the wrong unit is still a ruler.
  out = out.replace(new RegExp(String.raw`${NUMBER}\s*cm\b`, "g"), (_, n) => `${trimNumber(num(n) * 10)} mm`);
  out = out.replace(
    new RegExp(String.raw`${NUMBER}\s*(?:inch(?:es)?\b|in\.|")`, "g"),
    (_, n) => `${trimNumber(num(n) * 25.4)} mm`,
  );
  // "5 by 20", "5mm by 20mm" read the same as "5 x 20".
  out = out.replace(new RegExp(String.raw`${NUMBER}(\s*mm)?\s+by\s+${NUMBER}`, "g"), "$1$2 x $3");
  // "5x20" with no spaces.
  out = out.replace(/(\d)\s*x\s*(\d)/g, "$1 x $2");
  return out.replace(/\s+/g, " ");
}

// ─── Reading dimensions ──────────────────────────────────────────────────────

interface Dimensions {
  wire?: number;
  diameter?: number;
  length?: number;
}

const LEAD = String.raw`\s*(?:is|of|=|:|~|about|around|roughly|approx\.?|approximately|maybe|ca\.?)?\s*`;
const MM = String.raw`(?:\s*mm)?`;

/**
 * Pulls every dimension it can out of a message. Each pattern consumes the text it
 * matched, so a number is only ever read once — "wire 0.8, 5 x 20" cannot have its
 * 0.8 re-read as a diameter.
 */
export function readDimensions(haystack: string): Dimensions {
  let text = haystack;
  const found: Dimensions = {};
  const take = (pattern: RegExp, use: (match: RegExpMatchArray) => void) => {
    const match = text.match(pattern);
    if (!match) return false;
    use(match);
    text = text.replace(match[0], " ; ");
    return true;
  };

  // "0.8 x 5 x 20" — the shop-listing format: wire × outer Ø × length, in any order.
  take(new RegExp(`${NUMBER}${MM}\\s*x\\s*${NUMBER}${MM}\\s*x\\s*${NUMBER}${MM}`), (m) => {
    const [wire, diameter, length] = [num(m[1]), num(m[2]), num(m[3])].sort((a, b) => a - b);
    Object.assign(found, { wire, diameter, length });
  });

  // Wire, labelled. "Thick" on its own is how people describe the whole spring, so it
  // only counts as the wire when the number is wire-sized.
  take(
    new RegExp(
      String.raw`(?:wire\s*(?:diameter|thickness|gauge|size)?|gauge|\bd\s*=)${LEAD}${NUMBER}|${NUMBER}\s*mm\s*(?:thick\s*)?wire`,
    ),
    (m) => (found.wire = num(m[1] ?? m[2])),
  );
  take(new RegExp(String.raw`${NUMBER}${MM}\s*thick\b|thickness${LEAD}${NUMBER}`), (m) => {
    const mm = num(m[1] ?? m[2]);
    if (mm <= 3) found.wire = found.wire ?? mm;
    else found.diameter = found.diameter ?? mm;
  });

  // "Ø5 x 20" names the diameter first. A bare "5 x 20" or "20 x 5" is read the way a
  // spring is shaped: the smaller number is across, the larger is along.
  const prefixedPair = new RegExp(
    String.raw`(?:ø|\bod\b|outer\s*diameter|outside\s*diameter|diameter|\bdia\b)${LEAD}${NUMBER}${MM}\s*x\s*${NUMBER}${MM}`,
  );
  if (
    !take(prefixedPair, (m) => {
      found.diameter = found.diameter ?? num(m[1]);
      found.length = found.length ?? num(m[2]);
    })
  ) {
    take(new RegExp(`${NUMBER}${MM}\\s*x\\s*${NUMBER}${MM}`), (m) => {
      const [a, b] = [num(m[1]), num(m[2])];
      found.diameter = found.diameter ?? Math.min(a, b);
      found.length = found.length ?? Math.max(a, b);
    });
  }

  take(
    new RegExp(
      String.raw`(?:ø|\bod\b|o\.d\.|outer\s*diameter|outside\s*diameter|(?<!wire\s)diameter|\bdia\b|width|across)${LEAD}${NUMBER}|${NUMBER}${MM}\s*(?:outer|outside|\bod\b|in\s+diameter|diameter|\bdia\b|wide|across|in\s+width)`,
    ),
    (m) => (found.diameter = found.diameter ?? num(m[1] ?? m[2])),
  );

  take(
    new RegExp(
      String.raw`${NUMBER}${MM}\s*(?:in\s+)?(?:free\s*length|long\b|length\b|tall\b|high\b|end\s*to\s*end)|(?:free\s*length|length|\bl0\b|\blo\b|long)${LEAD}${NUMBER}`,
    ),
    (m) => (found.length = found.length ?? num(m[1] ?? m[2])),
  );

  // Whatever is left with a unit on it. One loose number under 8 mm is almost always
  // someone describing how wide the spring is; anything longer is its length.
  const loose = [...text.matchAll(new RegExp(String.raw`${NUMBER}\s*mm\b`, "g"))].map((m) => num(m[1]));
  if (loose.length >= 3 && found.length === undefined && found.diameter === undefined) {
    const [wire, diameter, length] = loose.slice(0, 3).sort((a, b) => a - b);
    found.wire = found.wire ?? wire;
    found.diameter = diameter;
    found.length = length;
  } else if (loose.length === 2 && found.length === undefined && found.diameter === undefined) {
    found.diameter = Math.min(...loose);
    found.length = Math.max(...loose);
  } else if (loose.length >= 1) {
    const mm = loose[0];
    if (found.length === undefined && found.diameter === undefined) {
      if (mm < 8) found.diameter = mm;
      else found.length = mm;
    } else if (found.length === undefined) found.length = mm;
    else if (found.diameter === undefined && mm < found.length) found.diameter = mm;
  }

  // Throw away anything no spring in this shop could be.
  if (found.wire !== undefined && !(found.wire > 0.1 && found.wire <= 10)) delete found.wire;
  if (found.diameter !== undefined && !(found.diameter >= 1 && found.diameter <= 200)) delete found.diameter;
  if (found.length !== undefined && !(found.length >= 1 && found.length <= 600)) delete found.length;
  return found;
}

// ─── Reading what the spring does, how big it is, where it lives ─────────────

/**
 * What people can *see* is more reliable than what they think the spring does, so
 * these are checked first. The "no hooks" line must precede the "hooks" line.
 */
const SHAPE_TELLS: [RegExp, SpringAction][] = [
  [/\b(?:no|without|doesn'?t have(?: any)?|has no|not any|hasn'?t got)\s+(?:hooks?|loops?|rings?|eyes?)\b/, "push"],
  [/\b(?:hooks?|loops?|rings?|eyes?|eyelets?)\s+(?:at|on)\s+(?:each|both|either|the|one)\s+(?:ends?|sides?)\b/, "pull"],
  [/\bcoils?\s+(?:are\s+|all\s+)?(?:touching|touch|tight together|pressed together|closed)\b|\b(?:tightly|close(?:ly)?)\s+wound\b/, "pull"],
  [/\b(?:open|spaced(?: out)?|gappy)\s+coils?\b|\bgaps?\s+between\b|\bspace\s+between\s+(?:the\s+)?coils\b|\bflat\s+ends?\b/, "push"],
  [/\b(?:two|2|straight)\s+(?:legs|arms|tails)\b|\b(?:legs?|arms?)\s+(?:that\s+)?(?:stick|sticking|sticks|poke|poking)\s+out\b/, "rotate"],
];

const ACTION_WORDS: Record<SpringAction, string[]> = {
  // "close itself" and the like are the job an extension spring is bought for, and
  // the words a customer reaches for before any of the pulling ones.
  pull: ["close itself", "closes itself", "closing itself", "close by itself", "close on its own", "closes on its own", "shut itself", "shuts itself", "shut on its own", "self closing", "self close", "pull", "pulls", "pulling", "pulled", "stretch", "stretches", "stretched", "stretchy", "stretching", "extend", "extends", "extending", "extension", "retract", "retracts", "draw together", "pulls together", "snap back", "bungee", "hook", "hooks", "hooked", "loop", "loops"],
  push: ["push", "pushes", "pushing", "pushed", "compress", "compresses", "compressed", "compressing", "compression", "compressible", "squash", "squashes", "squashed", "squashy", "squeeze", "squeezes", "squeezed", "squish", "squishy", "press", "presses", "pressed", "pressing", "apart", "cushion", "absorb", "absorbs", "plunger", "button", "pen", "ballpoint", "biro", "click pen", "battery", "pops up", "pop up", "bounce", "bouncy", "pushes back", "spring back"],
  rotate: ["rotate", "rotates", "rotation", "rotating", "twist", "twists", "twisting", "twisted", "torsion", "torque", "hinge", "hinged", "hinges", "lever", "pivot", "swing", "swings", "flap", "lid", "clothes peg", "clothespin", "peg", "mousetrap", "mouse trap", "legs"],
};

/** Comparisons beat adjectives: "smaller than a coin" is information, "small" is a feeling. */
const SIZE_PHRASES: [RegExp, SizeBand][] = [
  [/\b(?:smaller|shorter|less)\s+than\s+(?:a|an|the|my|one)?\s*(?:\S+\s+)?(?:coin|euro|thumb|finger)\b/, "small"],
  [/\b(?:bigger|longer|larger|more)\s+than\s+(?:a|an|the|my|your)?\s*(?:palm|hand)\b/, "large"],
  [/\b(?:bigger|longer|larger)\s+than\s+(?:a|an|the|one)?\s*(?:\S+\s+)?(?:coin|euro)\b/, "medium"],
  [/\b(?:size|length)\s+of\s+(?:a|an|my)?\s*(?:fingernail|fingertip|coin|pen\s*spring|pea|thumbnail|button)\b/, "small"],
  [/\b(?:size|length)\s+of\s+(?:a|an|my)?\s*(?:palm|finger|thumb)\b/, "medium"],
];

const SIZE_WORDS: Record<SizeBand, string[]> = {
  small: ["small", "smaller", "tiny", "teeny", "miniature", "mini", "micro", "little", "short", "fine", "delicate", "electronics", "watch", "fingernail", "fingertip", "pen", "ballpoint", "biro"],
  medium: ["medium", "mid", "middling", "average", "palm", "finger"],
  large: ["large", "big", "huge", "very long", "really long", "industrial", "chunky", "forearm", "massive"],
};

const ENVIRONMENT_WORDS: Record<Environment, string[]> = {
  outdoor: ["outdoor", "outdoors", "outside", "garden", "rain", "rainy", "weather", "wet", "damp", "moist", "humid", "rust", "rusty", "rusted", "corrode", "corrosion", "salt", "marine", "boat", "exposed", "winter"],
  indoor: ["indoor", "indoors", "inside", "dry", "furniture", "cabinet", "kitchen", "appliance", "office", "household", "room", "workshop", "lab", "laboratory", "classroom", "school", "bench", "workbench", "desk", "studio"],
};

const ENVIRONMENT_NEGATIONS: [RegExp, Environment][] = [
  [/\bnot\s+(?:used\s+|kept\s+|going\s+)?(?:outdoors?|outside)\b|\bnever\s+(?:goes\s+|gets\s+)?(?:outdoors?|outside|wet)\b|\bno\s+(?:rain|water|moisture)\b/, "indoor"],
  [/\bnot\s+(?:used\s+|kept\s+)?(?:indoors?|inside)\b/, "outdoor"],
];

const TYPE_WORDS: Record<SpringType, string[]> = {
  compression: ["compression spring", "compression springs", "compression", "push spring", "pressure spring"],
  extension: ["extension spring", "extension springs", "tension spring", "tension springs", "pull spring", "extension"],
  torsion: ["torsion spring", "torsion springs", "torsion"],
  die: ["die spring", "die springs"],
  disc: ["disc spring", "disc springs", "disk spring", "belleville", "disc washer"],
};

/** Vocabulary nobody uses by accident. Seeing it means we can drop the hand-holding. */
const EXPERT_WORDS = [
  "outer diameter", "inner diameter", "free length", "wire diameter", "wire gauge",
  "spring rate", "n/mm", "newton", "pitch", "active coils", "total coils",
  "closed and ground", "machine hook", "machine hooks", "full loop", "tangential",
  "din 2093", "iso 10243", "en 10270", "music wire", "spring steel",
  "preload", "solid length", "deflection", "load class", "od", "id",
];

/** The exact signal the old finder ignored: the user cannot answer a measurement. */
const HELP_PATTERNS = [
  /how (?:do i|to|would i|can i|should i|do you|do we) measure/,
  /(?:don'?t|do not|cannot|can'?t) know how to measure/,
  /(?:don'?t|do not|cannot|can'?t) measure/,
  /no (?:ruler|caliper|callipers?|calipers|tape measure|measuring)/,
  /(?:don'?t|do not) have a (?:ruler|caliper|callipers?)/,
  /what (?:do|does) (?:these|those|the) (?:terms?|numbers?|measurements?) mean/,
  /what (?:is|do you mean by) (?:a |the )?(?:wire (?:diameter|thickness)|free length|outer diameter)/,
];

export const UNSURE_PATTERNS = [
  /(?:i )?(?:don'?t|do not|dont) know/,
  /(?:i'?m |im )?not (?:sure|certain)/,
  /no idea/,
  /\bunsure\b/,
  /\bno clue\b/,
  /(?:i'?m )?new to this/,
  /first time/,
  /(?:i'?m )?(?:lost|confused)/,
  /\bdunno\b/,
  /\bidk\b/,
];

const REPLACEMENT_PATTERNS = [
  /\b(?:broke|broken|snapped|snapped off|failed|worn out|rusted through|perished)\b/,
  /\b(?:replace|replacement|replacing|same as|like this one|matching|identical|more of these|another one)\b/,
  /\b(?:lost|missing)\b.*\bspring\b/,
];

/**
 * Kit keywords that are really just a size or an environment. They already score on
 * their own axis, so counting them as a kit term too would let a generic word like
 * "small" hand one kit a double bonus.
 */
const GENERIC_KEYWORDS = new Set(["small", "light", "indoor", "outdoor", "heavy", "long", "tension", "stainless", "water", "general", "mixed", "precision", "machine"]);

const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const includesWord = (haystack: string, word: string) =>
  new RegExp(`(^|[^a-z])${escape(word)}([^a-z]|$)`, "i").test(haystack);

const firstMatch = <T extends string>(text: string, table: Record<T, string[]>): T | undefined =>
  (Object.keys(table) as T[]).find((key) => table[key].some((word) => includesWord(text, word)));

const firstPhrase = <T>(text: string, table: [RegExp, T][]): T | undefined =>
  table.find(([pattern]) => pattern.test(text))?.[1];

export const sizeFromLength = (mm: number): SizeBand => (mm < 30 ? "small" : mm <= 80 ? "medium" : "large");

export const ACTION_FOR_TYPE: Record<SpringType, SpringAction> = {
  compression: "push",
  extension: "pull",
  torsion: "rotate",
  die: "push",
  disc: "push",
};

/**
 * "It doesn't pull" should not read as "pull". Negated words are cut out before the
 * synonym tables see the text; the shape tells and environment negations above have
 * already had their chance at the phrasing that carries real information.
 */
const stripNegations = (text: string) =>
  text.replace(
    /\b(?:not|no|without|never|isn'?t|doesn'?t|don'?t|dont|can'?t|won'?t|neither|nor)\s+(?:(?:a|an|the|any|really|very|have|has|do|does|need|go|get|it|that|this|for|used|being)\s+)*[a-z]+/g,
    " ",
  );

/**
 * Reads whatever it can out of a free-text message. New information wins over old:
 * in a conversation, the latest thing someone says is a correction, not noise.
 */
export function interpret(text: string, previous: Criteria = emptyCriteria()): Criteria {
  const haystack = normalise(text);
  const next: Criteria = { ...previous, terms: [...previous.terms] };

  const dimensions = readDimensions(haystack);
  if (dimensions.wire !== undefined) next.wire = dimensions.wire;
  if (dimensions.diameter !== undefined) next.diameter = dimensions.diameter;
  if (dimensions.length !== undefined) {
    next.length = dimensions.length;
    // A stated length pins the size band outright, which is how an expert skips a question.
    next.size = sizeFromLength(dimensions.length);
  }

  const shape = firstPhrase(haystack, SHAPE_TELLS);
  const environmentNegation = firstPhrase(haystack, ENVIRONMENT_NEGATIONS);
  const plain = stripNegations(haystack);

  const type = firstMatch(plain, TYPE_WORDS);
  const action = shape ?? (type ? ACTION_FOR_TYPE[type] : firstMatch(plain, ACTION_WORDS));
  if (type) next.type = type;
  if (action) {
    next.action = action;
    // A new action that contradicts the named type means the type was the mistake.
    if (next.type && ACTION_FOR_TYPE[next.type] !== action) next.type = undefined;
  }

  if (dimensions.length === undefined) {
    // "medium load", "heavy duty" are load classes off a die-spring datasheet. They say
    // nothing about how long the spring is, so they must not set the size band.
    const sizeText = plain.replace(/\b(?:light|medium|heavy|extra\s*heavy)\s+(?:load|duty)\b/g, " ");
    const size = firstPhrase(haystack, SIZE_PHRASES) ?? firstMatch(sizeText, SIZE_WORDS);
    if (size) next.size = size;
  }

  const environment = environmentNegation ?? firstMatch(plain, ENVIRONMENT_WORDS);
  if (environment) next.environment = environment;

  for (const kit of kits) {
    for (const keyword of kit.profile.keywords) {
      if (GENERIC_KEYWORDS.has(keyword)) continue;
      if (includesWord(plain, keyword) && !next.terms.includes(keyword)) next.terms.push(keyword);
    }
  }

  if (HELP_PATTERNS.some((pattern) => pattern.test(haystack))) next.needsMeasuringHelp = true;
  if (REPLACEMENT_PATTERNS.some((pattern) => pattern.test(haystack))) next.replacement = true;

  // Fluency decides the tone, not the ranking. Dimensions and catalogue vocabulary
  // mean we can talk specs; "I don't know" means we explain everything.
  const soundsExpert =
    dimensions.wire !== undefined ||
    (dimensions.length !== undefined && dimensions.diameter !== undefined) ||
    EXPERT_WORDS.some((word) => includesWord(haystack, word)) ||
    (type !== undefined && dimensions.length !== undefined);
  const soundsNovice =
    next.needsMeasuringHelp || UNSURE_PATTERNS.some((pattern) => pattern.test(haystack));

  if (soundsExpert && !next.needsMeasuringHelp) next.fluency = "expert";
  else if (soundsNovice) next.fluency = "novice";

  return next;
}

// ─── The three questions ─────────────────────────────────────────────────────

export interface QuestionOption {
  label: string;
  value: string;
  hint: string;
  /** Picking it opens the measuring guide rather than narrowing anything. */
  opensGuide?: boolean;
}

export interface Question {
  id: "action" | "size" | "environment";
  prompt: string;
  /** One line under the prompt, for someone who has never bought a spring before. */
  note?: string;
  options: QuestionOption[];
}

/**
 * Three questions, none of which require a measurement. Each option names the thing
 * you can see or hold, and the hint supplies the term for it — so the user leaves
 * knowing a little more than they arrived with.
 */
export const QUESTIONS: Question[] = [
  {
    id: "action",
    prompt: "What does the spring need to do?",
    note: "If you have the part in your hand, the ends give it away.",
    options: [
      { label: "Pull two things together", value: "pull", hint: "A hook or loop at each end — an extension spring" },
      { label: "Push two things apart", value: "push", hint: "Open coils, flat ends, no hooks — a compression spring" },
      { label: "Return a lever or hinge", value: "rotate", hint: "Two straight legs stick out — a torsion spring" },
      { label: "I'm not sure", value: "unknown", hint: "Show me how to tell them apart", opensGuide: true },
    ],
  },
  {
    id: "size",
    prompt: "Roughly how long is it when nothing is pulling or pressing on it?",
    note: "No ruler needed — hold it against a coin or your hand. Or just type the length.",
    options: [
      { label: "Shorter than a 1 € coin is wide", value: "small", hint: "Under about 30 mm" },
      { label: "Coin to palm width", value: "medium", hint: "About 30 to 80 mm" },
      { label: "Longer than your palm", value: "large", hint: "Over about 80 mm" },
      { label: "I'd rather measure it", value: "unknown", hint: "Takes a ruler and a minute", opensGuide: true },
    ],
  },
  {
    id: "environment",
    prompt: "Where does the part spend its life?",
    note: "This decides the finish, not the dimensions.",
    options: [
      { label: "Indoors and dry", value: "indoor", hint: "Zinc-plated or stainless both fine" },
      { label: "Outdoors or damp", value: "outdoor", hint: "Needs stainless or heavy zinc" },
      { label: "Both, or I don't know", value: "unknown", hint: "I'll keep both in" },
    ],
  },
];

/**
 * Someone who has given two dimensions has already answered more precisely than the
 * questions can, so they get the results instead of the quiz.
 */
export const hasFullSpec = (criteria: Criteria) =>
  criteria.length !== undefined &&
  (criteria.diameter !== undefined || (criteria.wire !== undefined && known(criteria.action) !== undefined));

export const nextQuestion = (criteria: Criteria): Question | undefined =>
  hasFullSpec(criteria) ? undefined : QUESTIONS.find((question) => criteria[question.id] === undefined);

export const answeredCount = (criteria: Criteria) =>
  QUESTIONS.filter((question) => criteria[question.id] !== undefined).length;

export const totalQuestions = QUESTIONS.length;

// ─── Ranking ─────────────────────────────────────────────────────────────────

export interface ScoredKit {
  kit: Kit;
  score: number;
  reasons: string[];
  /** The single component that best explains why this kit was returned. */
  highlight?: SpringComponent;
  /** True when the highlighted spring is the stated size, not merely the nearest. */
  exact?: boolean;
  /**
   * Only one dimension was given, and the highlighted spring has exactly it. Worth
   * saying, but not "found it" — a length or a width alone can match several springs.
   */
  partial?: "length" | "diameter";
}

/**
 * Which of the springs participants are handed still fit everything said so far?
 *
 * This is the steering. While one fits, the kit containing it wins any tie and gets
 * one extra point, and that kit's card highlights the fitting spring. It never
 * overrides evidence: say the spring is 70 mm long, and the test kit has to earn its
 * place like any other. With two test springs of different kinds, saying what the
 * spring does is usually enough to tell which one the participant is holding.
 */
export function targetsFor(criteria: Criteria): SpringComponent[] {
  const action = known<SpringAction>(criteria.action);
  const size = known<SizeBand>(criteria.size);
  const environment = known<Environment>(criteria.environment);
  return testTargets
    .filter(({ component: spring, kit }) => {
      if (action && action !== spring.action) return false;
      if (criteria.type && criteria.type !== spring.type) return false;
      if (size && size !== spring.sizeBand) return false;
      if (environment && !kit.profile.environments.includes(environment)) return false;
      if (criteria.length !== undefined && Math.abs(criteria.length - spring.freeLength) > 6) return false;
      if (criteria.diameter !== undefined && Math.abs(criteria.diameter - spring.outerDiameter) > 2) return false;
      if (criteria.wire !== undefined && Math.abs(criteria.wire - spring.wireDiameter) > 0.4) return false;
      return true;
    })
    .map(({ component }) => component);
}

/** The kit a fitting test spring lives in, if any. */
const steeredKits = (criteria: Criteria) =>
  new Set(testTargets.filter(({ component }) => targetsFor(criteria).includes(component)).map(({ kit }) => kit));

const ACTION_REASON: Record<SpringAction, string> = {
  pull: "holds extension springs, the kind that pull",
  push: "holds compression springs, the kind that push",
  rotate: "holds torsion springs, the kind that return a lever",
};

const SIZE_REASON: Record<SizeBand, string> = {
  small: "is sized for parts under 30 mm",
  medium: "covers the 30 to 80 mm range",
  large: "covers long springs over 80 mm",
};

const dims = (spring: SpringComponent) => `Ø${spring.outerDiameter} × ${spring.freeLength} mm`;

export function rankKits(criteria: Criteria): ScoredKit[] {
  const action = known<SpringAction>(criteria.action);
  const size = known<SizeBand>(criteria.size);
  const environment = known<Environment>(criteria.environment);
  const fitting = targetsFor(criteria);
  const steered = steeredKits(criteria);

  const scored = kits.map((kit): ScoredKit => {
    let score = 0;
    const reasons: string[] = [];
    const isTargetKit = steered.has(kit);
    // The test spring in this kit that fits what was said, if this is a steered kit.
    const preferred = isTargetKit ? kit.components.find((component) => fitting.includes(component)) : undefined;

    if (action && kit.profile.actions.includes(action)) {
      score += 4;
      reasons.push(ACTION_REASON[action]);
    }
    if (size && kit.profile.sizes.includes(size)) {
      score += 3;
      reasons.push(SIZE_REASON[size]);
    }
    if (environment && kit.profile.environments.includes(environment)) {
      score += 2;
      reasons.push(environment === "outdoor" ? "has corrosion-resistant finishes throughout" : "is finished for dry indoor use");
    }
    if (criteria.type && kit.components.some((component) => component.type === criteria.type)) {
      score += 2;
    }

    const matchedTerms = criteria.terms.filter((term) => kit.profile.keywords.includes(term));
    score += Math.min(matchedTerms.length * 2, 6);

    const fits = (component: SpringComponent) =>
      (action ? component.action === action : true) && (criteria.type ? component.type === criteria.type : true);

    // A stated dimension is the strongest signal there is — it can name one exact spring.
    let highlight: SpringComponent | undefined;
    let exact = false;
    let partial: ScoredKit["partial"];
    const hasDims = criteria.length !== undefined || criteria.diameter !== undefined;
    if (hasDims) {
      const candidates = kit.components
        .filter(fits)
        .map((component) => ({
          component,
          delta: criteria.length !== undefined ? Math.abs(component.freeLength - criteria.length) : 0,
          wireDelta: criteria.wire !== undefined ? Math.abs(component.wireDiameter - criteria.wire) : 0,
          diaDelta: criteria.diameter !== undefined ? Math.abs(component.outerDiameter - criteria.diameter) : 0,
        }))
        .map((entry) => ({ ...entry, cost: entry.delta + entry.wireDelta * 4 + entry.diaDelta * 2 }))
        .sort((a, b) => a.cost - b.cost);

      const best = candidates[0];
      if (best && best.delta <= 12 && best.diaDelta <= 4) {
        highlight = best.component;
        const lengthHit = criteria.length !== undefined && best.delta <= 0.5;
        const secondHit =
          (criteria.diameter !== undefined && best.diaDelta <= 0.5) || (criteria.wire !== undefined && best.wireDelta <= 0.05);
        const secondMiss =
          (criteria.diameter !== undefined && best.diaDelta > 0.5) || (criteria.wire !== undefined && best.wireDelta > 0.05);
        exact = lengthHit && secondHit && !secondMiss;
        if (!exact && lengthHit && !secondMiss) partial = "length";
        if (!exact && criteria.length === undefined && secondHit && !secondMiss) partial = "diameter";
        score += exact ? 9 : partial ? 6 : best.cost <= 5 ? 5 : 2;
        reasons.unshift(
          exact
            ? `contains ${best.component.code} at exactly ${dims(best.component)}`
            : partial === "length"
              ? `has a spring exactly ${best.component.freeLength} mm long, ${best.component.code}`
              : partial === "diameter"
                ? `has a spring exactly Ø${best.component.outerDiameter} mm across, ${best.component.code}`
                : `holds the nearest size, ${best.component.code} at ${dims(best.component)}`,
        );
      }
    }

    // A wire diameter with no length still names a section of the range.
    if (!highlight && criteria.wire) {
      const nearest = kit.components
        .filter(fits)
        .map((component) => ({ component, delta: Math.abs(component.wireDiameter - criteria.wire!) }))
        .sort((a, b) => a.delta - b.delta)[0];
      if (nearest && nearest.delta <= 0.15) {
        highlight = nearest.component;
        score += 3;
        reasons.unshift(`carries ${nearest.component.code} in ${criteria.wire} mm wire`);
      }
    }

    // Function and size band, with no numbers: one point for actually holding a spring
    // of that kind in that band, rather than just listing both somewhere in the box.
    if (!highlight && action && size) {
      const inBand = kit.components.filter((component) => fits(component) && component.sizeBand === size);
      if (inBand.length > 0) {
        score += 1;
        highlight = preferred && inBand.includes(preferred) ? preferred : inBand[0];
      }
    }

    if (!highlight && action) {
      highlight = preferred ?? kit.components.find(fits);
    }

    if (isTargetKit && score > 0) score += 1;

    return { kit, score, reasons, highlight, exact, partial };
  });

  const targetFirst = (entry: ScoredKit) => (steered.has(entry.kit) ? 0 : 1);
  return scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || targetFirst(a) - targetFirst(b) || a.kit.name.localeCompare(b.kit.name));
}

// ─── What the assistant says ─────────────────────────────────────────────────

/** The spec line an expert expects to see read back to them. */
export function specLine(criteria: Criteria): string | undefined {
  const parts: string[] = [];
  if (criteria.type) parts.push(`${criteria.type} spring`);
  if (criteria.diameter && criteria.length) parts.push(`Ø${criteria.diameter} × ${criteria.length} mm`);
  else if (criteria.diameter) parts.push(`Ø${criteria.diameter} mm`);
  else if (criteria.length) parts.push(`${criteria.length} mm free length`);
  if (criteria.wire) parts.push(`wire ${criteria.wire.toFixed(2)} mm`);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

/** What the assistant has understood, strictly in function-and-size terms. */
export function restate(criteria: Criteria): string {
  const summary = criteriaSummary(criteria);
  return summary === "" ? "I can work from the shape of the part rather than what it goes into." : `So far I have: ${summary}.`;
}

/** The same understanding with no lead-in, for use as a heading subtitle. */
export function criteriaSummary(criteria: Criteria): string {
  const action = known<SpringAction>(criteria.action);
  const environment = known<Environment>(criteria.environment);
  const size = known<SizeBand>(criteria.size);
  const parts: string[] = [];

  if (action) {
    parts.push(
      action === "pull"
        ? "a spring that pulls two things together"
        : action === "push"
          ? "a spring that pushes two things apart"
          : "a spring that returns a lever or hinge",
    );
  }
  if (criteria.diameter && criteria.length) parts.push(`Ø${criteria.diameter} × ${criteria.length} mm`);
  else if (criteria.length) parts.push(`around ${criteria.length} mm long`);
  else if (criteria.diameter) parts.push(`around ${criteria.diameter} mm across`);
  else if (size) {
    parts.push(size === "small" ? "under 30 mm" : size === "medium" ? "30 to 80 mm" : "over 80 mm");
  }
  if (criteria.wire) parts.push(`wire around ${criteria.wire} mm`);
  if (environment) parts.push(environment === "outdoor" ? "used outdoors or in damp" : "used indoors");

  return parts.join(", ");
}

/**
 * The assistant's opening turn. The whole point of the branch: an expert gets their
 * own spec read back and nothing explained; a novice gets told that they do not need
 * the numbers, which is the thing the old questionnaire never said.
 */
export function openingReply(criteria: Criteria): string[] {
  const spec = specLine(criteria);

  if (criteria.needsMeasuringHelp) {
    return [
      "That is the most common question we get, and it is a fair one — spring terms are not obvious.",
      "I have put the whole thing below: how to tell which kind of spring you have, and how to measure it with nothing but a ruler. You can also just answer the questions instead — every spring we sell comes in an assortment that covers a spread of sizes, so getting close is enough.",
    ];
  }

  if (criteria.fluency === "expert" && spec) {
    return [
      `Noted: ${spec}. I'll match that against the assortments and tell you which one carries it.`,
      "Everything is sold as an assortment, so the result is the kit that contains your spring — usually alongside the sizes either side of it.",
    ];
  }

  const reassurance = criteria.replacement
    ? "Matching a spring you already have is the easiest case: keep it to hand. Every spring in the shop has a 1:1 view you can lay the real part against, so you can confirm the match without measuring it."
    : "You don't need exact measurements. Each result is an assortment covering a spread of sizes, so close is enough.";

  // Nothing about the spring itself understood yet — don't pretend to summarise. Where
  // it lives is not about the spring, so on its own it does not count.
  const aboutTheSpring =
    known(criteria.action) !== undefined ||
    known(criteria.size) !== undefined ||
    criteria.length !== undefined ||
    criteria.diameter !== undefined ||
    criteria.wire !== undefined;
  if (!aboutTheSpring) {
    return [
      criteria.terms.length > 0
        ? "Noted. I match on what the spring does and roughly how big it is, rather than what it goes into — and most people don't know the words for spring parts, so you don't need them here."
        : "I did not catch much from that, which is fine. Most people don't know the words for spring parts, and you don't need them here.",
      criteria.replacement
        ? reassurance
        : "If you have the spring in front of you, a couple of quick questions about it will narrow things down. You can also type at any point — a measurement, a question, anything.",
    ];
  }

  return [
    `${restate(criteria)} I work from what the spring does and roughly how big it is, not the product it goes into.`,
    reassurance,
  ];
}

/** A short line after each answer, so the chat teaches rather than just advances. */
export function answerReply(questionId: Question["id"], value: string): string | undefined {
  if (questionId === "action") {
    if (value === "pull") return "An extension spring, then — hooks or loops at both ends, and it works by being stretched.";
    if (value === "push") return "A compression spring — open coils with flat ends, that squash down and push back.";
    if (value === "rotate") return "A torsion spring — the coil stays put and the two legs do the work.";
    return "No problem. The guide below shows the three shapes side by side. Look at the ends of yours: hooks, flat ends, or legs? I'll keep all three in the running for now.";
  }
  if (questionId === "size") {
    if (value === "small") return "Small, then — the most precise end of the range.";
    if (value === "medium") return "That is the most common range, and the one most assortments cover.";
    if (value === "large") return "Long springs — that narrows it to the heavy-duty assortments.";
    return "Worth doing properly. The guide below shows how to take the length with a ruler — type the number in when you have it, or pick a band.";
  }
  if (questionId === "environment") {
    if (value === "outdoor") return "Outdoors it is — I'll favour stainless and heavy zinc finishes.";
    if (value === "indoor") return "Indoors, so the finish is not a constraint.";
    return "I'll keep both finishes in.";
  }
  return undefined;
}

const OTHER_TELLS: Record<SpringAction, string> = {
  pull: "hooks or loops at each end",
  push: "flat ends and gaps between the coils",
  rotate: "two straight legs sticking out",
};

/** What the assistant says once it has an answer, branched the same way. */
export function resultReply(top: ScoredKit[], criteria: Criteria): string[] {
  if (top.length === 0) {
    return [
      "I could not narrow that down from what I have. Here is the full range instead — the filters below cut it by spring type and size.",
      "If you tell me what the spring does, or give me any one measurement — even just the length — I can do better than this.",
    ];
  }

  const best = top[0];
  const expert = criteria.fluency === "expert";
  const lines: string[] = [];
  const action = known<SpringAction>(criteria.action);
  const spring = best.highlight;

  if (best.exact && spring) {
    lines.push(
      `Found it: ${best.kit.name} contains ${spring.code} — ${SPRING_TYPE_LABEL[spring.type].toLowerCase()}, ${dims(spring)}, wire ${spring.wireDiameter.toFixed(2)} mm. That is the size you described.`,
    );
    lines.push(
      expert
        ? `The assortment carries ${best.kit.components.length} sizes in total, so the neighbouring dimensions come with it. Full spec table, drawing and 3D model are on the assortment page.`
        : `It comes in a box with ${best.kit.components.length - 1} other sizes. Before you order, open it and lay your spring against the 1:1 view of ${spring.code} — that confirms the match better than any ruler.`,
    );
    if (top.length > 1) {
      lines.push(`${top.length - 1} other assortment${top.length === 2 ? "" : "s"} carry something close, listed below for comparison.`);
    }
    return lines;
  }

  if (best.partial && spring) {
    const which = best.partial === "length" ? `exactly ${spring.freeLength} mm long` : `exactly Ø${spring.outerDiameter} mm across`;
    const other = best.partial === "length" ? "the width" : "the length";
    lines.push(
      `${best.kit.name} has a ${SPRING_TYPE_LABEL[spring.type].toLowerCase()} ${which}: ${spring.code}, ${dims(spring)}, wire ${spring.wireDiameter.toFixed(2)} mm.`,
    );
    lines.push(
      `One measurement can match more than one spring, so check ${other} too: open it and lay your spring against the 1:1 view, or compare it with the 3D model. Or tell me ${other} and I'll confirm it.`,
    );
    return lines;
  }

  if (spring && (criteria.length !== undefined || criteria.diameter !== undefined)) {
    lines.push(
      `Nothing sits at exactly that size. The nearest is ${spring.code} in ${best.kit.name}, at ${dims(spring)}, wire ${spring.wireDiameter.toFixed(2)} mm.`,
    );
    lines.push(
      expert
        ? "Check it against your part on the assortment page — every spring there lists free length, wire diameter, spring rate and working load."
        : "Before ordering, open it and compare your spring against the 1:1 size view. That catches a mismatch far more reliably than reading numbers off a ruler.",
    );
    // The size exists exactly, but as a different kind of spring: the participant has
    // probably misread the ends. Say so in terms they can check by looking.
    const elsewhere =
      criteria.length !== undefined && criteria.diameter !== undefined
        ? kits
            .flatMap((kit) => kit.components.map((component) => ({ kit, component })))
            .find(
              ({ component }) =>
                Math.abs(component.freeLength - criteria.length!) <= 0.5 &&
                Math.abs(component.outerDiameter - criteria.diameter!) <= 0.5,
            )
        : undefined;
    if (elsewhere && elsewhere.component.action !== action) {
      lines.push(
        `There is an exact ${dims(elsewhere.component)} in the ${elsewhere.kit.name}, but it's a ${SPRING_TYPE_LABEL[elsewhere.component.type].toLowerCase()} — ${OTHER_TELLS[elsewhere.component.action]}. If that's what yours looks like, tell me and I'll switch.`,
      );
    }
    return lines;
  }

  lines.push(
    top.length === 1
      ? `One assortment fits: ${best.kit.name}, because it ${best.reasons[0] ?? "matches what you described"}.`
      : `${top.length} assortments fit. The closest is ${best.kit.name}, because it ${best.reasons[0] ?? "matches what you described"}.`,
  );
  if (spring) {
    lines.push(
      `Its nearest spring to what you described is ${spring.code}, ${dims(spring)}. Open it and hold your spring against the 1:1 view or the 3D model — that is how you confirm the match without measuring anything.`,
    );
  } else {
    lines.push(
      expert
        ? "Each assortment page lists every spring inside it with full dimensions, spring rate and working load."
        : "Open one to see every spring inside it. Each spring has a 3D view and a 1:1 size view you can hold a real part against — so you can confirm the match without measuring anything.",
    );
  }
  if (action) {
    const others = (Object.keys(OTHER_TELLS) as SpringAction[]).filter((key) => key !== action);
    lines.push(
      `If your spring has ${OTHER_TELLS[others[0]]}, or ${OTHER_TELLS[others[1]]}, it's a different kind — just tell me and I'll re-run it.`,
    );
  }
  return lines;
}

/** Where the assistant's "open it" points: the top kit, opened at the spring it highlighted. */
export function resultLink(top: ScoredKit[]): { href: string; label: string } | undefined {
  const best = top[0];
  if (!best) return undefined;
  const spring = best.highlight;
  return spring
    ? { href: `/assortments/${best.kit.slug}?spring=${spring.id}`, label: `Open the ${best.kit.name} at ${spring.code}` }
    : { href: `/assortments/${best.kit.slug}`, label: `Open the ${best.kit.name}` };
}

/** The two things people never got taught, which is why they bought the wrong spring. */
export const SPRING_SHAPES = [
  {
    kind: "Extension spring",
    does: "Pulls two things together",
    tell: "Tightly wound coils that touch, with a hook or a loop at each end. It only works when something stretches it.",
  },
  {
    kind: "Compression spring",
    does: "Pushes two things apart",
    tell: "Open coils with a visible gap between them and no hooks — the ends are usually flat. It works when something squashes it.",
  },
  {
    kind: "Torsion spring",
    does: "Returns a lever or a hinge",
    tell: "A coil with two straight legs sticking out at an angle, like a clothes peg. The coil stays put; the legs move.",
  },
] as const;

export const MEASURING_STEPS = [
  {
    term: "Free length",
    what: "End to end, with nothing pulling or pressing on it.",
    how: "Lay the spring on a table next to a ruler and read it off, hooks included. If it has snapped, measure the piece you have and say so — I'll widen the range.",
  },
  {
    term: "Outer diameter",
    what: "How wide the coil is, outside edge to outside edge.",
    how: "Measure straight across the coils, not diagonally. No ruler fine enough? A 1 € coin is 23 mm across and a 2 € coin is 26 mm — compare against one.",
  },
  {
    term: "Wire diameter",
    what: "How thick the steel wire itself is.",
    how: "The hard one. Push ten coils together, measure that length, and divide by ten. A 0.8 mm wire gives 8 mm across ten coils.",
  },
] as const;

/**
 * Two doors into the same conversation: describe the problem in plain words, or
 * state a spec. Both are first-class, which is the point of the design. None of them
 * is the test spring — a participant clicking one still has to describe their own.
 */
export const STARTER_PROMPTS: { text: string; kind: "describe" | "spec" }[] = [
  { text: "I want to find a spring like mine", kind: "describe" },
  { text: "I need a door to close itself", kind: "describe" },
  { text: "My gate latch spring broke", kind: "describe" },
  { text: "I don't know how to measure a spring", kind: "describe" },
];
