import { readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * Hero media, discovered from public/hero/ at build time.
 *
 * Wildcard by design: dropping a file in the folder is enough to get it into
 * the carousel. Nothing about the name is required except the numeric prefix —
 * which exists only to define order. Everything after "02-" is free, because the
 * name is not a schema, it is a filename.
 *
 * Ordering: numeric prefix first, then unprefixed files alphabetically at the
 * end. So 01.mp4 beats 2.mp4 even though "01" < "2" as strings.
 */

export type MediaKind = 'video' | 'image';

export interface HeroMedia {
  /** Filename on disk, verbatim — spaces, accents and case all survive. */
  file: string;
  /** Public URL: /hero/<file>. */
  src: string;
  /** Numeric prefix of the filename. Infinity when there is none. */
  order: number;
  kind: MediaKind;
  /** Public URL of the poster frame, when a sibling image shares the prefix. */
  poster?: string;
  /** Derived from the filename; see describe(). */
  alt: string;
}

const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'm4v', 'ogv']);
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'svg']);

const HERO_DIR = 'public/hero';

/** "02-terrain_lod.MP4" -> { order: 2, rest: "terrain_lod" }. */
function parseName(file: string): { order: number; rest: string } {
  const base = file.replace(/\.[^.]+$/, '');
  const match = /^(\d+)/.exec(base);

  if (!match) {
    return { order: Number.POSITIVE_INFINITY, rest: base };
  }

  // Drop the digits and whatever separator followed them.
  const rest = base.slice(match[1].length).replace(/^[-_.\s]+/, '');
  return { order: Number.parseInt(match[1], 10), rest };
}

/** "terrain_lod" -> "Terrain lod". Better than nothing, and never blank. */
function describe(rest: string): string {
  const words = rest.replace(/[-_]+/g, ' ').trim();
  if (!words) return 'WorldGen demo';
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function getHeroMedia(): HeroMedia[] {
  const dir = path.resolve(process.cwd(), HERO_DIR);

  let files: string[];
  try {
    files = readdirSync(dir);
  } catch {
    // No folder, or unreadable. An empty carousel beats a failed build.
    return [];
  }

  const entries: Array<Omit<HeroMedia, 'poster'>> = [];

  for (const file of files) {
    const extension = file.split('.').pop()?.toLowerCase() ?? '';
    const kind: MediaKind | null = VIDEO_EXTENSIONS.has(extension)
      ? 'video'
      : IMAGE_EXTENSIONS.has(extension)
        ? 'image'
        : null;

    // Strays like .gitkeep and README.md are ignored, silently.
    if (!kind) continue;

    const { order, rest } = parseName(file);
    entries.push({
      file,
      src: `/hero/${file}`,
      order,
      kind,
      alt: describe(rest),
    });
  }

  entries.sort((a, b) => a.order - b.order || a.file.localeCompare(b.file));

  // A poster is the first image sharing a video's prefix: 02-lod.webm picks up
  // 02-lod.jpg regardless of what the rest of either name says.
  return entries.map((entry) => {
    if (entry.kind !== 'video') return entry;

    const sibling = entries.find(
      (candidate) => candidate.kind === 'image' && candidate.order === entry.order,
    );

    return sibling ? { ...entry, poster: sibling.src } : entry;
  });
}