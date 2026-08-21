// One-file unified diff for the panel.
//
// Untracked files have no diff to show (git diff is empty); for those we read
// the worktree file and hand it to the client as a full addition, so a brand
// new file still gets a useful preview. Paths go through `safeResolve` (same
// boundary as the fs browser) and into `git diff -- <path>` as a literal
// path argument after a `--` separator — never interpolated into a shell
// string by this module (the `git()` wrapper joins args for the executor, and
// path characters are validated by safeResolve's hidden-segment rule, while
// `--` prevents any option-parsing surprise).
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { git, gitOrThrow } from './git.js'
import { safeResolve } from './fs-security.js'
import type { GitDiffResult } from '../shared/rpc.js'

/** Head + tail cap on the diff text handed to the client (keeps huge diffs usable). */
const DIFF_CAP = 256 * 1024
/** Max bytes of untracked-file content sent as the "addition" preview. */
const CONTENT_CAP = 128 * 1024

export async function gitDiff(
  ctx: Context,
  cwd: string,
  rel: string,
  staged: boolean,
  signal: AbortSignal,
): Promise<GitDiffResult> {
  const target = safeResolve(path.resolve(cwd), rel)
  if (target === undefined) throw new Error('path escapes the workspace')

  // Untracked check: `git ls-files --error-unmatch <path>` fails with exit 1
  // when the file is not tracked (fresh file, or new in an unborn-repo).
  const tracked = await git(ctx.shell, ['ls-files', '--error-unmatch', '--', rel], { cwd, signal })
  if (tracked.exitCode !== 0) {
    // Unborn repo / fresh file: show the whole worktree content as an addition.
    let content: string | undefined
    try {
      const stat = await fs.stat(target)
      if (stat.size <= CONTENT_CAP) content = await fs.readFile(target, 'utf8')
    } catch {
      // vanished between listing and click; empty diff is acceptable
    }
    return { path: rel, staged, diff: '', content, truncated: false }
  }

  const args = staged
    ? ['diff', '--cached', '--no-color', '--', rel]
    : ['diff', '--no-color', '--', rel]
  const result = await gitOrThrow(ctx.shell, args, { cwd, signal })
  const all = result.stdout?.text ?? ''
  let diff = all
  let truncated = false
  if (all.length > DIFF_CAP) {
    diff = all.slice(0, DIFF_CAP)
    truncated = true
  }
  return { path: rel, staged, diff, truncated }
}
