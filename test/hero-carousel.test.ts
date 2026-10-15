import { test } from 'node:test';
import assert from 'node:assert/strict';

// Pure carousel logic. The repo has no browser in CI, so the behaviour that can
// be verified is confined to this module; the DOM wiring in HeroCarousel.astro
// is verified manually (see docs/hero.md).
import {
  AUTOPLAY_INTERVAL_MS,
  INTERACTION_RESUME_MS,
  MOVEMENT_RESUME_MS,
  shouldShowControls,
  shouldAutoplay,
  wrapIndex,
  nextIndex,
  nearestIndex,
  createHold,
} from '../src/lib/hero-carousel.ts';

test('autoplay interval is the tuned ~3s and resume delay is positive', () => {
  assert.equal(AUTOPLAY_INTERVAL_MS, 3000);
  assert.ok(INTERACTION_RESUME_MS > 0);
});

test('controls are hidden with 0 or 1 item, shown with 2+', () => {
  assert.equal(shouldShowControls(0), false);
  assert.equal(shouldShowControls(1), false);
  assert.equal(shouldShowControls(2), true);
  assert.equal(shouldShowControls(28), true);
});

test('wrapIndex keeps the index inside [0, count)', () => {
  assert.equal(wrapIndex(0, 3), 0);
  assert.equal(wrapIndex(2, 3), 2);
  assert.equal(wrapIndex(3, 3), 0);
  assert.equal(wrapIndex(-1, 3), 2);
  assert.equal(wrapIndex(7, 3), 1);
});

test('wrapIndex degrades safely when there are no slides', () => {
  assert.equal(wrapIndex(0, 0), 0);
  assert.equal(wrapIndex(5, 0), 0);
});

test('nextIndex advances and loops back to the first slide', () => {
  assert.equal(nextIndex(0, 3), 1);
  assert.equal(nextIndex(1, 3), 2);
  assert.equal(nextIndex(2, 3), 0);
});

test('nearestIndex picks the closest scroll target', () => {
  const targets = [0, 520, 1040, 1560];
  assert.equal(nearestIndex(0, targets), 0);
  assert.equal(nearestIndex(500, targets), 1);
  assert.equal(nearestIndex(1030, targets), 2);
  assert.equal(nearestIndex(1560, targets), 3);
});

test('nearestIndex tolerates empty target lists', () => {
  assert.equal(nearestIndex(120, []), 0);
});

// Regression for the run #6 report ("el timer no parece estar funcionando"):
// the whole hero fills the viewport, so hovering it must NOT be a pause
// signal — only engaging the dots (hover/focus) or a settling manual
// scroll/swipe pauses auto-advance.
test('autoplay runs with 2+ slides and no pause signal', () => {
  assert.equal(shouldAutoplay(3, { paused: false }), true);
});

test('autoplay pauses on a control/interaction pause signal', () => {
  assert.equal(shouldAutoplay(3, { paused: true }), false);
});

// Regression for the run #6 follow-up: the timer must NOT depend on
// prefers-reduced-motion. Reduced motion only swaps the scroll behaviour
// (smooth -> auto), it never decides whether the carousel advances.
test('autoplay is not disabled by prefers-reduced-motion', () => {
  assert.equal(shouldAutoplay(3, { paused: false }), true);
});

test('autoplay is off with 0 or 1 slides regardless of pause signals', () => {
  assert.equal(shouldAutoplay(0, { paused: false }), false);
  assert.equal(shouldAutoplay(1, { paused: false }), false);
});

test('createHold returns false before any hold', () => {
  const h = createHold(1000);
  assert.equal(h.isHolding(0), false);
  assert.equal(h.isHolding(500), false);
});

test('createHold becomes true immediately after hold and expires at boundary', () => {
  const h = createHold(1000);
  h.hold(0);
  assert.equal(h.isHolding(0), true);
  assert.equal(h.isHolding(999), true);
  assert.equal(h.isHolding(1000), false);
  assert.equal(h.isHolding(1001), false);
});

test('createHold invariante: nunca queda colgado tras múltiples retriggers', () => {
  const holdMs = 1000;
  const h = createHold(holdMs);
  let ultimoHold = 0;
  for (let t = 0; t < 1000; t++) {
    h.hold(t);
    ultimoHold = t;
    assert.equal(h.isHolding(t), true);
  }
  // siempre vuelve a false para todo t >= ultimoHold + holdMs
  const deadline = ultimoHold + holdMs;
  assert.equal(h.isHolding(deadline), false);
  assert.equal(h.isHolding(deadline + 1), false);
  assert.equal(h.isHolding(deadline + 500), false);
});

test('createHold con distintos holdMs expira exactamente en el borde', () => {
  const h200 = createHold(200);
  h200.hold(10);
  assert.equal(h200.isHolding(10 + 200 - 1), true);
  assert.equal(h200.isHolding(10 + 200), false);
  
  const h500 = createHold(500);
  h500.hold(100);
  assert.equal(h500.isHolding(100 + 500 - 1), true);
  assert.equal(h500.isHolding(100 + 500), false);
});

test('MOVEMENT_RESUME_MS es positivo y estrictamente menor que INTERACTION_RESUME_MS', () => {
  assert.ok(MOVEMENT_RESUME_MS > 0);
  assert.ok(MOVEMENT_RESUME_MS < INTERACTION_RESUME_MS);
});
