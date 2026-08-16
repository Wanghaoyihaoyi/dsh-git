import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'D:/Project/dsh-git-plugin/fetched';
mkdirSync(OUT, { recursive: true });

async function get(url, headers = {}) {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'dsh-research', ...headers },
    redirect: 'follow',
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

const repos = [
  'vlln/plugin-registry',
  'YELEBAI/dsh-plugin-marketplace',
  'HubaKing/dsh-community-plugins',
  '0xsline/awesome-deepseek-harness',
  'NanmiCoder/dsh-agent-teams',
];

const files = [
  ['README.md', 'README.md'],
  ['README.zh.md', 'README.zh.md'],
  ['README_ZH.md', 'README_ZH.md'],
];

for (const repo of repos) {
  for (const branch of ['main', 'master']) {
    for (const [remote, local] of files) {
      const url = `https://raw.githubusercontent.com/${repo}/${branch}/${remote}`;
      const name = `community__${repo.replace('/', '__')}__${branch}__${local}`;
      try {
        const t = await get(url);
        writeFileSync(join(OUT, name), t);
        console.log(`OK  ${repo}@${branch} ${remote} (${t.length} bytes)`);
      } catch (e) {
        console.log(`--  ${repo}@${branch} ${remote}: ${e.message}`);
      }
    }
  }
}

// Discussion page HTML fallback (GitHub web page)
try {
  const t = await get('https://github.com/deepseek-ai/deepseek-harness/discussions/1629');
  writeFileSync(join(OUT, 'discussion1629.html'), t);
  console.log(`OK  discussion1629.html (${t.length} bytes)`);
} catch (e) {
  console.log(`ERR discussion html: ${e.message}`);
}

console.log('=== DONE ===');
