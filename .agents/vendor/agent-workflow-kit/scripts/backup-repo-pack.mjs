#!/usr/bin/env node

import {
  cpSync,
  existsSync,
  mkdirSync,
  realpathSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  rmSync,
  lstatSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)

function valueFor(flag) {
  const index = args.indexOf(flag)
  if (index === -1) return null
  return args[index + 1] ?? null
}

function usage() {
  console.error([
    'Usage:',
    '  node scripts/backup-repo-pack.mjs --source <repo-path> [--pack <name>] [--dry-run] [--commit] [--push] [--message <commit-message>]',
    '',
    'Examples:',
    '  node scripts/backup-repo-pack.mjs --source /path/to/repo --pack my-repo --dry-run',
    '  node scripts/backup-repo-pack.mjs --source /path/to/repo --pack my-repo --commit --push',
  ].join('\n'))
  process.exit(2)
}

const sourceArg = valueFor('--source')
const packArg = valueFor('--pack')
const commitMessage = valueFor('--message')
const dryRun = args.includes('--dry-run')
const shouldCommit = args.includes('--commit')
const shouldPush = args.includes('--push')

if (!sourceArg) usage()

function run(command, commandArgs, options = {}) {
  return execFileSync(command, commandArgs, {
    encoding: 'utf8',
    stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim()
}

function read(file) {
  return readFileSync(file, 'utf8')
}

function listFiles(root) {
  if (!existsSync(root)) return []
  const results = []
  for (const entry of readdirSync(root)) {
    const path = join(root, entry)
    const stats = lstatSync(path)
    if (stats.isDirectory()) {
      results.push(...listFiles(path))
    } else if (stats.isFile() || stats.isSymbolicLink()) {
      results.push(path)
    }
  }
  return results
}

function parseCatalogPaths(content) {
  return [...content.matchAll(/^\s+path:\s*(.+)$/gm)]
    .map((match) => match[1].replace(/^['"]|['"]$/g, '').trim())
}

function rewriteVendoredSkillPaths(file) {
  if (!existsSync(file)) return
  const original = read(file)
  const rewritten = original
    .replace(
      /\.agents\/vendor\/agent-workflow-kit\/skills\/([^/\s]+)\/SKILL\.md/g,
      '.agents/skills/$1/SKILL.md',
    )
    .replace(
      /\.agents\/vendor\/agent-workflow-kit\/workflows\/([^/\s]+\.md)/g,
      '.agents/workflows/$1',
    )
    .replace(
      /^- Generic skills may resolve to `\.agents\/vendor\/agent-workflow-kit\/`; project-specific overrides stay under `\.agents\/skills\/`\.$/m,
      '- In this pack snapshot, skill entries resolve to pack-local `.agents/skills/` files so the pack can be copied as a self-contained starting point.',
    )
  if (rewritten !== original) writeFileSync(file, rewritten)
}

function rewriteVendoredSymlinkTargets(root) {
  for (const file of listFiles(root)) {
    if (!lstatSync(file).isSymbolicLink()) continue
    const original = readlinkSync(file)
    const rewritten = original
      .replace(
        /\.agents\/vendor\/agent-workflow-kit\/skills\//g,
        '.agents/skills/',
      )
      .replace(
        /\.agents\/vendor\/agent-workflow-kit\/workflows\//g,
        '.agents/workflows/',
      )
    if (rewritten === original) continue
    unlinkSync(file)
    symlinkSync(rewritten, file)
  }
}

function materializeVendoredCatalogReferences(sourceRoot, packRoot) {
  const catalogPath = join(packRoot, '.agents', 'catalog.yaml')
  if (!existsSync(catalogPath)) return []

  const copied = []
  for (const entry of parseCatalogPaths(read(catalogPath))) {
    const skillMatch = entry.match(/^\.agents\/vendor\/agent-workflow-kit\/skills\/([^/]+)\/SKILL\.md$/)
    const workflowMatch = entry.match(/^\.agents\/vendor\/agent-workflow-kit\/workflows\/([^/]+\.md)$/)
    if (!skillMatch && !workflowMatch) continue

    const source = join(sourceRoot, entry)
    if (!existsSync(source)) {
      throw new Error(`Pack catalog references missing vendored source path: ${entry}`)
    }

    const target = skillMatch
      ? join(packRoot, '.agents', 'skills', skillMatch[1], 'SKILL.md')
      : join(packRoot, '.agents', 'workflows', workflowMatch[1])
    mkdirSync(dirname(target), { recursive: true })
    cpSync(source, target, { dereference: false })
    copied.push(relative(packRoot, target))
  }

  return copied
}

function stripMarkdownTrailingWhitespace(root) {
  for (const file of listFiles(root)) {
    if (!file.endsWith('.md')) continue
    const original = read(file)
    const rewritten = original
      .split('\n')
      .map((line) => line.replace(/[ \t]+$/g, ''))
      .join('\n')
    if (rewritten !== original) writeFileSync(file, rewritten)
  }
}

function validatePackCatalog(packRoot) {
  const catalogPath = join(packRoot, '.agents', 'catalog.yaml')
  if (!existsSync(catalogPath)) {
    throw new Error(`Pack catalog is missing: ${catalogPath}`)
  }

  const paths = parseCatalogPaths(read(catalogPath))
  const missing = paths.filter((entry) => !existsSync(join(packRoot, entry)))
  if (missing.length > 0) {
    throw new Error(`Pack catalog has missing paths:\n${missing.join('\n')}`)
  }

  return paths.length
}

const scriptDir = dirname(fileURLToPath(import.meta.url))
const kitRoot = run('git', ['-C', resolve(scriptDir, '..'), 'rev-parse', '--show-toplevel'])
const sourceResolvedPath = resolve(sourceArg)
if (!existsSync(sourceResolvedPath)) {
  console.error(`Source repo does not exist: ${sourceResolvedPath}`)
  process.exit(1)
}
const sourcePath = realpathSync(sourceResolvedPath)
const sourceRoot = run('git', ['-C', sourcePath, 'rev-parse', '--show-toplevel'])

if (sourceRoot !== sourcePath) {
  console.error(`Source path must be the repo root. Got ${sourcePath}, git root is ${sourceRoot}`)
  process.exit(1)
}

const sourceAgents = join(sourceRoot, '.agents')
if (!existsSync(sourceAgents)) {
  console.error(`Source repo has no .agents directory: ${sourceAgents}`)
  process.exit(1)
}
const sourceClaudeCommands = join(sourceRoot, '.claude', 'commands')

const packName = packArg ?? basename(sourceRoot)
if (!/^[A-Za-z0-9._-]+$/.test(packName)) {
  console.error(`Invalid pack name: ${packName}`)
  process.exit(1)
}

const packRoot = join(kitRoot, 'packs', packName)
const packAgents = join(packRoot, '.agents')

function safeRun(command, commandArgs) {
  try {
    return run(command, commandArgs)
  } catch {
    return ''
  }
}

const metadata = {
  sourcePath: sourceRoot,
  sourceRepoUrl: safeRun('git', ['-C', sourceRoot, 'config', '--get', 'remote.origin.url']),
  sourceBranch: safeRun('git', ['-C', sourceRoot, 'branch', '--show-current']),
  sourceCommit: safeRun('git', ['-C', sourceRoot, 'rev-parse', 'HEAD']),
  sourceAgentsStatus: safeRun('git', ['-C', sourceRoot, 'status', '--short', '--', '.agents']),
  sourceClaudeCommandsStatus: safeRun('git', ['-C', sourceRoot, 'status', '--short', '--', '.claude/commands']),
  backedUpAt: new Date().toISOString(),
}

const sourceFiles = listFiles(sourceAgents)
  .map((file) => relative(sourceRoot, file))
  .filter((file) => !file.startsWith('.agents/vendor/'))
  .concat(listFiles(sourceClaudeCommands).map((file) => relative(sourceRoot, file)))
  .sort()

if (dryRun) {
  console.log(`Would backup ${sourceFiles.length} .agents files`)
  console.log(`Source: ${sourceRoot}`)
  console.log(`Pack: ${packRoot}`)
  if (metadata.sourceAgentsStatus) {
    console.log('Source .agents status:')
    console.log(metadata.sourceAgentsStatus)
  }
  if (metadata.sourceClaudeCommandsStatus) {
    console.log('Source .claude/commands status:')
    console.log(metadata.sourceClaudeCommandsStatus)
  }
  for (const file of sourceFiles) console.log(file)
  process.exit(0)
}

mkdirSync(packRoot, { recursive: true })
rmSync(packAgents, { recursive: true, force: true })
mkdirSync(packAgents, { recursive: true })

cpSync(sourceAgents, packAgents, {
  recursive: true,
  dereference: false,
  verbatimSymlinks: true,
  filter: (src) => !relative(sourceAgents, src).split('/').includes('vendor'),
})

materializeVendoredCatalogReferences(sourceRoot, packRoot)

if (existsSync(sourceClaudeCommands)) {
  const packClaudeCommands = join(packRoot, '.claude', 'commands')
  rmSync(packClaudeCommands, { recursive: true, force: true })
  mkdirSync(dirname(packClaudeCommands), { recursive: true })
  cpSync(sourceClaudeCommands, packClaudeCommands, {
    recursive: true,
    dereference: false,
    verbatimSymlinks: true,
  })
  rewriteVendoredSymlinkTargets(packClaudeCommands)
  for (const file of listFiles(packClaudeCommands)) {
    rewriteVendoredSkillPaths(file)
  }
}

rewriteVendoredSkillPaths(join(packRoot, '.agents', 'catalog.yaml'))
rewriteVendoredSkillPaths(join(packRoot, '.agents', 'skills', 'README.md'))

writeFileSync(join(packRoot, 'BACKUP_FROM.json'), `${JSON.stringify(metadata, null, 2)}\n`)
writeFileSync(join(packRoot, 'README.md'), `# ${packName} Skill Pack

This pack is generated from \`${metadata.sourceRepoUrl || metadata.sourcePath}\`.

It is repo-specific reference material. Other repositories can copy individual skills or workflows from this pack, but should review and adapt project IDs, hosts, command names, branch names, data paths, native release assumptions, and safety rules before use.

## Contents

\`\`\`text
.agents/
  catalog.yaml
  conventions.md
  plans/
  prompts/
  repo-profile.yaml
  skills/
  templates/
  workflows/
.claude/
  commands/
\`\`\`

The pack catalog and Claude command wrappers point to pack-local \`.agents/skills/...\` entries so the pack can be copied as a self-contained starting point. It is not registered in the root generic \`catalog.yaml\`.

## Refresh

\`\`\`bash
node scripts/backup-repo-pack.mjs --source ${metadata.sourcePath} --pack ${packName}
\`\`\`
`)

stripMarkdownTrailingWhitespace(packRoot)

const pathCount = validatePackCatalog(packRoot)
console.log(`Backed up ${sourceFiles.length} files to ${packRoot}`)
console.log(`Pack catalog paths ok (${pathCount})`)

if (shouldCommit || shouldPush) {
  run('node', ['scripts/validate-catalog.mjs'], { cwd: kitRoot, stdio: 'inherit' })
  run('git', ['add', join('packs', packName)], { cwd: kitRoot })
  const status = safeRun('git', ['-C', kitRoot, 'status', '--short', '--', join('packs', packName)])
  if (!status) {
    console.log(`No pack changes to commit for ${packName}`)
  } else if (shouldCommit) {
    run('git', ['commit', '-m', commitMessage ?? `chore: backup ${packName} skill pack`], { cwd: kitRoot, stdio: 'inherit' })
  }

  if (shouldPush) {
    run('git', ['push'], { cwd: kitRoot, stdio: 'inherit' })
  }
}
