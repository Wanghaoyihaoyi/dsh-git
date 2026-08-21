// Remote management menu: anchored below the remote pill (name + "•••").
// The old design pointed "•••" straight at the delete-confirmation modal — a
// "more" affordance with only one, dangerous, action. This menu makes the
// click mean "inspect this remote": it shows the fetch URL with a copy button
// and puts "Delete remote" as a clearly-delineated danger action that opens
// the confirmation modal only when explicitly chosen.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { CopyIcon } from './icons.js'

export interface RemoteMenuProps {
  name: string
  url: string
  anchor: HTMLElement | null
  onClose: () => void
  onDelete: () => void
  t: TranslateNS<'git'>
}

export function RemoteMenu({ name, url, anchor, onClose, onDelete, t }: RemoteMenuProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<number | undefined>(undefined)

  useLayoutEffect(() => {
    if (anchor === null) return
    // The menu is 260px wide. An anchor near the right edge (the remote pill
    // sits at the panel's top-right) would push the menu off-viewport if we
    // always left-align it, so clamp: prefer left edge, fall back to right
    // alignment against the anchor's right edge (never past the viewport).
    const rect = anchor.getBoundingClientRect()
    const MENU_W = 260
    const margin = 8
    let left = rect.left
    if (left + MENU_W + margin > window.innerWidth) {
      left = Math.max(margin, rect.right - MENU_W)
    }
    setPos({ top: rect.bottom + 4, left })
  }, [anchor])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => () => {
    if (copiedTimer.current !== undefined) window.clearTimeout(copiedTimer.current)
  }, [])

  if (anchor === null || pos === null) return null

  const copyUrl = () => {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      if (copiedTimer.current !== undefined) window.clearTimeout(copiedTimer.current)
      copiedTimer.current = window.setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <>
      <div className="dshgit-backdrop" onClick={onClose} />
      <div className="dshgit-bmenu dshgit-rmenu" style={{ top: pos.top, left: pos.left }}>
        <div className="dshgit-bmenu-head">
          <span className="dshgit-bmenu-title">{t('remoteDetails', { name })}</span>
        </div>
        <div className="dshgit-bmenu-list">
          <div className="dshgit-rmenu-url-row" title={url}>
            <span className="dshgit-rmenu-url">{url}</span>
            <button
              type="button"
              className="dshgit-rmenu-copy"
              title={t('copyRemoteUrl')}
              onClick={copyUrl}
            >
              {copied ? <span className="dshgit-rmenu-copied">{t('copied')}</span> : <CopyIcon size={14} />}
            </button>
          </div>
          <div className="dshgit-rmenu-divider" />
          <button
            type="button"
            className="dshgit-rmenu-danger"
            onClick={() => {
              onClose()
              onDelete()
            }}
          >
            {t('deleteRemote', { name })}
          </button>
        </div>
      </div>
    </>
  )
}
