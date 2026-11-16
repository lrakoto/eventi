import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from 'npm:jose@5';

// Native Sign in with Apple: the client_id is the app's bundle id.
const CLIENT_ID = 'com.lovarakoto.eventi';
const TEAM_ID = Deno.env.get('APPLE_TEAM_ID')!;
const KEY_ID = Deno.env.get('APPLE_KEY_ID')!;
// Accept original .p8 line breaks and escaped newlines in secret values.
const PRIVATE_KEY = (Deno.env.get('APPLE_PRIVATE_KEY') ?? '').replace(/\\{1,2}n/g, '\n');
const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_KEYS = createRemoteJWKSet(new URL(`${APPLE_ISSUER}/auth/keys`));

async function clientSecret(): Promise<string> {
  const key = await importPKCS8(PRIVATE_KEY, 'ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: KEY_ID })
    .setIssuer(TEAM_ID)
    .setSubject(CLIENT_ID)
    .setAudience(APPLE_ISSUER)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key);
}

// Exchange the one-time authorizationCode (valid 5 min) for a long-lived refresh token.
export async function exchangeCode(code: string): Promise<{ refreshToken: string; subject: string }> {
  const res = await fetch(`${APPLE_ISSUER}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal: AbortSignal.timeout(8000),
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: await clientSecret(),
      code,
      grant_type: 'authorization_code',
    }),
  });
  const json = await res.json();
  if (!res.ok || typeof json.refresh_token !== 'string' || typeof json.id_token !== 'string') {
    throw new Error(`Apple token exchange failed: ${res.status} ${json.error ?? ''}`);
  }

  const { payload } = await jwtVerify(json.id_token, APPLE_KEYS, {
    issuer: APPLE_ISSUER,
    audience: CLIENT_ID,
    algorithms: ['RS256'],
    requiredClaims: ['exp', 'sub'],
  });
  if (!payload.sub) throw new Error('Apple identity token has no subject');
  return { refreshToken: json.refresh_token, subject: payload.sub };
}

export async function revokeToken(refreshToken: string): Promise<void> {
  const res = await fetch(`${APPLE_ISSUER}/auth/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal: AbortSignal.timeout(8000),
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: await clientSecret(),
      token: refreshToken,
      token_type_hint: 'refresh_token',
    }),
  });
  if (!res.ok) {
    throw new Error(`Apple token revoke failed: ${res.status}`);
  }
}
