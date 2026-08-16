// File-type icons for the source-control file rows. Each extension maps to a
// category, rendered as a small SVG glyph (no text) with a category color; the
// filename itself already carries the extension, so the icon is a uniform,
// recognizable shape.
import type { ReactNode } from 'react'

type IconKind = 'file' | 'code' | 'image' | 'media' | 'archive' | 'doc' | 'json'

const KIND_COLORS: Record<IconKind, string> = {
  file: 'currentColor',
  code: '#4a86c8',
  image: '#4caf50',
  media: '#9c27b0',
  archive: '#d99a2b',
  doc: '#4d9cd0',
  json: '#8bc34a',
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
  // media
  mp3: 'media', wav: 'media', ogg: 'media', flac: 'media', m4a: 'media', aac: 'media',
  mp4: 'media', webm: 'media', mov: 'media', avi: 'media', mkv: 'media', m4v: 'media',
  // archive
  zip: 'archive', tar: 'archive', gz: 'archive', tgz: 'archive', rar: 'archive', '7z': 'archive', bz2: 'archive', xz: 'archive',
  // doc
  md: 'doc', markdown: 'doc', txt: 'doc', rst: 'doc', adoc: 'doc', pdf: 'doc', csv: 'doc', tsv: 'doc', tex: 'doc', bib: 'doc', ipynb: 'doc',
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

function Glyph({ kind, color }: { kind: IconKind; color: string }) {
  const line = { fill: 'none', stroke: color, strokeWidth: 1.3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (kind) {
    case 'code':
      return (
        <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true">
          <path {...line} d="M4 1.5h5.5L13 5v9.5H4z" />
          <path {...line} d="M9.5 1.5V5H13" />
          <path {...line} d="M6.1 7.4 4.4 9l1.7 1.6M9.9 7.4l1.7 1.6L9.9 10.6" />
        </svg>
      )
    case 'image':
      return (
        <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true">
          <rect x="2" y="3" width="12" height="10" rx="1.5" fill="none" stroke={color} strokeWidth="1.3" />
          <circle cx="5.5" cy="6" r="1" fill={color} />
          <path d="M3 12l3.2-3.2 2.3 2.3L10.8 8 13 10.4" fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      )
    case 'media':
      return (
        <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="6" fill="none" stroke={color} strokeWidth="1.3" />
          <path d="M6.7 5.9v4.2L10.4 8z" fill={color} />
        </svg>
      )
    case 'archive':
      return (
        <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2 5.2 8 2l6 3.2-6 3.2z" fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M2 5.2V11L8 14l6-3V5.2" fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M8 8.4V14" stroke={color} strokeWidth="1.3" />
        </svg>
      )
    case 'doc':
      return (
        <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true">
          <path {...line} d="M4 1.5h5.5L13 5v9.5H4z" />
          <path {...line} d="M9.5 1.5V5H13" />
          <path {...line} d="M5.5 8h5M5.5 10h5M5.5 12h3" />
        </svg>
      )
    case 'json':
      return (
        <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true">
          <path d="M10.3 2.6c-1.2 0-1.7.4-1.7 1.5v1.2c0 .7-.3 1-1 1 .7 0 1 .3 1 1v1.2c0 1.1.5 1.5 1.7 1.5M5.7 2.6c1.2 0 1.7.4 1.7 1.5v1.2c0 .7.3 1 1 1-.7 0-1 .3-1 1v1.2c0 1.1-.5 1.5-1.7 1.5" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      )
    case 'file':
    default:
      return (
        <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true">
          <path {...line} d="M4 1.5h5.5L13 5v9.5H4z" />
          <path {...line} d="M9.5 1.5V5H13" />
        </svg>
      )
  }
}

export function fileIcon(path: string): ReactNode {
  const kind = TYPES[extensionOf(path)] ?? 'file'
  return <Glyph kind={kind} color={KIND_COLORS[kind]} />
}
