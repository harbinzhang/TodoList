#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)

function valueFor(flag) {
  const index = args.indexOf(flag)
  if (index === -1) return null
  return args[index + 1] ?? null
}

function usage() {
  console.error('Usage: node scripts/install-skill-to-repo.mjs --target <repo-path> --skill <name> --mode <vendored|override>')
  process.exit(2)
}

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

function parseCatalog(content) {
  const entries = []
  let currentSection = null
  let current = null

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trimEnd()
    if (/^(skills|workflows):\s*$/.test(line)) {
      currentSection = line.replace(/:\s*$/, '')
      current = null
      continue
    }

    const itemMatch = line.match(/^\s*-\s+name:\s*(.+?)\s*$/)
    if (itemMatch) {
      current = { section: currentSection, name: itemMatch[1].replace(/^["']|["']$/g, ''), raw: [] }
      entries.push(current)
      continue
    }

    if (current) {
      current.raw.push(line)
      const pathMatch = line.match(/^\s+path:\s*(.+?)\s*$/)
      if (pathMatch) current.path = pathMatch[1].replace(/^["']|["']$/g, '')
      const descriptionMatch = line.match(/^\s+description:\s*(.+?)\s*$/)
      if (descriptionMatch) current.description = descriptionMatch[1].replace(/^["']|["']$/g, '')
    }
  }

  return entries
}

function parseSkillFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/)
  if (!match) return {}
  const values = {}
  for (const line of match[1].split('\n')) {
    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (pair) values[pair[1]] = pair[2].replace(/^["']|["']$/g, '')
  }
  return values
}

function getRootCatalogSkill(root, skillName) {
  const catalogPath = join(root, 'catalog.yaml')
  if (!existsSync(catalogPath)) {
    throw new Error(`Kit catalog is missing: ${catalogPath}`)
  }

  return parseCatalog(read(catalogPath)).find((entry) => entry.section === 'skills' && entry.name === skillName)
}

function removeSkillBlock(content, skillName) {
  const lines = content.split('\n')
  const output = []
  let skipping = false

  for (const line of lines) {
    if (skipping && /^[A-Za-z0-9_-]+:\s*$/.test(line)) {
      skipping = false
    }

    const itemMatch = line.match(/^\s*-\s+name:\s*(.+?)\s*$/)
    if (itemMatch) {
      skipping = itemMatch[1].replace(/^["']|["']$/g, '') === skillName
    }
    if (!skipping) output.push(line)
  }

  return output.join('\n').replace(/\n{3,}/g, '\n\n')
}

function ensureSkillsSection(content) {
  if (/^skills:\s*$/m.test(content)) return content
  const trimmed = content.trimEnd()
  return `${trimmed}${trimmed ? '\n\n' : ''}skills:\n`
}

function appendSkillEntry(content, entry) {
  const withoutExisting = ensureSkillsSection(removeSkillBlock(content, entry.name))
  const lines = withoutExisting.split('\n')
  const skillsIndex = lines.findIndex((line) => /^skills:\s*$/.test(line))
  const nextSectionIndex = lines.findIndex((line, index) => index > skillsIndex && /^[A-Za-z0-9_-]+:\s*$/.test(line))
  const insertIndex = nextSectionIndex === -1 ? lines.length : nextSectionIndex
  const entryLines = [
    `  - name: ${entry.name}`,
    `    path: ${entry.path}`,
    `    description: ${entry.description}`,
    '    adapters:',
    `      claude: .claude/commands/${entry.name}.md`,
  ]

  const nextLines = [
    ...lines.slice(0, insertIndex).filter((line, index, array) => !(line === '' && index === array.length - 1)),
    ...entryLines,
    ...lines.slice(insertIndex),
  ]

  return `${nextLines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`
}

const targetArg = valueFor('--target')
const skillName = valueFor('--skill')
const mode = valueFor('--mode')

if (!targetArg || !skillName || !['vendored', 'override'].includes(mode ?? '')) usage()

const scriptDir = dirname(fileURLToPath(import.meta.url))
const kitRoot = run('git', ['-C', resolve(scriptDir, '..'), 'rev-parse', '--show-toplevel'])
const targetPath = resolve(targetArg)

if (!existsSync(targetPath)) {
  console.error(`Target repo does not exist: ${targetPath}`)
  process.exit(1)
}

const targetRoot = realpathSync(targetPath)
const targetGitRoot = realpathSync(run('git', ['-C', targetRoot, 'rev-parse', '--show-toplevel']))
if (targetGitRoot !== targetRoot) {
  console.error(`Target path must be the repo root. Got ${targetRoot}, git root is ${targetGitRoot}`)
  process.exit(1)
}

const rootSkill = getRootCatalogSkill(kitRoot, skillName)
if (!rootSkill) {
  console.error(`Unknown skill in kit catalog: ${skillName}`)
  process.exit(1)
}

const skillPath =
  mode === 'vendored'
    ? `.agents/vendor/agent-workflow-kit/skills/${skillName}/SKILL.md`
    : `.agents/skills/${skillName}/SKILL.md`
const targetSkillPath = join(targetRoot, skillPath)

if (!existsSync(targetSkillPath)) {
  console.error(`Target skill file does not exist for ${mode} mode: ${skillPath}`)
  process.exit(1)
}

const targetFrontmatter = parseSkillFrontmatter(read(targetSkillPath))
const description = targetFrontmatter.description || rootSkill.description
const agentsDir = join(targetRoot, '.agents')
const catalogPath = join(agentsDir, 'catalog.yaml')
mkdirSync(agentsDir, { recursive: true })

const catalog = existsSync(catalogPath) ? read(catalogPath) : ''
writeFileSync(
  catalogPath,
  appendSkillEntry(catalog, {
    name: skillName,
    path: skillPath,
    description,
  }),
)

const claudeCommandPath = join(targetRoot, '.claude', 'commands', `${skillName}.md`)
mkdirSync(dirname(claudeCommandPath), { recursive: true })
writeFileSync(
  claudeCommandPath,
  [
    '---',
    `description: Use the ${mode === 'vendored' ? 'vendored agent-workflow-kit' : 'repo-local'} ${skillName} skill`,
    '---',
    '',
    `Load \`${skillPath}\` and follow it from the current worktree.`,
    '',
    'Read `.agents/repo-profile.yaml` first when it exists.',
    '',
  ].join('\n'),
)

console.log(`Installed ${skillName} ${mode} skill routing in ${targetRoot}`)
console.log(`Catalog: ${catalogPath}`)
console.log(`Claude command: ${claudeCommandPath}`)
