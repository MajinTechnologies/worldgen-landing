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
- Auto-advance advances every `AUTOPLAY_INTERVAL_MS` (3000 ms). Pausing is
  level-based, read fresh on every tick from signals the engine owns — there are
  **zero durable hover/focus booleans**, so a missed `pointerleave`/`focusout`
  cannot wedge the timer:
  - **Deliberate** activity (pointerdown, a dot click, a non-programmatic
    scroll/drag, the ← / → keys) pauses for `INTERACTION_RESUME_MS` (1000 ms).
  - **Cursor movement** (`pointermove`, which covers mouse/touch/pen) pauses,
    but only for `MOVEMENT_RESUME_MS` (200 ms). The two windows are separate on
    purpose: a long ambient window would let a live cursor — over a hero that
    fills the viewport — keep autoplay off in practice (the run #6 bug).
  - The hover pause is scoped to the **dots**, not the carousel root, and only
    applies while `canHover.matches` and `lastPointerType !== 'touch'`. Hovering
    the hero at large is deliberately not a signal, because it fills the
    viewport.
  - `:focus-visible` inside the dots and `document.hidden` also pause.
  - Each pause is an auto-expiring deadline via `createHold(holdMs)` (a single
    mutable deadline: `hold(now)` pushes it to `now + holdMs`, `isHolding(now)`
    is `now < deadline`). The gating lives in `shouldAutoplay()`
    (`src/lib/hero-carousel.ts`) so it is unit-tested.
- The `tick` loop re-schedules itself with `setTimeout` and is never cancelled: a
  paused tick merely postpones itself, so there is no separate re-arm path to
  forget. It re-arms on `visibilitychange` because background tabs throttle
  timers.
- A `programmatic` flag marks the carousel's own `scrollTo` so the advance does
  not count as user activity.
- `prefers-reduced-motion: reduce` does **not** disable auto-advance. It only
  changes the scroll behaviour (`smooth` → `auto`). Gating the timer on it was a
  bug, fixed in `1d0660d`.

Constants worth knowing: `AUTOPLAY_INTERVAL_MS`, `INTERACTION_RESUME_MS` and
`MOVEMENT_RESUME_MS` in `src/lib/hero-carousel.ts`.

## Manual verification

CI has no browser, so the unit tests only cover the pure logic. Verify the
following by hand with `npm run dev`:

- 0 items (`public/hero/` empty): empty-state panel, no dots, no timer.
- 1 item: no dots, no timer, slide centred.
- 2+ items: one dot per item; the active dot tracks the visible slide.
- Click/tap a dot: the track snaps to that slide.
- Wait ~3s (do not click or move the pointer): advances to the next slide and
  loops from the last back to the first. Do this with the pointer **away** from
  the dots — the timer must run on a desktop-sized viewport, not only on touch.
- Hover or focus the dots: auto-advance pauses; move away: it resumes after the
  hold expires. Moving the cursor pauses only briefly (~200 ms) and does not
  stop the loop.
- Scroll/swipe by hand: the active dot follows.
- Keyboard: Tab to the dots, Enter/Space selects, Left/Right arrows move between
  them; focus ring is visible.
- With `prefers-reduced-motion: reduce` (devtools emulation): auto-advance
  **keeps running** every ~3s; only the scroll behaviour changes (instant
  `auto` jumps instead of animated `smooth`).
- Include a video (`kind: 'video'`) in the folder: it behaves like any slide.
- No layout shift when the dots appear; the `mask` and hero layout are unchanged.
