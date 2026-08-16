// @majiexuan/dsh-git — client half.
//
// Registers two entries:
//   - the git panel into the layout's right `details` column (docked, squeezes
//     the conversation content like the left sidebar; shadows the shipped
//     tool-output details panel),
//   - a toggle icon above Settings at the sidebar foot (`sidebar.footer.action`).
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { ILayout } from '@deepseek-ai/dsh-client-ui-layout/client'
import { GitPanel } from './GitPanel.js'
import { GitToggleButton } from './GitToggleButton.js'
import { panelStore } from './panelStore.js'
import { createGitApi } from './rpc.js'
import { PANEL_CSS } from './styles.js'

export const name = 'dsh-git-client'
// `layout` is injected so this plugin applies after ui-layout has declared the
// `details` seat and provides `ctx.layout`; `slots` is the registry; `connection`
// carries RPC. The `ILayout` import loads the ui-layout type merges; the
// `ConnectionHandle` import loads `ctx.connection`.
export const inject = ['slots', 'layout', 'connection']

const STYLE_TAG_ID = '@majiexuan/dsh-git/panel.css'

function injectStyles() {
  if (typeof document === 'undefined') return
  if (document.querySelector(`style[data-plugin-css=${JSON.stringify(STYLE_TAG_ID)}]`)) return
  const tag = document.createElement('style')
  tag.dataset.plugin = '@majiexuan/dsh-git'
  tag.dataset.pluginCss = STYLE_TAG_ID
  tag.textContent = PANEL_CSS
  document.head.appendChild(tag)
}

export function apply(ctx: ClientContext) {
  injectStyles()
  // The client connection has no static Context augmentation (the host does);
  // the shipped api-gateway client resolves it the same way.
  const connection = ctx.get('connection') as ConnectionHandle | undefined
  if (connection === undefined) {
    throw new Error('@majiexuan/dsh-git: client connection service is unavailable')
  }
  const git = createGitApi((endpoint, payload, signal) =>
    connection.rpc.call('/api', endpoint, payload, signal),
  )

  const closeGit = () => {
    panelStore.setOpen(false)
    ctx.layout.closeDetails()
  }
  const openGit = () => {
    panelStore.setOpen(true)
    ctx.layout.openDetails()
  }
  const toggleGit = () => {
    if (panelStore.isOpen()) closeGit()
    else openGit()
  }

  // Docked panel (wide viewport): the right `details` column. `priority: -1`
  // shadows the shipped tool-output details panel (lowest priority renders).
  ctx.slots.register(
    { name: 'details', priority: -1, inject: () => ({ git, closeGit, openGit, mode: 'docked' as const }) },
    GitPanel,
  )

  // Floating panel (narrow viewport): the details column auto-closes below
  // `sidebar + 940px`, so fall back to the frame-wide overlay surface.
  ctx.slots.register(
    { name: 'shell.overlay', id: '@majiexuan/dsh-git/panel', inject: () => ({ git, closeGit, openGit, mode: 'floating' as const }) },
    GitPanel,
  )

  // Docked entry: an icon above Settings at the sidebar foot. `slots.inject`
  // waits for ui-sidebar to declare the `sidebar.footer.action` seat.
  ctx.slots.inject('sidebar.footer.action', () =>
    ctx.slots.register(
      {
        name: 'sidebar.footer.action',
        id: '@majiexuan/dsh-git/toggle',
        inject: () => ({ toggleGit }),
      },
      GitToggleButton,
    ),
  )
}
