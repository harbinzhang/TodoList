#!/usr/bin/env node
import { execFileSync } from 'node:child_process'

import { evaluateAgentPrStatus } from './lib/agent-pr-status.mjs'

const [, , command, prArg, ...rest] = process.argv
const jsonOutput = rest.includes('--json')

function usage() {
  console.error('Usage: node scripts/agent-pr-status.mjs <status|ready> <pr-url-or-number> [--json]')
}

function runGh(args) {
  try {
    return execFileSync('gh', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    const stderr = error.stderr?.toString().trim()
    if (stderr) console.error(stderr)
    process.exit(error.status ?? 1)
  }
}

function parseRepoFromUrl(url) {
  const match = String(url ?? '').match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/\d+/)
  if (!match) return null
  return { owner: match[1], name: match[2] }
}

function parseRepoInfo(raw) {
  const repo = JSON.parse(raw)
  const owner = repo?.owner?.login
  const name = repo?.name

  if (!owner || !name) {
    throw new Error('Unable to resolve GitHub repository owner/name')
  }

  return { owner, name }
}

function resolveRepoInfo(pr) {
  return parseRepoFromUrl(pr?.url) ?? parseRepoInfo(runGh(['repo', 'view', '--json', 'owner,name']))
}

function fetchJson(args) {
  return JSON.parse(runGh(args))
}

function fetchPagedArray(endpoint) {
  const raw = runGh(['api', endpoint, '--paginate', '--jq', '.[] | @json'])
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line))
}

function fetchReviewThreads({ owner, name, number }) {
  const threads = []
  let cursor = null

  do {
    const payload = fetchJson([
      'api',
      'graphql',
      '-F',
      `owner=${owner}`,
      '-F',
      `repo=${name}`,
      '-F',
      `number=${number}`,
      '-F',
      `after=${cursor ?? ''}`,
      '-f',
      'query=query($owner:String!,$repo:String!,$number:Int!,$after:String){repository(owner:$owner,name:$repo){pullRequest(number:$number){reviewThreads(first:100,after:$after){nodes{id isResolved isOutdated comments(first:50){nodes{body url path line originalLine diffHunk author{login} createdAt}}}pageInfo{hasNextPage endCursor}}}}}',
    ])
    const reviewThreads = payload?.data?.repository?.pullRequest?.reviewThreads

    if (!reviewThreads) {
      throw new Error('Unable to fetch PR review threads')
    }

    threads.push(...(reviewThreads.nodes ?? []))
    cursor = reviewThreads.pageInfo?.hasNextPage ? reviewThreads.pageInfo?.endCursor : null
  } while (cursor)

  return threads
}

function fetchIssueComments({ owner, name, number }) {
  return fetchPagedArray(`repos/${owner}/${name}/issues/${number}/comments?per_page=100`)
}

function fetchInlineComments({ owner, name, number }) {
  return fetchPagedArray(`repos/${owner}/${name}/pulls/${number}/comments?per_page=100`)
}

function fetchPr(prArg) {
  const pr = fetchJson([
    'pr',
    'view',
    prArg,
    '--json',
    'number,url,state,closed,mergedAt,baseRefName,headRefName,headRefOid,mergeStateStatus,mergeable,comments,reviews,statusCheckRollup',
  ])
  const repo = resolveRepoInfo(pr)
  const request = {
    ...repo,
    number: pr.number,
  }

  return {
    ...pr,
    issueComments: fetchIssueComments(request),
    inlineComments: fetchInlineComments(request),
    reviewThreads: fetchReviewThreads(request),
  }
}

function printRecentReviewMarkers(markers) {
  console.log('Recent AGENT-REVIEW markers:')

  if (markers.length === 0) {
    console.log('- none')
    return
  }

  for (const marker of markers) {
    const reviewedHead = marker.reviewedHead ? ` reviewedHead=${marker.reviewedHead}` : ''
    const url = marker.url ? ` ${marker.url}` : ''
    console.log(`- ${marker.createdAt ?? 'unknown-time'} ${marker.source} ${marker.type}${reviewedHead}${url}`)
    console.log(`  ${marker.excerpt}`)
  }
}

function printInlineThreadAudit(audit) {
  const blocking = audit?.blocking ?? []
  const outdatedUnresolved = audit?.outdatedUnresolved ?? []
  const resolved = audit?.resolved ?? []

  console.log('Inline thread audit:')
  console.log(`- unresolved current: ${blocking.length}`)
  for (const thread of blocking) {
    const location = thread.path ? ` ${thread.path}${thread.line ? `:${thread.line}` : ''}` : ''
    const marker = thread.latestMarkerType ? ` marker=${thread.latestMarkerType}` : ' marker=none'
    const reviewedHead = thread.latestMarkerReviewedHead ? ` reviewedHead=${thread.latestMarkerReviewedHead}` : ''
    const author = thread.latestAuthor ? ` author=${thread.latestAuthor}` : ''
    const url = thread.url ? ` ${thread.url}` : ''
    console.log(`  - ${thread.id ?? 'unknown-thread'}${location}${marker}${reviewedHead}${author}${url}`)
    if (thread.latestMarkerExcerpt) console.log(`    ${thread.latestMarkerExcerpt}`)
  }
  console.log(`- unresolved outdated: ${outdatedUnresolved.length}`)
  console.log(`- resolved: ${resolved.length}`)
}

function printText(status) {
  console.log(`PR #${status.number}: ${status.url}`)
  console.log(`State: ${status.state}${status.merged ? ' (merged)' : ''}`)
  console.log(`Base: ${status.baseRefName}`)
  console.log(`Head: ${status.headRefName} @ ${status.headRefOid}`)
  console.log(`Merge state: ${status.mergeStateStatus ?? 'unknown'}`)
  console.log(`Mergeable: ${status.mergeable ?? 'unknown'}`)
  console.log(`GOOD_TO_GO: ${status.goodToGo?.valid ? `valid for ${status.goodToGo.reviewedHead}` : 'not valid'}`)
  console.log(`STOP: ${status.stopRequested ? 'yes' : 'no'}`)
  console.log(`Checks: ${status.checkSummary.state} (${status.checkSummary.total})`)
  if (status.checkSummary.informational.length > 0) {
    console.log(`Informational checks: ${status.checkSummary.informational.join(', ')}`)
  }
  console.log(`Active review feedback: ${status.activeReviewFeedback.length}`)
  for (const feedback of status.activeReviewFeedback) {
    console.log(`- ${feedback.type} from ${feedback.source}${feedback.reviewedHead ? ` for ${feedback.reviewedHead}` : ''}${feedback.url ? `: ${feedback.url}` : ''}`)
  }
  printRecentReviewMarkers(status.recentReviewMarkers)
  console.log(`Unresolved review threads: ${status.unresolvedBlockingThreads}`)
  printInlineThreadAudit(status.reviewThreadAudit)
  console.log(`Ready to merge: ${status.readyToMerge ? 'yes' : 'no'}`)

  if (status.blockers.length > 0) {
    console.log('Blockers:')
    for (const blocker of status.blockers) console.log(`- ${blocker}`)
  }

  if (status.warnings.length > 0) {
    console.log('Warnings:')
    for (const warning of status.warnings) console.log(`- ${warning}`)
  }
}

if (!['status', 'ready'].includes(command) || !prArg) {
  usage()
  process.exit(2)
}

const status = evaluateAgentPrStatus(fetchPr(prArg))

if (jsonOutput) {
  console.log(JSON.stringify(status, null, 2))
} else {
  printText(status)
}

if (command === 'ready' && !status.readyToMerge) {
  process.exit(1)
}
