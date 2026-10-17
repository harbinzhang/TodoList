# Codex Adapter Notes

Codex discovers repository skills by scanning `.agents/skills/*/SKILL.md`.
It follows symlinked skill directories, so AWK exposes selected vendored skills
without duplicating their contents.

Recommended routing:

1. Keep repo-specific skills as real directories in `.agents/skills/`.
2. Vendor this kit to `.agents/vendor/agent-workflow-kit/`.
3. For each selected generic skill, create
   `.agents/skills/<name> -> ../vendor/agent-workflow-kit/skills/<name>`.
4. Keep `.agents/catalog.yaml` as AWK selection and adapter metadata, not as a
   Codex discovery source.

Example:

```text
.agents/skills/tdd -> ../vendor/agent-workflow-kit/skills/tdd
```

Use `scripts/install-skill-to-repo.mjs --mode vendored` to create the link and
thin adapter routing safely.
