import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, test } from 'node:test'

const kitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
const tempRoots = []
const packRoots = []

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
  for (const root of packRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

function tempDir(name) {
  const dir = mkdtempSync(join(tmpdir(), `agent-workflow-kit-${name}-`))
  tempRoots.push(dir)
  return dir
}

function initGitRepo(root) {
  execFileSync('git', ['init', '-q'], { cwd: root })
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: root })
  execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: root })
}

test('validate-catalog rejects Claude adapters without command frontmatter', () => {
  const repo = tempDir('validator')
  initGitRepo(repo)
  mkdirSync(join(repo, 'scripts'), { recursive: true })
  mkdirSync(join(repo, 'skills', 'rebase'), { recursive: true })
  mkdirSync(join(repo, '.claude', 'commands'), { recursive: true })
  cpSync(join(kitRoot, 'scripts', 'validate-catalog.mjs'), join(repo, 'scripts', 'validate-catalog.mjs'))

  writeFileSync(
    join(repo, 'catalog.yaml'),
    [
      'skills:',
      '  - name: rebase',
      '    path: skills/rebase/SKILL.md',
      '    description: Reset a worktree',
      '    adapters:',
      '      claude: .claude/commands/rebase.md',
      '',
    ].join('\n'),
  )
  writeFileSync(
    join(repo, 'skills', 'rebase', 'SKILL.md'),
    ['---', 'name: rebase', 'description: Reset a worktree', '---', '', '# Rebase', ''].join('\n'),
  )
  writeFileSync(join(repo, '.claude', 'commands', 'rebase.md'), 'Load skills/rebase/SKILL.md\n')

  const result = spawnSync('node', ['scripts/validate-catalog.mjs'], {
    cwd: repo,
    encoding: 'utf8',
  })

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /missing Claude command frontmatter/)
})

test('install-skill-to-repo creates a catalog entry and thin Claude command wrapper', () => {
  const target = tempDir('install-target')
  initGitRepo(target)
  mkdirSync(join(target, '.agents', 'vendor', 'agent-workflow-kit', 'skills', 'rebase'), { recursive: true })
  mkdirSync(join(target, '.agents'), { recursive: true })
  writeFileSync(
    join(target, '.agents', 'vendor', 'agent-workflow-kit', 'skills', 'rebase', 'SKILL.md'),
    ['---', 'name: rebase', 'description: Reset a worktree', '---', '', '# Rebase', ''].join('\n'),
  )
  writeFileSync(
    join(target, '.agents', 'catalog.yaml'),
    [
      'skills:',
      '  - name: rebase',
      '    path: .agents/skills/rebase/SKILL.md',
      '    description: Old local skill',
      'workflows:',
      '  - name: feature',
      '    path: .agents/workflows/feature.md',
      '',
    ].join('\n'),
  )

  const result = spawnSync(
    'node',
    [
      resolve(kitRoot, 'scripts', 'install-skill-to-repo.mjs'),
      '--target',
      target,
      '--skill',
      'rebase',
      '--mode',
      'vendored',
    ],
    { cwd: kitRoot, encoding: 'utf8' },
  )

  assert.equal(result.status, 0, result.stderr)

  const catalog = readFileSync(join(target, '.agents', 'catalog.yaml'), 'utf8')
  assert.match(catalog, /name: rebase/)
  assert.match(catalog, /path: \.agents\/vendor\/agent-workflow-kit\/skills\/rebase\/SKILL\.md/)
  assert.match(catalog, /claude: \.claude\/commands\/rebase\.md/)
  assert.match(catalog, /^workflows:$/m)
  assert.match(catalog, /path: \.agents\/workflows\/feature\.md/)

  const commandPath = join(target, '.claude', 'commands', 'rebase.md')
  assert.equal(existsSync(commandPath), true)
  const command = readFileSync(commandPath, 'utf8')
  assert.match(command, /^---\ndescription: /)
  assert.match(command, /Load `\.agents\/vendor\/agent-workflow-kit\/skills\/rebase\/SKILL\.md`/)
})

test('backup-repo-pack includes Claude command wrappers with the .agents snapshot', () => {
  const source = tempDir('pack-source')
  initGitRepo(source)
  mkdirSync(join(source, '.agents', 'skills', 'rebase'), { recursive: true })
  mkdirSync(join(source, '.claude', 'commands'), { recursive: true })
  writeFileSync(
    join(source, '.agents', 'catalog.yaml'),
    [
      'skills:',
      '  - name: rebase',
      '    path: .agents/skills/rebase/SKILL.md',
      '    description: Reset a worktree',
      '    adapters:',
      '      claude: .claude/commands/rebase.md',
      '',
    ].join('\n'),
  )
  writeFileSync(
    join(source, '.agents', 'skills', 'rebase', 'SKILL.md'),
    ['---', 'name: rebase', 'description: Reset a worktree', '---', '', '# Rebase', ''].join('\n'),
  )
  writeFileSync(
    join(source, '.claude', 'commands', 'rebase.md'),
    ['---', 'description: Use repo-local rebase skill', '---', '', 'Load `.agents/skills/rebase/SKILL.md`.', ''].join('\n'),
  )

  const packName = `test-pack-${Date.now()}`
  const packRoot = join(kitRoot, 'packs', packName)
  packRoots.push(packRoot)

  const result = spawnSync(
    'node',
    [resolve(kitRoot, 'scripts', 'backup-repo-pack.mjs'), '--source', source, '--pack', packName],
    { cwd: kitRoot, encoding: 'utf8' },
  )

  assert.equal(result.status, 0, result.stderr)
  assert.equal(existsSync(join(packRoot, '.agents', 'catalog.yaml')), true)
  assert.equal(existsSync(join(packRoot, '.claude', 'commands', 'rebase.md')), true)
  assert.match(readFileSync(join(packRoot, 'README.md'), 'utf8'), /\.claude\/[\s\S]*commands/)
})

test('sync-consumers dry-run syncs enabled registry entries only', () => {
  const firstTarget = tempDir('consumer-first')
  const secondTarget = tempDir('consumer-second')
  initGitRepo(firstTarget)
  initGitRepo(secondTarget)

  const registry = join(tempDir('consumer-registry'), 'consumers.yaml')
  writeFileSync(
    registry,
    [
      'consumers:',
      '  - name: first',
      `    path: ${firstTarget}`,
      '    enabled: true',
      '    syncVendor: true',
      '  - name: second',
      `    path: ${secondTarget}`,
      '    enabled: false',
      '    syncVendor: true',
      '',
    ].join('\n'),
  )

  const result = spawnSync(
    'node',
    [
      resolve(kitRoot, 'scripts', 'sync-consumers.mjs'),
      '--registry',
      registry,
      '--all',
      '--dry-run',
    ],
    { cwd: kitRoot, encoding: 'utf8' },
  )

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /== first ==/)
  assert.doesNotMatch(result.stdout, /== second ==/)
  assert.match(result.stdout, /Would sync \d+ files/)
})

test('sync-consumers blocks tracked changes outside the vendored kit', () => {
  const target = tempDir('consumer-dirty')
  initGitRepo(target)
  writeFileSync(join(target, 'README.md'), 'dirty\n')
  execFileSync('git', ['add', 'README.md'], { cwd: target })

  const registry = join(tempDir('consumer-dirty-registry'), 'consumers.yaml')
  writeFileSync(
    registry,
    [
      'consumers:',
      '  - name: dirty',
      `    path: ${target}`,
      '    enabled: true',
      '    syncVendor: true',
      '',
    ].join('\n'),
  )

  const result = spawnSync(
    'node',
    [
      resolve(kitRoot, 'scripts', 'sync-consumers.mjs'),
      '--registry',
      registry,
      '--consumer',
      'dirty',
      '--dry-run',
    ],
    { cwd: kitRoot, encoding: 'utf8' },
  )

  assert.notEqual(result.status, 0)
  assert.match(result.stdout, /== dirty ==/)
  assert.match(result.stderr, /BLOCK tracked change outside vendor: A README\.md/)
})
