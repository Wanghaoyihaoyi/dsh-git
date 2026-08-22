// Host-side git command wrapper over the harness `ctx.shell` executor.
//
// Network git ops (push/pull/fetch) run with `danger-full-access`: the sandbox's
// restricted Windows token breaks schannel (TLS) and MSYS2 `sh.exe` (credential
// helpers), so they need the user's full token — exactly how VSCode invokes git.
// Local ops run under `workspace-write` so a stray local command stays confined
// to the workspace. No user git config is touched.
//
// Quoting discipline: we NEVER interpolate user data (paths, messages) into the
// command string. Messages go via `git commit -F -` (stdin) and paths via
// `--pathspec-from-file=- --pathspec-file-nul` (stdin, NUL-separated literal
// pathspecs), so paths and messages containing spaces/quotes/newlines/
// metacharacters cannot break the shell, the pathspec separator, or escape the
// command.
import path from 'node:path'
import type { ShellExecutor, ShellRunResult } from '@deepseek-ai/dsh-shell'

export interface GitRunOptions {
  cwd?: string
  signal?: AbortSignal
  /** Bytes written to stdin, then closed. */
  stdin?: string
  /**
   * True for network operations (push/pull/fetch) that must talk TLS and use the
   * credential helper — those need the user's full token (`danger-full-access`).
   * Everything else runs under `workspace-write` so a purely local git command
   * stays inside the sandbox's restricted token (defense-in-depth).
   */
  fullAccess?: boolean
}

/** Environment that keeps git non-interactive and output stable for parsing. */
const GIT_ENV: Record<string, string> = {
  GIT_TERMINAL_PROMPT: '0',
  LC_ALL: 'C',
}

const STDOUT_CAP = 1024 * 1024 // 1 MiB is ample for status/diff parsing.

/**
 * Join argv into a shell command, quoting each argument so spaces and shell
 * metacharacters in user values cannot split into extra tokens or inject
 * syntax. Safe arguments (path-ish tokens) stay bare; everything else is
 * wrapped in single quotes with the standard embedded-quote escape.
 */
export function joinGitArgs(args: string[]): string {
  return args.map((arg) => quoteIfNeeded(arg)).join(' ')
}

function quoteIfNeeded(arg: string): string {
  if (/^[A-Za-z0-9._/:@~%+,-{}]+$/.test(arg)) return arg
  const escaped = arg.split(String.fromCharCode(39)).join(String.fromCharCode(39) + '\\' + String.fromCharCode(39) + String.fromCharCode(39))
  return String.fromCharCode(39) + escaped + String.fromCharCode(39)
}

export async function git(
  shell: ShellExecutor,
  args: string[],
  opts: GitRunOptions = {},
): Promise<ShellRunResult> {
  return shell.run(
    shell.resolve({
      command: joinGitArgs(['git', ...args]),
      workdir: opts.cwd,
      signal: opts.signal,
      stdin: opts.stdin,
      stdoutMaxBytes: STDOUT_CAP,
      env: GIT_ENV,
      // Network git ops need the full user token (TLS + credential helpers);
      // local ops stay confined to the workspace so a stray local command can't
      // touch the whole filesystem/credential store.
      sandboxPolicy: {
        mode: opts.fullAccess ? 'danger-full-access' : 'workspace-write',
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
