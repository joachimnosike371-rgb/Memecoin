-- Shared sliding-window limiter for serverless/multi-instance market provider calls.
create table if not exists public.provider_rate_limit_hits (
  id bigint generated always as identity primary key,
  provider text not null check (char_length(provider) between 1 and 80),
  requested_at timestamptz not null default clock_timestamp()
);
create index if not exists provider_rate_limit_hits_lookup_idx
  on public.provider_rate_limit_hits (provider, requested_at);

alter table public.provider_rate_limit_hits enable row level security;
revoke all on public.provider_rate_limit_hits from public, anon, authenticated;

create or replace function public.consume_provider_rate_limit(
  p_provider text,
  p_limit integer,
  p_window_ms integer
)
returns table (allowed boolean, retry_after_ms bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
  v_oldest timestamptz;
  v_window interval;
begin
  if p_provider is null or char_length(trim(p_provider)) < 1 or char_length(p_provider) > 80 then
    raise exception 'invalid provider';
  end if;
  if p_limit < 1 or p_limit > 1000 or p_window_ms < 1000 or p_window_ms > 3600000 then
    raise exception 'invalid rate limit';
  end if;

  v_window := make_interval(secs => p_window_ms::numeric / 1000);
  perform pg_advisory_xact_lock(hashtextextended(trim(p_provider), 0));
  delete from public.provider_rate_limit_hits
    where provider = trim(p_provider)
      and requested_at < clock_timestamp() - v_window;

  select count(*)::integer, min(requested_at)
    into v_count, v_oldest
    from public.provider_rate_limit_hits
    where provider = trim(p_provider);

  if v_count >= p_limit then
    return query select false,
      greatest(1, ceil(extract(epoch from (v_oldest + v_window - clock_timestamp())) * 1000)::bigint);
    return;
  end if;

  insert into public.provider_rate_limit_hits(provider) values (trim(p_provider));
  return query select true, 0::bigint;
end;
$$;

revoke all on function public.consume_provider_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_provider_rate_limit(text, integer, integer) to service_role;
