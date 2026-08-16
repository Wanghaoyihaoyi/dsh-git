// Tiny module-level observable so the sidebar-foot toggle (`sidebar.footer.action`)
// and the floating panel (`shell.overlay`) share one open/close state without a
// React context or the heavier slot store machinery. Both read it through
// `useSyncExternalStore`.
let open = false
let lastSessionId: string | undefined
// Whether the docked details column is actually open (width > 0). Tracked by the
// docked panel through a ResizeObserver so the floating panel can stand in when
// the layout closes the column (its close breakpoint depends on the live sidebar
// width, which a hardcoded viewport breakpoint cannot capture).
let detailsOpen = true
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export const panelStore = {
  isOpen(): boolean {
    return open
  },
  setOpen(value: boolean): void {
    open = value
    emit()
  },
  toggle(): void {
    open = !open
    emit()
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  /** The last session id the docked panel observed (survives re-mounts). */
  getLastSessionId(): string | undefined {
    return lastSessionId
  },
  setLastSessionId(id: string | undefined): void {
    lastSessionId = id
  },
  isDetailsOpen(): boolean {
    return detailsOpen
  },
  setDetailsOpen(value: boolean): void {
    if (detailsOpen === value) return
    detailsOpen = value
    emit()
  },
}
