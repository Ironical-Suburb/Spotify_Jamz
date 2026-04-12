import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI } from "@env";
import { SPOTIFY_SCOPES } from "@constants";

WebBrowser.maybeCompleteAuthSession();

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const discovery = {
  authorizationEndpoint: SPOTIFY_AUTH_URL,
  tokenEndpoint: SPOTIFY_TOKEN_URL,
};

export function useSpotifyAuth() {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: "spotifyjamsesh" });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: SPOTIFY_CLIENT_ID,
      scopes: SPOTIFY_SCOPES,
      usePKCE: false,
      redirectUri,
    },
    discovery
  );

  return { request, response, promptAsync };
}

// ─── Web API Helpers ──────────────────────────────────────────────────────────

async function spotifyFetch(endpoint, accessToken, options = {}) {
  const res = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Spotify API error: ${res.status}`);
  }

  // 204 No Content responses have no body
  return res.status === 204 ? null : res.json();
}

/** Search for tracks */
export async function searchTracks(query, accessToken, limit = 20) {
  const params = new URLSearchParams({ q: query, type: "track", limit });
  return spotifyFetch(`/search?${params}`, accessToken);
}

/** Get current playback state */
export async function getPlaybackState(accessToken) {
  return spotifyFetch("/me/player", accessToken);
}

/** Play a specific track at a given position */
export async function playTrack(trackUri, positionMs = 0, accessToken) {
  return spotifyFetch("/me/player/play", accessToken, {
    method: "PUT",
    body: JSON.stringify({ uris: [trackUri], position_ms: positionMs }),
  });
}

/** Pause playback */
export async function pausePlayback(accessToken) {
  return spotifyFetch("/me/player/pause", accessToken, { method: "PUT" });
}

/** Seek to position in ms */
export async function seekTo(positionMs, accessToken) {
  return spotifyFetch(
    `/me/player/seek?position_ms=${positionMs}`,
    accessToken,
    { method: "PUT" }
  );
}
