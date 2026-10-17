# perks-react Skill Pack

This pack is generated from `git@github.com:harbinzhang/perks-react.git`.

It is repo-specific reference material. Other repositories can copy individual skills or workflows from this pack, but should review and adapt project IDs, hosts, command names, branch names, data paths, native release assumptions, and safety rules before use.

## Contents

```text
.agents/
  catalog.yaml
  conventions.md
  plans/
  prompts/
  repo-profile.yaml
  skills/
  templates/
  workflows/
.claude/
  commands/
```

The pack catalog and Claude command wrappers point to pack-local `.agents/skills/...` entries so the pack can be copied as a self-contained starting point. It is not registered in the root generic `catalog.yaml`.

## Refresh

```bash
node scripts/backup-repo-pack.mjs --source /private/tmp/perks-react-latest.NOaD5Y --pack perks-react
```
