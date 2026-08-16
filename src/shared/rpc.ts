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
  pull: 'git/pull',
  generateMessageStart: 'git/generateMessageStart',
  generateMessagePoll: 'git/generateMessagePoll',
  remotes: 'git/remotes',
  remoteAdd: 'git/remoteAdd',
  remoteRemove: 'git/remoteRemove',
  branches: 'git/branches',
  branchCreate: 'git/branchCreate',
  branchCheckout: 'git/branchCheckout',
  branchDelete: 'git/branchDelete',
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

/** Canonical status payload returned by every git/* endpoint that mutates. */
export interface GitStatus {
  isRepo: boolean
  branch?: string
  upstream?: string
  ahead: number
  behind: number
  /** False only on a fresh `git init` with no commits yet. */
  hasCommits: boolean
  staged: GitFile[]
  unstaged: GitFile[]
  /** The default remote (name + url), when one is configured. */
  remote?: GitRemote
}

export const EMPTY_STATUS: GitStatus = {
  isRepo: false,
  ahead: 0,
  behind: 0,
  hasCommits: false,
  staged: [],
  unstaged: [],
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
