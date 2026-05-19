#!/usr/bin/env node

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'

const args = process.argv.slice(2)

function valueFor(flag) {
  const index = args.indexOf(flag)
  if (index === -1) return null
  return args[index + 1] ?? null
}

function usage() {
  console.error('Usage: node scripts/sync-to-repo.mjs --target <repo-path> [--ref <git-ref>] [--dry-run]')
  process.exit(2)
}

const targetArg = valueFor('--target')
const ref = valueFor('--ref') ?? 'HEAD'
const dryRun = args.includes('--dry-run')

if (!targetArg) usage()

const sourceRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
const targetRoot = resolve(targetArg)
const targetAgents = join(targetRoot, '.agents')
const vendorRoot = join(targetAgents, 'vendor', 'agent-workflow-kit')

if (!existsSync(targetRoot)) {
  console.error(`Target repo does not exist: ${targetRoot}`)
  process.exit(1)
}

const targetGitRoot = execFileSync('git', ['-C', targetRoot, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
if (targetGitRoot !== targetRoot) {
  console.error(`Target path must be the repo root. Got ${targetRoot}, git root is ${targetGitRoot}`)
  process.exit(1)
}

const commit = execFileSync('git', ['-C', sourceRoot, 'rev-parse', ref], { encoding: 'utf8' }).trim()
const repoUrl = execFileSync('git', ['-C', sourceRoot, 'config', '--get', 'remote.origin.url'], { encoding: 'utf8' }).trim()
const files = execFileSync('git', ['-C', sourceRoot, 'ls-tree', '-r', '--name-only', ref], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((file) => !file.startsWith('.git/'))

if (dryRun) {
  console.log(`Would sync ${files.length} files`)
  console.log(`Source: ${repoUrl} @ ${commit}`)
  console.log(`Target: ${vendorRoot}`)
  for (const file of files) console.log(file)
  process.exit(0)
}

mkdirSync(dirname(vendorRoot), { recursive: true })
rmSync(vendorRoot, { recursive: true, force: true })
mkdirSync(vendorRoot, { recursive: true })

const archive = execFileSync('git', ['-C', sourceRoot, 'archive', '--format=tar', ref], { maxBuffer: 1024 * 1024 * 100 })
const tar = spawnSync('tar', ['-x', '-C', vendorRoot], { input: archive, stdio: ['pipe', 'inherit', 'inherit'] })
if (tar.status !== 0) {
  console.error(`tar extraction failed with status ${tar.status}`)
  process.exit(tar.status ?? 1)
}

writeFileSync(join(vendorRoot, 'VENDORED_FROM.json'), `${JSON.stringify({
  repoUrl,
  ref,
  commit,
  syncedAt: new Date().toISOString(),
}, null, 2)}\n`)

console.log(`Synced ${files.length} files to ${vendorRoot}`)
console.log(`Source: ${repoUrl} @ ${commit}`)
