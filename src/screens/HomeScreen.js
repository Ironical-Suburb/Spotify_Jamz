import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, StatusBar,
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
    <View style={styles.container}>
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

      {/* Main actions */}
      <View style={styles.actions}>

        {/* Create room card */}
        <TouchableOpacity
          style={styles.createCard}
          onPress={handleCreate}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <>
              <Text style={styles.createCardTitle}>Create a Room</Text>
              <Text style={styles.createCardSub}>
                Start a session and share the code
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or join one</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Join room */}
        <View style={styles.joinCard}>
          <TextInput
            style={styles.codeInput}
            placeholder="Enter room code"
            placeholderTextColor={COLORS.textMuted}
            value={roomCode}
            onChangeText={setRoomCode}
            autoCapitalize="characters"
            maxLength={4}
            returnKeyType="go"
            onSubmitEditing={handleJoin}
          />
          <TouchableOpacity
            style={[
              styles.joinBtn,
              !roomCode.trim() && styles.joinBtnDisabled,
            ]}
            onPress={handleJoin}
            disabled={loading || !roomCode.trim()}
            activeOpacity={0.85}
          >
            <Text style={styles.joinBtnText}>Join</Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        {profile?.isPublic ? "🌐 Public profile" : "🔒 Private profile"}
      </Text>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingTop: 60,
  },

  // ── Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  appName: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  avatarBtn: {
    padding: 2,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarEmoji: {
    fontSize: 22,
  },

  // ── Greeting
  greetingRow: {
    marginBottom: 48,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  greetingSub: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },

  // ── Actions
  actions: {
    flex: 1,
    justifyContent: "center",
  },

  // Create card
  createCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 28,
    marginBottom: 32,
  },
  createCardTitle: {
    color: COLORS.background,
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 6,
  },
  createCardSub: {
    color: COLORS.background + "CC",
    fontSize: 14,
  },

  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.surfaceAlt,
  },
  dividerText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },

  // Join card
  joinCard: {
    flexDirection: "row",
    gap: 12,
  },
  codeInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    borderRadius: 14,
    padding: 16,
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 6,
    textAlign: "center",
    borderWidth: 1.5,
    borderColor: COLORS.surfaceAlt,
  },
  joinBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  joinBtnDisabled: {
    borderColor: COLORS.surfaceAlt,
    opacity: 0.5,
  },
  joinBtnText: {
    color: COLORS.primary,
    fontWeight: "bold",
    fontSize: 16,
  },

  // Footer
  footer: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: "center",
    paddingBottom: 32,
  },
});