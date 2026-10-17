# Codex Relay Detach Recovery

Load this reference only from the dispatch truth check in
`codex-relay-core.md`, when this dispatch's job is still `queued` or
`running` in companion state.

## Bind the job id

Use the job id already identified by the truth check (exact `task-\S+`
handle from the dispatch's own return, or the start-time/title match).
Never pick the newest or last-listed job.

## Start one backgrounded wait — do not hand-poll

Run the following as a single Bash call with `run_in_background: true`
(and no foreground timeout concern — the harness notifies on exit). Do not
poll `status` in foreground turns while it runs.

```bash
COMPANION=$(ls -d "$HOME"/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs 2>/dev/null | sort -V | tail -1)
JOB_ID="<job-id>"
# `status --wait` ALWAYS exits 0, even on wait timeout — judge completion
# from JSON job.status only. Terminal: completed|failed|cancelled.
DEADLINE=$((SECONDS + 1800))   # 30-minute overall cap
while [ $SECONDS -lt $DEADLINE ]; do
  SNAP=$(node "$COMPANION" status --wait --timeout-ms 240000 --json "$JOB_ID") \
    || { echo "RELAY-WAIT: STATUS-ERROR for $JOB_ID"; exit 2; }
  STATE=$(printf '%s' "$SNAP" | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).job.status')
  case "$STATE" in
    queued|running) continue ;;
    completed|failed|cancelled) node "$COMPANION" result "$JOB_ID"; exit 0 ;;
    *) echo "RELAY-WAIT: STATUS-ERROR for $JOB_ID (unparseable state: $STATE)"; exit 2 ;;
  esac
done
echo "RELAY-WAIT: TIMEOUT after 30m for $JOB_ID"
exit 1
```

The harness's background-task notification re-invokes the conductor when
this call exits. "Remembering to check" belongs to the harness, not the
model — do not add manual polling turns on top.

## On wake

1. Read the background call's captured output.
2. Exit 0 → the tail of the output is the authoritative `result <job-id>`
   payload. Re-confirm with `node "$COMPANION" status --json "$JOB_ID"`
   that the status is terminal, then hand the result to the core workflow's
   scope check → verification → checkpoint steps.
3. Exit 1 (`RELAY-WAIT: TIMEOUT`) → treat the job as the known silent
   "verifying" hang: **first** run `node "$COMPANION" cancel "$JOB_ID"` to
   stop the live write-capable job, **then** verify the now-quiescent
   working tree (targeted tests + typecheck on the applied changes), then
   checkpoint. Cancelling first is load-bearing: a job that keeps running
   during or after verification can mutate the tree and silently invalidate
   both the verification and the commit. Cancel stops the process; changes
   already applied to the tree survive for verification.
4. Exit 2 (`RELAY-WAIT: STATUS-ERROR`) → the companion itself failed;
   stop and surface to the user. Do not guess or re-dispatch.

A forwarder completion notification alone never means the executor
finished; only companion job state does.
