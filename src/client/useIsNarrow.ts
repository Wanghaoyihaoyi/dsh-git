// Reactive viewport check for the git panel's responsive fallback.
//
// The right `details` column auto-closes when the viewport is narrower than
// `sidebar_width + 940px` (computeColumns in @deepseek-ai/dsh-client-ui-layout:
// center must keep 640px and details must keep 300px). With the default sidebar
// (280px) that breakpoint is 1220px; below it the docked column renders at
// width 0, so the plugin falls back to a floating panel.
import { useMemo, useSyncExternalStore } from 'react'

export const NARROW_BREAKPOINT = 1220

export function useIsNarrow(): boolean {
  const mq = useMemo(() => {
    if (typeof window === 'undefined') return null
    return window.matchMedia(`(max-width: ${NARROW_BREAKPOINT}px)`)
  }, [])

  return useSyncExternalStore(
    (onChange) => {
      if (mq === null) return () => {}
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => (mq !== null ? mq.matches : false),
  )
}
