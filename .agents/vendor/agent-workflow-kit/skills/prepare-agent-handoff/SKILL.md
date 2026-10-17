---
name: prepare-agent-handoff
description: Use when the user asks to hand prior conversation or referenced context to another agent, create a follow-up or copy-paste prompt, transfer work between coding, product, design, or research agents, or keep a downstream prompt concise enough for further design discussion.
---

# Prepare Agent Handoff

Turn confirmed context into one focused prompt that lets the next agent continue without replaying the conversation. Preserve room for that agent to investigate and make design choices.

## Output Contract

Return one fenced prompt block by default. Match the user's language and use only the sections that carry useful information:

```text
Goal
Gain
Essential context
Scope
Potential risks
Next step
```

For `low` detail, the default:

- Target roughly 120–250 words.
- State the goal in one or two sentences.
- Explain the gain in one sentence.
- Include three to five confirmed facts or decisions.
- State the included scope and the most important exclusion.
- List zero to three material risks.
- Give the next agent one immediate action.

For `medium` detail:

- Target roughly 250–500 words.
- Add only key evidence, referenced artifacts, constraints, and a few success signals.
- Keep unresolved solution choices available for the next agent to explore.

Use higher detail only when the user explicitly requests a detailed specification or implementation plan.

## Preparation

1. Identify the user's latest objective and the mode requested of the next agent: discuss, explore, design, plan, implement, review, or operate.
2. Preserve that authorization exactly. A discussion handoff requests discussion; an implementation handoff explicitly requests implementation.
3. Select confirmed decisions, facts, artifacts, constraints, and open questions that affect the next action.
4. Compress them into the output contract.
5. Read the prompt once as the receiving agent and remove anything that does not change its work.

Include a rejected alternative only when forgetting it would likely repeat a known mistake. Express risks as awareness, not automatically as new requirements. Prefer behavioral outcomes over file-by-file prescriptions so the receiving agent can inspect the current system.

When a minor detail is missing, make the smallest reasonable assumption. When uncertainty would materially change the goal, mode, or scope, ask one concise question before producing the handoff.

## Quality Check

Verify that:

- The goal is clear in the opening lines.
- The gain explains why the work matters.
- Every context item affects the next agent's decision or action.
- Scope and authorization match the user's request.
- Risks are limited and plausible.
- The next agent still has room to reason.
