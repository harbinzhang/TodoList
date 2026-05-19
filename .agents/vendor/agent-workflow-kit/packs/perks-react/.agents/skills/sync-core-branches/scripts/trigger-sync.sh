#!/usr/bin/env bash
set -euo pipefail

MAIN_BRANCH="main"
CONFLICT_STRATEGY="source-wins"
AUTO_RESOLVE_CONFLICTS="true"
SKIP_MAIN_SYNC="false"
EXTRA_BRANCHES=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --main-branch)
      MAIN_BRANCH="${2:-}"
      shift 2
      ;;
    --conflict-strategy)
      CONFLICT_STRATEGY="${2:-}"
      shift 2
      ;;
    --auto-resolve-conflicts)
      AUTO_RESOLVE_CONFLICTS="${2:-}"
      shift 2
      ;;
    --skip-main-sync)
      SKIP_MAIN_SYNC="true"
      shift
      ;;
    --extra-branches)
      EXTRA_BRANCHES="${2:-}"
      shift 2
      ;;
    -h|--help)
      cat <<USAGE
Usage: $0 [--main-branch main] [--conflict-strategy source-wins|target-wins] [--auto-resolve-conflicts true|false] [--skip-main-sync] [--extra-branches "a,b"]

Defaults:
  --conflict-strategy source-wins
  --auto-resolve-conflicts true

Examples:
  $0
  $0 --extra-branches "dev6"
  $0 --conflict-strategy target-wins
  $0 --skip-main-sync --extra-branches "release/1.2"
USAGE
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ "$CONFLICT_STRATEGY" != "source-wins" && "$CONFLICT_STRATEGY" != "target-wins" ]]; then
  echo "--conflict-strategy must be source-wins or target-wins" >&2
  exit 1
fi

if [[ "$AUTO_RESOLVE_CONFLICTS" != "true" && "$AUTO_RESOLVE_CONFLICTS" != "false" ]]; then
  echo "--auto-resolve-conflicts must be true or false" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is not clean. Commit or stash changes before running sync." >&2
  exit 1
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: ${CURRENT_BRANCH}"
echo "Main branch: ${MAIN_BRANCH}"
echo "Conflict strategy: ${CONFLICT_STRATEGY}"
echo "Auto resolve conflicts: ${AUTO_RESOLVE_CONFLICTS}"

git fetch origin --prune

resolve_conflicts() {
  local side="$1"
  mapfile -t conflicted < <(git diff --name-only --diff-filter=U)
  if [[ ${#conflicted[@]} -eq 0 ]]; then
    echo "Merge failed but no conflicted files were found." >&2
    return 1
  fi

  echo "Auto-resolving ${#conflicted[@]} conflicted file(s) with side=${side}"
  for file in "${conflicted[@]}"; do
    if [[ "$side" == "source" ]]; then
      git checkout --theirs -- "$file"
    else
      git checkout --ours -- "$file"
    fi
  done
  git add -A
}

merge_source_to_target() {
  local source_branch="$1"
  local target_branch="$2"

  local tmp_branch="tmp-sync-${target_branch//\//-}-$(date +%s)"
  local start_branch
  start_branch=$(git rev-parse --abbrev-ref HEAD)

  git checkout -B "$tmp_branch" "origin/${target_branch}"

  set +e
  git merge --no-ff --no-edit "origin/${source_branch}"
  local merge_status=$?
  set -e

  if [[ $merge_status -ne 0 ]]; then
    if [[ "$AUTO_RESOLVE_CONFLICTS" != "true" ]]; then
      echo "Merge conflict in ${source_branch} -> ${target_branch}, and auto resolve is disabled." >&2
      git merge --abort || true
      git checkout "$start_branch"
      git branch -D "$tmp_branch" >/dev/null 2>&1 || true
      return 1
    fi

    if [[ "$CONFLICT_STRATEGY" == "source-wins" ]]; then
      resolve_conflicts "source"
    else
      resolve_conflicts "target"
    fi

    git commit -m "chore: auto-resolve merge conflicts ${source_branch} -> ${target_branch} (${CONFLICT_STRATEGY})"
  fi

  git push origin "HEAD:${target_branch}"
  echo "Synced ${source_branch} -> ${target_branch}"

  git checkout "$start_branch"
  git branch -D "$tmp_branch" >/dev/null 2>&1 || true
}

build_core_branch_list() {
  local raw="${CORE_SYNC_BRANCHES:-native-release,ios-release}"
  if [[ -n "$EXTRA_BRANCHES" ]]; then
    raw="$raw,$EXTRA_BRANCHES"
  fi

  node -e "
    const raw = process.argv[1] || '';
    const main = process.argv[2] || 'main';
    const list = raw.split(',').map(s => s.trim()).filter(Boolean);
    const unique = [...new Set(list)].filter(b => b !== main);
    console.log(unique.join(','));
  " "$raw" "$MAIN_BRANCH"
}

if [[ "$SKIP_MAIN_SYNC" != "true" && "$CURRENT_BRANCH" != "$MAIN_BRANCH" ]]; then
  git push -u origin "$CURRENT_BRANCH"
  merge_source_to_target "$CURRENT_BRANCH" "$MAIN_BRANCH"
else
  echo "Step 1 skipped (current->main)."
fi

CORE_BRANCHES=$(build_core_branch_list)
if [[ -z "$CORE_BRANCHES" ]]; then
  echo "No core branches configured. Done."
  exit 0
fi

IFS=',' read -r -a TARGETS <<< "$CORE_BRANCHES"
for target in "${TARGETS[@]}"; do
  echo "---"
  echo "Syncing ${MAIN_BRANCH} -> ${target}"
  merge_source_to_target "$MAIN_BRANCH" "$target"
done

echo "All sync steps completed."
