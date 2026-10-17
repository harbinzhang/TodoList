---
name: firebase-functions-best-practices
description: Audit, design, implement, or refactor Node.js Cloud Functions for Firebase, especially v2 onCall, onRequest, Firestore/event, scheduled, and task functions. Use for slow or expensive functions, cold starts, callable security, Firestore I/O, async waterfalls, retries and idempotency, runtime scaling options, observability, load testing, or backend performance reviews.
---

# Firebase Functions Best Practices

Optimize Firebase Functions without trading away correctness, security, or cost control. Treat measured production behavior as stronger evidence than generic micro-optimizations.

## Respect the requested mode

- For review, audit, diagnosis, `WDYT?`, or planning requests, stay read-only and report findings. Do not edit files, run tests, deploy, or generate load.
- For explicit implementation requests, make the narrowest safe change and run proportionate local verification.
- Never load-test staging or production, change runtime capacity, deploy, or write production data without explicit authorization.

## Workflow

1. Establish the exact scope.
   - Identify the function entrypoint, trigger type, generation, Node runtime, region, callers, downstream services, and current runtime options.
   - For a diff review, inspect only the requested diff plus enough surrounding code to prove each finding.
   - For an end-to-end latency issue, trace the frontend caller and backend handler; use `vercel-react-best-practices` for the React side when available.

2. Build the request and side-effect map.
   - Follow authentication, App Check, input parsing, Firestore and external I/O, retries, writes, logs, response serialization, and client invalidation.
   - Count sequential remote round trips and identify which operations are truly independent.
   - Record whether each side effect is safe under concurrent or repeated execution.

3. Load the relevant detailed guidance.
   - Read [review-checklist.md](references/review-checklist.md) for every code or configuration audit.
   - Also read [measurement-playbook.md](references/measurement-playbook.md) when diagnosing latency, memory, throughput, cold starts, or cost.
   - Read [sources.md](references/sources.md) when a rule needs provenance or when current Firebase limits, defaults, APIs, or recommendations may have changed.

4. Review in impact order.
   - Correctness and abuse resistance.
   - Unnecessary remote I/O, N+1 work, and async waterfalls.
   - Cold-start and initialization cost.
   - Runtime scaling, concurrency, and downstream capacity.
   - Firestore contention, index fanout, payload size, and serialization.
   - Observability, regression tests, and cost evidence.

5. Separate proof from hypothesis.
   - Label a problem as verified only when code, configuration, logs, traces, metrics, or a reproducible benchmark proves it.
   - Label plausible optimizations without measurement as hypotheses.
   - Do not claim that an emulator result predicts production cold-start or autoscaling behavior.

6. Verify proportionately after implementation.
   - Prefer direct peer unit or contract tests for changed handlers and helpers.
   - Use the repository profile verification command and the narrowest relevant Functions test command before considering the full Functions suite.
   - Exercise callable authentication, invalid input, duplicate execution, partial failure, and concurrency-sensitive behavior when affected.
   - Benchmark only when the request is performance-sensitive and the benchmark can represent the changed path.

## Non-negotiable guardrails

- Validate authorization and input before expensive work. A verified token does not mean the caller is authorized for the requested resource.
- Prefer `HttpsError` for expected callable failures; do not expose internal errors, secrets, document paths, or stack traces.
- Await or return all work that must finish. Do not continue background work after sending the response.
- Make retryable event handlers idempotent and bound retry loops. Keep external side effects out of retried Firestore transaction callbacks.
- Never parallelize operations with ordering, transaction, rate-limit, or shared-resource dependencies merely to use `Promise.all`.
- Keep module-scope state immutable, concurrency-safe, or explicitly bounded. Never store request- or user-specific authorization state globally.
- Treat `minInstances`, `maxInstances`, `concurrency`, CPU, memory, timeout, and region as workload and cost decisions, not universal tuning knobs.
- Preserve existing data contracts and entrypoint test-parity requirements.

## Finding threshold

Report only issues with a concrete failure mode or measurable resource impact:

- **Critical**: authorization bypass, unbounded abuse/cost, data corruption, duplicate side effects, runaway recursion/retry, or work that can silently outlive the invocation.
- **Important**: proven or strongly evidenced latency/cost/scaling defect, N+1 remote I/O, unsafe concurrency, missing idempotency, or materially oversized payload/work.
- **Suggestion**: low-risk improvement whose value is plausible but not yet measured.

For each finding, include the location, evidence, impact, and narrow remedy. Finish with:

- verified findings;
- hypotheses requiring measurement;
- commands or evidence inspected;
- verification performed or explicitly not performed.
