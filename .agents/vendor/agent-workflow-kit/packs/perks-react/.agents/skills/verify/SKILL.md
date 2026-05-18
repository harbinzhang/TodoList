---
name: verify
description: "Run the repository's canonical verification command set from repo-profile.yaml. Use when the user asks for full verification, all tests, or a comprehensive check before completion."
---

# Verify Skill

Read `.agents/repo-profile.yaml` and run the configured commands.

## Defaults

```yaml
commands:
  test: npm run test
  verify: npm run verify
  build: npm run build
```

## Execution

1. Prefer `commands.verify` when present; it is the repo's canonical full gate.
2. If `commands.verify` is missing, run the available `commands.test` and `commands.build`.
3. If the profile defines additional explicit verification commands, run them in the safest order described by repo conventions.
4. Run independent checks in parallel when they do not share ports, databases, build output, or other mutable state.
5. Do not run checks in parallel when repo conventions say they share resources, such as emulators, databases, ports, or generated files.
6. Continue independent checks after a failure when doing so does not hide or compound the failure.

## Reporting

Report:

```md
| Check | Command | Result |
|---|---|---|
| canonical verify | ... | pass/fail |
```

Include a concise error summary for failures and state which checks were skipped with reasons.
