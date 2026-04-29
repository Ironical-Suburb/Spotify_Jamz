import React, { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSpotifyAuth } from "@services/spotify";
import { useAuth } from "@hooks/useAuth";
import { COLORS } from "@constants";
import { SPOTIFY_CLIENT_ID } from "@env";
import { redirectUri } from "@services/spotify";

const PKCE_KEY = "@jamz_pkce_verifier";

export default function LoginScreen() {
  const { request, response, promptAsync } = useSpotifyAuth();
  const { saveTokens } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!response) return;

    if (response.type === "success") {
      setLoading(true);
      handleTokenExchange(response.params.code);
    } else if (response.type === "error") {
      setError(response.error?.message || "Spotify login failed. Please try again.");
      setLoading(false);
    } else if (response.type === "dismiss" || response.type === "cancel") {
      setError(null);
      setLoading(false);
    }
  }, [response]);

  const handleTokenExchange = async (code) => {
    try {
      // Use the persisted verifier — request.codeVerifier may belong to a
      // fresh hook instance created after the app remounted on redirect.
      const codeVerifier = await AsyncStorage.getItem(PKCE_KEY);

      const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: SPOTIFY_CLIENT_ID,
          code_verifier: codeVerifier,
        }).toString(),
      });

      const data = await result.json();

      if (data.access_token) {
        await AsyncStorage.removeItem(PKCE_KEY);
        await saveTokens(data);
        setError(null);
      } else {
        setError("Failed to get token: " + (data.error_description || data.error));
      }
    } catch (e) {
      setError("Token exchange failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError(null);
    try {
      // Persist the verifier BEFORE the browser opens so it survives a remount
      if (request?.codeVerifier) {
        await AsyncStorage.setItem(PKCE_KEY, request.codeVerifier);
      }
      const result = await promptAsync();
      if (result?.type === "dismiss" || result?.type === "cancel") {
        setLoading(false);
      }
    } catch (e) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🎵</Text>
      <Text style={styles.title}>Spotify Jam Sesh</Text>
      <Text style={styles.subtitle}>
        Listen together, no matter where you are.
      </Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, (!request || loading) && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={!request || loading}
      >
        {loading
          ? <ActivityIndicator color={COLORS.background} />
          : <Text style={styles.buttonText}>{error ? "Try Again" : "Connect with Spotify"}</Text>
        }
      </TouchableOpacity>

      {error && (
        <TouchableOpacity style={styles.resetBtn} onPress={() => { setError(null); setLoading(false); }}>
          <Text style={styles.resetText}>← Start over</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.note}>Spotify Premium required for playback control.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", padding: 32 },
  logo:           { fontSize: 72, marginBottom: 16 },
  title:          { fontSize: 28, fontWeight: "bold", color: COLORS.textPrimary, marginBottom: 8 },
  subtitle:       { fontSize: 16, color: COLORS.textSecondary, textAlign: "center", marginBottom: 48 },
  errorBox:       { backgroundColor: "#2D1515", borderColor: COLORS.error, borderWidth: 1, borderRadius: 12, padding: 14, width: "100%", marginBottom: 16 },
  errorText:      { color: COLORS.error, fontSize: 14, textAlign: "center" },
  button:         { backgroundColor: COLORS.primary, paddingVertical: 16, paddingHorizontal: 40, borderRadius: 50, width: "100%", alignItems: "center", marginBottom: 12 },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: COLORS.background, fontWeight: "bold", fontSize: 16 },
  resetBtn:       { marginBottom: 24, padding: 8 },
  resetText:      { color: COLORS.textSecondary, fontSize: 14 },
  note:           { color: COLORS.textMuted, fontSize: 12, textAlign: "center", marginTop: 16 },
});
