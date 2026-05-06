-- Apply manually in Supabase SQL editor.
-- This is additive: it does not replace the existing wallet/pool balance logic.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where auth_id = auth.uid()
      and role = 'admin'
  );
$$;

create table if not exists public.money_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),

  event_type text not null,
  reason text not null,
  reason_en text,

  amount_eur numeric not null check (amount_eur > 0),

  actor_auth_id uuid references public.users(auth_id),
  user_auth_id uuid references public.users(auth_id),

  source_pool_id bigint references public.donation_pools(id),
  destination_pool_id bigint references public.donation_pools(id),
  feeder_id bigint references public.feeders(id),
  meal_id bigint references public.meals(id),
  donation_id bigint references public.donations(id),

  idempotency_key text unique
);

create table if not exists public.money_event_allocations (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),

  event_id bigint not null references public.money_events(id) on delete cascade,
  user_auth_id uuid not null references public.users(auth_id),
  donation_id bigint references public.donations(id),

  amount_eur numeric not null check (amount_eur > 0)
);

create index if not exists money_events_created_at_idx
  on public.money_events (created_at desc);

create index if not exists money_events_user_auth_id_idx
  on public.money_events (user_auth_id, created_at desc);

create index if not exists money_events_actor_auth_id_idx
  on public.money_events (actor_auth_id, created_at desc);

create index if not exists money_events_type_idx
  on public.money_events (event_type, created_at desc);

create index if not exists money_events_source_pool_idx
  on public.money_events (source_pool_id, created_at desc);

create index if not exists money_events_destination_pool_idx
  on public.money_events (destination_pool_id, created_at desc);

create index if not exists money_event_allocations_user_idx
  on public.money_event_allocations (user_auth_id, created_at desc);

create index if not exists money_event_allocations_event_idx
  on public.money_event_allocations (event_id);

grant select on public.money_events to authenticated;
grant select on public.money_event_allocations to authenticated;
grant execute on function public.is_admin() to authenticated;

alter table public.money_events enable row level security;
alter table public.money_event_allocations enable row level security;

drop policy if exists "admins can read money events" on public.money_events;
create policy "admins can read money events"
on public.money_events
for select
using (public.is_admin());

drop policy if exists "users can read direct money events" on public.money_events;
create policy "users can read direct money events"
on public.money_events
for select
using (user_auth_id = auth.uid());

drop policy if exists "users can read allocated money events" on public.money_events;
create policy "users can read allocated money events"
on public.money_events
for select
using (
  exists (
    select 1
    from public.money_event_allocations mea
    where mea.event_id = money_events.id
      and mea.user_auth_id = auth.uid()
  )
);

drop policy if exists "admins can read money event allocations" on public.money_event_allocations;
create policy "admins can read money event allocations"
on public.money_event_allocations
for select
using (public.is_admin());

drop policy if exists "users can read own money event allocations" on public.money_event_allocations;
create policy "users can read own money event allocations"
on public.money_event_allocations
for select
using (user_auth_id = auth.uid());

create or replace function public.log_auto_feeding_money_event(
  p_meal_id bigint,
  p_feeder_id bigint,
  p_amount numeric,
  p_source_pool_id bigint default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id bigint;
begin
  if p_meal_id is null or p_feeder_id is null or p_amount is null or p_amount <= 0 then
    return;
  end if;

  insert into public.money_events (
    event_type,
    reason,
    reason_en,
    amount_eur,
    source_pool_id,
    feeder_id,
    meal_id,
    idempotency_key
  )
  values (
    'auto_feeding',
    'auto_feeding',
    'Automatic feeding',
    p_amount,
    p_source_pool_id,
    p_feeder_id,
    p_meal_id,
    'auto_feeding:' || p_meal_id::text
  )
  on conflict (idempotency_key) do update
    set idempotency_key = excluded.idempotency_key
  returning id into v_event_id;

  insert into public.money_event_allocations (
    event_id,
    user_auth_id,
    amount_eur
  )
  select
    v_event_id,
    mc.user_id,
    mc.amount_contributed
  from public.meal_contributions mc
  where mc.meal_id = p_meal_id
    and mc.amount_contributed > 0
    and not exists (
      select 1
      from public.money_event_allocations existing
      where existing.event_id = v_event_id
        and existing.user_auth_id = mc.user_id
        and existing.amount_eur = mc.amount_contributed
    );
end;
$$;

revoke all on function public.log_auto_feeding_money_event(bigint, bigint, numeric, bigint) from public;
revoke all on function public.log_auto_feeding_money_event(bigint, bigint, numeric, bigint) from anon;
revoke all on function public.log_auto_feeding_money_event(bigint, bigint, numeric, bigint) from authenticated;

-- Add this inside public.request_dispense after:
--   PERFORM public.allocate_meal_contributions(v_meal_id);
--
-- Suggested call:
--   PERFORM public.log_auto_feeding_money_event(
--     v_meal_id,
--     v_feeder.id,
--     v_approved_amount,
--     CASE
--       WHEN v_from_feeder > 0 AND v_from_global = 0 THEN v_feeder_pool_id
--       WHEN v_from_global > 0 AND v_from_feeder = 0 THEN v_global_pool_id
--       ELSE NULL
--     END
--   );

create or replace function public.admin_pool_operation_atomic(
  p_actor_auth_id uuid,
  p_action text,
  p_amount numeric,
  p_reason text,
  p_reason_en text default null,
  p_source_pool_id bigint default null,
  p_destination_pool_id bigint default null,
  p_entries jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_event_id bigint;
  v_entry jsonb;
  v_pool_id bigint;
  v_line_amount numeric;
  v_total numeric := 0;
  v_source_balance numeric;
  v_destination_balance numeric;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT: Amount must be positive';
  end if;

  select exists (
    select 1
    from public.users
    where auth_id = p_actor_auth_id
      and role = 'admin'
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'FORBIDDEN: Admin role required';
  end if;

  if p_action = 'add' then
    if p_destination_pool_id is null then
      select id into p_destination_pool_id
      from public.donation_pools
      where feeder_id is null
      limit 1;
    end if;

    select balance_amount into v_destination_balance
    from public.donation_pools
    where id = p_destination_pool_id
    for update;

    if v_destination_balance is null then
      raise exception 'POOL_NOT_FOUND: Destination pool not found';
    end if;

    update public.donation_pools
    set balance_amount = balance_amount + p_amount,
        last_updated = now()
    where id = p_destination_pool_id;

    insert into public.money_events (
      event_type, reason, reason_en, amount_eur, actor_auth_id, destination_pool_id
    )
    values (
      'admin_add_funds', p_reason, coalesce(p_reason_en, p_reason), p_amount, p_actor_auth_id, p_destination_pool_id
    )
    returning id into v_event_id;

    return jsonb_build_object('success', true, 'event_id', v_event_id, 'action', p_action);
  end if;

  if p_action in ('withdraw', 'expense', 'deduct') then
    if p_entries is null or jsonb_array_length(p_entries) = 0 then
      if p_source_pool_id is null then
        select id into p_source_pool_id
        from public.donation_pools
        where feeder_id is null
        limit 1;
      end if;

      p_entries := jsonb_build_array(jsonb_build_object('pool_id', p_source_pool_id, 'amount', p_amount));
    end if;

    for v_entry in select * from jsonb_array_elements(p_entries)
    loop
      v_pool_id := (v_entry ->> 'pool_id')::bigint;
      v_line_amount := (v_entry ->> 'amount')::numeric;
      v_total := v_total + v_line_amount;

      select balance_amount into v_source_balance
      from public.donation_pools
      where id = v_pool_id
      for update;

      if v_source_balance is null then
        raise exception 'POOL_NOT_FOUND: Source pool % not found', v_pool_id;
      end if;

      if v_source_balance < v_line_amount then
        raise exception 'INSUFFICIENT_POOL_BALANCE: Pool % has %', v_pool_id, v_source_balance;
      end if;
    end loop;

    if round(v_total, 2) <> round(p_amount, 2) then
      raise exception 'SPLIT_MISMATCH: Split total does not match amount';
    end if;

    for v_entry in select * from jsonb_array_elements(p_entries)
    loop
      update public.donation_pools
      set balance_amount = balance_amount - ((v_entry ->> 'amount')::numeric),
          last_updated = now()
      where id = ((v_entry ->> 'pool_id')::bigint);
    end loop;

    insert into public.money_events (
      event_type, reason, reason_en, amount_eur, actor_auth_id, source_pool_id
    )
    values (
      case when p_action = 'expense' then 'feeder_expense' else 'admin_withdrawal' end,
      p_reason,
      coalesce(p_reason_en, p_reason),
      p_amount,
      p_actor_auth_id,
      case when jsonb_array_length(p_entries) = 1 then ((p_entries -> 0) ->> 'pool_id')::bigint else null end
    )
    returning id into v_event_id;

    return jsonb_build_object('success', true, 'event_id', v_event_id, 'action', p_action);
  end if;

  if p_action = 'transfer' then
    if p_source_pool_id is null or p_destination_pool_id is null then
      raise exception 'INVALID_TRANSFER: Source and destination pools are required';
    end if;

    if p_source_pool_id = p_destination_pool_id then
      raise exception 'INVALID_TRANSFER: Source and destination must be different';
    end if;

    select balance_amount into v_source_balance
    from public.donation_pools
    where id = p_source_pool_id
    for update;

    select balance_amount into v_destination_balance
    from public.donation_pools
    where id = p_destination_pool_id
    for update;

    if v_source_balance is null or v_destination_balance is null then
      raise exception 'POOL_NOT_FOUND: Source or destination pool not found';
    end if;

    if v_source_balance < p_amount then
      raise exception 'INSUFFICIENT_POOL_BALANCE: Source pool has %', v_source_balance;
    end if;

    update public.donation_pools
    set balance_amount = balance_amount - p_amount,
        last_updated = now()
    where id = p_source_pool_id;

    update public.donation_pools
    set balance_amount = balance_amount + p_amount,
        last_updated = now()
    where id = p_destination_pool_id;

    insert into public.money_events (
      event_type, reason, reason_en, amount_eur, actor_auth_id, source_pool_id, destination_pool_id
    )
    values (
      'pool_transfer', p_reason, coalesce(p_reason_en, p_reason), p_amount, p_actor_auth_id, p_source_pool_id, p_destination_pool_id
    )
    returning id into v_event_id;

    return jsonb_build_object('success', true, 'event_id', v_event_id, 'action', p_action);
  end if;

  raise exception 'INVALID_ACTION: Unsupported pool operation';
end;
$$;

revoke all on function public.admin_pool_operation_atomic(uuid, text, numeric, text, text, bigint, bigint, jsonb) from public;
grant execute on function public.admin_pool_operation_atomic(uuid, text, numeric, text, text, bigint, bigint, jsonb) to authenticated;
