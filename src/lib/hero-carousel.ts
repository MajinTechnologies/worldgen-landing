/**
 * Pure navigation logic for the hero carousel.
 *
 * Deliberately free of the DOM: CI has no browser, so this is the part the unit
 * tests can actually verify (see test/hero-carousel.test.ts). HeroCarousel.astro
 * owns the geometry and the event wiring and calls into these helpers — it never
 * reimplements the index maths.
 */

/** How long a slide is shown before the carousel advances on its own. */
export const AUTOPLAY_INTERVAL_MS = 3000;

/** How long the carousel waits after user interaction before resuming auto-advance. */
export const INTERACTION_RESUME_MS = 1000;

/**
 * Short window for cursor *movement* — ambient (the cursor drifts without intent),
 * kept apart from `INTERACTION_RESUME_MS` (deliberate) so it can't kill autoplay.
 */
export const MOVEMENT_RESUME_MS = 200;

/** Dots and the timer only make sense with more than one slide. */
export function shouldShowControls(count: number): boolean {
  return count > 1;
}

/** Signals that pause the auto-advance timer while the user engages the carousel. */
export interface AutoplayOptions {
  /**
   * The user is engaging the controls: hovering/focusing the dots, a manual
   * scroll/swipe that is still settling, or cursor movement inside its short
   * auto-expiring window. Hovering the hero at large does NOT pause — the
   * carousel fills the viewport, so that would stop auto-advance permanently on
   * desktop. Movement does pause, but only for `MOVEMENT_RESUME_MS`, so a live
   * cursor delays a tick instead of cancelling autoplay altogether.
   */
  paused: boolean;
}

/**
 * Autoplay depends on the slide count and the pause signal only.
 *
 * `prefers-reduced-motion: reduce` is deliberately NOT part of this decision: a
 * reduced-motion user still gets the carousel, it just advances with `auto`
 * scrolling instead of `smooth` (see `goTo` in HeroCarousel.astro). Gating the
 * timer here made it silently disappear on machines that report `reduce`.
 */
export function shouldAutoplay(count: number, options: AutoplayOptions): boolean {
  return shouldShowControls(count) && !options.paused;
}

/**
 * Interaction hold: paused for a while, always expires — the whole state is a
 * single mutable deadline, never a durable boolean that could get stuck.
 */
export function createHold(
  holdMs: number,
): { hold(now: number): void; isHolding(now: number): boolean } {
  let deadline = 0;
  return {
    hold: (now) => {
      deadline = now + holdMs;
    },
    isHolding: (now) => now < deadline,
  };
}

/** Normalise any index into [0, count). Safe for count <= 0. */
export function wrapIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return ((index % count) + count) % count;
}

/** The next slide, looping back to the first after the last. */
export function nextIndex(index: number, count: number): number {
  return wrapIndex(index + 1, count);
}

/**
 * The slide whose scroll target is closest to the current scroll position.
 *
 * The index is derived from the real geometry (not a private counter), which is
 * what keeps the active dot in sync when the user scrolls or swipes by hand.
 * Targets are the `scrollLeft` values that bring each slide to its snap position.
 */
export function nearestIndex(scrollLeft: number, targets: readonly number[]): number {
  if (targets.length === 0) return 0;

  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < targets.length; i += 1) {
    const distance = Math.abs(targets[i] - scrollLeft);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }

  return best;
}
