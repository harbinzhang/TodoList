# Codex Adapter Notes

Codex can use this kit through a consumer repo's `.agents/catalog.yaml`.

Recommended routing:

1. Keep repo-specific skills in `.agents/skills/`.
2. Vendor this kit to `.agents/vendor/agent-workflow-kit/`.
3. Point generic catalog entries to vendored skill paths only when there is no local override.

Example:

```yaml
skills:
  - name: tdd
    path: .agents/vendor/agent-workflow-kit/skills/tdd/SKILL.md
```
