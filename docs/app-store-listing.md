# App Store Connect — EventAlly listing draft

## App information
- **Name** (30): EventAlly
- **Subtitle** (30): Concerts & shows on a map
- **Bundle ID:** com.lovarakoto.eventi
- **Primary category:** Entertainment · **Secondary:** Lifestyle
- **Privacy Policy URL:** https://lrakoto.github.io/eventi/privacy/
- **Support URL:** https://lrakoto.github.io/eventi/support/

Start with a free U.S. listing, where the three preset cities are supported. Select manual release so the approved version stays in App Store Connect until launch.

## Description (4000)
Find nearby concerts, sports, theater, and comedy on one map.

Open EventAlly to explore Los Angeles, New York, or Chicago, or use your location to find nearby listings. Tap a pin for the date, venue, and available prices. Get directions in Apple Maps or open the ticket listing.

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

Device coordinates are used to answer nearby queries. Sparse-area refreshes retain only the approximate area and request time in EventAlly's application tables and send only the approximate area to Ticketmaster. Confirm production request logging and retention when finalizing the location disclosure. [Apple privacy details](https://developer.apple.com/app-store/app-privacy-details/)

## Review notes (for the reviewer)

EventAlly opens to Los Angeles. You can browse as a guest, even if you deny location permission. Tap the area selector at the top left of the map to switch to New York or Chicago, or choose Use My Location. The map and event list share the same filters. Get Tickets opens the source listing for tickets to an in-person event, and Directions opens Apple Maps.

To test bookmarks, use the demo credentials in App Review Information. Open any event and tap the bookmark icon. Account deletion is available from the account icon at the top right. The demo account can be kept for review by using a separate account to test deletion.

### App Review Information setup

Create and verify a dedicated email demo account before entering its credentials in App Store Connect. Keep the credentials out of the repository. Provide an App Review contact who can respond during review.

## Screenshots
Capture the map with pins, an event detail sheet, and the filtered list from the app running on an iPhone. Use unscaled portrait screenshots. Apple's medium Dynamic Island sizes are 1179 × 2556 and 1206 × 2622. Check Media Manager for any additional required size. [Apple's screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)

## iPhone smoke test

1. Launch as a guest. Browse the default Los Angeles feed, switch to New York and Chicago, and check that the map and list update together.
2. Try Use My Location with access denied and then allowed. Verify city browsing still works after denial. Test airplane mode, restore the connection, and tap Try again.
3. Compare map, list, and search with category, date, and price filters active. Open a listing and check its local start time, directions, and ticket link.
4. Sign in with a confirmed email test account and with Apple. Bookmark an event, reopen the app, and verify the bookmark persisted.
5. Delete dedicated test accounts. Verify sign-out, data removal, and Apple revocation. For an Apple account without a stored token, check that the app shows Apple's manual removal steps.
