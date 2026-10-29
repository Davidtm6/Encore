#!/usr/bin/env bash
# Runs each supabase/tests/database/*.test.sql against its own fresh database
# that has a stand-in for Supabase (supabase-stub.sql) and every migration.
#
# Needs psql and a Postgres server you can create databases on. Connection
# settings come from the usual PG* variables (PGHOST, PGPORT, PGUSER,
# PGPASSWORD); with none set, psql uses your local server and login name.
# Usage: npm run test:db   (or bash supabase/tests/run-database-tests.sh)
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
migrations="$here/../migrations"
export PGOPTIONS="${PGOPTIONS:-} -c client_min_messages=warning"
run_psql=(psql -X -q -v ON_ERROR_STOP=1)

setup=(-f "$here/database/supabase-stub.sql")
for migration in "$migrations"/*.sql; do
  setup+=(-f "$migration")
done

failed=0
for test in "$here"/database/*.test.sql; do
  name="$(basename "$test" .test.sql)"
  db="encore_test_${name//-/_}"
  "${run_psql[@]}" -d postgres -c "drop database if exists $db" -c "create database $db"

  if output="$("${run_psql[@]}" -d "$db" "${setup[@]}" 2>&1)" &&
    output="$("${run_psql[@]}" -At -d "$db" -f "$here/database/helpers.sql" -f "$test" 2>&1)"; then
    echo "PASS $name"
    grep '^ok  ' <<<"$output" | sed 's/^/  /'
  else
    echo "FAIL $name"
    sed 's/^/  /' <<<"$output"
    failed=1
  fi

  "${run_psql[@]}" -d postgres -c "drop database if exists $db"
done

exit "$failed"
