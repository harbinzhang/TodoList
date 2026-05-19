#!/usr/bin/env node

import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const args = process.argv.slice(2)
const jsonMode = args.includes('--json')
const markdownMode = args.includes('--markdown')
const matchIndex = args.indexOf('--match')
const match = matchIndex >= 0 ? args[matchIndex + 1] : null
const rootsIndex = args.indexOf('--roots')
const roots = rootsIndex >= 0 && args[rootsIndex + 1]
  ? args[rootsIndex + 1].split(',').map((value) => value.trim()).filter(Boolean)
  : ['src', 'functions/src', 'tests', 'e2e']

if (matchIndex >= 0 && !match) {
  console.error('Missing value for --match')
  process.exit(1)
}

const testPattern = /(__tests__\/.*\.(test|spec)\.(ts|tsx|js|jsx)$|\.(test|spec)\.(ts|tsx|js|jsx)$)/

function walk(dir) {
  if (!existsSync(dir)) return []
  const results = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    const stats = statSync(path)
    if (stats.isDirectory()) results.push(...walk(path))
    else if (stats.isFile()) results.push(path)
  }
  return results
}

function classifyLayer(file) {
  if (file.startsWith('e2e/')) return 'e2e'
  if (file.startsWith('tests/')) return 'contract'
  if (file.includes('/api/') || file.includes('/schema/') || file.includes('/contract.')) return 'contract'
  if (file.includes('/components/') || file.includes('/pages/') || file.includes('/providers/')) return 'integration'
  return 'unit'
}

function deriveArea(file) {
  const parts = file.split('/')
  if (parts[0] === 'src' && parts[1]) return parts.slice(1, 3).join('-')
  if (parts[0] === 'functions' && parts[2]) return `functions-${parts[2]}`
  if (parts[0] === 'e2e') return 'e2e'
  if (parts[0] === 'tests') return 'tests'
  return 'other'
}

const entries = roots
  .flatMap(walk)
  .filter((file) => testPattern.test(file))
  .filter((file) => !match || file.includes(match))
  .sort()
  .map((file) => ({
    file,
    area: deriveArea(file),
    layer: classifyLayer(file),
  }))

const summary = entries.reduce((acc, entry) => {
  acc.total += 1
  acc.layers[entry.layer] = (acc.layers[entry.layer] ?? 0) + 1
  acc.areas[entry.area] = (acc.areas[entry.area] ?? 0) + 1
  return acc
}, { total: 0, layers: {}, areas: {} })

if (jsonMode) {
  console.log(JSON.stringify({ summary, entries }, null, 2))
  process.exit(0)
}

if (markdownMode) {
  console.log('# Test Inventory')
  console.log('')
  console.log(`Heuristic classification of ${summary.total} test files.`)
  console.log('')
  console.log('| Layer | Count |')
  console.log('|---|---:|')
  for (const layer of ['unit', 'contract', 'integration', 'e2e']) {
    console.log(`| ${layer} | ${summary.layers[layer] ?? 0} |`)
  }
  console.log('')
  console.log('| Area | Count |')
  console.log('|---|---:|')
  for (const [area, count] of Object.entries(summary.areas).sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`| ${area} | ${count} |`)
  }
  process.exit(0)
}

console.log(JSON.stringify(summary, null, 2))
