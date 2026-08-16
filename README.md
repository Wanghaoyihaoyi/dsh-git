# @majiexuan/dsh-git

A Git source-control sidebar bundle for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) web UI. It docks a source-control panel into the right details column (with a floating-overlay fallback on narrow screens) and brings repo init, per-file staging, commit/push/publish/pull, branch & remote management, AI commit messages, and a commit-history graph into the browser.

> 中文文档：[docs/README.zh.md](docs/README.zh.md)

## Features

- **Toggleable panel** — an entry above Settings in the sidebar foot opens/closes the panel.
- **Repo detect & init** — a non-repo workspace shows a one-click "Initialize Git repository" (`git init -b main`).
- **Per-file staging** — collapsible "Staged changes" / "Changes" lists with per-file `+`/`−`, plus stage-all / unstage-all.
- **Git-semantic action button** — "Commit" when there are uncommitted changes (auto-stages if nothing is staged), "Push" when the branch tracks a remote and is ahead, "Publish branch" when the branch has no upstream but has local commits.
- **Pull** — one click to fetch the latest from all remotes and branches (`git fetch --all --prune`); shown only when a remote is configured.
- **Branch management** — list / switch / create / delete (with confirmation).
- **Remote management** — show / add / remove the origin remote (with confirmation).
- **AI commit messages** — streaming, Conventional Commits, generated from the staged/working diff via the harness LLM (Chinese output by default).
- **Commit-history graph** — an SVG lane graph of `git log --graph --all` (all branches + remotes), collapsed at the bottom of the panel; expands to half the panel height, virtual-scrolls long histories, expands a commit inline to its changed files, and shows a hover popover with message / author / date / hash (full hash copyable).
- **Auto-refresh** — polls `git status` every 2.5 s so edits, commits and pushes made outside the panel show up.
- **i18n** — English and Chinese UI.
- **Cross-platform** — Windows, macOS and Linux; git runs unconfined so native TLS and credential helpers work everywhere.

## Screenshots

| Source-control panel | Commit history |
| --- | --- |
| ![Source-control panel](docs/images/panel.png) | ![Commit history](docs/images/history.png) |

## Install

```sh
dsh plugin --profile web add @majiexuan/dsh-git
```

Then start `dsh web`.

## Uninstall / Update

```sh
# Uninstall (same command for the published package and a local link)
dsh plugin --profile web remove @majiexuan/dsh-git

# Update to the latest published version
dsh plugin --profile web update @majiexuan/dsh-git
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
    maxLogEntries: 2000    # max commit rows loaded for the history graph (default 2000)
    provider: deepseek     # optional — pin the provider (defaults to the deployment model)
    model: deepseek-chat   # optional — pin the model
    reasoningEffort: off   # 'off' (default) disables thinking; 'high'/'max'/'default' passthrough
```

## Structure

```
src/
├── shared/rpc.ts             # endpoint names + DTOs, shared by both halves
├── host/                     # Node half
│   ├── index.ts              # git/* RPC endpoints (loopback-only)
│   ├── git.ts                # ctx.shell wrapper; paths/messages via stdin (no shell injection)
│   └── commit-message.ts     # diff truncation + ctx.llm.stream generation
└── client/                   # browser half
    ├── index.tsx             # slot registration + RPC + locale dictionary
    ├── GitPanel.tsx          # source-control panel UI
    ├── CommitGraph.tsx       # commit-history graph
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
