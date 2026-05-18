const REVIEW_MARKER = 'AGENT-REVIEW:'
const GOOD_TO_GO_MARKER = 'AGENT-REVIEW: GOOD_TO_GO'
const STOP_MARKER = 'AGENT-REVIEW: STOP'
const FINDING_MARKER = 'AGENT-REVIEW: FINDING'
const DISCUSSION_MARKER = 'AGENT-REVIEW: DISCUSSION'
const RECENT_REVIEW_MARKER_LIMIT = 5

const ACCEPTABLE_CHECK_CONCLUSIONS = new Set([
  'SUCCESS',
  'SKIPPED',
  'NEUTRAL',
])

const READY_MERGE_STATE_STATUSES = new Set([
  'CLEAN',
])

function normalizeString(value) {
  return typeof value === 'string' ? value : ''
}

function normalizeCheckName(check, index) {
  return check?.name ?? check?.workflowName ?? check?.context ?? check?.__typename ?? `check-${index + 1}`
}

function isInformationalCheck(name) {
  return /\bbundle(?:\s+|:)check\b/i.test(name)
}

export function parseReviewedHead(body) {
  const text = normalizeString(body)
  const match = text.match(/Reviewed head:\s*([A-Za-z0-9._/-]+)/i)
  return match?.[1] ?? null
}

export function summarizeChecks(statusCheckRollup = []) {
  const checks = Array.isArray(statusCheckRollup) ? statusCheckRollup : []

  if (checks.length === 0) {
    return {
      state: 'none',
      total: 0,
      failing: [],
      pending: [],
      informational: [],
    }
  }

  const failing = []
  const pending = []
  const informational = []

  checks.forEach((check, index) => {
    const name = normalizeCheckName(check, index)
    const status = normalizeString(check?.status).toUpperCase()
    const conclusion = normalizeString(check?.conclusion).toUpperCase()

    if (isInformationalCheck(name)) {
      informational.push(name)
      return
    }

    if (status && status !== 'COMPLETED') {
      pending.push(name)
      return
    }

    if (!ACCEPTABLE_CHECK_CONCLUSIONS.has(conclusion)) {
      failing.push(name)
    }
  })

  return {
    state: failing.length > 0 ? 'fail' : pending.length > 0 ? 'pending' : 'pass',
    total: checks.length,
    failing,
    pending,
    informational,
  }
}

function pushMessages(messages, entries, source) {
  for (const entry of entries ?? []) {
    messages.push({
      body: normalizeString(entry?.body),
      author: entry?.author?.login ?? entry?.user?.login ?? null,
      url: entry?.html_url ?? entry?.url ?? null,
      createdAt: entry?.createdAt ?? entry?.submittedAt ?? entry?.created_at ?? null,
      source,
      sequence: messages.length,
    })
  }
}

function dedupeMessages(messages) {
  const seen = new Set()
  const deduped = []

  for (const message of messages) {
    const key = message.url
      ? `url:${message.url}`
      : `body:${message.source}:${message.createdAt ?? ''}:${message.body}`

    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(message)
  }

  return deduped
}

function collectPrMessages(pr) {
  const messages = []

  pushMessages(messages, pr?.comments, 'comment')
  pushMessages(messages, pr?.issueComments, 'issue-comment')
  pushMessages(messages, pr?.reviews, 'review')
  pushMessages(messages, pr?.inlineComments, 'inline-comment')
  for (const thread of pr?.reviewThreads ?? []) {
    pushMessages(messages, reviewThreadComments(thread), 'review-thread')
  }

  return dedupeMessages(messages)
    .filter((message) => message.body.includes(REVIEW_MARKER))
}

function sortByCreatedAt(messages) {
  return [...messages].sort((a, b) => {
    const left = Date.parse(a.createdAt ?? '')
    const right = Date.parse(b.createdAt ?? '')

    if (Number.isNaN(left) && Number.isNaN(right)) return 0
    if (Number.isNaN(left)) return -1
    if (Number.isNaN(right)) return 1
    return left - right
  })
}

function latestGoodToGo(messages, latestHead) {
  const candidates = sortByCreatedAt(messages)
    .filter((message) => message.body.includes(GOOD_TO_GO_MARKER))
    .map((message) => {
      const reviewedHead = parseReviewedHead(message.body)
      return {
        ...message,
        reviewedHead,
        valid: Boolean(reviewedHead && reviewedHead === latestHead),
      }
    })

  return candidates.at(-1) ?? null
}

function reviewFeedbackType(body) {
  if (body.includes(FINDING_MARKER)) return 'FINDING'
  if (body.includes(DISCUSSION_MARKER)) return 'DISCUSSION'
  return null
}

function isAfterMessage(message, reference) {
  if (!reference) return true

  const left = Date.parse(message?.createdAt ?? '')
  const right = Date.parse(reference?.createdAt ?? '')

  if (!Number.isNaN(left) && !Number.isNaN(right)) return left > right

  // If ordering is incomplete, keep the feedback active rather than allowing
  // a merge-readiness false negative.
  return true
}

function summarizeReviewFeedback(messages, latestHead, goodToGo) {
  const active = []
  const stale = []

  for (const message of sortByCreatedAt(messages)) {
    const type = reviewFeedbackType(message.body)
    if (!type) continue

    const reviewedHead = parseReviewedHead(message.body)
    const feedback = {
      type,
      reviewedHead,
      currentHead: !reviewedHead || reviewedHead === latestHead,
      source: message.source,
      author: message.author,
      url: message.url,
      createdAt: message.createdAt,
    }

    if (feedback.currentHead && isAfterMessage(message, goodToGo)) {
      active.push(feedback)
    } else {
      stale.push(feedback)
    }
  }

  return { active, stale }
}

function markerType(body) {
  const match = normalizeString(body).match(/AGENT-REVIEW:\s*([A-Z_]+)/)
  return match?.[1] ?? 'UNKNOWN'
}

function excerpt(body) {
  const normalized = normalizeString(body).replace(/\s+/g, ' ').trim()
  return normalized.length > 200 ? `${normalized.slice(0, 200)}...` : normalized
}

function summarizeRecentReviewMarkers(messages, limit = RECENT_REVIEW_MARKER_LIMIT) {
  return sortByCreatedAt(messages)
    .slice(-limit)
    .reverse()
    .map((message) => ({
      type: markerType(message.body),
      reviewedHead: parseReviewedHead(message.body),
      source: message.source,
      author: message.author,
      url: message.url,
      createdAt: message.createdAt,
      excerpt: excerpt(message.body),
    }))
}

function reviewThreadComments(thread) {
  const comments = thread?.comments
  if (Array.isArray(comments)) return comments
  if (Array.isArray(comments?.nodes)) return comments.nodes
  return []
}

function latestThreadComment(thread) {
  return sortByCreatedAt(reviewThreadComments(thread)).at(-1) ?? null
}

function latestThreadReviewMarker(thread) {
  return sortByCreatedAt(reviewThreadComments(thread))
    .filter((comment) => normalizeString(comment?.body).includes(REVIEW_MARKER))
    .at(-1) ?? null
}

function summarizeReviewThread(thread) {
  const latestComment = latestThreadComment(thread)
  const latestMarker = latestThreadReviewMarker(thread)
  const locationSource = latestMarker ?? latestComment ?? {}
  const isResolved = thread?.isResolved === true
  const isOutdated = thread?.isOutdated === true

  return {
    id: thread?.id ?? null,
    isResolved,
    isOutdated,
    blocking: !isResolved && !isOutdated,
    url: latestMarker?.url ?? latestComment?.url ?? thread?.url ?? null,
    path: locationSource?.path ?? thread?.path ?? null,
    line: locationSource?.line ?? thread?.line ?? null,
    originalLine: locationSource?.originalLine ?? thread?.originalLine ?? null,
    latestAuthor: latestComment?.author?.login ?? latestComment?.user?.login ?? null,
    latestCreatedAt: latestComment?.createdAt ?? latestComment?.created_at ?? null,
    latestMarkerType: latestMarker ? markerType(latestMarker.body) : null,
    latestMarkerReviewedHead: latestMarker ? parseReviewedHead(latestMarker.body) : null,
    latestMarkerExcerpt: latestMarker ? excerpt(latestMarker.body) : null,
  }
}

function summarizeReviewThreadAudit(reviewThreads = []) {
  const threads = Array.isArray(reviewThreads) ? reviewThreads.map(summarizeReviewThread) : []
  return {
    blocking: threads.filter((thread) => thread.blocking),
    outdatedUnresolved: threads.filter((thread) => !thread.isResolved && thread.isOutdated),
    resolved: threads.filter((thread) => thread.isResolved),
    all: threads,
  }
}

export function evaluateAgentPrStatus(pr) {
  const latestHead = pr?.headRefOid ?? null
  const merged = pr?.merged === true || Boolean(pr?.mergedAt)
  const mergeStateStatus = normalizeString(pr?.mergeStateStatus).toUpperCase() || null
  const mergeable = normalizeString(pr?.mergeable).toUpperCase() || null
  const messages = collectPrMessages(pr)
  const stopRequested = messages.some((message) => message.body.includes(STOP_MARKER))
  const goodToGo = latestGoodToGo(messages, latestHead)
  const reviewFeedback = summarizeReviewFeedback(messages, latestHead, goodToGo)
  const recentReviewMarkers = summarizeRecentReviewMarkers(messages)
  const checkSummary = summarizeChecks(pr?.statusCheckRollup)
  const reviewThreadAudit = summarizeReviewThreadAudit(pr?.reviewThreads)
  const unresolvedBlockingThreads = reviewThreadAudit.blocking.length
  const blockers = []
  const warnings = []

  if (pr?.state && pr.state !== 'OPEN') {
    blockers.push(`PR state is ${pr.state}`)
  }

  if (merged) {
    blockers.push('PR is already merged')
  }

  if (!latestHead) {
    blockers.push('PR head SHA is missing')
  }

  if (stopRequested) {
    blockers.push('AGENT-REVIEW: STOP is present')
  }

  if (mergeStateStatus && !READY_MERGE_STATE_STATUSES.has(mergeStateStatus)) {
    blockers.push(`PR mergeStateStatus is ${mergeStateStatus}`)
  }

  if (mergeable === 'CONFLICTING') {
    blockers.push('PR mergeable state is CONFLICTING')
  }

  if (!goodToGo?.valid) {
    if (goodToGo?.reviewedHead) {
      blockers.push('GOOD_TO_GO reviewed head does not match latest PR head')
    } else {
      blockers.push('No valid AGENT-REVIEW: GOOD_TO_GO for latest PR head')
    }
  }

  if (reviewFeedback.active.length > 0) {
    blockers.push(`${reviewFeedback.active.length} active AGENT-REVIEW feedback marker(s)`)
  }

  if (unresolvedBlockingThreads > 0) {
    blockers.push(`${unresolvedBlockingThreads} unresolved non-outdated review thread(s)`)
  }

  if (checkSummary.state === 'none') {
    warnings.push('No status checks found - verify this branch intentionally has no attached CI')
  } else if (checkSummary.state === 'fail') {
    blockers.push(`Status checks are failing: ${checkSummary.failing.join(', ')}`)
  } else if (checkSummary.state === 'pending') {
    blockers.push(`Status checks are pending: ${checkSummary.pending.join(', ')}`)
  }

  return {
    number: pr?.number ?? null,
    url: pr?.url ?? null,
    state: pr?.state ?? null,
    merged,
    baseRefName: pr?.baseRefName ?? null,
    headRefName: pr?.headRefName ?? null,
    headRefOid: latestHead,
    mergeStateStatus,
    mergeable,
    stopRequested,
    goodToGo,
    checkSummary,
    unresolvedBlockingThreads,
    reviewThreadAudit,
    activeReviewFeedback: reviewFeedback.active,
    staleReviewFeedback: reviewFeedback.stale,
    recentReviewMarkers,
    readyToMerge: blockers.length === 0,
    blockers,
    warnings,
  }
}
