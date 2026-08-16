// Branch dropdown menu: anchored below the branch button, with a fixed-width
// list of fixed height (scrollable), an "add branch" header action that turns
// into an inline input, per-branch checkout, and a "…" delete affordance.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { GitBranch } from '../shared/rpc.js'

export interface BranchMenuProps {
  branches: GitBranch[]
  /** False hides the "add branch" action (a fresh repo with no commits cannot branch). */
  canCreate: boolean
  anchor: HTMLElement | null
  onClose: () => void
  onCheckout: (name: string) => void
  onDelete: (name: string) => void
  onCreate: (name: string) => void
  t: TranslateNS<'git'>
}

export function BranchMenu({ branches, canCreate, anchor, onClose, onCheckout, onDelete, onCreate, t }: BranchMenuProps) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Position the menu just below the anchor, fixed so it escapes the details
  // column's overflow clipping.
  useLayoutEffect(() => {
    if (anchor === null) return
    const rect = anchor.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: rect.left })
  }, [anchor])

  // Close on Escape.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (anchor === null || pos === null) return null

  const submit = () => {
    const trimmed = name.trim()
    if (trimmed.length === 0) return
    onCreate(trimmed)
    setName('')
    setAdding(false)
  }

  return (
    <>
      <div className="dshgit-backdrop" onClick={onClose} />
      <div className="dshgit-bmenu" style={{ top: pos.top, left: pos.left }}>
        <div className="dshgit-bmenu-head">
          <span className="dshgit-bmenu-title">{t('branches')}</span>
          {canCreate ? (
            adding ? (
              <input
                ref={inputRef}
                className="dshgit-bmenu-input"
                value={name}
                placeholder={t('newBranchName')}
                spellCheck={false}
                autoFocus
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submit()
                  if (event.key === 'Escape') {
                    setAdding(false)
                    setName('')
                  }
                }}
              />
            ) : (
              <button type="button" className="dshgit-bmenu-add" onClick={() => setAdding(true)}>
                + {t('add')}
              </button>
            )
          ) : null}
        </div>
        <div className="dshgit-bmenu-list">
          {branches.length === 0 ? (
            <div className="dshgit-bmenu-empty">{t('noBranches')}</div>
          ) : (
            branches.map((branch) => (
              <div className="dshgit-bmenu-row" key={branch.name}>
                <button
                  type="button"
                  className="dshgit-bmenu-item"
                  title={branch.name}
                  onClick={() => {
                    onCheckout(branch.name)
                    onClose()
                  }}
                >
                  {branch.current ? <span className="dshgit-bmenu-check">✓</span> : null}
                  <span className="dshgit-bmenu-name">{branch.name}</span>
                </button>
                <button
                  type="button"
                  className="dshgit-bmenu-dots"
                  title={t('deleteBranchHint', { name: branch.name })}
                  onClick={() => {
                    onDelete(branch.name)
                    onClose()
                  }}
                >
                  •••
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
