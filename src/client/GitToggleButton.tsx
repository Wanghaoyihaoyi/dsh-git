// Docked entry: the "源代码管理" toggle rendered above Settings at the sidebar
// foot (`sidebar.footer.action`, an additive list slot — future plugins add
// their own entries beside it, never replacing ours).
import { useSyncExternalStore } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { SidebarFooterActionOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { panelStore } from './panelStore.js'
import { GitIcon } from './icons.js'

interface GitToggleProps extends SidebarFooterActionOwnerProps {
  toggleGit: () => void
  t: TranslateNS<'git'>
}

export function GitToggleButton({ wide, toggleGit, t }: GitToggleProps) {
  const open = useSyncExternalStore(panelStore.subscribe, panelStore.isOpen)
  return (
    <button
      type="button"
      className={`dshgit-foot${open ? ' dshgit-foot-active' : ''}${wide ? ' dshgit-foot-wide' : ''}`}
      title={t('title')}
      onClick={toggleGit}
    >
      <GitIcon size={16} />
      {wide ? <span className="dshgit-foot-label">{t('title')}</span> : null}
    </button>
  )
}
