# Majin WorldGen — Landing

Promotional site for **Majin WorldGen**, a product of Majin Technologies.

## What is Majin WorldGen

A procedural terrain generator for Unity. It is designed for studios that need large,
continuous, deterministic terrain without authoring it by hand.

| Capability | Detail |
| --- | --- |
| Noise | Fractal noise with multiple octaves |
| Level of detail | Dynamic LOD |
| Resolution | Infinite |
| Determinism | Deterministic, procedural and infinite — the same seed always yields the same world |
| Context | Runs both in the Unity Editor and at runtime |

The terrain is prepared around the player as they move: walking is continuous, returning to
a previously visited area yields an unchanged result, and terrain can be raised or opened
without stopping the game.

## Status

The product is in active development. The features above are implemented and working; this
site exists to show it off, not to announce a finished product.

Primary audience: game studios and investors. The site is in English only.

## Requirements

- Node.js >= 22.12.0
- npm

## Commands

| Command | Action |
| :-- | :-- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server with HMR at http://localhost:4321 |
| `npm run build` | Build the static site to `./dist/` |
| `npm run preview` | Serve `./dist/` locally at http://localhost:4321 |
| `npm run astro -- --help` | Astro CLI |

## Project structure

```text
/
├── public/
│   ├── favicon.ico
│   └── fonts/               # Space Grotesk woff2 subsets (temporary, to be replaced)
├── src/
│   ├── pages/
│   │   └── index.astro      # The only page. Output is fully static.
│   ├── components/          # One component per landing section (to be added)
│   ├── layouts/             # Base layout with <head>, meta and OG tags (to be added)
│   └── styles/
├── astro.config.mjs
└── package.json
```

## Migration status

The site was previously a Vite + TypeScript + Tailwind project that rendered client-side,
which meant crawlers and link previews received an empty `<div>`. It was rebuilt on Astro so
that every page ships its content as static HTML.

**The landing content has not been ported yet.** `src/pages/index.astro` is still the Astro
starter template. The previous implementation remains recoverable from commit `6c507eb`
on the `dev` branch.

## Deploy

**TODO** — the GitHub Actions workflow under `.github/` still runs the Vite build and has to
be migrated to `npm run build`. The deploy target is not defined yet.