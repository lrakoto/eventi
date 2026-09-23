-- Apple refresh tokens, so account deletion can revoke Sign in with Apple
-- (App Store guideline 5.1.1(v)). Written/read only by Edge Functions (service role).
create table if not exists apple_tokens (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  updated_at    timestamptz not null default now()
);

alter table apple_tokens enable row level security;

-- Account deletion now goes through the delete-account Edge Function, which
-- revokes the Apple token first; remove the RPC so nothing can skip that step.
drop function if exists delete_my_account();
