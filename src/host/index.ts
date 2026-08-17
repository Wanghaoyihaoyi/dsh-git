// @mojiexuan/dsh-git — host half.
//
// Registers a namespaced `git/*` RPC surface on the shared `/api` channel via
// `ctx.connection.rpc.intercept`, locked to loopback (the browser UI at
// 127.0.0.1). Every mutation (init/commit/push) goes through the same handlers
// as reads, so the client and the model share one authority for git state.
import { randomUUID } from 'node:crypto'
import z from '@deepseek-ai/schemastery'
import type { Context } from '@deepseek-ai/cordis'
import type { HostConnectionHandle } from '@deepseek-ai/dsh-client-connection'
import type { RpcResult } from '@deepseek-ai/dsh-host-apiproxy/api'
import {
  GIT_RPC,
  EMPTY_STATUS,
  type GitBranch,
  type GitCommitDetail,
  type GitEndpoint,
  type GitFileChange,
  type GitLogCommit,
  type GitLogPage,
  type GitRemote,
  type GitStatus,
} from '../shared/rpc.js'
import { assertSafe, git, gitOrThrow, SAFE_BRANCH, SAFE_HASH, SAFE_REMOTE, SAFE_URL, stdoutText } from './git.js'
import { generateCommitMessage } from './commit-message.js'
import { checkUpdateCached, updatePlugin } from './update.js'

export const name = 'dsh-git'
export const inject = ['shell', 'llm', 'connection', 'agentDefaultModel']

export const Config = z.object({
  /** Hard cap on the diff text handed to the model before a commit-message ask. */
  maxDiffChars: z.number().default(4000),
  /** Max commit rows to load for the history graph (virtual-scrolled client-side). */
  maxLogEntries: z.number().default(2000),
  /** Optional pin; when omitted the deployment's default model is used. */
  provider: z.string(),
  model: z.string(),
  /** 'off' (default) disables DeepSeek thinking; 'high'/'max'/'default' passthrough. */
  reasoningEffort: z.string(),
  /** Optional npm registry base URL for update checks (default https://registry.npmjs.org). */
  registryUrl: z.string(),
})

interface ResolvedConfig {
  maxDiffChars?: number
  maxLogEntries?: number
  provider?: string
  model?: string
  reasoningEffort?: string
  registryUrl?: string
}

export function apply(ctx: Context, config: ResolvedConfig = {}) {
  const rpc: HostConnectionHandle['rpc'] = ctx.connection.rpc

  rpc.intercept(
    '/api',
    (endpoint) => endpoint.startsWith('git/'),
    (endpoint, payload, signal) => handle(ctx, endpoint, payload, signal, config),
    { authority: 'loopback' },
  )
}

/** Wrap dispatch into the RPC result envelope; business errors stay `internal`. */
async function handle(
  ctx: Context,
  endpoint: string,
  payload: unknown,
  signal: AbortSignal,
  config: ResolvedConfig,
): Promise<RpcResult<unknown>> {
  try {
    const value = await dispatch(ctx, endpoint, payload, signal, config)
    return { ok: true, value }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'internal',
        message: error instanceof Error ? error.message : String(error),
        details: {},
      },
    }
  }
}

function readCwd(payload: unknown): string {
  const cwd = (payload as { cwd?: unknown } | null | undefined)?.cwd
  if (typeof cwd !== 'string' || cwd.trim().length === 0) {
    throw new Error('cwd is required')
  }
  return cwd
}

async function dispatch(
  ctx: Context,
  endpoint: string,
  payload: unknown,
  signal: AbortSignal,
  config: ResolvedConfig,
): Promise<unknown> {
  // generateMessagePoll carries only a requestId, not a cwd.
  if (endpoint === GIT_RPC.generateMessagePoll) {
    return gitGeneratePoll(payload)
  }
  // Self-update endpoints are plugin-scoped, not workspace-scoped: no cwd.
  if (endpoint === GIT_RPC.checkUpdate) {
    return checkUpdateCached(config.registryUrl)
  }
  if (endpoint === GIT_RPC.update) {
    return updatePlugin(ctx.shell, signal, config.registryUrl)
  }
  const cwd = readCwd(payload)
  switch (endpoint as GitEndpoint) {
    case GIT_RPC.status:
      return gitStatus(ctx, cwd, signal)
    case GIT_RPC.init:
      return gitInit(ctx, cwd, signal)
    case GIT_RPC.stage: {
      const path = readPath(payload)
      return gitStage(ctx, cwd, path, signal)
    }
    case GIT_RPC.unstage: {
      const path = readPath(payload)
      return gitUnstage(ctx, cwd, path, signal)
    }
    case GIT_RPC.stageAll:
      return gitStageAll(ctx, cwd, signal)
    case GIT_RPC.unstageAll:
      return gitUnstageAll(ctx, cwd, signal)
    case GIT_RPC.commit: {
      const message = readMessage(payload)
      return gitCommit(ctx, cwd, message, signal)
    }
    case GIT_RPC.push:
      return gitPush(ctx, cwd, signal)
    case GIT_RPC.publish:
      return gitPublish(ctx, cwd, signal)
    case GIT_RPC.pull:
      return gitPull(ctx, cwd, signal)
    case GIT_RPC.logPage: {
      const offset = readOffset(payload)
      const limit = readLimit(payload)
      return gitLogPage(ctx, cwd, signal, offset, limit, config)
    }
    case GIT_RPC.commitDetail: {
      const hash = readHash(payload)
      return gitCommitDetail(ctx, cwd, hash, signal)
    }
    case GIT_RPC.remotes:
      return gitRemotes(ctx, cwd, signal)
    case GIT_RPC.remoteAdd: {
      const name = readName(payload)
      const url = readUrl(payload)
      return gitRemoteAdd(ctx, cwd, name, url, signal)
    }
    case GIT_RPC.remoteRemove: {
      const name = readName(payload)
      return gitRemoteRemove(ctx, cwd, name, signal)
    }
    case GIT_RPC.branches:
      return gitBranches(ctx, cwd, signal)
    case GIT_RPC.branchCreate: {
      const name = readName(payload)
      return gitBranchCreate(ctx, cwd, name, signal)
    }
    case GIT_RPC.branchCheckout: {
      const name = readName(payload)
      return gitBranchCheckout(ctx, cwd, name, signal)
    }
    case GIT_RPC.branchDelete: {
      const name = readName(payload)
      return gitBranchDelete(ctx, cwd, name, signal)
    }
    case GIT_RPC.generateMessageStart:
      return gitGenerateStart(ctx, cwd, config)
    default:
      throw new Error(`unknown git endpoint: ${endpoint}`)
  }
}

function readPath(payload: unknown): string {
  const path = (payload as { path?: unknown } | null | undefined)?.path
  if (typeof path !== 'string' || path.trim().length === 0) {
    throw new Error('path is required')
  }
  return path
}

/** In-flight commit-message generations keyed by request id (streamed via poll). */
const pendingGenerations = new Map<string, { text: string; done: boolean; error?: string }>()

/** Launch a streaming generation in the background and return its poll handle. */
function gitGenerateStart(ctx: Context, cwd: string, config: ResolvedConfig): { requestId: string } {
  const requestId = randomUUID()
  pendingGenerations.set(requestId, { text: '', done: false })
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120_000)

  void (async () => {
    try {
      const finalText = await generateCommitMessage(
        ctx,
        {
          cwd,
          signal: controller.signal,
          maxDiffChars: config.maxDiffChars ?? 4000,
          provider: config.provider,
          model: config.model,
          reasoningEffort: config.reasoningEffort,
        },
        (delta) => {
          const entry = pendingGenerations.get(requestId)
          if (entry) entry.text += delta
        },
      )
      const entry = pendingGenerations.get(requestId)
      if (entry) {
        entry.text = finalText
        entry.done = true
      }
    } catch (error) {
      const entry = pendingGenerations.get(requestId)
      if (entry) {
        entry.done = true
        entry.error = error instanceof Error ? error.message : String(error)
      }
    } finally {
      clearTimeout(timeout)
      setTimeout(() => pendingGenerations.delete(requestId), 60_000)
    }
  })()

  return { requestId }
}

function gitGeneratePoll(payload: unknown): { text: string; done: boolean; error?: string } {
  const requestId = (payload as { requestId?: unknown } | null | undefined)?.requestId
  if (typeof requestId !== 'string' || requestId.length === 0) {
    throw new Error('requestId is required')
  }
  const entry = pendingGenerations.get(requestId)
  if (entry === undefined) {
    return { text: '', done: true, error: 'generation request not found' }
  }
  return { text: entry.text, done: entry.done, ...(entry.error !== undefined ? { error: entry.error } : {}) }
}

function readMessage(payload: unknown): string {
  const message = (payload as { message?: unknown } | null | undefined)?.message
  if (typeof message !== 'string' || message.trim().length === 0) {
    throw new Error('message is required')
  }
  return message
}

function readName(payload: unknown): string {
  const name = (payload as { name?: unknown } | null | undefined)?.name
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('name is required')
  }
  return name
}

function readUrl(payload: unknown): string {
  const url = (payload as { url?: unknown } | null | undefined)?.url
  if (typeof url !== 'string' || url.trim().length === 0) {
    throw new Error('url is required')
  }
  return url
}

function readHash(payload: unknown): string {
  const hash = (payload as { hash?: unknown } | null | undefined)?.hash
  if (typeof hash !== 'string' || hash.trim().length === 0) {
    throw new Error('hash is required')
  }
  return hash
}

async function gitStatus(ctx: Context, cwd: string, signal: AbortSignal): Promise<GitStatus> {
  // `--untracked-files=all` expands untracked directories into individual files,
  // so the file lists show files, not `dir/` directory rows.
  const result = await git(ctx.shell, ['status', '--porcelain=v1', '--branch', '--untracked-files=all'], { cwd, signal })
  if (result.exitCode !== 0) return { ...EMPTY_STATUS }
  const status = parseStatus(stdoutText(result))
  const remotes = await gitRemotes(ctx, cwd, signal)
  if (remotes.length > 0) status.remote = remotes[0]
  // A branch with no upstream has no ahead/behind counters; detect "local
  // commits not on any remote" directly so the client can offer "发布分支".
  if (status.isRepo && status.hasCommits && status.upstream === undefined && status.remote !== undefined) {
    status.unpublished = await hasUnpushedCommits(ctx, cwd, signal)
  }
  return status
}

async function gitInit(ctx: Context, cwd: string, signal: AbortSignal): Promise<GitStatus> {
  await gitOrThrow(ctx.shell, ['init', '-b', 'main'], { cwd, signal })
  return gitStatus(ctx, cwd, signal)
}

async function gitStage(ctx: Context, cwd: string, path: string, signal: AbortSignal): Promise<GitStatus> {
  await gitOrThrow(ctx.shell, ['add', '--pathspec-from-file=-', '--pathspec-file-nul', '--'], {
    cwd,
    signal,
    stdin: `${path}\0`,
  })
  return gitStatus(ctx, cwd, signal)
}

async function gitUnstage(ctx: Context, cwd: string, path: string, signal: AbortSignal): Promise<GitStatus> {
  // `git restore --staged` resolves the index against HEAD, which does not exist
  // on a freshly-initialized repo (no commits). In that case drop the index entry
  // with `git rm --cached` instead — the worktree file stays put (back to
  // untracked), which is exactly what "unstage" means there.
  if (await hasHead(ctx, cwd, signal)) {
    await gitOrThrow(ctx.shell, ['restore', '--staged', '--pathspec-from-file=-', '--pathspec-file-nul', '--'], {
      cwd,
      signal,
      stdin: `${path}\0`,
    })
  } else {
    // No commits yet → drop the index entry. `-f` overrides git's safety check
    // for the "staged then modified again" case; `--cached` still leaves the
    // worktree file untouched, so nothing in the working tree is lost.
    await gitOrThrow(ctx.shell, ['rm', '--cached', '-f', '--pathspec-from-file=-', '--pathspec-file-nul', '--'], {
      cwd,
      signal,
      stdin: `${path}\0`,
    })
  }
  return gitStatus(ctx, cwd, signal)
}

async function gitUnstageAll(ctx: Context, cwd: string, signal: AbortSignal): Promise<GitStatus> {
  if (await hasHead(ctx, cwd, signal)) {
    await gitOrThrow(ctx.shell, ['reset', '--', '.'], { cwd, signal })
  } else {
    await gitOrThrow(ctx.shell, ['rm', '-r', '--cached', '-f', '--', '.'], { cwd, signal })
  }
  return gitStatus(ctx, cwd, signal)
}

/** True when HEAD resolves, i.e. the repo has at least one commit. */
async function hasHead(ctx: Context, cwd: string, signal: AbortSignal): Promise<boolean> {
  const result = await git(ctx.shell, ['rev-parse', '--verify', 'HEAD'], { cwd, signal })
  return result.exitCode === 0
}

async function gitStageAll(ctx: Context, cwd: string, signal: AbortSignal): Promise<GitStatus> {
  await gitOrThrow(ctx.shell, ['add', '-A'], { cwd, signal })
  return gitStatus(ctx, cwd, signal)
}

async function gitCommit(ctx: Context, cwd: string, message: string, signal: AbortSignal): Promise<GitStatus> {
  // If nothing is staged, stage every working change first so "commit" commits
  // the changes (the sidebar's commit button is enabled whenever changes exist).
  const stagedProbe = await git(ctx.shell, ['diff', '--cached', '--name-only'], { cwd, signal })
  const hasStaged = stagedProbe.exitCode === 0 && stdoutText(stagedProbe).trim().length > 0
  if (!hasStaged) {
    await gitOrThrow(ctx.shell, ['add', '-A'], { cwd, signal })
  }
  // `-F -` reads the message from stdin, so any quoting is impossible.
  await gitOrThrow(ctx.shell, ['commit', '-F', '-'], { cwd, signal, stdin: message })
  return gitStatus(ctx, cwd, signal)
}

async function gitPush(ctx: Context, cwd: string, signal: AbortSignal): Promise<{ pushed: true }> {
  await gitOrThrow(ctx.shell, ['push'], { cwd, signal, fullAccess: true })
  return { pushed: true }
}

async function gitPublish(ctx: Context, cwd: string, signal: AbortSignal): Promise<GitStatus> {
  const remotes = await gitRemotes(ctx, cwd, signal)
  if (remotes.length === 0) throw new Error('no remote configured; cannot publish branch')
  const remote = assertSafe(remotes[0].name, SAFE_REMOTE, 'remote name')
  // `push -u <remote> HEAD` publishes the current branch under its own name and
  // records it as upstream; `HEAD` avoids ever interpolating a branch name.
  await gitOrThrow(ctx.shell, ['push', '-u', remote, 'HEAD'], { cwd, signal, fullAccess: true })
  return gitStatus(ctx, cwd, signal)
}

/** True when HEAD has commits not reachable from any remote-tracking ref. */
async function hasUnpushedCommits(ctx: Context, cwd: string, signal: AbortSignal): Promise<boolean> {
  const result = await git(ctx.shell, ['rev-list', '--count', 'HEAD', '--not', '--remotes'], { cwd, signal })
  if (result.exitCode !== 0) return false
  const count = Number(stdoutText(result).trim())
  return Number.isFinite(count) && count > 0
}

async function gitPull(ctx: Context, cwd: string, signal: AbortSignal): Promise<GitStatus> {
  // `fetch --all` updates every remote-tracking branch from every configured
  // remote without touching the worktree or current branch; `--prune` drops
  // tracking refs that no longer exist upstream.
  await gitOrThrow(ctx.shell, ['fetch', '--all', '--prune'], { cwd, signal, fullAccess: true })
  return gitStatus(ctx, cwd, signal)
}

const LOG_PAGE_FORMAT = '%H%x1f%P%x1f%an%x1f%aI%x1f%D%x1f%s'

/**
 * Paged commit topology for the history graph. The client owns lane drawing, so
 * we return raw parent links (no `--graph`): `--skip` then pages cleanly without
 * tearing the graph apart at page boundaries.
 */
async function gitLogPage(
  ctx: Context,
  cwd: string,
  signal: AbortSignal,
  offset: number,
  limit: number,
  config: ResolvedConfig,
): Promise<GitLogPage> {
  const cap = Math.max(1, Math.min(config.maxLogEntries ?? 2000, 2000))
  const pageSize = Math.max(1, Math.min(limit, cap))
  const result = await git(ctx.shell, [
    'log',
    '--all',
    '--date-order',
    '--max-count',
    String(pageSize + 1),
    '--skip',
    String(offset),
    `--format=${LOG_PAGE_FORMAT}`,
  ], { cwd, signal })
  if (result.exitCode !== 0) return { commits: [], hasMore: false }
  const commits = parseLogPage(stdoutText(result))
  const hasMore = commits.length > pageSize
  if (hasMore) commits.pop()
  return { commits, hasMore }
}

function readOffset(payload: unknown): number {
  const offset = (payload as { offset?: unknown } | null | undefined)?.offset
  if (offset === undefined) return 0
  if (typeof offset !== 'number' || !Number.isSafeInteger(offset) || offset < 0) {
    throw new Error('offset must be a non-negative integer')
  }
  return offset
}

function readLimit(payload: unknown): number {
  const limit = (payload as { limit?: unknown } | null | undefined)?.limit
  if (limit === undefined) return 500
  if (typeof limit !== 'number' || !Number.isSafeInteger(limit) || limit <= 0) {
    throw new Error('limit must be a positive integer')
  }
  return limit
}

/** Split `git log --format=…` output into commit records (full parent hashes). */
function parseLogPage(output: string): GitLogCommit[] {
  const commits: GitLogCommit[] = []
  for (const rawLine of output.split('\n')) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine
    if (line.length === 0) continue
    const fields = line.split('\x1f')
    const hash = fields[0] ?? ''
    if (hash === '') continue
    commits.push({
      hash,
      shortHash: hash.slice(0, 7),
      parents: (fields[1] ?? '').split(' ').filter(Boolean),
      author: fields[2] ?? '',
      date: fields[3] ?? '',
      refs: (fields[4] ?? '').split(',').map((s) => s.trim()).filter(Boolean),
      subject: fields[5] ?? '',
    })
  }
  return commits
}

async function gitCommitDetail(ctx: Context, cwd: string, hash: string, signal: AbortSignal): Promise<GitCommitDetail> {
  const safeHash = assertSafe(hash, SAFE_HASH, 'commit hash')
  const show = await gitOrThrow(ctx.shell, ['show', '-s', '--format=%H%x1f%an%x1f%aI%x1f%B', safeHash], { cwd, signal })
  const text = stdoutText(show)
  const parts = text.split('\x1f')
  const files: GitFileChange[] = []
  const diff = await git(ctx.shell, ['diff-tree', '--no-commit-id', '--name-status', '-r', '--root', safeHash], { cwd, signal })
  if (diff.exitCode === 0) {
    for (const line of stdoutText(diff).split('\n')) {
      const match = /^([A-Z])\t(.+)$/.exec(line.trimEnd())
      if (match) files.push({ status: match[1], path: match[2] })
    }
  }
  return {
    hash: parts[0] ?? safeHash,
    author: parts[1] ?? '',
    date: parts[2] ?? '',
    message: parts.slice(3).join('\x1f').replace(/\n+$/, ''),
    files,
  }
}

async function gitRemotes(ctx: Context, cwd: string, signal: AbortSignal): Promise<GitRemote[]> {
  const result = await git(ctx.shell, ['remote', '-v'], { cwd, signal })
  if (result.exitCode !== 0) return []
  const map = new Map<string, string>()
  for (const line of stdoutText(result).split('\n')) {
    const match = /^(\S+)\s+(\S+)\s+\(fetch\)$/.exec(line.trim())
    if (match) map.set(match[1], match[2])
  }
  return [...map.entries()].map(([name, url]) => ({ name, url }))
}

async function gitRemoteAdd(ctx: Context, cwd: string, name: string, url: string, signal: AbortSignal): Promise<GitStatus> {
  await gitOrThrow(
    ctx.shell,
    ['remote', 'add', assertSafe(name, SAFE_REMOTE, 'remote name'), assertSafe(url, SAFE_URL, 'remote url')],
    { cwd, signal },
  )
  return gitStatus(ctx, cwd, signal)
}

async function gitRemoteRemove(ctx: Context, cwd: string, name: string, signal: AbortSignal): Promise<GitStatus> {
  await gitOrThrow(ctx.shell, ['remote', 'remove', assertSafe(name, SAFE_REMOTE, 'remote name')], { cwd, signal })
  return gitStatus(ctx, cwd, signal)
}

async function gitBranches(ctx: Context, cwd: string, signal: AbortSignal): Promise<GitBranch[]> {
  const result = await git(ctx.shell, ['branch', '--list'], { cwd, signal })
  const branches: GitBranch[] = []
  if (result.exitCode === 0) {
    for (const line of stdoutText(result).split('\n')) {
      const trimmed = line.trim()
      if (trimmed.length === 0) continue
      if (trimmed.startsWith('* ')) {
        branches.push({ name: trimmed.slice(2).trim(), current: true })
      } else {
        branches.push({ name: trimmed, current: false })
      }
    }
  }
  // Fresh `git init -b main` leaves HEAD unborn: `git branch` lists nothing, but
  // the current branch name lives in the status header. Surface it so the menu
  // never reads empty.
  if (branches.length === 0) {
    const statusResult = await git(ctx.shell, ['status', '--porcelain=v1', '--branch'], { cwd, signal })
    if (statusResult.exitCode === 0) {
      const current = parseStatus(stdoutText(statusResult)).branch
      if (current !== undefined) branches.push({ name: current, current: true })
    }
  }
  return branches
}

async function gitBranchCreate(ctx: Context, cwd: string, name: string, signal: AbortSignal): Promise<GitBranch[]> {
  const safeName = assertSafe(name, SAFE_BRANCH, 'branch name')
  // A branch is a pointer to a commit; on a fresh repo (unborn HEAD) there is
  // nothing to point at, and `git branch` fails with the cryptic
  // "not a valid object name: 'main'". Fail with an actionable message instead.
  if (!(await hasHead(ctx, cwd, signal))) {
    throw new Error('no commits yet; commit once before creating a branch')
  }
  await gitOrThrow(ctx.shell, ['branch', safeName], { cwd, signal })
  return gitBranches(ctx, cwd, signal)
}

async function gitBranchCheckout(ctx: Context, cwd: string, name: string, signal: AbortSignal): Promise<GitStatus> {
  await gitOrThrow(ctx.shell, ['checkout', assertSafe(name, SAFE_BRANCH, 'branch name')], { cwd, signal })
  return gitStatus(ctx, cwd, signal)
}

async function gitBranchDelete(ctx: Context, cwd: string, name: string, signal: AbortSignal): Promise<GitBranch[]> {
  await gitOrThrow(ctx.shell, ['branch', '-d', assertSafe(name, SAFE_BRANCH, 'branch name')], { cwd, signal })
  return gitBranches(ctx, cwd, signal)
}

/**
 * Parse `git status --porcelain=v1 --branch` into the canonical {@link GitStatus}.
 * `XY path` → X is the index (staged) status, Y the worktree (unstaged) status.
 */
function parseStatus(output: string): GitStatus {
  const lines = output.split('\n')
  let branch: string | undefined
  let upstream: string | undefined
  let ahead = 0
  let behind = 0
  let hasCommits = true
  const staged: GitStatus['staged'] = []
  const unstaged: GitStatus['unstaged'] = []

  for (const line of lines) {
    if (line.startsWith('## ')) {
      const header = line.slice(3)
      if (header.startsWith('No commits yet on ')) {
        branch = header.slice('No commits yet on '.length)
        hasCommits = false
        continue
      }
      const match = /^(\S+?)(?:\.\.\.(\S+?))?(?:\s+\[(.*)\])?$/.exec(header)
      if (match) {
        branch = match[1] === 'HEAD' ? undefined : match[1]
        upstream = match[2]
        const tracking = match[3]
        if (tracking) {
          const aheadMatch = /ahead (\d+)/.exec(tracking)
          const behindMatch = /behind (\d+)/.exec(tracking)
          if (aheadMatch) ahead = Number(aheadMatch[1])
          if (behindMatch) behind = Number(behindMatch[1])
        }
      }
      continue
    }
    if (line.length < 3) continue
    const x = line[0]
    const y = line[1]
    let path = line.slice(3)
    // Rename/copy entries render as `R  old -> new`; keep the destination path.
    const arrow = path.indexOf(' -> ')
    if (arrow >= 0 && (x === 'R' || y === 'R' || x === 'C' || y === 'C')) {
      path = path.slice(arrow + 4)
    }
    // Index (staged) column: ' ' clean, '?' untracked (never staged); anything
    // else (M/A/D/R/C/…) is a staged change.
    if (x !== ' ' && x !== '?') staged.push({ path, index: x, worktree: y })
    // Worktree column: ' ' clean; every other letter counts — including '?'
    // (untracked), which is exactly the "new file, stage me" case.
    if (y !== ' ') unstaged.push({ path, index: x, worktree: y })
  }

  return { isRepo: true, branch, upstream, ahead, behind, hasCommits, unpublished: false, staged, unstaged }
}
