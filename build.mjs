// Build script for @mojiexuan/dsh-git.
//
// Produces the two artifacts a DSH web bundle ships:
//   - lib/index.js   (host half, ESM, Node)     — the plugin row's entry.
//   - lib/client.js  (client half, factory form) — the web shell's module table
//     loads this classic script; it registers `window.__ModuleLoader__.load(...)`.
//
// The client half must stay a "factory-form CJS bundle": peer packages
// (react, @deepseek-ai/*) are EXTERNAL so the shell's module table resolves them
// through `require(...)` at materialization time, exactly like the shipped
// @deepseek-ai/dsh-client-ui-* bundles.
import { build } from 'esbuild'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const PACKAGE_ID = '@mojiexuan/dsh-git'
const shared = {
  bundle: true,
  sourcemap: false,
  target: ['es2022'],
  logLevel: 'info',
}

// 1. Host half: ESM for Node. Only the platform + peer packages are external.
await build({
  ...shared,
  entryPoints: ['src/host/index.ts'],
  outfile: 'lib/index.js',
  format: 'esm',
  platform: 'node',
  external: ['@deepseek-ai/*', 'react', 'react/*'],
})

// 2. Client half: bundle TSX to a CJS body, then wrap it in the module-loader
//    factory shell the web boot protocol expects.
const client = await build({
  ...shared,
  entryPoints: ['src/client/index.tsx'],
  outfile: 'lib/client.body.js',
  format: 'cjs',
  platform: 'browser',
  jsx: 'automatic',
  external: ['react', 'react/*', '@deepseek-ai/*'],
  write: false,
})

const body = client.outputFiles[0].text
const wrapped = `window.__ModuleLoader__.load({
  id: ${JSON.stringify(PACKAGE_ID)},
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
${body}
    return module.exports;
  },
});
`
mkdirSync(dirname(new URL('./lib/client.js', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), { recursive: true })
writeFileSync('lib/client.js', wrapped)
console.log('built lib/index.js and lib/client.js')
