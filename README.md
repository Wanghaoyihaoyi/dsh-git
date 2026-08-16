# @majiexuan/dsh-git

DeepSeek Harness 的 Git 源代码管理侧栏插件（bundle）。在 Web 界面右侧提供一个可开关的侧栏：检测/初始化 Git 仓库、逐文件暂存/取消暂存、提交、推送，以及用 AI 生成 Conventional Commits 中文提交信息。

## 特性

- **可开关侧栏**：通过右上角浮动按钮打开/关闭（`shell.overlay` 插槽，不替换任何官方界面）。
- **仓库检测与初始化**：非仓库只显示「初始化 Git 仓库」，一键 `git init -b main`。
- **逐文件暂存**：暂存区 / 未暂存区两个可折叠列表，每行 `+`/`−`，另有「全部暂存」。
- **提交/推送按 git 语义切换**：有已暂存改动显示「提交」；已提交未推送（`ahead > 0`）显示「推送」。
- **AI 生成提交信息**：截断汇总 `git diff HEAD` + 未跟踪文件清单（长度可配），调用 LLM 生成一行中文 Conventional Commits 信息。

## 安装

```sh
dsh plugin --profile web add @majiexuan/dsh-git
# 本地开发：
# dsh plugin --profile web add ./path/to/dsh-git
```

随后启动 `dsh web` 即可在右上角看到 Git 图标。

## 本地构建

```sh
npm install        # 或 pnpm install
npm run build      # 产出 lib/index.js（host）与 lib/client.js（client）
npm run typecheck  # 类型检查
```

## 配置（可选，写入 profile 的 cordis.patch.yml）

```yaml
- id: git
  config:
    maxDiffChars: 4000   # 交给模型的 diff 长度上限，超过即截断
    provider: deepseek-official   # 可选，固定模型路由
    model: deepseek-v4-flash
```

## 结构

```
src/
├── shared/rpc.ts          # 端点名 + DTO（双端共用，防止漂移）
├── host/                  # Node 半体
│   ├── index.ts           # apply()：拦截 /api 的 git/* 端点（loopback）
│   ├── git.ts             # ctx.shell 封装 git；消息/路径走 stdin，杜绝 shell 注入
│   └── commit-message.ts  # diff 截断 + ctx.llm.stream 生成
└── client/                # 浏览器半体
    ├── index.tsx          # apply()：注册 shell.overlay 插槽 + 注入 RPC
    ├── GitPanel.tsx       # 侧栏 UI
    ├── rpc.ts             # ctx.connection.rpc.call 的类型化封装
    ├── icons.tsx          # 占位图标（可自行替换 SVG path）
    └── styles.ts          # 面板样式
```

## 发布

```sh
npm publish
```

并在 GitHub 仓库打上 [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic（官方唯一认可的被发现方式）。社区市场（如 awesome-deepseek-harness、dsh-plugin-marketplace）会据此收录。

## 安全边界

所有 `git/*` RPC 端点以 `authority: 'loopback'` 注册，仅接受本机（`127.0.0.1`）请求；命令不拼接用户数据（消息经 `git commit -F -`、路径经 `--pathspec-from-file=-` 走 stdin）。
