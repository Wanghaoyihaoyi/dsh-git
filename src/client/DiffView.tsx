// One-file unified diff preview, expanded under the change lists when a file
// row is clicked. Shows the diff line-by-line with +/-/hunk/header coloring;
// untracked files fall back to their full content rendered as an addition.
// A close button and clicking the same file again collapse it.
import { useEffect, useRef, useState } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { GitDiffResult } from '../shared/rpc.js'
import type { GitApi } from './rpc.js'

export interface DiffViewProps {
  git: GitApi
  cwd: string
  path: string
  staged: boolean
  visible: boolean
  onClose: () => void
  t: TranslateNS<'git'>
}

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: GitDiffResult }

function lineClass(line: string): string | undefined {
  if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) return 'dshgit-diff-hunk'
  if (line.startsWith('+')) return 'dshgit-diff-add'
  if (line.startsWith('-')) return 'dshgit-diff-del'
  if (line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('new file') || line.startsWith('deleted file')) return 'dshgit-diff-meta'
  return undefined
}

export function DiffView({ git, cwd, path, staged, visible, onClose, t }: DiffViewProps) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const seq = useRef(0)

  useEffect(() => {
    if (!visible) return
    const current = ++seq.current
    setState({ status: 'loading' })
    void git
      .diff(cwd, path, staged)
      .then((data) => {
        if (seq.current !== current) return
        setState({ status: 'ok', data })
      })
      .catch((err) => {
        if (seq.current !== current) return
        setState({ status: 'error', message: err instanceof Error ? err.message : String(err) })
      })
  }, [git, cwd, path, staged, visible])

  if (!visible) return null

  const body = (() => {
    if (state.status === 'loading') return <div className="dshgit-diff-note">{t('loading')}</div>
    if (state.status === 'error') return <div className="dshgit-diff-note dshgit-diff-error">{state.message}</div>
    const data = state.data
    const lines = data.diff !== '' ? data.diff.split('\n') : (data.content ?? '').split('\n')
    return (
      <div className="dshgit-diff-pre">
        {lines.map((line, i) => {
          const cls = lineClass(line)
          return (
            <div key={i} className={cls === undefined ? undefined : cls}>
              <span className="dshgit-diff-line">{line || ' '}</span>
            </div>
          )
        })}
        {data.truncated ? <div className="dshgit-diff-note">{t('diffTruncated')}</div> : null}
      </div>
    )
  })()

  return (
    <div className="dshgit-diff">
      <div className="dshgit-diff-head">
        <span className="dshgit-diff-title" title={path}>
          {path}
          {staged ? ` · ${t('stagedChanges')}` : ` · ${t('changes')}`}
        </span>
        <button type="button" className="dshgit-diff-close" title={t('close')} onClick={onClose}>
          <span style={{ fontSize: 12 }}>✕</span>
        </button>
      </div>
      <div className="dshgit-diff-body">{body}</div>
    </div>
  )
}
