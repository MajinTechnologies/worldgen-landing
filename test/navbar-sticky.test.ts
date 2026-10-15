import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Contract test for the sticky top navbar (issue #5). The repo has no browser
// in CI (see hero-carousel.test.ts), so the verifiable behaviour is the style
// contract itself: the rules that make the bar stick to the TOP edge and keep
// anchored sections landing below it. Reading the real files also means any
// silent regression (e.g. reintroducing `overflow-x: hidden`, which turns
// `.page` into a scroll container and kills `position: sticky`) fails here.
//
// Bar height is `h-16` = 4rem (NavBar.astro); `scroll-padding-top` must match
// it or every `#section` anchor lands hidden under the bar.

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = stripComments(readFileSync(join(root, 'src/styles/global.css'), 'utf8'));
const navAstro = stripComments(
  readFileSync(join(root, 'src/components/NavBar.astro'), 'utf8'),
);

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Returns the declaration block of a simple selector (`selector { ... }`). */
function ruleBlock(source: string, selector: string): string {
  const start = source.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `selector "${selector}" not found`);
  const open = source.indexOf('{', start);
  const close = source.indexOf('}', open);
  assert.ok(close > open, `unterminated block for "${selector}"`);
  return source.slice(open + 1, close);
}

test('.site-header sticks to the top edge, not the bottom', () => {
  const block = ruleBlock(css, '.site-header');
  assert.match(block, /position:\s*sticky/);
  assert.match(block, /top:\s*0/, '.site-header must pin with `top: 0`');
  assert.doesNotMatch(block, /bottom:\s*0/, '`bottom: 0` pins the bar to the fold edge');
});

test('.site-header closes with a bottom border (content sits below it)', () => {
  const block = ruleBlock(css, '.site-header');
  assert.match(block, /border-bottom:/);
  assert.doesNotMatch(block, /border-top:/);
});

test('.site-header respects the iOS safe area at the top', () => {
  const block = ruleBlock(css, '.site-header');
  assert.match(block, /padding-top:\s*env\(safe-area-inset-top\)/);
  assert.doesNotMatch(block, /safe-area-inset-bottom/);
});

test('html reserves top scroll padding equal to the bar height (4rem)', () => {
  const block = ruleBlock(css, 'html');
  assert.match(block, /scroll-padding-top:\s*4rem/);
  assert.doesNotMatch(block, /scroll-padding-bottom/);
});

test('.page does not become a scroll container (it kills position: sticky)', () => {
  const block = ruleBlock(css, '.page');
  assert.doesNotMatch(block, /overflow-x:\s*hidden/);
  // `clip` cuts horizontal overflow without establishing a scrollport.
  assert.match(block, /overflow-x:\s*clip/);
});

test('the bar keeps h-16 so the 4rem scroll padding stays in sync', () => {
  assert.match(navAstro, /class="shell flex h-16 /);
});
