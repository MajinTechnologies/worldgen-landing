# Hero

Notes on the hero section (`src/components/hero/`) that do not belong in code
comments.

## Layers

Back to front, composed in `src/components/hero/Hero.astro`:

1. `HeroBackdrop` — the backdrop field behind everything (`z-index: -1`).
2. `HeroCarousel` — the captures track.
3. `HeroTitle` — the wordmark, treated as a watermark (overlaps the captures).
4. `HeroOverlay` — eyebrow, lede and CTAs. The layer is `pointer-events: none`
   so swipes reach the carousel; only the CTAs opt back in.

The title and the backdrop field are still open work; this doc grows as those
decisions land.

## Carousel navigation (dots + auto-advance)

`HeroCarousel.astro` originally relied on scroll-snap alone: native swipe,
native momentum, **zero JS**. That decision is reverted **for navigation only**.
The track is still pure CSS scroll-snap; dots and the auto-advance timer are
layered on top.

- Pure logic lives in `src/lib/hero-carousel.ts` (DOM-free, unit-tested in
  `test/hero-carousel.test.ts`). The component only measures geometry and wires
  events.
- Dots are server-rendered but hidden by CSS until the script sets
  `data-hero-ready` on the carousel root (`progressive enhancement`). Without JS
  the hero is exactly the scroll-snap track it was before.
- The active dot is derived from the track's real `scrollLeft` (nearest measured
  snap target), not from a private counter, so manual scroll and swipe keep it in
  sync.
- Auto-advance is a ~6s loop. It pauses on hover/focus and during user
  interaction, and resumes after a short idle delay.
- `prefers-reduced-motion: reduce` disables auto-advance entirely and makes
  navigation jumps instant (no animated scroll).

Constants worth knowing: `AUTOPLAY_INTERVAL_MS` and `INTERACTION_RESUME_MS` in
`src/lib/hero-carousel.ts`.

## Manual verification

CI has no browser, so the unit tests only cover the pure logic. Verify the
following by hand with `npm run dev`:

- 0 items (`public/hero/` empty): empty-state panel, no dots, no timer.
- 1 item: no dots, no timer, slide centred.
- 2+ items: one dot per item; the active dot tracks the visible slide.
- Click/tap a dot: the track snaps to that slide.
- Wait ~6s: advances to the next slide and loops from the last back to the first.
- Hover or focus the carousel: auto-advance pauses; move away: it resumes.
- Scroll/swipe by hand: the active dot follows.
- Keyboard: Tab to the dots, Enter/Space selects, Left/Right arrows move between
  them; focus ring is visible.
- With `prefers-reduced-motion: reduce` (devtools emulation): no auto-advance and
  jumps are instant.
- Include a video (`kind: 'video'`) in the folder: it behaves like any slide.
- No layout shift when the dots appear; the `mask` and hero layout are unchanged.
