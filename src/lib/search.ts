import { kits } from "@/data/kits";
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
 *   The expert. They already know it is an extension spring, Ø10 × 70, wire 1.20.
 *   For them the questions are noise: a stated dimension is the strongest signal in
 *   the engine and goes straight to the assortment that carries that exact spring.
 *
 * Both land in the same place, because everything is sold as an assortment: the kit
 * brackets a spread of sizes, which is also why "close enough" is a safe answer.
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
function known<T extends string>(value: T | Unsure | undefined): T | undefined {
  return (value === undefined || value === "unknown" ? undefined : value) as T | undefined;
}

const ACTION_WORDS: Record<SpringAction, string[]> = {
  pull: ["pull", "pulls", "pulling", "tension", "tensile", "stretch", "stretches", "stretchy", "extend", "extends", "extension", "retract", "together", "closer", "close", "closes", "shut", "snap back", "taut", "tight", "trampoline", "bungee", "brake", "towing", "hook", "hooks", "loop", "loops"],
  push: ["push", "pushes", "pushing", "compress", "compression", "apart", "cushion", "absorb", "press", "pressure", "plunger", "button", "valve", "pop", "pops", "lift", "support", "spacer", "preload", "damp", "springy", "bouncy", "bounce"],
  rotate: ["rotate", "rotation", "twist", "twists", "torsion", "torque", "hinge", "hinged", "lever", "pivot", "swing", "flap", "lid", "clip", "clamp", "clothes peg", "peg", "angle", "legs", "return"],
};

const SIZE_WORDS: Record<SizeBand, string[]> = {
  small: ["small", "tiny", "miniature", "mini", "micro", "little", "fine", "delicate", "electronics", "watch", "fingernail", "fingertip"],
  medium: ["medium", "mid", "middling", "average", "normal", "standard", "palm", "finger"],
  large: ["large", "big", "long", "huge", "heavy", "strong", "industrial", "chunky", "thick", "forearm"],
};

const ENVIRONMENT_WORDS: Record<Environment, string[]> = {
  outdoor: ["outdoor", "outdoors", "outside", "garden", "rain", "rainy", "weather", "wet", "damp", "moist", "rust", "rusty", "rusted", "corrode", "corrosion", "salt", "marine", "boat", "exposed", "winter"],
  indoor: ["indoor", "indoors", "inside", "dry", "furniture", "cabinet", "kitchen", "appliance", "office", "household", "room"],
};

const TYPE_WORDS: Record<SpringType, string[]> = {
  compression: ["compression spring", "compression springs", "coil spring"],
  extension: ["extension spring", "extension springs", "tension spring", "tension springs"],
  torsion: ["torsion spring", "torsion springs"],
  die: ["die spring", "die springs"],
  disc: ["disc spring", "disc springs", "belleville", "disc washer"],
};

/** Vocabulary nobody uses by accident. Seeing it means we can drop the hand-holding. */
const EXPERT_WORDS = [
  "outer diameter", "inner diameter", "free length", "wire diameter", "wire gauge",
  "spring rate", "n/mm", "newton", "pitch", "active coils", "total coils",
  "closed and ground", "machine hook", "machine hooks", "full loop", "tangential",
  "din 2093", "iso 10243", "en 10270", "music wire", "spring steel", "stainless",
  "preload", "solid length", "deflection", "load class", "od", "id",
];

/** The exact signal the old finder ignored: the user cannot answer a measurement. */
const HELP_PATTERNS = [
  /how (?:do i|to|would i|can i) measure/,
  /(?:don'?t|do not|cannot|can'?t) know how to measure/,
  /(?:don'?t|do not|cannot|can'?t) measure/,
  /no (?:ruler|caliper|callipers?|tape measure)/,
  /(?:don'?t|do not) have a (?:ruler|caliper|callipers?)/,
  /what (?:do|does) (?:these|those|the) (?:terms?|numbers?|measurements?) mean/,
  /what (?:is|do you mean by) (?:a )?wire (?:diameter|thickness)/,
];

const UNSURE_PATTERNS = [
  /(?:i )?(?:don'?t|do not) know/,
  /(?:i'?m )?not sure/,
  /no idea/,
  /(?:i'?m )?new to this/,
  /first time/,
  /(?:i'?m )?lost/,
];

const REPLACEMENT_PATTERNS = [
  /\b(?:broke|broken|snapped|snapped off|failed|worn out|rusted through|perished)\b/,
  /\b(?:replace|replacement|replacing|same as|like this one|matching)\b/,
  /\b(?:lost|missing)\b.*\bspring\b/,
];

const includesWord = (haystack: string, word: string) =>
  new RegExp(`(^|[^a-z])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i").test(haystack);

const firstMatch = <T extends string>(text: string, table: Record<T, string[]>): T | undefined =>
  (Object.keys(table) as T[]).find((key) => table[key].some((word) => includesWord(text, word)));

const sizeFromLength = (mm: number): SizeBand => (mm < 30 ? "small" : mm <= 80 ? "medium" : "large");

const ACTION_FOR_TYPE: Record<SpringType, SpringAction> = {
  compression: "push",
  extension: "pull",
  torsion: "rotate",
  die: "push",
  disc: "push",
};

const num = (raw: string) => parseFloat(raw.replace(",", "."));

/** Reads whatever it can out of a free-text message without ever asking twice. */
export function interpret(text: string, previous: Criteria = emptyCriteria()): Criteria {
  const haystack = ` ${text.toLowerCase()} `;
  const next: Criteria = { ...previous, terms: [...previous.terms] };

  // Dimensions are read in the order people actually write them. A stated length
  // pins the size band outright, which is how an expert skips the questions.
  const DIGITS = String.raw`(\d+(?:[.,]\d+)?)`;
  // "Ø10 × 70" gives the outer diameter and the free length in one go.
  const crossMatch = haystack.match(
    new RegExp(String.raw`(?:ø|\bod\b|diameter|\bdia\b)\s*${DIGITS}\s*(?:mm)?\s*[x×*]\s*${DIGITS}`),
  );
  // "wire 1.2", "1.2 mm wire", "wire diameter of 1.2". Commas are not crossed, so a
  // second number later in the sentence cannot be mistaken for the wire.
  const wireMatch = haystack.match(
    new RegExp(String.raw`(?:wire|thickness|thick)[^0-9,]{0,14}${DIGITS}|${DIGITS}\s*mm\s*(?:thick\s*)?wire`),
  );
  // Both word orders: "70 mm long" and "free length 70".
  const lengthPatterns = [
    new RegExp(String.raw`${DIGITS}\s*(?:mm|millimet(?:er|re)s?)?\s*(?:in\s+)?(?:free\s*length|long\b|length\b)`),
    new RegExp(String.raw`(?:free\s*length|length)\s*(?:is|of|=|:|~|approx\.?|about)?\s*${DIGITS}`),
    new RegExp(String.raw`${DIGITS}\s*(?:mm|millimet(?:er|re)s?)\b(?!\s*(?:wire|thick|diameter|dia|ø|od))`),
  ];
  const diameterPatterns = [
    new RegExp(String.raw`(?:ø|outer\s*diameter|outside\s*diameter|\bod\b|diameter|\bdia\b)[^0-9,]{0,10}${DIGITS}`),
    new RegExp(String.raw`${DIGITS}\s*mm\s*(?:outer|outside|diameter|dia|wide|across)`),
  ];

  if (wireMatch) {
    const mm = num(wireMatch[1] ?? wireMatch[2]);
    if (mm > 0 && mm < 20) next.wire = mm;
  }

  if (crossMatch) {
    const diameter = num(crossMatch[1]);
    const length = num(crossMatch[2]);
    if (diameter > 0 && diameter < 200) next.diameter = diameter;
    if (length > 0 && length < 600) next.length = length;
  } else {
    for (const [index, pattern] of lengthPatterns.entries()) {
      const match = haystack.match(pattern);
      if (!match) continue;
      const mm = num(match[1]);
      // The bare "N mm" form is the loosest; never let it re-read the wire diameter.
      if (index === 2 && mm === next.wire) continue;
      if (mm > 0 && mm < 600) next.length = mm;
      break;
    }
    for (const pattern of diameterPatterns) {
      const match = haystack.match(pattern);
      if (!match) continue;
      const mm = num(match[1] ?? match[2]);
      if (mm > 0 && mm < 200 && mm !== next.length) next.diameter = mm;
      break;
    }
  }
  if (next.length !== undefined) next.size = next.size ?? sizeFromLength(next.length);

  next.type = next.type ?? firstMatch(haystack, TYPE_WORDS);
  next.action = next.action ?? (next.type ? ACTION_FOR_TYPE[next.type] : firstMatch(haystack, ACTION_WORDS));
  // "medium load", "heavy duty" are load classes off a die-spring datasheet. They say
  // nothing about how long the spring is, so they must not set the size band.
  const sizeHaystack = haystack.replace(/\b(?:light|medium|heavy|extra\s*heavy)\s+(?:load|duty)\b/g, " ");
  next.size = next.size ?? firstMatch(sizeHaystack, SIZE_WORDS);
  next.environment = next.environment ?? firstMatch(haystack, ENVIRONMENT_WORDS);

  for (const kit of kits) {
    for (const keyword of kit.profile.keywords) {
      if (includesWord(haystack, keyword) && !next.terms.includes(keyword)) next.terms.push(keyword);
    }
  }

  if (HELP_PATTERNS.some((pattern) => pattern.test(haystack))) next.needsMeasuringHelp = true;
  if (REPLACEMENT_PATTERNS.some((pattern) => pattern.test(haystack))) next.replacement = true;

  // Fluency decides the tone, not the ranking. Dimensions and catalogue vocabulary
  // mean we can talk specs; "I don't know" means we explain everything.
  const soundsExpert =
    next.wire !== undefined ||
    (next.length !== undefined && next.diameter !== undefined) ||
    EXPERT_WORDS.some((word) => includesWord(haystack, word)) ||
    (next.type !== undefined && next.length !== undefined);
  const soundsNovice =
    next.needsMeasuringHelp || UNSURE_PATTERNS.some((pattern) => pattern.test(haystack));

  if (soundsExpert && !next.needsMeasuringHelp) next.fluency = "expert";
  else if (soundsNovice || next.fluency === "unknown") next.fluency = soundsNovice ? "novice" : next.fluency;

  return next;
}

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
const QUESTIONS: Question[] = [
  {
    id: "action",
    prompt: "What does the spring need to do?",
    note: "If you have the part in your hand, the ends give it away.",
    options: [
      { label: "Pull two things together", value: "pull", hint: "A hook or loop at each end — an extension spring" },
      { label: "Push two things apart", value: "push", hint: "Open coils, no hooks — a compression spring" },
      { label: "Return a lever or hinge", value: "rotate", hint: "Two straight legs stick out — a torsion spring" },
      { label: "I'm not sure", value: "unknown", hint: "Show me how to tell them apart" , opensGuide: true },
    ],
  },
  {
    id: "size",
    prompt: "Roughly how long is it when nothing is pulling on it?",
    note: "No ruler needed — hold it against a coin or your hand.",
    options: [
      { label: "Shorter than a 1 € coin", value: "small", hint: "Under about 30 mm" },
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
      { label: "Indoors and dry", value: "indoor", hint: "Zinc-plated steel is fine" },
      { label: "Outdoors or damp", value: "outdoor", hint: "Needs stainless or heavy zinc" },
      { label: "Both, or I don't know", value: "unknown", hint: "I'll keep both in" },
    ],
  },
];

/**
 * Someone who has given a length and a wire diameter has already answered more
 * precisely than the questions can, so they get the results instead of the quiz.
 */
export const hasFullSpec = (criteria: Criteria) =>
  criteria.length !== undefined &&
  (criteria.wire !== undefined || criteria.diameter !== undefined) &&
  known(criteria.action) !== undefined;

export const nextQuestion = (criteria: Criteria): Question | undefined =>
  hasFullSpec(criteria) ? undefined : QUESTIONS.find((question) => criteria[question.id] === undefined);

export const answeredCount = (criteria: Criteria) =>
  QUESTIONS.filter((question) => criteria[question.id] !== undefined).length;

export const totalQuestions = QUESTIONS.length;

export interface ScoredKit {
  kit: Kit;
  score: number;
  reasons: string[];
  /** The single component that best explains why this kit was returned. */
  highlight?: SpringComponent;
  /** True when the highlighted spring is the stated size, not merely the nearest. */
  exact?: boolean;
}

export function rankKits(criteria: Criteria): ScoredKit[] {
  const action = known<SpringAction>(criteria.action);
  const size = known<SizeBand>(criteria.size);
  const environment = known<Environment>(criteria.environment);

  const scored = kits.map((kit) => {
    let score = 0;
    const reasons: string[] = [];

    if (action && kit.profile.actions.includes(action)) {
      score += 4;
      reasons.push(
        action === "pull"
          ? "holds extension springs, the kind that pull"
          : action === "push"
            ? "holds compression springs, the kind that push"
            : "holds torsion springs, the kind that return a lever",
      );
    }
    if (size && kit.profile.sizes.includes(size)) {
      score += 3;
      reasons.push(
        size === "small"
          ? "is sized for parts under 30 mm"
          : size === "medium"
            ? "covers the 30 to 80 mm range"
            : "covers long springs over 80 mm",
      );
    }
    if (environment && kit.profile.environments.includes(environment)) {
      score += 2;
      reasons.push(
        environment === "outdoor"
          ? "has corrosion-resistant finishes throughout"
          : "is finished for dry indoor use",
      );
    }
    if (criteria.type && kit.components.some((component) => component.type === criteria.type)) {
      score += 2;
    }

    const matchedTerms = criteria.terms.filter((term) => kit.profile.keywords.includes(term));
    score += Math.min(matchedTerms.length * 2, 6);

    // A stated dimension is the strongest signal there is — it can name one exact spring.
    let highlight: SpringComponent | undefined;
    let exact = false;
    if (criteria.length) {
      const candidates = kit.components
        .filter((component) => (action ? component.action === action : true))
        .filter((component) => (criteria.type ? component.type === criteria.type : true))
        .map((component) => ({
          component,
          delta: Math.abs(component.freeLength - criteria.length!),
          wireDelta: criteria.wire ? Math.abs(component.wireDiameter - criteria.wire) : 0,
          diaDelta: criteria.diameter ? Math.abs(component.outerDiameter - criteria.diameter) : 0,
        }))
        .sort(
          (a, b) =>
            a.delta + a.wireDelta * 4 + a.diaDelta * 2 - (b.delta + b.wireDelta * 4 + b.diaDelta * 2),
        );

      const best = candidates[0];
      if (best && best.delta <= 12) {
        highlight = best.component;
        exact = best.delta <= 0.5 && best.wireDelta <= 0.05 && best.diaDelta <= 0.5;
        score += exact ? 9 : best.delta <= 5 ? 5 : 2;
        reasons.unshift(
          exact
            ? `contains ${best.component.code} at exactly Ø${best.component.outerDiameter} × ${best.component.freeLength} mm`
            : `holds the nearest size, ${best.component.code} at Ø${best.component.outerDiameter} × ${best.component.freeLength} mm`,
        );
      }
    }

    // A wire diameter with no length still names a section of the range.
    if (!highlight && criteria.wire) {
      const nearest = kit.components
        .filter((component) => (action ? component.action === action : true))
        .filter((component) => (criteria.type ? component.type === criteria.type : true))
        .map((component) => ({ component, delta: Math.abs(component.wireDiameter - criteria.wire!) }))
        .sort((a, b) => a.delta - b.delta)[0];
      if (nearest && nearest.delta <= 0.15) {
        highlight = nearest.component;
        score += 3;
        reasons.unshift(`carries ${nearest.component.code} in ${criteria.wire} mm wire`);
      }
    }

    if (!highlight && action) {
      highlight = kit.components.find((component) => component.action === action);
    }

    return { kit, score, reasons, highlight, exact };
  });

  return scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.kit.name.localeCompare(b.kit.name));
}

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
    ? "Replacing one that has failed is the easiest case: keep the old spring to hand. Every spring in the shop has a 1:1 view you can lay the real part against, so you can confirm the match without measuring it."
    : "You don't need exact measurements. Each result is an assortment covering a spread of sizes, so close is enough.";

  // Nothing functional understood yet — don't pretend to summarise.
  if (criteriaSummary(criteria) === "") {
    return [
      criteria.terms.length > 0
        ? "I have a rough idea of the job, but not of the part yet — and that is the normal starting point. Most people don't know the words for spring parts, and you don't need them here."
        : "I did not catch much from that, which is fine. Most people don't know the words for spring parts, and you don't need them here.",
      criteria.replacement
        ? reassurance
        : "A couple of questions about what the spring does and roughly how big it is, and I'll narrow it down. The measuring guide is there at any point if you want the terms.",
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
    if (value === "push") return "A compression spring — open coils that squash down and push back.";
    if (value === "rotate") return "A torsion spring — the coil stays put and the two legs do the work.";
    return "No problem. The guide below shows the three shapes side by side; I'll keep all of them in the running for now.";
  }
  if (questionId === "size") {
    if (value === "small") return "Small, then. That rules out the heavy assortments straight away.";
    if (value === "medium") return "That is the most common range, and the one most assortments cover.";
    if (value === "large") return "Long springs — that narrows it to the heavy-duty assortments.";
    return "Worth doing properly. The guide below has the three measurements and how to take them; come back and pick a band after.";
  }
  if (questionId === "environment") {
    if (value === "outdoor") return "Outdoors it is — I'll favour stainless and heavy zinc finishes.";
    if (value === "indoor") return "Indoors, so plain zinc-plated steel is fine and cheaper.";
  }
  return undefined;
}

/** What the assistant says once it has an answer, branched the same way. */
export function resultReply(top: ScoredKit[], criteria: Criteria): string[] {
  if (top.length === 0) {
    return [
      "I could not narrow that down from what I have. Here is the full range instead — the filters below cut it by spring type and size.",
      "If you tell me what the spring does, or give me any one dimension, I can do better than this.",
    ];
  }

  const best = top[0];
  const expert = criteria.fluency === "expert";
  const lines: string[] = [];

  if (best.exact && best.highlight) {
    const spring = best.highlight;
    lines.push(
      `Found it: ${best.kit.name} contains ${spring.code} — ${SPRING_TYPE_LABEL[spring.type].toLowerCase()}, Ø${spring.outerDiameter} × ${spring.freeLength} mm, wire ${spring.wireDiameter.toFixed(2)} mm. That is the size you described.`,
    );
    lines.push(
      expert
        ? `The assortment carries ${best.kit.components.length} sizes in total, so the neighbouring dimensions come with it. Full spec table, drawing and 3D model are on the assortment page.`
        : `It comes in a box with ${best.kit.components.length - 1} other sizes, which is worth knowing: if your measurement was a millimetre or two out, the right one is still in the box.`,
    );
    if (top.length > 1) {
      lines.push(`${top.length - 1} other assortment${top.length === 2 ? "" : "s"} carry something close, listed below for comparison.`);
    }
    return lines;
  }

  if (best.highlight && criteria.length) {
    const spring = best.highlight;
    lines.push(
      `Nothing sits at exactly that size. The nearest is ${spring.code} in ${best.kit.name}, at Ø${spring.outerDiameter} × ${spring.freeLength} mm, wire ${spring.wireDiameter.toFixed(2)} mm.`,
    );
    lines.push(
      expert
        ? "Check it against your part on the assortment page — every spring there lists free length, wire diameter, spring rate and working load."
        : "Before ordering, open it and compare your spring against the 1:1 size view. That catches a mismatch far more reliably than reading numbers off a ruler.",
    );
    return lines;
  }

  lines.push(
    top.length === 1
      ? `One assortment fits: ${best.kit.name}, because it ${best.reasons[0] ?? "matches what you described"}.`
      : `${top.length} assortments fit. The closest is ${best.kit.name}, because it ${best.reasons[0] ?? "matches what you described"}.`,
  );
  lines.push(
    expert
      ? "Each assortment page lists every spring inside it with full dimensions, spring rate and working load."
      : "Open one to see every spring inside it. Each spring has a 3D view and a 1:1 size view you can hold a real part against — so you can confirm the match without measuring anything.",
  );
  return lines;
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
    how: "The hard one. Push ten coils together, measure that length, and divide by ten. A 1.2 mm wire gives 12 mm across ten coils.",
  },
] as const;

/**
 * Two doors into the same conversation: describe the problem in plain words, or
 * state a spec. Both are first-class, which is the point of the design.
 */
export const STARTER_PROMPTS: { text: string; kind: "describe" | "spec" }[] = [
  { text: "The spring in my gate latch snapped", kind: "describe" },
  { text: "I need something to pull a door shut on its own", kind: "describe" },
  { text: "A tiny spring for a battery compartment", kind: "describe" },
  { text: "I don't know how to measure it", kind: "describe" },
  { text: "Extension spring, Ø10 × 70 mm, wire 1.2", kind: "spec" },
  { text: "Compression spring, 25 mm free length, wire 1.0", kind: "spec" },
  { text: "Die springs, ISO 10243 medium load", kind: "spec" },
];
