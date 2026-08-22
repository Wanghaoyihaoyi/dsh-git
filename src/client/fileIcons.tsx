// File-type icons for source-control rows and the workspace file browser.
//
// Glyphs are Lucide-style 24×24 stroke icons (ISC, https://lucide.dev) scaled
// down to 16px — round caps, joined corners, 2u stroke — with a category
// palette tuned to the panel's existing status colors (blue #4a86c8, green
// #1f9d55, purple #8a63d2/#9c27b0, amber #d99a2b, red #e0554f, gold #c9a227).
// Each extension maps to a category; the filename itself carries the
// extension, so the icon stays a uniform, recognizable shape.
import type { ReactNode } from 'react'

type IconKind = 'file' | 'code' | 'image' | 'audio' | 'video' | 'archive' | 'doc' | 'json'

const KIND_COLORS: Record<IconKind, string> = {
  file: 'currentColor',
  code: '#4a86c8',
  image: '#1f9d55',
  audio: '#9c27b0',
  video: '#e0554f',
  archive: '#d99a2b',
  doc: '#4d9cd0',
  json: '#c9a227',
}

const TYPES: Record<string, IconKind> = {
  // code
  ts: 'code', tsx: 'code', mts: 'code', cts: 'code',
  js: 'code', jsx: 'code', mjs: 'code', cjs: 'code',
  css: 'code', scss: 'code', sass: 'code', less: 'code', styl: 'code', stylus: 'code', pcss: 'code', postcss: 'code',
  html: 'code', htm: 'code', vue: 'code', svelte: 'code', astro: 'code', pug: 'code', ejs: 'code', twig: 'code', hbs: 'code',
  java: 'code', c: 'code', cc: 'code', cpp: 'code', cxx: 'code', h: 'code', hpp: 'code', cs: 'code',
  php: 'code', rb: 'code', swift: 'code', kt: 'code', kts: 'code', scala: 'code', dart: 'code', lua: 'code',
  r: 'code', pl: 'code', pm: 'code', groovy: 'code', erl: 'code', hrl: 'code', ex: 'code', exs: 'code',
  fs: 'code', fsx: 'code', clj: 'code', cljs: 'code', sol: 'code', zig: 'code', nim: 'code',
  hs: 'code', ml: 'code', mli: 'code', py: 'code', go: 'code', rs: 'code',
  sh: 'code', bash: 'code', zsh: 'code', fish: 'code', ps1: 'code', bat: 'code', cmd: 'code',
  // image
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', svg: 'image', webp: 'image',
  ico: 'image', bmp: 'image', avif: 'image', tiff: 'image',
  // audio
  mp3: 'audio', wav: 'audio', ogg: 'audio', flac: 'audio', m4a: 'audio', aac: 'audio', opus: 'audio', aiff: 'audio',
  // video
  mp4: 'video', webm: 'video', mov: 'video', avi: 'video', mkv: 'video', m4v: 'video',
  // archive
  zip: 'archive', tar: 'archive', gz: 'archive', tgz: 'archive', rar: 'archive', '7z': 'archive', bz2: 'archive', xz: 'archive',
  // doc
  md: 'doc', markdown: 'doc', txt: 'doc', rst: 'doc', adoc: 'doc', pdf: 'doc',
  csv: 'doc', tsv: 'doc', tex: 'doc', bib: 'doc', ipynb: 'doc',
  doc: 'doc', docx: 'doc', ppt: 'doc', pptx: 'doc', xls: 'doc', xlsx: 'doc',
  // json / structured data / config
  json: 'json', jsonc: 'json', json5: 'json', yml: 'json', yaml: 'json', toml: 'json', xml: 'json',
  ini: 'json', cfg: 'json', conf: 'json', env: 'json', properties: 'json', lock: 'json',
  proto: 'json', prisma: 'json', gradle: 'json', sql: 'json', graphql: 'json', gql: 'json',
}

function extensionOf(path: string): string {
  const base = path.split('/').pop() ?? path
  const dot = base.lastIndexOf('.')
  // Extension-less names (`Dockerfile`, `Makefile`) and dotfiles (`.gitignore`)
  // are keyed by the whole lowercased name with leading dots stripped.
  if (dot <= 0) return base.toLowerCase().replace(/^\.+/, '')
  return base.slice(dot + 1).toLowerCase()
}

// Lucide-style file shell (24×24), reused by every file glyph.
const FILE_SHELL = (
  <>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
  </>
)

function Glyph({ kind, color }: { kind: IconKind; color: string }) {
  const stroke = { fill: 'none' as const, stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (kind) {
    case 'code':
      return (
        <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
          {FILE_SHELL}
          <path d="m10 13-2 2 2 2" />
          <path d="m14 17 2-2-2-2" />
        </svg>
      )
    case 'image':
      return (
        <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
          {FILE_SHELL}
          <circle cx="10" cy="12" r="2" />
          <path d="m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 20" />
        </svg>
      )
    case 'audio':
      return (
        <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
          <path d="M17.5 22h.5a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="M2 19a2 2 0 1 1 4 0v1a2 2 0 1 1-4 0v-4a6 6 0 0 1 12 0v4a2 2 0 1 1-4 0v-1a2 2 0 1 1 4 0" />
        </svg>
      )
    case 'video':
      return (
        <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
          {FILE_SHELL}
          <path d="m10 11 5 3-5 3v-6Z" />
        </svg>
      )
    case 'archive':
      return (
        <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
          <path d="M10 12v-1" />
          <path d="M10 18v-2" />
          <path d="M10 7V6" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="M15.5 22H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v16a2 2 0 0 0 .274 1.01" />
          <circle cx="10" cy="20" r="2" />
        </svg>
      )
    case 'doc':
      return (
        <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
          {FILE_SHELL}
          <path d="M10 9H8" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
        </svg>
      )
    case 'json':
      return (
        <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
          {FILE_SHELL}
          <path d="M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1" />
          <path d="M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1" />
        </svg>
      )
    case 'file':
    default:
      return (
        <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
          {FILE_SHELL}
        </svg>
      )
  }
}

export function fileIcon(path: string): ReactNode {
  const kind = TYPES[extensionOf(path)] ?? 'file'
  return <Glyph kind={kind} color={KIND_COLORS[kind]} />
}

/** Folder glyph for the file browser (theme-colored, closed/open). */
export function folderIcon(open: boolean): ReactNode {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {open ? (
        <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
      ) : (
        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      )}
    </svg>
  )
}
