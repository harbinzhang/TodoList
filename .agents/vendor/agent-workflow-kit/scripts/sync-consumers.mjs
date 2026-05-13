#!/usr/bin/env node

import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)

function valueFor(flag) {
  const index = args.indexOf(flag)
  if (index === -1) return null
  return args[index + 1] ?? null
}

function valuesFor(flag) {
  const values = []
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === flag && args[index + 1]) values.push(args[index + 1])
  }
  return values
}

function usage() {
  console.error(
    [
      'Usage: node scripts/sync-consumers.mjs (--all | --consumer <name>) [--ref <git-ref>] [--dry-run] [--registry <path>]',
      '',
      'Examples:',
      '  node scripts/sync-consumers.mjs --all --dry-run',
      '  node scripts/sync-consumers.mjs --consumer perkmon.com --ref HEAD',
    ].join('\n'),
  )
  process.exit(2)
}

function run(command, commandArgs, options = {}) {
  return execFileSync(command, commandArgs, {
    encoding: 'utf8',
    stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim()
}

function parseScalar(value) {
  const trimmed = value.trim()
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  return trimmed.replace(/^["']|["']$/g, '')
}

function parseConsumersYaml(content) {
  const consumers = []
  let current = null
  let currentListKey = null

  for (const rawLine of content.split('\n')) {
    const line = rawLine.replace(/\s+$/, '')
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#') || trimmed === 'consumers:') continue

    const itemMatch = line.match(/^\s{2}-\s+name:\s*(.+?)\s*$/)
    if (itemMatch) {
      current = { name: parseScalar(itemMatch[1]) }
      consumers.push(current)
      currentListKey = null
      continue
    }

    if (!current) {
      throw new Error(`Unsupported consumers.yaml line before first consumer: ${rawLine}`)
    }

    const listValueMatch = line.match(/^\s{6}-\s*(.+?)\s*$/)
    if (listValueMatch && currentListKey) {
      current[currentListKey].push(parseScalar(listValueMatch[1]))
      continue
    }

    const keyMatch = line.match(/^\s{4}([A-Za-z0-9_-]+):\s*(.*?)\s*$/)
    if (!keyMatch) {
      throw new Error(`Unsupported consumers.yaml line: ${rawLine}`)
    }

    const [, key, value] = keyMatch
    if (value === '') {
      current[key] = []
      currentListKey = key
    } else {
      current[key] = parseScalar(value)
      currentListKey = null
    }
  }

  return consumers
}

function loadConsumers(registryPath) {
  if (!existsSync(registryPath)) {
    throw new Error(`Consumer registry is missing: ${registryPath}`)
  }
  const consumers = parseConsumersYaml(readFileSync(registryPath, 'utf8'))
  const names = new Set()

  for (const consumer of consumers) {
    if (!consumer.name) throw new Error('Consumer entry is missing name')
    if (names.has(consumer.name)) throw new Error(`Duplicate consumer name: ${consumer.name}`)
    names.add(consumer.name)
    if (!consumer.path) throw new Error(`Consumer ${consumer.name} is missing path`)
  }

  return consumers
}

function relativeStatusPaths(repoRoot) {
  const status = run('git', ['-C', repoRoot, 'status', '--porcelain=v1', '--untracked-files=normal'])
  if (!status) return []

  return status.split('\n').filter(Boolean).map((line) => {
    const statusCode = line.slice(0, 2)
    const rawPath = line.slice(3)
    const path = rawPath.includes(' -> ') ? rawPath.split(' -> ').at(-1) : rawPath
    return { statusCode, path }
  })
}

function isUnder(path, prefix) {
  return path === prefix || path.startsWith(`${prefix}/`)
}

function shouldAllowUntracked(path, allowedPrefixes) {
  return allowedPrefixes.some((prefix) => isUnder(path, prefix.replace(/\/$/, '')))
}

function checkConsumerReady(consumer) {
  const targetRoot = resolve(consumer.path)
  if (!existsSync(targetRoot)) {
    return { ok: false, targetRoot, blockers: [`target path does not exist: ${targetRoot}`], warnings: [] }
  }

  const realTargetRoot = realpathSync(targetRoot)
  let gitRoot
  try {
    gitRoot = realpathSync(run('git', ['-C', realTargetRoot, 'rev-parse', '--show-toplevel']))
  } catch (error) {
    return { ok: false, targetRoot: realTargetRoot, blockers: [`target is not a git repo: ${realTargetRoot}`], warnings: [] }
  }

  if (gitRoot !== realTargetRoot) {
    return {
      ok: false,
      targetRoot: realTargetRoot,
      blockers: [`target path must be repo root. Got ${realTargetRoot}, git root is ${gitRoot}`],
      warnings: [],
    }
  }

  const statuses = relativeStatusPaths(realTargetRoot)
  const blockers = []
  const warnings = []
  const allowedUntracked = Array.isArray(consumer.allowDirtyUntracked) ? consumer.allowDirtyUntracked : []

  for (const entry of statuses) {
    const isUntracked = entry.statusCode === '??'
    const inVendor =
      isUnder(entry.path, '.agents/vendor/agent-workflow-kit') ||
      isUnder(entry.path, 'agents/vendor/agent-workflow-kit')

    if (isUntracked) {
      if (inVendor) continue
      if (!shouldAllowUntracked(entry.path, allowedUntracked)) {
        warnings.push(`untracked ${entry.path}`)
      }
      continue
    }

    if (!inVendor) {
      blockers.push(`tracked change outside vendor: ${entry.statusCode.trim()} ${entry.path}`)
    }
  }

  return { ok: blockers.length === 0, targetRoot: realTargetRoot, blockers, warnings }
}

const all = args.includes('--all')
const dryRun = args.includes('--dry-run')
const ref = valueFor('--ref') ?? 'HEAD'
const selectedNames = valuesFor('--consumer')

if ((!all && selectedNames.length === 0) || (all && selectedNames.length > 0)) usage()

const scriptDir = dirname(fileURLToPath(import.meta.url))
const kitRoot = run('git', ['-C', resolve(scriptDir, '..'), 'rev-parse', '--show-toplevel'])
const registryPath = resolve(valueFor('--registry') ?? join(kitRoot, 'consumers.yaml'))
const consumers = loadConsumers(registryPath)
const syncScript = join(kitRoot, 'scripts', 'sync-to-repo.mjs')
const selected = all
  ? consumers.filter((consumer) => consumer.enabled !== false && consumer.syncVendor !== false)
  : selectedNames.map((name) => {
      const consumer = consumers.find((entry) => entry.name === name)
      if (!consumer) throw new Error(`Unknown consumer: ${name}`)
      return consumer
    })

if (selected.length === 0) {
  console.log('No consumers selected.')
  process.exit(0)
}

let failures = 0

for (const consumer of selected) {
  console.log(`== ${consumer.name} ==`)
  const readiness = checkConsumerReady(consumer)

  for (const warning of readiness.warnings) {
    console.log(`WARN ${warning}`)
  }

  if (!readiness.ok) {
    failures += 1
    for (const blocker of readiness.blockers) {
      console.error(`BLOCK ${blocker}`)
    }
    continue
  }

  const syncArgs = [syncScript, '--target', readiness.targetRoot, '--ref', ref]
  if (dryRun) syncArgs.push('--dry-run')

  const result = spawnSync('node', syncArgs, {
    cwd: kitRoot,
    encoding: 'utf8',
  })

  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.status !== 0) failures += 1
}

if (failures > 0) {
  console.error(`Consumer sync failed for ${failures} consumer(s).`)
  process.exit(1)
}
