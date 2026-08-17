// Pure, framework-free lane/topology calculator for the commit-history graph.
//
// The host returns paged raw topology (hash + full parent hashes) in
// `--date-order`; this module streams those commits newest→oldest and assigns
// each to a column the way `git log --graph` does. Keeping the cursor state
// between calls lets long histories be computed incrementally — one page at a
// time, each a tiny synchronous step — instead of recomputing everything.
//
// Columns are never spliced/compacted: a freed lane leaves a `null` spacer that
// later lanes reuse. That keeps every already-drawn commit's column stable, so
// crossing merges (criss-cross) never shift a lane out from under a line that
// was already drawn — the trunk keeps running straight through a merge.
// It is deliberately DOM/React-free so the same code could run in a Web Worker.
import type { GitLogCommit } from '../shared/rpc.js'

/** One drawable element on a single graph row. */
export type GraphCell =
  | { col: number; kind: 'dot'; color: string; up: boolean; down: boolean }
  | { col: number; kind: 'vline'; color: string }
  | { col: number; kind: 'edge'; toCol: number; color: string }

/** A rendered row: a commit row (has `commit`) or a bend row (no commit). */
export interface GraphRow {
  cells: GraphCell[]
  commit?: GitLogCommit
  /** Column of the commit dot on commit rows. */
  col?: number
  /** Rightmost live lane crossing this row (counting lanes this commit forks
   *  off, which exist from this row downward). The commit text hugs this lane
   *  so unrelated branches to the right never push it away. */
  textCol?: number
}

interface Lane {
  id: number
  color: string
}

/** Mutable drawing state, persisted across pages so lanes stay connected. */
export interface GraphCursor {
  /** Columns; a `null` entry is a freed column kept as a stable spacer. */
  lanes: (Lane | null)[]
  /** commit hash → lane id (the column that commit is traveling down). */
  commitLane: Map<string, number>
  nextLaneId: number
  nextColor: number
  freeColors: string[]
  /** Highest column index ever used (spacers included) → graph width. */
  maxCol: number
}

/** Soft, theme-neutral lane palette (reads fine on both light and dark). */
export const GRAPH_PALETTE = [
  '#4a86c8', '#e0554f', '#4caf50', '#e6a23c',
  '#9c27b0', '#00b4d8', '#8a63d2', '#d99a2b',
  '#5fd8f0', '#f06292', '#26a69a', '#7e57c2',
] as const

export function createCursor(): GraphCursor {
  return {
    lanes: [],
    commitLane: new Map(),
    nextLaneId: 1,
    nextColor: 0,
    freeColors: [],
    maxCol: 0,
  }
}

function allocColor(cursor: GraphCursor): string {
  const recycled = cursor.freeColors.pop()
  if (recycled !== undefined) return recycled
  return GRAPH_PALETTE[cursor.nextColor++ % GRAPH_PALETTE.length]
}

function newLane(cursor: GraphCursor): Lane {
  return { id: cursor.nextLaneId++, color: allocColor(cursor) }
}

function freeColor(cursor: GraphCursor, lane: Lane): void {
  // Recycle at most one palette's worth so colors don't thrash.
  if (cursor.freeColors.length < GRAPH_PALETTE.length) cursor.freeColors.push(lane.color)
}

/** Reuse the first freed spacer, or append a new column. */
function placeLane(cursor: GraphCursor, lane: Lane): number {
  const idx = cursor.lanes.findIndex((l) => l === null)
  if (idx >= 0) {
    cursor.lanes[idx] = lane
    return idx
  }
  cursor.lanes.push(lane)
  const col = cursor.lanes.length - 1
  if (col > cursor.maxCol) cursor.maxCol = col
  return col
}

/** Place a lane at a target column (padding with spacers), or fall back to the
 *  first free spacer if that column is taken. */
function placeLaneAt(cursor: GraphCursor, lane: Lane, targetCol: number): number {
  while (cursor.lanes.length <= targetCol) cursor.lanes.push(null)
  if (cursor.lanes[targetCol] === null) {
    cursor.lanes[targetCol] = lane
    if (targetCol > cursor.maxCol) cursor.maxCol = targetCol
    return targetCol
  }
  return placeLane(cursor, lane)
}

/** Highest column still holding a live lane (a commit's text hugs this one). */
function rightmostLane(cursor: GraphCursor, fallback: number): number {
  let col = fallback
  for (let i = 0; i < cursor.lanes.length; i++) {
    if (cursor.lanes[i] !== null && i > col) col = i
  }
  return col
}

/**
 * Stream `commits` (newest → oldest) through the cursor, returning their rows.
 * Callers keep the cursor and feed one page at a time; the returned rows are the
 * increment since the previous call.
 */
export function advance(cursor: GraphCursor, commits: GitLogCommit[]): GraphRow[] {
  // Index each commit's parents so a fork can look ahead and detect a crossing
  // merge (its own parent is already reserved) without re-scanning the log.
  const parentOf = new Map<string, string[]>()
  for (const c of commits) parentOf.set(c.hash, c.parents)
  const rows: GraphRow[] = []
  for (const commit of commits) appendCommit(cursor, commit, rows, parentOf)
  return rows
}

function appendCommit(cursor: GraphCursor, c: GitLogCommit, rows: GraphRow[], parentOf: Map<string, string[]>): void {
  const parents = c.parents

  // Resolve c's column: reuse its reserved lane, or open a fresh one for a tip.
  const existingId = cursor.commitLane.get(c.hash)
  let laneC: Lane | undefined
  let colC = -1
  if (existingId !== undefined) {
    colC = cursor.lanes.findIndex((l) => l !== null && l.id === existingId)
    if (colC >= 0) laneC = cursor.lanes[colC] as Lane
  }
  // `up` is true when a child already reserved this lane (c is not a tip), so
  // the line continues above the dot; `down` is true when c has parents.
  const up = laneC !== undefined
  if (laneC === undefined) {
    laneC = newLane(cursor)
    colC = placeLane(cursor, laneC)
    cursor.commitLane.set(c.hash, laneC.id)
  }

  // Commit row: dot at c's column, a vertical pass-through everywhere else
  // (spacer columns are skipped).
  const down = parents.length > 0
  const commitCells: GraphCell[] = []
  for (let i = 0; i < cursor.lanes.length; i++) {
    const l = cursor.lanes[i]
    if (l === null) continue
    if (i === colC) commitCells.push({ col: i, kind: 'dot', color: l.color, up, down })
    else commitCells.push({ col: i, kind: 'vline', color: l.color })
  }
  rows.push({ cells: commitCells, commit: c, col: colC })
  const commitRow = rows.length - 1

  if (parents.length === 0) {
    // Root: the lane terminates here.
    rows[commitRow].textCol = rightmostLane(cursor, colC)
    freeColor(cursor, laneC)
    cursor.lanes[colC] = null
    cursor.commitLane.delete(c.hash)
    return
  }

  // Plan a column for each parent. The first parent inherits c's lane so linear
  // history stays a straight line; other parents open a new lane or merge into
  // an already-reserved lane (the "two branches meet" case). `isNew` marks a
  // freshly-opened lane (a fork) vs. a merge into an existing lane.
  const plans: Array<{ parent: string; lane: Lane; col: number; isNew: boolean; idx: number }> = []
  for (let i = 0; i < parents.length; i++) {
    const p = parents[i]
    const pid = cursor.commitLane.get(p)
    const pidx = pid === undefined ? -1 : cursor.lanes.findIndex((l) => l !== null && l.id === pid)
    if (pidx >= 0) {
      plans.push({ parent: p, lane: cursor.lanes[pidx] as Lane, col: pidx, isNew: false, idx: i })
      continue
    }
    if (i === 0) {
      cursor.commitLane.set(p, laneC.id)
      plans.push({ parent: p, lane: laneC, col: colC, isNew: false, idx: i })
    } else {
      const nl = newLane(cursor)
      // If this second parent's own parent is already reserved, the branch will
      // cross back into that lane; give it a spacer column so the bend has room
      // instead of overlapping the first parent's line. When p lives on a later
      // page we can't look ahead, so reserve the spacer conservatively.
      const pParents = parentOf.get(p)
      const crossesBack = pParents === undefined || pParents.some((gp) => cursor.commitLane.has(gp))
      const newCol = crossesBack ? placeLaneAt(cursor, nl, colC + 2) : placeLane(cursor, nl)
      cursor.commitLane.set(p, nl.id)
      plans.push({ parent: p, lane: nl, col: newCol, isNew: true, idx: i })
    }
  }

  // The commit's text hugs the rightmost lane that crosses this row, counting
  // lanes this commit just forked off (they exist from this row downward).
  rows[commitRow].textCol = rightmostLane(cursor, colC)

  // c's lane survives only if the first parent inherited it (linear history).
  const cLaneContinues = plans.some((pl) => pl.lane.id === laneC.id)

  // Landing column of each fork (newly-opened lane), keyed by its plan order.
  // A fork's lane exists only after it lands, so earlier bend rows must not draw
  // its vertical pass-through yet — otherwise a stub appears beside the trunk.
  const forkOrderByCol = new Map<number, number>() // column -> plan order
  for (const pl of plans) if (pl.isNew) forkOrderByCol.set(pl.col, pl.idx)

  // One bend row per parent that lands on a different column. Every OTHER lane
  // keeps a vertical pass-through; c's own column keeps one while the trunk
  // continues OR while a later bend still needs to peel off from it (a merge
  // commit whose parents land on several columns), so no edge starts dangling.
  const bends = plans.filter((pl) => pl.col !== colC)
  for (let bi = 0; bi < bends.length; bi++) {
    const pl = bends[bi]
    const isLastBend = bi === bends.length - 1
    const cells: GraphCell[] = []
    for (let i = 0; i < cursor.lanes.length; i++) {
      const l = cursor.lanes[i]
      if (l === null) continue
      if (i === colC) {
        // Keep the trunk vertical unless it merges away and this is the last
        // bend (no later edge needs an upstream on this column).
        if (!cLaneContinues && isLastBend) continue
      } else {
        // A fork lane: draw its vertical only once it has landed — i.e. the fork
        // appeared at or before this bend in parent order.
        const forkOrder = forkOrderByCol.get(i)
        if (forkOrder !== undefined && forkOrder >= pl.idx) continue
      }
      cells.push({ col: i, kind: 'vline', color: l.color })
    }
    // The bend belongs to the forked/merged branch: a fork, or a merge-commit's
    // second parent, takes the parent lane's color; a plain commit merging into
    // an existing lane takes its own (it IS that branch's tip).
    const edgeColor = pl.isNew || cLaneContinues ? pl.lane.color : laneC.color
    cells.push({ col: colC, kind: 'edge', toCol: pl.col, color: edgeColor })
    rows.push({ cells })
  }

  if (!cLaneContinues) {
    freeColor(cursor, laneC)
    cursor.lanes[colC] = null
  }
  cursor.commitLane.delete(c.hash)
}
