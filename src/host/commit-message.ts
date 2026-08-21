// AI commit-message generation (host side).
//
// Summarizes the working-tree diff up to a character budget, then asks the
// model for a single-line Conventional Commits message in Chinese. The prompt is
// the product requirement, kept verbatim as the system instruction.
import type { Context } from '@deepseek-ai/cordis'
import { BlockAssembler, ReasoningEffortId, createUserMessage } from '@deepseek-ai/dsh-llm'
import type { AgentDefaultModelConfig } from '@deepseek-ai/dsh-agent-default-model'
import { git, stdoutText } from './git.js'

export const SYSTEM_PROMPT = `你是一个 Git Commit Message 生成器。

规则：

- 使用 Conventional Commits 规范
- 只输出一行 commit message
- 禁止输出列表、解释、正文、markdown
- 禁止生成变更详情
- 禁止生成 body/footer
- 长度控制在50字以内

## 风格

采用比较成熟的 Conventional Commits 风格：

\`\`\`text
<type>(scope): <subject>
\`\`\`

示例：
feat(auth): 新增微信登录功能
fix(user): 修复用户头像上传失败问题
refactor(api): 重构统一响应结构
docs(readme): 更新部署文档
style(ui): 调整首页按钮间距

## type 类型

| 类型     | 说明                            |
| -------- | ------------------------------- |
| feat     | 新功能                          |
| fix      | 修复 Bug                        |
| docs     | 文档修改                        |
| style    | 代码格式/样式调整（不影响逻辑） |
| refactor | 重构代码                        |
| perf     | 性能优化                        |
| test     | 测试相关                        |
| chore    | 构建、依赖、脚本等杂项          |
| ci       | CI/CD 配置修改                  |
| build    | 构建系统或依赖变更              |
| revert   | 回滚提交                        |

## scope（作用域）

scope 建议写模块名。

## subject 编写建议

建议：

- 简短
- 清晰
- 一句话说明目的
- 使用动词开头

**必须是中文**`

export interface GenerateCommitMessageOptions {
  cwd: string
  signal?: AbortSignal
  maxDiffChars: number
  provider?: string
  model?: string
  maxTokens?: number
  /** DeepSeek thinking effort: 'off' (default) disables reasoning, 'default' lets the adapter choose. */
  reasoningEffort?: string
}

/**
 * Collect the tracked diff plus a one-line-per-file note for untracked files,
 * truncate to `maxDiffChars`, and generate a one-line commit message.
 */
export async function generateCommitMessage(
  ctx: Context,
  opts: GenerateCommitMessageOptions,
  onText?: (delta: string) => void,
): Promise<string> {
  const maxDiffChars = opts.maxDiffChars > 0 ? opts.maxDiffChars : 4000

  // Prioritize the staging area: when files are staged, generate for them only
  // (`git diff --cached`); otherwise summarize the working tree.
  const stagedProbe = await git(ctx.shell, ['diff', '--cached', '--name-only'], {
    cwd: opts.cwd,
    signal: opts.signal,
  })
  const useStaged = stagedProbe.exitCode === 0 && stdoutText(stagedProbe).trim().length > 0

  const diffResult = await git(
    ctx.shell,
    useStaged ? ['diff', '--cached', '--no-ext-diff'] : ['diff', 'HEAD', '--no-ext-diff'],
    { cwd: opts.cwd, signal: opts.signal },
  )
  const diffText = diffResult.exitCode === 0 ? stdoutText(diffResult) : ''

  const parts: string[] = []
  if (diffText.trim().length > 0) parts.push(diffText)

  if (!useStaged) {
    const lsResult = await git(
      ctx.shell,
      ['ls-files', '--others', '--exclude-standard'],
      { cwd: opts.cwd, signal: opts.signal },
    )
    const untracked = (stdoutText(lsResult) || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    if (untracked.length > 0) {
      parts.push(untracked.map((path) => `new file: ${path}`).join('\n'))
    }
  }

  let summary = parts.join('\n').trim()
  if (summary.length === 0) {
    throw new Error('no changes to commit')
  }
  if (summary.length > maxDiffChars) {
    summary = `${summary.slice(0, maxDiffChars)}\n[diff truncated at ${maxDiffChars} characters]`
  }

  const defaultModel: AgentDefaultModelConfig = ctx.agentDefaultModel
  const selection = defaultModel.currentSelection()
  const provider = opts.provider ?? selection.provider
  const model = opts.model ?? selection.model

  const messages = [
    createUserMessage({
      content: [{ type: 'text', text: summary }],
      source: { kind: 'plugin', plugin: '@wanghaoyihaoyi/dsh-git' },
    }),
  ]

  // A one-line commit message needs no reasoning: disable DeepSeek thinking by
  // default so the token budget goes to the message, not the model's chain of
  // thought (which is what previously consumed the whole budget → "no text").
  const effort = opts.reasoningEffort ?? 'off'
  const reasoningEffort = effort === 'default' ? undefined : ReasoningEffortId(effort)

  const assembler = new BlockAssembler()
  for await (const chunk of ctx.llm.stream({
    provider,
    model,
    messages,
    system: SYSTEM_PROMPT,
    maxTokens: opts.maxTokens ?? 2048,
    reasoningEffort,
    // The DeepSeek adapter force-disables thinking for `purpose: 'session-title'`
    // (the exact path the harness's own session-title generator uses); a commit
    // message is the same kind of auxiliary one-liner, so reuse that purpose so
    // the token budget goes to the message instead of the model's chain of thought.
    purpose: 'session-title',
    signal: opts.signal,
  })) {
    opts.signal?.throwIfAborted()
    assembler.push(chunk)
    if (chunk.type === 'text-delta' && chunk.text.length > 0) onText?.(chunk.text)
  }

  const finish = assembler.finish
  if (finish.kind === 'error' || finish.kind === 'aborted') {
    const failure = finish.failure as { message?: string } | undefined
    throw new Error(failure?.message ?? `commit-message generation failed (${finish.kind})`)
  }
  if (finish.kind === 'tool-calls') {
    throw new Error('commit-message model unexpectedly requested a tool')
  }

  const blocks = assembler.blocks()
  const text = blocks
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim()

  let result = text
  if (result.length === 0) {
    // The model may have spent the whole budget on reasoning and never emitted
    // visible text. Salvage a conventional-commit line from the reasoning as a
    // last resort.
    const reasoning = blocks
      .filter((block) => block.type === 'reasoning')
      .map((block) => block.text)
      .join('')
      .trim()
    const match = /\b(?:feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)\s*(?:\([^)\n]*\))?\s*:\s*.+/.exec(reasoning)
    result = match ? match[0].trim() : ''
  }

  if (result.length === 0) {
    const hint =
      finish.kind === 'max-tokens'
        ? ' — hit maxTokens before any text; increase maxTokens'
        : ` — finish reason: ${finish.kind}`
    throw new Error(`commit-message model produced no text${hint}`)
  }
  return result
}
