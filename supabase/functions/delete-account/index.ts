import { revokeToken } from '../_shared/apple.ts';
import { json, requireUser, serviceClient } from '../_shared/auth.ts';

// Deletes the calling user: revokes Sign in with Apple (if we hold a token),
// removes their events, then deletes the auth user (cascades saved events,
// reports, blocks, apple_tokens).
Deno.serve(async (req) => {
  const supabase = serviceClient();
  const user = await requireUser(req, supabase);
  if (!user) return json({ error: 'unauthorized' }, 401);

  const { data: tokenRow } = await supabase
    .from('apple_tokens')
    .select('refresh_token')
    .eq('user_id', user.id)
    .maybeSingle();

  if (tokenRow) {
    try {
      await revokeToken(tokenRow.refresh_token);
    } catch (e) {
      // Don't block deletion on Apple being unavailable; the account is still removed.
      console.error('delete-account revoke:', e instanceof Error ? e.message : e);
    }
  }

  const { error: eventsError } = await supabase.from('events').delete().eq('created_by', user.id);
  if (eventsError) return json({ error: eventsError.message }, 500);

  const { error } = await supabase.auth.admin.deleteUser(user.id);
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true });
});
