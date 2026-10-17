# Firebase Functions Review Checklist

Use only the sections relevant to the function under review. Prefer evidence-backed findings over checklist completion theater.

## 1. Entrypoint and callable boundary

- Confirm the trigger type and generation. Do not apply `onCall`, `onRequest`, event, schedule, or task-queue assumptions interchangeably.
- Confirm the client and function use the same region. A location mismatch adds network latency before handler work begins.
- For `onCall`, validate `request.auth` when authentication is required. Token verification and business authorization are separate checks.
- Decide whether App Check enforcement is appropriate for public app-facing endpoints. Confirm rollout compatibility before enabling it.
- Validate `request.data` with the repository's runtime schema before expensive work or writes.
- Return bounded response objects. Avoid returning whole Firestore documents, secrets, internal identifiers, or data the client does not consume.
- Use stable `HttpsError` codes for expected failures and keep internal diagnostics in structured server logs.
- Prefer the Firebase callable SDK. If a tool invokes the endpoint directly, follow the callable protocol exactly.

## 2. Async work and remote I/O

- Start independent remote operations together and await them together.
- Keep dependent operations sequential and make the dependency explicit.
- Look for reads inside loops, per-item external calls, repeated config reads, and repeated serialization.
- Replace unbounded `Promise.all` over user-controlled or large inputs with a bounded-concurrency pool.
- Apply downstream quotas, connection limits, and retry behavior when choosing concurrency.
- Avoid fetching data before cheap authentication, validation, feature-flag, empty-input, or cache checks.
- Await every required promise. Treat fire-and-forget email, analytics, and cleanup as lost work unless moved to a durable queue or event.
- Reuse initialized Admin SDK and service clients at module scope when they are concurrency-safe.

## 3. Cold start and initialization

- Import only dependencies needed by the deployed function bundle; investigate broad barrel imports and large SDKs.
- Keep deployment discovery free of slow network calls and expensive eager computation.
- Use global initialization for clients and reusable immutable data when every invocation needs them.
- Use lazy initialization or Firebase `onInit()` when initialization is expensive, function-specific, or unsafe during deployment discovery.
- Do not move request-specific mutable state, auth decisions, or unbounded caches into global scope.
- Measure cold and warm paths separately before adding `minInstances` or trading readability for lazy imports.

## 4. Runtime options and scaling

- Check `region`, `timeoutSeconds`, `memory`, CPU, `minInstances`, `maxInstances`, and `concurrency` in source-controlled runtime options.
- Co-locate compute with its dominant database or service when the product's user geography permits it.
- Treat `minInstances` as a recurring cost purchase for latency-sensitive paths. Require traffic and latency evidence.
- Confirm higher concurrency is safe for CPU, memory, global state, Firestore transactions, and downstream services.
- Use `maxInstances` to protect fragile downstream systems or cap cost, while acknowledging that it can create queuing and rejected load.
- Size memory and CPU from observed usage and latency. A longer timeout is not a fix for slow or unbounded work.
- For long fan-out work, prefer task queues, Pub/Sub, or resumable batches over a single callable invocation.

## 5. Firestore and data access

- Count document reads, queries, writes, and transaction attempts on the normal and worst-case paths.
- Parallelize independent reads; consolidate repeated reads and eliminate per-item N+1 queries.
- Select only needed fields when the server SDK and repository conventions support it.
- Use query limits and cursors. Avoid offsets, unbounded collection scans, and client-controlled limits without a server cap.
- Check index fanout and exempt large, TTL, sequential, array, or map fields when they are not queried.
- Avoid sequential document IDs and hot single-document counters on high-write paths.
- Use transactions only for read-modify-write invariants. Keep transaction callbacks deterministic and free of external side effects.
- Use batched writes for small atomic sets and BulkWriter or bounded batches for large independent writes.
- Check for recursive triggers when a handler writes to its own watched path.
- Consider the cost of retries: transactions and event delivery may execute code more than once.

## 6. Correctness under retries and concurrency

- Make event-driven handlers safe for at-least-once delivery.
- Derive idempotency keys from stable request, event, or operation identifiers and persist claims atomically when needed.
- Distinguish transient errors from permanent validation or business errors before enabling retries.
- Bound retry age, attempts, and backoff; route poison work to a durable failure path where appropriate.
- Ensure leases outlive the maximum live invocation, but still expire after crashes.
- Protect shared resources against duplicate requests, overlapping schedules, and concurrent instances.
- Avoid read-check-write races outside transactions or preconditions.

## 7. Security and abuse cost

- Authorize access to each referenced user, account, card, admin operation, or document.
- Enforce server-side caps on arrays, strings, query sizes, page sizes, fan-out, and external API spend.
- Rate-limit expensive public or user-facing operations with a design that accounts for multiple instances; instance-local maps are only best-effort.
- Keep secrets in supported secret configuration and bind only the secrets a function uses.
- Avoid logging tokens, sensitive request bodies, payment details, or full user records.
- Verify CORS and public invoker settings match the intended client surface; CORS is not authorization.

## 8. Observability and tests

- Emit structured logs with function/operation identifiers, outcome, duration, and safe cardinality.
- Measure p50, p95, and p99 latency, error rate, invocation count, instance count, memory, and downstream read/write/API volume.
- Distinguish cold-start time, handler time, Firestore time, and external API time when possible.
- Add direct tests for auth, invalid input, empty input, partial failure, repeated invocation, and concurrency-sensitive claims.
- Keep entrypoint exports, direct companion tests, and `docs/testing/functions-entrypoint-matrix.md` synchronized under repository policy.
