// Panel stylesheet, injected once at module materialization (same pattern as the
// shipped @deepseek-ai/dsh-client-ui-* bundles).
//
// Uses the real dsh design-platform tokens (see @deepseek-ai/dsh-client-ui-theme
// lib/styles/design-platform.css) so the panel inherits the shell's light/dark
// theme and bluish-neutral palette instead of hardcoded grays:
//   - surface/border: --dsw-specific-sidebar-fill, --dsw-alias-border-l2/l3
//   - text:           --dsw-alias-label-primary / -secondary
//   - hover/active:   --dsw-alias-interactive-bg-hover / -active
//   - error:          --dsw-alias-state-error-primary / -secondary,
//                     --dsw-alias-interactive-bg-hover-danger
export const PANEL_CSS = `
.dshgit-root{width:100%;height:100%;box-sizing:border-box;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:14px}
.dshgit-foot{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:36px;box-sizing:border-box;padding:0 10px;border:none;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:14px;font-family:inherit}
.dshgit-foot:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshgit-foot-active{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshgit-foot-wide{justify-content:flex-start}
.dshgit-foot-label{flex:1;text-align:left}
.dshgit-panel{width:100%;height:100%;display:flex;flex-direction:column}
.dshgit-root-floating{position:fixed;inset:0;pointer-events:none;z-index:20}
.dshgit-panel-floating{position:absolute;top:0;right:0;bottom:0;width:320px;pointer-events:auto;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:14px;border-left:1px solid var(--dsw-alias-border-l3)}
.dshgit-header{flex:none;padding:12px 12px 0;position:relative;border-bottom:1px solid transparent}
.dshgit-header:after{content:"";background:var(--dsw-alias-border-l2);height:1px;position:absolute;bottom:1px;left:0;right:0}
.dshgit-title-row{display:flex;align-items:center;gap:6px;min-height:32px}
.dshgit-title{flex:1;font-weight:500;font-size:14px}
.dshgit-ghost{background:transparent;border:none;color:var(--dsw-alias-label-secondary);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;font-size:14px;line-height:1}
.dshgit-ghost:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshgit-ghost:disabled{opacity:.4;cursor:default}
.dshgit-body{flex:1;min-height:0;padding:12px;display:flex;flex-direction:column;gap:12px;overflow:hidden}
.dshgit-lists{flex:1;min-height:0;display:flex;flex-direction:column;gap:12px;overflow-y:auto;margin-right:-12px;padding-right:12px}
.dshgit-lists::-webkit-scrollbar{width:8px}
.dshgit-lists::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2);border-radius:4px}
.dshgit-lists::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-scrollbar-hover-l2)}
.dshgit-empty{display:flex;flex-direction:column;gap:12px;align-items:center;justify-content:center;padding:32px 12px;color:var(--dsw-alias-label-secondary);text-align:center}
.dshgit-branch{display:flex;align-items:center;gap:6px;min-width:0;color:var(--dsw-alias-label-secondary);margin-top:4px;padding:0 0 11px;font-size:13px;line-height:16px}
.dshgit-input-box{display:flex;align-items:center;height:38px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l3);border-radius:8px;overflow:hidden;background:transparent}
.dshgit-input-box:focus-within{border-color:var(--dsw-alias-state-business-primary)}
.dshgit-input{flex:1;min-width:0;height:36px;box-sizing:border-box;margin:0;padding:0 10px;border:none;outline:none;background:transparent;color:var(--dsw-alias-label-primary);font-size:14px;font-family:inherit;line-height:36px;appearance:none}
.dshgit-input::placeholder{color:var(--dsw-alias-label-secondary)}
.dshgit-input:disabled{opacity:.6}
.dshgit-sparkle{flex:none;width:36px;height:36px;box-sizing:border-box;margin:0;padding:0;background:transparent;border:none;border-left:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;border-radius:0}
.dshgit-sparkle:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshgit-sparkle:disabled{opacity:.4;cursor:default}
.dshgit-action{width:100%}
.dshgit-group{flex:none;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;overflow:hidden}
.dshgit-group-head{display:flex;align-items:center;gap:6px;padding:8px 10px;cursor:pointer;user-select:none;color:var(--dsw-alias-label-primary)}
.dshgit-group-head:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshgit-group-head .dshgit-count{color:var(--dsw-alias-label-secondary);font-size:12px}
.dshgit-group-head .dshgit-spacer{flex:1}
.dshgit-row{display:flex;align-items:center;gap:8px;padding:5px 10px;border-top:1px solid var(--dsw-alias-border-l2)}
.dshgit-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshgit-fileicon{flex:none;display:inline-flex;align-items:center}
.dshgit-path{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px}
.dshgit-error{flex:none;padding:8px 12px;border-top:1px solid var(--dsw-alias-state-error-secondary);color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-interactive-bg-hover-danger);font-size:13px;line-height:18px;word-break:break-all}
.dshgit-branch-btn{display:flex;align-items:center;gap:6px;min-width:0;max-width:70%;border:none;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;padding:0;font-size:13px;line-height:16px;font-family:inherit}
.dshgit-branch-btn:hover{color:var(--dsw-alias-label-primary)}
.dshgit-branch-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshgit-caret{flex:none;font-size:10px}
.dshgit-pull{flex:none;display:inline-flex;align-items:center;justify-content:center;width:20px;height:16px;box-sizing:border-box;border:none;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;padding:0;border-radius:4px}
.dshgit-pull:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshgit-pull:disabled{opacity:.4;cursor:default}
.dshgit-branch-spacer{flex:1}
.dshgit-remote{display:flex;align-items:center;gap:2px;flex:none;min-width:0}
.dshgit-remote-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:96px}
.dshgit-remote-dots{border:none;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;padding:0 2px;font-size:12px;line-height:16px;font-family:inherit}
.dshgit-remote-dots:hover{color:var(--dsw-alias-label-primary)}
.dshgit-remote-add{border:none;background:transparent;color:var(--dsw-alias-state-business-primary);cursor:pointer;padding:0;font-size:13px;line-height:16px;font-family:inherit}
.dshgit-remote-add:hover{text-decoration:underline}
.dshgit-backdrop{position:fixed;inset:0;z-index:1000;background:transparent}
.dshgit-bmenu{position:fixed;z-index:1001;width:240px;box-sizing:border-box;background:var(--dsw-specific-menu,var(--dsw-alias-bg-base));color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l3);border-radius:12px;box-shadow:var(--dsw-shadow-lv3,0 8px 24px rgba(0,0,0,.18));overflow:hidden;font-size:13px}
.dshgit-bmenu-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dshgit-bmenu-title{color:var(--dsw-alias-label-secondary);font-weight:500}
.dshgit-bmenu-add{border:none;background:transparent;color:var(--dsw-alias-state-business-primary);cursor:pointer;padding:0;font-size:13px;font-family:inherit}
.dshgit-bmenu-add:hover{text-decoration:underline}
.dshgit-bmenu-input{flex:1;min-width:0;height:28px;box-sizing:border-box;margin:0;padding:0 8px;border:1px solid var(--dsw-alias-border-l3);border-radius:6px;outline:none;background:transparent;color:var(--dsw-alias-label-primary);font-size:13px;font-family:inherit}
.dshgit-bmenu-list{max-height:240px;overflow-y:auto}
.dshgit-bmenu-row{display:flex;align-items:center;gap:4px;padding:0 4px}
.dshgit-bmenu-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshgit-bmenu-item{flex:1;min-width:0;display:flex;align-items:center;gap:6px;border:none;background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer;padding:7px 6px;font-size:13px;font-family:inherit;text-align:left}
.dshgit-bmenu-check{flex:none;color:var(--dsw-alias-state-business-primary);font-size:12px}
.dshgit-bmenu-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshgit-bmenu-dots{border:none;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;padding:0 6px;font-size:13px;line-height:1;font-family:inherit}
.dshgit-bmenu-dots:hover{color:var(--dsw-alias-label-primary)}
.dshgit-bmenu-empty{color:var(--dsw-alias-label-secondary);padding:12px;text-align:center}
.dshgit-modal-input{width:100%;height:36px;box-sizing:border-box;margin:0;padding:0 10px;border:1px solid var(--dsw-alias-border-l3);border-radius:8px;outline:none;background:transparent;color:var(--dsw-alias-label-primary);font-size:14px;font-family:inherit}
.dshgit-modal-text{margin:0;color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}
.dshgit-history{flex:0 0 auto;min-height:0;display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;overflow:hidden}
.dshgit-history-open{flex:1 1 0}
.dshgit-history-head{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:8px 10px;cursor:pointer;user-select:none;color:var(--dsw-alias-label-primary)}
.dshgit-history-head:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshgit-history-left{display:flex;align-items:center;gap:6px;min-width:0}
.dshgit-history-caret{flex:none;font-size:10px}
.dshgit-history-title{font-size:13px}
.dshgit-log-viewport{flex:1;min-height:0;overflow-y:auto;border-top:1px solid var(--dsw-alias-border-l2)}
.dshgit-log-viewport::-webkit-scrollbar{width:8px}
.dshgit-log-viewport::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2);border-radius:4px}
.dshgit-log-viewport::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-scrollbar-hover-l2)}
.dshgit-log-empty{display:flex;align-items:center;justify-content:center;padding:16px;color:var(--dsw-alias-label-secondary);font-size:13px}
.dshgit-log-graph{flex:none;display:block;overflow:visible}
.dshgit-log-dot{fill:var(--dsw-alias-state-business-primary)}
.dshgit-log-commit{min-width:0;display:flex;align-items:center;gap:4px;border:none;background:transparent;cursor:pointer;padding:0 10px 0 0;font-family:inherit;text-align:left;box-sizing:border-box}
.dshgit-log-commit:hover .dshgit-log-subject{color:var(--dsw-alias-state-business-primary)}
.dshgit-log-ref{flex:none;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 6px;border-radius:4px;font-size:11px;line-height:16px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}
.dshgit-log-ref-current{color:var(--dsw-alias-state-business-primary);font-weight:500}
.dshgit-log-ref-tag{color:var(--dsw-alias-label-primary)}
.dshgit-log-subject{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);font-size:13px}
.dshgit-log-files{padding:4px 0}
.dshgit-log-file{display:flex;align-items:center;gap:8px;height:22px;box-sizing:border-box;padding:0 10px 0 0}
.dshgit-log-files-note{display:flex;align-items:center;height:28px;box-sizing:border-box;padding:0 10px 0 0;color:var(--dsw-alias-label-secondary);font-size:12px}
.dshgit-log-files-error{color:var(--dsw-alias-state-error-primary)}
.dshgit-file-status{flex:none;width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;font-size:10px;font-weight:600;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.dshgit-file-status-A{color:#1f9d55;background:rgba(31,157,85,.15)}
.dshgit-file-status-M{color:#c9a227;background:rgba(201,162,39,.15)}
.dshgit-file-status-D{color:#e0554f;background:rgba(224,85,79,.15)}
.dshgit-file-status-R{color:#4a86c8;background:rgba(74,134,200,.15)}
.dshgit-file-status-C{color:#4a86c8;background:rgba(74,134,200,.15)}
.dshgit-file-status-T{color:#8a63d2;background:rgba(138,99,210,.15)}
.dshgit-hover{position:fixed;z-index:1002;max-width:360px;max-height:60vh;overflow-y:auto;box-sizing:border-box;background:var(--dsw-specific-menu,var(--dsw-alias-bg-base));color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l3);border-radius:10px;box-shadow:var(--dsw-shadow-lv3,0 8px 24px rgba(0,0,0,.18));padding:10px 12px;display:flex;flex-direction:column;gap:8px;font-size:13px}
.dshgit-hover-message{white-space:pre-wrap;word-break:break-word;line-height:20px}
.dshgit-hover-meta{display:flex;flex-direction:column;gap:4px;color:var(--dsw-alias-label-primary)}
.dshgit-hover-label{display:inline-block;width:40px;color:var(--dsw-alias-label-secondary)}
.dshgit-hover-hash{display:flex;align-items:center;gap:8px}
.dshgit-hover-hash-value{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--dsw-alias-label-secondary)}
.dshgit-hover-copy{flex:none;display:inline-flex;align-items:center;gap:4px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;padding:2px;border-radius:4px}
.dshgit-hover-copy:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshgit-hover-copied{font-size:12px;color:var(--dsw-alias-state-business-primary)}
.dshgit-hover-note{color:var(--dsw-alias-label-secondary)}
.dshgit-hover-error{color:var(--dsw-alias-state-error-primary)}
`
