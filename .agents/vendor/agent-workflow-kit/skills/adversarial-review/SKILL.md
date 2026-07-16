---
name: adversarial-review
description: Use when an independent reviewer must challenge one exact PR head or commit SHA for merge-blocking risks, especially after implementation or before SHA-bound approval.
---

# Adversarial Review

## Objective

Try to falsify the claim that the exact reviewed change is safe to merge. Search aggressively, but reject only with evidence. Treat a clean review as valid; never invent findings or inflate severity to satisfy the adversarial role.

## Independence

Remain read-only. Do not edit files, commit, push, post PR comments, approve, or merge.

Accept only:

- repository instructions and original requirements
- exact base and target SHAs
- the complete diff and necessary surrounding code

Do not accept the author's conclusions, suspected bugs, proposed fixes, or previous findings during the independent pass. If they are already visible, ignore them until after returning the fresh verdict. The coordinator, not this reviewer, performs prior-finding closure checks.

## Review Method

1. Record the exact reviewed base and target SHAs. Stop with `CONDITIONAL` if either cannot be resolved and frozen.
2. Read applicable repository instructions, requirements, contracts, and full changed-file context.
3. Model inputs, state transitions, writes, failure paths, outputs, and downstream consumers.
4. Generate concrete hypotheses across relevant correctness, boundary, ordering, concurrency, authorization, privacy, persistence, compatibility, performance, failure-handling, accessibility, and maintainability risks.
5. Inspect callers and consumers when the changed behavior crosses the diff boundary.
6. Challenge tests as evidence; a green suite is not proof of correctness.
7. Attempt to disprove every suspected issue. Report only hypotheses that survive validation.

Do not flag unrelated pre-existing issues. Do not treat style preferences as blockers.

## Finding Standard

A blocking finding must identify:

- the violated requirement, contract, invariant, or safety property
- a concrete reachable failure scenario
- meaningful impact
- code or runtime evidence identifying the cause
- the smallest acceptable correction and regression proof

Classify other material improvements as non-blocking and missing product or technical context as questions.

## Verdict

Return exactly one verdict:

- `REJECT`: one or more blocking findings remain
- `CONDITIONAL`: missing context or material validation prevents a safe decision
- `PASS`: no blocking findings remain within the reviewed scope

Report the verdict first, then the exact reviewed state, blocking findings, non-blocking findings, questions, evidence inspected, validation not performed, and residual risks. A `PASS` is bounded to the exact target; any new change invalidates it.
