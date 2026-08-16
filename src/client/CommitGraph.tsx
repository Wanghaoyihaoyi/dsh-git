// Commit-history graph, docked at the bottom of the git panel. Collapsed to a
// single header bar by default; expanding it splits the vertical space evenly
// with the file list.
//
// The host returns paged raw topology (no `--graph`); this component owns lane
// drawing via `graph.ts`, so it can page lazily — scrolling near the bottom
// loads the next page and extends the lanes without tearing the graph. Lanes are
// drawn as smooth rounded SVG bends with a soft palette; the graph column width
// shrinks when there are many lanes so the commit text is never pushed off the
// edge. Rows are virtualized; a commit expands inline to its changed files, and
// hovering it shows a detail popover on the left.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { UIEvent } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { GitApi } from './rpc.js'
import type { GitCommitDetail, GitLogCommit } from '../shared/rpc.js'
import { advance, createCursor, type GraphCursor, type GraphRow } from './graph.js'
import { CopyIcon, RefreshIcon } from './icons.js'

const ROW_H = 26
const EDGE_H = 16
const OVERSCAN = 8
const FILE_ROW_H = 22
const FILES_PAD = 8
const NOTE_H = 28
/** Vertical padding kept between the hover card and the viewport edges. */
const HOVER_MARGIN = 8
/** Poll interval for auto-refreshing the history graph while it is expanded. */
const HISTORY_POLL_MS = 4000
/** Commits fetched per page. */
const PAGE_SIZE = 500
/** Lane pitch is clamped so many branches shrink instead of pushing text out. */
const LANE_W_MIN = 6
const LANE_W_MAX = 16
/** Minimum width reserved for the commit text column. */
const DESC_MIN = 110
/** Gap between the graph and the text column. */
const GRAPH_RIGHT_GAP = 10
/** Scroll distance from the bottom that triggers loading the next page. */
const LOAD_MORE_THRESHOLD = 240

type DetailState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: GitCommitDetail }

export interface CommitGraphProps {
  git: GitApi
  cwd: string
  onError: (message: string | null) => void
  t: TranslateNS<'git'>
}

function refLabel(ref: string): string {
  if (ref.startsWith('HEAD -> ')) return ref.slice('HEAD -> '.length)
  if (ref.startsWith('tag: ')) return ref.slice('tag: '.length)
  return ref
}

function basename(path: string): string {
  return path.split('/').pop() ?? path
}

function isCurrentRef(ref: string): boolean {
  return ref === 'HEAD' || ref.startsWith('HEAD -> ')
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString()
}

function blockHeight(detail: DetailState | undefined): number {
  if (detail?.status === 'ok' && detail.data.files.length > 0) {
    return FILES_PAD + detail.data.files.length * FILE_ROW_H
  }
  return NOTE_H
}

function rowHeight(row: GraphRow, expanded: Set<string>, details: Map<string, DetailState>): number {
  if (row.commit === undefined) return EDGE_H
  if (!expanded.has(row.commit.hash)) return ROW_H
  return ROW_H + blockHeight(details.get(row.commit.hash))
}

function findStart(offsets: number[], y: number): number {
  let lo = 0
  let hi = offsets.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (offsets[mid] <= y) lo = mid + 1
    else hi = mid
  }
  return Math.max(0, lo - 1)
}

function GraphSvg({ cells, width, height, laneW, dotY }: { cells: GraphRow['cells']; width: number; height: number; laneW: number; dotY?: number }) {
  const cx = (col: number) => col * laneW + laneW / 2
  const cap = { strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg className="dshgit-log-graph" width={width} height={height} aria-hidden="true">
      {cells.map((cell, i) => {
        const x = cx(cell.col)
        const color = cell.color
        switch (cell.kind) {
          case 'dot': {
            const cy = dotY ?? height / 2
            return (
              <g key={i}>
                {cell.up ? <line x1={x} y1={0} x2={x} y2={cy} stroke={color} {...cap} /> : null}
                {cell.down ? <line x1={x} y1={cy} x2={x} y2={height} stroke={color} {...cap} /> : null}
                <circle cx={x} cy={cy} r={3} fill={color} />
              </g>
            )
          }
          case 'vline':
            return <line key={i} x1={x} y1={0} x2={x} y2={height} stroke={color} {...cap} />
          case 'edge': {
            const from = x
            const to = cx(cell.toCol ?? cell.col)
            const d = `M ${from} 0 C ${from} ${height * 0.35}, ${to} ${height * 0.65}, ${to} ${height}`
            return <path key={i} d={d} fill="none" stroke={color} {...cap} />
          }
          default:
            return null
        }
      })}
    </svg>
  )
}

function FilesBlock({ state, t }: { state: DetailState | undefined; t: TranslateNS<'git'> }) {
  if (state === undefined || state.status === 'loading') {
    return <div className="dshgit-log-files-note">{t('loading')}</div>
  }
  if (state.status === 'error') {
    return <div className="dshgit-log-files-note dshgit-log-files-error">{state.message}</div>
  }
  const files = state.data.files
  if (files.length === 0) {
    return <div className="dshgit-log-files-note">{t('noFileChanges')}</div>
  }
  return (
    <div className="dshgit-log-files">
      {files.map((file) => (
        <div className="dshgit-log-file" key={file.path}>
          <span className={`dshgit-file-status dshgit-file-status-${file.status}`}>{file.status}</span>
          <span className="dshgit-path" title={file.path}>{basename(file.path)}</span>
        </div>
      ))}
    </div>
  )
}

export function CommitGraph({ git, cwd, onError, t }: CommitGraphProps) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<GraphRow[]>([])
  const [maxCol, setMaxCol] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [details, setDetails] = useState<Map<string, DetailState>>(new Map())
  const [hover, setHover] = useState<{ hash: string; rowTop: number; right: number } | null>(null)
  const [hoverTop, setHoverTop] = useState(0)
  const [copied, setCopied] = useState(false)

  const cursorRef = useRef<GraphCursor>(createCursor())
  const commitsRef = useRef<GitLogCommit[]>([])
  const offsetRef = useRef(0)
  const hasMoreRef = useRef(false)
  const loadingRef = useRef(false)
  const firstCommitHashRef = useRef<string | undefined>(undefined)
  const viewportRef = useRef<HTMLDivElement>(null)
  const hoverRef = useRef<HTMLDivElement>(null)
  const hoverTimer = useRef<number | undefined>(undefined)
  const inFlight = useRef(new Set<string>())
  const copiedTimer = useRef<number | undefined>(undefined)

  const reset = useCallback(() => {
    cursorRef.current = createCursor()
    commitsRef.current = []
    offsetRef.current = 0
    hasMoreRef.current = false
    firstCommitHashRef.current = undefined
    setRows([])
    setMaxCol(0)
    setExpanded(new Set())
    setDetails(new Map())
  }, [])

  // The workspace changed: drop the stale graph and collapse.
  useEffect(() => {
    reset()
    setOpen(false)
  }, [cwd, reset])

  const loadNextPage = useCallback(async () => {
    if (loadingRef.current) return
    const first = offsetRef.current === 0
    if (!first && !hasMoreRef.current) return
    loadingRef.current = true
    if (first) setLoading(true)
    else setLoadingMore(true)
    onError(null)
    try {
      const page = await git.logPage(cwd, offsetRef.current, PAGE_SIZE)
      const newRows = advance(cursorRef.current, page.commits)
      commitsRef.current = first ? page.commits : [...commitsRef.current, ...page.commits]
      setRows((prev) => (first ? newRows : [...prev, ...newRows]))
      setMaxCol(cursorRef.current.maxCol)
      offsetRef.current += page.commits.length
      hasMoreRef.current = page.hasMore
      if (first && page.commits.length > 0) firstCommitHashRef.current = page.commits[0].hash
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    } finally {
      loadingRef.current = false
      setLoading(false)
      setLoadingMore(false)
    }
  }, [git, cwd, onError])

  // Auto-refresh while expanded: poll the newest commit; when it changes, fetch
  // only the new commits, prepend them, and recompute in one atomic swap (no
  // reset-to-empty), so the list updates without flicker and keeps its position.
  useEffect(() => {
    if (!open || loading || loadingMore) return
    let disposed = false
    let refreshing = false
    const timer = window.setInterval(() => {
      if (disposed || refreshing) return
      void git
        .logPage(cwd, 0, 1)
        .then(({ commits }) => {
          if (disposed) return
          const latest = commits[0]?.hash
          const current = firstCommitHashRef.current
          if (latest === undefined || current === undefined || latest === current) return
          refreshing = true
          void (async () => {
            try {
              // Collect commits newer than the current newest (newest first).
              const incoming: GitLogCommit[] = []
              let offset = 0
              while (incoming.length < 10000) {
                const page = await git.logPage(cwd, offset, PAGE_SIZE)
                let found = false
                for (const c of page.commits) {
                  if (c.hash === current) { found = true; break }
                  incoming.push(c)
                }
                if (found) break
                if (page.commits.length === 0 || !page.hasMore) break
                offset += page.commits.length
              }
              if (disposed || incoming.length === 0) return
              const merged = [...incoming, ...commitsRef.current]
              // Height the prepended commits add, so the scroll position shifts
              // by the same amount and the content under the cursor stays put.
              const incomingRows = advance(createCursor(), incoming)
              const incomingHeight = incomingRows.reduce((h, r) => h + rowHeight(r, expanded, details), 0)
              const scrollBefore = viewportRef.current?.scrollTop ?? 0
              const cursor = createCursor()
              const newRows = advance(cursor, merged)
              commitsRef.current = merged
              cursorRef.current = cursor
              setRows(newRows)
              setMaxCol(cursor.maxCol)
              firstCommitHashRef.current = incoming[0].hash
              offsetRef.current = merged.length
              requestAnimationFrame(() => {
                if (!disposed && viewportRef.current) viewportRef.current.scrollTop = scrollBefore + incomingHeight
              })
            } catch {
              // Transient refresh failures are ignored; the next tick retries.
            } finally {
              refreshing = false
            }
          })()
        })
        .catch(() => {
          // Transient poll failures are ignored; the next tick retries.
        })
    }, HISTORY_POLL_MS)
    return () => {
      disposed = true
      window.clearInterval(timer)
    }
  }, [open, loading, loadingMore, cwd, git])

  const ensureDetail = useCallback(async (hash: string) => {
    if (details.get(hash) !== undefined || inFlight.current.has(hash)) return
    inFlight.current.add(hash)
    setDetails((prev) => new Map(prev).set(hash, { status: 'loading' }))
    try {
      const data = await git.commitDetail(cwd, hash)
      setDetails((prev) => new Map(prev).set(hash, { status: 'ok', data }))
    } catch (err) {
      setDetails((prev) => new Map(prev).set(hash, { status: 'error', message: err instanceof Error ? err.message : String(err) }))
    } finally {
      inFlight.current.delete(hash)
    }
  }, [git, cwd, details])

  const toggle = useCallback(() => {
    const next = !open
    setOpen(next)
    if (next && rows.length === 0) void loadNextPage()
  }, [open, rows.length, loadNextPage])

  const forceReload = useCallback(() => {
    reset()
    void loadNextPage()
  }, [reset, loadNextPage])

  const toggleExpand = useCallback((hash: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(hash)) next.delete(hash)
      else next.add(hash)
      return next
    })
    void ensureDetail(hash)
  }, [ensureDetail])

  const clearHoverTimer = useCallback(() => {
    if (hoverTimer.current !== undefined) {
      window.clearTimeout(hoverTimer.current)
      hoverTimer.current = undefined
    }
  }, [])

  const showPopover = useCallback((hash: string, el: HTMLElement) => {
    clearHoverTimer()
    const rect = el.getBoundingClientRect()
    setHover({ hash, rowTop: rect.top, right: window.innerWidth - rect.left + 8 })
    setHoverTop(rect.top)
    void ensureDetail(hash)
  }, [clearHoverTimer, ensureDetail])

  const scheduleHide = useCallback(() => {
    clearHoverTimer()
    hoverTimer.current = window.setTimeout(() => setHover(null), 150)
  }, [clearHoverTimer])

  const copyHash = useCallback((hash: string) => {
    void navigator.clipboard.writeText(hash).then(() => {
      setCopied(true)
      if (copiedTimer.current !== undefined) window.clearTimeout(copiedTimer.current)
      copiedTimer.current = window.setTimeout(() => setCopied(false), 1500)
    })
  }, [])

  // Track the expanded viewport size for windowing + lane-width clamping.
  useEffect(() => {
    const el = viewportRef.current
    if (el === null) return
    const update = () => {
      setViewportHeight(el.clientHeight)
      setViewportWidth(el.clientWidth)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [open])

  useEffect(() => () => {
    if (hoverTimer.current !== undefined) window.clearTimeout(hoverTimer.current)
    if (copiedTimer.current !== undefined) window.clearTimeout(copiedTimer.current)
  }, [])

  const onScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget
    setScrollTop(el.scrollTop)
    if (hasMoreRef.current && !loadingRef.current && el.scrollTop + el.clientHeight >= el.scrollHeight - LOAD_MORE_THRESHOLD) {
      void loadNextPage()
    }
  }, [loadNextPage])

  const { offsets, totalHeight } = useMemo(() => {
    const offsets = new Array<number>(rows.length + 1)
    offsets[0] = 0
    for (let i = 0; i < rows.length; i++) offsets[i + 1] = offsets[i] + rowHeight(rows[i], expanded, details)
    return { offsets, totalHeight: offsets[rows.length] }
  }, [rows, expanded, details])

  // Stable keys: commit rows key by hash, bend rows by the preceding commit's
  // hash + ordinal, so a refresh that prepends commits reuses existing DOM
  // instead of remounting every row (avoids flicker).
  const rowKeys = useMemo(() => {
    const keys = new Array<string>(rows.length)
    let prev = ''
    let seq = 0
    for (let i = 0; i < rows.length; i++) {
      const commit = rows[i].commit
      if (commit !== undefined) {
        prev = commit.hash
        seq = 0
        keys[i] = `c:${commit.hash}`
      } else {
        keys[i] = `b:${prev}:${seq++}`
      }
    }
    return keys
  }, [rows])

  const { start, end } = useMemo(() => {
    if (rows.length === 0) return { start: 0, end: 0 }
    const start = Math.max(0, findStart(offsets, scrollTop) - OVERSCAN)
    let end = start
    const bottom = scrollTop + viewportHeight
    while (end < rows.length && offsets[end] < bottom) end++
    end = Math.min(rows.length, end + OVERSCAN)
    return { start, end }
  }, [rows, offsets, scrollTop, viewportHeight])

  // Lane pitch shrinks as branches accumulate, so the text column always keeps
  // at least DESC_MIN px regardless of how wide the graph wants to be.
  const colCount = maxCol + 1
  const { laneW, graphWidth } = useMemo(() => {
    const avail = Math.max(0, viewportWidth - DESC_MIN - GRAPH_RIGHT_GAP)
    const laneW = Math.max(LANE_W_MIN, Math.min(LANE_W_MAX, avail / Math.max(1, colCount)))
    return { laneW, graphWidth: colCount * laneW }
  }, [colCount, viewportWidth])

  const hoverDetail = hover !== null ? details.get(hover.hash) : undefined
  const hoverCommit = hover !== null
    ? rows.find((row) => row.commit?.hash === hover.hash)?.commit
    : undefined

  // Clamp the hover card vertically so it never overflows the viewport: start
  // with its top aligned to the hovered row, then shift it up when its bottom
  // would run past the viewport edge. Re-runs as the detail loads (the card
  // grows from the loading note to the full message + meta block), so it stays
  // inside the viewport at every height.
  useLayoutEffect(() => {
    const el = hoverRef.current
    if (el === null || hover === null) return
    const height = el.getBoundingClientRect().height
    const maxTop = Math.max(HOVER_MARGIN, window.innerHeight - height - HOVER_MARGIN)
    setHoverTop(Math.max(HOVER_MARGIN, Math.min(hover.rowTop, maxTop)))
  }, [hover, hoverDetail])

  return (
    <div className={`dshgit-history${open ? ' dshgit-history-open' : ''}`}>
      <div className="dshgit-history-head" onClick={toggle}>
        <span className="dshgit-history-left">
          <span className="dshgit-history-caret">{open ? '▾' : '▸'}</span>
          <span className="dshgit-history-title">{t('history')}</span>
        </span>
        <button
          className="dshgit-ghost"
          title={t('refreshHistory')}
          disabled={loading || loadingMore}
          onClick={(event) => {
            event.stopPropagation()
            forceReload()
          }}
        >
          <RefreshIcon size={14} />
        </button>
      </div>

      {open ? (
        <div className="dshgit-log-viewport" ref={viewportRef} onScroll={onScroll}>
          {loading && rows.length === 0 ? (
            <div className="dshgit-log-empty">{t('loading')}</div>
          ) : !loading && rows.length === 0 ? (
            <div className="dshgit-log-empty">{t('noHistory')}</div>
          ) : (
            <div style={{ height: totalHeight, position: 'relative' }}>
              {rows.slice(start, end).map((row, index) => {
                const i = start + index
                const commit = row.commit
                const fullHeight = rowHeight(row, expanded, details)
                const isExpanded = commit !== undefined && expanded.has(commit.hash)
                // Right-most column this row actually draws, so the text hugs the
                // line instead of clearing the whole (global) graph width.
                let rowRight = 0
                for (const cell of row.cells) {
                  const c = cell.kind === 'edge' ? Math.max(cell.col, cell.toCol) : cell.col
                  if (c > rowRight) rowRight = c
                }
                const textLeft = (rowRight + 1) * laneW + GRAPH_RIGHT_GAP
                const graphHeight = commit !== undefined ? fullHeight : EDGE_H
                return (
                  <div key={rowKeys[i]} style={{ position: 'absolute', top: offsets[i], left: 0, right: 0, height: fullHeight }}>
                    <GraphSvg cells={row.cells} width={graphWidth} height={graphHeight} laneW={laneW} dotY={commit !== undefined ? ROW_H / 2 : undefined} />
                    {commit !== undefined ? (
                      <button
                        type="button"
                        className="dshgit-log-commit"
                        style={{ position: 'absolute', top: 0, left: textLeft, right: 0, height: ROW_H }}
                        onClick={() => toggleExpand(commit.hash)}
                        onMouseEnter={(event) => showPopover(commit.hash, event.currentTarget)}
                        onMouseLeave={scheduleHide}
                      >
                        {commit.refs.map((ref) => (
                          <span
                            key={ref}
                            className={`dshgit-log-ref${isCurrentRef(ref) ? ' dshgit-log-ref-current' : ''}${ref.startsWith('tag:') ? ' dshgit-log-ref-tag' : ''}`}
                          >
                            {refLabel(ref)}
                          </span>
                        ))}
                        <span className="dshgit-log-subject">{commit.subject}</span>
                      </button>
                    ) : null}
                    {isExpanded ? (
                      <div style={{ position: 'absolute', top: ROW_H, left: textLeft, right: 0 }}>
                        <FilesBlock state={details.get(commit.hash)} t={t} />
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : null}

      {hover !== null ? (
        <div
          className="dshgit-hover"
          ref={hoverRef}
          style={{ top: hoverTop, right: hover.right }}
          onMouseEnter={clearHoverTimer}
          onMouseLeave={scheduleHide}
        >
          {hoverDetail === undefined || hoverDetail.status === 'loading' ? (
            <div className="dshgit-hover-note">{t('loading')}</div>
          ) : hoverDetail.status === 'error' ? (
            <div className="dshgit-hover-note dshgit-hover-error">{hoverDetail.message}</div>
          ) : (
            <>
              <div className="dshgit-hover-message">{hoverDetail.data.message}</div>
              <div className="dshgit-hover-meta">
                <div><span className="dshgit-hover-label">{t('author')}</span>{hoverDetail.data.author}</div>
                <div><span className="dshgit-hover-label">{t('date')}</span>{formatDate(hoverDetail.data.date)}</div>
              </div>
              <div className="dshgit-hover-hash">
                <span className="dshgit-hover-hash-value">{hoverCommit?.shortHash ?? hover.hash.slice(0, 7)}</span>
                <button
                  type="button"
                  className="dshgit-hover-copy"
                  title={t('copyHash')}
                  onClick={() => copyHash(hoverDetail.data.hash)}
                >
                  {copied ? <span className="dshgit-hover-copied">{t('copied')}</span> : <CopyIcon size={14} />}
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
