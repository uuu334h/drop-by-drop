# Drop by Drop

Cozy perfume-workshop game for phones. Customers describe a scent in words; the player builds it drop by drop on a scale; the game scores the blend's scent profile against the request and pays by band. Owner: Diego (GitHub `uuu334h`), a working perfumer who is fluent in code. Ask him whenever a material fact or a smell judgement is unclear; never guess silently.

Design source of truth: the game plan doc, a claude.ai artifact private to Diego: https://claude.ai/code/artifact/7b21b641-33bb-4f49-9ab2-7908ee068e95. When code and plan disagree, ask which should change, then update both.

## Current phase

Phase 2 of the build plan: the bench prototype. One phone screen with generated requests, drops and pours, the profile ring, blotters, bands and a results export. No shop, no real ads, no final art. Test goal: 7 of 10 people who don't know perfume finish three requests at Full or better and ask to keep playing.

## Layout

- `data/` content as JSON: facets, notes, materials, request vocabulary and archetypes, customers, prices, tutorial. Balance lives here, never in code.
- `src/engine/` pure TypeScript rules, no DOM: blend maths, scoring, blotter lines, request generator, prices, progression. It moves unchanged into the final app.
- `src/ui/` Preact prototype. `src/ui/index.html` is the artifact-shaped page template.
- `tests/` vitest. `tests/worked-example.test.ts` replays the plan's worked example and must always pass.
- `scripts/build.mjs` bundles everything into `dist/drop-by-drop.html`, ready to publish as a claude.ai artifact. `scripts/smoke.mjs` plays it headless at 390×844.

## Commands

- `npm install`. The `.npmrc` sets `legacy-peer-deps`; npm 10 crashes resolving vitest's peers without it.
- `npm test`, `npm run check`, `npm run build`, `npm run smoke`.
- `npm run verify` runs all four. Run it before every commit that touches code or data.

## Rules of the game (keep in sync with the plan)

- Potency share: share_i = drops_i × potency_i / Σ (drops × potency). Facet profiles and note shares are weighted by these shares.
- Score 0–100: wishes 60% and profile similarity 30%, rescaled to 100 until structure (10%) arrives at rank 7.
  - A wish inside its range scores 1. Outside, it falls linearly over a tolerance: the range width (at least 0.06) for two-sided ranges, 0.10 for one-sided.
  - Profile similarity is the cosine with the ideal profile, mapped so 0.80 gives 0 and 1.00 gives 1.
  - Any wish out of range caps the score at 91: Signature needs every wish met.
  - A broken no-go caps the score at 44: Flop.
- Bands: Signature 92+ (pays 100% plus a 50% tip), Full 80+ (100% plus 10%), Close 65+ (75%), Off 45+ (50%), Flop (20%).
- Price = base(format, size) × customer budget × complexity (1 + 0.125 × (wishes + no-gos − 2)) × tier (1 + 0.2 × (highest tier − 1)) × bottle × reputation (1 + 0.25 × (stars − 3)).
- Trial beaker: 40 drops of 0.05 g. The formula scales to the order's concentrate (1 ml counted as 1 g). Material cost = scaled grams × coins per gram, plus the bottle.
- Hidden facets count in scoring from the start, but stay off the card and the profile ring until discovered by a blotter or a sale.
- The prototype compresses XP so a 20-minute playtest reaches rank 4.

## Working agreements

- Content as data, engine pure and tested, UI thin.
- Change a balance number only together with its test and the plan doc.
- Never name real perfumes or brands. Trademarked aroma chemicals get generic names, such as "Velvet wood (OTNE)".
- Phone-first: check at 390×844, one hand, nothing that needs hover.
- Commit after each working step with a clear message and push to `main`.
