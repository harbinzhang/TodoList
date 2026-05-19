#!/usr/bin/env node

import { execFileSync, execSync } from 'node:child_process'

const args = process.argv.slice(2)
const jsonMode = args.includes('--json')
const markdownMode = args.includes('--markdown')
const matchIndex = args.indexOf('--match')
const match = matchIndex >= 0 ? args[matchIndex + 1] : null

if (matchIndex >= 0 && !match) {
  console.error('Missing value for --match')
  process.exit(1)
}

const testPattern = /(__tests__\/.*\.(test|spec)\.(ts|tsx)$|\.test\.(ts|tsx)$|\.spec\.(ts|tsx)$)/
const searchRoots = ['src', 'functions/src', 'tests', 'e2e']

function listFiles() {
  const existingRoots = searchRoots.filter((r) => {
    try { execSync(`test -d ${r}`, { stdio: 'ignore' }); return true } catch { return false }
  })
  if (existingRoots.length === 0) return []
  const output = execSync(`find ${existingRoots.join(' ')} -type f`, { encoding: 'utf8' })
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => testPattern.test(file))
    .filter((file) => !match || file.includes(match))
    .sort()
}

function classifyLayer(file) {
  if (file.startsWith('e2e/tests/')) {
    return { layer: 'e2e', rationale: 'Browser or device flow under e2e/tests' }
  }

  if (file.startsWith('tests/')) {
    return { layer: 'contract', rationale: 'Rules or boundary test in top-level tests/' }
  }

  if (
    file.includes('/api/__tests__/') ||
    file.startsWith('functions/src/callable/') ||
    file.startsWith('functions/src/triggers/') ||
    file.startsWith('functions/src/templates/') ||
    file.startsWith('functions/src/features/') ||
    file.startsWith('src/shared/schema/') ||
    file.includes('cardSchema.test.ts')
  ) {
    return { layer: 'contract', rationale: 'Boundary, schema, callable, trigger, or API-facing test' }
  }

  if (
    file.startsWith('src/app/__tests__/') ||
    file.includes('/providers/__tests__/') ||
    file.includes('/components/__tests__/') ||
    file.includes('/pages/__tests__/') ||
    file.includes('/contexts/__tests__/')
  ) {
    return { layer: 'integration', rationale: 'Rendered or composed UI/provider/context test' }
  }

  return { layer: 'unit', rationale: 'Logic-focused test by heuristic fallback' }
}

function deriveArea(file) {
  if (file.startsWith('e2e/tests/')) {
    return file.replace(/^e2e\/tests\//, '').replace(/\.(test|spec)\.(ts|tsx)$/, '')
  }

  if (file.startsWith('tests/')) {
    return 'firestore-rules'
  }

  const parts = file.split('/')
  if (parts[0] === 'src' && parts[1] === 'features' && parts[2]) {
    return parts[2]
  }
  if (parts[0] === 'src' && parts[1] === 'shared' && parts[2]) {
    return `shared-${parts[2]}`
  }
  if (parts[0] === 'src' && parts[1] === 'app') {
    return parts[2] === '__tests__' ? 'app' : `app-${parts[2]}`
  }
  if (parts[0] === 'src' && parts[1] === 'api') {
    return 'api'
  }
  if (parts[0] === 'functions' && parts[1] === 'src' && parts[2]) {
    return `functions-${parts[2]}`
  }
  return 'other'
}

function summarize(entries) {
  const layerCounts = new Map()
  const areaCounts = new Map()

  for (const entry of entries) {
    layerCounts.set(entry.layer, (layerCounts.get(entry.layer) || 0) + 1)

    const areaSummary = areaCounts.get(entry.area) || { unit: 0, contract: 0, integration: 0, e2e: 0, total: 0 }
    areaSummary[entry.layer] += 1
    areaSummary.total += 1
    areaCounts.set(entry.area, areaSummary)
  }

  return {
    total: entries.length,
    layerCounts: Object.fromEntries([...layerCounts.entries()].sort()),
    areaCounts: Object.fromEntries([...areaCounts.entries()].sort(([a], [b]) => a.localeCompare(b))),
  }
}

const entries = listFiles().map((file) => {
  const { layer, rationale } = classifyLayer(file)
  return {
    file,
    area: deriveArea(file),
    layer,
    rationale,
  }
})

const summary = summarize(entries)

if (jsonMode) {
  console.log(JSON.stringify({ summary, entries }, null, 2))
  process.exit(0)
}

if (markdownMode) {
  console.log('# Test Inventory')
  console.log('')
  console.log(`Heuristic classification of ${summary.total} test files.${match ? ` Filter: "${match}".` : ''}`)
  console.log('Treat the layer labels as a starting point, then manually correct obvious mismatches.')
  console.log('')
  console.log('## Layer Counts')
  console.log('')
  console.log('| Layer | Count |')
  console.log('|---|---:|')
  for (const layer of ['unit', 'contract', 'integration', 'e2e']) {
    console.log(`| ${layer} | ${summary.layerCounts[layer] || 0} |`)
  }
  console.log('')
  console.log('## Area Counts')
  console.log('')
  console.log('| Area | Unit | Contract | Integration | E2E | Total |')
  console.log('|---|---:|---:|---:|---:|---:|')
  for (const [area, counts] of Object.entries(summary.areaCounts)) {
    console.log(`| ${area} | ${counts.unit} | ${counts.contract} | ${counts.integration} | ${counts.e2e} | ${counts.total} |`)
  }
  console.log('')
  console.log('## Files By Layer')
  for (const layer of ['unit', 'contract', 'integration', 'e2e']) {
    const layerEntries = entries.filter((entry) => entry.layer === layer)
    if (layerEntries.length === 0) continue
    console.log('')
    console.log(`### ${layer}`)
    console.log('')
    console.log('| Area | File |')
    console.log('|---|---|')
    for (const entry of layerEntries) {
      console.log(`| ${entry.area} | \`${entry.file}\` |`)
    }
  }
  process.exit(0)
}

console.log('# Test Inventory')
console.log('')
console.log(`Heuristic classification of ${summary.total} test files.${match ? ` Filter: "${match}".` : ''}`)
console.log('Treat the layer labels as a starting point, then manually correct obvious mismatches.')
console.log('')
console.log('## Layer Counts')
for (const layer of ['unit', 'contract', 'integration', 'e2e']) {
  console.log(`- ${layer}: ${summary.layerCounts[layer] || 0}`)
}
console.log('')
console.log('## Area Counts')
for (const [area, counts] of Object.entries(summary.areaCounts)) {
  console.log(`- ${area}: unit ${counts.unit}, contract ${counts.contract}, integration ${counts.integration}, e2e ${counts.e2e}, total ${counts.total}`)
}
console.log('')
console.log('## Files')
for (const layer of ['unit', 'contract', 'integration', 'e2e']) {
  const layerEntries = entries.filter((entry) => entry.layer === layer)
  if (layerEntries.length === 0) continue
  console.log('')
  console.log(`### ${layer}`)
  for (const entry of layerEntries) {
    console.log(`- [${entry.area}] ${entry.file}`)
  }
}
