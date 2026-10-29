-- Assertions for the database tests. The runner loads this file in the same
-- session as each test, so the functions live in pg_temp and disappear after.
-- Each one returns 'ok  <label>' or raises an error that fails the test.

create function pg_temp.check(label text, ok boolean) returns text
language plpgsql as $$
begin
  if ok is not true then
    raise exception 'FAIL: %', label;
  end if;
  return 'ok  ' || label;
end;
$$;

create function pg_temp.check_equal(label text, actual text, expected text) returns text
language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL: % (expected %, got %)', label, coalesce(expected, 'null'), coalesce(actual, 'null');
  end if;
  return 'ok  ' || label;
end;
$$;

-- Runs a statement that must fail with the given SQLSTATE, for example 42501
-- (permission denied) or 23505 (unique violation). Its changes are undone.
create function pg_temp.expect_error(label text, statement text, code text) returns text
language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    if sqlstate <> code then
      raise exception 'FAIL: % (expected error %, got %: %)', label, code, sqlstate, sqlerrm;
    end if;
    return 'ok  ' || label;
  end;
  raise exception 'FAIL: % (expected error %, but the statement succeeded)', label, code;
end;
$$;

-- Tests switch to these roles to act as a signed-in or signed-out user.
grant execute on function pg_temp.check(text, boolean) to anon, authenticated;
grant execute on function pg_temp.check_equal(text, text, text) to anon, authenticated;
grant execute on function pg_temp.expect_error(text, text, text) to anon, authenticated;
