import React, { useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator,
} from "react-native";
import { useSpotifyAuth } from "@services/spotify";
import { useAuth } from "@hooks/useAuth";
import { COLORS } from "@constants";

export default function LoginScreen() {
  const { request, response, promptAsync } = useSpotifyAuth();
  const { setSpotifyToken } = useAuth();

  useEffect(() => {
    if (response?.type === "success") {
      const { access_token } = response.params;
      setSpotifyToken(access_token);
    }
  }, [response]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🎵</Text>
      <Text style={styles.title}>Spotify Jam Sesh</Text>
      <Text style={styles.subtitle}>
        Listen together, no matter where you are.
      </Text>

      <TouchableOpacity
        style={[styles.button, !request && styles.buttonDisabled]}
        onPress={() => promptAsync()}
        disabled={!request}
      >
        {!request ? (
          <ActivityIndicator color={COLORS.background} />
        ) : (
          <Text style={styles.buttonText}>Connect with Spotify</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.note}>Spotify Premium required for playback control.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  logo:    { fontSize: 72, marginBottom: 16 },
  title:   { fontSize: 28, fontWeight: "bold", color: COLORS.textPrimary, marginBottom: 8 },
  subtitle:{ fontSize: 16, color: COLORS.textSecondary, textAlign: "center", marginBottom: 48 },
  button:  {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 50,
    width: "100%",
    alignItems: "center",
    marginBottom: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: COLORS.background, fontWeight: "bold", fontSize: 16 },
  note:    { color: COLORS.textMuted, fontSize: 12, textAlign: "center" },
});
