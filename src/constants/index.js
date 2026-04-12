export * from "./colors";

// Spotify OAuth scopes needed for playback control
export const SPOTIFY_SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "streaming",
  "playlist-read-private",
  "user-library-read",
];

// How often (ms) clients re-sync position with host to prevent drift
export const SYNC_INTERVAL_MS = 30000;

// Max ms of drift allowed before a hard seek is triggered
export const MAX_DRIFT_MS = 2000;

// Firebase collection/node names
export const DB_ROOMS = "rooms";
export const DB_USERS = "users";
