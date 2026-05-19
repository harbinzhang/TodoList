#!/usr/bin/env node

/**
 * Heuristic test-quality scanner.
 *
 * Finds likely "mocked boundary without companion coverage" risks and
 * validation-only tests. Treat output as candidates for manual review.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

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

const TEST_FILE_RE = /(?:__tests__\/.*\.(?:test|spec)\.(?:ts|tsx|js|jsx)$|\.(?:test|spec)\.(?:ts|tsx|js|jsx)$)/
const MOCK_RE = /\b(?:vi|jest)\.mock\(\s*['"]([^'"]+)['"]/g
const HIGH_RISK_SOURCE_RE = /\b(fetch|axios|graphql|httpsCallable|addDoc|setDoc|updateDoc|deleteDoc|getDocs|getDoc|writeBatch|runTransaction|fs\.write|send|publish|enqueue)\b/
const BOUNDARY_ASSERTION_RE = /\b(toHaveBeenCalledWith|fetch|axios|httpsCallable|addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction)\b/
const RUNTIME_BEHAVIOR_RE = /\b(handle[A-Z]\w*|record[A-Z]\w*|persist[A-Z]\w*|build[A-Z]\w*|write[A-Z]\w*)\b|\.collection\(|\.doc\(|\.set\(|\.create\(|\.update\(|serverTimestamp|increment|FieldValue\./
const VALIDATION_ONLY_RE = /\b(validatePayload|validateInput|parseInput|parseCallableInput|schema\.parse|safeParse)\b/

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

function read(file) {
  try {
    return readFileSync(file, 'utf8')
  } catch {
    return ''
  }
}

function listTestFiles() {
  return roots
    .flatMap(walk)
    .filter((file) => TEST_FILE_RE.test(file))
    .filter((file) => !match || file.includes(match))
    .sort()
}

function sourceCandidatesFor(moduleName) {
  if (moduleName.startsWith('@/')) {
    const withoutAlias = moduleName.replace(/^@\//, 'src/')
    return [
      `${withoutAlias}.ts`,
      `${withoutAlias}.tsx`,
      `${withoutAlias}.js`,
      `${withoutAlias}.jsx`,
      `${withoutAlias}/index.ts`,
      `${withoutAlias}/index.tsx`,
      `${withoutAlias}/index.js`,
      `${withoutAlias}/index.jsx`,
    ]
  }

  if (moduleName.startsWith('.')) return []
  return []
}

function companionTestsFor(sourceFile) {
  const dir = dirname(sourceFile)
  const stem = basename(sourceFile).replace(/\.(ts|tsx|js|jsx)$/, '')
  const testsDir = join(dir, '__tests__')
  const direct = [
    join(testsDir, `${stem}.test.ts`),
    join(testsDir, `${stem}.test.tsx`),
    join(testsDir, `${stem}.test.js`),
    join(testsDir, `${stem}.test.jsx`),
    join(testsDir, `${stem}.contract.test.ts`),
    join(dir, `${stem}.test.ts`),
    join(dir, `${stem}.test.tsx`),
    join(dir, `${stem}.contract.test.ts`),
  ].filter(existsSync)

  const prefix = existsSync(testsDir)
    ? readdirSync(testsDir)
      .filter((entry) => entry.startsWith(`${stem}.`) && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(entry))
      .map((entry) => join(testsDir, entry))
    : []

  return [...new Set([...direct, ...prefix])].sort()
}

const findings = []
const testFiles = listTestFiles()

for (const testFile of testFiles) {
  const content = read(testFile)
  const seen = new Set()
  for (const matchResult of content.matchAll(MOCK_RE)) {
    const moduleName = matchResult[1]
    if (seen.has(moduleName)) continue
    seen.add(moduleName)

    const sourceFile = sourceCandidatesFor(moduleName).find(existsSync)
    if (!sourceFile) continue

    const source = read(sourceFile)
    const companionTests = companionTestsFor(sourceFile)
    const highRisk = HIGH_RISK_SOURCE_RE.test(source)
    const companionHasBoundaryAssertions = companionTests.some((file) => BOUNDARY_ASSERTION_RE.test(read(file)))

    let risk = 'green'
    if (highRisk && companionTests.length === 0) risk = 'red'
    else if (highRisk && !companionHasBoundaryAssertions) risk = 'yellow'
    else if (!highRisk && companionTests.length === 0) risk = 'yellow'

    findings.push({
      risk,
      type: 'mocked-boundary',
      testFile,
      moduleName,
      sourceFile,
      companionTests,
      note: risk === 'red'
        ? 'High-risk module is mocked by an upper-layer test and has no companion test.'
        : risk === 'yellow'
          ? 'Manual review needed: companion coverage may be missing or too shallow.'
          : 'Companion boundary coverage appears present.',
    })
  }

  if (VALIDATION_ONLY_RE.test(content)) {
    const contentWithoutValidationNames = content.replace(VALIDATION_ONLY_RE, '')
    const hasRuntimeBehavior = RUNTIME_BEHAVIOR_RE.test(contentWithoutValidationNames)
    if (!hasRuntimeBehavior) {
      findings.push({
        risk: 'yellow',
        type: 'validation-only-test',
        testFile,
        moduleName: null,
        sourceFile: null,
        companionTests: [],
        note: 'Test appears focused on validation/parsing; inspect whether runtime writes, return shape, or side effects need direct coverage.',
      })
    }
  }
}

const summary = findings.reduce((acc, finding) => {
  acc[finding.risk] = (acc[finding.risk] ?? 0) + 1
  return acc
}, {})

if (jsonMode) {
  console.log(JSON.stringify({ findings, summary }, null, 2))
  process.exit(0)
}

if (markdownMode) {
  console.log('# Test Quality Audit Candidates')
  console.log('')
  console.log(`Candidates: ${findings.length} (red ${summary.red ?? 0}, yellow ${summary.yellow ?? 0}, green ${summary.green ?? 0})`)
  console.log('')
  console.log('| Risk | Type | Evidence | Companion / Source | Note |')
  console.log('|---|---|---|---|---|')
  for (const finding of findings.sort((a, b) => a.risk.localeCompare(b.risk) || a.testFile.localeCompare(b.testFile))) {
    const evidence = finding.moduleName ? `${finding.testFile} mocks ${finding.moduleName}` : finding.testFile
    const companion = finding.companionTests.length ? finding.companionTests.join(', ') : finding.sourceFile || '-'
    console.log(`| ${finding.risk} | ${finding.type} | \`${evidence}\` | \`${companion}\` | ${finding.note} |`)
  }
  console.log('')
  console.log('Treat this as a heuristic shortlist. Read source and tests before making a final quality judgment.')
  process.exit(0)
}

console.log(`Found ${findings.length} test quality candidates.`)
for (const finding of findings) {
  const target = finding.moduleName ? ` -> ${finding.moduleName}` : ''
  console.log(`[${finding.risk}] ${finding.type}: ${finding.testFile}${target}`)
}
