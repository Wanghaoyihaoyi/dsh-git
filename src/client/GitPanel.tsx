// Git source-control panel, rendered into the layout's right `details` column
// (a docked column that squeezes the conversation content, like the left sidebar).
//
// It follows the CURRENT session's workspace: the panel reads the workspace path
// from the global standard hooks and passes it as `cwd` on every RPC call.
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { GlobalStandardProps, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { GitBranch, GitBranchCompare, GitRemote, GitStash, GitStatus } from '../shared/rpc.js'
import type { GitApi } from './rpc.js'
import { panelStore } from './panelStore.js'
import { useIsNarrow } from './useIsNarrow.js'
import { BranchMenu } from './BranchMenu.js'
import { CommitGraph } from './CommitGraph.js'
import { FileBrowser } from './FileBrowser.js'
import { DiffView, lineClass } from './DiffView.js'
import { RemoteMenu } from './RemoteMenu.js'
import { fileIcon } from './fileIcons.js'
import {
  GitIcon,
  PushIcon,
  PullIcon,
  RefreshIcon,
  SparkleIcon,
  UpdateIcon,
  UndoIcon,
  StashIcon,
  TrashIcon,
  CompareIcon,
} from './icons.js'

function basename(path: string): string {
  return path.split('/').pop() ?? path
}

/** Poll interval for detecting external repo changes (edits/commits/pushes elsewhere). */
const STATUS_POLL_MS = 2500

export interface GitPanelProps extends GlobalStandardProps {
  git: GitApi
  closeGit: () => void
  openGit: () => void
  mode: 'docked' | 'floating'
  t: TranslateNS<'git'>
}

export function GitPanel({ git, useWorkspaces, useSessions, closeGit, openGit, mode, t }: GitPanelProps) {
  const open = useSyncExternalStore(panelStore.subscribe, panelStore.isOpen)
  const detailsOpen = useSyncExternalStore(panelStore.subscribe, panelStore.isDetailsOpen)
  const isNarrow = useIsNarrow()
  const update = useSyncExternalStore(panelStore.subscribe, panelStore.getUpdateState)
  // The layout's `details` column is session-scoped: it renders nothing and is
  // forced closed while there is no non-blank current session (the New Session /
  // blank view). Track that so the root-scoped floating overlay can stand in.
  const hasDetailsSession = useSessions((state) => {
    const current = state.current
    return current !== undefined && state.byId[current]?.blank === false
  })
  // The floating overlay stands in when: the viewport is narrow, OR there is no
  // non-blank session (details column unavailable), OR the details column is
  // actually closed (its close breakpoint depends on the live sidebar width).
  // No non-blank session (New Session / blank view): never show the panel —
  // the git panel belongs to a workspace-backed conversation, not to the
  // welcome screen. With a session, docked shows when the details column is
  // open; floating stands in only when that column is closed (narrow viewport
  // or the layout auto-closed it).
  const visible = open && hasDetailsSession && (mode === 'floating'
    ? (isNarrow || !detailsOpen)
    : !isNarrow)
  const rootRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<GitStatus | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Collapsed by default: an empty list shows nothing, not a tall empty box.
  const [stagedOpen, setStagedOpen] = useState(false)
  const [unstagedOpen, setUnstagedOpen] = useState(false)
  const [view, setView] = useState<'git' | 'files'>('git')
  const [diffTarget, setDiffTarget] = useState<{ path: string; staged: boolean } | null>(null)
  const [branches, setBranches] = useState<GitBranch[]>([])
  const [branchMenuOpen, setBranchMenuOpen] = useState(false)
  const [remoteMenuOpen, setRemoteMenuOpen] = useState(false)
  const [remoteModalOpen, setRemoteModalOpen] = useState(false)
  const [editUrlTarget, setEditUrlTarget] = useState<GitRemote | null>(null)
  const [stashMenuOpen, setStashMenuOpen] = useState(false)
  const [conflictedOpen, setConflictedOpen] = useState(true)
  const [compareOpen, setCompareOpen] = useState(false)
  const [compareRef, setCompareRef] = useState('')
  const [compareResult, setCompareResult] = useState<GitBranchCompare | null>(null)
  const [compareFile, setCompareFile] = useState<{ path: string; diff: string; truncated: boolean } | null>(null)
  const [stashes, setStashes] = useState<GitStash[]>([])
  const [stashMessage, setStashMessage] = useState('')
  const [fileFilter, setFileFilter] = useState('')
  const [remoteUrl, setRemoteUrl] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'branch' | 'remote'; name: string } | null>(null)
  const branchAnchorRef = useRef<HTMLButtonElement>(null)
  const remoteAnchorRef = useRef<HTMLButtonElement>(null)

  const workspaces = useWorkspaces((state) => state)
  // The git panel is workspace-scoped: follow the CURRENT session's workspace
  // (`SessionSummary.cwd` is the session's workspace root), falling back to the
  // recent/first workspace only when no session is current (New Session view).
  const currentCwd = useSessions((state) =>
    state.current ? state.byId[state.current]?.cwd : undefined,
  )
  const cwd = useMemo(() => {
    if (currentCwd) return currentCwd
    const items = workspaces.items
    if (items.length === 0) return undefined
    const recent = items.find((item) => item.workspaceId === workspaces.recentWorkspaceId)
    return (recent ?? items[0]).path
  }, [currentCwd, workspaces])

  // The layout auto-closes the details column on session change (its own
  // useLayoutEffect); the git panel is workspace-scoped, so re-open it to keep
  // the toggle state and the column in sync (avoids the "two clicks" stuck state).
  const currentSessionId = useSessions((state) => state.current)
  useEffect(() => {
    if (mode !== 'docked') return
    const last = panelStore.getLastSessionId()
    panelStore.setLastSessionId(currentSessionId)
    if (last !== undefined && last !== currentSessionId && panelStore.isOpen()) {
      openGit()
    }
  }, [currentSessionId, mode, openGit])

  // Track the docked column's ACTUAL width so the floating panel can stand in
  // whenever the layout closes it. The layout's close breakpoint is
  // `sidebarWidth + 940px` (dynamic), so the hardcoded narrow breakpoint is not
  // enough — observing the column width is the only precise signal.
  useEffect(() => {
    if (mode !== 'docked') return
    const el = rootRef.current
    if (el === null) return
    const update = () => panelStore.setDetailsOpen(el.getBoundingClientRect().width > 1)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [mode, visible])

  const refresh = useCallback(async () => {
    if (!cwd) return
    try {
      setError(null)
      setStatus(await git.status(cwd))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [git, cwd])

  useEffect(() => {
    if (visible) void refresh()
  }, [visible, refresh])

  // Self-update: silently check for a newer version the first time the panel is
  // opened (per page load). The docked and floating panels both run this effect,
  // so the store's `checking`/`checked` flags dedupe the request.
  useEffect(() => {
    if (!visible) return
    const state = panelStore.getUpdateState()
    if (state.checked || state.checking) return
    panelStore.setUpdateState({ checking: true })
    void git
      .checkUpdate()
      .then((info) => panelStore.setUpdateState({ info, checked: true, checking: false }))
      .catch(() => panelStore.setUpdateState({ checked: true, checking: false }))
  }, [visible, git])

  // Auto-refresh: poll `git status` while visible so edits/commits/pushes made
  // OUTSIDE the panel (terminal, VSCode, …) show up. Compare the serialized
  // status so a no-op poll never re-renders; skip while an operation is running.
  useEffect(() => {
    if (!visible || !cwd) return
    let disposed = false
    let inFlight = false
    const timer = window.setInterval(() => {
      if (disposed || inFlight || busy !== null) return
      inFlight = true
      void git
        .status(cwd)
        .then((next) => {
          if (disposed) return
          setStatus((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
        })
        .catch(() => {
          // Transient poll failures are ignored; the next tick retries.
        })
        .finally(() => {
          inFlight = false
        })
    }, STATUS_POLL_MS)
    return () => {
      disposed = true
      window.clearInterval(timer)
    }
  }, [visible, cwd, busy, git])

  const run = useCallback(
    async (label: string, action: () => Promise<GitStatus>, onSuccess?: () => void) => {
      if (!cwd || busy) return
      setBusy(label)
      setError(null)
      try {
        setStatus(await action())
        onSuccess?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setBusy(null)
      }
    },
    [cwd, busy],
  )

  const loadBranches = useCallback(async () => {
    if (!cwd) return
    try {
      setBranches(await git.branches(cwd))
    } catch {
      // non-fatal: the menu just shows an empty list
    }
  }, [git, cwd])

  const handleCheckout = useCallback(
    async (name: string) => {
      if (!cwd || busy) return
      setBusy(t('checkout'))
      setError(null)
      try {
        setStatus(await git.branchCheckout(cwd, name))
        setBranches(await git.branches(cwd))
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setBusy(null)
      }
    },
    [git, cwd, busy, t],
  )

  const handleCreateBranch = useCallback(
    async (name: string) => {
      if (!cwd || busy) return
      setBusy(t('createBranch'))
      setError(null)
      try {
        setBranches(await git.branchCreate(cwd, name))
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setBusy(null)
      }
    },
    [git, cwd, busy, t],
  )

  const confirmDelete = useCallback(async () => {
    if (!cwd || deleteTarget === null) return
    const target = deleteTarget
    setDeleteTarget(null)
    setBusy(target.kind === 'branch' ? t('deleteBranch') : t('deleteRemoteRepo'))
    setError(null)
    try {
      if (target.kind === 'branch') {
        setBranches(await git.branchDelete(cwd, target.name))
      } else {
        setStatus(await git.remoteRemove(cwd, target.name))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }, [git, cwd, deleteTarget, t])

  const handleAddRemote = useCallback(async () => {
    if (!cwd || busy) return
    setBusy(t('addRemote'))
    setError(null)
    try {
      setStatus(await git.remoteAdd(cwd, 'origin', remoteUrl))
      setRemoteUrl('')
      setRemoteModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }, [git, cwd, busy, remoteUrl, t])

  const handleEditRemote = useCallback(async () => {
    if (!cwd || busy || editUrlTarget === null) return
    setBusy(t('editRemoteUrl', { name: editUrlTarget.name }))
    setError(null)
    try {
      setStatus(await git.remoteSetUrl(cwd, editUrlTarget.name, remoteUrl))
      setEditUrlTarget(null)
      setRemoteUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }, [git, cwd, busy, editUrlTarget, remoteUrl, t])

  const loadStashes = useCallback(async () => {
    if (!cwd) return
    try {
      setStashes(await git.stashList(cwd))
    } catch {
      // non-fatal
    }
  }, [git, cwd])

  const handleStashPush = useCallback(async () => {
    if (!cwd || busy) return
    setBusy(t('stashPush'))
    setError(null)
    try {
      setStatus(await git.stashPush(cwd, stashMessage.trim() || undefined))
      setStashMessage('')
      setStashMenuOpen(false)
      await loadStashes()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }, [git, cwd, busy, stashMessage, t, loadStashes])

  const handleStashApply = useCallback(async (index: number) => {
    if (!cwd || busy) return
    setBusy(t('stashApply'))
    setError(null)
    try {
      setStatus(await git.stashApply(cwd, index))
      await loadStashes()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }, [git, cwd, busy, t, loadStashes])

  const handleStashDrop = useCallback(async (index: number) => {
    if (!cwd || busy) return
    if (!window.confirm(t('stashDropConfirm'))) return
    setBusy(t('stashDrop'))
    setError(null)
    try {
      setStashes(await git.stashDrop(cwd, index))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }, [git, cwd, busy, t])

  const handleConflictResolve = useCallback(
    async (path: string, resolution: 'ours' | 'theirs') => {
      if (!cwd || busy) return
      setBusy(resolution === 'ours' ? t('conflictOurs') : t('conflictTheirs'))
      setError(null)
      try {
        setStatus(await git.conflictResolve(cwd, path, resolution))
        if (diffTarget?.path === path) setDiffTarget(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setBusy(null)
      }
    },
    [git, cwd, busy, t, diffTarget],
  )

  const handleRevert = useCallback(async (hash: string) => {
    if (!cwd || busy) return
    if (!window.confirm(t('revertCommitConfirm', { hash: hash.slice(0, 7) }))) return
    setBusy(t('revert'))
    setError(null)
    try {
      setStatus(await git.revert(cwd, hash))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }, [git, cwd, busy, t])

  const handleCompare = useCallback(async (ref: string) => {
    if (!cwd || busy) return
    setBusy(t('compare'))
    setError(null)
    try {
      setCompareResult(await git.branchCompare(cwd, ref))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }, [git, cwd, busy, t])

  const handleDiffRef = useCallback(async (ref: string, path: string) => {
    if (!cwd) return
    try {
      setCompareFile({ path, ...(await git.diffRef(cwd, ref, path)) })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [git, cwd])

  const handlePull = useCallback(async () => {
    if (!cwd || busy) return
    setBusy(t('pull'))
    setError(null)
    try {
      setStatus(await git.pull(cwd))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }, [git, cwd, busy, t])

  const handleUpdate = useCallback(async () => {
    const state = panelStore.getUpdateState()
    if (state.updating) return
    panelStore.setUpdateState({ updating: true })
    try {
      const result = await git.update()
      panelStore.setUpdateState({
        updating: false,
        updatedVersion: result.version,
        info: { installed: result.version, latest: result.version, hasUpdate: false },
      })
    } catch (err) {
      panelStore.setUpdateState({ updating: false })
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [git])

  if (!visible) return null

  const hasUpdate = update.info?.hasUpdate ?? false

  const isRepo = status?.isRepo ?? false
  const remote = status?.remote
  const stagedCount = status?.staged.length ?? 0
  const hasChanges = stagedCount > 0 || (status?.unstaged.length ?? 0) > 0
  const untrackedFiles = (status?.unstaged ?? []).filter((f) => f.worktree === '?')
  const modifiedFiles = (status?.unstaged ?? []).filter((f) => f.worktree !== '?')
  // File filter: lowercase substring match against the repo-relative path.
  const needle = fileFilter.trim().toLowerCase()
  const matchFilter = (path: string): boolean => needle === '' || path.toLowerCase().includes(needle)
  const filteredStaged = (status?.staged ?? []).filter((f) => matchFilter(f.path))
  const filteredUntracked = untrackedFiles.filter((f) => matchFilter(f.path))
  const filteredModified = modifiedFiles.filter((f) => matchFilter(f.path))
  const filteredConflicted = (status?.conflicted ?? []).filter((f) => matchFilter(f.path))
  const hasUpstream = status?.upstream !== undefined
  // Uncommitted changes always win: commit them first. Otherwise, with a remote
  // configured, offer push (tracked branch, ahead > 0) or publish (untracked
  // branch with local commits not on any remote).
  const action: 'commit' | 'push' | 'publish' | 'idle' = hasChanges
    ? 'commit'
    : remote === undefined
      ? 'idle'
      : hasUpstream
        ? (status?.ahead ?? 0) > 0 ? 'push' : 'idle'
        : (status?.unpublished ?? false) ? 'publish' : 'idle'
  const actionLabel = action === 'push' ? t('push') : action === 'publish' ? t('publishBranch') : t('commit')
  const actionDisabled =
    busy !== null ||
    (action === 'commit' && message.trim().length === 0) ||
    action === 'idle'

  const rootClass = mode === 'floating' ? 'dshgit-root-floating' : 'dshgit-root'
  const panelClass = mode === 'floating' ? 'dshgit-panel-floating' : 'dshgit-panel'

  return (
    <div className={rootClass} ref={rootRef}>
      <div className={panelClass}>
        <header className="dshgit-header">
          <div className="dshgit-title-row">
            <span className="dshgit-title">{t('title')}</span>
            {hasUpdate ? (
              <button
                type="button"
                className="dshgit-update-link"
                disabled={update.updating}
                onClick={() => void handleUpdate()}
              >
                {update.updating ? t('updating') : t('updateNow')}
              </button>
            ) : null}
            <button className="dshgit-ghost" title={t('refresh')} onClick={() => void refresh()} disabled={busy !== null}>
              <RefreshIcon size={16} />
            </button>
            <button className="dshgit-ghost" title={t('close')} onClick={closeGit}>
              <span style={{ fontSize: 14 }}>✕</span>
            </button>
          </div>
          {view === 'git' ? (
          <div className="dshgit-branch">
            {status && isRepo ? (
              <>
                <button
                  ref={branchAnchorRef}
                  type="button"
                  className="dshgit-branch-btn"
                  title={status.branch ?? 'HEAD'}
                  onClick={() => {
                    setBranchMenuOpen((value) => !value)
                    if (!branchMenuOpen) void loadBranches()
                  }}
                >
                  <GitIcon size={14} />
                  <span className="dshgit-branch-name">
                    {status.branch ?? 'HEAD'}
                    {status.upstream ? ` → ${status.upstream}` : ''}
                    {status.ahead > 0 ? ` ↑${status.ahead}` : ''}
                    {status.behind > 0 ? ` ↓${status.behind}` : ''}
                  </span>
                  <span className="dshgit-caret">▾</span>
                </button>
                {remote ? (
                  <button
                    type="button"
                    className="dshgit-pull"
                    title={t('pullAll')}
                    disabled={busy !== null}
                    onClick={() => void handlePull()}
                  >
                    <PullIcon size={14} />
                  </button>
                ) : null}
                <span className="dshgit-branch-spacer" />
                {remote ? (
                  <span className="dshgit-remote">
                    <span className="dshgit-remote-name" title={remote.url}>{remote.name}</span>
                    <button
                      type="button"
                      className="dshgit-remote-dots"
                      ref={remoteAnchorRef}
                      title={t('remoteMenu', { name: remote.name })}
                      onClick={() => setRemoteMenuOpen((value) => !value)}
                    >
                      •••
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="dshgit-remote-add"
                    onClick={() => {
                      setRemoteUrl('')
                      setRemoteModalOpen(true)
                    }}
                  >
                    {t('createRemote')}
                  </button>
                )}
              </>
            ) : (
              <>
                <GitIcon size={14} />
                <span>{!cwd ? t('noWorkspace') : !status ? t('loading') : t('notRepo')}</span>
              </>
            )}
          </div>
          ) : null}
        </header>

        <div className="dshgit-tabs">
          <button
            type="button"
            className={'dshgit-tab' + (view === 'git' ? ' dshgit-tab-active' : '')}
            onClick={() => setView('git')}
          >
            {t('gitTab')}
          </button>
          <button
            type="button"
            className={'dshgit-tab' + (view === 'files' ? ' dshgit-tab-active' : '')}
            onClick={() => setView('files')}
          >
            {t('filesTab')}
          </button>
        </div>

        {!cwd ? (
          <div className="dshgit-empty">{t('noWorkspaceOpened')}</div>
        ) : view === 'files' ? (
          <div className="dshgit-body dshgit-body-files">
            <FileBrowser git={git} cwd={cwd} t={t} />
          </div>
        ) : !status ? (
          <div className="dshgit-empty">{t('readingStatus')}</div>
        ) : !isRepo ? (
          <div className="dshgit-body">
            <div className="dshgit-empty">
              <div>{t('notRepoBody')}</div>
              <Button
                variant="primary"
                size="md"
                disabled={busy !== null}
                onClick={() => void run(t('initRepo'), () => git.init(cwd))}
              >
                {t('initRepo')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="dshgit-body">
            <div className="dshgit-toolbar">
              <button
                type="button"
                className="dshgit-tool"
                title={t('undoCommitHint')}
                disabled={busy !== null || !status?.hasCommits}
                onClick={() => {
                  if (!window.confirm(t('undoCommitConfirm'))) return
                  void run(t('undoCommit'), () => git.undoCommit(cwd))
                }}
              >
                <UndoIcon size={14} />
                <span>{t('undoCommit')}</span>
              </button>
              <button
                type="button"
                className="dshgit-tool"
                title={t('stashPushHint')}
                disabled={busy !== null || !hasChanges}
                onClick={() => {
                  setStashMenuOpen(true)
                }}
              >
                <StashIcon size={14} />
                <span>{t('stashPush')}</span>
              </button>
              <button
                type="button"
                className="dshgit-tool"
                title={t('compareHint')}
                disabled={busy !== null || !status?.hasCommits}
                onClick={() => {
                  setCompareRef('')
                  setCompareResult(null)
                  setCompareOpen(true)
                }}
              >
                <CompareIcon size={14} />
                <span>{t('compare')}</span>
              </button>
              <span className="dshgit-spacer" />
            </div>
            <div className="dshgit-search-box">
              <input
                className="dshgit-search"
                value={fileFilter}
                placeholder={t('searchChanges')}
                spellCheck={false}
                onChange={(event) => setFileFilter(event.target.value)}
              />
              {fileFilter !== '' ? (
                <button
                  type="button"
                  className="dshgit-search-clear"
                  title={t('close')}
                  onClick={() => setFileFilter('')}
                >
                  <span style={{ fontSize: 12 }}>✕</span>
                </button>
              ) : null}
            </div>
            <div className="dshgit-input-box">
              <input
                className="dshgit-input"
                value={message}
                placeholder={t('commitMessagePlaceholder')}
                onChange={(event) => setMessage(event.target.value)}
                disabled={busy !== null}
                spellCheck={false}
              />
              <button
                className="dshgit-sparkle"
                title={t('aiGenerate')}
                disabled={busy !== null || stagedCount === 0 && (status?.unstaged.length ?? 0) === 0}
                onClick={() => {
                  void (async () => {
                    setBusy(t('generating'))
                    setError(null)
                    try {
                      const { requestId } = await git.generateMessageStart(cwd)
                      let done = false
                      while (!done) {
                        const poll = await git.generateMessagePoll(requestId)
                        if (poll.error) {
                          setError(poll.error)
                          break
                        }
                        setMessage(poll.text)
                        done = poll.done
                        if (!done) await new Promise((resolve) => setTimeout(resolve, 60))
                      }
                    } catch (err) {
                      setError(err instanceof Error ? err.message : String(err))
                    } finally {
                      setBusy(null)
                    }
                  })()
                }}
              >
                <SparkleIcon size={16} />
              </button>
            </div>

            <Button
              className="dshgit-action"
              variant="primary"
              size="md"
              disabled={actionDisabled}
              icon={action === 'push' || action === 'publish' ? <PushIcon size={16} /> : undefined}
              onClick={() => {
                if (action === 'push') {
                  void (async () => {
                    setBusy(t('push'))
                    setError(null)
                    try {
                      await git.push(cwd)
                      await refresh()
                    } catch (err) {
                      setError(err instanceof Error ? err.message : String(err))
                    } finally {
                      setBusy(null)
                    }
                  })()
                } else if (action === 'publish') {
                  void (async () => {
                    setBusy(t('publishBranch'))
                    setError(null)
                    try {
                      setStatus(await git.publish(cwd))
                    } catch (err) {
                      setError(err instanceof Error ? err.message : String(err))
                    } finally {
                      setBusy(null)
                    }
                  })()
                } else {
                  void run(t('commit'), () => git.commit(cwd, message), () => setMessage(''))
                }
              }}
            >
              {busy ?? actionLabel}
            </Button>

            <div className="dshgit-lists">
            {status.conflicted.length > 0 ? (
            <div className="dshgit-group dshgit-group-conflict">
              <div className="dshgit-group-head" onClick={() => setConflictedOpen((value) => !value)}>
                <span style={{ fontSize: 10 }}>{conflictedOpen ? '▾' : '▸'}</span>
                <span className="dshgit-conflict-label">{t('conflicts')}</span>
                <span className="dshgit-count">{status.conflicted.length}</span>
                <span className="dshgit-spacer" />
              </div>
              {conflictedOpen ? (
                <div className="dshgit-group-body">
                {filteredConflicted.map((file) => (
                  <div
                    className={'dshgit-row dshgit-row-clickable dshgit-row-conflict' + (diffTarget?.path === file.path ? ' dshgit-row-active' : '')}
                    key={`conflict:${file.path}`}
                    onClick={() => setDiffTarget((prev) => (prev?.path === file.path ? null : { path: file.path, staged: false }))}
                  >
                    <span className="dshgit-conflict-badge">!</span>
                    <span className="dshgit-path" title={file.path}>{basename(file.path)}</span>
                    <button
                      className="dshgit-ghost"
                      title={t('conflictOurs')}
                      disabled={busy !== null}
                      onClick={(event) => {
                        event.stopPropagation()
                        void handleConflictResolve(file.path, 'ours')
                      }}
                    >
                      {t('conflictOurs')}
                    </button>
                    <button
                      className="dshgit-ghost"
                      title={t('conflictTheirs')}
                      disabled={busy !== null}
                      onClick={(event) => {
                        event.stopPropagation()
                        void handleConflictResolve(file.path, 'theirs')
                      }}
                    >
                      {t('conflictTheirs')}
                    </button>
                  </div>
                ))}
                </div>
              ) : null}
            </div>
            ) : null}
            <div className="dshgit-group">
              <div className="dshgit-group-head" onClick={() => setStagedOpen((value) => !value)}>
                <span style={{ fontSize: 10 }}>{stagedOpen ? '▾' : '▸'}</span>
                <span>{t('stagedChanges')}</span>
                <span className="dshgit-count">{stagedCount}</span>
                <span className="dshgit-spacer" />
                <button
                  className="dshgit-ghost"
                  title={t('unstageAll')}
                  disabled={busy !== null || stagedCount === 0}
                  onClick={(event) => {
                    event.stopPropagation()
                    void run(t('unstageAll'), () => git.unstageAll(cwd))
                  }}
                >
                  −
                </button>
              </div>
              {stagedOpen ? (
                <div className="dshgit-group-body">
                {filteredStaged.map((file) => (
                  <div
                    className={'dshgit-row dshgit-row-clickable' + (diffTarget?.path === file.path && diffTarget.staged ? ' dshgit-row-active' : '')}
                    key={`staged:${file.path}`}
                    onClick={() => setDiffTarget((prev) => (prev?.path === file.path && prev.staged ? null : { path: file.path, staged: true }))}
                  >
                    <span className="dshgit-fileicon">{fileIcon(file.path)}</span>
                    <span className="dshgit-path" title={file.path}>{basename(file.path)}</span>
                    <button
                      className="dshgit-ghost"
                      title={t('unstage')}
                      disabled={busy !== null}
                      onClick={(event) => {
                        event.stopPropagation()
                        void run(t('unstage'), () => git.unstage(cwd, file.path))
                      }}
                    >
                      −
                    </button>
                  </div>
                ))}
                </div>
              ) : null}
            </div>

            <div className="dshgit-group">
              <div className="dshgit-group-head" onClick={() => setUnstagedOpen((value) => !value)}>
                <span style={{ fontSize: 10 }}>{unstagedOpen ? '▾' : '▸'}</span>
                <span>{t('changes')}</span>
                <span className="dshgit-count">{status.unstaged.length}</span>
                <span className="dshgit-spacer" />
                <button
                  className="dshgit-ghost"
                  title={t('stageAll')}
                  disabled={busy !== null || status.unstaged.length === 0}
                  onClick={(event) => {
                    event.stopPropagation()
                    void run(t('stageAll'), () => git.stageAll(cwd))
                  }}
                >
                  +
                </button>
              </div>
              {unstagedOpen ? (
                <div className="dshgit-group-body">
                {filteredModified.map((file) => (
                  <div
                    className={'dshgit-row dshgit-row-clickable' + (diffTarget?.path === file.path && !diffTarget.staged ? ' dshgit-row-active' : '')}
                    key={`modified:${file.path}`}
                    onClick={() => setDiffTarget((prev) => (prev?.path === file.path && !prev.staged ? null : { path: file.path, staged: false }))}
                  >
                    <span className="dshgit-fileicon">{fileIcon(file.path)}</span>
                    <span className="dshgit-path" title={file.path}>{basename(file.path)}</span>
                    <button
                      className="dshgit-ghost dshgit-danger-ghost"
                      title={t('discard')}
                      disabled={busy !== null}
                      onClick={(event) => {
                        event.stopPropagation()
                        if (!window.confirm(t('discardFileConfirm', { name: basename(file.path) }))) return
                        void run(t('discard'), () => git.discard(cwd, file.path, false))
                      }}
                    >
                      <TrashIcon size={13} />
                    </button>
                    <button
                      className="dshgit-ghost"
                      title={t('stage')}
                      disabled={busy !== null}
                      onClick={(event) => {
                        event.stopPropagation()
                        void run(t('stage'), () => git.stage(cwd, file.path))
                      }}
                    >
                      +
                    </button>
                  </div>
                ))}
                {filteredUntracked.length > 0 ? (
                  <div className="dshgit-subhead">{t('untracked')} ({filteredUntracked.length})</div>
                ) : null}
                {filteredUntracked.map((file) => (
                  <div
                    className={'dshgit-row dshgit-row-clickable dshgit-row-untracked' + (diffTarget?.path === file.path && !diffTarget.staged ? ' dshgit-row-active' : '')}
                    key={`untracked:${file.path}`}
                    onClick={() => setDiffTarget((prev) => (prev?.path === file.path && !prev.staged ? null : { path: file.path, staged: false }))}
                  >
                    <span className="dshgit-fileicon">{fileIcon(file.path)}</span>
                    <span className="dshgit-path" title={file.path}>{basename(file.path)}</span>
                    <button
                      className="dshgit-ghost dshgit-danger-ghost"
                      title={t('discard')}
                      disabled={busy !== null}
                      onClick={(event) => {
                        event.stopPropagation()
                        if (!window.confirm(t('discardUntrackedConfirm', { name: basename(file.path) }))) return
                        void run(t('discard'), () => git.discard(cwd, file.path, true))
                      }}
                    >
                      <TrashIcon size={13} />
                    </button>
                    <button
                      className="dshgit-ghost"
                      title={t('stage')}
                      disabled={busy !== null}
                      onClick={(event) => {
                        event.stopPropagation()
                        void run(t('stage'), () => git.stage(cwd, file.path))
                      }}
                    >
                      +
                    </button>
                  </div>
                ))}
                </div>
              ) : null}
            </div>
            </div>
            <DiffView
              git={git}
              cwd={cwd}
              path={diffTarget?.path ?? ''}
              staged={diffTarget?.staged ?? false}
              visible={diffTarget !== null}
              onClose={() => setDiffTarget(null)}
              t={t}
            />
            <CommitGraph git={git} cwd={cwd} onError={setError} onRevert={handleRevert} t={t} />
          </div>
        )}

        {update.updatedVersion ? (
          <div className="dshgit-notice">{t('updateDone', { version: update.updatedVersion })}</div>
        ) : null}

        {error ? <div className="dshgit-error">{error}</div> : null}
      </div>

      <RemoteMenu
        name={remote?.name ?? ''}
        url={remote?.url ?? ''}
        anchor={remoteMenuOpen ? remoteAnchorRef.current : null}
        onClose={() => setRemoteMenuOpen(false)}
        onEditUrl={() => {
          if (remote) {
            setEditUrlTarget(remote)
            setRemoteUrl(remote.url)
          }
        }}
        onDelete={() => setDeleteTarget({ kind: 'remote', name: remote?.name ?? '' })}
        t={t}
      />

      <BranchMenu
        branches={branches}
        canCreate={status?.hasCommits ?? false}
        anchor={branchMenuOpen ? branchAnchorRef.current : null}
        onClose={() => setBranchMenuOpen(false)}
        onCheckout={(name) => void handleCheckout(name)}
        onDelete={(name) => setDeleteTarget({ kind: 'branch', name })}
        onCreate={(name) => void handleCreateBranch(name)}
        t={t}
      />

      <Modal
        open={remoteModalOpen}
        onClose={() => setRemoteModalOpen(false)}
        title={t('createRemote')}
        closeLabel={t('close')}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setRemoteModalOpen(false)}>{t('cancel')}</Button>
            <Button variant="primary" size="md" disabled={busy !== null || remoteUrl.trim().length === 0} onClick={() => void handleAddRemote()}>{t('add')}</Button>
          </>
        }
      >
        <input
          className="dshgit-modal-input"
          value={remoteUrl}
          placeholder={t('remoteUrlPlaceholder')}
          spellCheck={false}
          autoFocus
          onChange={(event) => setRemoteUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && remoteUrl.trim().length > 0) void handleAddRemote()
          }}
        />
      </Modal>

      <Modal
        open={editUrlTarget !== null}
        onClose={() => setEditUrlTarget(null)}
        title={editUrlTarget !== null ? t('editRemoteUrl', { name: editUrlTarget.name }) : ''}
        closeLabel={t('close')}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setEditUrlTarget(null)}>{t('cancel')}</Button>
            <Button variant="primary" size="md" disabled={busy !== null || remoteUrl.trim().length === 0} onClick={() => void handleEditRemote()}>{t('save')}</Button>
          </>
        }
      >
        <input
          className="dshgit-modal-input"
          value={remoteUrl}
          placeholder={t('remoteUrlPlaceholder')}
          spellCheck={false}
          autoFocus
          onChange={(event) => setRemoteUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && remoteUrl.trim().length > 0) void handleEditRemote()
          }}
        />
      </Modal>

      <Modal
        open={stashMenuOpen}
        onClose={() => setStashMenuOpen(false)}
        title={t('stashTitle')}
        closeLabel={t('close')}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setStashMenuOpen(false)}>{t('cancel')}</Button>
            <Button variant="primary" size="md" disabled={busy !== null || !hasChanges} onClick={() => void handleStashPush()}>{t('stashPush')}</Button>
          </>
        }
      >
        <input
          className="dshgit-modal-input"
          value={stashMessage}
          placeholder={t('stashMessagePlaceholder')}
          spellCheck={false}
          autoFocus
          onChange={(event) => setStashMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && hasChanges) void handleStashPush()
          }}
        />
        <div className="dshgit-stash-list">
          {stashes.length === 0 ? (
            <div className="dshgit-stash-empty">{t('noStashes')}</div>
          ) : (
            stashes.map((stash) => (
              <div className="dshgit-stash-row" key={stash.ref}>
                <button
                  type="button"
                  className="dshgit-stash-apply"
                  title={stash.message}
                  disabled={busy !== null}
                  onClick={() => void handleStashApply(Number(stash.ref.match(/\d+/)?.[0] ?? 0))}
                >
                  <StashIcon size={13} />
                  <span className="dshgit-stash-message">{stash.message}</span>
                </button>
                <button
                  type="button"
                  className="dshgit-ghost"
                  title={t('stashDrop')}
                  disabled={busy !== null}
                  onClick={() => void handleStashDrop(Number(stash.ref.match(/\d+/)?.[0] ?? 0))}
                >
                  <TrashIcon size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </Modal>

      <Modal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        title={t('compare')}
        closeLabel={t('close')}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setCompareOpen(false)}>{t('close')}</Button>
            <Button variant="primary" size="md" disabled={busy !== null || compareRef.trim().length === 0} onClick={() => void handleCompare(compareRef.trim())}>{t('compare')}</Button>
          </>
        }
      >
        <input
          className="dshgit-modal-input"
          value={compareRef}
          placeholder={t('compareRefPlaceholder')}
          spellCheck={false}
          onChange={(event) => setCompareRef(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && compareRef.trim().length > 0) void handleCompare(compareRef.trim())
          }}
        />
        <div className="dshgit-rmenu-divider" />
        {compareResult !== null ? (
          <div className="dshgit-compare-result">
            <div className="dshgit-compare-meta">
              <span className="dshgit-compare-ahead">↑ {compareResult.ahead}</span>
              <span className="dshgit-compare-behind">↓ {compareResult.behind}</span>
              <span className="dshgit-compare-files">{compareResult.files.length} {t('filesChanged')}</span>
            </div>
            <div className="dshgit-stash-list" style={{ maxHeight: 240 }}>
              {compareResult.files.length === 0 ? (
                <div className="dshgit-stash-empty">{t('noDiff')}</div>
              ) : (
                compareResult.files.map((file) => (
                  <div className="dshgit-stash-row" key={file.path}>
                    <button
                      type="button"
                      className="dshgit-stash-apply"
                      title={file.path}
                      onClick={() => void handleDiffRef(compareRef.trim(), file.path)}
                    >
                      <span className={`dshgit-file-status dshgit-file-status-${file.status}`}>{file.status}</span>
                      <span className="dshgit-stash-message">{file.path}</span>
                    </button>
                  </div>
                ))
              )}
            </div>
            {compareFile !== null ? (
              <>
                <div className="dshgit-rmenu-divider" />
                <div className="dshgit-diff-body" style={{ maxHeight: 200 }}>
                  <div className="dshgit-diff-pre">
                    {compareFile.diff.split('\n').map((line, i) => (
                      <div key={i} className={lineClass(line) === undefined ? undefined : lineClass(line)}>
                        <span className="dshgit-diff-line">{line || ' '}</span>
                      </div>
                    ))}
                    {compareFile.truncated ? <div className="dshgit-diff-note">{t('diffTruncated')}</div> : null}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget?.kind === 'branch' ? t('deleteBranch') : t('deleteRemoteRepo')}
        closeLabel={t('close')}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setDeleteTarget(null)}>{t('cancel')}</Button>
            <Button variant="primary" size="md" onClick={() => void confirmDelete()}>{t('delete')}</Button>
          </>
        }
      >
        <p className="dshgit-modal-text">
          {deleteTarget !== null
            ? deleteTarget.kind === 'branch'
              ? t('deleteBranchConfirm', { name: deleteTarget.name })
              : t('deleteRemoteConfirm', { name: deleteTarget.name })
            : null}
        </p>
      </Modal>
    </div>
  )
}
