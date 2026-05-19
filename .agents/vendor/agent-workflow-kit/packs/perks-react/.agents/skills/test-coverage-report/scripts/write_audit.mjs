#!/usr/bin/env node

/**
 * Write Operation Audit Script
 *
 * Audits frontend Firestore write callsites under src/ and reports:
 * - raw frontend write callsites
 * - product write paths (excluding helper-wrapper noise)
 * - validation coverage by category
 * - @write-critical spec count vs interaction-matrix row count
 *
 * Scope note:
 * - Only frontend src/ callsites are included in the main totals
 * - Cloud Functions transaction writes are intentionally out of scope for v1
 *
 * Usage:
 *   node .agents/skills/test-coverage-report/scripts/write_audit.mjs
 *   node .agents/skills/test-coverage-report/scripts/write_audit.mjs --markdown
 *   node .agents/skills/test-coverage-report/scripts/write_audit.mjs --json
 */

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const jsonMode = args.includes('--json')
const markdownMode = args.includes('--markdown')

const TEST_FILE_PATTERN = /(?:__tests__|\.test\.|\.spec\.)/
const NOT_INCLUDED_NOTE = 'Cloud Functions transaction writes are intentionally out of scope for this frontend src/ audit.'

const VALIDATORS = [
  { name: 'assertContractWrite', kind: 'contract' },
  { name: 'assertAppUpdateConfigWrite', kind: 'specialized' },
  { name: 'assertHomeBannerConfigWrite', kind: 'specialized' },
  { name: 'assertOperationalFlagsWrite', kind: 'specialized' },
]

const WRITE_CALL_PATTERNS = [
  { id: 'addDoc', label: 'addDoc', regex: /\baddDoc\s*\(/, mutation: 'create' },
  { id: 'setDoc', label: 'setDoc', regex: /\bsetDoc\s*\(/, mutation: 'set' },
  { id: 'updateDoc', label: 'updateDoc', regex: /\bupdateDoc\s*\(/, mutation: 'update' },
  { id: 'deleteDoc', label: 'deleteDoc', regex: /\bdeleteDoc\s*\(/, mutation: 'delete' },
  { id: 'batch.set', label: 'batch.set', regex: /\bbatch\.set\s*\(/, mutation: 'set' },
  { id: 'batch.update', label: 'batch.update', regex: /\bbatch\.update\s*\(/, mutation: 'update' },
  { id: 'batch.delete', label: 'batch.delete', regex: /\bbatch\.delete\s*\(/, mutation: 'delete' },
  { id: 'createDoc', label: 'createDoc', regex: /\bcreateDoc\s*\(/, mutation: 'create' },
  { id: 'setDocWithId', label: 'setDocWithId', regex: /\bsetDocWithId\s*\(/, mutation: 'set' },
  { id: 'createDocWithId', label: 'createDocWithId', regex: /\bcreateDocWithId\s*\(/, mutation: 'create' },
  { id: 'updateDocById', label: 'updateDocById', regex: /\bupdateDocById\s*\(/, mutation: 'update' },
  { id: 'deleteDocById', label: 'deleteDocById', regex: /\bdeleteDocById\s*\(/, mutation: 'delete' },
]

const NON_PRODUCT_CATEGORIES = new Set(['admin-config', 'admin-catalog', 'helper-wrapper'])

const TOP_LEVEL_FN_PATTERN = /^(?:export\s+(?:default\s+)?)?(?:const|function|async\s+function)\s+([A-Za-z0-9_]+)\s*(?:=\s*(?:async\s*)?\(|[<(=])/

function runCommand(command) {
  return execSync(command, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
}

function listAuditFiles() {
  const output = runCommand(`rg --files src --glob "*.ts" --glob "*.tsx"`)
  return output
    .split('\n')
    .filter(Boolean)
    .filter((file) => !TEST_FILE_PATTERN.test(file))
    .sort()
}

function readFileLines(file) {
  try {
    return readFileSync(file, 'utf8').split('\n')
  } catch {
    return []
  }
}

function buildTopLevelFunctions(lines) {
  const functions = []

  lines.forEach((line, index) => {
    if (/^\s/.test(line)) return
    const match = line.match(TOP_LEVEL_FN_PATTERN)
    if (!match) return

    functions.push({
      name: match[1],
      startLine: index,
      endLine: lines.length,
    })
  })

  for (let i = 0; i < functions.length; i += 1) {
    const next = functions[i + 1]
    if (next) {
      functions[i].endLine = next.startLine
    }
  }

  return functions
}

function isSkippableDeclaration(code) {
  return /^\s*(import|export\s+\{)/.test(code)
}

function getEnclosingTopLevelFunction(functions, lineNumber) {
  let functionName = 'unknown'
  let functionStartLine = Math.max(0, lineNumber - 1)

  for (let i = functions.length - 1; i >= 0; i -= 1) {
    const fn = functions[i]
    if (fn.startLine < lineNumber - 1) {
      functionName = fn.name
      functionStartLine = fn.startLine
      break
    }
  }

  if (functionName === 'unknown') {
    functionStartLine = Math.max(0, lineNumber - 2)
  }

  return { functionName, functionStartLine }
}

function resolveCategory(file) {
  if (file === 'src/shared/lib/firestore.ts') return 'helper-wrapper'
  if (file.startsWith('src/features/admin/pages/')) return 'admin-config'
  if (file === 'src/data/card-products/loader.ts') return 'admin-catalog'
  if (file === 'src/api/topFeedbackApi.ts') return 'top-feedback'
  if (file === 'src/api/feedbackApi.ts') return 'feedback'
  if (file === 'src/api/chatApi.ts') return 'chat'
  if (file === 'src/features/referral/api/referralApi.ts') return 'referral'
  if (file.startsWith('src/features/user/api/') || file.startsWith('src/features/perks/api/')) {
    return 'product-settings'
  }
  return 'product-core'
}

function detectValidatorKind(text) {
  for (const validator of VALIDATORS) {
    const pattern = new RegExp(`\\b${validator.name}\\b`)
    if (pattern.test(text)) {
      return validator.kind
    }
  }

  return null
}

function resolveValidationKind(scanContext, mutation, topLevelFunctions, lines, functionName) {
  if (mutation === 'delete') return 'n/a-delete'

  const directKind = detectValidatorKind(scanContext)
  if (directKind) {
    return directKind
  }

  for (const helperFunction of topLevelFunctions) {
    if (helperFunction.name === functionName) continue
    const helperCallPattern = new RegExp(`\\b${helperFunction.name}\\s*\\(`)
    if (!helperCallPattern.test(scanContext)) continue

    const helperBody = lines
      .slice(helperFunction.startLine, helperFunction.endLine)
      .join('\n')
    const helperKind = detectValidatorKind(helperBody)
    if (helperKind) {
      return helperKind
    }
  }

  return 'none'
}

function collectWriteCalls() {
  const entries = []

  for (const file of listAuditFiles()) {
    const lines = readFileLines(file)
    const topLevelFunctions = buildTopLevelFunctions(lines)

    lines.forEach((line, index) => {
      const code = line.trim()
      if (!code || isSkippableDeclaration(code)) return

      for (const pattern of WRITE_CALL_PATTERNS) {
        if (!pattern.regex.test(code)) continue

        const lineNumber = index + 1
        const { functionName, functionStartLine } = getEnclosingTopLevelFunction(topLevelFunctions, lineNumber)
        const functionContext = lines.slice(functionStartLine, lineNumber).join('\n')
        const localWriteWindow = lines.slice(
          Math.max(0, lineNumber - 1),
          Math.min(lines.length, lineNumber + 5)
        ).join('\n')
        const scanContext = `${functionContext}\n${localWriteWindow}`
        const category = resolveCategory(file)
        const validationKind = resolveValidationKind(
          scanContext,
          pattern.mutation,
          topLevelFunctions,
          lines,
          functionName
        )
        const hasWriteValidation = validationKind !== 'none' && validationKind !== 'n/a-delete'

        entries.push({
          file,
          line: lineNumber,
          code,
          functionName,
          call: pattern.label,
          mutation: pattern.mutation,
          category,
          isProductWrite: !NON_PRODUCT_CATEGORIES.has(category),
          hasWriteValidation,
          validationKind,
        })
      }
    })
  }

  return entries.sort((left, right) =>
    left.file.localeCompare(right.file) || left.line - right.line || left.call.localeCompare(right.call)
  )
}

function findWriteCriticalSpecs() {
  try {
    const output = runCommand('rg -n "@write-critical" e2e/tests --glob "*.spec.ts"')
    return output
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(.+?):(\d+):(.+)$/)
        if (!match) return null
        return {
          file: match[1],
          line: Number.parseInt(match[2], 10),
          testName: match[3].trim().replace(/.*@write-critical\s*/, '').replace(/['",].*/, ''),
        }
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

function countWriteCriticalMatrixRows() {
  try {
    const content = readFileSync('docs/testing/interaction-matrix.md', 'utf8')
    return content
      .split('\n')
      .filter((line) => line.includes('| `@write-critical` |'))
      .length
  } catch {
    return 0
  }
}

function formatEntryLocation(entry) {
  return `${entry.file}:${entry.line}`
}

function printEntryTable(entries) {
  console.log('| Category | Function | Call | Validation | File | Line |')
  console.log('|---|---|---|---|---|---:|')
  for (const entry of entries) {
    console.log(`| \`${entry.category}\` | \`${entry.functionName}\` | \`${entry.call}\` | \`${entry.validationKind}\` | \`${entry.file}\` | ${entry.line} |`)
  }
  console.log('')
}

function printEntries(entries) {
  for (const entry of entries) {
    console.log(`  [${entry.category}] ${entry.functionName}() → ${entry.call} (${entry.validationKind}) at ${formatEntryLocation(entry)}`)
  }
}

const rawWriteCalls = collectWriteCalls()
const productWritePaths = rawWriteCalls.filter((entry) => entry.isProductWrite)
const nonProductWriteCalls = rawWriteCalls.filter((entry) => !entry.isProductWrite)
const deleteOperations = rawWriteCalls.filter((entry) => entry.mutation === 'delete')
const writeCriticalSpecs = findWriteCriticalSpecs()
const writeCriticalMatrixRowCount = countWriteCriticalMatrixRows()

const summary = {
  rawWriteCallCount: rawWriteCalls.length,
  productWriteCallCount: productWritePaths.length,
  validatedWriteCalls: rawWriteCalls.filter((entry) => entry.hasWriteValidation).length,
  validatedProductWriteCalls: productWritePaths.filter((entry) => entry.hasWriteValidation).length,
  deleteWriteCalls: deleteOperations.length,
  writeCriticalSpecCount: writeCriticalSpecs.length,
  writeCriticalMatrixRowCount,
}

if (jsonMode) {
  console.log(JSON.stringify({
    auditScope: 'frontend-src-write-calls',
    notIncluded: [NOT_INCLUDED_NOTE],
    summary,
    rawWriteCalls,
    productWritePaths,
    nonProductWriteCalls,
    deleteOperations,
    writeCriticalSpecs,
  }, null, 2))
  process.exit(0)
}

if (markdownMode) {
  console.log('# Frontend Write Audit')
  console.log('')
  console.log('## Summary')
  console.log('')
  console.log(`- **Raw frontend write callsites**: ${summary.rawWriteCallCount}`)
  console.log(`- **Product write paths**: ${summary.productWriteCallCount}`)
  console.log(`- **Validated write calls**: ${summary.validatedWriteCalls}`)
  console.log(`- **Validated product write calls**: ${summary.validatedProductWriteCalls}`)
  console.log(`- **Delete operations** (schema validation not applicable): ${summary.deleteWriteCalls}`)
  console.log(`- **@write-critical specs**: ${summary.writeCriticalSpecCount}`)
  console.log(`- **@write-critical interaction-matrix rows**: ${summary.writeCriticalMatrixRowCount}`)
  console.log(`- **Not included**: ${NOT_INCLUDED_NOTE}`)
  console.log('')

  console.log('## Product Write Paths')
  console.log('')
  const productNonDelete = productWritePaths.filter((entry) => entry.mutation !== 'delete')
  if (productNonDelete.length > 0) {
    printEntryTable(productNonDelete)
  } else {
    console.log('No non-delete product write paths found.')
    console.log('')
  }

  console.log('## Admin / Helper / Other Non-Product Writes')
  console.log('')
  const nonProductNonDelete = nonProductWriteCalls.filter((entry) => entry.mutation !== 'delete')
  if (nonProductNonDelete.length > 0) {
    printEntryTable(nonProductNonDelete)
  } else {
    console.log('No non-product non-delete write callsites found.')
    console.log('')
  }

  console.log('## Delete Operations')
  console.log('')
  if (deleteOperations.length > 0) {
    printEntryTable(deleteOperations)
  } else {
    console.log('No delete operations found.')
    console.log('')
  }

  console.log('## @write-critical Coverage Cross-Check')
  console.log('')
  console.log(`- **Tagged specs**: ${summary.writeCriticalSpecCount}`)
  console.log(`- **Interaction-matrix rows**: ${summary.writeCriticalMatrixRowCount}`)
  console.log('- These numbers track different things: frontend write callsites, user-action rows, and tagged Playwright specs should not be treated as equal totals.')
  console.log('')

  if (writeCriticalSpecs.length > 0) {
    console.log('| File | Test |')
    console.log('|---|---|')
    for (const spec of writeCriticalSpecs) {
      console.log(`| \`${spec.file}\` | ${spec.testName} |`)
    }
  }

  process.exit(0)
}

console.log('Frontend Write Audit')
console.log('====================')
console.log('')
console.log('Raw frontend write callsites')
console.log(`  Count: ${summary.rawWriteCallCount}`)
console.log(`  Validated write calls: ${summary.validatedWriteCalls}`)
console.log(`  Delete operations (schema validation not applicable): ${summary.deleteWriteCalls}`)
console.log('')
console.log('Product write paths')
console.log(`  Count: ${summary.productWriteCallCount}`)
console.log(`  Validated product write calls: ${summary.validatedProductWriteCalls}`)
console.log('')
console.log('@write-critical coverage cross-check')
console.log(`  Tagged specs: ${summary.writeCriticalSpecCount}`)
console.log(`  Interaction-matrix rows: ${summary.writeCriticalMatrixRowCount}`)
console.log('')
console.log(`Not included: ${NOT_INCLUDED_NOTE}`)

const productNonDelete = productWritePaths.filter((entry) => entry.mutation !== 'delete')
const nonProductNonDelete = nonProductWriteCalls.filter((entry) => entry.mutation !== 'delete')

if (productNonDelete.length > 0) {
  console.log('')
  console.log('PRODUCT WRITE PATHS:')
  printEntries(productNonDelete)
}

if (nonProductNonDelete.length > 0) {
  console.log('')
  console.log('ADMIN / HELPER / OTHER NON-PRODUCT WRITES:')
  printEntries(nonProductNonDelete)
}

if (deleteOperations.length > 0) {
  console.log('')
  console.log('DELETE OPERATIONS:')
  printEntries(deleteOperations)
}
