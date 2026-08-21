// Locale dictionary for the git panel (namespace `git`). DSH's locale feature
// (dsh-client-locale) requires every shipped locale to be complete — the zh and
// en dictionaries below are checked against this exact key union, and the slot
// registrations declare `locale: 'git'` so the framework injects a typed
// `t: TranslateNS<'git'>` into the components.
import type { LocaleDictOf } from '@deepseek-ai/dsh-client-ui-slots'

export type GitKey =
  | 'title'
  | 'refresh'
  | 'pullAll'
  | 'deleteRemote'
  | 'remoteMenu'
  | 'remoteDetails'
  | 'copyRemoteUrl'
  | 'createRemote'
  | 'noWorkspace'
  | 'notRepo'
  | 'noWorkspaceOpened'
  | 'readingStatus'
  | 'notRepoBody'
  | 'initRepo'
  | 'commitMessagePlaceholder'
  | 'aiGenerate'
  | 'stagedChanges'
  | 'unstageAll'
  | 'unstage'
  | 'changes'
  | 'stageAll'
  | 'stage'
  | 'push'
  | 'publishBranch'
  | 'commit'
  | 'pull'
  | 'add'
  | 'remoteUrlPlaceholder'
  | 'deleteBranchConfirm'
  | 'deleteRemoteConfirm'
  | 'deleteBranch'
  | 'deleteRemoteRepo'
  | 'checkout'
  | 'createBranch'
  | 'addRemote'
  | 'branches'
  | 'newBranchName'
  | 'noBranches'
  | 'deleteBranchHint'
  | 'history'
  | 'refreshHistory'
  | 'noHistory'
  | 'noFileChanges'
  | 'author'
  | 'date'
  | 'copyHash'
  | 'copied'
  | 'generating'
  | 'updateAvailable'
  | 'updateNow'
  | 'updating'
  | 'updateDone'
  | 'files'
  | 'filesTab'
  | 'gitTab'
  | 'fsEmpty'
  | 'fsBinary'
  | 'fsTooLarge'
  | 'fsTruncated'
  | 'fsClosePreview'
  | 'fsOpenHint'
  | 'diffTruncated'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    git: GitKey
  }
}

export const gitZh: LocaleDictOf<'git'> = {
  title: '源代码管理',
  refresh: '刷新',
  pullAll: '从所有远程存储库拉取所有分支最新代码',
  deleteRemote: '删除远程仓库 {name}',
  remoteMenu: '远程仓库管理',
  remoteDetails: '远程：{name}',
  copyRemoteUrl: '复制远程地址',
  createRemote: '创建远程仓库',
  noWorkspace: '暂无工作区',
  notRepo: '非 Git 仓库',
  noWorkspaceOpened: '尚未打开工作区',
  readingStatus: '正在读取仓库状态…',
  notRepoBody: '当前工作区不是 Git 仓库',
  initRepo: '初始化 Git 仓库',
  commitMessagePlaceholder: '提交信息',
  aiGenerate: 'AI 生成提交信息',
  stagedChanges: '暂存的更改',
  unstageAll: '全部取消暂存',
  unstage: '取消暂存',
  changes: '更改',
  stageAll: '全部暂存',
  stage: '暂存',
  push: '推送',
  publishBranch: '发布分支',
  commit: '提交',
  pull: '拉取',
  add: '添加',
  remoteUrlPlaceholder: '远程仓库 URL，例如 https://github.com/user/repo.git',
  deleteBranchConfirm: '确定要删除分支「{name}」吗？此操作不可撤销。',
  deleteRemoteConfirm: '确定要删除远程仓库「{name}」吗？此操作不可撤销。',
  deleteBranch: '删除分支',
  deleteRemoteRepo: '删除远程仓库',
  checkout: '切换分支',
  createBranch: '创建分支',
  addRemote: '添加远程',
  branches: '分支',
  newBranchName: '新分支名',
  noBranches: '暂无分支',
  deleteBranchHint: '删除分支 {name}',
  history: '提交历史',
  refreshHistory: '刷新提交历史',
  noHistory: '无提交历史',
  noFileChanges: '无文件改动',
  author: '作者',
  date: '日期',
  copyHash: '复制完整 hash',
  copied: '已复制',
  generating: '生成提交信息',
  updateAvailable: '有新版本可更新',
  updateNow: '点击立即更新',
  updating: '更新中…',
  updateDone: '已更新到 v{version}，请完全重启 dsh web 并刷新浏览器以生效',
  files: '工作区文件',
  filesTab: '文件',
  gitTab: 'Git',
  fsEmpty: '空目录',
  fsBinary: '二进制文件，暂不支持预览',
  fsTooLarge: '文件过大，暂不预览',
  fsTruncated: '目录条目过多，已截断显示',
  fsClosePreview: '关闭预览',
  fsOpenHint: '双击预览',
  diffTruncated: '差异过大，仅显示前面部分',
}

export const gitEn: LocaleDictOf<'git'> = {
  title: 'Source Control',
  refresh: 'Refresh',
  pullAll: 'Fetch latest code from all remotes and branches',
  deleteRemote: 'Remove remote {name}',
  remoteMenu: 'Remote management',
  remoteDetails: 'Remote: {name}',
  copyRemoteUrl: 'Copy remote URL',
  createRemote: 'Create remote repository',
  noWorkspace: 'No workspace',
  notRepo: 'Not a git repository',
  noWorkspaceOpened: 'No workspace open',
  readingStatus: 'Reading repository status…',
  notRepoBody: 'Current workspace is not a git repository',
  initRepo: 'Initialize Git repository',
  commitMessagePlaceholder: 'Commit message',
  aiGenerate: 'Generate commit message with AI',
  stagedChanges: 'Staged changes',
  unstageAll: 'Unstage all',
  unstage: 'Unstage',
  changes: 'Changes',
  stageAll: 'Stage all',
  stage: 'Stage',
  push: 'Push',
  publishBranch: 'Publish branch',
  commit: 'Commit',
  pull: 'Pull',
  add: 'Add',
  remoteUrlPlaceholder: 'Remote URL, e.g. https://github.com/user/repo.git',
  deleteBranchConfirm: 'Delete branch "{name}"? This cannot be undone.',
  deleteRemoteConfirm: 'Delete remote "{name}"? This cannot be undone.',
  deleteBranch: 'Delete branch',
  deleteRemoteRepo: 'Delete remote repository',
  checkout: 'Switch branch',
  createBranch: 'Create branch',
  addRemote: 'Add remote',
  branches: 'Branches',
  newBranchName: 'New branch name',
  noBranches: 'No branches',
  deleteBranchHint: 'Delete branch {name}',
  history: 'Commit history',
  refreshHistory: 'Refresh commit history',
  noHistory: 'No commit history',
  noFileChanges: 'No file changes',
  author: 'Author',
  date: 'Date',
  copyHash: 'Copy full hash',
  copied: 'Copied',
  generating: 'Generating commit message',
  updateAvailable: 'Update available',
  updateNow: 'Click to update',
  updating: 'Updating…',
  updateDone: 'Updated to v{version}. Fully restart dsh web and refresh the browser to apply.',
  files: 'Workspace files',
  filesTab: 'Files',
  gitTab: 'Git',
  fsEmpty: 'Empty directory',
  fsBinary: 'Binary file; preview unavailable',
  fsTooLarge: 'File too large to preview',
  fsTruncated: 'Too many entries; listing truncated',
  fsClosePreview: 'Close preview',
  fsOpenHint: 'Double-click to preview',
  diffTruncated: 'Diff too large; showing the head only',
}
