#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { execFileSync } from 'node:child_process'

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
const catalogPath = join(root, 'catalog.yaml')
const bannedStrings = ['perks-react', 'perkly-staging', 'dev6']

function fail(message) {
  console.error(`ERROR: ${message}`)
  process.exitCode = 1
}

function read(file) {
  return readFileSync(file, 'utf8')
}

function parseCatalog(content) {
  const entries = []
  let currentSection = null
  let current = null
  let inAdapters = false

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trimEnd()
    if (/^(skills|workflows):\s*$/.test(line)) {
      currentSection = line.replace(/:\s*$/, '')
      current = null
      inAdapters = false
      continue
    }

    const itemMatch = line.match(/^\s*-\s+name:\s*(.+?)\s*$/)
    if (itemMatch) {
      current = { section: currentSection, name: itemMatch[1].replace(/^["']|["']$/g, ''), adapters: {} }
      entries.push(current)
      inAdapters = false
      continue
    }

    const pathMatch = line.match(/^\s+path:\s*(.+?)\s*$/)
    if (pathMatch && current) {
      current.path = pathMatch[1].replace(/^["']|["']$/g, '')
      inAdapters = false
      continue
    }

    if (/^\s+adapters:\s*$/.test(line) && current) {
      inAdapters = true
      continue
    }

    const adapterMatch = line.match(/^\s{6}([A-Za-z0-9_-]+):\s*(.+?)\s*$/)
    if (adapterMatch && current && inAdapters) {
      current.adapters[adapterMatch[1]] = adapterMatch[2].replace(/^["']|["']$/g, '')
      continue
    }
  }

  return entries
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/)
  if (!match) return {}
  const values = {}
  for (const line of match[1].split('\n')) {
    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (pair) values[pair[1]] = pair[2].replace(/^["']|["']$/g, '')
  }
  return values
}

function hasFrontmatter(content) {
  return /^---\n[\s\S]*?\n---\n/.test(content)
}

function expectedSkillReferences(entry) {
  const direct = entry.path
  const refs = [direct]
  const vendorPrefix = '.agents/vendor/agent-workflow-kit/'
  if (!direct.startsWith('.agents/')) {
    refs.push(`${vendorPrefix}${direct}`)
  }
  return refs
}

function walk(dir) {
  const results = []
  for (const entry of readdirSync(dir)) {
    if (entry === '.git') continue
    const path = join(dir, entry)
    const stats = statSync(path)
    if (stats.isDirectory()) {
      results.push(...walk(path))
    } else if (stats.isFile()) {
      results.push(path)
    }
  }
  return results
}

if (!existsSync(catalogPath)) {
  fail('catalog.yaml is missing')
} else {
  const entries = parseCatalog(read(catalogPath))
  if (entries.length === 0) fail('catalog.yaml has no entries')

  for (const entry of entries) {
    if (!entry.section) fail(`catalog entry ${entry.name} is outside a section`)
    if (!entry.path) {
      fail(`catalog entry ${entry.name} is missing path`)
      continue
    }

    const absolute = join(root, entry.path)
    if (!existsSync(absolute)) {
      fail(`catalog path does not exist: ${entry.path}`)
      continue
    }

    if (entry.section === 'skills') {
      const skillContent = read(absolute)
      const frontmatter = parseFrontmatter(skillContent)
      if (!frontmatter.name) fail(`${entry.path} missing frontmatter name`)
      if (!frontmatter.description) fail(`${entry.path} missing frontmatter description`)
      if (frontmatter.name && frontmatter.name !== entry.name) {
        fail(`${entry.path} frontmatter name "${frontmatter.name}" does not match catalog "${entry.name}"`)
      }

      if (entry.adapters?.claude) {
        const adapterPath = entry.adapters.claude
        const adapterAbsolute = join(root, adapterPath)
        if (!existsSync(adapterAbsolute)) {
          fail(`${entry.name} Claude adapter path does not exist: ${adapterPath}`)
        } else {
          const adapterContent = read(adapterAbsolute)
          if (!hasFrontmatter(adapterContent)) {
            fail(`${adapterPath} missing Claude command frontmatter`)
          }

          const references = expectedSkillReferences(entry)
          if (!references.some((reference) => adapterContent.includes(reference))) {
            fail(`${adapterPath} does not reference catalog skill path ${entry.path}`)
          }
        }
      }
    }
  }
}

for (const file of walk(root)) {
  const rel = relative(root, file)
  if (rel === 'scripts/validate-catalog.mjs') continue
  if (rel === 'consumers.yaml') continue
  if (rel === 'README.md') continue
  if (rel.startsWith('packs/')) continue
  const content = read(file)
  for (const banned of bannedStrings) {
    if (content.includes(banned)) {
      fail(`${rel} contains banned repo-specific string "${banned}"`)
    }
  }
}

if (!process.exitCode) {
  console.log('catalog validation passed')
}
