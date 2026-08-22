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
.dshgit-lists::-webkit-scrollbar{width:8px}
.dshgit-lists::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2);border-radius:4px}
.dshgit-lists::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-scrollbar-hover-l2)}
.dshgit-empty{display:flex;flex-direction:column;gap:12px;align-items:center;justify-content:center;padding:32px 12px;color:var(--dsw-alias-label-secondary);text-align:center}
.dshgit-branch{display:flex;align-items:center;gap:6px;min-width:0;color:var(--dsw-alias-label-secondary);margin-top:4px;padding:0 0 11px;font-size:13px;line-height:16px}
.dshgit-input-box{display:flex;align-items:center;height:38px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;overflow:hidden;background:var(--dsw-alias-interactive-bg-hover)}
.dshgit-input{flex:1;min-width:0;height:36px;box-sizing:border-box;margin:0;padding:0 10px;border:none;outline:none;background:transparent;color:var(--dsw-alias-label-primary);font-size:14px;font-family:inherit;line-height:36px;appearance:none}
.dshgit-input::placeholder{color:var(--dsw-alias-label-secondary)}
.dshgit-input:disabled{opacity:.6}
.dshgit-sparkle{flex:none;width:36px;height:36px;box-sizing:border-box;margin:0;padding:0;background:transparent;border:none;border-left:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;border-radius:0}
.dshgit-sparkle:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshgit-toolbar{flex:none;display:flex;align-items:center;gap:4px;min-height:0}
.dshgit-tool{flex:none;display:inline-flex;align-items:center;gap:4px;height:26px;box-sizing:border-box;padding:0 8px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:12px;font-family:inherit}
.dshgit-tool:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshgit-tool:disabled{opacity:.4;cursor:default}
.dshgit-tool .dshgit-spacer{flex:1}
.dshgit-danger-ghost{color:var(--dsw-alias-label-secondary)}
.dshgit-danger-ghost:hover{background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary)}
.dshgit-subhead{display:flex;align-items:center;gap:6px;padding:6px 8px 3px 8px;color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:600;letter-spacing:.3px}
.dshgit-row-untracked .dshgit-path{color:var(--dsw-alias-label-secondary)}
.dshgit-stash-list{display:flex;flex-direction:column;gap:2px;max-height:200px;overflow-y:auto;margin-top:12px;border-top:1px solid var(--dsw-alias-border-l2);padding-top:8px}
.dshgit-stash-row{display:flex;align-items:center;gap:6px;border-radius:6px}
.dshgit-stash-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshgit-stash-apply{flex:1;min-width:0;display:flex;align-items:center;gap:6px;border:none;background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer;padding:6px 8px;font-size:13px;font-family:inherit;text-align:left}
.dshgit-stash-message{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshgit-stash-empty{color:var(--dsw-alias-label-secondary);padding:12px 0;text-align:center;font-size:12px}
.dshgit-viewer{position:fixed;z-index:1003;left:50%;top:50%;transform:translate(-50%,-50%);width:min(640px,90vw);max-height:70vh;display:flex;flex-direction:column;box-sizing:border-box;background:var(--dsw-specific-menu,var(--dsw-alias-bg-base));color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l3);border-radius:10px;box-shadow:var(--dsw-shadow-lv3,0 8px 24px rgba(0,0,0,.18));overflow:hidden}
.dshgit-viewer-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dshgit-viewer-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px}
.dshgit-viewer-body{flex:1;min-height:0;overflow:auto}
.dshgit-viewer-body::-webkit-scrollbar{width:8px}
.dshgit-viewer-body::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2);border-radius:4px}
.dshgit-viewer-pre{margin:0;padding:10px 12px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:18px;white-space:pre;word-break:normal}
.dshgit-sparkle:disabled{opacity:.4;cursor:default}
.dshgit-action{width:100%;border-radius:8px !important}
.dshgit-lists{flex:0 0 auto;min-height:0;display:flex;flex-direction:column;overflow-y:auto;margin-right:-12px;padding-right:12px;max-height:45%}
.dshgit-lists::-webkit-scrollbar{width:8px}
.dshgit-lists::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2);border-radius:4px}
.dshgit-cover{flex:1;min-height:0;overflow-y:auto}
.dshgit-input-box:not(:first-child){margin-top:0}
.dshgit-group{flex:none;overflow:hidden}
.dshgit-group+ .dshgit-group{margin-top:4px}
.dshgit-group-head{position:sticky;top:0;z-index:1;display:flex;align-items:center;gap:6px;padding:5px 4px;cursor:pointer;user-select:none;color:var(--dsw-alias-label-primary);font-size:12px;font-weight:600;letter-spacing:.3px;background:var(--dsw-alias-bg-base)}
.dshgit-group-head:hover{color:var(--dsw-alias-state-business-primary)}
.dshgit-group-head .dshgit-count{color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:400;background:var(--dsw-alias-interactive-bg-hover);border-radius:8px;padding:0 6px;line-height:16px}
.dshgit-group-head .dshgit-spacer{flex:1}
.dshgit-group-body{display:flex;flex-direction:column;min-height:0}
.dshgit-row{display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:6px}
.dshgit-row+.dshgit-row{margin-top:1px}
.dshgit-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshgit-row-clickable{cursor:pointer}
.dshgit-row-active{background:var(--dsw-alias-interactive-bg-active)}
.dshgit-fileicon{flex:none;display:inline-flex;align-items:center}
.dshgit-path{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px}
.dshgit-tabs{flex:none;display:flex;align-items:stretch;gap:4px;padding:0 12px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dshgit-tab{flex:none;border:none;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;padding:9px 2px;margin:0 10px;font-size:13px;font-family:inherit;border-bottom:2px solid transparent;box-sizing:border-box}
.dshgit-tab:hover{color:var(--dsw-alias-label-primary)}
.dshgit-tab-active{color:var(--dsw-alias-state-business-primary);border-bottom-color:var(--dsw-alias-state-business-primary);font-weight:500}
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
.dshgit-rmenu{width:260px}
.dshgit-rmenu-url-row{display:flex;align-items:center;gap:8px;padding:8px 10px}
.dshgit-rmenu-url{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;color:var(--dsw-alias-label-primary)}
.dshgit-rmenu-copy{flex:none;display:inline-flex;align-items:center;gap:4px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;padding:2px 4px;border-radius:4px}
.dshgit-rmenu-copy:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshgit-rmenu-copied{font-size:12px;color:var(--dsw-alias-state-business-primary)}
.dshgit-rmenu-divider{height:1px;background:var(--dsw-alias-border-l2);margin:2px 0}
.dshgit-rmenu-item{display:flex;align-items:center;gap:6px;width:100%;box-sizing:border-box;border:none;background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer;padding:8px 10px;font-size:13px;font-family:inherit;text-align:left}
.dshgit-rmenu-item:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshgit-rmenu-danger{display:flex;align-items:center;gap:6px;width:100%;box-sizing:border-box;border:none;background:transparent;color:var(--dsw-alias-state-error-primary);cursor:pointer;padding:8px 10px;font-size:13px;font-family:inherit;text-align:left}
.dshgit-rmenu-danger:hover{background:var(--dsw-alias-interactive-bg-hover-danger)}
.dshgit-modal-input{width:100%;height:36px;box-sizing:border-box;margin:0;padding:0 10px;border:1px solid var(--dsw-alias-border-l3);border-radius:8px;outline:none;background:transparent;color:var(--dsw-alias-label-primary);font-size:14px;font-family:inherit}
.dshgit-modal-text{margin:0;color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}
.dshgit-history{flex:0 0 auto;min-height:0;display:flex;flex-direction:column;border-top:1px solid var(--dsw-alias-border-l2)}
.dshgit-history-open{flex:1 1 0}
.dshgit-history-head{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:10px 4px 6px;cursor:pointer;user-select:none;color:var(--dsw-alias-label-primary)}
.dshgit-history-head:hover{color:var(--dsw-alias-state-business-primary)}
.dshgit-history-left{display:flex;align-items:center;gap:6px;min-width:0}
.dshgit-history-caret{flex:none;font-size:10px}
.dshgit-history-title{font-size:12px;font-weight:600;letter-spacing:.3px}
.dshgit-log-viewport{flex:1;min-height:0;overflow-y:auto;border-top:1px solid var(--dsw-alias-border-l2)}
.dshgit-log-viewport::-webkit-scrollbar{width:8px}
.dshgit-log-viewport::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2);border-radius:4px}
.dshgit-log-viewport::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-scrollbar-hover-l2)}
.dshgit-log-empty{display:flex;align-items:center;justify-content:center;padding:16px;color:var(--dsw-alias-label-secondary);font-size:13px}
.dshgit-log-graph{flex:none;display:block;overflow:visible}
.dshgit-log-dot{fill:var(--dsw-alias-state-business-primary)}
.dshgit-log-commit{min-width:0;display:flex;align-items:center;gap:4px;border:none;background:transparent;cursor:pointer;padding:0 10px 0 0;font-family:inherit;text-align:left;box-sizing:border-box;border-radius:4px}
.dshgit-log-commit:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshgit-log-commit:hover .dshgit-log-subject{color:var(--dsw-alias-state-business-primary)}
.dshgit-log-ref{flex:none;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 6px;border-radius:4px;font-size:11px;line-height:16px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}
.dshgit-log-ref-current{color:var(--dsw-alias-state-business-primary);font-weight:500}
.dshgit-log-ref-branch{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}
.dshgit-log-ref-tag{color:#8a63d2;background:rgba(138,99,210,.12)}
.dshgit-log-ref-remote{color:#0078d4;background:rgba(0,120,212,.10)}
.dshgit-log-ref-head{color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-interactive-bg-active);font-weight:500}
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
.dshgit-hover-message{white-space:pre-wrap;word-break:break-word;line-height:20px;padding-bottom:8px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dshgit-hover-meta{display:flex;flex-direction:column;gap:4px;color:var(--dsw-alias-label-primary);padding-top:8px}
.dshgit-hover-label{display:inline-block;width:40px;color:var(--dsw-alias-label-secondary)}
.dshgit-hover-hash{display:flex;align-items:center;gap:8px}
.dshgit-hover-hash-value{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--dsw-alias-label-secondary)}
.dshgit-hover-copy{flex:none;display:inline-flex;align-items:center;gap:4px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;padding:2px;border-radius:4px}
.dshgit-hover-copy:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshgit-hover-copied{font-size:12px;color:var(--dsw-alias-state-business-primary)}
.dshgit-hover-note{color:var(--dsw-alias-label-secondary)}
.dshgit-hover-error{color:var(--dsw-alias-state-error-primary)}
.dshgit-foot-update{flex:none;display:inline-flex;align-items:center;color:var(--dsw-alias-state-business-primary)}
.dshgit-update-link{flex:none;border:none;background:transparent;color:var(--dsw-alias-state-business-primary);cursor:pointer;padding:0;font-size:13px;line-height:16px;font-family:inherit}
.dshgit-update-link:hover{text-decoration:underline}
.dshgit-update-link:disabled{opacity:.6;cursor:default}
.dshgit-notice{flex:none;padding:8px 12px;border-top:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-interactive-bg-hover);font-size:13px;line-height:18px;word-break:break-all}
.dshgit-fs{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.dshgit-fs-tree{flex:1;min-height:120px;overflow-y:auto}
.dshgit-fs-tree::-webkit-scrollbar{width:8px}
.dshgit-fs-tree::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2);border-radius:4px}
.dshgit-fs-tree::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-scrollbar-hover-l2)}
.dshgit-fs-dir-row{display:flex;align-items:center;gap:6px;width:100%;min-width:0;box-sizing:border-box;border:none;background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer;font-family:inherit;font-size:13px;text-align:left;padding-top:5px;padding-bottom:5px}
.dshgit-fs-dir-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshgit-fs-caret{flex:none;width:10px;font-size:10px;color:var(--dsw-alias-label-secondary);text-align:center}
.dshgit-fs-diricon{flex:none;font-size:12px}
.dshgit-fs-file{display:flex;align-items:center;gap:6px;width:100%;min-width:0;box-sizing:border-box;border:none;background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer;font-family:inherit;font-size:13px;text-align:left;padding-top:5px;padding-bottom:5px}
.dshgit-fs-file:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshgit-fs-file-selected{background:var(--dsw-alias-interactive-bg-active)}
.dshgit-fs-fileicon{flex:none;display:inline-flex;align-items:center;font-size:12px}
.dshgit-fs-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}
.dshgit-fs-size{flex:none;color:var(--dsw-alias-label-secondary);font-size:11px}
.dshgit-fs-note{padding:6px 10px;color:var(--dsw-alias-label-secondary);font-size:12px}
.dshgit-fs-error{color:var(--dsw-alias-state-error-primary)}
.dshgit-fs-preview{flex:0 0 42%;min-height:120px;border-top:1px solid var(--dsw-alias-border-l2);display:flex;flex-direction:column;overflow:hidden}
.dshgit-body-files{overflow:hidden}
.dshgit-fs-preview-head{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dshgit-fs-preview-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:500}
.dshgit-fs-preview-meta{flex:none;color:var(--dsw-alias-label-secondary);font-size:11px}
.dshgit-fs-preview-close{flex:none;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;padding:0;border-radius:5px;font-size:13px;line-height:1}
.dshgit-fs-preview-close:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshgit-fs-preview-body{max-height:220px;overflow:auto;background:var(--dsw-alias-bg-base)}
.dshgit-fs-preview-body::-webkit-scrollbar{width:8px}
.dshgit-fs-preview-body::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2);border-radius:4px}
.dshgit-fs-pre{margin:0;padding:10px 12px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);white-space:pre;word-break:normal}
.dshgit-diff{flex:0 0 auto;max-height:38%;min-height:0;display:flex;flex-direction:column;border-top:1px solid var(--dsw-alias-border-l2)}
.dshgit-diff-head{display:flex;align-items:center;gap:8px;padding:8px 4px 6px}
.dshgit-diff-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:600;letter-spacing:.3px}
.dshgit-diff-close{flex:none;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;padding:0;border-radius:5px;line-height:1}
.dshgit-diff-close:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshgit-diff-body{flex:1;min-height:0;overflow-y:auto;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-base)}
.dshgit-diff-body::-webkit-scrollbar{width:8px}
.dshgit-diff-body::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2);border-radius:4px}
.dshgit-diff-pre{padding:6px 0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:18px}
.dshgit-diff-pre>div{display:flex;white-space:pre;min-width:max-content}
.dshgit-diff-line{padding:0 8px;color:var(--dsw-alias-label-primary)}
.dshgit-diff-add{background:rgba(36,153,84,.16)}
.dshgit-diff-add .dshgit-diff-line{color:#1f9d55}
.dshgit-diff-del{background:rgba(224,85,79,.14)}
.dshgit-diff-del .dshgit-diff-line{color:#e0554f}
.dshgit-diff-hunk{background:var(--dsw-alias-interactive-bg-hover)}
.dshgit-diff-hunk .dshgit-diff-line{color:var(--dsw-alias-label-secondary)}
.dshgit-diff-meta .dshgit-diff-line{color:var(--dsw-alias-label-secondary)}
.dshgit-diff-note{padding:10px 12px;color:var(--dsw-alias-label-secondary);font-size:12px}
.dshgit-diff-error{color:var(--dsw-alias-state-error-primary)}
.dshgit-diff-stats{flex:none;display:inline-flex;align-items:center;gap:6px}
.dshgit-diff-stat-add{color:#1f9d55;font-size:11px;font-weight:600}
.dshgit-diff-stat-del{color:#e0554f;font-size:11px;font-weight:600}
.dshgit-group-conflict .dshgit-group-head{color:var(--dsw-alias-state-error-primary)}
.dshgit-conflict-label{font-weight:600}
.dshgit-conflict-badge{flex:none;width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;background:rgba(224,85,79,.18);color:var(--dsw-alias-state-error-primary);font-size:11px;font-weight:700}
.dshgit-row-conflict .dshgit-path{color:var(--dsw-alias-state-error-primary)}
.dshgit-compare-result{display:flex;flex-direction:column;gap:4px;margin-top:10px}
.dshgit-compare-meta{display:flex;align-items:center;gap:12px;padding:4px 0}
.dshgit-compare-ahead{color:#1f9d55;font-size:12px;font-weight:600}
.dshgit-compare-behind{color:#e0554f;font-size:12px;font-weight:600}
.dshgit-compare-files{color:var(--dsw-alias-label-secondary);font-size:12px}
`
