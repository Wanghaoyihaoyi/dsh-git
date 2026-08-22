// Placeholder icon set for the git panel.
//
// DSH icons are `ic_ds_*` SVG React components: `{ size?, className? }` props,
// colored via `fill="currentColor"` so they follow the active theme. The shipped
// set has no source-control/commit/push/sparkle glyphs, so this plugin ships its
// own. Replace any of these with your own SVG paths (keep the same props shape),
// or drop files into `./icons/` and re-export them from here.
import type { ReactNode } from 'react'

export interface IconProps {
  size?: number
  className?: string
}

function Svg({ size = 16, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/** Source-control / git branch mark (sidebar toggle). */
export function GitIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M11.5 3.5a1.5 1.5 0 1 0-2 1.415V6a2 2 0 0 1-2 2H5a2 2 0 0 0-2 2v.085a1.5 1.5 0 1 0 1 0V10a1 1 0 0 1 1-1h2.5a3 3 0 0 0 3-3V4.915a1.5 1.5 0 0 0 1-1.415ZM5.5 11a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
    </Svg>
  )
}

/** AI-generate commit message (sparkle). */
export function SparkleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 1.5l.9 3.1a4 4 0 0 0 2.5 2.5l3.1.9-3.1.9a4 4 0 0 0-2.5 2.5L8 14.5l-.9-3.1a4 4 0 0 0-2.5-2.5L1.5 8l3.1-.9a4 4 0 0 0 2.5-2.5L8 1.5Z" />
    </Svg>
  )
}

/** Push (upload to remote). */
export function PushIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 2.5 12.5 7 11 8.5 8.75 6.25V11h-1.5V6.25L5 8.5 3.5 7 8 2.5ZM3 12.5h10V14H3v-1.5Z" />
    </Svg>
  )
}

/** Pull (fetch latest from all remotes). */
export function PullIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 13.5 3.5 9 5 7.5l2.25 2.25V4h1.5v5.75L11 7.5l1.5 1.5L8 13.5ZM3 12.5h10V14H3v-1.5Z" />
    </Svg>
  )
}

/** Refresh status. */
export function RefreshIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9l.35-.35h-2v1.5h3.5v-3.5h-1.5v1.15A7 7 0 1 0 15 8h-1.5Z" />
    </Svg>
  )
}

/** Self-update available (arrow into a tray). */
export function UpdateIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 2.5 13 7.5 11.4 9.1 8.75 6.45V11h-1.5V6.45L4.6 9.1 3 7.5 8 2.5ZM3 12.5h10V14H3v-1.5Z" />
    </Svg>
  )
}

/** Copy (clipboard). */
export function CopyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 1H4a2 2 0 0 0-2 2v9h1.5V3H10V1ZM14 4H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z" />
    </Svg>
  )
}

/** Discard (trash can). */
export function TrashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 3.5h9V14a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 5 14V3.5Zm1.5 2V14h5V5.5h-5ZM3 2h11v1.5H3V2ZM7.5 7h1.5v6H7.5V7Zm2.5 0h1.5v6H10V7Z" />
    </Svg>
  )
}

/** Undo last commit (rotate left). */
export function UndoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.5 3.5 3 7l3.5 3.5 1.05-1.05L5.56 8H11a3.5 3.5 0 0 1 0 7h-4v-1.5h4a2 2 0 0 0 0-4H5.56l1.99-1.95L6.5 3.5Z" />
    </Svg>
  )
}

/** Compare branches (two arrows). */
export function CompareIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 3 4 6l3 3L8.05 7.95 6.56 6.44H9a3.5 3.5 0 0 1 0 7H6v1.5h3a5 5 0 0 0 0-10H6.56l1.49-1.49L7 3Zm4.95 8.55L10 10l1.05-1.05L12.44 10.56H11a5 5 0 0 1-3-1v1.7A5 5 0 0 0 11 12h1.44l-1.49-1.45 1-1.05 2.05 1.5Z" />
    </Svg>
  )
}

/** Stash (box with arrow). */
export function StashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.5 2.5h11V15H2.5V2.5Zm1.5 1.5v9.5h8V4H4ZM8 4.5 11 8 9.9 9.1 8.75 7.95V11h-1.5V7.95L5.1 9.1 5 8l3-3.5Z" />
    </Svg>
  )
}
