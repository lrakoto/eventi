import { revokeToken } from '../_shared/apple.ts';
import { json, requireUser, serviceClient } from '../_shared/auth.ts';

type AppleRevocation = 'revoked' | 'no_token' | 'failed' | 'not_applicable';

// Deletes the calling user: revokes Sign in with Apple (if we hold a token),
// removes their events, then deletes the auth user (cascades saved events,
// reports, blocks, apple_tokens).
Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const supabase = serviceClient();
  const user = await requireUser(req, supabase);
  if (!user) return json({ error: 'unauthorized' }, 401);

  const usesApple = user.identities?.some((identity) => identity.provider === 'apple')
    || user.app_metadata.providers?.includes('apple')
    || user.app_metadata.provider === 'apple';
  let appleRevocation: AppleRevocation = 'not_applicable';
  if (usesApple) {
    const { data: tokenRow, error: tokenError } = await supabase
      .from('apple_tokens')
      .select('refresh_token')
      .eq('user_id', user.id)
      .maybeSingle();

    if (tokenError) {
      appleRevocation = 'failed';
      console.error('delete-account token lookup:', tokenError.code);
    } else if (!tokenRow) {
      appleRevocation = 'no_token';
    } else {
      try {
        await revokeToken(tokenRow.refresh_token);
        appleRevocation = 'revoked';
      } catch (e) {
        appleRevocation = 'failed';
        console.error('delete-account revoke:', e instanceof Error ? e.message : e);
      }
    }
  }

  const { error: eventsError } = await supabase.from('events').delete().eq('created_by', user.id);
  if (eventsError) return json({ error: eventsError.message }, 500);

  const { error } = await supabase.auth.admin.deleteUser(user.id);
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true, appleRevocation });
});
