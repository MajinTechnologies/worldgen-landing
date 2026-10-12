# Context — Majin WorldGen landing

Brief on what this site is, who it is for, and where the product stands. Written so that
anyone (human or agent) picking up content work does not have to guess.

## What this site is

The promotional landing for **Majin WorldGen**, a product of Majin Technologies. Its job is
to show the product working and to generate interest — it is not a feature matrix, a
roadmap, or a waitlist.

The site exists to make a credible case for the product. A visitor should finish it knowing
the system is real, what it does, and how to get in touch.

## The product

Majin WorldGen is a procedural terrain generator for Unity.

| Capability | Detail |
| --- | --- |
| Noise | Fractal noise with multiple octaves |
| Level of detail | Dynamic LOD |
| Resolution | Infinite |
| Determinism | Deterministic, procedural and infinite — the same seed always produces the same world |
| Context | Runs both in the Unity Editor and at runtime |

The terrain is prepared around the player as they move. Walking is continuous, returning to
a previously visited area yields an unchanged result, and terrain can be raised or opened
without stopping the game.

## Status, and how to talk about it

Two things are true at once and both must be respected:

1. **The system works.** It is not a prototype or a promise. It is a finished-feeling
   technical system that competes with — and outclasses — what large studios ship for
   comparable problems.
2. **It is still in development.** The product is not finished or released.

The site must be **commercial, not apologetic**. Acknowledging active development is fine
and honest; hedging the product is not. The framing is "this works, and it is early", never
"this might work one day".

Any copy that reads as a vision, an experiment, or an R&D preview is off tone. So is any
copy that overclaims a release date or a shipped state.

## Audience

Both, in this order of priority:

1. **Game studios** — the primary buyer. They care about LOD strategy, noise composition,
   determinism, integration cost, and runtime cost.
2. **Investors** — care about the technical moat and the market position.
3. **Players** — secondary. The visual showoff speaks to them, but they are not the reason
   the site exists.

This ordering matters for the hero. The current draft of the hero claim was written from the
player's point of view ("you walk without pauses"), which sells the sensation but not the
system. Studios buy the system.

## Scope

- The site is **English only**. No i18n, no language switcher, no localized paths.
- The site covers **Majin WorldGen only** for now. If Majin ships a second product, this doc
  gets revisited.
- Landing page only. No blog, no docs, no dashboard.

## Technical note

The site was rebuilt on Astro (static output) because the previous Vite implementation
rendered client-side, so crawlers and link previews received an empty `<div>`. Every page
must ship its content as static HTML.