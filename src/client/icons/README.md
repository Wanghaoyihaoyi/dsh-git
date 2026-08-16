# 图标目录（放你自己的 SVG 到这里）

面板图标目前是 `src/client/icons.tsx` 里的占位实现。DSH 的图标规范：

- 每个图标是一个 React 组件，props 形状为 `{ size?: number; className?: string }`。
- 颜色一律 `fill="currentColor"`，跟随主题（不能写死色值）。
- 建议 `viewBox="0 0 16 16"`（16×16 网格）。

需要替换的图标（在 `src/client/icons.tsx` 中）：
- `GitIcon` —— 侧栏开关 / 分支
- `SparkleIcon` —— AI 生成提交信息
- `PushIcon` —— 推送
- `RefreshIcon` —— 刷新

替换方式（二选一）：
1. 直接改 `src/client/icons.tsx` 里的 SVG path。
2. 把你的 `.svg` 文件放进本目录，然后在 `src/client/icons.tsx` 里 `import` 并包一层，例如：

```tsx
import myGit from './icons/git.svg' // 前提是构建配置支持 svg import
```

> 注意：当前 `build.mjs` 用 esbuild，未配置 SVG 作为 React 组件的 loader。
> 如果你要放独立 `.svg` 文件，最省事的做法是直接把 SVG 的 `path` 内容粘贴进
> `src/client/icons.tsx` 的 `<path d="..." />`，保持 `fill="currentColor"` 即可。
