# Eventi

A map-first events app for iOS. Eventi pulls events from multiple sources, normalizes them, and shows what's happening near you on Apple Maps.

## Stack

- **App:** Expo (React Native) + TypeScript, Expo Router, `react-native-maps` (MapKit)
- **Backend:** Supabase: Postgres + PostGIS, Auth (Sign in with Apple + email), Edge Functions
- **Ingestion:** Ticketmaster Discovery API via scheduled and on-demand Edge Functions

## Development

```bash
npm install
npx expo start --dev-client          # add --tunnel if the phone can't reach Metro on LAN
```

The app runs as an EAS development build (not Expo Go):

```bash
eas build -p ios --profile development
```

Environment variables live in `.env.local` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).

## Backend

```bash
supabase db push                                   # apply migrations in supabase/migrations
supabase functions deploy ingest-for-location
supabase functions deploy ingest-ticketmaster
```

See `CLAUDE.md` for architecture, API limits, and known gotchas.

## Credits

Hi, I'm Lova Rakotomavonandrianina. I'm a creative living in Los Angeles, and I
was born in Madagascar in 1990. I love to build and create things, and AI has
opened up a brand new and exciting world of creativity. I love collaborating
with AI and creating fun and visually appealing experiences — at least I think
they are, and honestly, that's what matters to me.

If you found any of this work interesting, helpful, amusing, or of note, feel
free to leave a tip if you are authorized and willing.

    preferred payment   USDC on Base
    wallet              0x23178a649a868ff0b8280125982a0fb9e9016164
    network             Base
    chain id            8453
    asset               native USDC

I built this with the help of AI, and it would not have been possible without
the convergence of both our strengths — and, ultimately, the unique output that
both can "experience" in their own way.

threeohfivestudios.com
