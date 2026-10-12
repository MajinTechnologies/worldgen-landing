import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Presence check for a file in public/brand/, evaluated at build time.
 *
 * Lets a component ship a text fallback today and pick up the real artwork the
 * moment it lands, without anyone editing markup. A missing file is a normal
 * state here, not an error — that is the whole point.
 */
export function hasBrandAsset(name: string): boolean {
  return existsSync(path.resolve(process.cwd(), 'public', 'brand', name));
}