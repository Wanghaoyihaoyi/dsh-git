// Client-side typed wrapper over `ctx.connection.rpc.call`.
//
// The host half registers `git/*` endpoints; this file pins the exact payloads
// and result types so the panel never hand-builds a wire call.
import type { RpcResult } from '@deepseek-ai/dsh-host-apiproxy/api'
import {
  GIT_RPC,
  type FsListResult,
  type FsReadResult,
  type GitDiffResult,
  type GitBranch,
  type GitCommitDetail,
  type GitLogPage,
  type GitRemote,
  type GitStatus,
  type GenerateMessageStartResponse,
  type GenerateMessagePollResponse,
  type GitUpdateInfo,
  type GitUpdateResult,
} from '../shared/rpc.js'

export interface GitApi {
  status(cwd: string, signal?: AbortSignal): Promise<GitStatus>
  init(cwd: string, signal?: AbortSignal): Promise<GitStatus>
  stage(cwd: string, path: string, signal?: AbortSignal): Promise<GitStatus>
  unstage(cwd: string, path: string, signal?: AbortSignal): Promise<GitStatus>
  stageAll(cwd: string, signal?: AbortSignal): Promise<GitStatus>
  unstageAll(cwd: string, signal?: AbortSignal): Promise<GitStatus>
  commit(cwd: string, message: string, signal?: AbortSignal): Promise<GitStatus>
  push(cwd: string, signal?: AbortSignal): Promise<{ pushed: true }>
  publish(cwd: string, signal?: AbortSignal): Promise<GitStatus>
  pull(cwd: string, signal?: AbortSignal): Promise<GitStatus>
  logPage(cwd: string, offset: number, limit: number, signal?: AbortSignal): Promise<GitLogPage>
  commitDetail(cwd: string, hash: string, signal?: AbortSignal): Promise<GitCommitDetail>
  generateMessageStart(cwd: string, signal?: AbortSignal): Promise<GenerateMessageStartResponse>
  generateMessagePoll(requestId: string, signal?: AbortSignal): Promise<GenerateMessagePollResponse>
  remotes(cwd: string, signal?: AbortSignal): Promise<GitRemote[]>
  remoteAdd(cwd: string, name: string, url: string, signal?: AbortSignal): Promise<GitStatus>
  remoteRemove(cwd: string, name: string, signal?: AbortSignal): Promise<GitStatus>
  branches(cwd: string, signal?: AbortSignal): Promise<GitBranch[]>
  branchCreate(cwd: string, name: string, signal?: AbortSignal): Promise<GitBranch[]>
  branchCheckout(cwd: string, name: string, signal?: AbortSignal): Promise<GitStatus>
  branchDelete(cwd: string, name: string, signal?: AbortSignal): Promise<GitBranch[]>
  checkUpdate(signal?: AbortSignal): Promise<GitUpdateInfo>
  update(signal?: AbortSignal): Promise<GitUpdateResult>
  fsList(cwd: string, path?: string, signal?: AbortSignal): Promise<FsListResult>
  fsRead(cwd: string, path: string, signal?: AbortSignal): Promise<FsReadResult>
  diff(cwd: string, path: string, staged: boolean, signal?: AbortSignal): Promise<GitDiffResult>
}

type Caller = (
  endpoint: string,
  payload?: unknown,
  signal?: AbortSignal,
) => Promise<RpcResult<unknown>>

async function unwrap<T>(call: Caller, endpoint: string, payload?: unknown, signal?: AbortSignal): Promise<T> {
  const result = await call(endpoint, payload, signal)
  if (!result.ok) throw new Error(result.error.message)
  return result.value as T
}

export function createGitApi(call: Caller): GitApi {
  return {
    status: (cwd, signal) => unwrap(call, GIT_RPC.status, { cwd }, signal),
    init: (cwd, signal) => unwrap(call, GIT_RPC.init, { cwd }, signal),
    stage: (cwd, path, signal) => unwrap(call, GIT_RPC.stage, { cwd, path }, signal),
    unstage: (cwd, path, signal) => unwrap(call, GIT_RPC.unstage, { cwd, path }, signal),
    stageAll: (cwd, signal) => unwrap(call, GIT_RPC.stageAll, { cwd }, signal),
    unstageAll: (cwd, signal) => unwrap(call, GIT_RPC.unstageAll, { cwd }, signal),
    commit: (cwd, message, signal) => unwrap(call, GIT_RPC.commit, { cwd, message }, signal),
    push: (cwd, signal) => unwrap(call, GIT_RPC.push, { cwd }, signal),
    publish: (cwd, signal) => unwrap(call, GIT_RPC.publish, { cwd }, signal),
    pull: (cwd, signal) => unwrap(call, GIT_RPC.pull, { cwd }, signal),
    logPage: (cwd, offset, limit, signal) => unwrap(call, GIT_RPC.logPage, { cwd, offset, limit }, signal),
    commitDetail: (cwd, hash, signal) => unwrap(call, GIT_RPC.commitDetail, { cwd, hash }, signal),
    generateMessageStart: (cwd, signal) => unwrap(call, GIT_RPC.generateMessageStart, { cwd }, signal),
    generateMessagePoll: (requestId, signal) => unwrap(call, GIT_RPC.generateMessagePoll, { requestId }, signal),
    remotes: (cwd, signal) => unwrap(call, GIT_RPC.remotes, { cwd }, signal),
    remoteAdd: (cwd, name, url, signal) => unwrap(call, GIT_RPC.remoteAdd, { cwd, name, url }, signal),
    remoteRemove: (cwd, name, signal) => unwrap(call, GIT_RPC.remoteRemove, { cwd, name }, signal),
    branches: (cwd, signal) => unwrap(call, GIT_RPC.branches, { cwd }, signal),
    branchCreate: (cwd, name, signal) => unwrap(call, GIT_RPC.branchCreate, { cwd, name }, signal),
    branchCheckout: (cwd, name, signal) => unwrap(call, GIT_RPC.branchCheckout, { cwd, name }, signal),
    branchDelete: (cwd, name, signal) => unwrap(call, GIT_RPC.branchDelete, { cwd, name }, signal),
    checkUpdate: (signal) => unwrap(call, GIT_RPC.checkUpdate, {}, signal),
    update: (signal) => unwrap(call, GIT_RPC.update, {}, signal),
    fsList: (cwd, path, signal) => unwrap(call, GIT_RPC.fsList, { cwd, path }, signal),
    fsRead: (cwd, path, signal) => unwrap(call, GIT_RPC.fsRead, { cwd, path }, signal),
    diff: (cwd, path, staged, signal) => unwrap(call, GIT_RPC.diff, { cwd, path, staged }, signal),
  }
}
