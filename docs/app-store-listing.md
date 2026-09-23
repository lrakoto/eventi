# App Store Connect — Eventi listing draft

## App information
- **Name** (30): Eventi — Events Near You
- **Subtitle** (30): Concerts, shows & more on a map
- **Bundle ID:** com.lovarakoto.eventi
- **Primary category:** Entertainment · **Secondary:** Lifestyle
- **Privacy Policy URL:** https://threeohfivestudios.com/eventi/privacy  (upload `docs/privacy.html`; rebuild with `npm run build:privacy`)
- **Support URL:** https://threeohfivestudios.com (or a /eventi page)

## Description (4000)
Eventi puts everything happening around you on one map.

Open the app and see concerts, sports, theater, comedy and community events nearby, pinned right where they happen. Tap a pin for the date, venue and price, get directions in Apple Maps, or jump straight to tickets.

• Map-first: see what's on around you at a glance
• Filters: category, date (today, this weekend, this week) and free/paid
• List view sorted by distance or date
• Save events you're interested in
• Post your own events for your community
• Sign in with Apple — or browse without an account

Listings come from Ticketmaster and from the Eventi community.

## Promotional text (170)
Find out what's happening near you tonight — concerts, games, shows and local events, all on one map.

## Keywords (100, comma-separated, no spaces)
events,concerts,nearby,tonight,map,shows,tickets,local,things to do,weekend,music,comedy,sports

## Age rating questionnaire
- User-generated content: **Yes** (users can post events) → moderation in place: report, block, auto-hide at 3 reports
- Everything else: None → expected rating **12+** (because of unrestricted UGC/web links) — confirm in the questionnaire

## App Privacy ("nutrition label")
Tracking: **No** (no ads, no analytics SDKs, no data broker sharing)

| Data type | Collected | Linked to user | Purpose |
|---|---|---|---|
| Contact Info → Email address | Yes (only if signed in) | Yes | App Functionality |
| Identifiers → User ID | Yes (only if signed in) | Yes | App Functionality |
| User Content → Other user content (events posted, reports) | Yes | Yes | App Functionality |
| Location → Precise | **No*** | — | — |

\* Coordinates are sent only to answer the nearby-events query in real time and are not stored
(server logs record a rounded ~11km area). Apple's definition of "collect" excludes data used
only to service a request in real time. If in doubt, declare **Coarse Location, not linked,
App Functionality** — the conservative choice.

## Review notes (for the reviewer)
- Location permission is used to center the map and query nearby events.
- To test posting/reporting: sign in with Apple or create an email account; tap **+** to add an event;
  on another user's event, tap the flag icon to report or block.
- Account deletion: person icon (top right) → Delete account.
- Provide a demo email account here if Sign in with Apple testing is inconvenient for review.

## Screenshots
iPhone 6.9" (1320×2868) required; 6.5" optional (auto-scaled). iPad not needed (`supportsTablet: false`).
Suggested set: map with pins · event detail sheet · filters · list view · add event.
