# Hero media

Drop demo captures in this folder. **That is the whole process** — the carousel is
a wildcard and reads this directory at build time.

> Brand artwork does **not** belong here. Everything readable as an image or video
> in this folder becomes a carousel slide, so the wordmark would land in the
> middle of the captures. That one goes in `public/brand/title.svg`.

## Names

Anything goes. Spaces, accents, capitals, whatever extension case you like:

```
01-terrain LOD.mp4
2-Editor demo.MOV
03-final (v2).webm
Captura de la mañana.png
```

The only thing the filename has to carry is a **leading number**, and only because
that is how you control the order. Everything after it is ignored.

- `01-`, `2-`, `007-` all work. Ordering is numeric, so `2-` sorts after `01-`
  even though the strings say otherwise.
- Files with no leading number sort to the end, alphabetically.
- Two files sharing a number sort alphabetically between themselves.
- Anything that is not a video or an image is ignored — including this README.

## Posters

A video picks up a poster automatically: give an image the **same leading number**
and it will be used. The rest of either name is irrelevant, so these pair up:

```
02-lod.webm   +   02-whatever.png   ->  02-lod.webm gets 02-whatever.png
```

Without an image at that number, the video just has no poster and relies on its
own first frame.

## Formats

| | |
| --- | --- |
| Video | `mp4` `webm` `mov` `m4v` `ogv` |
| Image | `png` `jpg` `jpeg` `webp` `avif` `gif` `svg` |

Kind is inferred from the extension — nothing to declare.

On GIF: it works, but the captures have no audio, so a silent looping video is
the same effect for a fraction of the weight. A 3s 1080p GIF runs 15–40 MB; the
same content as MP4 is 2–4 MB. In the hero, which is the first thing a visitor
downloads, that is the whole difference. The other advantage is that this
stylesheet honours `prefers-reduced-motion` and a `<video>` can actually be
paused. A GIF cannot.

## Alt text

Derived from the filename — `01-terrain LOD.mp4` becomes `Terrain LOD`. So make the
name say what the capture shows; it is the only description the carousel has.

## Targets

- Video: 1920×1080, 3–6s, seamless loop, **under 2 MB**, no audio track.
- Image: 2400×1350 or larger, under 500 KB.

## Caveats

- **Not reactive.** The folder is read during the build. A file added while
  `astro dev` is already running needs a restart to show up.
- **Requires Node at build time.** The directory read happens in the Astro build,
  not in the browser, so this cannot work in an edge runtime that never sees the
  repository.