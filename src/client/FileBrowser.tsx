// Workspace file browser: a lazy directory tree plus a text-file preview.
// Rendered as the panel's "files" tab (independent of git-repository state).
//
// Every directory node owns its own open/loading/entries state (FsDir), so
// expanding one subtree never re-renders the whole tree. The host serves one
// directory page at a time (directories first, then files, locale-aware), so
// huge trees never materialize at once; hidden dirs (.git, node_modules) never
// appear. Clicking a file opens its preview below the tree, with a polite
// fallback for binary or oversized files.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { FsEntry, FsReadResult } from '../shared/rpc.js'
import type { GitApi } from './rpc.js'
import { fileIcon } from './fileIcons.js'

function formatSize(bytes: number | undefined): string | undefined {
  if (bytes === undefined) return undefined
  if (bytes < 1024) return String(bytes)
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export interface FileBrowserProps {
  git: GitApi
  cwd: string
  t: TranslateNS<'git'>
}

export function FileBrowser({ git, cwd, t }: FileBrowserProps) {
  const [selected, setSelected] = useState<{ path: string; name: string; size?: number } | null>(null)
  const [preview, setPreview] = useState<FsReadResult | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [rootKey, setRootKey] = useState(0)
  const requestSeq = useRef(0)

  // Remount the tree when the workspace changes (fresh root page).
  useEffect(() => {
    setSelected(null)
    setPreview(null)
    setPreviewError(null)
    setRootKey((k) => k + 1)
  }, [cwd])

  const openFile = useCallback(
    (entry: FsEntry) => {
      const seq = ++requestSeq.current
      setSelected({ path: entry.path, name: entry.name, size: entry.size })
      setPreview(null)
      setPreviewError(null)
      setPreviewLoading(true)
      void git
        .fsRead(cwd, entry.path)
        .then((result) => {
          if (requestSeq.current !== seq) return
          setPreview(result)
        })
        .catch((err) => {
          if (requestSeq.current !== seq) return
          setPreviewError(err instanceof Error ? err.message : String(err))
        })
        .finally(() => {
          if (requestSeq.current === seq) setPreviewLoading(false)
        })
    },
    [git, cwd],
  )

  return (
    <div className="dshgit-fs">
      <div className="dshgit-fs-tree">
            <FsDir
              key={rootKey}
              git={git}
              cwd={cwd}
              path=""
              name=""
              depth={0}
              defaultOpen
              onOpenFile={openFile}
              selectedPath={selected?.path}
              t={t}
            />
          </div>
          {selected ? (
            <div className="dshgit-fs-preview">
              <div className="dshgit-fs-preview-head">
                <span className="dshgit-fs-preview-name" title={selected.path}>{selected.name}</span>
                <span className="dshgit-fs-preview-meta">{formatSize(selected.size) ?? ''}</span>
              </div>
              <div className="dshgit-fs-preview-body">
                {previewLoading ? (
                  <div className="dshgit-fs-note">{t('loading')}</div>
                ) : previewError ? (
                  <div className="dshgit-fs-note dshgit-fs-error">{previewError}</div>
                ) : preview?.binary ? (
                  <div className="dshgit-fs-note">{t('fsBinary')}</div>
                ) : preview?.tooLarge ? (
                  <div className="dshgit-fs-note">{t('fsTooLarge')}</div>
                ) : (
                  <pre className="dshgit-fs-pre">{preview?.content ?? ''}</pre>
                )}
              </div>
            </div>
          ) : null}
    </div>
  )
}

interface FsDirProps {
  git: GitApi
  cwd: string
  /** Directory path relative to cwd; '' is the workspace root. */
  path: string
  name: string
  depth: number
  defaultOpen?: boolean
  onOpenFile: (entry: FsEntry) => void
  selectedPath?: string
  t: TranslateNS<'git'>
}

function FsDir({ git, cwd, path, name, depth, defaultOpen, onOpenFile, selectedPath, t }: FsDirProps) {
  const [open, setOpen] = useState(Boolean(defaultOpen))
  const [entries, setEntries] = useState<FsEntry[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [truncated, setTruncated] = useState(false)
  const inFlight = useRef(false)

  const load = useCallback(async () => {
    if (inFlight.current || entries !== null) return
    inFlight.current = true
    setLoading(true)
    setError(null)
    try {
      const result = await git.fsList(cwd, path)
      setEntries(result.entries)
      setTruncated(result.truncated)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }, [git, cwd, path, entries])

  // Load on first open (mount with defaultOpen, or on the first toggle).
  useEffect(() => {
    if (open && entries === null) void load()
  }, [open, entries, load])

  const toggle = () => {
    setOpen((v) => !v)
  }

  return (
    <div className="dshgit-fs-dir">
      {depth > 0 ? (
        <button
          type="button"
          className="dshgit-fs-dir-row"
          style={{ paddingLeft: 8 + (depth - 1) * 14 }}
          onClick={toggle}
          title={path || name}
        >
          <span className="dshgit-fs-caret">{loading ? '◌' : open ? '▾' : '▸'}</span>
          <span className="dshgit-fs-diricon">{open ? '📂' : '📁'}</span>
          <span className="dshgit-fs-name">{name}</span>
        </button>
      ) : null}
      {open ? (
        <div>
          {loading && entries === null ? (
            <div className="dshgit-fs-note" style={{ paddingLeft: 24 + depth * 14 }}>{t('loading')}</div>
          ) : error ? (
            <div className="dshgit-fs-note dshgit-fs-error" style={{ paddingLeft: 24 + depth * 14 }}>{error}</div>
          ) : entries !== null && entries.length === 0 ? (
            <div className="dshgit-fs-note" style={{ paddingLeft: 24 + depth * 14 }}>{t('fsEmpty')}</div>
          ) : (
            entries?.map((entry) =>
              entry.kind === 'dir' ? (
                <FsDir
                  key={entry.path}
                  git={git}
                  cwd={cwd}
                  path={entry.path}
                  name={entry.name}
                  depth={depth + 1}
                  onOpenFile={onOpenFile}
                  selectedPath={selectedPath}
                  t={t}
                />
              ) : (
                <button
                  type="button"
                  key={entry.path}
                  className={'dshgit-fs-file' + (selectedPath === entry.path ? ' dshgit-fs-file-selected' : '')}
                  style={{ paddingLeft: 28 + depth * 14 }}
                  onClick={() => onOpenFile(entry)}
                  title={entry.path}
                >
                  <span className="dshgit-fs-fileicon">{fileIcon(entry.name)}</span>
                  <span className="dshgit-fs-name">{entry.name}</span>
                  {entry.size !== undefined ? <span className="dshgit-fs-size">{formatSize(entry.size)}</span> : null}
                </button>
              ),
            )
          )}
          {truncated ? (
            <div className="dshgit-fs-note" style={{ paddingLeft: 24 + depth * 14 }}>{t('fsTruncated')}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
