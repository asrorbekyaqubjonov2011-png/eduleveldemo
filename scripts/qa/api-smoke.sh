#!/usr/bin/env bash
# API smoke wrapper. Runs the repository's three API checks against one server and prints PASS, FAIL and SKIP counts.
#   scripts/smoke-db.mjs, scripts/smoke-exercises.mjs, scripts/security-test.mjs
# The first two write test rows (a course, a lesson, students, an exercise) into the target database, by design.
# security-test.mjs sends a burst of wrong passwords to test the login limiter: run it against a test server.
#
# Usage: scripts/qa/api-smoke.sh [--out <dir>]
#   --out <dir>   where the three logs are written (default: a new temporary folder, printed at the end)
#
# Environment:
#   QA_ENV_FILE          optional file with KEY=VALUE or export KEY=VALUE lines, sourced before anything else
#   BASE_URL             server to test (default http://localhost:3000)
#   OWNER_PASSWORD       owner password (or QA_OWNER_PASSWORD); also used as OWNER_SECRET
#   OWNER_USER           owner login (default jasurbek)
#   STUDENT_LOGIN, STUDENT_PASSWORD (or QA_STUDENT_LOGIN, QA_STUDENT_PASSWORD): student checks are skipped without them
#
# Exit codes: 0 every script exits 0 and there is no FAIL line; 1 otherwise; 2 setup error.
set -u

usage() {
  sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'
}

OUT=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --out) OUT="${2:-}"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [ -n "${QA_ENV_FILE:-}" ]; then
  if [ ! -f "$QA_ENV_FILE" ]; then
    echo "QA_ENV_FILE does not exist: $QA_ENV_FILE" >&2
    exit 2
  fi
  set -a
  # shellcheck disable=SC1090
  . "$QA_ENV_FILE"
  set +a
fi

export BASE_URL="${BASE_URL:-http://localhost:3000}"
export BASE="$BASE_URL"
export OWNER_USER="${OWNER_USER:-jasurbek}"
OWNER_PASSWORD="${OWNER_PASSWORD:-${QA_OWNER_PASSWORD:-}}"
export OWNER_PASSWORD
export OWNER_SECRET="${OWNER_SECRET:-$OWNER_PASSWORD}"
export STUDENT_LOGIN="${STUDENT_LOGIN:-${QA_STUDENT_LOGIN:-}}"
export STUDENT_PASSWORD="${STUDENT_PASSWORD:-${QA_STUDENT_PASSWORD:-}}"

if [ -z "$OWNER_PASSWORD" ]; then
  echo "Set OWNER_PASSWORD (or QA_OWNER_PASSWORD, or QA_ENV_FILE with it). Nothing was run." >&2
  exit 2
fi
if ! command -v node >/dev/null 2>&1; then
  echo "node is not on PATH. Nothing was run." >&2
  exit 2
fi

if [ -z "$OUT" ]; then
  OUT="$(mktemp -d "${TMPDIR:-/tmp}/edulevel-api-smoke.XXXXXX")"
fi
mkdir -p "$OUT"

echo "Target: $BASE_URL"
printf '%-18s %5s %6s %6s %6s\n' "script" "exit" "PASS" "FAIL" "SKIP"

total_pass=0
total_fail=0
total_skip=0
any_bad=0

run_one() {
  local name="$1" script="$2" log="$OUT/$1.log" code pass fail skip
  (cd "$ROOT" && node "$script") >"$log" 2>&1
  code=$?
  pass=$(grep -c '^PASS' "$log" || true)
  fail=$(grep -c '^FAIL' "$log" || true)
  skip=$(grep -c '^SKIP' "$log" || true)
  printf '%-18s %5s %6s %6s %6s\n' "$name" "$code" "$pass" "$fail" "$skip"
  total_pass=$((total_pass + pass))
  total_fail=$((total_fail + fail))
  total_skip=$((total_skip + skip))
  if [ "$code" -ne 0 ] || [ "$fail" -ne 0 ]; then any_bad=1; fi
}

run_one smoke-db scripts/smoke-db.mjs
run_one smoke-exercises scripts/smoke-exercises.mjs
run_one security-test scripts/security-test.mjs

printf '%-18s %5s %6s %6s %6s\n' "total" "" "$total_pass" "$total_fail" "$total_skip"
echo "logs: $OUT"

if [ "$any_bad" -ne 0 ]; then
  echo "RESULT: FAIL"
  exit 1
fi
echo "RESULT: PASS"
exit 0
