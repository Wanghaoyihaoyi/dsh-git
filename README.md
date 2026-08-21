# @wanghaoyihaoyi/dsh-git

> Fork of [`@mojiexuan/dsh-git`](https://github.com/mojiexuan/dsh-git) — MIT, © 2026 陈佳宝. Maintained by **Wanghaoyihaoyi**.

A VS Code–like **Git Source Control panel** for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) web UI — repo init, per-file staging, commit/push/publish/pull, branch & remote management, AI commit messages, a workspace file browser, one-file diff previews, and a commit-history graph, all in the browser.

> 中文文档：[docs/README.zh.md](docs/README.zh.md)

## Features

- **Toggleable panel** — an entry above Settings in the sidebar foot opens/closes the panel; the panel header switches between "Git" and "Files" tabs for source control and workspace browsing.
- **Repo detect & init** — a non-repo workspace shows a one-click "Initialize Git repository" (`git init -b main`).
- **Per-file staging** — collapsible "Staged changes" / "Changes" lists with per-file `+`/`−`, plus stage-all / unstage-all.
- **Git-semantic action button** — "Commit" when there are uncommitted changes (auto-stages if nothing is staged), "Push" when the branch tracks a remote and is ahead, "Publish branch" when the branch has no upstream but has local commits.
- **Pull** — one click to fetch the latest from all remotes and branches (`git fetch --all --prune`); shown only when a remote is configured.
- **Branch management** — list / switch / create / delete (with confirmation).
- **Remote management** — the remote pill opens a management menu: fetch URL with one-click copy, and a clearly-separated danger action for removal (confirmation kept).
- **AI commit messages** — streaming, Conventional Commits, generated from the staged/working diff via the harness LLM (Chinese output by default).
- **Commit-history graph** — a lazily-paged SVG lane graph of all branches + remotes (lane topology computed client-side, rounded bends, soft palette), expanded by default at the bottom of the panel to half the panel height, virtual-scrolls and loads the next page as you scroll, expands a commit inline to its changed files, and shows a hover popover with message / author / date / hash (full hash copyable). Commit refs are tinted per kind: branch / tag / remote / HEAD.
- **Workspace file browser** — below the change lists, a lazy directory tree (`.git` and `node_modules` hidden) that previews text files on click, with explicit notices for binary and oversized files; path validation is strictly confined to the workspace root.
- **Auto-refresh** — polls `git status` every 2.5 s so edits, commits and pushes made outside the panel show up.
- **Self-update** — on first open the panel silently checks the npm registry for a newer version; when one exists, an update badge appears on the sidebar entry and a one-click "update now" link shows in the panel header, followed by a restart prompt.
- **i18n** — English and Chinese UI.
- **Cross-platform** — Windows, macOS and Linux; git runs unconfined so native TLS and credential helpers work everywhere.

## Screenshots

| Source-control panel | Commit history |
| --- | --- |
| ![Source-control panel](docs/images/panel.png) | ![Commit history](docs/images/history.png) |

## Install

```sh
dsh plugin --profile web add @wanghaoyihaoyi/dsh-git
```

Then start `dsh web`.

## Uninstall / Update

```sh
# Uninstall (same command for the published package and a local link)
dsh plugin --profile web remove @wanghaoyihaoyi/dsh-git

# Update to the latest published version
dsh plugin --profile web update @wanghaoyihaoyi/dsh-git
```

For a linked local checkout (`dsh plugin --profile web add .`), there is no
separate update step — rebuild with `npm run build`, then fully restart
`dsh web` (host bundle) and refresh the browser (client bundle).

## Build from source

```sh
npm install
npm run build       # lib/index.js (host) + lib/client.js (client)
npm run typecheck
```

## Configuration

Optional overrides in your profile `cordis.patch.yml`:

```yaml
- id: git
  config:
    maxDiffChars: 4000     # cap on the diff text sent to the model (default 4000)
    maxLogEntries: 2000    # max commits per page for the history graph (default 2000; scroll to load more)
    provider: deepseek     # optional — pin the provider (defaults to the deployment model)
    model: deepseek-chat   # optional — pin the model
    reasoningEffort: off   # 'off' (default) disables thinking; 'high'/'max'/'default' passthrough
    registryUrl: https://registry.npmjs.org  # optional — npm registry base for update checks (default npmjs.org)
```

## Structure

```
src/
├── shared/rpc.ts             # endpoint names + DTOs, shared by both halves
├── host/                     # Node half
│   ├── index.ts              # git/* RPC endpoints (loopback-only)
│   ├── git.ts                # ctx.shell wrapper; paths/messages via stdin (no shell injection)
│   ├── commit-message.ts     # diff truncation + ctx.llm.stream generation
│   └── update.ts             # self-update: npm version check + dsh plugin update runner
└── client/                   # browser half
    ├── index.tsx             # slot registration + RPC + locale dictionary
    ├── GitPanel.tsx          # source-control panel UI
    ├── CommitGraph.tsx       # commit-history graph (paged, virtualized)
    ├── graph.ts              # client-side lane/topology calculator
    ├── BranchMenu.tsx        # branch dropdown
    ├── GitToggleButton.tsx   # sidebar-foot toggle
    ├── rpc.ts                # typed RPC wrapper
    ├── locale.ts             # zh/en dictionaries
    ├── fileIcons.tsx         # file-type icons
    ├── icons.tsx             # icon set
    └── styles.ts             # panel stylesheet
```

## Security

- All `git/*` endpoints are registered with `authority: 'loopback'` (127.0.0.1 only).
- User data is never interpolated into command strings — messages go via `git commit -F -`, paths via `--pathspec-from-file=-`, and branch/remote names and URLs are validated against safe character classes.

## Publish

```sh
npm publish
```

Tag the GitHub repo with [`dsh-plugin`](https://github.com/topics/dsh-plugin).

## License

MIT
