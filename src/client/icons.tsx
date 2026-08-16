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

/** Copy (clipboard). */
export function CopyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 1H4a2 2 0 0 0-2 2v9h1.5V3H10V1ZM14 4H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z" />
    </Svg>
  )
}
