import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  evaluateAgentPrStatus,
  parseReviewedHead,
  summarizeChecks,
} from './lib/agent-pr-status.mjs'

const HEAD = 'abc1234567890abcdef'

function makePr(overrides = {}) {
  return {
    number: 42,
    url: 'https://github.com/example/repo/pull/42',
    state: 'OPEN',
    merged: false,
    baseRefName: 'main',
    headRefName: 'feature/test',
    headRefOid: HEAD,
    comments: [],
    issueComments: [],
    reviews: [],
    inlineComments: [],
    reviewThreads: [],
    statusCheckRollup: [
      { name: 'test', status: 'COMPLETED', conclusion: 'SUCCESS' },
      { name: 'lint', status: 'COMPLETED', conclusion: 'SKIPPED' },
    ],
    ...overrides,
  }
}

describe('parseReviewedHead', () => {
  it('extracts the reviewed SHA from GOOD_TO_GO body text', () => {
    assert.equal(parseReviewedHead(`AGENT-REVIEW: GOOD_TO_GO\n\nReviewed head: ${HEAD}\nSafe to merge.`), HEAD)
  })

  it('returns null when the marker has no reviewed head', () => {
    assert.equal(parseReviewedHead('AGENT-REVIEW: GOOD_TO_GO\n\nLooks safe.'), null)
  })
})

describe('summarizeChecks', () => {
  it('reports missing checks without treating them as failed', () => {
    assert.deepEqual(summarizeChecks([]), {
      state: 'none',
      total: 0,
      failing: [],
      pending: [],
      informational: [],
    })
  })

  it('passes when every check is completed with an acceptable conclusion', () => {
    assert.deepEqual(summarizeChecks([
      { name: 'test', status: 'COMPLETED', conclusion: 'SUCCESS' },
      { name: 'lint', status: 'COMPLETED', conclusion: 'SKIPPED' },
      { name: 'docs', status: 'COMPLETED', conclusion: 'NEUTRAL' },
    ]), {
      state: 'pass',
      total: 3,
      failing: [],
      pending: [],
      informational: [],
    })
  })

  it('treats bundle checks as informational when they are pending or failing', () => {
    assert.deepEqual(summarizeChecks([
      { name: 'Bundle Check', status: 'QUEUED', conclusion: null },
      { name: 'bundle:check', status: 'COMPLETED', conclusion: 'FAILURE' },
      { name: 'test', status: 'COMPLETED', conclusion: 'SUCCESS' },
    ]), {
      state: 'pass',
      total: 3,
      failing: [],
      pending: [],
      informational: ['Bundle Check', 'bundle:check'],
    })
  })
})

describe('evaluateAgentPrStatus', () => {
  it('marks a PR ready when GOOD_TO_GO matches the latest head and gates are clean', () => {
    const status = evaluateAgentPrStatus(makePr({
      mergeStateStatus: 'CLEAN',
      mergeable: 'MERGEABLE',
      issueComments: [{
        body: `AGENT-REVIEW: GOOD_TO_GO\n\nReviewed head: ${HEAD}\nSafe to merge.`,
        url: 'https://github.com/example/repo/pull/42#issuecomment-1',
        user: { login: 'review-agent' },
        created_at: '2026-04-26T10:00:00Z',
      }],
    }))

    assert.equal(status.readyToMerge, true)
    assert.deepEqual(status.blockers, [])
    assert.deepEqual(status.warnings, [])
    assert.equal(status.goodToGo.valid, true)
    assert.equal(status.goodToGo.reviewedHead, HEAD)
    assert.equal(status.goodToGo.source, 'issue-comment')
  })

  it('accepts review markers from inline comments and matching GitHub authors', () => {
    const status = evaluateAgentPrStatus(makePr({
      author: { login: 'same-user' },
      inlineComments: [{
        body: `AGENT-REVIEW: GOOD_TO_GO\n\nReviewed head: ${HEAD}\nHuman approved the summary.`,
        html_url: 'https://github.com/example/repo/pull/42#discussion_r1',
        user: { login: 'same-user' },
        created_at: '2026-04-26T10:00:00Z',
      }],
    }))

    assert.equal(status.readyToMerge, true)
    assert.equal(status.goodToGo.author, 'same-user')
    assert.equal(status.goodToGo.source, 'inline-comment')
  })

  it('blocks when GOOD_TO_GO points at a stale head', () => {
    const status = evaluateAgentPrStatus(makePr({
      comments: [{
        body: 'AGENT-REVIEW: GOOD_TO_GO\n\nReviewed head: oldsha123\nSafe to merge.',
        author: { login: 'review-agent' },
      }],
    }))

    assert.equal(status.readyToMerge, false)
    assert.ok(status.blockers.includes('GOOD_TO_GO reviewed head does not match latest PR head'))
  })

  it('blocks ordinary approval text without the marker', () => {
    const status = evaluateAgentPrStatus(makePr({
      comments: [{
        body: 'LGTM, good to go',
        author: { login: 'review-agent' },
      }],
    }))

    assert.equal(status.readyToMerge, false)
    assert.equal(status.goodToGo, null)
    assert.ok(status.blockers.includes('No valid AGENT-REVIEW: GOOD_TO_GO for latest PR head'))
  })

  it('blocks when STOP is present', () => {
    const status = evaluateAgentPrStatus(makePr({
      reviews: [{
        body: 'AGENT-REVIEW: STOP\n\nHold this PR.',
        author: { login: 'review-agent' },
      }],
    }))

    assert.equal(status.readyToMerge, false)
    assert.equal(status.stopRequested, true)
    assert.ok(status.blockers.includes('AGENT-REVIEW: STOP is present'))
  })

  it('blocks when an inline review finding is newer than the valid GOOD_TO_GO', () => {
    const status = evaluateAgentPrStatus(makePr({
      issueComments: [{
        body: `AGENT-REVIEW: GOOD_TO_GO\n\nReviewed head: ${HEAD}\nSafe to merge.`,
        url: 'https://github.com/example/repo/pull/42#issuecomment-1',
        user: { login: 'review-agent' },
        created_at: '2026-04-26T10:00:00Z',
      }],
      inlineComments: [{
        body: `AGENT-REVIEW: FINDING\n\n[P1] src/form.ts:12\nThis still misses stale presets.\n\nReviewed head: ${HEAD}\nWhat do you think?`,
        html_url: 'https://github.com/example/repo/pull/42#discussion_r1',
        user: { login: 'review-agent' },
        created_at: '2026-04-26T10:05:00Z',
      }],
    }))

    assert.equal(status.readyToMerge, false)
    assert.equal(status.activeReviewFeedback.length, 1)
    assert.equal(status.activeReviewFeedback[0].source, 'inline-comment')
    assert.ok(status.blockers.includes('1 active AGENT-REVIEW feedback marker(s)'))
  })

  it('blocks when an issue-level finding exists even with no unresolved threads', () => {
    const status = evaluateAgentPrStatus(makePr({
      issueComments: [{
        body: `AGENT-REVIEW: GOOD_TO_GO\n\nReviewed head: ${HEAD}\nSafe to merge.`,
        url: 'https://github.com/example/repo/pull/42#issuecomment-1',
        user: { login: 'review-agent' },
        created_at: '2026-05-18T00:40:00Z',
      }, {
        body: `AGENT-REVIEW: FINDING\n\n[P1] src/form.ts:12\nThis top-level PR comment still applies.\n\nReviewed head: ${HEAD}\nWhat do you think?`,
        url: 'https://github.com/example/repo/pull/42#issuecomment-4473217586',
        user: { login: 'review-agent' },
        created_at: '2026-05-18T00:47:57Z',
      }],
      reviewThreads: [],
    }))

    assert.equal(status.readyToMerge, false)
    assert.equal(status.unresolvedBlockingThreads, 0)
    assert.equal(status.activeReviewFeedback.length, 1)
    assert.equal(status.activeReviewFeedback[0].source, 'issue-comment')
    assert.equal(status.activeReviewFeedback[0].url, 'https://github.com/example/repo/pull/42#issuecomment-4473217586')
    assert.ok(status.blockers.includes('1 active AGENT-REVIEW feedback marker(s)'))
  })

  it('keeps recent review marker audit entries from issue and inline comments', () => {
    const status = evaluateAgentPrStatus(makePr({
      issueComments: [{
        body: `AGENT-REVIEW: HUMAN_SUMMARY\n\nReviewed head: ${HEAD}\nRecommendation: wait`,
        url: 'https://github.com/example/repo/pull/42#issuecomment-1',
        user: { login: 'review-agent' },
        created_at: '2026-04-26T10:00:00Z',
      }],
      inlineComments: [{
        body: `AGENT-REVIEW: FINDING\n\n[P1] src/form.ts:12\n${'x'.repeat(220)}\n\nReviewed head: ${HEAD}\nWhat do you think?`,
        html_url: 'https://github.com/example/repo/pull/42#discussion_r1',
        user: { login: 'review-agent' },
        created_at: '2026-04-26T10:05:00Z',
      }],
    }))

    assert.equal(status.recentReviewMarkers.length, 2)
    assert.equal(status.recentReviewMarkers[0].type, 'FINDING')
    assert.equal(status.recentReviewMarkers[0].source, 'inline-comment')
    assert.equal(status.recentReviewMarkers[0].reviewedHead, HEAD)
    assert.ok(status.recentReviewMarkers[0].excerpt.length <= 203)
    assert.equal(status.recentReviewMarkers[1].type, 'HUMAN_SUMMARY')
    assert.equal(status.recentReviewMarkers[1].source, 'issue-comment')
  })

  it('deduplicates top-level comments returned by both gh pr view and issue comments', () => {
    const comment = {
      body: `AGENT-REVIEW: FINDING\n\n[P1] src/form.ts:12\nSame comment.\n\nReviewed head: ${HEAD}\nWhat do you think?`,
      url: 'https://github.com/example/repo/pull/42#issuecomment-1',
      author: { login: 'review-agent' },
      createdAt: '2026-04-26T10:00:00Z',
    }
    const status = evaluateAgentPrStatus(makePr({
      comments: [comment],
      issueComments: [{
        body: comment.body,
        html_url: comment.url,
        user: { login: 'review-agent' },
        created_at: comment.createdAt,
      }],
    }))

    assert.equal(status.activeReviewFeedback.length, 1)
    assert.equal(status.recentReviewMarkers.length, 1)
  })

  it('does not block on stale feedback for an older reviewed head before the valid GOOD_TO_GO', () => {
    const status = evaluateAgentPrStatus(makePr({
      inlineComments: [{
        body: 'AGENT-REVIEW: FINDING\n\n[P1] src/form.ts:12\nOld issue.\n\nReviewed head: oldsha123\nWhat do you think?',
        html_url: 'https://github.com/example/repo/pull/42#discussion_r1',
        user: { login: 'review-agent' },
        created_at: '2026-04-26T10:00:00Z',
      }],
      issueComments: [{
        body: `AGENT-REVIEW: GOOD_TO_GO\n\nReviewed head: ${HEAD}\nSafe to merge.`,
        url: 'https://github.com/example/repo/pull/42#issuecomment-1',
        user: { login: 'review-agent' },
        created_at: '2026-04-26T10:05:00Z',
      }],
    }))

    assert.equal(status.readyToMerge, true)
    assert.equal(status.activeReviewFeedback.length, 0)
    assert.equal(status.staleReviewFeedback.length, 1)
    assert.equal(status.staleReviewFeedback[0].reviewedHead, 'oldsha123')
  })

  it('treats mergedAt as the current gh merged signal', () => {
    const status = evaluateAgentPrStatus(makePr({
      state: 'MERGED',
      merged: undefined,
      mergedAt: '2026-04-30T16:23:06Z',
      comments: [{
        body: `AGENT-REVIEW: GOOD_TO_GO\n\nReviewed head: ${HEAD}\nSafe to merge.`,
        author: { login: 'review-agent' },
      }],
    }))

    assert.equal(status.merged, true)
    assert.equal(status.readyToMerge, false)
    assert.ok(status.blockers.includes('PR is already merged'))
  })

  it('blocks unresolved review threads and failed checks', () => {
    const status = evaluateAgentPrStatus(makePr({
      comments: [{
        body: `AGENT-REVIEW: GOOD_TO_GO\n\nReviewed head: ${HEAD}\nSafe to merge.`,
        author: { login: 'review-agent' },
      }],
      reviewThreads: [
        { id: 'thread-1', isResolved: false, isOutdated: false },
        { id: 'thread-2', isResolved: false, isOutdated: true },
      ],
      statusCheckRollup: [
        { name: 'test', status: 'COMPLETED', conclusion: 'FAILURE' },
      ],
    }))

    assert.equal(status.readyToMerge, false)
    assert.equal(status.unresolvedBlockingThreads, 1)
    assert.ok(status.blockers.includes('1 unresolved non-outdated review thread(s)'))
    assert.ok(status.blockers.includes('Status checks are failing: test'))
  })

  it('audits unresolved inline review thread details from GraphQL comments', () => {
    const status = evaluateAgentPrStatus(makePr({
      comments: [{
        body: `AGENT-REVIEW: GOOD_TO_GO\n\nReviewed head: ${HEAD}\nSafe to merge.`,
        author: { login: 'review-agent' },
        createdAt: '2026-05-18T10:00:00Z',
      }],
      reviewThreads: [{
        id: 'thread-1',
        isResolved: false,
        isOutdated: false,
        comments: {
          nodes: [{
            body: `AGENT-REVIEW: FINDING\n\n[P1] src/form.ts:12\nStill broken.\n\nReviewed head: ${HEAD}\nWhat do you think?`,
            url: 'https://github.com/example/repo/pull/42#discussion_r1',
            path: 'src/form.ts',
            line: 12,
            originalLine: 10,
            author: { login: 'same-user' },
            createdAt: '2026-05-18T10:05:00Z',
          }],
        },
      }, {
        id: 'thread-2',
        isResolved: false,
        isOutdated: true,
        comments: {
          nodes: [{
            body: 'Old thread.',
            url: 'https://github.com/example/repo/pull/42#discussion_r2',
            path: 'src/old.ts',
            line: 8,
            author: { login: 'review-agent' },
            createdAt: '2026-05-18T09:00:00Z',
          }],
        },
      }],
    }))

    assert.equal(status.readyToMerge, false)
    assert.equal(status.unresolvedBlockingThreads, 1)
    assert.equal(status.reviewThreadAudit.blocking.length, 1)
    assert.equal(status.reviewThreadAudit.outdatedUnresolved.length, 1)
    assert.equal(status.reviewThreadAudit.blocking[0].id, 'thread-1')
    assert.equal(status.reviewThreadAudit.blocking[0].url, 'https://github.com/example/repo/pull/42#discussion_r1')
    assert.equal(status.reviewThreadAudit.blocking[0].path, 'src/form.ts')
    assert.equal(status.reviewThreadAudit.blocking[0].line, 12)
    assert.equal(status.reviewThreadAudit.blocking[0].latestAuthor, 'same-user')
    assert.equal(status.reviewThreadAudit.blocking[0].latestMarkerType, 'FINDING')
    assert.equal(status.reviewThreadAudit.blocking[0].latestMarkerReviewedHead, HEAD)
  })

  it('does not block readiness on queued bundle checks', () => {
    const status = evaluateAgentPrStatus(makePr({
      comments: [{
        body: `AGENT-REVIEW: GOOD_TO_GO\n\nReviewed head: ${HEAD}\nSafe to merge.`,
        author: { login: 'review-agent' },
      }],
      statusCheckRollup: [
        { name: 'Bundle Check', status: 'QUEUED', conclusion: null },
        { name: 'test', status: 'COMPLETED', conclusion: 'SUCCESS' },
      ],
    }))

    assert.equal(status.readyToMerge, true)
    assert.deepEqual(status.blockers, [])
    assert.equal(status.checkSummary.state, 'pass')
    assert.deepEqual(status.checkSummary.informational, ['Bundle Check'])
  })

  it('does not block merge solely because no status checks are attached', () => {
    const status = evaluateAgentPrStatus(makePr({
      mergeStateStatus: 'CLEAN',
      mergeable: 'MERGEABLE',
      comments: [{
        body: `AGENT-REVIEW: GOOD_TO_GO\n\nReviewed head: ${HEAD}\nSafe to merge.`,
        author: { login: 'review-agent' },
      }],
      statusCheckRollup: [],
    }))

    assert.equal(status.readyToMerge, true)
    assert.deepEqual(status.blockers, [])
    assert.ok(status.warnings.includes('No status checks found - verify this branch intentionally has no attached CI'))
    assert.equal(status.checkSummary.state, 'none')
    assert.equal(status.checkSummary.total, 0)
  })

  it('blocks merge when GitHub reports a dirty merge state', () => {
    const status = evaluateAgentPrStatus(makePr({
      mergeStateStatus: 'DIRTY',
      mergeable: 'CONFLICTING',
      comments: [{
        body: `AGENT-REVIEW: GOOD_TO_GO\n\nReviewed head: ${HEAD}\nSafe to merge.`,
        author: { login: 'review-agent' },
      }],
    }))

    assert.equal(status.readyToMerge, false)
    assert.ok(status.blockers.includes('PR mergeStateStatus is DIRTY'))
    assert.ok(status.blockers.includes('PR mergeable state is CONFLICTING'))
  })
})
