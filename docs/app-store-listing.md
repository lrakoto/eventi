# App Store Connect — Eventi listing draft

## App information
- **Name** (30): Eventi — Events Near You
- **Subtitle** (30): Concerts, shows & more on a map
- **Bundle ID:** com.lovarakoto.eventi
- **Primary category:** Entertainment · **Secondary:** Lifestyle
- **Privacy Policy URL:** https://lrakoto.github.io/eventi/privacy/
- **Support URL:** https://threeohfivestudios.com/

## Description (4000)
Find nearby concerts, sports, theater, and comedy on one map.

Open Eventi to explore Los Angeles, New York, or Chicago, or use your location to find nearby listings. Tap a pin for the date, venue, and available prices. Get directions in Apple Maps or open the ticket listing.

• Browse on the map or in the nearby events list.
• Filter by category, date, and free or paid admission.
• Sign in with Apple or email to bookmark events. Browsing works without an account.

Listings come from Ticketmaster. Availability varies by area.

## Promotional text (170)
Find out what's happening near you tonight — concerts, games, shows and local events, all on one map.

## Keywords (100, comma-separated, no spaces)
events,concerts,nearby,tonight,map,shows,tickets,local,things to do,weekend,music,comedy,sports

## Age rating questionnaire
- User-generated content: **No**. Listings are sourced from Ticketmaster and the release does not accept community submissions.
- Complete the remaining questions against the final build, including links that open the browser, and use the resulting App Store Connect rating. [Apple age rating definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions)

## App Privacy ("nutrition label")
Tracking: **No** (no ads, no analytics SDKs, no data broker sharing)

| Data type | Collected | Linked to user | Purpose |
|---|---|---|---|
| Contact Info → Email address | Yes (only if signed in) | Yes | App Functionality |
| Identifiers → User ID | Yes (only if signed in) | Yes | App Functionality |
| Location → Coarse Location | Yes | No | App Functionality |

Device coordinates are used to answer nearby queries. Sparse-area refreshes retain only the approximate area and request time in Eventi's application tables and send only the approximate area to Ticketmaster. Confirm production request logging and retention when finalizing the location disclosure. [Apple privacy details](https://developer.apple.com/app-store/app-privacy-details/)

## Review notes (for the reviewer)
- Browse as a guest. Use the area selector to choose a supported city or tap **Use My Location** to request location access and show nearby events.
- To test bookmarking, sign in, open an event, and tap the bookmark icon.
- Account deletion: person icon (top right) → Delete account.
- Add a dedicated, confirmed demo email account in App Store Connect review information for the bookmark flow. Use a separate account when testing deletion.

## Screenshots
Capture the map with pins, an event detail sheet, and the filtered list from the release build. Use the current iPhone screenshot sizes in [Apple's screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications).

## iPhone smoke test

1. Launch as a guest. Browse the default Los Angeles feed, switch to New York and Chicago, and check that the map and list update together.
2. Try Use My Location with access denied and then allowed. Verify city browsing still works after denial. Test airplane mode, restore the connection, and tap Try again.
3. Compare map, list, and search with category, date, and price filters active. Open a listing and check its local start time, directions, and ticket link.
4. Sign in with a confirmed email test account and with Apple. Bookmark an event, reopen the app, and verify the bookmark persisted.
5. Delete dedicated test accounts. Verify sign-out, data removal, and Apple revocation. For an Apple account without a stored token, check that the app shows Apple's manual removal steps.
