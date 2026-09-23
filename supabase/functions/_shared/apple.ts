import { importPKCS8, SignJWT } from 'npm:jose@5';

// Native Sign in with Apple: the client_id is the app's bundle id.
const CLIENT_ID = 'com.lovarakoto.eventi';
const TEAM_ID = Deno.env.get('APPLE_TEAM_ID')!;
const KEY_ID = Deno.env.get('APPLE_KEY_ID')!;
// .p8 contents; tolerate "\n"-escaped newlines from `supabase secrets set`
const PRIVATE_KEY = (Deno.env.get('APPLE_PRIVATE_KEY') ?? '').replace(/\\n/g, '\n');

async function clientSecret(): Promise<string> {
  const key = await importPKCS8(PRIVATE_KEY, 'ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: KEY_ID })
    .setIssuer(TEAM_ID)
    .setSubject(CLIENT_ID)
    .setAudience('https://appleid.apple.com')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key);
}

// Exchange the one-time authorizationCode (valid 5 min) for a long-lived refresh token.
export async function exchangeCode(code: string): Promise<string> {
  const res = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: await clientSecret(),
      code,
      grant_type: 'authorization_code',
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.refresh_token) {
    throw new Error(`Apple token exchange failed: ${res.status} ${json.error ?? ''}`);
  }
  return json.refresh_token;
}

export async function revokeToken(refreshToken: string): Promise<void> {
  const res = await fetch('https://appleid.apple.com/auth/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: await clientSecret(),
      token: refreshToken,
      token_type_hint: 'refresh_token',
    }),
  });
  if (!res.ok) {
    throw new Error(`Apple token revoke failed: ${res.status} ${await res.text()}`);
  }
}
