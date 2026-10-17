import {
  lstatSync,
  mkdirSync,
  readlinkSync,
  symlinkSync,
} from 'node:fs'
import { dirname, join } from 'node:path'

const VENDORED_SKILL_PATH =
  /^\.agents\/vendor\/agent-workflow-kit\/skills\/([A-Za-z0-9][A-Za-z0-9._-]*)\/SKILL\.md$/

function unquote(value) {
  return value.trim().replace(/^["']|["']$/g, '')
}

function lstatIfPresent(path) {
  try {
    return lstatSync(path)
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

export function nativeSkillLink(skillName) {
  return {
    relativePath: `.agents/skills/${skillName}`,
    target: `../vendor/agent-workflow-kit/skills/${skillName}`,
  }
}

export function inspectNativeSkillLink(targetRoot, skillName) {
  const link = nativeSkillLink(skillName)
  const path = join(targetRoot, link.relativePath)
  const stat = lstatIfPresent(path)

  if (!stat) return { ...link, path, action: 'create' }

  if (stat.isSymbolicLink()) {
    const actualTarget = readlinkSync(path)
    if (actualTarget === link.target) {
      return { ...link, path, action: 'unchanged' }
    }
    throw new Error(
      `Refusing to replace unexpected skill symlink ${link.relativePath} (points to ${actualTarget})`,
    )
  }

  if (stat.isDirectory()) {
    throw new Error(`Refusing to replace repo-local skill directory ${link.relativePath}`)
  }

  throw new Error(`Refusing to replace existing native skill path ${link.relativePath}`)
}

export function ensureNativeSkillLink(targetRoot, skillName) {
  const state = inspectNativeSkillLink(targetRoot, skillName)
  if (state.action === 'create') {
    mkdirSync(dirname(state.path), { recursive: true })
    symlinkSync(state.target, state.path, 'dir')
  }
  return state
}

export function assertRealLocalSkillDirectory(targetRoot, skillName) {
  const relativePath = `.agents/skills/${skillName}`
  const path = join(targetRoot, relativePath)
  const stat = lstatIfPresent(path)

  if (!stat || stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error(`Override mode requires a real repo-local skill directory at ${relativePath}`)
  }
}

export function selectedVendoredSkills(catalogContent) {
  const selected = []
  let section = null
  let skillName = null

  for (const rawLine of catalogContent.split('\n')) {
    const line = rawLine.trimEnd()
    const sectionMatch = line.match(/^([A-Za-z0-9_-]+):\s*$/)
    if (sectionMatch) {
      section = sectionMatch[1]
      skillName = null
      continue
    }

    const itemMatch = line.match(/^\s*-\s+name:\s*(.+?)\s*$/)
    if (itemMatch) {
      skillName = section === 'skills' ? unquote(itemMatch[1]) : null
      continue
    }

    if (!skillName) continue
    const pathMatch = line.match(/^\s+path:\s*(.+?)\s*$/)
    if (!pathMatch) continue

    const path = unquote(pathMatch[1])
    const vendoredMatch = path.match(VENDORED_SKILL_PATH)
    if (!vendoredMatch) continue
    if (vendoredMatch[1] !== skillName) {
      throw new Error(
        `Catalog skill ${skillName} points to a different vendored skill: ${path}`,
      )
    }
    selected.push(skillName)
  }

  return [...new Set(selected)]
}
