// Git source-control panel, rendered into the layout's right `details` column
// (a docked column that squeezes the conversation content, like the left sidebar).
//
// It follows the CURRENT session's workspace: the panel reads the workspace path
// from the global standard hooks and passes it as `cwd` on every RPC call.
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { GlobalStandardProps, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { GitBranch, GitStatus } from '../shared/rpc.js'
import type { GitApi } from './rpc.js'
import { panelStore } from './panelStore.js'
import { useIsNarrow } from './useIsNarrow.js'
import { BranchMenu } from './BranchMenu.js'
import { CommitGraph } from './CommitGraph.js'
import { fileIcon } from './fileIcons.js'
import {
  GitIcon,
  PushIcon,
  PullIcon,
  RefreshIcon,
  SparkleIcon,
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
  const visible = open && (mode === 'floating'
    ? (isNarrow || !hasDetailsSession || !detailsOpen)
    : !isNarrow)
  const rootRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<GitStatus | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stagedOpen, setStagedOpen] = useState(true)
  const [unstagedOpen, setUnstagedOpen] = useState(true)
  const [branches, setBranches] = useState<GitBranch[]>([])
  const [branchMenuOpen, setBranchMenuOpen] = useState(false)
  const [remoteModalOpen, setRemoteModalOpen] = useState(false)
  const [remoteUrl, setRemoteUrl] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'branch' | 'remote'; name: string } | null>(null)
  const branchAnchorRef = useRef<HTMLButtonElement>(null)

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

  if (!visible) return null

  const isRepo = status?.isRepo ?? false
  const remote = status?.remote
  const stagedCount = status?.staged.length ?? 0
  const hasChanges = stagedCount > 0 || (status?.unstaged.length ?? 0) > 0
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
            <button className="dshgit-ghost" title={t('refresh')} onClick={() => void refresh()} disabled={busy !== null}>
              <RefreshIcon size={16} />
            </button>
            <button className="dshgit-ghost" title={t('close')} onClick={closeGit}>
              <span style={{ fontSize: 14 }}>✕</span>
            </button>
          </div>
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
                    <span className="dshgit-remote-name" title={remote.name}>{remote.name}</span>
                    <button
                      type="button"
                      className="dshgit-remote-dots"
                      title={t('deleteRemote', { name: remote.name })}
                      onClick={() => setDeleteTarget({ kind: 'remote', name: remote.name })}
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
        </header>

        {!cwd ? (
          <div className="dshgit-empty">{t('noWorkspaceOpened')}</div>
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
                status.staged.map((file) => (
                  <div className="dshgit-row" key={`staged:${file.path}`}>
                    <span className="dshgit-fileicon">{fileIcon(file.path)}</span>
                    <span className="dshgit-path" title={file.path}>{basename(file.path)}</span>
                    <button
                      className="dshgit-ghost"
                      title={t('unstage')}
                      disabled={busy !== null}
                      onClick={() => void run(t('unstage'), () => git.unstage(cwd, file.path))}
                    >
                      −
                    </button>
                  </div>
                ))
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
                status.unstaged.map((file) => (
                  <div className="dshgit-row" key={`unstaged:${file.path}`}>
                    <span className="dshgit-fileicon">{fileIcon(file.path)}</span>
                    <span className="dshgit-path" title={file.path}>{basename(file.path)}</span>
                    <button
                      className="dshgit-ghost"
                      title={t('stage')}
                      disabled={busy !== null}
                      onClick={() => void run(t('stage'), () => git.stage(cwd, file.path))}
                    >
                      +
                    </button>
                  </div>
                ))
              ) : null}
            </div>
            </div>
            <CommitGraph git={git} cwd={cwd} onError={setError} t={t} />
          </div>
        )}

        {error ? <div className="dshgit-error">{error}</div> : null}
      </div>

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
