import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { SPOTIFY_CLIENT_ID } from "@env";
import { SPOTIFY_SCOPES } from "@constants";

WebBrowser.maybeCompleteAuthSession();

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

export const discovery = {
  authorizationEndpoint: "https://accounts.spotify.com/authorize",
  tokenEndpoint: "https://accounts.spotify.com/api/token",
};

export function useSpotifyAuth() {
  const redirectUri = "spotifyjamsesh://callback";

  console.log("REDIRECT URI BEING SENT:", redirectUri);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: SPOTIFY_CLIENT_ID,
      scopes: SPOTIFY_SCOPES,
      usePKCE: true,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      extraParams: {
        show_dialog: "true",
      },
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

  return res.status === 204 ? null : res.json();
}

// ─── Profile APIs ─────────────────────────────────────────────────────────────

/**
 * Get the current user's Spotify profile.
 */
export async function getMe(accessToken) {
  return spotifyFetch("/me", accessToken);
}

/**
 * Get the user's top artists.
 * Returns array of artist name strings.
 */
export async function getTopArtists(accessToken, limit = 10) {
  const data = await spotifyFetch(
    `/me/top/artists?limit=${limit}&time_range=medium_term`,
    accessToken
  );
  return data?.items?.map((a) => a.name) ?? [];
}

/**
 * Get the user's top genres (derived from top artists).
 * Returns array of unique genre strings.
 */
export async function getTopGenres(accessToken, limit = 10) {
  const data = await spotifyFetch(
    `/me/top/artists?limit=${limit}&time_range=medium_term`,
    accessToken
  );
  const genres = data?.items?.flatMap((a) => a.genres) ?? [];
  // Deduplicate and take top 10
  return [...new Set(genres)].slice(0, 10);
}

// ─── Playback APIs ────────────────────────────────────────────────────────────

export async function searchTracks(query, accessToken) {
  const params = new URLSearchParams({ q: query, type: "track" });
  return spotifyFetch(`/search?${params}`, accessToken);
}

export async function getPlaybackState(accessToken) {
  return spotifyFetch("/me/player", accessToken);
}

export async function playTrack(trackUri, positionMs = 0, accessToken) {
  return spotifyFetch("/me/player/play", accessToken, {
    method: "PUT",
    body: JSON.stringify({ uris: [trackUri], position_ms: positionMs }),
  });
}

export async function pausePlayback(accessToken) {
  return spotifyFetch("/me/player/pause", accessToken, { method: "PUT" });
}

export async function seekTo(positionMs, accessToken) {
  return spotifyFetch(
    `/me/player/seek?position_ms=${positionMs}`,
    accessToken,
    { method: "PUT" }
  );
}

// ─── Stats APIs ───────────────────────────────────────────────────────────────

/**
 * Get top artists and tracks for a specific time range.
 * UI passes "4 Weeks", "6 Months", or "All Time".
 */
export async function fetchUserStats(accessToken, timeRange) {
  const rangeMap = {
    "4 Weeks": "short_term",
    "6 Months": "medium_term",
    "All Time": "long_term"
  };
  const spotifyRange = rangeMap[timeRange] || "short_term";

  try {
    const [artistsData, tracksData] = await Promise.all([
      spotifyFetch(`/me/top/artists?time_range=${spotifyRange}&limit=5`, accessToken),
      spotifyFetch(`/me/top/tracks?time_range=${spotifyRange}&limit=5`, accessToken)
    ]);

    return {
      artists: artistsData?.items || [],
      tracks: tracksData?.items || []
    };
  } catch (error) {
    console.error("Error fetching Spotify stats:", error);
    return { artists: [], tracks: [] };
  }
}