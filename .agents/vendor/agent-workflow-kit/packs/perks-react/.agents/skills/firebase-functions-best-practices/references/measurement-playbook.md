# Measurement and Benchmarking Playbook

Use measurement to decide whether an optimization is real. Do not generate traffic against a remote environment without explicit authorization.

## Establish the question

Choose one primary outcome before testing:

- end-to-end callable latency;
- cold-start latency;
- warm handler latency;
- maximum sustainable throughput;
- Firestore reads/writes per invocation;
- memory or CPU pressure;
- error rate under concurrency;
- cost per successful operation.

Record the current function version, runtime options, dataset shape, auth/App Check state, request payload, concurrency, and downstream mocks. A benchmark without these controls is not comparable.

## Use the right environment

- Use unit tests for pure helpers, branching, idempotency, and concurrency-limit behavior.
- Use Firebase Emulator Suite for callable protocol, Auth/Firestore integration, and relative before/after comparisons.
- Use an extracted handler or Google Functions Framework for isolated HTTP/core-handler profiling.
- Treat emulator and local Functions Framework results as local evidence only. They do not model production cold starts, Cloud Run autoscaling, network topology, or Firestore production contention.
- Use production metrics for real cold starts and scaling. Prefer passive observation unless a remote load test is explicitly approved.

## Benchmark callable functions

Prefer the Firebase client SDK so token handling and the callable envelope match real clients. For direct HTTP tools, use the official callable protocol:

- send `POST` with `Content-Type: application/json`;
- wrap the argument as `{ "data": ... }`;
- include valid Authorization and App Check headers when required;
- parse callable errors rather than treating every HTTP 200 as application success.

Keep test identities and data isolated. Do not paste credentials into scripts, shell history, logs, or committed fixtures.

## Run a useful comparison

1. Warm up the local process separately from the measured sample.
2. Measure cold and warm runs separately.
3. Use the same payload and seeded data before and after the change.
4. Test a small concurrency staircase instead of one maximum burst.
5. Capture p50, p95, p99, throughput, error rate, and downstream operation counts.
6. Repeat enough runs to expose variance and report the sample size.
7. Stop when errors, throttling, or downstream saturation make additional load unsafe.

Use `autocannon` only for HTTP-compatible local endpoints or carefully constructed callable requests. Use Node's built-in `--cpu-prof` and `--heap-prof`, or Clinic.js when appropriate, to attribute CPU, event-loop, and heap problems.

## Interpret results carefully

- A faster mean with a worse p95/p99 may be a regression.
- More concurrency can reduce cold starts while increasing per-instance memory and downstream contention.
- `minInstances` can improve cold latency while increasing fixed cost.
- Larger memory may also change CPU allocation; compare both latency and cost.
- Removing a read is usually more durable than shaving local JavaScript nanoseconds.
- Cache gains are invalid if the cache can leak user data, grow without bounds, or serve stale authorization decisions.

## Report

Include:

- environment and exact target;
- baseline and candidate configuration;
- request/data shape and sample size;
- p50/p95/p99, throughput, errors, and operation counts;
- profiler evidence when used;
- limitations, especially emulator-versus-production gaps;
- whether the result supports, rejects, or leaves the hypothesis unresolved.
