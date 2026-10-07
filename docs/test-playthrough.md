# Test playthrough — robotics workshop scenario

The staged path a participant takes through the prototype, what the spring finder says
at each point, and how it pulls people back when they wander. Use it to brief
moderators and to know what "on track" looks like while you observe.

**The participant's task:** as a robotics workshop master, find the spring a workshop
user brought in and choose the kit that best fits the workshop.

**The physical springs:**

| | Spring | What it looks like |
|---|---|---|
| **1** | Compression, Ø5.5 × 40 mm | Long and thin, open coils, flat ends, no hooks |
| **2** | Extension, Ø8 × 46 mm | Coils touching, a full loop at each end |

**The correct answer:** the **Mechatro Kit** (part 2734689, €20). It holds both:

| | Code | Spec | In the box |
|---|---|---|---|
| 1 | VC00500550400S | compression, Ø5.5 × 40 mm, wire 0.50, stainless | 10 pcs |
| 2 | VE01200800460S | extension, Ø8 × 46 mm, wire 1.20, full loops, stainless | 10 pcs |

> The springs' numbers live in `src/data/kits.ts` (the components flagged `target: true`).
> The wire diameters are estimates fitted to the product photos — **measure the real
> springs' wire** and correct those two lines, then run `npm run check:dialogue`. The
> dialogue, specs, drawing and 3D model all follow.

The finder works whether a participant is handed one spring or both. With both, they
find the first, then type the second into the chat (*"I also have an extension spring,
8 × 46"*) — it re-ranks and points at the second spring in the same kit.

## Decoys the participant must rule out

| Kit | Spring | Why it is wrong | How they would notice |
|---|---|---|---|
| Bike Kit | extension Ø8 × 50, wire 1.00, hooks | 4 mm longer, hooks not loops | 1:1 view: overhangs; open hooks in 3D |
| Garage Kit | extension Ø7 × 47, wire 0.90, loops | 1 mm narrower, 1 mm longer | 1:1 view; spec Do 7.0 |
| Mechatro Kit (same box) | compression Ø5 × 44, wire 0.90 | Half a millimetre narrower, 4 mm longer, thicker wire | 1:1 view; spec L0 44 |
| Mechatro Kit (same box) | extension Ø8 × 28 | Same diameter and loops, far shorter | Obvious in 1:1 view |

Spring 2 has strong decoys in other kits. Spring 1 has none close in another kit — its
nearest look-alikes are in its own box, so Task 3 is about picking the right spring
inside the right kit.

---

## The expected path

### Task 1 — Search

The participant types into the big search field on the home page. Anything works. The
most likely openings, and what happens:

| They type | The finder |
|---|---|
| `5.5x40`, `5,5 x 40 mm`, `40mm long 5.5mm wide`, `Ø5.5×40` | Skips the questions. *"Found it: Mechatro Kit contains VC00500550400S…"* |
| `8x46`, `extension spring 8 x 46`, `46x8`, `Zugfeder 8x46` | Skips the questions. *"Found it: Mechatro Kit contains VE01200800460S…"* |
| `spring for our robotics workshop`, `robot project spring` | Notes it silently (never repeats the end use back), then asks what the spring does |
| `spring with loops at each end`, `flat ends, no hooks`, `it stretches` | Picks up pull or push, asks only what is missing |
| `40mm`, `about 4.6 cm` | Takes it as the length; after the questions says Mechatro has one *exactly that long* and asks them to check the width |
| `I don't know`, `hello`, gibberish | Reassures, then asks what the spring does |

The questions, and the answer that is true for each spring:

| Question | Spring 1 (compression) | Spring 2 (extension) |
|---|---|---|
| What does the spring need to do? | *Push two things apart* | *Pull two things together* |
| Roughly how long is it? | *Coin to palm width* (or type `40`) | *Coin to palm width* (or type `46`) |
| Where does the part spend its life? | *Indoors and dry* | *Indoors and dry* |

The third question is skipped if they said "workshop", "lab", "classroom" or "inside".
They can click **or type** — `2`, `the second one`, `it pushes`, `it has loops`,
`about 4 cm`, `inside` all work.

**On track when:** the Mechatro Kit is the top card, its chip names the right spring
(*Includes VC00500550400S · Ø5.5 × 40 mm* or *Includes VE01200800460S · Ø8 × 46 mm*),
and the chat shows **Open the Mechatro Kit at …**.

### Task 2 — Inspect

They open the kit from the chat button or the card's *View details*. Both land on the
kit page with that spring already selected in "What's included", and its specification
and drawing below it.

Three tap-to-ask chips appear under the chat at this point. Each one moves them a stage on:

- *How do I check it matches my spring?* → step-by-step cross-check (Task 3)
- *What else is in the Mechatro Kit?* → contents, types, price
- *Is this a good kit for people new to springs?* → the "fits the workshop" argument,
  in kit-neutral terms (forgiving size spread, all three kinds in one box)

**On track when:** they read the kit description and scroll through its contents.

### Task 3 — Cross-check

On the component: the 3D viewer, the dimensioned drawing (Do, L0, d), and the 1:1
actual-size overlay. **Calibrate the overlay on the test machine before the first
session** (open it → *Calibrate for this screen* → match a bank card).

**On track when:** they hold the physical spring against the 1:1 view, or read a number
off the drawing and compare it with the spring. For spring 2, watch whether they check
the ends — loops, not hooks.

### Final selection

They add the Mechatro Kit to the order. Success = Mechatro Kit in the cart. Bonus
observation: did they verify the specific spring, or stop at "right box"?

---

## When they go off the path

The finder never dead-ends. Every reply ends with the next step — the open question,
or "open the Mechatro Kit at <spring> and compare it with your spring".

| What happens | What the finder does | Moderator |
|---|---|---|
| Gets the **kind** wrong (says pull for spring 1) | Ranks the wrong kind, then adds *"If your spring has flat ends and gaps between the coils… it's a different kind — tell me"* | Wait. Most notice when they look at the ends. |
| Wrong kind but types the right size | *"There is an exact Ø5.5 × 40 mm in the Mechatro Kit, but it's a compression spring — flat ends and gaps between the coils"* | Wait. |
| Corrects themselves (`actually it has loops`, `sorry it's 40mm`) | Re-ranks on the spot: *"Got it — updating…"* | — |
| Picks the wrong size band | Results lean to the wrong kits. Typing any length fixes it. | Prompt only if stuck: *"Is there anything else you can tell it about the spring?"* |
| Says **outdoors** | Mechatro drops in the ranking (it's indoor-only), but still shows if in the top three | Note it as a finding — the scenario is a workshop |
| Has both springs, searches the second | Typing it into the chat re-ranks to the second spring | — |
| Asks **how to measure** / **what's the difference** | Answers and opens the measuring guide; the open question stays on screen | — |
| Asks price, delivery, single springs, material, force | Short factual answer, then the next step | — |
| Asks **which kit** / **recommend** | Names the top kit and the spring, plus a runner-up, and *"the only real test is your spring against the part on its page"* | — |
| Asks if it suits **beginners / students / our users** | Kit-neutral argument; points at the kit description to read against their workshop | Good moment to probe in the interview |
| Frustrated (`this is useless`, `wrong one`) | Apologises and gives the shortest route: type the length in mm, or look at the ends | — |
| Unrecognised text | Rotating "I didn't follow" lines, getting more concrete each time, always with the next step | If three in a row, note it and add the phrase to the check script |
| `start over` | Clears the chat | — |

### What the finder will not do

- **Repeat the end use back.** "Robotics", "gripper", "workshop" are scored, never said.
  It talks about function and size only. This is deliberate (disclosure policy) — if
  participants comment on it, that's a finding, not a bug.
- **Say "this is your spring" from one measurement.** A length alone gets *"has one
  exactly 40 mm long — check the width"*. Only two matching dimensions get *"Found it"*.

---

## Before each session

1. Calibrate the 1:1 overlay (once per machine).
2. Clear the cart from the cart page.
3. Reload the home page so the chat is empty.

## After a pilot

If a participant typed something the finder fumbled, add it to `SESSIONS` in
`scripts/check-dialogue.mts` (tagged `C` or `E` for which spring they held) and run:

```bash
npm run check:dialogue                 # pass/fail per session
npm run check:dialogue -- --verbose    # full transcripts
```

Fix the phrase tables in `src/lib/search.ts` (understanding) or the topics in
`src/lib/dialogue.ts` (replies) until it passes.
