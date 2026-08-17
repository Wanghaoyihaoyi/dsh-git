// Throwaway visual test for src/client/graph.ts lane topology.
// Run: node test-lanes.mts
import { createCursor, advance, type GraphRow, type GitLogCommit } from './src/client/graph.ts'

function render(rows: GraphRow[]): string[] {
  let maxCol = 0
  for (const r of rows) {
    for (const c of r.cells) {
      const cols = c.kind === 'edge' ? [c.col, c.toCol] : [c.col]
      for (const x of cols) maxCol = Math.max(maxCol, x)
    }
  }
  const out: string[] = []
  for (const r of rows) {
    const chars = new Array(maxCol + 1).fill(' ')
    for (const c of r.cells) {
      if (c.kind === 'dot') chars[c.col] = '*'
      else if (c.kind === 'vline') chars[c.col] = '|'
      else if (c.kind === 'edge') {
        const from = c.col
        const to = c.toCol
        const dir = to > from ? 1 : -1
        const sym = to > from ? '\\' : '/'
        for (let x = from + dir; x !== to + dir; x += dir) {
          if (chars[x] === ' ') chars[x] = sym
        }
      }
    }
    out.push(chars.join(''))
  }
  return out
}

function commit(hash: string, parents: string[]): GitLogCommit {
  return {
    hash,
    shortHash: hash,
    parents,
    author: 'a',
    date: '2020-01-01T00:00:00Z',
    refs: [],
    subject: hash,
  }
}

function dump(name: string, rows: GraphRow[]) {
  console.log('\n===== ' + name + ' =====')
  const ascii = render(rows)
  rows.forEach((row, i) => {
    const cells = row.cells.map((c) => (c.kind === 'edge' ? `${c.col}->${c.toCol}(${c.kind})` : `${c.col}(${c.kind})`)).join(' ')
    const label = row.commit ? ` ${row.commit.subject}` : ''
    const tc = row.textCol !== undefined ? ` textCol=${row.textCol}` : ''
    console.log('  ' + ascii[i].padEnd(14) + ' | ' + cells + label + tc)
  })
}

function run(name: string, commits: GitLogCommit[]) {
  const cursor = createCursor()
  dump(name, advance(cursor, commits))
}

function runPaged(name: string, pages: GitLogCommit[][]) {
  const cursor = createCursor()
  const all: GraphRow[] = []
  pages.forEach((page, i) => {
    const rows = advance(cursor, page)
    dump(`${name} [page ${i + 1}]`, rows)
    all.push(...rows)
  })
  dump(`${name} [combined]`, all)
}

run('diamond A->(B,C); B->D; C->D', [
  commit('A', ['B', 'C']),
  commit('B', ['D']),
  commit('C', ['D']),
  commit('D', []),
])

run('octopus A->(B,C,G)', [
  commit('A', ['B', 'C', 'G']),
  commit('B', []),
  commit('C', []),
  commit('G', []),
])

run('criss-cross A->(B,C); B->(D,E); C->(E,D)', [
  commit('A', ['B', 'C']),
  commit('B', ['D', 'E']),
  commit('C', ['E', 'D']),
  commit('D', []),
  commit('E', []),
])

// fork whose parent already has a reserved lane -> crossesBack (placeLaneAt)
run('crossesBack A->(B,C); B->(D,E); E->C', [
  commit('A', ['B', 'C']),
  commit('B', ['D', 'E']),
  commit('E', ['C']),
  commit('C', []),
  commit('D', []),
])

// criss-cross split across two pages (C lands on page 2 → conservative spacer)
runPaged('criss-cross paged', [
  [commit('A', ['B', 'C']), commit('B', ['D', 'E'])],
  [commit('C', ['E', 'D']), commit('D', []), commit('E', [])],
])
