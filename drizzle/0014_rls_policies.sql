-- =============================================================================
-- Row Level Security for Supabase client / Realtime access
-- =============================================================================
-- The Next.js server uses DATABASE_URL (typically the postgres role), which
-- bypasses RLS. These policies protect against direct PostgREST / anon-key
-- access if tables are ever exposed via the Supabase API.
--
-- Apply with: npm run db:migrate  (or your preferred SQL runner)
-- After applying, enable Realtime only on tables you need.
-- =============================================================================

-- Helper: current auth user → linked manager id
create or replace function public.current_manager_id()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select ma.manager_id
  from public.manager_accounts ma
  where ma.user_id = auth.uid()::text
  limit 1;
$$;

revoke all on function public.current_manager_id() from public;
grant execute on function public.current_manager_id() to authenticated;

-- Notifications: recipients only
alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (recipient_manager_id = public.current_manager_id());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using (recipient_manager_id = public.current_manager_id())
  with check (recipient_manager_id = public.current_manager_id());

-- No direct client inserts (server inserts via DATABASE_URL)
drop policy if exists "notifications_no_client_insert" on public.notifications;
create policy "notifications_no_client_insert"
  on public.notifications for insert
  to authenticated
  with check (false);

-- Chat messages: authenticated read of non-deleted; no client writes
alter table public.chat_messages enable row level security;

drop policy if exists "chat_messages_select_auth" on public.chat_messages;
create policy "chat_messages_select_auth"
  on public.chat_messages for select
  to authenticated
  using (deleted_at is null);

drop policy if exists "chat_messages_no_client_write" on public.chat_messages;
create policy "chat_messages_no_client_write"
  on public.chat_messages for all
  to authenticated
  using (false)
  with check (false);

-- Manager accounts: user can read own link only
alter table public.manager_accounts enable row level security;

drop policy if exists "manager_accounts_select_own" on public.manager_accounts;
create policy "manager_accounts_select_own"
  on public.manager_accounts for select
  to authenticated
  using (user_id = auth.uid()::text);

drop policy if exists "manager_accounts_no_client_write" on public.manager_accounts;
create policy "manager_accounts_no_client_write"
  on public.manager_accounts for insert
  to authenticated
  with check (false);

-- Managers roster: authenticated can read public profile fields
alter table public.managers enable row level security;

drop policy if exists "managers_select_auth" on public.managers;
create policy "managers_select_auth"
  on public.managers for select
  to authenticated
  using (true);

drop policy if exists "managers_no_client_write" on public.managers;
create policy "managers_no_client_write"
  on public.managers for all
  to authenticated
  using (false)
  with check (false);

-- Wall posts: authenticated read; no client write
alter table public.wall_posts enable row level security;

drop policy if exists "wall_posts_select_auth" on public.wall_posts;
create policy "wall_posts_select_auth"
  on public.wall_posts for select
  to authenticated
  using (deleted_at is null);

drop policy if exists "wall_posts_no_client_write" on public.wall_posts;
create policy "wall_posts_no_client_write"
  on public.wall_posts for all
  to authenticated
  using (false)
  with check (false);

-- Sensitive money / prize tables: deny all authenticated client access
do $$
declare
  t text;
begin
  foreach t in array array[
    'balances',
    'prize_config',
    'weekly_results',
    'settings'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_deny_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (false) with check (false)',
      t || '_deny_all',
      t
    );
  end loop;
end $$;
