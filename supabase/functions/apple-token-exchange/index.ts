import { exchangeCode } from '../_shared/apple.ts';
import { json, requireUser, serviceClient } from '../_shared/auth.ts';

// Called by the app right after Sign in with Apple, with the one-time
// authorizationCode. Stores Apple's refresh token so delete-account can revoke it.
Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const supabase = serviceClient();
  const user = await requireUser(req, supabase);
  if (!user) return json({ error: 'unauthorized' }, 401);
  const appleIdentities = user.identities?.filter((identity) => identity.provider === 'apple') ?? [];
  if (!appleIdentities.length) return json({ error: 'Apple identity required' }, 403);

  const { authorizationCode } = await req.json().catch(() => ({}));
  if (typeof authorizationCode !== 'string' || !authorizationCode) {
    return json({ error: 'authorizationCode required' }, 400);
  }

  try {
    const { refreshToken, subject } = await exchangeCode(authorizationCode);
    if (!appleIdentities.some((identity) => (identity.identity_data?.sub ?? identity.id) === subject)) {
      return json({ error: 'Apple identity does not match the signed-in account' }, 403);
    }
    const { error } = await supabase.from('apple_tokens').upsert({
      user_id: user.id,
      refresh_token: refreshToken,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    console.error('apple-token-exchange:', e instanceof Error ? e.message : e);
    return json({ error: 'exchange failed' }, 502);
  }
});
