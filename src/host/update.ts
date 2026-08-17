// Host-side self-update: check the published npm version and (on request) run
// `dsh plugin` to update this plugin inside its profile, after which the user
// restarts `dsh web` and refreshes the browser.
//
// Version check — reads our own package.json and compares it against the npm
// registry `latest` dist-tag. The check is deliberately non-fatal: a network or
// proxy failure reports `hasUpdate: false` plus an `error`, so the client can
// stay silent instead of surfacing a transient warning.
//
// Update — runs `dsh plugin --profile <name> add @mojiexuan/dsh-git@<version>`
// under `danger-full-access` (it writes `$DSH_HOME/profiles/...` and needs the
// network). `add <pkg>@<version>` — rather than `update` — reliably bumps the
// installed version across a minor/major range, since pnpm saves a caret range
// (`^0.2.0`) on install and a plain `update` would stay inside it. The exact
// version is pinned (not `@latest`) so a stale pnpm metadata cache cannot
// resolve the update backwards.
//
// The profile name is derived from this module's own install path
// (`.../profiles/<name>/node_modules/@mojiexuan/dsh-git/lib/index.js`); for a
// `link:` dev checkout (installed outside any profile) it falls back to scanning
// `$DSH_HOME/profiles/*` for a manifest that depends on this package. Updating a
// link install replaces it with the published npm version.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ShellExecutor, ShellRunResult } from '@deepseek-ai/dsh-shell'
import type { GitUpdateInfo, GitUpdateResult } from '../shared/rpc.js'
import { stderrText, stdoutText } from './git.js'

const PACKAGE_NAME = '@mojiexuan/dsh-git'
const DEFAULT_REGISTRY_URL = 'https://registry.npmjs.org'
const CHECK_TIMEOUT_MS = 10_000
const CACHE_TTL_MS = 10 * 60 * 1000
/** Profile names are shell-interpolated, so reject anything outside this class. */
const SAFE_PROFILE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
const STDOUT_CAP = 1024 * 1024

let cache: { info: GitUpdateInfo; at: number } | undefined

/** Installed version, read from the package.json beside our bundled lib/index.js. */
function readInstalledVersion(): string {
  const manifest = JSON.parse(
    readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'),
  ) as { version?: unknown }
  return typeof manifest.version === 'string' && manifest.version.length > 0 ? manifest.version : '0.0.0'
}

/** Numeric `major.minor.patch` compare; prerelease/build suffixes are ignored. */
function isNewer(candidate: string, current: string): boolean {
  const parse = (value: string) => value.split('.', 3).map((part) => Number.parseInt(part, 10) || 0)
  const a = parse(candidate)
  const b = parse(current)
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i]
  }
  return false
}

function registryBase(override?: string): string {
  const value = (override ?? '').trim()
  return value.length > 0 ? value.replace(/\/+$/, '') : DEFAULT_REGISTRY_URL
}

/** Query the registry `latest` dist-tag for this package (never throws). */
export async function checkUpdate(registryUrl?: string): Promise<GitUpdateInfo> {
  const installed = readInstalledVersion()
  const url = `${registryBase(registryUrl)}/${encodeURIComponent(PACKAGE_NAME)}/latest`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    })
    if (!response.ok) {
      return { installed, hasUpdate: false, error: `registry responded ${response.status}` }
    }
    const data = (await response.json()) as { version?: unknown }
    const latest = typeof data.version === 'string' ? data.version : undefined
    if (latest === undefined) {
      return { installed, hasUpdate: false, error: 'registry returned no version' }
    }
    return { installed, latest, hasUpdate: isNewer(latest, installed) }
  } catch (error) {
    return { installed, hasUpdate: false, error: error instanceof Error ? error.message : String(error) }
  } finally {
    clearTimeout(timer)
  }
}

/** `checkUpdate` with a short in-memory cache so repeated panel opens stay quiet. */
export async function checkUpdateCached(registryUrl?: string): Promise<GitUpdateInfo> {
  if (cache !== undefined && Date.now() - cache.at < CACHE_TTL_MS) return cache.info
  const info = await checkUpdate(registryUrl)
  cache = { info, at: Date.now() }
  return info
}

/** Profile this plugin is installed into, derived from our own install path. */
function resolveProfileFromPath(): { dir: string; name: string } | undefined {
  const libDir = dirname(fileURLToPath(import.meta.url)) // .../dsh-git/lib
  const pkgDir = dirname(libDir) // .../dsh-git
  const scopeDir = dirname(pkgDir) // .../@mojiexuan
  const nmDir = dirname(scopeDir) // .../node_modules
  const profileDir = dirname(nmDir) // .../<profile>
  const profilesDir = dirname(profileDir) // .../profiles
  if (basename(profilesDir) !== 'profiles') return undefined
  const name = basename(profileDir)
  if (!SAFE_PROFILE.test(name)) return undefined
  return { dir: profileDir, name }
}

/** Fallback for `link:` checkouts: scan `$DSH_HOME/profiles/*` for a manifest that depends on us. */
function resolveProfileByScan(): { dir: string; name: string } | undefined {
  const envHome = process.env.DSH_HOME
  const home = envHome !== undefined && envHome.trim().length > 0 ? envHome.trim() : join(homedir(), '.dsh')
  const profilesDir = join(home, 'profiles')
  let names: string[]
  try {
    names = readdirSync(profilesDir)
  } catch {
    return undefined
  }
  for (const name of names) {
    if (!SAFE_PROFILE.test(name)) continue
    const manifestPath = join(profilesDir, name, 'package.json')
    if (!existsSync(manifestPath)) continue
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { dependencies?: Record<string, string> }
      if (manifest.dependencies !== undefined && PACKAGE_NAME in manifest.dependencies) {
        return { dir: join(profilesDir, name), name }
      }
    } catch {
      // unreadable manifest → skip this profile
    }
  }
  return undefined
}

function resolveProfile(): { dir: string; name: string } | undefined {
  return resolveProfileFromPath() ?? resolveProfileByScan()
}

async function runDsh(
  shell: ShellExecutor,
  args: string[],
  cwd: string,
  signal?: AbortSignal,
): Promise<ShellRunResult> {
  return shell.run(shell.resolve({
    command: ['dsh', ...args].join(' '),
    workdir: cwd,
    signal,
    stdoutMaxBytes: STDOUT_CAP,
    env: { GIT_TERMINAL_PROMPT: '0', LC_ALL: 'C' },
    sandboxPolicy: { mode: 'danger-full-access', workspaceRoot: cwd },
  }))
}

/** Update this plugin to the latest published version inside its profile. */
export async function updatePlugin(
  shell: ShellExecutor,
  signal?: AbortSignal,
  registryUrl?: string,
): Promise<GitUpdateResult> {
  const info = await checkUpdate(registryUrl)
  const latest = info.latest
  if (latest === undefined) {
    throw new Error(info.error ?? 'unable to determine the latest version')
  }
  if (!info.hasUpdate) {
    return { updated: true, version: info.installed }
  }
  const profile = resolveProfile()
  if (profile === undefined) {
    throw new Error('could not locate the dsh profile that installed this plugin')
  }
  const result = await runDsh(
    shell,
    // Pin the exact version we just resolved, not `@latest`: pnpm's registry
    // metadata cache can lag a fresh publish and resolve `latest` to an older
    // version, which would "update" us backwards.
    ['plugin', '--profile', profile.name, 'add', `${PACKAGE_NAME}@${latest}`],
    profile.dir,
    signal,
  )
  if (result.exitCode !== 0) {
    const detail = stderrText(result).trim() || stdoutText(result).trim() || `exit code ${result.exitCode}`
    throw new Error(`update failed: ${detail}`)
  }
  // Report the version we just asked pnpm to install (the `latest` dist-tag at
  // check time). Reading our own package.json would misreport a `link:` checkout,
  // whose install path still points at the dev tree after the update.
  return { updated: true, version: latest }
}
