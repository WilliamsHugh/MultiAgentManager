#!/usr/bin/env bash
# check_cli_bridge.sh - T4: health check for the CLI bridge (opencode / freebuff)
#
# Exit codes:
#   0  all required checks passed (LLM smoke may be SKIPPED - see below)
#   1  required CLI missing or unusable
#   2  bad usage / environment error
#
# The LLM smoke test (opencode run) is ALLOW-FAILURE by default: quota /
# rate-limit / network problems must not turn CI red. Set STRICT_SMOKE=1 to
# make a failed smoke test fatal.

set -uo pipefail

NODE_VERSION="${NODE_VERSION:-v24.14.0}"
NODE_BIN="${NODE_BIN:-$HOME/.nvm/versions/node/$NODE_VERSION/bin}"
SMOKE_TIMEOUT="${SMOKE_TIMEOUT:-90}"
STRICT_SMOKE="${STRICT_SMOKE:-0}"
SMOKE_TOKEN="PIPELINE_OK"

[ -d "$NODE_BIN" ] && export PATH="$NODE_BIN:$PATH"

RC=0
SKIPPED=0

log()  { printf '%s\n' "$*"; }
ok()   { log "  [OK]    $*"; }
warn() { log "  [SKIP]  $*"; SKIPPED=$((SKIPPED+1)); }
fail() { log "  [FAIL]  $*"; RC=1; }

log "=== CLI bridge health check ==="
log "PATH node dir : $NODE_BIN"

# ---------------------------------------------------------------- node
log ""
log "-- node --"
if ! command -v node >/dev/null 2>&1; then
  fail "node not found on PATH"
else
  actual="$(node --version)"
  if [ "$actual" = "$NODE_VERSION" ]; then
    ok "node $actual"
  else
    # Not fatal: CI images pin their own node. Report loudly.
    log "  [WARN]  node $actual (expected $NODE_VERSION)"
  fi
fi

# ---------------------------------------------------------------- opencode
log ""
log "-- opencode (REQUIRED: planner + worker for pipeline v1) --"
if ! command -v opencode >/dev/null 2>&1; then
  fail "opencode not found on PATH"
else
  if v="$(timeout 30 opencode --version 2>&1)"; then
    ok "opencode --version -> $v"
  else
    fail "opencode --version failed: $v"
  fi
fi

# ---------------------------------------------------------------- freebuff
log ""
log "-- freebuff (OPTIONAL adapter: no headless argv mode in v0.0.135) --"
if ! command -v freebuff >/dev/null 2>&1; then
  warn "freebuff not found on PATH (optional)"
else
  if v="$(timeout 30 freebuff --version 2>&1)"; then
    ok "freebuff --version -> $v"
    case "$v" in
      0.0.135|v0.0.135)
        log "  [NOTE]  v0.0.135 rejects a prompt via argv (only 'login' subcommand)."
        log "          Do NOT use it as a PlannerBackend. See TASK_LIST.md T1."
        ;;
      *)
        log "  [NOTE]  version differs from the audited 0.0.135 - re-check whether"
        log "          a headless prompt mode now exists before enabling the adapter."
        ;;
    esac
  else
    warn "freebuff --version failed (optional): $v"
  fi
fi

# ---------------------------------------------------------------- smoke
log ""
log "-- LLM smoke: opencode run (allow-failure=$([ "$STRICT_SMOKE" = 1 ] && echo no || echo yes)) --"
if [ "$RC" -ne 0 ]; then
  warn "skipped: a required check already failed"
elif [ "${SKIP_SMOKE:-0}" = "1" ]; then
  warn "skipped: SKIP_SMOKE=1"
else
  out="$(timeout "$SMOKE_TIMEOUT" opencode run "reply with exactly: $SMOKE_TOKEN" 2>&1)"
  smoke_rc=$?
  # strip ANSI escapes before matching
  clean="$(printf '%s' "$out" | sed -E 's/\x1B\[[0-9;]*[A-Za-z]//g')"
  if [ "$smoke_rc" -eq 0 ] && printf '%s' "$clean" | grep -q "$SMOKE_TOKEN"; then
    ok "opencode run returned $SMOKE_TOKEN"
  else
    reason="exit=$smoke_rc"
    [ "$smoke_rc" -eq 124 ] && reason="timeout after ${SMOKE_TIMEOUT}s"
    printf '%s' "$clean" | grep -qiE '429|rate.?limit|quota|402|insufficient' \
      && reason="quota / rate-limit"
    if [ "$STRICT_SMOKE" = "1" ]; then
      fail "smoke failed ($reason)"
      printf '%s\n' "$clean" | tail -n 20 | sed 's/^/          | /'
    else
      warn "smoke not verified ($reason) - allow-failure, not a red build"
      printf '%s\n' "$clean" | tail -n 10 | sed 's/^/          | /'
    fi
  fi
fi

log ""
log "=== result: $([ "$RC" -eq 0 ] && echo PASS || echo FAIL) (skipped: $SKIPPED) ==="
exit "$RC"
