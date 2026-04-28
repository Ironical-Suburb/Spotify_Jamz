import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, StatusBar, ScrollView,
} from "react-native";
import { createRoom, joinRoom } from "@services/roomService";
import { useAuth } from "@hooks/useAuth";
import { useProfile } from "@hooks/useProfile";
import { COLORS } from "@constants";

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);

  const displayName = profile?.nickname ?? user?.uid?.slice(0, 8) ?? "Listener";

  const handleCreate = async () => {
    setLoading(true);
    try {
      const code = await createRoom(user.uid, displayName);
      navigation.navigate("Room", { roomCode: code, isHost: true, displayName });
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!roomCode.trim()) {
      Alert.alert("Enter a room code to join.");
      return;
    }
    setLoading(true);
    try {
      await joinRoom(roomCode.trim().toUpperCase(), user.uid, displayName);
      navigation.navigate("Room", {
        roomCode: roomCode.trim().toUpperCase(),
        isHost: false,
        displayName,
      });
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar barStyle="light-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.appName}>Jam Sesh</Text>
        <TouchableOpacity
          style={styles.avatarBtn}
          onPress={() => navigation.navigate("Profile")}
          activeOpacity={0.8}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>{profile?.emoji ?? "🎵"}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Greeting */}
      <View style={styles.greetingRow}>
        <Text style={styles.greeting}>Hey, {displayName} 👋</Text>
        <Text style={styles.greetingSub}>Ready to jam with someone?</Text>
      </View>

      {/* Main card */}
      <View style={styles.card}>
        <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={loading} activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <View>
              <Text style={styles.createBtnTitle}>Create a Room</Text>
              <Text style={styles.createBtnSub}>Start a session · share the code</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.joinContainer}>
          <View style={styles.joinHeader}>
            <Text style={styles.joinTitle}>Join a Room</Text>
            <Text style={styles.joinSub}>Enter a code to vibe together</Text>
          </View>
          <View style={styles.joinRow}>
            <TextInput
              style={styles.codeInput}
              placeholder="XXXX"
              placeholderTextColor={COLORS.textMuted}
              value={roomCode}
              onChangeText={setRoomCode}
              autoCapitalize="characters"
              maxLength={4}
              returnKeyType="go"
              onSubmitEditing={handleJoin}
            />
            <TouchableOpacity
              style={[styles.joinBtn, !roomCode.trim() && styles.joinBtnDisabled]}
              onPress={handleJoin}
              disabled={loading || !roomCode.trim()}
              activeOpacity={0.85}
            >
              <Text style={[styles.joinBtnText, !roomCode.trim() && styles.joinBtnTextDisabled]}>
                Join
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Quick-access tiles */}
      <View style={styles.tiles}>
        <TouchableOpacity
          style={styles.tile}
          onPress={() => navigation.navigate("Discover")}
          activeOpacity={0.8}
        >
          <Text style={styles.tileEmoji}>🔥</Text>
          <Text style={styles.tileTitle}>Discover</Text>
          <Text style={styles.tileSub}>Find your music match</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tile}
          onPress={() => navigation.navigate("Matches")}
          activeOpacity={0.8}
        >
          <Text style={styles.tileEmoji}>💜</Text>
          <Text style={styles.tileTitle}>Matches</Text>
          <Text style={styles.tileSub}>Chat & jam together</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.background },
  container: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 32 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 32 },
  appName: { fontSize: 20, fontWeight: "800", color: COLORS.textPrimary, letterSpacing: -0.5 },
  avatarBtn: { padding: 2 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: COLORS.primary },
  avatarEmoji: { fontSize: 20 },

  greetingRow: { marginBottom: 32 },
  greeting: { fontSize: 26, fontWeight: "bold", color: COLORS.textPrimary, marginBottom: 4 },
  greetingSub: { fontSize: 14, color: COLORS.textSecondary },

  card: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 20, gap: 16, marginBottom: 24 },

  createBtn: { backgroundColor: COLORS.primary, borderRadius: 16, padding: 20 },
  createBtnTitle: { color: COLORS.background, fontSize: 17, fontWeight: "bold", marginBottom: 4 },
  createBtnSub: { color: COLORS.background + "BB", fontSize: 13 },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.surfaceAlt },
  dividerText: { color: COLORS.textMuted, fontSize: 12 },

  joinContainer: { backgroundColor: COLORS.surfaceAlt, borderRadius: 16, padding: 20 },
  joinHeader: { marginBottom: 16 },
  joinTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: "bold", marginBottom: 4 },
  joinSub: { color: COLORS.textSecondary, fontSize: 13 },
  joinRow: { flexDirection: "row", gap: 10 },
  codeInput: { flex: 1, backgroundColor: COLORS.background, color: COLORS.textPrimary, borderRadius: 12, padding: 14, fontSize: 18, fontWeight: "bold", letterSpacing: 8, textAlign: "center" },
  joinBtn: { backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: 22, justifyContent: "center", alignItems: "center", borderWidth: 1.5, borderColor: COLORS.primary },
  joinBtnDisabled: { borderColor: "transparent" },
  joinBtnText: { color: COLORS.primary, fontWeight: "bold", fontSize: 15 },
  joinBtnTextDisabled: { color: COLORS.textMuted },

  tiles: { flexDirection: "row", gap: 12 },
  tile: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 18, padding: 18, alignItems: "center" },
  tileEmoji: { fontSize: 32, marginBottom: 8 },
  tileTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: "bold", marginBottom: 4 },
  tileSub: { color: COLORS.textSecondary, fontSize: 11, textAlign: "center" },
});
