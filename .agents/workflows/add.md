---
description: Create a new skill — a reusable set of instructions that teaches the AI how to perform a specific task. Use when users want to create, edit, or improve a skill from scratch, turn a conversation into a reusable workflow, or capture domain-specific knowledge into a skill file.
---

# Skill Creator Workflow

A skill is a bundled set of instructions (a `SKILL.md` file plus optional scripts/references/assets) that teaches the AI how to handle a specific type of task consistently and well.

## Core Loop

1. Figure out what the skill is about
2. Draft or edit the skill
3. Test the skill on realistic prompts
4. Evaluate and iterate until satisfied

---

## Step 1: Capture Intent

Start by understanding what the user wants. If the current conversation already contains a workflow to capture (e.g., "turn this into a skill"), extract answers from conversation history first.

Ask/confirm:
1. **What should this skill enable the AI to do?**
2. **When should this skill trigger?** (what user phrases/contexts)
3. **What's the expected output format?**
4. **Are test cases needed?** Skills with objectively verifiable outputs (file transforms, data extraction, code generation) benefit from test cases. Skills with subjective outputs (writing style) often don't.

## Step 2: Interview and Research

Proactively ask about edge cases, input/output formats, example files, success criteria, and dependencies. Research the codebase or web for relevant context before writing.

## Step 3: Write the SKILL.md

### Skill Structure

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter (name, description required)
│   └── Markdown instructions
└── Bundled Resources (optional)
    ├── scripts/    - Executable code for deterministic/repetitive tasks
    ├── references/ - Docs loaded into context as needed
    └── assets/     - Files used in output (templates, icons, fonts)
```

### Frontmatter

```yaml
---
name: skill-name
description: What it does AND when to trigger. Be specific and slightly "pushy" — include related contexts. E.g., "How to build dashboards. Use whenever the user mentions dashboards, data visualization, metrics, or wants to display any kind of data."
---
```

### Writing Guidelines

- **Keep SKILL.md under 500 lines.** If longer, add references/ files with clear pointers from SKILL.md.
- **Use imperative form** in instructions.
- **Explain the WHY** behind instructions instead of heavy-handed MUSTs. LLMs respond better to understanding reasoning than rigid rules.
- **Include examples** showing Input → Output for key patterns.
- **Use progressive disclosure**: metadata (~100 words) → SKILL.md body (<500 lines) → bundled resources (as needed).
- **Organize by domain/variant** when supporting multiple frameworks:

```
cloud-deploy/
├── SKILL.md (workflow + selection)
└── references/
    ├── aws.md
    ├── gcp.md
    └── azure.md
```

### Writing Style

- Explain to the model why things are important, not just what to do
- Use theory of mind — make the skill general, not narrow to specific examples
- Write a draft, then review with fresh eyes and improve
- If you find yourself writing ALWAYS/NEVER in all caps, reframe with reasoning instead

## Step 4: Create Test Cases

Come up with 2–3 realistic test prompts. Share with the user: "Here are a few test cases I'd like to try. Do these look right, or do you want to add more?"

Save test cases to `evals/evals.json`:

```json
{
  "skill_name": "example-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "User's task prompt",
      "expected_output": "Description of expected result",
      "files": []
    }
  ]
}
```

## Step 5: Run Test Cases

For each test case, follow the skill's SKILL.md instructions to accomplish the test prompt. Present results directly to the user:
- Show the prompt and the output for each test case
- If outputs are files, save them and tell the user where they are
- Ask for feedback inline: "How does this look? Anything you'd change?"

## Step 6: Iterate and Improve

Based on feedback:

1. **Generalize from feedback** — don't overfit to specific test examples. The skill should work across many prompts, not just the test set.
2. **Keep the prompt lean** — remove instructions that aren't pulling their weight. Read transcripts to see if the skill causes unproductive work.
3. **Explain the why** — transmit understanding of the task into the instructions rather than rigid constraints.
4. **Look for repeated work** — if test runs all wrote similar helper scripts, bundle that script into `scripts/` in the skill.

Repeat until:
- The user says they're happy
- Feedback is all empty (everything looks good)
- No meaningful progress is being made

## Step 7: Save the Skill

Save the final skill to the appropriate location:
- For project-specific skills: `.agents/skills/<skill-name>/SKILL.md`
- Confirm the save location with the user

---

## Quick Reference: Skill Anatomy

| Layer | Content | Size Target |
|-------|---------|-------------|
| **Metadata** (name + description) | Always in context | ~100 words |
| **SKILL.md body** | Loaded when skill triggers | <500 lines |
| **Bundled resources** | Loaded as needed | Unlimited |

## Principles

- **No surprise content** — skills must not contain anything the user wouldn't expect
- **Don't overfit** — generalize from specific examples
- **Explain reasoning** — "why" beats "MUST"
- **Progressive disclosure** — keep the triggering layer light, defer details to references
