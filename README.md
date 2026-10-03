# Meconet Spring Shop — interactive prototype

A clickable prototype of the Meconet spring assortment shop, built for a moderated
usability test. Everything runs locally from mock data: no backend, no API keys, no network.

```bash
npm install
npm run dev     # http://localhost:3000
```

## The user flow being tested

1. **Describe the spring** on the home page, in the participant's own words — or state
   its dimensions, if they happen to know them.
2. **The spring finder** asks up to three clarifying questions — what the spring does,
   roughly how big it is, and where it lives — then ranks the assortments. A
   participant who gave dimensions skips the questions entirely.
3. **Open an assortment** to see every spring it contains, with full specifications.
4. **Cross-check a physical spring** against a component using the 3D view, the
   dimensioned drawing, or the 1:1 actual-size overlay.
5. **Set a quantity and add to order.** The cart badge animates and the preview opens.
6. **Check out.** The test ends on the confirmation screen.

## The test target

Exactly one component is flagged as the spring a participant is handed physically:

| | Kit | Spring |
|---|---|---|
| **target** | Garage Kit | extension, Ø10.0 × 70 mm, wire 1.20 |
| near-miss | Mechatro Kit | extension, Ø10.0 × 65 mm, wire 1.20 |
| near-miss | Trampoline Kit | extension, Ø12.0 × 70 mm, wire 1.40 |

The near-misses are deliberate: a participant cannot pass the task on a glance at a
thumbnail, they have to read dimensions or compare the part. The Mechatro near-miss is
plated steel rather than stainless like the rest of its kit, so the material column
cannot give the answer away before the dimensions are compared.

To retarget the test, edit the flagged component in `src/data/kits.ts` and set
`target: true` on whichever spring matches the real part you hand out. The product
code, spec table, 2D drawing and 3D model all regenerate from those numbers.

## How the search works

`src/lib/search.ts` is a deterministic intent engine — no model call, so every
participant gets identical behaviour. Free text is matched against a synonym table and
mapped onto three axes (action, size band, environment), plus any millimetre dimensions
mentioned. A stated dimension is the strongest signal and can name one exact spring.

### It has to serve two people with the same screen

Meconet's previous finder walked everyone through outer diameter, free length and wire
thickness. Most customers could not answer — they did not know the terms or how to
measure — so they guessed, and bought the wrong spring. That failure is what this
version is designed around:

- **Someone who does not know what they need.** Nothing asks for a measurement. The
  options name what you can see (*a hook at each end*, *open coils with no hooks*) and
  the hint supplies the term for it, so a participant leaves knowing a little more than
  they arrived with. Every size band is anchored to something you can hold the spring
  against — a 1 € coin, your palm. Each question has an "I'm not sure" answer that
  opens a measuring guide instead of dead-ending, and the assistant keeps saying the
  thing the old questionnaire never did: an assortment covers a spread of sizes, so
  close is good enough.
- **Someone who knows exactly what they need.** Dimensions in the opening message
  (`Ø10 × 70 mm, wire 1.2`, `25 mm free length`, `ISO 10243 medium load`) are parsed
  out, the questions are skipped, and the reply is in spec terms: which assortment
  carries that exact code.

`Criteria.fluency` records which of the two the engine is talking to; it changes the
wording only, never the ranking. The teaching content — how to tell the three spring
types apart, and how to take the three measurements with nothing but a ruler — lives in
`SPRING_SHAPES` and `MEASURING_STEPS`, and is reachable from the panel header at any
point in the conversation.

The assistant deliberately never confirms or repeats an end product. It restates
everything in terms of function and size, which keeps it inside what Meconet is allowed
to disclose publicly about where its springs are used.

## Where the numbers come from

Each spring is defined once in `src/data/kits.ts` by its real geometry. From there:

- `src/data/build.ts` derives the product code, spring rate and working load.
- `src/lib/springLimits.ts` is the only place a force figure comes from. It applies the
  DIN formulas for travel and load — Sa and solid length for a compression spring, the
  per-coil extension limit and initial tension for an extension spring, the ISO 10243
  load class for a die spring. The rate is rounded *before* the forces are derived from
  it, so every force on the page is exactly rate × travel for the rate shown.
- `src/lib/springSpecs.ts` turns that into the specification table, the usage notes and
  the identification checklist, all worded with the spring's own numbers.
- `src/lib/springMetrics.ts` derives the drawn proportions, so the overall length on
  screen always equals the length in the spec table.
- `src/lib/springProfile.ts` generates the 2D side view used by thumbnails, the
  technical drawing and the actual-size overlay.
- `src/lib/springGeometry.ts` generates the 3D geometry for the viewer.

Change a dimension and all of them follow.

The component page shows the same part three ways — a generated photo, a dimensioned
drawing and the 3D model — plus two blocks written for someone who has never specified
a spring: **Notes on using this spring** explains what the force figures mean, with this
spring's own arithmetic worked through, and **How to identify this spring** is a
caliper-and-ruler checklist for telling it apart from a near-miss. Both are generated,
so they cannot drift from the numbers above them.

## Imagery

Every image is resolved in `src/assets/brand.tsx`, so artwork is swapped in one file:

- `Wordmark` — still text; replace it with the real meconet logo.
- `KitBoxArt` — the kit's printed lid label, from `public/kit-covers`. Each kit names
  its own file through `coverImage` in `src/data/kits.ts`.
- `SpringPhoto` — a component's studio photograph, where `kits.ts` gives it a `photo`.
  Falls back to `SpringArt` when it does not.
- `SpringArt` — generated from each spring's own dimensions. Leave it: it is the only
  art drawn to scale, which is why the actual-size overlay may use nothing else.

Photography is deliberately partial. The **Mechatro Kit** is the kit shown in moderated
sessions, so it is the only one dressed with real photographs and real drawing sheets
(`public/springs`); every other kit renders from the generated artwork, which is derived
from the same dimensions and so is never wrong, only plainer.

A component's `drawings` are orthographic sheets. When a component has them, the Drawing
view and the **Technical drawing** panel show those instead of the generated SVG, with a
thumbnail strip to step between sheets. The sheets are annotated `d`, `Do`, `Di`, `L0`,
`p` — and `L1`, `L2`, `θ` for a torsion spring — which are exactly the symbols in the
Ref. column of the specification table, so a dimension read off the sheet can be looked
up directly.

The Mechatro Kit's dimensions are not invented: outside diameter, free length, wire
gauge and coil count were measured off its photographs, so the generated 3D model and
the photograph of the same component show a spring of the same proportions. The one
exception is the Ø10 × 65 near-miss, whose dimensions are fixed by the test design —
its photograph was chosen for having open machine-hook ends to match, and it reads a
little shorter than the model.

Coil count is what makes a spring look tight or stretched, and it is easy to get wrong
by eye: a compression spring's pitch should land near 1.8 × its wire gauge (2.2 × the
section height for a die spring), and an extension spring's coils should touch. If you
add a component, check it against that before trusting how it looks.

For real CAD, set `modelUrl` on a component in `src/data/kits.ts` and load it in
`SpringViewer` instead of the generated geometry.

## Notes for running a session

- The home page *is* the shop: this is Meconet's B2C storefront, and every spring it
  sells comes inside an assortment. So the spring-type tabs are not standalone ranges —
  each one filters the assortments that contain that kind of spring (`/?type=extension`)
  and says as much above the results. Spring band clamps, other springs, login,
  registration and downloads are inert and say so when clicked.
- The category row hides itself on scroll and returns at the top of the page. The brand
  bar with the search field and the cart never moves.
- The actual-size overlay needs a one-time calibration per display: open it, choose
  **Calibrate for this screen**, and match the bar to a bank card. The setting is stored
  in the browser, so do it once before the first participant arrives.
- The cart persists in `localStorage`. Clear it between participants from the cart page.
