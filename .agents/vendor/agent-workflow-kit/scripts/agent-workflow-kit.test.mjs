import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readlinkSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
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

test('validate-catalog allows repo-specific strings in superpowers design records', () => {
  const repo = tempDir('validator-design-records')
  initGitRepo(repo)
  mkdirSync(join(repo, 'scripts'), { recursive: true })
  mkdirSync(join(repo, 'skills', 'verify'), { recursive: true })
  mkdirSync(join(repo, 'docs', 'superpowers', 'specs'), { recursive: true })
  mkdirSync(join(repo, '.worktrees', 'consumer'), { recursive: true })
  cpSync(join(kitRoot, 'scripts', 'validate-catalog.mjs'), join(repo, 'scripts', 'validate-catalog.mjs'))

  writeFileSync(
    join(repo, 'catalog.yaml'),
    [
      'skills:',
      '  - name: verify',
      '    path: skills/verify/SKILL.md',
      '    description: Verify a repository',
      '',
    ].join('\n'),
  )
  writeFileSync(
    join(repo, 'skills', 'verify', 'SKILL.md'),
    ['---', 'name: verify', 'description: Verify a repository', '---', '', '# Verify', ''].join('\n'),
  )
  writeFileSync(
    join(repo, 'docs', 'superpowers', 'specs', 'consumer-design.md'),
    `This historical design intentionally discusses ${'perks' + '-react'} and ${'dev' + '6'}.\n`,
  )
  writeFileSync(
    join(repo, '.worktrees', 'consumer', 'README.md'),
    `This linked consumer discusses ${'perks' + '-react'}.\n`,
  )

  const result = spawnSync('node', ['scripts/validate-catalog.mjs'], {
    cwd: repo,
    encoding: 'utf8',
  })

  assert.equal(result.status, 0, result.stderr)
})

test('portable consumer skills are registered with source-neutral content', () => {
  const promotedSkills = [
    'roadmap',
    'cc',
    'crc',
    'mcc',
    'multi-cc',
    'pall',
    'firebase-functions-best-practices',
    'prepare-agent-handoff',
    'stale-client-handling',
  ]
  const catalog = readFileSync(join(kitRoot, 'catalog.yaml'), 'utf8')
  const banned = [`${'perks'}-react`, `${'perkly'}-staging`, `${'dev'}6`]

  for (const name of promotedSkills) {
    const skillPath = join(kitRoot, 'skills', name, 'SKILL.md')
    assert.equal(existsSync(skillPath), true, `${name} skill is missing`)
    const skill = readFileSync(skillPath, 'utf8')
    assert.match(skill, new RegExp(`^name: ${name}$`, 'm'))
    assert.match(catalog, new RegExp(`^  - name: ${name}$`, 'm'))
    for (const sourceSpecific of banned) {
      assert.doesNotMatch(skill, new RegExp(sourceSpecific, 'i'))
    }
  }

  assert.equal(existsSync(join(kitRoot, 'workflows', 'codex-collaboration-core.md')), true)
  assert.equal(existsSync(join(kitRoot, 'workflows', 'multi-cc.md')), true)
  assert.equal(
    existsSync(
      join(
        kitRoot,
        'skills',
        'firebase-functions-best-practices',
        'references',
        'review-checklist.md',
      ),
    ),
    true,
  )
})

test('install-skill-to-repo creates a catalog entry and thin Claude command wrapper', () => {
  const target = tempDir('install-target')
  initGitRepo(target)
  mkdirSync(join(target, '.agents', 'vendor', 'agent-workflow-kit', 'skills', 'rebase'), { recursive: true })
  mkdirSync(join(target, '.agents'), { recursive: true })
  writeFileSync(
    join(target, '.agents', 'vendor', 'agent-workflow-kit', 'skills', 'rebase', 'SKILL.md'),
    ['---', 'name: rebase', 'description: Reset a worktree: safely', '---', '', '# Rebase', ''].join('\n'),
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
  assert.match(catalog, /description: "Reset a worktree: safely"/)
  assert.match(catalog, /claude: \.claude\/commands\/rebase\.md/)
  assert.match(catalog, /^workflows:$/m)
  assert.match(catalog, /path: \.agents\/workflows\/feature\.md/)

  const commandPath = join(target, '.claude', 'commands', 'rebase.md')
  assert.equal(existsSync(commandPath), true)
  const command = readFileSync(commandPath, 'utf8')
  assert.match(command, /^---\ndescription: /)
  assert.match(command, /Load `\.agents\/vendor\/agent-workflow-kit\/skills\/rebase\/SKILL\.md`/)
})

test('install-skill-to-repo creates an idempotent native Codex symlink for vendored skills', () => {
  const target = tempDir('install-native-link-target')
  initGitRepo(target)
  mkdirSync(join(target, '.agents', 'vendor', 'agent-workflow-kit', 'skills', 'rebase'), { recursive: true })
  writeFileSync(
    join(target, '.agents', 'vendor', 'agent-workflow-kit', 'skills', 'rebase', 'SKILL.md'),
    ['---', 'name: rebase', 'description: Reset a worktree safely', '---', '', '# Rebase', ''].join('\n'),
  )

  const installArgs = [
    resolve(kitRoot, 'scripts', 'install-skill-to-repo.mjs'),
    '--target',
    target,
    '--skill',
    'rebase',
    '--mode',
    'vendored',
  ]
  const first = spawnSync('node', installArgs, { cwd: kitRoot, encoding: 'utf8' })
  const second = spawnSync('node', installArgs, { cwd: kitRoot, encoding: 'utf8' })

  assert.equal(first.status, 0, first.stderr)
  assert.equal(second.status, 0, second.stderr)
  assert.equal(
    readlinkSync(join(target, '.agents', 'skills', 'rebase')),
    '../vendor/agent-workflow-kit/skills/rebase',
  )
  assert.match(first.stdout, /Codex skill: created/)
  assert.match(second.stdout, /Codex skill: unchanged/)
})

test('install-skill-to-repo preserves a conflicting repo-local skill directory', () => {
  const target = tempDir('install-native-link-conflict')
  initGitRepo(target)
  mkdirSync(join(target, '.agents', 'vendor', 'agent-workflow-kit', 'skills', 'rebase'), { recursive: true })
  mkdirSync(join(target, '.agents', 'skills', 'rebase'), { recursive: true })
  writeFileSync(
    join(target, '.agents', 'vendor', 'agent-workflow-kit', 'skills', 'rebase', 'SKILL.md'),
    ['---', 'name: rebase', 'description: Vendored rebase', '---', '', '# Vendored', ''].join('\n'),
  )
  writeFileSync(
    join(target, '.agents', 'skills', 'rebase', 'SKILL.md'),
    ['---', 'name: rebase', 'description: Local rebase', '---', '', '# Local', ''].join('\n'),
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

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Refusing to replace repo-local skill directory/)
  assert.match(readFileSync(join(target, '.agents', 'skills', 'rebase', 'SKILL.md'), 'utf8'), /# Local/)
  assert.equal(existsSync(join(target, '.agents', 'catalog.yaml')), false)
})

test('install-skill-to-repo override mode rejects a vendored symlink', () => {
  const target = tempDir('install-override-symlink')
  initGitRepo(target)
  mkdirSync(join(target, '.agents', 'vendor', 'agent-workflow-kit', 'skills', 'rebase'), { recursive: true })
  mkdirSync(join(target, '.agents', 'skills'), { recursive: true })
  writeFileSync(
    join(target, '.agents', 'vendor', 'agent-workflow-kit', 'skills', 'rebase', 'SKILL.md'),
    ['---', 'name: rebase', 'description: Vendored rebase', '---', '', '# Vendored', ''].join('\n'),
  )
  symlinkSync(
    '../vendor/agent-workflow-kit/skills/rebase',
    join(target, '.agents', 'skills', 'rebase'),
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
      'override',
    ],
    { cwd: kitRoot, encoding: 'utf8' },
  )

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Override mode requires a real repo-local skill directory/)
  assert.equal(
    readlinkSync(join(target, '.agents', 'skills', 'rebase')),
    '../vendor/agent-workflow-kit/skills/rebase',
  )
})

test('install-skill-to-repo preserves an unexpected native skill symlink', () => {
  const target = tempDir('install-unexpected-symlink')
  initGitRepo(target)
  mkdirSync(join(target, '.agents', 'vendor', 'agent-workflow-kit', 'skills', 'rebase'), { recursive: true })
  mkdirSync(join(target, '.agents', 'skills'), { recursive: true })
  writeFileSync(
    join(target, '.agents', 'vendor', 'agent-workflow-kit', 'skills', 'rebase', 'SKILL.md'),
    ['---', 'name: rebase', 'description: Vendored rebase', '---', '', '# Vendored', ''].join('\n'),
  )
  symlinkSync('../somewhere-else/rebase', join(target, '.agents', 'skills', 'rebase'))

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

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Refusing to replace unexpected skill symlink/)
  assert.equal(readlinkSync(join(target, '.agents', 'skills', 'rebase')), '../somewhere-else/rebase')
})

test('install-skill-to-repo adds PR helper npm aliases for PR loop skills', () => {
  const target = tempDir('install-pr-loop-target')
  initGitRepo(target)
  mkdirSync(join(target, '.agents', 'vendor', 'agent-workflow-kit', 'skills', 'pr-review-loop'), { recursive: true })
  mkdirSync(join(target, '.agents', 'vendor', 'agent-workflow-kit', 'scripts'), { recursive: true })
  writeFileSync(
    join(target, '.agents', 'vendor', 'agent-workflow-kit', 'skills', 'pr-review-loop', 'SKILL.md'),
    ['---', 'name: pr-review-loop', 'description: Review PRs', '---', '', '# PR Review Loop', ''].join('\n'),
  )
  writeFileSync(
    join(target, '.agents', 'vendor', 'agent-workflow-kit', 'scripts', 'agent-pr-status.mjs'),
    '#!/usr/bin/env node\n',
  )
  writeFileSync(
    join(target, 'package.json'),
    `${JSON.stringify({
      name: 'consumer',
      scripts: {
        test: 'node --test',
      },
    }, null, 2)}\n`,
  )

  const result = spawnSync(
    'node',
    [
      resolve(kitRoot, 'scripts', 'install-skill-to-repo.mjs'),
      '--target',
      target,
      '--skill',
      'pr-review-loop',
      '--mode',
      'vendored',
    ],
    { cwd: kitRoot, encoding: 'utf8' },
  )

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Package scripts:/)

  const pkg = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8'))
  assert.equal(pkg.scripts.test, 'node --test')
  assert.equal(
    pkg.scripts['agent-pr:status'],
    'node .agents/vendor/agent-workflow-kit/scripts/agent-pr-status.mjs status',
  )
  assert.equal(
    pkg.scripts['agent-pr:ready'],
    'node .agents/vendor/agent-workflow-kit/scripts/agent-pr-status.mjs ready',
  )
})

test('backup-repo-pack includes Claude command wrappers with the .agents snapshot', () => {
  const source = tempDir('pack-source')
  initGitRepo(source)
  mkdirSync(join(source, '.agents', 'skills', 'rebase'), { recursive: true })
  mkdirSync(join(source, '.agents', 'vendor', 'agent-workflow-kit', 'skills', 'pr-review-loop'), { recursive: true })
  mkdirSync(join(source, '.agents', 'vendor', 'agent-workflow-kit', 'workflows'), { recursive: true })
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
      '  - name: pr-review-loop',
      '    path: .agents/vendor/agent-workflow-kit/skills/pr-review-loop/SKILL.md',
      '    description: Review PRs',
      'workflows:',
      '  - name: pr-agent-loop',
      '    path: .agents/vendor/agent-workflow-kit/workflows/pr-agent-loop.md',
      '',
    ].join('\n'),
  )
  writeFileSync(
    join(source, '.agents', 'skills', 'rebase', 'SKILL.md'),
    ['---', 'name: rebase', 'description: Reset a worktree', '---', '', '# Rebase', ''].join('\n'),
  )
  writeFileSync(
    join(source, '.agents', 'vendor', 'agent-workflow-kit', 'skills', 'pr-review-loop', 'SKILL.md'),
    ['---', 'name: pr-review-loop', 'description: Review PRs', '---', '', '# PR Review Loop', ''].join('\n'),
  )
  writeFileSync(
    join(source, '.agents', 'vendor', 'agent-workflow-kit', 'workflows', 'pr-agent-loop.md'),
    ['---', 'description: PR workflow', '---', '', '# PR Workflow  ', ''].join('\n'),
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
  assert.equal(existsSync(join(packRoot, '.agents', 'skills', 'pr-review-loop', 'SKILL.md')), true)
  assert.equal(existsSync(join(packRoot, '.agents', 'workflows', 'pr-agent-loop.md')), true)
  assert.equal(existsSync(join(packRoot, '.claude', 'commands', 'rebase.md')), true)
  assert.doesNotMatch(readFileSync(join(packRoot, '.agents', 'catalog.yaml'), 'utf8'), /\.agents\/vendor/)
  assert.doesNotMatch(readFileSync(join(packRoot, '.agents', 'workflows', 'pr-agent-loop.md'), 'utf8'), / +$/m)
  assert.match(readFileSync(join(packRoot, 'README.md'), 'utf8'), /\.claude\/[\s\S]*commands/)
})

test('backup-repo-pack preserves internal relative command symlinks without writing through to the source', () => {
  const source = tempDir('pack-symlink-source')
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
      '',
    ].join('\n'),
  )
  const sourceSkill = join(source, '.agents', 'skills', 'rebase', 'SKILL.md')
  const sourceSkillContent = [
    '---',
    'name: rebase',
    'description: Reset a worktree',
    '---',
    '',
    '# Rebase  ',
    '',
  ].join('\n')
  writeFileSync(sourceSkill, sourceSkillContent)
  symlinkSync(
    '../../.agents/skills/rebase/SKILL.md',
    join(source, '.claude', 'commands', 'rebase.md'),
  )

  const packName = `test-pack-symlink-${Date.now()}`
  const packRoot = join(kitRoot, 'packs', packName)
  packRoots.push(packRoot)

  const result = spawnSync(
    'node',
    [resolve(kitRoot, 'scripts', 'backup-repo-pack.mjs'), '--source', source, '--pack', packName],
    { cwd: kitRoot, encoding: 'utf8' },
  )

  assert.equal(result.status, 0, result.stderr)
  assert.equal(
    readlinkSync(join(packRoot, '.claude', 'commands', 'rebase.md')),
    '../../.agents/skills/rebase/SKILL.md',
  )
  assert.equal(readFileSync(sourceSkill, 'utf8'), sourceSkillContent)
})

test('backup-repo-pack rewrites vendored command symlinks to pack-local materialized skills', () => {
  const source = tempDir('pack-vendored-symlink-source')
  initGitRepo(source)
  mkdirSync(
    join(source, '.agents', 'vendor', 'agent-workflow-kit', 'skills', 'gha-monitor'),
    { recursive: true },
  )
  mkdirSync(join(source, '.claude', 'commands'), { recursive: true })
  writeFileSync(
    join(source, '.agents', 'catalog.yaml'),
    [
      'skills:',
      '  - name: gha-monitor',
      '    path: .agents/vendor/agent-workflow-kit/skills/gha-monitor/SKILL.md',
      '    description: Monitor GitHub Actions',
      '',
    ].join('\n'),
  )
  writeFileSync(
    join(
      source,
      '.agents',
      'vendor',
      'agent-workflow-kit',
      'skills',
      'gha-monitor',
      'SKILL.md',
    ),
    [
      '---',
      'name: gha-monitor',
      'description: Monitor GitHub Actions',
      '---',
      '',
      '# GHA Monitor',
      '',
    ].join('\n'),
  )
  symlinkSync(
    '../../.agents/vendor/agent-workflow-kit/skills/gha-monitor/SKILL.md',
    join(source, '.claude', 'commands', 'gha-monitor.md'),
  )

  const packName = `test-pack-vendored-symlink-${Date.now()}`
  const packRoot = join(kitRoot, 'packs', packName)
  packRoots.push(packRoot)

  const result = spawnSync(
    'node',
    [resolve(kitRoot, 'scripts', 'backup-repo-pack.mjs'), '--source', source, '--pack', packName],
    { cwd: kitRoot, encoding: 'utf8' },
  )

  assert.equal(result.status, 0, result.stderr)
  assert.equal(
    readlinkSync(join(packRoot, '.claude', 'commands', 'gha-monitor.md')),
    '../../.agents/skills/gha-monitor/SKILL.md',
  )
  assert.equal(
    existsSync(join(packRoot, '.claude', 'commands', 'gha-monitor.md')),
    true,
  )
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

test('sync-to-repo reconciles only catalog-selected vendored skills for native Codex discovery', () => {
  const target = tempDir('sync-native-links')
  initGitRepo(target)
  mkdirSync(join(target, '.agents', 'skills', 'local-only'), { recursive: true })
  writeFileSync(
    join(target, '.agents', 'skills', 'local-only', 'SKILL.md'),
    ['---', 'name: local-only', 'description: Local skill', '---', '', '# Local', ''].join('\n'),
  )
  writeFileSync(
    join(target, '.agents', 'catalog.yaml'),
    [
      'skills:',
      '  - name: rebase',
      '    path: .agents/vendor/agent-workflow-kit/skills/rebase/SKILL.md',
      '    description: Vendored rebase',
      '  - name: local-only',
      '    path: .agents/skills/local-only/SKILL.md',
      '    description: Local skill',
      '',
    ].join('\n'),
  )

  const result = spawnSync(
    'node',
    [
      resolve(kitRoot, 'scripts', 'sync-to-repo.mjs'),
      '--target',
      realpathSync(target),
      '--ref',
      'HEAD',
    ],
    { cwd: kitRoot, encoding: 'utf8' },
  )

  assert.equal(result.status, 0, result.stderr)
  assert.equal(
    readlinkSync(join(target, '.agents', 'skills', 'rebase')),
    '../vendor/agent-workflow-kit/skills/rebase',
  )
  assert.match(readFileSync(join(target, '.agents', 'skills', 'local-only', 'SKILL.md'), 'utf8'), /# Local/)
  assert.match(result.stdout, /Codex skill rebase: created/)
})

test('sync-to-repo does not expose skills when the consumer has no catalog', () => {
  const target = tempDir('sync-no-catalog-links')
  initGitRepo(target)

  const result = spawnSync(
    'node',
    [
      resolve(kitRoot, 'scripts', 'sync-to-repo.mjs'),
      '--target',
      realpathSync(target),
      '--ref',
      'HEAD',
    ],
    { cwd: kitRoot, encoding: 'utf8' },
  )

  assert.equal(result.status, 0, result.stderr)
  assert.equal(existsSync(join(target, '.agents', 'skills')), false)
})

test('sync-to-repo reports native link plans during dry-run without mutating the consumer', () => {
  const target = tempDir('sync-native-links-dry-run')
  initGitRepo(target)
  mkdirSync(join(target, '.agents'), { recursive: true })
  writeFileSync(
    join(target, '.agents', 'catalog.yaml'),
    [
      'skills:',
      '  - name: rebase',
      '    path: .agents/vendor/agent-workflow-kit/skills/rebase/SKILL.md',
      '    description: Vendored rebase',
      '',
    ].join('\n'),
  )

  const result = spawnSync(
    'node',
    [
      resolve(kitRoot, 'scripts', 'sync-to-repo.mjs'),
      '--target',
      realpathSync(target),
      '--ref',
      'HEAD',
      '--dry-run',
    ],
    { cwd: kitRoot, encoding: 'utf8' },
  )

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Codex skill rebase: would create/)
  assert.equal(existsSync(join(target, '.agents', 'skills', 'rebase')), false)
  assert.equal(existsSync(join(target, '.agents', 'vendor')), false)
})

test('sync-to-repo aborts on native link conflicts before replacing the vendor bundle', () => {
  const target = tempDir('sync-native-link-conflict')
  initGitRepo(target)
  mkdirSync(join(target, '.agents', 'vendor', 'agent-workflow-kit'), { recursive: true })
  mkdirSync(join(target, '.agents', 'skills', 'rebase'), { recursive: true })
  writeFileSync(join(target, '.agents', 'vendor', 'agent-workflow-kit', 'KEEP'), 'preserve me\n')
  writeFileSync(
    join(target, '.agents', 'skills', 'rebase', 'SKILL.md'),
    ['---', 'name: rebase', 'description: Local rebase', '---', '', '# Local', ''].join('\n'),
  )
  writeFileSync(
    join(target, '.agents', 'catalog.yaml'),
    [
      'skills:',
      '  - name: rebase',
      '    path: .agents/vendor/agent-workflow-kit/skills/rebase/SKILL.md',
      '    description: Vendored rebase',
      '',
    ].join('\n'),
  )

  const result = spawnSync(
    'node',
    [
      resolve(kitRoot, 'scripts', 'sync-to-repo.mjs'),
      '--target',
      realpathSync(target),
      '--ref',
      'HEAD',
    ],
    { cwd: kitRoot, encoding: 'utf8' },
  )

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Refusing to replace repo-local skill directory/)
  assert.equal(readFileSync(join(target, '.agents', 'vendor', 'agent-workflow-kit', 'KEEP'), 'utf8'), 'preserve me\n')
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
