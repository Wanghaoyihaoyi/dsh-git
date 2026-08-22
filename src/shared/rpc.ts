// Shared, framework-free contract between the host half (endpoint handlers) and
// the client half (typed RPC wrapper + panel). Keeping these types and the
// endpoint-name constants in one file guarantees the two halves cannot drift.

/** Channel-relative endpoint names, dispatched over the shared `/api` channel. */
export const GIT_RPC = {
  status: 'git/status',
  init: 'git/init',
  stage: 'git/stage',
  unstage: 'git/unstage',
  stageAll: 'git/stageAll',
  unstageAll: 'git/unstageAll',
  commit: 'git/commit',
  push: 'git/push',
  publish: 'git/publish',
  pull: 'git/pull',
  logPage: 'git/logPage',
  commitDetail: 'git/commitDetail',
  generateMessageStart: 'git/generateMessageStart',
  generateMessagePoll: 'git/generateMessagePoll',
  remotes: 'git/remotes',
  remoteAdd: 'git/remoteAdd',
  remoteRemove: 'git/remoteRemove',
  branches: 'git/branches',
  branchCreate: 'git/branchCreate',
  branchCheckout: 'git/branchCheckout',
  branchDelete: 'git/branchDelete',
  checkUpdate: 'git/checkUpdate',
  update: 'git/update',
  fsList: 'git/fsList',
  fsRead: 'git/fsRead',
  diff: 'git/diff',
  remoteSetUrl: 'git/remoteSetUrl',
  discard: 'git/discard',
  stashPush: 'git/stashPush',
  stashList: 'git/stashList',
  stashApply: 'git/stashApply',
  stashDrop: 'git/stashDrop',
  undoCommit: 'git/undoCommit',
  showFile: 'git/showFile',
  conflictResolve: 'git/conflictResolve',
  branchCompare: 'git/branchCompare',
  diffRef: 'git/diffRef',
} as const

export type GitEndpoint = (typeof GIT_RPC)[keyof typeof GIT_RPC]

/** One porcelain entry from `git status --porcelain=v1 --branch`. */
export interface GitFile {
  /** Repository-relative path (cwd = the requested working directory). */
  path: string
  /** Index (staged) status letter; ' ' means not staged. */
  index: string
  /** Worktree (unstaged) status letter; ' ' means clean. */
  worktree: string
}

/** One configured remote (name + fetch URL). */
export interface GitRemote {
  name: string
  url: string
}

/** One local branch. */
export interface GitBranch {
  name: string
  current: boolean
}

/** A commit entry in the history graph. */
export interface GitLogCommit {
  hash: string
  shortHash: string
  /** Full parent hashes (space-separated `%P`), used to wire the lane topology. */
  parents: string[]
  author: string
  /** Strict ISO-8601 author date (`%aI`). */
  date: string
  /** Raw `%D` decorations (e.g. "HEAD -> main", "feat", "tag: v1.0"). */
  refs: string[]
  subject: string
}

/** One page of commit-log topology (no graph — the client computes the lanes). */
export interface GitLogPage {
  commits: GitLogCommit[]
  /** True when there are more commits after this page. */
  hasMore: boolean
}

export interface GitLogPageRequest extends GitRpcRequest {
  /** 0-based offset into `git log --all --date-order`. */
  offset?: number
  /** Page size (positive; capped server-side). */
  limit?: number
}

export interface GitFileChange {
  /** `git diff-tree --name-status` letter: A/M/D/R/C/T/… */
  status: string
  path: string
}

export interface GitCommitDetail {
  hash: string
  author: string
  date: string
  message: string
  files: GitFileChange[]
}

/** Canonical status payload returned by every git/* endpoint that mutates. */
export interface GitStatus {
  isRepo: boolean
  branch?: string
  upstream?: string
  ahead: number
  behind: number
  /** False only on a fresh `git init` with no commits yet. */
  hasCommits: boolean
  /** True when the current branch (no upstream yet) has commits not on any remote. */
  unpublished: boolean
  staged: GitFile[]
  unstaged: GitFile[]
  /** Files with merge conflicts (index letter U, or both letters U). */
  conflicted: GitFile[]
  /** The default remote (name + url), when one is configured. */
  remote?: GitRemote
}

export const EMPTY_STATUS: GitStatus = {
  isRepo: false,
  ahead: 0,
  behind: 0,
  hasCommits: false,
  unpublished: false,
  staged: [],
  unstaged: [],
  conflicted: [],
}

/** Common request shape: the client always names the working directory. */
export interface GitRpcRequest {
  cwd: string
}

export interface StageRequest extends GitRpcRequest {
  path: string
}

export interface CommitRequest extends GitRpcRequest {
  message: string
}

export interface RemoteAddRequest extends GitRpcRequest {
  name: string
  url: string
}

/** Retarget an existing remote (git remote set-url) — the common case. */
export interface RemoteSetUrlRequest extends GitRpcRequest {
  name: string
  url: string
}

export interface RemoteNameRequest extends GitRpcRequest {
  name: string
}

export interface BranchNameRequest extends GitRpcRequest {
  name: string
}

export interface GenerateMessageStartResponse {
  requestId: string
}

export interface GenerateMessagePollResponse {
  /** Accumulated model text so far (empty while it is still reasoning). */
  text: string
  done: boolean
  error?: string
}

/** Result of the self-update version check (non-fatal on network failure). */
export interface GitUpdateInfo {
  /** Version installed right now (read from this plugin's own package.json). */
  installed: string
  /** Latest published version; absent when the registry check could not complete. */
  latest?: string
  /** True only when `latest` is known and newer than `installed`. */
  hasUpdate: boolean
  /** Human-readable reason when the check could not be completed (optional). */
  error?: string
}

/** Result of a successful self-update. */
export interface GitUpdateResult {
  updated: true
  /** Version now on disk (takes effect after a full restart + browser refresh). */
  version: string
}

/** One directory entry in the workspace file tree. */
export interface FsEntry {
  /** Entry name (basename). */
  name: string
  /** Repository-relative path (cwd = the requested working directory). */
  path: string
  kind: 'dir' | 'file'
  /** Size in bytes; absent for directories. */
  size?: number
  /** Modified time (ISO-8601); absent for directories. */
  mtime?: string
}

/** One page of a directory listing (`path` is relative to cwd; '' = root). */
export interface FsListResult {
  /** Directories first, then files, both name-sorted (locale-aware). */
  entries: FsEntry[]
  /** True when the entry count exceeded the server-side cap and was truncated. */
  truncated: boolean
}

/** Result of reading a file for preview. */
export interface FsReadResult {
  /** Text content; absent when the file is binary or too large. */
  content?: string
  /** True when the file looks binary (NUL byte in the first chunk). */
  binary: boolean
  /** True when the file exceeded the size cap; content stays absent. */
  tooLarge: boolean
  /** Total size in bytes (exact, even when content was capped). */
  size: number
}

export interface FsListRequest extends GitRpcRequest {
  /** Directory to list, relative to cwd; '' lists the workspace root. */
  path?: string
}

export interface FsReadRequest extends GitRpcRequest {
  /** File path, relative to cwd. */
  path: string
}

/** Diff request: one file's change, staged or unstaged. */
export interface GitDiffRequest extends GitRpcRequest {
  path: string
  /** True → diff the index against HEAD (staged); false → the worktree against the index. */
  staged: boolean
}

/** One file's unified diff (or its full content when newly added). */
export interface GitDiffResult {
  path: string
  staged: boolean
  /** Unified diff text; empty for a brand-new (untracked) file. */
  diff: string
  /** Present when the file is untracked: its full content is shown as an addition. */
  content?: string
  /** True when the diff exceeded the server-side cap and was truncated. */
  truncated: boolean
}

/** One stash entry. */
export interface GitStash {
  /** `stash@{n}` — the ref used by apply/drop. */
  ref: string
  /** Short hash of the stash commit (for display). */
  hash: string
  /** Message the stash was pushed with. */
  message: string
  /** Branch the stash was created on. */
  branch?: string
  /** ISO-8601 creation date. */
  date: string
}

/** Result of showing a file at a commit (git show <commit>:<path>). */
export interface GitShowFileResult {
  content?: string
  binary: boolean
  tooLarge: boolean
  size: number
}

/** Conflict resolution strategy for one path. */
export type ConflictResolution = 'ours' | 'theirs'

export interface ConflictResolveRequest extends GitRpcRequest {
  path: string
  resolution: ConflictResolution
}

/** Branch-vs-branch comparison summary. */
export interface GitBranchCompare {
  /** ref the comparison was made against (the base). */
  base: string
  /** Commits on HEAD not on base. */
  ahead: number
  /** Commits on base not on HEAD. */
  behind: number
  /** Name-status changes of base...HEAD. */
  files: GitFileChange[]
}

export interface BranchCompareRequest extends GitRpcRequest {
  /** Base ref (branch or tag or commit) to compare HEAD against. */
  ref: string
}

export interface DiffRefRequest extends GitRpcRequest {
  /** Base ref. */
  ref: string
  path: string
}
