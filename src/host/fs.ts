// Host-side workspace file browser: list directory pages and preview text
// files for the panel. Pure Node fs — no git, no shell — because browsing does
// not mutate anything; security lives in `../shared/fs-security.ts`.
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { isHiddenName, safeResolve } from './fs-security.js'
import type { FsEntry, FsListResult, FsReadResult } from '../shared/rpc.js'

/** Max entries per directory listing (guards huge dirs like build output). */
const LIST_CAP = 2000
/** Max bytes ever handed to the client as preview text. */
const READ_TEXT_CAP = 256 * 1024
/** Files larger than this are reported `tooLarge` without reading content. */
const SIZE_CAP = 2 * 1024 * 1024
/** Bytes scanned for the NUL binary sniff. */
const BINARY_SNIFF = 8192

export async function fsList(root: string, rel: string, signal?: AbortSignal): Promise<FsListResult> {
  const target = safeResolve(root, rel)
  if (target === undefined) throw new Error('path escapes the workspace')
  throwIf(signal)
  const items = await fs.readdir(target, { withFileTypes: true })
  throwIf(signal)
  const entries: FsEntry[] = []
  let truncated = false
  for (const item of items) {
    if (isHiddenName(item.name)) continue
    if (entries.length >= LIST_CAP) {
      truncated = true
      break
    }
    const abs = path.join(target, item.name)
    const isDir = item.isDirectory()
    const relPath = path.relative(path.resolve(root), abs).split(path.sep).join('/')
    if (isDir) {
      entries.push({ name: item.name, path: relPath, kind: 'dir' })
    } else {
      let size: number | undefined
      let mtime: string | undefined
      try {
        const stat = await fs.stat(abs)
        size = stat.size
        mtime = stat.mtime.toISOString()
      } catch {
        // dangling symlink or vanished file: keep the row, skip stats
      }
      entries.push({ name: item.name, path: relPath, kind: 'file', size, mtime })
    }
  }
  // Directories first, then files, each locale-aware name-sorted.
  entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  })
  return { entries, truncated }
}

export async function fsRead(root: string, rel: string, signal?: AbortSignal): Promise<FsReadResult> {
  const target = safeResolve(root, rel)
  if (target === undefined) throw new Error('path escapes the workspace')
  throwIf(signal)
  const stat = await fs.stat(target)
  if (stat.isDirectory()) throw new Error('cannot preview a directory')
  if (stat.size > SIZE_CAP) return { binary: false, tooLarge: true, size: stat.size }
  const buffer = await fs.readFile(target)
  throwIf(signal)
  const binary = buffer.subarray(0, BINARY_SNIFF).includes(0)
  if (binary) return { binary: true, tooLarge: false, size: stat.size }
  const text = buffer.toString('utf8')
  if (text.length > READ_TEXT_CAP) return { binary: false, tooLarge: true, size: stat.size }
  return { content: text, binary: false, tooLarge: false, size: stat.size }
}

function throwIf(signal?: AbortSignal): void {
  if (signal?.aborted) throw new Error('aborted')
}
