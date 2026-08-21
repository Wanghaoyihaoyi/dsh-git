// Security helpers shared by the host fs endpoints.
//
// The panel can preview any file under the CURRENT workspace, but never
// anything outside it. All checks run against the RESOLVED path so a crafted
// `../../` cannot escape the workspace root, and the `.git` directory is
// deliberately excluded from both listing and preview (internal repository
// state is the model's domain, not the panel's).
import path from 'node:path'

/** Directories that never appear in the workspace file tree. */
const HIDDEN_NAMES = new Set(['.git', 'node_modules'])

export function isHiddenName(name: string): boolean {
  return HIDDEN_NAMES.has(name)
}

/**
 * Resolve `rel` against `root` and return the absolute path, or `undefined`
 * when the result escapes the root (path traversal) or touches hidden dirs.
 */
export function safeResolve(root: string, rel: string): string | undefined {
  const rootAbs = path.resolve(root)
  const resolved = path.resolve(rootAbs, rel)
  if (resolved !== rootAbs && !resolved.startsWith(rootAbs + path.sep)) {
    return undefined
  }
  const parts = resolved.slice(rootAbs.length).split(path.sep).filter(Boolean)
  // Empty root itself is fine; a nested path must not touch a hidden segment.
  if (parts.some((part) => HIDDEN_NAMES.has(part))) return undefined
  return resolved
}
