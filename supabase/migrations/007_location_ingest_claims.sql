-- Count actual on-demand attempts, including upstream failures and retries.
create table public.ingest_attempts (
  cell text not null,
  attempted_at timestamptz not null,
  primary key (cell, attempted_at)
);

create index ingest_attempts_time_idx on public.ingest_attempts (attempted_at);
alter table public.ingest_attempts enable row level security;
revoke all on public.ingest_attempts from public, anon, authenticated;
grant select, insert, delete on public.ingest_attempts to service_role;
grant select, insert, update, delete on public.ingest_log to service_role;

create function public.claim_location_ingest(cell_id text)
returns text language plpgsql
set search_path = ''
as $$
declare
  checked_at timestamptz;
begin
  -- Serialize admission so concurrent callers respect both limits. The lock
  -- releases when this RPC commits, before any external API request.
  perform pg_catalog.pg_advisory_xact_lock(176823, 7);
  checked_at := pg_catalog.clock_timestamp();

  delete from public.ingest_attempts
    where attempted_at <= checked_at - interval '24 hours';
  delete from public.ingest_log
    where last_run <= checked_at - interval '6 hours';

  if exists (select 1 from public.ingest_log where cell = cell_id) then
    return 'fresh';
  end if;

  if exists (
    select 1 from public.ingest_attempts
    where cell = cell_id and attempted_at > checked_at - interval '2 minutes'
  ) then
    return 'cooldown';
  end if;

  if (select count(*) from public.ingest_attempts) >= 1000 then
    return 'daily_cap';
  end if;

  insert into public.ingest_attempts (cell, attempted_at) values (cell_id, checked_at);
  return 'claimed';
end;
$$;

revoke execute on function public.claim_location_ingest(text) from public, anon, authenticated;
grant execute on function public.claim_location_ingest(text) to service_role;
