// Host-side git command wrapper over the harness `ctx.shell` executor.
//
// Git runs UNCONFINED (`danger-full-access` sandbox policy). The sandbox's
// restricted Windows token breaks git's normal operation: schannel (TLS) cannot
// read the interactive user's credentials (`SEC_E_NO_CREDENTIALS`) and MSYS2
// `sh.exe` — which git uses to run credential helpers — cannot create its shared
// memory (`CreateFileMapping … error 5`). Running with the user's full token is
// exactly how VSCode (and every desktop git client) invokes git, so push/pull
// and credential helpers work normally. No user git config is touched.
//
// Quoting discipline: we NEVER interpolate user data (paths, messages) into the
// command string. Messages go via `git commit -F -` (stdin) and paths via
// `--pathspec-from-file=-` (stdin, one literal pathspec per line), so paths and
// messages containing spaces/quotes/metacharacters cannot break the shell or
// escape the command.
import path from 'node:path'
import type { ShellExecutor, ShellRunResult } from '@deepseek-ai/dsh-shell'

export interface GitRunOptions {
  cwd?: string
  signal?: AbortSignal
  /** Bytes written to stdin, then closed. */
  stdin?: string
}

/** Environment that keeps git non-interactive and output stable for parsing. */
const GIT_ENV: Record<string, string> = {
  GIT_TERMINAL_PROMPT: '0',
  LC_ALL: 'C',
}

const STDOUT_CAP = 1024 * 1024 // 1 MiB is ample for status/diff parsing.

export async function git(
  shell: ShellExecutor,
  args: string[],
  opts: GitRunOptions = {},
): Promise<ShellRunResult> {
  return shell.run(
    shell.resolve({
      command: ['git', ...args].join(' '),
      workdir: opts.cwd,
      signal: opts.signal,
      stdin: opts.stdin,
      stdoutMaxBytes: STDOUT_CAP,
      env: GIT_ENV,
      // `danger-full-access` deliberately bypasses the sandbox backend (the
      // executor runs the command through the plain local runner), so git keeps
      // the user's full Windows token. `workspaceRoot` is carried but unused
      // under this mode; it must still be an absolute path.
      sandboxPolicy: {
        mode: 'danger-full-access',
        workspaceRoot: path.resolve(opts.cwd ?? process.cwd()),
      },
    }),
  )
}

export function stdoutText(result: ShellRunResult): string {
  return result.stdout?.text ?? ''
}

export function stderrText(result: ShellRunResult): string {
  return result.stderr?.text ?? ''
}

/** Run git and throw a descriptive error on a non-zero exit. */
export async function gitOrThrow(
  shell: ShellExecutor,
  args: string[],
  opts: GitRunOptions = {},
): Promise<ShellRunResult> {
  const result = await git(shell, args, opts)
  if (result.exitCode !== 0) {
    const detail = stderrText(result).trim() || stdoutText(result).trim() || `exit code ${result.exitCode}`
    throw new Error(`git ${args[0]} failed: ${detail}`)
  }
  return result
}

/** Escape a pathspec so glob metacharacters are taken literally. */
export function literalPathspec(path: string): string {
  return `:(literal)${path}`
}

// Safe-character classes for user-supplied git names/urls. These values are
// interpolated into a shell command string (git <args>), so we reject anything
// that could break the shell or escape the command. Git branch/remote names
// already forbid spaces and most punctuation; URLs additionally need `:` `/`
// `@` `~` `%` for https/ssh/git@host forms.
export const SAFE_BRANCH = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/
export const SAFE_REMOTE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
export const SAFE_URL = /^[A-Za-z0-9][A-Za-z0-9:/.@~_%-]*$/
export const SAFE_HASH = /^[0-9a-fA-F]{4,64}$/

/** Trim and validate a user-supplied value against a safe-character class. */
export function assertSafe(value: string, pattern: RegExp, label: string): string {
  const trimmed = value.trim()
  if (trimmed.length === 0 || !pattern.test(trimmed)) {
    throw new Error(`invalid ${label}`)
  }
  return trimmed
}
