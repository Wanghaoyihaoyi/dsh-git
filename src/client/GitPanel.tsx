// Git source-control panel, rendered into the layout's right `details` column
// (a docked column that squeezes the conversation content, like the left sidebar).
//
// It follows the CURRENT session's workspace: the panel reads the workspace path
// from the global standard hooks and passes it as `cwd` on every RPC call.
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { GlobalStandardProps } from '@deepseek-ai/dsh-client-ui-slots'
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
}

export function GitPanel({ git, useWorkspaces, useSessions, closeGit, openGit, mode }: GitPanelProps) {
  const open = useSyncExternalStore(panelStore.subscribe, panelStore.isOpen)
  const isNarrow = useIsNarrow()
  const visible = open && (mode === 'floating' ? isNarrow : !isNarrow)
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
      setBusy('切换分支')
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
    [git, cwd, busy],
  )

  const handleCreateBranch = useCallback(
    async (name: string) => {
      if (!cwd || busy) return
      setBusy('创建分支')
      setError(null)
      try {
        setBranches(await git.branchCreate(cwd, name))
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setBusy(null)
      }
    },
    [git, cwd, busy],
  )

  const confirmDelete = useCallback(async () => {
    if (!cwd || deleteTarget === null) return
    const target = deleteTarget
    setDeleteTarget(null)
    setBusy(target.kind === 'branch' ? '删除分支' : '删除远程')
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
  }, [git, cwd, deleteTarget])

  const handleAddRemote = useCallback(async () => {
    if (!cwd || busy) return
    setBusy('添加远程')
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
  }, [git, cwd, busy, remoteUrl])

  const handlePull = useCallback(async () => {
    if (!cwd || busy) return
    setBusy('拉取')
    setError(null)
    try {
      setStatus(await git.pull(cwd))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }, [git, cwd, busy])

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
  const actionLabel = action === 'push' ? '推送' : action === 'publish' ? '发布分支' : '提交'
  const actionDisabled =
    busy !== null ||
    (action === 'commit' && message.trim().length === 0) ||
    action === 'idle'

  const rootClass = mode === 'floating' ? 'dshgit-root-floating' : 'dshgit-root'
  const panelClass = mode === 'floating' ? 'dshgit-panel-floating' : 'dshgit-panel'

  return (
    <div className={rootClass}>
      <div className={panelClass}>
        <header className="dshgit-header">
          <div className="dshgit-title-row">
            <span className="dshgit-title">源代码管理</span>
            <button className="dshgit-ghost" title="刷新" onClick={() => void refresh()} disabled={busy !== null}>
              <RefreshIcon size={16} />
            </button>
            <button className="dshgit-ghost" title="关闭" onClick={closeGit}>
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
                    title="从所有远程存储库拉取所有分支最新代码"
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
                      title={`删除远程仓库 ${remote.name}`}
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
                    创建远程仓库
                  </button>
                )}
              </>
            ) : (
              <>
                <GitIcon size={14} />
                <span>{!cwd ? '暂无工作区' : !status ? '读取中…' : '非 Git 仓库'}</span>
              </>
            )}
          </div>
        </header>

        {!cwd ? (
          <div className="dshgit-empty">尚未打开工作区</div>
        ) : !status ? (
          <div className="dshgit-empty">正在读取仓库状态…</div>
        ) : !isRepo ? (
          <div className="dshgit-body">
            <div className="dshgit-empty">
              <div>当前工作区不是 Git 仓库</div>
              <Button
                variant="primary"
                size="md"
                disabled={busy !== null}
                onClick={() => void run('初始化仓库', () => git.init(cwd))}
              >
                初始化 Git 仓库
              </Button>
            </div>
          </div>
        ) : (
          <div className="dshgit-body">
            <div className="dshgit-input-box">
              <input
                className="dshgit-input"
                value={message}
                placeholder="提交信息"
                onChange={(event) => setMessage(event.target.value)}
                disabled={busy !== null}
                spellCheck={false}
              />
              <button
                className="dshgit-sparkle"
                title="AI 生成提交信息"
                disabled={busy !== null || stagedCount === 0 && (status?.unstaged.length ?? 0) === 0}
                onClick={() => {
                  void (async () => {
                    setBusy('生成提交信息')
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
                    setBusy('推送')
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
                    setBusy('发布分支')
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
                  void run('提交', () => git.commit(cwd, message), () => setMessage(''))
                }
              }}
            >
              {busy ?? actionLabel}
            </Button>

            <div className="dshgit-lists">
            <div className="dshgit-group">
              <div className="dshgit-group-head" onClick={() => setStagedOpen((value) => !value)}>
                <span style={{ fontSize: 10 }}>{stagedOpen ? '▾' : '▸'}</span>
                <span>暂存的更改</span>
                <span className="dshgit-count">{stagedCount}</span>
                <span className="dshgit-spacer" />
                <button
                  className="dshgit-ghost"
                  title="全部取消暂存"
                  disabled={busy !== null || stagedCount === 0}
                  onClick={(event) => {
                    event.stopPropagation()
                    void run('全部取消暂存', () => git.unstageAll(cwd))
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
                      title="取消暂存"
                      disabled={busy !== null}
                      onClick={() => void run('取消暂存', () => git.unstage(cwd, file.path))}
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
                <span>更改</span>
                <span className="dshgit-count">{status.unstaged.length}</span>
                <span className="dshgit-spacer" />
                <button
                  className="dshgit-ghost"
                  title="全部暂存"
                  disabled={busy !== null || status.unstaged.length === 0}
                  onClick={(event) => {
                    event.stopPropagation()
                    void run('全部暂存', () => git.stageAll(cwd))
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
                      title="暂存"
                      disabled={busy !== null}
                      onClick={() => void run('暂存', () => git.stage(cwd, file.path))}
                    >
                      +
                    </button>
                  </div>
                ))
              ) : null}
            </div>
            </div>
            <CommitGraph git={git} cwd={cwd} onError={setError} />
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
      />

      <Modal
        open={remoteModalOpen}
        onClose={() => setRemoteModalOpen(false)}
        title="创建远程仓库"
        closeLabel="关闭"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setRemoteModalOpen(false)}>取消</Button>
            <Button variant="primary" size="md" disabled={busy !== null || remoteUrl.trim().length === 0} onClick={() => void handleAddRemote()}>添加</Button>
          </>
        }
      >
        <input
          className="dshgit-modal-input"
          value={remoteUrl}
          placeholder="远程仓库 URL，例如 https://github.com/user/repo.git"
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
        title={deleteTarget?.kind === 'branch' ? '删除分支' : '删除远程仓库'}
        closeLabel="关闭"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="primary" size="md" onClick={() => void confirmDelete()}>删除</Button>
          </>
        }
      >
        <p className="dshgit-modal-text">
          确定要删除{deleteTarget?.kind === 'branch' ? '分支' : '远程仓库'}「{deleteTarget?.name}」吗？此操作不可撤销。
        </p>
      </Modal>
    </div>
  )
}
