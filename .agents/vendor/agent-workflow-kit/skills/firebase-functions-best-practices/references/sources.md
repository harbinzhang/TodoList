# Primary Sources and Open-Source Tooling

Use primary sources. Firebase defaults, limits, supported runtimes, SDK behavior, and recommendations can change; refresh the relevant official page before making a time-sensitive claim. This source map was last checked on 2026-07-21.

## Official Firebase guidance

- [Tips and tricks](https://firebase.google.com/docs/functions/tips): cold starts, dependency loading, global initialization, `onInit()`, idempotency, concurrency, and local development.
- [Manage functions](https://firebase.google.com/docs/functions/manage-functions): Node runtimes, region migration, timeout, memory, CPU, `minInstances`, `maxInstances`, and concurrency.
- [Callable functions](https://firebase.google.com/docs/functions/callable): callable auth context, App Check guidance, region alignment, client SDK use, and `HttpsError` behavior.
- [Callable protocol](https://firebase.google.com/docs/functions/callable-reference): direct HTTP request envelope, accepted headers, response format, and error mapping.
- [Retry asynchronous functions](https://firebase.google.com/docs/functions/retries): retry semantics, end conditions, transient failures, and idempotency.
- [Cloud Firestore best practices](https://firebase.google.com/docs/firestore/best-practices): location, index fanout, asynchronous work, cursors, hotspots, contention, BulkWriter, and load testing.
- [Functions quotas and limits](https://firebase.google.com/docs/functions/quotas): current resource, rate, payload, and execution limits.

## Official open-source repositories

- [firebase/functions-samples](https://github.com/firebase/functions-samples): maintained examples for v2 callable, HTTP, Firestore, schedules, tasks, Auth, and testing. Treat samples as examples, not an exhaustive optimization standard.
- [firebase/firebase-functions](https://github.com/firebase/firebase-functions): the Functions SDK implementation, types, integration tests, changelog, and current API behavior.
- [firebase/firebase-tools](https://github.com/firebase/firebase-tools): Firebase CLI and Emulator Suite implementation used for local integration work.
- [GoogleCloudPlatform/functions-framework-nodejs](https://github.com/GoogleCloudPlatform/functions-framework-nodejs): the open-source Node.js Functions Framework for isolated local HTTP and CloudEvent execution.

## Supporting open-source performance tools

- [mcollina/autocannon](https://github.com/mcollina/autocannon): Node.js HTTP load generator for controlled local latency and throughput tests.
- [clinicjs/node-clinic](https://github.com/clinicjs/node-clinic): Node.js performance diagnosis for CPU, event-loop, async, and heap problems. Check current Node compatibility before adopting it; Node's built-in profilers are a lower-dependency alternative.

## Source discipline

- Prefer official Firebase documentation for supported configuration and production semantics.
- Prefer SDK source and changelogs when documentation is ambiguous about actual behavior.
- Use samples to learn patterns, but verify that the sample matches the project's generation, runtime, and trigger type.
- Do not infer production performance from repository popularity, a single sample, or a local microbenchmark.
