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
        show_dialog: "true", // forces account picker every login
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

export async function searchTracks(query, accessToken) {
  const params = new URLSearchParams({ 
    q: query, 
    type: "track"
  });
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