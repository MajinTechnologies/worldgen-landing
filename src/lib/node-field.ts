/**
 * Isometric node field — the hero backdrop.
 *
 * A lattice of nodes with explicit edges between them, drifting on a slow
 * travelling wave, with the cursor acting as a magnet that lifts nearby nodes
 * off the plane.
 *
 * Canvas 2D, no dependencies. The budget is ~150 nodes and ~270 edges: enough to
 * read as a graph, cheap enough that the page's real cost stays the 37 MB of
 * carousel media decoding beside it.
 *
 * Everything is deterministic. A hash of the node index picks which nodes exist
 * and which edges are drawn, so the field looks organic and is identical on
 * every load — no two-frame flicker, no Math.random in the render path.
 */

export interface NodeFieldHandle {
  destroy(): void;
}

interface NodeFieldOptions {
  /** Peak vertical travel of the wave, in px. */
  amplitude?: number;
  /** Cursor influence radius, in px. */
  magnetRadius?: number;
  /** Peak lift a node reaches at the cursor's exact position, in px. */
  magnetLift?: number;
  /** Maximum canvas pixels per device pixel. */
  maxDpr?: number;
}

interface FieldNode {
  /** Lattice coordinates. */
  col: number;
  row: number;
  /** Undisturbed screen position. */
  x: number;
  y: number;
  /** Wave phase offset. */
  phase: number;
  /** Smoothed height above the plane. */
  lift: number;
  /** Height being smoothed towards. */
  target: number;
  /** Inside the viewport plus a margin, so draw() can skip the rest. */
  onScreen: boolean;
}

/** Isolines read as a lattice, not a graph, so long edges break the pattern. */
const LONG_EDGE_EVERY = 5;
/**
 * Long-edge directions, in fallback order. The first two are the pair that step
 * across the lattice and keep the rhythm regular; the last two step back along
 * the same diagonals and only come into play when the cull took the preferred
 * target, so a long edge is never simply dropped.
 */
const LONG_EDGE_DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [2, 1],
  [1, 2],
  [-1, -2],
  [-2, -1],
];
/** How far along a direction to look for the nearest surviving node. */
const LONG_EDGE_MAX_STEP = 3;

/** A kept node must be left with at least this many live lattice neighbours. */
const MIN_LATTICE_NEIGHBOURS = 2;

/** Fraction of cells the hash drops, so the field breathes instead of reading as a grid. */
const CULL_RATE = 0.16;

/**
 * How much past the viewport the lattice reaches.
 *
 * A 45-degree isometric lattice is always a 2:1 rhombus — spanX is twice spanY
 * no matter how many cells it has — so the field can only be sized, not
 * reshaped. The overscan has to clear the wave plus the magnet lift, or the top
 * and bottom tips pop in and out at the canvas edge.
 */
const FIELD_OVERSCAN = 1.02;

/** Outside this margin a node is off-screen for good; draw() skips it. */
const VIEWPORT_MARGIN = 24;

/** Edge start and end share a frame, so no thickness flickers as height moves. */
const EDGE_WIDTH = 1;
const EDGE_RADIUS = EDGE_WIDTH / 2;
const EDGE_ALPHA = 0.16;

const NODE_SIZE = 2.2;
const NODE_ALPHA = 0.34;
const NODE_LIFT_BONUS = 0.5;

/** Height of one unit of lift, in px per unit. */
const LIFT_SCALE = 1;

const WAVE_SPEED = 0.00035;
const MAGNET_SMOOTHING = 0.12;

/** Deterministic 0..1 from a node's lattice position. */
function hash(col: number, row: number, salt: number): number {
  let h = (col * 73856093) ^ (row * 19349663) ^ (salt * 83492791);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export interface FieldPlan {
  nodes: FieldNode[];
  edges: Array<[FieldNode, FieldNode]>;
  tileW: number;
  tileH: number;
  cols: number;
  /** Long edges the pattern asked for, and how many actually got drawn. */
  longRequested: number;
  longCreated: number;
}

/**
 * Deterministic layout for a viewport. Pure — no DOM, no time — so the node and
 * edge budget can be asserted without rendering anything.
 *
 * The lattice is a 45-degree rhombus with a fixed 2:1 aspect: spanX is always
 * twice spanY. So the only way to fit a viewport is to size the rhombus to it.
 * The binding diagonal is the taller of the viewport's height and half its
 * width, and the field is centred on the canvas.
 */
export function planField(width: number, height: number): FieldPlan {
  const cols = width < 640 ? 8 : 12;
  const spanY = FIELD_OVERSCAN * Math.max(height, width / 2);
  const tileH = spanY / (cols - 1);
  const tileW = tileH * 2;

  const originX = width / 2;
  const originY = height / 2 - spanY / 2;

  const nodes: FieldNode[] = [];
  const edges: Array<[FieldNode, FieldNode]> = [];

  /**
   * The cull lives in a grid with a dead ring around it, so the four lattice
   * neighbours of any cell are always readable as live[i ± 1] and live[i ±
   * stride] with no bounds checks: a cell off the lattice reads as dead, which
   * is exactly what it is.
   */
  const stride = cols + 2;
  const live = new Uint8Array(stride * stride);
  const liveNeighbours = (cell: number): number =>
    live[cell + 1]! + live[cell - 1]! + live[cell + stride]! + live[cell - stride]!;

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < cols; row++) {
      // Roughly one node in six is left out, so the field breathes.
      if (hash(col, row, 3) >= CULL_RATE) live[(col + 1) * stride + row + 1] = 1;
    }
  }

  /**
   * Then the guard: a cell the cull took is put back if dropping it would leave
   * one of its live neighbours with fewer than MIN_LATTICE_NEIGHBOURS. Restoring
   * only ever raises the counts, and the walk covers the whole grid, so this
   * converges in one pass and leaves every kept node with at least that many
   * live lattice neighbours. That invariant is what makes a node of degree zero
   * impossible, so there is no second pass to revive one — a cell that would
   * strand a node is kept instead of dropped.
   */
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < cols; row++) {
      const cell = (col + 1) * stride + row + 1;
      if (live[cell]) continue;
      if (
        (live[cell + 1] && liveNeighbours(cell + 1) < MIN_LATTICE_NEIGHBOURS + 1) ||
        (live[cell - 1] && liveNeighbours(cell - 1) < MIN_LATTICE_NEIGHBOURS + 1) ||
        (live[cell + stride] && liveNeighbours(cell + stride) < MIN_LATTICE_NEIGHBOURS + 1) ||
        (live[cell - stride] && liveNeighbours(cell - stride) < MIN_LATTICE_NEIGHBOURS + 1)
      ) {
        live[cell] = 1;
      }
    }
  }

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < cols; row++) {
      if (!live[(col + 1) * stride + row + 1]) continue;

      const x = originX + (col - row) * (tileW / 2);
      const y = originY + (col + row) * (tileH / 2);

      nodes.push({
        col,
        row,
        x,
        y,
        phase: hash(col, row, 7) * Math.PI * 2,
        lift: 0,
        target: 0,
        onScreen:
          x >= -VIEWPORT_MARGIN &&
          x <= width + VIEWPORT_MARGIN &&
          y >= -VIEWPORT_MARGIN &&
          y <= height + VIEWPORT_MARGIN,
      });
    }
  }

  /** Keyed by cell number; cols never reaches 32, so col and row fit in five bits. */
  const index = new Map<number, FieldNode>();
  for (const node of nodes) index.set(node.col * 32 + node.row, node);

  const drawn = new Set<number>();
  /**
   * Adds an edge unless that same segment is already in the graph: two sources
   * can land on one pair once the long edges start falling back, and drawing it
   * twice would just make that one line brighter. The key does not depend on
   * which end is which.
   */
  const connect = (from: FieldNode, to: FieldNode): boolean => {
    const a = from.col * 32 + from.row;
    const b = to.col * 32 + to.row;
    const key = a < b ? a * 1024 + b : b * 1024 + a;
    if (drawn.has(key)) return false;
    drawn.add(key);
    edges.push([from, to]);
    return true;
  };

  for (const node of nodes) {
    const east = index.get(node.col * 32 + node.row + 32);
    if (east) connect(node, east);
    const south = index.get(node.col * 32 + node.row + 1);
    if (south) connect(node, south);
  }

  // Long edges are what make it a graph rather than a grid.
  let longRequested = 0;
  let longCreated = 0;
  for (const node of nodes) {
    if ((node.col + node.row) % LONG_EDGE_EVERY !== 0) continue;
    longRequested++;

    // The preferred direction keeps the pattern reading with a steady rhythm.
    // When the cull took its target, the alternates and then the nearest node
    // along them take over, so the count of long edges matches the count asked
    // for instead of quietly falling short.
    const preferred = node.col % 2;
    for (let i = 0; i < LONG_EDGE_DIRECTIONS.length; i++) {
      const [dc, dr] = LONG_EDGE_DIRECTIONS[(preferred + i) % LONG_EDGE_DIRECTIONS.length]!;
      for (let step = 1; step <= LONG_EDGE_MAX_STEP; step++) {
        const neighbour = index.get((node.col + dc * step) * 32 + node.row + dr * step);
        if (neighbour && connect(node, neighbour)) {
          longCreated++;
          break;
        }
      }
      if (longCreated === longRequested) break;
    }
  }

  return { nodes, edges, tileW, tileH, cols, longRequested, longCreated };
}

export function createNodeField(
  canvas: HTMLCanvasElement,
  options: NodeFieldOptions = {},
): NodeFieldHandle {
  const amplitude = options.amplitude ?? 5;
  const magnetRadius = options.magnetRadius ?? 110;
  const magnetLift = options.magnetLift ?? 10;
  const maxDpr = options.maxDpr ?? 2;

  const context = canvas.getContext('2d', { alpha: true });
  if (!context) {
    return { destroy() {} };
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  /** No hover-capable pointer: no cursor to be a magnet. */
  const coarsePointer = window.matchMedia('(hover: none)');

  let nodes: FieldNode[] = [];
  let edges: Array<[FieldNode, FieldNode]> = [];
  let width = 0;
  let height = 0;

  let pointerX = -1e4;
  let pointerY = -1e4;
  let pointerInside = false;

  let frame = 0;
  let running = false;
  let layoutDirty = true;

  const prefersReduced = () => reducedMotion.matches;

  function build(): void {
    const plan = planField(width, height);
    nodes = plan.nodes;
    edges = plan.edges;
  }

  function resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const nextWidth = canvas.clientWidth;
    const nextHeight = canvas.clientHeight;

    width = nextWidth;
    height = nextHeight;
    canvas.width = Math.round(nextWidth * dpr);
    canvas.height = Math.round(nextHeight * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    layoutDirty = true;
  }

  function draw(time: number): void {
    context.clearRect(0, 0, width, height);

    if (prefersReduced()) {
      drawStatic();
      return;
    }

    const magnetActive = pointerInside && !coarsePointer.matches;

    // Edges first and in one batch: a single path and a single stroke for the
    // whole graph, which is what keeps this cheap. Alpha stays uniform so the
    // path can be filled in one call. An edge with both ends off-screen costs a
    // path segment and paints nothing, so it never joins the batch.
    context.beginPath();
    for (const [from, to] of edges) {
      if (!from.onScreen && !to.onScreen) continue;
      context.moveTo(from.x, from.y - from.lift * LIFT_SCALE);
      context.lineTo(to.x, to.y - to.lift * LIFT_SCALE);
    }
    context.strokeStyle = `rgb(148 163 184 / ${EDGE_ALPHA})`;
    context.lineWidth = EDGE_WIDTH;
    context.stroke();

    for (const node of nodes) {
      if (magnetActive) {
        const dx = pointerX - node.x;
        const dy = pointerY - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const within = distance < magnetRadius ? 1 - distance / magnetRadius : 0;
        node.target = within * within * magnetLift;
      } else {
        node.target = 0;
      }

      node.lift += (node.target - node.lift) * MAGNET_SMOOTHING;
    }

    for (const node of nodes) {
      if (!node.onScreen) continue;
      const wave = Math.sin(time * WAVE_SPEED + node.phase) * amplitude;
      const y = node.y - (node.lift + wave) * LIFT_SCALE;
      const liftRatio = magnetLift > 0 ? Math.min(node.lift / magnetLift, 1) : 0;

      context.globalAlpha = Math.min(NODE_ALPHA + liftRatio * NODE_LIFT_BONUS, 1);
      context.fillStyle = '#e2e8f0';
      context.fillRect(node.x - NODE_SIZE / 2, y - NODE_SIZE / 2, NODE_SIZE, NODE_SIZE);
    }

    context.globalAlpha = 1;
  }

/** Reduced motion: one frame, no travel, no cursor response. */
  function drawStatic(): void {
    // Required, not cosmetic: this is called repeatedly (every tab return, every
    // resize) with no rAF to clear between, so without it source-over stacks the
    // edge alpha and the field visibly brightens.
context.clearRect(0, 0, width, height);
    context.beginPath();
    for (const [from, to] of edges) {
      if (!from.onScreen && !to.onScreen) continue;
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
    }
    context.strokeStyle = `rgb(148 163 184 / ${EDGE_ALPHA})`;
    context.lineWidth = EDGE_WIDTH;
    context.stroke();

    for (const node of nodes) {
      if (!node.onScreen) continue;
      context.fillStyle = '#e2e8f0';
      context.globalAlpha = NODE_ALPHA;
      context.fillRect(node.x - NODE_SIZE / 2, node.y - NODE_SIZE / 2, NODE_SIZE, NODE_SIZE);
    }
    context.globalAlpha = 1;
  }

  function tick(time: number): void {
    if (layoutDirty) {
      build();
      layoutDirty = false;
    }
    draw(time);
    if (running) frame = requestAnimationFrame(tick);
  }

  function start(): void {
    // Single choke point for animation: no caller can spin up a rAF loop while
    // the user has asked for reduced motion. Every entry point that wants
    // motion goes through here, so the preference cannot be bypassed.
    if (running || prefersReduced()) return;
    running = true;
    frame = requestAnimationFrame(tick);
  }

  function stop(): void {
    running = false;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  function onPointerMove(event: PointerEvent): void {
    pointerX = event.clientX;
    pointerY = event.clientY;
    pointerInside = true;
  }

  function onPointerLeave(): void {
    pointerInside = false;
  }

  /**
   * Hidden: never burn a rAF on a background tab.
   *
   * Visible: re-evaluate the motion preference rather than calling start()
   * outright. "The tab is visible again" is not the same question as "the user
   * wants motion" — a reduced-motion user coming back has to get a static
   * redraw, not a resumed loop, so this routes through the same branch the
   * preference change listener uses.
   */
  function onVisibilityChange(): void {
    if (document.hidden) stop();
    else onMotionPreferenceChange();
  }

  function onMotionPreferenceChange(): void {
    if (prefersReduced()) {
      stop();
      if (layoutDirty) {
        build();
        layoutDirty = false;
      }
      drawStatic();
    } else {
      layoutDirty = true;
      start();
    }
  }

  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  function onResize(): void {
    if (resizeTimer !== undefined) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();

      // Assigning canvas.width wipes the backing store, and with reduced motion
      // there is no rAF loop to repaint it. Redraw here or the field goes blank
      // until the OS preference is toggled.
      if (!running) {
        if (layoutDirty) {
          build();
          layoutDirty = false;
        }
        drawStatic();
      }
    }, 180);
  }

  resize();
  window.addEventListener('resize', onResize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerleave', onPointerLeave);
  document.addEventListener('visibilitychange', onVisibilityChange);
  reducedMotion.addEventListener('change', onMotionPreferenceChange);

  onMotionPreferenceChange();

  return {
    destroy() {
      stop();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      reducedMotion.removeEventListener('change', onMotionPreferenceChange);
      if (resizeTimer !== undefined) clearTimeout(resizeTimer);
    },
  };
}