// Commit-history graph, docked at the bottom of the git panel. Collapsed to a
// single header bar by default; expanding it splits the vertical space evenly
// with the file list. Graph lines are drawn as SVG (continuous across rows) with
// git's own lane colors; rows are virtualized and a commit expands inline to its
// changed-files list, while hovering it shows a detail popover on the left.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { UIEvent } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { GitApi } from './rpc.js'
import type { GitCommitDetail, GitGraphCell, GitLogRow } from '../shared/rpc.js'
import { CopyIcon, RefreshIcon } from './icons.js'

const ROW_H = 24
const COL_W = 14
const OVERSCAN = 8
const FILE_ROW_H = 22
const FILES_PAD = 8
const NOTE_H = 28
/** Poll interval for auto-refreshing the history graph while it is expanded. */
const HISTORY_POLL_MS = 4000

/** Cheap stable fingerprint of a log snapshot (count + commit hashes + refs). */
function logFingerprint(rows: GitLogRow[]): string {
  let out = String(rows.length)
  for (const row of rows) {
    const commit = row.commit
    out += commit === undefined ? '|-' : `|${commit.hash}:${commit.refs.join(';')}`
  }
  return out
}

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

function rowHeight(row: GitLogRow, expanded: Set<string>, details: Map<string, DetailState>): number {
  if (row.commit === undefined || !expanded.has(row.commit.hash)) return ROW_H
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

function GraphSvg({ cells, width, height }: { cells: GitGraphCell[]; width: number; height: number }) {
  const cx = (col: number) => Math.max(0, col) * COL_W + COL_W / 2
  const topBand = ROW_H
  const cap = { strokeWidth: 1.6, strokeLinecap: 'round' as const }
  return (
    <svg className="dshgit-log-graph" width={width} height={height} aria-hidden="true">
      {cells.map((cell, i) => {
        const x = cx(cell.col)
        const color = cell.color ?? 'var(--dsw-alias-label-secondary)'
        switch (cell.ch) {
          case '*':
            return <circle key={i} cx={x} cy={ROW_H / 2} r={3.2} className="dshgit-log-dot" />
          case '|':
          case '.':
            return <line key={i} x1={x} y1={0} x2={x} y2={height} stroke={color} {...cap} />
          case '\\':
            return <line key={i} x1={cx(cell.col - 1)} y1={0} x2={cx(cell.col + 1)} y2={topBand} stroke={color} {...cap} />
          case '/':
            return <line key={i} x1={cx(cell.col + 1)} y1={0} x2={cx(cell.col - 1)} y2={topBand} stroke={color} {...cap} />
          case '_':
          case '-':
            return <line key={i} x1={cx(cell.col - 1)} y1={ROW_H / 2} x2={cx(cell.col + 1)} y2={ROW_H / 2} stroke={color} {...cap} />
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
  const [rows, setRows] = useState<GitLogRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [details, setDetails] = useState<Map<string, DetailState>>(new Map())
  const [hover, setHover] = useState<{ hash: string; top: number; right: number } | null>(null)
  const [copied, setCopied] = useState(false)
  const viewportRef = useRef<HTMLDivElement>(null)
  const hoverTimer = useRef<number | undefined>(undefined)
  const inFlight = useRef(new Set<string>())
  const copiedTimer = useRef<number | undefined>(undefined)
  const lastFingerprintRef = useRef<string | null>(null)

  // The workspace changed: drop the stale graph and collapse.
  useEffect(() => {
    setRows(null)
    setOpen(false)
    setExpanded(new Set())
    setDetails(new Map())
    lastFingerprintRef.current = null
  }, [cwd])

  const load = useCallback(async (force = false) => {
    if (loading || (rows !== null && !force)) return
    setLoading(true)
    onError(null)
    try {
      const { rows: data } = await git.log(cwd)
      setRows(data)
      lastFingerprintRef.current = logFingerprint(data)
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [git, cwd, loading, rows, onError])

  // Auto-refresh the graph while it is expanded (new commits/refs made outside
  // the panel show up). A cheap fingerprint comparison keeps a no-op poll from
  // re-rendering; skip while a manual load is in flight.
  useEffect(() => {
    if (!open || loading) return
    let disposed = false
    const timer = window.setInterval(() => {
      if (disposed) return
      void git
        .log(cwd)
        .then(({ rows: data }) => {
          if (disposed) return
          const fingerprint = logFingerprint(data)
          if (lastFingerprintRef.current === fingerprint) return
          lastFingerprintRef.current = fingerprint
          setRows(data)
        })
        .catch(() => {
          // Transient poll failures are ignored; the next tick retries.
        })
    }, HISTORY_POLL_MS)
    return () => {
      disposed = true
      window.clearInterval(timer)
    }
  }, [open, loading, cwd, git])

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
    if (!open) void load()
    setOpen(!open)
  }, [open, load])

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
    setHover({ hash, top: rect.top, right: window.innerWidth - rect.left + 8 })
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

  // Track the expanded viewport height for windowing.
  useEffect(() => {
    const el = viewportRef.current
    if (el === null) return
    const update = () => setViewportHeight(el.clientHeight)
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
    setScrollTop(event.currentTarget.scrollTop)
  }, [])

  const { offsets, totalHeight, graphWidth } = useMemo(() => {
    if (rows === null) return { offsets: [0], totalHeight: 0, graphWidth: 0 }
    const offsets = new Array<number>(rows.length + 1)
    offsets[0] = 0
    let maxCol = 0
    for (let i = 0; i < rows.length; i++) {
      offsets[i + 1] = offsets[i] + rowHeight(rows[i], expanded, details)
      for (const cell of rows[i].graph) if (cell.col + 1 > maxCol) maxCol = cell.col + 1
    }
    return { offsets, totalHeight: offsets[rows.length], graphWidth: maxCol * COL_W }
  }, [rows, expanded, details])

  const { start, end } = useMemo(() => {
    if (rows === null || rows.length === 0) return { start: 0, end: 0 }
    const start = Math.max(0, findStart(offsets, scrollTop) - OVERSCAN)
    let end = start
    const bottom = scrollTop + viewportHeight
    while (end < rows.length && offsets[end] < bottom) end++
    end = Math.min(rows.length, end + OVERSCAN)
    return { start, end }
  }, [rows, offsets, scrollTop, viewportHeight])

  const hoverDetail = hover !== null ? details.get(hover.hash) : undefined
  const hoverCommit = hover !== null && rows !== null
    ? rows.find((row) => row.commit?.hash === hover.hash)?.commit
    : undefined

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
          disabled={loading}
          onClick={(event) => {
            event.stopPropagation()
            void load(true)
          }}
        >
          <RefreshIcon size={14} />
        </button>
      </div>

      {open ? (
        <div className="dshgit-log-viewport" ref={viewportRef} onScroll={onScroll}>
          {loading || rows === null ? (
            <div className="dshgit-log-empty">{loading ? t('loading') : ''}</div>
          ) : rows.length === 0 ? (
            <div className="dshgit-log-empty">{t('noHistory')}</div>
          ) : (
            <div style={{ height: totalHeight, position: 'relative' }}>
              {rows.slice(start, end).map((row, index) => {
                const i = start + index
                const commit = row.commit
                const fullHeight = rowHeight(row, expanded, details)
                const isExpanded = commit !== undefined && expanded.has(commit.hash)
                return (
                  <div key={i} style={{ position: 'absolute', top: offsets[i], left: 0, right: 0, height: fullHeight }}>
                    <GraphSvg cells={row.graph} width={graphWidth} height={fullHeight} />
                    {commit !== undefined ? (
                      <button
                        type="button"
                        className="dshgit-log-commit"
                        style={{ position: 'absolute', top: 0, left: graphWidth + 6, right: 0, height: ROW_H }}
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
                      <div style={{ position: 'absolute', top: ROW_H, left: graphWidth + 6, right: 0 }}>
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
          style={{ top: hover.top, right: hover.right }}
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
