/**
 * Replays scripted participant sessions through the spring finder, exactly as the
 * home page drives it, and checks where each one ends up.
 *
 *   npm run check:dialogue
 *   npm run check:dialogue -- --verbose     full transcripts
 *
 * Every session is a list of things a participant holding the test spring (the
 * component flagged `target: true` in src/data/kits.ts) might type. Questions the
 * script leaves unanswered are answered by clicking the button that is true for that
 * spring, so each line tests one phrasing, not a whole perfect conversation.
 *
 * Every session also fails if any reply names a make or model (see USE_CATEGORIES in
 * src/lib/search.ts): the finder talks about bikes and doors, never brands.
 *
 * Add a line whenever a pilot participant types something the finder fumbles.
 */
import { testTargets } from "@/data/kits";
import {
  ALL_BRANDS,
  emptyCriteria,
  interpret,
  nextQuestion,
  openingReply,
  rankKits,
  resultReply,
  STARTER_PROMPTS,
  type Criteria,
  type Question,
  type ScoredKit,
} from "@/lib/search";
import { respond, type DialogueState } from "@/lib/dialogue";
import type { SpringComponent } from "@/data/types";

if (testTargets.length === 0) throw new Error("No component is flagged target: true in src/data/kits.ts");

/** The spring participants are handed. */
const C = testTargets[0];
type Target = typeof C;

const truthFor = (spring: SpringComponent): Record<Question["id"], string> => ({
  action: spring.action,
  size: spring.sizeBand,
  environment: "indoor",
});

interface Outcome {
  top?: ScoredKit;
  transcript: string[];
}

function simulate(messages: string[], spring: SpringComponent): Outcome {
  const truth = truthFor(spring);
  const transcript: string[] = [];
  let criteria: Criteria = interpret(messages[0], emptyCriteria());
  let question = nextQuestion(criteria);
  let results: ScoredKit[] = question ? [] : rankKits(criteria).slice(0, 3);
  let misses = 0;
  transcript.push(`> ${messages[0]}`, ...openingReply(criteria).map((line) => `  ${line}`));

  let restarted = false;
  for (const message of messages.slice(1)) {
    if (restarted) {
      restarted = false;
      criteria = interpret(message, emptyCriteria());
      question = nextQuestion(criteria);
      results = question ? [] : rankKits(criteria).slice(0, 3);
      transcript.push(`> ${message}`, ...openingReply(criteria).map((line) => `  ${line}`));
      continue;
    }
    const state: DialogueState = { criteria, question, results, misses };
    const turn = respond(message, state);
    transcript.push(`> ${message}`, ...turn.said.map((line) => `  ${line}`));
    misses = turn.missed ? misses + 1 : 0;
    if (turn.next === "reset") {
      // The conversation closes; whatever is typed next is a fresh opening message.
      criteria = emptyCriteria();
      question = undefined;
      results = [];
      restarted = true;
      continue;
    }
    criteria = turn.criteria;
    if (turn.next === "advance") {
      question = nextQuestion(criteria);
      if (!question) results = rankKits(criteria).slice(0, 3);
    } else if (turn.next === "rerank") {
      question = undefined;
      results = rankKits(criteria).slice(0, 3);
    }
  }

  // Click through whatever is still being asked, truthfully for this spring.
  while (question) {
    criteria = { ...criteria, [question.id]: truth[question.id] } as Criteria;
    transcript.push(`[clicks ${question.id}: ${truth[question.id]}]`);
    question = nextQuestion(criteria);
    if (!question) results = rankKits(criteria).slice(0, 3);
  }
  transcript.push(...resultReply(results, criteria).map((line) => `  ${line}`));
  return { top: results[0], transcript };
}

/**
 * "target"      the top result is the spring's kit, highlighting that spring
 * "target-kit"  the top result is the spring's kit (highlight may differ)
 * "other"       the participant said something untrue of their spring; just make sure
 *               the finder still answers (top result exists)
 */
type Expect = "target" | "target-kit" | "other";

const SESSIONS: [Expect, Target, string[]][] = [
  // ── Opening messages with numbers ──
  ["target", C, ["4.5x38mm spring"]],
  ["target", C, ["4.5 x 38"]],
  ["target", C, ["4,5 x 38 mm"]],
  ["target", C, ["38x4.5"]],
  ["target", C, ["Ø4.5 × 38 mm"]],
  ["target", C, ["4.5mm x 38mm compression spring"]],
  ["target", C, ["compression spring 4.5mm diameter 38mm long"]],
  ["target", C, ["38mm long and 4.5mm wide"]],
  ["target", C, ["its about 4cm long and half a cm wide"]],
  ["target", C, ["compresion sprng 4.5x38"]],
  ["target", C, ["38mm push spring"]],
  ["target", C, ["a spring that pushes, about 4 cm"]],
  ["target", C, ["Druckfeder 4,5 x 38"]],
  // The task card calls the wire "coil diameter", so participants copy that wording.
  ["target", C, ["0.5mm coil diameter, 38mm length, 4.5mm diameter"]],
  ["target", C, ["coil diameter 0.5 mm, length 38 mm, diameter 4.5 mm"]],
  ["target", C, ["spring with 0.5mm coil diameter, 38mm long and 4.5mm diameter"]],
  ["target", C, ["4.5mm diameter, 38mm long, 0.5mm wire"]],
  ["target", C, ["0.5 x 4.5 x 38"]],
  ["target", C, ["38mm long, 4.5mm wide, 0.5mm thick"]],
  ["target", C, ["0.5mm coil diameter"]],

  // ── Opening messages that describe it ──
  ["target", C, ["long thin spring with flat ends"]],
  ["target", C, ["a spring with no hooks"]],
  ["target", C, ["it squashes down and pushes back"]],
  ["target", C, ["compression spring"]],

  // ── The starter prompts on the home page, then the truth is clicked or typed ──
  ...STARTER_PROMPTS.map((prompt): [Expect, Target, string[]] => ["target", C, [prompt.text]]),
  ["target", C, ["I want to find a spring like mine", "it has flat ends", "38mm", "indoors"]],
  ["target", C, ["Which spring do I need for my bike?", "push", "about 4 cm", "inside"]],
  ["target", C, ["I'm looking for a spring for a door", "it pushes", "38", "indoor"]],
  ["target", C, ["I don't know how to measure a spring", "push", "38 mm"]],

  // ── Brands are recognised, never repeated; the spring still decides ──
  ["target", C, ["spring for my Canyon bike"]],
  ["target", C, ["I need a spring for a Volvo truck"]],
  ["target", C, ["spring for an Arduino robot"]],
  ["target", C, ["spring like mine", "will it fit my Volvo?", "push", "38"]],
  ["target", C, ["Which spring do I need for my bike?", "does it fit a Shimano brake?", "flat ends", "38mm"]],
  ["target", C, ["spring for a door", "is this compatible with my door?", "push", "38"]],
  ["target", C, ["spring that pushes, about 38mm, used indoors", "it's for my lego robot"]],

  // ── Vague openings, then the truth is clicked ──
  ["target", C, ["I need a spring for a robotics project"]],
  ["target", C, ["robotics workshop spring kit"]],
  ["target", C, ["we run a robotics workshop and a student needs this spring"]],
  ["target", C, ["I need a spring for our robot gripper"]],
  ["target", C, ["arduino project spring"]],
  ["target", C, ["spring"]],
  ["target", C, ["hello"]],
  ["target", C, ["I don't know what this is"]],
  ["target", C, ["I don't know how to measure it"]],
  ["target", C, ["I have a spring and need more like it"]],
  ["target", C, ["asdfgh"]],
  ["target", C, ["?"]],
  ["target", C, ["a spring, not for outdoors"]],

  // ── Typed answers instead of button clicks ──
  ["target", C, ["spring for a project", "it pushes", "about 38mm", "indoors"]],
  ["target", C, ["spring for a project", "push", "medium", "inside"]],
  ["target", C, ["spring for a project", "2", "2", "1"]],
  ["target", C, ["spring for a project", "the second one", "the second one", "the first one"]],
  ["target", C, ["spring for a project", "no hooks, flat ends", "38", "workshop"]],
  ["target", C, ["spring for a project", "you squash it", "bigger than a coin", "classroom"]],
  ["target", C, ["spring for a project", "compression", "4cm", "both"]],
  ["target", C, ["spring for a project", "I'm not sure", "flat ends and gaps between the coils"]],
  ["target", C, ["spring for a project", "what's the difference between push and pull?", "push"]],
  ["target", C, ["spring for a project", "how do I measure it?", "push", "38 mm"]],
  ["target", C, ["spring for a project", "hi", "ok", "push"]],
  ["target", C, ["spring for a project", "banana", "qwerty", "push"]],
  ["target", C, ["spring for a project", "push", "it's 4.5mm wide and 38mm long"]],
  ["target", C, ["spring for a project", "push", "I'd rather measure it", "38"]],
  ["target", C, ["spring for our robotics workshop", "it pushes", "38mm", "inside"]],
  // 1.5 inches is 38 mm — the target's length to the millimetre.
  ["target", C, ["spring", "1.5 inch long, pushes"]],

  // ── Follow-ups after the results ──
  ["target", C, ["spring that pushes, about 38mm, used indoors", "how do I check it matches my spring?"]],
  ["target", C, ["spring that pushes, about 38mm, used indoors", "what else is in the Mechatro Kit?"]],
  ["target", C, ["spring that pushes, about 38mm, used indoors", "is this good for beginners?"]],
  ["target", C, ["spring that pushes, about 38mm, used indoors", "how much is it?"]],
  ["target", C, ["spring that pushes, about 38mm, used indoors", "can I buy just one?"]],
  ["target", C, ["spring that pushes, about 38mm, used indoors", "which kit should I buy?"]],
  ["target", C, ["spring that pushes, about 38mm, used indoors", "what's the difference between the garage kit and the mechatro kit?"]],
  ["target", C, ["spring that pushes, about 38mm, used indoors", "thanks"]],
  ["target", C, ["spring that pushes, about 38mm, used indoors", "this is useless", "38"]],
  ["target", C, ["spring that pushes, used indoors", "it's 38mm long"]],
  ["target", C, ["spring", "push", "large", "indoor", "sorry, it's actually 38mm"]],
  ["target", C, ["extension spring", "actually no, it has flat ends, no hooks", "38mm"]],
  ["target", C, ["70 mm extension spring", "wrong one", "4.5 x 38", "oh, it has flat ends"]],
  ["target", C, ["spring that pulls, used indoors", "start over", "4.5x38"]],

  // ── Participant misreads their spring; the finder must still answer sensibly ──
  ["other", C, ["extension spring 10 x 70"]],
  ["other", C, ["big outdoor spring"]],
  ["other", C, ["tiny torsion spring"]],
  ["other", C, ["I need a door to close itself"]],
];

/** A reply that names a make or model breaks the disclosure policy, wherever it lands. */
const brandLeak = (transcript: string[]) =>
  transcript
    .filter((line) => !line.startsWith(">"))
    .flatMap((line) => ALL_BRANDS.filter((brand) => new RegExp(`(^|[^a-z])${brand}([^a-z]|$)`, "i").test(line)));

let failures = 0;
for (const [expect, target, messages] of SESSIONS) {
  const { top, transcript } = simulate(messages, target.component);
  const leaked = brandLeak(transcript);
  const ok =
    leaked.length === 0 &&
    (expect === "other"
      ? top !== undefined
      : top?.kit === target.kit && (expect === "target-kit" || top.highlight === target.component));
  if (!ok) failures += 1;
  const label = top ? `${top.kit.name}${top.highlight ? ` @ ${top.highlight.code}` : ""}` : "no result";
  console.log(`${ok ? "PASS" : "FAIL"}  ${messages.join("  →  ")}\n      ${label}${leaked.length > 0 ? `  — said a brand: ${leaked.join(", ")}` : ""}`);
  if (!ok || process.argv.includes("--verbose")) console.log(transcript.map((line) => `      ${line}`).join("\n"));
}

console.log(`\n${SESSIONS.length - failures}/${SESSIONS.length} sessions land where they should.`);
if (failures > 0) process.exit(1);
