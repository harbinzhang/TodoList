# perks-react Skill Pack

This pack is generated from `git@github.com:harbinzhang/perks-react.git`.

It is repo-specific reference material. Other repositories can copy individual skills or workflows from this pack, but should review and adapt project IDs, hosts, command names, branch names, data paths, native release assumptions, and safety rules before use.

## Contents

```text
.agents/
  catalog.yaml
  conventions.md
  repo-profile.yaml
  skills/
  workflows/
```

The pack catalog points to pack-local `.agents/skills/...` entries so the pack can be copied as a self-contained starting point. It is not registered in the root generic `catalog.yaml`.

## Refresh

```bash
node scripts/backup-repo-pack.mjs --source /Users/haibinzhang/mine/react/perks-react --pack perks-react
```
