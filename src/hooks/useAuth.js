import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import uuid from "react-native-uuid";
import { SPOTIFY_CLIENT_ID } from "@env";

const UID_KEY      = "@jamz_user_uid";
const TOKEN_KEY    = "@jamz_spotify_token";
const REFRESH_KEY  = "@jamz_spotify_refresh";
const EXPIRES_KEY  = "@jamz_spotify_expires";

async function fetchRefreshedToken(refreshToken) {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: SPOTIFY_CLIENT_ID,
    }).toString(),
  });
  return res.json();
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [spotifyToken, setToken]      = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        // ── Persistent UID ──────────────────────────────────────────────
        let uid = await AsyncStorage.getItem(UID_KEY);
        if (!uid) {
          uid = uuid.v4();
          await AsyncStorage.setItem(UID_KEY, uid);
        }
        setUser({ uid });

        // ── Restore Spotify token ───────────────────────────────────────
        const [storedToken, storedRefresh, storedExpires] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(REFRESH_KEY),
          AsyncStorage.getItem(EXPIRES_KEY),
        ]);

        if (storedToken && storedExpires) {
          const expiresAt = parseInt(storedExpires, 10);
          const fiveMin   = 5 * 60 * 1000;

          if (Date.now() < expiresAt - fiveMin) {
            // Token still valid — use it
            setToken(storedToken);
          } else if (storedRefresh) {
            // Token expired — try silent refresh
            const data = await fetchRefreshedToken(storedRefresh);
            if (data.access_token) {
              await _persist(data.access_token, data.refresh_token ?? storedRefresh, data.expires_in ?? 3600);
              setToken(data.access_token);
            }
            // If refresh fails, token stays null → login screen shown
          }
        }
      } catch (e) {
        console.warn("Auth init error:", e.message);
        // Still need a user object even if storage failed
        if (!user) setUser({ uid: uuid.v4() });
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────

  async function _persist(accessToken, refreshToken, expiresIn) {
    const expiresAt = Date.now() + expiresIn * 1000;
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY,   accessToken),
      AsyncStorage.setItem(EXPIRES_KEY, String(expiresAt)),
      refreshToken
        ? AsyncStorage.setItem(REFRESH_KEY, refreshToken)
        : Promise.resolve(),
    ]);
  }

  // Called by LoginScreen after a successful code exchange
  const saveTokens = async ({ access_token, refresh_token, expires_in = 3600 }) => {
    await _persist(access_token, refresh_token, expires_in);
    setToken(access_token);
  };

  const logout = async () => {
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(REFRESH_KEY),
      AsyncStorage.removeItem(EXPIRES_KEY),
    ]);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, spotifyToken, saveTokens, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
