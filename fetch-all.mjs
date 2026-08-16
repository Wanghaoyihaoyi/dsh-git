import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'D:/Project/dsh-git-plugin/fetched';
mkdirSync(OUT, { recursive: true });

async function get(url, headers = {}) {
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'dsh-research',
      'Accept': 'application/vnd.github+json',
      ...headers,
    },
    redirect: 'follow',
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.text();
}

// Official repo raw files on master branch
const official = [
  'docs/user/develop/basic/publish.md',
  'docs/user/develop/basic/publish.zh.md',
  'docs/user/develop/basic/index.md',
  'docs/user/develop/basic/index.zh.md',
  'docs/user/develop/basic/config.md',
  'docs/user/develop/basic/tool.md',
  'docs/user/develop/framework/service.md',
  'apps/cli/reference/README.md',
  'apps/cli/reference/README.zh.md',
  'packages/bundle/base/cordis.patch.yml',
  'packages/bundle/web-app/cordis.patch.yml',
  'packages/bundle/base/README.md',
  'packages/bundle/base/package.json',
  'packages/boot/app-boot/package.json',
  'docs/cordis-tutorial/01-first-plugin.md',
  'docs/cordis-primer.zh.md',
  'docs/development.md',
  'docs/cookbook/adding-a-package.md',
];

// Community repos: resolve default branch via API then fetch README
const community = [
  'vlln/plugin-registry',
  'YELEBAI/dsh-plugin-marketplace',
  'HubaKing/dsh-community-plugins',
  '0xsline/awesome-deepseek-harness',
  'NanmiCoder/dsh-agent-teams',
];

const results = [];
function log(msg) { console.log(msg); results.push(msg); }

for (const p of official) {
  const url = `https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/master/${p}`;
  const name = 'official__' + p.replaceAll('/', '__');
  try {
    const t = await get(url);
    writeFileSync(join(OUT, name), t);
    log(`OK  ${p} (${t.length} bytes)`);
  } catch (e) {
    log(`ERR ${p}: ${e.message}`);
  }
}

for (const repo of community) {
  const api = `https://api.github.com/repos/${repo}`;
  try {
    const meta = JSON.parse(await get(api));
    const branch = meta.default_branch || 'main';
    const readmeUrl = `https://raw.githubusercontent.com/${repo}/${branch}/README.md`;
    const name = 'community__' + repo.replace('/', '__') + '__README.md';
    try {
      const t = await get(readmeUrl);
      writeFileSync(join(OUT, name), t);
      log(`OK  ${repo} README (${t.length} bytes) branch=${branch} desc=${meta.description} archived=${meta.archived}`);
    } catch (e) {
      log(`ERR ${repo} README: ${e.message}`);
    }
    // also write meta
    writeFileSync(join(OUT, 'community__' + repo.replace('/', '__') + '__meta.json'), JSON.stringify({ full_name: meta.full_name, description: meta.description, html_url: meta.html_url, stargazers_count: meta.stargazers_count, archived: meta.archived, created_at: meta.created_at, pushed_at: meta.pushed_at, default_branch: branch, homepage: meta.homepage }, null, 2));
  } catch (e) {
    log(`ERR ${repo} meta: ${e.message}`);
  }
}

// Discussion 1629
try {
  const d = JSON.parse(await get('https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions/1629'));
  writeFileSync(join(OUT, 'discussion1629.json'), JSON.stringify(d, null, 2));
  log(`OK  discussion 1629 title=${d.title} state=${d.state}`);
} catch (e) {
  log(`ERR discussion 1629: ${e.message}`);
}

writeFileSync(join(OUT, '_summary.txt'), results.join('\n'));
console.log('\n=== DONE ===');
