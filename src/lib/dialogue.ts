import { kits } from "@/data/kits";
import { SPRING_TYPE_LABEL, type Kit, type SpringAction, type SpringComponent } from "@/data/types";
import {
  answerReply,
  targetsFor,
  criteriaSummary,
  interpret,
  known,
  normalise,
  sizeFromLength,
  MEASURING_STEPS,
  SPRING_SHAPES,
  UNSURE_PATTERNS,
  type Criteria,
  type Question,
  type ScoredKit,
} from "./search";

/**
 * Everything a participant types after their first message.
 *
 * There is no model behind this, so it cannot understand everything — but it never
 * has to. A usability session has one goal: find the spring in your hand, open the
 * kit that holds it, and check the two against each other. Every reply here does two
 * things, in order:
 *
 *   1. Answers what was actually said, as well as a lookup table can — a typed answer
 *      to the open question, a correction, a measurement, or one of the questions
 *      people reliably ask (how do I measure, what does it cost, can I buy one).
 *   2. Ends on the next step towards that goal — the open question again, or "open
 *      this kit at this spring and compare it with yours".
 *
 * So a message the table does not recognise still gets a useful reply: an honest
 * "I didn't follow that" and the next step, never a dead end. The fallback phrasing
 * rotates so a participant who keeps missing does not see the same sentence twice.
 *
 * Like `lib/search.ts`, nothing here names an end product back to the user. Kit
 * descriptions are quoted from the catalogue; the user's own project never is.
 */

export interface ChatLink {
  href: string;
  label: string;
}

export interface DialogueState {
  criteria: Criteria;
  /** The question currently on screen, if any. */
  question?: Question;
  /** The ranked kits currently shown, empty until the first result. */
  results: ScoredKit[];
  /** How many messages in a row were not understood. */
  misses: number;
}

export interface Turn {
  criteria: Criteria;
  said: string[];
  /**
   * What the page should do once the lines are said:
   *   advance — move to the next question, or to results if none are left
   *   rerank  — show results again with the new criteria
   *   stay    — nothing changes; the open question (if any) stays open
   *   reset   — clear the conversation
   */
  next: "advance" | "rerank" | "stay" | "reset";
  openGuide?: boolean;
  link?: ChatLink;
  /** True when nothing in the message was understood. */
  missed?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const has = (text: string, ...patterns: RegExp[]) => patterns.some((pattern) => pattern.test(text));

const dims = (spring: SpringComponent) => `Ø${spring.outerDiameter} × ${spring.freeLength} mm`;

const springLink = (kit: Kit, spring?: SpringComponent): ChatLink =>
  spring
    ? { href: `/assortments/${kit.slug}?spring=${spring.id}`, label: `Open the ${kit.name} at ${spring.code}` }
    : { href: `/assortments/${kit.slug}`, label: `Open the ${kit.name}` };

const typeList = (kit: Kit) => {
  const types = [...new Set(kit.components.map((component) => component.type))];
  const names = types.map((type) => SPRING_TYPE_LABEL[type].toLowerCase().replace(" spring", ""));
  return names.length === 1 ? `${names[0]} springs` : `${names.slice(0, -1).join(", ")} and ${names.at(-1)} springs`;
};

const isQuestion = (text: string) =>
  /\?\s*$/.test(text) ||
  /^\s*(?:what|whats|what's|how|which|why|where|when|who|is|are|can|could|do|does|did|should|would|will|may|tell me|explain)\b/.test(text);

/** The top result, and the spring it pointed at. */
const current = (state: DialogueState) => {
  const best = state.results[0];
  return best ? { kit: best.kit, spring: best.highlight } : undefined;
};

/**
 * The one sentence every reply can end on: whatever moves the participant forward
 * from where they are now.
 */
function nextStep(state: DialogueState): { line: string; link?: ChatLink } {
  if (state.question) {
    return { line: `${state.question.prompt} Pick an answer below, or type it in your own words.` };
  }
  const top = current(state);
  if (top) {
    return {
      line: top.spring
        ? `Next step: open the ${top.kit.name}, select ${top.spring.code} (${dims(top.spring)}) and compare it with your spring — the 1:1 view and the 3D model are both on that page.`
        : `Next step: open the ${top.kit.name} and look through the springs inside — each has a 1:1 view you can hold yours against.`,
      link: springLink(top.kit, top.spring),
    };
  }
  return { line: "Tell me what the spring does, or give me any one measurement — the length is the easiest." };
}

const say = (state: DialogueState, lines: string[], extra: Partial<Turn> = {}): Turn => {
  const step = nextStep(state);
  return {
    criteria: state.criteria,
    said: [...lines, step.line],
    next: "stay",
    link: step.link,
    ...extra,
  };
};

// ─── Typed answers to the open question ──────────────────────────────────────

const ORDINALS: [RegExp, number][] = [
  [/^(?:option\s*)?(?:1|one|first|the first(?: one)?|a)\b/, 0],
  [/^(?:option\s*)?(?:2|two|second|the second(?: one)?|b)\b/, 1],
  [/^(?:option\s*)?(?:3|three|third|the third(?: one)?|c)\b/, 2],
  [/^(?:option\s*)?(?:4|four|fourth|the fourth(?: one)?|d|last|the last(?: one)?)\b/, 3],
];

/** A message that is nothing but a number: "20", "about 20", "~20". */
const LONE_NUMBER = /^\s*(?:about|around|roughly|approx\.?|maybe|~)?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?\s*(?:ish)?\s*[.!]?\s*$/;

/**
 * Reads a typed reply as an answer to the question on screen. Returns the option
 * value, or undefined if the message does not answer it.
 */
function answerFromText(question: Question, raw: string, parsed: Criteria, before: Criteria): string | undefined {
  const text = normalise(raw).trim();
  const short = text.split(" ").length <= 4;

  if (short) {
    const ordinal = ORDINALS.find(([pattern]) => pattern.test(text));
    if (ordinal && question.options[ordinal[1]]) return question.options[ordinal[1]].value;
  }

  const byLabel = question.options.find((option) => text.includes(option.label.toLowerCase()));
  if (byLabel) return byLabel.value;

  if (question.id === "size") {
    const lone = text.match(LONE_NUMBER);
    if (lone) return sizeFromLength(parseFloat(lone[1].replace(",", ".")));
  }

  // Whatever the message said about this question's axis, if it said anything new.
  const value = parsed[question.id];
  if (value !== undefined && value !== before[question.id]) return value;

  if (question.id === "environment" && /\bboth\b|\beither\b|\bdepends\b/.test(text)) return "unknown";
  if (UNSURE_PATTERNS.some((pattern) => pattern.test(text))) return "unknown";
  return undefined;
}

// ─── Questions people reliably ask ───────────────────────────────────────────

interface Topic {
  id: string;
  test: (text: string, state: DialogueState) => boolean;
  reply: (state: DialogueState, text: string) => Turn;
}

const mentionedKits = (text: string) =>
  kits.filter((kit) => {
    const short = kit.name.toLowerCase().replace(" kit", "");
    return new RegExp(`\\b${short}\\b`).test(text);
  });

/** The spring in a kit nearest to what the participant has described so far. */
function nearestIn(kit: Kit, criteria: Criteria): SpringComponent | undefined {
  const action = known<SpringAction>(criteria.action);
  const pool = kit.components.filter((component) => !action || component.action === action);
  if (pool.length === 0) return undefined;
  const fitting = pool.find((component) => targetsFor(criteria).includes(component));
  if (fitting) return fitting;
  if (criteria.length === undefined && criteria.diameter === undefined) return undefined;
  return [...pool].sort(
    (a, b) =>
      Math.abs(a.freeLength - (criteria.length ?? a.freeLength)) +
      2 * Math.abs(a.outerDiameter - (criteria.diameter ?? a.outerDiameter)) -
      (Math.abs(b.freeLength - (criteria.length ?? b.freeLength)) +
        2 * Math.abs(b.outerDiameter - (criteria.diameter ?? b.outerDiameter))),
  )[0];
}

const TOPICS: Topic[] = [
  {
    id: "reset",
    test: (text) => has(text, /^\s*(?:start (?:over|again)|restart|reset|clear|begin again|new search|try again from the start)\b/),
    reply: (state) => ({ criteria: state.criteria, said: [], next: "reset" }),
  },
  {
    id: "frustration",
    test: (text) =>
      has(text, /\b(?:useless|stupid|rubbish|garbage|annoying|wtf|ridiculous|this (?:is|isn'?t) (?:not )?(?:working|helping)|not helpful|doesn'?t work|not working|you'?re wrong|that'?s wrong|wrong (?:one|kit|spring|answer))\b/),
    reply: (state) =>
      say(state, [
        "Sorry — let's take the shortest route. Lay your spring next to a ruler and type its length in mm, end to end. That one number usually narrows it to a single spring.",
        "If you'd rather not measure: look at its ends. Hooks or loops means it pulls, flat ends with gaps between the coils means it pushes, two straight legs means it twists.",
      ]),
  },
  {
    id: "measure",
    test: (text) =>
      has(
        text,
        /\bhow (?:do|can|should|would) (?:i|you|we) (?:measure|check the size|size it|tell (?:the|its) size)/,
        /\bmeasur(?:e|ing|ement)\b/,
        /\bwhat(?:'s| is| does)\s+(?:a |the )?(?:free length|outer diameter|wire (?:diameter|thickness|gauge)|od|ø)\b/,
        /\b(?:caliper|calliper|ruler|tape measure)\b/,
      ),
    reply: (state) =>
      say(
        state,
        [
          `The quick version: ${MEASURING_STEPS[0].term.toLowerCase()} is ${MEASURING_STEPS[0].what.toLowerCase()} ${MEASURING_STEPS[1].term} is ${MEASURING_STEPS[1].what.toLowerCase()} A 1 € coin is 23 mm across if you have nothing else to compare with.`,
          "The full guide is open below. The length is the one that matters most — type it in when you have it.",
        ],
        { openGuide: true },
      ),
  },
  {
    id: "types",
    test: (text) =>
      has(
        text,
        /\b(?:what|which) (?:kind|type|sort)s?\b/,
        /\bdifferen(?:ce|t)\b.*\b(?:spring|type|kind|push|pull|compression|extension|torsion)/,
        /\btell (?:them |it |the types |which )?apart\b/,
        /\bwhat(?:'s| is| are) (?:an? )?(?:compression|extension|torsion|die|disc)(?: spring)?s?\b/,
        /\bhow (?:do|can) i (?:tell|know) (?:which|what)/,
      ),
    reply: (state) =>
      say(
        state,
        [
          `There are three everyday kinds, and the ends give it away. ${SPRING_SHAPES.map((shape) => `${shape.kind}: ${shape.tell.split(".")[0].toLowerCase()}.`).join(" ")}`,
          "The guide below has them side by side.",
        ],
        { openGuide: true },
      ),
  },
  {
    id: "check",
    test: (text) =>
      has(
        text,
        /\b(?:right|correct|same|matching) (?:one|spring|kit|size)\b/,
        /\bis (?:it|this|that) (?:the )?(?:right|correct|same|it|mine|the one)\b/,
        /\b(?:does|will|would) (?:it|this|that) (?:match|fit|be the same)\b/,
        /\b(?:matches|match) (?:mine|my spring|my one)\b/,
        /\bsame as (?:mine|my)\b/,
        /\b(?:compare|comparison|check|verify|confirm|make sure|be sure)\b/,
        /\b(?:1:1|one to one|actual size|real size|3d|three d|drawing|model|viewer)\b/,
      ),
    reply: (state) => {
      const top = current(state);
      if (!top) {
        return say(state, [
          "Once I've found a candidate, you can check it three ways on its page: lay your spring on the 1:1 view, turn the 3D model to compare the ends and coils, and read the dimensions off the drawing.",
        ]);
      }
      const spring = top.spring;
      return say(state, [
        spring
          ? `On the ${top.kit.name} page, select ${spring.code}. Then: lay your spring on the 1:1 view — it should cover it exactly, ${dims(spring)}. Turn the 3D model to compare the ends and how tightly the coils sit. The specification table lists the wire at ${spring.wireDiameter.toFixed(2)} mm.`
          : `On the ${top.kit.name} page, select the spring that looks closest and lay yours on its 1:1 view — it should cover it exactly. The 3D model lets you compare the ends and coils.`,
        "If it's a millimetre or two off, look at the neighbouring sizes in the same box before deciding it is the wrong kit.",
      ]);
    },
  },
  {
    id: "price",
    test: (text) => has(text, /\b(?:price|prices|priced|cost|costs|how much|expensive|cheap|cheaper|cheapest|budget|afford|euros?|eur)\b|€/),
    reply: (state) => {
      const prices = kits.map((kit) => kit.priceEUR);
      const top = current(state);
      return say(state, [
        `Assortments run from €${Math.min(...prices)} to €${Math.max(...prices)}.${top ? ` The ${top.kit.name} is €${top.kit.priceEUR} for ${top.kit.components.reduce((n, c) => n + c.quantity, 0)} springs in ${top.kit.components.length} sizes.` : ""} You pay once for the box and get every size in it, which usually works out cheaper than buying the odd spring twice.`,
      ]);
    },
  },
  {
    id: "delivery",
    test: (text) =>
      has(text, /\b(?:deliver|delivery|delivered|shipping|ship|ships|dispatch|in stock|stock|available|availability|arrive|how (?:fast|soon|quickly))\b/),
    reply: (state) => say(state, ["Every assortment is in stock and ships in 1–2 days."]),
  },
  {
    id: "single",
    test: (text) =>
      has(
        text,
        /\b(?:just|only) (?:one|1|a single|the one|that one|this one|one spring|the spring)\b/,
        /\bsingle spring\b|\bindividual(?:ly)?\b|\bone spring\b|\bloose springs?\b/,
        /\bbuy (?:one|a|the) spring\b/,
      ),
    reply: (state) => {
      const top = current(state);
      return say(state, [
        `Springs are only sold in assortments here — a box that brackets a spread of sizes, so a slightly-off measurement still lands on a spring that fits.${top?.spring ? ` The ${top.kit.name} has ${top.spring.quantity} of ${top.spring.code} alone.` : ""}`,
      ]);
    },
  },
  {
    id: "suitability",
    test: (text) =>
      has(
        text,
        /\b(?:beginners?|novices?|newbies?|students?|pupils?|kids|children|apprentices?|trainees?|inexperienced|non-?experts?|laypeople|people new|new to springs)\b/,
        /\b(?:my|our|the) (?:users|team|group|class|people|members|colleagues)\b/,
        /\b(?:easy to use|user[- ]friendly|good for (?:learning|teaching)|for learning|for teaching)\b/,
        /\b(?:don'?t|do not|dont) know (?:much |anything )?about springs\b/,
        /\b(?:suitable|good fit|right fit|fits? (?:our|my|the) needs?)\b/,
      ),
    reply: (state) => {
      const top = current(state);
      const lines = [
        "For people new to springs, two things make an assortment forgiving: it holds the size you need plus the sizes either side, so a guess a millimetre off still fits — and it mixes the three kinds, so they can try pushing, pulling and twisting without a second order.",
      ];
      if (top) {
        lines.push(
          `The ${top.kit.name} has ${top.kit.components.length} sizes across ${typeList(top.kit)}, each with its own drawing, 3D model and 1:1 view. Its description on the page says what it is built for — worth reading against what your people actually do.`,
        );
      }
      return say(state, lines);
    },
  },
  {
    id: "recommend",
    test: (text) =>
      has(
        text,
        /\b(?:which|what) (?:kit|assortment|box|one|set)\b/,
        /\brecommend|\bsuggest/,
        /\bbest (?:kit|one|option|choice|assortment|fit|match)\b/,
        /\bwhat (?:should|do) (?:i|we) (?:buy|get|order|choose|pick)\b/,
        /\bshould i (?:buy|get|order|choose|pick)\b/,
      ),
    reply: (state) => {
      const top = current(state);
      if (!top) {
        return say(state, [
          "I'll recommend one as soon as I know a little about the spring — what it does and roughly how big it is.",
        ]);
      }
      const runner = state.results[1];
      return say(state, [
        `From what you've told me, the ${top.kit.name}${top.spring ? ` — it holds ${top.spring.code}, ${dims(top.spring)}` : ""}.${runner ? ` The ${runner.kit.name} is the next closest if yours turns out not to match.` : ""}`,
        "Don't take my word for it, though — the only real test is your spring against the part on its page.",
      ]);
    },
  },
  {
    id: "kits",
    test: (text) =>
      mentionedKits(text).length > 0 ||
      has(text, /\bwhat(?:'s| is) (?:in|inside) (?:the|it|this|that)\b|\bcontents?\b|\bwhat (?:sizes|springs) (?:are|come|does|do)\b|\bhow many (?:springs|pieces|sizes)\b/),
    reply: (state, text) => {
      const named = mentionedKits(text);
      const subjects = named.length > 0 ? named.slice(0, 2) : current(state) ? [current(state)!.kit] : [];
      if (subjects.length === 0) {
        return say(state, [`There are ${kits.length} assortments: ${kits.map((kit) => kit.name).join(", ")}. The search ranks them by what your spring does and how big it is.`]);
      }
      const lines = subjects.map((kit) => {
        const near = nearestIn(kit, state.criteria);
        return `${kit.name}: ${kit.shortText} ${kit.components.length} sizes across ${typeList(kit)}, €${kit.priceEUR}.${near ? ` Its closest to what you described is ${near.code}, ${dims(near)}.` : ""}`;
      });
      const focus = subjects[0];
      const near = nearestIn(focus, state.criteria);
      return { ...say(state, lines), link: springLink(focus, near) };
    },
  },
  {
    id: "material",
    test: (text) => has(text, /\b(?:stainless|material|rust|rusting|corrosion|corrode|finish|plated|plating|zinc|metal|steel)\b/),
    reply: (state) =>
      say(state, [
        "Every spring lists its material and finish in its specification table. Indoors either is fine; outdoors or in damp, stainless lasts longer. For matching your spring, the dimensions matter far more than the finish.",
      ]),
  },
  {
    id: "force",
    test: (text) =>
      has(text, /\b(?:strong|stronger|strength|stiff|stiffer|stiffness|force|load|rate|newtons?|how hard|soft|softer|weak|weaker|tension)\b/),
    reply: (state) =>
      say(state, [
        "Each spring's page gives its spring rate — how much force per millimetre you squash or stretch it — and its safe working load, worked through with its own numbers. If the dimensions and wire match yours, the force will too, so match the size first.",
      ]),
  },
  {
    id: "human",
    test: (text) => has(text, /\b(?:human|real person|agent|staff|someone|customer service|call|phone|email|contact)\b/),
    reply: (state) => say(state, ["There's no one on live chat here, but I can get you to the right spring — and every product page has the full specification if you want to check my work."]),
  },
  {
    id: "help",
    test: (text) => has(text, /\b(?:help|what can you do|how does this work|what do i do|what now|now what|what next|next step|stuck|where do i)\b/),
    reply: (state) =>
      say(state, [
        "I find the assortment that contains your spring. Describe it in plain words — what it does, roughly how big — or give me any measurement, and I'll narrow it down. You can ask me things along the way too.",
      ]),
  },
  {
    id: "greeting",
    test: (text) => has(text, /^\s*(?:hi|hello|hey|hiya|howdy|good (?:morning|afternoon|evening)|yo|hallo|hej|moin)\b/),
    reply: (state) => say(state, ["Hello! I'm here to help you find the right spring."]),
  },
  {
    id: "thanks",
    test: (text) =>
      has(text, /^\s*(?:thanks?|thank you|thx|cheers|ok(?:ay)?|k|great|cool|nice|perfect|got it|sounds good|alright|all right|good|fine|understood|makes sense)\b/),
    reply: (state) => say(state, state.question ? [] : ["Glad that helps."]),
  },
  {
    id: "yesno",
    test: (text) => has(text, /^\s*(?:yes|yeah|yep|yup|sure|no|nope|nah|maybe)\b[\s.!]*$/),
    reply: (state) => say(state, state.question ? [] : ["Right."]),
  },
];

const FALLBACKS = [
  "I didn't quite follow that — I'm best with what the spring does, how big it is, or a measurement.",
  "Sorry, that one's beyond me. Try describing the spring itself: its ends, its length, or what it does.",
  "I'm still not getting it, sorry. The simplest thing that works: type the spring's length in mm, end to end.",
];

// ─── The turn ────────────────────────────────────────────────────────────────

/** What changed between two readings, in the terms the assistant reads back. */
function learned(before: Criteria, after: Criteria) {
  const changed = (key: keyof Criteria) => JSON.stringify(before[key]) !== JSON.stringify(after[key]);
  return {
    any: (["action", "size", "environment", "type", "length", "wire", "diameter"] as const).some(changed),
    terms: after.terms.length > before.terms.length,
  };
}

export function respond(raw: string, state: DialogueState): Turn {
  const text = normalise(raw).trim();
  const before = state.criteria;
  let parsed = interpret(raw, before);

  // A lone number is a length — or a width, if we already have one. With a question
  // open, "2" is far more likely to mean the second option; and the size question
  // reads any number as its answer, further down.
  const lone = text.match(LONE_NUMBER);
  const pickedOption = state.question !== undefined && /^\s*[1-4]\s*[.!]?\s*$/.test(text);
  if (lone && !pickedOption && state.question?.id !== "size") {
    const mm = parseFloat(lone[1].replace(",", "."));
    parsed =
      before.length !== undefined && mm < before.length
        ? { ...parsed, diameter: mm }
        : { ...parsed, length: mm, size: sizeFromLength(mm) };
  }

  const reset = TOPICS[0];
  if (reset.test(text, state)) return reset.reply(state, text);

  const topic = TOPICS.find((candidate) => candidate.id !== "reset" && candidate.test(text, state));
  const change = learned(before, parsed);

  // A question gets answered before it is mined for an answer: "what's the difference
  // between push and pull?" mentions push, but is not choosing it. The exception is a
  // question that carries a new fact about the spring itself — "is there a 20 mm one
  // in the Mechatro?" — which is best answered by re-ranking on that fact.
  const factQuestion = change.any && topic !== undefined && ["check", "kits", "recommend"].includes(topic.id);
  if (topic && isQuestion(text) && !factQuestion) return topic.reply(state, text);

  // A typed answer to the question on screen.
  if (state.question) {
    const value = answerFromText(state.question, raw, parsed, before);
    if (value !== undefined) {
      const option = state.question.options.find((candidate) => candidate.value === value);
      const updated = { ...parsed, [state.question.id]: value } as Criteria;
      const acknowledgement = answerReply(state.question.id, value);
      return {
        criteria: updated,
        said: acknowledgement ? [acknowledgement] : [],
        next: "advance",
        openGuide: option?.opensGuide,
      };
    }
  }

  // New facts about the spring, wherever in the conversation they arrive.
  if (change.any) {
    const summary = criteriaSummary(parsed);
    const correction = state.results.length > 0;
    return {
      criteria: parsed,
      said: [
        correction
          ? `Got it — updating: ${summary || "noted"}. Here's the new match.`
          : `Got it. ${summary ? `So far I have: ${summary}.` : ""}`.trim(),
      ],
      next: correction ? "rerank" : "advance",
    };
  }

  if (topic) return topic.reply(state, text);

  // Something about the spring we already knew — "inside", "it pushes" — repeated.
  // Agreeing is better than claiming not to understand.
  const alone = interpret(raw);
  if (["action", "size", "environment", "type", "length", "diameter", "wire"].some((key) => alone[key as keyof Criteria] !== undefined)) {
    return say(state, ["Yes — I have that already."]);
  }

  // Only an end use, nothing about the spring: noted silently, never repeated back.
  if (change.terms) {
    return {
      ...say({ ...state, criteria: parsed }, [
        "Noted. I match on what the spring does and how big it is rather than what it goes into, so the spring itself is the best guide.",
      ]),
      criteria: parsed,
      next: state.results.length > 0 ? "rerank" : "stay",
    };
  }

  const fallback = FALLBACKS[Math.min(state.misses, FALLBACKS.length - 1)];
  return { ...say(state, [fallback]), missed: true };
}

/**
 * Tap-to-ask suggestions under the conversation. They are the steering wheel: each
 * one is a question whose answer moves the participant one stage further through
 * the session (search → inspect → cross-check → choose).
 */
export function suggestions(state: DialogueState): string[] {
  if (state.question) return [];
  const top = current(state);
  if (!top) return [];
  return [
    "How do I check it matches my spring?",
    `What else is in the ${top.kit.name}?`,
    "Is this a good kit for people new to springs?",
  ];
}
