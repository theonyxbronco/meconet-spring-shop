# Test playthrough — robotics workshop scenario

The staged path a participant takes through the prototype, what the spring finder says
at each point, and how it pulls people back when they wander. Use it to brief
moderators and to know what "on track" looks like while you observe.

**The participant's task:** as a robotics workshop master, find the spring a workshop
user brought in and choose the kit that best fits the workshop.

**The physical spring:** compression, Ø4.5 × 38 mm, wire 0.5 mm — long and thin, open
coils, flat ends, no hooks. It is the first compartment of the real Mechatro Basic box.

**The correct answer:** the **Mechatro Kit** (Basic, part 2734689, €20), spring
**VC00500450380S** — compression, Ø4.5 × 38 mm, wire 0.50, stainless, 10 pcs.

> The spring's numbers live in `src/data/kits.ts` (the component flagged `target: true`).
> The wire diameter is an estimate fitted to the product photo — **measure the real
> spring's wire** and correct that line, then run `npm run check:dialogue`. The dialogue,
> specs, drawing and 3D model all follow.

## Where it sits in the box

In the physical box it is compartment 1. **On the kit page it is listed 4th of 12**, on
purpose: the page opens on the first spring, and a participant who simply opened the kit
would otherwise land on the answer without looking. Now the page opens on a short, wide
Ø7 × 13 spring, and they have to find theirs among the compression springs.

| Position on the page | Spring | Why it matters |
|---|---|---|
| 1 | compression Ø7 × 13 | What the page opens on — obviously not it |
| 2–3 | compression Ø9 × 15, Ø9 × 19 | Same kind, far too short and wide |
| **4** | **compression Ø4.5 × 38, wire 0.50** | **The test spring** |
| 5 | compression Ø5 × 44, wire 0.90 | The look-alike: half a millimetre wider, 6 mm longer, thicker wire |

Arriving from the chat button or the card's *View details* still opens the page with the
right spring selected — the position only matters for someone who browses in.

## Decoys the participant must rule out

| Spring | Why it is wrong | How they would notice |
|---|---|---|
| Mechatro Ø5 × 44, wire 0.90 (right next to it) | Half a millimetre wider, 6 mm longer, thicker wire | 1:1 view overhangs; spec L0 44 |
| Garage Kit Ø12 × 38 | Same length, nearly three times as wide | 1:1 view; spec Do 12 |

No other kit has anything close, so the task is mostly about picking the right spring
inside the right kit.

---

## The expected path

### Task 1 — Search

The home page shows the search field and four starter prompts:

- *I want to find a spring like mine*
- *Which spring do I need for my bike?*
- *I'm looking for a spring for a door*
- *I don't know how to measure a spring*

Every starter gets a friendly opening that teaches something before the first question.
"Like mine" gets a tip to look at the ends; bike and door explain which kinds of spring
those use and where; the measuring one opens the guide. None of them is the test spring.
A participant who clicks bike or door still lands on the Mechatro Kit once they answer
truthfully about their spring.

What participants are most likely to type, and what happens:

| They type | The finder |
|---|---|
| `4.5x38`, `4,5 x 38 mm`, `38mm long 4.5mm wide`, `Ø4.5×38`, `0.5mm coil diameter, 38mm length, 4.5mm diameter` | Skips the questions. *"Found it: Mechatro Kit contains VC00500450380S…"* |
| `spring for our robotics workshop`, `robot project spring` | A short intro on the springs robotics projects use, then asks what the spring does |
| `flat ends, no hooks`, `it squashes down`, `compression spring` | Picks up "push", asks only what is missing |
| `38mm`, `about 4 cm` | Takes it as the length; after the questions says Mechatro has one *exactly 38 mm long* and asks them to check the width |
| `I don't know`, `hello`, gibberish | Reassures, then asks what the spring does |

The questions, and the answer that is true for this spring:

| Question | Answer |
|---|---|
| What does the spring need to do? | *Push two things apart* |
| Roughly how long is it? | *Coin to palm width* (or type `38`) |
| Where does the part spend its life? | *Indoors and dry* |

The third question is skipped if they said "workshop", "lab", "classroom" or "inside".
They can click **or type** — `2`, `the second one`, `it pushes`, `flat ends`,
`about 4 cm`, `inside` all work.

**Measure on screen** sits directly under the answer buttons. It opens a life-size ruler
the participant can lay the spring on to get the length — watch whether they find it on
the size question.

**On track when:** the Mechatro Kit is the top card, its chip reads *Includes
VC00500450380S · Ø4.5 × 38 mm*, and the chat shows **Open the Mechatro Kit at
VC00500450380S**.

### Task 2 — Inspect

They open the kit from the chat button or the card's *View details*. Both land on the
kit page with the spring already selected in "What's included", and its specification
and drawing below it.

Three tap-to-ask chips appear under the chat once there are results. Each moves them a
stage on, and each answer is written to be warm and useful on its own:

- *How do I check it matches my spring?* → a numbered three-step check (Task 3)
- *What else is in the Mechatro Kit?* → what it's for, how many springs of each kind, price
- *Is this a good kit for people new to springs?* → the "fits the workshop" argument,
  in kit-neutral terms (forgiving size spread, all three kinds in one box)

**On track when:** they read the kit description and scroll through its contents.

### Task 3 — Cross-check

On the component: the 3D viewer, the dimensioned drawing (Do, L0, d), and the 1:1
actual-size overlay. **Calibrate the overlay on the test machine before the first
session** (open it → *Calibrate for this screen* → match a bank card).

**On track when:** they hold the physical spring against the 1:1 view, or read a number
off the drawing and compare it with the spring. Watch whether they notice the Ø5 × 44
next to it and rule it out.

### Final selection

They add the Mechatro Kit to the order. Success = Mechatro Kit (Basic) in the cart.
Bonus observation: did they verify the specific spring, or stop at "right box"?

---

## When they go off the path

The finder never dead-ends. Every reply ends with the next step — the open question,
or "open the Mechatro Kit at VC00500450380S and compare it with your spring".

| What happens | What the finder does | Moderator |
|---|---|---|
| Gets the **kind** wrong (says pull) | Ranks the wrong kind, then adds *"If your spring has flat ends and gaps between the coils… it's a different kind — tell me"* | Wait. Most notice when they look at the ends. |
| Wrong kind but types the right size | *"There is an exact Ø4.5 × 38 mm in the Mechatro Kit, but it's a compression spring — flat ends and gaps between the coils"* | Wait. |
| Corrects themselves (`actually it has flat ends`, `sorry it's 38mm`) | Re-ranks on the spot: *"Got it — updating…"* | — |
| Picks the wrong size band | Results lean to the wrong kits. Typing any length fixes it. | Prompt only if stuck: *"Is there anything else you can tell it about the spring?"* |
| Says **outdoors** | Mechatro drops in the ranking (it's indoor-only), but still shows if in the top three | Note it as a finding — the scenario is a workshop |
| Clicks the **bike** or **door** starter | Category intro, then the same three questions; truthful answers land on Mechatro | — |
| Names a **brand** (`my Canyon bike`, `will it fit my Volvo?`) | Says it can't vouch for makes or models, talks only about the category, goes back to the spring | Good probe for the interview |
| Asks **how to measure** / **what's the difference** | Answers, points at *Measure on screen*, opens the guide; the open question stays | — |
| Asks price, delivery, single springs, material, force | Short factual answer, then the next step | — |
| Asks **which kit** / **recommend** | Names the top kit and the spring, plus a runner-up, and *"the only real test is your spring against the part on its page"* | — |
| Asks if it suits **beginners / students / our users** | Kit-neutral argument; points at the kit description to read against their workshop | Good moment to probe in the interview |
| Frustrated (`this is useless`, `wrong one`) | Apologises and gives the shortest route: type the length in mm, or look at the ends | — |
| Unrecognised text | Rotating "I didn't follow" lines, getting more concrete each time, always with the next step | If three in a row, note it and add the phrase to the check script |
| `start over` | Clears the chat | — |

### What the finder will not do

- **Name a brand, make or model.** It may say "a bike", "a door", "a truck" — never
  which brand a spring suits, and never that a spring fits a particular product. Brands
  are recognised only to steer back to the spring. The check script fails if any reply
  contains one. This is deliberate (disclosure policy) — if participants comment on it,
  that's a finding, not a bug.
- **Say "this is your spring" from one measurement.** A length alone gets *"has one
  exactly 38 mm long — check the width"*. Only two matching dimensions get *"Found it"*.

---

## Before each session

1. Calibrate the 1:1 overlay (once per machine).
2. Clear the cart from the cart page.
3. Reload the home page so the chat is empty.

## After a pilot

If a participant typed something the finder fumbled, add it to `SESSIONS` in
`scripts/check-dialogue.mts` and run:

```bash
npm run check:dialogue                 # pass/fail per session
npm run check:dialogue -- --verbose    # full transcripts
```

Fix the phrase tables in `src/lib/search.ts` (understanding, categories and brands) or
the topics in `src/lib/dialogue.ts` (replies) until it passes.
