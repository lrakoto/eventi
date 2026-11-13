// Search radius for nearby events. Dev builds use a wide radius so testing
// works anywhere; production (release) builds use 10km.
export const SEARCH_RADIUS_M = __DEV__ ? 50000 : 10000;

// If fewer than this many events come back, ask the backend to fetch more
// from Ticketmaster for this area (rate-limited server-side).
export const SPARSE_THRESHOLD = 5;
