/**
 * Pure navigation logic for the hero carousel.
 *
 * Deliberately free of the DOM: CI has no browser, so this is the part the unit
 * tests can actually verify (see test/hero-carousel.test.ts). HeroCarousel.astro
 * owns the geometry and the event wiring and calls into these helpers — it never
 * reimplements the index maths.
 */

/** How long a slide is shown before the carousel advances on its own. */
export const AUTOPLAY_INTERVAL_MS = 6000;

/** How long the carousel waits after user interaction before resuming auto-advance. */
export const INTERACTION_RESUME_MS = 5000;

/** Dots and the timer only make sense with more than one slide. */
export function shouldShowControls(count: number): boolean {
  return count > 1;
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
