
// P0/P1 git power tools: discard changes, stash (push/list/apply/drop),
// undo last commit (soft reset), and show a file's content at a commit.
//
// All mutations go through the same shell wrapper and quoting discipline as
// the rest of the plugin: paths via `--pathspec-from-file=-` (NUL-separated),
// messages as one argv element, and strict safe-class validation for refs.
// These functions return raw results only — the caller (host/index.ts)
// refreshes the canonical GitStatus afterwards, keeping one authority.
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { git, gitOrThrow, stdoutText } from './git.js'
import { safeResolve } from './fs-security.js'
import type { GitShowFileResult, GitStash } from '../shared/rpc.js'

/** Cap on file content shown from history. */
const SHOW_CAP = 256 * 1024
/** Bytes sniffed for binary detection. */
const BINARY_SNIFF = 8192

/** Discard a file's changes: restore index+worktree to HEAD (tracked), or
 *  delete the worktree file (untracked). Never touches other files. */
export async function gitDiscard(
  ctx: Context,
  cwd: string,
  rel: string,
  untracked: boolean,
  signal: AbortSignal,
): Promise<void> {
  const target = safeResolve(path.resolve(cwd), rel)
  if (target === undefined) throw new Error('path escapes the workspace')
  if (untracked) {
    await fs.rm(target, { force: false })
    return
  }
  await gitOrThrow(
    ctx.shell,
    ['restore', '--source=HEAD', '--staged', '--worktree', '--pathspec-from-file=-', '--pathspec-file-nul', '--'],
    { cwd, signal, stdin: `${rel}\0` },
  )
}

/** git stash push -m <message> (no message → default). */
export async function gitStashPush(
  ctx: Context,
  cwd: string,
  message: string | undefined,
  signal: AbortSignal,
): Promise<void> {
  const args = ['stash', 'push']
  if (message !== undefined && message.trim().length > 0) args.push('-m', message)
  await gitOrThrow(ctx.shell, args, { cwd, signal })
}

/** git stash list, newest first, parsed from porcelain output. */
export async function gitStashList(ctx: Context, cwd: string, signal: AbortSignal): Promise<GitStash[]> {
  const result = await git(ctx.shell, ['stash', 'list', '--format=%H%x1f%aI%x1f%s'], { cwd, signal })
  if (result.exitCode !== 0) return []
  const stashes: GitStash[] = []
  for (const line of stdoutText(result).split('\n')) {
    if (line.length === 0) continue
    const [hash, date, ...rest] = line.split('\x1f')
    if (hash === undefined || hash === '') continue
    const message = rest.join('\x1f')
    const m = /^On ([^:]+): /.exec(message)
    stashes.push({
      ref: `stash@{${stashes.length}}`,
      hash: hash.slice(0, 7),
      message: m ? message.slice(m[0].length) : message,
      branch: m?.[1],
      date,
    })
  }
  return stashes
}

/** Apply a stash by index (git stash apply stash@{n}). */
export async function gitStashApply(
  ctx: Context,
  cwd: string,
  index: number,
  signal: AbortSignal,
): Promise<void> {
  await gitOrThrow(ctx.shell, ['stash', 'apply', `stash@{${index}}`], { cwd, signal })
}

/** Drop a stash by index. */
export async function gitStashDrop(
  ctx: Context,
  cwd: string,
  index: number,
  signal: AbortSignal,
): Promise<void> {
  await gitOrThrow(ctx.shell, ['stash', 'drop', `stash@{${index}}`], { cwd, signal })
}

/** Soft-reset HEAD~1: keeps all changes staged (as they were pre-commit). */
export async function gitUndoCommit(ctx: Context, cwd: string, signal: AbortSignal): Promise<void> {
  await gitOrThrow(ctx.shell, ['reset', '--soft', 'HEAD~1'], { cwd, signal })
}

/** Show a file's content at a commit (git show <commit>:<path>). */
export async function gitShowFile(
  ctx: Context,
  cwd: string,
  hash: string,
  rel: string,
  signal: AbortSignal,
): Promise<GitShowFileResult> {
  if (!/^[0-9a-fA-F]{4,64}$/.test(hash)) throw new Error('invalid commit hash')
  const target = safeResolve(path.resolve(cwd), rel)
  if (target === undefined) throw new Error('path escapes the workspace')
  const result = await git(ctx.shell, ['show', `${hash}:${rel}`], { cwd, signal })
  if (result.exitCode !== 0) {
    const err = result.stderr?.text ?? ''
    throw new Error(err.trim() || 'not found at this commit')
  }
  const text = result.stdout?.text ?? ''
  const size = Buffer.byteLength(text, 'utf8')
  if (size > SHOW_CAP) return { binary: false, tooLarge: true, size }
  const binary = text.slice(0, BINARY_SNIFF).includes('\x00')
  if (binary) return { binary: true, tooLarge: false, size }
  return { content: text, binary: false, tooLarge: false, size }
}

/** Resolve one conflicted file: take ours/theirs, then stage it. */
export async function gitConflictResolve(
  ctx: Context,
  cwd: string,
  rel: string,
  resolution: 'ours' | 'theirs',
  signal: AbortSignal,
): Promise<void> {
  if (resolution !== 'ours' && resolution !== 'theirs') throw new Error('invalid resolution')
  const target = safeResolve(path.resolve(cwd), rel)
  if (target === undefined) throw new Error('path escapes the workspace')
  // `git checkout --ours/--theirs -- <path>` copies the chosen side into the
  // worktree AND index, clearing the conflict marker; then `git add` marks it
  // resolved (a no-op for already-staged files but correct for deleted ones).
  await gitOrThrow(ctx.shell, ['checkout', `--${resolution}`, '--', rel], { cwd, signal })
  await gitOrThrow(ctx.shell, ['add', '--', rel], { cwd, signal })
}

/** Compare HEAD against a base ref: ahead/behind counts plus changed files. */
export async function gitBranchCompare(
  ctx: Context,
  cwd: string,
  ref: string,
  signal: AbortSignal,
): Promise<{ base: string; ahead: number; behind: number; files: { status: string; path: string }[] }> {
  if (!/^[A-Za-z0-9._-]+$/.test(ref)) throw new Error('invalid ref')
  const revList = await git(ctx.shell, ['rev-list', '--left-right', '--count', `${ref}...HEAD`], { cwd, signal })
  if (revList.exitCode !== 0) {
    throw new Error((revList.stderr?.text ?? 'compare failed').trim())
  }
  const [left, right] = stdoutText(revList).trim().split(/\s+/)
  const ahead = Number(right ?? 0)
  const behind = Number(left ?? 0)
  const diff = await gitOrThrow(ctx.shell, ['diff', '--name-status', `${ref}...HEAD`], { cwd, signal })
  const files: { status: string; path: string }[] = []
  for (const line of stdoutText(diff).split('\n')) {
    const m = /^([A-Z])\t(.+)$/.exec(line.trimEnd())
    if (m) files.push({ status: m[1], path: m[2] })
  }
  return { base: ref, ahead, behind, files }
}

/** Unified diff of one path between a base ref and HEAD. */
export async function gitDiffRef(
  ctx: Context,
  cwd: string,
  ref: string,
  rel: string,
  signal: AbortSignal,
): Promise<{ diff: string; truncated: boolean }> {
  if (!/^[A-Za-z0-9._-]+$/.test(ref)) throw new Error('invalid ref')
  const target = safeResolve(path.resolve(cwd), rel)
  if (target === undefined) throw new Error('path escapes the workspace')
  const result = await gitOrThrow(ctx.shell, ['diff', '--no-color', `${ref}...HEAD`, '--', rel], { cwd, signal })
  const all = result.stdout?.text ?? ''
  return all.length > SHOW_CAP ? { diff: all.slice(0, SHOW_CAP), truncated: true } : { diff: all, truncated: false }
}

/** Revert a commit: add a new commit that reverses it (history is preserved). */
export async function gitRevert(
  ctx: Context,
  cwd: string,
  hash: string,
  signal: AbortSignal,
): Promise<void> {
  if (!/^[0-9a-fA-F]{4,64}$/.test(hash)) throw new Error('invalid commit hash')
  // `--no-edit` keeps the auto "Revert \"...\"" message; the commit is created
  // immediately. A dirty worktree can make revert touch the same files and
  // fail — surface git's message so the user knows to commit/stash first.
  await gitOrThrow(ctx.shell, ['revert', '--no-edit', hash], { cwd, signal })
}
