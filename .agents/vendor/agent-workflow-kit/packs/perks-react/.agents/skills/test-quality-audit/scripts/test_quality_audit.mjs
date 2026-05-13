#!/usr/bin/env node

/**
 * Heuristic test-quality scanner.
 *
 * Finds likely "mocked boundary without companion coverage" risks and
 * validation-only callable tests. Treat output as candidates for manual review.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { execSync } from 'node:child_process'

const args = process.argv.slice(2)
const jsonMode = args.includes('--json')
const markdownMode = args.includes('--markdown')
const matchIndex = args.indexOf('--match')
const match = matchIndex >= 0 ? args[matchIndex + 1] : null

if (matchIndex >= 0 && !match) {
  console.error('Missing value for --match')
  process.exit(1)
}

const TEST_FILE_RE = /(?:__tests__\/.*\.(?:test|spec)\.(?:ts|tsx)$|\.(?:test|spec)\.(?:ts|tsx)$)/
const MOCK_RE = /\bvi\.mock\(\s*['"]([^'"]+)['"]/g
const INTERNAL_BOUNDARY_RE = /^@\/(?:api\/|features\/[^/]+\/api\/)/
const HIGH_RISK_SOURCE_RE = /\b(fetch|httpsCallable|getFunctions|addDoc|setDoc|updateDoc|deleteDoc|getDocs|getDoc|onSnapshot|writeBatch|runTransaction)\b/
const BOUNDARY_ASSERTION_RE = /\b(fetch|httpsCallable|addDoc|setDoc|updateDoc|deleteDoc|getDocs|getDoc|onSnapshot|writeBatch|runTransaction)\b|toHaveBeenCalledWith\([^)]*(?:collection|doc|query|where|body|headers|keepalive)/
const RUNTIME_BEHAVIOR_RE = /\b(handle[A-Z]\w*|record[A-Z]\w*|persist[A-Z]\w*|build[A-Z]\w*|write[A-Z]\w*)\b|\.collection\(|\.doc\(|\.set\(|\.create\(|\.update\(|FieldValue\.|serverTimestamp|increment/

function run(command) {
  return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
}

function listFiles(root) {
  if (!existsSync(root)) return []
  return run(`find ${root} -type f`)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function read(file) {
  try {
    return readFileSync(file, 'utf8')
  } catch {
    return ''
  }
}

function listTestFiles() {
  return [...listFiles('src'), ...listFiles('functions/src'), ...listFiles('tests'), ...listFiles('e2e')]
    .filter((file) => TEST_FILE_RE.test(file))
    .filter((file) => !match || file.includes(match))
    .sort()
}

function sourceForModule(moduleName) {
  if (!INTERNAL_BOUNDARY_RE.test(moduleName)) return null
  const withoutAlias = moduleName.replace(/^@\//, 'src/')
  const candidates = [
    `${withoutAlias}.ts`,
    `${withoutAlias}.tsx`,
    `${withoutAlias}/index.ts`,
    `${withoutAlias}/index.tsx`,
  ]
  return candidates.find((candidate) => existsSync(candidate)) ?? null
}

function companionTestsFor(sourceFile) {
  const dir = dirname(sourceFile)
  const stem = basename(sourceFile).replace(/\.(ts|tsx)$/, '')
  const testsDir = join(dir, '__tests__')
  const candidates = [
    join(testsDir, `${stem}.test.ts`),
    join(testsDir, `${stem}.test.tsx`),
    join(testsDir, `${stem}.contract.test.ts`),
    join(testsDir, `${stem}.contract.test.tsx`),
    join(dir, `${stem}.test.ts`),
    join(dir, `${stem}.test.tsx`),
    join(dir, `${stem}.contract.test.ts`),
    join(dir, `${stem}.contract.test.tsx`),
  ]
  const exactMatches = candidates.filter((candidate) => existsSync(candidate))

  const prefixMatches = existsSync(testsDir)
    ? readdirSync(testsDir)
      .filter((entry) => entry.startsWith(`${stem}.`) && /\.(test|spec)\.(ts|tsx)$/.test(entry))
      .map((entry) => join(testsDir, entry))
    : []

  return [...new Set([...exactMatches, ...prefixMatches])].sort()
}

function mockedBoundaryFindings(testFiles) {
  const findings = []
  for (const testFile of testFiles) {
    const content = read(testFile)
    const seen = new Set()
    for (const matchResult of content.matchAll(MOCK_RE)) {
      const moduleName = matchResult[1]
      if (seen.has(moduleName)) continue
      seen.add(moduleName)

      const sourceFile = sourceForModule(moduleName)
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
        type: 'mocked-boundary',
        risk,
        testFile,
        moduleName,
        sourceFile,
        companionTests,
        highRisk,
        note: risk === 'red'
          ? 'High-risk internal API is mocked by an upper-layer test and has no companion test.'
          : risk === 'yellow'
            ? 'Manual review needed: companion coverage may be missing or too shallow.'
            : 'Companion boundary coverage appears present.',
      })
    }
  }
  return findings
}

function callableValidationOnlyFindings() {
  const tests = listFiles('functions/src/callable')
    .filter((file) => file.endsWith('.test.ts') || file.endsWith('.contract.test.ts'))
    .filter((file) => !file.endsWith('/validation.test.ts'))
    .filter((file) => !match || file.includes(match))

  return tests.flatMap((testFile) => {
    const content = read(testFile)
    const validatesPayload = /\b(validatePayload|parseCallableInput)\b/.test(content)
    if (!validatesPayload) return []

    const hasRuntimeBehavior = RUNTIME_BEHAVIOR_RE.test(content.replace(/validatePayload|parseCallableInput/g, ''))
    if (hasRuntimeBehavior) return []

    const sourceFile = testFile
      .replace(/\.contract\.test\.ts$/, '.ts')
      .replace(/\.test\.ts$/, '.ts')

    return [{
      type: 'validation-only-callable',
      risk: 'yellow',
      testFile,
      sourceFile: existsSync(sourceFile) ? sourceFile : null,
      note: 'Callable test appears focused on input validation; inspect whether runtime writes, return shape, or side effects need direct coverage.',
    }]
  })
}

function summarize(findings) {
  return findings.reduce((acc, finding) => {
    acc[finding.risk] = (acc[finding.risk] ?? 0) + 1
    return acc
  }, {})
}

function markdown(findings) {
  const rows = findings
    .sort((a, b) => {
      const order = { red: 0, yellow: 1, green: 2 }
      return order[a.risk] - order[b.risk] || a.testFile.localeCompare(b.testFile)
    })
    .map((finding) => {
      const evidence = finding.moduleName
        ? `${finding.testFile} mocks ${finding.moduleName}`
        : finding.testFile
      const companion = finding.companionTests?.length
        ? finding.companionTests.join(', ')
        : finding.sourceFile || '-'
      return `| ${finding.risk} | ${finding.type} | \`${evidence}\` | \`${companion}\` | ${finding.note} |`
    })

  const counts = summarize(findings)
  return [
    '# Test Quality Audit Candidates',
    '',
    `Candidates: ${findings.length} (red ${counts.red ?? 0}, yellow ${counts.yellow ?? 0}, green ${counts.green ?? 0})`,
    '',
    '| Risk | Type | Evidence | Companion / Source | Note |',
    '|---|---|---|---|---|',
    ...rows,
    '',
    'Treat this as a heuristic shortlist. Read the source and tests before making a final quality judgment.',
  ].join('\n')
}

const testFiles = listTestFiles()
const findings = [
  ...mockedBoundaryFindings(testFiles),
  ...callableValidationOnlyFindings(),
]

if (jsonMode) {
  console.log(JSON.stringify({ findings, summary: summarize(findings) }, null, 2))
} else if (markdownMode) {
  console.log(markdown(findings))
} else {
  console.log(`Found ${findings.length} test quality candidates.`)
  for (const finding of findings) {
    console.log(`[${finding.risk}] ${finding.type}: ${finding.testFile} ${finding.moduleName ? `-> ${finding.moduleName}` : ''}`)
  }
}
