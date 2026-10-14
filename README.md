# Drop by Drop

A cozy perfume-workshop game. Customers describe a scent in words, you build it drop by drop, and good perfumes pay for a bigger, prettier perfume house.

This repository holds the bench prototype: the formulating screen, scored against the request, playable on a phone.

## Run it

```sh
npm install
npm run verify   # type check, tests, build, headless smoke test
```

`npm run build` writes `dist/drop-by-drop.html`, a single self-contained page.

## Where things live

| Folder | Holds |
| --- | --- |
| `data/` | Materials, facets, request vocabulary, customers, prices, tutorial customers |
| `src/engine/` | The rules: blending, scoring, blotter feedback, request generation, prices |
| `src/ui/` | The prototype's screens |
| `tests/` | Tests, including the plan's worked example |
| `scripts/` | Build and smoke test |
