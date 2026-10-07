/**
 * Replays scripted participant sessions through the spring finder, exactly as the
 * home page drives it, and checks where each one ends up.
 *
 *   npm run check:dialogue
 *   npm run check:dialogue -- --verbose     full transcripts
 *
 * Every session belongs to one of the test springs (the components flagged
 * `target: true` in src/data/kits.ts) and is a list of things a participant holding
 * that spring might type. Questions the script leaves unanswered are answered by
 * clicking the button that is true for that spring, so each line tests one phrasing,
 * not a whole perfect conversation.
 *
 * Add a line whenever a pilot participant types something the finder fumbles.
 */
import { testTargets } from "@/data/kits";
import { emptyCriteria, interpret, nextQuestion, rankKits, type Criteria, type Question, type ScoredKit } from "@/lib/search";
import { respond, type DialogueState } from "@/lib/dialogue";
import type { SpringComponent } from "@/data/types";

if (testTargets.length === 0) throw new Error("No component is flagged target: true in src/data/kits.ts");

const byType = (type: SpringComponent["type"]) => {
  const found = testTargets.find(({ component }) => component.type === type);
  if (!found) throw new Error(`No ${type} test spring is flagged in src/data/kits.ts`);
  return found;
};

/** The two springs participants are handed. */
const C = byType("compression");
const E = byType("extension");
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
  transcript.push(`> ${messages[0]}`);

  let restarted = false;
  for (const message of messages.slice(1)) {
    if (restarted) {
      restarted = false;
      criteria = interpret(message, emptyCriteria());
      question = nextQuestion(criteria);
      results = question ? [] : rankKits(criteria).slice(0, 3);
      transcript.push(`> ${message}`);
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
  // ── Spring 1: compression Ø5.5 × 40 — opening messages ──
  ["target", C, ["5.5x40mm spring"]],
  ["target", C, ["5.5 x 40"]],
  ["target", C, ["5,5 x 40 mm"]],
  ["target", C, ["40x5.5"]],
  ["target", C, ["Ø5.5 × 40 mm"]],
  ["target", C, ["5.5mm x 40mm compression spring"]],
  ["target", C, ["compression spring 5.5mm diameter 40mm long"]],
  ["target", C, ["40mm long and 5.5mm wide"]],
  ["target", C, ["its about 4cm long and half a cm wide"]],
  ["target", C, ["compresion sprng 5.5x40"]],
  ["target", C, ["40mm push spring"]],
  ["target", C, ["a spring that pushes, about 4 cm"]],
  ["target", C, ["long thin spring with flat ends"]],
  ["target", C, ["a spring with no hooks"]],
  ["target", C, ["it squashes down and pushes back"]],
  ["target", C, ["compression spring"]],
  ["target", C, ["Druckfeder 5,5 x 40"]],

  // ── Spring 2: extension Ø8 × 46 — opening messages ──
  ["target", E, ["8x46mm extension spring"]],
  ["target", E, ["8 x 46"]],
  ["target", E, ["46x8"]],
  ["target", E, ["Ø8 × 46 mm"]],
  ["target", E, ["extension spring 8mm diameter 46mm long"]],
  ["target", E, ["46mm long, 8mm wide, loops on both ends"]],
  ["target", E, ["extention spring 8x46"]],
  ["target", E, ["tension spring 46 mm"]],
  ["target", E, ["spring with loops at each end"]],
  ["target", E, ["spring with a ring on both ends, about 4.6cm"]],
  ["target", E, ["a spring that pulls two things together"]],
  ["target", E, ["the coils are touching and it stretches"]],
  ["target", E, ["Zugfeder 8x46"]],

  // ── Either spring: vague openings, then the truth is clicked ──
  ["target", C, ["I need a spring for a robotics project"]],
  ["target", E, ["I need a spring for a robotics project"]],
  ["target", C, ["robotics workshop spring kit"]],
  ["target", E, ["we run a robotics workshop and a student needs this spring"]],
  ["target", C, ["I need a spring for our robot gripper"]],
  ["target", E, ["arduino project spring"]],
  ["target", C, ["spring"]],
  ["target", E, ["hello"]],
  ["target", C, ["I don't know what this is"]],
  ["target", E, ["I don't know how to measure it"]],
  ["target", C, ["I have a spring and need more like it"]],
  ["target", E, ["asdfgh"]],
  ["target", C, ["?"]],
  ["target", E, ["a spring, not for outdoors"]],

  // ── Typed answers instead of button clicks ──
  ["target", C, ["spring for a project", "it pushes", "about 40mm", "indoors"]],
  ["target", C, ["spring for a project", "push", "medium", "inside"]],
  ["target", C, ["spring for a project", "2", "2", "1"]],
  ["target", E, ["spring for a project", "1", "2", "1"]],
  ["target", E, ["spring for a project", "the first one", "the second one", "the first one"]],
  ["target", C, ["spring for a project", "no hooks, flat ends", "40", "workshop"]],
  ["target", E, ["spring for a project", "it has loops", "46", "lab"]],
  ["target", E, ["spring for a project", "you stretch it", "bigger than a coin", "classroom"]],
  ["target", C, ["spring for a project", "compression", "4cm", "both"]],
  ["target", E, ["spring for a project", "I'm not sure", "hooks at each end"]],
  ["target", C, ["spring for a project", "I'm not sure", "flat ends and gaps between the coils"]],
  ["target", E, ["spring for a project", "what's the difference between push and pull?", "pull"]],
  ["target", C, ["spring for a project", "how do I measure it?", "push", "40 mm"]],
  ["target", E, ["spring for a project", "hi", "ok", "pull"]],
  ["target", C, ["spring for a project", "banana", "qwerty", "push"]],
  ["target", C, ["spring for a project", "push", "it's 5.5mm wide and 40mm long"]],
  ["target", E, ["spring for a project", "pull", "I'd rather measure it", "46"]],
  ["target", C, ["spring for our robotics workshop", "it pushes", "40mm", "inside"]],
  // 1.5 inches is 38 mm — close enough that the target is still the nearest spring.
  ["target", C, ["spring", "1.5 inch long, pushes"]],

  // ── Follow-ups after the results ──
  ["target", C, ["spring that pushes, about 40mm, used indoors", "how do I check it matches my spring?"]],
  ["target", E, ["spring with loops, about 46mm, used indoors", "what else is in the Mechatro Kit?"]],
  ["target", C, ["spring that pushes, about 40mm, used indoors", "is this good for beginners?"]],
  ["target", E, ["spring with loops, about 46mm, used indoors", "how much is it?"]],
  ["target", C, ["spring that pushes, about 40mm, used indoors", "can I buy just one?"]],
  ["target", E, ["spring with loops, about 46mm, used indoors", "which kit should I buy?"]],
  ["target", C, ["spring that pushes, about 40mm, used indoors", "what's the difference between the garage kit and the mechatro kit?"]],
  ["target", E, ["spring with loops, about 46mm, used indoors", "thanks"]],
  ["target", C, ["spring that pushes, about 40mm, used indoors", "this is useless", "40"]],
  ["target", C, ["spring that pushes, used indoors", "it's 40mm long"]],
  ["target", E, ["spring that pulls, used indoors", "actually it's 8 x 46"]],
  ["target", C, ["spring", "push", "large", "indoor", "sorry, it's actually 40mm"]],
  ["target", C, ["extension spring", "actually no, it has flat ends, no hooks", "40mm"]],
  ["target", E, ["compression spring", "wait, it has loops on the ends", "46 mm"]],
  ["target", C, ["70 mm extension spring", "wrong one", "5.5 x 40", "oh, it has flat ends"]],
  ["target", E, ["spring that pushes, used indoors", "start over", "8x46"]],

  // ── Both springs in one session: the second is typed after the first result ──
  ["target", E, ["5.5 x 40 compression spring", "I also have an extension spring, 8 x 46"]],
  ["target", C, ["8x46 extension spring", "and a compression spring 5.5x40"]],

  // ── Participant misreads their spring; the finder must still answer sensibly ──
  ["other", C, ["extension spring 10 x 70"]],
  ["other", E, ["big outdoor spring"]],
  ["other", C, ["tiny torsion spring"]],
];

let failures = 0;
for (const [expect, target, messages] of SESSIONS) {
  const { top, transcript } = simulate(messages, target.component);
  const ok =
    expect === "other"
      ? top !== undefined
      : top?.kit === target.kit && (expect === "target-kit" || top.highlight === target.component);
  if (!ok) failures += 1;
  const label = top ? `${top.kit.name}${top.highlight ? ` @ ${top.highlight.code}` : ""}` : "no result";
  console.log(`${ok ? "PASS" : "FAIL"}  [${target.component.type}]  ${messages.join("  →  ")}\n      ${label}`);
  if (!ok || process.argv.includes("--verbose")) console.log(transcript.map((line) => `      ${line}`).join("\n"));
}

console.log(`\n${SESSIONS.length - failures}/${SESSIONS.length} sessions land where they should.`);
if (failures > 0) process.exit(1);
